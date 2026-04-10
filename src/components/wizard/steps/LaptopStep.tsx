import React from 'react';
import { Monitor, Settings } from 'lucide-react';
import { KubeSDKLocalRun } from '../../../types';

interface LaptopStepProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
}

export const LaptopStep = ({ config, setConfig }: LaptopStepProps) => {
  return (
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
                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-mono" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
