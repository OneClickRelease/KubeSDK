import React from 'react';
import { Cloud, Edit2, RefreshCw, FileUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LocalRunSource, KubeSDKLocalRun } from '../../../types';

interface SourceStepProps {
  source: LocalRunSource;
  onSourceChange: (source: LocalRunSource) => void;
  onSnapshotImport?: (config: Partial<KubeSDKLocalRun>) => void;
}

export const SourceStep = ({ source, onSourceChange, onSnapshotImport }: SourceStepProps) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const response = await fetch('/api/parse-snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ yaml: content }),
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (onSnapshotImport) {
          onSnapshotImport(data);
        }
      } catch (err: any) {
        alert("Failed to parse snapshot: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <p className="text-[#495057]">Decide how the local simulation is defined.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => onSourceChange('live')}
          disabled={isProcessing}
          className={cn(
            "p-6 rounded-3xl border-2 text-left transition-all",
            source === 'live' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", source === 'live' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
              <Cloud size={20} />
            </div>
            <h4 className="font-bold">Live Cluster Import</h4>
          </div>
          <p className="text-sm text-[#6C757D]">Connect to an existing Kubernetes cluster and snapshot its current state (namespaces, apps, etc.)</p>
        </button>

        <button 
          onClick={() => onSourceChange('manual')}
          disabled={isProcessing}
          className={cn(
            "p-6 rounded-3xl border-2 text-left transition-all",
            source === 'manual' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", source === 'manual' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
              <Edit2 size={20} />
            </div>
            <h4 className="font-bold">Manual / YAML Upload</h4>
          </div>
          <p className="text-sm text-[#6C757D]">Start from scratch using the visual Model builder or upload a standard Kubernetes export.zip.</p>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={cn(
            "p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group",
            source === 'snapshot_yaml' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", source === 'snapshot_yaml' ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600")}>
              {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <FileUp size={20} />}
            </div>
            <h4 className="font-bold">Update Cluster YAML</h4>
          </div>
          <p className="text-sm text-[#6C757D]">Resume from a previously downloaded KubeSDK simulation snapshot YAML.</p>
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full uppercase tracking-wider">
            Re-import
          </div>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".yaml,.yml" 
        onChange={handleFileUpload}
      />
    </div>
  );
};
