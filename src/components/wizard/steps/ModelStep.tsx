import React from 'react';
import { 
  Plus, 
  Trash2, 
  Layers, 
  AlertTriangle, 
  Network, 
  Box, 
  Server, 
  ShieldCheck, 
  Cpu,
  XCircle,
  FileCode
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun, Component } from '../../../types';

interface ModelStepProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  selectedNamespace: string;
  setSelectedNamespace: (ns: string) => void;
  isModelYamlMode: boolean;
  setIsModelYamlMode: (mode: boolean) => void;
  modelYamlContent: string;
  setModelYamlContent: (content: string) => void;
  selectedComponentIndex: number;
  setSelectedComponentIndex: (index: number) => void;
  namespaces: string[];
  validationStatus: Record<string, { status: 'checking' | 'valid' | 'invalid', message?: string }>;
}

export const ModelStep = ({
  config,
  setConfig,
  selectedNamespace,
  setSelectedNamespace,
  isModelYamlMode,
  setIsModelYamlMode,
  modelYamlContent,
  setModelYamlContent,
  selectedComponentIndex,
  setSelectedComponentIndex,
  namespaces,
  validationStatus
}: ModelStepProps) => {

  const selectedComponent = config.components[selectedComponentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[#495057]">Manage namespaces and resources natively or directly edit the consolidated configuration.</p>
        </div>
        <div className="bg-[#E9ECEF] p-1 rounded-lg flex items-center gap-1">
          <button 
            onClick={() => setIsModelYamlMode(false)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", !isModelYamlMode ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]")}
          >
            Components UI
          </button>
          <button 
            onClick={() => setIsModelYamlMode(true)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", isModelYamlMode ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]")}
          >
            YAML Editor
          </button>
        </div>
      </div>

      {isModelYamlMode ? (
        <div className="h-[calc(100vh-320px)] min-h-[600px] bg-[#1E1E1E] rounded-2xl border border-[#DEE2E6] shadow-inner font-mono text-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#2D2D2D] border-b border-[#3D3D3D]">
            <span className="text-[#D4D4D4] font-bold text-xs uppercase tracking-wider">Consolidated SDK Runtime Config</span>
            <button className="text-xs text-white font-bold hover:bg-[#0B5ED7] transition-colors bg-[#0D6EFD] px-3 py-1 rounded shadow">Save & Validate YAML</button>
          </div>
          <textarea 
            value={modelYamlContent}
            onChange={(e) => setModelYamlContent(e.target.value)}
            className="w-full flex-1 p-6 bg-transparent text-[#D4D4D4] outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[600px]">
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
                    resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } }
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
            {namespaces.map(ns => {
              const hasError = config.components.some(c => c.namespace === ns && c.category === 'application' && !c.properties?.image);
              return (
              <div
                key={ns}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all gap-2",
                  selectedNamespace === ns 
                    ? hasError ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#0D6EFD] text-white shadow-lg shadow-[#0D6EFD]/20" 
                    : hasError ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-[#495057] hover:bg-[#F8F9FA]"
                )}
              >
                <button
                  onClick={() => setSelectedNamespace(ns)}
                  className="flex-1 flex items-center gap-3 text-left py-1 outline-none"
                >
                  <Layers size={16} className={selectedNamespace === ns ? "text-white/80" : hasError ? "text-red-400" : "text-[#ADB5BD]"} />
                  <span className="truncate">{ns}</span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasError && <span title="Namespace has invalid components"><AlertTriangle size={14} className={selectedNamespace === ns ? "text-white" : "text-red-500"} /></span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete namespace '${ns}' and ALL its components?`)) {
                        const newComps = config.components.filter(c => !((c.id === ns && (c.category === 'namespace' || c.kind === 'infra')) || c.namespace === ns));
                        setConfig(prev => ({ ...prev, components: newComps }));
                        if (selectedNamespace === ns) {
                          const remaining = Array.from(new Set(newComps.filter(c => c.category === 'namespace' || c.kind === 'infra').map(c => c.id || c.namespace)));
                          setSelectedNamespace(remaining[0] || '');
                        }
                      }
                    }}
                    title="Delete Namespace"
                    className={cn("p-1.5 rounded transition-colors", selectedNamespace === ns ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-red-100 text-red-400 hover:text-red-600")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )})}
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
              { id: 'workloads', name: 'Pods', color: 'bg-green-50 border-green-200 text-green-700', icon: Server, kind: 'workload', category: 'application' },
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
                        resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '128Mi', replicas: 1 } }
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
                      .map((comp) => {
                        const isMissingRequired = comp.category === 'application' && !comp.properties?.image;
                        return (
                      <div 
                        key={comp.id} 
                        onClick={() => setSelectedComponentIndex(comp.originalIndex)}
                        className={cn(
                          "group flex items-center justify-between px-4 py-2 rounded-lg text-sm cursor-pointer transition-all border",
                          selectedComponentIndex === comp.originalIndex 
                            ? isMissingRequired ? "bg-red-50 text-red-700 border-red-200 font-bold" : "bg-[#E7F1FF] text-[#0D6EFD] border-transparent font-bold" 
                            : isMissingRequired ? "bg-white text-red-600 border-red-100 hover:bg-red-50" : "bg-white border-transparent hover:bg-[#F8F9FA] text-[#495057]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", selectedComponentIndex === comp.originalIndex ? "bg-[#0D6EFD]" : isMissingRequired ? "bg-red-400" : "bg-[#DEE2E6]")} />
                          {comp.id}
                          {isMissingRequired && <span title="Missing required fields"><AlertTriangle size={12} className="text-red-500 ml-1" /></span>}
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
                    )})}
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
            {selectedComponent && selectedComponentIndex < config.components.length ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Component ID</label>
                    <input 
                      type="text" 
                      value={selectedComponent.id} 
                      onChange={(e) => {
                        const newComponents = [...config.components];
                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], id: e.target.value };
                        setConfig(prev => ({ ...prev, components: newComponents }));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Namespace</label>
                    <input 
                      type="text" 
                      value={selectedComponent.namespace || ''} 
                      onChange={(e) => {
                        const newComponents = [...config.components];
                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], namespace: e.target.value };
                        setConfig(prev => ({ ...prev, components: newComponents }));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all text-sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Kind</label>
                      <select 
                        value={selectedComponent.kind}
                        onChange={(e) => {
                          const newComponents = [...config.components];
                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], kind: e.target.value as any };
                          setConfig(prev => ({ ...prev, components: newComponents }));
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm"
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
                        value={selectedComponent.category} 
                        onChange={(e) => {
                          const newComponents = [...config.components];
                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], category: e.target.value };
                          setConfig(prev => ({ ...prev, components: newComponents }));
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all text-sm" 
                      />
                    </div>
                  </div>
                </div>

                  <div className="pt-6 border-t border-[#E9ECEF] space-y-4">
                    <h5 className="text-xs font-bold text-[#212529] flex items-center gap-2 uppercase tracking-wider">
                      {selectedComponent.category} Details
                    </h5>
                    
                    {selectedComponent.category === 'ingress' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Hostname / Domain</label>
                          <input type="text" placeholder="e.g. api.example.com" value={selectedComponent.properties?.hostname || ''} onChange={(e) => {
                            const newComps = [...config.components];
                            newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), hostname: e.target.value };
                            setConfig({ ...config, components: newComps });
                          }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Path</label>
                            <input type="text" placeholder="/api" value={selectedComponent.properties?.path || ''} onChange={(e) => {
                              const newComps = [...config.components];
                              newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), path: e.target.value };
                              setConfig({ ...config, components: newComps });
                            }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Workload / App</label>
                            <select 
                              value={selectedComponent.properties?.targetApp || ''} 
                              onChange={(e) => {
                                const newComps = [...config.components];
                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetApp: e.target.value };
                                setConfig({ ...config, components: newComps });
                              }} 
                              className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm"
                            >
                              <option value="">Select an application...</option>
                              {config.components
                                .filter(c => c.category === 'application' && c.namespace === selectedComponent.namespace)
                                .map(app => (
                                  <option key={app.id} value={app.id}>{app.id}</option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedComponent.category === 'service' && (
                       <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Type</label>
                              <select value={selectedComponent.properties?.serviceType || 'ClusterIP'} onChange={(e) => {
                                const newComps = [...config.components];
                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), serviceType: e.target.value };
                                setConfig({ ...config, components: newComps });
                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm">
                                <option value="ClusterIP">ClusterIP</option>
                                <option value="NodePort">NodePort</option>
                                <option value="LoadBalancer">LoadBalancer</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Port</label>
                              <input type="number" placeholder="80" value={selectedComponent.properties?.port || ''} onChange={(e) => {
                                const newComps = [...config.components];
                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), port: e.target.value };
                                setConfig({ ...config, components: newComps });
                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Port</label>
                              <input type="number" placeholder="8080" value={selectedComponent.properties?.targetPort || ''} onChange={(e) => {
                                const newComps = [...config.components];
                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetPort: e.target.value };
                                setConfig({ ...config, components: newComps });
                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Workload / App</label>
                            <select 
                              value={selectedComponent.properties?.targetApp || ''} 
                              onChange={(e) => {
                                const newComps = [...config.components];
                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetApp: e.target.value };
                                setConfig({ ...config, components: newComps });
                              }} 
                              className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm"
                            >
                              <option value="">Select an application...</option>
                              {config.components
                                .filter(c => c.category === 'application' && c.namespace === selectedComponent.namespace)
                                .map(app => (
                                  <option key={app.id} value={app.id}>{app.id}</option>
                                ))
                              }
                            </select>
                          </div>
                       </div>
                    )}

                    {selectedComponent.category === 'application' && (
                        <div className="space-y-6">
                          {/* Container Basics */}
                          <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Image Configuration</label>
                            <div className="grid grid-cols-5 gap-2">
                              <div className="col-span-3">
                                <input type="text" placeholder="Image (e.g. nginx)" value={selectedComponent.properties?.image || ''} onChange={(e) => {
                                  const newComps = [...config.components];
                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), image: e.target.value };
                                  setConfig({ ...config, components: newComps });
                                }} className={cn("w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 transition-all font-mono text-xs", validationStatus[selectedComponent.id]?.status === 'invalid' ? "border-red-300 focus:ring-red-500/20" : "border-[#DEE2E6] focus:ring-[#0D6EFD]/20")} />
                              </div>
                              <div className="col-span-2">
                                <select value={selectedComponent.properties?.imagePullPolicy || 'Always'} onChange={(e) => {
                                  const newComps = [...config.components];
                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), imagePullPolicy: e.target.value };
                                  setConfig({ ...config, components: newComps });
                                }} className="w-full px-3 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-xs">
                                  <option value="Always">Always</option>
                                  <option value="IfNotPresent">IfNotPresent</option>
                                  <option value="Never">Never</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Helm Configuration */}
                          <div className="space-y-3 pt-4 border-t border-[#F1F3F5]">
                            <h6 className="text-[10px] font-bold text-[#495057] uppercase tracking-wider flex items-center gap-2">
                              <FileCode size={12} className="text-[#6F42C1]" /> Helm Chart Deployment
                            </h6>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">Source</label>
                                <select 
                                  value={selectedComponent.helm?.chart.source || 'helm-repo'} 
                                  onChange={(e) => {
                                    const newComps = [...config.components];
                                    newComps[selectedComponentIndex].helm = { 
                                      chart: { ...(newComps[selectedComponentIndex].helm?.chart || { repo: '', version: '', source: 'helm-repo' }), source: e.target.value as any } 
                                    };
                                    setConfig({ ...config, components: newComps });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs bg-white"
                                >
                                  <option value="helm-repo">Helm Repo</option>
                                  <option value="git">Git Repository</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">Version</label>
                                <input type="text" placeholder="1.2.3" value={selectedComponent.helm?.chart.version || ''} onChange={(e) => {
                                  const newComps = [...config.components];
                                  newComps[selectedComponentIndex].helm = { 
                                    chart: { ...(newComps[selectedComponentIndex].helm?.chart || { repo: '', version: '', source: 'helm-repo' }), version: e.target.value } 
                                  };
                                  setConfig({ ...config, components: newComps });
                                }} className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs font-mono" />
                              </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">Repository / URL</label>
                                <input type="text" placeholder="https://charts.bitnami.com/bitnami" value={selectedComponent.helm?.chart.repo || ''} onChange={(e) => {
                                  const newComps = [...config.components];
                                  newComps[selectedComponentIndex].helm = { 
                                    chart: { ...(newComps[selectedComponentIndex].helm?.chart || { repo: '', version: '', source: 'helm-repo' }), repo: e.target.value } 
                                  };
                                  setConfig({ ...config, components: newComps });
                                }} className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs font-mono" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">Values File Override (Path)</label>
                                <input type="text" placeholder="values-staging.yaml" value={selectedComponent.helm?.valuesFile || ''} onChange={(e) => {
                                  const newComps = [...config.components];
                                  newComps[selectedComponentIndex].helm = { 
                                    ...(newComps[selectedComponentIndex].helm || { chart: { repo: '', version: '', source: 'helm-repo' } }),
                                    valuesFile: e.target.value 
                                  };
                                  setConfig({ ...config, components: newComps });
                                }} className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs font-mono" />
                            </div>
                          </div>

                          {/* Config / Secret References */}
                          <div className="space-y-3 pt-4 border-t border-[#F1F3F5]">
                             <h6 className="text-[10px] font-bold text-[#495057] uppercase tracking-wider flex items-center gap-2">
                               <ShieldCheck size={12} className="text-amber-500" /> Resource References
                             </h6>
                             <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">ConfigMaps (Comma separated)</label>
                                  <input type="text" placeholder="api-config, shared-settings" value={(selectedComponent.config?.configMaps || []).join(', ')} onChange={(e) => {
                                    const newComps = [...config.components];
                                    newComps[selectedComponentIndex].config = { 
                                      ...(newComps[selectedComponentIndex].config || { configMaps: [], secrets: [] }),
                                      configMaps: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    };
                                    setConfig({ ...config, components: newComps });
                                  }} className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs font-mono" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-[#ADB5BD] uppercase mb-1">Secrets (Comma separated)</label>
                                  <input type="text" placeholder="db-creds, api-keys" value={(selectedComponent.config?.secrets || []).join(', ')} onChange={(e) => {
                                    const newComps = [...config.components];
                                    newComps[selectedComponentIndex].config = { 
                                      ...(newComps[selectedComponentIndex].config || { configMaps: [], secrets: [] }),
                                      secrets: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    };
                                    setConfig({ ...config, components: newComps });
                                  }} className="w-full px-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs font-mono" />
                                </div>
                             </div>
                          </div>

                          {/* Environment Variables */}
                          <div className="space-y-4 pt-4 border-t border-[#F1F3F5]">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Custom Variables (Key-Value)</label>
                              <button 
                                onClick={() => {
                                  const name = prompt('Variable Name:');
                                  const value = prompt('Variable Value:');
                                  if (name && value) {
                                    const newComps = [...config.components];
                                    const currentCustom = newComps[selectedComponentIndex].properties?.customEnv || {};
                                    newComps[selectedComponentIndex].properties = { 
                                      ...(newComps[selectedComponentIndex].properties || {}), 
                                      customEnv: { ...currentCustom, [name.toUpperCase()]: value } 
                                    };
                                    setConfig({ ...config, components: newComps });
                                  }
                                }}
                                className="text-[10px] font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Add Override
                              </button>
                            </div>
                            
                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries((selectedComponent.properties?.customEnv as Record<string, string>) || {}).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between bg-[#F8F9FA] px-3 py-2 rounded-lg border border-[#E9ECEF] group">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold text-[#495057] font-mono truncate">{key}</span>
                                    <span className="text-[9px] text-[#0D6EFD] truncate font-mono">{val}</span>
                                  </div>
                                  <button onClick={() => {
                                    const newComps = [...config.components];
                                    const nextCustom = { ...newComps[selectedComponentIndex].properties?.customEnv };
                                    delete nextCustom[key];
                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, customEnv: nextCustom };
                                    setConfig({ ...config, components: newComps });
                                  }} className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                              {Object.keys(selectedComponent.properties?.customEnv || {}).length === 0 && (
                                <p className="text-[9px] text-[#ADB5BD] italic text-center py-2">No custom overrides defined.</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#DEE2E6]">
                              <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Dynamic Environment List</label>
                              <button 
                                onClick={() => {
                                  const newComps = [...config.components];
                                  const env = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                  env.push({ name: 'VAR_NAME', value: 'value' });
                                  newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env };
                                  setConfig({ ...config, components: newComps });
                                }}
                                className="text-[10px] font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Add Pair
                              </button>
                            </div>
                            <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                              {(selectedComponent.properties?.env || []).map((env: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input type="text" value={env.name} onChange={(e) => {
                                    const newComps = [...config.components];
                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                    envs[idx] = { ...envs[idx], name: e.target.value };
                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                    setConfig({ ...config, components: newComps });
                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none bg-white" />
                                  <span className="text-[#ADB5BD]">=</span>
                                  <input type="text" value={env.value} onChange={(e) => {
                                    const newComps = [...config.components];
                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                    envs[idx] = { ...envs[idx], value: e.target.value };
                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                    setConfig({ ...config, components: newComps });
                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none bg-white" />
                                  <button onClick={() => {
                                    const newComps = [...config.components];
                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                    envs.splice(idx, 1);
                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                    setConfig({ ...config, components: newComps });
                                  }} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    )}

                    {selectedComponent.category === 'config' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Key-Value Data</label>
                          <textarea placeholder="key1: value1&#10;key2: value2" rows={5} value={selectedComponent.properties?.configData || ''} onChange={(e) => {
                            const newComps = [...config.components];
                            newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), configData: e.target.value };
                            setConfig({ ...config, components: newComps });
                          }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-xs" />
                        </div>
                      </div>
                    )}

                  </div>

                  {selectedComponent.category === 'application' && (
                    <div className="pt-6 border-t border-[#E9ECEF] space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-[#212529] flex items-center gap-2 uppercase tracking-wider">
                        <Cpu size={14} />
                        Resource Allocation
                      </h5>
                    </div>

                    {config.validation?.issues?.find(i => i.component === selectedComponent.id || i.id === 'total-mem-limit') && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-red-800">Policy Constraints Exceeded</p>
                          <p className="text-[11px] text-red-700">
                            {config.validation.issues.find(i => i.component === selectedComponent.id || i.id === 'total-mem-limit')?.message}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* CPU */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original CPU</label>
                          <p className="text-sm font-mono text-[#6C757D]">{selectedComponent.resources.original.cpu}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK CPU Request</label>
                          <input 
                            type="text" 
                            value={selectedComponent.resources.sdk?.cpu || '100m'} 
                            onChange={(e) => {
                              const newComponents = [...config.components];
                              newComponents[selectedComponentIndex] = { 
                                ...newComponents[selectedComponentIndex], 
                                resources: { 
                                  ...newComponents[selectedComponentIndex].resources, 
                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), cpu: e.target.value } 
                                } 
                              };
                              setConfig(prev => ({ ...prev, components: newComponents }));
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#0D6EFD]/30 outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm bg-blue-50/30" 
                          />
                        </div>
                      </div>

                      {/* Memory */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original Memory</label>
                          <p className="text-sm font-mono text-[#6C757D]">{selectedComponent.resources.original.memory}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK Memory Request</label>
                          <input 
                            type="text" 
                            value={selectedComponent.resources.sdk?.memory || '128Mi'} 
                            onChange={(e) => {
                              const newComponents = [...config.components];
                              newComponents[selectedComponentIndex] = { 
                                ...newComponents[selectedComponentIndex], 
                                resources: { 
                                  ...newComponents[selectedComponentIndex].resources, 
                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), memory: e.target.value } 
                                } 
                              };
                              setConfig(prev => ({ ...prev, components: newComponents }));
                            }}
                            className={cn("w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all font-mono text-sm", config.validation?.issues?.some(i => i.component === selectedComponent.id) ? "border-red-300 focus:ring-red-500/20 bg-red-50" : "border-[#0D6EFD]/30 focus:ring-[#0D6EFD]/20 bg-blue-50/30")} 
                          />
                        </div>
                      </div>

                      {/* Replicas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original Replicas</label>
                          <p className="text-sm font-mono text-[#6C757D]">{selectedComponent.resources.original.replicas}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK Replicas</label>
                          <input 
                            type="number" 
                            value={selectedComponent.resources.sdk?.replicas || 1} 
                            onChange={(e) => {
                              const newComponents = [...config.components];
                              newComponents[selectedComponentIndex] = { 
                                ...newComponents[selectedComponentIndex], 
                                resources: { 
                                  ...newComponents[selectedComponentIndex].resources, 
                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), replicas: parseInt(e.target.value) || 0 } 
                                } 
                              };
                              setConfig(prev => ({ ...prev, components: newComponents }));
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#0D6EFD]/30 outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm bg-blue-50/30" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
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
      )}
    </div>
  );
};
