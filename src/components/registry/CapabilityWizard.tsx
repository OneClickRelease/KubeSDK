import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Check, Code, Terminal,
  Settings2, Box, CheckCircle2, Search, Layers, RefreshCw,
  Star, Info, ChevronDown, Database, Shield, MessageSquare,
  Globe, HardDrive, Brain, BarChart, Server, Cpu, Activity,
  AlertCircle, Package, GitBranch, ExternalLink
} from 'lucide-react';
import * as yaml from 'js-yaml';
import { cn } from '../../lib/utils';
import { CAPABILITY_TEMPLATES } from '../../lib/capabilities/templates';
import rawLanguagesYaml from '../../configs/languages.yaml?raw';
import { ThreeDHexagon, ProviderItem, LAYER_BORDER_COLORS, LAYER_BG_GRADIENTS, LAYER_LINE_COLORS, LAYER_HEX_COLORS, LAYER_ACTIVE_CARD_STYLES, LAYER_BG_COLORS, PROVIDER_ACTIVE_STYLES, getProviderLogo } from './CapabilityLayersBrowser';

const LANG_CONFIG = yaml.load(rawLanguagesYaml) as any;
const AVAILABLE_LANGUAGES = LANG_CONFIG?.languages || {};

interface CapabilityWizardProps {
  service: any;
  sourceFilename?: string;
  onClose: () => void;
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Provider {
  name: string;
  description: string;
  latest_version?: string;
  license_conditions?: string;
  protocols_supported?: string[];
  default_ports?: number[];
  resources?: { vcpu: string; memory: string; disk: string };
  dependencies?: string[];
  ha_recommendation?: string;
  languages?: Record<string, { frameworks?: string[]; sample_code?: string; config_template?: string }>;
  website_url?: string;
  repo_url?: string;
  documentation_url?: string;
  image_url?: string;
}
interface SubLayer { name: string; description: string; providers: Provider[]; }
interface Layer { id: string; name: string; description: string; sub_layers: SubLayer[]; providers: Provider[]; }

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const LAYER_ICONS: Record<string, React.ReactNode> = {
  storage: <HardDrive size={24} />,
  orchestrator: <Server size={24} />,
  database: <Database size={24} />,
  messaging: <MessageSquare size={24} />,
  applications: <Globe size={24} />,
  data: <BarChart size={24} />,
  'ai-ml': <Brain size={24} />,
  security: <Shield size={24} />,
};

const LAYER_GRADIENTS: Record<string, string> = {
  storage: 'from-amber-500 to-orange-600',
  orchestrator: 'from-blue-500 to-indigo-600',
  database: 'from-emerald-500 to-teal-600',
  messaging: 'from-purple-500 to-violet-600',
  applications: 'from-sky-500 to-cyan-600',
  data: 'from-pink-500 to-rose-600',
  'ai-ml': 'from-violet-500 to-purple-700',
  security: 'from-red-500 to-rose-700',
};

const LAYER_COLORS: Record<string, {
  bg: string; lightBg: string; border: string; activeBorder: string;
  text: string; badge: string; btnActive: string;
}> = {
  storage:      { bg: 'bg-amber-500',  lightBg: 'bg-amber-50',   border: 'border-amber-200',  activeBorder: 'border-amber-500',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  btnActive: 'bg-amber-500 text-white' },
  orchestrator: { bg: 'bg-blue-500',   lightBg: 'bg-blue-50',    border: 'border-blue-200',   activeBorder: 'border-blue-500',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   btnActive: 'bg-blue-500 text-white' },
  database:     { bg: 'bg-emerald-500',lightBg: 'bg-emerald-50', border: 'border-emerald-200',activeBorder: 'border-emerald-500',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700',btnActive: 'bg-emerald-500 text-white' },
  messaging:    { bg: 'bg-purple-500', lightBg: 'bg-purple-50',  border: 'border-purple-200', activeBorder: 'border-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', btnActive: 'bg-purple-500 text-white' },
  applications: { bg: 'bg-sky-500',    lightBg: 'bg-sky-50',     border: 'border-sky-200',    activeBorder: 'border-sky-500',    text: 'text-sky-700',    badge: 'bg-sky-100 text-sky-700',    btnActive: 'bg-sky-500 text-white' },
  data:         { bg: 'bg-pink-500',   lightBg: 'bg-pink-50',    border: 'border-pink-200',   activeBorder: 'border-pink-500',   text: 'text-pink-700',   badge: 'bg-pink-100 text-pink-700',   btnActive: 'bg-pink-500 text-white' },
  'ai-ml':      { bg: 'bg-violet-500', lightBg: 'bg-violet-50',  border: 'border-violet-200', activeBorder: 'border-violet-500', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', btnActive: 'bg-violet-500 text-white' },
  security:     { bg: 'bg-red-500',    lightBg: 'bg-red-50',     border: 'border-red-200',    activeBorder: 'border-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    btnActive: 'bg-red-500 text-white' },
};

const DEFAULT_COLORS = LAYER_COLORS['database'];

function getLicenseBadge(lic?: string) {
  if (!lic) return { label: 'Unknown', color: 'bg-gray-100 text-gray-500' };
  const l = lic.toLowerCase();
  if (l.includes('apache') || l.includes('mit') || l.includes('bsd') || l.includes('open-source') || l.includes('open source'))
    return { label: 'Open Source', color: 'bg-emerald-100 text-emerald-700' };
  if (l.includes('mpl') || l.includes('gpl'))
    return { label: 'Copyleft', color: 'bg-blue-100 text-blue-700' };
  if (l.includes('cloud managed') || l.includes('n/a (cloud'))
    return { label: 'Cloud Managed', color: 'bg-sky-100 text-sky-700' };
  if (l.includes('proprietary') || l.includes('commercial') || l.includes('enterprise') || l.includes('subscription'))
    return { label: 'Commercial', color: 'bg-amber-100 text-amber-700' };
  return { label: 'License', color: 'bg-gray-100 text-gray-500' };
}

interface ConfigField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'password';
  default: any;
}

const CATEGORY_CONFIG_FIELDS: Record<string, ConfigField[]> = {
  database: [
    { name: 'host', label: 'Host / Endpoint', type: 'string', default: 'localhost' },
    { name: 'port', label: 'Port', type: 'number', default: 3306 },
    { name: 'database', label: 'Default Database / Schema', type: 'string', default: 'myapp_db' },
    { name: 'username', label: 'Username', type: 'string', default: 'admin' },
    { name: 'password', label: 'Password (Placeholder)', type: 'password', default: 'password_placeholder' }
  ],
  storage: [
    { name: 'endpoint', label: 'Storage Endpoint', type: 'string', default: 'http://localhost' },
    { name: 'bucket', label: 'Bucket / Share Name', type: 'string', default: 'my-bucket' },
    { name: 'region', label: 'AWS Region', type: 'string', default: 'us-east-1' },
    { name: 'accessKeyId', label: 'Access Key ID', type: 'string', default: 'admin' },
    { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', default: 'password_placeholder' }
  ],
  messaging: [
    { name: 'bootstrapServers', label: 'Bootstrap Servers / Brokers', type: 'string', default: 'localhost:9092' },
    { name: 'username', label: 'Username / Client ID', type: 'string', default: 'admin' },
    { name: 'password', label: 'Password / Client Secret', type: 'password', default: 'password_placeholder' }
  ],
  security: [
    { name: 'address', label: 'Server Address', type: 'string', default: 'https://localhost:8200' },
    { name: 'token', label: 'Token / API Key', type: 'password', default: 'password_placeholder' }
  ],
  default: [
    { name: 'host', label: 'Access URL / Host', type: 'string', default: 'localhost' },
    { name: 'port', label: 'Port', type: 'number', default: 80 }
  ]
};

function getProviderCategory(layerId: string, provider: any): string {
  const layerLower = (layerId || '').toLowerCase();
  const parentLower = (provider?.parent || '').toLowerCase();
  
  if (
    layerLower.includes('sql') || 
    layerLower.includes('database') || 
    parentLower.includes('database') ||
    ['sql', 'nosql', 'timeseries', 'graph', 'data-warehouse'].some(x => layerLower.includes(x))
  ) {
    return 'database';
  }
  
  if (
    layerLower.includes('storage') || 
    layerLower.includes('lake') || 
    parentLower.includes('storage') ||
    ['file-storage', 'block-storage', 'object-storage', 'data-lake'].some(x => layerLower.includes(x))
  ) {
    return 'storage';
  }
  
  if (layerLower.includes('messaging') || parentLower.includes('messaging')) {
    return 'messaging';
  }
  
  if (
    layerLower.includes('security') || 
    layerLower.includes('secrets') || 
    layerLower.includes('zero-trust') ||
    layerLower.includes('identity') ||
    parentLower.includes('security')
  ) {
    return 'security';
  }
  
  return 'default';
}

function getDefaultProvider(providers: Provider[]): Provider | null {
  if (!providers.length) return null;
  const scored = providers.map(p => {
    const lic = (p.license_conditions || '').toLowerCase();
    let score = 0;
    if (lic.includes('apache') || lic.includes('mit') || lic.includes('bsd') || lic.includes('open-source') || lic.includes('open source')) score += 3;
    if (lic.includes('mpl') || lic.includes('gpl')) score += 2;
    if (lic.includes('proprietary') || lic.includes('commercial') || lic.includes('enterprise')) score -= 1;
    if (lic.includes('cloud managed') || lic.includes('n/a (cloud')) score -= 2;
    return { provider: p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].provider;
}

function deriveTypeId(layerId: string, subName: string, providerName: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `yaml-${slug(layerId)}-${slug(subName)}-${slug(providerName)}`;
}

function guessLayerId(serviceName: string): string {
  const n = (serviceName || '').toLowerCase();
  if (n.includes('kafka') || n.includes('rabbit') || n.includes('nats') || n.includes('pulsar') || n.includes('msg')) return 'messaging';
  if (n.includes('kube') || n.includes('k3s') || n.includes('k0s') || n.includes('rke') || n.includes('openshift') || n.includes('rancher')) return 'orchestrator';
  if (n.includes('vault') || n.includes('secret') || n.includes('opa') || n.includes('istio') || n.includes('keycloak') || n.includes('okta') || n.includes('zero-trust')) return 'security';
  if (n.includes('rest') || n.includes('grpc') || n.includes('graphql') || n.includes('api') || n.includes('soap')) return 'applications';
  if (n.includes('minio') || n.includes('s3') || n.includes('ebs') || n.includes('ceph') || n.includes('storage')) return 'storage';
  if (n.includes('tensor') || n.includes('torch') || n.includes('kserve') || n.includes('mlflow') || n.includes('mlops')) return 'ai-ml';
  if (n.includes('lake') || n.includes('warehouse') || n.includes('mesh') || n.includes('governance')) return 'data';
  return 'database';
}

// ─────────────────────────────────────────────────────────
// Provider Detail Panel (shown below provider grid)
// ─────────────────────────────────────────────────────────
const ProviderDetail = ({
  provider, layerId, sdkSupport, setSdkSupport
}: {
  provider: Provider;
  layerId: string;
  sdkSupport: Record<string, { frameworks: string[], buildTools: string[] }>;
  setSdkSupport: React.Dispatch<React.SetStateAction<Record<string, { frameworks: string[], buildTools: string[] }>>>;
}) => {
  const colors = LAYER_COLORS[layerId] || DEFAULT_COLORS;
  const gradient = LAYER_GRADIENTS[layerId] || 'from-blue-500 to-indigo-600';
  const langCount = provider.languages ? Object.keys(provider.languages).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className={cn('rounded-2xl border-2 overflow-hidden', colors.activeBorder)}
    >
      {/* Header strip */}
      <div className={cn('bg-gradient-to-r px-5 py-4 text-white', gradient)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Selected Provider</p>
            <h4 className="text-lg font-bold">{provider.name}</h4>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">{provider.description}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {provider.latest_version && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                v{provider.latest_version}
              </span>
            )}
            {provider.license_conditions && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white max-w-[160px] text-right leading-snug">
                {provider.license_conditions}
              </span>
            )}
          </div>
        </div>

        {/* Protocols + Ports row */}
        {(provider.protocols_supported?.length || provider.default_ports?.length) && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/20">
            {provider.protocols_supported && provider.protocols_supported.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase text-white/60">Protocols</span>
                <div className="flex gap-1 flex-wrap">
                  {provider.protocols_supported.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-white/20 text-white font-medium">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {provider.default_ports && provider.default_ports.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase text-white/60">Ports</span>
                <div className="flex gap-1">
                  {provider.default_ports.map(p => (
                    <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 text-white font-bold">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body: 3-column grid */}
      <div className="bg-white grid grid-cols-3 divide-x divide-[#F0F0F0]">

        {/* Col 1: Resources */}
        <div className="p-4 space-y-3">
          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={11} /> Resources
          </p>
          {provider.resources ? (
            <div className="space-y-2">
              {[
                { label: 'vCPU', value: provider.resources.vcpu, icon: <Cpu size={12} /> },
                { label: 'Memory', value: provider.resources.memory, icon: <Server size={12} /> },
                { label: 'Disk', value: provider.resources.disk, icon: <HardDrive size={12} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className={cn('rounded-xl p-3 flex items-center gap-3 border', colors.lightBg, colors.border)}>
                  <div className={cn('shrink-0', colors.text)}>{icon}</div>
                  <div>
                    <p className="text-[9px] font-bold text-[#ADB5BD] uppercase">{label}</p>
                    <p className={cn('font-bold text-sm leading-tight', colors.text)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#ADB5BD] italic">Not specified</p>
          )}
        </div>

        {/* Col 2: Dependencies + HA */}
        <div className="p-4 space-y-4">
          {provider.dependencies && provider.dependencies.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5">
                <Package size={11} /> Dependencies
              </p>
              <ul className="space-y-1.5">
                {provider.dependencies.map((dep, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#495057]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#ADB5BD] shrink-0" />
                    {dep}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {provider.ha_recommendation && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={11} /> HA Recommendation
              </p>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-800 leading-relaxed">{provider.ha_recommendation}</p>
              </div>
            </div>
          )}

          {/* Links & Resources */}
          {(provider.website_url || provider.repo_url || provider.documentation_url) && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5">
                <ExternalLink size={11} /> Links & Resources
              </p>
              <div className="flex flex-col gap-1.5 pl-2">
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold">
                    <Globe size={12} /> Website
                  </a>
                )}
                {provider.repo_url && (
                  <a href={provider.repo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold">
                    <GitBranch size={12} /> Repository
                  </a>
                )}
                {provider.documentation_url && (
                  <a href={provider.documentation_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold">
                    <Info size={12} /> Documentation
                  </a>
                )}
              </div>
            </div>
          )}

          {!provider.dependencies?.length && !provider.ha_recommendation && !provider.website_url && !provider.repo_url && !provider.documentation_url && (
            <p className="text-xs text-[#ADB5BD] italic pt-2">No additional details</p>
          )}
        </div>

        {/* Col 3: SDK Support Toggles */}
        <div className="p-4 space-y-3 flex flex-col h-[350px]">
          <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <Code size={11} /> SDK Support Toggles
          </p>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {Object.entries(AVAILABLE_LANGUAGES).map(([langKey, langInfo]: [string, any]) => {
              const isSelected = !!sdkSupport[langKey];
              const isRecommended = !!provider.languages?.[langKey];
              const frameworks = langInfo.frameworks || [];
              const buildTools = langInfo['build-tools'] || [];
              
              const toggleLang = () => {
                const next = { ...sdkSupport };
                if (isSelected) {
                  delete next[langKey];
                } else {
                  next[langKey] = {
                    frameworks: [...frameworks],
                    buildTools: [...buildTools]
                  };
                }
                setSdkSupport(next);
              };

              const toggleSelection = (type: 'frameworks' | 'buildTools', val: string) => {
                if (!isSelected) return;
                const next = { ...sdkSupport };
                const arr = next[langKey][type];
                next[langKey][type] = arr.includes(val) ? arr.filter((n: string) => n !== val) : [...arr, val];
                setSdkSupport(next);
              };

              return (
                <div key={langKey} className={cn('border rounded-xl transition-all overflow-hidden', isSelected ? 'border-[#0D6EFD] bg-white shadow-sm' : 'border-[#E9ECEF] bg-[#F8F9FA]')}>
                  <div className="px-3 py-2 flex items-center justify-between cursor-pointer" onClick={toggleLang}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-4 h-4 rounded flex items-center justify-center border', isSelected ? 'bg-[#0D6EFD] border-[#0D6EFD] text-white' : 'border-[#DEE2E6] bg-white')}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className={cn('text-xs font-bold capitalize', isSelected ? 'text-[#1A1A1A]' : 'text-[#6C757D]')}>{langKey}</span>
                    </div>
                    {isRecommended && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                        ⭐ Recommended
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="px-3 pb-3 pt-1 border-t border-[#F8F9FA] space-y-3 bg-white">
                      {frameworks.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider">Frameworks</span>
                          <div className="flex flex-wrap gap-1">
                            {frameworks.map((fw: string) => {
                              const checked = sdkSupport[langKey].frameworks.includes(fw);
                              return (
                                <button
                                  type="button"
                                  key={fw}
                                  onClick={(e) => { e.stopPropagation(); toggleSelection('frameworks', fw); }}
                                  className={cn('px-2 py-1 rounded text-[10px] font-medium border transition-colors', checked ? 'bg-[#E7F1FF] text-[#0D6EFD] border-[#B6D4FE]' : 'bg-white text-[#6C757D] border-[#DEE2E6] hover:bg-[#F8F9FA]')}
                                >
                                  {fw}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {buildTools.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider">Build Tools</span>
                          <div className="flex flex-wrap gap-1">
                            {buildTools.map((bt: string) => {
                              const checked = sdkSupport[langKey].buildTools.includes(bt);
                              return (
                                <button
                                  type="button"
                                  key={bt}
                                  onClick={(e) => { e.stopPropagation(); toggleSelection('buildTools', bt); }}
                                  className={cn('px-2 py-1 rounded text-[10px] font-medium border transition-colors', checked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-[#6C757D] border-[#DEE2E6] hover:bg-[#F8F9FA]')}
                                >
                                  {bt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Main Layer Browser — 3D Hexagon layout
// ─────────────────────────────────────────────────────────
interface LayerBrowserProps {
  service: any;
  selectedType: string;
  onSelectProvider: (type: string, provider: Provider, layerId: string) => void;
  sdkSupport: Record<string, { frameworks: string[], buildTools: string[] }>;
  setSdkSupport: React.Dispatch<React.SetStateAction<Record<string, { frameworks: string[], buildTools: string[] }>>>;
}

const LayerBrowser = ({ service, selectedType, onSelectProvider, sdkSupport, setSdkSupport }: LayerBrowserProps) => {
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [detailProviderName, setDetailProviderName] = React.useState<string | null>(null);
  const [collapsedLayers, setCollapsedLayers] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (layerId: string) => {
    setCollapsedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  React.useEffect(() => {
    fetch('/api/registry/capabilities/layers')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          setLayers(d.layers);
          // Auto-collapse other layers, keep suggested layer open
          const suggested = guessLayerId(service.name);
          const initialCollapsed: Record<string, boolean> = {};
          d.layers.forEach((l: any) => {
            if (l.id !== suggested) {
              initialCollapsed[l.id] = true;
            }
          });
          setCollapsedLayers(initialCollapsed);
        }
      })
      .finally(() => setLoading(false));
  }, [service.name]);

  // Set default detailProviderName when selectedType matches an existing capability on load
  React.useEffect(() => {
    if (layers.length > 0 && selectedType && !detailProviderName) {
      for (const l of layers) {
        const hasSubLayers = l.sub_layers.length > 0;
        if (hasSubLayers) {
          for (const sub of l.sub_layers) {
            for (const prov of sub.providers) {
              const typeId = deriveTypeId(l.id, sub.name, prov.name);
              if (typeId === selectedType) {
                setDetailProviderName(prov.name);
                return;
              }
            }
          }
        } else {
          for (const prov of l.providers) {
            const typeId = deriveTypeId(l.id, l.id, prov.name);
            if (typeId === selectedType) {
              setDetailProviderName(prov.name);
              return;
            }
          }
        }
      }
    }
  }, [layers, selectedType]);

  // Filter layers by search term
  const filteredLayers = React.useMemo(() => {
    let list = layers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.map(layer => {
        const filteredSubs = layer.sub_layers.map(sub => ({
          ...sub,
          providers: sub.providers.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          )
        })).filter(sub =>
          sub.name.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          sub.providers.length > 0
        );
        const filteredProviders = layer.providers.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
        const layerMatch =
          layer.name.toLowerCase().includes(q) ||
          layer.description.toLowerCase().includes(q);
        if (!layerMatch && filteredSubs.length === 0 && filteredProviders.length === 0) return null;
        return { ...layer, sub_layers: filteredSubs, providers: filteredProviders };
      }).filter(Boolean) as Layer[];
    }
    return list;
  }, [layers, search]);

  const detailProvider = React.useMemo(() => {
    if (!detailProviderName) return null;
    for (const l of layers) {
      const found = l.providers.find(p => p.name === detailProviderName);
      if (found) return { provider: found, layerId: l.id };
      for (const sub of l.sub_layers) {
        const subFound = sub.providers.find(p => p.name === detailProviderName);
        if (subFound) return { provider: subFound, layerId: l.id };
      }
    }
    return null;
  }, [layers, detailProviderName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw size={22} className="animate-spin text-[#0D6EFD]" />
        <span className="ml-3 text-sm text-[#6C757D]">Loading capability catalog…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search / Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search capability providers..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:border-[#0D6EFD] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] hover:text-[#1A1A1A]">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3D Rows List */}
      <div className="space-y-6">
        {filteredLayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#ADB5BD] gap-2">
            <AlertCircle size={24} />
            <p className="text-sm">No providers match your search</p>
          </div>
        ) : (
          filteredLayers.map(layer => {
            const hasSubLayers = layer.sub_layers.length > 0;
            const isCollapsed = !!collapsedLayers[layer.id];
            
            // Get all providers in this layer to count them and show preview
            const allProviders: Provider[] = [];
            if (hasSubLayers) {
              layer.sub_layers.forEach(sub => allProviders.push(...sub.providers));
            } else {
              allProviders.push(...layer.providers);
            }
            
            const borderLeft = LAYER_BORDER_COLORS[layer.id] || 'border-l-emerald-500';
            const bgGradient = LAYER_BG_GRADIENTS[layer.id] || 'from-emerald-500/5 to-white';
            
            // Determine if the selected capability is inside this layer
            const selection = (() => {
              if (!selectedType) return null;
              if (hasSubLayers) {
                for (const sub of layer.sub_layers) {
                  for (const prov of sub.providers) {
                    if (deriveTypeId(layer.id, sub.name, prov.name) === selectedType) {
                      return { subName: sub.name, providerName: prov.name };
                    }
                  }
                }
              } else {
                for (const prov of layer.providers) {
                  if (deriveTypeId(layer.id, layer.id, prov.name) === selectedType) {
                    return { subName: layer.name, providerName: prov.name };
                  }
                }
              }
              return null;
            })();
            const hasSelection = selection !== null;
            
            return (
              <div key={layer.id} className="flex items-start gap-0 w-full relative">
                {/* Left: Hexagon Container */}
                <div className="shrink-0 w-[150px] h-[70px] flex items-center justify-center relative z-20" style={{ perspective: 1000 }}>
                  <motion.div 
                    className="w-[140px] h-[70px] cursor-pointer"
                    whileHover={{ scale: 1.05, rotateY: 12, rotateX: -6, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCollapse(layer.id)}
                    title="Click to collapse/expand layer"
                  >
                    <ThreeDHexagon label={layer.name} layerId={layer.id} isSelected={hasSelection} />
                  </motion.div>
                </div>

                {/* Connector Line */}
                <div className="w-8 h-[70px] flex items-center justify-center shrink-0 relative z-10 overflow-visible">
                  <svg width="32" height="20" className="overflow-visible" viewBox="0 0 32 20">
                    <motion.path
                      d="M 0 10 L 32 10"
                      stroke={LAYER_HEX_COLORS[layer.id] || '#10b981'}
                      strokeWidth={hasSelection ? 3 : 1.5}
                      strokeDasharray={hasSelection ? "6 4" : "none"}
                      animate={hasSelection ? { strokeDashoffset: [0, -20] } : {}}
                      transition={hasSelection ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
                    />
                    {hasSelection && (
                      <motion.circle
                        r="3.5"
                        fill="#FFFFFF"
                        stroke={LAYER_HEX_COLORS[layer.id] || '#10b981'}
                        strokeWidth="2"
                        animate={{ cx: [0, 32] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                  </svg>
                </div>

                {/* Right: Horizontal Category Card */}
                <motion.div 
                  layout="position"
                  whileHover={{ y: -3, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "flex-1 min-h-[70px] bg-white border border-l-4 rounded-2xl p-5 shadow-sm relative z-20 transition-all duration-300 flex flex-col justify-center gap-4",
                    borderLeft,
                    hasSelection ? (LAYER_ACTIVE_CARD_STYLES[layer.id] || '') : ("border-[#E9ECEF] " + bgGradient)
                  )}
                >
                  {/* Collapsible Header */}
                  <div 
                    className="flex items-center justify-between w-full cursor-pointer select-none"
                    onClick={() => toggleCollapse(layer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[#495057]", (LAYER_COLORS[layer.id] || DEFAULT_COLORS).text)}>
                        {LAYER_ICONS[layer.id] || <Box size={24} />}
                      </span>
                      <span className="text-base font-extrabold text-[#1A1A1A] tracking-tight">{layer.name}</span>
                      <span className="text-sm font-bold text-[#ADB5BD] uppercase tracking-wider">
                        {allProviders.length} Provider{allProviders.length !== 1 ? 's' : ''}
                      </span>
                      
                      {/* Selected provider badge summary */}
                      {selection && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm ml-2"
                        >
                          <CheckCircle2 size={10} className="text-emerald-600 animate-pulse" />
                          <span>Active: {selection.providerName}</span>
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Collapsed logos preview */}
                      {isCollapsed && (
                        <div className="flex -space-x-2 overflow-hidden py-1">
                          {allProviders.slice(0, 6).map((p, idx) => {
                            const logo = (p.image_url && p.image_url.startsWith('http')) ? p.image_url : getProviderLogo(p.name);
                            return (
                              <div key={idx} className="w-7 h-7 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0" title={p.name}>
                                {logo ? (
                                  <img src={logo} className="w-4 h-4 object-contain" alt={p.name} />
                                ) : (
                                  <Box size={10} className="text-[#ADB5BD]" />
                                )}
                              </div>
                            );
                          })}
                          {allProviders.length > 6 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-[#F8F9FA] shadow-sm flex items-center justify-center text-[9px] font-extrabold text-[#6C757D] shrink-0">
                              +{allProviders.length - 6}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                        className="text-[#ADB5BD] hover:text-[#1A1A1A]"
                      >
                        <ChevronDown size={16} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden space-y-4 pt-2 border-t border-[#F8F9FA]"
                      >
                        {hasSubLayers ? (
                          layer.sub_layers.map(sub => (
                            <div key={sub.name} className="flex items-center gap-4 py-2 border-b last:border-b-0 border-[#F8F9FA]">
                              {/* Sub-layer label (wider to prevent chopping) */}
                              <div className="w-36 shrink-0 flex items-center gap-2">
                                <Layers size={13} className="text-[#ADB5BD]" />
                                <span className="text-xs font-bold text-[#495057]">{sub.name}</span>
                              </div>
                              {/* Divider */}
                              <div className="w-[1px] h-6 bg-[#E9ECEF] shrink-0" />
                              {/* Providers */}
                              <div className="flex-1 flex items-center gap-5 overflow-x-auto py-1 scrollbar-hide">
                                {sub.providers.map(prov => {
                                  const typeId = deriveTypeId(layer.id, sub.name, prov.name);
                                  const isSelected = selectedType === typeId;
                                  return (
                                    <ProviderItem
                                      key={prov.name}
                                      prov={prov as any}
                                      layerId={layer.id}
                                      subName={sub.name}
                                      isSelected={isSelected}
                                      onClick={() => {
                                        onSelectProvider(typeId, prov, layer.id);
                                        setDetailProviderName(prov.name);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-4 py-2">
                            {/* Layer label (wider to prevent chopping) */}
                            <div className="w-36 shrink-0 flex items-center gap-2">
                              <Layers size={13} className="text-[#ADB5BD]" />
                              <span className="text-xs font-bold text-[#495057]">{layer.name}</span>
                            </div>
                            {/* Divider */}
                            <div className="w-[1px] h-6 bg-[#E9ECEF] shrink-0" />
                            {/* Providers */}
                            <div className="flex-1 flex items-center gap-5 overflow-x-auto py-1 scrollbar-hide">
                              {layer.providers.map(prov => {
                                const typeId = deriveTypeId(layer.id, layer.id, prov.name);
                                const isSelected = selectedType === typeId;
                                return (
                                  <ProviderItem
                                    key={prov.name}
                                    prov={prov as any}
                                    layerId={layer.id}
                                    subName={layer.name}
                                    isSelected={isSelected}
                                    onClick={() => {
                                      onSelectProvider(typeId, prov, layer.id);
                                      setDetailProviderName(prov.name);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail panel — rendered below list */}
      <AnimatePresence>
        {detailProvider && (
          <div className="mt-6">
            <ProviderDetail
              provider={detailProvider.provider}
              layerId={detailProvider.layerId}
              sdkSupport={sdkSupport}
              setSdkSupport={setSdkSupport}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Main Wizard
// ─────────────────────────────────────────────────────────
export const CapabilityWizard = ({ service, sourceFilename, onClose, onComplete }: CapabilityWizardProps) => {
  const isEdit = service.isEdit;
  const [step, setStep] = React.useState<number>(isEdit ? 2 : 1);
  const [selectedType, setSelectedType] = React.useState<string>(service.type || '');
  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string>('');
  const [yamlMode, setYamlMode] = React.useState(false);
  const [config, setConfig] = React.useState(service.config || {
    host: `${service.name}.${service.namespace}.svc.cluster.local`,
    port: service.ports?.[0]?.port || 80,
    database: 'myapp_db',
    username: 'admin',
    password: 'password_placeholder'
  });
  const [sdkSupport, setSdkSupport] = React.useState<Record<string, { frameworks: string[], buildTools: string[] }>>(service.sdkSupport || {});
  const [comboPayloads, setComboPayloads] = React.useState<Record<string, {
    dependencies: string;
    envVars: Array<{ key: string; value: string }>;
    snippetTemplate: string;
    config?: Record<string, any>;
  }>>(service.comboPayloads || {});

  const [newKey, setNewKey] = React.useState('');
  const [newValue, setNewValue] = React.useState('');

  const combinations = React.useMemo(() => {
    const combos: any[] = [];
    Object.entries(sdkSupport).forEach(([langKey, langInfo]) => {
      const frameworks = langInfo.frameworks.length > 0 ? langInfo.frameworks : ['none'];
      const buildTools = langInfo.buildTools.length > 0 ? langInfo.buildTools : ['none'];
      frameworks.forEach(fw => buildTools.forEach(bt => combos.push({ id: `${langKey}-${fw}-${bt}`, language: langKey, framework: fw, buildTool: bt })));
    });
    return combos;
  }, [sdkSupport]);

  const providerCategory = React.useMemo(() => {
    return selectedProvider ? getProviderCategory(selectedLayerId, selectedProvider) : 'default';
  }, [selectedLayerId, selectedProvider]);

  const activeFields = React.useMemo(() => {
    return CATEGORY_CONFIG_FIELDS[providerCategory] || CATEGORY_CONFIG_FIELDS.default;
  }, [providerCategory]);

  const [activeComboId, setActiveComboId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (step === 2 && combinations.length > 0) {
      if (!activeComboId || !combinations.find((c: any) => c.id === activeComboId)) {
        setActiveComboId(combinations[0].id);
      }
    }
  }, [step, combinations, activeComboId]);

  const fetchedCombosRef = React.useRef<Set<string>>(new Set());

  // Reset fetched status when provider changes
  React.useEffect(() => {
    fetchedCombosRef.current.clear();
  }, [selectedProvider]);

  // Auto-populate SDK combinations payload from sample files
  React.useEffect(() => {
    if (!selectedProvider || combinations.length === 0) return;

    combinations.forEach(async (combo) => {
      const comboKey = combo.id; // e.g. "java-spring-boot-maven"
      
      if (fetchedCombosRef.current.has(comboKey)) {
        return;
      }
      
      // If we already have dependencies or templates from the registry, skip fetching
      if (comboPayloads[comboKey]?.dependencies || comboPayloads[comboKey]?.snippetTemplate) {
        fetchedCombosRef.current.add(comboKey);
        return;
      }

      const langKeyLower = combo.language.toLowerCase();
      const providerLangKey = Object.keys(selectedProvider.languages || {}).find(
        k => k.toLowerCase() === langKeyLower
      );
      if (!providerLangKey) return;
      
      const langInfo = selectedProvider.languages[providerLangKey];
      if (!langInfo) return;

      fetchedCombosRef.current.add(comboKey);

      try {
        const queryParams = new URLSearchParams({
          sample_code: langInfo.sample_code || '',
          config_template: langInfo.config_template || '',
          framework: combo.framework !== 'none' ? combo.framework : '',
          build_tool: combo.buildTool !== 'none' ? combo.buildTool : ''
        });

        const res = await fetch(`/api/registry/capabilities/sample-payload?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setComboPayloads(prev => {
              if (prev[comboKey]?.dependencies || prev[comboKey]?.snippetTemplate) {
                return prev;
              }
              return {
                ...prev,
                [comboKey]: {
                  dependencies: data.dependencies || '',
                  envVars: data.envVars || [],
                  snippetTemplate: data.snippetTemplate || ''
                }
              };
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch default sample for combination ${comboKey}:`, err);
        fetchedCombosRef.current.delete(comboKey);
      }
    });
  }, [selectedProvider, combinations]);

  const [rawYaml, setRawYaml] = React.useState('');
  React.useEffect(() => {
    if (yamlMode) setRawYaml(yaml.dump({ ...config, type: selectedType }));
  }, [yamlMode, config, selectedType]);

  const handleSelectProvider = (typeId: string, provider: Provider, layerId: string) => {
    setSelectedType(typeId);
    setSelectedProvider(provider);
    setSelectedLayerId(layerId);
    
    // Determine the category and dynamic default configuration
    const category = getProviderCategory(layerId, provider);
    const fields = CATEGORY_CONFIG_FIELDS[category] || CATEGORY_CONFIG_FIELDS.default;
    
    const newConfig: Record<string, any> = {};
    fields.forEach(f => {
      newConfig[f.name] = f.default;
    });

    // Override default port with provider's default port if available
    if (provider.default_ports?.[0]) {
      newConfig.port = provider.default_ports[0];
    }

    // Auto-resolve hostname details pointing to Kubernetes service name
    const svcHost = `${service.name}.${service.namespace}.svc.cluster.local`;
    
    if (newConfig.hasOwnProperty('host')) {
      newConfig.host = svcHost;
    }
    if (newConfig.hasOwnProperty('endpoint')) {
      newConfig.endpoint = `http://${svcHost}:${newConfig.port || 80}`;
    }
    if (newConfig.hasOwnProperty('bootstrapServers')) {
      newConfig.bootstrapServers = `${svcHost}:${newConfig.port || 9092}`;
    }
    if (newConfig.hasOwnProperty('address')) {
      newConfig.address = `http://${svcHost}:${newConfig.port || 8200}`;
    }

    setConfig(newConfig);

    // Pre-fill SDK support from provider languages
    if (provider.languages && Object.keys(sdkSupport).length === 0) {
      const newSdk: Record<string, { frameworks: string[], buildTools: string[] }> = {};
      Object.entries(provider.languages).forEach(([lang, info]) => {
        const langLower = lang.toLowerCase();
        const langDef = AVAILABLE_LANGUAGES[langLower] || {};
        newSdk[langLower] = {
          frameworks: info.frameworks || langDef.frameworks || [],
          buildTools: langDef['build-tools'] || []
        };
      });
      setSdkSupport(newSdk);
    }
  };

  const handleSave = async () => {
    try {
      let finalConfig = config;
      let finalType = selectedType;
      if (yamlMode) {
        try {
          const parsed = yaml.load(rawYaml) as any;
          if (parsed.type) finalType = parsed.type;
          const { type, id, displayName, ...rest } = parsed;
          finalConfig = rest;
        } catch { alert('Invalid YAML format'); return; }
      }
      const response = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFilename, id: service.id, serviceId: service.id,
          namespace: service.namespace, displayName: service.name,
          type: finalType, providerName: selectedProvider?.name,
          providerLayerId: selectedLayerId, config: finalConfig,
          sdkSupport, comboPayloads
        })
      });
      if (response.ok) onComplete();
    } catch (e) { console.error('Save failed', e); }
  };

  const handleDeleteCapability = async () => {
    if (!confirm('Are you sure you want to deregister this capability?')) return;
    try {
      const res = await fetch(`/api/registry/${service.id}`, { method: 'DELETE' });
      if (res.ok) {
        onComplete();
      } else {
        alert('Deregister failed');
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const colors = LAYER_COLORS[selectedLayerId] || DEFAULT_COLORS;
  const gradient = LAYER_GRADIENTS[selectedLayerId] || 'from-[#0D6EFD] to-[#0B5ED7]';

  const STEPS = [
    { n: 1, label: 'Select Provider & SDK' },
    { n: 2, label: 'Configure & Code' },
    { n: 3, label: 'Summary' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        // Wider modal for step 1 to accommodate the split layout
        className={cn(
          'bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] w-full transition-all duration-300 max-w-5xl'
        )}
      >
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br', gradient)}>
              <Settings2 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1A1A1A]">Register Capability</h3>
              <p className="text-sm text-[#6C757D]">{service.name} in {service.namespace}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors text-[#ADB5BD] hover:text-[#1A1A1A]">
            <X size={20} />
          </button>
        </div>

        {/* ─── Step Progress ───────────────────────────────── */}
        <div className="px-8 pt-5 pb-4 bg-white border-b border-[#F8F9FA]">
          <div className="flex items-center">
            {STEPS.map(({ n, label }, idx) => (
              <React.Fragment key={n}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0',
                    step === n ? `bg-gradient-to-br ${gradient} text-white shadow-md` :
                    step > n ? 'bg-[#198754] text-white' : 'bg-[#F8F9FA] text-[#ADB5BD]'
                  )}>
                    {step > n ? <Check size={14} /> : n}
                  </div>
                  <p className={cn('text-xs font-semibold whitespace-nowrap', step === n ? 'text-[#1A1A1A]' : 'text-[#ADB5BD]')}>
                    {label}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-3 rounded-full transition-all', step > n ? 'bg-[#198754]' : 'bg-[#E9ECEF]')} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ─── Content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Capability Browser ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Discovered service + selected provider summary */}
                <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E9ECEF] flex items-center gap-6">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Interface / URL</p>
                      <p className="text-xs font-mono text-[#1A1A1A] mt-1 truncate" title={`${service.name}.${service.namespace}.svc.cluster.local`}>
                        {service.name}.{service.namespace}.svc
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Resource Kind</p>
                      <p className="text-xs font-mono text-[#1A1A1A] mt-1">{service.kind || 'Service'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Active Ports</p>
                      <p className="text-xs font-mono text-[#1A1A1A] mt-1">
                        {service.ports?.map((p: any) => `${p.port}/${p.protocol || 'TCP'}`).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {/* Selected provider quick-view */}
                  {selectedProvider ? (
                    <div className={cn('rounded-xl border px-4 py-3 min-w-[200px] shrink-0', colors.lightBg, colors.border)}>
                      <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">Selected Provider</p>
                      <p className={cn('font-bold text-sm', colors.text)}>{selectedProvider.name}</p>
                      <p className="text-xs text-[#6C757D] mt-0.5 leading-snug">{selectedProvider.description}</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#DEE2E6] px-4 py-3 min-w-[200px] shrink-0 flex items-center justify-center">
                      <p className="text-xs text-[#ADB5BD] italic text-center">No provider selected yet</p>
                    </div>
                  )}
                </div>

                {/* Heading */}
                <div>
                  <h4 className="text-base font-bold text-[#1A1A1A]">Select Capability Type</h4>
                  <p className="text-sm text-[#6C757D]">Browse the capability catalog and pick the provider that matches this service.</p>
                </div>

                {/* Split-panel browser */}
                <LayerBrowser
                  service={service}
                  selectedType={selectedType}
                  onSelectProvider={handleSelectProvider}
                  sdkSupport={sdkSupport}
                  setSdkSupport={setSdkSupport}
                />
              </motion.div>
            )}

            {/* ── STEP 2: Configure & Code ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-lg font-bold text-[#1A1A1A]">Configure SDK & Connection Code</h4>
                  <p className="text-sm text-[#6C757D]">Set up connection variables and code snippets for each selected combination.</p>
                </div>

                {combinations.length === 0 ? (
                  <div className="p-20 text-center space-y-4 border-2 border-dashed border-[#DEE2E6] rounded-3xl bg-white">
                    <Terminal className="mx-auto text-[#ADB5BD]" size={40} />
                    <p className="text-[#6C757D]">No SDK Languages were selected in Step 1.</p>
                  </div>
                ) : (
                  <div className="flex gap-6 h-[520px] border border-[#E9ECEF] rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Left Panel: Combinations Sidebar */}
                    <div className="w-1/4 border-r border-[#E9ECEF] bg-[#F8F9FA] overflow-y-auto">
                      <div className="p-3 border-b border-[#E9ECEF] bg-white">
                        <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Combinations ({combinations.length})</span>
                      </div>
                      {combinations.map(combo => {
                        const isActive = activeComboId === combo.id;
                        return (
                          <button
                            type="button"
                            key={combo.id}
                            onClick={() => setActiveComboId(combo.id)}
                            className={cn('w-full text-left p-4 border-b border-[#E9ECEF] transition-colors flex flex-col gap-1.5',
                              isActive ? 'bg-white border-l-4 border-l-[#0D6EFD]' : 'hover:bg-[#E9ECEF] border-l-4 border-l-transparent'
                            )}
                          >
                            <span className="font-bold text-sm capitalize text-[#1A1A1A]">{combo.language}</span>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[9px] bg-[#E7F1FF] text-[#0D6EFD] px-1.5 py-0.5 rounded font-medium">{combo.framework}</span>
                              <span className="text-[9px] bg-[#D1E7DD] text-[#0F5132] px-1.5 py-0.5 rounded font-medium">{combo.buildTool}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Dashboard Area (Middle & Right Columns) */}
                    <div className="flex-1 flex overflow-hidden">
                      {activeComboId && (() => {
                        const active = comboPayloads[activeComboId] || { dependencies: '', envVars: [], snippetTemplate: '', config: {} };
                        const activeConf = (active.config && Object.keys(active.config).length > 0) ? active.config : config;
                        const updateActivePayload = (updates: any) => setComboPayloads(prev => ({
                          ...prev,
                          [activeComboId]: { ...active, ...updates }
                        }));
                        const updateActiveConfig = (updatedFields: any) => setComboPayloads(prev => {
                          const act = prev[activeComboId] || { dependencies: '', envVars: [], snippetTemplate: '', config: {} };
                          const currentConf = (act.config && Object.keys(act.config).length > 0) ? act.config : config;
                          return {
                            ...prev,
                            [activeComboId]: {
                              ...act,
                              config: { ...currentConf, ...updatedFields }
                            }
                          };
                        });

                        return (
                          <>
                            {/* Middle Column: Connection Config */}
                            <div className="w-1/2 p-6 border-r border-[#E9ECEF] overflow-y-auto space-y-6">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-[#6C757D] uppercase tracking-wider flex items-center gap-2">
                                  <Settings2 size={14} /> Connection Configuration
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setYamlMode(!yamlMode)}
                                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border',
                                    yamlMode ? 'bg-[#0D6EFD] border-[#0D6EFD] text-white' : 'bg-white border-[#E9ECEF] text-[#6C757D]'
                                  )}
                                >
                                  <Code size={12} /> YAML Mode
                                </button>
                              </div>

                              {yamlMode ? (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Raw Configuration (YAML)</label>
                                  <textarea
                                    value={rawYaml}
                                    onChange={e => {
                                      setRawYaml(e.target.value);
                                      try {
                                        const parsed = yaml.load(e.target.value) as any;
                                        const { type, id, displayName, ...rest } = parsed;
                                        updateActiveConfig(rest);
                                      } catch {}
                                    }}
                                    className="w-full h-72 p-3 font-mono text-xs bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-4 pr-1">
                                  {activeFields.map((field) => (
                                    <div key={field.name} className="space-y-1.5">
                                      <label className="text-[11px] font-bold text-[#6C757D] uppercase tracking-wider">{field.label}</label>
                                      <input
                                        type={field.type}
                                        value={activeConf[field.name] ?? ''}
                                        onChange={e => updateActiveConfig({
                                          [field.name]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value
                                        })}
                                        className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs focus:outline-none focus:border-[#0D6EFD] transition-colors"
                                      />
                                    </div>
                                  ))}

                                  {/* Custom fields */}
                                  {Object.keys(activeConf)
                                    .filter(k => !activeFields.some(f => f.name === k))
                                    .map(customKey => (
                                      <div key={customKey} className="space-y-1.5 relative group">
                                        <div className="flex justify-between items-center">
                                          <label className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">{customKey} (Custom)</label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextConf = { ...activeConf };
                                              delete nextConf[customKey];
                                              updateActiveConfig(nextConf);
                                            }}
                                            className="text-[9px] text-red-500 hover:text-red-700 transition-opacity hover:underline"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={activeConf[customKey] ?? ''}
                                          onChange={e => updateActiveConfig({ [customKey]: e.target.value })}
                                          className="w-full px-3 py-2 bg-[#F8F9FA] border border-amber-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors"
                                        />
                                      </div>
                                    ))}

                                  {/* Add Custom field form */}
                                  <div className="pt-3 border-t border-[#E9ECEF] mt-4 space-y-2 bg-[#F8F9FA]/50 p-3 rounded-xl border border-dashed border-[#DEE2E6]">
                                    <p className="text-[9px] font-bold text-[#6C757D] uppercase tracking-wider">Add Custom Parameter</p>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Key"
                                        value={newKey}
                                        onChange={e => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#DEE2E6] rounded-lg text-xs focus:outline-none focus:border-[#0D6EFD]"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Value"
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#DEE2E6] rounded-lg text-xs focus:outline-none focus:border-[#0D6EFD]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (newKey && !activeConf.hasOwnProperty(newKey)) {
                                            updateActiveConfig({ [newKey]: newValue });
                                            setNewKey('');
                                            setNewValue('');
                                          }
                                        }}
                                        disabled={!newKey}
                                        className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Code & Snippet */}
                            <div className="w-1/2 p-6 overflow-y-auto bg-white space-y-6">
                              <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2">
                                  <Box size={14} /> Dependency Payload
                                </label>
                                <textarea
                                  value={active.dependencies}
                                  onChange={e => updateActivePayload({ dependencies: e.target.value })}
                                  placeholder="e.g. npm install pg"
                                  className="w-full h-20 p-2.5 font-mono text-[11px] bg-[#1A1A1A] text-[#ADB5BD] border border-[#343A40] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2">
                                  <Terminal size={14} /> Environment Variables
                                </label>
                                <div className="space-y-1.5">
                                  {active.envVars.map((ev, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input
                                        value={ev.key}
                                        onChange={e => {
                                          const ne = [...active.envVars];
                                          ne[idx].key = e.target.value;
                                          updateActivePayload({ envVars: ne });
                                        }}
                                        placeholder="KEY"
                                        className="w-1/3 px-2 py-1.5 text-[11px] font-mono border border-[#DEE2E6] rounded-lg bg-[#F8F9FA] focus:outline-none focus:border-[#0D6EFD]"
                                      />
                                      <input
                                        value={ev.value}
                                        onChange={e => {
                                          const ne = [...active.envVars];
                                          ne[idx].value = e.target.value;
                                          updateActivePayload({ envVars: ne });
                                        }}
                                        placeholder="{{host}}:{{port}}"
                                        className="flex-1 px-2 py-1.5 text-[11px] font-mono border border-[#DEE2E6] rounded-lg bg-[#F8F9FA] focus:outline-none focus:border-[#0D6EFD]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateActivePayload({
                                          envVars: active.envVars.filter((_: any, i: number) => i !== idx)
                                        })}
                                        className="px-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => updateActivePayload({ envVars: [...active.envVars, { key: '', value: '' }] })}
                                    className="text-[10px] font-bold text-[#0D6EFD] hover:underline pt-1 flex items-center gap-1"
                                  >
                                    + Add Env Var Mapping
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider flex items-center gap-2">
                                  <Code size={14} /> Connection Snippet (Mustache)
                                </label>
                                <textarea
                                  value={active.snippetTemplate}
                                  onChange={e => updateActivePayload({ snippetTemplate: e.target.value })}
                                  placeholder="const client = new Client({ host: '{{host}}' })"
                                  className="w-full h-24 p-2.5 font-mono text-[11px] bg-[#F8F9FA] border border-[#DEE2E6] rounded-xl focus:outline-none focus:border-[#0D6EFD]"
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

                {/* ── STEP 3: Summary ── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-[#1A1A1A]">Review & Complete Registration</h4>
                      <p className="text-sm text-[#6C757D]">Verify the selected provider and configured SDK support before completing.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      {/* Left Column: Capability & Provider details */}
                      <div className="col-span-1 bg-[#F8F9FA] rounded-2xl p-5 border border-[#E9ECEF] space-y-4">
                        <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Capability Details</p>
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-semibold text-[#ADB5BD] block">Service ID</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">{service.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-[#ADB5BD] block">Namespace</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">{service.namespace}</span>
                          </div>
                          {selectedProvider && (
                            <>
                              <div>
                                <span className="text-[10px] font-semibold text-[#ADB5BD] block">Selected Provider</span>
                                <span className="text-sm font-bold text-[#1A1A1A]">{selectedProvider.name}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-[#ADB5BD] block">License</span>
                                <span className="text-xs font-semibold text-[#6C757D]">{selectedProvider.license_conditions || 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Middle Column: Active SDK Support */}
                      <div className="col-span-2 bg-[#F8F9FA] rounded-2xl p-5 border border-[#E9ECEF] flex flex-col h-[320px]">
                        <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-3">Active SDK Support</p>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                          {combinations.length === 0 ? (
                            <p className="text-xs text-[#ADB5BD] italic">No active SDK combinations configured.</p>
                          ) : (
                            combinations.map(combo => {
                              const comboKey = combo.id;
                              const payload = comboPayloads[comboKey] || { dependencies: '', envVars: [], snippetTemplate: '', config: {} };
                              const payloadConf = (payload.config && Object.keys(payload.config).length > 0) ? payload.config : config;
                              
                              return (
                                <div key={combo.id} className="bg-white rounded-xl p-4 border border-[#E9ECEF] space-y-3 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm capitalize text-[#1A1A1A]">{combo.language}</span>
                                    <div className="flex gap-1">
                                      <span className="text-[9px] bg-[#E7F1FF] text-[#0D6EFD] px-1.5 py-0.5 rounded font-medium">{combo.framework}</span>
                                      <span className="text-[9px] bg-[#D1E7DD] text-[#0F5132] px-1.5 py-0.5 rounded font-medium">{combo.buildTool}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#495057] bg-[#F8F9FA] p-2.5 rounded-lg font-mono">
                                    <div><span className="text-[#ADB5BD]">Host:</span> {payloadConf.host || 'N/A'}</div>
                                    <div><span className="text-[#ADB5BD]">Port:</span> {payloadConf.port || 'N/A'}</div>
                                    {payloadConf.database && <div><span className="text-[#ADB5BD]">DB:</span> {payloadConf.database}</div>}
                                    {payloadConf.username && <div><span className="text-[#ADB5BD]">User:</span> {payloadConf.username}</div>}
                                  </div>

                                  {payload.dependencies && (
                                    <div className="text-[10px] font-mono bg-[#1A1A1A] text-[#ADB5BD] p-2 rounded-lg truncate">
                                      <span className="text-[#6C757D] font-sans font-semibold">Install:</span> {payload.dependencies}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview section */}
                    <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Live Registration Metadata Preview</span>
                      </div>
                      <pre className="text-[11px] font-mono leading-relaxed text-[#ADB5BD] max-h-[160px] overflow-y-auto">
                        {JSON.stringify({
                          id: service.id,
                          displayName: service.name,
                          type: selectedType,
                          providerName: selectedProvider?.name,
                          providerLayerId: selectedLayerId,
                          config,
                          sdkSupport,
                          comboPayloads
                        }, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
        </div>

        {/* ─── Footer ──────────────────────────────────────── */}
        <div className="p-6 border-t border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA] sticky bottom-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className="px-6 py-3 flex items-center gap-2 font-bold text-[#6C757D] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#1A1A1A] transition-colors"
            >
              <ChevronLeft size={20} /> Back
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleDeleteCapability}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold transition-all"
              >
                Deregister Capability
              </button>
            )}
          </div>
          {step < STEPS.length ? (
            <button
              onClick={() => selectedType && setStep(step + 1)}
              disabled={!selectedType}
              className={cn(
                'px-8 py-3 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r',
                gradient
              )}
            >
              Next Step <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-[#198754] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#157347] transition-all shadow-lg shadow-[#198754]/20"
            >
              Complete Registration <Check size={20} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
