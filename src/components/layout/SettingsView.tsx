import React from 'react';
import { motion } from 'motion/react';
import { KubeSDKLocalRun } from '../../../types';

interface SettingsViewProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
}

export const SettingsView = ({ config, setConfig }: SettingsViewProps) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Global Settings</h2>
        <p className="text-[#6C757D]">Configure global SDK pipeline behaviors.</p>
      </div>

      <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-6">
        <h3 className="font-bold text-lg border-b pb-4">Compilation Settings</h3>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[#495057]">
            Ignored Namespaces (Comma separated)
          </label>
          <p className="text-xs text-[#6C757D]">
            These namespaces (and all components within them) will be excluded from the Cluster Model UI and final YAML generation.
          </p>
          <input 
            type="text" 
            value={(config.wizard.ignoredNamespaces || []).join(', ')}
            onChange={(e) => {
              const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, ignoredNamespaces: val } }));
            }}
            placeholder="e.g. default, kube-system"
            className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <label className="block text-sm font-medium text-[#495057]">
            Import Kind Whitelist (Comma separated)
          </label>
          <p className="text-xs text-[#6C757D]">
            Only resources of these kinds will be parsed from cluster exports or live imports. Defaults to Pods and Services.
          </p>
          <input 
            type="text" 
            value={(config.wizard.kindWhitelist || []).join(', ')}
            onChange={(e) => {
              const val = e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
              setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, kindWhitelist: val } }));
            }}
            placeholder="e.g. Pod, Service, ConfigMap"
            className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
          />
        </div>
      </div>
    </motion.div>
  );
};
