import React from 'react';
import { Cloud, Download, AlertCircle } from 'lucide-react';

interface UploadStepProps {
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadStep = ({ isUploading, onUpload }: UploadStepProps) => {
  return (
    <div className="space-y-8">
      <div className="p-6 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-lg border border-[#DEE2E6] flex items-center justify-center text-[#0D6EFD]">
          <Download size={24} className="rotate-180" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Offline Cluster Upload</h4>
          <p className="text-xs text-[#6C757D]">Upload an export.zip from an existing cluster to auto-generate the resource map.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#495057]">Upload Export ZIP</label>
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-[#DEE2E6] border-dashed rounded-xl cursor-pointer bg-white hover:bg-[#F8F9FA] transition-all relative overflow-hidden">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                   <div className="w-10 h-10 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin mb-4" />
                ) : (
                   <Cloud size={40} className="text-[#ADB5BD] mb-4" />
                )}
                <p className="mb-2 text-sm text-[#495057] font-bold">
                  {isUploading ? 'Extracting and parsing...' : 'Click to select export.zip'}
                </p>
                <p className="text-xs text-[#6C757D]">ZIP containing Kubernetes YAML manifests</p>
              </div>
              <input type="file" accept=".zip" onChange={onUpload} className="hidden" disabled={isUploading} />
            </label>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Uploading a fresh export zip will overwrite manually modified components.
            </p>
          </div>
        </div>

        <div className="bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] p-6 text-sm text-[#495057] overflow-y-auto max-h-[calc(100vh-320px)] min-h-[600px]">
          <h5 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
            How to generate export.zip
          </h5>
          
          <div className="space-y-6">
            <p className="text-xs">Run this script on your local machine that is connected to the source Kubernetes cluster.</p>
            
            <div className="bg-[#1E1E1E] text-[#D4D4D4] p-4 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre">
{`# Create export folder structure
mkdir -p export/namespaces

# -------------------------
# Export namespaced resources
# -------------------------
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  echo "Exporting namespace: $ns"
  mkdir -p export/namespaces/$ns
  kubectl get all -n "$ns" -o yaml > export/namespaces/$ns/all.yaml 2>/dev/null
done

# -------------------------
# Create a zip file of the export folder
# -------------------------
zip -r export.zip export
echo "Export completed! File created: export.zip"`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
