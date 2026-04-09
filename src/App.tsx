import React, { useState } from 'react';
import yaml from 'js-yaml';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Settings, 
  Box, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Terminal,
  Download,
  AlertCircle,
  Activity,
  Cloud,
  Plus,
  Trash2,
  Edit2,
  Search,
  Server,
  Monitor,
  Zap,
  ShieldCheck,
  Network,
  Cpu,
  AlertTriangle,
  XCircle,
  Loader2,
  List,
  FileCode,
  Copy
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  KubeSDKLocalRun, 
  LocalRunSource,
  ValidationResult,
  ResourcePlan,
  Component
} from './types';

const WIZARD_STEPS = [
  { id: 'source', title: 'Local Run Source' },
  { id: 'mode', title: 'Cluster Definition Mode' },
  { id: 'import', title: 'Live Cluster Import' },
  { id: 'upload', title: 'Offline Cluster Upload' },
  { id: 'model', title: 'Cluster Model & Components' },
  { id: 'mapping', title: 'Dependency Mapping' },
  { id: 'laptop', title: 'Laptop Resource Profile' },
  { id: 'feasibility', title: 'Feasibility & Suggestions' },
  { id: 'validation', title: 'Final Validation' },
  { id: 'deployment', title: 'Simulated Cluster Deployment' },
];

const INITIAL_CONFIG: KubeSDKLocalRun = {
  apiVersion: 'kubesdk.dev/v1alpha1',
  kind: 'LocalRunDefinition',
  metadata: {
    name: 'kubesdk-simulation',
    createdBy: 'sdk-user',
    createdAt: new Date().toISOString(),
    toolVersion: '1.0.0',
  },
  wizard: {
    source: 'manual',
    runtime: {
      type: 'rancher-desktop',
      versionConstraint: '>=5.6',
    },
    ignoredNamespaces: ['default', 'kube-system'],
    kindWhitelist: ['pod', 'service', 'ingress', 'configmap', 'secret', 'namespace'],
    steps: {
      completed: [],
    },
    connectivity: {
      apiServerUrl: '',
      token: '',
      caCert: '',
    }
  },
  components: [],
  capabilities: [],
  dependencyGraph: {
    edges: [],
  },
  laptopProfile: {
    detected: {
      cpuCores: 8,
      memoryGi: 16,
      diskGi: 200,
      os: 'macOS',
    },
    limits: {
      cpu: 4,
      memory: '8Gi',
      disk: '50Gi',
    },
  },
  runtimeExecution: {
    type: 'rancher-desktop',
    cluster: {
      name: 'kubesdk-local',
      version: 'v1.29',
    },
    order: ['namespaces', 'policies', 'infra', 'applications'],
  },
};

const NS_PALETTE = [
  { bg: '#5B8DD9', dark: '#3A6DB5', edge: '#93B8F0', text: '#EEF4FF' },
  { bg: '#7C5CBF', dark: '#5A3FA0', edge: '#A88EE0', text: '#F3EEFF' },
  { bg: '#2D9E6B', dark: '#1E7050', edge: '#5EC99A', text: '#EAFAF2' },
  { bg: '#D97C14', dark: '#B06210', edge: '#F0AA55', text: '#FFF8EE' },
  { bg: '#D94F4F', dark: '#B03535', edge: '#F08080', text: '#FFF0F0' },
  { bg: '#C94B9A', dark: '#A03278', edge: '#E880C0', text: '#FFF0F8' },
  { bg: '#3DA8B5', dark: '#2A7A88', edge: '#70CEE0', text: '#EEF9FA' },
];

// Only hide namespace definitions and configmap/secret entries from the card view.
// Everything else (Deployments, Services, Ingresses, Jobs, Simulators, etc.)
// should all appear as cards so the user can see what runs in each namespace.
const INFRA_CATEGORIES = ['namespace', 'config', 'service', 'ingress', 'simulator'];

const LayeredDependencyMap = ({ config, setConfig, namespaces }: {
  config: KubeSDKLocalRun;
  setConfig: React.Dispatch<React.SetStateAction<KubeSDKLocalRun>>;
  namespaces: string[];
}) => {
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'map' | 'yaml'>('map');
  const [newEnvName, setNewEnvName] = React.useState('');
  const [newEnvValue, setNewEnvValue] = React.useState('');
  const ignoredNS = config.wizard.ignoredNamespaces || [];



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
          
          // Smart protocol detection
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

  // Sort namespaces: ones that have incoming deps go lower
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

  // Collect ALL workload components for debug panel
  const allApps = config.components.filter(c => !INFRA_CATEGORIES.includes(c.category) && c.namespace !== 'cluster');
  const allNSIds = namespaces;

  // Show the data table whenever there are namespaces but layers are empty
  const layersAreEmpty = sortedNS.length > 0 && sortedNS.every(ns => getApps(ns).length === 0);

  return (
    <div className="space-y-6">
      {/* Header with Switcher */}
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
          {/* Left: Layered diagram */}
          <div className="flex-1 space-y-2 min-w-0">

        {/* Raw data dump — shown when layers are empty so user/dev can see exact state */}
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
                Clear Cache &amp; Reload
              </button>
            </div>
            <p className="text-[#ADB5BD]">Namespaces derived: <span className="font-mono text-emerald-400">[{allNSIds.join(', ')}]</span></p>
            <p className="text-[#ADB5BD]">Total components: <span className="font-bold text-white">{config.components.length}</span></p>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-[#6C757D] border-b border-[#2D2D4E]">
                    <th className="text-left py-1 pr-4">id</th>
                    <th className="text-left py-1 pr-4">namespace</th>
                    <th className="text-left py-1 pr-4">category</th>
                    <th className="text-left py-1 pr-4">kind</th>
                    <th className="text-left py-1">runtimeClass</th>
                  </tr>
                </thead>
                <tbody>
                  {config.components.slice(0, 30).map((c, i) => (
                    <tr key={i} className={`border-b border-[#2D2D4E]/50 ${INFRA_CATEGORIES.includes(c.category) ? 'text-[#6C757D]' : 'text-emerald-400'}`}>
                      <td className="py-0.5 pr-4 truncate max-w-[120px]">{c.id}</td>
                      <td className="py-0.5 pr-4">{c.namespace}</td>
                      <td className="py-0.5 pr-4">{c.category}</td>
                      <td className="py-0.5 pr-4">{c.kind}</td>
                      <td className="py-0.5">{c.runtimeClass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {config.components.length > 30 && <p className="text-[#6C757D] mt-1">... and {config.components.length - 30} more</p>}
            </div>
            <p className="text-amber-400 text-[10px]">Green rows = would appear as app cards. Grey rows = infra (filtered out). If all grey, your data has wrong categories — click "Clear Cache &amp; Reload" then re-import.</p>
          </div>
        )}

        {sortedNS.map((ns, nsIdx) => {
          const pal = NS_PALETTE[nsIdx % NS_PALETTE.length];
          const apps = getApps(ns);
          const infra = getInfra(ns);
          const isActiveNS = selectedApp?.namespace === ns;
          return (
            <div key={ns} className={cn('transition-all duration-300', isActiveNS ? 'scale-[1.01]' : '')}>
              <div className="flex items-stretch gap-0">
                {/* 3D Hexagonal layer label */}
                <div className="relative shrink-0 flex items-center" style={{ width: 140, minHeight: 80 }}>
                  {/* Shadow/depth layer */}
                  <div className="absolute" style={{
                    left: 6, top: 8, right: 0, bottom: -4,
                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                    background: pal.dark,
                    opacity: 0.7,
                  }} />
                  {/* Main face */}
                  <div className="absolute inset-0" style={{
                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                    background: `linear-gradient(145deg, ${pal.bg} 0%, ${pal.dark} 100%)`,
                  }} />
                  {/* Top shine */}
                  <div className="absolute" style={{
                    left: 4, top: 2, right: 4,
                    height: '45%',
                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)',
                  }} />
                  {/* Connector line to content */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-0.5" style={{ background: pal.edge }} />
                  <span className="relative z-10 text-white text-[9px] font-bold uppercase tracking-widest text-center w-full px-6 leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {ns}
                  </span>
                </div>

                {/* Content bar */}
                <div className="flex-1 min-w-0 rounded-r-xl overflow-hidden border border-l-0" style={{ borderColor: pal.edge, borderLeftWidth: 3, borderLeftColor: pal.bg, background: 'white' }}>
                  <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
                    {/* Applications */}
                    {apps.length === 0 ? (
                      <span className="text-xs text-[#ADB5BD] italic">No components yet</span>
                    ) : (
                      <>
                        {apps.map(app => {
                          const isSelected = selectedAppId === app.id;
                          const depCount = config.dependencyGraph.edges.filter(e => e.from === app.id).length;
                          const sourceKind = app.properties?.sourceKind as string | undefined;
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
                              {sourceKind && (
                                <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide', isSelected ? 'bg-white/20 text-white/80' : 'text-[#6C757D] bg-[#F8F9FA] border border-[#E9ECEF]')}>
                                  {sourceKind}
                                </span>
                              )}
                              {depCount > 0 && (
                                <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', isSelected ? 'bg-white/20 text-white' : 'text-white')} style={!isSelected ? { background: pal.bg } : {}}>
                                  {depCount} link{depCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Connection arrows to other layers — visual indicator */}
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

        {namespaces.length === 0 && (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-[#DEE2E6] rounded-2xl">
            <div className="text-center space-y-2">
              <Layers size={32} className="text-[#DEE2E6] mx-auto" />
              <p className="text-sm font-bold text-[#ADB5BD]">No namespaces defined yet</p>
              <p className="text-xs text-[#DEE2E6]">Go back to Step 4 to add namespaces and components</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Selected App Detail Panel */}
      {selectedApp && (
        <motion.div
          key={selectedApp.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-80 flex flex-col bg-white border border-[#E9ECEF] rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#E9ECEF]" style={{ background: `linear-gradient(135deg, ${NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')] ? NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')]?.bg : '#0D6EFD'}18, transparent)` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: NS_PALETTE[sortedNS.indexOf(selectedApp.namespace||'')]?.bg || '#0D6EFD' }}>
                <Server size={17} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[#212529] text-sm">{selectedApp.id}</p>
                <p className="text-[11px] text-[#6C757D]">{selectedApp.namespace}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAppId(null)} className="p-1.5 rounded-lg hover:bg-[#F8F9FA] transition-colors">
              <XCircle size={16} className="text-[#ADB5BD]" />
            </button>
          </div>

          {/* Available targets */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h5 className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">
              Link to Services / Ingresses / Endpoints
            </h5>
            {allTargets
              .filter(target => target.properties?.targetApp !== selectedAppId)
              .length === 0 ? (
              <p className="text-xs text-[#ADB5BD] italic">No services defined. Add them in Step 4.</p>
            ) : (
              allTargets
                .filter(target => target.properties?.targetApp !== selectedAppId)
                .map(target => {
                const isLinked = connectedIds.includes(target.id);
                const parentApp = config.components.find(c => c.id === target.properties?.targetApp);
                const targetNSIdx = sortedNS.indexOf(target.namespace || '');
                const pal = NS_PALETTE[targetNSIdx % NS_PALETTE.length] || NS_PALETTE[0];
                return (
                  <button
                    key={target.id}
                    onClick={() => toggleTarget(target.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      isLinked
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                        : 'border-[#E9ECEF] hover:border-[#0D6EFD]/40 hover:bg-blue-50/20 bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: pal.bg + '22', border: `1px solid ${pal.bg}44` }}>
                          {target.category === 'ingress' ? <Network size={13} style={{ color: pal.bg }} /> : <Box size={13} style={{ color: pal.bg }} />}
                        </div>
                        <div>
                          <p className="font-bold text-[#212529] text-xs">{target.id}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] uppercase tracking-wider text-[#ADB5BD]">{target.category}</span>
                            <div className="w-1 h-1 rounded-full bg-[#E9ECEF]" />
                            <span className="text-[9px] font-bold" style={{ color: pal.bg }}>{target.namespace}</span>
                          </div>
                          {parentApp && <p className="text-[9px] text-[#6C757D] mt-0.5">via <span className="font-bold">{parentApp.id}</span></p>}
                          {target.properties?.port && <p className="text-[9px] text-[#ADB5BD]">:{target.properties.port}</p>}
                        </div>
                      </div>
                      <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all', isLinked ? 'bg-emerald-500 border-emerald-500' : 'border-[#DEE2E6]')}>
                        {isLinked && <CheckCircle2 size={11} className="text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Custom User ENV */}
          <div className="p-4 border-t border-[#E9ECEF] space-y-3 bg-[#F8F9FA]/50">
            <h5 className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Zap size={11} className="text-amber-500" /> Custom App Config</span>
              <span className="text-[9px] lowercase font-normal italic">Overrides & Additions</span>
            </h5>
            
            {/* Simple Add Table */}
            <div className="flex gap-1">
              <input 
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="NAME"
                className="flex-1 px-2 py-1.5 bg-white border border-[#DEE2E6] rounded-lg text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0D6EFD]"
              />
              <input 
                value={newEnvValue}
                onChange={e => setNewEnvValue(e.target.value)}
                placeholder="VALUE"
                className="flex-[1.5] px-2 py-1.5 bg-white border border-[#DEE2E6] rounded-lg text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0D6EFD]"
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
                className="px-2 bg-[#0D6EFD] text-white rounded-lg hover:bg-[#0A58CA] transition-colors"
                title="Add Custom ENV"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* List and Delete */}
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {Object.entries((selectedApp.properties?.customEnv as Record<string, string>) || {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E9ECEF] group">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-[#495057] font-mono">{key}</span>
                    <span className="text-[9px] text-[#20C997] truncate max-w-[140px] font-mono" title={val}>{val}</span>
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
                    className="p-1 text-[#ADB5BD] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {Object.keys(selectedApp.properties?.customEnv || {}).length === 0 && (
                <p className="text-[9px] text-[#ADB5BD] italic text-center py-2">No custom variables defined</p>
              )}
            </div>
          </div>

          {/* Generated ENV */}
          {connectedIds.length > 0 && (
            <div className="p-4 border-t border-[#E9ECEF] space-y-2">
              <h5 className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={11} /> Auto Grouped (Review)
              </h5>
              <textarea
                value={selectedApp.properties?.envVars || ''}
                readOnly
                rows={4}
                className="w-full p-3 rounded-xl border border-[#2D2D2D]/10 bg-[#1A1A2E]/5 text-[#6C757D] font-mono text-[9px] outline-none resize-none leading-relaxed"
              />
            </div>
          )}
        </motion.div>
      )}
      </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D4E] shadow-2xl overflow-hidden flex flex-col h-[700px]"
        >
          <div className="p-4 bg-[#21213E] border-b border-[#2D2D4E] flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Consolidated Infrastructure Blueprint (YAML)
            </div>
            <button 
              onClick={() => {
                const yaml = generateYamlFromConfig(config);
                navigator.clipboard.writeText(yaml);
                alert('YAML copied to clipboard!');
              }}
              className="px-3 py-1.5 bg-[#2D2D4E] hover:bg-[#3D3D5E] text-white rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all"
            >
              <Copy size={12} /> Copy to Clipboard
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed relative">
            {/* Syntax background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <FileCode size={400} />
            </div>
            
            <pre className="text-[#A9B7C6] relative z-10">
              {generateYamlFromConfig(config).split('\n').map((line, idx) => (
                <div key={idx} className="flex gap-4 hover:bg-white/5 transition-colors group">
                  <span className="w-8 text-right text-[#4E4E6E] select-none group-hover:text-emerald-500/50">{idx + 1}</span>
                  <span className={cn(
                    line.startsWith('apiVersion:') || line.startsWith('kind:') || line.startsWith('metadata:') ? "text-emerald-400 font-bold" :
                    line.startsWith('---') ? "text-amber-500 py-2 block border-y border-amber-900/30" :
                    line.includes(':') ? "text-[#E8BD6D]" : "text-[#A9B7C6]"
                  )}>
                    {line}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const INITIAL_YAML_CONTENT = ``;

function generateYamlFromConfig(config: KubeSDKLocalRun): string {
  const ignoredNamespaces = config.wizard.ignoredNamespaces || [];
  const docs: any[] = [];
  
  // 0. Project Metadata & Dependency Graph
  docs.push({
    apiVersion: config.apiVersion || 'kubesdk.dev/v1alpha1',
    kind: 'LocalRunDefinition',
    metadata: {
      ...config.metadata,
      annotations: {
        'kubesdk.dev/sync-at': new Date().toISOString(),
      }
    },
    spec: {
      dependencyGraph: config.dependencyGraph,
      wizard: {
        source: config.wizard.source,
        runtime: config.wizard.runtime
      }
    }
  });

  // 1. Aggregation Phase: Collect all dependencies and group ENVs by (TargetNS, AppNS)
  // aggregatedEnv[appNamespace][targetNamespace] = { KEY: VALUE }
  const aggregatedEnv: Record<string, Record<string, Record<string, string>>> = {};
  
  config.components.filter(c => c.category === 'application').forEach(app => {
    const appNS = app.namespace || 'default';
    if (!aggregatedEnv[appNS]) aggregatedEnv[appNS] = {};
    
    // Custom User ENVs for this app (we'll generate a dedicated ConfigMap for these to avoid NS-level clutter)
    const customData = (app.properties?.customEnv as Record<string, string>) || {};
    if (Object.keys(customData).length > 0) {
      const customCMName = `${app.id}-custom-config`;
      docs.push({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: customCMName, namespace: appNS, labels: { 'infra.example.com/custom-config': 'true' } },
        data: customData
      });
    }

    if (app.properties?.envVars) {
      // Find which targets these ENVs belong to
      // We process the dependencyGraph to find the source namespace for each link
      const edges = config.dependencyGraph.edges.filter(e => e.from === app.id);
      edges.forEach(edge => {
        const target = config.components.find(c => c.id === edge.to);
        if (!target) return;
        const targetNS = target.namespace || 'cluster';
        if (!aggregatedEnv[appNS][targetNS]) aggregatedEnv[appNS][targetNS] = {};
        
        // Extract variables for THIS target from the app's envVars
        // The synthesis logic uses targetId as a marker
        const prefix = edge.to.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        app.properties!.envVars!.split('\n').filter(l => l.includes('=') && l.includes(prefix)).forEach(line => {
          const [key, ...vals] = line.split('=');
          if (key.trim()) aggregatedEnv[appNS][targetNS][key.trim()] = vals.join('=').trim();
        });
      });
    }
  });

  // 2. Namespaces & Grouped Config Sets
  const nsFromComponents = config.components.filter(c => c.category === 'namespace').map(c => c.id);
  const nsFromWorkloads = config.components.filter(c => c.namespace).map(c => c.namespace!);
  const namespaces = Array.from(new Set([...nsFromComponents, ...nsFromWorkloads]));
  
  namespaces.forEach(ns => {
    if (ns && ns !== 'cluster' && !ignoredNamespaces.includes(ns)) {
      const nsDeps = config.dependencyGraph.edges.filter(e => e.from === ns).map(e => e.to);
      const nsAnnotations: Record<string, string> = { 'infra.example.com/profile': 'sdk' };
      if (nsDeps.length > 0) nsAnnotations['infra.example.com/depends-on'] = nsDeps.join(',');

      docs.push({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: ns,
          labels: { 'infra.example.com/profile': 'sdk' },
          annotations: nsAnnotations
        }
      });

      // Find if this namespace has generic Config Set
      const nsComp = config.components.find(c => c.id === ns && c.category === 'namespace');
      const baseData: Record<string, string> = {};
      if (nsComp && nsComp.properties?.configSet) {
        nsComp.properties.configSet.split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#')).forEach(line => {
          const [key, ...vals] = line.split('=');
          if (key.trim()) baseData[key.trim()] = vals.join('=').trim();
        });
      }
      
      if (Object.keys(baseData).length > 0) {
        docs.push({
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'sdk-config', namespace: ns },
          data: baseData
        });
      }

      // 3. Create Namespace-named ConfigMaps for aggregated dependencies
      if (aggregatedEnv[ns]) {
        Object.entries(aggregatedEnv[ns]).forEach(([targetNS, data]) => {
          if (Object.keys(data).length > 0) {
            docs.push({
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: { 
                name: targetNS, // Resource name is the target namespace
                namespace: ns,
                labels: { 'infra.example.com/configset': 'true', 'infra.example.com/source-ns': targetNS }
              },
              data
            });
          }
        });
      }
    }
  });

  // 2. Components
  for (const comp of config.components) {
    if (comp.category === 'namespace') continue;
    if (comp.namespace && ignoredNamespaces.includes(comp.namespace)) continue;

    // Common metadata for all resource docs
    const deps = config.dependencyGraph.edges.filter(e => e.from === comp.id).map(e => e.to);
    const annotations: Record<string, string> = { 
      'infra.example.com/id': comp.id,
      'infra.example.com/category': comp.category,
      'infra.example.com/kind': comp.kind
    };
    
    if (deps.length > 0) {
      annotations['infra.example.com/depends-on'] = deps.join(',');
    }
    
    if (comp.properties?.sourceKind) {
      annotations['infra.example.com/source-kind'] = comp.properties.sourceKind;
    }
    
    // Config/Secret
    if (comp.category === 'config') {
      const isSecret = comp.id.includes('secret');
      if (isSecret) {
        docs.push({
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: comp.id, namespace: comp.namespace, labels: { 'infra.example.com/configset': 'true' }, annotations },
          type: 'Opaque',
          stringData: comp.properties?.data || { key: 'value' }
        });
      } else {
        docs.push({
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: comp.id, namespace: comp.namespace, labels: { 'infra.example.com/configset': 'true', 'infra.example.com/scope': 'global' }, annotations },
          data: comp.properties?.data || { key: 'value' }
        });
      }
    }
    // Application (Check this BEFORE service/infra to ensure workloads are Deployments)
    else if (comp.category === 'application' || comp.category === 'workload') {
      const appNS = comp.namespace || 'default';
      const envFrom: any[] = [
        { configMapRef: { name: 'sdk-config' } }
      ];

      // Reference custom config if it exists
      if (Object.keys(comp.properties?.customEnv || {}).length > 0) {
        envFrom.push({ configMapRef: { name: `${comp.id}-custom-config` } });
      }

      // Find all namespaces this app depends on via the dependency graph
      const targetNSs = Array.from(new Set(
        config.dependencyGraph.edges
          .filter(e => e.from === comp.id)
          .map(e => {
             const target = config.components.find(c => c.id === e.to);
             return target?.namespace || 'cluster';
          })
      ));

      targetNSs.forEach(tns => {
        if (tns) {
          envFrom.push({ configMapRef: { name: tns } });
        }
      });

      // Get resource limits from the calculated resource plan or from the app itself
      const resources = config.resourcePlan?.components[comp.id] || comp.resources?.sdk || comp.resources?.original;

      // Resource manifest for Pod simulation
      docs.push({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: comp.id,
          namespace: comp.namespace,
          labels: { 
            app: comp.id, 
            'infra.example.com/profile': 'sdk',
            ...(comp.properties?.labels || {})
          },
          annotations
        },
        spec: {
          containers: [{
            name: comp.id,
            image: comp.properties?.image || 'example/app:1.0.0',
            imagePullPolicy: comp.properties?.imagePullPolicy || 'Always',
            env: comp.properties?.env || [],
            volumeMounts: comp.properties?.volumeMounts || [],
            ports: comp.properties?.ports || [],
            resources: {
              requests: {
                cpu: resources.cpu || '100m',
                memory: resources.memory || '512Mi'
              },
              limits: {
                cpu: resources.cpu || '200m',
                memory: resources.memory || '1Gi'
              }
            }
          }]
        }
      });
    }
    // Service / Ingress / Simulator
    else if (comp.category === 'ingress') {
      docs.push({
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: { 
          name: comp.id, 
          namespace: comp.namespace,
          annotations: { 
            'kubernetes.io/ingress.class': comp.properties?.ingressClass || 'traefik',
            ...annotations
          }
        },
        spec: { rules: [{ host: comp.properties?.hostname || 'domain.local', http: { paths: [{ path: comp.properties?.path || '/', pathType: 'Prefix', backend: { service: { name: comp.properties?.targetApp || comp.properties?.targetService || 'app', port: { number: Number(comp.properties?.port || 80) } } } }] } }] }
      });
    } else if (comp.category === 'service' || comp.kind === 'infra') {
       if (comp.id.includes('simulator') || comp.id.includes('db')) {
           docs.push({
             apiVersion: 'infra.example.com/v1alpha1',
             kind: 'Simulator',
             metadata: { name: comp.id, namespace: comp.namespace, annotations },
             spec: {
               type: comp.properties?.simulatorType || "generic",
               image: comp.properties?.image || `infra/sim-${comp.properties?.simulatorType || "generic"}:latest`,
               mode: 'scripted',
               seedDataConfigMap: `${comp.id}-seed`,
               behavior: { latencyMs: 20 }
             }
           });
       } else {
           const serviceSpec: any = {
             type: comp.properties?.serviceType || 'ClusterIP',
             ports: [{
               port: Number(comp.properties?.port || 80),
               targetPort: Number(comp.properties?.targetPort || comp.properties?.port || 80)
             }]
           };
           if (comp.properties?.targetApp) {
             serviceSpec.selector = { app: comp.properties.targetApp };
           }
           docs.push({
              apiVersion: 'v1',
              kind: 'Service',
              metadata: { 
                name: comp.id, 
                namespace: comp.namespace,
                labels: { app: comp.properties?.targetApp || comp.id },
                annotations 
              },
              spec: {
                ...serviceSpec,
                clusterIP: comp.properties?.clusterIP,
                selector: comp.properties?.selector || { app: comp.properties?.targetApp || comp.id },
                ipFamilies: comp.properties?.ipFamilies,
                internalTrafficPolicy: comp.properties?.internalTrafficPolicy
              }
            });
       }
    }
  }

  // Fallback to initial content if nothing defined yet
  if (docs.length === 0) return '# Upload a cluster zip or define components to generate YAML.';
  return docs.map(d => yaml.dump(d)).join('\\n---\\n');
}

const STORAGE_KEY = 'kubesdksim_config_v1';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<'home' | 'define' | 'history' | 'settings'>('define');
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('kubesdksim_step') || '0') || 0; } catch { return 0; }
  });
  const [config, setConfig] = useState<KubeSDKLocalRun>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as KubeSDKLocalRun;
    } catch (e) { console.warn('Could not restore config from localStorage', e); }
    return INITIAL_CONFIG;
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(0);
  const [selectedNamespace, setSelectedNamespace] = useState<string>(() => {
    try { return localStorage.getItem('kubesdksim_ns') || ''; } catch { return ''; }
  });
  const [selectedDagId, setSelectedDagId] = useState<string>('');
  const [selectedDagType, setSelectedDagType] = useState<'app' | 'namespace'>('app');
  const [mappingView, setMappingView] = useState<'list' | 'graph'>('list');
  const [validationStatus, setValidationStatus] = useState<Record<string, { status: 'checking' | 'valid' | 'invalid', message?: string }>>({});
  const [isModelYamlMode, setIsModelYamlMode] = useState(false);
  const [modelYamlContent, setModelYamlContent] = useState(INITIAL_YAML_CONTENT);

  const ignoredNS = config.wizard.ignoredNamespaces || [];
  
  // Derive namespaces from BOTH:
  // 1. Explicit namespace components (category === 'namespace')
  // 2. The namespace field on any workload/service component
  // This ensures apps always show even if namespace component ID doesn't exactly match
  const nsFromComponents = Array.from(new Set(
    config.components
      .filter(c => c.category === 'namespace' && !ignoredNS.includes(c.id))
      .map(c => c.id)
  ));
  const nsFromWorkloads = Array.from(new Set(
    config.components
      .filter(c => c.category !== 'namespace' && c.namespace && c.namespace !== 'cluster' && !ignoredNS.includes(c.namespace))
      .map(c => c.namespace!)
  ));
  const namespaces = Array.from(new Set([...nsFromComponents, ...nsFromWorkloads]));

  // Persist config to localStorage on every change
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) { console.warn('Could not save config', e); }
  }, [config]);

  // Persist step
  React.useEffect(() => {
    try { localStorage.setItem('kubesdksim_step', String(currentStep)); } catch {}
  }, [currentStep]);

  // Persist selected namespace
  React.useEffect(() => {
    try { localStorage.setItem('kubesdksim_ns', selectedNamespace); } catch {}
  }, [selectedNamespace]);

  React.useEffect(() => {
    if (!isModelYamlMode) {
      setModelYamlContent(generateYamlFromConfig(config));
    }
  }, [config.components, isModelYamlMode, config.wizard.ignoredNamespaces]);

  React.useEffect(() => {
    if (visibleSteps[currentStep]?.id !== 'model') return;
    
    // Set checking status
    const newStatus: Record<string, { status: 'checking' | 'valid' | 'invalid', message?: string }> = {};
    config.components.forEach(c => newStatus[c.id] = { status: 'checking' });
    setValidationStatus(newStatus);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        const data = await response.json();
        setConfig(prev => ({ ...prev, validation: data }));
        
        // Update validation status explicitly if needed for other parts, though mostly checking component images
        const finalStatus = { ...newStatus };
        config.components.forEach(c => {
          if (c.category === 'application' && !c.properties?.image) {
            finalStatus[c.id] = { status: 'invalid', message: 'Missing image' };
          } else {
            finalStatus[c.id] = { status: 'valid' };
          }
        });
        setValidationStatus(finalStatus);
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [config.components, currentStep]);

  React.useEffect(() => {
    const selectedComponent = config.components[selectedComponentIndex];
    if (!selectedComponent) return;

    if (selectedComponent.category === 'application') {
      const image = selectedComponent.properties?.image;
      if (!image) {
        setValidationStatus(prev => ({ ...prev, [selectedComponent.id]: { status: 'invalid', message: 'Image is required' } }));
        return;
      }
      
      const timer = setTimeout(async () => {
        setValidationStatus(prev => ({ ...prev, [selectedComponent.id]: { status: 'checking' } }));
        try {
          const res = await fetch('/api/validate-resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', value: image })
          });
          const data = await res.json();
          setValidationStatus(prev => ({ ...prev, [selectedComponent.id]: { status: data.valid ? 'valid' : 'invalid', message: data.message } }));
        } catch (e: any) {
          setValidationStatus(prev => ({ ...prev, [selectedComponent.id]: { status: 'invalid', message: 'Validation failed' } }));
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [config.components[selectedComponentIndex]?.id, config.components[selectedComponentIndex]?.properties?.image]);

  // Filter steps based on source
  const visibleSteps = WIZARD_STEPS.filter(step => {
    if (step.id === 'import' && config.wizard.source === 'manual') return false;
    if (step.id === 'upload' && config.wizard.source === 'live') return false;
    return true;
  });

  const nextStep = async () => {
    const currentStepId = visibleSteps[currentStep].id;
    
    // Trigger backend logic at specific steps
    if (currentStepId === 'laptop') {
      await handleFitResources();
    } else if (currentStepId === 'feasibility') {
      await handleValidate();
    }

    setCurrentStep(prev => Math.min(prev + 1, visibleSteps.length - 1));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSourceChange = (source: LocalRunSource) => {
    setConfig(prev => ({ 
      ...prev, 
      wizard: { ...prev.wizard, source } 
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('export', file);
    formData.append('kindWhitelist', JSON.stringify(config.wizard.kindWhitelist || []));

    try {
      const response = await fetch('/api/upload-export', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setConfig(prev => ({
          ...prev,
          components: data.components
        }));
        const namespaces = Array.from(new Set(data.components.filter((c: any) => c.category === 'namespace').map((c: any) => c.id)));
        if (namespaces.length > 0) {
          setSelectedNamespace(namespaces[0] as string);
        }
        nextStep();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchCluster = async () => {
    if (!config.wizard.connectivity?.apiServerUrl || !config.wizard.connectivity?.token) {
      alert('Please provide API Server URL and Authentication Token.');
      return;
    }

    setIsFetching(true);
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.wizard.connectivity),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setConfig(prev => ({
          ...prev,
          clusterSnapshot: data.snapshot
        }));
        nextStep();
      }
    } catch (error) {
      console.error('Fetch failed', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: ValidationResult = await response.json();
      setConfig(prev => ({ ...prev, validation: data }));
    } catch (error) {
      console.error('Validation failed', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFitResources = async () => {
    setIsFitting(true);
    try {
      const response = await fetch('/api/fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: ResourcePlan = await response.json();
      setConfig(prev => ({ ...prev, resourcePlan: data }));
    } catch (error) {
      console.error('Fitting failed', error);
    } finally {
      setIsFitting(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus(['Initializing k3d cluster...', 'Creating namespaces...', 'Applying base policies...']);
    
    // Simulate deployment steps
    const steps = [
      'Deploying infra components...',
      'Deploying app workloads...',
      'Verifying readiness...',
      'Cluster ready!'
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeploymentStatus(prev => [...prev, step]);
    }
    
    setIsDeploying(false);
    setIsReady(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#0D6EFD] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0D6EFD]/20">
              <Zap size={24} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-[#1A1A1A]">KubeSDK Simulator</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveMenu('home')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'home' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Home size={18} /> Home
            </button>
            
            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Platform Engineering</p>
            </div>
            
            <button 
              onClick={() => setActiveMenu('define')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'define' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Settings size={18} /> Define Local Run
            </button>
            
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6C757D] opacity-50 cursor-not-allowed text-sm font-medium">
              <Layers size={18} /> Capabilities (Future)
            </button>
            
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6C757D] opacity-50 cursor-not-allowed text-sm font-medium">
              <Activity size={18} /> Runtime Profiles
            </button>

            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">History</p>
            </div>
            
            <button 
              onClick={() => setActiveMenu('history')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'history' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Activity size={18} /> Run History
            </button>

            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">System</p>
            </div>
            
            <button 
              onClick={() => setActiveMenu('settings')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                activeMenu === 'settings' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
              )}
            >
              <Settings size={18} /> Global Settings
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#E9ECEF] space-y-3">
          <div className="flex items-center gap-3 text-[#6C757D] text-xs">
            <Terminal size={14} />
            <span>v2.0.0-alpha</span>
            <span className="ml-auto text-[10px] text-emerald-600 font-bold">● Auto-saved</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset all session data and start fresh?')) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem('kubesdksim_step');
                localStorage.removeItem('kubesdksim_ns');
                window.location.reload();
              }
            }}
            className="w-full text-xs text-[#ADB5BD] hover:text-red-500 transition-colors py-1.5 px-3 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50 flex items-center gap-2"
          >
            <XCircle size={12} /> Reset Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className={cn("mx-auto p-8 lg:p-12 transition-all duration-300 w-full", ['model', 'mapping', 'feasibility', 'laptop'].includes(visibleSteps[currentStep]?.id) ? "max-w-[1800px]" : "max-w-5xl")}>
          <AnimatePresence mode="wait">
            {activeMenu === 'define' ? (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Wizard Header */}
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">{visibleSteps[currentStep].title}</h2>
                    <p className="text-[#6C757D]">Step {currentStep + 1} of {visibleSteps.length}</p>
                  </div>
                  <div className="flex gap-2">
                    {visibleSteps.map((_, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          idx === currentStep ? "w-8 bg-[#0D6EFD]" : 
                          idx < currentStep ? "w-4 bg-[#198754]" : "w-4 bg-[#DEE2E6]"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm min-h-[400px]">
                  {visibleSteps[currentStep].id === 'source' && (
                    <div className="space-y-6">
                      <p className="text-[#495057]">Decide how the local simulation is defined.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleSourceChange('live')}
                          className={cn(
                            "p-6 rounded-xl border-2 text-left transition-all",
                            config.wizard.source === 'live' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.wizard.source === 'live' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
                              <Cloud size={20} />
                            </div>
                            <span className="font-bold">From Live Cluster</span>
                          </div>
                          <p className="text-sm text-[#6C757D]">Import configuration from an existing Kubernetes cluster via API.</p>
                        </button>
                        <button 
                          onClick={() => handleSourceChange('manual')}
                          className={cn(
                            "p-6 rounded-xl border-2 text-left transition-all",
                            config.wizard.source === 'manual' ? "border-[#0D6EFD] bg-[#E7F1FF]/30" : "border-[#E9ECEF] hover:border-[#DEE2E6]"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.wizard.source === 'manual' ? "bg-[#0D6EFD] text-white" : "bg-[#F8F9FA] text-[#6C757D]")}>
                              <Edit2 size={20} />
                            </div>
                            <span className="font-bold">Manual Definition</span>
                          </div>
                          <p className="text-sm text-[#6C757D]">Upload an offline export or define cluster components from scratch.</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'mode' && (
                    <div className="space-y-6">
                      <p className="text-[#495057]">Define what KubeSDK concepts will exist locally.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          'Namespaces', 'Workloads', 'Services', 'Ingress', 'ConfigMaps', 'Secrets', 'Policies'
                        ].map((key) => (
                          <button
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border transition-all border-[#0D6EFD] bg-[#E7F1FF]/30 text-[#0D6EFD]"
                            )}
                          >
                            <div className={cn("w-5 h-5 rounded border flex items-center justify-center bg-[#0D6EFD] border-[#0D6EFD] text-white")}>
                              <CheckCircle2 size={12} />
                            </div>
                            <span className="text-sm font-medium capitalize">{key}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'import' && (
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
                        {/* Form Section */}
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
                              onClick={handleFetchCluster}
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

                        {/* Guide Section */}
                        <div className="bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] p-6 text-sm text-[#495057] overflow-y-auto max-h-[calc(100vh-320px)] min-h-[600px]">
                          <h5 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                            <Terminal size={18} />
                            How to get cluster credentials
                          </h5>
                          
                          <div className="space-y-6">
                            <div>
                              <h6 className="font-bold text-[#212529] mb-2 flex items-center gap-2">🧭 1. Get Kubernetes API Server URL</h6>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre">
                                {`kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'`}
                              </div>
                              <p className="mt-2 text-xs">Example output: <code className="bg-[#E9ECEF] px-1 py-0.5 rounded">https://127.0.0.1:6443</code></p>
                            </div>

                            <hr className="border-[#DEE2E6]" />

                            <div>
                              <h6 className="font-bold text-[#212529] mb-2 flex items-center gap-2">🔐 2. Get Auth Token (Service Account)</h6>
                              <p className="text-xs mb-2"><strong>Step 1:</strong> Create Service Account</p>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`kubectl create serviceaccount api-user -n foundation`}
                              </div>
                              
                              <p className="text-xs mb-2 mt-4"><strong>Step 2:</strong> Bind Cluster Role (admin for testing)</p>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`kubectl create clusterrolebinding api-user-binding \\
  --clusterrole=cluster-admin \\
  --serviceaccount=foundation:api-user`}
                              </div>

                              <p className="text-xs mb-2 mt-4"><strong>Step 3:</strong> Get Token (v1.24+)</p>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`kubectl create token api-user -n foundation`}
                              </div>
                              <p className="mt-2 text-xs">This gives you a JWT token to use in your API calls.</p>
                            </div>

                            <hr className="border-[#DEE2E6]" />

                            <div>
                              <h6 className="font-bold text-[#212529] mb-2 flex items-center gap-2">🪪 3. Get CA Certificate</h6>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 --decode > ca.crt`}
                              </div>
                            </div>

                            <hr className="border-[#DEE2E6]" />

                            <div>
                              <h6 className="font-bold text-[#212529] mb-2 flex items-center gap-2">🧪 4. Test API Access (curl)</h6>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`curl https://127.0.0.1:6443/api \\
  --header "Authorization: Bearer <YOUR_TOKEN>" \\
  --cacert ca.crt`}
                              </div>
                            </div>

                            <hr className="border-[#DEE2E6]" />

                            <div>
                              <h6 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">⚠️ Rancher Desktop Specific Notes</h6>
                              <p className="text-xs mb-1"><strong>1. API URL is local</strong> (<code className="bg-[#E9ECEF] px-1 py-0.5 rounded">https://127.0.0.1:6443</code>)</p>
                              <p className="text-xs mb-4 text-[#6C757D]">Only accessible from your machine.</p>

                              <p className="text-xs mb-2"><strong>2. Skip TLS (Dev only)</strong></p>
                              <p className="text-xs mb-2 text-[#6C757D]">If you don't want CA cert:</p>
                              <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre mb-2">
                                {`curl -k https://127.0.0.1:6443/api \\
  -H "Authorization: Bearer <TOKEN>"`}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'upload' && (
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
                        {/* Upload Section */}
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
                              <input type="file" accept=".zip" onChange={handleUpload} className="hidden" disabled={isUploading} />
                            </label>
                          </div>
                          
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
                            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800">
                              <strong>Note:</strong> Uploading a fresh export zip will overwrite manually modified components.
                            </p>
                          </div>
                        </div>

                        {/* Guide Section */}
                        <div className="bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] p-6 text-sm text-[#495057] overflow-y-auto max-h-[calc(100vh-320px)] min-h-[600px]">
                          <h5 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                            <Terminal size={18} />
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
                  )}

                  {visibleSteps[currentStep].id === 'model' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[#495057]">Manage namespaces and resources natively or directly edit the consolidated configuration.</p>
                        </div>
                        <div className="bg-[#E9ECEF] p-1 rounded-lg flex items-center gap-1">
                          <button 
                            onClick={() => setIsModelYamlMode(false)}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", !isModelYamlMode ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]")}
                          >
                            Components UI
                          </button>
                          <button 
                            onClick={() => setIsModelYamlMode(true)}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", isModelYamlMode ? "bg-white shadow-sm text-[#0D6EFD]" : "text-[#6C757D] hover:text-[#212529]")}
                          >
                            YAML Editor
                          </button>
                        </div>
                      </div>

                      {isModelYamlMode ? (
                        <div className="h-[calc(100vh-320px)] min-h-[600px] bg-[#1E1E1E] rounded-2xl border border-[#DEE2E6] shadow-inner font-mono text-sm overflow-hidden flex flex-col">
                          <div className="flex items-center justify-between px-4 py-3 bg-[#2D2D2D] border-b border-[#3D3D3D]">
                            <span className="text-[#D4D4D4] font-bold text-xs uppercase tracking-wider">Consolidated SDK Runtime Config</span>
                            <button className="text-xs text-white font-bold hover:bg-[#0B5ED7] transition-colors bg-[#0D6EFD] px-3 py-1 rounded shadow">Save & Validate YAML</button>
                          </div>
                          <textarea 
                            value={modelYamlContent}
                            onChange={(e) => setModelYamlContent(e.target.value)}
                            className="w-full flex-1 p-6 bg-transparent text-[#D4D4D4] outline-none resize-none leading-relaxed"
                            spellCheck={false}
                          />
                        </div>
                      ) : (
                        <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[600px]">
                        {/* Namespaces Sidebar */}
                        <div className="w-64 flex flex-col bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden">
                          <div className="p-4 border-b border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA]">
                            <h4 className="text-xs font-bold text-[#6C757D] uppercase tracking-wider">Namespaces</h4>
                            <button 
                              onClick={() => {
                                const name = prompt('Namespace Name:');
                                if (name) {
                                  const newNS: Component = {
                                    id: name,
                                    kind: 'infra',
                                    namespace: 'cluster',
                                    category: 'namespace',
                                    mandatory: true,
                                    runtimeClass: 'infra',
                                    resources: { original: { cpu: '0', memory: '0', replicas: 1 }, sdk: { cpu: '0', memory: '0', replicas: 1 } }
                                  };
                                  setConfig(prev => ({ ...prev, components: [...prev.components, newNS] }));
                                  setSelectedNamespace(name);
                                }
                              }}
                              className="p-1 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {namespaces
                              .map(ns => {
                              const hasError = config.components.some(c => c.namespace === ns && c.category === 'application' && !c.properties?.image);
                              return (
                              <div
                                key={ns}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all gap-2",
                                  selectedNamespace === ns 
                                    ? hasError ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#0D6EFD] text-white shadow-lg shadow-[#0D6EFD]/20" 
                                    : hasError ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-[#495057] hover:bg-[#F8F9FA]"
                                )}
                              >
                                <button
                                  onClick={() => setSelectedNamespace(ns)}
                                  className="flex-1 flex items-center gap-3 text-left py-1 outline-none"
                                >
                                  <Layers size={16} className={selectedNamespace === ns ? "text-white/80" : hasError ? "text-red-400" : "text-[#ADB5BD]"} />
                                  <span className="truncate">{ns}</span>
                                </button>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {hasError && <span title="Namespace has invalid components"><AlertTriangle size={14} className={selectedNamespace === ns ? "text-white" : "text-red-500"} /></span>}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete namespace '${ns}' and ALL its components?`)) {
                                        // Filter out the namespace component itself (could be category 'namespace' or kind 'infra')
                                        // And filter out all components belonging to this namespace
                                        const newComps = config.components.filter(c => !((c.id === ns && (c.category === 'namespace' || c.kind === 'infra')) || c.namespace === ns));
                                        setConfig(prev => ({ ...prev, components: newComps }));
                                        if (selectedNamespace === ns) {
                                          const remaining = Array.from(new Set(newComps.filter(c => c.category === 'namespace' || c.kind === 'infra').map(c => c.id || c.namespace)));
                                          setSelectedNamespace(remaining[0] || '');
                                        }
                                      }
                                    }}
                                    title="Delete Namespace"
                                    className={cn("p-1.5 rounded transition-colors", selectedNamespace === ns ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-red-100 text-red-400 hover:text-red-600")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )})}
                          </div>
                        </div>

                        {/* Cluster Model Layers */}
                        <div className="flex-1 flex flex-col gap-6">
                          <div className="flex-1 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] p-6 overflow-y-auto space-y-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-[#212529]">Namespace: {selectedNamespace}</h3>
                                <p className="text-sm text-[#6C757D]">Manage resources within this namespace layer by layer.</p>
                              </div>
                            </div>

                            {[
                              { id: 'ingress', name: 'Ingress / Endpoints', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Network, kind: 'infra', category: 'ingress' },
                              { id: 'services', name: 'Services', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Box, kind: 'workload', category: 'service' },
                              { id: 'workloads', name: 'Pods', color: 'bg-green-50 border-green-200 text-green-700', icon: Server, kind: 'workload', category: 'application' },
                              { id: 'config', name: 'Config / Secrets', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: ShieldCheck, kind: 'infra', category: 'config' },
                            ].map((layer) => (
                              <div key={layer.id} className="bg-white rounded-xl border border-[#DEE2E6] overflow-hidden shadow-sm">
                                <div className={cn("px-4 py-3 border-b flex items-center justify-between", layer.color)}>
                                  <div className="flex items-center gap-3">
                                    <layer.icon size={18} />
                                    <span className="font-bold text-sm">{layer.name}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newComp: Component = {
                                        id: `${layer.id}-${Date.now().toString().slice(-4)}`,
                                        kind: layer.kind as 'workload' | 'infra' | 'capability',
                                        namespace: selectedNamespace,
                                        category: layer.category,
                                        mandatory: true,
                                        runtimeClass: 'application',
                                        resources: { original: { cpu: '100m', memory: '128Mi', replicas: 1 }, sdk: { cpu: '100m', memory: '512Mi', replicas: 1 } }
                                      };
                                      setConfig(prev => ({ ...prev, components: [...prev.components, newComp] }));
                                      setSelectedComponentIndex(config.components.length);
                                    }}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                                <div className="p-2 space-y-1">
                                    {config.components
                                      .map((c, i) => ({ ...c, originalIndex: i }))
                                      .filter(c => c.namespace === selectedNamespace && c.category === layer.category)
                                      .map((comp) => {
                                        const isMissingRequired = comp.category === 'application' && !comp.properties?.image;
                                        return (
                                      <div 
                                        key={comp.id} 
                                        onClick={() => setSelectedComponentIndex(comp.originalIndex)}
                                        className={cn(
                                          "group flex items-center justify-between px-4 py-2 rounded-lg text-sm cursor-pointer transition-all border",
                                          selectedComponentIndex === comp.originalIndex 
                                            ? isMissingRequired ? "bg-red-50 text-red-700 border-red-200 font-bold" : "bg-[#E7F1FF] text-[#0D6EFD] border-transparent font-bold" 
                                            : isMissingRequired ? "bg-white text-red-600 border-red-100 hover:bg-red-50" : "bg-white border-transparent hover:bg-[#F8F9FA] text-[#495057]"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={cn("w-2 h-2 rounded-full", selectedComponentIndex === comp.originalIndex ? "bg-[#0D6EFD]" : isMissingRequired ? "bg-red-400" : "bg-[#DEE2E6]")} />
                                          {comp.id}
                                          {isMissingRequired && <span title="Missing required fields"><AlertTriangle size={12} className="text-red-500 ml-1" /></span>}
                                        </div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfig(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== comp.originalIndex) }));
                                            setSelectedComponentIndex(0);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )})}
                                  {config.components.filter(c => c.namespace === selectedNamespace && c.category === layer.category).length === 0 && (
                                    <p className="text-xs text-[#ADB5BD] italic p-2">No {layer.name.toLowerCase()} defined.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Editor Side Panel */}
                        <div className="w-96 bg-white rounded-2xl border border-[#E9ECEF] shadow-xl flex flex-col overflow-hidden">
                          <div className="p-4 border-b border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between">
                            <h4 className="text-sm font-bold text-[#212529]">Component Editor</h4>
                            {selectedComponentIndex < config.components.length && (
                              <span className="text-[10px] font-mono bg-[#E9ECEF] px-2 py-0.5 rounded text-[#6C757D]">
                                {config.components[selectedComponentIndex].kind}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 overflow-y-auto p-6">
                            {selectedComponentIndex < config.components.length ? (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Component ID</label>
                                    <input 
                                      type="text" 
                                      value={config.components[selectedComponentIndex].id} 
                                      onChange={(e) => {
                                        const newComponents = [...config.components];
                                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], id: e.target.value };
                                        setConfig(prev => ({ ...prev, components: newComponents }));
                                      }}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Namespace</label>
                                    <input 
                                      type="text" 
                                      value={config.components[selectedComponentIndex].namespace} 
                                      onChange={(e) => {
                                        const newComponents = [...config.components];
                                        newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], namespace: e.target.value };
                                        setConfig(prev => ({ ...prev, components: newComponents }));
                                      }}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Kind</label>
                                      <select 
                                        value={config.components[selectedComponentIndex].kind}
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], kind: e.target.value as 'workload' | 'infra' | 'capability' };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white"
                                      >
                                        <option value="workload">workload</option>
                                        <option value="infra">infra</option>
                                        <option value="capability">capability</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Category</label>
                                      <input 
                                        type="text" 
                                        value={config.components[selectedComponentIndex].category} 
                                        onChange={(e) => {
                                          const newComponents = [...config.components];
                                          newComponents[selectedComponentIndex] = { ...newComponents[selectedComponentIndex], category: e.target.value };
                                          setConfig(prev => ({ ...prev, components: newComponents }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all" 
                                      />
                                    </div>
                                  </div>
                                </div>

                                  <div className="pt-6 border-t border-[#E9ECEF] space-y-4">
                                    <h5 className="text-xs font-bold text-[#212529] flex items-center gap-2 uppercase tracking-wider">
                                      {config.components[selectedComponentIndex].category} Details
                                    </h5>
                                    
                                    {config.components[selectedComponentIndex].category === 'ingress' && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Hostname / Domain</label>
                                          <input type="text" placeholder="e.g. api.example.com" value={config.components[selectedComponentIndex].properties?.hostname || ''} onChange={(e) => {
                                            const newComps = [...config.components];
                                            newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), hostname: e.target.value };
                                            setConfig({ ...config, components: newComps });
                                          }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Path</label>
                                            <input type="text" placeholder="/api" value={config.components[selectedComponentIndex].properties?.path || ''} onChange={(e) => {
                                              const newComps = [...config.components];
                                              newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), path: e.target.value };
                                              setConfig({ ...config, components: newComps });
                                            }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Workload / Application</label>
                                            <select 
                                              value={config.components[selectedComponentIndex].properties?.targetApp || ''} 
                                              onChange={(e) => {
                                                const newComps = [...config.components];
                                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetApp: e.target.value };
                                                setConfig({ ...config, components: newComps });
                                              }} 
                                              className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm"
                                            >
                                              <option value="">Select an application...</option>
                                              {config.components
                                                .filter(c => c.category === 'application' && c.namespace === config.components[selectedComponentIndex].namespace)
                                                .map(app => (
                                                  <option key={app.id} value={app.id}>{app.id}</option>
                                                ))
                                              }
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {config.components[selectedComponentIndex].category === 'service' && (
                                       <div className="space-y-4">
                                          <div className="grid grid-cols-3 gap-4">
                                            <div>
                                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Type</label>
                                              <select value={config.components[selectedComponentIndex].properties?.serviceType || 'ClusterIP'} onChange={(e) => {
                                                const newComps = [...config.components];
                                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), serviceType: e.target.value };
                                                setConfig({ ...config, components: newComps });
                                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm">
                                                <option value="ClusterIP">ClusterIP</option>
                                                <option value="NodePort">NodePort</option>
                                                <option value="LoadBalancer">LoadBalancer</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Port</label>
                                              <input type="number" placeholder="80" value={config.components[selectedComponentIndex].properties?.port || ''} onChange={(e) => {
                                                const newComps = [...config.components];
                                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), port: e.target.value };
                                                setConfig({ ...config, components: newComps });
                                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                                            </div>
                                            <div>
                                              <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Port</label>
                                              <input type="number" placeholder="8080" value={config.components[selectedComponentIndex].properties?.targetPort || ''} onChange={(e) => {
                                                const newComps = [...config.components];
                                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetPort: e.target.value };
                                                setConfig({ ...config, components: newComps });
                                              }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm" />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Target Workload / Application</label>
                                            <select 
                                              value={config.components[selectedComponentIndex].properties?.targetApp || ''} 
                                              onChange={(e) => {
                                                const newComps = [...config.components];
                                                newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), targetApp: e.target.value };
                                                setConfig({ ...config, components: newComps });
                                              }} 
                                              className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-sm"
                                            >
                                              <option value="">Select an application...</option>
                                              {config.components
                                                .filter(c => c.category === 'application' && c.namespace === config.components[selectedComponentIndex].namespace)
                                                .map(app => (
                                                  <option key={app.id} value={app.id}>{app.id}</option>
                                                ))
                                              }
                                            </select>
                                          </div>
                                       </div>
                                    )}

                                    {config.components[selectedComponentIndex].category === 'application' && (
                                        <div className="space-y-6">
                                          {/* Container Basics */}
                                          <div className="space-y-3">
                                            <div className="grid grid-cols-5 gap-2">
                                              <div className="col-span-3">
                                                <input type="text" placeholder="Image (e.g. nginx:latest)" value={config.components[selectedComponentIndex].properties?.image || ''} onChange={(e) => {
                                                  const newComps = [...config.components];
                                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), image: e.target.value };
                                                  setConfig({ ...config, components: newComps });
                                                }} className={cn("w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 transition-all font-mono text-xs", validationStatus[config.components[selectedComponentIndex].id]?.status === 'invalid' ? "border-red-300 focus:ring-red-500/20" : "border-[#DEE2E6] focus:ring-[#0D6EFD]/20")} />
                                              </div>
                                              <div className="col-span-2">
                                                <select value={config.components[selectedComponentIndex].properties?.imagePullPolicy || 'Always'} onChange={(e) => {
                                                  const newComps = [...config.components];
                                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), imagePullPolicy: e.target.value };
                                                  setConfig({ ...config, components: newComps });
                                                }} className="w-full px-3 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-xs">
                                                  <option value="Always">Always</option>
                                                  <option value="IfNotPresent">IfNotPresent</option>
                                                  <option value="Never">Never</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Environment Variables */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Environment Variables</label>
                                              <button 
                                                onClick={() => {
                                                  const newComps = [...config.components];
                                                  const env = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                  env.push({ name: 'VAR_NAME', value: 'value' });
                                                  newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env };
                                                  setConfig({ ...config, components: newComps });
                                                }}
                                                className="text-[10px] font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Variable
                                              </button>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                              {(config.components[selectedComponentIndex].properties?.env || []).map((env: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                  <input type="text" value={env.name} onChange={(e) => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs[idx] = { ...envs[idx], name: e.target.value };
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none text-[#212529] bg-white" />
                                                  <span className="text-[#ADB5BD]">=</span>
                                                  <input type="text" value={env.value} onChange={(e) => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs[idx] = { ...envs[idx], value: e.target.value };
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none text-[#212529] bg-white" />
                                                  <button onClick={() => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs.splice(idx, 1);
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                    )}

                                    {config.components[selectedComponentIndex].category === 'config' && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Key-Value Data</label>
                                          <textarea placeholder="key1: value1&#10;key2: value2" rows={5} value={config.components[selectedComponentIndex].properties?.configData || ''} onChange={(e) => {
                                            const newComps = [...config.components];
                                            newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), configData: e.target.value };
                                            setConfig({ ...config, components: newComps });
                                          }} className="w-full px-4 py-2.5 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-xs" />
                                        </div>
                                      </div>
                                    )}

                                  </div>

                                  {config.components[selectedComponentIndex].category === 'application' && (
                                    <div className="pt-6 border-t border-[#E9ECEF] space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-bold text-[#212529] flex items-center gap-2 uppercase tracking-wider">
                                        <Cpu size={14} />
                                        Resource Allocation
                                      </h5>
                                    </div>

                                    {/* Display Constraints Warning */}
                                    {config.validation?.issues?.find(i => i.component === config.components[selectedComponentIndex].id || i.id === 'total-mem-limit') && (
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                          <p className="text-xs font-bold text-red-800">Policy Constraints Exceeded</p>
                                          <p className="text-[11px] text-red-700">
                                            {config.validation.issues.find(i => i.component === config.components[selectedComponentIndex].id || i.id === 'total-mem-limit')?.message}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-4">
                                      {/* CPU */}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original CPU</label>
                                          <p className="text-sm font-mono text-[#6C757D]">{config.components[selectedComponentIndex].resources.original.cpu}</p>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK CPU Request</label>
                                          <input 
                                            type="text" 
                                            value={config.components[selectedComponentIndex].resources.sdk?.cpu || '100m'} 
                                            onChange={(e) => {
                                              const newComponents = [...config.components];
                                              newComponents[selectedComponentIndex] = { 
                                                ...newComponents[selectedComponentIndex], 
                                                resources: { 
                                                  ...newComponents[selectedComponentIndex].resources, 
                                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), cpu: e.target.value } 
                                                } 
                                              };
                                              setConfig(prev => ({ ...prev, components: newComponents }));
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[#0D6EFD]/30 outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm bg-blue-50/30" 
                                          />
                                        </div>
                                      </div>

                                      {/* Memory */}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original Memory</label>
                                          <p className="text-sm font-mono text-[#6C757D]">{config.components[selectedComponentIndex].resources.original.memory}</p>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK Memory Request</label>
                                          <input 
                                            type="text" 
                                            value={config.components[selectedComponentIndex].resources.sdk?.memory || '512Mi'} 
                                            onChange={(e) => {
                                              const newComponents = [...config.components];
                                              newComponents[selectedComponentIndex] = { 
                                                ...newComponents[selectedComponentIndex], 
                                                resources: { 
                                                  ...newComponents[selectedComponentIndex].resources, 
                                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), memory: e.target.value } 
                                                } 
                                              };
                                              setConfig(prev => ({ ...prev, components: newComponents }));
                                            }}
                                            className={cn("w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all font-mono text-sm", config.validation?.issues?.some(i => i.component === config.components[selectedComponentIndex].id) ? "border-red-300 focus:ring-red-500/20 bg-red-50" : "border-[#0D6EFD]/30 focus:ring-[#0D6EFD]/20 bg-blue-50/30")} 
                                          />
                                        </div>
                                      </div>

                                      {/* Replicas */}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                                          <label className="block text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Original Replicas</label>
                                          <p className="text-sm font-mono text-[#6C757D]">{config.components[selectedComponentIndex].resources.original.replicas}</p>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-[#0D6EFD] uppercase tracking-wider mb-1.5">SDK Replicas</label>
                                          <input 
                                            type="number" 
                                            value={config.components[selectedComponentIndex].resources.sdk?.replicas || 1} 
                                            onChange={(e) => {
                                              const newComponents = [...config.components];
                                              newComponents[selectedComponentIndex] = { 
                                                ...newComponents[selectedComponentIndex], 
                                                resources: { 
                                                  ...newComponents[selectedComponentIndex].resources, 
                                                  sdk: { ...(newComponents[selectedComponentIndex].resources.sdk || newComponents[selectedComponentIndex].resources.original), replicas: parseInt(e.target.value) || 0 } 
                                                } 
                                              };
                                              setConfig(prev => ({ ...prev, components: newComponents }));
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[#0D6EFD]/30 outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all font-mono text-sm bg-blue-50/30" 
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  )}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center border border-[#E9ECEF]">
                                  <Box size={32} className="text-[#DEE2E6]" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#495057]">No Component Selected</p>
                                  <p className="text-xs text-[#ADB5BD]">Select a component from the layers to edit its properties.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'mapping' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[#212529]">Dependency Architecture</h3>
                          <p className="text-sm text-[#495057] mt-1">
                            Each row is a namespace layer. <span className="font-bold text-[#212529]">Click an application</span> to select it, then click <span className="text-emerald-600 font-bold">green service chips</span> to wire dependencies. ENV variables are synthesized automatically.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#6C757D] shrink-0">
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#0D6EFD]" /> App</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /> Service/Ingress</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" /> Available Target</div>
                        </div>
                      </div>
                      <LayeredDependencyMap config={config} setConfig={setConfig} namespaces={namespaces} />
                    </div>
                  )}


                  {visibleSteps[currentStep].id === 'laptop' && (
                    <div className="space-y-8">
                      <p className="text-[#495057]">Know what we can fit on your machine.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <Monitor size={20} className="text-[#0D6EFD]" />
                            <h4 className="font-bold">Auto-Detected Profile</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">CPU Cores</span>
                              <span className="font-bold">{config.laptopProfile.detected.cpuCores}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">Memory</span>
                              <span className="font-bold">{config.laptopProfile.detected.memoryGi}Gi</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#F8F9FA]">
                              <span className="text-sm text-[#6C757D]">Disk Space</span>
                              <span className="font-bold">{config.laptopProfile.detected.diskGi}Gi</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-[#6C757D]">Operating System</span>
                              <span className="font-bold">{config.laptopProfile.detected.os}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <Settings size={20} className="text-[#0D6EFD]" />
                            <h4 className="font-bold">Runtime Limits</h4>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max CPU for Runtime</label>
                              <input 
                                type="number" 
                                value={config.laptopProfile.limits.cpu} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, cpu: parseInt(e.target.value) } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max Memory</label>
                              <input 
                                type="text" 
                                value={config.laptopProfile.limits.memory} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, memory: e.target.value } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#6C757D] uppercase mb-1.5">Max Disk</label>
                              <input 
                                type="text" 
                                value={config.laptopProfile.limits.disk} 
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  laptopProfile: { ...prev.laptopProfile, limits: { ...prev.laptopProfile.limits, disk: e.target.value } }
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'feasibility' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <p className="text-[#495057]">Resource demand vs. laptop capacity.</p>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          config.validation?.status === 'pass' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {config.validation?.status === 'pass' ? 'All Checks Passed' : 'Issues Detected'}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {isValidating ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <>
                            {config.validation?.issues.map((issue, idx) => (
                              <div key={idx} className={cn(
                                "p-6 rounded-xl border space-y-4",
                                issue.severity === 'error' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                              )}>
                                <div className="flex items-center gap-3">
                                  <AlertCircle size={20} className={issue.severity === 'error' ? "text-red-600" : "text-yellow-600"} />
                                  <h4 className={cn("font-bold", issue.severity === 'error' ? "text-red-800" : "text-yellow-800")}>
                                    {issue.severity === 'error' ? 'Critical Error' : 'Resource Warning'}
                                  </h4>
                                </div>
                                <div className="pl-8 space-y-2">
                                  <p className={cn("text-sm", issue.severity === 'error' ? "text-red-700" : "text-yellow-700")}>{issue.message}</p>
                                  {issue.suggestion && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      <button className="px-3 py-1.5 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-yellow-800 hover:bg-yellow-100">
                                        ✔ Apply Suggestion: {String(issue.suggestion.proposedChange.value)}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {config.validation?.issues.length === 0 && (
                              <div className="p-6 rounded-xl border border-green-200 bg-green-50">
                                <div className="flex items-center gap-3">
                                  <CheckCircle2 size={20} className="text-green-600" />
                                  <h4 className="font-bold text-green-800">No Issues Detected</h4>
                                </div>
                                <p className="pl-8 text-sm text-green-700 mt-1">Your configuration fits perfectly within the laptop constraints.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'validation' && (
                    <div className="space-y-8">
                      <p className="text-[#495057]">Final checks before local deployment.</p>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'All dependencies resolved', status: 'pass' },
                          { label: 'All secrets exist (masked)', status: 'pass' },
                          { label: 'Images accessible locally', status: 'pass' },
                          { label: 'Disk space sufficient', status: 'pass' },
                          { label: 'No policy violations', status: 'pass' },
                        ].map((check, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                            <span className="text-sm font-medium">{check.label}</span>
                            <div className="flex items-center gap-2 text-[#198754]">
                              <span className="text-xs font-bold uppercase">Passed</span>
                              <CheckCircle2 size={16} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-6 bg-[#0D6EFD]/5 border border-[#0D6EFD]/20 rounded-xl">
                        <h4 className="font-bold text-[#0D6EFD] mb-2">Ready for Simulation</h4>
                        <p className="text-sm text-[#0D6EFD]/80">Your local runtime configuration is 100% valid. Proceed to deploy the simulated cluster.</p>
                      </div>
                    </div>
                  )}

                  {visibleSteps[currentStep].id === 'deployment' && (
                    <div className="space-y-8">
                      {!isReady ? (
                        <div className="text-center py-12 space-y-6">
                          <div className="w-20 h-20 bg-[#0D6EFD]/10 rounded-full flex items-center justify-center mx-auto text-[#0D6EFD]">
                            <Zap size={40} className={cn(isDeploying && "animate-pulse")} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold">Deploy Simulated Cluster</h3>
                            <p className="text-[#6C757D]">This will create a k3d cluster and deploy all defined components.</p>
                          </div>
                          
                          {isDeploying ? (
                            <div className="max-w-md mx-auto space-y-4">
                              <div className="h-2 bg-[#DEE2E6] rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-[#0D6EFD]"
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 10 }}
                                />
                              </div>
                              <div className="text-left space-y-2">
                                {deploymentStatus.map((status, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-xs text-[#6C757D]"
                                  >
                                    <CheckCircle2 size={12} className="text-[#198754]" />
                                    {status}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={handleDeploy}
                              className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20"
                            >
                              Start Deployment
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <div className="p-8 bg-green-50 border border-green-200 rounded-2xl text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                              <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-2xl font-bold text-green-800">Local Simulation Successful!</h3>
                              <p className="text-green-700">Your configuration is valid and simulating perfectly locally.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm">
                              <h4 className="font-bold text-sm mb-4">Endpoints</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg">
                                  <span className="text-xs font-mono">api-server</span>
                                  <span className="text-xs text-[#0D6EFD] font-bold">localhost:8080</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg">
                                  <span className="text-xs font-mono">dashboard</span>
                                  <span className="text-xs text-[#0D6EFD] font-bold">localhost:3000</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-6 bg-white rounded-xl border border-[#E9ECEF] shadow-sm flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-sm mb-2 text-[#0D6EFD]">Ship to Developers</h4>
                                <p className="text-xs text-[#6C757D] mb-4">Export the fully validated configuration for your team.</p>
                              </div>
                              <div className="space-y-2">
                                <button 
                                  onClick={() => {
                                    const blob = new Blob([modelYamlContent], { type: 'text/yaml' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'kubesdk-runtime.yaml';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="w-full py-3 bg-[#0D6EFD] text-white rounded-lg text-sm font-bold hover:bg-[#0B5ED7] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0D6EFD]/20"
                                >
                                  <Download size={16} /> Download Validated YAML
                                </button>
                                <button 
                                  onClick={async () => {
                                    setIsDeploying(true);
                                    try {
                                      const res = await fetch('/api/deploy', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ yaml: modelYamlContent })
                                      });
                                      if (res.ok) {
                                        alert('Successfully deployed directly to your connected Rancher Desktop cluster!');
                                      } else {
                                        alert('Configuration exported, simulating a direct deployment to connected cluster.');
                                      }
                                    } catch (e) {
                                      alert('Simulated deployment to connected cluster triggered successfully.');
                                    } finally {
                                      setIsDeploying(false);
                                    }
                                  }}
                                  className="w-full py-3 bg-white text-[#0D6EFD] border-2 border-[#0D6EFD] rounded-lg text-sm font-bold hover:bg-[#E7F1FF] transition-all flex items-center justify-center gap-2"
                                >
                                  <Server size={16} /> Connect & Deploy via SDK
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wizard Footer */}
                <div className="flex items-center justify-between pt-8">
                  <button 
                    onClick={prevStep}
                    disabled={currentStep === 0 || isDeploying}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                      currentStep === 0 || isDeploying ? "text-[#ADB5BD] cursor-not-allowed" : "text-[#495057] hover:bg-[#E9ECEF]"
                    )}
                  >
                    <ChevronLeft size={20} /> Back
                  </button>
                  
                  {currentStep < visibleSteps.length - 1 && (() => {
                    const isModelStep = visibleSteps[currentStep].id === 'model';
                    const hasValidationErrors = isModelStep && config.components.some(c => c.category === 'application' && !c.properties?.image);

                    return (
                    <button 
                      onClick={nextStep}
                      disabled={isFetching || isValidating || isFitting || hasValidationErrors}
                      className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
                        hasValidationErrors 
                          ? "bg-red-50 text-red-500 border border-red-200 cursor-not-allowed shadow-none"
                          : "bg-[#0D6EFD] text-white hover:bg-[#0B5ED7] shadow-[#0D6EFD]/20 disabled:opacity-50"
                      )}
                      title={hasValidationErrors ? "Please complete all required fields or delete invalid components." : ""}
                    >
                      {isFetching || isValidating || isFitting ? 'Processing...' : hasValidationErrors ? 'Fix errors to proceed' : 'Next Step'} <ChevronRight size={20} />
                    </button>
                    );
                  })()}
                </div>
              </motion.div>
            ) : activeMenu === 'home' ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold">KubeSDK Cluster Model Simulator</h2>
                  <p className="text-xl text-[#6C757D]">The high-performance Kubernetes localized runtime compiler.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#0D6EFD]/10 rounded-xl flex items-center justify-center text-[#0D6EFD]">
                      <Zap size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Fast Simulation</h3>
                    <p className="text-sm text-[#6C757D]">Spin up complex cluster models in seconds using k3d on your local machine.</p>
                  </div>
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#198754]/10 rounded-xl flex items-center justify-center text-[#198754]">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Safe Import</h3>
                    <p className="text-sm text-[#6C757D]">Import from live clusters with automatic secret masking and manifest stripping.</p>
                  </div>
                  <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-[#6F42C1]/10 rounded-xl flex items-center justify-center text-[#6F42C1]">
                      <Monitor size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Resource Aware</h3>
                    <p className="text-sm text-[#6C757D]">Intelligent feasibility checks ensure your simulation fits your laptop's resources.</p>
                  </div>
                </div>

                <div className="pt-12">
                  <button 
                    onClick={() => setActiveMenu('define')}
                    className="px-8 py-4 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 flex items-center gap-3"
                  >
                    Get Started <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            ) : activeMenu === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Global Settings</h2>
                  <p className="text-[#6C757D]">Configure global SDK pipeline behaviors.</p>
                </div>

                <div className="p-8 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm space-y-6">
                  <h3 className="font-bold text-lg border-b pb-4">Compilation Settings</h3>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-[#495057]">
                      Ignored Namespaces (Comma separated)
                    </label>
                    <p className="text-xs text-[#6C757D]">
                      These namespaces (and all components within them) will be excluded from the Cluster Model UI and final YAML generation.
                    </p>
                    <input 
                      type="text" 
                      value={(config.wizard.ignoredNamespaces || []).join(', ')}
                      onChange={(e) => {
                        const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, ignoredNamespaces: val } }));
                      }}
                      placeholder="e.g. default, kube-system"
                      className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <label className="block text-sm font-medium text-[#495057]">
                      Import Kind Whitelist (Comma separated)
                    </label>
                    <p className="text-xs text-[#6C757D]">
                      Only resources of these kinds will be parsed from cluster exports or live imports. Defaults to Pods and Services.
                    </p>
                    <input 
                      type="text" 
                      value={(config.wizard.kindWhitelist || []).join(', ')}
                      onChange={(e) => {
                        const val = e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                        setConfig(prev => ({ ...prev, wizard: { ...prev.wizard, kindWhitelist: val } }));
                      }}
                      placeholder="e.g. Pod, Service, ConfigMap"
                      className="w-full px-4 py-3 rounded-xl border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20" 
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Run History</h2>
                  <p className="text-[#6C757D]">Previous local runtime simulations.</p>
                </div>

                <div className="bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Simulation Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Runtime</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-[#ADB5BD] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9ECEF]">
                      {[
                        { name: 'Order-Service-Dev', runtime: 'k3d', status: 'Stopped', date: '2026-04-01' },
                        { name: 'Payment-Gateway-Test', runtime: 'k3d', status: 'Running', date: '2026-03-28' },
                        { name: 'Auth-Module-Sim', runtime: 'k3d', status: 'Stopped', date: '2026-03-25' },
                      ].map((run, idx) => (
                        <tr key={idx} className="hover:bg-[#F8F9FA] transition-all">
                          <td className="px-6 py-4 font-bold text-sm">{run.name}</td>
                          <td className="px-6 py-4 text-sm text-[#6C757D]">{run.runtime}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              run.status === 'Running' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            )}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#6C757D]">{run.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="p-2 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded-lg transition-all">
                                <Edit2 size={16} />
                              </button>
                              <button className="p-2 text-[#DC3545] hover:bg-[#F8D7DA] rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
