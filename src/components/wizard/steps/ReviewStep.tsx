import React from 'react';
import { 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  FileCode, 
  Cpu, 
  Database, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Zap,
  ChevronRight,
  Globe,
  Lock,
  Trash2
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun } from '../../../types';

interface ReviewStepProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  connectionStatus: 'idle' | 'testing' | 'success' | 'failed';
  modelYamlContent: string;
  clusterCapacity: { cpu: number, memory: number } | null;
  error: string | null;
  clearError: () => void;
}

export const ReviewStep = ({ config, setConfig, onTestConnection, isTesting, connectionStatus, modelYamlContent, clusterCapacity, error, clearError }: ReviewStepProps) => {
  const [isHelpExpanded, setIsHelpExpanded] = React.useState(false);

  // --- Helper: Resource Parsing ---
  const parseCpu = (cpu: string = '0.1'): number => {
    if (!cpu) return 0;
    const val = parseFloat(cpu);
    if (cpu.toLowerCase().endsWith('m')) return val / 1000;
    return val;
  };

  const parseMemory = (mem: string = '128Mi'): number => {
    if (!mem) return 0;
    const val = parseFloat(mem);
    if (mem.toLowerCase().endsWith('gi')) return val * 1024;
    return val; // Assume Mi if no unit
  };

  // --- Derived: Totals calculation ---
  const totals = React.useMemo(() => {
    const apps = config.components.filter(c => c.category === 'application');
    return apps.reduce((acc, comp) => {
      const replicas = comp.resources?.sdk?.replicas || 1;
      const cpu = parseCpu(comp.resources?.sdk?.cpu) * replicas;
      const mem = parseMemory(comp.resources?.sdk?.memory) * replicas;
      return { cpu: acc.cpu + cpu, mem: acc.mem + mem };
    }, { cpu: 0, mem: 0 });
  }, [config.components]);

  const updateResource = (id: string, field: 'cpu' | 'memory' | 'replicas', value: any) => {
    const newComponents = config.components.map(comp => {
      if (comp.id === id) {
        return {
          ...comp,
          resources: {
            ...comp.resources,
            sdk: {
              ...(comp.resources?.sdk || { cpu: '0.1', memory: '128Mi', replicas: 1 }),
              [field]: field === 'replicas' ? parseInt(value) || 0 : value
            }
          }
        };
      }
      return comp;
    });
    setConfig({ ...config, components: newComponents });
  };

  const deleteComponent = (id: string) => {
    if (confirm(`Remove service ${id} from deployment?`)) {
      const newComponents = config.components.filter(c => c.id !== id);
      const newEdges = config.dependencyGraph.edges.filter(e => e.from !== id && e.to !== id);
      setConfig({ 
        ...config, 
        components: newComponents,
        dependencyGraph: { edges: newEdges }
      });
    }
  };

  const downloadYaml = () => {
    const blob = new Blob([modelYamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kubesdk-local-run.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };
// ... guidelines and other logic remains same ...
  const runtimeGuidelines: Record<string, { title: string, steps: string[] }> = {
    'rancher-desktop': {
      title: 'Rancher Desktop Setup',
      steps: [
        '🔐 **Dedicated API User:** `kubectl create serviceaccount api-user -n default`',
        '🔑 **Bind Cluster Role:** `kubectl create clusterrolebinding api-user-binding --clusterrole=cluster-admin --serviceaccount=default:api-user`',
        '🎫 **Generate Auth Token:** `kubectl create token api-user -n default`',
        '⏳ **Long-Lived Token:** `kubectl create token api-user -n default --duration=24h`',
        '🌐 **Test Connection:** `curl -k https://127.0.0.1:6443/api -H "Authorization: Bearer <TOKEN>"`'
      ]
    },
    'k3d': {
      title: 'K3d Cluster Setup',
      steps: [
        'Create a cluster: `k3d cluster create my-cluster -p "8080:80@loadbalancer"`',
        'Extract kubeconfig: `k3d kubeconfig get my-cluster`.',
        'API URL is typically `https://0.0.0.0:<port>`.'
      ]
    },
    'kind': {
      title: 'KinD (Kubernetes in Docker) Setup',
      steps: [
        'Install KinD via `brew install kind`.',
        'Create cluster: `kind create cluster --name kubesdk`.',
        'Get API Server: `kubectl cluster-info`.'
      ]
    }
  };

  const selectedRuntime = config.wizard.runtime.type || 'rancher-desktop';
  const guidelines = runtimeGuidelines[selectedRuntime];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Resource Review */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F3F5] bg-[#F8F9FA] flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2">
                <Database size={18} className="text-[#0D6EFD]" /> Interactive Resource Review
              </h4>
              <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Modify as needed</span>
            </div>
            <div className="p-0 overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F8F9FA] text-[#6C757D] text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Component</th>
                    <th className="px-6 py-3">CPU (vCPU)</th>
                    <th className="px-6 py-3">RAM (Mi/Gi)</th>
                    <th className="px-6 py-3">Repls</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {config.components.filter(c => c.category === 'application').map((comp) => (
                    <tr key={comp.id} className="hover:bg-[#F8F9FA]/50 transition-all group">
                      <td className="px-6 py-3 font-medium text-[#212529] max-w-[150px] truncate">{comp.id}</td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={comp.resources?.sdk?.cpu || '0.1'} 
                          onChange={(e) => updateResource(comp.id, 'cpu', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-[#DEE2E6] focus:border-[#0D6EFD] focus:bg-white bg-transparent font-mono text-xs outline-none transition-all"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={comp.resources?.sdk?.memory || '128Mi'} 
                          onChange={(e) => updateResource(comp.id, 'memory', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-[#DEE2E6] focus:border-[#0D6EFD] focus:bg-white bg-transparent font-mono text-xs outline-none transition-all"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={comp.resources?.sdk?.replicas || 1} 
                          onChange={(e) => updateResource(comp.id, 'replicas', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-[#DEE2E6] focus:border-[#0D6EFD] focus:bg-white bg-transparent font-mono text-xs outline-none transition-all"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <button 
                          onClick={() => deleteComponent(comp.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {config.components.filter(c => c.category === 'application').length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#ADB5BD] italic">No services listed. Add components in step 5.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#0D6EFD]/5 border-t-2 border-[#0D6EFD]/20">
                    <tr className="font-bold">
                      <td className="px-6 py-4 text-[#0D6EFD] uppercase text-[10px]">Total Demand by SDK</td>
                      <td className="px-4 py-4 text-[#0D6EFD] font-mono text-xs">
                        {totals.cpu.toFixed(2)} vCPU
                      </td>
                      <td className="px-4 py-4 text-[#0D6EFD] font-mono text-xs">
                        {totals.mem >= 1024 ? `${(totals.mem / 1024).toFixed(1)} GiB` : `${Math.round(totals.mem)} MiB`}
                      </td>
                      <td className="px-4 py-4 text-[#0D6EFD] font-mono text-xs">
                        {config.components.filter(c => c.category === 'application').reduce((acc, c) => acc + (c.resources?.sdk?.replicas || 1), 0)}
                      </td>
                      <td></td>
                    </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F3F5] bg-[#F8F9FA] flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2">
                <FileCode size={18} className="text-[#6F42C1]" /> YAML Review
              </h4>
              <button 
                onClick={downloadYaml}
                className="text-[10px] font-bold text-[#0D6EFD] flex items-center gap-1 hover:underline"
              >
                <Download size={14} /> Download YAML
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-[#1A1A1A] text-[#D1D1D1] p-4 rounded-xl font-mono text-xs leading-relaxed max-h-[250px] overflow-y-auto">
                {modelYamlContent}
              </pre>
            </div>
          </section>
        </div>

        {/* Right Column: Runtime & Connection */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={20} />
                  <h5 className="font-bold">Connection Diagnostics</h5>
                </div>
                <button onClick={clearError} className="text-red-400 hover:text-red-700 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="bg-white/50 rounded-xl p-4 border border-red-100 text-xs font-mono text-red-800 break-words leading-relaxed">
                {error}
              </div>
              <p className="text-[10px] text-red-600 font-medium">
                💡 Check your Cluster API URL and ensure the Authentication Token has not expired.
              </p>
            </div>
          )}

          <section className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm p-6 space-y-6">
            <h4 className="font-bold flex items-center gap-2 text-[#212529]">
              <Zap size={18} className="text-amber-500" /> SDK Runtime Connection
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-2">Target Local Runtime</label>
                <select 
                  value={selectedRuntime}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    wizard: { ...prev.wizard, runtime: { ...prev.wizard.runtime, type: e.target.value as any } }
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-medium text-sm"
                >
                  <option value="rancher-desktop">Rancher Desktop (Default)</option>
                  <option value="k3d">K3d Cluster</option>
                  <option value="kind">KinD (Kubernetes in Docker)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Globe size={12} /> Cluster API URL
                  </label>
                  <input 
                    type="text" 
                    placeholder="https://127.0.0.1:6443"
                    value={config.wizard.connectivity?.apiServerUrl || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      wizard: { 
                        ...prev.wizard, 
                        connectivity: { ...(prev.wizard.connectivity || { apiServerUrl: '', token: '' }), apiServerUrl: e.target.value } 
                      }
                    }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Lock size={12} /> Authentication Token
                  </label>
                  <input 
                    type="password" 
                    placeholder="kubeconfig-token-..."
                    value={config.wizard.connectivity?.token || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      wizard: { 
                        ...prev.wizard, 
                        connectivity: { ...(prev.wizard.connectivity || { apiServerUrl: '', token: '' }), token: e.target.value } 
                      }
                    }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-xs"
                  />
                </div>
              </div>

              <button 
                onClick={onTestConnection}
                disabled={isTesting}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border",
                  connectionStatus === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  connectionStatus === 'failed' ? "bg-red-50 border-red-200 text-red-700" :
                  "bg-white border-[#DEE2E6] text-[#212529] hover:bg-[#F8F9FA]"
                )}
              >
                {isTesting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : connectionStatus === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : connectionStatus === 'failed' ? (
                  <AlertCircle size={16} />
                ) : (
                  <Activity size={16} />
                )}
                {isTesting ? 'Testing Link...' : connectionStatus === 'success' ? 'Link Established' : connectionStatus === 'failed' ? 'Link Failed' : 'Test SDK Connection'}
              </button>

              {/* Cluster Feasibility Card */}
              {clusterCapacity && (
                <div className="pt-4 border-t border-[#F1F3F5] animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className={cn(
                    "p-4 rounded-xl border space-y-3",
                    (totals.cpu > clusterCapacity.cpu || totals.mem > clusterCapacity.memory) 
                      ? "bg-red-50 border-red-100" 
                      : (totals.cpu > clusterCapacity.cpu * 0.8 || totals.mem > clusterCapacity.memory * 0.8)
                        ? "bg-amber-50 border-amber-100"
                        : "bg-emerald-50 border-emerald-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={cn(
                          (totals.cpu > clusterCapacity.cpu || totals.mem > clusterCapacity.memory) ? "text-red-500" : "text-emerald-500"
                        )} />
                        <span className="text-xs font-bold uppercase tracking-wider">Cluster Feasibility</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        (totals.cpu > clusterCapacity.cpu || totals.mem > clusterCapacity.memory) 
                          ? "bg-red-100 text-red-700" 
                          : "bg-emerald-100 text-emerald-700"
                      )}>
                        {(totals.cpu > clusterCapacity.cpu || totals.mem > clusterCapacity.memory) ? 'Insufficient' : 'Success'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[#6C757D]">CPU Utilization</span>
                          <span className="font-mono">{Math.round((totals.cpu / clusterCapacity.cpu) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", (totals.cpu / clusterCapacity.cpu) > 0.8 ? "bg-red-500" : "bg-emerald-500")}
                            style={{ width: `${Math.min(100, (totals.cpu / clusterCapacity.cpu) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[#6C757D]">Memory Utilization</span>
                          <span className="font-mono">{Math.round((totals.mem / clusterCapacity.memory) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", (totals.mem / clusterCapacity.memory) > 0.8 ? "bg-red-500" : "bg-emerald-500")}
                            style={{ width: `${Math.min(100, (totals.mem / clusterCapacity.memory) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] font-medium leading-relaxed opacity-80">
                      Found 1 Node with <span className="font-bold">{clusterCapacity.cpu} vCPU</span> and <span className="font-bold">{Math.round(clusterCapacity.memory / 1024)} GiB</span> RAM available.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#DEE2E6] rounded-2xl overflow-hidden transition-all shadow-sm">
            <button 
              onClick={() => setIsHelpExpanded(!isHelpExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#0D6EFD]" />
                <h5 className="text-sm font-bold text-[#212529]">
                  {guidelines.title} Guidelines
                </h5>
              </div>
              <div className={cn("transition-transform duration-200", isHelpExpanded ? "rotate-180" : "")}>
                <ChevronRight size={18} className="text-[#6C757D]" />
              </div>
            </button>
            
            {isHelpExpanded && (
              <div className="px-6 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <ul className="space-y-3">
                  {guidelines.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-xs text-[#495057] leading-relaxed">
                      <div className="w-5 h-5 rounded-full bg-[#0D6EFD]/10 flex items-center justify-center shrink-0 font-bold text-[#0D6EFD] text-[10px]">
                        {idx + 1}
                      </div>
                      <span className="break-all" dangerouslySetInnerHTML={{ __html: step.replace(/`([^`]+)`/g, '<code class="bg-[#F8F9FA] px-1 rounded border border-[#DEE2E6] font-mono">$1</code>') }} />
                    </li>
                  ))}
                </ul>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                    ⚠️ Ensure your kubeconfig is pointing to the correct context before running these commands.
                  </p>
                </div>
                <div className="p-3 bg-[#0D6EFD]/5 border border-[#0D6EFD]/10 rounded-lg flex items-start gap-2">
                  <Globe size={14} className="text-[#0D6EFD] mt-0.5" />
                  <p className="text-[10px] text-[#495057] leading-relaxed">
                    <strong>Docker Network Tip:</strong> If the SDK is in a container, use <strong>https://host.docker.internal:6443</strong> to reach your host's API.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
