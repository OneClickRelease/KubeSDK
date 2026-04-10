import { Router } from "express";
import { KubeSDKLocalRun, ValidationResult } from "../../src/types";

const router = Router();

// Validation Logic for Cluster-wide Resource Planning
router.post("/validate", (req, res) => {
  const run: KubeSDKLocalRun = req.body;
  const issues: ValidationResult['issues'] = [];

  // Example: Check if memory exceeds laptop limits
  const laptopMemory = parseInt(run.laptopProfile.limits.memory);
  let totalMemoryRequest = 0;

  run.components.forEach(comp => {
    // Use SDK resources for capacity checks, fallback to original or generic defaults
    const rawMem = comp.resources.sdk?.memory || comp.resources.original?.memory || "0Mi";
    const val = parseFloat(rawMem) || 0;
    let compMem = val; // in Gi
    if (rawMem.includes('Mi') || rawMem.includes('m')) {
      compMem = val / 1024;
    } else if (!rawMem.includes('Gi') && !rawMem.includes('G')) {
      compMem = val / (1024 * 1024 * 1024);
    }
    totalMemoryRequest += compMem;

    if (compMem > laptopMemory / 2) {
      issues.push({
        id: `mem-limit-${comp.id}`,
        component: comp.id,
        severity: 'warning',
        message: `Memory request (${rawMem}) for ${comp.id} is high for this laptop profile.`,
        suggestion: {
          issueId: `mem-limit-${comp.id}`,
          proposedChange: {
            path: `components.${comp.id}.resources.sdk.memory`,
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

// Generic Resource Validation (URLs, Docker Images)
router.post("/validate-resource", async (req, res) => {
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
        return res.json({ valid: true, message: 'Custom registry (unverified)' });
      }
    }

    res.json({ valid: false, message: 'Unknown validation type' });
  } catch (e: any) {
    res.json({ valid: false, message: e.message });
  }
});

export default router;
