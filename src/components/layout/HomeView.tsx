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

      <div className="pt-12">
        <button 
          onClick={onStart}
          className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 flex items-center gap-3"
        >
          Get Started <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
