import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, CheckCircle2, Server, ExternalLink, ShieldCheck, 
  Terminal, Layers, Globe, Activity, AlertCircle, 
  Code2, Loader2, ChevronDown, ChevronUp, Play, X, FileText
} from 'lucide-react';
import * as yaml from 'js-yaml';
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
  isDeploying: boolean;
  deploymentStatus: string[];
  modelYamlContent: string;
  onDeploy: (items: any[]) => void;
  config: KubeSDKLocalRun;
  deploymentItems: DeploymentItem[];
}

export const DeploymentStep = ({
  isDeploying,
  deploymentStatus,
  modelYamlContent,
  onDeploy,
  config,
  deploymentItems: globalDeploymentItems
}: DeploymentStepProps) => {
  const [subStep, setSubStep] = React.useState<'review' | 'deploying'>('review');
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
  }, [isDeploying]);

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
              {isDeploying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {isDeploying ? 'Provisioning in Progress' : 'Provisioning Complete'}
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
                 <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[10px] font-bold text-[#6C757D] uppercase tracking-widest flex items-center gap-2">
                      <Terminal size={14} /> Diagnostic Stream
                    </h5>
                    <a 
                      href="http://localhost:4466" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                    >
                      K3s Admin UI <ExternalLink size={10} />
                    </a>
                 </div>
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
          
          {!isDeploying && globalDeploymentItems.length > 0 && (
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900">Deployment Logic Finished</h4>
                  <p className="text-xs text-emerald-700">All resources have been applied to the cluster. Click continue to verify runtime health.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

