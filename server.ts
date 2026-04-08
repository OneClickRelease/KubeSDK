import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import yaml from "js-yaml";
import multer from "multer";
import AdmZip from "adm-zip";
import { KubeSDKLocalRun, ValidationResult, ResourcePlan, Component } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  // --- API Routes ---

  // Validation Logic
  app.post("/api/validate", (req, res) => {
    const run: KubeSDKLocalRun = req.body;
    const issues: ValidationResult['issues'] = [];

    // Example: Check if memory exceeds laptop limits
    const laptopMemory = parseInt(run.laptopProfile.limits.memory);
    let totalMemoryRequest = 0;

    run.components.forEach(comp => {
      const compMem = parseInt(comp.resources.original.memory);
      totalMemoryRequest += compMem;

      if (compMem > laptopMemory / 2) {
        issues.push({
          id: `mem-limit-${comp.id}`,
          component: comp.id,
          severity: 'warning',
          message: `Memory request (${comp.resources.original.memory}) for ${comp.id} is high for this laptop profile.`,
          suggestion: {
            issueId: `mem-limit-${comp.id}`,
            proposedChange: {
              path: `components.${comp.id}.resources.original.memory`,
              value: `${Math.floor(laptopMemory / 4)}Gi`
            },
            rationale: "Fits better within laptop memory constraints."
          }
        });
      }
    });

    if (totalMemoryRequest > laptopMemory) {
      issues.push({
        id: 'total-mem-limit',
        severity: 'error',
        message: `Total memory request (${totalMemoryRequest}Gi) exceeds laptop limit (${laptopMemory}Gi).`
      });
    }

    const status = issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass';
    res.json({ status, issues });
  });

  // Fitting Logic (Resource Plan)
  app.post("/api/fit", (req, res) => {
    const run: KubeSDKLocalRun = req.body;
    const plan: ResourcePlan = { components: {} };

    run.components.forEach(comp => {
      // Simple fitting: reduce replicas to 1 and cap CPU/Memory
      plan.components[comp.id] = {
        cpu: "0.5",
        memory: "1Gi",
        replicas: 1
      };
    });

    res.json(plan);
  });

  app.post("/api/import", (req, res) => {
    const { apiServerUrl } = req.body;
    // Simulate fetching cluster config from remote cluster
    res.json({
      status: 'success',
      snapshot: {
        source: {
          type: 'live-cluster',
          clusterId: apiServerUrl || 'remote-cluster',
          extractedAt: new Date().toISOString()
        },
        scope: {
          namespaces: ['default', 'kube-system', 'monitoring', 'production']
        }
      }
    });
  });

  app.post("/api/validate-resource", async (req, res) => {
    const { type, value } = req.body;
    if (!value) return res.json({ valid: false, message: 'Empty value' });
    
    try {
      if (type === 'url') {
        let response = await fetch(value, { method: 'HEAD' }).catch(() => null);
        if (!response || !response.ok) {
          response = await fetch(value, { method: 'GET' }).catch(() => null);
        }
        if (response && response.ok) {
          return res.json({ valid: true });
        }
        return res.json({ valid: false, message: `Unreachable (HTTP ${response?.status || 'Error'})` });
      }

      if (type === 'image') {
        let image = value;
        let tag = 'latest';
        if (image.includes(':')) {
          const parts = image.split(':');
          image = parts[0];
          tag = parts[1] || 'latest';
        }
        
        // If it doesn't contain a dot in the first registry part, assume docker hub
        // e.g. "nginx" -> library/nginx. "quay.io/coreos/prometheus" -> contains dot
        const registryPart = image.split('/')[0];
        const isDockerHub = !registryPart.includes('.');
        
        if (isDockerHub) {
          let repository = image;
          if (!repository.includes('/')) {
            repository = 'library/' + repository;
          }
          const url = `https://hub.docker.com/v2/repositories/${repository}/tags/${tag}`;
          const response = await fetch(url);
          if (response.ok) {
            return res.json({ valid: true, message: 'Verified on Docker Hub' });
          } else if (response.status === 404) {
            return res.json({ valid: false, message: 'Image not found on Docker Hub' });
          } else {
            return res.json({ valid: false, message: `Docker Hub error: HTTP ${response.status}` });
          }
        } else {
          // generic registry: best effort check or just assume ok
          return res.json({ valid: true, message: 'Custom registry (unverified)' });
        }
      }

      res.json({ valid: false, message: 'Unknown validation type' });
    } catch (e: any) {
      res.json({ valid: false, message: e.message });
    }
  });

  app.post("/api/upload-export", upload.single("export"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();
      
      const components: Component[] = [];
      const namespaces = new Set<string>();

      zipEntries.forEach(entry => {
        if (!entry.isDirectory && entry.entryName.endsWith('.yaml')) {
          try {
            const content = entry.getData().toString('utf8');
            yaml.loadAll(content, (doc: any) => {
              const processResource = (res: any) => {
                if (res && res.kind && res.metadata && res.metadata.name) {
                  const kindStr = res.kind.toLowerCase();
                  const ns = res.metadata.namespace || 'default';
                  
                  let kind: 'workload' | 'infra' | 'capability' = 'infra';
                  let category = 'unknown';

                  if (['deployment', 'statefulset', 'daemonset', 'pod', 'job', 'cronjob', 'replicaset'].includes(kindStr)) {
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
                    namespaces.add(res.metadata.name); // Correctly add the namespace being defined
                  }

                  // Any other categories? We can just add them as is, or filter them out if unknown.
                  if (category !== 'unknown') {
                    // Only add namespace to set if it's not a namespace object
                    if (kindStr !== 'namespace') {
                      namespaces.add(ns);
                    }

                    components.push({
                      id: res.metadata.name,
                      kind,
                      namespace: kindStr === 'namespace' ? 'cluster' : ns,
                      category,
                      mandatory: true,
                      runtimeClass: kind === 'workload' ? 'application' : 'infra',
                      resources: {
                        original: {
                          cpu: '100m',
                          memory: '128Mi',
                          replicas: res.spec?.replicas || 1
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

      // Ensure explicit namespace components exist
      namespaces.forEach(ns => {
        if (!components.find(c => c.kind === 'infra' && c.category === 'namespace' && c.id === ns)) {
          components.push({
             id: ns,
             kind: 'infra',
             namespace: 'cluster',
             category: 'namespace',
             mandatory: true,
             runtimeClass: 'infra',
             resources: { original: { cpu: '0', memory: '0', replicas: 1 } }
          });
        }
      });

      res.json({
        status: 'success',
        components
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate", (req, res) => {
    const run: KubeSDKLocalRun = req.body;
    const runtime = run.runtimeExecution.type;
    
    const simulationManifest = yaml.dump(run);
    const files = [];

    if (runtime === 'k3d') {
      const k3dConfig = yaml.dump({
        apiVersion: 'k3d.io/v1alpha4',
        kind: 'Simple',
        metadata: { name: run.runtimeExecution.cluster.name },
        servers: 1,
        agents: 2,
        image: `rancher/k3s:${run.runtimeExecution.cluster.version}`,
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

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
