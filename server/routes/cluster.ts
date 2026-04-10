import express from "express";
import { ResourcePlan, KubeSDKLocalRun } from "../../src/types";
import yaml from "js-yaml";
import net from "net";

// 🔐 Programmatic equivalents of 'curl -k' - Required for global fetch in Node 18+ 
// to ignore self-signed certs in local K3s/Rancher clusters.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const router = express.Router();

// Helper: Get Plural for K8s Kind
const getK8sPlural = (kind: string): string => {
  const mapping: Record<string, string> = {
    'Namespace': 'namespaces',
    'Service': 'services',
    'Deployment': 'deployments',
    'StatefulSet': 'statefulsets',
    'DaemonSet': 'daemonsets',
    'ConfigMap': 'configmaps',
    'Secret': 'secrets',
    'ServiceAccount': 'serviceaccounts',
    'Role': 'roles',
    'RoleBinding': 'rolebindings',
    'ClusterRole': 'clusterroles',
    'ClusterRoleBinding': 'clusterrolebindings',
    'Ingress': 'ingresses',
    'PersistentVolumeClaim': 'persistentvolumeclaims',
    'StorageClass': 'storageclasses',
    'CustomResourceDefinition': 'customresourcedefinitions',
    'LocalRunDefinition': 'localrundefinitions'
  };
  return mapping[kind] || kind.toLowerCase() + 's';
};

// Helper: K8s API Requester (handles token auth and TLS)
const k8sRequest = async (url: string, token: string, method: string = 'GET', body: any = null) => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  if (body) {
    if (method === 'PATCH') {
      headers['Content-Type'] = 'application/apply-patch+yaml';
    } else {
      headers['Content-Type'] = 'application/json';
    }
  }

  const options: any = {
    method,
    headers,
  };

  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`K8s API Error (${response.status}): ${errText || response.statusText}`);
  }
  return response.json();
};

// Helper: K8s API Requester for raw text (logs)
const k8sRequestRaw = async (url: string, token: string) => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`K8s API Error (${response.status}): ${errText || response.statusText}`);
  }
  return response.text();
};


/**
 * sanitizeManifest — strips all cluster-instance-specific fields from a manifest
 * before applying it via Server-Side Apply.
 *
 * Kubernetes auto-injects ephemeral fields (kube-api-access-* volumes/mounts,
 * nodeName, status, uid, resourceVersion, etc.) into live resources. These are
 * unique to the running instance and cannot be re-applied — they cause 422s.
 */
const sanitizeManifest = (doc: any): any => {
  const d = JSON.parse(JSON.stringify(doc));

  // 1. Strip server-managed metadata fields
  const metaFieldsToDelete = [
    'resourceVersion', 'uid', 'selfLink', 'creationTimestamp',
    'generation', 'managedFields', 'ownerReferences', 'finalizers'
  ];
  metaFieldsToDelete.forEach(f => delete d.metadata?.[f]);

  // 2. Drop the entire status sub-object
  delete d.status;

  // Reusable function to clean PodSpec
  const cleanPodSpec = (spec: any) => {
    if (!spec) return;
    delete spec.nodeName;
    delete spec.serviceAccount;

    if (Array.isArray(spec.volumes)) {
      spec.volumes = spec.volumes.filter((v: any) => 
        !/^kube-api-access-/.test(v.name) && !/^default-token-/.test(v.name)
      );
      if (spec.volumes.length === 0) delete spec.volumes;
    }

    const stripMounts = (containers: any[]) => {
      if (!Array.isArray(containers)) return;
      containers.forEach((c: any) => {
        if (Array.isArray(c.volumeMounts)) {
          c.volumeMounts = c.volumeMounts.filter((m: any) =>
            !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name)
          );
          if (c.volumeMounts.length === 0) delete c.volumeMounts;
        }
      });
    };
    stripMounts(spec.containers);
    stripMounts(spec.initContainers);
    stripMounts(spec.ephemeralContainers);
  };

  // 3. Apply to Pods AND Workload Templates
  if (d.kind === 'Pod' && d.spec) {
    cleanPodSpec(d.spec);
  } else if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'].includes(d.kind)) {
    // CronJob has jobTemplate instead of template
    if (d.kind === 'CronJob') {
      if (d.spec?.jobTemplate?.spec?.template?.spec) {
        cleanPodSpec(d.spec.jobTemplate.spec.template.spec);
      }
    } else if (d.spec?.template?.spec) {
      cleanPodSpec(d.spec.template.spec);
    }
  }

  return d;
};

/**
 * Shared Extraction Logic: Converts a raw K8s resource into an SDK Component
 */
const extractComponentFromResource = (res: any, namespaces: Set<string>): any | null => {
  if (!res || !res.kind || !res.metadata || !res.metadata.name) return null;

  const kindStr = res.kind.toLowerCase();
  const ns = res.metadata.namespace || 'default';
  
  // Skip higher-level workload controllers to keep Pod as the source of truth
  if (['replicaset', 'deployment', 'statefulset', 'daemonset', 'job', 'cronjob'].includes(kindStr)) {
    return null;
  }

  let kind: 'workload' | 'infra' | 'capability' = 'infra';
  let category = 'unknown';

  if (kindStr === 'pod') {
    kind = 'workload';
    category = 'application';
  } else if (kindStr === 'service') {
    kind = 'workload';
    category = 'service';
  } else if (['ingress', 'endpoints', 'endpointslice'].includes(kindStr)) {
    kind = 'infra';
    category = 'ingress';
  } else if (['configmap', 'secret'].includes(kindStr)) {
    kind = 'infra';
    category = 'config';
  } else if (kindStr === 'namespace') {
    kind = 'infra';
    category = 'namespace';
  }

  if (category === 'unknown') return null;

  if (kindStr !== 'namespace') namespaces.add(ns);
  else namespaces.add(res.metadata.name);

  let properties: any = {};
  let cpu = '100m';
  let memory = '128Mi';

  if (category === 'application') {
    const spec = res.spec?.template?.spec || res.spec;
    if (spec?.containers && spec.containers.length > 0) {
      const container = spec.containers[0];
      properties.image = container.image;
      properties.imagePullPolicy = container.imagePullPolicy || 'Always';
      properties.env = container.env || [];
      
      // Filter out ephemeral cluster-injected mounts
      properties.volumeMounts = (container.volumeMounts || []).filter((m: any) => 
        !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name)
      );
      
      // Filter out ephemeral cluster-injected volumes from the host spec
      properties.volumes = (spec.volumes || []).filter((v: any) => 
        !/^kube-api-access-/.test(v.name) && !/^default-token-/.test(v.name)
      );

      properties.ports = container.ports || [];
      
      const reqs = container.resources?.requests;
      if (reqs) {
        cpu = reqs.cpu || cpu;
        memory = reqs.memory || memory;
      }
    }
    properties.sourceKind = res.kind;
    properties.labels = res.metadata.labels || {};
  } else if (category === 'service') {
    if (res.spec?.ports && res.spec.ports.length > 0) {
      properties.port = res.spec.ports[0].port;
      properties.targetPort = res.spec.ports[0].targetPort || res.spec.ports[0].port;
    }
    properties.serviceType = res.spec?.type || 'ClusterIP';
    properties.clusterIP = res.spec?.clusterIP;
    properties.selector = res.spec?.selector || {};
  } else if (category === 'ingress') {
    if (res.spec?.rules && res.spec.rules.length > 0) {
      properties.hostname = res.spec.rules[0].host;
      const paths = res.spec.rules[0].http?.paths;
      if (paths && paths.length > 0) {
        properties.path = paths[0].path;
        properties.targetService = paths[0].backend?.service?.name || paths[0].backend?.serviceName;
      }
    }
  } else if (category === 'config') {
    properties.data = res.data || res.stringData || {};
  }

  const readableId = (category === 'application' && res.metadata.labels?.app) 
    ? res.metadata.labels.app 
    : res.metadata.name;

  return {
    id: readableId,
    kind,
    namespace: kindStr === 'namespace' ? 'cluster' : ns,
    category,
    mandatory: true,
    runtimeClass: kind === 'workload' ? 'application' : 'infra',
    properties,
    resources: {
      original: { cpu, memory, replicas: res.spec?.replicas || 1 },
      sdk: { cpu: '100m', memory: '128Mi', replicas: 1 }
    }
  };
};

// 1. Connection & Resource Discovery
router.post("/test-connection", async (req, res) => {
  const { apiServerUrl, token } = req.body;
  
  if (!apiServerUrl || !token) {
    return res.status(400).json({ error: "API Server URL and Token are required." });
  }

  // Normalize URL: remove trailing slashes to prevent //api or //namespaces paths
  let targetUrl = apiServerUrl.replace(/\/+$/, "");
  
  if (targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
    console.log("Local address detected. Preparing host.docker.internal fallback if needed.");
  }

  try {
    // Attempt 1: Lightweight Connection Check (Discovery Root) - This matches 'curl -k .../api'
    try {
      console.log(`Verifying credentials against discovery root: ${targetUrl}/api`);
      await k8sRequest(`${targetUrl}/api`, token);
    } catch (e: any) {
      const isLocal = targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost');
      if (isLocal && !targetUrl.includes('host.docker.internal')) {
        const fallbackUrl = targetUrl.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal');
        console.log(`Local connection failed for ${targetUrl}. Retrying with fallback: ${fallbackUrl}/api`);
        await k8sRequest(`${fallbackUrl}/api`, token);
        targetUrl = fallbackUrl;
      } else {
        console.error(`Final connection attempt failed for ${targetUrl}:`, e.message);
        throw e;
      }
    }

    // Attempt 2: Resource Discovery (List Nodes for capacity check) - OPTIONAL
    let capacity = { cpu: "8", memory: "16Gi" };
    try {
      console.log(`Handshake successful. Attempting to discover nodes...`);
      const nodes = await k8sRequest(`${targetUrl}/api/v1/nodes`, token);
      if (nodes.items?.[0]?.status?.capacity) {
        capacity = nodes.items[0].status.capacity;
      }
    } catch (nodeError: any) {
      console.warn(`Node discovery skipped (likely permission issue): ${nodeError.message}. Using default capacity.`);
    }
    
    // Convert K8s units to our format
    const cpu = parseFloat(capacity.cpu);
    const memStr = capacity.memory;
    let memoryMi = parseInt(memStr);
    if (memStr.endsWith('Ki')) memoryMi = parseInt(memStr) / 1024;
    else if (memStr.endsWith('Gi')) memoryMi = parseInt(memStr) * 1024;

    res.json({
      status: 'success',
      capacity: { cpu, memory: memoryMi }
    });
  } catch (error: any) {
    console.error("Connection failed:", error.message);
    res.status(502).json({ error: error.message });
  }
});

// 1b. Live Cluster Import (Discovery)
router.post("/import", async (req, res) => {
  const { apiServerUrl, token } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");

  try {
    const components: any[] = [];
    const namespaces = new Set<string>();

    const fetchResources = async (endpoint: string) => {
      try {
        const data = await k8sRequest(`${targetUrl}${endpoint}`, token);
        if (data.items) {
          data.items.forEach((item: any) => {
            const comp = extractComponentFromResource(item, namespaces);
            if (comp) components.push(comp);
          });
        }
      } catch (e: any) {
        console.warn(`Failed to fetch ${endpoint}: ${e.message}`);
      }
    };

    // Parallel fetch for discovery
    await Promise.all([
      fetchResources('/api/v1/pods'),
      fetchResources('/api/v1/services'),
      fetchResources('/api/v1/namespaces'),
      fetchResources('/apis/networking.k8s.io/v1/ingresses')
    ]);

    // Unique components by path
    const uniqueComps = new Map<string, any>();
    components.forEach(c => {
      const key = `${c.namespace}/${c.category}/${c.id}`;
      if (!uniqueComps.has(key)) uniqueComps.set(key, c);
    });

    // Cross-link Services to Apps
    const finalComponents = Array.from(uniqueComps.values());
    finalComponents.forEach(comp => {
      if (comp.category === 'service' && comp.properties?.selector) {
        const selector = comp.properties.selector;
        const targetPod = finalComponents.find(c => {
          if (c.category !== 'application' || c.namespace !== comp.namespace) return false;
          const podLabels = c.properties?.labels || {};
          return Object.entries(selector).every(([key, value]) => podLabels[key] === value);
        });
        if (targetPod) comp.properties.targetApp = targetPod.id;
      }
    });

    res.json({
      status: 'success',
      snapshot: {
        components: finalComponents,
        namespaces: Array.from(namespaces)
      }
    });
  } catch (error: any) {
    console.error("Import failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Real Deployment logic
router.post("/deploy", async (req, res) => {
  const { apiServerUrl, token, yamlContent } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");

  if (!yamlContent) return res.status(400).json({ error: "YAML content is required" });

  try {
    const docs = yaml.loadAll(yamlContent) as any[];
    const applied = [];

    for (const doc of docs) {
      if (!doc || !doc.kind) continue;

      // Sanitize: strip cluster-instance-specific injected fields before applying
      const cleanDoc = sanitizeManifest(doc);

      const group = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[0] : '';
      const version = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[1] : doc.apiVersion;
      const apiPrefix = group ? `/apis/${group}/${version}` : `/api/${version}`;
      
      const plural = getK8sPlural(doc.kind);
      const nsPart = doc.metadata.namespace ? `/namespaces/${doc.metadata.namespace}` : '';
      const url = `${targetUrl}${apiPrefix}${nsPart}/${plural}/${doc.metadata.name}`;

      console.log(`Applying K8s resource: ${doc.kind}/${doc.metadata.name} to ${url}`);

      // Generic Fix: Check if resource exists before applying
      let exists = false;
      try {
        await k8sRequest(url, token, 'GET');
        exists = true;
      } catch (e: any) {
        if (!e.message.includes('404')) {
          console.warn(`Pre-check failed for ${doc.kind}/${doc.metadata.name}: ${e.message}`);
        }
      }

      // If it exists and is a "management" resource, we might want to skip patching if permissions are tight
      const isManagementResource = ['Namespace', 'CustomResourceDefinition', 'StorageClass', 'PriorityClass'].includes(doc.kind);
      if (exists && isManagementResource) {
        console.log(`Resource ${doc.kind}/${doc.metadata.name} already exists. Skipping patch to avoid potential 403s.`);
        applied.push(`${doc.kind}/${doc.metadata.name} (Existing)`);
        continue;
      }

      // Pod Specific Handling: Pods are mostly immutable. If it exists, we must delete it to update env/resources.
      if (exists && doc.kind === 'Pod') {
        console.log(`Pod ${doc.metadata.name} exists. Force deleting to handle immutable fields...`);
        try {
          // Use gracePeriodSeconds=0 for immediate deletion in simulations
          await k8sRequest(`${url}?gracePeriodSeconds=0`, token, 'DELETE');
          
          // Poll until 404 (Pod is gone)
          console.log(`Waiting for Pod ${doc.metadata.name} to be fully removed...`);
          let deleted = false;
          for (let i = 0; i < 10; i++) {
            try {
              await k8sRequest(url, token, 'GET');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e: any) {
              if (e.message.includes('404')) {
                deleted = true;
                break;
              }
            }
          }
          if (!deleted) console.warn(`Pod ${doc.metadata.name} still exists after 10s wait, proceeding anyway (may cause 422)`);
        } catch (delError: any) {
          console.warn(`Deletion failed for Pod ${doc.metadata.name}: ${delError.message}`);
        }
      }

      // Use Server-Side Apply (PATCH) - For Pods, this will now be a "Create" if we just deleted it
      try {
        await k8sRequest(`${url}?fieldManager=kubesdk&force=true`, token, 'PATCH', yaml.dump(cleanDoc));
        applied.push(`${doc.kind}/${doc.metadata.name}`);

        // If we just applied a CRD, wait briefly for K8s to register the new endpoint
        if (doc.kind === 'CustomResourceDefinition') {
          console.log(`Waiting for CRD ${doc.metadata.name} to register...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e: any) {
        console.error(`Failed to apply ${doc.kind}/${doc.metadata.name}:`, e.message);
        throw new Error(`Failed to apply ${doc.kind}/${doc.metadata.name}: ${e.message}`);
      }
    }

    res.json({ status: 'success', applied });
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Health Check
router.post("/health-check", async (req, res) => {
  const { apiServerUrl, token, namespaces } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");

  try {
    const results: Record<string, any> = {};
    
    for (const ns of namespaces) {
      const pods = await k8sRequest(`${targetUrl}/api/v1/namespaces/${ns}/pods`, token);
      const services = await k8sRequest(`${targetUrl}/api/v1/namespaces/${ns}/services`, token);
      
      // Filter out pods that are being deleted/terminated to avoid confusion during force-recreates
      const activePods = pods.items.filter((p: any) => !p.metadata.deletionTimestamp);

      // Namespace overview
      const allRunning = activePods.length > 0 && activePods.every((p: any) => p.status.phase === 'Running');
      results[ns] = {
        status: allRunning ? 'healthy' : 'warning',
        pods: activePods.map((p: any) => {
          let reason = p.status.reason;
          let message = p.status.message;
          
          if (p.status.containerStatuses) {
            for (const cs of p.status.containerStatuses) {
              if (cs.state.waiting) {
                reason = cs.state.waiting.reason;
                message = cs.state.waiting.message;
                break;
              } else if (cs.state.terminated) {
                reason = cs.state.terminated.reason;
                message = cs.state.terminated.message;
                break;
              }
            }
          }

          return {
            name: p.metadata.name,
            phase: p.status.phase,
            reason: reason || (p.status.phase === 'Running' ? 'Running' : 'Unknown'),
            message: message,
            ready: p.status.containerStatuses?.every((cs: any) => cs.ready) || false,
            restarts: p.status.containerStatuses?.reduce((acc: number, cs: any) => acc + cs.restartCount, 0) || 0
          };
        }),
        services: (services.items || []).map((s: any) => ({
          name: s.metadata.name,
          type: s.spec.type,
          clusterIP: s.spec.clusterIP,
          ports: s.spec.ports || []
        }))
      };
      
      // Component-level status mapping (for backward compatibility and detailed mapping)
      for (const p of activePods) {
        const componentId = p.metadata.labels?.app || p.metadata.name;
        const isHealthy = p.status.phase === 'Running' && p.status.containerStatuses?.every((cs: any) => cs.ready);
        
        // Find associated service for endpoint mapping
        const svc = (services.items || []).find((s: any) => {
          const selector = s.spec.selector || {};
          return Object.entries(selector).every(([k, v]) => p.metadata.labels?.[k] === v);
        });

        let endpointUrl = null;
        let isReachable = false;

        if (svc) {
          const port = svc.spec.ports?.[0];
          if (port) {
            const targetPort = svc.spec.type === 'NodePort' ? port.nodePort : port.port;
            // For simulations, we check localhost
            endpointUrl = `http://localhost:${targetPort}`;
            
            // Background check: Is port reachable on localhost?
            try {
              isReachable = await new Promise((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(200);
                socket.on('connect', () => { socket.destroy(); resolve(true); });
                socket.on('timeout', () => { socket.destroy(); resolve(false); });
                socket.on('error', () => { socket.destroy(); resolve(false); });
                socket.connect(targetPort, '127.0.0.1');
              });
            } catch (e) {
              isReachable = false;
            }
          }
        }

        if (!results[componentId] || results[componentId].status === 'healthy') {
          results[componentId] = {
            status: isHealthy ? 'healthy' : 'warning',
            phase: p.status.phase,
            reason: results[ns].pods.find((pod: any) => pod.name === p.metadata.name)?.reason,
            endpointUrl,
            isReachable
          };
        }
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error("Health check failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Pod Logs
router.post("/logs", async (req, res) => {
  const { apiServerUrl, token, namespace, podName, containerName } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");

  if (!apiServerUrl || !token || !namespace || !podName) {
    return res.status(400).json({ error: "Missing required parameters for logs." });
  }

  try {
    const containerQuery = containerName ? `?container=${containerName}` : '';
    const logUrl = `${targetUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log${containerQuery}`;
    const logs = await k8sRequestRaw(logUrl, token);
    res.send(logs);
  } catch (error: any) {
    console.error("Failed to fetch logs:", error.message);
    res.status(500).json({ error: error.message });
  }
});


// Fitting Logic (Kept for step 5 compatibility)
router.post("/fit", (req, res) => {
  const run: KubeSDKLocalRun = req.body;
  const plan: ResourcePlan = { components: {} };

  run.components.forEach(comp => {
    plan.components[comp.id] = {
      cpu: comp.resources?.sdk?.cpu || "0.1",
      memory: comp.resources?.sdk?.memory || "128Mi",
      replicas: comp.resources?.sdk?.replicas || 1
    };
  });

  res.json(plan);
});

export default router;
