import React from 'react';
import { LayeredDependencyMap } from '../LayeredDependencyMap';
import { KubeSDKLocalRun } from '../../../types';

interface MappingStepProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  namespaces: string[];
  generateYamlFromConfig: (config: KubeSDKLocalRun) => string;
}

export const MappingStep = ({ config, setConfig, namespaces, generateYamlFromConfig }: MappingStepProps) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#212529]">Dependency Architecture</h3>
          <p className="text-sm text-[#495057] mt-1">
            Each row is a namespace layer. <span className="font-bold text-[#212529]">Click an application</span> to select it, then click <span className="text-emerald-600 font-bold">green service chips</span> to wire dependencies. ENV variables are synthesized automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#6C757D] shrink-0">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#0D6EFD]" /> App</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /> Service/Ingress</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" /> Available Target</div>
        </div>
      </div>
      <LayeredDependencyMap 
        config={config} 
        setConfig={setConfig} 
        namespaces={namespaces} 
        generateYamlFromConfig={generateYamlFromConfig}
      />
    </div>
  );
};
