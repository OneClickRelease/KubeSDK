import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server, Cpu, Cloud, Box, Layers, Download, CheckCircle2,
  Terminal, ShieldCheck, ChevronDown, ChevronRight, Sparkles,
  Zap, Copy, RefreshCw, AlertTriangle, Globe, Lock, Info, Check
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export type InfraType = 'baremetal' | 'hypervisor-vm' | 'cloud-vm' | 'docker-cluster';
export type OrchestratorType = 'k3s' | 'microk8s' | 'minikube' | 'rke2' | 'kubeadm';
export type TopologyType = 'single-node' | 'multi-node' | 'multi-zone' | 'multi-zone-quorum';

export interface HardwarePreset {
  id: string;
  vendor: 'Raspberry Pi' | 'HPE' | 'Dell' | 'Cisco' | 'Advantech' | 'IBM' | 'Custom';
  name: string;
  version: string;
  category: 'Edge & SBC' | 'Enterprise Rack' | 'Industrial Edge' | 'Mainframe / High Capacity';
  vcpu: number;
  memoryGi: number;
  diskGi: number;
  arch: string;
  desc: string;
}

export const HARDWARE_PRESETS: HardwarePreset[] = [
  // Raspberry Pi
  { id: 'rpi-5-8gb', vendor: 'Raspberry Pi', name: 'Raspberry Pi 5', version: '8GB v1.0', category: 'Edge & SBC', vcpu: 4, memoryGi: 8, diskGi: 64, arch: 'aarch64', desc: 'Broadcom BCM2712 Quad-core Cortex-A76 @ 2.4GHz with PCIe 2.0 & Gigabit LAN' },
  { id: 'rpi-5-4gb', vendor: 'Raspberry Pi', name: 'Raspberry Pi 5', version: '4GB v1.0', category: 'Edge & SBC', vcpu: 4, memoryGi: 4, diskGi: 32, arch: 'aarch64', desc: 'Broadcom BCM2712 Quad-core Cortex-A76 @ 2.4GHz Edge Device' },
  { id: 'rpi-4-8gb', vendor: 'Raspberry Pi', name: 'Raspberry Pi 4 Model B', version: '8GB Rev 1.4', category: 'Edge & SBC', vcpu: 4, memoryGi: 8, diskGi: 32, arch: 'aarch64', desc: 'Broadcom BCM2711 Quad-core Cortex-A72 @ 1.8GHz' },
  { id: 'rpi-cm4-8gb', vendor: 'Raspberry Pi', name: 'Compute Module 4 (CM4)', version: '8GB eMMC v1.1', category: 'Edge & SBC', vcpu: 4, memoryGi: 8, diskGi: 32, arch: 'aarch64', desc: 'Industrial modular SBC for embedded edge carrier boards' },
  
  // HPE
  { id: 'hpe-dl380-gen11', vendor: 'HPE', name: 'ProLiant DL380', version: 'Gen11 v2', category: 'Enterprise Rack', vcpu: 32, memoryGi: 128, diskGi: 500, arch: 'x86_64', desc: 'Dual-socket 4th/5th Gen Intel Xeon Scalable Enterprise Server with iLO 6' },
  { id: 'hpe-dl360-gen10', vendor: 'HPE', name: 'ProLiant DL360', version: 'Gen10 Plus v2.1', category: 'Enterprise Rack', vcpu: 16, memoryGi: 64, diskGi: 250, arch: 'x86_64', desc: 'High-density 1U dual-processor rack server' },
  { id: 'hpe-el8000', vendor: 'HPE', name: 'Edgeline EL8000', version: 'Converged Edge v1.2', category: 'Industrial Edge', vcpu: 16, memoryGi: 64, diskGi: 200, arch: 'x86_64', desc: 'Ruggedized modular edge compute system for harsh field sites' },
  { id: 'hpe-microserver-gen10', vendor: 'HPE', name: 'ProLiant MicroServer', version: 'Gen10 Plus v2', category: 'Edge & SBC', vcpu: 4, memoryGi: 16, diskGi: 100, arch: 'x86_64', desc: 'Ultra-compact edge server with Intel Xeon E-2314' },

  // Dell Technologies
  { id: 'dell-r760', vendor: 'Dell', name: 'PowerEdge R760', version: '2U Rack v1.1', category: 'Enterprise Rack', vcpu: 32, memoryGi: 128, diskGi: 500, arch: 'x86_64', desc: 'Flagship 2U dual-socket enterprise rack server with iDRAC9 telemetry' },
  { id: 'dell-r650', vendor: 'Dell', name: 'PowerEdge R650', version: '1U Rack v2.0', category: 'Enterprise Rack', vcpu: 16, memoryGi: 64, diskGi: 250, arch: 'x86_64', desc: 'Dense 1U enterprise server optimized for high-density virtualization' },
  { id: 'dell-xr4000', vendor: 'Dell', name: 'PowerEdge XR4000', version: 'Edge Rugged v1.0', category: 'Industrial Edge', vcpu: 16, memoryGi: 32, diskGi: 200, arch: 'x86_64', desc: 'Short-depth, multi-node ruggedized edge chassis for telecommunication & defense' },
  { id: 'dell-precision', vendor: 'Dell', name: 'Precision 7960', version: 'Rack Workstation v1', category: 'Enterprise Rack', vcpu: 24, memoryGi: 64, diskGi: 500, arch: 'x86_64', desc: 'High-throughput Intel Xeon W workstation server' },

  // Cisco Systems
  { id: 'cisco-c240-m7', vendor: 'Cisco', name: 'UCS C240 M7', version: 'M7 Rack v1.0', category: 'Enterprise Rack', vcpu: 32, memoryGi: 128, diskGi: 500, arch: 'x86_64', desc: 'Enterprise 2U server with Cisco Intersight cloud-driven telemetry' },
  { id: 'cisco-c220-m6', vendor: 'Cisco', name: 'UCS C220 M6', version: 'M6 1U v2.1', category: 'Enterprise Rack', vcpu: 16, memoryGi: 64, diskGi: 250, arch: 'x86_64', desc: 'Compact high-density 1U server for cluster workloads' },
  { id: 'cisco-ir8340', vendor: 'Cisco', name: 'Catalyst IR8340', version: 'Rugged Router Compute v1.0', category: 'Industrial Edge', vcpu: 4, memoryGi: 8, diskGi: 64, arch: 'aarch64', desc: 'Ruggedized utility edge compute for substations and smart grids' },

  // Advantech
  { id: 'advantech-mic770', vendor: 'Advantech', name: 'MIC-770 V3', version: 'Modular IPC v3.0', category: 'Industrial Edge', vcpu: 8, memoryGi: 32, diskGi: 250, arch: 'x86_64', desc: 'Fanless modular industrial PC with Intel 12th/13th Gen Core i processors' },
  { id: 'advantech-uno2484', vendor: 'Advantech', name: 'UNO-2484G', version: 'Edge Gateway v2.0', category: 'Industrial Edge', vcpu: 4, memoryGi: 16, diskGi: 128, arch: 'x86_64', desc: 'DIN-rail ruggedized edge automation computer with dual-GbE and isolated COM' },
  { id: 'advantech-rom5780', vendor: 'Advantech', name: 'ROM-5780', version: 'SMARC Module v1.1', category: 'Edge & SBC', vcpu: 8, memoryGi: 8, diskGi: 64, arch: 'aarch64', desc: 'Rockchip RK3588 Cortex-A76/A55 Edge AI SMARC module' },

  // IBM
  { id: 'ibm-power-s1024', vendor: 'IBM', name: 'Power S1024', version: 'Power10 Enterprise v1', category: 'Mainframe / High Capacity', vcpu: 24, memoryGi: 128, diskGi: 500, arch: 'x86_64', desc: 'IBM Power10 enterprise-grade server for mission-critical core banking & data mesh' },
  { id: 'ibm-linuxone-emp4', vendor: 'IBM', name: 'LinuxONE Emperor 4', version: 'Mainframe v1.0', category: 'Mainframe / High Capacity', vcpu: 32, memoryGi: 256, diskGi: 1000, arch: 'x86_64', desc: 'Ultra-high throughput enterprise Linux mainframe server' },
  { id: 'ibm-baremetal-classic', vendor: 'IBM', name: 'Cloud Bare Metal', version: 'Dual Xeon Silver v2', category: 'Enterprise Rack', vcpu: 16, memoryGi: 64, diskGi: 250, arch: 'x86_64', desc: 'Dedicated baremetal high-performance compute instance' }
];

interface OrchestratorDeploymentProps {
  totalRequiredCpu?: number;
  totalRequiredMem?: number; // in MB
  onApplyCredentials?: (url: string) => void;
}

export const OrchestratorDeploymentCollapsible: React.FC<OrchestratorDeploymentProps> = ({
  totalRequiredCpu = 1,
  totalRequiredMem = 1024,
  onApplyCredentials
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [infraType, setInfraType] = useState<InfraType>('baremetal');
  
  // Baremetal Hardware Selection state
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('All');
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('rpi-5-8gb');

  const [vcpu, setVcpu] = useState<number>(4);
  const [memoryGi, setMemoryGi] = useState<number>(8);
  const [diskGi, setDiskGi] = useState<number>(64);
  const [osArch, setOsArch] = useState<string>('aarch64');
  const [topology, setTopology] = useState<TopologyType>('single-node');
  const [nodesCount, setNodesCount] = useState<number>(3);
  const [orchestrator, setOrchestrator] = useState<OrchestratorType>('k3s');

  // Airgap state
  const [isAirgap, setIsAirgap] = useState<boolean>(true);
  const [airgapMethod, setAirgapMethod] = useState<'local-autoload' | 'private-registry'>('local-autoload');
  const [includeWorkloadImages, setIncludeWorkloadImages] = useState<boolean>(true);
  const [privateRegistryUrl, setPrivateRegistryUrl] = useState<string>('');

  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active hardware preset info
  const activeHardware = useMemo(() => {
    return HARDWARE_PRESETS.find(h => h.id === selectedHardwareId) || null;
  }, [selectedHardwareId]);

  const handleSelectHardware = (hw: HardwarePreset) => {
    setSelectedHardwareId(hw.id);
    setVcpu(hw.vcpu);
    setMemoryGi(hw.memoryGi);
    setDiskGi(hw.diskGi);
    setOsArch(hw.arch);
  };

  // Dynamic recommendation based on node specs, workload, and capability registry
  const recommendation = useMemo(() => {
    const memGi = Number(memoryGi) || 4;
    const cpuCount = Number(vcpu) || 2;

    if (topology === 'multi-zone-quorum' || topology === 'multi-zone') {
      if (memGi >= 8 && cpuCount >= 4) {
        return {
          orchestrator: 'rke2' as OrchestratorType,
          badge: 'Recommended for Multi-Zone HA',
          reason: 'RKE2 provides embedded HA etcd clustering with automated quorum consensus and CIS-hardened security profiles.'
        };
      }
      return {
        orchestrator: 'k3s' as OrchestratorType,
        badge: 'Recommended for Multi-Zone',
        reason: 'K3s lightweight embedded etcd delivers seamless multi-zone clustering with minimal resource overhead.'
      };
    }

    if (infraType === 'docker-cluster') {
      return {
        orchestrator: 'k3s' as OrchestratorType,
        badge: 'Recommended for Virtual Containers',
        reason: 'K3s has native support for Docker/Podman containerized node execution with low RAM usage (~512MB).'
      };
    }

    if (memGi < 4 || cpuCount < 2) {
      return {
        orchestrator: 'k3s' as OrchestratorType,
        badge: 'Recommended for Resource Efficiency',
        reason: 'K3s requires less than 1 vCPU and 512MB RAM, making it optimal for constrained VMs and single-node setups.'
      };
    }

    if (memGi >= 8 && topology === 'multi-node') {
      return {
        orchestrator: 'kubeadm' as OrchestratorType,
        badge: 'Recommended for Multi-Node VM/Baremetal',
        reason: 'Standard upstream Kubernetes with Kubeadm provides native full-cluster features for multi-node deployments.'
      };
    }

    return {
      orchestrator: 'k3s' as OrchestratorType,
      badge: 'Recommended Default',
      reason: 'K3s is CNCF-certified, lightweight, fast-starting (<30s), and fully compatible with all KubeSDK resources.'
    };
  }, [infraType, vcpu, memoryGi, topology]);

  const handleSelectRecommendation = () => {
    setOrchestrator(recommendation.orchestrator);
  };

  // Generate dynamic installation script preview
  const generatedScript = useMemo(() => {
    const hwLabel = activeHardware ? `${activeHardware.vendor} ${activeHardware.name} (${activeHardware.version})` : infraType.toUpperCase();
    if (isAirgap) {
      return `# =========================================================\n# Air-Gapped Offline Cluster Setup (${orchestrator.toUpperCase()})\n# Hardware Target: ${hwLabel}\n# Zero Outbound Internet Access Required\n# =========================================================\n\n# 1. Run Pre-flight System Validation:\n./airgap-precheck.sh\n\n# 2. Import Bundled Offline Container Images into Containerd/Docker:\n./load-images.sh\n\n# 3. Launch Self-Contained Cluster Installation:\n./install.sh\n\n# 4. Extract API Server URL & ServiceAccount Admin Token:\n./bootstrap-token.sh`;
    }

    if (orchestrator === 'k3s') {
      if (topology === 'single-node') {
        return `# 1. Install K3s Single-Node on ${hwLabel}\ncurl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -\n\n# 2. Extract KubeSDK Credentials\nAPI_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')\necho "Cluster API URL: $API_URL"`;
      }
      if (topology === 'multi-node') {
        return `# 1. On Master Node (${hwLabel}):\ncurl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -\nMASTER_IP=$(hostname -I | awk '{print $1}')\nNODE_TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)\n\n# 2. On Worker Nodes:\ncurl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$NODE_TOKEN sh -`;
      }
      return `# Multi-Zone with ${topology === 'multi-zone-quorum' ? 'Quorum Arbiter' : 'HA'}\ncurl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--cluster-init --write-kubeconfig-mode 644 --disable traefik" sh -`;
    }
    if (orchestrator === 'microk8s') {
      return `sudo snap install microk8s --classic\nsudo microk8s status --wait-ready\nsudo microk8s enable dns rbac storage\nsudo snap alias microk8s.kubectl kubectl`;
    }
    if (orchestrator === 'minikube') {
      return `minikube start --cpus=${vcpu} --memory=${memoryGi * 1024}mb ${topology === 'multi-node' ? `--nodes=${nodesCount}` : ''}`;
    }
    if (orchestrator === 'rke2') {
      return `curl -sfL https://get.rke2.io | sudo sh -\nsudo systemctl enable --now rke2-server.service\nexport KUBECONFIG=/etc/rancher/rke2/rke2.yaml`;
    }
    return `sudo kubeadm init --pod-network-cidr=10.244.0.0/16\nmkdir -p $HOME/.kube && sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config\nkubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml`;
  }, [isAirgap, orchestrator, topology, infraType, vcpu, memoryGi, nodesCount, activeHardware]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/registry/orchestrator/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infraType,
          hardwareProfile: infraType === 'baremetal' && activeHardware ? {
            id: activeHardware.id,
            vendor: activeHardware.vendor,
            name: activeHardware.name,
            version: activeHardware.version,
            category: activeHardware.category,
            arch: activeHardware.arch
          } : undefined,
          orchestrator,
          topology,
          nodesCount: topology === 'single-node' ? 1 : nodesCount,
          vcpu,
          memoryGi,
          diskGi,
          osArch,
          quorumZone: topology === 'multi-zone-quorum',
          isAirgap,
          airgapMethod,
          includeWorkloadImages,
          privateRegistryUrl: airgapMethod === 'private-registry' ? privateRegistryUrl : undefined
        })
      });

      if (!res.ok) throw new Error('Package generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kubesdk-${orchestrator}-${topology}-${isAirgap ? 'airgap-' : ''}setup.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden transition-all">
      {/* Header / Collapsible Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-bold text-[#1A1A1A]">
                Orchestration Deployments & Cluster Setup
              </h5>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Optional
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <ShieldCheck size={11} className="text-amber-600" /> Air-Gapped Ready
              </span>
            </div>
            <p className="text-xs text-[#6C757D] mt-0.5">
              Provision custom Baremetal, VM/Hypervisor nodes, or Multi-Zone clusters with capability-recommended engines and offline packages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-indigo-600 hidden md:inline">
            {isExpanded ? 'Hide Options' : 'Configure Nodes & Topologies'}
          </span>
          <div className={cn("text-[#6C757D] transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
            <ChevronDown size={18} />
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-[#F1F3F5] px-6 py-6 space-y-6 bg-gradient-to-b from-white to-[#FDFDFE]"
          >
            {/* Air-Gapped / Offline Deployment Mode Switch */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h6 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Air-Gapped & Offline Environment Mode
                    </h6>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200/70 text-amber-900">
                      Zero Internet Required
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
                    This connected machine downloads all required binaries, container image archives, loader scripts, and preflight tools into a self-contained offline installer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAirgap}
                    onChange={e => setIsAirgap(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <span className="text-xs font-bold text-amber-900">
                  {isAirgap ? 'Airgap Active' : 'Online Mode'}
                </span>
              </div>
            </div>

            {/* Airgap delivery method options */}
            {isAirgap && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#495057]">Airgap Image Delivery Method:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-[#1A1A1A] cursor-pointer">
                      <input
                        type="radio"
                        name="airgapMethod"
                        checked={airgapMethod === 'local-autoload'}
                        onChange={() => setAirgapMethod('local-autoload')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>Local Images Autoload (/agent/images/)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#1A1A1A] cursor-pointer">
                      <input
                        type="radio"
                        name="airgapMethod"
                        checked={airgapMethod === 'private-registry'}
                        onChange={() => setAirgapMethod('private-registry')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>Internal Private Registry Mirror</span>
                    </label>
                  </div>
                </div>

                {airgapMethod === 'private-registry' && (
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                      Internal Registry URL (Harbor / Nexus / Zot)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. registry.internal.corp/kubesdk"
                      value={privateRegistryUrl}
                      onChange={e => setPrivateRegistryUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#6C757D]">Include Workload Simulation Images in bundle:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWorkloadImages}
                      onChange={e => setIncludeWorkloadImages(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-[#1A1A1A]">Package Workload Images (Postgres, Redis, Apps, etc.)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 1: Infrastructure Target */}
            <div>
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Server size={14} className="text-[#0D6EFD]" /> 1. Select Infrastructure Target
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'baremetal', label: 'Baremetal Hardware', desc: 'Raspberry Pi, HPE, Dell, Cisco, Advantech, IBM', icon: Server },
                  { id: 'hypervisor-vm', label: 'VM / Hypervisor', desc: 'KVM, Proxmox, VMware, ESXi, VirtualBox', icon: Cpu },
                  { id: 'cloud-vm', label: 'Cloud Instance', desc: 'AWS EC2, GCP GCE, Azure VM', icon: Cloud },
                  { id: 'docker-cluster', label: 'Virtual Container', desc: 'Docker/Podman node cluster', icon: Box }
                ].map(item => {
                  const Icon = item.icon;
                  const active = infraType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInfraType(item.id as InfraType)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1",
                        active 
                          ? "bg-indigo-50/60 border-indigo-400 shadow-sm ring-1 ring-indigo-400/20" 
                          : "bg-white border-[#E9ECEF] hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={16} className={active ? "text-indigo-600" : "text-[#6C757D]"} />
                        {active && <Check size={14} className="text-indigo-600" />}
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", active ? "text-indigo-900" : "text-[#1A1A1A]")}>{item.label}</p>
                        <p className="text-[10px] text-[#6C757D] line-clamp-1 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baremetal Hardware Vendor & Model Selector */}
            {infraType === 'baremetal' && (
              <div className="p-4 bg-gradient-to-b from-slate-50 to-gray-50/80 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Server size={15} className="text-indigo-600" />
                    <span className="text-xs font-bold text-[#1A1A1A]">Baremetal Hardware Model & Sizing Presets</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-800">
                      Auto-Configures Specs
                    </span>
                  </div>

                  {/* Vendor Filters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['All', 'Raspberry Pi', 'HPE', 'Dell', 'Cisco', 'Advantech', 'IBM'].map(vendor => (
                      <button
                        key={vendor}
                        type="button"
                        onClick={() => setSelectedVendorFilter(vendor)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors",
                          selectedVendorFilter === vendor
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white text-[#6C757D] border border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {vendor}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hardware Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {HARDWARE_PRESETS
                    .filter(hw => selectedVendorFilter === 'All' || hw.vendor === selectedVendorFilter)
                    .map(hw => {
                      const isSelected = selectedHardwareId === hw.id;
                      return (
                        <button
                          key={hw.id}
                          type="button"
                          onClick={() => handleSelectHardware(hw)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 relative",
                            isSelected
                              ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                              : "bg-white/90 border-gray-200 hover:border-indigo-200 hover:bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">
                                  {hw.vendor}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-gray-100 text-gray-700">
                                  {hw.version}
                                </span>
                              </div>
                              <h6 className="text-xs font-bold text-[#1A1A1A] mt-0.5">{hw.name}</h6>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check size={12} />
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] text-[#6C757D] line-clamp-2 leading-tight">
                            {hw.desc}
                          </p>

                          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-[9px] font-mono text-gray-600 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200 font-bold">
                              {hw.vcpu} vCPU
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200 font-bold">
                              {hw.memoryGi} GB RAM
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200 font-bold">
                              {hw.diskGi} GB
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold">
                              {hw.arch}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Step 2: Target Node Resource Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 rounded-xl border border-[#E9ECEF]">
              <div>
                <label className="block text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                  vCPU Cores
                </label>
                <input
                  type="number"
                  min={1}
                  max={128}
                  value={vcpu}
                  onChange={e => setVcpu(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg font-mono focus:border-[#0D6EFD] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                  RAM (GiB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={512}
                  value={memoryGi}
                  onChange={e => setMemoryGi(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg font-mono focus:border-[#0D6EFD] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                  Disk (GiB)
                </label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={diskGi}
                  onChange={e => setDiskGi(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg font-mono focus:border-[#0D6EFD] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                  Architecture
                </label>
                <select
                  value={osArch}
                  onChange={e => setOsArch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg font-medium focus:border-[#0D6EFD] outline-none"
                >
                  <option value="x86_64">Linux x86_64 (AMD64)</option>
                  <option value="aarch64">Linux aarch64 (ARM64)</option>
                  <option value="darwin-arm64">Apple Silicon (macOS)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Capability-Aware Recommendation Banner */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-purple-50/80 border border-indigo-200/80 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-900">
                    Capability Registry Recommendation: {recommendation.orchestrator.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                    {recommendation.badge}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700/90 mt-0.5 leading-relaxed">
                  {recommendation.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectRecommendation}
                className="shrink-0 text-[11px] font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Apply Engine
              </button>
            </div>

            {/* Step 4: Orchestrator Engine Selection */}
            <div>
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Cpu size={14} className="text-[#0D6EFD]" /> 2. Choose Orchestrator Engine
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'k3s', name: 'K3s', tag: 'Lightweight & Fast', minRam: '512MB' },
                  { id: 'microk8s', name: 'MicroK8s', tag: 'Pure Upstream', minRam: '2GB' },
                  { id: 'minikube', name: 'Minikube', tag: 'Local Dev VM', minRam: '2GB' },
                  { id: 'rke2', name: 'RKE2', tag: 'CIS Hardened HA', minRam: '4GB' },
                  { id: 'kubeadm', name: 'Kubeadm', tag: 'Standard Upstream', minRam: '4GB' }
                ].map(engine => {
                  const isSelected = orchestrator === engine.id;
                  const isRec = recommendation.orchestrator === engine.id;
                  return (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => setOrchestrator(engine.id as OrchestratorType)}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all relative flex flex-col items-center justify-center gap-0.5",
                        isSelected
                          ? "bg-[#0D6EFD]/5 border-[#0D6EFD] shadow-sm text-[#0D6EFD] font-bold"
                          : "bg-white border-[#E9ECEF] hover:border-gray-300 text-[#495057]"
                      )}
                    >
                      {isRec && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-sm">
                          Suggested
                        </div>
                      )}
                      <span className="text-xs font-extrabold">{engine.name}</span>
                      <span className="text-[9px] text-[#6C757D]">{engine.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Topology & Fault Tolerance */}
            <div>
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers size={14} className="text-[#0D6EFD]" /> 3. Deployment Topology & Fault Tolerance
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { id: 'single-node', title: 'Single Node', desc: 'All-in-one Master + Worker on 1 host' },
                  { id: 'multi-node', title: 'Multi-Node Cluster', desc: `1 Master + ${nodesCount} Worker nodes` },
                  { id: 'multi-zone', title: 'Multi-Zone (HA)', desc: 'Distributed across multiple availability zones' },
                  { id: 'multi-zone-quorum', title: 'Multi-Zone + Quorum Zone', desc: '3-way split with dedicated etcd witness/arbiter' }
                ].map(top => {
                  const isSelected = topology === top.id;
                  return (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => setTopology(top.id as TopologyType)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1",
                        isSelected
                          ? "bg-purple-50/70 border-purple-400 shadow-sm ring-1 ring-purple-400/20"
                          : "bg-white border-[#E9ECEF] hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-bold", isSelected ? "text-purple-900" : "text-[#1A1A1A]")}>
                          {top.title}
                        </span>
                        {isSelected && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-[10px] text-[#6C757D] leading-tight">{top.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Multi-node worker count slider */}
              {topology === 'multi-node' && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-[#495057]">Worker Node Count:</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={nodesCount}
                      onChange={e => setNodesCount(parseInt(e.target.value) || 1)}
                      className="w-32 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-gray-300 rounded-md">
                      {nodesCount} Workers
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 6: Generated Package & Guided Commands */}
            <div className="pt-2 border-t border-[#F1F3F5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h6 className="text-xs font-bold text-[#1A1A1A]">
                    {isAirgap ? 'Air-Gapped Self-Contained Installation Package' : 'Ready-to-Deploy Provisioning Package'}
                  </h6>
                  <p className="text-[11px] text-[#6C757D]">
                    {isAirgap 
                      ? 'Self-contained archive with offline binaries, image tarballs, loader scripts, and prechecks.'
                      : 'Download the complete archive or run the commands on your target host.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#495057] bg-white border border-[#DEE2E6] hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  >
                    {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied Script' : 'Copy Commands'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={handleDownloadPackage}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50",
                      isAirgap 
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" 
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    )}
                  >
                    {isDownloading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>
                      {isDownloading 
                        ? 'Bundling Package…' 
                        : isAirgap 
                          ? 'Download Complete Air-Gapped Package (.zip)' 
                          : 'Download Setup Package (.zip)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="relative">
                <pre className="p-3.5 bg-[#1E222A] text-[#ABB2BF] rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-gray-800">
                  {generatedScript}
                </pre>
              </div>

              {/* Tip / Fill credentials helper */}
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info size={15} className="text-[#0D6EFD] shrink-0" />
                  <span>
                    {isAirgap
                      ? 'After extracting the package and running ./install.sh on your air-gapped node, copy the printed credentials into the inputs below.'
                      : 'After running the package on your host, copy the generated API Server URL and Token into the connection box below.'}
                  </span>
                </div>
                {onApplyCredentials && (
                  <button
                    type="button"
                    onClick={() => onApplyCredentials('https://127.0.0.1:6443')}
                    className="shrink-0 text-[11px] font-bold text-[#0D6EFD] hover:underline"
                  >
                    Pre-fill Default URL
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

