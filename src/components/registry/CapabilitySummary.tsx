import React from 'react';
import { motion } from 'motion/react';
import { Database, Box, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CapabilitySummaryProps {
  discovery: Record<string, any[]>;
  registered: any[];
  onSelectService: (service: any) => void;
}

const THEMES = [
  { hex: 'bg-[#4a80ce]', border: 'border-[#d6e3f4]', conn: 'bg-[#4a80ce]' }, // Platform
  { hex: 'bg-[#6e4e9b]', border: 'border-[#dfd7eb]', conn: 'bg-[#6e4e9b]' }, // Default
  { hex: 'bg-[#3a8b5e]', border: 'border-[#d3e5dc]', conn: 'bg-[#3a8b5e]' }, // Tenant1
  { hex: 'bg-[#c3702a]', border: 'border-[#f2e1d0]', conn: 'bg-[#c3702a]' }, // Services
  { hex: 'bg-[#c83c44]', border: 'border-[#f3d4d7]', conn: 'bg-[#c83c44]' }, // Tenant2
];

export const CapabilitySummary = ({ discovery, registered, onSelectService }: CapabilitySummaryProps) => {
  const namespaces = Object.keys(discovery).sort();

  return (
    <div className="flex flex-col gap-[2px]">
      {namespaces.map((ns, idx) => {
        const theme = THEMES[idx % THEMES.length];
        const services = discovery[ns] || [];
        
        return (
          <div key={ns} className="flex min-h-[140px] items-stretch relative">
            
            {/* Hexagon Connector Layer */}
            <div className="flex items-center flex-shrink-0 w-[140px] relative z-10">
              
              {/* Pointy Hexagon */}
              <div 
                className={cn(
                  "w-[124px] h-[100px] flex items-center justify-center text-white py-4 px-2 tracking-[0.15em] text-[10px] font-bold uppercase shadow-sm relative z-20 transition-all",
                  theme.hex
                )}
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                title={ns}
              >
                <span className="truncate w-16 text-center">{ns}</span>
              </div>
              
              {/* Connector line protruding from the right point of the hexagon */}
              <div className={cn("h-[2px] w-[24px] absolute right-[-8px] z-10", theme.conn)} />
            </div>

            {/* Right container box */}
            <div className={cn(
              "flex-1 border-[1.5px] rounded-r-xl rounded-l-md flex items-center p-4 ml-[-4px] bg-white bg-opacity-50 my-2", 
              theme.border
            )}>
              <div className="flex gap-6 overflow-x-auto pb-4 pt-4 px-4 w-full scrollbar-hide">
                {services.length === 0 ? (
                  <span className="text-gray-400 italic text-sm py-4">No components yet</span>
                ) : (
                  services.map(service => {
                    const isRegistered = registered.some(r => r.serviceId === service.id && r.namespace === ns);
                    const regCap = isRegistered ? registered.find(r => r.serviceId === service.id && r.namespace === ns) : null;
                    return (
                      <ServiceSummaryCard 
                        key={service.id}
                        service={service}
                        ns={ns}
                        isRegistered={isRegistered}
                        registered={registered}
                        onClick={() => {
                          if (isRegistered && regCap) {
                            onSelectService({ ...regCap, id: regCap.serviceId, name: regCap.displayName, isEdit: true });
                          } else {
                            onSelectService({ ...service, namespace: ns });
                          }
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

const ServiceSummaryCard = ({ service, ns, isRegistered, registered, onClick }: any) => {
  const name = service.name.toLowerCase();

  // Simple heuristic for icon matching the design
  const getIcon = () => {
    if (name.includes('db') || name.includes('sql') || name.includes('mongo') || name.includes('postgres') || name.includes('mysql')) {
      return <Database size={24} strokeWidth={1.5} />;
    }
    if (name.includes('kafka') || name.includes('msg')) {
      return <MessageSquare size={24} strokeWidth={1.5} />;
    }
    return <Box size={24} strokeWidth={1.5} />;
  };

  // Heuristic for programming language support layer
  const getLangs = () => {
    if (isRegistered) {
      const regCap = (registered || []).find((r: any) => r.serviceId === service.id && r.namespace === ns);
      if (regCap && regCap.sdkSupport) {
        const keys = Object.keys(regCap.sdkSupport);
        if (keys.length > 0) {
          return keys.map((k: string) => {
            if (k === 'cpp') return 'C++';
            if (k === 'dotnet') return '.NET';
            if (k === 'nodejs') return 'Node.js';
            return k.charAt(0).toUpperCase() + k.slice(1);
          });
        }
      }
    }

    if (name.includes('db') || name.includes('sql') || name.includes('mongo') || name.includes('postgres') || name.includes('kafka') || name.includes('minio')) return [];
    if (name.includes('node') || name.includes('react') || name.includes('js') || name.includes('npm')) return ['Node.js'];
    if (name.includes('py') || name.includes('django') || name.includes('flask')) return ['Python'];
    if (name.includes('kube') || name.includes('go')) return ['Go'];
    if (name.includes('java') || name.includes('spring')) return ['Java'];
    
    // Default mock languages for visual display
    return ['Go', 'Node.js'];
  };

  const langs = getLangs();
  const iconColor = isRegistered ? "text-emerald-500" : "text-[#4a80ce]";
  const iconBg = isRegistered ? "bg-emerald-50" : "bg-blue-50";

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-[120px] py-4 rounded-[20px] bg-white border flex flex-col items-center justify-center relative shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all group",
        isRegistered ? "border-emerald-100 hover:border-emerald-300 shadow-emerald-500/5" : "border-gray-100 hover:border-blue-200"
      )}
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0", iconBg, iconColor)}>
        {getIcon()}
      </div>
      
      <div className="text-[11px] font-bold text-gray-800 text-center w-full truncate px-2">
        {service.name}
      </div>

      {/* Interface and Port details */}
      <div className="flex flex-col items-center mt-1 w-full px-2">
        <span className="text-[9px] text-[#6C757D] font-medium truncate w-full text-center" title={`${service.name}.${ns}.svc.cluster.local`}>
          {service.name}.{ns}.svc
        </span>
        <span className="text-[8px] text-[#ADB5BD] uppercase font-bold tracking-wider mt-0.5">Port {service.ports?.[0]?.port || 'N/A'}</span>
      </div>

      {isRegistered && (
        <div className="absolute top-2 right-2 text-emerald-500">
          <CheckCircle2 size={14} strokeWidth={3} />
        </div>
      )}

      {/* Programming Language Support Badge Layer */}
      {langs.length > 0 && (
        <div 
          title={langs.join(', ')} 
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-0.5 z-10"
        >
          {langs.slice(0, 2).map(l => (
            <span 
              key={l} 
              className="bg-[#1A1A1A] text-white text-[9px] px-2.5 py-0.5 rounded-full font-bold shadow-md shadow-black/10 border border-white whitespace-nowrap pointer-events-none"
            >
              {l}
            </span>
          ))}
          {langs.length > 2 && (
            <span 
              className="bg-gray-800 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-md shadow-black/10 border border-white whitespace-nowrap cursor-help"
            >
              +{langs.length - 2}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
};
