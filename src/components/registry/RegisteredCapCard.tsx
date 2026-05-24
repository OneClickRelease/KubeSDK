import React from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Zap, 
  MessageSquare, 
  Globe, 
  Box, 
  Edit2, 
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';

interface RegisteredCapCardProps {
  capability: any;
  onEdit: (cap: any) => void;
  onDelete: (id: string) => void;
}

export const RegisteredCapCard = ({ capability, onEdit, onDelete }: RegisteredCapCardProps) => {
  const getIcon = (type: string) => {
    if (!type) return <Box size={18} className="text-[#6C757D]" />;
    const t = type.toLowerCase();
    if (t.includes('sql') || t.includes('mongo')) return <Database size={18} className="text-emerald-500" />;
    if (t.includes('kafka') || t.includes('rabbit')) return <MessageSquare size={18} className="text-orange-500" />;
    if (t.includes('redis')) return <Zap size={18} className="text-amber-500" />;
    if (t.includes('api')) return <Globe size={18} className="text-blue-500" />;
    return <Box size={18} className="text-[#6C757D]" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E9ECEF] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F8F9FA] rounded-xl flex items-center justify-center group-hover:bg-[#E7F1FF] transition-all">
            {getIcon(capability.type)}
          </div>
          <div>
            <h4 className="font-bold text-[#1A1A1A]">{capability.displayName}</h4>
            <div className="flex items-center gap-2 text-[10px] text-[#ADB5BD] uppercase font-bold tracking-tight">
              <Layers size={10} />
              {capability.namespace}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => onEdit(capability)}
            className="p-1.5 hover:bg-[#E7F1FF] rounded-lg text-[#0D6EFD] transition-all"
            title="Edit Capability"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(capability.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all"
            title="Delete Capability"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#6C757D]">
          <span className="font-medium">Interface:</span>
          <span className="font-mono bg-[#F8F9FA] px-1.5 py-0.5 rounded">{capability.config.host}:{capability.config.port}</span>
        </div>
        
        <div className="flex items-center gap-3 pt-3 border-t border-[#F8F9FA]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#ADB5BD]">
            <Calendar size={12} />
            {new Date(capability.createdAt).toLocaleDateString()}
          </div>
          <div className="flex-1" />
          <div className="flex -space-x-1.5">
            {Object.keys(capability.snippets || {}).map((lang) => (
              <div 
                key={lang}
                className="w-5 h-5 rounded-full border-2 border-white bg-[#E9ECEF] flex items-center justify-center text-[8px] font-bold text-[#6C757D] uppercase"
                title={lang}
              >
                {lang[0]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
