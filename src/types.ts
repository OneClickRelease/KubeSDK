export type LocalRunSource = 'live' | 'manual' | 'snapshot_yaml';
export type LocalRuntimeType = 'k3d' | 'rancher-desktop' | 'kind';

export interface KubeSDKLocalRun {
  apiVersion: 'kubesdk.dev/v1alpha1';
  kind: 'LocalRunDefinition';
  metadata: {
    name: string;
    createdBy: string;
    createdAt: string;
    toolVersion: string;
  };
  wizard: WizardSession;
  clusterSnapshot?: ClusterSnapshot;
  components: Component[];
  capabilities: Capability[];
  dependencyGraph: DependencyGraph;
  laptopProfile: LaptopProfile;
  resourcePlan?: ResourcePlan;
  validation?: ValidationResult;
  runtimeExecution: RuntimeExecution;
}

export interface WizardSession {
  source: LocalRunSource;
  runtime: {
    type: LocalRuntimeType;
    versionConstraint: string;
  };
  ignoredNamespaces?: string[];
  kindWhitelist?: string[];
  connectivity?: {
    apiServerUrl: string;
    token: string;
    caCert?: string;
  };
  steps: {
    completed: string[];
  };
}

export interface ClusterSnapshot {
  source: {
    type: 'live-cluster' | 'manual';
    clusterId?: string;
    extractedAt?: string;
  };
  scope: {
    namespaces: string[];
  };
}

export interface Component {
  id: string;
  kind: 'workload' | 'infra' | 'capability';
  namespace: string;
  category: string;
  mandatory: boolean;
  runtimeClass: string;
  container?: {
    image: {
      type: 'direct';
      reference: string;
    };
    ports: {
      name: string;
      containerPort: number;
    }[];
  };
  helm?: {
    chart: {
      source: 'git' | 'helm-repo';
      repo: string;
      path?: string;
      version: string;
    };
    valuesFile?: string;
  };
  config?: {
    configMaps: string[];
    secrets: string[];
  };
  resources: {
    original: {
      cpu: string;
      memory: string;
      storage?: string;
      replicas: number;
    };
    sdk: {
      cpu: string;
      memory: string;
      storage?: string;
      replicas: number;
    };
  };
  properties?: Record<string, any>;
}

export interface Capability {
  id: string;
  mandatory: boolean;
  category: string;
  runtimeMapping: {
    local: {
      provider: string;
      componentRef: string;
    };
  };
  dependencies?: {
    requires: string[];
  };
}

export interface DependencyGraph {
  edges: {
    from: string;
    to: string;
  }[];
}

export interface LaptopProfile {
  detected: {
    cpuCores: number;
    memoryGi: number;
    diskGi: number;
    os: string;
  };
  limits: {
    cpu: number;
    memory: string;
    disk: string;
  };
}

export interface ResourcePlan {
  components: Record<string, {
    cpu: string;
    memory: string;
    storage?: string;
    replicas: number;
  }>;
}

export interface ValidationResult {
  status: 'pass' | 'warning' | 'fail';
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  id: string;
  component?: string;
  severity: 'warning' | 'error';
  message: string;
  suggestion?: Suggestion;
}

export interface Suggestion {
  issueId: string;
  proposedChange: {
    path: string;
    value: unknown;
  };
  rationale: string;
  accepted?: boolean;
}

export interface RuntimeExecution {
  type: LocalRuntimeType;
  cluster: {
    name: string;
    version: string;
  };
  order: string[];
  status?: {
    state: 'pending' | 'deploying' | 'ready' | 'failed';
    endpoints: Record<string, {
      url: string;
    }>;
  };
}
