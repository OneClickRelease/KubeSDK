import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const router = express.Router();
const CONFIG_DIR = path.join(process.cwd(), 'config');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const CONFIG_FILES = {
  baremetal: path.join(CONFIG_DIR, 'baremetal-presets.yaml'),
  hypervisor: path.join(CONFIG_DIR, 'hypervisor-platforms.yaml'),
  cloud: path.join(CONFIG_DIR, 'cloud-providers.yaml'),
  container: path.join(CONFIG_DIR, 'virtual-containers.yaml'),
  general: path.join(CONFIG_DIR, 'general-settings.yaml')
};

const readFileSafe = (filePath: string, fallback: any) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return yaml.load(content) || fallback;
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return fallback;
};

const writeFileSafe = (filePath: string, data: any) => {
  const yamlStr = yaml.dump(data, { indent: 2, lineWidth: -1 });
  fs.writeFileSync(filePath, yamlStr, 'utf-8');
};

// GET /api/config/infrastructure - Retrieve all infrastructure target configurations
router.get('/infrastructure', (req, res) => {
  try {
    const baremetalData = readFileSafe(CONFIG_FILES.baremetal, { presets: [] });
    const hypervisorData = readFileSafe(CONFIG_FILES.hypervisor, { platforms: [] });
    const cloudData = readFileSafe(CONFIG_FILES.cloud, { providers: [] });
    const containerData = readFileSafe(CONFIG_FILES.container, { engines: [] });
    const generalData = readFileSafe(CONFIG_FILES.general, { compilation: {}, orchestratorDefaults: {} });

    res.json({
      status: 'success',
      data: {
        baremetalPresets: baremetalData.presets || [],
        hypervisorPlatforms: hypervisorData.platforms || [],
        cloudProviders: cloudData.providers || [],
        virtualContainers: containerData.engines || [],
        generalSettings: generalData
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/config/infrastructure/:targetType - Add new preset to a target YAML
router.post('/infrastructure/:targetType', (req, res) => {
  try {
    const { targetType } = req.params;
    const newItem = req.body;

    if (!newItem || typeof newItem !== 'object') {
      return res.status(400).json({ status: 'error', message: 'Invalid payload' });
    }

    if (targetType === 'baremetal') {
      const data = readFileSafe(CONFIG_FILES.baremetal, { presets: [] });
      if (!data.presets) data.presets = [];
      
      const id = newItem.id || `${(newItem.vendor || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${(newItem.name || 'node').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const presetToAdd = { ...newItem, id };
      
      // Replace if exists, else append
      const existingIdx = data.presets.findIndex((p: any) => p.id === id);
      if (existingIdx >= 0) {
        data.presets[existingIdx] = presetToAdd;
      } else {
        data.presets.push(presetToAdd);
      }
      
      writeFileSafe(CONFIG_FILES.baremetal, data);
      return res.json({ status: 'success', item: presetToAdd, presets: data.presets });
    }

    if (targetType === 'hypervisor') {
      const data = readFileSafe(CONFIG_FILES.hypervisor, { platforms: [] });
      if (!data.platforms) data.platforms = [];
      
      const id = newItem.id || `${(newItem.name || 'hypervisor').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const platformToAdd = { ...newItem, id };
      
      const existingIdx = data.platforms.findIndex((p: any) => p.id === id);
      if (existingIdx >= 0) {
        data.platforms[existingIdx] = platformToAdd;
      } else {
        data.platforms.push(platformToAdd);
      }
      
      writeFileSafe(CONFIG_FILES.hypervisor, data);
      return res.json({ status: 'success', item: platformToAdd, platforms: data.platforms });
    }

    if (targetType === 'cloud') {
      const data = readFileSafe(CONFIG_FILES.cloud, { providers: [] });
      if (!data.providers) data.providers = [];
      
      const id = newItem.id || `${(newItem.name || 'cloud').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const providerToAdd = {
        ...newItem,
        id,
        badge: newItem.badge || 'Cloud Instance',
        color: newItem.color || 'border-cyan-500 bg-cyan-50/50 text-cyan-700',
        regions: newItem.regions || [{ id: 'us-east-1', name: 'US East' }],
        instanceTypes: newItem.instanceTypes || [
          { id: 'standard-dev', name: 'Standard Dev (4 vCPU / 16GB)', vcpu: 4, memGi: 16, desc: 'Standard cloud instance', category: 'Dev Optimized' }
        ],
        credentialFields: newItem.credentialFields || [
          { key: 'apiKey', label: 'API Key / Access Token', placeholder: 'Secret token...', isSecret: true, desc: 'Cloud API authentication token' }
        ]
      };
      
      const existingIdx = data.providers.findIndex((p: any) => p.id === id);
      if (existingIdx >= 0) {
        data.providers[existingIdx] = providerToAdd;
      } else {
        data.providers.push(providerToAdd);
      }
      
      writeFileSafe(CONFIG_FILES.cloud, data);
      return res.json({ status: 'success', item: providerToAdd, providers: data.providers });
    }

    if (targetType === 'container') {
      const data = readFileSafe(CONFIG_FILES.container, { engines: [] });
      if (!data.engines) data.engines = [];
      
      const id = newItem.id || `${(newItem.name || 'engine').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const engineToAdd = { ...newItem, id };
      
      const existingIdx = data.engines.findIndex((e: any) => e.id === id);
      if (existingIdx >= 0) {
        data.engines[existingIdx] = engineToAdd;
      } else {
        data.engines.push(engineToAdd);
      }
      
      writeFileSafe(CONFIG_FILES.container, data);
      return res.json({ status: 'success', item: engineToAdd, engines: data.engines });
    }

    res.status(400).json({ status: 'error', message: `Unknown target type: ${targetType}` });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/config/infrastructure/:targetType/:id - Remove a preset
router.delete('/infrastructure/:targetType/:id', (req, res) => {
  try {
    const { targetType, id } = req.params;

    if (targetType === 'baremetal') {
      const data = readFileSafe(CONFIG_FILES.baremetal, { presets: [] });
      data.presets = (data.presets || []).filter((p: any) => p.id !== id);
      writeFileSafe(CONFIG_FILES.baremetal, data);
      return res.json({ status: 'success', presets: data.presets });
    }

    if (targetType === 'hypervisor') {
      const data = readFileSafe(CONFIG_FILES.hypervisor, { platforms: [] });
      data.platforms = (data.platforms || []).filter((p: any) => p.id !== id);
      writeFileSafe(CONFIG_FILES.hypervisor, data);
      return res.json({ status: 'success', platforms: data.platforms });
    }

    if (targetType === 'cloud') {
      const data = readFileSafe(CONFIG_FILES.cloud, { providers: [] });
      data.providers = (data.providers || []).filter((p: any) => p.id !== id);
      writeFileSafe(CONFIG_FILES.cloud, data);
      return res.json({ status: 'success', providers: data.providers });
    }

    if (targetType === 'container') {
      const data = readFileSafe(CONFIG_FILES.container, { engines: [] });
      data.engines = (data.engines || []).filter((e: any) => e.id !== id);
      writeFileSafe(CONFIG_FILES.container, data);
      return res.json({ status: 'success', engines: data.engines });
    }

    res.status(400).json({ status: 'error', message: `Unknown target type: ${targetType}` });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/config/raw/:fileName - Read raw YAML content
router.get('/raw/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const safeName = path.basename(fileName);
    const targetFile = safeName === 'languages.yaml'
      ? path.join(process.cwd(), 'import', 'supports', 'languages.yaml')
      : path.join(CONFIG_DIR, safeName);

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ status: 'error', message: `File not found: ${safeName}` });
    }

    const content = fs.readFileSync(targetFile, 'utf-8');
    res.json({ status: 'success', fileName: safeName, content });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/config/raw/:fileName - Save raw YAML content
router.put('/raw/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const { content } = req.body;
    const safeName = path.basename(fileName);

    if (typeof content !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Content must be a string' });
    }

    // Validate YAML syntax before writing
    yaml.load(content);

    const targetFile = safeName === 'languages.yaml'
      ? path.join(process.cwd(), 'import', 'supports', 'languages.yaml')
      : path.join(CONFIG_DIR, safeName);

    fs.writeFileSync(targetFile, content, 'utf-8');
    res.json({ status: 'success', fileName: safeName, message: 'Configuration saved successfully' });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: `Invalid YAML syntax: ${err.message}` });
  }
});

export default router;
