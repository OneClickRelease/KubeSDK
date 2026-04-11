import { describe, it, expect } from 'vitest';
import { generateYamlFromConfig } from '../yaml-utils';
import { KubeSDKLocalRun } from '../../types';
import yaml from 'js-yaml';

describe('yaml-utils', () => {
  const baseConfig: KubeSDKLocalRun = {
    apiVersion: 'kubesdk.dev/v1alpha1',
    kind: 'LocalRunDefinition',
    metadata: {
      name: 'test-run',
      createdBy: 'test-user',
      createdAt: new Date().toISOString(),
      toolVersion: '1.0.0'
    },
    wizard: {
      source: 'manual',
      runtime: {
        type: 'k3d',
        versionConstraint: '>=1.0.0'
      },
      steps: { completed: [] }
    },
    components: [],
    capabilities: [],
    dependencyGraph: { edges: [] },
    laptopProfile: {
      detected: { cpuCores: 8, memoryGi: 16, diskGi: 512, os: 'darwin' },
      limits: { cpu: 4, memory: '8Gi', disk: '100Gi' }
    },
    runtimeExecution: {
      type: 'k3d',
      cluster: { name: 'test-cluster', version: 'v1.24.0' },
      order: []
    }
  };

  it('generates a CRD first if it exists', () => {
    const yamlString = generateYamlFromConfig(baseConfig);
    const docs = yaml.loadAll(yamlString) as any[];
    expect(docs[0].kind).toBe('CustomResourceDefinition');
  });

  it('generates a LocalRunDefinition with metadata', () => {
    const yamlString = generateYamlFromConfig(baseConfig);
    const docs = yaml.loadAll(yamlString) as any[];
    const lrd = docs.find(d => d.kind === 'LocalRunDefinition');
    expect(lrd).toBeDefined();
    expect(lrd.metadata.annotations['kubesdk.dev/sync-at']).toBeDefined();
  });

  it('handles ignored namespaces', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      wizard: { ...baseConfig.wizard, ignoredNamespaces: ['kube-system'] },
      components: [
        {
          id: 'kube-system',
          kind: 'infra',
          category: 'namespace',
          namespace: 'cluster',
          mandatory: true,
          runtimeClass: 'infra',
          resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } }
        }
      ]
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    expect(docs.some(d => d.kind === 'Namespace' && d.metadata.name === 'kube-system')).toBe(false);
  });

  it('generates a Pod for an application component', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      components: [
        {
          id: 'web-app',
          kind: 'workload',
          category: 'application',
          namespace: 'apps',
          mandatory: true,
          runtimeClass: 'application',
          properties: { image: 'nginx:latest', ports: [{ containerPort: 80 }] },
          resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } }
        }
      ]
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    const pod = docs.find(d => d.kind === 'Pod' && d.metadata.name === 'web-app');
    expect(pod).toBeDefined();
    expect(pod.spec.containers[0].image).toBe('nginx:latest');
  });

  it('generates ConfigMaps for aggregated env vars', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      components: [
        { id: 'api', kind: 'workload', category: 'application', namespace: 'backend', mandatory: true, runtimeClass: 'application', properties: { envVars: 'DB_URL=postgres://db:5432' }, resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } } },
        { id: 'db', kind: 'infra', category: 'database', namespace: 'infra', mandatory: true, runtimeClass: 'infra', resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } } }
      ],
      dependencyGraph: { edges: [{ from: 'api', to: 'db' }] }
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    const cm = docs.find(d => d.kind === 'ConfigMap' && d.metadata.name === 'infra' && d.metadata.namespace === 'backend');
    expect(cm.data.DB_URL).toBe('postgres://db:5432');
  });

  it('generates Ingress, Service, and Secret', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      components: [
        { id: 'ing', kind: 'infra', category: 'ingress', namespace: 'ns', mandatory: true, runtimeClass: 'infra', properties: { hostname: 'h', targetApp: 'a', port: 80 }, resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } } },
        { id: 'svc', kind: 'infra', category: 'service', namespace: 'ns', mandatory: true, runtimeClass: 'infra', properties: { port: 80, targetApp: 'a' }, resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } } },
        { id: 'my-secret', kind: 'infra', category: 'config', namespace: 'ns', mandatory: true, runtimeClass: 'infra', properties: { data: { k: 'v' } }, resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } } }
      ]
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    expect(docs.find(d => d.kind === 'Ingress')).toBeDefined();
    expect(docs.find(d => d.kind === 'Service')).toBeDefined();
    expect(docs.find(d => d.kind === 'Secret')).toBeDefined();
  });

  it('generates Pod with envFrom and HelmRelease', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      components: [
        { id: 'app', kind: 'workload', category: 'application', namespace: 'ns', mandatory: true, runtimeClass: 'app', config: { configMaps: ['cm'], secrets: ['sec'] }, resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } } },
        { id: 'h', kind: 'workload', category: 'application', namespace: 'ns', mandatory: true, runtimeClass: 'app', helm: { chart: { source: 'helm-repo', repo: 'r', path: 'p', version: 'v' } }, resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } } }
      ]
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    expect(docs.find(d => d.kind === 'Pod').spec.containers[0].envFrom).toBeDefined();
    expect(docs.find(d => d.kind === 'HelmRelease')).toBeDefined();
  });

  it('handles customEnv and volumeMount filtering', () => {
    const config: KubeSDKLocalRun = {
      ...baseConfig,
      components: [{
        id: 'app', kind: 'workload', category: 'application', namespace: 'ns', mandatory: true, runtimeClass: 'app',
        properties: { customEnv: { F: 'T' }, volumeMounts: [{ name: 'd', mountPath: '/d' }, { name: 'kube-api-access-x', mountPath: '/x' }] },
        resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } }
      }]
    };
    const yamlString = generateYamlFromConfig(config);
    const docs = yaml.loadAll(yamlString) as any[];
    const pod = docs.find(d => d.kind === 'Pod');
    expect(pod.spec.containers[0].volumeMounts.length).toBe(1);
    expect(docs.find(d => d.kind === 'ConfigMap' && d.metadata.name === 'app-custom-config')).toBeDefined();
  });
});
