import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database, Cloud, Shield, Cpu, MessageSquare, Layers, Box,
  ChevronRight, ChevronDown, Search, Star, X, ExternalLink,
  CheckCircle2, RefreshCw, Info, Tag, Zap, Globe, Lock,
  Server, Code, Activity, GitBranch, Package, HardDrive,
  BarChart, Brain, Workflow, Container, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Provider {
  name: string;
  description: string;
  image_url?: string;
  version?: string;
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
}

interface SubLayer {
  name: string;
  parent?: string;
  description: string;
  image_url?: string;
  file?: string;
  providers: Provider[];
}

interface Layer {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  file?: string;
  sub_layers: SubLayer[];
  providers: Provider[];
}

interface CapabilityLayersData {
  status: string;
  version?: string;
  updated?: string;
  layers: Layer[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LAYER_ICONS: Record<string, React.ReactNode> = {
  storage: <HardDrive size={24} />,
  orchestrator: <Container size={24} />,
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

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  storage: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  orchestrator: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  database: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  messaging: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  applications: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700' },
  data: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
  'ai-ml': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  security: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
};

export const LAYER_BORDER_COLORS: Record<string, string> = {
  storage: 'border-l-amber-500',
  orchestrator: 'border-l-blue-500',
  database: 'border-l-emerald-500',
  messaging: 'border-l-purple-500',
  applications: 'border-l-sky-500',
  data: 'border-l-pink-500',
  'ai-ml': 'border-l-violet-500',
  security: 'border-l-red-500',
};

export const LAYER_BG_GRADIENTS: Record<string, string> = {
  storage: 'from-amber-500/5 to-white',
  orchestrator: 'from-blue-500/5 to-white',
  database: 'from-emerald-500/5 to-white',
  messaging: 'from-purple-500/5 to-white',
  applications: 'from-sky-500/5 to-white',
  data: 'from-pink-500/5 to-white',
  'ai-ml': 'from-violet-500/5 to-white',
  security: 'from-red-500/5 to-white',
};

export const LAYER_LINE_COLORS: Record<string, string> = {
  storage: 'bg-amber-500',
  orchestrator: 'bg-blue-500',
  database: 'bg-emerald-500',
  messaging: 'bg-purple-500',
  applications: 'bg-sky-500',
  data: 'bg-pink-500',
  'ai-ml': 'bg-violet-500',
  security: 'bg-red-500',
};

export const LAYER_HEX_COLORS: Record<string, string> = {
  storage: '#f59e0b',
  orchestrator: '#3b82f6',
  database: '#10b981',
  messaging: '#8b5cf6',
  applications: '#0ea5e9',
  data: '#ec4899',
  'ai-ml': '#8b5cf6',
  security: '#ef4444',
};

export const PROVIDER_ACTIVE_STYLES: Record<string, string> = {
  storage: 'border-amber-500 bg-amber-50/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
  orchestrator: 'border-blue-500 bg-blue-50/60 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  database: 'border-emerald-500 bg-emerald-50/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  messaging: 'border-purple-500 bg-purple-50/60 shadow-[0_0_12px_rgba(139,92,246,0.25)]',
  applications: 'border-sky-500 bg-sky-50/60 shadow-[0_0_12px_rgba(14,165,233,0.25)]',
  data: 'border-pink-500 bg-pink-50/60 shadow-[0_0_12px_rgba(236,72,153,0.25)]',
  'ai-ml': 'border-violet-500 bg-violet-50/60 shadow-[0_0_12px_rgba(139,92,246,0.25)]',
  security: 'border-red-500 bg-red-50/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
};

export const LAYER_ACTIVE_CARD_STYLES: Record<string, string> = {
  storage: 'border-amber-500/60 shadow-[0_4px_24px_rgba(245,158,11,0.12)] bg-gradient-to-r from-amber-500/[0.07] to-white',
  orchestrator: 'border-blue-500/60 shadow-[0_4px_24px_rgba(59,130,246,0.12)] bg-gradient-to-r from-blue-500/[0.07] to-white',
  database: 'border-emerald-500/60 shadow-[0_4px_24px_rgba(16,185,129,0.12)] bg-gradient-to-r from-emerald-500/[0.07] to-white',
  messaging: 'border-purple-500/60 shadow-[0_4px_24px_rgba(139,92,246,0.12)] bg-gradient-to-r from-purple-500/[0.07] to-white',
  applications: 'border-sky-500/60 shadow-[0_4px_24px_rgba(14,165,233,0.12)] bg-gradient-to-r from-sky-500/[0.07] to-white',
  data: 'border-pink-500/60 shadow-[0_4px_24px_rgba(236,72,153,0.12)] bg-gradient-to-r from-pink-500/[0.07] to-white',
  'ai-ml': 'border-violet-500/60 shadow-[0_4px_24px_rgba(139,92,246,0.12)] bg-gradient-to-r from-violet-500/[0.07] to-white',
  security: 'border-red-500/60 shadow-[0_4px_24px_rgba(239,68,68,0.12)] bg-gradient-to-r from-red-500/[0.07] to-white',
};

export const LAYER_BG_COLORS: Record<string, string> = {
  storage: 'bg-amber-500',
  orchestrator: 'bg-blue-500',
  database: 'bg-emerald-500',
  messaging: 'bg-purple-500',
  applications: 'bg-sky-500',
  data: 'bg-pink-500',
  'ai-ml': 'bg-violet-500',
  security: 'bg-red-500',
};


/**
 * Smart default-mapping: given a provider name+description, suggest a mapping
 * based on keywords. This is used to pre-select the "best fit" when a provider
 * list is shown and we want to highlight the recommended default.
 */
function computeDefaultScore(provider: Provider, query: string): number {
  const combined = `${provider.name} ${provider.description}`.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.reduce((acc, t) => acc + (combined.includes(t) ? 1 : 0), 0);
}

function getDefaultProvider(providers: Provider[]): Provider | null {
  if (!providers.length) return null;
  // Prefer open-source, non-proprietary, and most popular by heuristic:
  // score based on: open-source > enterprise > cloud-managed
  const scored = providers.map(p => {
    const lic = (p.license_conditions || '').toLowerCase();
    let score = 0;
    if (lic.includes('apache') || lic.includes('mit') || lic.includes('bsd') || lic.includes('open-source')) score += 3;
    if (lic.includes('mpl') || lic.includes('gpl')) score += 2;
    if (lic.includes('proprietary') || lic.includes('commercial') || lic.includes('enterprise')) score -= 1;
    if (lic.includes('cloud managed') || lic.includes('n/a (cloud')) score -= 2;
    // slight boost for "upstream" or "community" in name
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('upstream') || nameLower.includes('community') || nameLower.includes('open')) score += 1;
    return { provider: p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].provider;
}

function getLicenseBadge(license?: string): { label: string; color: string } {
  if (!license) return { label: 'Unknown', color: 'bg-gray-100 text-gray-600' };
  const l = license.toLowerCase();
  if (l.includes('apache') || l.includes('mit') || l.includes('bsd') || l.includes('open-source')) {
    return { label: 'Open Source', color: 'bg-emerald-100 text-emerald-700' };
  }
  if (l.includes('mpl') || l.includes('gpl')) return { label: 'Copyleft', color: 'bg-blue-100 text-blue-700' };
  if (l.includes('cloud managed') || l.includes('n/a (cloud')) return { label: 'Cloud Managed', color: 'bg-sky-100 text-sky-700' };
  if (l.includes('proprietary') || l.includes('commercial') || l.includes('enterprise') || l.includes('subscription')) {
    return { label: 'Commercial', color: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Custom', color: 'bg-gray-100 text-gray-600' };
}

// ---------------------------------------------------------------------------
// Provider Detail Panel (right side slide-over)
// ---------------------------------------------------------------------------
const ProviderDetailPanel = ({ provider, layerId, onClose }: {
  provider: Provider;
  layerId: string;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'languages' | 'resources'>('overview');
  const colors = LAYER_COLORS[layerId] || LAYER_COLORS['database'];
  const licBadge = getLicenseBadge(provider.license_conditions);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className={cn('p-6 border-b border-[#E9ECEF]', colors.bg)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', licBadge.color)}>
                {licBadge.label}
              </span>
              {provider.latest_version && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A] text-white uppercase tracking-wider">
                  v{provider.latest_version}
                </span>
              )}
            </div>
            <h3 className={cn('text-xl font-bold mt-1', colors.text)}>{provider.name}</h3>
            <p className="text-sm text-[#6C757D] mt-1 leading-relaxed">{provider.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors text-[#6C757D] hover:text-[#1A1A1A] shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Protocols & Ports quick row */}
        <div className="flex flex-wrap gap-4 mt-4">
          {provider.protocols_supported && provider.protocols_supported.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">Protocols</p>
              <div className="flex flex-wrap gap-1">
                {provider.protocols_supported.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/70 border border-white/50 text-[#495057]">{p}</span>
                ))}
              </div>
            </div>
          )}
          {provider.default_ports && provider.default_ports.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">Default Ports</p>
              <div className="flex flex-wrap gap-1">
                {provider.default_ports.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 border border-white/50 text-[#495057] font-mono">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E9ECEF] px-6 bg-white">
        {(['overview', 'languages', 'resources'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all capitalize',
              activeTab === tab
                ? `border-[#0D6EFD] text-[#0D6EFD]`
                : 'border-transparent text-[#6C757D] hover:text-[#1A1A1A]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white space-y-5">
        {activeTab === 'overview' && (
          <>
            {/* License */}
            <div>
              <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">License</p>
              <p className="text-sm text-[#495057]">{provider.license_conditions || 'Not specified'}</p>
            </div>

            {/* Dependencies */}
            {provider.dependencies && provider.dependencies.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Dependencies</p>
                <ul className="space-y-1">
                  {provider.dependencies.map((dep, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#495057]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#ADB5BD] shrink-0" />
                      {dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* HA Recommendation */}
            {provider.ha_recommendation && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Activity size={14} />
                  <p className="text-[10px] font-bold uppercase tracking-wider">HA Recommendation</p>
                </div>
                <p className="text-sm text-blue-800">{provider.ha_recommendation}</p>
              </div>
            )}

            {/* Links & Resources */}
            {(provider.website_url || provider.repo_url || provider.documentation_url) && (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                <p className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">Links & Resources</p>
                <div className="flex flex-col gap-2">
                  {provider.website_url && (
                    <a
                      href={provider.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold"
                    >
                      <Globe size={13} /> Official Website <ExternalLink size={10} />
                    </a>
                  )}
                  {provider.repo_url && (
                    <a
                      href={provider.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold"
                    >
                      <GitBranch size={13} /> Repository <ExternalLink size={10} />
                    </a>
                  )}
                  {provider.documentation_url && (
                    <a
                      href={provider.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#0D6EFD] hover:underline font-semibold"
                    >
                      <Info size={13} /> Documentation <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'languages' && (
          <>
            {provider.languages && Object.keys(provider.languages).length > 0 ? (
              Object.entries(provider.languages).map(([lang, info]) => (
                <div key={lang} className="border border-[#E9ECEF] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#F8F9FA] border-b border-[#E9ECEF]">
                    <Code size={14} className="text-[#0D6EFD]" />
                    <span className="text-sm font-bold capitalize text-[#1A1A1A]">{lang}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {info.frameworks && info.frameworks.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1.5">Frameworks</p>
                        <div className="flex flex-wrap gap-1.5">
                          {info.frameworks.map(fw => (
                            <span key={fw} className="px-2.5 py-1 bg-[#E7F1FF] text-[#0D6EFD] rounded-lg text-xs font-medium border border-[#B6D4FE]">{fw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {info.sample_code && (
                      <div>
                        <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">Sample Code</p>
                        <p className="text-[11px] font-mono text-[#6C757D] bg-[#F8F9FA] px-3 py-2 rounded-lg border border-[#E9ECEF] truncate">{info.sample_code}</p>
                      </div>
                    )}
                    {info.config_template && (
                      <div>
                        <p className="text-[9px] font-bold text-[#ADB5BD] uppercase tracking-wider mb-1">Config Template</p>
                        <p className="text-[11px] font-mono text-[#6C757D] bg-[#F8F9FA] px-3 py-2 rounded-lg border border-[#E9ECEF] truncate">{info.config_template}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-[#6C757D]">
                <Code size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No language integrations defined</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'resources' && (
          <>
            {provider.resources ? (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'vCPU', value: provider.resources.vcpu, icon: <Cpu size={16} /> },
                  { label: 'Memory', value: provider.resources.memory, icon: <Server size={16} /> },
                  { label: 'Disk', value: provider.resources.disk, icon: <HardDrive size={16} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className={cn('rounded-xl p-4 border text-center', colors.bg, colors.border)}>
                    <div className={cn('flex justify-center mb-2', colors.text)}>{icon}</div>
                    <p className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">{label}</p>
                    <p className={cn('text-lg font-bold mt-1', colors.text)}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[#6C757D]">
                <Server size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No resource requirements defined</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Helpers & Brand Logo Map
// ---------------------------------------------------------------------------
export function getProviderLogo(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n.includes('mysql')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg';
  if (n.includes('postgresql') || n.includes('postgres')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg';
  if (n.includes('mongodb') || n.includes('mongo')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg';
  if (n.includes('redis')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg';
  if (n.includes('kafka')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/apachekafka/apachekafka-original.svg';
  if (n.includes('kubeflow')) return 'https://raw.githubusercontent.com/kubeflow/kubeflow/master/logo/Kubeflow-Logo-Color.svg';
  if (n.includes('nvidia') || n.includes('gpu')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/nvidia.svg';
  if (n.includes('argocd') || n.includes('argo')) return 'https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/logo.png';
  if (n.includes('tekton')) return 'https://raw.githubusercontent.com/tektoncd/community/main/images/logo/tekton-icon-color.svg';
  if (n.includes('gitlab')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg';
  if (n.includes('jenkins')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg';
  if (n.includes('istio')) return 'https://raw.githubusercontent.com/istio/istio/master/logo/istio-logo-blue.svg';
  if (n.includes('linkerd')) return 'https://raw.githubusercontent.com/linkerd/linkerd2/main/brand/linkerd_logo.svg';
  if (n.includes('vault')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/hashicorp.svg';
  if (n.includes('keycloak')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/keycloak.svg';
  if (n.includes('nginx')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nginx/nginx-original.svg';
  if (n.includes('traefik')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/traefik.svg';
  if (n.includes('grafana')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/grafana/grafana-original.svg';
  if (n.includes('prometheus')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prometheus/prometheus-original.svg';
  if (n.includes('elastic')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/elasticsearch/elasticsearch-original.svg';
  if (n.includes('kubernetes') || n.includes('k8s')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-original.svg';
  if (n.includes('datadog')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/datadog.svg';
  if (n.includes('calico')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/cncf.svg';
  if (n.includes('fluentbit') || n.includes('fluentd')) return 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/fluentd.svg';
  return '';
}

export const ThreeDHexagon = ({ 
  label, 
  layerId, 
  isSelected 
}: { 
  label: string; 
  layerId: string; 
  isSelected?: boolean;
}) => {
  const getColors = () => {
    switch (layerId) {
      case 'storage': return { top: '#f59e0b', bottom: '#d97706', shadow: '#b45309' };
      case 'orchestrator': return { top: '#3b82f6', bottom: '#2563eb', shadow: '#1d4ed8' };
      case 'database': return { top: '#10b981', bottom: '#059669', shadow: '#047857' };
      case 'messaging': return { top: '#8b5cf6', bottom: '#7c3aed', shadow: '#6d28d9' };
      case 'applications': return { top: '#0ea5e9', bottom: '#0284c7', shadow: '#0369a1' };
      case 'data': return { top: '#ec4899', bottom: '#db2777', shadow: '#be185d' };
      case 'ai-ml': return { top: '#8b5cf6', bottom: '#6d28d9', shadow: '#5b21b6' };
      case 'security': return { top: '#ef4444', bottom: '#dc2626', shadow: '#b91c1c' };
      default: return { top: '#10b981', bottom: '#059669', shadow: '#047857' };
    }
  };
  const c = getColors();

  return (
    <svg width="100%" height="100%" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${layerId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.top} />
          <stop offset="100%" stopColor={c.bottom} />
        </linearGradient>
      </defs>
      
      {/* 3D Depth Shadow under the hexagon */}
      <path 
        d="M 10 40 L 45 75 L 135 75 L 170 40 L 170 48 L 135 83 L 45 83 L 10 48 Z" 
        fill={c.shadow} 
      />
      
      {/* Glowing outer boundary when selected */}
      {isSelected && (
        <motion.path 
          d="M 45 10 L 135 10 L 170 40 L 135 70 L 45 70 L 10 40 Z" 
          fill="none"
          stroke={c.top}
          strokeWidth="6"
          opacity="0.5"
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          style={{ transformOrigin: '90px 40px' }}
        />
      )}
      
      {/* Hexagon Top Face */}
      <path 
        d="M 45 10 L 135 10 L 170 40 L 135 70 L 45 70 L 10 40 Z" 
        fill={`url(#grad-${layerId})`}
        stroke={isSelected ? "#FFF" : "white"}
        strokeWidth={isSelected ? "2.5" : "1.5"}
        className={cn(isSelected ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "")}
      />
      
      {/* Text label overlay */}
      <text 
        x="90" 
        y="45" 
        textAnchor="middle" 
        fill="white" 
        fontSize="9" 
        fontWeight={isSelected ? "900" : "800"} 
        letterSpacing="0.08em"
        style={{ textTransform: 'uppercase' }}
        className={cn(isSelected ? "drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" : "")}
      >
        {label}
      </text>
    </svg>
  );
};
 
export const ProviderItem = ({ 
  prov, 
  layerId, 
  subName,
  isSelected, 
  onClick, 
  onViewDetails 
}: { 
  prov: Provider; 
  layerId: string; 
  subName: string;
  isSelected: boolean; 
  onClick: () => void; 
  onViewDetails?: () => void; 
}) => {
  const logo = (prov.image_url && prov.image_url.startsWith('http')) ? prov.image_url : getProviderLogo(prov.name);
  const activeColorStyle = PROVIDER_ACTIVE_STYLES[layerId] || 'border-[#0D6EFD] bg-blue-50/50 shadow-[#0D6EFD]/20 shadow-md';
  const badgeBg = LAYER_BG_COLORS[layerId] || 'bg-[#0D6EFD]';
  const hoverGlow = `hover:shadow-[0_0_12px_${(LAYER_HEX_COLORS[layerId] || '#0D6EFD')}40]`;
  
  return (
    <div className="relative group/item flex flex-col items-center select-none shrink-0">
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-14 h-14 rounded-2xl border-2 flex items-center justify-center bg-white transition-all relative",
          hoverGlow,
          isSelected 
            ? activeColorStyle 
            : "border-[#E9ECEF] hover:border-[#DEE2E6]"
        )}
      >
        {logo ? (
          <img src={logo} className="w-8 h-8 object-contain" alt={prov.name} />
        ) : (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-[#F8F9FA]", isSelected ? (LAYER_COLORS[layerId]?.text || 'text-[#0D6EFD]') : "text-[#ADB5BD]")}>
            <Box size={16} />
          </div>
        )}
        
        {/* Selected check badge */}
        {isSelected && (
          <div className={cn("absolute -top-1.5 -right-1.5 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-30", badgeBg)}>
            <Check size={9} strokeWidth={4} />
          </div>
        )}
 
        {/* Quick detail info button on hover */}
        {onViewDetails && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="absolute -bottom-1.5 opacity-0 group-hover/item:opacity-100 bg-white border border-[#DEE2E6] hover:border-[#0D6EFD] hover:text-[#0D6EFD] p-1 rounded-full shadow-sm transition-opacity z-20"
            title="View Details"
          >
            <Info size={10} />
          </button>
        )}
      </motion.button>
      <span className="text-[10px] font-bold text-[#495057] mt-1.5 text-center max-w-[80px] truncate block" title={prov.name}>
        {prov.name}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const CapabilityLayersBrowser = () => {
  const [data, setData] = React.useState<CapabilityLayersData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [filterLayer, setFilterLayer] = React.useState<string>('all');
  const [selections, setSelections] = React.useState<Record<string, string>>({});
  const [detailProvider, setDetailProvider] = React.useState<{ provider: Provider; layerId: string } | null>(null);
  const [collapsedLayers, setCollapsedLayers] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (layerId: string) => {
    setCollapsedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/registry/capabilities/layers');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
        // Collapse all layers by default
        const initialCollapsed: Record<string, boolean> = {};
        json.layers.forEach((l: any) => {
          initialCollapsed[l.id] = true;
        });
        setCollapsedLayers(initialCollapsed);
      } else {
        setError(json.message || 'Failed to load capability layers');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSelect = (subName: string, providerName: string) => {
    setSelections(prev => {
      if (prev[subName] === providerName) {
        // deselect
        const next = { ...prev };
        delete next[subName];
        return next;
      }
      return { ...prev, [subName]: providerName };
    });
  };

  // Filter layers by search and layer filter
  const filteredLayers = React.useMemo(() => {
    if (!data) return [];
    let layers = data.layers;

    if (filterLayer !== 'all') {
      layers = layers.filter(l => l.id === filterLayer);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      layers = layers.map(layer => {
        // Filter sub-layers
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
        // Filter direct providers
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

    return layers;
  }, [data, search, filterLayer]);

  const totalSelections = Object.keys(selections).length;
  const totalProviders = data?.layers.reduce((sum, l) =>
    sum + l.providers.length + l.sub_layers.reduce((s2, sl) => s2 + sl.providers.length, 0), 0) ?? 0;

  return (
    <div className="flex gap-0 h-full min-h-[600px]">
      {/* Main panel */}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all', detailProvider ? 'mr-4' : '')}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search capability providers..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E9ECEF] rounded-xl focus:outline-none focus:border-[#0D6EFD] transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] hover:text-[#1A1A1A]">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#6C757D] bg-white border border-[#E9ECEF] rounded-xl hover:border-[#DEE2E6] transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Stats + Layer filter */}
          <div className="flex items-center gap-3 flex-wrap">
            {data && (
              <div className="flex items-center gap-3 text-xs text-[#6C757D]">
                <span className="flex items-center gap-1">
                  <Layers size={12} /> {data.layers.length} Layers
                </span>
                <span>·</span>
                <span>{totalProviders} Providers</span>
                {data.updated && (
                  <>
                    <span>·</span>
                    <span>Updated {data.updated}</span>
                  </>
                )}
                {totalSelections > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> {totalSelections} selected
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Layer filter pills */}
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <button
                onClick={() => setFilterLayer('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                  filterLayer === 'all'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#6C757D] border-[#E9ECEF] hover:border-[#DEE2E6]'
                )}
              >
                All
              </button>
              {data?.layers.map(layer => {
                const colors = LAYER_COLORS[layer.id] || LAYER_COLORS['database'];
                return (
                  <button
                    key={layer.id}
                    onClick={() => setFilterLayer(filterLayer === layer.id ? 'all' : layer.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                      filterLayer === layer.id
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-white text-[#6C757D] border-[#E9ECEF] hover:border-[#DEE2E6]'
                    )}
                  >
                    {layer.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <RefreshCw size={32} className="animate-spin mx-auto text-[#0D6EFD]" />
              <p className="text-sm text-[#6C757D]">Loading capability layers from YAML…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto">
                <X size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-bold text-[#1A1A1A]">Failed to load capability layers</p>
              <p className="text-xs text-[#6C757D]">{error}</p>
              <button onClick={loadData} className="px-4 py-2 text-sm font-bold text-white bg-[#0D6EFD] rounded-lg hover:bg-[#0B5ED7] transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredLayers.length > 0 && (
          <div className="space-y-6 pb-20">
            {filteredLayers.map(layer => {
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
              
              // Determine if there is a selected provider in this layer
              const selection = (() => {
                if (hasSubLayers) {
                  for (const sub of layer.sub_layers) {
                    if (selections[sub.name]) {
                      return { subName: sub.name, providerName: selections[sub.name] };
                    }
                  }
                } else {
                  if (selections[layer.name]) {
                    return { subName: layer.name, providerName: selections[layer.name] };
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
                        <span className={cn("text-[#495057]", (LAYER_COLORS[layer.id] || LAYER_COLORS['database']).text)}>
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
                                  {sub.providers.map(prov => (
                                    <ProviderItem
                                      key={prov.name}
                                      prov={prov}
                                      layerId={layer.id}
                                      subName={sub.name}
                                      isSelected={selections[sub.name] === prov.name}
                                      onClick={() => handleSelect(sub.name, prov.name)}
                                      onViewDetails={() => setDetailProvider({ provider: prov, layerId: layer.id })}
                                    />
                                  ))}
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
                                {layer.providers.map(prov => (
                                  <ProviderItem
                                    key={prov.name}
                                    prov={prov}
                                    layerId={layer.id}
                                    subName={layer.name}
                                    isSelected={selections[layer.name] === prov.name}
                                    onClick={() => handleSelect(layer.name, prov.name)}
                                    onViewDetails={() => setDetailProvider({ provider: prov, layerId: layer.id })}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Slide Panel */}
      <AnimatePresence>
        {detailProvider && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 rounded-2xl border border-[#E9ECEF] overflow-hidden shadow-lg bg-white flex flex-col relative z-30"
            style={{ minHeight: 500 }}
          >
            <ProviderDetailPanel
              provider={detailProvider.provider}
              layerId={detailProvider.layerId}
              onClose={() => setDetailProvider(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
