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

// Helper: K8s API Requester
const k8sRequest = async (url: string, token: string, method: string = 'GET', body: any = null) => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  if (body) {
    if (method === 'PATCH') headers['Content-Type'] = 'application/apply-patch+yaml';
    else headers['Content-Type'] = 'application/json';
  }

  const options: any = { method, headers };
  if (body) options.body = typeof body === 'string' ? body : JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`K8s API Error (${response.status}): ${errText || response.statusText}`);
  }
  return response.json();
};

const k8sRequestRaw = async (url: string, token: string) => {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`K8s API Error (${response.status}): ${errText || response.statusText}`);
  }
  return response.text();
};

const sanitizeManifest = (doc: any): any => {
  const d = JSON.parse(JSON.stringify(doc));
  const metaFieldsToDelete = ['resourceVersion', 'uid', 'selfLink', 'creationTimestamp', 'generation', 'managedFields', 'ownerReferences', 'finalizers'];
  metaFieldsToDelete.forEach(f => delete d.metadata?.[f]);
  delete d.status;

  const cleanPodSpec = (spec: any) => {
    if (!spec) return;
    delete spec.nodeName;
    delete spec.serviceAccount;
    if (Array.isArray(spec.volumes)) {
      spec.volumes = spec.volumes.filter((v: any) => !/^kube-api-access-/.test(v.name) && !/^default-token-/.test(v.name));
      if (spec.volumes.length === 0) delete spec.volumes;
    }
    const stripMounts = (containers: any[]) => {
      if (!Array.isArray(containers)) return;
      containers.forEach((c: any) => {
        if (Array.isArray(c.volumeMounts)) {
          c.volumeMounts = c.volumeMounts.filter((m: any) => !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name));
          if (c.volumeMounts.length === 0) delete c.volumeMounts;
        }
      });
    };
    stripMounts(spec.containers);
    stripMounts(spec.initContainers);
  };

  if (d.kind === 'Pod' && d.spec) cleanPodSpec(d.spec);
  else if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'].includes(d.kind) && d.spec?.template?.spec) {
    cleanPodSpec(d.spec.template.spec);
  }
  return d;
};

const extractComponentFromResource = (res: any, namespaces: Set<string>): any | null => {
  if (!res || !res.kind || !res.metadata || !res.metadata.name) return null;
  const kindStr = res.kind.toLowerCase();
  const ns = res.metadata.namespace || 'default';
  
  if (['replicaset', 'deployment', 'statefulset', 'daemonset', 'job', 'cronjob', 'localrundefinition'].includes(kindStr)) return null;

  let kind: 'workload' | 'infra' | 'capability' = 'infra';
  let category = 'unknown';

  if (kindStr === 'pod') { category = 'application'; kind = 'workload'; }
  else if (kindStr === 'service') { category = 'service'; kind = 'workload'; }
  else if (['ingress', 'endpoints', 'endpointslice'].includes(kindStr)) { category = 'ingress'; kind = 'infra'; }
  else if (['configmap', 'secret'].includes(kindStr)) { category = 'config'; kind = 'infra'; }
  else if (kindStr === 'namespace') { category = 'namespace'; kind = 'infra'; }

  if (category === 'unknown') return null;

  if (kindStr !== 'namespace') namespaces.add(ns);
  else namespaces.add(res.metadata.name);

  let properties: any = {};
  let cpu = '100m';
  let memory = '128Mi';

  if (category === 'application') {
    const spec = res.spec?.template?.spec || res.spec;
    const container = spec?.containers?.[0];
    if (container) {
      properties.image = container.image;
      properties.imagePullPolicy = container.imagePullPolicy || 'Always';
      properties.env = container.env || [];
      properties.volumeMounts = (container.volumeMounts || []).filter((m: any) => !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name));
      properties.volumes = (spec.volumes || []).filter((v: any) => !/^kube-api-access-/.test(v.name) && !/^default-token-/.test(v.name));
      properties.ports = container.ports || [];
      if (container.resources?.requests) {
        cpu = container.resources.requests.cpu || cpu;
        memory = container.resources.requests.memory || memory;
      }
    }
    properties.sourceKind = res.kind;
    properties.labels = res.metadata.labels || {};
  } else if (category === 'service' && res.spec?.ports?.[0]) {
    properties.port = res.spec.ports[0].port;
    properties.targetPort = res.spec.ports[0].targetPort || res.spec.ports[0].port;
    properties.serviceType = res.spec.type || 'ClusterIP';
    properties.selector = res.spec.selector || {};
  } else if (category === 'config') {
    properties.data = res.data || res.stringData || {};
  }

  const readableId = (category === 'application' && res.metadata.labels?.app) ? res.metadata.labels.app : res.metadata.name;

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
      sdk: { cpu, memory, replicas: 1 }
    }
  };
};

// --- ROUTES ---

router.post("/test-connection", async (req, res) => {
  const { apiServerUrl, token } = req.body;
  if (!apiServerUrl || !token) return res.status(400).json({ error: "API Server URL and Token are required." });
  const targetUrl = apiServerUrl.replace(/\/+$/, "");
  try {
    await k8sRequest(`${targetUrl}/api`, token);
    let capacity = { cpu: "8", memory: "16Gi" };
    try {
      const nodes = await k8sRequest(`${targetUrl}/api/v1/nodes`, token);
      if (nodes.items?.[0]?.status?.capacity) capacity = nodes.items[0].status.capacity;
    } catch (e) {}
    const cpu = parseFloat(capacity.cpu);
    const memStr = capacity.memory;
    let memoryMi = parseInt(memStr);
    if (memStr.endsWith('Ki')) memoryMi = parseInt(memStr) / 1024;
    else if (memStr.endsWith('Gi')) memoryMi = parseInt(memStr) * 1024;
    res.json({ status: 'success', capacity: { cpu, memory: memoryMi } });
  } catch (error: any) { res.status(502).json({ error: error.message }); }
});

router.post("/import", async (req, res) => {
  const { apiServerUrl, token } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");
  try {
    const components: any[] = [];
    const namespaces = new Set<string>();
    const fetchResources = async (endpoint: string) => {
      try {
        const data = await k8sRequest(`${targetUrl}${endpoint}`, token);
        if (data.items) data.items.forEach((item: any) => {
          const comp = extractComponentFromResource(item, namespaces);
          if (comp) components.push(comp);
        });
      } catch (e) {}
    };
    await Promise.all([fetchResources('/api/v1/pods'), fetchResources('/api/v1/services'), fetchResources('/api/v1/namespaces'), fetchResources('/apis/networking.k8s.io/v1/ingresses')]);
    
    // De-duplicate by NS/Category/ID
    const uniqueMap = new Map<string, any>();
    components.forEach(c => {
      const key = `${c.namespace}/${c.category}/${c.id}`;
      // Prioritize Pods for metadata
      if (!uniqueMap.has(key) || c.category === 'application') uniqueMap.set(key, c);
    });

    const final = Array.from(uniqueMap.values());
    final.forEach(comp => {
      if (comp.category === 'service' && comp.properties?.selector) {
        const target = final.find(c => c.category === 'application' && c.namespace === comp.namespace && Object.entries(comp.properties.selector).every(([k, v]) => c.properties?.labels?.[k] === v));
        if (target) comp.properties.targetApp = target.id;
      }
    });
    res.json({ status: 'success', snapshot: { components: final, namespaces: Array.from(namespaces) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/parse-snapshot", async (req, res) => {
  const { yaml: yamlContent } = req.body;
  if (!yamlContent) return res.status(400).json({ error: "No YAML content provided" });
  try {
    const docs = yaml.loadAll(yamlContent) as any[];
    const lrd = docs.find(d => d && d.kind === 'LocalRunDefinition');
    if (lrd && lrd.spec?.components) {
      return res.json({ components: lrd.spec.components, dependencyGraph: lrd.spec.dependencyGraph || { edges: [] }, wizard: lrd.spec.wizard });
    }

    const namespacesFound = new Set<string>();
    const uniqueMap = new Map<string, any>();
    const edges: any[] = [];

    // Pass 1: Pods
    for (const doc of docs) {
      if (!doc || doc.kind !== 'Pod') continue;
      const comp = extractComponentFromResource(doc, namespacesFound);
      if (comp) {
        if (doc.metadata?.annotations) {
          comp.category = doc.metadata.annotations['infra.example.com/category'] || comp.category;
          comp.kind = doc.metadata.annotations['infra.example.com/kind'] || comp.kind;
          const deps = doc.metadata.annotations['infra.example.com/depends-on'];
          if (deps) deps.split(',').forEach((to: string) => edges.push({ from: comp.id, to: to.trim() }));
        }
        uniqueMap.set(`${comp.namespace}/${comp.category}/${comp.id}`, comp);
      }
    }
    // Pass 2: Others
    for (const doc of docs) {
      if (!doc || !doc.kind || doc.kind === 'Pod' || doc.kind === 'LocalRunDefinition') continue;
      const comp = extractComponentFromResource(doc, namespacesFound);
      if (comp) {
        const key = `${comp.namespace}/${comp.category}/${comp.id}`;
        if (!uniqueMap.has(key)) {
          if (doc.metadata?.annotations) {
            comp.category = doc.metadata.annotations['infra.example.com/category'] || comp.category;
            comp.kind = doc.metadata.annotations['infra.example.com/kind'] || comp.kind;
          }
          uniqueMap.set(key, comp);
        }
      }
    }

    const final = Array.from(uniqueMap.values());
    final.forEach(comp => {
      if (comp.category === 'service' && comp.properties?.selector) {
        const target = final.find(c => c.category === 'application' && c.namespace === comp.namespace && Object.entries(comp.properties.selector).every(([k, v]) => c.properties?.labels?.[k] === v));
        if (target) comp.properties.targetApp = target.id;
      }
    });

    res.json({ components: final, dependencyGraph: { edges: Array.from(new Set(edges.map(e => JSON.stringify(e)))).map(s => JSON.parse(s)) }, wizard: lrd?.spec?.wizard || { source: 'snapshot_yaml', runtime: { type: 'rancher-desktop', versionConstraint: '>=1.0.0' } } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/deploy", async (req, res) => {
  const { apiServerUrl, token, yamlContent } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");
  try {
    const docs = yaml.loadAll(yamlContent) as any[];
    const applied = [];
    for (const doc of docs) {
      if (!doc || !doc.kind || doc.kind === 'LocalRunDefinition') continue;
      const cleanDoc = sanitizeManifest(doc);
      const group = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[0] : '';
      const version = doc.apiVersion.includes('/') ? doc.apiVersion.split('/')[1] : doc.apiVersion;
      const apiPrefix = group ? `/apis/${group}/${version}` : `/api/${version}`;
      const url = `${targetUrl}${apiPrefix}${doc.metadata.namespace ? `/namespaces/${doc.metadata.namespace}` : ''}/${getK8sPlural(doc.kind)}/${doc.metadata.name}`;

      let exists = false;
      try { await k8sRequest(url, token, 'GET'); exists = true; } catch (e) {}
      if (exists && ['Namespace', 'CustomResourceDefinition'].includes(doc.kind)) { applied.push(`Existing ${doc.kind}/${doc.metadata.name}`); continue; }
      if (exists && doc.kind === 'Pod') {
        await k8sRequest(`${url}?gracePeriodSeconds=0`, token, 'DELETE');
        for (let i = 0; i < 10; i++) { try { await k8sRequest(url, token, 'GET'); await new Promise(r => setTimeout(r, 1000)); } catch (e) { break; } }
      }
      await k8sRequest(`${url}?fieldManager=kubesdk&force=true`, token, 'PATCH', yaml.dump(cleanDoc));
      applied.push(doc.metadata.name);
      if (doc.kind === 'CustomResourceDefinition') await new Promise(r => setTimeout(r, 2000));
    }
    res.json({ status: 'success', applied });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/health-check", async (req, res) => {
  const { apiServerUrl, token, namespaces } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");
  try {
    const results: Record<string, any> = {};
    for (const ns of namespaces) {
      const pods = await k8sRequest(`${targetUrl}/api/v1/namespaces/${ns}/pods`, token);
      const services = await k8sRequest(`${targetUrl}/api/v1/namespaces/${ns}/services`, token);
      const activePods = pods.items.filter((p: any) => !p.metadata.deletionTimestamp);
      
      results[ns] = {
        status: activePods.length > 0 && activePods.every((p: any) => p.status.phase === 'Running') ? 'healthy' : 'warning',
        pods: activePods.map((p: any) => {
          let reason = p.status.phase;
          let message = "";
          if (p.status.containerStatuses) {
            for (const cs of p.status.containerStatuses) {
              if (cs.state.waiting) { reason = cs.state.waiting.reason; message = cs.state.waiting.message; }
              else if (cs.state.terminated) { reason = cs.state.terminated.reason; message = cs.state.terminated.message; }
            }
          }
          return { name: p.metadata.name, phase: p.status.phase, reason, message, ready: p.status.containerStatuses?.every((cs: any) => cs.ready) || false };
        }),
        services: services.items.map((s: any) => ({ name: s.metadata.name, ports: s.spec.ports || [] }))
      };

      for (const p of activePods) {
        const id = p.metadata.labels?.app || p.metadata.name;
        const svc = services.items.find((s: any) => Object.entries(s.spec.selector || {}).every(([k, v]) => p.metadata.labels?.[k] === v));
        const currentPod = results[ns].pods.find((pod: any) => pod.name === p.metadata.name);
        results[id] = { status: p.status.phase === 'Running' ? 'healthy' : 'warning', phase: p.status.phase, reason: currentPod?.reason, message: currentPod?.message };
        if (svc && svc.spec.ports?.[0]) results[id].endpointUrl = `http://localhost:${svc.spec.ports[0].port}`;
      }
    }
    res.json(results);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/logs", async (req, res) => {
  const { apiServerUrl, token, namespace, podName, containerName } = req.body;
  const targetUrl = apiServerUrl?.replace(/\/+$/, "");
  try {
    const logs = await k8sRequestRaw(`${targetUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log${containerName ? `?container=${containerName}` : ''}`, token);
    res.send(logs);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/fit", (req, res) => {
  const run: KubeSDKLocalRun = req.body;
  const plan: ResourcePlan = { components: {} };
  run.components.forEach(comp => {
    plan.components[comp.id] = { cpu: comp.resources?.sdk?.cpu || "100m", memory: comp.resources?.sdk?.memory || "128Mi", replicas: 1 };
  });
  res.json(plan);
});

export default router;
