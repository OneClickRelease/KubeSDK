import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import registryRouter from '../registry';

describe('Capability Catalog Management Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/registry', registryRouter);
  });

  it('GET /api/registry/capabilities/layers returns hierarchy and enriched providers', async () => {
    const res = await request(app).get('/api/registry/capabilities/layers');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.layers)).toBe(true);
    expect(res.body.layers.length).toBeGreaterThan(0);

    const dbLayer = res.body.layers.find((l: any) => l.id === 'database');
    expect(dbLayer).toBeDefined();
    expect(dbLayer.sub_layers.length).toBeGreaterThan(0);
  });

  it('GET /api/registry/capabilities/files returns all YAML files with version stats', async () => {
    const res = await request(app).get('/api/registry/capabilities/files');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.files)).toBe(true);
    const masterFile = res.body.files.find((f: any) => f.name === 'capability-layers.yaml');
    expect(masterFile).toBeDefined();
    expect(masterFile.type).toBe('master');
  });

  it('GET /api/registry/capabilities/file returns raw file content and metadata', async () => {
    const res = await request(app).get('/api/registry/capabilities/file?path=capability-layers.yaml');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content).toContain('capability-layers');
  });

  it('CRUD lifecycle: Create, update, version bump, deprecate, and delete provider', async () => {
    const testProvName = `VitestTestDB_${Date.now()}`;

    // 1. Create provider
    const createRes = await request(app)
      .post('/api/registry/capabilities/provider')
      .send({
        layerId: 'database',
        subLayerName: 'SQL',
        provider: {
          name: testProvName,
          description: 'A test SQL provider created via Vitest',
          version: 'v1',
          latest_version: '1.0.0',
          license_conditions: 'Apache 2.0',
          protocols_supported: ['TCP', 'JDBC'],
          default_ports: [9999]
        }
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.status).toBe('success');
    expect(createRes.body.provider.name).toBe(testProvName);

    // 2. Edit provider
    const editRes = await request(app)
      .put('/api/registry/capabilities/provider')
      .send({
        layerId: 'database',
        subLayerName: 'SQL',
        oldName: testProvName,
        provider: {
          name: testProvName,
          description: 'Updated test SQL provider description',
          version: 'v1',
          latest_version: '1.0.1',
          license_conditions: 'Apache 2.0',
          default_ports: [9999, 10000]
        }
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.status).toBe('success');
    expect(editRes.body.provider.description).toBe('Updated test SQL provider description');

    // 3. Add new version to provider
    const versionRes = await request(app)
      .post('/api/registry/capabilities/provider/version')
      .send({
        layerId: 'database',
        subLayerName: 'SQL',
        providerName: testProvName,
        newVersion: 'v2',
        latestVersion: '2.0.0',
        changelog: 'Major rewrite with performance optimizations'
      });

    expect(versionRes.status).toBe(200);
    expect(versionRes.body.status).toBe('success');
    expect(versionRes.body.provider.version).toBe('v2');
    expect(versionRes.body.provider.latest_version).toBe('2.0.0');
    expect(Array.isArray(versionRes.body.provider.version_history)).toBe(true);

    // 4. Deprecate provider
    const deprecateRes = await request(app)
      .post('/api/registry/capabilities/provider/deprecate')
      .send({
        layerId: 'database',
        subLayerName: 'SQL',
        providerName: testProvName,
        deprecated: true,
        deprecation_reason: 'Testing deprecation flow'
      });

    expect(deprecateRes.status).toBe(200);
    expect(deprecateRes.body.status).toBe('success');
    expect(deprecateRes.body.deprecated).toBe(true);

    // 5. Delete provider
    const deleteRes = await request(app)
      .delete('/api/registry/capabilities/provider')
      .send({
        layerId: 'database',
        subLayerName: 'SQL',
        providerName: testProvName
      });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.status).toBe('success');
  });

  it('GET /api/registry/capabilities/versions and /api/registry/capabilities/version-content', async () => {
    const versionsRes = await request(app).get('/api/registry/capabilities/versions?file=capabilities/sql.yaml');
    expect(versionsRes.status).toBe(200);
    expect(versionsRes.body.status).toBe('success');
    expect(Array.isArray(versionsRes.body.versions)).toBe(true);
    expect(versionsRes.body.versions.length).toBeGreaterThan(0);

    const firstVer = versionsRes.body.versions[0];
    const contentRes = await request(app).get(`/api/registry/capabilities/version-content?file=capabilities/sql.yaml&versionId=${firstVer.version}`);
    expect(contentRes.status).toBe(200);
    expect(contentRes.body.status).toBe('success');
    expect(typeof contentRes.body.content).toBe('string');
  });

  it('GET /api/registry/capabilities/export handles single file and full catalog zip export', async () => {
    // Single file export
    const fileExportRes = await request(app).get('/api/registry/capabilities/export?file=capability-layers.yaml');
    expect(fileExportRes.status).toBe(200);
    expect(fileExportRes.header['content-type']).toContain('text/yaml');
    expect(fileExportRes.text).toContain('capability-layers');

    // ZIP export
    const zipExportRes = await request(app).get('/api/registry/capabilities/export');
    expect(zipExportRes.status).toBe(200);
    expect(zipExportRes.header['content-type']).toContain('application/zip');
  });

  it('POST /api/registry/capabilities/import validates and imports YAML', async () => {
    const testImportYaml = `sql:
  parent: Database
  providers:
    - name: ImportTestDB
      description: Imported DB for testing
      version: v1
      latest_version: 1.0.0
`;
    const res = await request(app)
      .post('/api/registry/capabilities/import')
      .send({
        content: testImportYaml,
        filename: 'capabilities/import-test.yaml'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Clean up test file immediately
    const testFile = path.join(process.cwd(), 'import', 'supports', 'capabilities', 'import-test.yaml');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('Layer & Sub-layer Lifecycle: Create, edit, sublayer create, sublayer edit, reorder, delete sublayer, delete layer', async () => {
    const testLayerId = `testlayer_${Date.now()}`;
    const testLayerName = `Test Layer ${Date.now()}`;
    const testSubName = `Test SubLayer ${Date.now()}`;

    // 1. Create Top-Level Layer
    const createLayerRes = await request(app)
      .post('/api/registry/capabilities/layer')
      .send({
        id: testLayerId,
        name: testLayerName,
        description: 'Test category layer created via Vitest',
        image_url: 'images/test.png'
      });

    expect(createLayerRes.status).toBe(200);
    expect(createLayerRes.body.status).toBe('success');
    expect(createLayerRes.body.layer.id).toBe(testLayerId);

    // 2. Update Layer
    const editLayerRes = await request(app)
      .put('/api/registry/capabilities/layer')
      .send({
        id: testLayerId,
        name: `${testLayerName} Updated`,
        description: 'Updated description'
      });

    expect(editLayerRes.status).toBe(200);
    expect(editLayerRes.body.status).toBe('success');
    expect(editLayerRes.body.layer.name).toContain('Updated');

    // 3. Create Sub-layer
    const createSubRes = await request(app)
      .post('/api/registry/capabilities/sublayer')
      .send({
        layerId: testLayerId,
        name: testSubName,
        description: 'Test sublayer created via Vitest'
      });

    expect(createSubRes.status).toBe(200);
    expect(createSubRes.body.status).toBe('success');
    expect(createSubRes.body.subLayer.name).toBe(testSubName);

    // 4. Update Sub-layer
    const editSubRes = await request(app)
      .put('/api/registry/capabilities/sublayer')
      .send({
        layerId: testLayerId,
        oldName: testSubName,
        name: `${testSubName} Renamed`,
        description: 'Renamed sublayer description'
      });

    expect(editSubRes.status).toBe(200);
    expect(editSubRes.body.status).toBe('success');
    expect(editSubRes.body.subLayer.name).toContain('Renamed');

    // 5. Reorder layers & sublayers
    const reorderRes = await request(app)
      .post('/api/registry/capabilities/reorder')
      .send({
        layerOrder: [testLayerId, 'database', 'messaging', 'storage'],
        subLayerOrder: {
          database: ['NoSQL', 'SQL', 'Graph', 'Time-Series']
        }
      });

    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.status).toBe('success');

    // 6. Delete Sub-layer
    const deleteSubRes = await request(app)
      .delete('/api/registry/capabilities/sublayer')
      .send({
        layerId: testLayerId,
        name: `${testSubName} Renamed`
      });

    expect(deleteSubRes.status).toBe(200);
    expect(deleteSubRes.body.status).toBe('success');

    // 7. Delete Layer
    const deleteLayerRes = await request(app)
      .delete('/api/registry/capabilities/layer')
      .send({
        id: testLayerId
      });

    expect(deleteLayerRes.status).toBe(200);
    expect(deleteLayerRes.body.status).toBe('success');

    // Clean up created test sublayer yaml file
    const subSlug = testSubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const capFile = path.join(process.cwd(), 'import', 'supports', 'capabilities', `${subSlug}.yaml`);
    if (fs.existsSync(capFile)) {
      fs.unlinkSync(capFile);
    }
  });

  it('POST /api/registry/orchestrator/package generates and downloads a cluster provisioning zip package', async () => {
    const res = await request(app)
      .post('/api/registry/orchestrator/package')
      .send({
        infraType: 'hypervisor-vm',
        orchestrator: 'k3s',
        topology: 'multi-zone-quorum',
        nodesCount: 3,
        vcpu: 4,
        memoryGi: 8,
        diskGi: 50,
        osArch: 'x86_64',
        quorumZone: true,
        clusterName: 'test-cluster'
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
    expect(res.header['content-disposition']).toContain('attachment');
  });

  it('POST /api/registry/orchestrator/package generates a full airgap offline bundle with precheck and image loader', async () => {
    const res = await request(app)
      .post('/api/registry/orchestrator/package')
      .send({
        infraType: 'baremetal',
        orchestrator: 'k3s',
        topology: 'single-node',
        isAirgap: true,
        airgapMethod: 'local-autoload',
        includeWorkloadImages: true,
        workloadImages: ['postgres:16-alpine', 'redis:7-alpine'],
        vcpu: 4,
        memoryGi: 8,
        diskGi: 50,
        clusterName: 'airgap-cluster'
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
    expect(res.header['content-disposition']).toContain('airgap-setup.zip');
  });

  it('POST /api/registry/orchestrator/package supports Baremetal hardware presets (e.g. Raspberry Pi 5 8GB, HPE, Dell)', async () => {
    const res = await request(app)
      .post('/api/registry/orchestrator/package')
      .send({
        infraType: 'baremetal',
        hardwareProfile: {
          id: 'rpi-5-8gb',
          vendor: 'Raspberry Pi',
          name: 'Raspberry Pi 5',
          version: '8GB v1.0',
          category: 'Edge & SBC',
          arch: 'aarch64'
        },
        orchestrator: 'k3s',
        topology: 'single-node',
        isAirgap: true,
        vcpu: 4,
        memoryGi: 8,
        diskGi: 64,
        osArch: 'aarch64',
        clusterName: 'rpi5-cluster'
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
    expect(res.header['content-disposition']).toContain('rpi5-cluster-airgap-setup.zip');
  });

  it('POST /api/registry/orchestrator/package generates Harvester / KubeVirt declarative manifests with Asymmetrical Node Pools (GPU, Storage, Control, Worker)', async () => {
    const res = await request(app)
      .post('/api/registry/orchestrator/package')
      .send({
        infraType: 'hypervisor-vm',
        hypervisorProfile: {
          id: 'harvester',
          name: 'Harvester HCI',
          version: 'v1.3',
          engine: 'KubeVirt / Longhorn',
          category: 'HCI & Cloud-Native',
          vmMode: 'asymmetrical',
          pools: [
            { id: 'pool-cp', name: 'harvester-cp', category: 'control-plane', count: 3, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' },
            { id: 'pool-workers', name: 'harvester-workers', category: 'worker', count: 4, vcpu: 8, memoryGi: 16, diskGi: 100, arch: 'x86_64' },
            { id: 'pool-gpu', name: 'harvester-gpu', category: 'gpu', count: 2, vcpu: 16, memoryGi: 64, diskGi: 200, arch: 'x86_64', gpuModel: 'NVIDIA L40S' },
            { id: 'pool-storage', name: 'harvester-storage', category: 'storage', count: 3, vcpu: 8, memoryGi: 32, diskGi: 500, arch: 'x86_64' }
          ]
        },
        orchestrator: 'rke2',
        topology: 'multi-node',
        isAirgap: true,
        clusterName: 'harvester-hci-cluster'
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
    expect(res.header['content-disposition']).toContain('harvester-hci-cluster-airgap-setup.zip');
  });

  it('POST /api/registry/orchestrator/package generates Proxmox VE batch provisioning scripts for heterogeneous VMs', async () => {
    const res = await request(app)
      .post('/api/registry/orchestrator/package')
      .send({
        infraType: 'hypervisor-vm',
        hypervisorProfile: {
          id: 'proxmox-ve',
          name: 'Proxmox VE',
          version: '8.1',
          engine: 'KVM / QEMU',
          category: 'Open-Source & Linux',
          vmMode: 'asymmetrical',
          pools: [
            { id: 'pool-cp', name: 'pve-cp', category: 'control-plane', count: 3, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' },
            { id: 'pool-worker', name: 'pve-worker', category: 'worker', count: 5, vcpu: 8, memoryGi: 16, diskGi: 100, arch: 'x86_64' }
          ]
        },
        orchestrator: 'k3s',
        topology: 'multi-node',
        clusterName: 'pve-cluster'
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
    expect(res.header['content-disposition']).toContain('pve-cluster-setup.zip');
  });
});
