import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import yaml from "js-yaml";
import { KubeSDKLocalRun, ValidationResult, ResourcePlan } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
