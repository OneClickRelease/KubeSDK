import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import clusterRouter from '../cluster';

global.fetch = vi.fn();

describe('cluster routes', () => {
  let app: express.Express;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', clusterRouter);
    vi.clearAllMocks();
  });

  it('POST /test-connection', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ status: { capacity: { cpu: '4', memory: '8Gi' } } }] }) });
    const res = await request(app).post('/test-connection').send({ apiServerUrl: 'h', token: 't' });
    expect(res.status).toBe(200);
    expect(res.body.capacity.cpu).toBe(4);
  });

  it('POST /import', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    const res = await request(app).post('/import').send({ apiServerUrl: 'h', token: 't' });
    expect(res.status).toBe(200);
  });

  it('POST /health-check', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ metadata: { name: 'p1', labels: { app: 'a' } }, status: { phase: 'Running', containerStatuses: [{ ready: true, state: { running: {} } }] } }] }) });
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ metadata: { name: 's1' }, spec: { selector: { app: 'a' }, ports: [{ port: 80 }] } }] }) });
    const res = await request(app).post('/health-check').send({ apiServerUrl: 'h', token: 't', namespaces: ['default'] });
    expect(res.status).toBe(200);
  });

  it('POST /deploy handles existing Pods', async () => {
    const yamlContent = 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: p1\n  namespace: default';
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ metadata: { name: 'p1' } }) }); // GET exists
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // DELETE pod
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 404 }); // GET (wait for delete)
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH apply
    const res = await request(app).post('/deploy').send({ apiServerUrl: 'h', token: 't', yamlContent });
    expect(res.status).toBe(200);
  });

  it('POST /logs', async () => {
    (fetch as any).mockResolvedValue({ ok: true, text: async () => 'logs' });
    const res = await request(app).post('/logs').send({ apiServerUrl: 'h', token: 't', namespace: 'n', podName: 'p' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('logs');
  });

  it('POST /fit', async () => {
    const res = await request(app).post('/fit').send({ components: [{ id: 'a' }] });
    expect(res.status).toBe(200);
  });

  it('POST /parse-snapshot', async () => {
    const yamlContent = 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: p\n  annotations:\n    infra.example.com/category: app\n---\nkind: Service\nmetadata:\n  name: s';
    const res = await request(app).post('/parse-snapshot').send({ yaml: yamlContent });
    expect(res.status).toBe(200);
    expect(res.body.components.length).toBe(2);
  });
});
