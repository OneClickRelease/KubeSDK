import { KubeSDKLocalRun } from '../types';

export const WIZARD_STEPS = [
  { id: 'source', title: 'Local Run Source' },
  { id: 'mode', title: 'Cluster Definition Mode' },
  { id: 'import', title: 'Live Cluster Import' },
  { id: 'upload', title: 'Offline Cluster Upload' },
  { id: 'model', title: 'Cluster Model & Components' },
  { id: 'mapping', title: 'Dependency Mapping' },
  { id: 'review', title: 'Review & Runtime Connect' },
  { id: 'deployment', title: 'Cluster Run & Verify' },
];

export const INITIAL_CONFIG: KubeSDKLocalRun = {
  apiVersion: 'kubesdk.dev/v1alpha1',
  kind: 'LocalRunDefinition',
  metadata: {
    name: 'kubesdk-simulation',
    createdBy: 'sdk-user',
    createdAt: new Date().toISOString(),
    toolVersion: '1.0.0',
  },
  wizard: {
    source: 'manual',
    runtime: {
      type: 'rancher-desktop',
      versionConstraint: '>=5.6',
    },
    ignoredNamespaces: ['default', 'kube-system'],
    kindWhitelist: ['pod', 'service', 'ingress', 'configmap', 'secret', 'namespace'],
    steps: {
      completed: [],
    },
    connectivity: {
      apiServerUrl: '',
      token: '',
      caCert: '',
    }
  },
  components: [],
  capabilities: [],
  dependencyGraph: {
    edges: [],
  },
  laptopProfile: {
    detected: {
      cpuCores: 8,
      memoryGi: 16,
      diskGi: 200,
      os: 'macOS',
    },
    limits: {
      cpu: 4,
      memory: '8Gi',
      disk: '50Gi',
    },
  },
  runtimeExecution: {
    type: 'rancher-desktop',
    cluster: {
      name: 'kubesdk-local',
      version: 'v1.29',
    },
    order: ['namespaces', 'policies', 'infra', 'applications'],
  },
};

export const NS_PALETTE = [
  { bg: '#5B8DD9', dark: '#3A6DB5', edge: '#93B8F0', text: '#EEF4FF' },
  { bg: '#7C5CBF', dark: '#5A3FA0', edge: '#A88EE0', text: '#F3EEFF' },
  { bg: '#2D9E6B', dark: '#1E7050', edge: '#5EC99A', text: '#EAFAF2' },
  { bg: '#D97C14', dark: '#B06210', edge: '#F0AA55', text: '#FFF8EE' },
  { bg: '#D94F4F', dark: '#B03535', edge: '#F08080', text: '#FFF0F0' },
  { bg: '#C94B9A', dark: '#A03278', edge: '#E880C0', text: '#FFF0F8' },
  { bg: '#3DA8B5', dark: '#2A7A88', edge: '#70CEE0', text: '#EEF9FA' },
];

export const INFRA_CATEGORIES = ['namespace', 'config', 'service', 'ingress', 'simulator'];

export const STORAGE_KEY = 'kubesdksim_config_v1';
export const STEP_KEY = 'kubesdksim_step';
export const NS_KEY = 'kubesdksim_ns';
