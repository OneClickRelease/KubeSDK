import React from 'react';
import { motion } from 'motion/react';
import { Zap, CheckCircle2, Download, Server, ExternalLink, ShieldCheck, Terminal, Layers, Globe, Activity } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun } from '../../../types';

interface DeploymentStepProps {
  isReady: boolean;
  isDeploying: boolean;
  deploymentStatus: string[];
  modelYamlContent: string;
  onDeploy: () => void;
  onDirectDeploy: () => void;
  config: KubeSDKLocalRun;
  healthStatus: Record<string, 'healthy' | 'warning'>;
}

export const DeploymentStep = ({
  isReady,
  isDeploying,
  deploymentStatus,
  modelYamlContent,
  onDeploy,
  onDirectDeploy,
  config,
  healthStatus
}: DeploymentStepProps) => {
  const [subStep, setSubStep] = React.useState<'review' | 'deploying' | 'ready'>('review');

  React.useEffect(() => {
    if (isDeploying) setSubStep('deploying');
    if (isReady && !isDeploying) setSubStep('ready');
  }, [isDeploying, isReady]);

  const namespaces = Array.from(new Set(config.components.map(c => c.namespace).filter(Boolean)));
  const workloads = config.components.filter(c => c.category === 'application');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {subStep === 'review' && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 p-8 bg-[#0D6EFD]/5 border border-[#0D6EFD]/10 rounded-2xl">
            <div className="w-16 h-16 bg-[#0D6EFD]/10 rounded-full flex items-center justify-center text-[#0D6EFD]">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#212529]">Deployment Manifest Review</h3>
              <p className="text-sm text-[#6C757D]">Inspect the configuration before initiating the SDK runtime.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Resources</span>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Layers size={20} className="text-[#0D6EFD]" /> {config.components.length}
              </div>
              <span className="text-xs text-[#6C757D]">Active kubesdk docs</span>
            </div>
            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Namespaces</span>
              <div className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-500" /> {namespaces.length}
              </div>
              <span className="text-xs text-[#6C757D]">Isolated environments</span>
            </div>
            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Target Node</span>
              <div className="text-xl font-bold flex items-center gap-2">
                <Server size={20} className="text-amber-500" /> {config.wizard.runtime.type || 'Local'}
              </div>
              <span className="text-xs text-[#6C757D]">Connected runtime</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] p-6 rounded-2xl space-y-4">
            <h5 className="text-[10px] font-bold text-[#6C757D] uppercase tracking-widest flex items-center gap-2">
              <Terminal size={14} /> Execution Commands
            </h5>
            <div className="font-mono text-xs text-[#D1D1D1] bg-black/30 p-4 rounded-xl space-y-2">
              <div className="text-[#6C757D]"># Syncing SDK Local Run Context</div>
              <div>$ kubesdk sync --context {config.wizard.runtime.type}</div>
              <div className="text-[#6C757D]"># Applying Manifests</div>
              <div>$ kubectl apply -f kubesdk-deployment.yaml</div>
              <div className="text-[#6C757D]"># Verification Hook</div>
              <div>$ kubesdk verify --wait 30s</div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button 
              onClick={onDeploy}
              className="px-12 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-xl shadow-[#0D6EFD]/20 active:scale-95 flex items-center gap-2"
            >
              <Zap size={20} /> Initiate Automated Deployment
            </button>
          </div>
        </div>
      )}

      {subStep === 'deploying' && (
        <div className="text-center py-12 space-y-8">
          <div className="w-24 h-24 bg-[#0D6EFD]/10 rounded-full flex items-center justify-center mx-auto text-[#0D6EFD]">
            <Server size={44} className="animate-pulse" />
          </div>
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-xl font-bold">Establishing Workspace...</h3>
            <div className="h-2.5 bg-[#DEE2E6] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#0D6EFD]"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 8 }}
              />
            </div>
            <div className="text-left bg-[#F8F9FA] p-6 rounded-2xl border border-[#E9ECEF] h-[180px] overflow-y-auto font-mono text-xs text-[#6C757D] space-y-2">
              {deploymentStatus.map((status, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-emerald-500">✓</span>
                  {status}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subStep === 'ready' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-emerald-900">SDK Runtime establishes Live!</h3>
              <p className="text-emerald-700 font-medium">Sanity checks passed. Your cluster is healthy and operational.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-[#E9ECEF] shadow-sm overflow-hidden border-t-4 border-t-[#0D6EFD]">
              <div className="px-8 py-6 border-b border-[#F1F3F5] bg-[#F8F9FA]/50 flex items-center justify-between">
                <h4 className="font-bold flex items-center gap-4 text-gray-800">
                  <div className="p-2 bg-[#0D6EFD]/10 rounded-lg text-[#0D6EFD]"><Layers size={20} /></div>
                  Namespace Health Dashboard
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Real-time Verified</span>
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
                    {namespaces.map((ns) => (
                      <React.Fragment key={ns}>
                        <tr className="bg-gray-50/50">
                          <td className="px-8 py-3 font-bold text-[#0D6EFD] flex items-center gap-2">
                             <ShieldCheck size={14} /> NS: {ns}
                          </td>
                          <td className="px-8 py-3">
                             <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                               <CheckCircle2 size={12} /> {healthStatus[ns!] || 'Healthy'}
                             </span>
                          </td>
                          <td className="px-8 py-3"></td>
                        </tr>
                        {workloads.filter(w => w.namespace === ns).map(svc => (
                          <tr key={svc.id} className="hover:bg-gray-50/30">
                            <td className="pl-12 px-8 py-4">
                              <div className="font-bold text-gray-900">{svc.id}</div>
                              <div className="text-[10px] text-gray-500 font-mono">service/cluster-ip</div>
                            </td>
                            <td className="px-8 py-4">
                              <div className={cn(
                                "flex items-center gap-1.5 font-bold text-[11px]",
                                healthStatus[svc.id] === 'healthy' ? "text-emerald-600" : "text-amber-600"
                              )}>
                                {healthStatus[svc.id] === 'healthy' ? <CheckCircle2 size={12} /> : <Zap size={12} />}
                                {healthStatus[svc.id] === 'healthy' ? 'Verified Healthy' : 'Warning'}
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <a 
                                href={`http://localhost:8080`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#0D6EFD] hover:underline font-bold text-[11px] flex items-center gap-1"
                              >
                                Access <ExternalLink size={10} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-[#0D6EFD] text-white rounded-2xl text-sm font-bold hover:bg-[#0B5ED7] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0D6EFD]/20 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={18} /> Finish and Exit Wizard
                  </button>
                  <button 
                    onClick={onDeploy}
                    className="w-full py-4 bg-white text-[#0D6EFD] border-2 border-[#0D6EFD] rounded-2xl text-sm font-bold hover:bg-[#E7F1FF] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Zap size={18} /> Rerun Sanity Health Checks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
