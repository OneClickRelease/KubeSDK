import React from 'react';
import { motion } from 'motion/react';
import { KubeSDKLocalRun } from '../../../types';
import { FileCode2 } from 'lucide-react';
import rawLanguagesYaml from '../../configs/languages.yaml?raw';
import * as yaml from 'js-yaml';

const LANG_CONFIG = yaml.load(rawLanguagesYaml) as any;
const AVAILABLE_LANGUAGES = LANG_CONFIG?.languages || {};

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
      className="space-y-8 pb-20"
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

      <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b pb-4">
           <FileCode2 className="text-[#0D6EFD]" size={20} />
           <h3 className="font-bold text-lg">Recognized SDK Languages</h3>
        </div>
        <p className="text-sm text-[#6C757D]">These languages and their frameworks/build tools are loaded natively from your <code className="bg-[#F8F9FA] px-1.5 py-0.5 rounded border text-[#E83E8C] text-xs shadow-sm shadow-[#E83E8C]/10 border-[#E9ECEF]">configs/languages.yaml</code> definition and are available for capability assignments globally.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(AVAILABLE_LANGUAGES).map(([langKey, langInfo]: [string, any]) => {
             const frameworks = langInfo.frameworks || [];
             const buildTools = langInfo['build-tools'] || [];
             return (
               <div key={langKey} className="border border-[#E9ECEF] shadow-sm rounded-xl p-5 bg-[#F8F9FA]">
                 <h4 className="font-extrabold text-[#1A1A1A] capitalize text-lg mb-4">{langKey}</h4>
                 <div className="space-y-4">
                   {frameworks.length > 0 && (
                     <div>
                       <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-[#0D6EFD]"></span>
                         Frameworks
                       </p>
                       <div className="flex flex-wrap gap-1.5">
                         {frameworks.map((f: string) => <span key={f} className="text-[10px] bg-white border font-semibold border-[#DEE2E6] px-2.5 py-1 rounded-md text-[#495057]">{f}</span>)}
                       </div>
                     </div>
                   )}
                   {buildTools.length > 0 && (
                     <div>
                       <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-[#198754]"></span>
                         Build Tools
                       </p>
                       <div className="flex flex-wrap gap-1.5">
                         {buildTools.map((b: string) => <span key={b} className="text-[10px] bg-white border font-semibold border-[#DEE2E6] px-2.5 py-1 rounded-md text-[#495057]">{b}</span>)}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    </motion.div>
  );
};
