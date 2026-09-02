import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import yaml from 'js-yaml';
import {
  Server, Cpu, Cloud, Box, Layers, Download, CheckCircle2,
  Terminal, ShieldCheck, ChevronDown, ChevronRight, Sparkles,
  Zap, Copy, RefreshCw, AlertTriangle, Globe, Lock, Info, Check,
  Key, Eye, EyeOff, DollarSign, Clock, Shield, Plus, Save, Trash2,
  ArrowRight, ArrowLeft, CheckCircle, Database, HelpCircle, HardDrive,
  Activity, GitBranch, BarChart, Brain, Container, Settings, Edit2,
  Sliders, History, Upload, FileCode, ExternalLink, Archive, FileText,
  Bookmark, CheckSquare, RotateCcw, Laptop, Monitor, FolderSync, Share2, Battery
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  HARDWARE_PRESETS,
  HYPERVISOR_PLATFORMS,
  CLOUD_PROVIDERS,
  VM_CATEGORY_CONFIG,
  VM_ROLE_BADGES,
  HardwarePreset,
  HypervisorPlatform,
  CloudProviderConfig,
  VMNodePool,
  VMNodeCategory,
  InfraType,
  OrchestratorType,
  TopologyType,
  VirtualContainerPreset,
  VIRTUAL_CONTAINER_PRESETS
} from '../wizard/steps/OrchestratorDeploymentCollapsible';

interface DefineKubeInfraViewProps {
  onApplyCredentials?: (url: string) => void;
  onNavigateToWizard?: () => void;
}

export interface PlatformComponent {
  name: string;
  version?: string;
  namespace?: string;
  image?: string;
  port?: number;
  replicas?: number;
  description?: string;
  isDefault?: boolean;
  isRecommended?: boolean;
  chart?: string;
}

export interface PlatformLayer {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  selectedComponentIndex: number;
  components: PlatformComponent[];
}

export interface SavedDeploymentProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  activeVersion: string;
  versions: Array<{
    version: string;
    savedAt: string;
    comment?: string;
    author?: string;
    bytes?: number;
    summary?: any;
  }>;
  latestSummary?: any;
}

const DEFAULT_PLATFORM_LAYERS: PlatformLayer[] = [
  {
    id: 'ingress',
    name: 'Ingress & API Gateway',
    description: 'Layer 7 HTTP/HTTPS traffic routing, SSL termination, and API ingress.',
    enabled: true,
    selectedComponentIndex: 0,
    components: [
      { name: 'Traefik Ingress', version: 'v3.0.0', namespace: 'kube-system', image: 'traefik:v3.0.0', port: 80, replicas: 1, isDefault: true, isRecommended: true, description: 'Default lightweight cloud-native edge router in K3s' },
      { name: 'NGINX Ingress Controller', version: 'v1.10.0', namespace: 'ingress-nginx', image: 'registry.k8s.io/ingress-nginx/controller:v1.10.0', port: 80, replicas: 2, description: 'Industry-standard high-performance reverse proxy controller' },
      { name: 'Envoy Gateway', version: 'v1.0.1', namespace: 'envoy-gateway-system', image: 'docker.io/envoyproxy/gateway:v1.0.1', port: 80, replicas: 2, description: 'Next-generation Gateway API compliant controller' },
      { name: 'Cilium Ingress', version: 'v1.15.2', namespace: 'kube-system', image: 'quay.io/cilium/cilium:v1.15.2', port: 80, replicas: 1, description: 'eBPF-powered ultra-fast service mesh and ingress' }
    ]
  },
  {
    id: 'storage',
    name: 'Storage & CSI Provisioner',
    description: 'Dynamic block, file, and local persistent volume allocation drivers.',
    enabled: true,
    selectedComponentIndex: 0,
    components: [
      { name: 'Local Path Provisioner', version: 'v0.0.26', namespace: 'local-path-storage', image: 'rancher/local-path-provisioner:v0.0.26', replicas: 1, isDefault: true, description: 'Utilizes local node disk for rapid persistent volume claims' },
      { name: 'Longhorn Distributed CSI', version: 'v1.6.0', namespace: 'longhorn-system', image: 'longhornio/longhorn-manager:v1.6.0', replicas: 3, isRecommended: true, description: 'Enterprise distributed block storage with snapshot replication' },
      { name: 'Rook-Ceph Distributed Storage', version: 'v1.13.0', namespace: 'rook-ceph', image: 'rook/ceph:v1.13.0', replicas: 3, description: 'Cloud-native Ceph storage operator for multi-node clusters' },
      { name: 'OpenEBS Local & Replicated', version: 'v3.10.0', namespace: 'openebs', image: 'openebs/openebs-operator:v3.10.0', replicas: 1, description: 'Container Attached Storage (CAS) for stateful applications' }
    ]
  },
  {
    id: 'monitoring',
    name: 'Observability & Monitoring',
    description: 'Real-time metrics, telemetry collection, alerts, and dashboards.',
    enabled: true,
    selectedComponentIndex: 0,
    components: [
      { name: 'Prometheus & Grafana Stack', version: 'v0.70.0', namespace: 'monitoring', image: 'quay.io/prometheus/prometheus:v2.50.0', port: 9090, replicas: 1, isDefault: true, isRecommended: true, description: 'Complete cluster metrics scraping and visualization system' },
      { name: 'VictoriaMetrics Single', version: 'v1.98.0', namespace: 'monitoring', image: 'victoriametrics/victoria-metrics:v1.98.0', port: 8428, replicas: 1, description: 'High-efficiency, resource-saving time-series telemetry store' },
      { name: 'OpenTelemetry Collector', version: 'v0.95.0', namespace: 'otel-system', image: 'otel/opentelemetry-collector-contrib:0.95.0', port: 4317, replicas: 1, description: 'Unified logs, traces, and metrics export pipeline' }
    ]
  },
  {
    id: 'security',
    name: 'Security & Certificate Management',
    description: 'Automatic TLS cert provisioning, secret injection, and policy compliance.',
    enabled: true,
    selectedComponentIndex: 0,
    components: [
      { name: 'Cert-Manager TLS', version: 'v1.14.4', namespace: 'cert-manager', image: 'quay.io/jetstack/cert-manager-controller:v1.14.4', replicas: 1, isDefault: true, isRecommended: true, description: 'Automated X.509 certificate issuance and Let\'s Encrypt renewals' },
      { name: 'HashiCorp Vault Agent', version: 'v1.16.0', namespace: 'vault', image: 'hashicorp/vault:1.16.0', port: 8200, replicas: 1, description: 'Dynamic secrets management, transit encryption, and token brokering' },
      { name: 'Kyverno Policy Engine', version: 'v1.11.4', namespace: 'kyverno', image: 'ghcr.io/kyverno/kyverno:v1.11.4', replicas: 2, description: 'Kubernetes-native policy management, mutation, and verification' },
      { name: 'Falco Threat Detection', version: 'v0.37.0', namespace: 'falco', image: 'falcosecurity/falco:0.37.0', replicas: 1, description: 'Kernel-level runtime threat detection and anomaly alerting' }
    ]
  },
  {
    id: 'gitops',
    name: 'CI/CD & GitOps Delivery',
    description: 'Continuous deployment, Git reconciliation, and workflow orchestrators.',
    enabled: false,
    selectedComponentIndex: 0,
    components: [
      { name: 'ArgoCD GitOps Engine', version: 'v2.10.4', namespace: 'argocd', image: 'quay.io/argoproj/argocd:v2.10.4', port: 8080, replicas: 1, isDefault: true, isRecommended: true, description: 'Declarative GitOps continuous delivery tool for Kubernetes' },
      { name: 'Flux v2 GitOps Controller', version: 'v2.2.3', namespace: 'flux-system', image: 'ghcr.io/fluxcd/source-controller:v2.2.3', replicas: 1, description: 'Open and extensible continuous delivery toolkit for Kubernetes' },
      { name: 'Tekton Pipelines', version: 'v0.56.0', namespace: 'tekton-pipelines', image: 'gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/controller:v0.56.0', replicas: 1, description: 'Cloud-native CI/CD pipeline execution framework' }
    ]
  },
  {
    id: 'database',
    name: 'Database & Stateful Operators',
    description: 'Declarative SQL/NoSQL cluster operators with automated failover.',
    enabled: false,
    selectedComponentIndex: 0,
    components: [
      { name: 'CloudNativePG (PostgreSQL)', version: 'v1.22.2', namespace: 'cnpg-system', image: 'ghcr.io/cloudnative-pg/cloudnative-pg:v1.22.2', replicas: 1, isDefault: true, isRecommended: true, description: 'Enterprise PostgreSQL operator with streaming replication & backups' },
      { name: 'Redis Operator (Spotahome)', version: 'v1.2.4', namespace: 'redis-operator', image: 'spotahome/redis-operator:v1.2.4', replicas: 1, description: 'High-availability Redis Sentinel & standalone cluster manager' },
      { name: 'MongoDB Community Operator', version: 'v0.10.0', namespace: 'mongodb', image: 'quay.io/mongodb/mongodb-kubernetes-operator:0.10.0', replicas: 1, description: 'Automates deployment of MongoDB replica sets inside Kubernetes' }
    ]
  },
  {
    id: 'messaging',
    name: 'Eventing & Streaming Brokers',
    description: 'High-throughput event streaming, message queues, and pub/sub brokers.',
    enabled: false,
    selectedComponentIndex: 0,
    components: [
      { name: 'NATS JetStream Server', version: 'v2.10.12', namespace: 'nats-system', image: 'nats:2.10.12-alpine', port: 4222, replicas: 1, isDefault: true, isRecommended: true, description: 'Ultra-low-latency cloud native messaging & event streaming system' },
      { name: 'Apache Kafka (Strimzi Operator)', version: 'v0.40.0', namespace: 'kafka', image: 'quay.io/strimzi/operator:0.40.0', port: 9092, replicas: 3, description: 'Enterprise distributed streaming platform and event bus' },
      { name: 'RabbitMQ Cluster Operator', version: 'v2.7.0', namespace: 'rabbitmq-system', image: 'rabbitmq:3.13-management', port: 5672, replicas: 1, description: 'Robust AMQP message queue manager for asynchronous workloads' }
    ]
  },
  {
    id: 'aiml',
    name: 'AI / ML Inference & Acceleration',
    description: 'Local LLM execution, GPU drivers, and model serving frameworks.',
    enabled: false,
    selectedComponentIndex: 0,
    components: [
      { name: 'Ollama Local LLM Engine', version: 'v0.1.30', namespace: 'ai-system', image: 'ollama/ollama:latest', port: 11434, replicas: 1, isDefault: true, isRecommended: true, description: 'Local lightweight execution engine for Llama 3, Mistral, and Qwen' },
      { name: 'vLLM High-Throughput Engine', version: 'v0.4.0', namespace: 'vllm-system', image: 'vllm/vllm-openai:latest', port: 8000, replicas: 1, description: 'PagedAttention inference server for production LLM serving' },
      { name: 'NVIDIA GPU Operator', version: 'v23.9.2', namespace: 'gpu-operator', image: 'nvcr.io/nvidia/gpu-operator:v23.9.2', replicas: 1, description: 'Automates provisioning of NVIDIA GPU drivers, container toolkit & metrics' }
    ]
  }
];

const WIZARD_STEPS = [
  { id: 'target', title: 'Target & Mode', desc: 'Select Infrastructure Type & Airgap/Online Mode' },
  { id: 'config', title: 'Platform Specs', desc: 'Hardware, Hypervisors, Cloud & Node Pools' },
  { id: 'topology', title: 'Scale & Topology', desc: 'Node Count, Quorum Zones & Networking' },
  { id: 'orchestrator', title: 'Orchestrator', desc: 'K3s, RKE2, MicroK8s & Airgap Mirror' },
  { id: 'platform-layers', title: 'Platform Layers', desc: 'Configure Capability Components & Operators' },
  { id: 'provision', title: 'Review & Versioning', desc: 'Persist YAML, Version Control & Download' }
];

export const LAYER_BORDER_COLORS: Record<string, string> = {
  ingress: 'border-l-sky-500',
  storage: 'border-l-amber-500',
  monitoring: 'border-l-pink-500',
  security: 'border-l-red-500',
  gitops: 'border-l-blue-500',
  database: 'border-l-emerald-500',
  messaging: 'border-l-purple-500',
  aiml: 'border-l-indigo-500',
};

export const LAYER_BG_GRADIENTS: Record<string, string> = {
  ingress: 'from-sky-500/5 to-white',
  storage: 'from-amber-500/5 to-white',
  monitoring: 'from-pink-500/5 to-white',
  security: 'from-red-500/5 to-white',
  gitops: 'from-blue-500/5 to-white',
  database: 'from-emerald-500/5 to-white',
  messaging: 'from-purple-500/5 to-white',
  aiml: 'from-indigo-500/5 to-white',
};

export const LAYER_HEX_COLORS: Record<string, string> = {
  ingress: '#0ea5e9',
  storage: '#f59e0b',
  monitoring: '#ec4899',
  security: '#ef4444',
  gitops: '#3b82f6',
  database: '#10b981',
  messaging: '#8b5cf6',
  aiml: '#6366f1',
};

export const LAYER_PILL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ingress: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
  storage: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  monitoring: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  security: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  gitops: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  database: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  messaging: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  aiml: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
};

export const ThreeDHexagon = ({ 
  label, 
  layerId, 
  isSelected 
}: { 
  label: string; 
  layerId: string; 
  isSelected?: boolean;
}) => {
  const getColors = () => {
    switch (layerId) {
      case 'ingress': return { top: '#0ea5e9', bottom: '#0284c7', shadow: '#0369a1' };
      case 'storage': return { top: '#f59e0b', bottom: '#d97706', shadow: '#b45309' };
      case 'monitoring': return { top: '#ec4899', bottom: '#db2777', shadow: '#be185d' };
      case 'security': return { top: '#ef4444', bottom: '#dc2626', shadow: '#b91c1c' };
      case 'gitops': return { top: '#3b82f6', bottom: '#2563eb', shadow: '#1d4ed8' };
      case 'database': return { top: '#10b981', bottom: '#059669', shadow: '#047857' };
      case 'messaging': return { top: '#8b5cf6', bottom: '#7c3aed', shadow: '#6d28d9' };
      case 'aiml': return { top: '#6366f1', bottom: '#4f46e5', shadow: '#4338ca' };
      default: return { top: '#10b981', bottom: '#059669', shadow: '#047857' };
    }
  };
  const c = getColors();

  return (
    <svg width="100%" height="100%" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-step5-${layerId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.top} />
          <stop offset="100%" stopColor={c.bottom} />
        </linearGradient>
      </defs>
      
      {/* 3D Depth Shadow under the hexagon */}
      <path 
        d="M 10 40 L 45 75 L 135 75 L 170 40 L 170 48 L 135 83 L 45 83 L 10 48 Z" 
        fill={c.shadow} 
      />
      
      {/* Glowing outer boundary when selected */}
      {isSelected && (
        <motion.path 
          d="M 45 10 L 135 10 L 170 40 L 135 70 L 45 70 L 10 40 Z" 
          fill="none"
          stroke={c.top}
          strokeWidth="6"
          opacity="0.5"
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          style={{ transformOrigin: '90px 40px' }}
        />
      )}
      
      {/* Hexagon Top Face */}
      <path 
        d="M 45 10 L 135 10 L 170 40 L 135 70 L 45 70 L 10 40 Z" 
        fill={`url(#grad-step5-${layerId})`}
        stroke={isSelected ? "#FFF" : "white"}
        strokeWidth={isSelected ? "2.5" : "1.5"}
        className={cn(isSelected ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "")}
      />
      
      {/* Text label overlay - Multi-line formatted to prevent clipping */}
      {(() => {
        const clean = label.toUpperCase();
        if (clean.includes(' & ')) {
          const [part1, ...rest] = clean.split(' & ');
          return (
            <text 
              x="90" 
              y="38" 
              textAnchor="middle" 
              fill="white" 
              fontSize="7.5" 
              fontWeight={isSelected ? "900" : "800"} 
              letterSpacing="0.04em"
              className="uppercase pointer-events-none drop-shadow-sm select-none"
            >
              <tspan x="90" dy="0">{part1} &</tspan>
              <tspan x="90" dy="10.5">{rest.join(' & ')}</tspan>
            </text>
          );
        }
        if (clean.length > 13) {
          const words = clean.split(' ');
          const mid = Math.ceil(words.length / 2);
          return (
            <text 
              x="90" 
              y="38" 
              textAnchor="middle" 
              fill="white" 
              fontSize="7.5" 
              fontWeight={isSelected ? "900" : "800"} 
              letterSpacing="0.04em"
              className="uppercase pointer-events-none drop-shadow-sm select-none"
            >
              <tspan x="90" dy="0">{words.slice(0, mid).join(' ')}</tspan>
              <tspan x="90" dy="10.5">{words.slice(mid).join(' ')}</tspan>
            </text>
          );
        }
        return (
          <text 
            x="90" 
            y="44" 
            textAnchor="middle" 
            fill="white" 
            fontSize="8.5" 
            fontWeight={isSelected ? "900" : "800"} 
            letterSpacing="0.05em"
            className="uppercase pointer-events-none drop-shadow-sm select-none"
          >
            {clean}
          </text>
        );
      })()}
    </svg>
  );
};

export const DefineKubeInfraView = ({
  onApplyCredentials,
  onNavigateToWizard
}: DefineKubeInfraViewProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // --- Step 1: Infrastructure Type & Mode ---
  const [infraType, setInfraType] = useState<InfraType>('baremetal');
  const [isAirgap, setIsAirgap] = useState<boolean>(true);

  // --- Dynamic configuration lists loaded from config/*.yaml ---
  const [hardwareList, setHardwareList] = useState<HardwarePreset[]>(HARDWARE_PRESETS);
  const [hypervisorList, setHypervisorList] = useState<HypervisorPlatform[]>(HYPERVISOR_PLATFORMS);
  const [cloudList, setCloudList] = useState<CloudProviderConfig[]>(CLOUD_PROVIDERS);

  // --- Step 5: Platform Capability Layers State ---
  const [platformLayers, setPlatformLayers] = useState<PlatformLayer[]>(DEFAULT_PLATFORM_LAYERS);
  const [layerFilter, setLayerFilter] = useState<'all' | 'enabled' | 'recommended'>('all');
  const [collapsedLayers, setCollapsedLayers] = useState<Record<string, boolean>>({});
  const toggleCollapseLayer = (id: string) => {
    setCollapsedLayers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Step 2: Target-specific Configuration ---
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('All');
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('rpi-5-8gb');

  // VM / Hypervisor
  const [selectedHypervisor, setSelectedHypervisor] = useState<string>('harvester');
  const [vmMode, setVmMode] = useState<'symmetrical' | 'asymmetrical'>('symmetrical');
  const [vmNodePools, setVmNodePools] = useState<VMNodePool[]>([
    { id: 'pool-cp', name: 'Control Plane Pool', category: 'control-plane', count: 3, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' },
    { id: 'pool-workers', name: 'General Worker Pool', category: 'worker', count: 4, vcpu: 8, memoryGi: 16, diskGi: 100, arch: 'x86_64' },
    { id: 'pool-gpu', name: 'AI/ML GPU Acceleration', category: 'gpu', count: 1, vcpu: 16, memoryGi: 64, diskGi: 200, arch: 'x86_64', gpuModel: 'NVIDIA L40S' }
  ]);

  // Cloud
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>('aws');
  const [cloudRegion, setCloudRegion] = useState<string>('us-east-1');
  const [cloudInstanceType, setCloudInstanceType] = useState<string>('t4g.xlarge');
  const [cloudCredentials, setCloudCredentials] = useState<Record<string, string>>({});
  const [cloudUseSpot, setCloudUseSpot] = useState<boolean>(true);
  const [cloudAutoShutdown, setCloudAutoShutdown] = useState<boolean>(true);
  const [cloudShutdownHour, setCloudShutdownHour] = useState<string>('20:00');
  const [cloudAllowedCidr, setCloudAllowedCidr] = useState<string>('0.0.0.0/0');
  const [cloudStorageType, setCloudStorageType] = useState<string>('gp3');
  const [cloudStorageSize, setCloudStorageSize] = useState<number>(50);

  // Virtual Container & VDI Developer Workstation
  const [containerList, setContainerList] = useState<VirtualContainerPreset[]>(VIRTUAL_CONTAINER_PRESETS);
  const [selectedContainerId, setSelectedContainerId] = useState<string>('vdi-developer-laptop');
  const [containerHostEnv, setContainerHostEnv] = useState<string>('laptop-mac');
  const [containerNetworkMode, setContainerNetworkMode] = useState<'host-forward' | 'bridge-nat' | 'host-net'>('host-forward');
  const [containerWorkspaceMount, setContainerWorkspaceMount] = useState<string>('~/workspace');
  const [containerSocketSharing, setContainerSocketSharing] = useState<boolean>(true);
  const [containerBatteryThrottling, setContainerBatteryThrottling] = useState<boolean>(false);

  // Common Hardware Specs
  const [vcpu, setVcpu] = useState<number>(4);
  const [memoryGi, setMemoryGi] = useState<number>(8);
  const [diskGi, setDiskGi] = useState<number>(64);
  const [osArch, setOsArch] = useState<string>('aarch64');

  // --- Step 3: Scale, Topology & HA ---
  const [topology, setTopology] = useState<TopologyType>('single-node');
  const [nodesCount, setNodesCount] = useState<number>(1);
  const [podCidr, setPodCidr] = useState<string>('10.42.0.0/16');
  const [serviceCidr, setServiceCidr] = useState<string>('10.43.0.0/16');

  // --- Step 4: Orchestrator Engine ---
  const [orchestrator, setOrchestrator] = useState<OrchestratorType>('k3s');
  const [includeWorkloadImages, setIncludeWorkloadImages] = useState<boolean>(true);
  const [privateRegistryUrl, setPrivateRegistryUrl] = useState<string>('');

  // --- Step 6: Version Control & YAML Persistence State ---
  const [savedProfiles, setSavedProfiles] = useState<SavedDeploymentProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [activeProfileName, setActiveProfileName] = useState<string>('Default Infrastructure Profile');
  const [activeProfileDesc, setActiveProfileDesc] = useState<string>('Custom defined cluster & capability deployment');
  const [activeVersionTag, setActiveVersionTag] = useState<string>('v1.0.0');

  // Modals
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [isRawYamlModalOpen, setIsRawYamlModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Save Version Modal Inputs
  const [versionBumpType, setVersionBumpType] = useState<'patch' | 'minor' | 'major'>('patch');
  const [versionComment, setVersionComment] = useState('Updated cluster topology and platform capability layers');
  const [versionAuthor, setVersionAuthor] = useState('Platform Architect');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Raw YAML Editor State
  const [rawYamlDraft, setRawYamlDraft] = useState('');
  const [rawYamlError, setRawYamlError] = useState<string | null>(null);

  // Import State
  const [importYamlInput, setImportYamlInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Provisioning Execution
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick Inline Add Modal (Target Presets)
  const [isInlineAddModalOpen, setIsInlineAddModalOpen] = useState(false);
  const [inlineModalType, setInlineModalType] = useState<'baremetal' | 'hypervisor' | 'cloud' | 'container'>('baremetal');
  const [inlineItemData, setInlineItemData] = useState<any>({});
  const [inlineModalError, setInlineModalError] = useState<string | null>(null);
  const [isInlineSaving, setIsInlineSaving] = useState(false);

  // Modal for adding a custom Platform Layer or Component
  const [isAddPlatformModalOpen, setIsAddPlatformModalOpen] = useState(false);
  const [platformModalMode, setPlatformModalMode] = useState<'layer' | 'component'>('component');
  const [targetLayerId, setTargetLayerId] = useState<string>('ingress');
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerDesc, setNewLayerDesc] = useState('');
  const [newCompName, setNewCompName] = useState('');
  const [newCompVersion, setNewCompVersion] = useState('v1.0.0');
  const [newCompNamespace, setNewCompNamespace] = useState('default');
  const [newCompImage, setNewCompImage] = useState('');
  const [newCompPort, setNewCompPort] = useState<number | undefined>(undefined);
  const [newCompDesc, setNewCompDesc] = useState('');

  // Fetch saved deployment profiles
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/config/infra-deployments');
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) setSavedProfiles(data.profiles);
      }
    } catch (e) {
      console.error('Failed to fetch deployment profiles', e);
    }
  };

  useEffect(() => {
    fetch('/api/config/infrastructure')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json?.data) {
          if (json.data.baremetalPresets?.length) setHardwareList(json.data.baremetalPresets);
          if (json.data.hypervisorPlatforms?.length) setHypervisorList(json.data.hypervisorPlatforms);
          if (json.data.cloudProviders?.length) setCloudList(json.data.cloudProviders);
          if (json.data.virtualContainers?.length) setContainerList(json.data.virtualContainers);
        }
      })
      .catch(err => console.log('Using default local presets', err));

    fetchProfiles();
  }, []);

  // Helpers
  const activeContainer = useMemo(() => {
    return containerList.find(c => c.id === selectedContainerId) || containerList[0] || VIRTUAL_CONTAINER_PRESETS[0];
  }, [containerList, selectedContainerId]);

  const handleSelectContainer = (preset: VirtualContainerPreset) => {
    setSelectedContainerId(preset.id);
    setVcpu(preset.defaultVcpu || 4);
    setMemoryGi(preset.defaultMemoryGi || 8);
    setDiskGi(preset.defaultDiskGi || 40);
  };

  const activeCloud = useMemo(() => {
    return cloudList.find(c => c.id === selectedCloudProvider) || cloudList[0] || CLOUD_PROVIDERS[0];
  }, [cloudList, selectedCloudProvider]);

  const activeCloudInstanceSpec = useMemo(() => {
    return activeCloud.instanceTypes.find(i => i.id === cloudInstanceType) || activeCloud.instanceTypes[0];
  }, [activeCloud, cloudInstanceType]);

  const handleSelectHardware = (hw: HardwarePreset) => {
    setSelectedHardwareId(hw.id);
    setVcpu(hw.vcpu);
    setMemoryGi(hw.memoryGi);
    setDiskGi(hw.diskGi);
    setOsArch(hw.arch);
  };

  const handleSelectCloudProvider = (providerId: string) => {
    setSelectedCloudProvider(providerId);
    const provider = cloudList.find(c => c.id === providerId) || cloudList[0] || CLOUD_PROVIDERS[0];
    setCloudRegion(provider.defaultRegion);
    setCloudInstanceType(provider.instanceTypes[0].id);
    setVcpu(provider.instanceTypes[0].vcpu);
    setMemoryGi(provider.instanceTypes[0].memGi);
    setOsArch(provider.instanceTypes[0].id.includes('t4g') || provider.instanceTypes[0].id.includes('A1.Flex') ? 'aarch64' : 'x86_64');
  };

  const handleSelectCloudInstanceType = (instId: string) => {
    setCloudInstanceType(instId);
    const inst = activeCloud.instanceTypes.find(i => i.id === instId);
    if (inst) {
      setVcpu(inst.vcpu);
      setMemoryGi(inst.memGi);
      setOsArch(inst.id.includes('t4g') || inst.id.includes('A1.Flex') ? 'aarch64' : 'x86_64');
    }
  };

  const handleAddVMPool = () => {
    const newId = `pool-${Date.now()}`;
    setVmNodePools(prev => [
      ...prev,
      { id: newId, name: `Worker Pool ${prev.length + 1}`, category: 'worker', count: 2, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' }
    ]);
  };

  const handleRemoveVMPool = (id: string) => {
    if (vmNodePools.length <= 1) return;
    setVmNodePools(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateVMPool = (id: string, updates: Partial<VMNodePool>) => {
    setVmNodePools(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // Platform Layer Handlers
  const handleToggleLayer = (layerId: string) => {
    setPlatformLayers(prev => prev.map(l => l.id === layerId ? { ...l, enabled: !l.enabled } : l));
  };

  const handleSelectComponent = (layerId: string, compIdx: number) => {
    setPlatformLayers(prev => prev.map(l => l.id === layerId ? { ...l, selectedComponentIndex: compIdx } : l));
  };

  const handleDeleteLayer = (layerId: string) => {
    if (confirm('Remove this platform capability layer?')) {
      setPlatformLayers(prev => prev.filter(l => l.id !== layerId));
    }
  };

  const handleDeleteComponent = (layerId: string, compIdx: number) => {
    setPlatformLayers(prev => prev.map(l => {
      if (l.id !== layerId) return l;
      const newComps = l.components.filter((_, i) => i !== compIdx);
      return {
        ...l,
        components: newComps,
        selectedComponentIndex: Math.min(l.selectedComponentIndex, Math.max(0, newComps.length - 1))
      };
    }));
  };

  const handleOpenAddPlatformModal = (mode: 'layer' | 'component', defaultLayerId?: string) => {
    setPlatformModalMode(mode);
    if (defaultLayerId) setTargetLayerId(defaultLayerId);
    setNewLayerName('');
    setNewLayerDesc('');
    setNewCompName('');
    setNewCompVersion('v1.0.0');
    setNewCompNamespace(defaultLayerId === 'monitoring' ? 'monitoring' : 'default');
    setNewCompImage('');
    setNewCompPort(undefined);
    setNewCompDesc('');
    setIsAddPlatformModalOpen(true);
  };

  const handleSavePlatformItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (platformModalMode === 'layer') {
      if (!newLayerName.trim()) return;
      const layerId = newLayerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newLayer: PlatformLayer = {
        id: layerId,
        name: newLayerName.trim(),
        description: newLayerDesc.trim() || 'Custom platform capability layer',
        enabled: true,
        selectedComponentIndex: 0,
        components: [{
          name: `${newLayerName.trim()} Default`,
          version: 'v1.0.0',
          namespace: 'default',
          isDefault: true,
          description: 'Primary component'
        }]
      };
      setPlatformLayers(prev => [...prev, newLayer]);
    } else {
      if (!newCompName.trim()) return;
      const newComp: PlatformComponent = {
        name: newCompName.trim(),
        version: newCompVersion.trim() || 'latest',
        namespace: newCompNamespace.trim() || 'default',
        image: newCompImage.trim() || undefined,
        port: newCompPort || undefined,
        description: newCompDesc.trim() || 'Custom capability component',
        replicas: 1
      };
      setPlatformLayers(prev => prev.map(l => {
        if (l.id !== targetLayerId) return l;
        return {
          ...l,
          components: [...l.components, newComp],
          selectedComponentIndex: l.components.length
        };
      }));
    }
    setIsAddPlatformModalOpen(false);
  };

  const clusterMetrics = useMemo(() => {
    if (infraType === 'cloud-vm') {
      const count = topology === 'single-node' ? 1 : nodesCount;
      return {
        totalVms: count,
        totalVcpu: count * (activeCloudInstanceSpec.vcpu || vcpu),
        totalMemGi: count * (activeCloudInstanceSpec.memGi || memoryGi),
        totalDiskGi: count * cloudStorageSize,
        gpuCount: activeCloudInstanceSpec.gpu ? count : 0
      };
    }

    if (infraType !== 'hypervisor-vm' || vmMode === 'symmetrical') {
      const count = topology === 'single-node' ? 1 : nodesCount;
      return {
        totalVms: count,
        totalVcpu: count * (Number(vcpu) || 2),
        totalMemGi: count * (Number(memoryGi) || 4),
        totalDiskGi: count * (Number(diskGi) || 50),
        gpuCount: 0
      };
    }

    return vmNodePools.reduce(
      (acc, pool) => {
        const count = Number(pool.count) || 1;
        acc.totalVms += count;
        acc.totalVcpu += count * (Number(pool.vcpu) || 2);
        acc.totalMemGi += count * (Number(pool.memoryGi) || 4);
        acc.totalDiskGi += count * (Number(pool.diskGi) || 50);
        if (pool.category === 'gpu') acc.gpuCount += count;
        return acc;
      },
      { totalVms: 0, totalVcpu: 0, totalMemGi: 0, totalDiskGi: 0, gpuCount: 0 }
    );
  }, [infraType, vmMode, topology, nodesCount, vcpu, memoryGi, diskGi, vmNodePools, activeCloudInstanceSpec, cloudStorageSize]);

  // Recommended Orchestrator Engine Calculation
  const recommendedEngine: OrchestratorType = useMemo(() => {
    if (infraType === 'cloud-vm') return 'k3s';
    if (vcpu <= 2 || memoryGi <= 4) return 'k3s';
    if (topology === 'multi-zone-quorum' || topology === 'multi-zone') return 'rke2';
    if (infraType === 'docker-cluster') return 'minikube';
    return 'k3s';
  }, [infraType, vcpu, memoryGi, topology]);

  const enabledPlatformLayers = useMemo(() => {
    return platformLayers.filter(l => l.enabled);
  }, [platformLayers]);

  // Dynamic YAML Schema Model
  const fullClusterConfigYaml = useMemo(() => {
    const doc = {
      apiVersion: 'kubesdk.dev/v1alpha1',
      kind: 'ClusterInfrastructureDefinition',
      metadata: {
        id: activeProfileId || undefined,
        name: activeProfileName,
        version: activeVersionTag,
        environment: isAirgap ? 'air-gapped' : 'online',
        updatedAt: new Date().toISOString()
      },
      spec: {
        infrastructure: {
          target: infraType,
          topology,
          nodes: topology === 'single-node' ? 1 : nodesCount,
          totalCompute: {
            vcpu: clusterMetrics.totalVcpu,
            memoryGi: clusterMetrics.totalMemGi,
            diskGi: clusterMetrics.totalDiskGi,
            arch: osArch
          },
          hardwarePreset: infraType === 'baremetal' ? selectedHardwareId : undefined,
          hypervisor: infraType === 'hypervisor-vm' ? {
            platform: selectedHypervisor,
            mode: vmMode,
            pools: vmMode === 'asymmetrical' ? vmNodePools : undefined
          } : undefined,
          cloudProvider: infraType === 'cloud-vm' ? {
            provider: selectedCloudProvider,
            region: cloudRegion,
            instanceType: cloudInstanceType,
            spot: cloudUseSpot,
            autoShutdown: cloudAutoShutdown,
            shutdownHour: cloudShutdownHour,
            allowedCidr: cloudAllowedCidr,
            storageType: cloudStorageType,
            storageSizeGi: cloudStorageSize
          } : undefined,
          virtualContainer: infraType === 'docker-cluster' ? {
            engine: selectedContainerId,
            engineName: activeContainer.name,
            hostEnvironment: containerHostEnv,
            networking: containerNetworkMode,
            workspaceMount: containerWorkspaceMount,
            socketSharing: containerSocketSharing,
            batteryThrottling: containerBatteryThrottling
          } : undefined
        },
        orchestrator: {
          engine: orchestrator,
          networking: { podCidr, serviceCidr }
        },
        platformComponents: platformLayers.map(l => ({
          layerId: l.id,
          layerName: l.name,
          enabled: l.enabled,
          component: l.components[l.selectedComponentIndex] ? {
            name: l.components[l.selectedComponentIndex].name,
            version: l.components[l.selectedComponentIndex].version,
            namespace: l.components[l.selectedComponentIndex].namespace,
            image: l.components[l.selectedComponentIndex].image,
            replicas: l.components[l.selectedComponentIndex].replicas
          } : undefined
        }))
      }
    };
    return yaml.dump(doc, { indent: 2, lineWidth: -1 });
  }, [
    activeProfileId, activeProfileName, activeVersionTag, isAirgap,
    infraType, topology, nodesCount, clusterMetrics, osArch,
    selectedHardwareId, selectedHypervisor, vmMode, vmNodePools,
    selectedCloudProvider, cloudRegion, cloudInstanceType, cloudUseSpot,
    cloudAutoShutdown, cloudShutdownHour, cloudAllowedCidr, cloudStorageType,
    cloudStorageSize, selectedContainerId, activeContainer, containerHostEnv,
    containerNetworkMode, containerWorkspaceMount, containerSocketSharing,
    containerBatteryThrottling, orchestrator, podCidr, serviceCidr, platformLayers
  ]);

  // Generate provisioning script preview
  const generatedScript = useMemo(() => {
    const activeComponentsList = enabledPlatformLayers
      .map(l => {
        const c = l.components[l.selectedComponentIndex];
        return c ? `  -> Deploying ${l.name} (${c.name} - ns: ${c.namespace || 'default'})...` : '';
      })
      .filter(Boolean)
      .join('\n');

    if (infraType === 'cloud-vm') {
      return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Cloud Dev Stage Provisioner (${activeCloud.name})
# Target Region: ${cloudRegion} | Instance Type: ${cloudInstanceType}
# Mode: ${cloudUseSpot ? 'Spot/Preemptible' : 'On-Demand'} | Auto-Shutdown: ${cloudAutoShutdown ? cloudShutdownHour : 'Disabled'}
# ==============================================================================
set -euo pipefail

echo "==> Authenticating against ${activeCloud.name} API..."
export CLOUD_REGION="${cloudRegion}"
export INSTANCE_TYPE="${cloudInstanceType}"

echo "==> Deploying Terraform Infrastructure Stage..."
terraform init
terraform apply -auto-approve -var="region=${cloudRegion}" -var="instance_type=${cloudInstanceType}"

echo "==> Provisioning ${orchestrator.toUpperCase()} Kubernetes Cluster on Cloud Host..."
curl -sfL https://get.k3s.io | sh -s - --cluster-cidr="${podCidr}" --service-cidr="${serviceCidr}"

echo "==> Applying Platform Capability Layer Manifests..."
${activeComponentsList}

echo "==> Setup Complete! API Server available at: https://\$(terraform output -raw public_ip):6443"
`;
    }

    if (infraType === 'docker-cluster') {
      return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Local Container Sandbox & Developer Workstation
# Target Environment: ${containerHostEnv} | Engine: ${activeContainer.name}
# Networking: ${containerNetworkMode} | Workspace: ${containerWorkspaceMount}
# ==============================================================================
set -euo pipefail

echo "==> [1/4] Preparing Developer Host Environment (${containerHostEnv})..."
mkdir -p "${containerWorkspaceMount}"
${containerSocketSharing ? 'echo "==> Host Docker / Containerd socket shared (/var/run/docker.sock)"' : ''}
${containerBatteryThrottling ? 'echo "==> Low-power battery governor active: throttling background iterations"' : ''}

echo "==> [2/4] Bootstrapping ${activeContainer.name} sandbox (${clusterMetrics.totalVcpu} vCPU, ${clusterMetrics.totalMemGi}GB RAM)..."
${selectedContainerId === 'k3d-cluster' 
  ? `k3d cluster create kubesdk-dev --servers ${nodesCount} --port "8080:80@loadbalancer" --port "8443:443@loadbalancer" --port "6443:6443@loadbalancer" --volume "${containerWorkspaceMount}:/workspace@all"`
  : selectedContainerId === 'kind-cluster'
    ? `kind create cluster --name kubesdk-dev`
    : `curl -sfL https://get.k3s.io | sh -s - server --cluster-cidr="${podCidr}" --service-cidr="${serviceCidr}" --write-kubeconfig-mode 644`}

echo "==> [3/4] Deploying Platform Capability Layer Manifests..."
${activeComponentsList}

echo "==> [4/4] Workstation Container Cluster is Online & Ready!"
echo "==> API Server: https://127.0.0.1:6443"
echo "==> Ingress Forwarding: http://localhost:8080 | https://localhost:8443"
`;
    }

    if (isAirgap) {
      return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Air-Gapped Offline Cluster & Platform Provisioner
# Infrastructure: ${infraType.toUpperCase()} | Engine: ${orchestrator.toUpperCase()}
# Topology: ${topology} | Total Sizing: ${clusterMetrics.totalVcpu} vCPU, ${clusterMetrics.totalMemGi} GB RAM
# ==============================================================================
set -euo pipefail

ARCH="${osArch}"
INSTALL_DIR="/opt/kubesdk/offline"

echo "==> [1/4] Unpacking air-gapped artifacts into \${INSTALL_DIR}..."
mkdir -p "\${INSTALL_DIR}/bin" "\${INSTALL_DIR}/images" "\${INSTALL_DIR}/manifests"

echo "==> [2/4] Pre-loading container images into local containerd image store..."
find "\${INSTALL_DIR}/images" -type f -name "*.tar" -exec ctr -n k8s.io images import {} +

echo "==> [3/4] Installing ${orchestrator.toUpperCase()} runtime offline without internet..."
INSTALL_${orchestrator.toUpperCase()}_SKIP_DOWNLOAD=true \${INSTALL_DIR}/bin/${orchestrator}-install.sh

echo "==> [4/4] Deploying Platform Capability Components..."
${activeComponentsList}

echo "==> Cluster and Platform are ONLINE! Exporting kubeconfig..."
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
echo "==> API Server: https://127.0.0.1:6443"
`;
    }

    return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Online Cluster & Platform Provisioner
# Target: ${infraType} | Engine: ${orchestrator} | Nodes: ${nodesCount}
# ==============================================================================
set -euo pipefail

echo "==> [1/3] Installing ${orchestrator.toUpperCase()} Kubernetes Engine..."
curl -sfL https://get.k3s.io | sh -s - server --cluster-cidr="${podCidr}" --service-cidr="${serviceCidr}"

echo "==> [2/3] Deploying Platform Capability Layer Components..."
${activeComponentsList}

echo "==> [3/3] Verifying Cluster Nodes Status..."
kubectl get nodes -o wide
echo "==> Ready for KubeSDK runtime connection!"
`;
  }, [
    infraType, activeCloud, cloudRegion, cloudInstanceType, cloudUseSpot,
    cloudAutoShutdown, cloudShutdownHour, activeContainer, selectedContainerId,
    containerHostEnv, containerNetworkMode, containerWorkspaceMount,
    containerSocketSharing, containerBatteryThrottling, podCidr, serviceCidr,
    isAirgap, osArch, orchestrator, topology, clusterMetrics, nodesCount, enabledPlatformLayers
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    try {
      const payload = {
        infraType,
        orchestrator,
        topology,
        nodesCount: topology === 'single-node' ? 1 : nodesCount,
        vcpu: clusterMetrics.totalVcpu,
        memoryGi: clusterMetrics.totalMemGi,
        diskGi: clusterMetrics.totalDiskGi,
        arch: osArch,
        isAirgap,
        cloudProvider: infraType === 'cloud-vm' ? {
          providerId: selectedCloudProvider,
          providerName: activeCloud.name,
          region: cloudRegion,
          instanceType: cloudInstanceType,
          useSpot: cloudUseSpot,
          autoShutdown: cloudAutoShutdown,
          shutdownHour: cloudShutdownHour,
          allowedCidr: cloudAllowedCidr,
          storageType: cloudStorageType,
          storageSizeGi: cloudStorageSize,
          credentials: cloudCredentials
        } : undefined,
        vmNodePools: vmMode === 'asymmetrical' ? vmNodePools : undefined,
        includeWorkloadImages,
        privateRegistryUrl: privateRegistryUrl.trim() || undefined,
        podCidr,
        serviceCidr,
        platformLayers: platformLayers.map(l => ({
          id: l.id,
          name: l.name,
          enabled: l.enabled,
          selectedComponent: l.components[l.selectedComponentIndex] || l.components[0]
        }))
      };

      const res = await fetch('/api/cluster/offline-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Package bundling failed on server');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = isAirgap 
        ? `kubesdk-airgap-${infraType}-${orchestrator}-${topology}.zip`
        : `kubesdk-setup-${infraType}-${orchestrator}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Package download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Version Control: Save Version to Backend ---
  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVersion(true);
    try {
      const parsedConfig = yaml.load(fullClusterConfigYaml);
      const payload = {
        id: activeProfileId || undefined,
        name: activeProfileName.trim() || 'Custom Cluster Profile',
        description: activeProfileDesc.trim(),
        bumpType: versionBumpType,
        versionComment: versionComment.trim() || 'Configuration update',
        author: versionAuthor.trim() || 'Platform Architect',
        yamlContent: fullClusterConfigYaml,
        config: parsedConfig
      };

      const res = await fetch('/api/config/infra-deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save version');
      }

      const data = await res.json();
      const savedProfile = data.profile;
      setActiveProfileId(savedProfile.id);
      setActiveVersionTag(savedProfile.activeVersion);
      await fetchProfiles();
      setIsSaveVersionModalOpen(false);
      alert(`🎉 Successfully saved YAML configuration as version ${savedProfile.activeVersion}!`);
    } catch (err: any) {
      alert(`Failed to save configuration: ${err.message}`);
    } finally {
      setIsSavingVersion(false);
    }
  };

  // --- Version Control: Restore / Load Profile Version ---
  const handleLoadProfileVersion = async (profileId: string, versionTag?: string) => {
    try {
      const url = versionTag 
        ? `/api/config/infra-deployments/${profileId}?version=${versionTag}`
        : `/api/config/infra-deployments/${profileId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      const profile = data.profile;
      const config = profile.config || (profile.yamlContent ? yaml.load(profile.yamlContent) : null);

      if (config) {
        applyParsedConfigToWizard(config);
        setActiveProfileId(profile.id);
        setActiveProfileName(profile.name);
        setActiveProfileDesc(profile.description || '');
        setActiveVersionTag(profile.activeVersion || versionTag || 'v1.0.0');
        setIsVersionHistoryModalOpen(false);
        alert(`Loaded configuration profile "${profile.name}" (${profile.activeVersion}) into the wizard!`);
      }
    } catch (e: any) {
      alert(`Error loading profile: ${e.message}`);
    }
  };

  // --- Version Control: Delete Profile / Version ---
  const handleDeleteProfile = async (profileId: string, versionTag?: string) => {
    const msg = versionTag 
      ? `Delete version ${versionTag} of this profile?` 
      : `Permanently delete profile ${profileId} and all its version history?`;
    if (!confirm(msg)) return;

    try {
      const url = versionTag 
        ? `/api/config/infra-deployments/${profileId}?version=${versionTag}`
        : `/api/config/infra-deployments/${profileId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchProfiles();
      if (!versionTag && activeProfileId === profileId) {
        setActiveProfileId('');
        setActiveVersionTag('v1.0.0');
      }
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  // --- Helper to parse imported YAML and populate state ---
  const applyParsedConfigToWizard = (parsed: any) => {
    const spec = parsed?.spec || parsed;
    const infra = spec?.infrastructure || spec;
    const orch = spec?.orchestrator || spec;
    const meta = parsed?.metadata || {};

    if (meta.environment) setIsAirgap(meta.environment === 'air-gapped');
    if (infra?.target) setInfraType(infra.target);
    if (infra?.topology) setTopology(infra.topology);
    if (infra?.nodes) setNodesCount(Number(infra.nodes) || 1);
    if (infra?.totalCompute?.arch) setOsArch(infra.totalCompute.arch);
    if (infra?.totalCompute?.vcpu) setVcpu(Number(infra.totalCompute.vcpu) || 4);
    if (infra?.totalCompute?.memoryGi) setMemoryGi(Number(infra.totalCompute.memoryGi) || 8);
    if (infra?.totalCompute?.diskGi) setDiskGi(Number(infra.totalCompute.diskGi) || 50);

    if (infra?.hardwarePreset) setSelectedHardwareId(infra.hardwarePreset);
    if (infra?.hypervisor?.platform) setSelectedHypervisor(infra.hypervisor.platform);
    if (infra?.hypervisor?.mode) setVmMode(infra.hypervisor.mode);
    if (infra?.hypervisor?.pools) setVmNodePools(infra.hypervisor.pools);

    if (infra?.cloudProvider?.provider) setSelectedCloudProvider(infra.cloudProvider.provider);
    if (infra?.cloudProvider?.region) setCloudRegion(infra.cloudProvider.region);
    if (infra?.cloudProvider?.instanceType) setCloudInstanceType(infra.cloudProvider.instanceType);

    if (infra?.virtualContainer?.engine) setSelectedContainerId(infra.virtualContainer.engine);
    if (infra?.virtualContainer?.hostEnvironment) setContainerHostEnv(infra.virtualContainer.hostEnvironment);
    if (infra?.virtualContainer?.networking) setContainerNetworkMode(infra.virtualContainer.networking);
    if (infra?.virtualContainer?.workspaceMount) setContainerWorkspaceMount(infra.virtualContainer.workspaceMount);
    if (infra?.virtualContainer?.socketSharing !== undefined) setContainerSocketSharing(infra.virtualContainer.socketSharing);
    if (infra?.virtualContainer?.batteryThrottling !== undefined) setContainerBatteryThrottling(infra.virtualContainer.batteryThrottling);

    if (orch?.engine) setOrchestrator(orch.engine);
    if (orch?.networking?.podCidr) setPodCidr(orch.networking.podCidr);
    if (orch?.networking?.serviceCidr) setServiceCidr(orch.networking.serviceCidr);

    if (spec?.platformComponents && Array.isArray(spec.platformComponents)) {
      setPlatformLayers(prev => prev.map(layer => {
        const matching = spec.platformComponents.find((p: any) => p.layerId === layer.id || p.layerName === layer.name);
        if (!matching) return layer;
        const compIdx = matching.component?.name 
          ? layer.components.findIndex(c => c.name.toLowerCase() === matching.component.name.toLowerCase())
          : layer.selectedComponentIndex;
        return {
          ...layer,
          enabled: matching.enabled !== undefined ? matching.enabled : layer.enabled,
          selectedComponentIndex: compIdx >= 0 ? compIdx : layer.selectedComponentIndex
        };
      }));
    }
  };

  // --- Import YAML Handler ---
  const handleImportYaml = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed: any = yaml.load(importYamlInput);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid YAML structure');
      applyParsedConfigToWizard(parsed);
      if (parsed.metadata?.name) setActiveProfileName(parsed.metadata.name);
      if (parsed.metadata?.version) setActiveVersionTag(parsed.metadata.version);
      setIsImportModalOpen(false);
      alert('YAML configuration successfully imported and applied to wizard!');
    } catch (err: any) {
      setImportError(err.message || 'YAML parse failed');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportYamlInput(content);
    };
    reader.readAsText(file);
  };

  // --- Export Standalone YAML file ---
  const handleExportYamlFile = () => {
    const blob = new Blob([fullClusterConfigYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeProfileName || 'cluster-config').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeVersionTag}.yaml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- Export Standalone JSON file ---
  const handleExportJsonFile = () => {
    const parsed = yaml.load(fullClusterConfigYaml);
    const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeProfileName || 'cluster-config').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeVersionTag}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- Edit Raw YAML Save ---
  const handleSaveRawYaml = () => {
    setRawYamlError(null);
    try {
      const parsed: any = yaml.load(rawYamlDraft);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid YAML');
      applyParsedConfigToWizard(parsed);
      setIsRawYamlModalOpen(false);
      setIsSaveVersionModalOpen(true);
    } catch (e: any) {
      setRawYamlError(e.message || 'YAML error');
    }
  };

  // Open inline add modal for infra target models
  const handleOpenInlineModal = (target: 'baremetal' | 'hypervisor' | 'cloud' | 'container') => {
    setInlineModalType(target);
    setInlineModalError(null);
    if (target === 'baremetal') {
      setInlineItemData({
        vendor: 'Custom',
        name: '',
        version: 'v1.0',
        category: 'Edge & SBC',
        vcpu: 4,
        memoryGi: 8,
        diskGi: 50,
        arch: 'x86_64',
        desc: ''
      });
    } else if (target === 'hypervisor') {
      setInlineItemData({
        name: '',
        version: 'v1.0',
        engine: 'KVM / QEMU',
        category: 'Open-Source & Linux',
        desc: ''
      });
    } else if (target === 'cloud') {
      setInlineItemData({
        name: '',
        badge: 'Cloud VM',
        defaultRegion: 'us-east-1',
        regionsStr: 'us-east-1: US East, eu-west-1: Europe',
        instanceTypesStr: 'dev-std: 4 vCPU / 16GB RAM',
        credentialsStr: 'apiKey: API Token: secret'
      });
    } else {
      setInlineItemData({
        name: '',
        engineType: 'docker',
        category: 'Container Runtime',
        defaultVcpu: 2,
        defaultMemoryGi: 4,
        defaultDiskGi: 20,
        desc: ''
      });
    }
    setIsInlineAddModalOpen(true);
  };

  const handleSaveInlineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInlineSaving(true);
    setInlineModalError(null);

    try {
      let payload: any = { ...inlineItemData };

      if (inlineModalType === 'baremetal') {
        if (!payload.name || !payload.vendor) throw new Error('Vendor and Model Name required');
        payload.vcpu = Number(payload.vcpu) || 2;
        payload.memoryGi = Number(payload.memoryGi) || 4;
        payload.diskGi = Number(payload.diskGi) || 50;
      } else if (inlineModalType === 'hypervisor') {
        if (!payload.name) throw new Error('Hypervisor name is required');
      } else if (inlineModalType === 'cloud') {
        if (!payload.name) throw new Error('Cloud provider name is required');
        if (payload.regionsStr) {
          payload.regions = payload.regionsStr.split(',').map((r: string) => {
            const [id, name] = r.split(':').map((s: string) => s.trim());
            return { id: id || 'us-east-1', name: name || id };
          });
        }
        if (payload.instanceTypesStr) {
          payload.instanceTypes = payload.instanceTypesStr.split(',').map((t: string) => {
            const parts = t.split(':').map((s: string) => s.trim());
            return { id: parts[0] || 'dev-std', name: parts[0] || 'dev-std', vcpu: 4, memGi: 16, desc: parts[1] || 'Dev Machine', category: 'Dev Optimized' };
          });
        }
        if (payload.credentialsStr) {
          payload.credentialFields = payload.credentialsStr.split(',').map((c: string) => {
            const [key, label, type] = c.split(':').map((s: string) => s.trim());
            return { key: key || 'apiKey', label: label || key, placeholder: `Enter ${label || key}...`, isSecret: type === 'secret', desc: `Authentication field` };
          });
        }
      } else if (inlineModalType === 'container') {
        if (!payload.name) throw new Error('Container engine / VDI profile name is required');
        payload.defaultVcpu = Number(payload.defaultVcpu) || 4;
        payload.defaultMemoryGi = Number(payload.defaultMemoryGi) || 8;
        payload.defaultDiskGi = Number(payload.defaultDiskGi) || 40;
      }

      const res = await fetch(`/api/config/infrastructure/${inlineModalType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add preset');
      }

      const json = await res.json();
      const addedItem = json.item;

      if (inlineModalType === 'baremetal') {
        setHardwareList(prev => [...prev, addedItem]);
        setSelectedHardwareId(addedItem.id);
        setVcpu(addedItem.vcpu);
        setMemoryGi(addedItem.memoryGi);
        setDiskGi(addedItem.diskGi);
        setOsArch(addedItem.arch);
      } else if (inlineModalType === 'hypervisor') {
        setHypervisorList(prev => [...prev, addedItem]);
        setSelectedHypervisor(addedItem.id);
      } else if (inlineModalType === 'cloud') {
        setCloudList(prev => [...prev, addedItem]);
        setSelectedCloudProvider(addedItem.id);
        if (addedItem.defaultRegion) setCloudRegion(addedItem.defaultRegion);
      } else if (inlineModalType === 'container') {
        setContainerList(prev => [...prev, addedItem]);
        setSelectedContainerId(addedItem.id);
        setVcpu(addedItem.defaultVcpu || 4);
        setMemoryGi(addedItem.defaultMemoryGi || 8);
        setDiskGi(addedItem.defaultDiskGi || 40);
      }

      setIsInlineAddModalOpen(false);
    } catch (err: any) {
      setInlineModalError(err.message || 'Failed to save');
    } finally {
      setIsInlineSaving(false);
    }
  };

  return (
    <motion.div
      key="define-kube-infra-wizard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-24 max-w-7xl mx-auto"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} />
                Infrastructure Architecture Wizard
              </span>
              {activeVersionTag && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-mono font-bold">
                  {activeVersionTag}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Define Kubernetes Infrastructure
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Step-by-step infrastructure target definition, node sizing, topology, Kubernetes engine, platform capability layers, version-controlled YAML persistence, and packaging.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsVersionHistoryModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2"
            >
              <History size={15} />
              <span>Version History ({savedProfiles.length})</span>
            </button>

            {onNavigateToWizard && (
              <button
                type="button"
                onClick={onNavigateToWizard}
                className="px-5 py-2.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 shrink-0"
              >
                <span>Go to Local Run Wizard</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Wizard Steps Navigation Bar (6 Steps) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 mt-6 pt-6 border-t border-slate-700/60">
          {WIZARD_STEPS.map((s, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "p-3 rounded-2xl text-left transition-all relative border flex flex-col justify-between gap-1",
                  isCurrent 
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/40" 
                    : isCompleted
                      ? "bg-slate-800/80 border-emerald-500/40 text-slate-200 hover:bg-slate-800"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isCurrent ? "text-indigo-200" : isCompleted ? "text-emerald-400" : "text-slate-400")}>
                    Step 0{idx + 1}
                  </span>
                  {isCompleted && <CheckCircle size={14} className="text-emerald-400" />}
                </div>
                <h4 className="text-xs font-bold truncate">{s.title}</h4>
                <p className="text-[10px] opacity-75 line-clamp-1">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 min-h-[500px] flex flex-col justify-between">
        
        {/* Step 1: Target & Mode */}
        {currentStep === 0 && (
          <motion.div
            key="step-target"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">1. Choose Infrastructure Target & Deployment Environment</h3>
              <p className="text-xs text-[#6C757D] mt-1">Select the target execution architecture and declare whether deployment runs in an air-gapped or online cloud environment.</p>
            </div>

            {/* Target Architecture Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider">Select Target Platform:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { id: 'baremetal' as InfraType, label: 'Baremetal Hardware', desc: 'Direct on physical servers & Edge SBCs', icon: <Server size={22} className="text-indigo-600" />, count: `${hardwareList.length} Models` },
                  { id: 'hypervisor-vm' as InfraType, label: 'VM / Hypervisor', desc: 'Harvester, KubeVirt, ESXi, Proxmox', icon: <Cpu size={22} className="text-purple-600" />, count: `${hypervisorList.length} Engines` },
                  { id: 'cloud-vm' as InfraType, label: 'Cloud Instance', desc: 'AWS, GCP, Azure, DO, Hetzner, OCI', icon: <Cloud size={22} className="text-sky-600" />, count: `${cloudList.length} Providers` },
                  { id: 'docker-cluster' as InfraType, label: 'Virtual Container', desc: 'Local Docker, Podman, k3d, KinD', icon: <Box size={22} className="text-emerald-600" />, count: 'Fast Sandbox' },
                ].map((item) => {
                  const isSelected = infraType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInfraType(item.id)}
                      className={cn(
                        "p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/40 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                          : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-xs">{item.icon}</div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1A1A1A]">{item.label}</h4>
                        <p className="text-xs text-[#6C757D] mt-1">{item.desc}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md self-start">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode: Airgap vs Online */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Deployment Network Mode</h4>
                  <p className="text-xs text-[#6C757D]">Choose whether to build an offline standalone package or connect directly to online cloud services.</p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsAirgap(true)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                      isAirgap ? "bg-amber-600 text-white shadow-sm" : "text-[#6C757D] hover:text-[#1A1A1A]"
                    )}
                  >
                    <ShieldCheck size={14} />
                    <span>Air-Gapped (Offline)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAirgap(false)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                      !isAirgap ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D] hover:text-[#1A1A1A]"
                    )}
                  >
                    <Globe size={14} />
                    <span>Online (Cloud APIs)</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Target-specific Configuration */}
        {currentStep === 1 && (
          <motion.div
            key="step-config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Baremetal */}
            {infraType === 'baremetal' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Server size={18} className="text-indigo-600" />
                      Select Baremetal Hardware Model & Sizing Preset
                    </h3>
                    <p className="text-xs text-indigo-900/80 mt-0.5">
                      Declaratively configured models with auto-tuning kernel profiles loaded from <code className="font-mono bg-indigo-100/80 px-1 py-0.2 rounded text-indigo-800">config/baremetal-presets.yaml</code>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenInlineModal('baremetal')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Custom Hardware</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {['All', ...Array.from(new Set(hardwareList.map(h => h.vendor)))].map(vendor => (
                    <button
                      key={vendor}
                      type="button"
                      onClick={() => setSelectedVendorFilter(vendor)}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-lg transition-colors",
                        selectedVendorFilter === vendor
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-gray-100 text-[#6C757D] hover:bg-gray-200"
                      )}
                    >
                      {vendor}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {hardwareList
                    .filter(hw => selectedVendorFilter === 'All' || hw.vendor === selectedVendorFilter)
                    .map(hw => {
                      const isSelected = selectedHardwareId === hw.id;
                      return (
                        <button
                          key={hw.id}
                          type="button"
                          onClick={() => handleSelectHardware(hw)}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                            isSelected
                              ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                              : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">{hw.vendor}</span>
                                <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-700">{hw.version}</span>
                              </div>
                              <h4 className="text-sm font-bold text-[#1A1A1A] mt-1">{hw.name}</h4>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check size={12} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#6C757D] line-clamp-2">{hw.desc}</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-600 flex-wrap">
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.vcpu} vCPU</span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.memoryGi} GB RAM</span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.diskGi} GB</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">{hw.arch}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Hypervisor */}
            {infraType === 'hypervisor-vm' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                  <div>
                    <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                      <Cpu size={18} className="text-purple-600" />
                      Hypervisor Virtualization Platform & Node Sizing
                    </h3>
                    <p className="text-xs text-purple-900/80 mt-0.5">
                      Configure KubeVirt, Harvester, VMware ESXi, Proxmox, OpenShift Virt, Nutanix, or Linux KVM.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInlineModal('hypervisor')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Hypervisor Engine</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {hypervisorList.map(hyp => {
                    const isSelected = selectedHypervisor === hyp.id;
                    return (
                      <button
                        key={hyp.id}
                        type="button"
                        onClick={() => setSelectedHypervisor(hyp.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 relative cursor-pointer",
                          isSelected
                            ? "bg-white border-purple-600 shadow-sm ring-2 ring-purple-500/20"
                            : "bg-white border-gray-200 hover:border-purple-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-tight break-words">{hyp.name}</span>
                          {isSelected && <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 ml-1"><Check size={10} /></div>}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono line-clamp-1">{hyp.engine}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]">VM Node Architecture Mode</h4>
                    <p className="text-xs text-[#6C757D]">Choose uniform symmetrical VMs or heterogeneous node pools (Control Plane, Worker, GPU, Storage).</p>
                  </div>
                  <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setVmMode('symmetrical')}
                      className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", vmMode === 'symmetrical' ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D]")}
                    >
                      Symmetrical
                    </button>
                    <button
                      type="button"
                      onClick={() => setVmMode('asymmetrical')}
                      className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1", vmMode === 'asymmetrical' ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D]")}
                    >
                      <Layers size={13} />
                      <span>Asymmetrical Pools</span>
                    </button>
                  </div>
                </div>

                {vmMode === 'asymmetrical' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#495057] uppercase">Configured Node Pools ({vmNodePools.length})</label>
                      <button
                        type="button"
                        onClick={handleAddVMPool}
                        className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                      >
                        <Plus size={13} /> Add Node Pool
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {vmNodePools.map(pool => (
                        <div key={pool.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between gap-2.5">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={pool.name}
                              onChange={e => handleUpdateVMPool(pool.id, { name: e.target.value })}
                              className="text-xs font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-600 outline-none w-full"
                            />
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-mono uppercase">{pool.category}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-gray-600">
                            <div>vCPU: <span className="font-bold text-gray-900">{pool.vcpu}</span></div>
                            <div>RAM: <span className="font-bold text-gray-900">{pool.memoryGi}GB</span></div>
                            <div>Disk: <span className="font-bold text-gray-900">{pool.diskGi}GB</span></div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                            <span className="text-gray-500 font-medium">Nodes:</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={pool.count}
                                onChange={e => handleUpdateVMPool(pool.id, { count: parseInt(e.target.value) || 1 })}
                                className="w-14 px-2 py-0.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded text-center"
                              />
                              {vmNodePools.length > 1 && (
                                <button type="button" onClick={() => handleRemoveVMPool(pool.id)} className="text-gray-400 hover:text-red-600 px-1 font-bold">✕</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cloud */}
            {infraType === 'cloud-vm' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                  <div>
                    <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                      <Cloud size={18} className="text-sky-600" />
                      Cloud Provider & Development Stage Setup
                    </h3>
                    <p className="text-xs text-sky-900/80 mt-0.5">
                      Configure AWS, GCP, Azure, DigitalOcean, Hetzner, or OCI with automated developer cost optimizations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInlineModal('cloud')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Cloud Provider</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {cloudList.map(provider => {
                    const isSelected = selectedCloudProvider === provider.id;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleSelectCloudProvider(provider.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 relative cursor-pointer",
                          isSelected
                            ? "bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20"
                            : "bg-white/80 border-gray-200 hover:border-sky-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-tight break-words">{provider.name.split('(')[0]}</span>
                          {isSelected && <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 ml-1"><Check size={10} /></div>}
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 bg-gray-50 px-1 py-0.2 rounded self-start">{provider.badge}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Datacenter Region</label>
                    <select
                      value={cloudRegion}
                      onChange={e => setCloudRegion(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium"
                    >
                      {activeCloud.regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Machine Sizing Preset</label>
                    <select
                      value={cloudInstanceType}
                      onChange={e => handleSelectCloudInstanceType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium"
                    >
                      {activeCloud.instanceTypes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} — {inst.vcpu} vCPU / {inst.memGi}GB RAM</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Virtual Container & Developer Workstation (VDI) */}
            {infraType === 'docker-cluster' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <Laptop size={18} className="text-emerald-600" />
                      Container Sandbox & Developer Workstation (VDI)
                    </h3>
                    <p className="text-xs text-emerald-900/80 mt-0.5">
                      Configure localized container runtimes, developer laptops (macOS Apple Silicon, Windows WSL2, Linux), or virtual desktop infrastructure (Citrix, VMware Horizon, Remote Workstations) with zero-cost fast iteration.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenInlineModal('container')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Container / VDI Profile</span>
                    </button>
                  </div>
                </div>

                {/* Container Engines & VDI Profiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {containerList.map((engine: any) => {
                    const isSelected = selectedContainerId === engine.id;
                    const isVdi = engine.id === 'vdi-developer-laptop' || engine.engineType === 'vdi-workstation' || engine.category === 'Developer Workstation';
                    return (
                      <button
                        key={engine.id}
                        type="button"
                        onClick={() => handleSelectContainer(engine)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                          isSelected
                            ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                            : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "p-2 rounded-xl border flex items-center justify-center",
                              isVdi ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            )}>
                              {isVdi ? <Laptop size={18} /> : <Box size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md font-mono",
                                  isVdi ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
                                )}>
                                  {engine.category || 'Container'}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[#1A1A1A] mt-0.5 line-clamp-2 leading-snug break-words">{engine.name}</h4>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Check size={12} />
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-[#6C757D] line-clamp-2">{engine.desc}</p>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-600 flex-wrap">
                          <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{engine.defaultVcpu || vcpu} vCPU</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{engine.defaultMemoryGi || memoryGi} GB RAM</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{engine.defaultDiskGi || diskGi} GB Disk</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold">{engine.engineType || 'container'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Workstation / VDI Specific Tuning Settings */}
                <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Developer Workstation & VDI Environment Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                      Active: {activeContainer.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Host OS / VDI Platform Selection */}
                    <div>
                      <label className="block text-xs font-bold text-[#495057] uppercase mb-1.5 flex items-center gap-1.5">
                        <Monitor size={14} className="text-gray-500" />
                        Host Operating System / VDI Platform
                      </label>
                      <select
                        value={containerHostEnv}
                        onChange={e => setContainerHostEnv(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium text-gray-800"
                      >
                        <optgroup label="Developer Laptops & Local Machines">
                          <option value="laptop-mac">Developer Laptop: macOS (Apple Silicon M1/M2/M3/M4 or Intel)</option>
                          <option value="laptop-windows-wsl2">Developer Laptop: Windows 11 (WSL2 Ubuntu / Debian)</option>
                          <option value="laptop-linux">Developer Laptop: Linux Workstation (Ubuntu / Fedora / Arch / RHEL)</option>
                        </optgroup>
                        <optgroup label="VDI & Hosted Virtual Desktops">
                          <option value="vdi-citrix">VDI Hosted Desktop: Citrix Virtual Apps & Desktops (HDX)</option>
                          <option value="vdi-horizon">VDI Hosted Desktop: VMware Horizon / Omnissa (Blast / PCoIP)</option>
                          <option value="vdi-remote-sandbox">Remote Dev Sandbox: Cloud Workstation (Coder / Gitpod / Codespaces)</option>
                        </optgroup>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-1">Select your workstation type to apply host kernel file-sharing and network bridging parameters.</p>
                    </div>

                    {/* Developer Networking & Port Forwarding */}
                    <div>
                      <label className="block text-xs font-bold text-[#495057] uppercase mb-1.5 flex items-center gap-1.5">
                        <Globe size={14} className="text-gray-500" />
                        Developer Networking & Port Forwarding
                      </label>
                      <select
                        value={containerNetworkMode}
                        onChange={e => setContainerNetworkMode(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium text-gray-800"
                      >
                        <option value="host-forward">Direct Host Port Forwarding (80:8080, 443:8443, 6443:6443)</option>
                        <option value="bridge-nat">Isolated Bridge Network (NAT with Internal DNS Service Resolution)</option>
                        <option value="host-net">Host Network Mode (Shared Linux Network Namespace - Zero NAT)</option>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-1">Configures ingress traffic routing from your laptop or VDI browser directly into local pods.</p>
                    </div>
                  </div>

                  {/* Resource Sliders / Compute Allocation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-gray-700">CPU Allocation:</span>
                        <span className="font-mono font-bold text-emerald-600">{vcpu} vCPU Cores</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={16}
                        step={1}
                        value={vcpu}
                        onChange={e => setVcpu(parseInt(e.target.value) || 2)}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-0.5">
                        <span>1 Core</span>
                        <span>8 Cores</span>
                        <span>16 Cores</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-gray-700">Memory Allocation:</span>
                        <span className="font-mono font-bold text-emerald-600">{memoryGi} GB RAM</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={32}
                        step={2}
                        value={memoryGi}
                        onChange={e => setMemoryGi(parseInt(e.target.value) || 4)}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-0.5">
                        <span>2 GB</span>
                        <span>16 GB</span>
                        <span>32 GB</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-gray-700">Disk Cache / Storage:</span>
                        <span className="font-mono font-bold text-emerald-600">{diskGi} GB Disk</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={150}
                        step={10}
                        value={diskGi}
                        onChange={e => setDiskGi(parseInt(e.target.value) || 20)}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-0.5">
                        <span>10 GB</span>
                        <span>80 GB</span>
                        <span>150 GB</span>
                      </div>
                    </div>
                  </div>

                  {/* Local Workspace Mount & Host Sharing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1 flex items-center gap-1.5">
                        <FolderSync size={13} className="text-gray-500" />
                        Host Workspace Directory Mount
                      </label>
                      <input
                        type="text"
                        value={containerWorkspaceMount}
                        onChange={e => setContainerWorkspaceMount(e.target.value)}
                        placeholder="e.g. ~/workspace or /Users/name/code"
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-xl outline-none"
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Two-way volume bind between developer host filesystem and container runtime.</p>
                    </div>

                    <div className="flex flex-col justify-center space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1A1A1A]">
                        <input
                          type="checkbox"
                          checked={containerSocketSharing}
                          onChange={e => setContainerSocketSharing(e.target.checked)}
                          className="rounded accent-emerald-600"
                        />
                        <span className="flex items-center gap-1">
                          <Share2 size={13} className="text-emerald-600" />
                          Share Host Docker / Containerd Socket (/var/run/docker.sock)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1A1A1A]">
                        <input
                          type="checkbox"
                          checked={containerBatteryThrottling}
                          onChange={e => setContainerBatteryThrottling(e.target.checked)}
                          className="rounded accent-emerald-600"
                        />
                        <span className="flex items-center gap-1 text-gray-600 font-normal">
                          <Battery size={13} className="text-amber-600" />
                          Enable Laptop Battery Throttling Governor (reduces fan noise & power draw)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Scale & Topology */}
        {currentStep === 2 && (
          <motion.div
            key="step-topology"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">3. Configure Cluster Scale, Topology & High Availability</h3>
              <p className="text-xs text-[#6C757D] mt-1">Specify node counts, quorum fault tolerance zones, and overlay network CIDRs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { id: 'single-node' as TopologyType, label: 'Single Node Edge', desc: 'Combined control plane & worker for dev/edge SBCs', badge: '1 Node' },
                { id: 'multi-node' as TopologyType, label: 'Multi-Node Standard', desc: 'Dedicated control plane with horizontal worker pool', badge: '2+ Nodes' },
                { id: 'multi-zone' as TopologyType, label: 'Multi-Zone HA', desc: 'Spanned across multiple failure domains and racks', badge: 'HA Cluster' },
                { id: 'multi-zone-quorum' as TopologyType, label: 'Multi-Zone + Quorum', desc: '3-way split etcd with dedicated witness arbiter', badge: 'Mission Critical' }
              ].map(t => {
                const isSelected = topology === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTopology(t.id);
                      if (t.id === 'single-node') setNodesCount(1);
                      else if (nodesCount === 1) setNodesCount(3);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-[#1A1A1A]">{t.label}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check size={10} /></div>}
                    </div>
                    <p className="text-xs text-[#6C757D]">{t.desc}</p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md self-start">{t.badge}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Total Node Count</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={nodesCount}
                  onChange={e => setNodesCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Pod Network CIDR</label>
                <input
                  type="text"
                  value={podCidr}
                  onChange={e => setPodCidr(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Service CIDR</label>
                <input
                  type="text"
                  value={serviceCidr}
                  onChange={e => setServiceCidr(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Orchestrator Engine */}
        {currentStep === 3 && (
          <motion.div
            key="step-orchestrator"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">4. Select Kubernetes Orchestrator Engine</h3>
              <p className="text-xs text-[#6C757D] mt-1">Choose the Kubernetes distribution matched against your compute resources and capability catalog.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { id: 'k3s' as OrchestratorType, name: 'K3s (Rancher)', badge: 'Lightweight', desc: '512MB RAM minimal footprint single-binary distribution' },
                { id: 'microk8s' as OrchestratorType, name: 'MicroK8s (Canonical)', badge: 'Zero-Ops', desc: 'Pure upstream Kubernetes with snap-based automatic updates' },
                { id: 'minikube' as OrchestratorType, name: 'Minikube', badge: 'Dev Sandbox', desc: 'Developer standard sandbox for desktop workstation clusters' },
                { id: 'rke2' as OrchestratorType, name: 'RKE2 Government', badge: 'FIPS 140-2', desc: 'Hardened enterprise Kubernetes with CIS benchmark compliance' },
                { id: 'kubeadm' as OrchestratorType, name: 'Kubeadm Standard', badge: 'Upstream Core', desc: 'Official upstream vanilla Kubernetes cluster bootstrap tool' }
              ].map(orch => {
                const isSelected = orchestrator === orch.id;
                const isRecommended = recommendedEngine === orch.id;
                return (
                  <button
                    key={orch.id}
                    type="button"
                    onClick={() => setOrchestrator(orch.id)}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 relative cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/40 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-[#1A1A1A] leading-snug break-words">{orch.name}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-1"><Check size={10} /></div>}
                    </div>
                    <p className="text-[11px] text-[#6C757D]">{orch.desc}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{orch.badge}</span>
                      {isRecommended && <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Recommended</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {isAirgap && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-950">Air-Gapped Offline Image Packaging</h4>
                </div>
                <p className="text-xs text-amber-900/80">
                  Pre-bundles system orchestrator images, ingress controllers, metrics servers, and storage drivers into the downloaded `.zip` archive.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 5: Platform Capability Layers */}
        {currentStep === 4 && (
          <motion.div
            key="step-platform-layers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Layers size={20} className="text-indigo-600" />
                  5. Platform Capability Layers & Default Components
                </h3>
                <p className="text-xs text-[#6C757D] mt-0.5">
                  Select and configure default / recommended platform components per capability layer. Customize providers, modify namespaces, or add custom components.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenAddPlatformModal('layer')}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Add Custom Layer</span>
                </button>

                <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
                  <button
                    type="button"
                    onClick={() => setLayerFilter('all')}
                    className={cn("px-3 py-1 rounded-lg transition-all", layerFilter === 'all' && "bg-white text-indigo-600 shadow-xs")}
                  >
                    All ({platformLayers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayerFilter('enabled')}
                    className={cn("px-3 py-1 rounded-lg transition-all", layerFilter === 'enabled' && "bg-white text-emerald-600 shadow-xs")}
                  >
                    Enabled ({platformLayers.filter(l => l.enabled).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Filter toolbar & stats matching Capability Registry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-3 text-xs text-[#6C757D] flex-wrap">
                <span className="flex items-center gap-1 font-bold text-[#1A1A1A]">
                  <Layers size={14} className="text-indigo-600" /> {platformLayers.length} Layers
                </span>
                <span>·</span>
                <span>{platformLayers.reduce((acc, l) => acc + l.components.length, 0)} Components</span>
                <span>·</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> {enabledPlatformLayers.length} Enabled
                </span>
              </div>

              {/* Layer Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setLayerFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                    layerFilter === 'all'
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs"
                      : "bg-white text-[#6C757D] border-gray-200 hover:border-gray-300"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLayerFilter('enabled')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                    layerFilter === 'enabled'
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-[#6C757D] border-gray-200 hover:border-gray-300"
                  )}
                >
                  Enabled Only
                </button>
                {platformLayers.map(layer => {
                  const colors = LAYER_PILL_COLORS[layer.id] || LAYER_PILL_COLORS['database'];
                  const isSelected = layerFilter === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setLayerFilter(layerFilter === layer.id ? 'all' : (layer.id as any))}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                        isSelected
                          ? `${colors.bg} ${colors.text} ${colors.border} shadow-xs font-black`
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {layer.name.split('&')[0].trim()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Capability Registry Pallet Layers Flow */}
            <div className="space-y-6 max-h-[620px] overflow-y-auto pr-2 pt-1">
              {platformLayers
                .filter(layer => {
                  if (layerFilter === 'all') return true;
                  if (layerFilter === 'enabled') return layer.enabled;
                  return layer.id === layerFilter;
                })
                .map((layer) => {
                  const activeComp = layer.components[layer.selectedComponentIndex] || layer.components[0];
                  const isCollapsed = !!collapsedLayers[layer.id];
                  const borderLeft = LAYER_BORDER_COLORS[layer.id] || 'border-l-indigo-500';
                  const bgGradient = LAYER_BG_GRADIENTS[layer.id] || 'from-indigo-500/5 to-white';
                  const hexColor = LAYER_HEX_COLORS[layer.id] || '#6366f1';
                  const pillColors = LAYER_PILL_COLORS[layer.id] || LAYER_PILL_COLORS['database'];

                  return (
                    <div key={layer.id} className="flex items-start gap-0 w-full relative">
                      {/* Left: 3D Hexagon Visual Component */}
                      <div className="shrink-0 w-[155px] h-[75px] flex items-center justify-center relative z-20" style={{ perspective: 1000 }}>
                        <motion.div 
                          className="w-[145px] h-[72px] cursor-pointer"
                          whileHover={{ scale: 1.05, rotateY: 10, rotateX: -6, y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleCollapseLayer(layer.id)}
                          title="Click to collapse/expand layer"
                        >
                          <ThreeDHexagon label={layer.name} layerId={layer.id} isSelected={layer.enabled} />
                        </motion.div>
                      </div>

                      {/* Animated Circuit Connector Line */}
                      <div className="w-8 h-[75px] flex items-center justify-center shrink-0 relative z-10 overflow-visible">
                        <svg width="32" height="20" className="overflow-visible" viewBox="0 0 32 20">
                          <motion.path
                            d="M 0 10 L 32 10"
                            stroke={hexColor}
                            strokeWidth={layer.enabled ? 3 : 1.5}
                            strokeDasharray={layer.enabled ? "6 4" : "none"}
                            animate={layer.enabled ? { strokeDashoffset: [0, -20] } : {}}
                            transition={layer.enabled ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
                          />
                          {layer.enabled && (
                            <motion.circle
                              r="3.5"
                              fill="#FFFFFF"
                              stroke={hexColor}
                              strokeWidth="2"
                              animate={{ cx: [0, 32] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                          )}
                        </svg>
                      </div>

                      {/* Right: Horizontal Category Pallet Card */}
                      <motion.div 
                        layout="position"
                        whileHover={{ y: -2, boxShadow: "0 10px 25px -8px rgba(0,0,0,0.07)" }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "flex-1 min-h-[75px] bg-white border border-l-4 rounded-2xl p-5 shadow-xs relative z-20 transition-all flex flex-col justify-center gap-4",
                          borderLeft,
                          layer.enabled ? ("border-gray-200 bg-gradient-to-r " + bgGradient) : "border-gray-200 bg-gray-50/70 opacity-70"
                        )}
                      >
                        {/* Pallet Header Row */}
                        <div 
                          className="flex items-center justify-between w-full cursor-pointer select-none"
                          onClick={() => toggleCollapseLayer(layer.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn("p-2 rounded-xl bg-white border border-gray-100 shadow-xs", pillColors.text)}>
                              {layer.id === 'ingress' && <Globe size={20} />}
                              {layer.id === 'storage' && <HardDrive size={20} />}
                              {layer.id === 'monitoring' && <Activity size={20} />}
                              {layer.id === 'security' && <Shield size={20} />}
                              {layer.id === 'gitops' && <GitBranch size={20} />}
                              {layer.id === 'database' && <Database size={20} />}
                              {layer.id === 'messaging' && <Zap size={20} />}
                              {layer.id === 'aiml' && <Brain size={20} />}
                              {!['ingress','storage','monitoring','security','gitops','database','messaging','aiml'].includes(layer.id) && <Box size={20} />}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-[#1A1A1A] tracking-tight">{layer.name}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                                  {layer.components.length} Component{layer.components.length !== 1 ? 's' : ''}
                                </span>
                                {layer.enabled && activeComp && (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs">
                                    <CheckCircle2 size={11} className="text-emerald-600 animate-pulse" />
                                    <span>Active: {activeComp.name}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#6C757D] mt-0.5 line-clamp-1">{layer.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenAddPlatformModal('component', layer.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-xs transition-all flex items-center gap-1"
                            >
                              <Plus size={11} />
                              <span>+ Component</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleLayer(layer.id)}
                              className={cn(
                                "w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0",
                                layer.enabled ? "bg-indigo-600" : "bg-gray-300"
                              )}
                              title={layer.enabled ? 'Click to disable layer' : 'Click to include layer'}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                                layer.enabled ? "translate-x-6" : "translate-x-0"
                              )} />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleCollapseLayer(layer.id)}
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              {isCollapsed ? <ChevronDown size={18} /> : <ChevronRight size={18} className="rotate-90" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Pallet Content */}
                        {!isCollapsed && layer.enabled && (
                          <div className="space-y-4 pt-3 border-t border-gray-100">
                            {/* Component Cards Grid - 3 Columns with ample width so titles are never clipped */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {layer.components.map((comp, cIdx) => {
                                const isSelected = layer.selectedComponentIndex === cIdx;
                                return (
                                  <div
                                    key={comp.name}
                                    onClick={() => handleSelectComponent(layer.id, cIdx)}
                                    className={cn(
                                      "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative group min-h-[145px]",
                                      isSelected
                                        ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                                        : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/60"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <div className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5",
                                          isSelected ? "bg-indigo-600 text-white shadow-xs" : "bg-gray-100 text-gray-700"
                                        )}>
                                          {comp.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h5 className="text-xs font-bold text-[#1A1A1A] leading-snug break-words" title={comp.name}>
                                            {comp.name}
                                          </h5>
                                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[9px] font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-bold">
                                              {comp.version || 'v1.0.0'}
                                            </span>
                                            {comp.isRecommended && (
                                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                ★ Recommended
                                              </span>
                                            )}
                                            {comp.isDefault && !comp.isRecommended && (
                                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {isSelected && (
                                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                            <Check size={11} />
                                          </div>
                                        )}
                                        {layer.components.length > 1 && !comp.isDefault && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteComponent(layer.id, cIdx);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                            title="Delete Component"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-[#6C757D] line-clamp-2 leading-relaxed break-words">
                                      {comp.description || 'Configured platform capability provider'}
                                    </p>

                                    <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-500 flex-wrap">
                                      {comp.namespace && (
                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-indigo-700 font-bold">
                                          ns: {comp.namespace}
                                        </span>
                                      )}
                                      {comp.port && (
                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                          port: {comp.port}
                                        </span>
                                      )}
                                      {comp.replicas && (
                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                          rep: {comp.replicas}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Active Component Inspector Banner - Flexible & Non-overflowing */}
                            {activeComp && (
                              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-start sm:items-center gap-2 text-[#495057] min-w-0 flex-1">
                                  <Sparkles size={14} className="text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
                                  <span className="font-medium text-[11px] break-words leading-normal">
                                    Active for Cluster Manifests: <strong className="text-[#1A1A1A]">{activeComp.name}</strong> ({activeComp.image || 'Official Image'}) · Target Namespace: <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{activeComp.namespace || 'default'}</code>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 shrink-0 self-start sm:self-auto flex-wrap">
                                  {activeComp.replicas && <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 font-bold">Replicas: {activeComp.replicas}</span>}
                                  {activeComp.port && <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 font-bold">Port: {activeComp.port}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* Step 6: Review, YAML Persistence & Version Control */}
        {currentStep === 5 && (
          <motion.div
            key="step-provision"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#1A1A1A]">6. Configuration Persistence, Version Control & Deployment</h3>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-mono font-bold rounded-lg">
                    {activeVersionTag}
                  </span>
                </div>
                <p className="text-xs text-[#6C757D] mt-0.5">
                  Save configurations to YAML, manage semantic version snapshots, edit manifests, import/export, and download self-contained `.zip` bundles.
                </p>
              </div>

              {/* Version Control Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsSaveVersionModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save Version ({activeVersionTag})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRawYamlDraft(fullClusterConfigYaml);
                    setRawYamlError(null);
                    setIsRawYamlModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  <span>Edit Raw YAML</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportYamlInput('');
                    setImportError(null);
                    setIsImportModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Upload size={13} />
                  <span>Import YAML</span>
                </button>

                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={handleExportYamlFile}
                    className="px-2.5 py-1.5 hover:bg-white text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                    title="Export cluster-config.yaml"
                  >
                    <FileCode size={13} className="text-indigo-600" />
                    <span>.yaml</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJsonFile}
                    className="px-2.5 py-1.5 hover:bg-white text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                    title="Export cluster-config.json"
                  >
                    <FileText size={13} className="text-emerald-600" />
                    <span>.json</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadPackage}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isDownloading ? 'Bundling...' : isAirgap ? 'Download Airgap Bundle (.zip)' : 'Download Setup Bundle (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Infrastructure</span>
                <span className="text-sm font-bold font-mono text-indigo-300">{infraType.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Compute</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{clusterMetrics.totalVcpu} vCPU / {clusterMetrics.totalMemGi} GB</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cluster Topology</span>
                <span className="text-sm font-bold font-mono text-purple-300">{topology} ({nodesCount} nodes)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Orchestrator Engine</span>
                <span className="text-sm font-bold font-mono text-sky-300">{orchestrator.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Platform Components</span>
                <span className="text-sm font-bold font-mono text-emerald-300">{enabledPlatformLayers.length} Enabled</span>
              </div>
            </div>

            {/* Split View: Live Synchronized YAML & Provisioning Script */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Live Cluster YAML Manifest */}
              <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">cluster-config.yaml ({activeVersionTag})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fullClusterConfigYaml);
                      alert('Copied cluster-config.yaml to clipboard!');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                  >
                    <Copy size={12} /> Copy YAML
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto flex-1 max-h-[300px] text-emerald-300">
                  {fullClusterConfigYaml}
                </pre>
              </div>

              {/* Live Bash Provisioning Script */}
              <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-sky-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">install.sh (Automated Provisioner)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Script'}</span>
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto flex-1 max-h-[300px] text-slate-300">
                  {generatedScript}
                </pre>
              </div>
            </div>

            {/* Pre-fill credentials helper */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#0D6EFD] shrink-0" />
                <span>After spinning up your cluster, inject credentials directly into Step 6 of the Local Run wizard.</span>
              </div>
              {onApplyCredentials && (
                <button
                  type="button"
                  onClick={() => onApplyCredentials('https://127.0.0.1:6443')}
                  className="px-3.5 py-1.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
                >
                  Pre-fill Default URL
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer Step Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} />
            <span>Previous Step</span>
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
              className="px-6 py-2.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <span>Next: {WIZARD_STEPS[currentStep + 1].title}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPackage}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Download size={14} />
              <span>Download Complete Package (.zip)</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Modal 1: Version History & Profiles Explorer --- */}
      <AnimatePresence>
        {isVersionHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <History size={20} className="text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm">Infrastructure Deployment Profiles & Version History</h3>
                    <p className="text-xs text-slate-400">Manage saved cluster definitions, compare snapshots, and rollback to prior versions.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVersionHistoryModalOpen(false)}
                  className="text-gray-400 hover:text-white font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {savedProfiles.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
                    <Bookmark size={32} className="mx-auto text-gray-400" />
                    <div>
                      <h4 className="font-bold text-sm text-[#1A1A1A]">No Saved Deployment Profiles Yet</h4>
                      <p className="text-xs text-[#6C757D] mt-1">Use the "Save Version" button in Step 6 to persist this infrastructure definition into config/.</p>
                    </div>
                  </div>
                ) : (
                  savedProfiles.map(prof => (
                    <div key={prof.id} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1A1A1A]">{prof.name}</h4>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-md">
                              Active: {prof.activeVersion}
                            </span>
                          </div>
                          {prof.description && <p className="text-xs text-[#6C757D] mt-0.5">{prof.description}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadProfileVersion(prof.id, prof.activeVersion)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            <span>Load into Wizard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(prof.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete Profile"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Version Snapshots List */}
                      <div className="pt-2 border-t border-gray-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Version History:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(prof.versions || []).map(v => (
                            <div key={v.version} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-indigo-700">{v.version}</span>
                                  <span className="text-[10px] text-gray-500">• {new Date(v.savedAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[11px] text-gray-600 truncate max-w-[200px]">{v.comment || 'Saved configuration'}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleLoadProfileVersion(prof.id, v.version)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Modal 2: Save New Version Modal --- */}
      <AnimatePresence>
        {isSaveVersionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Save size={20} />
                  <div>
                    <h3 className="font-bold text-sm">Save Configuration Version</h3>
                    <p className="text-xs text-emerald-100">Persist full YAML definition to backend config/ with version history.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveVersionModalOpen(false)}
                  className="text-emerald-100 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveNewVersion} className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Profile Name</label>
                  <input
                    type="text"
                    value={activeProfileName}
                    onChange={e => setActiveProfileName(e.target.value)}
                    placeholder="e.g. Production Harvester HA Cluster"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Description</label>
                  <input
                    type="text"
                    value={activeProfileDesc}
                    onChange={e => setActiveProfileDesc(e.target.value)}
                    placeholder="e.g. 5-node cluster with Ceph, Prometheus, and Ingress"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Semantic Version Bump</label>
                    <select
                      value={versionBumpType}
                      onChange={e => setVersionBumpType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                    >
                      <option value="patch">Patch (vX.X.+1)</option>
                      <option value="minor">Minor (vX.+1.0)</option>
                      <option value="major">Major (v+1.0.0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Author</label>
                    <input
                      type="text"
                      value={versionAuthor}
                      onChange={e => setVersionAuthor(e.target.value)}
                      placeholder="e.g. Lead Architect"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Changelog Comment</label>
                  <textarea
                    value={versionComment}
                    onChange={e => setVersionComment(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsSaveVersionModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingVersion}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    {isSavingVersion ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Confirm & Persist YAML</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Modal 3: Interactive Raw YAML Editor --- */}
      <AnimatePresence>
        {isRawYamlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[88vh]"
            >
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <FileCode size={20} className="text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm">Interactive Cluster YAML Editor</h3>
                    <p className="text-xs text-slate-400">Directly modify the declarative infrastructure manifest.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRawYamlModalOpen(false)}
                  className="text-gray-400 hover:text-white font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col space-y-3 overflow-hidden">
                {rawYamlError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>{rawYamlError}</span>
                  </div>
                )}
                <textarea
                  value={rawYamlDraft}
                  onChange={e => setRawYamlDraft(e.target.value)}
                  className="w-full flex-1 p-4 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-300 rounded-2xl border border-slate-800 outline-none resize-none min-h-[350px]"
                  spellCheck={false}
                />
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono">Lines: {rawYamlDraft.split('\n').length}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRawYamlModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRawYaml}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Validate & Apply to Wizard</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Modal 4: Import YAML / Config --- */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Upload size={20} />
                  <div>
                    <h3 className="font-bold text-sm">Import Infrastructure YAML Configuration</h3>
                    <p className="text-xs text-blue-100">Upload a cluster-config.yaml or paste manifest to populate wizard.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-blue-100 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleImportYaml} className="p-5 space-y-4 flex-1 flex flex-col">
                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {importError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Upload YAML File</label>
                  <input
                    type="file"
                    accept=".yaml,.yml,.json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="block text-[11px] font-bold text-[#495057] uppercase mb-1">Or Paste YAML Content</label>
                  <textarea
                    value={importYamlInput}
                    onChange={e => setImportYamlInput(e.target.value)}
                    placeholder="Paste cluster-config.yaml content here..."
                    rows={8}
                    className="w-full flex-1 p-3 font-mono text-xs bg-slate-950 text-emerald-300 rounded-xl border border-gray-300 outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Upload size={14} />
                    <span>Import & Apply</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Modal 5: Add Custom Platform Layer or Component --- */}
      <AnimatePresence>
        {isAddPlatformModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  <h4 className="font-bold text-xs text-[#1A1A1A]">
                    {platformModalMode === 'layer' ? 'Add New Platform Capability Layer' : 'Add Component to Layer'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPlatformModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePlatformItem} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {platformModalMode === 'layer' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Layer Name</label>
                      <input
                        type="text"
                        value={newLayerName}
                        onChange={e => setNewLayerName(e.target.value)}
                        placeholder="e.g. Service Mesh, Disaster Recovery"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Description</label>
                      <textarea
                        value={newLayerDesc}
                        onChange={e => setNewLayerDesc(e.target.value)}
                        placeholder="Purpose of this platform capability layer..."
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Target Layer</label>
                      <select
                        value={targetLayerId}
                        onChange={e => setTargetLayerId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      >
                        {platformLayers.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Component Name</label>
                        <input
                          type="text"
                          value={newCompName}
                          onChange={e => setNewCompName(e.target.value)}
                          placeholder="e.g. Istio Service Mesh"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Version</label>
                        <input
                          type="text"
                          value={newCompVersion}
                          onChange={e => setNewCompVersion(e.target.value)}
                          placeholder="e.g. v1.21.0"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Target Namespace</label>
                        <input
                          type="text"
                          value={newCompNamespace}
                          onChange={e => setNewCompNamespace(e.target.value)}
                          placeholder="e.g. istio-system"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Container Image</label>
                        <input
                          type="text"
                          value={newCompImage}
                          onChange={e => setNewCompImage(e.target.value)}
                          placeholder="e.g. istio/pilot:1.21.0"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddPlatformModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Save size={12} />
                    <span>Add to Platform Wizard</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Modal 6: Add Custom Target Hardware/Cloud into config/*.yaml --- */}
      <AnimatePresence>
        {isInlineAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-sky-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {inlineModalType === 'baremetal' && <Server size={18} className="text-indigo-600" />}
                  {inlineModalType === 'hypervisor' && <Cpu size={18} className="text-purple-600" />}
                  {inlineModalType === 'cloud' && <Cloud size={18} className="text-sky-600" />}
                  {inlineModalType === 'container' && <Box size={18} className="text-emerald-600" />}
                  <h4 className="font-bold text-xs text-[#1A1A1A]">
                    Add New {inlineModalType === 'baremetal' ? 'Baremetal Preset' : inlineModalType === 'hypervisor' ? 'Hypervisor Engine' : inlineModalType === 'cloud' ? 'Cloud Provider' : 'Container Engine'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInlineAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInlineItem} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {inlineModalError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {inlineModalError}
                  </div>
                )}

                {inlineModalType === 'baremetal' && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Vendor</label>
                        <input
                          type="text"
                          value={inlineItemData.vendor || ''}
                          onChange={e => setInlineItemData({ ...inlineItemData, vendor: e.target.value })}
                          placeholder="e.g. Supermicro, Lenovo"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Model Name</label>
                        <input
                          type="text"
                          value={inlineItemData.name || ''}
                          onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                          placeholder="e.g. SuperServer 2U"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">vCPU</label>
                        <input
                          type="number"
                          min={1}
                          max={256}
                          value={inlineItemData.vcpu}
                          onChange={e => setInlineItemData({ ...inlineItemData, vcpu: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">RAM (GB)</label>
                        <input
                          type="number"
                          min={1}
                          max={1024}
                          value={inlineItemData.memoryGi}
                          onChange={e => setInlineItemData({ ...inlineItemData, memoryGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Disk (GB)</label>
                        <input
                          type="number"
                          min={10}
                          max={4000}
                          value={inlineItemData.diskGi}
                          onChange={e => setInlineItemData({ ...inlineItemData, diskGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Arch</label>
                        <select
                          value={inlineItemData.arch}
                          onChange={e => setInlineItemData({ ...inlineItemData, arch: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded"
                        >
                          <option value="x86_64">x86_64</option>
                          <option value="aarch64">aarch64</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {inlineModalType === 'hypervisor' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Hypervisor Name</label>
                      <input
                        type="text"
                        value={inlineItemData.name || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                        placeholder="e.g. SmartOS, XCP-ng"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Version</label>
                      <input
                        type="text"
                        value={inlineItemData.version || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, version: e.target.value })}
                        placeholder="e.g. v8.2"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {inlineModalType === 'cloud' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Cloud Provider Name</label>
                      <input
                        type="text"
                        value={inlineItemData.name || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                        placeholder="e.g. Linode, Scaleway"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={inlineItemData.badge || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, badge: e.target.value })}
                        placeholder="e.g. Linode VMs"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {inlineModalType === 'container' && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Engine / Profile Name</label>
                        <input
                          type="text"
                          value={inlineItemData.name || ''}
                          onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                          placeholder="e.g. Rancher Desktop, Colima VDI"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Category</label>
                        <select
                          value={inlineItemData.category || 'Container Runtime'}
                          onChange={e => setInlineItemData({ ...inlineItemData, category: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        >
                          <option value="Developer Workstation">Developer Workstation / VDI</option>
                          <option value="Container Runtime">Container Runtime</option>
                          <option value="Virtual K8s Cluster">Virtual K8s Cluster</option>
                          <option value="Rootless Container">Rootless Container</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Default vCPU</label>
                        <input
                          type="number"
                          min={1}
                          max={32}
                          value={inlineItemData.defaultVcpu || 4}
                          onChange={e => setInlineItemData({ ...inlineItemData, defaultVcpu: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">RAM (GB)</label>
                        <input
                          type="number"
                          min={1}
                          max={64}
                          value={inlineItemData.defaultMemoryGi || 8}
                          onChange={e => setInlineItemData({ ...inlineItemData, defaultMemoryGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Disk (GB)</label>
                        <input
                          type="number"
                          min={10}
                          max={200}
                          value={inlineItemData.defaultDiskGi || 40}
                          onChange={e => setInlineItemData({ ...inlineItemData, defaultDiskGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Description</label>
                      <input
                        type="text"
                        value={inlineItemData.desc || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, desc: e.target.value })}
                        placeholder="Developer environment profile description..."
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsInlineAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInlineSaving}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    {isInlineSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                    <span>Save to config/*.yaml</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
