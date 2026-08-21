import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import exportRouter from '../export';
import fs from 'fs';
import path from 'path';

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  }
}));

describe('scaffolding export routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', exportRouter);
    vi.clearAllMocks();
  });

  describe('POST /stacks/generate', () => {
    it('returns 400 if parameters are missing', async () => {
      const res = await request(app).post('/stacks/generate').send({
        projectName: 'MyTestProj'
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required parameters');
    });

    it('returns a zip package with scaffold files for nodejs app', async () => {
      // Mock registry reading
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify([
        {
          id: 'postgres',
          displayName: 'PostgreSQL Database',
          config: { host: 'localhost', port: 5432 },
          comboPayloads: {
            'nodejs-express-npm': {
              dependencies: 'pg@^8.0.0',
              envVars: [
                { key: 'DB_HOST', value: '{{host}}' }
              ],
              snippetTemplate: 'const pg = require("pg");'
            }
          }
        }
      ]));

      const res = await request(app)
        .post('/stacks/generate')
        .send({
          projectName: 'MyProject',
          namespace: 'gateway',
          app: {
            name: 'api-service',
            language: 'nodejs',
            framework: 'express',
            buildTool: 'npm',
            port: 3000,
            image: 'node:18-alpine',
            capabilities: [
              {
                id: 'postgres',
                displayName: 'Postgres',
                config: { host: 'postgres-service' }
              }
            ],
            envVars: [
              { key: 'DEBUG', value: 'true' }
            ]
          }
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/zip');
      expect(res.header['content-disposition']).toContain('attachment; filename="api-service-scaffold.zip"');
    });

    it('returns a zip package with custom Java package paths and Go module names', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify([]));

      // Test Go with custom module name
      const resGo = await request(app)
        .post('/stacks/generate')
        .send({
          projectName: 'MyProject',
          namespace: 'gateway',
          app: {
            name: 'go-service',
            language: 'go',
            framework: 'gin',
            buildTool: 'go-mod',
            goModuleName: 'custom-go-mod-name'
          }
        });
      expect(resGo.status).toBe(200);

      // Test Java with custom package structure
      const resJava = await request(app)
        .post('/stacks/generate')
        .send({
          projectName: 'MyProject',
          namespace: 'gateway',
          app: {
            name: 'java-service',
            language: 'java',
            framework: 'spring-boot',
            buildTool: 'maven',
            packageName: 'org.mycompany.app',
            groupId: 'org.mycompany',
            artifactId: 'my-app'
          }
        });
      expect(resJava.status).toBe(200);
    });
  });
});
