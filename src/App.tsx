import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Settings, 
  Box, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Terminal,
  Download,
  AlertCircle,
  Activity,
  Cloud,
  Plus,
  Trash2,
  Edit2,
  Search,
  Server,
  Monitor,
  Zap,
  ShieldCheck,
  Network,
  Cpu
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  KubeSDKLocalRun, 
  LocalRunSource,
  ValidationResult,
  ResourcePlan,
  Component
} from './types';

const WIZARD_STEPS = [
  { id: 'source', title: 'Local Run Source' },
  { id: 'runtime', title: 'Runtime Selection' },
  { id: 'mode', title: 'Cluster Definition Mode' },
  { id: 'import', title: 'Live Cluster Import' },
  { id: 'model', title: 'Cluster Model & Components' },
  { id: 'mapping', title: 'Dependency Mapping' },
  { id: 'laptop', title: 'Laptop Resource Profile' },
  { id: 'feasibility', title: 'Feasibility & Suggestions' },
  { id: 'validation', title: 'Final Validation' },
  { id: 'deployment', title: 'Simulated Cluster Deployment' },
];

const INITIAL_CONFIG: KubeSDKLocalRun = {
  apiVersion: 'kubesdk.dev/v1alpha1',
  kind: 'LocalRunDefinition',
  metadata: {
    name: 'my-kubesdk-run',
    createdBy: 'platform-engineer',
    createdAt: new Date().toISOString(),
    toolVersion: '0.1.0',
  },
  wizard: {
    source: 'manual',
    runtime: {
      type: 'rancher-desktop',
      versionConstraint: '>=5.6',
    },
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

export default function App() {
  const [activeMenu, setActiveMenu] = useState<'home' | 'define' | 'history'>('define');
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<KubeSDKLocalRun>(INITIAL_CONFIG);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(0);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');

  // Filter steps based on source
  const visibleSteps = WIZARD_STEPS.filter(step => {
    if (step.id === 'import' && config.wizard.source === 'manual') return false;
    return true;
  });

  const nextStep = async () => {
    const currentStepId = visibleSteps[currentStep].id;
    
    // Trigger backend logic at specific steps
    if (currentStepId === 'laptop') {
      await handleFitResources();
    } else if (currentStepId === 'feasibility') {
      await handleValidate();
    }

    setCurrentStep(prev => Math.min(prev + 1, visibleSteps.length - 1));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSourceChange = (source: LocalRunSource) => {
    setConfig(prev => ({ 
      ...prev, 
      wizard: { ...prev.wizard, source } 
    }));
  };

  const handleFetchCluster = async () => {
    if (!config.wizard.connectivity?.apiServerUrl || !config.wizard.connectivity?.token) {
      alert('Please provide API Server URL and Authentication Token.');
      return;
    }

    setIsFetching(true);
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.wizard.connectivity),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setConfig(prev => ({
          ...prev,
          clusterSnapshot: data.snapshot
        }));
        nextStep();
      }
    } catch (error) {
      console.error('Fetch failed', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: ValidationResult = await response.json();
      setConfig(prev => ({ ...prev, validation: data }));
    } catch (error) {
      console.error('Validation failed', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFitResources = async () => {
    setIsFitting(true);
    try {
      const response = await fetch('/api/fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: ResourcePlan = await response.json();
      setConfig(prev => ({ ...prev, resourcePlan: data }));
    } catch (error) {
      console.error('Fitting failed', error);
    } finally {
      setIsFitting(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus(['Initializing k3d cluster...', 'Creating namespaces...', 'Applying base policies...']);
    
    // Simulate deployment steps
    const steps = [
      'Deploying infra components...',
      'Deploying app workloads...',
      'Verifying readiness...',
      'Cluster ready!'
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeploymentStatus(prev => [...prev, step]);
    }
    
    setIsDeploying(false);
    setIsReady(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#0D6EFD] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0D6EFD]/20">
              <Zap size={24} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-[#1A1A1A]">KubeSDK Simulator</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveMenu('home')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'home' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Home size={18} /> Home
            </button>
            
            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Platform Engineering</p>
            </div>
            
            <button 
              onClick={() => setActiveMenu('define')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'define' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Settings size={18} /> Define Local Run
            </button>
            
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6C757D] opacity-50 cursor-not-allowed text-sm font-medium">
              <Layers size={18} /> Capabilities (Future)
            </button>
            
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6C757D] opacity-50 cursor-not-allowed text-sm font-medium">
              <Activity size={18} /> Runtime Profiles
            </button>

            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">History</p>
            </div>
            
            <button 
              onClick={() => setActiveMenu('history')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'history' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Activity size={18} /> Run History
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#E9ECEF]">
          <div className="flex items-center gap-3 text-[#6C757D] text-xs">
            <Terminal size={14} />
            <span>v2.0.0-alpha</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-12">
          <AnimatePresence mode="wait">
            {activeMenu === 'define' ? (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Wizard Header */}
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">{visibleSteps[currentStep].title}</h2>
                    <p className="text-[#6C757D]">Step {currentStep + 1} of {visibleSteps.length}</p>
                  </div>
                  <div className="flex gap-2">
                    {visibleSteps.map((_, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          idx === currentStep ? "w-8 bg-[#0D6EFD]" : 
                          idx < currentStep ? "w-4 bg-[#198754]" : "w-4 bg-[#DEE2E6]"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm min-h-[400px]">
                  {visibleSteps[currentStep].id === 'source' && (
                    <div className="space-y-6">
                      <p className="text-[#495057]">Decide how the local simulation is defined.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleSourceChange('live')}
                          className={cn(
                            "p-6 rounded-xl border-2 text-left transition-all",
                            config.wizard.source === 'live' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.wizard.source === 'live' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
                              <Cloud size={20} />
                            </div>
                            <span className="font-bold">From Live Cluster</span>
                          </div>
                          <p className="text-sm text-[#6C757D]">Import configuration from an existing Kubernetes cluster via API.</p>
                        </button>
                        <button 
                          onClick={() => handleSourceChange('manual')}
                          className={cn(
                            "p-6 rounded-xl border-2 text-left transition-all",
                            config.wizard.source === 'manual' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.wizard.source === 'manual' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
                              <Edit2 size={20} />
                            </div>
                            <span className="font-bold">Manual Definition</span>
                          </div>
                          <p className="text-sm text-[#6C757D]">Define your cluster components and dependencies from scratch.</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'runtime' && (
                    <div className="space-y-6">
                      <p className="text-[#495057]">Select the local execution engine.</p>
                      <div className="max-w-md">
                        <label className="block text-sm font-medium text-[#495057] mb-2">Local Runtime</label>
                        <div className="relative">
                          <select 
                            value={config.wizard.runtime.type}
                            onChange={(e) => {
                              const type = e.target.value as any;
                              setConfig(prev => ({
                                ...prev,
                                wizard: { ...prev.wizard, runtime: { ...prev.wizard.runtime, type } },
                                runtimeExecution: { ...prev.runtimeExecution, type }
                              }));
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] bg-white text-[#1A1A1A] outline-none appearance-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all cursor-pointer"
                          >
                            <option value="rancher-desktop">Rancher Desktop</option>
                            <option value="k3d">k3d</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronRight size={16} className="rotate-90 text-[#6C757D]" />
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-[#6C757D]">Select your preferred local execution engine. Rancher Desktop is recommended for most users.</p>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'mode' && (
                    <div className="space-y-6">
                      <p className="text-[#495057]">Define what KubeSDK concepts will exist locally.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          'Namespaces', 'Workloads', 'Services', 'Ingress', 'ConfigMaps', 'Secrets', 'Policies'
                        ].map((key) => (
                          <button
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border transition-all border-[#0D6EFD] bg-[#E7F1FF]/30 text-[#0D6EFD]"
                            )}
                          >
                            <div className={cn("w-5 h-5 rounded border flex items-center justify-center bg-[#0D6EFD] border-[#0D6EFD] text-white")}>
                              <CheckCircle2 size={12} />
                            </div>
                            <span className="text-sm font-medium capitalize">{key}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'import' && (
                    <div className="space-y-8">
                      <div className="p-6 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#DEE2E6] flex items-center justify-center text-[#0D6EFD]">
                          <Cloud size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">Cluster Connectivity Details</h4>
                          <p className="text-xs text-[#6C757D]">Provide details to connect to your cluster (anywhere: local, cloud, on-prem).</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-[#495057]">API Server URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. https://1.2.3.4:6443" 
                          value={config.wizard.connectivity?.apiServerUrl}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, apiServerUrl: e.target.value } }
                          }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-[#495057]">Authentication Token</label>
                        <input 
                          type="password" 
                          placeholder="Bearer token..." 
                          value={config.wizard.connectivity?.token}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, token: e.target.value } }
                          }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-[#495057]">CA Certificate (Optional)</label>
                        <textarea 
                          placeholder="-----BEGIN CERTIFICATE-----" 
                          rows={4}
                          value={config.wizard.connectivity?.caCert}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, caCert: e.target.value } }
                          }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-mono text-xs" 
                        />
                      </div>

                      <div className="pt-4">
                        <button 
                          onClick={handleFetchCluster}
                          disabled={isFetching}
                          className="w-full py-4 bg-[#0D6EFD] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0B5ED7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isFetching ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Search size={20} />
                          )}
                          {isFetching ? 'Fetching...' : 'Fetch Cluster Configuration'}
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'model' && (
                    <div className="space-y-6">
                      <div className="flex gap-6 h-[700px]">
                        {/* Namespaces Sidebar */}
                        <div className="w-64 flex flex-col bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden">
                          <div className="p-4 border-b border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA]">
                            <h4 className="text-xs font-bold text-[#6C757D] uppercase tracking-wider">Namespaces</h4>
                            <button 
                              onClick={() => {
                                const name = prompt('Namespace Name:');
                                if (name) {
                                  const newNS: Component = {
                                    id: name,
                                    kind: 'infra',
                                    namespace: 'cluster',
                                    category: 'namespace',
                                    mandatory: true,
                                    runtimeClass: 'infra',
                                    resources: { original: { cpu: '0', memory: '0', replicas: 1 } }
                                  };
                                  setConfig(prev => ({ ...prev, components: [...prev.components, newNS] }));
                                  setSelectedNamespace(name);
                                }
                              }}
                              className="p-1 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {Array.from(new Set(['default', ...config.components.filter(c => c.category === 'namespace').map(c => c.id)])).map(ns => (
                              <button
                                key={ns}
                                onClick={() => setSelectedNamespace(ns)}
                                className={cn(
                                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3",
                                  selectedNamespace === ns ? "bg-[#0D6EFD] text-white shadow-lg shadow-[#0D6EFD]/20" : "text-[#495057] hover:bg-[#F8F9FA]"
                                )}
                              >
                                <Layers size={16} className={selectedNamespace === ns ? "text-white/80" : "text-[#ADB5BD]"} />
                                {ns}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cluster Model Layers */}
                        <div className="flex-1 flex flex-col gap-6">
                          <div className="flex-1 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] p-6 overflow-y-auto space-y-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-[#212529]">Namespace: {selectedNamespace}</h3>
                                <p className="text-sm text-[#6C757D]">Manage resources within this namespace layer by layer.</p>
                              </div>
                            </div>

                            {[
                              { id: 'ingress', name: 'Ingress / Endpoints', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Network, kind: 'infra', category: 'ingress' },
                              { id: 'services', name: 'Services', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Box, kind: 'workload', category: 'service' },
                              { id: 'workloads', name: 'Workloads', color: 'bg-green-50 border-green-200 text-green-700', icon: Server, kind: 'workload', category: 'application' },
                              { id: 'config', name: 'Config / Secrets', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: ShieldCheck, kind: 'infra', category: 'config' },
                            ].map((layer) => (
                              <div key={layer.id} className="bg-white rounded-xl border border-[#DEE2E6] overflow-hidden shadow-sm">
                                <div className={cn("px-4 py-3 border-b flex items-center justify-between", layer.color)}>
                                  <div className="flex items-center gap-3">
                                    <layer.icon size={18} />
                                    <span className="font-bold text-sm">{layer.name}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newComp: Component = {
                                        id: `${layer.id}-${Date.now().toString().slice(-4)}`,
                                        kind: layer.kind as 'workload' | 'infra' | 'capability',
                                        namespace: selectedNamespace,
                                        category: layer.category,
                                        mandatory: true,
                                        runtimeClass: 'application',
                                        resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 } }
                                      };
                                      setConfig(prev => ({ ...prev, components: [...prev.components, newComp] }));
                                      setSelectedComponentIndex(config.components.length);
                                    }}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                                <div className="p-2 space-y-1">
                                  {config.components
                                    .map((c, i) => ({ ...c, originalIndex: i }))
                                    .filter(c => c.namespace === selectedNamespace && c.category === layer.category)
                                    .map((comp) => (
                                      <div 
                                        key={comp.id} 
                                        onClick={() => setSelectedComponentIndex(comp.originalIndex)}
                                        className={cn(
                                          "group flex items-center justify-between px-4 py-2 rounded-lg text-sm cursor-pointer transition-all",
                                          selectedComponentIndex === comp.originalIndex ? "bg-[#E7F1FF] text-[#0D6EFD] font-bold" : "hover:bg-[#F8F9FA] text-[#495057]"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={cn("w-2 h-2 rounded-full", selectedComponentIndex === comp.originalIndex ? "bg-[#0D6EFD]" : "bg-[#DEE2E6]")} />
                                          {comp.id}
                                        </div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfig(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== comp.originalIndex) }));
                                            setSelectedComponentIndex(0);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  {config.components.filter(c => c.namespace === selectedNamespace && c.category === layer.category).length === 0 && (
                                    <p className="text-xs text-[#ADB5BD] italic p-2">No {layer.name.toLowerCase()} defined.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Editor Side Panel */}
                        <div className="w-96 bg-white rounded-2xl border border-[#E9ECEF] shadow-xl flex flex-col overflow-hidden">
                          <div className="p-4 border-b border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between">
                            <h4 className="text-sm font-bold text-[#212529]">Component Editor</h4>
                            {selectedComponentIndex < config.components.length && (
                              <span className="text-[10px] font-mono bg-[#E9ECEF] px-2 py-0.5 rounded text-[#6C757D]">
                                {config.components[selectedComponentIndex].kind}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 overflow-y-auto p-6">
                            {selectedComponentIndex < config.components.length ? (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Component ID</label>
                                    <input 
                                      type="text" 
                                      value={config.components[selectedComponentIndex].id} 
                                      onChange={(e) => {
                                        const newComponents = [...config.components];
                                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], id: e.target.value };
                                        setConfig(prev => ({ ...prev, components: newComponents }));
                                      }}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Namespace</label>
                                    <input 
                                      type="text" 
                                      value={config.components[selectedComponentIndex].namespace} 
                                      onChange={(e) => {
                                        const newComponents = [...config.components];
                                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], namespace: e.target.value };
                                        setConfig(prev => ({ ...prev, components: newComponents }));
                                      }}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Kind</label>
                                      <select 
                                        value={config.components[selectedComponentIndex].kind}
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], kind: e.target.value as 'workload' | 'infra' | 'capability' };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white"
                                      >
                                        <option value="workload">workload</option>
                                        <option value="infra">infra</option>
                                        <option value="capability">capability</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Category</label>
                                      <input 
                                        type="text" 
                                        value={config.components[selectedComponentIndex].category} 
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], category: e.target.value };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-6 border-t border-[#E9ECEF] space-y-4">
                                  <h5 className="text-xs font-bold text-[#212529] flex items-center gap-2">
                                    <Cpu size={14} />
                                    Resource Allocation
                                  </h5>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">CPU Request</label>
                                      <input 
                                        type="text" 
                                        value={config.components[selectedComponentIndex].resources.original.cpu} 
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { 
                                            ...newComponents[selectedComponentIndex], 
                                            resources: { 
                                              ...newComponents[selectedComponentIndex].resources, 
                                              original: { ...newComponents[selectedComponentIndex].resources.original, cpu: e.target.value } 
                                            } 
                                          };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Memory Request</label>
                                      <input 
                                        type="text" 
                                        value={config.components[selectedComponentIndex].resources.original.memory} 
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { 
                                            ...newComponents[selectedComponentIndex], 
                                            resources: { 
                                              ...newComponents[selectedComponentIndex].resources, 
                                              original: { ...newComponents[selectedComponentIndex].resources.original, memory: e.target.value } 
                                            } 
                                          };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Replicas</label>
                                    <input 
                                      type="number" 
                                      value={config.components[selectedComponentIndex].resources.original.replicas} 
                                      onChange={(e) => {
                                        const newComponents = [...config.components];
                                        newComponents[selectedComponentIndex] = { 
                                          ...newComponents[selectedComponentIndex], 
                                          resources: { 
                                            ...newComponents[selectedComponentIndex].resources, 
                                            original: { ...newComponents[selectedComponentIndex].resources.original, replicas: parseInt(e.target.value) || 0 } 
                                          } 
                                        };
                                        setConfig(prev => ({ ...prev, components: newComponents }));
                                      }}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center border border-[#E9ECEF]">
                                  <Box size={32} className="text-[#DEE2E6]" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#495057]">No Component Selected</p>
                                  <p className="text-xs text-[#ADB5BD]">Select a component from the layers to edit its properties.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'mapping' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-[#495057]">Define runtime dependency DAG.</p>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg text-xs font-bold hover:bg-white transition-all">
                            Auto-Layout
                          </button>
                        </div>
                      </div>
                      
                      <div className="h-[300px] border-2 border-dashed border-[#DEE2E6] rounded-2xl flex items-center justify-center bg-[#F8F9FA]">
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 bg-white rounded-full border border-[#DEE2E6] flex items-center justify-center mx-auto text-[#6C757D]">
                            <Layers size={24} />
                          </div>
                          <p className="text-sm text-[#6C757D]">Visual dependency mapper would render here.<br/>Draw arrows between components to define boot order.</p>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                        <AlertCircle size={18} className="text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          <strong>Rules enforced:</strong> No circular dependencies. Infra components must start before app workloads.
                        </p>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'laptop' && (
                    <div className="space-y-8">
                      <p className="text-[#495057]">Know what we can fit on your machine.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <Monitor size={20} className="text-[#0D6EFD]" />
                            <h4 className="font-bold">Auto-Detected Profile</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">CPU Cores</span>
                              <span className="font-bold">{config.laptopProfile.detected.cpuCores}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">Memory</span>
                              <span className="font-bold">{config.laptopProfile.detected.memoryGi}Gi</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">Disk Space</span>
                              <span className="font-bold">{config.laptopProfile.detected.diskGi}Gi</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-[#6C757D]">Operating System</span>
                              <span className="font-bold">{config.laptopProfile.detected.os}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <Settings size={20} className="text-[#0D6EFD]" />
                            <h4 className="font-bold">Runtime Limits</h4>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max CPU for Runtime</label>
                              <input 
                                type="number" 
                                value={config.laptopProfile.limits.cpu} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, cpu: parseInt(e.target.value) } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max Memory</label>
                              <input 
                                type="text" 
                                value={config.laptopProfile.limits.memory} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, memory: e.target.value } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max Disk</label>
                              <input 
                                type="text" 
                                value={config.laptopProfile.limits.disk} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, disk: e.target.value } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'feasibility' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <p className="text-[#495057]">Resource demand vs. laptop capacity.</p>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          config.validation?.status === 'pass' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {config.validation?.status === 'pass' ? 'All Checks Passed' : 'Issues Detected'}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {isValidating ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <>
                            {config.validation?.issues.map((issue, idx) => (
                              <div key={idx} className={cn(
                                "p-6 rounded-xl border space-y-4",
                                issue.severity === 'error' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                              )}>
                                <div className="flex items-center gap-3">
                                  <AlertCircle size={20} className={issue.severity === 'error' ? "text-red-600" : "text-yellow-600"} />
                                  <h4 className={cn("font-bold", issue.severity === 'error' ? "text-red-800" : "text-yellow-800")}>
                                    {issue.severity === 'error' ? 'Critical Error' : 'Resource Warning'}
                                  </h4>
                                </div>
                                <div className="pl-8 space-y-2">
                                  <p className={cn("text-sm", issue.severity === 'error' ? "text-red-700" : "text-yellow-700")}>{issue.message}</p>
                                  {issue.suggestion && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      <button className="px-3 py-1.5 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-yellow-800 hover:bg-yellow-100">
                                        ✔ Apply Suggestion: {String(issue.suggestion.proposedChange.value)}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {config.validation?.issues.length === 0 && (
                              <div className="p-6 rounded-xl border border-green-200 bg-green-50">
                                <div className="flex items-center gap-3">
                                  <CheckCircle2 size={20} className="text-green-600" />
                                  <h4 className="font-bold text-green-800">No Issues Detected</h4>
                                </div>
                                <p className="pl-8 text-sm text-green-700 mt-1">Your configuration fits perfectly within the laptop constraints.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'validation' && (
                    <div className="space-y-8">
                      <p className="text-[#495057]">Final checks before local deployment.</p>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'All dependencies resolved', status: 'pass' },
                          { label: 'All secrets exist (masked)', status: 'pass' },
                          { label: 'Images accessible locally', status: 'pass' },
                          { label: 'Disk space sufficient', status: 'pass' },
                          { label: 'No policy violations', status: 'pass' },
                        ].map((check, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                            <span className="text-sm font-medium">{check.label}</span>
                            <div className="flex items-center gap-2 text-[#198754]">
                              <span className="text-xs font-bold uppercase">Passed</span>
                              <CheckCircle2 size={16} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-6 bg-[#0D6EFD]/5 border border-[#0D6EFD]/20 rounded-xl">
                        <h4 className="font-bold text-[#0D6EFD] mb-2">Ready for Simulation</h4>
                        <p className="text-sm text-[#0D6EFD]/80">Your local runtime configuration is 100% valid. Proceed to deploy the simulated cluster.</p>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'deployment' && (
                    <div className="space-y-8">
                      {!isReady ? (
                        <div className="text-center py-12 space-y-6">
                          <div className="w-20 h-20 bg-[#0D6EFD]/10 rounded-full flex items-center justify-center mx-auto text-[#0D6EFD]">
                            <Zap size={40} className={cn(isDeploying && "animate-pulse")} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold">Deploy Simulated Cluster</h3>
                            <p className="text-[#6C757D]">This will create a k3d cluster and deploy all defined components.</p>
                          </div>
                          
                          {isDeploying ? (
                            <div className="max-w-md mx-auto space-y-4">
                              <div className="h-2 bg-[#DEE2E6] rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-[#0D6EFD]"
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 10 }}
                                />
                              </div>
                              <div className="text-left space-y-2">
                                {deploymentStatus.map((status, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-xs text-[#6C757D]"
                                  >
                                    <CheckCircle2 size={12} className="text-[#198754]" />
                                    {status}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={handleDeploy}
                              className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20"
                            >
                              Start Deployment
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <div className="p-8 bg-green-50 border border-green-200 rounded-2xl text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                              <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-2xl font-bold text-green-800">Cluster Ready!</h3>
                              <p className="text-green-700">Your local KubeSDK simulation is now running.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                              <h4 className="font-bold text-sm mb-4">Endpoints</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg">
                                  <span className="text-xs font-mono">api-server</span>
                                  <span className="text-xs text-[#0D6EFD] font-bold">localhost:8080</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg">
                                  <span className="text-xs font-mono">dashboard</span>
                                  <span className="text-xs text-[#0D6EFD] font-bold">localhost:3000</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                              <h4 className="font-bold text-sm mb-4">Actions</h4>
                              <div className="space-y-2">
                                <button className="w-full py-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg text-xs font-bold hover:bg-white transition-all flex items-center justify-center gap-2">
                                  <Terminal size={14} /> Open Logs
                                </button>
                                <button 
                                  onClick={async () => {
                                    const res = await fetch('/api/generate', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(config)
                                    });
                                    const data = await res.json();
                                    console.log('Generated files:', data.files);
                                    alert('Configuration exported to console (simulated)');
                                  }}
                                  className="w-full py-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg text-xs font-bold hover:bg-white transition-all flex items-center justify-center gap-2"
                                >
                                  <Download size={14} /> Export Snapshot
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wizard Footer */}
                <div className="flex items-center justify-between pt-8">
                  <button 
                    onClick={prevStep}
                    disabled={currentStep === 0 || isDeploying}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                      currentStep === 0 || isDeploying ? "text-[#ADB5BD] cursor-not-allowed" : "text-[#495057] hover:bg-[#E9ECEF]"
                    )}
                  >
                    <ChevronLeft size={20} /> Back
                  </button>
                  
                  {currentStep < visibleSteps.length - 1 && (
                    <button 
                      onClick={nextStep}
                      disabled={isFetching || isValidating || isFitting}
                      className="flex items-center gap-2 px-8 py-3 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 disabled:opacity-50"
                    >
                      {isFetching || isValidating || isFitting ? 'Processing...' : 'Next Step'} <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            ) : activeMenu === 'home' ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold">Welcome to KubeSDK Simulator</h2>
                  <p className="text-xl text-[#6C757D]">The internal developer platform runtime compiler.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#0D6EFD]/10 rounded-xl flex items-center justify-center text-[#0D6EFD]">
                      <Zap size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Fast Simulation</h3>
                    <p className="text-sm text-[#6C757D]">Spin up complex cluster models in seconds using k3d on your local machine.</p>
                  </div>
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#198754]/10 rounded-xl flex items-center justify-center text-[#198754]">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Safe Import</h3>
                    <p className="text-sm text-[#6C757D]">Import from live clusters with automatic secret masking and manifest stripping.</p>
                  </div>
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#6F42C1]/10 rounded-xl flex items-center justify-center text-[#6F42C1]">
                      <Monitor size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Resource Aware</h3>
                    <p className="text-sm text-[#6C757D]">Intelligent feasibility checks ensure your simulation fits your laptop's resources.</p>
                  </div>
                </div>

                <div className="pt-12">
                  <button 
                    onClick={() => setActiveMenu('define')}
                    className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 flex items-center gap-3"
                  >
                    Get Started <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Run History</h2>
                  <p className="text-[#6C757D]">Previous local runtime simulations.</p>
                </div>

                <div className="bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Simulation Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Runtime</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9ECEF]">
                      {[
                        { name: 'Order-Service-Dev', runtime: 'k3d', status: 'Stopped', date: '2026-04-01' },
                        { name: 'Payment-Gateway-Test', runtime: 'k3d', status: 'Running', date: '2026-03-28' },
                        { name: 'Auth-Module-Sim', runtime: 'k3d', status: 'Stopped', date: '2026-03-25' },
                      ].map((run, idx) => (
                        <tr key={idx} className="hover:bg-[#F8F9FA] transition-all">
                          <td className="px-6 py-4 font-bold text-sm">{run.name}</td>
                          <td className="px-6 py-4 text-sm text-[#6C757D]">{run.runtime}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              run.status === 'Running' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            )}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#6C757D]">{run.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="p-2 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded-lg transition-all">
                                <Edit2 size={16} />
                              </button>
                              <button className="p-2 text-[#DC3545] hover:bg-[#F8D7DA] rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
