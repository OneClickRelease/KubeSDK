import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KubeSDKLocalRun } from '../../../types';
import { 
  FileCode2, Server, Cpu, Cloud, Box, Settings, 
  Plus, Trash2, Edit3, Save, Check, RefreshCw, 
  AlertCircle, ChevronRight, Layers, FileText, Code2, Globe, Shield
} from 'lucide-react';
import * as yaml from 'js-yaml';
import { cn } from '../../lib/utils';

interface SettingsViewProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
}

type ConfigTab = 'compilation' | 'baremetal' | 'hypervisors' | 'clouds' | 'containers' | 'raw-yaml';

export const SettingsView = ({ config, setConfig }: SettingsViewProps) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('compilation');
  
  // Infrastructure configs loaded from backend
  const [loading, setLoading] = useState(false);
  const [baremetalPresets, setBaremetalPresets] = useState<any[]>([]);
  const [hypervisorPlatforms, setHypervisorPlatforms] = useState<any[]>([]);
  const [cloudProviders, setCloudProviders] = useState<any[]>([]);
  const [virtualContainers, setVirtualContainers] = useState<any[]>([]);
  const [generalSettings, setGeneralSettings] = useState<any>({});

  // Raw YAML editor state
  const [selectedYamlFile, setSelectedYamlFile] = useState<string>('baremetal-presets.yaml');
  const [rawYamlContent, setRawYamlContent] = useState<string>('');
  const [rawYamlError, setRawYamlError] = useState<string | null>(null);
  const [rawYamlSaved, setRawYamlSaved] = useState<boolean>(false);
  const [isSavingRaw, setIsSavingRaw] = useState<boolean>(false);

  // Modal State for adding new config
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetType, setModalTargetType] = useState<'baremetal' | 'hypervisor' | 'cloud' | 'container'>('baremetal');
  const [newItemData, setNewItemData] = useState<any>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all infrastructure configs
  const fetchInfraConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/infrastructure');
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setBaremetalPresets(d.baremetalPresets || []);
        setHypervisorPlatforms(d.hypervisorPlatforms || []);
        setCloudProviders(d.cloudProviders || []);
        setVirtualContainers(d.virtualContainers || []);
        setGeneralSettings(d.generalSettings || {});
      }
    } catch (e) {
      console.error('Failed to fetch infrastructure configs', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch raw YAML
  const fetchRawYaml = async (filename: string) => {
    try {
      const res = await fetch(`/api/config/raw/${filename}`);
      if (res.ok) {
        const json = await res.json();
        setRawYamlContent(json.content || '');
        setRawYamlError(null);
      }
    } catch (e) {
      console.error('Failed to fetch raw YAML', e);
    }
  };

  useEffect(() => {
    fetchInfraConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'raw-yaml') {
      fetchRawYaml(selectedYamlFile);
    }
  }, [activeTab, selectedYamlFile]);

  // Handle saving raw YAML
  const handleSaveRawYaml = async () => {
    setIsSavingRaw(true);
    setRawYamlError(null);
    try {
      // Validate syntax locally first
      yaml.load(rawYamlContent);

      const res = await fetch(`/api/config/raw/${selectedYamlFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawYamlContent })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save YAML');
      }

      setRawYamlSaved(true);
      setTimeout(() => setRawYamlSaved(false), 2500);
      fetchInfraConfigs();
    } catch (err: any) {
      setRawYamlError(err.message || 'Invalid YAML format');
    } finally {
      setIsSavingRaw(false);
    }
  };

  // Handle Deleting an item
  const handleDeleteItem = async (targetType: 'baremetal' | 'hypervisor' | 'cloud' | 'container', id: string) => {
    if (!window.confirm(`Are you sure you want to delete configuration preset "${id}"?`)) return;
    try {
      const res = await fetch(`/api/config/infrastructure/${targetType}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInfraConfigs();
      }
    } catch (e) {
      console.error('Failed to delete config', e);
    }
  };

  // Open add modal
  const handleOpenAddModal = (targetType: 'baremetal' | 'hypervisor' | 'cloud' | 'container') => {
    setModalTargetType(targetType);
    setModalError(null);
    if (targetType === 'baremetal') {
      setNewItemData({
        vendor: 'Custom',
        name: '',
        version: 'v1.0',
        category: 'Edge & SBC',
        vcpu: 4,
        memoryGi: 8,
        diskGi: 64,
        arch: 'x86_64',
        desc: ''
      });
    } else if (targetType === 'hypervisor') {
      setNewItemData({
        name: '',
        version: 'v1.0',
        engine: 'KVM / QEMU',
        category: 'Open-Source & Linux',
        desc: ''
      });
    } else if (targetType === 'cloud') {
      setNewItemData({
        name: '',
        badge: 'Cloud VM',
        color: 'border-indigo-500 bg-indigo-50/50 text-indigo-700',
        defaultRegion: 'us-east-1',
        regionsStr: 'us-east-1: US East, us-west-2: US West, eu-west-1: Europe',
        instanceTypesStr: 'dev-small: 2 vCPU / 4GB RAM / Dev, dev-standard: 4 vCPU / 16GB RAM / General',
        credentialsStr: 'apiKey: API Token: secret, projectId: Project ID: text'
      });
    } else {
      setNewItemData({
        name: '',
        engineType: 'docker',
        category: 'Container Runtime',
        defaultVcpu: 2,
        defaultMemoryGi: 4,
        defaultDiskGi: 20,
        desc: ''
      });
    }
    setIsAddModalOpen(true);
  };

  // Submit add modal
  const handleSaveModalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      let payload: any = { ...newItemData };

      if (modalTargetType === 'baremetal') {
        if (!payload.name || !payload.vendor) throw new Error('Vendor and Model Name are required');
        payload.vcpu = Number(payload.vcpu) || 2;
        payload.memoryGi = Number(payload.memoryGi) || 4;
        payload.diskGi = Number(payload.diskGi) || 30;
      } else if (modalTargetType === 'hypervisor') {
        if (!payload.name) throw new Error('Hypervisor Platform Name is required');
      } else if (modalTargetType === 'cloud') {
        if (!payload.name) throw new Error('Cloud Provider Name is required');
        
        // Parse regions
        if (payload.regionsStr) {
          payload.regions = payload.regionsStr.split(',').map((r: string) => {
            const [id, name] = r.split(':').map((s: string) => s.trim());
            return { id: id || 'default-region', name: name || id };
          });
        }
        // Parse instance types
        if (payload.instanceTypesStr) {
          payload.instanceTypes = payload.instanceTypesStr.split(',').map((t: string) => {
            const parts = t.split(':').map((s: string) => s.trim());
            const id = parts[0] || 'dev-std';
            const details = parts[1] || '4 vCPU / 16GB RAM';
            return {
              id,
              name: id,
              vcpu: 4,
              memGi: 16,
              desc: details,
              category: 'Dev Optimized'
            };
          });
        }
        // Parse credentials
        if (payload.credentialsStr) {
          payload.credentialFields = payload.credentialsStr.split(',').map((c: string) => {
            const [key, label, type] = c.split(':').map((s: string) => s.trim());
            return {
              key: key || 'apiToken',
              label: label || key,
              placeholder: `Enter ${label || key}...`,
              isSecret: type === 'secret',
              desc: `Authentication field for ${payload.name}`
            };
          });
        }
      } else if (modalTargetType === 'container') {
        if (!payload.name) throw new Error('Container Engine Name is required');
        payload.defaultVcpu = Number(payload.defaultVcpu) || 2;
        payload.defaultMemoryGi = Number(payload.defaultMemoryGi) || 4;
        payload.defaultDiskGi = Number(payload.defaultDiskGi) || 20;
      }

      const res = await fetch(`/api/config/infrastructure/${modalTargetType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add configuration preset');
      }

      await fetchInfraConfigs();
      setIsAddModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-20 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <Settings className="text-[#0D6EFD]" size={26} />
            Global Settings & Infrastructure Configuration
          </h2>
          <p className="text-xs text-[#6C757D] mt-0.5">
            Manage pipeline compiler rules and declarative YAML presets under <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold">config/</code> for all infrastructure targets.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInfraConfigs}
          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#495057] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Reload Configs</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('compilation')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'compilation'
              ? "bg-[#0D6EFD] text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Layers size={15} />
          <span>Compilation & Languages</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('baremetal')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'baremetal'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Server size={15} />
          <span>Baremetal Hardware ({baremetalPresets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hypervisors')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'hypervisors'
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Cpu size={15} />
          <span>Hypervisor Platforms ({hypervisorPlatforms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clouds')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'clouds'
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Cloud size={15} />
          <span>Cloud Providers ({cloudProviders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('containers')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'containers'
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Box size={15} />
          <span>Virtual Containers ({virtualContainers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raw-yaml')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'raw-yaml'
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-[#6C757D] hover:bg-gray-100"
          )}
        >
          <Code2 size={15} />
          <span>Raw YAML Editor</span>
        </button>
      </div>

      {/* Tab 1: Compilation & SDK Languages */}
      {activeTab === 'compilation' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-5">
            <h3 className="font-bold text-base border-b pb-3 flex items-center gap-2 text-[#1A1A1A]">
              <Layers size={18} className="text-[#0D6EFD]" />
              Pipeline Compilation Rules (<code className="font-mono text-xs text-gray-500">config/general-settings.yaml</code>)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider">
                  Ignored Namespaces (Comma-Separated)
                </label>
                <p className="text-[11px] text-[#6C757D]">
                  These namespaces and their workloads will be excluded from compiler outputs.
                </p>
                <input 
                  type="text" 
                  value={(config.wizard.ignoredNamespaces || []).join(', ')}
                  onChange={(e) => {
                    const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, ignoredNamespaces: val } }));
                  }}
                  placeholder="e.g. kube-system, kube-public, local-path-storage"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DEE2E6] font-mono outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider">
                  Import Kind Whitelist (Comma-Separated)
                </label>
                <p className="text-[11px] text-[#6C757D]">
                  Only resources matching these Kubernetes kinds will be parsed from live clusters or files.
                </p>
                <input 
                  type="text" 
                  value={(config.wizard.kindWhitelist || []).join(', ')}
                  onChange={(e) => {
                    const val = e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                    setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, kindWhitelist: val } }));
                  }}
                  placeholder="e.g. pod, service, deployment, statefulset"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DEE2E6] font-mono outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="text-[#0D6EFD]" size={18} />
                <h3 className="font-bold text-base text-[#1A1A1A]">Recognized SDK Languages & Frameworks</h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">import/supports/languages.yaml</span>
            </div>
            <p className="text-xs text-[#6C757D]">
              Languages, web frameworks, and build tools automatically loaded from YAML for capability matching.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-700 flex items-center justify-between">
              <span>View or edit full language definitions in the <strong>Raw YAML Editor</strong> tab.</span>
              <button
                type="button"
                onClick={() => { setSelectedYamlFile('languages.yaml'); setActiveTab('raw-yaml'); }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                Open languages.yaml
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Baremetal Hardware Presets */}
      {activeTab === 'baremetal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div>
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Server size={16} className="text-indigo-600" />
                Baremetal Hardware Presets (<code className="font-mono text-xs text-indigo-700">config/baremetal-presets.yaml</code>)
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                Hardware models across Raspberry Pi, HPE, Dell, Cisco, Advantech, IBM, and custom appliances with auto-tuning kernel profiles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal('baremetal')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              <span>Add Baremetal Preset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {baremetalPresets.map((hw: any) => (
              <div key={hw.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-2.5 relative group hover:border-indigo-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">{hw.vendor}</span>
                      <h5 className="text-xs font-bold text-[#1A1A1A]">{hw.name}</h5>
                      <span className="text-[10px] text-gray-500 font-mono">{hw.version}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem('baremetal', hw.id)}
                      className="text-gray-300 hover:text-red-600 transition-colors p-1"
                      title="Delete Preset"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6C757D] mt-1 line-clamp-2">{hw.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-600">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">{hw.vcpu} vCPU</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">{hw.memoryGi} GB RAM</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">{hw.diskGi} GB Disk</span>
                  <span className="text-indigo-600 font-bold">{hw.arch}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hypervisor Platforms */}
      {activeTab === 'hypervisors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
            <div>
              <h4 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <Cpu size={16} className="text-purple-600" />
                Hypervisor Platforms (<code className="font-mono text-xs text-purple-700">config/hypervisor-platforms.yaml</code>)
              </h4>
              <p className="text-xs text-purple-800/80 mt-0.5">
                KubeVirt, Harvester, VMware ESXi, Proxmox VE, OpenShift Virt, Nutanix, KVM, Hyper-V, and workstation engines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal('hypervisor')}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              <span>Add Hypervisor Engine</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hypervisorPlatforms.map((hyp: any) => (
              <div key={hyp.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-2.5 relative hover:border-purple-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{hyp.category}</span>
                      <h5 className="text-xs font-bold text-[#1A1A1A] mt-1">{hyp.name}</h5>
                      <span className="text-[10px] text-gray-500 font-mono">{hyp.version} ({hyp.engine})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem('hypervisor', hyp.id)}
                      className="text-gray-300 hover:text-red-600 transition-colors p-1"
                      title="Delete Platform"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6C757D] mt-1.5">{hyp.desc}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-500">
                  ID: <span className="font-bold text-gray-700">{hyp.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Cloud Providers */}
      {activeTab === 'clouds' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
            <div>
              <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                <Cloud size={16} className="text-sky-600" />
                Cloud Providers & Dev Specs (<code className="font-mono text-xs text-sky-700">config/cloud-providers.yaml</code>)
              </h4>
              <p className="text-xs text-sky-800/80 mt-0.5">
                AWS, GCP, Azure, DigitalOcean, Hetzner, Oracle Cloud, and custom cloud providers with credential schemas and regions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal('cloud')}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              <span>Add Cloud Provider</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cloudProviders.map((cp: any) => (
              <div key={cp.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3 hover:border-sky-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", cp.color || 'bg-sky-50 text-sky-700 border-sky-200')}>
                        {cp.badge}
                      </span>
                      <h5 className="text-xs font-bold text-[#1A1A1A] mt-1.5">{cp.name}</h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem('cloud', cp.id)}
                      className="text-gray-300 hover:text-red-600 transition-colors p-1"
                      title="Delete Provider"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-[#6C757D]">
                    <div className="flex items-center gap-1">
                      <Globe size={11} className="text-gray-400" />
                      <span><strong>{(cp.regions || []).length}</strong> Datacenter Regions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={11} className="text-gray-400" />
                      <span><strong>{(cp.instanceTypes || []).length}</strong> Machine Sizing Presets</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={11} className="text-gray-400" />
                      <span><strong>{(cp.credentialFields || []).length}</strong> Auth Credential Fields</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-500">
                  <span>Default: <strong>{cp.defaultRegion}</strong></span>
                  <span className="font-bold text-sky-600">{cp.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Virtual Containers */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <Box size={16} className="text-emerald-600" />
                Virtual Container Engines (<code className="font-mono text-xs text-emerald-700">config/virtual-containers.yaml</code>)
              </h4>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Docker, Podman, k3d, KinD, nerdctl, and lightweight containerized sandbox runtimes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal('container')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              <span>Add Container Engine</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {virtualContainers.map((eng: any) => (
              <div key={eng.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-2.5 hover:border-emerald-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{eng.category}</span>
                      <h5 className="text-xs font-bold text-[#1A1A1A] mt-1">{eng.name}</h5>
                      <span className="text-[10px] text-gray-500 font-mono">Engine: {eng.engineType}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem('container', eng.id)}
                      className="text-gray-300 hover:text-red-600 transition-colors p-1"
                      title="Delete Engine"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6C757D] mt-1.5">{eng.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-600">
                  <span>{eng.defaultVcpu} vCPU</span>
                  <span>{eng.defaultMemoryGi} GB RAM</span>
                  <span>{eng.defaultDiskGi} GB Disk</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Raw YAML Editor */}
      {activeTab === 'raw-yaml' && (
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <Code2 size={20} className="text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1A1A1A]">Direct YAML Configuration File Editor</h4>
                <p className="text-[11px] text-[#6C757D]">Edit declarative definitions stored in the <code className="font-mono text-indigo-600 font-bold">config/</code> directory with live syntax verification.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedYamlFile}
                onChange={e => setSelectedYamlFile(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none"
              >
                <option value="baremetal-presets.yaml">config/baremetal-presets.yaml</option>
                <option value="hypervisor-platforms.yaml">config/hypervisor-platforms.yaml</option>
                <option value="cloud-providers.yaml">config/cloud-providers.yaml</option>
                <option value="virtual-containers.yaml">config/virtual-containers.yaml</option>
                <option value="general-settings.yaml">config/general-settings.yaml</option>
                <option value="languages.yaml">import/supports/languages.yaml</option>
              </select>

              <button
                type="button"
                onClick={handleSaveRawYaml}
                disabled={isSavingRaw}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
              >
                {rawYamlSaved ? <Check size={14} className="text-emerald-300" /> : <Save size={14} />}
                <span>{rawYamlSaved ? 'Saved!' : 'Save YAML'}</span>
              </button>
            </div>
          </div>

          {rawYamlError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-mono">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{rawYamlError}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              value={rawYamlContent}
              onChange={e => setRawYamlContent(e.target.value)}
              rows={24}
              spellCheck={false}
              className="w-full p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed outline-none border border-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Interactive Modal to Add New Target Config */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-sky-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {modalTargetType === 'baremetal' && <Server size={18} className="text-indigo-600" />}
                  {modalTargetType === 'hypervisor' && <Cpu size={18} className="text-purple-600" />}
                  {modalTargetType === 'cloud' && <Cloud size={18} className="text-sky-600" />}
                  {modalTargetType === 'container' && <Box size={18} className="text-emerald-600" />}
                  <h4 className="font-bold text-sm text-[#1A1A1A]">
                    Add New {modalTargetType === 'baremetal' ? 'Baremetal Preset' : modalTargetType === 'hypervisor' ? 'Hypervisor Platform' : modalTargetType === 'cloud' ? 'Cloud Provider' : 'Container Engine'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveModalItem} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Target Specific Inputs */}
                {modalTargetType === 'baremetal' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Vendor Name</label>
                        <input
                          type="text"
                          value={newItemData.vendor || ''}
                          onChange={e => setNewItemData({ ...newItemData, vendor: e.target.value })}
                          placeholder="e.g. Supermicro, Lenovo, Cisco"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Model Name</label>
                        <input
                          type="text"
                          value={newItemData.name || ''}
                          onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                          placeholder="e.g. SuperServer 2U"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">vCPU Cores</label>
                        <input
                          type="number"
                          min={1}
                          max={256}
                          value={newItemData.vcpu}
                          onChange={e => setNewItemData({ ...newItemData, vcpu: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">RAM (GB)</label>
                        <input
                          type="number"
                          min={1}
                          max={1024}
                          value={newItemData.memoryGi}
                          onChange={e => setNewItemData({ ...newItemData, memoryGi: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Disk (GB)</label>
                        <input
                          type="number"
                          min={10}
                          max={4000}
                          value={newItemData.diskGi}
                          onChange={e => setNewItemData({ ...newItemData, diskGi: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">CPU Arch</label>
                        <select
                          value={newItemData.arch}
                          onChange={e => setNewItemData({ ...newItemData, arch: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg"
                        >
                          <option value="x86_64">x86_64</option>
                          <option value="aarch64">aarch64</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Description</label>
                      <input
                        type="text"
                        value={newItemData.desc || ''}
                        onChange={e => setNewItemData({ ...newItemData, desc: e.target.value })}
                        placeholder="Specifications description..."
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </>
                )}

                {modalTargetType === 'hypervisor' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Hypervisor Name</label>
                        <input
                          type="text"
                          value={newItemData.name || ''}
                          onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                          placeholder="e.g. SmartOS / bhyve, XCP-ng"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Version</label>
                        <input
                          type="text"
                          value={newItemData.version || ''}
                          onChange={e => setNewItemData({ ...newItemData, version: e.target.value })}
                          placeholder="e.g. 8.2+"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Virtualization Engine</label>
                      <input
                        type="text"
                        value={newItemData.engine || ''}
                        onChange={e => setNewItemData({ ...newItemData, engine: e.target.value })}
                        placeholder="e.g. Xen Hypervisor, KVM, bhyve"
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Description</label>
                      <textarea
                        value={newItemData.desc || ''}
                        onChange={e => setNewItemData({ ...newItemData, desc: e.target.value })}
                        rows={2}
                        placeholder="Hypervisor capabilities description..."
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </>
                )}

                {modalTargetType === 'cloud' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Cloud Provider Name</label>
                        <input
                          type="text"
                          value={newItemData.name || ''}
                          onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                          placeholder="e.g. Linode / Akamai Cloud, Scaleway"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Badge Tag</label>
                        <input
                          type="text"
                          value={newItemData.badge || ''}
                          onChange={e => setNewItemData({ ...newItemData, badge: e.target.value })}
                          placeholder="e.g. Linode Instances"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">
                        Datacenter Regions (format: <code className="font-mono text-sky-700">region_id: Region Name</code>, comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newItemData.regionsStr || ''}
                        onChange={e => setNewItemData({ ...newItemData, regionsStr: e.target.value })}
                        placeholder="us-east: Newark NJ, us-central: Dallas TX, eu-west: London UK"
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">
                        Credential Fields (format: <code className="font-mono text-sky-700">fieldKey: Label: secret|text</code>, comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newItemData.credentialsStr || ''}
                        onChange={e => setNewItemData({ ...newItemData, credentialsStr: e.target.value })}
                        placeholder="apiToken: API Personal Access Token: secret"
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-mono outline-none"
                      />
                    </div>
                  </>
                )}

                {modalTargetType === 'container' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Runtime Name</label>
                        <input
                          type="text"
                          value={newItemData.name || ''}
                          onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                          placeholder="e.g. Microshift Container, Colima"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Engine Type</label>
                        <input
                          type="text"
                          value={newItemData.engineType || ''}
                          onChange={e => setNewItemData({ ...newItemData, engineType: e.target.value })}
                          placeholder="e.g. docker, containerd, podman"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Description</label>
                      <input
                        type="text"
                        value={newItemData.desc || ''}
                        onChange={e => setNewItemData({ ...newItemData, desc: e.target.value })}
                        placeholder="Runtime description..."
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save to config/*.yaml</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
