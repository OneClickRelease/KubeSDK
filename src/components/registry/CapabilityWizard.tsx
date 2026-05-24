import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Code, 
  Terminal, 
  Settings2, 
  Box,
  Copy,
  CheckCircle2
} from 'lucide-react';
import Mustache from 'mustache';
import * as yaml from 'js-yaml';
import { cn } from '../../lib/utils';
import { DEFAULT_CAPABILITY_TYPES, getSuggestedType } from '../../lib/capabilities/default-registry';
import { CAPABILITY_TEMPLATES } from '../../lib/capabilities/templates';
import rawLanguagesYaml from '../../configs/languages.yaml?raw';

const LANG_CONFIG = yaml.load(rawLanguagesYaml) as any;
const AVAILABLE_LANGUAGES = LANG_CONFIG?.languages || {};

interface CapabilityWizardProps {
  service: any;
  sourceFilename?: string;
  onClose: () => void;
  onComplete: () => void;
}

export const CapabilityWizard = ({ service, sourceFilename, onClose, onComplete }: CapabilityWizardProps) => {
  const isEdit = service.isEdit;
  const [step, setStep] = React.useState(isEdit ? 2 : 1);
  const [selectedType, setSelectedType] = React.useState<string>(service.type || getSuggestedType(service.name) || '');
  const [yamlMode, setYamlMode] = React.useState(false);
  const [config, setConfig] = React.useState(service.config || {
    host: `${service.name}.${service.namespace}.svc.cluster.local`,
    port: service.ports?.[0]?.port || 80,
    database: 'myapp_db',
    username: 'admin',
    password: 'password_placeholder'
  });
  const [sdkSupport, setSdkSupport] = React.useState<Record<string, { frameworks: string[], buildTools: string[] }>>(service.sdkSupport || {});

  const [comboPayloads, setComboPayloads] = React.useState<Record<string, {
      dependencies: string;
      envVars: Array<{key: string, value: string}>;
      snippetTemplate: string;
  }>>(service.comboPayloads || {});

  const combinations = React.useMemo(() => {
     const combos: any[] = [];
     Object.entries(sdkSupport).forEach(([langKey, langInfo]) => {
        const frameworks = langInfo.frameworks.length > 0 ? langInfo.frameworks : ['none'];
        const buildTools = langInfo.buildTools.length > 0 ? langInfo.buildTools : ['none'];
        
        frameworks.forEach(fw => {
           buildTools.forEach(bt => {
              combos.push({
                 id: `${langKey}-${fw}-${bt}`,
                 language: langKey,
                 framework: fw,
                 buildTool: bt
              });
           });
        });
     });
     return combos;
  }, [sdkSupport]);

  const [activeComboId, setActiveComboId] = React.useState<string | null>(null);

  React.useEffect(() => {
     if (step === 4 && combinations.length > 0) {
        if (!activeComboId || !combinations.find((c: any) => c.id === activeComboId)) {
           setActiveComboId(combinations[0].id);
        }
     }
  }, [step, combinations, activeComboId]);

  const [rawYaml, setRawYaml] = React.useState('');
  const [copiedIndex, setCopiedIndex] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (yamlMode) {
      setRawYaml(yaml.dump({ ...config, type: selectedType }));
    }
  }, [yamlMode, config, selectedType]);

  const capabilityType = DEFAULT_CAPABILITY_TYPES.find(t => t.id === selectedType);
  const templates = CAPABILITY_TEMPLATES[selectedType] || {};
  const languages = Object.keys(templates);

  const handleSave = async () => {
    try {
      let finalConfig = config;
      let finalType = selectedType;

      if (yamlMode) {
        try {
          const parsed = yaml.load(rawYaml) as any;
          if (parsed.type) finalType = parsed.type;
          // Extract config fields from parsed object (assuming standard fields)
          const { type, id, displayName, ...rest } = parsed;
          finalConfig = rest;
        } catch (e) {
          alert('Invalid YAML format');
          return;
        }
      }

      const response = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFilename,
          id: service.id, // One capability per service
          serviceId: service.id,
          namespace: service.namespace,
          displayName: service.name,
          type: finalType,
          config: finalConfig,
          sdkSupport,
          comboPayloads
        })
      });
      
      if (response.ok) {
        onComplete();
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#E7F1FF] rounded-xl flex items-center justify-center text-[#0D6EFD]">
              <Settings2 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1A1A1A]">Register Capability</h3>
              <p className="text-sm text-[#6C757D]">{service.name} in {service.namespace}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors text-[#ADB5BD] hover:text-[#1A1A1A]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex gap-4 mb-10">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step === s ? "bg-[#0D6EFD] text-white shadow-lg shadow-[#0D6EFD]/20" : 
                  step > s ? "bg-[#198754] text-white" : "bg-[#F8F9FA] text-[#6C757D]"
                )}>
                  {step > s ? <Check size={16} /> : s}
                </div>
                <div className={cn(
                  "h-1 px-4 flex-1 rounded-full",
                  step > s ? "bg-[#198754]" : "bg-[#F8F9FA]"
                )} />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Service Details Card */}
                <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E9ECEF] flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                       <Box size={16} className="text-[#0D6EFD]" />
                       <h4 className="font-bold text-[#1A1A1A]">Discovered Details</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       <div>
                         <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Interface / URL</p>
                         <p className="text-xs font-mono text-[#1A1A1A] mt-1 truncate" title={`${service.name}.${service.namespace}.svc.cluster.local`}>
                           {service.name}.{service.namespace}.svc
                         </p>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Resource Kind</p>
                         <p className="text-xs font-mono text-[#1A1A1A] mt-1">{service.kind || 'Service'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Active Ports</p>
                         <p className="text-xs font-mono text-[#1A1A1A] mt-1">{service.ports?.map((p:any) => `${p.port}/${p.protocol || 'TCP'}`).join(', ') || 'N/A'}</p>
                       </div>
                    </div>
                  </div>
                  {Object.keys(service.selector || {}).length > 0 && (
                    <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-[#E9ECEF] shadow-sm">
                       <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-2">Target Pod Selector</p>
                       <div className="space-y-1">
                         {Object.entries(service.selector).map(([k, v]) => (
                           <div key={k} className="flex items-center gap-2 text-[11px] font-mono whitespace-nowrap overflow-hidden">
                             <span className="text-[#0D6EFD] shrink-0">{k}:</span>
                             <span className="text-[#1A1A1A] truncate" title={v as string}>{v as string}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-8 border-t border-[#E9ECEF] pt-8">
                  <h4 className="text-lg font-bold">Select Capability Type</h4>
                  <p className="text-sm text-[#6C757D]">How should application developers consume this service?</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {DEFAULT_CAPABILITY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left space-y-3",
                        selectedType === type.id ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedType === type.id ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]"
                      )}>
                        <Box size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1A1A1A]">{type.name}</p>
                        <p className="text-[11px] text-[#6C757D] line-clamp-1">{type.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold">Configure Interface</h4>
                      <p className="text-sm text-[#6C757D]">Define the connection details.</p>
                    </div>
                    <button 
                      onClick={() => setYamlMode(!yamlMode)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        yamlMode ? "bg-[#0D6EFD] text-white" : "bg-white border border-[#E9ECEF] text-[#6C757D]"
                      )}
                    >
                      <Code size={14} /> YAML Mode
                    </button>
                  </div>
                  
                  {yamlMode ? (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Raw Configuration (YAML)</label>
                      <textarea
                        value={rawYaml}
                        onChange={(e) => setRawYaml(e.target.value)}
                        className="w-full h-64 p-4 font-mono text-sm bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                        placeholder="kind: Capability..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Access URL (Internal)</label>
                        <input 
                          type="text" 
                          value={config.host}
                          onChange={(e) => setConfig({ ...config, host: e.target.value })}
                          className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:outline-none focus:border-[#0D6EFD]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Port</label>
                          <input 
                            type="number" 
                            value={config.port}
                            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Default DB/Schema</label>
                          <input 
                            type="text" 
                            value={config.database}
                            onChange={(e) => setConfig({ ...config, database: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Username</label>
                          <input 
                            type="text" 
                            value={config.username}
                            onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Password (Placeholder)</label>
                          <input 
                            type="text" 
                            value={config.password}
                            onChange={(e) => setConfig({ ...config, password: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white space-y-4">
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    <Terminal size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Interface Metadata</span>
                  </div>
                  <pre className="text-[12px] font-mono leading-relaxed text-[#ADB5BD]">
                    {JSON.stringify({ ...config, type: selectedType }, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h4 className="text-lg font-bold">Define SDK Support</h4>
                  <p className="text-sm text-[#6C757D]">Specify which programming languages, frameworks, and build tools are actively supported by this capability.</p>
                </div>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(AVAILABLE_LANGUAGES).map(([langKey, langInfo]: [string, any]) => {
                    const isSelected = !!sdkSupport[langKey];
                    const frameworks = langInfo.frameworks || [];
                    const buildTools = langInfo['build-tools'] || [];
                    
                    const toggleLang = () => {
                       const next = { ...sdkSupport };
                       if (isSelected) {
                         delete next[langKey];
                       } else {
                         next[langKey] = { frameworks: [...frameworks], buildTools: [...buildTools] };
                       }
                       setSdkSupport(next);
                    };

                    const toggleSelection = (type: 'frameworks' | 'buildTools', val: string) => {
                       if (!isSelected) return;
                       const next = { ...sdkSupport };
                       const arr = next[langKey][type];
                       if (arr.includes(val)) {
                          next[langKey][type] = arr.filter((n: string) => n !== val);
                       } else {
                          next[langKey][type] = [...arr, val];
                       }
                       setSdkSupport(next);
                    };

                    return (
                        <div key={langKey} className={cn("border rounded-xl transition-all overflow-hidden", isSelected ? "border-[#0D6EFD] bg-white shadow-sm" : "border-[#E9ECEF] hover:border-[#DEE2E6] bg-[#F8F9FA]")}>
                           <div 
                              className="px-6 py-4 flex items-center justify-between cursor-pointer"
                              onClick={toggleLang}
                           >
                              <div className="flex items-center gap-3">
                                <div className={cn("w-5 h-5 rounded flex items-center justify-center border", isSelected ? "bg-[#0D6EFD] border-[#0D6EFD] text-white" : "border-[#DEE2E6] bg-white")}>
                                   {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                                <span className={cn("font-bold capitalize", isSelected ? "text-[#1A1A1A]" : "text-[#6C757D]")}>
                                  {langKey}
                                </span>
                              </div>
                           </div>
                           
                           {isSelected && (
                             <div className="px-6 pb-6 pt-2 border-t border-[#F8F9FA] space-y-4 bg-white">
                                {frameworks.length > 0 && (
                                  <div className="space-y-2">
                                     <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Frameworks</span>
                                     <div className="flex flex-wrap gap-2">
                                        {frameworks.map((fw: string) => {
                                          const checked = sdkSupport[langKey].frameworks.includes(fw);
                                          return (
                                            <button 
                                              key={fw}
                                              onClick={() => toggleSelection('frameworks', fw)}
                                              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", checked ? "bg-[#E7F1FF] text-[#0D6EFD] border-[#B6D4FE]" : "bg-white text-[#6C757D] border-[#DEE2E6] hover:bg-[#F8F9FA]")}
                                            >
                                              {fw}
                                            </button>
                                          )
                                        })}
                                     </div>
                                  </div>
                                )}
                                {buildTools.length > 0 && (
                                  <div className="space-y-2">
                                     <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Build Tools</span>
                                     <div className="flex flex-wrap gap-2">
                                        {buildTools.map((bt: string) => {
                                          const checked = sdkSupport[langKey].buildTools.includes(bt);
                                          return (
                                            <button 
                                              key={bt}
                                              onClick={() => toggleSelection('buildTools', bt)}
                                              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", checked ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-[#6C757D] border-[#DEE2E6] hover:bg-[#F8F9FA]")}
                                            >
                                              {bt}
                                            </button>
                                          )
                                        })}
                                     </div>
                                  </div>
                                )}
                             </div>
                           )}
                        </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex flex-col h-full"
              >
                <div className="space-y-1 shrink-0">
                  <h4 className="text-lg font-bold">Configure SDK Combinations</h4>
                  <p className="text-sm text-[#6C757D]">Author custom payload configurations for each selected capability permutation.</p>
                </div>
                
                {combinations.length === 0 ? (
                    <div className="p-20 text-center space-y-4 border-2 border-dashed border-[#DEE2E6] rounded-3xl">
                      <Terminal className="mx-auto text-[#ADB5BD]" size={40} />
                      <p className="text-[#6C757D]">No SDK Languages were selected in Step 3.</p>
                    </div>
                ) : (
                    <div className="flex gap-6 h-[500px] border border-[#DEE2E6] rounded-2xl overflow-hidden bg-white">
                       {/* Left Master List */}
                       <div className="w-1/3 border-r border-[#DEE2E6] bg-[#F8F9FA] overflow-y-auto">
                          {combinations.map(combo => {
                             const isActive = activeComboId === combo.id;
                             return (
                               <button 
                                 key={combo.id}
                                 onClick={() => setActiveComboId(combo.id)}
                                 className={cn("w-full text-left p-4 border-b border-[#DEE2E6] transition-colors flex flex-col gap-1.5", isActive ? "bg-white border-l-4 border-l-[#0D6EFD]" : "hover:bg-[#E9ECEF] border-l-4 border-l-transparent")}
                               >
                                  <span className="font-bold text-sm capitalize text-[#1A1A1A]">{combo.language}</span>
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-[10px] bg-[#E7F1FF] text-[#0D6EFD] px-1.5 py-0.5 rounded font-medium">{combo.framework}</span>
                                    <span className="text-[10px] bg-[#D1E7DD] text-[#0F5132] px-1.5 py-0.5 rounded font-medium">{combo.buildTool}</span>
                                  </div>
                               </button>
                             )
                          })}
                       </div>

                       {/* Right Detail Pane */}
                       <div className="w-2/3 p-6 overflow-y-auto bg-white flex flex-col gap-6">
                          {activeComboId && (() => {
                             const active = comboPayloads[activeComboId] || { dependencies: '', envVars: [], snippetTemplate: '' };
                             const updateCombo = (updates: any) => {
                                setComboPayloads(prev => ({
                                  ...prev,
                                  [activeComboId]: { ...active, ...updates }
                                }));
                             };

                             return (
                               <div className="space-y-6">
                                  {/* Dependencies */}
                                  <div className="space-y-2">
                                     <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2"><Box size={14} /> Dependency Payload</label>
                                     <textarea 
                                        value={active.dependencies}
                                        onChange={e => updateCombo({ dependencies: e.target.value })}
                                        placeholder="e.g. npm install pg OR <dependency>...</dependency>"
                                        className="w-full h-24 p-3 font-mono text-[11px] bg-[#1A1A1A] text-[#ADB5BD] border border-[#343A40] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                                     />
                                  </div>

                                  {/* Env Vars Builder */}
                                  <div className="space-y-2">
                                     <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2"><Terminal size={14} /> Environment Variables</label>
                                     <div className="space-y-2 pt-2">
                                        {active.envVars.map((ev, idx) => (
                                          <div key={idx} className="flex gap-2">
                                            <input 
                                              value={ev.key}
                                              onChange={e => {
                                                const ne = [...active.envVars];
                                                ne[idx].key = e.target.value;
                                                updateCombo({ envVars: ne });
                                              }}
                                              placeholder="KEY (e.g. DB_URL)"
                                              className="w-1/3 px-3 py-2 text-[11px] font-mono border border-[#DEE2E6] rounded-lg bg-[#F8F9FA] focus:outline-none focus:border-[#0D6EFD]"
                                            />
                                            <input 
                                              value={ev.value}
                                              onChange={e => {
                                                const ne = [...active.envVars];
                                                ne[idx].value = e.target.value;
                                                updateCombo({ envVars: ne });
                                              }}
                                              placeholder="Template Value (e.g. {{host}}:{{port}})"
                                              className="flex-1 px-3 py-2 text-[11px] font-mono border border-[#DEE2E6] rounded-lg bg-[#F8F9FA] focus:outline-none focus:border-[#0D6EFD]"
                                            />
                                            <button 
                                              onClick={() => {
                                                const ne = active.envVars.filter((_, i) => i !== idx);
                                                updateCombo({ envVars: ne });
                                              }}
                                              className="px-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            ><X size={14}/></button>
                                          </div>
                                        ))}
                                        <button 
                                          onClick={() => updateCombo({ envVars: [...active.envVars, {key: '', value: ''}] })}
                                          className="text-[11px] font-bold text-[#0D6EFD] hover:underline pt-1"
                                        >+ Add Env Var Mapping</button>
                                     </div>
                                  </div>

                                  {/* Snippet Template */}
                                  <div className="space-y-2">
                                     <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2"><Code size={14} /> Connection Snippet (Mustache)</label>
                                     <textarea 
                                        value={active.snippetTemplate}
                                        onChange={e => updateCombo({ snippetTemplate: e.target.value })}
                                        placeholder="const client = new Client({ host: '{{host}}' })"
                                        className="w-full h-32 p-3 font-mono text-[11px] bg-[#F8F9FA] border border-[#DEE2E6] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                                     />
                                  </div>
                               </div>
                             );
                          })()}
                       </div>
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA] sticky bottom-0 z-10">
          <button
            type="button"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-3 flex items-center gap-2 font-bold text-[#6C757D] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#1A1A1A] transition-colors"
          >
            <ChevronLeft size={20} /> Back
          </button>
          
          {step < 4 ? (
            <button
              type="button"
              onClick={() => selectedType && setStep(step + 1)}
              disabled={!selectedType}
              className="px-8 py-3 bg-[#0D6EFD] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next Step <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="px-8 py-3 bg-[#198754] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#157347] transition-all shadow-lg shadow-[#198754]/20"
            >
              Complete Registration <Check size={20} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
