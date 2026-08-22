import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server, Cpu, Cloud, Box, Layers, Download, CheckCircle2,
  Terminal, ShieldCheck, ChevronDown, ChevronRight, Sparkles,
  Zap, Copy, RefreshCw, AlertTriangle, Globe, Lock, Info, Check,
  Key, Eye, EyeOff, DollarSign, Clock, Shield, Plus, Save, Trash2,
  ArrowRight, ArrowLeft, CheckCircle, Database, HelpCircle, HardDrive
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  HARDWARE_PRESETS,
  HYPERVISOR_PLATFORMS,
  CLOUD_PROVIDERS,
  VM_CATEGORY_CONFIG,
  VM_ROLE_BADGES,
  HardwarePreset,
  HypervisorPlatform,
  CloudProviderConfig,
  VMNodePool,
  VMNodeCategory,
  InfraType,
  OrchestratorType,
  TopologyType
} from '../wizard/steps/OrchestratorDeploymentCollapsible';

interface DefineKubeInfraViewProps {
  onApplyCredentials?: (url: string) => void;
  onNavigateToWizard?: () => void;
}

const WIZARD_STEPS = [
  { id: 'target', title: 'Target & Mode', desc: 'Select Infrastructure Type & Airgap/Online Mode' },
  { id: 'config', title: 'Platform Specs', desc: 'Hardware, Hypervisors, Cloud & Node Pools' },
  { id: 'topology', title: 'Scale & Topology', desc: 'Node Count, Quorum Zones & Networking' },
  { id: 'orchestrator', title: 'Orchestrator', desc: 'K3s, RKE2, MicroK8s & Airgap Mirror' },
  { id: 'provision', title: 'Review & Deploy', desc: 'Generate Scripts & Download .zip Package' }
];

export const DefineKubeInfraView = ({
  onApplyCredentials,
  onNavigateToWizard
}: DefineKubeInfraViewProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // --- Step 1: Infrastructure Type & Mode ---
  const [infraType, setInfraType] = useState<InfraType>('baremetal');
  const [isAirgap, setIsAirgap] = useState<boolean>(true);

  // --- Dynamic configuration lists loaded from config/*.yaml ---
  const [hardwareList, setHardwareList] = useState<HardwarePreset[]>(HARDWARE_PRESETS);
  const [hypervisorList, setHypervisorList] = useState<HypervisorPlatform[]>(HYPERVISOR_PLATFORMS);
  const [cloudList, setCloudList] = useState<CloudProviderConfig[]>(CLOUD_PROVIDERS);

  // Load configs on mount
  useEffect(() => {
    fetch('/api/config/infrastructure')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json?.data) {
          if (json.data.baremetalPresets?.length) setHardwareList(json.data.baremetalPresets);
          if (json.data.hypervisorPlatforms?.length) setHypervisorList(json.data.hypervisorPlatforms);
          if (json.data.cloudProviders?.length) setCloudList(json.data.cloudProviders);
        }
      })
      .catch(err => console.log('Using default local presets', err));
  }, []);

  // --- Step 2: Target-specific Configuration ---
  // Baremetal
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('All');
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('rpi-5-8gb');

  // VM / Hypervisor
  const [selectedHypervisor, setSelectedHypervisor] = useState<string>('harvester');
  const [vmMode, setVmMode] = useState<'symmetrical' | 'asymmetrical'>('symmetrical');
  const [vmNodePools, setVmNodePools] = useState<VMNodePool[]>([
    { id: 'pool-cp', name: 'Control Plane Pool', category: 'control-plane', count: 3, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' },
    { id: 'pool-workers', name: 'General Worker Pool', category: 'worker', count: 4, vcpu: 8, memoryGi: 16, diskGi: 100, arch: 'x86_64' },
    { id: 'pool-gpu', name: 'AI/ML GPU Acceleration', category: 'gpu', count: 1, vcpu: 16, memoryGi: 64, diskGi: 200, arch: 'x86_64', gpuModel: 'NVIDIA L40S' }
  ]);

  // Cloud
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>('aws');
  const [cloudRegion, setCloudRegion] = useState<string>('us-east-1');
  const [cloudInstanceType, setCloudInstanceType] = useState<string>('t4g.xlarge');
  const [cloudCredentials, setCloudCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [cloudUseSpot, setCloudUseSpot] = useState<boolean>(true);
  const [cloudAutoShutdown, setCloudAutoShutdown] = useState<boolean>(true);
  const [cloudShutdownHour, setCloudShutdownHour] = useState<string>('20:00');
  const [cloudAllowedCidr, setCloudAllowedCidr] = useState<string>('0.0.0.0/0');
  const [cloudStorageType, setCloudStorageType] = useState<string>('gp3');
  const [cloudStorageSize, setCloudStorageSize] = useState<number>(50);

  // Common Hardware Specs
  const [vcpu, setVcpu] = useState<number>(4);
  const [memoryGi, setMemoryGi] = useState<number>(8);
  const [diskGi, setDiskGi] = useState<number>(64);
  const [osArch, setOsArch] = useState<string>('aarch64');

  // --- Step 3: Scale, Topology & HA ---
  const [topology, setTopology] = useState<TopologyType>('single-node');
  const [nodesCount, setNodesCount] = useState<number>(1);
  const [storageTier, setStorageTier] = useState<'local' | 'ceph' | 'longhorn' | 'cloud'>('local');
  const [podCidr, setPodCidr] = useState<string>('10.42.0.0/16');
  const [serviceCidr, setServiceCidr] = useState<string>('10.43.0.0/16');
  const [clusterDomain, setClusterDomain] = useState<string>('cluster.local');

  // --- Step 4: Orchestrator Engine ---
  const [orchestrator, setOrchestrator] = useState<OrchestratorType>('k3s');
  const [includeWorkloadImages, setIncludeWorkloadImages] = useState<boolean>(true);
  const [privateRegistryUrl, setPrivateRegistryUrl] = useState<string>('');

  // --- Step 5: Provisioning Execution ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick Inline Add Modal
  const [isInlineAddModalOpen, setIsInlineAddModalOpen] = useState(false);
  const [inlineModalType, setInlineModalType] = useState<'baremetal' | 'hypervisor' | 'cloud' | 'container'>('baremetal');
  const [inlineItemData, setInlineItemData] = useState<any>({});
  const [inlineModalError, setInlineModalError] = useState<string | null>(null);
  const [isInlineSaving, setIsInlineSaving] = useState(false);

  // Helpers
  const activeCloud = useMemo(() => {
    return cloudList.find(c => c.id === selectedCloudProvider) || cloudList[0] || CLOUD_PROVIDERS[0];
  }, [cloudList, selectedCloudProvider]);

  const activeCloudInstanceSpec = useMemo(() => {
    return activeCloud.instanceTypes.find(i => i.id === cloudInstanceType) || activeCloud.instanceTypes[0];
  }, [activeCloud, cloudInstanceType]);

  const activeHardware = useMemo(() => {
    return hardwareList.find(h => h.id === selectedHardwareId) || hardwareList[0] || null;
  }, [hardwareList, selectedHardwareId]);

  const activeHypervisor = useMemo(() => {
    return hypervisorList.find(h => h.id === selectedHypervisor) || hypervisorList[0] || HYPERVISOR_PLATFORMS[0];
  }, [hypervisorList, selectedHypervisor]);

  const handleSelectHardware = (hw: HardwarePreset) => {
    setSelectedHardwareId(hw.id);
    setVcpu(hw.vcpu);
    setMemoryGi(hw.memoryGi);
    setDiskGi(hw.diskGi);
    setOsArch(hw.arch);
  };

  const handleSelectCloudProvider = (providerId: string) => {
    setSelectedCloudProvider(providerId);
    const provider = cloudList.find(c => c.id === providerId) || cloudList[0] || CLOUD_PROVIDERS[0];
    setCloudRegion(provider.defaultRegion);
    setCloudInstanceType(provider.instanceTypes[0].id);
    setVcpu(provider.instanceTypes[0].vcpu);
    setMemoryGi(provider.instanceTypes[0].memGi);
    setOsArch(provider.instanceTypes[0].id.includes('t4g') || provider.instanceTypes[0].id.includes('A1.Flex') ? 'aarch64' : 'x86_64');
  };

  const handleSelectCloudInstanceType = (instId: string) => {
    setCloudInstanceType(instId);
    const inst = activeCloud.instanceTypes.find(i => i.id === instId);
    if (inst) {
      setVcpu(inst.vcpu);
      setMemoryGi(inst.memGi);
      setOsArch(inst.id.includes('t4g') || inst.id.includes('A1.Flex') ? 'aarch64' : 'x86_64');
    }
  };

  const toggleSecretVisibility = (fieldKey: string) => {
    setShowSecrets(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const handleAddVMPool = () => {
    const newId = `pool-${Date.now()}`;
    setVmNodePools(prev => [
      ...prev,
      { id: newId, name: `Worker Pool ${prev.length + 1}`, category: 'worker', count: 2, vcpu: 4, memoryGi: 8, diskGi: 50, arch: 'x86_64' }
    ]);
  };

  const handleRemoveVMPool = (id: string) => {
    if (vmNodePools.length <= 1) return;
    setVmNodePools(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateVMPool = (id: string, updates: Partial<VMNodePool>) => {
    setVmNodePools(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const clusterMetrics = useMemo(() => {
    if (infraType === 'cloud-vm') {
      const count = topology === 'single-node' ? 1 : nodesCount;
      return {
        totalVms: count,
        totalVcpu: count * (activeCloudInstanceSpec.vcpu || vcpu),
        totalMemGi: count * (activeCloudInstanceSpec.memGi || memoryGi),
        totalDiskGi: count * cloudStorageSize,
        gpuCount: activeCloudInstanceSpec.gpu ? count : 0
      };
    }

    if (infraType !== 'hypervisor-vm' || vmMode === 'symmetrical') {
      const count = topology === 'single-node' ? 1 : nodesCount;
      return {
        totalVms: count,
        totalVcpu: count * (Number(vcpu) || 2),
        totalMemGi: count * (Number(memoryGi) || 4),
        totalDiskGi: count * (Number(diskGi) || 50),
        gpuCount: 0
      };
    }

    return vmNodePools.reduce(
      (acc, pool) => {
        const count = Number(pool.count) || 1;
        acc.totalVms += count;
        acc.totalVcpu += count * (Number(pool.vcpu) || 2);
        acc.totalMemGi += count * (Number(pool.memoryGi) || 4);
        acc.totalDiskGi += count * (Number(pool.diskGi) || 50);
        if (pool.category === 'gpu') acc.gpuCount += count;
        return acc;
      },
      { totalVms: 0, totalVcpu: 0, totalMemGi: 0, totalDiskGi: 0, gpuCount: 0 }
    );
  }, [infraType, vmMode, topology, nodesCount, vcpu, memoryGi, diskGi, vmNodePools, activeCloudInstanceSpec, cloudStorageSize]);

  // Recommended Orchestrator Engine Calculation
  const recommendedEngine: OrchestratorType = useMemo(() => {
    if (infraType === 'cloud-vm') return 'k3s';
    if (vcpu <= 2 || memoryGi <= 4) return 'k3s';
    if (topology === 'multi-zone-quorum' || topology === 'multi-zone') return 'rke2';
    if (infraType === 'docker-cluster') return 'minikube';
    return 'k3s';
  }, [infraType, vcpu, memoryGi, topology]);

  // Generate provisioning script
  const generatedScript = useMemo(() => {
    if (infraType === 'cloud-vm') {
      return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Cloud Dev Stage Provisioner (${activeCloud.name})
# Target Region: ${cloudRegion} | Instance Type: ${cloudInstanceType}
# Mode: ${cloudUseSpot ? 'Spot/Preemptible' : 'On-Demand'} | Auto-Shutdown: ${cloudAutoShutdown ? cloudShutdownHour : 'Disabled'}
# ==============================================================================
set -euo pipefail

echo "==> Authenticating against ${activeCloud.name} API..."
export CLOUD_REGION="${cloudRegion}"
export INSTANCE_TYPE="${cloudInstanceType}"
export SPOT_ENABLED="${cloudUseSpot}"

echo "==> Deploying Terraform Infrastructure Stage..."
terraform init
terraform apply -auto-approve -var="region=${cloudRegion}" -var="instance_type=${cloudInstanceType}"

echo "==> Provisioning ${orchestrator.toUpperCase()} Kubernetes Cluster on Cloud Host..."
curl -sfL https://get.k3s.io | sh -s - --cluster-cidr="${podCidr}" --service-cidr="${serviceCidr}"

echo "==> Setup Complete! API Server available at: https://\$(terraform output -raw public_ip):6443"
`;
    }

    if (isAirgap) {
      return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Air-Gapped Offline Cluster Provisioner
# Infrastructure: ${infraType.toUpperCase()} | Engine: ${orchestrator.toUpperCase()}
# Topology: ${topology} | Total Sizing: ${clusterMetrics.totalVcpu} vCPU, ${clusterMetrics.totalMemGi} GB RAM
# ==============================================================================
set -euo pipefail

ARCH="${osArch}"
INSTALL_DIR="/opt/kubesdk/offline"

echo "==> Unpacking air-gapped artifacts into \${INSTALL_DIR}..."
mkdir -p "\${INSTALL_DIR}/bin" "\${INSTALL_DIR}/images"

echo "==> Pre-loading container images into local containerd image store..."
find "\${INSTALL_DIR}/images" -type f -name "*.tar" -exec ctr -n k8s.io images import {} +

echo "==> Installing ${orchestrator.toUpperCase()} runtime offline without internet..."
INSTALL_${orchestrator.toUpperCase()}_SKIP_DOWNLOAD=true \${INSTALL_DIR}/bin/${orchestrator}-install.sh

echo "==> Cluster is ONLINE! Exporting kubeconfig..."
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
echo "==> API Server: https://127.0.0.1:6443"
`;
    }

    return `#!/usr/bin/env bash
# ==============================================================================
# KubeSDK Online Cluster Provisioner
# Target: ${infraType} | Engine: ${orchestrator} | Nodes: ${nodesCount}
# ==============================================================================
set -euo pipefail

echo "==> Installing ${orchestrator.toUpperCase()} Kubernetes Engine..."
curl -sfL https://get.k3s.io | sh -s - server --cluster-cidr="${podCidr}" --service-cidr="${serviceCidr}"

echo "==> Verifying Cluster Nodes Status..."
kubectl get nodes -o wide
echo "==> Ready for KubeSDK runtime connection!"
`;
  }, [infraType, activeCloud, cloudRegion, cloudInstanceType, cloudUseSpot, cloudAutoShutdown, cloudShutdownHour, podCidr, serviceCidr, isAirgap, osArch, orchestrator, topology, clusterMetrics, nodesCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    try {
      const payload = {
        infraType,
        orchestrator,
        topology,
        nodesCount: topology === 'single-node' ? 1 : nodesCount,
        vcpu: clusterMetrics.totalVcpu,
        memoryGi: clusterMetrics.totalMemGi,
        diskGi: clusterMetrics.totalDiskGi,
        arch: osArch,
        isAirgap,
        cloudProvider: infraType === 'cloud-vm' ? {
          providerId: selectedCloudProvider,
          providerName: activeCloud.name,
          region: cloudRegion,
          instanceType: cloudInstanceType,
          useSpot: cloudUseSpot,
          autoShutdown: cloudAutoShutdown,
          shutdownHour: cloudShutdownHour,
          allowedCidr: cloudAllowedCidr,
          storageType: cloudStorageType,
          storageSizeGi: cloudStorageSize,
          credentials: cloudCredentials
        } : undefined,
        vmNodePools: vmMode === 'asymmetrical' ? vmNodePools : undefined,
        includeWorkloadImages,
        privateRegistryUrl: privateRegistryUrl.trim() || undefined,
        podCidr,
        serviceCidr
      };

      const res = await fetch('/api/cluster/offline-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Package bundling failed on server');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = isAirgap 
        ? `kubesdk-airgap-${infraType}-${orchestrator}-${topology}.zip`
        : `kubesdk-setup-${infraType}-${orchestrator}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Package download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Open inline add modal
  const handleOpenInlineModal = (target: 'baremetal' | 'hypervisor' | 'cloud' | 'container') => {
    setInlineModalType(target);
    setInlineModalError(null);
    if (target === 'baremetal') {
      setInlineItemData({
        vendor: 'Custom',
        name: '',
        version: 'v1.0',
        category: 'Edge & SBC',
        vcpu: 4,
        memoryGi: 8,
        diskGi: 50,
        arch: 'x86_64',
        desc: ''
      });
    } else if (target === 'hypervisor') {
      setInlineItemData({
        name: '',
        version: 'v1.0',
        engine: 'KVM / QEMU',
        category: 'Open-Source & Linux',
        desc: ''
      });
    } else if (target === 'cloud') {
      setInlineItemData({
        name: '',
        badge: 'Cloud VM',
        defaultRegion: 'us-east-1',
        regionsStr: 'us-east-1: US East, eu-west-1: Europe',
        instanceTypesStr: 'dev-std: 4 vCPU / 16GB RAM',
        credentialsStr: 'apiKey: API Token: secret'
      });
    } else {
      setInlineItemData({
        name: '',
        engineType: 'docker',
        category: 'Container Runtime',
        defaultVcpu: 2,
        defaultMemoryGi: 4,
        defaultDiskGi: 20,
        desc: ''
      });
    }
    setIsInlineAddModalOpen(true);
  };

  const handleSaveInlineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInlineSaving(true);
    setInlineModalError(null);

    try {
      let payload: any = { ...inlineItemData };

      if (inlineModalType === 'baremetal') {
        if (!payload.name || !payload.vendor) throw new Error('Vendor and Model Name required');
        payload.vcpu = Number(payload.vcpu) || 2;
        payload.memoryGi = Number(payload.memoryGi) || 4;
        payload.diskGi = Number(payload.diskGi) || 50;
      } else if (inlineModalType === 'hypervisor') {
        if (!payload.name) throw new Error('Hypervisor name is required');
      } else if (inlineModalType === 'cloud') {
        if (!payload.name) throw new Error('Cloud provider name is required');
        if (payload.regionsStr) {
          payload.regions = payload.regionsStr.split(',').map((r: string) => {
            const [id, name] = r.split(':').map((s: string) => s.trim());
            return { id: id || 'us-east-1', name: name || id };
          });
        }
        if (payload.instanceTypesStr) {
          payload.instanceTypes = payload.instanceTypesStr.split(',').map((t: string) => {
            const parts = t.split(':').map((s: string) => s.trim());
            return { id: parts[0] || 'dev-std', name: parts[0] || 'dev-std', vcpu: 4, memGi: 16, desc: parts[1] || 'Dev Machine', category: 'Dev Optimized' };
          });
        }
        if (payload.credentialsStr) {
          payload.credentialFields = payload.credentialsStr.split(',').map((c: string) => {
            const [key, label, type] = c.split(':').map((s: string) => s.trim());
            return { key: key || 'apiKey', label: label || key, placeholder: `Enter ${label || key}...`, isSecret: type === 'secret', desc: `Authentication field` };
          });
        }
      }

      const res = await fetch(`/api/config/infrastructure/${inlineModalType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add preset');
      }

      const json = await res.json();
      const addedItem = json.item;

      if (inlineModalType === 'baremetal') {
        setHardwareList(prev => [...prev, addedItem]);
        setSelectedHardwareId(addedItem.id);
        setVcpu(addedItem.vcpu);
        setMemoryGi(addedItem.memoryGi);
        setDiskGi(addedItem.diskGi);
        setOsArch(addedItem.arch);
      } else if (inlineModalType === 'hypervisor') {
        setHypervisorList(prev => [...prev, addedItem]);
        setSelectedHypervisor(addedItem.id);
      } else if (inlineModalType === 'cloud') {
        setCloudList(prev => [...prev, addedItem]);
        setSelectedCloudProvider(addedItem.id);
        if (addedItem.defaultRegion) setCloudRegion(addedItem.defaultRegion);
      }

      setIsInlineAddModalOpen(false);
    } catch (err: any) {
      setInlineModalError(err.message || 'Failed to save');
    } finally {
      setIsInlineSaving(false);
    }
  };

  return (
    <motion.div
      key="define-kube-infra-wizard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-24 max-w-7xl mx-auto"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} />
                Infrastructure Architecture Wizard
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Define Kubernetes Infrastructure
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Step-by-step infrastructure target definition, hardware selection, node sizing, topology configuration, and self-contained installer packaging.
            </p>
          </div>

          {onNavigateToWizard && (
            <button
              type="button"
              onClick={onNavigateToWizard}
              className="px-5 py-3 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 shrink-0 self-start md:self-center"
            >
              <span>Go to Local Run Wizard</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mt-6 pt-6 border-t border-slate-700/60">
          {WIZARD_STEPS.map((s, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "p-3 rounded-2xl text-left transition-all relative border flex flex-col justify-between gap-1",
                  isCurrent 
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/40" 
                    : isCompleted
                      ? "bg-slate-800/80 border-emerald-500/40 text-slate-200 hover:bg-slate-800"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isCurrent ? "text-indigo-200" : isCompleted ? "text-emerald-400" : "text-slate-400")}>
                    Step 0{idx + 1}
                  </span>
                  {isCompleted && <CheckCircle size={14} className="text-emerald-400" />}
                </div>
                <h4 className="text-xs font-bold truncate">{s.title}</h4>
                <p className="text-[10px] opacity-75 line-clamp-1">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 min-h-[500px] flex flex-col justify-between">
        
        {/* Step 1: Target & Mode */}
        {currentStep === 0 && (
          <motion.div
            key="step-target"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">1. Choose Infrastructure Target & Deployment Environment</h3>
              <p className="text-xs text-[#6C757D] mt-1">Select the target execution architecture and declare whether deployment runs in an air-gapped or online cloud environment.</p>
            </div>

            {/* Target Architecture Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider">Select Target Platform:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { id: 'baremetal' as InfraType, label: 'Baremetal Hardware', desc: 'Direct on physical servers & Edge SBCs', icon: <Server size={22} className="text-indigo-600" />, count: `${hardwareList.length} Models` },
                  { id: 'hypervisor-vm' as InfraType, label: 'VM / Hypervisor', desc: 'Harvester, KubeVirt, ESXi, Proxmox', icon: <Cpu size={22} className="text-purple-600" />, count: `${hypervisorList.length} Engines` },
                  { id: 'cloud-vm' as InfraType, label: 'Cloud Instance', desc: 'AWS, GCP, Azure, DO, Hetzner, OCI', icon: <Cloud size={22} className="text-sky-600" />, count: `${cloudList.length} Providers` },
                  { id: 'docker-cluster' as InfraType, label: 'Virtual Container', desc: 'Local Docker, Podman, k3d, KinD', icon: <Box size={22} className="text-emerald-600" />, count: 'Fast Sandbox' },
                ].map((item) => {
                  const isSelected = infraType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInfraType(item.id)}
                      className={cn(
                        "p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/40 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                          : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-xs">{item.icon}</div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1A1A1A]">{item.label}</h4>
                        <p className="text-xs text-[#6C757D] mt-1">{item.desc}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md self-start">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode: Airgap vs Online */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Deployment Network Mode</h4>
                  <p className="text-xs text-[#6C757D]">Choose whether to build an offline standalone package or connect directly to online cloud services.</p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsAirgap(true)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                      isAirgap ? "bg-amber-600 text-white shadow-sm" : "text-[#6C757D] hover:text-[#1A1A1A]"
                    )}
                  >
                    <ShieldCheck size={14} />
                    <span>Air-Gapped (Offline)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAirgap(false)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                      !isAirgap ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D] hover:text-[#1A1A1A]"
                    )}
                  >
                    <Globe size={14} />
                    <span>Online (Cloud APIs)</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Target-specific Configuration */}
        {currentStep === 1 && (
          <motion.div
            key="step-config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Target 1: Baremetal */}
            {infraType === 'baremetal' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Server size={18} className="text-indigo-600" />
                      Select Baremetal Hardware Model & Sizing Preset
                    </h3>
                    <p className="text-xs text-indigo-900/80 mt-0.5">
                      Declaratively configured models with auto-tuning kernel profiles loaded from <code className="font-mono bg-indigo-100/80 px-1 py-0.2 rounded text-indigo-800">config/baremetal-presets.yaml</code>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenInlineModal('baremetal')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Custom Hardware</span>
                    </button>
                  </div>
                </div>

                {/* Vendor Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['All', ...Array.from(new Set(hardwareList.map(h => h.vendor)))].map(vendor => (
                    <button
                      key={vendor}
                      type="button"
                      onClick={() => setSelectedVendorFilter(vendor)}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-lg transition-colors",
                        selectedVendorFilter === vendor
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-gray-100 text-[#6C757D] hover:bg-gray-200"
                      )}
                    >
                      {vendor}
                    </button>
                  ))}
                </div>

                {/* Hardware Presets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {hardwareList
                    .filter(hw => selectedVendorFilter === 'All' || hw.vendor === selectedVendorFilter)
                    .map(hw => {
                      const isSelected = selectedHardwareId === hw.id;
                      return (
                        <button
                          key={hw.id}
                          type="button"
                          onClick={() => handleSelectHardware(hw)}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                            isSelected
                              ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                              : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">{hw.vendor}</span>
                                <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-700">{hw.version}</span>
                              </div>
                              <h4 className="text-sm font-bold text-[#1A1A1A] mt-1">{hw.name}</h4>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check size={12} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#6C757D] line-clamp-2">{hw.desc}</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-600 flex-wrap">
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.vcpu} vCPU</span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.memoryGi} GB RAM</span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-bold">{hw.diskGi} GB</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">{hw.arch}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Target 2: Hypervisor / VM */}
            {infraType === 'hypervisor-vm' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                  <div>
                    <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                      <Cpu size={18} className="text-purple-600" />
                      Hypervisor Virtualization Platform & Node Sizing
                    </h3>
                    <p className="text-xs text-purple-900/80 mt-0.5">
                      Configure KubeVirt, Harvester, VMware ESXi, Proxmox, OpenShift Virt, Nutanix, or Linux KVM.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInlineModal('hypervisor')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Hypervisor Engine</span>
                    </button>
                  </div>
                </div>

                {/* Hypervisors Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {hypervisorList.map(hyp => {
                    const isSelected = selectedHypervisor === hyp.id;
                    return (
                      <button
                        key={hyp.id}
                        type="button"
                        onClick={() => setSelectedHypervisor(hyp.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 relative cursor-pointer",
                          isSelected
                            ? "bg-white border-purple-600 shadow-sm ring-2 ring-purple-500/20"
                            : "bg-white border-gray-200 hover:border-purple-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{hyp.name}</span>
                          {isSelected && <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center"><Check size={10} /></div>}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono line-clamp-1">{hyp.engine}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Symmetrical vs Heterogeneous Switch */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]">VM Node Architecture Mode</h4>
                    <p className="text-xs text-[#6C757D]">Choose uniform symmetrical VMs or heterogeneous node pools (Control Plane, Worker, GPU, Storage).</p>
                  </div>
                  <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setVmMode('symmetrical')}
                      className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", vmMode === 'symmetrical' ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D]")}
                    >
                      Symmetrical
                    </button>
                    <button
                      type="button"
                      onClick={() => setVmMode('asymmetrical')}
                      className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1", vmMode === 'asymmetrical' ? "bg-indigo-600 text-white shadow-sm" : "text-[#6C757D]")}
                    >
                      <Layers size={13} />
                      <span>Asymmetrical Pools</span>
                    </button>
                  </div>
                </div>

                {vmMode === 'asymmetrical' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A1A1A]">Configured VM Node Pools ({vmNodePools.length})</span>
                      <button
                        type="button"
                        onClick={handleAddVMPool}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1"
                      >
                        <Plus size={13} /> Add Node Pool
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {vmNodePools.map((pool, idx) => (
                        <div key={pool.id} className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                              <input
                                type="text"
                                value={pool.name}
                                onChange={e => handleUpdateVMPool(pool.id, { name: e.target.value })}
                                className="font-bold text-xs bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none px-1"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#6C757D]">VM Count:</span>
                              <input
                                type="number"
                                min={1}
                                max={64}
                                value={pool.count}
                                onChange={e => handleUpdateVMPool(pool.id, { count: parseInt(e.target.value) || 1 })}
                                className="w-14 px-2 py-0.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded text-center"
                              />
                              {vmNodePools.length > 1 && (
                                <button type="button" onClick={() => handleRemoveVMPool(pool.id)} className="text-gray-400 hover:text-red-600 px-1 font-bold">✕</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target 3: Cloud Instance */}
            {infraType === 'cloud-vm' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                  <div>
                    <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                      <Cloud size={18} className="text-sky-600" />
                      Cloud Provider & Development Stage Setup
                    </h3>
                    <p className="text-xs text-sky-900/80 mt-0.5">
                      Configure AWS, GCP, Azure, DigitalOcean, Hetzner, or OCI with automated developer cost optimizations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInlineModal('cloud')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Cloud Provider</span>
                  </button>
                </div>

                {/* Cloud Providers Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {cloudList.map(provider => {
                    const isSelected = selectedCloudProvider === provider.id;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleSelectCloudProvider(provider.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 relative cursor-pointer",
                          isSelected
                            ? "bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20"
                            : "bg-white/80 border-gray-200 hover:border-sky-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{provider.name.split('(')[0]}</span>
                          {isSelected && <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center"><Check size={10} /></div>}
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 bg-gray-50 px-1 py-0.2 rounded self-start">{provider.badge}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Region & Sizing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Datacenter Region</label>
                    <select
                      value={cloudRegion}
                      onChange={e => setCloudRegion(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium"
                    >
                      {activeCloud.regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Machine Sizing Preset</label>
                    <select
                      value={cloudInstanceType}
                      onChange={e => handleSelectCloudInstanceType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none font-medium"
                    >
                      {activeCloud.instanceTypes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} — {inst.vcpu} vCPU / {inst.memGi}GB RAM</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Target 4: Virtual Container */}
            {infraType === 'docker-cluster' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <Box size={18} className="text-emerald-600" />
                    Local Container Sandbox Configuration
                  </h3>
                  <p className="text-xs text-emerald-900/80 mt-0.5">
                    Spins up lightweight containerized nodes using Docker, Podman, k3d, or KinD with near-instant boot times.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Scale & Topology */}
        {currentStep === 2 && (
          <motion.div
            key="step-topology"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">3. Configure Cluster Scale, Topology & High Availability</h3>
              <p className="text-xs text-[#6C757D] mt-1">Specify node counts, quorum fault tolerance zones, and overlay network CIDRs.</p>
            </div>

            {/* Topology Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { id: 'single-node' as TopologyType, label: 'Single Node Edge', desc: 'Combined control plane & worker for dev/edge SBCs', badge: '1 Node' },
                { id: 'multi-node' as TopologyType, label: 'Multi-Node Standard', desc: 'Dedicated control plane with horizontal worker pool', badge: '2+ Nodes' },
                { id: 'multi-zone' as TopologyType, label: 'Multi-Zone HA', desc: 'Spanned across multiple failure domains and racks', badge: 'HA Cluster' },
                { id: 'multi-zone-quorum' as TopologyType, label: 'Multi-Zone + Quorum', desc: '3-way split etcd with dedicated witness arbiter', badge: 'Mission Critical' }
              ].map(t => {
                const isSelected = topology === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTopology(t.id);
                      if (t.id === 'single-node') setNodesCount(1);
                      else if (nodesCount === 1) setNodesCount(3);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-[#1A1A1A]">{t.label}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check size={10} /></div>}
                    </div>
                    <p className="text-xs text-[#6C757D]">{t.desc}</p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md self-start">{t.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Node Sizing Count & Network CIDRs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Total Node Count</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={nodesCount}
                  onChange={e => setNodesCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Pod Network CIDR</label>
                <input
                  type="text"
                  value={podCidr}
                  onChange={e => setPodCidr(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase mb-1">Service CIDR</label>
                <input
                  type="text"
                  value={serviceCidr}
                  onChange={e => setServiceCidr(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Orchestrator Engine */}
        {currentStep === 3 && (
          <motion.div
            key="step-orchestrator"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">4. Select Kubernetes Orchestrator Engine</h3>
              <p className="text-xs text-[#6C757D] mt-1">Choose the Kubernetes distribution matched against your compute resources and capability catalog.</p>
            </div>

            {/* Orchestrator Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { id: 'k3s' as OrchestratorType, name: 'K3s (Rancher)', badge: 'Lightweight', desc: '512MB RAM minimal footprint single-binary distribution' },
                { id: 'microk8s' as OrchestratorType, name: 'MicroK8s (Canonical)', badge: 'Zero-Ops', desc: 'Pure upstream Kubernetes with snap-based automatic updates' },
                { id: 'minikube' as OrchestratorType, name: 'Minikube', badge: 'Dev Sandbox', desc: 'Developer standard sandbox for desktop workstation clusters' },
                { id: 'rke2' as OrchestratorType, name: 'RKE2 Government', badge: 'FIPS 140-2', desc: 'Hardened enterprise Kubernetes with CIS benchmark compliance' },
                { id: 'kubeadm' as OrchestratorType, name: 'Kubeadm Standard', badge: 'Upstream Core', desc: 'Official upstream vanilla Kubernetes cluster bootstrap tool' }
              ].map(orch => {
                const isSelected = orchestrator === orch.id;
                const isRecommended = recommendedEngine === orch.id;
                return (
                  <button
                    key={orch.id}
                    type="button"
                    onClick={() => setOrchestrator(orch.id)}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 relative cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/40 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-[#1A1A1A]">{orch.name}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check size={10} /></div>}
                    </div>
                    <p className="text-[11px] text-[#6C757D]">{orch.desc}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{orch.badge}</span>
                      {isRecommended && <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Recommended</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Offline Image Bundler Settings */}
            {isAirgap && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-950">Air-Gapped Offline Image Packaging</h4>
                </div>
                <p className="text-xs text-amber-900/80">
                  Pre-bundles system orchestrator images, ingress controllers, metrics servers, and storage drivers into the downloaded `.zip` archive.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 5: Review & Deploy */}
        {currentStep === 4 && (
          <motion.div
            key="step-provision"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">5. Review Specifications & Download Setup Package</h3>
                <p className="text-xs text-[#6C757D] mt-1">Review aggregated cluster metrics and download the complete self-contained deployment bundle.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Script' : 'Copy Commands'}</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadPackage}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isDownloading ? 'Bundling Archive...' : isAirgap ? 'Download Air-Gapped Package (.zip)' : 'Download Setup Package (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Infrastructure</span>
                <span className="text-sm font-bold font-mono text-indigo-300">{infraType.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Compute</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{clusterMetrics.totalVcpu} vCPU / {clusterMetrics.totalMemGi} GB</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cluster Topology</span>
                <span className="text-sm font-bold font-mono text-purple-300">{topology} ({nodesCount} nodes)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Orchestrator Engine</span>
                <span className="text-sm font-bold font-mono text-sky-300">{orchestrator.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Network Mode</span>
                <span className="text-sm font-bold font-mono text-amber-300">{isAirgap ? 'Airgap Offline' : 'Online Cloud'}</span>
              </div>
            </div>

            {/* Generated Script Preview */}
            <div className="relative">
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800 max-h-[280px]">
                {generatedScript}
              </pre>
            </div>

            {/* Pre-fill credentials helper */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#0D6EFD] shrink-0" />
                <span>After spinning up your cluster, inject credentials directly into Step 6 of the Local Run wizard.</span>
              </div>
              {onApplyCredentials && (
                <button
                  type="button"
                  onClick={() => onApplyCredentials('https://127.0.0.1:6443')}
                  className="px-3.5 py-1.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
                >
                  Pre-fill Default URL
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer Step Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} />
            <span>Previous Step</span>
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
              className="px-6 py-2.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <span>Next: {WIZARD_STEPS[currentStep + 1].title}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPackage}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Download size={14} />
              <span>Download Complete Package (.zip)</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Modal to Add New Target Config directly into YAML */}
      <AnimatePresence>
        {isInlineAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-sky-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {inlineModalType === 'baremetal' && <Server size={18} className="text-indigo-600" />}
                  {inlineModalType === 'hypervisor' && <Cpu size={18} className="text-purple-600" />}
                  {inlineModalType === 'cloud' && <Cloud size={18} className="text-sky-600" />}
                  {inlineModalType === 'container' && <Box size={18} className="text-emerald-600" />}
                  <h4 className="font-bold text-xs text-[#1A1A1A]">
                    Add New {inlineModalType === 'baremetal' ? 'Baremetal Preset' : inlineModalType === 'hypervisor' ? 'Hypervisor Engine' : inlineModalType === 'cloud' ? 'Cloud Provider' : 'Container Engine'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInlineAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInlineItem} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {inlineModalError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {inlineModalError}
                  </div>
                )}

                {inlineModalType === 'baremetal' && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Vendor</label>
                        <input
                          type="text"
                          value={inlineItemData.vendor || ''}
                          onChange={e => setInlineItemData({ ...inlineItemData, vendor: e.target.value })}
                          placeholder="e.g. Supermicro, Lenovo"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Model Name</label>
                        <input
                          type="text"
                          value={inlineItemData.name || ''}
                          onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                          placeholder="e.g. SuperServer 2U"
                          className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">vCPU</label>
                        <input
                          type="number"
                          min={1}
                          max={256}
                          value={inlineItemData.vcpu}
                          onChange={e => setInlineItemData({ ...inlineItemData, vcpu: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">RAM (GB)</label>
                        <input
                          type="number"
                          min={1}
                          max={1024}
                          value={inlineItemData.memoryGi}
                          onChange={e => setInlineItemData({ ...inlineItemData, memoryGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Disk (GB)</label>
                        <input
                          type="number"
                          min={10}
                          max={4000}
                          value={inlineItemData.diskGi}
                          onChange={e => setInlineItemData({ ...inlineItemData, diskGi: e.target.value })}
                          className="w-full px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Arch</label>
                        <select
                          value={inlineItemData.arch}
                          onChange={e => setInlineItemData({ ...inlineItemData, arch: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded"
                        >
                          <option value="x86_64">x86_64</option>
                          <option value="aarch64">aarch64</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {inlineModalType === 'hypervisor' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Hypervisor Name</label>
                      <input
                        type="text"
                        value={inlineItemData.name || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                        placeholder="e.g. SmartOS, XCP-ng"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Version</label>
                      <input
                        type="text"
                        value={inlineItemData.version || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, version: e.target.value })}
                        placeholder="e.g. v8.2"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {inlineModalType === 'cloud' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Cloud Provider Name</label>
                      <input
                        type="text"
                        value={inlineItemData.name || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, name: e.target.value })}
                        placeholder="e.g. Linode, Scaleway"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#495057] uppercase mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={inlineItemData.badge || ''}
                        onChange={e => setInlineItemData({ ...inlineItemData, badge: e.target.value })}
                        placeholder="e.g. Linode VMs"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsInlineAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInlineSaving}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    {isInlineSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
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
