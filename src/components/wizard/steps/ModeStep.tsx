import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const ModeStep = () => {
  return (
    <div className="space-y-6">
      <p className="text-[#495057]">Define what KubeSDK concepts will exist locally.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          'Namespaces', 'Workloads', 'Services', 'Ingress', 'ConfigMaps', 'Secrets', 'Policies'
        ].map((key) => (
          <button
            key={key}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all border-[#0D6EFD] bg-[#E7F1FF]/30 text-[#0D6EFD]"
            )}
          >
            <div className={cn("w-5 h-5 rounded border flex items-center justify-center bg-[#0D6EFD] border-[#0D6EFD] text-white")}>
              <CheckCircle2 size={12} />
            </div>
            <span className="text-sm font-medium capitalize">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
