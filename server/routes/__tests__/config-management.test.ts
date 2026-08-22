import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import configRouter from '../config';

const app = express();
app.use(express.json());
app.use('/api/config', configRouter);

describe('Infrastructure Configuration API (/api/config)', () => {
  it('GET /api/config/infrastructure returns all presets and settings from YAML', async () => {
    const res = await request(app).get('/api/config/infrastructure');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.baremetalPresets)).toBe(true);
    expect(Array.isArray(res.body.data.hypervisorPlatforms)).toBe(true);
    expect(Array.isArray(res.body.data.cloudProviders)).toBe(true);
    expect(Array.isArray(res.body.data.virtualContainers)).toBe(true);
    expect(res.body.data.baremetalPresets.length).toBeGreaterThan(0);
    expect(res.body.data.hypervisorPlatforms.length).toBeGreaterThan(0);
    expect(res.body.data.cloudProviders.length).toBeGreaterThan(0);
  });

  it('POST /api/config/infrastructure/baremetal adds a new baremetal hardware preset', async () => {
    const newPreset = {
      vendor: 'Supermicro',
      name: 'SuperServer 2029U',
      version: 'v2.1',
      category: 'Enterprise Rack',
      vcpu: 48,
      memoryGi: 192,
      diskGi: 1000,
      arch: 'x86_64',
      desc: 'Dual Intel Xeon Gold 2U High-Density Rack Unit'
    };

    const res = await request(app)
      .post('/api/config/infrastructure/baremetal')
      .send(newPreset);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.item.vendor).toBe('Supermicro');
    expect(res.body.item.id).toBeDefined();

    // Verify it exists in full list
    const getRes = await request(app).get('/api/config/infrastructure');
    const match = getRes.body.data.baremetalPresets.find((p: any) => p.name === 'SuperServer 2029U');
    expect(match).toBeDefined();
    expect(match.vcpu).toBe(48);
  });

  it('POST /api/config/infrastructure/hypervisor adds a new hypervisor engine', async () => {
    const newHypervisor = {
      name: 'SmartOS / bhyve',
      version: 'v8.4',
      engine: 'bhyve on illumos',
      category: 'Open-Source & Linux',
      desc: 'Container and hypervisor virtualization on ZFS kernel'
    };

    const res = await request(app)
      .post('/api/config/infrastructure/hypervisor')
      .send(newHypervisor);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.item.name).toBe('SmartOS / bhyve');
  });

  it('POST /api/config/infrastructure/cloud adds a new cloud provider', async () => {
    const newCloud = {
      name: 'Linode / Akamai Cloud',
      badge: 'Linode Compute',
      defaultRegion: 'us-east',
      regions: [
        { id: 'us-east', name: 'Newark, NJ' },
        { id: 'eu-west', name: 'Frankfurt, DE' }
      ],
      instanceTypes: [
        { id: 'g6-standard-4', name: 'Dedicated 4 CPU', vcpu: 4, memGi: 16, category: 'Dev Optimized' }
      ]
    };

    const res = await request(app)
      .post('/api/config/infrastructure/cloud')
      .send(newCloud);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.item.name).toBe('Linode / Akamai Cloud');
  });

  it('POST /api/config/infrastructure/container adds a new container engine', async () => {
    const newContainer = {
      name: 'MicroShift Sandbox',
      engineType: 'crio',
      category: 'Edge K8s',
      defaultVcpu: 2,
      defaultMemoryGi: 4,
      defaultDiskGi: 25,
      desc: 'Lightweight enterprise edge container runtime'
    };

    const res = await request(app)
      .post('/api/config/infrastructure/container')
      .send(newContainer);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.item.name).toBe('MicroShift Sandbox');
  });

  it('GET /api/config/raw/:fileName reads raw YAML and PUT /api/config/raw/:fileName validates & updates', async () => {
    const readRes = await request(app).get('/api/config/raw/baremetal-presets.yaml');
    expect(readRes.status).toBe(200);
    expect(readRes.body.content).toContain('presets:');

    // Invalid YAML syntax test
    const invalidRes = await request(app)
      .put('/api/config/raw/baremetal-presets.yaml')
      .send({ content: 'invalid: yaml: : :' });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toContain('Invalid YAML syntax');

    // Valid YAML update test
    const validContent = readRes.body.content + '\n# Verified test comment\n';
    const updateRes = await request(app)
      .put('/api/config/raw/baremetal-presets.yaml')
      .send({ content: validContent });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('success');
  });
});
