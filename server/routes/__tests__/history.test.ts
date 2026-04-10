import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import historyRouter from '../history';
import fs from 'fs';
import path from 'path';

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn()
  }
}));

describe('history routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', historyRouter);
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns a list of history files', async () => {
      (fs.readdirSync as any).mockReturnValue(['sim1.yaml', 'sim2.yml', 'other.txt']);
      (fs.statSync as any).mockReturnValue({
        birthtime: new Date('2024-04-10T10:00:00Z'),
        size: 1024
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.history.length).toBe(2); // Only .yaml and .yml
      expect(res.body.history[0].filename).toBe('sim1.yaml');
    });
  });

  describe('GET /:filename', () => {
    it('returns the content of a specific history file', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('mock yaml content');
      
      const res = await request(app).get('/sim1.yaml');

      expect(res.status).toBe(200);
      expect(res.body.yaml).toBe('mock yaml content');
    });

    it('returns 404 if the file is not found', async () => {
      (fs.existsSync as any).mockReturnValue(false);
      const res = await request(app).get('/missing.yaml');
      expect(res.status).toBe(404);
    });

    it('returns 500 on unexpected filesystem error', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('SD Card Failure'); });
      
      const res = await request(app).get('/sim1.yaml');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('SD Card Failure');
    });
  });

  describe('POST /', () => {
    it('saves a new history file', async () => {
      const yamlContent = 'apiVersion: v1\nkind: Pod';
      const res = await request(app)
        .post('/')
        .send({ yaml: yamlContent, name: 'My Sim' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.filename).toMatch(/my-sim.yaml$/);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-sim.yaml'),
        yamlContent,
        'utf-8'
      );
    });

    it('returns 400 if yaml is missing', async () => {
      const res = await request(app).post('/').send({ name: 'Fail' });
      expect(res.status).toBe(400);
    });

    it('returns 500 on write failure', async () => {
      (fs.writeFileSync as any).mockImplementation(() => { throw new Error('Disk full'); });
      const res = await request(app).post('/').send({ yaml: '...' });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /:filename', () => {
    it('deletes a file if it exists', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      
      const res = await request(app).delete('/sim1.yaml');

      expect(res.status).toBe(200);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('returns 404 if file does not exist', async () => {
      (fs.existsSync as any).mockReturnValue(false);
      
      const res = await request(app).delete('/missing.yaml');

      expect(res.status).toBe(404);
    });

    it('returns 500 on unlink failure', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.unlinkSync as any).mockImplementation(() => { throw new Error('Permission denied'); });
      
      const res = await request(app).delete('/sim1.yaml');
      expect(res.status).toBe(500);
    });
  });
});
