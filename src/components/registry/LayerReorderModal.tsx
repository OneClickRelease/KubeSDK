import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowUp, ArrowDown, MoveVertical, Save, CheckCircle2,
  AlertTriangle, Layers, ChevronDown, ChevronRight, RefreshCw, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReorderLayerItem {
  id: string;
  name: string;
  sub_layers?: Array<{ name: string }>;
}

interface LayerReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  layers: Array<{ id: string; name: string; sub_layers: Array<{ name: string }> }>;
}

export const LayerReorderModal: React.FC<LayerReorderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  layers: initialLayers
}) => {
  const [orderedLayers, setOrderedLayers] = useState<ReorderLayerItem[]>([]);
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [subLayerOrders, setSubLayerOrders] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setOrderedLayers(initialLayers.map(l => ({
        id: l.id,
        name: l.name,
        sub_layers: [...(l.sub_layers || [])]
      })));

      const subOrders: Record<string, string[]> = {};
      initialLayers.forEach(l => {
        if (l.sub_layers && l.sub_layers.length > 0) {
          subOrders[l.id] = l.sub_layers.map(s => s.name);
        }
      });
      setSubLayerOrders(subOrders);
    }
  }, [isOpen, initialLayers]);

  if (!isOpen) return null;

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedLayers.length) return;

    const next = [...orderedLayers];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedLayers(next);
  };

  const moveSubLayer = (layerId: string, subIndex: number, direction: 'up' | 'down') => {
    const subs = subLayerOrders[layerId] || [];
    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= subs.length) return;

    const nextSubs = [...subs];
    const [moved] = nextSubs.splice(subIndex, 1);
    nextSubs.splice(targetIndex, 0, moved);

    setSubLayerOrders(prev => ({
      ...prev,
      [layerId]: nextSubs
    }));
  };

  const toggleExpand = (layerId: string) => {
    setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const layerOrder = orderedLayers.map(l => l.id);

    try {
      const res = await fetch('/api/registry/capabilities/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layerOrder,
          subLayerOrder: subLayerOrders
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        onSuccess();
        onClose();
      } else {
        setError(json.message || 'Failed to persist order');
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <MoveVertical size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Reorder Layers & Sub-Layers</h2>
              <p className="text-xs text-[#6C757D]">
                Adjust visual ordering of categories and sub-layers. Order is persisted to YAML.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            {orderedLayers.map((layer, index) => {
              const hasSubs = (subLayerOrders[layer.id] || []).length > 0;
              const isExpanded = !!expandedLayers[layer.id];
              const subs = subLayerOrders[layer.id] || [];

              return (
                <div key={layer.id} className="border border-[#E9ECEF] rounded-xl overflow-hidden bg-[#FDFDFE]">
                  {/* Layer Item Row */}
                  <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {hasSubs ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(layer.id)}
                          className="p-1 hover:bg-gray-200 rounded text-[#6C757D]"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <div className="w-5" />
                      )}
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-[#495057] text-[11px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-[#1A1A1A]">{layer.name}</span>
                      {hasSubs && (
                        <span className="text-[10px] text-[#ADB5BD] font-semibold">
                          ({subs.length} sub-layers)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveLayer(index, 'up')}
                        className="p-1.5 hover:bg-gray-100 disabled:opacity-30 rounded-lg text-[#495057] transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === orderedLayers.length - 1}
                        onClick={() => moveLayer(index, 'down')}
                        className="p-1.5 hover:bg-gray-100 disabled:opacity-30 rounded-lg text-[#495057] transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-layers Accordion */}
                  <AnimatePresence initial={false}>
                    {hasSubs && isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#F8F9FA] border-t border-[#E9ECEF] p-2.5 pl-8 space-y-1.5"
                      >
                        <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">
                          Sub-Layers Order
                        </p>
                        {subs.map((subName, subIdx) => (
                          <div
                            key={subName}
                            className="flex items-center justify-between px-3 py-1.5 bg-white border border-[#E9ECEF] rounded-lg text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#ADB5BD] font-mono">{subIdx + 1}.</span>
                              <span className="font-semibold text-[#495057]">{subName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={subIdx === 0}
                                onClick={() => moveSubLayer(layer.id, subIdx, 'up')}
                                className="p-1 hover:bg-gray-100 disabled:opacity-30 rounded text-[#495057]"
                                title="Move Sub-layer Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={subIdx === subs.length - 1}
                                onClick={() => moveSubLayer(layer.id, subIdx, 'down')}
                                className="p-1 hover:bg-gray-100 disabled:opacity-30 rounded text-[#495057]"
                                title="Move Sub-layer Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E9ECEF] bg-[#F8F9FA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6C757D] hover:bg-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] rounded-xl shadow-md shadow-[#0D6EFD]/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving Order…' : 'Save & Apply Order'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
