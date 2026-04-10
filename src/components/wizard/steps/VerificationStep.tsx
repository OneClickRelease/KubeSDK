import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, CheckCircle2, ShieldCheck, Terminal, Layers, Globe, Activity, AlertCircle, 
  ExternalLink, ChevronDown, ChevronUp, FileText, X, Loader2, Download
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun } from '../../../types';
import { generateYamlFromConfig } from '../../../lib/yaml-utils';

interface VerificationStepProps {
  config: KubeSDKLocalRun;
  healthStatus: Record<string, any>;
  onRerunHealthCheck: () => void;
  onResetSession: () => void;
  error: string | null;
}

export const VerificationStep = ({
  config,
  healthStatus,
  onRerunHealthCheck,
  onResetSession,
  error
}: VerificationStepProps) => {
  const [selectedPodForLogs, setSelectedPodForLogs] = React.useState<{ ns: string; pod: string } | null>(null);
  const [logs, setLogs] = React.useState<string>('');
  const [isFetchingLogs, setIsFetchingLogs] = React.useState(false);
  const [expandedDetails, setExpandedDetails] = React.useState<Record<string, boolean>>({});
  const [showSystemResources, setShowSystemResources] = React.useState(false);

  const handleDownloadSnapshot = () => {
    const yaml = generateYamlFromConfig(config);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kubesdk-snapshot-${config.metadata.name || 'cluster'}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ignoredNS = config.wizard.ignoredNamespaces || [];
  const namespaces = Array.from(new Set(config.components.map(c => c.namespace).filter(Boolean)))
    .filter(ns => showSystemResources || !ignoredNS.includes(ns!));
    
  const workloads = config.components.filter(c => 
    c.category === 'application' && 
    (showSystemResources || !c.namespace || !ignoredNS.includes(c.namespace))
  );

  const fetchLogs = async (namespace: string, podName: string) => {
    setSelectedPodForLogs({ ns: namespace, pod: podName });
    setIsFetchingLogs(true);
    setLogs('Connecting to pod and streaming logs...');
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServerUrl: config.wizard.connectivity?.apiServerUrl,
          token: config.wizard.connectivity?.token,
          namespace,
          podName
        }),
      });
      const data = await response.text();
      setLogs(data || 'No logs available for this container (empty output).');
    } catch (e: any) {
      setLogs(`Error: Failed to retrieve logs. ${e.message}`);
    } finally {
      setIsFetchingLogs(false);
    }
  };

  const toggleDetails = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      {error ? (
        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl space-y-4 shadow-sm animate-in shake duration-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-inner">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-red-900">Deployment Critical Failure</h3>
              <p className="text-red-700 font-medium">The SDK encountered an obstacle while syncing with the cluster.</p>
            </div>
          </div>
          <div className="bg-white/50 rounded-2xl p-6 border border-red-200 font-mono text-xs text-red-800 leading-relaxed max-h-[150px] overflow-y-auto">
            <div className="font-bold mb-2 uppercase opacity-50 tracking-widest text-[10px]">Technical Trace</div>
            {error}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-red-600 font-bold px-1">
            <Zap size={14} /> Recommended Action: Verify if the target namespaces exist and if your token has 'cluster-admin' permissions.
          </div>
        </div>
      ) : (
        <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-emerald-900">SDK Runtime establishes Live!</h3>
            <p className="text-emerald-700 font-medium">Sanity checks passed. Your cluster is healthy and operational.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E9ECEF] shadow-sm overflow-hidden border-t-4 border-t-[#0D6EFD]">
          <div className="px-8 py-6 border-b border-[#F1F3F5] bg-[#F8F9FA]/50 flex items-center justify-between">
            <h4 className="font-bold flex items-center gap-4 text-gray-800">
              <div className="p-2 bg-[#0D6EFD]/10 rounded-lg text-[#0D6EFD]"><Layers size={20} /></div>
              Namespace Health Dashboard
            </h4>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DEE2E6] rounded-xl shadow-sm">
                <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Show System</span>
                <button 
                  onClick={() => setShowSystemResources(!showSystemResources)}
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-all duration-200",
                    showSystemResources ? "bg-[#0D6EFD]" : "bg-[#DEE2E6]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                    showSystemResources ? "left-4.5" : "left-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Real-time Verified</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9FA] text-[#6C757D] text-[10px] uppercase font-bold tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-4">Resource Layer</th>
                  <th className="px-8 py-4">Verification</th>
                  <th className="px-8 py-4">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {namespaces.map((ns) => {
                  const nsData = healthStatus[ns!] || { status: 'healthy', pods: [] };
                  return (
                    <React.Fragment key={ns}>
                      <tr className="bg-gray-50/50">
                        <td className="px-8 py-3 font-bold text-[#0D6EFD] flex items-center gap-2">
                           <ShieldCheck size={14} /> NS: {ns}
                        </td>
                        <td className="px-8 py-3">
                           <span className={cn(
                             "flex items-center gap-1.5 font-bold text-[11px]",
                             nsData.status === 'healthy' ? "text-emerald-600" : "text-amber-600"
                           )}>
                             {nsData.status === 'healthy' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                             {nsData.status === 'healthy' ? 'Verified Healthy' : 'Warning'}
                           </span>
                        </td>
                        <td className="px-8 py-3"></td>
                      </tr>
                      {workloads.filter(w => w.namespace === ns).map(svc => {
                        const svcData = healthStatus[svc.id] || { status: 'pending', phase: 'Unknown', reason: 'Pending' };
                        const isExpanded = expandedDetails[svc.id];
                        const podsForSvc = nsData.pods?.filter((p: any) => p.name.includes(svc.id) || svc.id === (p.metadata?.labels?.app || p.name)) || [];

                        return (
                          <React.Fragment key={svc.id}>
                            <tr className="hover:bg-gray-50/30 group">
                              <td className="pl-12 px-8 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-gray-900">{svc.id}</div>
                                  {podsForSvc.length > 0 && (
                                    <button 
                                      onClick={() => toggleDetails(svc.id)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400"
                                    >
                                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono">service/cluster-ip</div>
                              </td>
                              <td className="px-8 py-4">
                                <div className={cn(
                                  "flex items-center gap-1.5 font-bold text-[11px]",
                                  svcData.status === 'healthy' ? "text-emerald-600" : 
                                  svcData.status === 'warning' ? "text-amber-600" : "text-gray-400"
                                )}>
                                  {svcData.status === 'healthy' ? <CheckCircle2 size={12} /> : 
                                   svcData.status === 'warning' ? <Zap size={12} /> : <Loader2 size={12} className="animate-spin" />}
                                  {svcData.reason || 'Applying...'}
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                  {svcData.endpointUrl ? (
                                    <div className="flex flex-col items-start gap-1">
                                      <a 
                                        href={svcData.endpointUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#0D6EFD] hover:underline font-bold text-[11px] flex items-center gap-1"
                                      >
                                        Access <ExternalLink size={10} />
                                      </a>
                                      <div className="flex items-center gap-1">
                                        <div className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          svcData.isReachable ? "bg-emerald-500" : "bg-amber-500"
                                        )} />
                                        <span className="text-[9px] text-gray-400">
                                          {svcData.isReachable ? 'Reachable' : 'Requires Mapping'}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No Service</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && podsForSvc.map((pod: any) => (
                              <tr key={pod.name} className="bg-gray-50/20 border-l-4 border-l-[#0D6EFD]/20 animate-in slide-in-from-left-2 duration-200">
                                <td className="pl-16 px-8 py-3">
                                  <div className="text-[11px] font-medium text-gray-600 truncate max-w-[200px]" title={pod.name}>{pod.name}</div>
                                  <div className="flex gap-2 text-[9px] text-gray-400">
                                    <span>Restarts: {pod.restarts}</span>
                                    <span>Ready: {pod.ready ? 'Yes' : 'No'}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-3">
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                    pod.phase === 'Running' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                  )}>
                                    {pod.reason}
                                  </span>
                                </td>
                                <td className="px-8 py-3">
                                  <button 
                                    onClick={() => fetchLogs(ns!, pod.name)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-[#6C757D] hover:text-[#0D6EFD] transition-colors"
                                  >
                                    <Terminal size={12} /> Logs
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Rancher Desktop Guidance Alert */}
          {workloads.some(w => healthStatus[w.id]?.endpointUrl && !healthStatus[w.id]?.isReachable) && (
            <div className="m-8 p-5 bg-amber-50/50 border border-amber-100 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shadow-sm shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1.5">
                <h6 className="text-sm font-bold text-amber-900">Endpoint Access Required</h6>
                <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium">
                  Some services show <strong>'Requires Mapping'</strong> because their ports are not yet exposed to your host machine. 
                  In <strong>Rancher Desktop</strong>, navigate to <strong>Kubernetes &gt; Port Forwarding</strong> and map the source port for these services to <code>localhost</code> to enable direct access.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-white rounded-3xl border border-[#E9ECEF] shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#0D6EFD]/10 rounded-2xl flex items-center justify-center text-[#0D6EFD] shadow-inner">
                  <Zap size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-gray-900 tracking-tight">Post-Deploy Toolkit</h4>
                  <p className="text-sm text-gray-500">Tools to manage your live environment.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Exposed Gateways</h5>
                <div className="space-y-2">
                   <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#0D6EFD]/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                         <Globe size={18} className="text-gray-400 group-hover:text-[#0D6EFD]" />
                         <div>
                            <div className="text-sm font-bold text-gray-800">API Gateway</div>
                            <div className="text-[10px] text-gray-500 font-mono">http://localhost:8080</div>
                         </div>
                      </div>
                      <ExternalLink size={14} className="text-gray-300 group-hover:text-[#0D6EFD]" />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#0D6EFD]/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                         <Activity size={18} className="text-gray-400 group-hover:text-[#0D6EFD]" />
                         <div>
                            <div className="text-sm font-bold text-gray-800">Dashboard UI</div>
                            <div className="text-[10px] text-gray-500 font-mono">http://localhost:3000</div>
                         </div>
                      </div>
                      <ExternalLink size={14} className="text-gray-300 group-hover:text-[#0D6EFD]" />
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-8">
              <button 
                onClick={onResetSession}
                className="w-full py-4 bg-[#0D6EFD] text-white rounded-2xl text-sm font-bold hover:bg-[#0B5ED7] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0D6EFD]/20 active:scale-[0.98]"
              >
                <CheckCircle2 size={18} /> Finish and Exit Wizard
              </button>
              <button 
                onClick={handleDownloadSnapshot}
                className="w-full py-4 bg-white border-2 border-[#E9ECEF] text-gray-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:border-[#0D6EFD] hover:text-[#0D6EFD] transition-all"
              >
                <Download size={18} /> Download Snapshot YAML
              </button>
              <button 
                onClick={onRerunHealthCheck}
                className="w-full py-4 bg-white text-[#0D6EFD] border-2 border-[#0D6EFD] rounded-2xl text-sm font-bold hover:bg-[#E7F1FF] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Zap size={18} /> Rerun Sanity Health Checks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Viewer Overlay */}
      <AnimatePresence>
        {selectedPodForLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPodForLogs(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-[80vh] flex flex-col bg-[#1A1A1A] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D6EFD]/20 flex items-center justify-center text-[#0D6EFD]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Diagnostic Logs</h4>
                    <p className="text-[10px] text-gray-500 font-mono">{selectedPodForLogs.ns} / {selectedPodForLogs.pod}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isFetchingLogs && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 italic">
                      <Loader2 size={12} className="animate-spin" /> Fetching live stream...
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedPodForLogs(null)}
                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 font-mono text-[12px] text-gray-300 overflow-y-auto selection:bg-[#0D6EFD]/30">
                {logs.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-gray-600 shrink-0 w-8 text-right select-none">{i + 1}</span>
                    <span className={cn(
                      "break-all",
                      line.toLowerCase().includes('error') ? "text-red-400" : 
                      line.toLowerCase().includes('warn') ? "text-amber-400" : ""
                    )}>{line}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-black/20 border-t border-white/10 flex items-center justify-between">
                <p className="text-[10px] text-gray-500">Live Diagnostic Feed &copy; KubeSDK</p>
                <div className="flex gap-2">
                  <button 
                   onClick={() => fetchLogs(selectedPodForLogs.ns, selectedPodForLogs.pod)}
                   className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-all border border-white/10"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
