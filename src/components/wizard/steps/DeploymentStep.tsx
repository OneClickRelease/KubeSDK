import React from 'react';
import { motion } from 'motion/react';
import { Zap, CheckCircle2, Download, Server } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DeploymentStepProps {
  isReady: boolean;
  isDeploying: boolean;
  deploymentStatus: string[];
  modelYamlContent: string;
  onDeploy: () => void;
  onDirectDeploy: () => void;
}

export const DeploymentStep = ({
  isReady,
  isDeploying,
  deploymentStatus,
  modelYamlContent,
  onDeploy,
  onDirectDeploy
}: DeploymentStepProps) => {
  return (
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
              onClick={onDeploy}
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
              <h3 className="text-2xl font-bold text-green-800">Local Simulation Successful!</h3>
              <p className="text-green-700">Your configuration is valid and simulating perfectly locally.</p>
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
            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm mb-2 text-[#0D6EFD]">Ship to Developers</h4>
                <p className="text-xs text-[#6C757D] mb-4">Export the fully validated configuration for your team.</p>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    const blob = new Blob([modelYamlContent], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'kubesdk-runtime.yaml';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-3 bg-[#0D6EFD] text-white rounded-lg text-sm font-bold hover:bg-[#0B5ED7] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0D6EFD]/20"
                >
                  <Download size={16} /> Download Validated YAML
                </button>
                <button 
                  onClick={onDirectDeploy}
                  disabled={isDeploying}
                  className="w-full py-3 bg-white text-[#0D6EFD] border-2 border-[#0D6EFD] rounded-lg text-sm font-bold hover:bg-[#E7F1FF] transition-all flex items-center justify-center gap-2"
                >
                  <Server size={16} /> {isDeploying ? 'Deploying...' : 'Connect & Deploy via SDK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
