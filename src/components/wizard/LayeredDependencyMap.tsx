import React from 'react';
import { motion } from 'motion/react';
import { 
  Box, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Server,
  Network,
  Plus,
  Trash2,
  Terminal,
  FileCode,
  Copy,
  XCircle,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { KubeSDKLocalRun } from '../../types';

export const NS_PALETTE = [
  { bg: '#5B8DD9', dark: '#3A6DB5', edge: '#93B8F0', text: '#EEF4FF' },
  { bg: '#7C5CBF', dark: '#5A3FA0', edge: '#A88EE0', text: '#F3EEFF' },
  { bg: '#2D9E6B', dark: '#1E7050', edge: '#5EC99A', text: '#EAFAF2' },
  { bg: '#D97C14', dark: '#B06210', edge: '#F0AA55', text: '#FFF8EE' },
  { bg: '#D94F4F', dark: '#B03535', edge: '#F08080', text: '#FFF0F0' },
  { bg: '#C94B9A', dark: '#A03278', edge: '#E880C0', text: '#FFF0F8' },
  { bg: '#3DA8B5', dark: '#2A7A88', edge: '#70CEE0', text: '#EEF9FA' },
];

export const INFRA_CATEGORIES = ['namespace', 'config', 'service', 'ingress', 'simulator'];

interface LayeredDependencyMapProps {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  namespaces: string[];
  generateYamlFromConfig: (config: KubeSDKLocalRun) => string;
}

export const LayeredDependencyMap = ({ config, setConfig, namespaces, generateYamlFromConfig }: LayeredDependencyMapProps) => {
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  const [newEnvName, setNewEnvName] = React.useState('');
  const [newEnvValue, setNewEnvValue] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'map' | 'yaml'>('map');

  const getApps = (ns: string) => config.components.filter(c =>
    c.namespace === ns && !INFRA_CATEGORIES.includes(c.category)
  );
  const getInfra = (ns: string) => config.components.filter(c => ['service','ingress'].includes(c.category) && c.namespace === ns);
  const allTargets = config.components.filter(c => ['service','ingress','simulator'].includes(c.category));
  const selectedApp = selectedAppId ? config.components.find(c => c.id === selectedAppId) : null;
  const connectedIds = selectedAppId ? config.dependencyGraph.edges.filter(e => e.from === selectedAppId).map(e => e.to) : [];

  const toggleTarget = (targetId: string) => {
    if (!selectedAppId) return;
    const newEdges = [...config.dependencyGraph.edges];
    const newComponents = [...config.components];
    const appIdx = newComponents.findIndex(c => c.id === selectedAppId);
    if (appIdx === -1) return;
    const edgeIdx = newEdges.findIndex(e => e.from === selectedAppId && e.to === targetId);
    if (edgeIdx > -1) {
      newEdges.splice(edgeIdx, 1);
    } else {
      newEdges.push({ from: selectedAppId, to: targetId });
      const target = config.components.find(c => c.id === targetId);
      if (target) {
        const prefix = targetId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        let env = newComponents[appIdx].properties?.envVars || '';
        
        if (!env.includes(`${prefix}_`)) {
          let snippet = `\n# ${targetId} synthesized endpoint\n`;
          
          const ns = target.namespace || 'default';
          const fqdn = `${targetId}.${ns}.svc.cluster.local`;
          const port = target.properties?.port || target.properties?.targetPort || (target.category === 'service' ? 80 : '');
          
          let protocol = '';
          const tidLower = targetId.toLowerCase();
          if (tidLower.includes('mongo')) protocol = 'mongodb://';
          else if (tidLower.includes('postgres')) protocol = 'postgresql://';
          else if (tidLower.includes('redis')) protocol = 'redis://';
          else if (tidLower.includes('kafka')) protocol = 'plaintext://';
          else if (target.category === 'service' || target.category === 'ingress') protocol = 'http://';

          if (target.category === 'service') {
            snippet += `${prefix}_HOST=${fqdn}\n`;
            snippet += `${prefix}_PORT=${port}\n`;
            snippet += `${prefix}_URL=${protocol}${fqdn}${port ? ':' + port : ''}\n`;
          } else if (target.category === 'ingress') {
            const host = target.properties?.hostname || `${targetId}.local`;
            snippet += `${prefix}_URL=http://${host}\n`;
          } else {
            snippet += `${prefix}_ENDPOINT=${fqdn}${port ? ':' + port : ''}\n`;
          }
          
          newComponents[appIdx] = { 
            ...newComponents[appIdx], 
            properties: { ...(newComponents[appIdx].properties || {}), envVars: env + snippet } 
          };
        }
      }
    }
    setConfig(prev => ({ ...prev, dependencyGraph: { edges: newEdges }, components: newComponents }));
  };

  const sortedNS = [...namespaces].sort((a, b) => {
    const aDeps = config.dependencyGraph.edges.filter(e => {
      const fromComp = config.components.find(c => c.id === e.from);
      const toComp = config.components.find(c => c.id === e.to);
      return fromComp?.namespace === a && toComp?.namespace !== a;
    }).length;
    const bDeps = config.dependencyGraph.edges.filter(e => {
      const fromComp = config.components.find(c => c.id === e.from);
      const toComp = config.components.find(c => c.id === e.to);
      return fromComp?.namespace === b && toComp?.namespace !== b;
    }).length;
    return bDeps - aDeps;
  });

  const allNSIds = namespaces;
  const layersAreEmpty = sortedNS.length > 0 && sortedNS.every(ns => getApps(ns).length === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E9ECEF] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            {viewMode === 'map' ? <Layers size={18} /> : <FileCode size={18} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A]">Dependency Mapping</h4>
            <p className="text-[10px] text-[#6C757D]">Map links and review resulting YAML</p>
          </div>
        </div>

        <div className="flex bg-[#F8F9FA] p-1 rounded-lg border border-[#E9ECEF]">
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all",
              viewMode === 'map' ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]"
            )}
          >
            <Box size={14} /> Architecture Map
          </button>
          <button
            onClick={() => setViewMode('yaml')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all",
              viewMode === 'yaml' ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]"
            )}
          >
            <FileCode size={14} /> Live YAML View
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="flex gap-6">
          <div className="flex-1 space-y-2 min-w-0">
            {layersAreEmpty && (
              <div className="mb-4 p-4 bg-[#1A1A2E] border border-[#2D2D4E] rounded-xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400" />
                    No components visible — raw state dump
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('This will clear all saved data and reload. Continue?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600"
                  >
                    Clear Cache & Reload
                  </button>
                </div>
                <p className="text-[#ADB5BD]">Namespaces derived: <span className="font-mono text-emerald-400">[{allNSIds.join(', ')}]</span></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono">
                    <thead>
                      <tr className="text-[#6C757D] border-b border-[#2D2D4E]">
                        <th className="text-left py-1 pr-4">id</th>
                        <th className="text-left py-1 pr-4">namespace</th>
                        <th className="text-left py-1 pr-4">category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.components.slice(0, 30).map((c, i) => (
                        <tr key={i} className={`border-b border-[#2D2D4E]/50 ${INFRA_CATEGORIES.includes(c.category) ? 'text-[#6C757D]' : 'text-emerald-400'}`}>
                          <td className="py-0.5 pr-4 truncate max-w-[120px]">{c.id}</td>
                          <td className="py-0.5 pr-4">{c.namespace}</td>
                          <td className="py-0.5 pr-4">{c.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {sortedNS.map((ns, nsIdx) => {
              const pal = NS_PALETTE[nsIdx % NS_PALETTE.length];
              const apps = getApps(ns);
              const isActiveNS = selectedApp?.namespace === ns;
              return (
                <div key={ns} className={cn('transition-all duration-300', isActiveNS ? 'scale-[1.01]' : '')}>
                  <div className="flex items-stretch gap-0">
                    <div className="relative shrink-0 flex items-center" style={{ width: 140, minHeight: 80 }}>
                      <div className="absolute" style={{
                        left: 6, top: 8, right: 0, bottom: -4,
                        clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                        background: pal.dark,
                        opacity: 0.7,
                      }} />
                      <div className="absolute inset-0" style={{
                        clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                        background: `linear-gradient(145deg, ${pal.bg} 0%, ${pal.dark} 100%)`,
                      }} />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-0.5" style={{ background: pal.edge }} />
                      <span className="relative z-10 text-white text-[9px] font-bold uppercase tracking-widest text-center w-full px-6 leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                        {ns}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 rounded-r-xl overflow-hidden border border-l-0" style={{ borderColor: pal.edge, borderLeftWidth: 3, borderLeftColor: pal.bg, background: 'white' }}>
                      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
                        {apps.length === 0 ? (
                          <span className="text-xs text-[#ADB5BD] italic">No components yet</span>
                        ) : (
                          <>
                            {apps.map(app => {
                              const isSelected = selectedAppId === app.id;
                              const depCount = config.dependencyGraph.edges.filter(e => e.from === app.id).length;
                              return (
                                <button
                                  key={app.id}
                                  onClick={() => setSelectedAppId(isSelected ? null : app.id)}
                                  className={cn(
                                    'shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all text-xs font-bold min-w-[90px]',
                                    isSelected
                                      ? 'text-white shadow-lg scale-105'
                                      : 'border-[#DEE2E6] text-[#495057] hover:scale-102'
                                  )}
                                  style={isSelected ? { background: pal.bg, borderColor: pal.bg, boxShadow: `0 8px 24px ${pal.bg}44` } : {}}
                                >
                                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isSelected ? 'bg-white/20' : '')} style={!isSelected ? { background: pal.bg + '18', border: `1px solid ${pal.bg}44` } : {}}>
                                    <Server size={16} style={{ color: isSelected ? 'white' : pal.bg }} />
                                  </div>
                                  <span className="truncate max-w-[80px]">{app.id}</span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isActiveNS && connectedIds.length > 0 && (
                    <div className="ml-36 mt-1 flex gap-2 flex-wrap">
                      {connectedIds.map(tid => {
                        const target = config.components.find(c => c.id === tid);
                        if (!target) return null;
                        const targetNSIdx = sortedNS.indexOf(target.namespace || '');
                        const targetPal = NS_PALETTE[targetNSIdx % NS_PALETTE.length] || NS_PALETTE[0];
                        return (
                          <div key={tid} className="flex items-center gap-1 text-[10px] font-bold text-[#6C757D]">
                            <div className="w-4 h-px bg-[#ADB5BD]" />
                            <span className="px-1.5 py-0.5 rounded text-white text-[9px]" style={{ background: targetPal.bg }}>{tid}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Selected App Detail Panel */}
          {selectedApp && (
            <motion.div
              key={selectedApp.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-96 flex flex-col bg-white border border-[#E9ECEF] rounded-2xl overflow-hidden shadow-xl self-start sticky top-0"
            >
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#E9ECEF]" style={{ background: `linear-gradient(135deg, ${NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')]?.bg || '#0D6EFD'}18, transparent)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')]?.bg || '#0D6EFD' }}>
                    <Server size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[#212529] text-sm uppercase tracking-tight">{selectedApp.id}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Layers size={10} className="text-[#ADB5BD]" />
                      <p className="text-[10px] font-bold" style={{ color: NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')]?.bg }}>{selectedApp.namespace}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAppId(null)} 
                  className="p-1.5 rounded-lg hover:bg-[#F8F9FA] transition-colors text-[#ADB5BD] hover:text-[#212529]"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Available targets */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(100vh-450px)]">
                <h5 className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2">
                  <Network size={12} />
                  Wire Service Dependencies
                </h5>
                <div className="space-y-2">
                  {allTargets
                    .filter(target => target.id !== selectedAppId)
                    .map(target => {
                      const isLinked = connectedIds.includes(target.id);
                      const targetNSIdx = sortedNS.indexOf(target.namespace || '');
                      const pal = NS_PALETTE[targetNSIdx % NS_PALETTE.length] || NS_PALETTE[0];
                      return (
                        <button
                          key={target.id}
                          onClick={() => toggleTarget(target.id)}
                          className={cn(
                            'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group',
                            isLinked
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                              : 'border-[#E9ECEF] hover:border-[#0D6EFD]/40 hover:bg-blue-50/20 bg-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" 
                              style={{ 
                                background: isLinked ? '#10B9811A' : pal.bg + '12', 
                                borderColor: isLinked ? '#10B98144' : pal.bg + '33' 
                              }}
                            >
                              {target.category === 'ingress' ? <Network size={14} style={{ color: isLinked ? '#059669' : pal.bg }} /> : <Box size={14} style={{ color: isLinked ? '#059669' : pal.bg }} />}
                            </div>
                            <div>
                              <p className="font-bold text-[#212529] text-xs leading-none">{target.id}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] uppercase font-medium text-[#ADB5BD]">{target.category}</span>
                                <div className="w-1 h-1 rounded-full bg-[#DEE2E6]" />
                                <span className="text-[9px] font-bold" style={{ color: pal.bg }}>{target.namespace}</span>
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            'w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                            isLinked ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-sm' : 'border-[#DEE2E6] group-hover:border-[#0D6EFD]/40'
                          )}>
                            {isLinked && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  {allTargets.filter(t => t.id !== selectedAppId).length === 0 && (
                    <p className="text-xs text-[#ADB5BD] italic text-center py-4 border-2 border-dashed rounded-xl border-[#F1F3F5]">No target services found in this model.</p>
                  )}
                </div>
              </div>

              {/* Custom User ENV Overrides */}
              <div className="p-5 border-t border-[#E9ECEF] space-y-4 bg-[#F8F9FA]/50 mt-auto">
                <h5 className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Zap size={11} className="text-amber-500" /> Custom App Config</span>
                  <span className="text-[9px] lowercase font-normal italic">Overrides & Additions</span>
                </h5>
                
                {/* Simple Add Table */}
                <div className="flex gap-1.5">
                  <input 
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="NAME"
                    className="flex-1 px-3 py-2 bg-white border border-[#DEE2E6] rounded-lg text-[10px] font-mono shadow-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all"
                  />
                  <input 
                    value={newEnvValue}
                    onChange={e => setNewEnvValue(e.target.value)}
                    placeholder="VALUE"
                    className="flex-[1.5] px-3 py-2 bg-white border border-[#DEE2E6] rounded-lg text-[10px] font-mono shadow-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all"
                  />
                  <button 
                    onClick={() => {
                      if (!newEnvName || !selectedAppId) return;
                      const newComps = [...config.components];
                      const idx = newComps.findIndex(c => c.id === selectedAppId);
                      if (idx > -1) {
                        const currentCustom = newComps[idx].properties?.customEnv || {};
                        newComps[idx] = { 
                          ...newComps[idx], 
                          properties: { 
                            ...(newComps[idx].properties || {}), 
                            customEnv: { ...currentCustom, [newEnvName]: newEnvValue } 
                          } 
                        };
                        setConfig(prev => ({ ...prev, components: newComps }));
                        setNewEnvName('');
                        setNewEnvValue('');
                      }
                    }}
                    className="p-2 bg-[#0D6EFD] text-white rounded-lg hover:bg-[#0B5ED7] transition-all shadow-sm"
                    title="Add Custom Variable"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* List of Custom ENVs */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries((selectedApp.properties?.customEnv as Record<string, string>) || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#E9ECEF] group hover:border-[#0D6EFD]/30 transition-all shadow-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-[#495057] font-mono truncate">{key}</span>
                        <span className="text-[9px] text-emerald-600 truncate font-mono" title={val}>{val}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newComps = [...config.components];
                          const idx = newComps.findIndex(c => c.id === selectedAppId);
                          if (idx > -1) {
                            const nextCustom = { ...newComps[idx].properties?.customEnv };
                            delete nextCustom[key];
                            newComps[idx] = { ...newComps[idx], properties: { ...newComps[idx].properties, customEnv: nextCustom } };
                            setConfig(prev => ({ ...prev, components: newComps }));
                          }
                        }}
                        className="p-1 text-[#ADB5BD] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {Object.keys(selectedApp.properties?.customEnv || {}).length === 0 && (
                    <p className="text-[9px] text-[#ADB5BD] italic text-center py-4 bg-white/30 rounded-lg border border-dashed border-[#DEE2E6]">No custom variables defined</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="bg-[#1A1A2E] p-6 rounded-2xl text-white font-mono text-xs overflow-auto h-[600px]">
          <pre>{generateYamlFromConfig(config)}</pre>
        </div>
      )}
    </div>
  );
};
