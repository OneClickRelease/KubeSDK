import { Router } from "express";
import { ResourcePlan, KubeSDKLocalRun } from "../../src/types";

const router = Router();

// Import Logic (Live Cluster Snapshot)
router.post("/import", (req, res) => {
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

// Fitting Logic (Resource Plan)
router.post("/fit", (req, res) => {
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

export default router;
