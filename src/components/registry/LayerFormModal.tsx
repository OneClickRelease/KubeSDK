import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Save, Layers, AlertTriangle, Plus, FolderPlus,
  Edit2, FileCode, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type LayerModalMode = 'create-layer' | 'edit-layer' | 'create-sublayer' | 'edit-sublayer';

interface LayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: LayerModalMode;
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    image_url?: string;
    parent?: string;
  };
  layerId?: string;
  availableLayers: Array<{ id: string; name: string }>;
}

export const LayerFormModal: React.FC<LayerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData,
  layerId: defaultLayerId,
  availableLayers
}) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedLayerId, setSelectedLayerId] = useState(defaultLayerId || availableLayers[0]?.id || '');
  const [hasDirectFile, setHasDirectFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLayerMode = mode === 'create-layer' || mode === 'edit-layer';
  const isCreate = mode === 'create-layer' || mode === 'create-sublayer';

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialData) {
        setName(initialData.name || '');
        setId(initialData.id || '');
        setDescription(initialData.description || '');
        setImageUrl(initialData.image_url || '');
      } else {
        setName('');
        setId('');
        setDescription('');
        setImageUrl('');
        setHasDirectFile(false);
      }

      if (defaultLayerId) {
        setSelectedLayerId(defaultLayerId);
      } else if (availableLayers.length > 0 && !selectedLayerId) {
        setSelectedLayerId(availableLayers[0].id);
      }
    }
  }, [isOpen, initialData, defaultLayerId, availableLayers]);

  // Auto-generate ID from name when creating layer
  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'create-layer' && !initialData) {
      setId(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = {};

      if (mode === 'create-layer') {
        endpoint = '/api/registry/capabilities/layer';
        method = 'POST';
        body = {
          id: id.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl.trim(),
          hasFile: hasDirectFile
        };
      } else if (mode === 'edit-layer') {
        endpoint = '/api/registry/capabilities/layer';
        method = 'PUT';
        body = {
          id: initialData?.id || id,
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl.trim()
        };
      } else if (mode === 'create-sublayer') {
        endpoint = '/api/registry/capabilities/sublayer';
        method = 'POST';
        body = {
          layerId: selectedLayerId,
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl.trim()
        };
      } else if (mode === 'edit-sublayer') {
        endpoint = '/api/registry/capabilities/sublayer';
        method = 'PUT';
        body = {
          layerId: selectedLayerId || defaultLayerId,
          oldName: initialData?.name || name,
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl.trim()
        };
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (json.status === 'success') {
        onSuccess();
        onClose();
      } else {
        setError(json.message || 'Operation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'create-layer'
    ? 'Add Top-Level Layer'
    : mode === 'edit-layer'
    ? `Edit Layer: ${initialData?.name || ''}`
    : mode === 'create-sublayer'
    ? 'Add New Sub-Layer'
    : `Edit Sub-Layer: ${initialData?.name || ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D6EFD] flex items-center justify-center">
              {isLayerMode ? <Layers size={20} /> : <FolderPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">{title}</h2>
              <p className="text-xs text-[#6C757D]">
                {isLayerMode
                  ? 'Define top-level category layer in capability-layers.yaml.'
                  : 'Add or update a capability sub-layer and link its YAML manifest.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sub-layer: Parent Layer dropdown */}
          {!isLayerMode && (
            <div>
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                Parent Layer *
              </label>
              <select
                disabled={!isCreate}
                value={selectedLayerId}
                onChange={e => setSelectedLayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none disabled:bg-[#F8F9FA] disabled:text-[#6C757D]"
              >
                {availableLayers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
              {isLayerMode ? 'Layer Name *' : 'Sub-Layer Name *'}
            </label>
            <input
              type="text"
              required
              placeholder={isLayerMode ? 'e.g. Observability, Networking, Security' : 'e.g. Tracing, Logging, Key Management'}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
            />
          </div>

          {/* Layer Identifier Key (for layer create) */}
          {mode === 'create-layer' && (
            <div>
              <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
                Layer Identifier (Key) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. observability, networking"
                value={id}
                onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe the capabilities provided by this layer..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
            />
          </div>

          {/* Icon / Image URL */}
          <div>
            <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1.5">
              Image / Icon Path
            </label>
            <input
              type="text"
              placeholder="images/my-layer.png (or https://...)"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-[#E9ECEF] rounded-xl focus:border-[#0D6EFD] focus:outline-none"
            />
          </div>

          {/* Direct File checkbox for Layer create */}
          {mode === 'create-layer' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">Direct Providers File</p>
                <p className="text-[11px] text-[#6C757D]">Layer has direct providers without sub-layers (e.g. messaging.yaml)</p>
              </div>
              <input
                type="checkbox"
                checked={hasDirectFile}
                onChange={e => setHasDirectFile(e.target.checked)}
                className="w-4 h-4 text-[#0D6EFD] rounded focus:ring-[#0D6EFD]"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9ECEF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6C757D] hover:bg-[#F8F9FA] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] rounded-xl shadow-md shadow-[#0D6EFD]/20 transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'Saving…' : isCreate ? 'Create & Save' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
