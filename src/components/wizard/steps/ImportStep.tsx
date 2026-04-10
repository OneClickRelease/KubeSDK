import React from 'react';
import { Cloud, Search, Terminal, AlertCircle } from 'lucide-react';
import { KubeSDKLocalRun } from '../../../types';

interface ImportStepProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  isFetching: boolean;
  onFetchCluster: () => void;
}

export const ImportStep = ({ config, setConfig, isFetching, onFetchCluster }: ImportStepProps) => {
  return (
    <div className="space-y-8">
      <div className="p-6 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-lg border border-[#DEE2E6] flex items-center justify-center text-[#0D6EFD]">
          <Cloud size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Cluster Endpoint Access</h4>
          <p className="text-xs text-[#6C757D]">Provide details to connect to the target Kubernetes cluster environment.</p>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3">
        <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> This step will only read the cluster configuration. It will <strong>not</strong> perform any modifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#495057]">API Server URL</label>
            <input 
              type="text" 
              placeholder="e.g. https://1.2.3.4:6443" 
              value={config.wizard.connectivity?.apiServerUrl}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, apiServerUrl: e.target.value } }
              }))}
              className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#495057]">Authentication Token</label>
            <input 
              type="password" 
              placeholder="Bearer token..." 
              value={config.wizard.connectivity?.token}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, token: e.target.value } }
              }))}
              className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#495057]">CA Certificate (Optional)</label>
            <textarea 
              placeholder="-----BEGIN CERTIFICATE-----" 
              rows={4}
              value={config.wizard.connectivity?.caCert}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                wizard: { ...prev.wizard, connectivity: { ...prev.wizard.connectivity!, caCert: e.target.value } }
              }))}
              className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-mono text-xs" 
            />
          </div>

          <div className="pt-4">
            <button 
              onClick={onFetchCluster}
              disabled={isFetching}
              className="w-full py-4 bg-[#0D6EFD] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0B5ED7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {isFetching ? 'Fetching...' : 'Fetch Cluster Configuration'}
            </button>
          </div>
        </div>

        <div className="bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] p-6 text-sm text-[#495057] overflow-y-auto max-h-[calc(100vh-320px)] min-h-[600px]">
          <h5 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Terminal size={18} />
            How to get cluster credentials
          </h5>
          
          <div className="space-y-6">
            <div>
              <h6 className="font-bold text-[#212529] mb-2 flex items-center gap-2">🚀 Quick Setup (Standard/Rancher)</h6>
              <p className="text-xs mb-3 text-[#6C757D]">Copy and run this script in your terminal to create a long-lived admin token and get your API URL.</p>
              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-4 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed border border-black shadow-inner">
{`# Create ServiceAccount
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-admin-user
  namespace: kube-system
EOF

# Create ClusterRoleBinding for full admin rights
kubectl apply -f - << 'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-user-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: cluster-admin-user
    namespace: kube-system
EOF

# Create token for the ServiceAccount
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: cluster-admin-user-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: cluster-admin-user
type: kubernetes.io/service-account-token
EOF

# Wait a moment for token to be generated
sleep 2

echo "==== CLUSTER ADMIN TOKEN ===="
kubectl get secret cluster-admin-user-token -n kube-system -o jsonpath='{.data.token}' | base64 --decode
echo ""
echo "============================="

echo "==== API SERVER URL ===="
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
echo ""
echo "========================"`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
