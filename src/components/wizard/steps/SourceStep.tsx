import React from 'react';
import { Cloud, Edit2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LocalRunSource } from '../../../types';

interface SourceStepProps {
  source: LocalRunSource;
  onSourceChange: (source: LocalRunSource) => void;
}

export const SourceStep = ({ source, onSourceChange }: SourceStepProps) => {
  return (
    <div className="space-y-6">
      <p className="text-[#495057]">Decide how the local simulation is defined.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => onSourceChange('live')}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all",
            source === 'live' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", source === 'live' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
              <Cloud size={20} />
            </div>
            <h4 className="font-bold">Live Cluster Import</h4>
          </div>
          <p className="text-sm text-[#6C757D]">Connect to an existing Kubernetes cluster and snapshot its current state (namespaces, apps, etc.)</p>
        </button>

        <button 
          onClick={() => onSourceChange('manual')}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all",
            source === 'manual' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", source === 'manual' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
              <Edit2 size={20} />
            </div>
            <h4 className="font-bold">Manual / YAML Upload</h4>
          </div>
          <p className="text-sm text-[#6C757D]">Start from scratch using the visual Model builder or upload a standard Kubernetes export.zip.</p>
        </button>
      </div>
    </div>
  );
};
