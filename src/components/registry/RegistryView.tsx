import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  History, 
  Upload, 
  CheckCircle2, 
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { REGISTRY_SOURCE_KEY } from '../../lib/constants';
import { CapabilitySummary } from './CapabilitySummary';
import { CapabilityWizard } from './CapabilityWizard';
import { RegisteredCapCard } from './RegisteredCapCard';

export const RegistryView = () => {
  const [source, setSource] = React.useState<{ type: 'history' | 'upload' | 'none', value?: string }>(() => {
    try {
      const saved = localStorage.getItem(REGISTRY_SOURCE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { type: 'none' };
  });
  const [history, setHistory] = React.useState<any[]>([]);
  const [discovery, setDiscovery] = React.useState<Record<string, any[]>>({});
  const [registered, setRegistered] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<any | null>(null);

  React.useEffect(() => {
    fetch('/api/registry').then(res => res.json()).then(data => setRegistered(data.registry || []));
    fetch('/api/history').then(res => res.json()).then(data => setHistory(data.history || []));
    if (source.type !== 'none' && source.value) {
      handleSourceSelect(source.value, true); 
    }
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(REGISTRY_SOURCE_KEY, JSON.stringify(source)); } catch {}
  }, [source]);

  const handleSourceSelect = async (filename: string, isFromRestore = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/registry/discover?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setDiscovery(data.discovery);
        setSource({ type: 'history', value: filename });
        if (!isFromRestore && data.existingCapabilities && data.existingCapabilities.length > 0) {
          setRegistered(data.existingCapabilities);
          await fetch('/api/registry/reset', { method: 'POST' });
          for (const cap of data.existingCapabilities) {
            await fetch('/api/registry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cap)
            });
          }
        }
      }
    } catch (e) {
      console.error('Discovery failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationComplete = () => {
    setSelectedService(null);
    fetch('/api/registry').then(res => res.json()).then(data => setRegistered(data.registry || []));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this capability?')) return;
    try {
      const res = await fetch(`/api/registry/${id}`, { method: 'DELETE' });
      if (res.ok) fetch('/api/registry').then(res => res.json()).then(data => setRegistered(data.registry || []));
    } catch (e) { console.error('Delete failed', e); }
  };

  const handleEdit = (cap: any) => {
    setSelectedService({ ...cap, id: cap.serviceId, name: cap.displayName, isEdit: true });
  };

  const handlePersistVersion = async () => {
    if (!source.value) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/registry/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFilename: source.value }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert(data.message);
        setSource({ type: 'history', value: data.filename });
        fetch('/api/history').then(res => res.json()).then(d => setHistory(d.history || []));
      } else {
        alert('Save failed: ' + data.error);
      }
    } catch (error) {
      console.error('Persist failed', error);
      alert('Failed to save versioned YAML');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/registry/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.status === 'success') {
        alert(data.message);
        fetch('/api/registry').then(res => res.json()).then(d => setRegistered(d.registry || []));
        fetch('/api/history').then(res => res.json()).then(d => setHistory(d.history || []));
        handleSourceSelect(data.filename);
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-[#1A1A1A]">Capability Registry</h2>
          <p className="text-[#6C757D]">Discover cluster services and expose them as standardized capabilities for SDK users.</p>
        </div>
        <button 
          onClick={handlePersistVersion}
          disabled={source.type === 'none'}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            source.type === 'none' 
              ? "bg-[#F8F9FA] text-[#ADB5BD] border border-[#E9ECEF] cursor-not-allowed" 
              : "bg-[#198754] text-white hover:bg-[#157347] shadow-md shadow-[#198754]/10"
          )}
          title={source.type === 'none' ? "Select a source to enable saving versions" : "Save as New Integrated Version"}
        >
          <CheckCircle2 size={16} /> Save New Version
        </button>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadSpec} 
        className="hidden" 
        accept=".yaml,.yml"
      />

      {/* Discover Section */}
      <div className="space-y-6 pt-4 border-t border-[#F8F9FA]">
        <div className="flex items-center gap-2 text-[#0D6EFD]">
          <Search size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Discover New Capabilities</span>
          <div className="flex-1 h-[1px] bg-[#F8F9FA]" />
        </div>

        {source.type === 'none' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-8 bg-white border-2 border-dashed border-[#DEE2E6] rounded-2xl hover:border-[#0D6EFD] hover:bg-[#F8F9FA] transition-all group text-left"
            >
              <div className="w-12 h-12 bg-[#F8F9FA] rounded-xl flex items-center justify-center text-[#6C757D] group-hover:text-[#0D6EFD] group-hover:bg-[#E7F1FF] mb-4 transition-all">
                <Upload size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Upload YAML Spec</h3>
              <p className="text-sm text-[#6C757D]">Start by uploading a LocalRun YAML or any Kubernetes manifest.</p>
            </button>

            <div className="p-8 bg-white border border-[#E9ECEF] rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-[#1A1A1A] mb-4">
                <History className="text-[#0D6EFD]" size={20} />
                <h3 className="text-lg font-bold">Select from History</h3>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {history.length > 0 ? history.map((run, i) => (
                  <button
                    key={i}
                    onClick={() => handleSourceSelect(run.filename)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-[#E9ECEF] hover:border-[#0D6EFD] hover:bg-[#F8F9FA] transition-all text-left group"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-[#1A1A1A] group-hover:text-[#0D6EFD] transition-colors truncate max-w-[200px]">{run.filename.split('_').slice(1).join('_')}</p>
                      <p className="text-[11px] text-[#6C757D]">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#ADB5BD] group-hover:text-[#0D6EFD] transition-all" />
                  </button>
                )) : (
                  <p className="text-sm text-[#6C757D] italic py-8 text-center">No simulation history found.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-20">
            <div className="flex items-center gap-4 p-4 bg-white border border-[#E9ECEF] rounded-2xl shadow-sm">
              <div className="w-10 h-10 bg-[#E7F1FF] rounded-lg flex items-center justify-center text-[#0D6EFD]">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Source Loaded</p>
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{source.value}</p>
              </div>
              <button 
                onClick={() => setSource({ type: 'none' })}
                className="px-4 py-2 text-sm font-semibold text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
              >
                Change Source
              </button>
            </div>

            <CapabilitySummary
              discovery={discovery} 
              registered={registered}
              onSelectService={setSelectedService}
            />
          </div>
        )}
      </div>

      {/* Registered Capabilities */}
      {registered.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-[#F8F9FA]">
          <div className="flex items-center gap-2 text-[#ADB5BD]">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Registered Capabilities ({registered.length})</span>
            <div className="flex-1 h-[1px] bg-[#F8F9FA]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registered.map((cap) => (
              <RegisteredCapCard 
                key={cap.id} 
                capability={cap} 
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {selectedService && (
        <CapabilityWizard 
          service={selectedService} 
          sourceFilename={source.value}
          onClose={() => setSelectedService(null)}
          onComplete={handleRegistrationComplete}
        />
      )}
    </div>
  );
};
