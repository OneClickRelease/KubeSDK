import { Router } from "express";
import multer from "multer";
import yaml from "js-yaml";
import AdmZip from "adm-zip";
import { Component, KubeSDKLocalRun } from "../../src/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Offline Cluster Upload & YAML Parsing
router.post("/upload-export", upload.single("export"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    const components: Component[] = [];
    const namespaces = new Set<string>();
    
    // Parse kind whitelist from body
    let whitelist: string[] = ['pod', 'service', 'ingress', 'configmap', 'secret', 'namespace', 'deployment', 'statefulset', 'daemonset'];
    if (req.body.kindWhitelist) {
      try {
        whitelist = JSON.parse(req.body.kindWhitelist);
      } catch (e) {
        console.error("Failed to parse kindWhitelist from request body", e);
      }
    }

    zipEntries.forEach(entry => {
      if (!entry.isDirectory && entry.entryName.endsWith('.yaml')) {
        try {
          const content = entry.getData().toString('utf8');
          yaml.loadAll(content, (doc: any) => {
            const processResource = (res: any) => {
              if (res && res.kind && res.metadata && res.metadata.name) {
                const kindStr = res.kind.toLowerCase();
                
                // Enforcement of Kind Whitelist
                if (!whitelist.includes(kindStr)) {
                  return;
                }

                const ns = res.metadata.namespace || 'default';
                
                let kind: 'workload' | 'infra' | 'capability' = 'infra';
                let category = 'unknown';

                if (['replicaset', 'deployment', 'statefulset', 'daemonset', 'job', 'cronjob'].includes(kindStr)) {
                  // Strictly ignore higher-level controllers. Pod is the sole canonical workload source.
                  return;
                }

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
                  namespaces.add(res.metadata.name);
                }

                if (category !== 'unknown') {
                  if (kindStr !== 'namespace') {
                    namespaces.add(ns);
                  }

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
                      
                      // Filter out ephemeral mounts
                      properties.volumeMounts = (container.volumeMounts || []).filter((m: any) => 
                        !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name)
                      );
                      
                      // Capture and filter volumes
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

                  components.push({
                    id: readableId,
                    kind,
                    namespace: kindStr === 'namespace' ? 'cluster' : ns,
                    category,
                    mandatory: true,
                    runtimeClass: kind === 'workload' ? 'application' : 'infra',
                    properties,
                    resources: {
                      original: {
                        cpu,
                        memory,
                        replicas: res.spec?.replicas || 1
                      },
                      sdk: {
                        cpu: '100m',
                        memory: '128Mi',
                        replicas: 1
                      }
                    }
                  });
                }
              }
            };

            if (doc && doc.items && Array.isArray(doc.items)) {
              doc.items.forEach(processResource);
            } else {
              processResource(doc);
            }
          });
        } catch (e) {
          console.error(`Failed to parse yaml entry ${entry.entryName}`, e);
        }
      }
    });

    namespaces.forEach(ns => {
      if (!components.find(c => c.kind === 'infra' && c.category === 'namespace' && c.id === ns)) {
        components.push({
           id: ns,
           kind: 'infra',
           namespace: 'cluster',
           category: 'namespace',
           mandatory: true,
           runtimeClass: 'infra',
           resources: { 
             original: { cpu: '0', memory: '0', replicas: 1 },
             sdk: { cpu: '0', memory: '0', replicas: 1 } 
           }
        });
      }
    });

    const uniqueComps = new Map<string, Component>();
    components.forEach(c => {
      const key = `${c.namespace}/${c.category}/${c.id}`;
      if (!uniqueComps.has(key)) {
        uniqueComps.set(key, c);
      }
    });

    const finalComponents = Array.from(uniqueComps.values());

    finalComponents.forEach(comp => {
      if (comp.category === 'service' && comp.properties?.selector && Object.keys(comp.properties.selector).length > 0) {
        const selector = comp.properties.selector;
        const targetPod = finalComponents.find(c => {
          if (c.category !== 'application' || c.namespace !== comp.namespace) return false;
          const podLabels = c.properties?.labels || {};
          return Object.entries(selector).every(([key, value]) => podLabels[key] === value);
        });

        if (targetPod) {
          comp.properties.targetApp = targetPod.id;
        }
      }
    });

    res.json({
      status: 'success',
      components: finalComponents,
      namespaces: Array.from(namespaces)
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Deployment Generation logic
router.post("/generate", (req, res) => {
  const run: KubeSDKLocalRun = req.body;
  const runtime = run.runtimeExecution?.type || 'k3d';
  
  const simulationManifest = yaml.dump(run);
  const files = [];

  if (runtime === 'k3d') {
    const k3dConfig = yaml.dump({
      apiVersion: 'k3d.io/v1alpha4',
      kind: 'Simple',
      metadata: { name: run.runtimeExecution?.cluster?.name || 'kubesdk-cluster' },
      servers: 1,
      agents: 2,
      image: `rancher/k3s:${run.runtimeExecution?.cluster?.version || 'latest'}`,
      ports: [
        { port: '8080:80', nodeFilters: ['loadbalancer'] }
      ]
    });

    files.push(
      { path: 'k3d-config.yaml', content: k3dConfig },
      { path: 'simulation.yaml', content: simulationManifest },
      { path: 'deploy.sh', content: '#!/bin/bash\nk3d cluster create --config k3d-config.yaml\nkubectl apply -f simulation.yaml' }
    );
  } else if (runtime === 'rancher-desktop') {
    files.push(
      { path: 'simulation.yaml', content: simulationManifest },
      { path: 'deploy.sh', content: '#!/bin/bash\n# Rancher Desktop: Apply to current context\nkubectl apply -f simulation.yaml' }
    );
  }

  res.json({ files });
});

export default router;
