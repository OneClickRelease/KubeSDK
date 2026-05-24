import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const REGISTRY_FILE = path.join(process.cwd(), 'registry.json');
const HISTORY_DIR = path.join(process.cwd(), 'history');

// Ensure history directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// Ensure registry file exists
if (!fs.existsSync(REGISTRY_FILE)) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// GET /api/registry - List all registered capabilities
router.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    res.json({ status: 'success', registry: JSON.parse(data) });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry - Register or update a capability
router.post('/', (req, res) => {
  try {
    const { sourceFilename, ...capability } = req.body;
    if (!capability.serviceId) {
      return res.status(400).json({ status: 'error', message: 'Service ID is required' });
    }

    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    const registry = JSON.parse(data);
    
    // Always use serviceId as the primary key ID to avoid duplicates
    capability.id = capability.serviceId;
    
    const index = registry.findIndex((c: any) => c.serviceId === capability.serviceId);
    if (index >= 0) {
      registry[index] = { ...registry[index], ...capability, updatedAt: new Date().toISOString() };
    } else {
      registry.push({ ...capability, createdAt: new Date().toISOString() });
    }

    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf-8');
    res.json({ status: 'success', capability });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/reset - Clear all registered capabilities
router.post('/reset', (req, res) => {
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
    res.json({ status: 'success', message: 'Registry reset successfully' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/discover - Extract namespaces and services from a YAML source
router.get('/discover', (req, res) => {
  const { filename } = req.query;
  try {
    let yamlContent = '';
    if (filename) {
      const filePath = path.join(HISTORY_DIR, filename as string);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: 'error', message: 'Source file not found' });
      }
      yamlContent = fs.readFileSync(filePath, 'utf-8');
    } else {
      return res.status(400).json({ status: 'error', message: 'Filename is required' });
    }

    const docs = yaml.loadAll(yamlContent) as any[];
    const result: Record<string, any[]> = {};
    let existingCapabilities: any[] = [];

    docs.forEach(doc => {
      // Find LRD to extract capabilities for UI sync
      if (doc && doc.kind === 'LocalRunDefinition') {
        existingCapabilities = doc.spec?.capabilities || [];
        return;
      }
      
      if (!doc || !doc.kind) return;
      
      const ns = doc.metadata?.namespace || 'default';
      if (!result[ns]) result[ns] = [];

      if (doc.kind === 'Service') {
        result[ns].push({
          id: doc.metadata.name,
          name: doc.metadata.name,
          kind: 'Service',
          ports: doc.spec?.ports || [],
          labels: doc.metadata.labels || {},
          selector: doc.spec?.selector || {}
        });
      }
    });

    res.json({ status: 'success', discovery: result, existingCapabilities });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/upload - Restore capabilities from an uploaded YAML
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

  try {
    const yamlContent = req.file.buffer.toString('utf-8');
    const docs = yaml.loadAll(yamlContent) as any[];
    
    // 1. Find the LocalRunDefinition and extract capabilities
    const lrd = docs.find(d => d && d.kind === 'LocalRunDefinition');
    const capsToRestore = lrd?.spec?.capabilities || [];

    if (capsToRestore.length > 0) {
      const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      const registry = JSON.parse(data);

      capsToRestore.forEach((cap: any) => {
        if (!cap.serviceId) return;
        const index = registry.findIndex((c: any) => c.serviceId === cap.serviceId);
        if (index >= 0) {
          registry[index] = { ...registry[index], ...cap, updatedAt: new Date().toISOString() };
        } else {
          registry.push({ ...cap, createdAt: new Date().toISOString() });
        }
      });

      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf-8');
    }

    // 2. Save the uploaded YAML to history so it can be used for discovery
    const originalName = req.file.originalname || `upload_${Date.now()}.yaml`;
    const filename = originalName.endsWith('.yaml') ? originalName : `${originalName}.yaml`;
    fs.writeFileSync(path.join(HISTORY_DIR, filename), yamlContent, 'utf-8');

    res.json({ 
      status: 'success', 
      message: `Restored ${capsToRestore.length} capabilities.`,
      filename 
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/persist - Manually save registry to a new YAML version
router.post('/persist', (req, res) => {
  const { sourceFilename } = req.body;
  if (!sourceFilename) return res.status(400).json({ error: "Source filename required" });

  try {
    const sourcePath = path.join(HISTORY_DIR, sourceFilename);
    if (!fs.existsSync(sourcePath)) return res.status(404).json({ error: "Source not found" });

    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    const docs = yaml.loadAll(sourceContent) as any[];

    // Load current registry
    const registryData = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));

    // Find or Create LocalRunDefinition
    let lrd = docs.find(d => d && d.kind === 'LocalRunDefinition');
    if (!lrd) {
      lrd = {
        apiVersion: 'kubesdk.dev/v1alpha1',
        kind: 'LocalRunDefinition',
        metadata: { name: 'integrated-run', createdAt: new Date().toISOString() },
        spec: { components: [], capabilities: [], dependencyGraph: { edges: [] } }
      };
      docs.push(lrd);
    }

    // Update with ALL currently registered capabilities
    lrd.spec.capabilities = registryData;

    const integratedYaml = docs.map(doc => yaml.dump(doc, { noRefs: true })).join('---\n');

    // Versioning Logic: base_v1.yaml, base_v2.yaml, etc.
    const baseName = sourceFilename.replace(/_v\d+\.yaml$/, '').replace(/\.yaml$/, '');
    const historyFiles = fs.readdirSync(HISTORY_DIR);
    
    let maxVersion = 0;
    const versionRegex = new RegExp(`^${baseName}_v(\\d+)\\.yaml$`);
    
    historyFiles.forEach(file => {
      const match = file.match(versionRegex);
      if (match) {
        const v = parseInt(match[1]);
        if (v > maxVersion) maxVersion = v;
      }
    });

    const newVersion = maxVersion + 1;
    const newFilename = `${baseName}_v${newVersion}.yaml`;
    
    fs.writeFileSync(path.join(HISTORY_DIR, newFilename), integratedYaml, 'utf-8');

    res.json({ 
      status: 'success', 
      message: `Saved as new version: ${newFilename}`,
      filename: newFilename 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/export - Generate integrated YAML (Resources + Registry Capabilities)
router.get('/export', (req, res) => {
  const { filename } = req.query;
  try {
    if (!filename) return res.status(400).json({ error: "Filename required" });
    
    const filePath = path.join(HISTORY_DIR, filename as string);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Source not found" });
    
    const yamlContent = fs.readFileSync(filePath, 'utf-8');
    const docs = yaml.loadAll(yamlContent) as any[];
    
    // Load registry
    const registryData = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
    
    // Find services in the YAML
    const serviceNames = docs
      .filter(d => d && d.kind === 'Service')
      .map(d => d.metadata.name);

    // Filter registry for matched capabilities
    const matchedCapabilities = registryData.filter((cap: any) => 
      serviceNames.includes(cap.serviceId)
    );

    // Find or Create LocalRunDefinition
    let lrd = docs.find(d => d && d.kind === 'LocalRunDefinition');
    if (!lrd) {
      lrd = {
        apiVersion: 'kubesdk.dev/v1alpha1',
        kind: 'LocalRunDefinition',
        metadata: { name: 'integrated-run', createdAt: new Date().toISOString() },
        spec: { components: [], capabilities: [], dependencyGraph: { edges: [] } }
      };
      docs.push(lrd);
    }

    if (!lrd.spec) lrd.spec = {};
    lrd.spec.capabilities = matchedCapabilities;

    const integratedYaml = docs
      .map(doc => yaml.dump(doc, { noRefs: true }))
      .join('---\n');

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="integrated_${filename}"`);
    res.send(integratedYaml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/registry/:id - Remove a capability
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    let registry = JSON.parse(data);
    
    const newRegistry = registry.filter((c: any) => c.id !== id);
    if (registry.length === newRegistry.length) {
      return res.status(404).json({ status: 'error', message: 'Capability not found' });
    }

    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(newRegistry, null, 2), 'utf-8');
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/download - Download registry as YAML
router.get('/download', (req, res) => {
  try {
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    const registry = JSON.parse(data);
    const yamlData = yaml.dump(registry);
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="capability-registry.yaml"');
    res.send(yamlData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
