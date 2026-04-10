import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const ValidationStep = () => {
  return (
    <div className="space-y-8">
      <p className="text-[#495057]">Final checks before local deployment.</p>
      
      <div className="space-y-3">
        {[
          { label: 'All dependencies resolved', status: 'pass' },
          { label: 'All secrets exist (masked)', status: 'pass' },
          { label: 'Images accessible locally', status: 'pass' },
          { label: 'Disk space sufficient', status: 'pass' },
          { label: 'No policy violations', status: 'pass' },
        ].map((check, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
            <span className="text-sm font-medium">{check.label}</span>
            <div className="flex items-center gap-2 text-[#198754]">
              <span className="text-xs font-bold uppercase">Passed</span>
              <CheckCircle2 size={16} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-[#0D6EFD]/5 border border-[#0D6EFD]/20 rounded-xl">
        <h4 className="font-bold text-[#0D6EFD] mb-2">Ready for Simulation</h4>
        <p className="text-sm text-[#0D6EFD]/80">Your local runtime configuration is 100% valid. Proceed to deploy the simulated cluster.</p>
      </div>
    </div>
  );
};
