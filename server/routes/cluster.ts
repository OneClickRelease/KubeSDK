import { Router } from "express";
import { ResourcePlan, KubeSDKLocalRun } from "../../src/types";
import yaml from "js-yaml";
import https from "https";

// 🔐 Programmatic equivalents of 'curl -k' - Required for global fetch in Node 18+ 
// to ignore self-signed certs in local K3s/Rancher clusters.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const router = Router();

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
    'StorageClass': 'storageclasses'
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

/**
 * sanitizeManifest — strips all cluster-instance-specific fields from a manifest
 * before applying it via Server-Side Apply.
 *
 * Kubernetes auto-injects ephemeral fields (kube-api-access-* volumes/mounts,
 * nodeName, status, uid, resourceVersion, etc.) into live resources. These are
 * unique to the running instance and cannot be re-applied — they cause 422s.
 */
const sanitizeManifest = (doc: any): any => {
  // Deep clone to avoid mutating the original
  const d = JSON.parse(JSON.stringify(doc));

  // 1. Strip server-managed metadata fields
  const metaFieldsToDelete = [
    'resourceVersion', 'uid', 'selfLink', 'creationTimestamp',
    'generation', 'managedFields', 'ownerReferences', 'finalizers'
  ];
  metaFieldsToDelete.forEach(f => delete d.metadata?.[f]);

  // 2. Drop the entire status sub-object (managed by the control plane)
  delete d.status;

  // 3. Strip Pod-specific injected runtime fields
  if (d.kind === 'Pod' && d.spec) {
    // nodeName is set by the scheduler — do not prescribe it
    delete d.spec.nodeName;
    // serviceAccountName token secret name is instance-specific
    delete d.spec.serviceAccount;

    // Remove auto-injected kube-api-access-* volumes
    if (Array.isArray(d.spec.volumes)) {
      d.spec.volumes = d.spec.volumes.filter((v: any) => {
        // kube-api-access-* volumes are projected service account tokens
        if (/^kube-api-access-/.test(v.name)) return false;
        // Also remove the default-token-* secret volumes
        if (/^default-token-/.test(v.name)) return false;
        return true;
      });
      if (d.spec.volumes.length === 0) delete d.spec.volumes;
    }

    // Remove corresponding auto-injected volumeMounts from every container
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
    stripMounts(d.spec.containers);
    stripMounts(d.spec.initContainers);
    stripMounts(d.spec.ephemeralContainers);
  }

  return d;
};

// 1. Connection & Resource Discovery
router.post("/test-connection", async (req, res) => {
  const { apiServerUrl, token } = req.body;
  
  if (!apiServerUrl || !token) {
    return res.status(400).json({ error: "API Server URL and Token are required." });
  }

  // Auto-fix for common local docker networking issues
  let targetUrl = apiServerUrl;
  if (apiServerUrl.includes('127.0.0.1') || apiServerUrl.includes('localhost')) {
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

    // Attempt 2: Resource Discovery (List Nodes for capacity check)
    console.log(`Handshake successful. Discovering resources from nodes...`);
    const nodes = await k8sRequest(`${targetUrl}/api/v1/nodes`, token);
    
    // Extract capacity from the first node (assuming single-node for local cluster)
    const firstNode = nodes.items[0];
    const capacity = firstNode?.status?.capacity || { cpu: "8", memory: "16Gi" };
    
    // Convert K8s units to our format
    const cpu = parseFloat(capacity.cpu);
    const memStr = capacity.memory;
    let memoryMi = parseInt(memStr);
    if (memStr.endsWith('Ki')) memoryMi = parseInt(memStr) / 1024;
    if (memStr.endsWith('Gi')) memoryMi = parseInt(memStr) * 1024;

    res.json({
      status: 'success',
      capacity: { cpu, memory: memoryMi }
    });
  } catch (error: any) {
    console.error("Connection failed:", error.message);
    res.status(502).json({ error: error.message });
  }
});

// 2. Real Deployment logic
router.post("/deploy", async (req, res) => {
  const { apiServerUrl, token, yamlContent } = req.body;

  if (!yamlContent) return res.status(400).json({ error: "YAML content is required" });

  try {
    const docs = yaml.loadAll(yamlContent) as any[];
    const applied = [];

    for (const doc of docs) {
      if (!doc || !doc.kind) continue;

      // Skip KubeSDK-internal meta documents — these are not real K8s API resources.
      // LocalRunDefinition lives under kubesdk.dev/* and Kubernetes has no CRD for it.
      const apiGroup = doc.apiVersion?.includes('/') ? doc.apiVersion.split('/')[0] : '';
      if (apiGroup === 'kubesdk.dev' || doc.kind === 'LocalRunDefinition') {
        console.log(`Skipping KubeSDK-internal resource: ${doc.kind}/${doc.metadata?.name} (not a real K8s resource)`);
        continue;
      }

      const group = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[0] : '';
      const version = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[1] : doc.apiVersion;
      const apiPrefix = group ? `/apis/${group}/${version}` : `/api/${version}`;
      
      const plural = getK8sPlural(doc.kind);
      const nsPart = doc.metadata.namespace ? `/namespaces/${doc.metadata.namespace}` : '';
      const url = `${apiServerUrl}${apiPrefix}${nsPart}/${plural}/${doc.metadata.name}`;

      // Sanitize: strip cluster-instance-specific injected fields before applying
      const cleanDoc = sanitizeManifest(doc);

      console.log(`Applying K8s resource: ${doc.kind}/${doc.metadata.name} to ${url}`);

      // Use Server-Side Apply (PATCH)
      try {
        await k8sRequest(`${url}?fieldManager=kubesdk&force=true`, token, 'PATCH', yaml.dump(cleanDoc));
        applied.push(`${doc.kind}/${doc.metadata.name}`);
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

  try {
    const results: Record<string, 'healthy' | 'warning'> = {};
    
    for (const ns of namespaces) {
      const pods = await k8sRequest(`${apiServerUrl}/api/v1/namespaces/${ns}/pods`, token);
      const allRunning = pods.items.every((p: any) => p.status.phase === 'Running');
      results[ns] = allRunning ? 'healthy' : 'warning';
      
      pods.items.forEach((p: any) => {
        const name = p.metadata.labels?.app || p.metadata.name;
        results[name] = p.status.phase === 'Running' ? 'healthy' : 'warning';
      });
    }

    res.json(results);
  } catch (error: any) {
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
