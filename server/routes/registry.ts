import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import multer from 'multer';

const SUPPORTS_DIR = path.join(process.cwd(), 'import', 'supports');
const CAPABILITY_LAYERS_FILE = path.join(SUPPORTS_DIR, 'capability-layers.yaml');
const CAPABILITIES_DIR = path.join(SUPPORTS_DIR, 'capabilities');

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

// --- Capability Layers & Versioning Management ---

const VERSIONS_DIR = path.join(SUPPORTS_DIR, '.versions');
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

// Helper to sanitize path for versioning directory
function getVersionFolderForRelPath(relPath: string): string {
  const sanitized = relPath.replace(/^[/\\]+/, '').replace(/[/\\]+/g, '_');
  const folder = path.join(VERSIONS_DIR, sanitized);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
}

// Helper: Save a version snapshot of a YAML file
export function saveYamlVersionSnapshot(relPath: string, content: string, action: string, author: string = 'User') {
  try {
    const folder = getVersionFolderForRelPath(relPath);
    const metaFile = path.join(folder, 'versions.json');
    let versions: any[] = [];
    if (fs.existsSync(metaFile)) {
      try {
        versions = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      } catch {
        versions = [];
      }
    }

    const versionNum = versions.length + 1;
    const versionId = `v${versionNum}`;
    const now = new Date();
    const timestampStr = now.toISOString();
    const safeTimestamp = timestampStr.replace(/[:.]/g, '-');
    const snapshotFileName = `${versionId}_${safeTimestamp}.yaml`;
    const snapshotPath = path.join(folder, snapshotFileName);

    fs.writeFileSync(snapshotPath, content, 'utf-8');

    const metaEntry = {
      version: versionId,
      versionNumber: versionNum,
      timestamp: timestampStr,
      action: action || 'Updated file',
      author: author || 'User',
      filename: snapshotFileName,
      size: Buffer.byteLength(content, 'utf-8')
    };

    versions.unshift(metaEntry); // newest first
    fs.writeFileSync(metaFile, JSON.stringify(versions, null, 2), 'utf-8');

    return metaEntry;
  } catch (err) {
    console.error('Error saving YAML version snapshot:', err);
    return null;
  }
}

// Helper: Ensure initial snapshot exists for a file if none exists
function ensureInitialSnapshot(relPath: string, absPath: string) {
  const folder = getVersionFolderForRelPath(relPath);
  const metaFile = path.join(folder, 'versions.json');
  if (!fs.existsSync(metaFile) && fs.existsSync(absPath)) {
    const content = fs.readFileSync(absPath, 'utf-8');
    saveYamlVersionSnapshot(relPath, content, 'Initial version snapshot', 'System');
  }
}

// Helper: Load a capability YAML file given the relative path in capability-layers.yaml
function loadCapabilityFile(relativeFile: string): { providers: any[] } {
  const filePath = path.join(SUPPORTS_DIR, relativeFile);
  if (!fs.existsSync(filePath)) return { providers: [] };
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const doc = yaml.load(raw) as any;
    if (!doc) return { providers: [] };
    const rootKey = Object.keys(doc)[0];
    const data = doc[rootKey] || {};
    return { providers: data.providers || [] };
  } catch {
    return { providers: [] };
  }
}

// Helper: Find capability YAML relative file path given layerId and subLayerName
function findCapabilityFilePath(layerId: string, subLayerName?: string): { relPath: string; absPath: string; rootKey: string } | null {
  if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) return null;
  const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
  const doc = yaml.load(raw) as any;
  const meta = doc['capability-layers'] || {};
  const layersMap = meta.layers || {};
  const layer = layersMap[layerId];
  if (!layer) return null;

  let targetFile = layer.file;
  if (subLayerName && layer.sub_layers && Array.isArray(layer.sub_layers)) {
    const sub = layer.sub_layers.find((s: any) => s.name.toLowerCase() === subLayerName.toLowerCase());
    if (sub && sub.file) {
      targetFile = sub.file;
    }
  }

  if (!targetFile) return null;
  const absPath = path.join(SUPPORTS_DIR, targetFile);
  const filename = path.basename(targetFile, path.extname(targetFile));
  return { relPath: targetFile, absPath, rootKey: filename };
}

// Helper to touch capability-layers.yaml update time
function touchCapabilityLayers(actionDescription: string) {
  if (fs.existsSync(CAPABILITY_LAYERS_FILE)) {
    try {
      const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
      const doc = yaml.load(raw) as any;
      if (doc && doc['capability-layers']) {
        const today = new Date().toISOString().split('T')[0];
        doc['capability-layers'].updated = today;
        const newYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
        fs.writeFileSync(CAPABILITY_LAYERS_FILE, newYaml, 'utf-8');
        saveYamlVersionSnapshot('capability-layers.yaml', newYaml, `Catalog updated: ${actionDescription}`, 'System');
      }
    } catch (e) {
      console.error('Failed to touch capability-layers.yaml:', e);
    }
  }
}

// GET /api/registry/capabilities/layers - Return full layer hierarchy with enriched providers
router.get('/capabilities/layers', (req, res) => {
  try {
    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    // Ensure master layer initial snapshot exists
    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);

    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const meta = doc['capability-layers'] || {};
    const layersMap = meta.layers || {};

    const enrichedLayers: any[] = [];

    for (const [layerKey, layerDef] of Object.entries<any>(layersMap)) {
      const layer: any = {
        id: layerKey,
        name: layerDef.name,
        description: layerDef.description,
        image_url: layerDef.image_url,
        sub_layers: [],
        providers: [],
      };

      if (layerDef.file) {
        ensureInitialSnapshot(layerDef.file, path.join(SUPPORTS_DIR, layerDef.file));
        const { providers } = loadCapabilityFile(layerDef.file);
        layer.providers = providers;
        layer.file = layerDef.file;
      }

      if (layerDef.sub_layers && Array.isArray(layerDef.sub_layers)) {
        for (const sub of layerDef.sub_layers) {
          const subLayer: any = {
            name: sub.name,
            parent: sub.parent,
            description: sub.description,
            image_url: sub.image_url,
            file: sub.file,
            providers: [],
          };
          if (sub.file) {
            ensureInitialSnapshot(sub.file, path.join(SUPPORTS_DIR, sub.file));
            const { providers } = loadCapabilityFile(sub.file);
            subLayer.providers = providers;
          }
          layer.sub_layers.push(subLayer);
        }
      }

      enrichedLayers.push(layer);
    }

    res.json({
      status: 'success',
      version: meta.version,
      updated: meta.updated,
      layers: enrichedLayers,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/files - List all capability YAML files with version stats
router.get('/capabilities/files', (req, res) => {
  try {
    const fileList: any[] = [];

    // Add master capability-layers.yaml
    if (fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      const stats = fs.statSync(CAPABILITY_LAYERS_FILE);
      const folder = getVersionFolderForRelPath('capability-layers.yaml');
      const metaFile = path.join(folder, 'versions.json');
      let versionsCount = 1;
      if (fs.existsSync(metaFile)) {
        try {
          versionsCount = JSON.parse(fs.readFileSync(metaFile, 'utf-8')).length;
        } catch { /* ignore */ }
      }
      fileList.push({
        name: 'capability-layers.yaml',
        relPath: 'capability-layers.yaml',
        type: 'master',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        versionsCount
      });
    }

    // Add files from capabilities directory
    if (fs.existsSync(CAPABILITIES_DIR)) {
      const files = fs.readdirSync(CAPABILITIES_DIR)
        .filter(f => (f.endsWith('.yaml') || f.endsWith('.yml')) && !fs.statSync(path.join(CAPABILITIES_DIR, f)).isDirectory());

      for (const f of files) {
        const fullP = path.join(CAPABILITIES_DIR, f);
        const stats = fs.statSync(fullP);
        const rel = `capabilities/${f}`;
        const folder = getVersionFolderForRelPath(rel);
        const metaFile = path.join(folder, 'versions.json');
        let versionsCount = 1;
        if (fs.existsSync(metaFile)) {
          try {
            versionsCount = JSON.parse(fs.readFileSync(metaFile, 'utf-8')).length;
          } catch { /* ignore */ }
        }
        fileList.push({
          name: f,
          relPath: rel,
          type: 'capability',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          versionsCount
        });
      }
    }

    res.json({ status: 'success', files: fileList });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/file - Get raw content and metadata of a file
router.get('/capabilities/file', (req, res) => {
  try {
    const relPath = req.query.path as string;
    if (!relPath) {
      return res.status(400).json({ status: 'error', message: 'Query parameter "path" is required' });
    }

    const safeRel = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absPath = path.join(SUPPORTS_DIR, safeRel);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const stats = fs.statSync(absPath);

    res.json({
      status: 'success',
      relPath: safeRel,
      name: path.basename(safeRel),
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/versions - Get version history for a file
router.get('/capabilities/versions', (req, res) => {
  try {
    const relPath = req.query.file as string;
    if (!relPath) {
      return res.status(400).json({ status: 'error', message: 'Query parameter "file" is required' });
    }

    const folder = getVersionFolderForRelPath(relPath);
    const metaFile = path.join(folder, 'versions.json');

    if (!fs.existsSync(metaFile)) {
      const absPath = path.join(SUPPORTS_DIR, relPath);
      if (fs.existsSync(absPath)) {
        ensureInitialSnapshot(relPath, absPath);
      }
    }

    let versions: any[] = [];
    if (fs.existsSync(metaFile)) {
      try {
        versions = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      } catch {
        versions = [];
      }
    }

    res.json({ status: 'success', file: relPath, versions });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/version-content - Get content of a specific version snapshot
router.get('/capabilities/version-content', (req, res) => {
  try {
    const relPath = req.query.file as string;
    const versionId = req.query.versionId as string;
    if (!relPath || !versionId) {
      return res.status(400).json({ status: 'error', message: 'Parameters "file" and "versionId" are required' });
    }

    const folder = getVersionFolderForRelPath(relPath);
    const metaFile = path.join(folder, 'versions.json');
    if (!fs.existsSync(metaFile)) {
      return res.status(404).json({ status: 'error', message: 'Version history not found' });
    }

    const versions = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    const entry = versions.find((v: any) => v.version === versionId || v.filename === versionId);
    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Version snapshot not found' });
    }

    const snapshotPath = path.join(folder, entry.filename);
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ status: 'error', message: 'Snapshot file missing' });
    }

    const content = fs.readFileSync(snapshotPath, 'utf-8');
    res.json({ status: 'success', version: entry, content });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/restore-version - Restore a file from a previous snapshot
router.post('/capabilities/restore-version', (req, res) => {
  try {
    const { file: relPath, versionId } = req.body;
    if (!relPath || !versionId) {
      return res.status(400).json({ status: 'error', message: 'file and versionId are required' });
    }

    const folder = getVersionFolderForRelPath(relPath);
    const metaFile = path.join(folder, 'versions.json');
    if (!fs.existsSync(metaFile)) {
      return res.status(404).json({ status: 'error', message: 'Version history not found' });
    }

    const versions = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    const entry = versions.find((v: any) => v.version === versionId || v.filename === versionId);
    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Version snapshot not found' });
    }

    const snapshotPath = path.join(folder, entry.filename);
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ status: 'error', message: 'Snapshot file missing' });
    }

    const restoredContent = fs.readFileSync(snapshotPath, 'utf-8');
    const targetPath = path.join(SUPPORTS_DIR, relPath);

    // Save snapshot of current state before restoration
    if (fs.existsSync(targetPath)) {
      const currentContent = fs.readFileSync(targetPath, 'utf-8');
      saveYamlVersionSnapshot(relPath, currentContent, `Pre-rollback snapshot before restoring ${versionId}`);
    }

    // Write restored content
    fs.writeFileSync(targetPath, restoredContent, 'utf-8');

    // Create snapshot documenting the restoration
    saveYamlVersionSnapshot(relPath, restoredContent, `Restored from version ${versionId} (${entry.timestamp})`);
    touchCapabilityLayers(`Restored ${relPath} from version ${versionId}`);

    res.json({ status: 'success', message: `Restored ${relPath} from version ${versionId}` });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/provider - Create a new provider
router.post('/capabilities/provider', (req, res) => {
  try {
    const { layerId, subLayerName, provider } = req.body;
    if (!layerId || !provider || !provider.name) {
      return res.status(400).json({ status: 'error', message: 'layerId and provider with name are required' });
    }

    const fileInfo = findCapabilityFilePath(layerId, subLayerName);
    if (!fileInfo) {
      return res.status(404).json({ status: 'error', message: `Capability file not found for layer: ${layerId}, subLayer: ${subLayerName}` });
    }

    let doc: any = {};
    if (fs.existsSync(fileInfo.absPath)) {
      ensureInitialSnapshot(fileInfo.relPath, fileInfo.absPath);
      const raw = fs.readFileSync(fileInfo.absPath, 'utf-8');
      doc = yaml.load(raw) || {};
    }

    const rootKey = Object.keys(doc)[0] || fileInfo.rootKey;
    if (!doc[rootKey]) {
      doc[rootKey] = { parent: subLayerName || layerId, providers: [] };
    }
    if (!Array.isArray(doc[rootKey].providers)) {
      doc[rootKey].providers = [];
    }

    // Check if provider name already exists
    const existingIndex = doc[rootKey].providers.findIndex((p: any) => p.name.toLowerCase() === provider.name.toLowerCase());
    if (existingIndex !== -1) {
      return res.status(400).json({ status: 'error', message: `Provider "${provider.name}" already exists in this capability` });
    }

    // Add provider
    const newProv: any = {
      name: provider.name,
      description: provider.description || '',
      image_url: provider.image_url || '',
      website_url: provider.website_url || '',
      repo_url: provider.repo_url || '',
      documentation_url: provider.documentation_url || '',
      version: provider.version || 'v1',
      deprecated: provider.deprecated === true,
      license_conditions: provider.license_conditions || '',
      protocols_supported: provider.protocols_supported || [],
      default_ports: provider.default_ports || [],
      dependencies: provider.dependencies || [],
      ha_recommendation: provider.ha_recommendation || '',
      languages: provider.languages || {}
    };

    if (provider.latest_version) newProv.latest_version = provider.latest_version;
    if (provider.deprecation_reason) newProv.deprecation_reason = provider.deprecation_reason;
    if (provider.resources && (provider.resources.vcpu || provider.resources.memory || provider.resources.disk)) {
      newProv.resources = provider.resources;
    }

    doc[rootKey].providers.push(newProv);

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(fileInfo.absPath, updatedYaml, 'utf-8');

    // Create YAML version snapshot
    saveYamlVersionSnapshot(fileInfo.relPath, updatedYaml, `Added new provider: ${provider.name}`);
    touchCapabilityLayers(`Added provider ${provider.name}`);

    res.json({ status: 'success', message: `Provider "${provider.name}" created successfully`, provider: newProv });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/registry/capabilities/provider - Update an existing provider
router.put('/capabilities/provider', (req, res) => {
  try {
    const { layerId, subLayerName, oldName, provider } = req.body;
    if (!layerId || !provider || !provider.name) {
      return res.status(400).json({ status: 'error', message: 'layerId, provider data and provider name are required' });
    }

    const fileInfo = findCapabilityFilePath(layerId, subLayerName);
    if (!fileInfo || !fs.existsSync(fileInfo.absPath)) {
      return res.status(404).json({ status: 'error', message: 'Capability file not found' });
    }

    ensureInitialSnapshot(fileInfo.relPath, fileInfo.absPath);
    const raw = fs.readFileSync(fileInfo.absPath, 'utf-8');
    const doc = yaml.load(raw) as any;
    const rootKey = Object.keys(doc)[0] || fileInfo.rootKey;

    if (!doc[rootKey] || !Array.isArray(doc[rootKey].providers)) {
      return res.status(404).json({ status: 'error', message: 'No providers list found in YAML' });
    }

    const targetLookup = (oldName || provider.name).toLowerCase();
    const index = doc[rootKey].providers.findIndex((p: any) => p.name.toLowerCase() === targetLookup);

    if (index === -1) {
      return res.status(404).json({ status: 'error', message: `Provider "${oldName || provider.name}" not found` });
    }

    // Preserve existing extra fields while updating
    const existing = doc[rootKey].providers[index];
    doc[rootKey].providers[index] = {
      ...existing,
      ...provider,
      deprecated: provider.deprecated === true,
      deprecation_reason: provider.deprecation_reason || existing.deprecation_reason || ''
    };

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(fileInfo.absPath, updatedYaml, 'utf-8');

    saveYamlVersionSnapshot(fileInfo.relPath, updatedYaml, `Updated provider: ${provider.name}`);
    touchCapabilityLayers(`Updated provider ${provider.name}`);

    res.json({ status: 'success', message: `Provider "${provider.name}" updated successfully`, provider: doc[rootKey].providers[index] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/provider/version - Add a new version for a provider
router.post('/capabilities/provider/version', (req, res) => {
  try {
    const { layerId, subLayerName, providerName, newVersion, latestVersion, changelog, changes } = req.body;
    if (!layerId || !providerName || (!newVersion && !latestVersion)) {
      return res.status(400).json({ status: 'error', message: 'layerId, providerName, and newVersion/latestVersion are required' });
    }

    const fileInfo = findCapabilityFilePath(layerId, subLayerName);
    if (!fileInfo || !fs.existsSync(fileInfo.absPath)) {
      return res.status(404).json({ status: 'error', message: 'Capability file not found' });
    }

    ensureInitialSnapshot(fileInfo.relPath, fileInfo.absPath);
    const raw = fs.readFileSync(fileInfo.absPath, 'utf-8');
    const doc = yaml.load(raw) as any;
    const rootKey = Object.keys(doc)[0] || fileInfo.rootKey;

    const index = doc[rootKey].providers.findIndex((p: any) => p.name.toLowerCase() === providerName.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: 'error', message: `Provider "${providerName}" not found` });
    }

    const existing = doc[rootKey].providers[index];
    const prevVersion = existing.latest_version || existing.version;

    // Archive previous version in history array inside provider if not present
    if (!Array.isArray(existing.version_history)) {
      existing.version_history = [];
    }
    existing.version_history.push({
      version: existing.version || 'v1',
      latest_version: existing.latest_version || '',
      archived_at: new Date().toISOString()
    });

    if (newVersion) existing.version = newVersion;
    if (latestVersion) existing.latest_version = latestVersion;
    if (changelog) existing.last_changelog = changelog;
    if (changes && typeof changes === 'object') {
      Object.assign(existing, changes);
    }

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(fileInfo.absPath, updatedYaml, 'utf-8');

    const desc = `Version bump for ${providerName} (${prevVersion} -> ${latestVersion || newVersion})`;
    saveYamlVersionSnapshot(fileInfo.relPath, updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc, provider: existing });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/provider/deprecate - Toggle deprecation
router.post('/capabilities/provider/deprecate', (req, res) => {
  try {
    const { layerId, subLayerName, providerName, deprecated, deprecation_reason } = req.body;
    if (!layerId || !providerName) {
      return res.status(400).json({ status: 'error', message: 'layerId and providerName are required' });
    }

    const fileInfo = findCapabilityFilePath(layerId, subLayerName);
    if (!fileInfo || !fs.existsSync(fileInfo.absPath)) {
      return res.status(404).json({ status: 'error', message: 'Capability file not found' });
    }

    ensureInitialSnapshot(fileInfo.relPath, fileInfo.absPath);
    const raw = fs.readFileSync(fileInfo.absPath, 'utf-8');
    const doc = yaml.load(raw) as any;
    const rootKey = Object.keys(doc)[0] || fileInfo.rootKey;

    const index = doc[rootKey].providers.findIndex((p: any) => p.name.toLowerCase() === providerName.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: 'error', message: `Provider "${providerName}" not found` });
    }

    const isDep = deprecated !== undefined ? deprecated : !doc[rootKey].providers[index].deprecated;
    doc[rootKey].providers[index].deprecated = isDep;
    if (deprecation_reason !== undefined) {
      doc[rootKey].providers[index].deprecation_reason = deprecation_reason;
    }

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(fileInfo.absPath, updatedYaml, 'utf-8');

    const desc = isDep
      ? `Deprecated provider: ${providerName}${deprecation_reason ? ` (${deprecation_reason})` : ''}`
      : `Un-deprecated provider: ${providerName}`;
    saveYamlVersionSnapshot(fileInfo.relPath, updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({
      status: 'success',
      message: desc,
      deprecated: isDep,
      provider: doc[rootKey].providers[index]
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/registry/capabilities/provider - Delete a provider
router.delete('/capabilities/provider', (req, res) => {
  try {
    const { layerId, subLayerName, providerName } = req.body;
    if (!layerId || !providerName) {
      return res.status(400).json({ status: 'error', message: 'layerId and providerName are required' });
    }

    const fileInfo = findCapabilityFilePath(layerId, subLayerName);
    if (!fileInfo || !fs.existsSync(fileInfo.absPath)) {
      return res.status(404).json({ status: 'error', message: 'Capability file not found' });
    }

    ensureInitialSnapshot(fileInfo.relPath, fileInfo.absPath);
    const raw = fs.readFileSync(fileInfo.absPath, 'utf-8');
    const doc = yaml.load(raw) as any;
    const rootKey = Object.keys(doc)[0] || fileInfo.rootKey;

    if (!doc[rootKey] || !Array.isArray(doc[rootKey].providers)) {
      return res.status(404).json({ status: 'error', message: 'No providers in this capability' });
    }

    const initialLen = doc[rootKey].providers.length;
    doc[rootKey].providers = doc[rootKey].providers.filter((p: any) => p.name.toLowerCase() !== providerName.toLowerCase());

    if (doc[rootKey].providers.length === initialLen) {
      return res.status(404).json({ status: 'error', message: `Provider "${providerName}" not found` });
    }

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(fileInfo.absPath, updatedYaml, 'utf-8');

    const desc = `Deleted provider: ${providerName}`;
    saveYamlVersionSnapshot(fileInfo.relPath, updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/layer - Create a new top-level layer
router.post('/capabilities/layer', (req, res) => {
  try {
    const { id, name, description, image_url, hasFile } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Layer name is required' });
    }

    const layerKey = (id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    if (!layerKey) {
      return res.status(400).json({ status: 'error', message: 'Valid layer identifier is required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    if (!doc['capability-layers']) doc['capability-layers'] = { version: 'v1', layers: {} };
    if (!doc['capability-layers'].layers) doc['capability-layers'].layers = {};

    if (doc['capability-layers'].layers[layerKey]) {
      return res.status(400).json({ status: 'error', message: `Layer "${layerKey}" already exists` });
    }

    const newLayerDef: any = {
      name: name.trim(),
      description: description ? description.trim() : `Platform layer for ${name}`,
      image_url: image_url ? image_url.trim() : `images/${layerKey}.png`
    };

    if (hasFile) {
      const capFileName = `capabilities/${layerKey}.yaml`;
      newLayerDef.file = capFileName;
      const capAbsPath = path.join(SUPPORTS_DIR, capFileName);
      if (!fs.existsSync(capAbsPath)) {
        const initCapYaml = yaml.dump({ [layerKey]: { parent: name, providers: [] } }, { indent: 2 });
        fs.writeFileSync(capAbsPath, initCapYaml, 'utf-8');
        saveYamlVersionSnapshot(capFileName, initCapYaml, `Created initial capability file for ${name}`);
      }
    } else {
      newLayerDef.sub_layers = [];
    }

    doc['capability-layers'].layers[layerKey] = newLayerDef;
    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Created new layer: ${name}`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({
      status: 'success',
      message: desc,
      layer: { id: layerKey, ...newLayerDef }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/registry/capabilities/layer - Update layer metadata
router.put('/capabilities/layer', (req, res) => {
  try {
    const { id, name, description, image_url } = req.body;
    if (!id || !name) {
      return res.status(400).json({ status: 'error', message: 'Layer id and name are required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const layersMap = doc['capability-layers']?.layers;

    if (!layersMap || !layersMap[id]) {
      return res.status(404).json({ status: 'error', message: `Layer "${id}" not found` });
    }

    layersMap[id].name = name.trim();
    if (description !== undefined) layersMap[id].description = description.trim();
    if (image_url !== undefined) layersMap[id].image_url = image_url.trim();

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Updated layer: ${name}`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc, layer: { id, ...layersMap[id] } });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/registry/capabilities/layer - Delete a top-level layer
router.delete('/capabilities/layer', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Layer id is required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const layersMap = doc['capability-layers']?.layers;

    if (!layersMap || !layersMap[id]) {
      return res.status(404).json({ status: 'error', message: `Layer "${id}" not found` });
    }

    const layerName = layersMap[id].name || id;
    delete layersMap[id];

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Deleted layer: ${layerName} (${id})`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/sublayer - Create a new sub-layer
router.post('/capabilities/sublayer', (req, res) => {
  try {
    const { layerId, name, description, image_url, file } = req.body;
    if (!layerId || !name) {
      return res.status(400).json({ status: 'error', message: 'layerId and sub-layer name are required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const layersMap = doc['capability-layers']?.layers;

    if (!layersMap || !layersMap[layerId]) {
      return res.status(404).json({ status: 'error', message: `Parent layer "${layerId}" not found` });
    }

    const layer = layersMap[layerId];
    if (!Array.isArray(layer.sub_layers)) {
      layer.sub_layers = [];
    }

    const subSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const capFileName = file || `capabilities/${subSlug}.yaml`;

    const existingSub = layer.sub_layers.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
    if (existingSub) {
      return res.status(400).json({ status: 'error', message: `Sub-layer "${name}" already exists under ${layer.name}` });
    }

    const newSub: any = {
      name: name.trim(),
      parent: layer.name,
      description: description ? description.trim() : `Sub-layer for ${name}`,
      image_url: image_url ? image_url.trim() : `images/${subSlug}.png`,
      file: capFileName
    };

    // Ensure the underlying capability file exists
    const capAbsPath = path.join(SUPPORTS_DIR, capFileName);
    if (!fs.existsSync(capAbsPath)) {
      const initDoc = { [subSlug]: { parent: layer.name, providers: [] } };
      const initYaml = yaml.dump(initDoc, { indent: 2, lineWidth: -1, noRefs: true });
      fs.writeFileSync(capAbsPath, initYaml, 'utf-8');
      saveYamlVersionSnapshot(capFileName, initYaml, `Created capability file for sub-layer ${name}`);
    }

    layer.sub_layers.push(newSub);

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Added sub-layer ${name} to ${layer.name}`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc, subLayer: newSub });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/registry/capabilities/sublayer - Update sub-layer metadata
router.put('/capabilities/sublayer', (req, res) => {
  try {
    const { layerId, oldName, name, description, image_url } = req.body;
    if (!layerId || !name) {
      return res.status(400).json({ status: 'error', message: 'layerId and sub-layer name are required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const layer = doc['capability-layers']?.layers?.[layerId];

    if (!layer || !Array.isArray(layer.sub_layers)) {
      return res.status(404).json({ status: 'error', message: `Layer "${layerId}" not found or has no sub-layers` });
    }

    const targetLookup = (oldName || name).toLowerCase();
    const sub = layer.sub_layers.find((s: any) => s.name.toLowerCase() === targetLookup);
    if (!sub) {
      return res.status(404).json({ status: 'error', message: `Sub-layer "${oldName || name}" not found` });
    }

    sub.name = name.trim();
    if (description !== undefined) sub.description = description.trim();
    if (image_url !== undefined) sub.image_url = image_url.trim();

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Updated sub-layer ${name} under ${layer.name}`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc, subLayer: sub });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/registry/capabilities/sublayer - Delete a sub-layer
router.delete('/capabilities/sublayer', (req, res) => {
  try {
    const { layerId, name } = req.body;
    if (!layerId || !name) {
      return res.status(400).json({ status: 'error', message: 'layerId and sub-layer name are required' });
    }

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const layer = doc['capability-layers']?.layers?.[layerId];

    if (!layer || !Array.isArray(layer.sub_layers)) {
      return res.status(404).json({ status: 'error', message: `Layer "${layerId}" not found or has no sub-layers` });
    }

    const initLen = layer.sub_layers.length;
    layer.sub_layers = layer.sub_layers.filter((s: any) => s.name.toLowerCase() !== name.toLowerCase());

    if (layer.sub_layers.length === initLen) {
      return res.status(404).json({ status: 'error', message: `Sub-layer "${name}" not found` });
    }

    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = `Deleted sub-layer ${name} from ${layer.name}`;
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/capabilities/reorder - Reorder layers and sub-layers
router.post('/capabilities/reorder', (req, res) => {
  try {
    const { layerOrder, subLayerOrder } = req.body;

    if (!fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      return res.status(404).json({ status: 'error', message: 'capability-layers.yaml not found' });
    }

    ensureInitialSnapshot('capability-layers.yaml', CAPABILITY_LAYERS_FILE);
    const raw = fs.readFileSync(CAPABILITY_LAYERS_FILE, 'utf-8');
    const doc = yaml.load(raw) as any;
    const currentLayers = doc['capability-layers']?.layers || {};

    // 1. Reorder top-level layers
    let reorderedLayers: Record<string, any> = {};

    if (Array.isArray(layerOrder) && layerOrder.length > 0) {
      // Add according to specified order
      for (const key of layerOrder) {
        if (currentLayers[key]) {
          reorderedLayers[key] = currentLayers[key];
        }
      }
      // Add any remaining keys not in layerOrder
      for (const [key, val] of Object.entries(currentLayers)) {
        if (!reorderedLayers[key]) {
          reorderedLayers[key] = val;
        }
      }
    } else {
      reorderedLayers = { ...currentLayers };
    }

    // 2. Reorder sub_layers inside layers
    if (subLayerOrder && typeof subLayerOrder === 'object') {
      for (const [layerKey, subNames] of Object.entries<string[]>(subLayerOrder)) {
        if (reorderedLayers[layerKey] && Array.isArray(reorderedLayers[layerKey].sub_layers) && Array.isArray(subNames)) {
          const currentSubs = reorderedLayers[layerKey].sub_layers;
          const reorderedSubs: any[] = [];

          for (const subName of subNames) {
            const found = currentSubs.find((s: any) => s.name.toLowerCase() === subName.toLowerCase());
            if (found) {
              reorderedSubs.push(found);
            }
          }
          for (const s of currentSubs) {
            if (!reorderedSubs.some((rs: any) => rs.name.toLowerCase() === s.name.toLowerCase())) {
              reorderedSubs.push(s);
            }
          }

          reorderedLayers[layerKey].sub_layers = reorderedSubs;
        }
      }
    }

    doc['capability-layers'].layers = reorderedLayers;
    const updatedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(CAPABILITY_LAYERS_FILE, updatedYaml, 'utf-8');

    const desc = 'Reordered capability layers and sublayers';
    saveYamlVersionSnapshot('capability-layers.yaml', updatedYaml, desc);
    touchCapabilityLayers(desc);

    res.json({ status: 'success', message: desc });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// POST /api/registry/capabilities/import - Import/upload a capability YAML or layers YAML
router.post('/capabilities/import', upload.single('file'), (req, res) => {
  try {
    let yamlContent = '';
    let targetFileName = '';

    if (req.file) {
      yamlContent = req.file.buffer.toString('utf-8');
      targetFileName = req.file.originalname;
    } else if (req.body.content) {
      yamlContent = req.body.content;
      targetFileName = req.body.filename || 'imported-capability.yaml';
    } else {
      return res.status(400).json({ status: 'error', message: 'No file or content provided' });
    }

    // Validate YAML
    let parsed: any;
    try {
      parsed = yaml.load(yamlContent);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('YAML must contain a valid mapping/object');
      }
    } catch (e: any) {
      return res.status(400).json({ status: 'error', message: `Invalid YAML syntax: ${e.message}` });
    }

    const isMaster = targetFileName === 'capability-layers.yaml' || !!parsed['capability-layers'];
    const relPath = isMaster ? 'capability-layers.yaml' : `capabilities/${path.basename(targetFileName)}`;
    const absPath = path.join(SUPPORTS_DIR, relPath);

    // Save snapshot of existing file if present
    if (fs.existsSync(absPath)) {
      const existing = fs.readFileSync(absPath, 'utf-8');
      saveYamlVersionSnapshot(relPath, existing, `Pre-import snapshot before importing ${targetFileName}`);
    }

    // Write file
    fs.writeFileSync(absPath, yamlContent, 'utf-8');

    // Create new snapshot
    saveYamlVersionSnapshot(relPath, yamlContent, `Imported via UI: ${targetFileName}`);
    touchCapabilityLayers(`Imported ${targetFileName}`);

    res.json({
      status: 'success',
      message: `Successfully imported ${targetFileName}`,
      relPath
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/export - Export single YAML or full ZIP bundle
router.get('/capabilities/export', async (req, res) => {
  try {
    const file = req.query.file as string;

    if (file) {
      // Export single file
      const safeRel = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');
      const absPath = path.join(SUPPORTS_DIR, safeRel);

      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ status: 'error', message: 'File not found' });
      }

      const content = fs.readFileSync(absPath, 'utf-8');
      const filename = path.basename(safeRel);
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    }

    // Export all capabilities bundle as ZIP
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip();

    // Add capability-layers.yaml
    if (fs.existsSync(CAPABILITY_LAYERS_FILE)) {
      zip.addLocalFile(CAPABILITY_LAYERS_FILE);
    }

    // Add capabilities directory
    if (fs.existsSync(CAPABILITIES_DIR)) {
      zip.addLocalFolder(CAPABILITIES_DIR, 'capabilities');
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date().toISOString().split('T')[0];
    const zipName = `capability-catalog-export-${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/registry/capabilities/sample-payload - Load and resolve capability provider sample files
router.get('/capabilities/sample-payload', (req, res) => {
  const { sample_code, config_template, framework, build_tool } = req.query;

  if (!sample_code && !config_template) {
    return res.status(400).json({ status: 'error', message: 'sample_code or config_template query parameters are required' });
  }

  let dependencies = '';
  let envVars: any[] = [];
  let snippetTemplate = '';

  try {
    if (sample_code) {
      const samplePath = path.join(CAPABILITIES_DIR, sample_code as string);
      if (fs.existsSync(samplePath)) {
        const raw = fs.readFileSync(samplePath, 'utf-8');
        const doc = yaml.load(raw) as any;
        if (doc) {
          const depsRoot = doc.dependencies || {};
          // Find matching framework key (case-insensitive, loose match)
          const matchedFwKey = Object.keys(depsRoot).find(
            k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === (framework as string || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          ) || Object.keys(depsRoot)[0]; // Fallback to first framework

          if (matchedFwKey) {
            const fwDeps = depsRoot[matchedFwKey] || {};
            // Find matching build tool key (case-insensitive, loose match)
            const matchedBtKey = Object.keys(fwDeps).find(
              k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === (build_tool as string || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            ) || Object.keys(fwDeps)[0]; // Fallback to first build tool

            if (matchedBtKey) {
              dependencies = fwDeps[matchedBtKey] || '';
            }
          }

          // envVars is direct
          envVars = doc.envVars || [];
        }
      }
    }

    if (config_template) {
      const configPath = path.join(CAPABILITIES_DIR, config_template as string);
      if (fs.existsSync(configPath)) {
        snippetTemplate = fs.readFileSync(configPath, 'utf-8');
      }
    }

    res.json({
      status: 'success',
      dependencies,
      envVars,
      snippetTemplate
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/registry/orchestrator/package - Generate a customized cluster setup package (.zip)
router.post('/orchestrator/package', async (req, res) => {
  try {
    const {
      infraType = 'vm',
      hardwareProfile = undefined,
      hypervisorProfile = undefined,
      orchestrator = 'k3s',
      topology = 'single-node',
      nodesCount = 1,
      vcpu = 2,
      memoryGi = 4,
      diskGi = 20,
      osArch = 'x86_64',
      quorumZone = false,
      clusterName = 'kubesdk-cluster',
      isAirgap = false,
      airgapMethod = 'local-autoload',
      includeWorkloadImages = true,
      workloadImages = [],
      privateRegistryUrl = ''
    } = req.body;

    const AdmZipModule = await import('adm-zip');
    const AdmZip = AdmZipModule.default;
    const zip = new AdmZip();

    // 1. Core images catalog
    const coreImages = [
      'rancher/k3s:v1.30.0-k3s1',
      'rancher/pause:3.9',
      'rancher/coredns-coredns:1.10.1',
      'rancher/local-path-provisioner:v0.0.26',
      'rancher/metrics-server:v0.7.0'
    ];
    const userWorkloadImages = (includeWorkloadImages && Array.isArray(workloadImages) && workloadImages.length > 0)
      ? workloadImages
      : ['postgres:16-alpine', 'redis:7-alpine', 'nginx:alpine'];
    const allImagesList = Array.from(new Set([...coreImages, ...userWorkloadImages]));

    // Hardware Vendor Tuning Script
    let hwTuningScript = '';
    const hwVendor = hardwareProfile?.vendor || '';
    const hwName = hardwareProfile?.name || '';
    const hwVersion = hardwareProfile?.version || '';

    if (hwVendor === 'Raspberry Pi') {
      hwTuningScript = `
# ------------------------------------------------------------------------------
# Hardware Tuning: ${hwVendor} ${hwName} (${hwVersion})
# ------------------------------------------------------------------------------
echo "--> Applying Raspberry Pi specific cgroup & network tuning..."
CMD_FILE=""
if [ -f /boot/firmware/cmdline.txt ]; then
  CMD_FILE="/boot/firmware/cmdline.txt"
elif [ -f /boot/cmdline.txt ]; then
  CMD_FILE="/boot/cmdline.txt"
fi

if [ -n "$CMD_FILE" ]; then
  if ! grep -q "cgroup_enable=cpuset" "$CMD_FILE"; then
    echo "  Configuring cgroup memory parameters in $CMD_FILE"
    sudo sed -i '$ s/$/ cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1/' "$CMD_FILE" 2>/dev/null || true
  fi
fi
`;
    } else if (hwVendor === 'HPE' || hwVendor === 'Dell' || hwVendor === 'Cisco') {
      hwTuningScript = `
# ------------------------------------------------------------------------------
# Hardware Tuning: ${hwVendor} ${hwName} (${hwVersion}) - Enterprise Server
# ------------------------------------------------------------------------------
echo "--> Optimizing ${hwVendor} enterprise hardware parameters..."
sudo sysctl -w fs.inotify.max_user_watches=524288 2>/dev/null || true
sudo sysctl -w fs.inotify.max_user_instances=8192 2>/dev/null || true
sudo sysctl -w vm.max_map_count=262144 2>/dev/null || true
`;
    } else if (hwVendor === 'Advantech') {
      hwTuningScript = `
# ------------------------------------------------------------------------------
# Hardware Tuning: Advantech ${hwName} (${hwVersion}) - Industrial Edge IPC
# ------------------------------------------------------------------------------
echo "--> Configuring Advantech industrial edge IPC parameters..."
sudo sysctl -w net.core.rmem_max=16777216 2>/dev/null || true
sudo sysctl -w net.core.wmem_max=16777216 2>/dev/null || true
`;
    } else if (hwVendor === 'IBM') {
      hwTuningScript = `
# ------------------------------------------------------------------------------
# Hardware Tuning: IBM ${hwName} (${hwVersion}) - Mainframe / Enterprise Power
# ------------------------------------------------------------------------------
echo "--> Configuring IBM high-throughput enterprise kernel parameters..."
sudo sysctl -w kernel.pid_max=4194304 2>/dev/null || true
`;
    }

    // 2. Generate install.sh
    let installCommands = '';
    const hypName = hypervisorProfile?.name || 'VM / Hypervisor';
    const isAsymmetric = hypervisorProfile?.vmMode === 'asymmetrical' && Array.isArray(hypervisorProfile?.pools);

    if (isAirgap) {
      installCommands = `#!/bin/bash
# ==============================================================================
# KubeSDK Air-Gapped / Offline Cluster Installer
# Target: ${infraType.toUpperCase()}${hwVendor ? ` [${hwVendor} ${hwName} ${hwVersion}]` : (infraType === 'hypervisor-vm' ? ` [${hypName}]` : '')}
# Mode: ZERO OUTBOUND INTERNET ACCESS REQUIRED
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

echo "========================================================="
echo " Starting KubeSDK Air-Gapped Cluster Installation"
${hwVendor ? `echo " Hardware Profile: ${hwVendor} ${hwName} (${hwVersion})"` : ''}
${infraType === 'hypervisor-vm' ? `echo " Hypervisor Engine: ${hypName} (${isAsymmetric ? 'Asymmetrical Multi-Pool' : 'Symmetrical'})"` : ''}
echo " Topology: ${topology} (${nodesCount} Nodes${quorumZone ? ' + Quorum Arbiter' : ''})"
echo "========================================================="

# Step 1: Run Pre-flight System Checks
if [ -f "\$SCRIPT_DIR/airgap-precheck.sh" ]; then
  echo "--> Running Airgap Environment Pre-checks..."
  bash "\$SCRIPT_DIR/airgap-precheck.sh"
fi

${hwTuningScript}

# Step 2: Prepare Binary and Local Directories
echo "--> Installing local offline binaries to /usr/local/bin..."
sudo mkdir -p /usr/local/bin /etc/rancher/k3s /var/lib/rancher/k3s/agent/images

if [ -f "\$SCRIPT_DIR/bin/k3s" ]; then
  sudo cp "\$SCRIPT_DIR/bin/k3s" /usr/local/bin/k3s
  sudo chmod 755 /usr/local/bin/k3s
fi

# Step 3: Install Offline Registries Config if present
if [ -f "\$SCRIPT_DIR/registries.yaml" ]; then
  echo "--> Deploying offline registry mirrors configuration..."
  sudo cp "\$SCRIPT_DIR/registries.yaml" /etc/rancher/k3s/registries.yaml
fi

# Step 4: Import & Autoload Airgap Container Images
if [ -f "\$SCRIPT_DIR/load-images.sh" ]; then
  echo "--> Loading offline container images into local runtime..."
  bash "\$SCRIPT_DIR/load-images.sh"
fi

# Move any image tarballs directly to k3s agent images autoload path
if [ -d "\$SCRIPT_DIR/images" ]; then
  sudo cp \$SCRIPT_DIR/images/*.tar* /var/lib/rancher/k3s/agent/images/ 2>/dev/null || true
fi

# Step 5: Launch Cluster with Offline Flags
echo "--> Initializing ${orchestrator.toUpperCase()} service in offline mode..."
export INSTALL_K3S_SKIP_DOWNLOAD=true
export INSTALL_K3S_BIN_DIR=/usr/local/bin

${topology === 'single-node' ? `
# Single-Node Offline Server
if [ -f "\$SCRIPT_DIR/bin/install-k3s.sh" ]; then
  sudo -E bash "\$SCRIPT_DIR/bin/install-k3s.sh" --write-kubeconfig-mode 644 --disable traefik
else
  sudo k3s server --write-kubeconfig-mode 644 --disable traefik &
fi
` : `
# Multi-Node / Clustered Offline Server
if [ -f "\$SCRIPT_DIR/bin/install-k3s.sh" ]; then
  sudo -E bash "\$SCRIPT_DIR/bin/install-k3s.sh" --write-kubeconfig-mode 644 --disable traefik
else
  sudo k3s server --write-kubeconfig-mode 644 --disable traefik &
fi

MASTER_IP=$(hostname -I | awk '{print $1}')
NODE_TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token 2>/dev/null || echo "PENDING")

echo ""
echo "==== Offline Worker / Node Join Instructions ===="
echo "On worker, edge, storage, and GPU nodes, run:"
echo "sudo INSTALL_K3S_SKIP_DOWNLOAD=true k3s agent --server https://\${MASTER_IP}:6443 --token \${NODE_TOKEN}"
echo "================================================="
`}

echo "Waiting for cluster control-plane readiness..."
sleep 8
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=120s 2>/dev/null || true
`;
    } else {
      // Standard Online installer
      if (orchestrator === 'k3s') {
        if (topology === 'single-node') {
          installCommands = `#!/bin/bash
set -e
echo "========================================================="
echo " Installing K3s on ${infraType} (${osArch})"
echo "========================================================="

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -
echo "Waiting for node ready status..."
kubectl wait --for=condition=Ready node --all --timeout=120s
`;
        } else {
          installCommands = `#!/bin/bash
set -e
echo "========================================================="
echo " Installing K3s Master + Node Topology (${infraType})"
echo "========================================================="

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -
NODE_TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)
MASTER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "==== Node Pool Join Command ===="
echo "Run this on each worker, storage, CPU, or GPU node:"
echo "curl -sfL https://get.k3s.io | K3S_URL=https://\${MASTER_IP}:6443 K3S_TOKEN=\${NODE_TOKEN} sh -"
echo "================================"
`;
        }
      } else if (orchestrator === 'microk8s') {
        installCommands = `#!/bin/bash
set -e
echo "Installing MicroK8s on ${infraType}..."
sudo snap install microk8s --classic
sudo microk8s status --wait-ready
sudo microk8s enable dns rbac storage
sudo snap alias microk8s.kubectl kubectl
`;
      } else if (orchestrator === 'minikube') {
        const memMb = (Number(memoryGi) || 4) * 1024;
        installCommands = `#!/bin/bash
set -e
echo "Starting Minikube (${vcpu} vCPU, ${memMb} MB RAM)..."
minikube start --cpus=${vcpu} --memory=${memMb}mb ${nodesCount > 1 ? `--nodes=${nodesCount}` : ''}
`;
      } else if (orchestrator === 'rke2') {
        installCommands = `#!/bin/bash
set -e
echo "Installing RKE2 CIS-Hardened Kubernetes..."
curl -sfL https://get.rke2.io | sudo sh -
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service
export PATH=$PATH:/var/lib/rancher/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
`;
      } else {
        installCommands = `#!/bin/bash
set -e
echo "Initializing Kubeadm Kubernetes Cluster..."
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
`;
      }
    }

    // Append ServiceAccount and token bootstrap script
    const rbacScript = `
# -------------------------------------------------------------
# Setup KubeSDK Cluster Admin ServiceAccount & Token
# -------------------------------------------------------------
echo "Configuring KubeSDK Admin RBAC & ServiceAccount Token..."
kubectl apply -f - << 'EOF' || sudo k3s kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-admin-user
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-user-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: cluster-admin-user
    namespace: kube-system
---
apiVersion: v1
kind: Secret
metadata:
  name: cluster-admin-user-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: cluster-admin-user
type: kubernetes.io/service-account-token
EOF

sleep 2

echo ""
echo "========================================================="
echo " KUBESDK RUNTIME CREDENTIALS (Copy to Step 6)"
echo "========================================================="
API_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || sudo k3s kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || echo "https://127.0.0.1:6443")
TOKEN=$(kubectl get secret cluster-admin-user-token -n kube-system -o jsonpath='{.data.token}' 2>/dev/null | base64 --decode 2>/dev/null || sudo k3s kubectl get secret cluster-admin-user-token -n kube-system -o jsonpath='{.data.token}' | base64 --decode 2>/dev/null || echo "")

echo "Cluster API URL: \${API_URL}"
echo ""
echo "Authentication Token:"
echo "\${TOKEN}"
echo "========================================================="
`;

    const fullInstallScript = installCommands + rbacScript;

    // 3. Generate load-images.sh (Offline Image Loader)
    const loadImagesScript = `#!/bin/bash
# ==============================================================================
# KubeSDK Air-Gapped Image Loader
# Loads bundled container images into local containerd / crictl / docker runtime
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="\$SCRIPT_DIR/images"

echo "=== Loading Air-Gapped Container Images ==="

if [ ! -d "\$IMAGES_DIR" ]; then
  echo "Images directory not found at \$IMAGES_DIR. Creating..."
  mkdir -p "\$IMAGES_DIR"
fi

LOADED_COUNT=0

# Detect container runtime
if command -v k3s >/dev/null 2>&1; then
  echo "--> Using k3s containerd runtime (k3s ctr images import)..."
  for tarball in "\$IMAGES_DIR"/*.tar* "\$IMAGES_DIR"/*.tar.zst "\$IMAGES_DIR"/*.tar.gz; do
    if [ -f "\$tarball" ]; then
      echo "  Importing: \$tarball"
      sudo k3s ctr images import "\$tarball"
      LOADED_COUNT=\$((LOADED_COUNT + 1))
    fi
  done
elif command -v ctr >/dev/null 2>&1; then
  echo "--> Using standalone containerd runtime (ctr -n k8s.io images import)..."
  for tarball in "\$IMAGES_DIR"/*.tar* "\$IMAGES_DIR"/*.tar.gz; do
    if [ -f "\$tarball" ]; then
      echo "  Importing: \$tarball"
      sudo ctr -n k8s.io images import "\$tarball"
      LOADED_COUNT=\$((LOADED_COUNT + 1))
    fi
  done
elif command -v docker >/dev/null 2>&1; then
  echo "--> Using Docker runtime (docker load)..."
  for tarball in "\$IMAGES_DIR"/*.tar* "\$IMAGES_DIR"/*.tar.gz; do
    if [ -f "\$tarball" ]; then
      echo "  Loading: \$tarball"
      docker load -i "\$tarball"
      LOADED_COUNT=\$((LOADED_COUNT + 1))
    fi
  done
fi

${privateRegistryUrl ? `
# Push images to private registry mirror if configured
echo "--> Pushing images to private registry mirror: ${privateRegistryUrl}..."
while IFS= read -r img || [ -n "\$img" ]; do
  if [ -n "\$img" ]; then
    TARGET_IMG="${privateRegistryUrl}/\$img"
    echo "  Tagging \$img -> \$TARGET_IMG"
    docker tag "\$img" "\$TARGET_IMG" 2>/dev/null || true
    docker push "\$TARGET_IMG" 2>/dev/null || true
  fi
done < "\$SCRIPT_DIR/images-list.txt"
` : ''}

echo "Image loading complete. Processed \$LOADED_COUNT archive(s)."
`;

    // 4. Generate airgap-precheck.sh (Preflight System Validation)
    const airgapPrecheckScript = `#!/bin/bash
# ==============================================================================
# KubeSDK Air-Gapped Environment Preflight Checks
# Validates offline system requirements, kernel modules, swap, and ports
# ==============================================================================
set -e

echo "=== KubeSDK Air-Gapped Preflight Environment Checks ==="
FAILURES=0

check_module() {
  if lsmod | grep -q "$1"; then
    echo "  [OK] Kernel module '$1' loaded."
  else
    echo "  [WARN] Kernel module '$1' not loaded. Attempting modprobe..."
    sudo modprobe "$1" 2>/dev/null || { echo "  [FAIL] Failed to load '$1'"; FAILURES=$((FAILURES + 1)); }
  fi
}

check_sysctl() {
  local param=$1
  local expected=$2
  local current=$(sysctl -n "$param" 2>/dev/null || echo "unknown")
  if [ "$current" = "$expected" ]; then
    echo "  [OK] Sysctl $param = $expected"
  else
    echo "  [WARN] Sysctl $param is '$current'. Setting to $expected..."
    sudo sysctl -w "$param=$expected" 2>/dev/null || true
  fi
}

check_port() {
  local port=$1
  local desc=$2
  if ss -tuln 2>/dev/null | grep -q ":$port "; then
    echo "  [WARN] Port $port ($desc) is already in use by another process!"
  else
    echo "  [OK] Port $port ($desc) is available."
  fi
}

echo "1. Checking Linux Kernel Modules..."
check_module "overlay"
check_module "br_netfilter"

echo "2. Checking Networking & IP Forwarding..."
check_sysctl "net.bridge.bridge-nf-call-iptables" "1"
check_sysctl "net.ipv4.ip_forward" "1"

echo "3. Checking Local Port Availability..."
check_port "6443" "Kubernetes API Server"
check_port "10250" "Kubelet API"
${topology !== 'single-node' ? `check_port "2379" "etcd Client"\ncheck_port "2380" "etcd Peer"\n` : ''}

echo "4. Checking Memory & Storage..."
MEM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 4096)
if [ "$MEM_MB" -lt 1800 ]; then
  echo "  [WARN] Available RAM is $MEM_MB MB. Minimum 2048 MB recommended."
else
  echo "  [OK] Available RAM: $MEM_MB MB."
fi

FREE_DISK_GB=$(df -BG /var 2>/dev/null | awk 'NR==2{print $4}' | tr -d 'G' || echo 20)
if [ "\${FREE_DISK_GB:-0}" -lt 10 ]; then
  echo "  [WARN] Free disk space in /var is \${FREE_DISK_GB} GB. Recommended >= 20 GB."
else
  echo "  [OK] Free disk space in /var: \${FREE_DISK_GB} GB."
fi

echo "========================================================="
if [ "$FAILURES" -gt 0 ]; then
  echo "Preflight completed with $FAILURES critical failure(s). Please review warnings above."
else
  echo "Preflight check passed successfully! System is ready for offline installation."
fi
echo "========================================================="
`;

    // 5. Generate registries.yaml
    const registriesYaml = privateRegistryUrl ? `mirrors:
  "docker.io":
    endpoint:
      - "${privateRegistryUrl}"
  "*":
    endpoint:
      - "${privateRegistryUrl}"
` : `mirrors:
  "*":
    endpoint:
      - "http://127.0.0.1:5000"
`;

    // 6. Generate images-list.txt
    const imagesListContent = allImagesList.join('\n') + '\n';

    // 7. Generate Hypervisor Provisioning Artifacts (KubeVirt, Harvester, Proxmox, KVM, Vagrant)
    let hypervisorManifestContent = '';
    let hypervisorManifestFilename = '';

    if (infraType === 'hypervisor-vm') {
      const hypId = hypervisorProfile?.id || 'harvester';
      const pools = (isAsymmetric && hypervisorProfile?.pools) ? hypervisorProfile.pools : [
        { id: 'default-vm', name: 'kubesdk-node', category: 'worker', count: Number(nodesCount) || 1, vcpu, memoryGi, diskGi, arch: osArch }
      ];

      if (hypId === 'harvester' || hypId === 'kubevirt' || hypId === 'openshift-virt') {
        hypervisorManifestFilename = hypId === 'harvester' ? 'harvester-vms.yaml' : 'kubevirt-vms.yaml';
        const vmManifests = pools.flatMap((p: any) => {
          const count = Number(p.count) || 1;
          const items = [];
          for (let i = 1; i <= count; i++) {
            const vmName = `${p.name}-${String(i).padStart(2, '0')}`;
            items.push({
              apiVersion: 'kubevirt.io/v1',
              kind: 'VirtualMachine',
              metadata: {
                name: vmName,
                namespace: 'default',
                labels: {
                  'kubesdk.dev/role': p.category,
                  'kubesdk.dev/pool': p.name,
                  'kubesdk.dev/hypervisor': hypId
                }
              },
              spec: {
                running: true,
                template: {
                  metadata: {
                    labels: {
                      'kubesdk.dev/role': p.category,
                      'kubesdk.dev/pool': p.name
                    }
                  },
                  spec: {
                    domain: {
                      cpu: { cores: Number(p.vcpu) || 2 },
                      resources: {
                        requests: {
                          memory: `${p.memoryGi || 4}Gi`
                        }
                      },
                      devices: {
                        disks: [
                          {
                            name: 'boot-disk',
                            disk: { bus: 'virtio' }
                          },
                          {
                            name: 'cloudinitdisk',
                            disk: { bus: 'virtio' }
                          }
                        ],
                        ...(p.category === 'gpu' ? {
                          gpus: [
                            {
                              name: 'gpu-passthrough',
                              deviceName: p.gpuModel ? `nvidia.com/${p.gpuModel.replace(/\s+/g, '-')}` : 'nvidia.com/gpu'
                            }
                          ]
                        } : {})
                      }
                    },
                    volumes: [
                      {
                        name: 'boot-disk',
                        persistentVolumeClaim: {
                          claimName: `${vmName}-root-pvc`
                        }
                      },
                      {
                        name: 'cloudinitdisk',
                        cloudInitNoCloud: {
                          userData: `#cloud-config\nhostname: ${vmName}\nmanage_etc_hosts: true\npackage_update: false\n`
                        }
                      }
                    ]
                  }
                }
              }
            });
          }
          return items;
        });

        hypervisorManifestContent = vmManifests.map((doc: any) => yaml.dump(doc, { indent: 2 })).join('\n---\n');
      } else if (hypId === 'proxmox-ve') {
        hypervisorManifestFilename = 'proxmox-create-vms.sh';
        let vmid = 200;
        const commands = ['#!/bin/bash', 'set -e', '# Proxmox VE Automated Multi-VM Creation Script'];
        pools.forEach((p: any) => {
          const count = Number(p.count) || 1;
          for (let i = 1; i <= count; i++) {
            const vmName = `${p.name}-${String(i).padStart(2, '0')}`;
            commands.push(`echo "Creating Proxmox VM ${vmid} (${vmName}) [${p.category}]..."`);
            commands.push(`qm create ${vmid} --name "${vmName}" --cores ${p.vcpu} --memory ${(p.memoryGi || 4) * 1024} --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-pci --scsi0 local-lvm:${p.diskGi || 50} --ide2 local-lvm:cloudinit --boot c --bootdisk scsi0`);
            vmid++;
          }
        });
        hypervisorManifestContent = commands.join('\n') + '\n';
      } else if (hypId === 'kvm-libvirt') {
        hypervisorManifestFilename = 'kvm-virt-install.sh';
        const commands = ['#!/bin/bash', 'set -e', '# KVM / libvirt Automated Multi-VM Provisioning Script'];
        pools.forEach((p: any) => {
          const count = Number(p.count) || 1;
          for (let i = 1; i <= count; i++) {
            const vmName = `${p.name}-${String(i).padStart(2, '0')}`;
            commands.push(`echo "Provisioning KVM VM: ${vmName} (${p.vcpu} vCPU, ${p.memoryGi} GB RAM)..."`);
            commands.push(`virt-install --name "${vmName}" --vcpus ${p.vcpu} --memory ${(p.memoryGi || 4) * 1024} --disk size=${p.diskGi || 50},bus=virtio --network bridge=virbr0,model=virtio --os-variant ubuntu22.04 --noautoconsole --import`);
          }
        });
        hypervisorManifestContent = commands.join('\n') + '\n';
      } else if (hypId === 'virtualbox-vagrant') {
        hypervisorManifestFilename = 'Vagrantfile';
        let vagrantBody = `Vagrant.configure("2") do |config|\n  config.vm.box = "ubuntu/jammy64"\n\n`;
        pools.forEach((p: any) => {
          const count = Number(p.count) || 1;
          for (let i = 1; i <= count; i++) {
            const vmName = `${p.name}-${String(i).padStart(2, '0')}`;
            vagrantBody += `  config.vm.define "${vmName}" do |node|\n    node.vm.hostname = "${vmName}"\n    node.vm.provider "virtualbox" do |vb|\n      vb.cpus = ${p.vcpu}\n      vb.memory = ${(p.memoryGi || 4) * 1024}\n      vb.name = "${vmName}"\n    end\n  end\n\n`;
          }
        });
        vagrantBody += `end\n`;
        hypervisorManifestContent = vagrantBody;
      }
    }

    // 8. Generate cluster-config.yaml
    const clusterConfigDoc = {
      apiVersion: 'kubesdk.dev/v1alpha1',
      kind: 'OrchestratorTopologySpec',
      metadata: {
        name: clusterName,
        generatedAt: new Date().toISOString(),
        airgapped: isAirgap
      },
      spec: {
        infrastructure: {
          type: infraType,
          hardwareProfile: hardwareProfile || undefined,
          hypervisor: hypervisorProfile || undefined,
          osArch,
          airgap: {
            enabled: isAirgap,
            deliveryMethod: airgapMethod,
            privateRegistryUrl: privateRegistryUrl || undefined
          },
          resourceProfile: {
            vcpu,
            memoryGi: `${memoryGi}Gi`,
            diskGi: `${diskGi}Gi`
          }
        },
        orchestrator: {
          engine: orchestrator,
          topology,
          nodes: Number(nodesCount) || 1,
          quorumZone: Boolean(quorumZone)
        },
        networking: {
          cni: orchestrator === 'k3s' ? 'flannel-builtin' : 'flannel',
          serviceCidr: '10.43.0.0/16',
          podCidr: '10.42.0.0/16'
        },
        bundledImages: allImagesList
      }
    };
    const clusterConfigYaml = yaml.dump(clusterConfigDoc, { indent: 2 });

    // 9. Generate bootstrap-token.sh
    const bootstrapTokenScript = `#!/bin/bash
# Helper script to display KubeSDK credentials
echo "==== Cluster API URL ===="
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || sudo k3s kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || echo "https://127.0.0.1:6443"
echo ""
echo "==== Authentication Token ===="
kubectl get secret cluster-admin-user-token -n kube-system -o jsonpath='{.data.token}' 2>/dev/null | base64 --decode 2>/dev/null || sudo k3s kubectl get secret cluster-admin-user-token -n kube-system -o jsonpath='{.data.token}' | base64 --decode 2>/dev/null || echo ""
echo ""
`;

    // 10. Generate AIRGAP_INSTALL_GUIDE.md
    const airgapGuide = `# KubeSDK Complete Air-Gapped Installation Guide
**Mode:** AIR-GAPPED (100% Offline / Zero Internet Required)
**Target:** ${infraType.toUpperCase()}${hwVendor ? ` [${hwVendor} ${hwName}]` : (infraType === 'hypervisor-vm' ? ` [${hypName}]` : '')}
**Orchestrator:** ${orchestrator.toUpperCase()}
**Topology:** ${topology} (${nodesCount} Node${nodesCount > 1 ? 's' : ''}${quorumZone ? ' + Quorum Arbiter' : ''})
**Node Sizing:** ${vcpu} vCPU / ${memoryGi} GiB RAM / ${diskGi} GiB Disk (${osArch})

---

## Air-Gapped Workflow Overview

\`\`\`text
┌─────────────────────────────────┐       USB / Bastion SCP       ┌─────────────────────────────────┐
│     Connected Host (KubeSDK)    │ ────────────────────────────> │     Air-Gapped Target Host      │
│  - Downloads setup bundle (.zip)│                               │  - 0% Outbound Internet Access  │
│  - Bundles images & binaries    │                               │  - Runs ./install.sh --offline  │
└─────────────────────────────────┘                               └─────────────────────────────────┘
\`\`\`

---

## Step-by-Step Offline Installation

### Step 1: Transfer Package to Target Host
Copy the downloaded package to your offline server (via USB drive, internal bastion host, or jumpbox):
\`\`\`bash
scp -r kubesdk-*-setup.zip user@your-offline-node-ip:/tmp/
ssh user@your-offline-node-ip
cd /tmp
unzip kubesdk-*-setup.zip -d kubesdk-setup
cd kubesdk-setup
chmod +x *.sh
\`\`\`

${hypervisorManifestFilename ? `
### Step 1.5: Hypervisor VM Provisioning (${hypName})
If creating virtual machines on ${hypName}, execute or apply the bundled hypervisor manifest:
\`\`\`bash
${hypervisorManifestFilename.endsWith('.yaml') ? `kubectl apply -f ${hypervisorManifestFilename}` : `bash ./${hypervisorManifestFilename}`}
\`\`\`
` : ''}

### Step 2: Run Pre-Flight Environment Validation
Validate that kernel modules, cgroups, swap, and required network ports are ready:
\`\`\`bash
./airgap-precheck.sh
\`\`\`

### Step 3: Load Offline Container Images
Load all control plane and simulation workload images into the local container runtime cache:
\`\`\`bash
./load-images.sh
\`\`\`

### Step 4: Run Offline Cluster Installation
Execute the self-contained installation without external network calls:
\`\`\`bash
./install.sh
\`\`\`

### Step 5: Extract KubeSDK Credentials
Run the bootstrap helper script to print the connection parameters:
\`\`\`bash
./bootstrap-token.sh
\`\`\`

### Step 6: Connect back to KubeSDK (Step 6 of Wizard)
1. Copy the printed **Cluster API URL** (e.g. \`https://<node-ip>:6443\`) into the **Cluster API URL** input.
2. Copy the **Authentication Token** into the **Authentication Token** input.
3. Click **Test SDK Connection** to verify link establishment.
`;

    // 11. Generate README.md
    const readmeContent = `# KubeSDK Cluster Setup Package
**Target Infrastructure:** ${infraType.toUpperCase()}${hwVendor ? ` [${hwVendor} ${hwName}]` : (infraType === 'hypervisor-vm' ? ` [${hypName}]` : '')}
**Orchestrator:** ${orchestrator.toUpperCase()}
**Deployment Mode:** ${isAirgap ? 'AIR-GAPPED / OFFLINE' : 'STANDARD ONLINE'}
**Topology:** ${topology} (${nodesCount} Node${nodesCount > 1 ? 's' : ''}${quorumZone ? ' + Quorum Arbiter' : ''})
**Node Sizing:** ${vcpu} vCPU / ${memoryGi} GiB RAM / ${diskGi} GiB Disk (${osArch})

---

## Quick Setup Instructions

1. **Transfer Package to Target Host:**
   \`\`\`bash
   scp -r ./* user@your-node-ip:/tmp/kubesdk/
   cd /tmp/kubesdk
   chmod +x *.sh
   \`\`\`

${hypervisorManifestFilename ? `
2. **Deploy VMs on ${hypName}:**
   \`\`\`bash
   ${hypervisorManifestFilename.endsWith('.yaml') ? `kubectl apply -f ${hypervisorManifestFilename}` : `bash ./${hypervisorManifestFilename}`}
   \`\`\`
` : ''}

3. **Run Installation:**
   \`\`\`bash
   ./install.sh
   \`\`\`

4. **Retrieve Credentials for Step 6:**
   \`\`\`bash
   ./bootstrap-token.sh
   \`\`\`
${isAirgap ? '\nFor detailed offline instructions, see `AIRGAP_INSTALL_GUIDE.md`.' : ''}
`;

    // Add files to zip archive
    zip.addFile('install.sh', Buffer.from(fullInstallScript, 'utf-8'), '', 0o755);
    zip.addFile('bootstrap-token.sh', Buffer.from(bootstrapTokenScript, 'utf-8'), '', 0o755);
    zip.addFile('load-images.sh', Buffer.from(loadImagesScript, 'utf-8'), '', 0o755);
    zip.addFile('airgap-precheck.sh', Buffer.from(airgapPrecheckScript, 'utf-8'), '', 0o755);
    zip.addFile('images-list.txt', Buffer.from(imagesListContent, 'utf-8'));
    zip.addFile('registries.yaml', Buffer.from(registriesYaml, 'utf-8'));
    zip.addFile('cluster-config.yaml', Buffer.from(clusterConfigYaml, 'utf-8'));
    if (hypervisorManifestFilename && hypervisorManifestContent) {
      zip.addFile(hypervisorManifestFilename, Buffer.from(hypervisorManifestContent, 'utf-8'), '', hypervisorManifestFilename.endsWith('.sh') ? 0o755 : undefined);
    }
    zip.addFile('AIRGAP_INSTALL_GUIDE.md', Buffer.from(airgapGuide, 'utf-8'));
    zip.addFile('README.md', Buffer.from(readmeContent, 'utf-8'));

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${clusterName}-${isAirgap ? 'airgap-' : ''}setup.zip"`);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;




