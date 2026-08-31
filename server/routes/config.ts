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

// ---------------------------------------------------------------------------
// Infrastructure Deployment Profiles with Version Control & YAML Persistence
// Stored in config/infrastructure-deployments/
// ---------------------------------------------------------------------------
const DEPLOYMENTS_DIR = path.join(CONFIG_DIR, 'infrastructure-deployments');
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
}

// Helper: Calculate next semantic version
const getNextSemver = (versions: string[], bumpType: 'patch' | 'minor' | 'major' = 'patch'): string => {
  if (!versions || versions.length === 0) return 'v1.0.0';
  const last = versions[versions.length - 1].replace(/^v/, '');
  const [major = 1, minor = 0, patch = 0] = last.split('.').map(n => parseInt(n) || 0);
  if (bumpType === 'major') return `v${major + 1}.0.0`;
  if (bumpType === 'minor') return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
};

// GET /api/config/infra-deployments - List all saved cluster infra profiles
router.get('/infra-deployments', (req, res) => {
  try {
    const profiles: any[] = [];
    const entries = fs.readdirSync(DEPLOYMENTS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const profileId = entry.name;
        const profileFolder = path.join(DEPLOYMENTS_DIR, profileId);
        const metaFile = path.join(profileFolder, 'metadata.json');

        if (fs.existsSync(metaFile)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
            profiles.push(meta);
          } catch (e) {
            console.error(`Error reading meta for ${profileId}:`, e);
          }
        }
      }
    }

    // Sort by updated date descending
    profiles.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    res.json({ status: 'success', profiles });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/config/infra-deployments/:id - Get specific profile & version
router.get('/infra-deployments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const profileFolder = path.join(DEPLOYMENTS_DIR, id);
    const metaFile = path.join(profileFolder, 'metadata.json');

    if (!fs.existsSync(metaFile)) {
      return res.status(404).json({ status: 'error', message: 'Deployment profile not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    const targetVersion = (version as string) || meta.activeVersion || meta.versions?.[meta.versions.length - 1]?.version || 'v1.0.0';
    const yamlFile = path.join(profileFolder, `${targetVersion}.yaml`);

    let yamlContent = '';
    let parsedConfig: any = null;

    if (fs.existsSync(yamlFile)) {
      yamlContent = fs.readFileSync(yamlFile, 'utf-8');
      parsedConfig = yaml.load(yamlContent);
    }

    res.json({
      status: 'success',
      profile: {
        ...meta,
        activeVersion: targetVersion,
        yamlContent,
        config: parsedConfig
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/config/infra-deployments - Save or Update deployment configuration with versioning
router.post('/infra-deployments', (req, res) => {
  try {
    const {
      id: existingId,
      name,
      description,
      config,
      yamlContent: customYaml,
      bumpType = 'patch',
      versionComment = 'Saved configuration update',
      author = 'Platform Architect'
    } = req.body;

    if (!name && !existingId) {
      return res.status(400).json({ status: 'error', message: 'Profile Name is required' });
    }

    const id = existingId || `${(name || 'infra-cluster').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
    const profileFolder = path.join(DEPLOYMENTS_DIR, id);
    if (!fs.existsSync(profileFolder)) {
      fs.mkdirSync(profileFolder, { recursive: true });
    }

    const metaFile = path.join(profileFolder, 'metadata.json');
    let meta: any = {
      id,
      name: name || id,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeVersion: 'v1.0.0',
      versions: []
    };

    if (fs.existsSync(metaFile)) {
      try {
        meta = { ...meta, ...JSON.parse(fs.readFileSync(metaFile, 'utf-8')) };
      } catch (_) {}
    }

    // Determine new version
    const existingVersionStrings = (meta.versions || []).map((v: any) => v.version);
    const newVersion = existingVersionStrings.length === 0 ? 'v1.0.0' : getNextSemver(existingVersionStrings, bumpType);

    // Prepare YAML content
    let finalYaml = customYaml;
    if (!finalYaml && config) {
      finalYaml = yaml.dump(config, { indent: 2, lineWidth: -1 });
    } else if (!finalYaml) {
      finalYaml = `# KubeSDK Cluster Infrastructure\nversion: ${newVersion}\nname: ${name}\n`;
    }

    // Validate YAML
    yaml.load(finalYaml);

    // Save versioned YAML
    const versionYamlFile = path.join(profileFolder, `${newVersion}.yaml`);
    fs.writeFileSync(versionYamlFile, finalYaml, 'utf-8');

    // Save active pointer YAML
    fs.writeFileSync(path.join(profileFolder, 'active.yaml'), finalYaml, 'utf-8');

    // Update metadata
    const versionEntry = {
      version: newVersion,
      savedAt: new Date().toISOString(),
      comment: versionComment,
      author,
      bytes: Buffer.byteLength(finalYaml, 'utf-8'),
      summary: {
        infraType: config?.spec?.infrastructure?.target || config?.infraType || 'baremetal',
        orchestrator: config?.spec?.orchestrator?.engine || config?.orchestrator || 'k3s',
        nodes: config?.spec?.infrastructure?.nodes || config?.nodesCount || 1,
        mode: config?.metadata?.environment || (config?.isAirgap ? 'airgap' : 'online'),
        platformLayersCount: config?.spec?.platformComponents?.filter((p: any) => p.enabled)?.length || 0
      }
    };

    meta.name = name || meta.name;
    meta.description = description !== undefined ? description : meta.description;
    meta.updatedAt = new Date().toISOString();
    meta.activeVersion = newVersion;
    meta.versions.push(versionEntry);
    meta.latestSummary = versionEntry.summary;

    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');

    res.json({
      status: 'success',
      profile: {
        ...meta,
        yamlContent: finalYaml
      }
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/config/infra-deployments/:id - Delete profile or specific version
router.delete('/infra-deployments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const profileFolder = path.join(DEPLOYMENTS_DIR, id);

    if (!fs.existsSync(profileFolder)) {
      return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    if (version && typeof version === 'string') {
      const versionFile = path.join(profileFolder, `${version}.yaml`);
      if (fs.existsSync(versionFile)) fs.unlinkSync(versionFile);

      const metaFile = path.join(profileFolder, 'metadata.json');
      if (fs.existsSync(metaFile)) {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        meta.versions = (meta.versions || []).filter((v: any) => v.version !== version);
        if (meta.versions.length > 0) {
          meta.activeVersion = meta.versions[meta.versions.length - 1].version;
        }
        fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
      }
      return res.json({ status: 'success', message: `Version ${version} deleted` });
    }

    // Delete entire profile directory
    fs.rmSync(profileFolder, { recursive: true, force: true });
    res.json({ status: 'success', message: 'Profile deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/config/infra-deployments/import - Validate & Parse imported YAML
router.post('/infra-deployments/import', (req, res) => {
  try {
    const { yamlContent } = req.body;
    if (!yamlContent || typeof yamlContent !== 'string') {
      return res.status(400).json({ status: 'error', message: 'YAML content required' });
    }

    const parsed: any = yaml.load(yamlContent);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(400).json({ status: 'error', message: 'Invalid YAML object structure' });
    }

    res.json({
      status: 'success',
      parsed,
      yamlContent
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: `YAML parse error: ${err.message}` });
  }
});

export default router;

