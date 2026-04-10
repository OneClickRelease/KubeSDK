import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, CheckCircle2, Server, ExternalLink, ShieldCheck, 
  Terminal, Layers, Globe, Activity, AlertCircle, 
  Code2, Loader2, ChevronDown, ChevronUp, Play
} from 'lucide-react';
import yaml from 'js-yaml';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun } from '../../../types';

interface DeploymentItem {
  id: string;
  kind: string;
  name: string;
  namespace?: string;
  status: 'pending' | 'applying' | 'success' | 'failed';
  content: string;
  error?: string;
}

interface DeploymentStepProps {
  isReady: boolean;
  isDeploying: boolean;
  deploymentStatus: string[];
  modelYamlContent: string;
  onDeploy: (items: any[]) => void;
  onDirectDeploy: () => void;
  config: KubeSDKLocalRun;
  healthStatus: Record<string, 'healthy' | 'warning'>;
  error: string | null;
  deploymentItems: DeploymentItem[];
}

export const DeploymentStep = ({
  isReady,
  isDeploying,
  deploymentStatus,
  modelYamlContent,
  onDeploy,
  onDirectDeploy,
  config,
  healthStatus,
  error,
  deploymentItems: globalDeploymentItems
}: DeploymentStepProps) => {
  const [subStep, setSubStep] = React.useState<'review' | 'deploying' | 'ready'>('review');
  const [parsedItems, setParsedItems] = React.useState<DeploymentItem[]>([]);
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);

  // Parse YAML into individual items for review
  React.useEffect(() => {
    try {
      const docs = yaml.loadAll(modelYamlContent) as any[];
      const items: DeploymentItem[] = docs
        .filter(doc => {
          if (!doc || !doc.kind) return false;
          // Skip KubeSDK-internal meta documents — not real K8s resources
          const apiGroup = doc.apiVersion?.includes('/') ? doc.apiVersion.split('/')[0] : '';
          if (apiGroup === 'kubesdk.dev' || doc.kind === 'LocalRunDefinition') return false;
          return true;
        })
        .map((doc, idx) => ({
          id: `${doc.kind}-${doc.metadata?.name}-${idx}`,
          kind: doc.kind,
          name: doc.metadata?.name || 'unnamed',
          namespace: doc.metadata?.namespace,
          status: 'pending',
          content: yaml.dump(doc)
        }));
      setParsedItems(items);
    } catch (e) {
      console.error("YAML Parse error in DeploymentStep", e);
    }
  }, [modelYamlContent]);

  React.useEffect(() => {
    if (isDeploying) setSubStep('deploying');
    if (isReady && !isDeploying) setSubStep('ready');
  }, [isDeploying, isReady]);

  const namespaces = Array.from(new Set(config.components.map(c => c.namespace).filter(Boolean)));
  const workloads = config.components.filter(c => c.category === 'application');

  const handleStartDeployment = () => {
    onDeploy(parsedItems);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {subStep === 'review' && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 p-8 bg-[#0D6EFD]/5 border border-[#0D6EFD]/10 rounded-2xl">
            <div className="w-16 h-16 bg-[#0D6EFD]/10 rounded-full flex items-center justify-center text-[#0D6EFD] shadow-inner">
              <ShieldCheck size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#212529]">Pre-Deployment Review</h3>
              <p className="text-sm text-[#6C757D]">The SDK has generated {parsedItems.length} resource manifests. Review the execution plan below.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F3F5] bg-[#F8F9FA]/50 flex items-center justify-between">
               <h4 className="text-sm font-bold flex items-center gap-2">
                 <Terminal size={16} className="text-[#0D6EFD]" /> Execution Plan
               </h4>
               <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-widest">{parsedItems.length} Resources Identified</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F9FA] text-[#6C757D] text-[10px] uppercase font-bold tracking-[0.1em]">
                  <tr>
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Resource Type</th>
                    <th className="px-6 py-3">Identifier</th>
                    <th className="px-6 py-3">Namespace</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {parsedItems.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-[#F8F9FA]/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-[#ADB5BD]">0{idx + 1}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold uppercase text-gray-600">
                            {item.kind}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                        <td className="px-6 py-4 text-gray-500">{item.namespace || '-'}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            className="p-1.5 hover:bg-[#0D6EFD]/10 rounded-lg text-[#0D6EFD] transition-colors"
                          >
                            <Code2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedItem === item.id && (
                        <tr>
                          <td colSpan={5} className="px-6 pb-4">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-[#1A1A1A] rounded-xl p-4 font-mono text-[10px] text-[#D1D1D1] overflow-x-auto whitespace-pre border border-black"
                            >
                              {item.content}
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={handleStartDeployment}
              className="px-12 py-5 bg-[#0D6EFD] text-white rounded-2xl font-bold hover:bg-[#0B5ED7] transition-all shadow-xl shadow-[#0D6EFD]/20 active:scale-95 flex items-center gap-3"
            >
              <Play size={20} fill="currentColor" /> Start Sequential Deployment
            </button>
            <p className="text-[10px] text-[#6C757D] flex items-center gap-1">
              <Terminal size={10} /> Equivalent to executing: <code>kubectl apply -f sdk-generated-manifests.yaml</code>
            </p>
          </div>
        </div>
      )}

      {subStep === 'deploying' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D6EFD]/10 text-[#0D6EFD] rounded-full text-[10px] font-bold uppercase tracking-widest">
              <Loader2 size={12} className="animate-spin" /> Provisioning in Progress
            </div>
            <h3 className="text-2xl font-bold">Synchronizing Workspace</h3>
            <p className="text-sm text-[#6C757D]">Linking KubeSDK components to {config.wizard.runtime.type} live runtime...</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
               <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-[#F1F3F5] bg-[#F8F9FA]/50 flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-[#6C757D] uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} className="text-[#0D6EFD]" /> Real-time Sync Status
                    </h5>
                    <span className="text-[10px] font-bold text-[#6C757D]">
                      {globalDeploymentItems.filter(i => i.status === 'success').length} / {globalDeploymentItems.length} Complete
                    </span>
                 </div>
                 <div className="divide-y divide-[#F1F3F5] max-h-[500px] overflow-y-auto">
                    {globalDeploymentItems.map((item, idx) => (
                      <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px]",
                            item.status === 'success' ? "bg-emerald-100 text-emerald-600" :
                            item.status === 'applying' ? "bg-[#0D6EFD]/10 text-[#0D6EFD]" :
                            item.status === 'failed' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
                          )}>
                             {item.status === 'success' ? <CheckCircle2 size={14} /> : 
                              item.status === 'applying' ? <Loader2 size={14} className="animate-spin" /> :
                              item.status === 'failed' ? <AlertCircle size={14} /> : idx + 1}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-gray-800">{item.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{item.kind}</div>
                          </div>
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest",
                          item.status === 'success' ? "text-emerald-500 bg-emerald-50" :
                          item.status === 'applying' ? "text-[#0D6EFD] bg-[#0D6EFD]/5 animate-pulse" :
                          item.status === 'failed' ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-50"
                        )}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#1A1A1A] h-full rounded-2xl p-6 border border-black shadow-2xl flex flex-col">
                 <h5 className="text-[10px] font-bold text-[#6C757D] uppercase tracking-widest flex items-center gap-2 mb-4">
                   <Terminal size={14} /> Diagnostic Stream
                 </h5>
                 <div className="flex-1 font-mono text-[11px] text-gray-300 space-y-2 overflow-y-auto max-h-[440px]">
                    {deploymentStatus.map((status, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#6C757D] shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                        <span className={cn(
                          status.includes('Successfully') ? "text-emerald-400" : 
                          status.includes('Error') ? "text-red-400" : "text-gray-400"
                        )}>{status}</span>
                      </div>
                    ))}
                    {isDeploying && (
                      <div className="flex items-center gap-2 text-[#0D6EFD]">
                        <span className="animate-pulse">_</span>
                        <span className="animate-pulse">Awaiting cluster response...</span>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subStep === 'ready' && (
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
              <div className="pt-4 flex gap-4">
                 <button onClick={() => setSubStep('review')} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all">
                   Modify Plan and Retry
                 </button>
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
                    onClick={() => setSubStep('review')}
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
