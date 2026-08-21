import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Save, AlertTriangle, Layers, Plus, Globe,
  Cpu, Server, HardDrive, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getProviderLogo } from './CapabilityLayersBrowser';

interface ProviderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit' | 'version';
  initialData?: any;
  layerId?: string;
  subLayerName?: string;
  availableLayers: Array<{ id: string; name: string; sub_layers: Array<{ name: string }> }>;
}

export const ProviderFormModal: React.FC<ProviderFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData,
  layerId: defaultLayerId,
  subLayerName: defaultSubLayerName,
  availableLayers
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState(defaultLayerId || availableLayers[0]?.id || 'database');
  const [selectedSubLayerName, setSelectedSubLayerName] = useState(defaultSubLayerName || '');
  
  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  
  // Versioning & Deprecation
  const [version, setVersion] = useState('v1');
  const [latestVersion, setLatestVersion] = useState('1.0.0');
  const [changelog, setChangelog] = useState('');
  const [deprecated, setDeprecated] = useState(false);
  const [deprecationReason, setDeprecationReason] = useState('');

  // Specs & Runtime
  const [licenseConditions, setLicenseConditions] = useState('Apache 2.0');
  const [protocolsInput, setProtocolsInput] = useState('');
  const [portsInput, setPortsInput] = useState('');
  const [dependenciesInput, setDependenciesInput] = useState('');
  const [haRecommendation, setHaRecommendation] = useState('');
  const [vcpu, setVcpu] = useState('2');
  const [memory, setMemory] = useState('4Gi');
  const [disk, setDisk] = useState('20Gi');

  // UI state
  const [activeTab, setActiveTab] = useState<'general' | 'specs' | 'versioning'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync sub-layers on layer change
  const currentLayer = availableLayers.find(l => l.id === selectedLayerId);
  const hasSubLayers = currentLayer && currentLayer.sub_layers && currentLayer.sub_layers.length > 0;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setImageUrl(initialData.image_url || '');
        setWebsiteUrl(initialData.website_url || '');
        setRepoUrl(initialData.repo_url || '');
        setDocumentationUrl(initialData.documentation_url || '');
        setVersion(initialData.version || 'v1');
        setLatestVersion(initialData.latest_version || '1.0.0');
        setDeprecated(initialData.deprecated === true);
        setDeprecationReason(initialData.deprecation_reason || '');
        setLicenseConditions(initialData.license_conditions || '');
        setProtocolsInput((initialData.protocols_supported || []).join(', '));
        setPortsInput((initialData.default_ports || []).join(', '));
        setDependenciesInput((initialData.dependencies || []).join(', '));
        setHaRecommendation(initialData.ha_recommendation || '');
        setVcpu(initialData.resources?.vcpu || '2');
        setMemory(initialData.resources?.memory || '4Gi');
        setDisk(initialData.resources?.disk || '20Gi');
        setChangelog('');
      } else {
        setName('');
        setDescription('');
        setImageUrl('');
        setWebsiteUrl('');
        setRepoUrl('');
        setDocumentationUrl('');
        setVersion('v1');
        setLatestVersion('');
        setDeprecated(false);
        setDeprecationReason('');
        setLicenseConditions('');
        setProtocolsInput('');
        setPortsInput('');
        setDependenciesInput('');
        setHaRecommendation('');
        setVcpu('');
        setMemory('');
        setDisk('');
        setChangelog('');
      }

      if (defaultLayerId) setSelectedLayerId(defaultLayerId);
      if (defaultSubLayerName) setSelectedSubLayerName(defaultSubLayerName);
      else if (currentLayer?.sub_layers?.[0]) setSelectedSubLayerName(currentLayer.sub_layers[0].name);
    }
  }, [isOpen, initialData, defaultLayerId, defaultSubLayerName]);

  useEffect(() => {
    if (hasSubLayers && !currentLayer.sub_layers.some(s => s.name === selectedSubLayerName)) {
      setSelectedSubLayerName(currentLayer.sub_layers[0]?.name || '');
    }
  }, [selectedLayerId, hasSubLayers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Provider name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const protocols = protocolsInput.split(',').map(s => s.trim()).filter(Boolean);
    const ports = portsInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const dependencies = dependenciesInput.split(',').map(s => s.trim()).filter(Boolean);

    const providerPayload = {
      name: name.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      website_url: websiteUrl.trim(),
      repo_url: repoUrl.trim(),
      documentation_url: documentationUrl.trim(),
      version: version.trim(),
      latest_version: latestVersion.trim(),
      deprecated,
      deprecation_reason: deprecated ? deprecationReason.trim() : '',
      license_conditions: licenseConditions.trim(),
      protocols_supported: protocols,
      default_ports: ports,
      resources: { vcpu, memory, disk },
      dependencies,
      ha_recommendation: haRecommendation.trim(),
      languages: initialData?.languages || {}
    };

    try {
      let res: Response;
      if (mode === 'create') {
        res = await fetch('/api/registry/capabilities/provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layerId: selectedLayerId,
            subLayerName: hasSubLayers ? selectedSubLayerName : undefined,
            provider: providerPayload
          })
        });
      } else if (mode === 'edit') {
        res = await fetch('/api/registry/capabilities/provider', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layerId: selectedLayerId,
            subLayerName: hasSubLayers ? selectedSubLayerName : undefined,
            oldName: initialData?.name || name,
            provider: providerPayload
          })
        });
      } else {
        // Mode: version bump
        res = await fetch('/api/registry/capabilities/provider/version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layerId: selectedLayerId,
            subLayerName: hasSubLayers ? selectedSubLayerName : undefined,
            providerName: initialData?.name || name,
            newVersion: version,
            latestVersion,
            changelog,
            changes: providerPayload
          })
        });
      }

      const json = await res.json();
      if (json.status === 'success') {
        onSuccess();
        onClose();
      } else {
        setError(json.message || 'Action failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  const previewLogo = imageUrl || (name ? getProviderLogo(name) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D6EFD]/10 flex items-center justify-center text-[#0D6EFD]">
              {mode === 'create' ? <Plus size={20} /> : mode === 'version' ? <Sparkles size={20} /> : <Save size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">
                {mode === 'create' ? 'Add New Capability Provider' : mode === 'version' ? `Add New Version: ${initialData?.name}` : `Edit Provider: ${initialData?.name}`}
              </h2>
              <p className="text-xs text-[#6C757D]">
                {mode === 'create' ? 'Register a new provider and automatically update the capability YAML.' : mode === 'version' ? 'Bump provider version, archive older release, and create a version snapshot.' : 'Update provider specifications and automatically create a YAML version snapshot.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E9ECEF] px-6 bg-white">
          {[
            { id: 'general', label: 'General Info' },
            { id: 'specs', label: 'Runtime & Resources' },
            { id: 'versioning', label: mode === 'version' ? 'New Release & Changelog' : 'Version & Status' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-[#0D6EFD] text-[#0D6EFD]'
                  : 'border-transparent text-[#6C757D] hover:text-[#1A1A1A]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Layer Selection (Disabled in edit/version mode) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Target Layer
                  </label>
                  <select
                    disabled={mode !== 'create'}
                    value={selectedLayerId}
                    onChange={e => setSelectedLayerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none disabled:bg-[#F8F9FA] disabled:text-[#6C757D]"
                  >
                    {availableLayers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {hasSubLayers && (
                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                      Sub-Layer
                    </label>
                    <select
                      disabled={mode !== 'create'}
                      value={selectedSubLayerName}
                      onChange={e => setSelectedSubLayerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none disabled:bg-[#F8F9FA] disabled:text-[#6C757D]"
                    >
                      {currentLayer.sub_layers.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Name & Logo */}
              <div className="grid grid-cols-3 gap-4 items-start">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Provider Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CockroachDB, NATS, Dragonfly"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Logo Preview
                  </label>
                  <div className="w-12 h-12 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-center overflow-hidden">
                    {previewLogo ? (
                      <img src={previewLogo} alt="Preview" className="w-8 h-8 object-contain" />
                    ) : (
                      <Layers size={20} className="text-[#ADB5BD]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide a concise description of the provider..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                />
              </div>

              {/* Logo / Image URL */}
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                  Custom Icon / Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://... (Leave blank to use auto-brand lookup)"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none font-mono text-xs"
                />
              </div>

              {/* External Links */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.org"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E9ECEF] rounded-lg focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E9ECEF] rounded-lg focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#495057] uppercase tracking-wider mb-1">
                    Docs URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.example.org"
                    value={documentationUrl}
                    onChange={e => setDocumentationUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E9ECEF] rounded-lg focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Runtime & Specs */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    License Conditions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apache 2.0, MIT, Commercial"
                    value={licenseConditions}
                    onChange={e => setLicenseConditions(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Protocols Supported
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated: TCP, HTTP, gRPC"
                    value={protocolsInput}
                    onChange={e => setProtocolsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Default Ports
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated: 3306, 33060"
                    value={portsInput}
                    onChange={e => setPortsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Dependencies
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated: Linux host, Docker, etc."
                    value={dependenciesInput}
                    onChange={e => setDependenciesInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
              </div>

              {/* Resource Allocations */}
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-2">
                  Recommended Resource Sizing
                </label>
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Cpu size={12} /> vCPU
                    </label>
                    <input
                      type="text"
                      placeholder="2"
                      value={vcpu}
                      onChange={e => setVcpu(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg focus:border-[#0D6EFD] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Server size={12} /> Memory
                    </label>
                    <input
                      type="text"
                      placeholder="4Gi"
                      value={memory}
                      onChange={e => setMemory(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg focus:border-[#0D6EFD] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <HardDrive size={12} /> Disk
                    </label>
                    <input
                      type="text"
                      placeholder="20Gi"
                      value={disk}
                      onChange={e => setDisk(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#DEE2E6] rounded-lg focus:border-[#0D6EFD] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* HA Recommendation */}
              <div>
                <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                  High Availability Recommendation
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deploy with replication cluster across 3+ availability zones."
                  value={haRecommendation}
                  onChange={e => setHaRecommendation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Versioning & Status */}
          {activeTab === 'versioning' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Catalog Version
                  </label>
                  <input
                    type="text"
                    placeholder="v1, v2, etc."
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Latest Release Version
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8.4.0, 16.2"
                    value={latestVersion}
                    onChange={e => setLatestVersion(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {mode === 'version' && (
                <div>
                  <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                    Release Changelog / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what changed in this version release..."
                    value={changelog}
                    onChange={e => setChangelog(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
                  />
                </div>
              )}

              {/* Deprecation Control */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Deprecation Status</p>
                      <p className="text-[11px] text-amber-700">Mark this provider as deprecated to discourage new deployments.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deprecated}
                      onChange={e => setDeprecated(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {deprecated && (
                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                      Deprecation Reason / Migration Notice
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Replaced by Dragonfly; maintenance ends 2027."
                      value={deprecationReason}
                      onChange={e => setDeprecationReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E9ECEF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-[#6C757D] hover:bg-[#F8F9FA] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] rounded-xl shadow-lg shadow-[#0D6EFD]/20 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? 'Saving…' : mode === 'create' ? 'Create Provider' : mode === 'version' ? 'Publish Version' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
