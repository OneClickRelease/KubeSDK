import React from 'react';
import { motion } from 'motion/react';
import { Zap, ShieldCheck, Monitor, ChevronRight } from 'lucide-react';

interface HomeViewProps {
  onStart: () => void;
}

export const HomeView = ({ onStart }: HomeViewProps) => {
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-4xl font-bold">KubeSDK Cluster Model Simulator</h2>
        <p className="text-xl text-[#6C757D]">The high-performance Kubernetes localized runtime compiler.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
          <div className="w-12 h-12 bg-[#0D6EFD]/10 rounded-xl flex items-center justify-center text-[#0D6EFD]">
            <Zap size={24} />
          </div>
          <h3 className="font-bold text-lg">Fast Simulation</h3>
          <p className="text-sm text-[#6C757D]">Spin up complex cluster models in seconds using k3d on your local machine.</p>
        </div>
        <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
          <div className="w-12 h-12 bg-[#198754]/10 rounded-xl flex items-center justify-center text-[#198754]">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-bold text-lg">Safe Import</h3>
          <p className="text-sm text-[#6C757D]">Import from live clusters with automatic secret masking and manifest stripping.</p>
        </div>
        <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
          <div className="w-12 h-12 bg-[#6F42C1]/10 rounded-xl flex items-center justify-center text-[#6F42C1]">
            <Monitor size={24} />
          </div>
          <h3 className="font-bold text-lg">Resource Aware</h3>
          <p className="text-sm text-[#6C757D]">Intelligent feasibility checks ensure your simulation fits your laptop's resources.</p>
        </div>
      </div>

      <div className="pt-12 space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onStart}
            className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 flex items-center gap-3"
          >
            Get Started <ChevronRight size={20} />
          </button>
        </div>

        {/* Capability Registry Preview */}
        <RegistryPreview />
      </div>
    </motion.div>
  );
};

const RegistryPreview = () => {
  const [capabilities, setCapabilities] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/registry').then(res => res.json()).then(data => setCapabilities(data.registry || []));
  }, []);

  if (capabilities.length === 0) return null;

  return (
    <div className="pt-8 border-t border-[#E9ECEF] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="text-[#0D6EFD]" size={18} />
          <h3 className="font-bold text-lg">Active Capability Registry</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.slice(0, 6).map((cap, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#E9ECEF] rounded-xl shadow-sm hover:border-[#0D6EFD] transition-all group">
            <div className="w-10 h-10 bg-[#F8F9FA] rounded-lg flex items-center justify-center text-[#6C757D] group-hover:bg-[#E7F1FF] group-hover:text-[#0D6EFD] transition-all">
              <Code size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#1A1A1A] truncate">{cap.displayName}</p>
              <p className="text-[10px] text-[#ADB5BD] uppercase font-bold tracking-tight">{cap.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Code = ({ size, className }: { size?: number, className?: string }) => (
  <svg size={size} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
);

