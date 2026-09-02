import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  Layers, 
  Plus, 
  Trash2, 
  Code, 
  AppWindow, 
  Server, 
  Cpu, 
  Download, 
  Check, 
  Settings2, 
  AlertCircle, 
  Network, 
  ShieldCheck, 
  RefreshCw, 
  Database,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Hash,
  Upload,
  History,
  ChevronRight,
  Code2,
  Sliders,
  Play,
  CheckCircle2,
  Package,
  Globe,
  LayoutGrid,
  Eye,
  GitCommit
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Themes for visual hexagons
const THEMES = [
  { hex: 'bg-[#0D6EFD]', border: 'border-[#DEE2E6]', conn: 'bg-[#0D6EFD]' },
  { hex: 'bg-[#6F42C1]', border: 'border-[#DEE2E6]', conn: 'bg-[#6F42C1]' },
  { hex: 'bg-[#198754]', border: 'border-[#DEE2E6]', conn: 'bg-[#198754]' },
  { hex: 'bg-[#FD7E14]', border: 'border-[#DEE2E6]', conn: 'bg-[#FD7E14]' },
  { hex: 'bg-[#DC3545]', border: 'border-[#DEE2E6]', conn: 'bg-[#DC3545]' },
];

interface EnvVar {
  key: string;
  value: string;
}

interface CapabilityInstance {
  id: string;
  displayName: string;
  config: Record<string, any>;
}

interface Application {
  name: string;
  language: string;
  framework: string;
  buildTool: string;
  port: number;
  image: string;
  envVars: EnvVar[];
  capabilities: CapabilityInstance[];
  packageName?: string;
  groupId?: string;
  artifactId?: string;
  nodeEntrypoint?: string;
  goModuleName?: string;
  pythonVersion?: string;
}

interface Project {
  name: string;
  description: string;
  namespaces: string[];
}

interface Component {
  id: string;
  kind: 'workload' | 'infra' | 'capability';
  namespace: string;
  category: string;
  mandatory: boolean;
  runtimeClass: string;
  properties?: Record<string, any>;
  resources?: {
    original: { cpu: string; memory: string; replicas: number };
    sdk: { cpu: string; memory: string; replicas: number };
  };
  sdkConfig?: {
    language: string;
    framework: string;
    buildTool: string;
    capabilities: CapabilityInstance[];
    envVars: EnvVar[];
    port: number;
    image: string;
    packageName?: string;
    groupId?: string;
    artifactId?: string;
    nodeEntrypoint?: string;
    goModuleName?: string;
    pythonVersion?: string;
  };
}

interface DependencyEdge {
  from: string;
  to: string;
}

export const CreateApplicationView = () => {
  // Navigation Tabs: 'manual' (Manual Project Designer) or 'visual' (Visual Cluster Discovery)
  const [activeTab, setActiveTab] = useState<'manual' | 'visual'>(() => {
    return (localStorage.getItem('kubesdksim_createapp_tab') as any) || 'manual';
  });

  // --- MANUAL MODE STATE ---
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_app_projects');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { name: 'E-Commerce Platform', description: 'Core microservices for shop and cart.', namespaces: ['gateway', 'services', 'database'] },
      { name: 'Analytics Hub', description: 'Real-time data ingestion pipelines.', namespaces: ['ingestion', 'processing'] }
    ];
  });

  const [activeProjectName, setActiveProjectName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_app_active_project');
      if (saved) return saved;
    } catch {}
    return 'E-Commerce Platform';
  });

  const [activeNamespace, setActiveNamespace] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_app_active_ns');
      if (saved) return saved;
    } catch {}
    return 'services';
  });

  const [manualApps, setManualApps] = useState<Record<string, Record<string, Application[]>>>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_app_instances');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'E-Commerce Platform': {
        'services': [
          {
            name: 'auth-service',
            language: 'python',
            framework: 'fastapi',
            buildTool: 'pip',
            port: 8000,
            image: 'python:3.9-slim',
            envVars: [{ key: 'LOG_LEVEL', value: 'DEBUG' }],
            capabilities: []
          },
          {
            name: 'order-processor',
            language: 'java',
            framework: 'spring-boot',
            buildTool: 'maven',
            port: 8080,
            image: 'openjdk:17-jdk-slim',
            envVars: [{ key: 'RETRY_LIMIT', value: '3' }],
            capabilities: [
              {
                id: 'postgres',
                displayName: 'PostgreSQL',
                config: { host: 'postgres.platform.svc.cluster.local', port: 5432, database: 'order_db', username: 'order_user', password: 'password123' }
              }
            ]
          }
        ]
      }
    };
  });

  // Unified Wizard modal states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isManualWizard, setIsManualWizard] = useState(false);
  const [editingManualAppIdx, setEditingManualAppIdx] = useState<number | null>(null);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // --- VISUAL IMPORT MODE STATE ---
  const [sourceFile, setSourceFile] = useState<string | null>(() => {
    return localStorage.getItem('kubesdksim_createapp_source') || null;
  });

  const [components, setComponents] = useState<Component[]>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_createapp_components');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [dependencyGraph, setDependencyGraph] = useState<{ edges: DependencyEdge[] }>(() => {
    try {
      const saved = localStorage.getItem('kubesdksim_createapp_depgraph');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { edges: [] };
  });

  const [historyRuns, setHistoryRuns] = useState<any[]>([]);
  const [registryCaps, setRegistryCaps] = useState<any[]>([]);
  const [languagesConfig, setLanguagesConfig] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Wizard Overlay for components (unified for manual and visual workloads)
  const [activeWorkload, setActiveWorkload] = useState<Component | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardForm, setWizardForm] = useState<{
    name: string;
    language: string;
    framework: string;
    buildTool: string;
    port: number;
    image: string;
    envVars: EnvVar[];
    capabilities: CapabilityInstance[];
    packageName: string;
    groupId: string;
    artifactId: string;
    nodeEntrypoint: string;
    goModuleName: string;
    pythonVersion: string;
  }>({
    name: '',
    language: '',
    framework: '',
    buildTool: '',
    port: 8080,
    image: '',
    envVars: [],
    capabilities: [],
    packageName: '',
    groupId: '',
    artifactId: '',
    nodeEntrypoint: '',
    goModuleName: '',
    pythonVersion: ''
  });

  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backend variables on mount
  useEffect(() => {
    fetch('/api/registry')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setRegistryCaps(data.registry || []);
      });

    fetch('/api/registry/languages')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setLanguagesConfig(data.languages || {});
      });

    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setHistoryRuns(data.history || []);
      });
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('kubesdksim_createapp_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_app_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_app_active_project', activeProjectName);
  }, [activeProjectName]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_app_active_ns', activeNamespace);
  }, [activeNamespace]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_app_instances', JSON.stringify(manualApps));
  }, [manualApps]);

  useEffect(() => {
    if (sourceFile) {
      localStorage.setItem('kubesdksim_createapp_source', sourceFile);
    } else {
      localStorage.removeItem('kubesdksim_createapp_source');
    }
  }, [sourceFile]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_createapp_components', JSON.stringify(components));
  }, [components]);

  useEffect(() => {
    localStorage.setItem('kubesdksim_createapp_depgraph', JSON.stringify(dependencyGraph));
  }, [dependencyGraph]);

  // Derived active project detail
  const activeProject = projects.find(p => p.name === activeProjectName) || projects[0];
  const activeAppsList = (manualApps[activeProjectName] && manualApps[activeProjectName][activeNamespace]) || [];

  // Derived namespaces from imported components list sorted topologically from top (dependencies) to bottom (dependents)
  const discoveredNamespaces = React.useMemo(() => {
    const nsSet = new Set<string>();
    components.forEach(c => {
      if (c.category === 'namespace') {
        nsSet.add(c.id);
      } else if (c.namespace && c.namespace !== 'cluster') {
        nsSet.add(c.namespace);
      }
    });
    const allNamespaces = Array.from(nsSet);

    // Map component ID to its namespace
    const compToNs: Record<string, string> = {};
    components.forEach(c => {
      if (c.namespace && c.namespace !== 'cluster') {
        compToNs[c.id] = c.namespace;
      }
    });

    // Build adjacency list for namespaces
    // A directed edge from U to V means U is a dependency of V, so U should come before V.
    const adj: Record<string, Set<string>> = {};
    allNamespaces.forEach(ns => {
      adj[ns] = new Set<string>();
    });

    const edges = dependencyGraph?.edges || [];
    edges.forEach(edge => {
      const fromNs = compToNs[edge.from];
      const toNs = compToNs[edge.to];
      if (fromNs && toNs && fromNs !== toNs) {
        adj[toNs].add(fromNs);
      }
    });

    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (ns: string) => {
      if (temp.has(ns)) return;
      if (!visited.has(ns)) {
        temp.add(ns);
        const neighbors = adj[ns] || new Set();
        neighbors.forEach(neighbor => {
          visit(neighbor);
        });
        temp.delete(ns);
        visited.add(ns);
        order.push(ns);
      }
    };

    allNamespaces.sort().forEach(ns => {
      if (!visited.has(ns)) {
        visit(ns);
      }
    });

    return order.reverse();
  }, [components, dependencyGraph]);

  // --- MANUAL MODE HANDLERS ---
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const name = newProjectName.trim();
    if (projects.some(p => p.name === name)) {
      alert("Project already exists.");
      return;
    }
    const newProj: Project = {
      name,
      description: newProjectDesc.trim() || 'No description provided.',
      namespaces: ['default']
    };
    setProjects(prev => [...prev, newProj]);
    setActiveProjectName(name);
    setActiveNamespace('default');
    setIsNewProjectModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const handleDeleteProject = (projName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert("You must keep at least one project.");
      return;
    }
    if (confirm(`Delete project "${projName}" and all associated apps?`)) {
      const updated = projects.filter(p => p.name !== projName);
      setProjects(updated);
      setActiveProjectName(updated[0].name);
      setActiveNamespace(updated[0].namespaces[0] || 'default');

      const appsUpdated = { ...manualApps };
      delete appsUpdated[projName];
      setManualApps(appsUpdated);
    }
  };

  const handleAddNamespace = () => {
    const ns = prompt("Enter Namespace Name:");
    if (!ns || !ns.trim()) return;
    const nsName = ns.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!nsName) return;

    if (activeProject.namespaces.includes(nsName)) {
      alert("Namespace already exists.");
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.name === activeProjectName) {
        return { ...p, namespaces: [...p.namespaces, nsName] };
      }
      return p;
    }));
    setActiveNamespace(nsName);
  };

  const handleDeleteNamespace = (ns: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeProject.namespaces.length <= 1) {
      alert("A project must have at least one namespace.");
      return;
    }
    if (confirm(`Delete namespace "${ns}" and all apps inside it?`)) {
      setProjects(prev => prev.map(p => {
        if (p.name === activeProjectName) {
          return { ...p, namespaces: p.namespaces.filter(n => n !== ns) };
        }
        return p;
      }));

      if (activeNamespace === ns) {
        const remaining = activeProject.namespaces.filter(n => n !== ns);
        setActiveNamespace(remaining[0]);
      }

      if (manualApps[activeProjectName]) {
        const updatedApps = { ...manualApps };
        delete updatedApps[activeProjectName][ns];
        setManualApps(updatedApps);
      }
    }
  };

  const getLanguageDefaults = (lang: string, appName: string) => {
    const sanitizedName = appName.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'app';
    return {
      packageName: `com.example.${sanitizedName.replace(/-/g, '')}`,
      groupId: 'com.example',
      artifactId: sanitizedName,
      nodeEntrypoint: 'index.js',
      goModuleName: sanitizedName,
      pythonVersion: '3.9'
    };
  };

  const openManualWizard = (idx: number | null) => {
    setIsManualWizard(true);
    setEditingManualAppIdx(idx);
    setActiveWorkload(null);
    setWizardStep(1);

    const defaultLang = Object.keys(languagesConfig)[0] || 'python';
    const langOpts = languagesConfig[defaultLang] || { frameworks: [], 'build-tools': [] };

    if (idx !== null && activeAppsList[idx]) {
      const app = activeAppsList[idx];
      const defaults = getLanguageDefaults(app.language, app.name);
      setWizardForm({
        name: app.name,
        language: app.language,
        framework: app.framework,
        buildTool: app.buildTool,
        port: app.port,
        image: app.image,
        envVars: app.envVars || [],
        capabilities: app.capabilities || [],
        packageName: app.packageName || defaults.packageName,
        groupId: app.groupId || defaults.groupId,
        artifactId: app.artifactId || defaults.artifactId,
        nodeEntrypoint: app.nodeEntrypoint || defaults.nodeEntrypoint,
        goModuleName: app.goModuleName || defaults.goModuleName,
        pythonVersion: app.pythonVersion || defaults.pythonVersion,
      });
    } else {
      const initialLang = defaultLang;
      const initialDefaults = getLanguageDefaults(initialLang, 'new-app');
      setWizardForm({
        name: '',
        language: initialLang,
        framework: langOpts.frameworks?.[0] || '',
        buildTool: langOpts['build-tools']?.[0] || '',
        port: 8080,
        image: initialLang === 'java' ? 'openjdk:17-jdk-slim' : 
               initialLang === 'python' ? 'python:3.9-slim' : 
               initialLang === 'nodejs' ? 'node:18-alpine' : 'golang:1.20-alpine',
        envVars: [],
        capabilities: [],
        ...initialDefaults
      });
    }
    setIsWizardOpen(true);
  };

  const handleSaveManualApp = () => {
    if (!wizardForm.name.trim()) {
      alert("App Name is required.");
      return;
    }
    const sanitized = wizardForm.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    const isDuplicate = activeAppsList.some((app, idx) => app.name === sanitized && idx !== editingManualAppIdx);
    if (isDuplicate) {
      alert("An application with this name already exists in this namespace.");
      return;
    }

    const finalApp = {
      name: sanitized,
      language: wizardForm.language,
      framework: wizardForm.framework,
      buildTool: wizardForm.buildTool,
      port: wizardForm.port,
      image: wizardForm.image,
      envVars: wizardForm.envVars,
      capabilities: wizardForm.capabilities,
      packageName: wizardForm.packageName,
      groupId: wizardForm.groupId,
      artifactId: wizardForm.artifactId,
      nodeEntrypoint: wizardForm.nodeEntrypoint,
      goModuleName: wizardForm.goModuleName,
      pythonVersion: wizardForm.pythonVersion
    };
    const projectApps = manualApps[activeProjectName] || {};
    const namespaceApps = projectApps[activeNamespace] || [];

    const updatedNamespaceApps = [...namespaceApps];
    if (editingManualAppIdx !== null) {
      updatedNamespaceApps[editingManualAppIdx] = finalApp;
    } else {
      updatedNamespaceApps.push(finalApp);
    }

    setManualApps({
      ...manualApps,
      [activeProjectName]: {
        ...projectApps,
        [activeNamespace]: updatedNamespaceApps
      }
    });
    setIsWizardOpen(false);
  };

  const handleDeleteManualApp = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this application?")) {
      const projectApps = manualApps[activeProjectName] || {};
      const namespaceApps = projectApps[activeNamespace] || [];
      const updatedNamespaceApps = namespaceApps.filter((_, i) => i !== idx);

      setManualApps({
        ...manualApps,
        [activeProjectName]: {
          ...projectApps,
          [activeNamespace]: updatedNamespaceApps
        }
      });
      if (isWizardOpen && editingManualAppIdx === idx) {
        setIsWizardOpen(false);
      }
    }
  };

  const handleDownloadManualScaffold = async (appInstance: Application) => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/stacks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: activeProjectName,
          namespace: activeNamespace,
          app: appInstance
        })
      });

      if (!response.ok) throw new Error("Scaffold generation failed on server");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${appInstance.name}-scaffold.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      console.error(err);
      alert("Scaffold error: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- VISUAL DISCOVERY MODE HANDLERS ---
  const handleSelectHistoryFile = async (filename: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history/${filename}`);
      const data = await res.json();
      if (data.status === 'success') {
        await parseClusterYaml(data.yaml, filename);
      }
    } catch (e) {
      console.error(e);
      alert("Error loading file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const yamlContent = event.target?.result as string;
      await parseClusterYaml(yamlContent, file.name);
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const parseClusterYaml = async (yamlContent: string, filename: string) => {
    try {
      const res = await fetch('/api/parse-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: yamlContent })
      });
      const data = await res.json();
      if (data.components) {
        setComponents(data.components);
        setDependencyGraph(data.dependencyGraph || { edges: [] });
        setSourceFile(filename);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse the cluster spec file.");
    }
  };

  const handleResetSource = () => {
    setSourceFile(null);
    setComponents([]);
    setDependencyGraph({ edges: [] });
    localStorage.removeItem('kubesdksim_createapp_source');
    localStorage.removeItem('kubesdksim_createapp_components');
    localStorage.removeItem('kubesdksim_createapp_depgraph');
  };

  const openVisualWizard = (comp: Component) => {
    setIsManualWizard(false);
    setEditingManualAppIdx(null);
    setActiveWorkload(comp);
    setWizardStep(1);

    const defaultLang = Object.keys(languagesConfig)[0] || 'python';
    const langOpts = languagesConfig[defaultLang] || { frameworks: [], 'build-tools': [] };
    const defaults = getLanguageDefaults(comp.sdkConfig?.language || defaultLang, comp.id);

    if (comp.sdkConfig) {
      setWizardForm({
        name: comp.id,
        language: comp.sdkConfig.language,
        framework: comp.sdkConfig.framework,
        buildTool: comp.sdkConfig.buildTool,
        port: comp.sdkConfig.port,
        image: comp.sdkConfig.image,
        envVars: comp.sdkConfig.envVars || [],
        capabilities: comp.sdkConfig.capabilities || [],
        packageName: comp.sdkConfig.packageName || defaults.packageName,
        groupId: comp.sdkConfig.groupId || defaults.groupId,
        artifactId: comp.sdkConfig.artifactId || defaults.artifactId,
        nodeEntrypoint: comp.sdkConfig.nodeEntrypoint || defaults.nodeEntrypoint,
        goModuleName: comp.sdkConfig.goModuleName || defaults.goModuleName,
        pythonVersion: comp.sdkConfig.pythonVersion || defaults.pythonVersion,
      });
    } else {
      const initialLang = defaultLang;
      const initialDefaults = getLanguageDefaults(initialLang, comp.id);
      setWizardForm({
        name: comp.id,
        language: initialLang,
        framework: langOpts.frameworks?.[0] || '',
        buildTool: langOpts['build-tools']?.[0] || '',
        port: comp.properties?.ports?.[0]?.containerPort || 8080,
        image: comp.properties?.image || (initialLang === 'java' ? 'openjdk:17-jdk-slim' : 
                                           initialLang === 'python' ? 'python:3.9-slim' : 
                                           initialLang === 'nodejs' ? 'node:18-alpine' : 'golang:1.20-alpine'),
        envVars: comp.properties?.env?.map((e: any) => ({ key: e.name, value: e.value })) || [],
        capabilities: [],
        ...initialDefaults
      });
    }
    setIsWizardOpen(true);
  };

  const handleWizardLanguageChange = (lang: string, appName: string) => {
    const opts = languagesConfig[lang] || { frameworks: [], 'build-tools': [] };
    const defaults = getLanguageDefaults(lang, appName);
    setWizardForm(prev => ({
      ...prev,
      language: lang,
      framework: opts.frameworks?.[0] || '',
      buildTool: opts['build-tools']?.[0] || '',
      image: lang === 'java' ? 'openjdk:17-jdk-slim' : 
             lang === 'python' ? 'python:3.9-slim' : 
             lang === 'nodejs' ? 'node:18-alpine' : 'golang:1.20-alpine',
      ...defaults
    }));
  };

  const handleAddWizardEnv = () => {
    if (!newEnvKey.trim()) return;
    if (wizardForm.envVars.some(ev => ev.key === newEnvKey.trim())) {
      alert("Key exists.");
      return;
    }
    setWizardForm(prev => ({
      ...prev,
      envVars: [...prev.envVars, { key: newEnvKey.trim().toUpperCase(), value: newEnvVal }]
    }));
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleRemoveWizardEnv = (key: string) => {
    setWizardForm(prev => ({
      ...prev,
      envVars: prev.envVars.filter(ev => ev.key !== key)
    }));
  };

  const handleWizardToggleCapability = (cap: any) => {
    const isAttached = wizardForm.capabilities.some(c => c.id === cap.id);
    if (isAttached) {
      setWizardForm(prev => ({
        ...prev,
        capabilities: prev.capabilities.filter(c => c.id !== cap.id)
      }));
    } else {
      const defaultConf: Record<string, any> = {};
      if (cap.config) {
        Object.entries(cap.config).forEach(([k, v]) => {
          defaultConf[k] = v;
        });
      }
      setWizardForm(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, { id: cap.id, displayName: cap.displayName || cap.id, config: defaultConf }]
      }));
    }
  };

  const handleWizardCapabilityConfigChange = (capId: string, fieldKey: string, val: any) => {
    setWizardForm(prev => {
      const caps = prev.capabilities.map(c => {
        if (c.id === capId) {
          return { ...c, config: { ...c.config, [fieldKey]: val } };
        }
        return c;
      });
      return { ...prev, capabilities: caps };
    });
  };

  const handleSaveWizardConfig = () => {
    if (!activeWorkload) return;
    setComponents(prev => prev.map(c => {
      if (c.id === activeWorkload.id && c.namespace === activeWorkload.namespace) {
        return { ...c, sdkConfig: { ...wizardForm } };
      }
      return c;
    }));
    setIsWizardOpen(false);
  };

  const handleDownloadWizardScaffold = async () => {
    setIsDownloading(true);
    try {
      const projName = isManualWizard 
        ? activeProjectName 
        : (sourceFile?.replace(/\.yaml$/, '') || 'simulation');
      const nsName = isManualWizard 
        ? activeNamespace 
        : (activeWorkload?.namespace || 'default');
      const appName = isManualWizard 
        ? wizardForm.name 
        : (activeWorkload?.id || 'app');

      const res = await fetch('/api/stacks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projName,
          namespace: nsName,
          app: {
            name: appName,
            ...wizardForm
          }
        })
      });

      if (!res.ok) throw new Error("Scaffold generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${appName}-sdk-scaffold.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      console.error(e);
      alert("Download failed: " + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Sync wizard preview variables
  useEffect(() => {
    if (!isWizardOpen) return;

    const appName = isManualWizard ? wizardForm.name : (activeWorkload?.id || 'app');
    const nsName = isManualWizard ? activeNamespace : (activeWorkload?.namespace || 'default');

    let configText = `# Consolidated config for service: ${appName || 'unnamed-app'}
# Namespace: ${nsName}
# SDK Stack: ${wizardForm.language} / ${wizardForm.framework}
# Base Port: ${wizardForm.port}

`;
    // Add language specific details to preview if needed
    if (wizardForm.language === 'java') {
      configText += `# Java Package: ${wizardForm.packageName}\n# Group ID: ${wizardForm.groupId}\n# Artifact ID: ${wizardForm.artifactId}\n\n`;
    } else if (wizardForm.language === 'nodejs' || wizardForm.language === 'javascript') {
      configText += `# NodeJS Entrypoint: ${wizardForm.nodeEntrypoint}\n\n`;
    } else if (wizardForm.language === 'go') {
      configText += `# Go Module Name: ${wizardForm.goModuleName}\n\n`;
    } else if (wizardForm.language === 'python') {
      configText += `# Python Version: ${wizardForm.pythonVersion}\n\n`;
    }

    if (wizardForm.envVars.length > 0) {
      configText += `# Custom Environment Variables:\n`;
      wizardForm.envVars.forEach(ev => {
        configText += `${ev.key}=${ev.value}\n`;
      });
      configText += `\n`;
    }

    wizardForm.capabilities.forEach(cap => {
      const regCap = registryCaps.find(rc => rc.id === cap.id || rc.serviceId === cap.id);
      if (regCap) {
        configText += `# Capability: ${cap.displayName} (${cap.id})\n`;
        if (regCap.comboPayloads) {
          const keys = Object.keys(regCap.comboPayloads);
          const bestKey = keys.find(k => {
            const kl = k.toLowerCase();
            return kl.includes(wizardForm.language.toLowerCase()) && 
                   kl.includes(wizardForm.framework.toLowerCase()) && 
                   kl.includes(wizardForm.buildTool.toLowerCase());
          }) || keys.find(k => {
            const kl = k.toLowerCase();
            return kl.includes(wizardForm.language.toLowerCase()) && kl.includes(wizardForm.framework.toLowerCase());
          }) || keys[0];

          if (bestKey && regCap.comboPayloads[bestKey]?.snippetTemplate) {
            let snippet = regCap.comboPayloads[bestKey].snippetTemplate;
            Object.entries(cap.config).forEach(([ckey, cval]) => {
              snippet = snippet.replace(new RegExp(`{{\\s*${ckey}\\s*}}`, 'g'), String(cval));
            });
            configText += snippet + `\n`;
          } else {
            Object.entries(cap.config).forEach(([ckey, cval]) => {
              configText += `${cap.id.toUpperCase()}_${ckey.toUpperCase()}=${cval}\n`;
            });
          }
        } else {
          Object.entries(cap.config).forEach(([ckey, cval]) => {
            configText += `${cap.id.toUpperCase()}_${ckey.toUpperCase()}=${cval}\n`;
          });
        }
        configText += `\n`;
      }
    });

    setPreviewContent(configText);
  }, [wizardForm, activeWorkload, registryCaps, isWizardOpen, isManualWizard, activeNamespace]);

  return (
    <div className="space-y-8 pb-20">
      {/* View Header with Dual-Mode Tabs */}
      <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-5">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-[#1A1A1A] flex items-center gap-3">
            <AppWindow size={32} className="text-[#0D6EFD]" /> Create Application
          </h2>
          <p className="text-xs text-[#6C757D]">Define custom projects or load active cluster files to generate SDK code packages.</p>
        </div>
        
        {/* Toggle Mode Tabs */}
        <div className="bg-[#E9ECEF] p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('manual')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'manual' 
                ? "bg-white text-[#0D6EFD] shadow-sm" 
                : "text-[#6C757D] hover:text-[#212529]"
            )}
          >
            <LayoutGrid size={14} /> Project Designer (Manual)
          </button>
          <button
            onClick={() => setActiveTab('visual')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'visual' 
                ? "bg-white text-[#0D6EFD] shadow-sm" 
                : "text-[#6C757D] hover:text-[#212529]"
            )}
          >
            <Eye size={14} /> Cluster Visualizer (Import)
          </button>
        </div>
      </div>

      {/* --- MODE 1: MANUAL PROJECT DESIGNER (PREVIOUS LAYOUT) --- */}
      {activeTab === 'manual' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-12 gap-8 items-start"
        >
          {/* Left Column: Project Selector & Namespace Navigator */}
          <div className="col-span-12 md:col-span-3 space-y-6">
            {/* Project Box */}
            <div className="bg-white rounded-2xl border border-[#E9ECEF] p-4 shadow-sm space-y-3">
              <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest block">Active Project</label>
              <select 
                value={activeProjectName}
                onChange={(e) => {
                  const name = e.target.value;
                  setActiveProjectName(name);
                  const p = projects.find(proj => proj.name === name);
                  if (p) setActiveNamespace(p.namespaces[0] || 'default');
                }}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-bold text-[#212529]"
              >
                {projects.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-[#6C757D] italic">{activeProject?.description}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex-1 text-xs bg-[#E7F1FF] text-[#0D6EFD] font-bold py-2 rounded-xl transition-all"
                >
                  + Add Project
                </button>
                <button 
                  onClick={(e) => handleDeleteProject(activeProjectName, e)}
                  className="text-xs text-rose-500 border border-rose-100 hover:bg-rose-50 rounded-xl px-3 py-2 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Namespaces List */}
            <div className="bg-white rounded-2xl border border-[#E9ECEF] p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-widest block">Namespaces ({activeProject?.namespaces.length})</span>
                <button 
                  onClick={handleAddNamespace}
                  className="p-1 hover:bg-[#E7F1FF] text-[#0D6EFD] rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {activeProject?.namespaces.map(ns => {
                  const count = (manualApps[activeProjectName] && manualApps[activeProjectName][ns]?.length) || 0;
                  return (
                    <div 
                      key={ns}
                      onClick={() => setActiveNamespace(ns)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border",
                        activeNamespace === ns 
                          ? "bg-[#0D6EFD] text-white border-transparent shadow-md shadow-[#0D6EFD]/10" 
                          : "bg-white text-[#495057] border-transparent hover:bg-[#F8F9FA]"
                      )}
                    >
                      <span className="truncate">{ns}</span>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-[9px] px-1.5 py-0.2 rounded-full font-bold", activeNamespace === ns ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                          {count}
                        </span>
                        {activeProject.namespaces.length > 1 && (
                          <button onClick={(e) => handleDeleteNamespace(ns, e)} className={cn("p-0.5", activeNamespace === ns ? "text-white/85" : "text-rose-400")}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Central Applications Canvas */}
          <div className="col-span-12 md:col-span-9 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm min-h-[450px] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A]">
                    Namespace: <span className="text-[#0D6EFD]">{activeNamespace}</span>
                  </h3>
                  <p className="text-xs text-[#6C757D]">Expose and construct custom runtime components manually.</p>
                </div>
                <button 
                  onClick={() => openManualWizard(null)}
                  className="px-4 py-2 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Plus size={14} /> Create App
                </button>
              </div>

              {activeAppsList.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeAppsList.map((app, idx) => (
                    <div 
                      key={app.name}
                      onClick={() => openManualWizard(idx)}
                      className="border border-[#E9ECEF] rounded-2xl p-5 hover:border-[#0D6EFD] hover:shadow-md transition-all cursor-pointer bg-[#F8F9FA] flex flex-col justify-between group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-[#1A1A1A] group-hover:text-[#0D6EFD]">{app.name}</h4>
                            <p className="text-[10px] text-[#6C757D] font-mono">Port: {app.port}</p>
                          </div>
                          <span className="text-[9px] font-bold bg-[#E7F1FF] text-[#0D6EFD] border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {app.language}
                          </span>
                        </div>

                        {app.capabilities.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-[#ADB5BD] font-bold uppercase tracking-wider block">Linked Capabilities</span>
                            <div className="flex flex-wrap gap-1">
                              {app.capabilities.map(c => (
                                <span key={c.id} className="text-[9px] bg-white border border-[#DEE2E6] text-[#495057] px-2 py-0.5 rounded shadow-sm">
                                  {c.displayName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-[#E9ECEF] pt-4 mt-6">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadManualScaffold(app); }}
                          className="px-3 py-1.5 bg-white border border-[#DEE2E6] hover:bg-[#F8F9FA] text-[#495057] font-bold text-[10px] rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Download size={12} /> Download ZIP
                        </button>
                        <button 
                          onClick={(e) => handleDeleteManualApp(idx, e)}
                          className="p-1 text-[#ADB5BD] hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#DEE2E6] rounded-xl bg-[#F8F9FA] text-center">
                  <Plus size={24} className="text-[#ADB5BD] mb-2" />
                  <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">No Manual Applications Defined</h4>
                  <p className="text-xs text-[#6C757D] max-w-sm mb-4">Add your microservice workloads inside this namespace lane.</p>
                  <button 
                    onClick={() => openManualWizard(null)}
                    className="px-4 py-2 bg-[#0D6EFD] text-white rounded-lg text-xs font-bold"
                  >
                    + Create App
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* --- MODE 2: VISUAL CLUSTER CANVAS (READONLY HORIZONTAL LAYOUT LIKE REGISTRY) --- */}
      {activeTab === 'visual' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* File source importer (if no source file is selected) */}
          {!sourceFile ? (
            <div className="space-y-6 max-w-3xl mx-auto pt-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#0D6EFD]/10 text-[#0D6EFD] rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Upload size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">Load Cluster Spec File</h3>
                <p className="text-xs text-[#6C757D]">Import a YAML configuration file or select a previous run from history.</p>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadFile} 
                className="hidden" 
                accept=".yaml,.yml"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 bg-white border-2 border-dashed border-[#DEE2E6] rounded-2xl hover:border-[#0D6EFD] hover:bg-[#F8F9FA] transition-all text-left flex flex-col justify-between min-h-[160px] group"
                >
                  <Upload size={20} className="text-[#ADB5BD] group-hover:text-[#0D6EFD]" />
                  <div>
                    <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">Upload Custom YAML</h4>
                    <p className="text-[11px] text-[#6C757D]">Upload local YAML files or K8s manifests.</p>
                  </div>
                </button>

                <div className="p-5 bg-white border border-[#E9ECEF] rounded-2xl shadow-sm space-y-3 flex flex-col min-h-[160px]">
                  <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider block">History Runs</span>
                  <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[100px] pr-1">
                    {historyRuns.map((run, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectHistoryFile(run.filename)}
                        className="w-full flex items-center justify-between p-2 rounded-lg border border-[#E9ECEF] hover:border-[#0D6EFD] hover:bg-[#F8F9FA] transition-all text-left text-xs"
                      >
                        <span className="truncate font-semibold max-w-[180px]">{run.filename.split('_').slice(1).join('_')}</span>
                        <ChevronRight size={12} className="text-[#ADB5BD]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Horizontal Readonly Summary layout (Hexagons + Connector lines + cards)
            <div className="space-y-6">
              {/* Reset Source header banner */}
              <div className="flex items-center justify-between bg-white border border-[#E9ECEF] px-4 py-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <Play className="text-[#198754]" size={16} />
                  <div>
                    <span className="text-[9px] font-bold text-[#ADB5BD] uppercase block leading-none mb-0.5">Import Source Spec</span>
                    <span className="text-xs font-bold text-[#1A1A1A]">{sourceFile}</span>
                  </div>
                </div>
                <button 
                  onClick={handleResetSource}
                  className="px-4 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                >
                  Change Spec
                </button>
              </div>

              {/* Horizontal rows for namespaces */}
              <div className="flex flex-col gap-1">
                {discoveredNamespaces.map((ns, idx) => {
                  const theme = THEMES[idx % THEMES.length];
                  // Filter workloads/components inside this namespace
                  const nsComponents = components.filter(c => c.namespace === ns && c.category !== 'namespace');

                  return (
                    <div key={ns} className="flex min-h-[160px] items-stretch relative">
                      
                      {/* Hexagon column on Left */}
                      <div className="flex items-center flex-shrink-0 w-[140px] relative z-10">
                        {/* Pointy Hexagon */}
                        <div 
                          className={cn(
                            "w-[120px] h-[95px] flex items-center justify-center text-white py-4 px-2 tracking-[0.12em] text-[10px] font-bold uppercase shadow-sm relative z-20 transition-all",
                            theme.hex
                          )}
                          style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                          title={ns}
                        >
                          <span className="truncate w-16 text-center">{ns}</span>
                        </div>
                        {/* Connecting Line protruding right */}
                        <div className={cn("h-[2px] w-[24px] absolute right-[-8px] z-10", theme.conn)} />
                      </div>

                      {/* Discovered Cards Deck on Right */}
                      <div className={cn(
                        "flex-1 border-[1.5px] rounded-r-2xl rounded-l-md flex items-center p-5 ml-[-4px] bg-white bg-opacity-40 my-2",
                        theme.border
                      )}>
                        <div className="flex gap-5 overflow-x-auto py-2 w-full scrollbar-hide">
                          {nsComponents.length === 0 ? (
                            <span className="text-[11px] text-[#ADB5BD] italic">No services discovered</span>
                          ) : (
                            nsComponents.map(comp => {
                              // Highlight dependency edges
                              const dependencies = dependencyGraph.edges
                                .filter(e => e.from === comp.id)
                                .map(e => e.to);
                              
                              const isWorkload = comp.category === 'application';
                              const configured = !!comp.sdkConfig;

                              return (
                                <motion.div 
                                  key={comp.id}
                                  whileHover={{ y: -3 }}
                                  onClick={() => isWorkload && openVisualWizard(comp)}
                                  className={cn(
                                    "flex-shrink-0 w-[160px] p-4 bg-white border rounded-2xl flex flex-col justify-between shadow-sm transition-all group relative",
                                    isWorkload ? "cursor-pointer hover:border-[#0D6EFD]" : "border-slate-100 hover:border-slate-200",
                                    configured && "border-emerald-500 hover:border-emerald-600"
                                  )}
                                >
                                  <div>
                                    {/* Icon & Category Indicator */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs",
                                        isWorkload ? "bg-blue-50 text-[#0D6EFD]" : "bg-slate-50 text-slate-400"
                                      )}>
                                        {isWorkload ? <Cpu size={14} /> : <Server size={14} />}
                                      </div>
                                      <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded uppercase">
                                        {comp.category}
                                      </span>
                                    </div>

                                    {/* Component ID name */}
                                    <h5 className="text-xs font-extrabold text-[#1A1A1A] truncate group-hover:text-[#0D6EFD] transition-colors">{comp.id}</h5>
                                    
                                    {/* Configured badge */}
                                    {configured && comp.sdkConfig && (
                                      <span className="text-[8px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded mt-1.5 inline-block capitalize">
                                        ✓ SDK: {comp.sdkConfig.language}
                                      </span>
                                    )}

                                    {/* Dependencies List/Highlight */}
                                    {dependencies.length > 0 && (
                                      <div className="mt-3 space-y-1">
                                        <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wide block flex items-center gap-1">
                                          <GitCommit size={10} /> Depends On:
                                        </span>
                                        <div className="flex flex-col gap-0.5 pl-1.5 border-l border-rose-100">
                                          {dependencies.map(dep => (
                                            <span key={dep} className="text-[9px] font-mono text-[#6C757D] truncate" title={dep}>
                                              {dep}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Link Action details */}
                                  {isWorkload && !configured && (
                                    <div className="text-[9px] text-[#ADB5BD] mt-4 border-t border-[#F8F9FA] pt-2 font-medium group-hover:text-[#0D6EFD] flex items-center gap-1 transition-all">
                                      <Code2 size={11} /> Generate SDK
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* --- WIZARD GENERATOR OVERLAY (UNIFIED) --- */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-[#E9ECEF] shadow-2xl w-full max-w-4xl h-[650px] flex overflow-hidden"
            >
              {/* Wizard Indicator Left Panel */}
              <div className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between border-r border-slate-800">
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SDK Generator Wizard</span>
                    <h3 className="font-extrabold text-base truncate">
                      {isManualWizard ? (wizardForm.name || 'New Application') : (activeWorkload?.id || '')}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Namespace: {isManualWizard ? activeNamespace : (activeWorkload?.namespace || '')}
                    </p>
                  </div>

                  {/* Navigation steps checklist */}
                  <div className="space-y-4">
                    {[
                      { step: 1, label: 'Stack Template', desc: 'Framework settings', icon: <Code size={14} /> },
                      { step: 2, label: 'Capabilities', desc: 'Bind database/infra', icon: <Database size={14} /> },
                      { step: 3, label: 'Parameters', desc: 'Environment variables', icon: <Sliders size={14} /> },
                      { step: 4, label: 'Review & Scaffold', desc: 'Download zip template', icon: <Play size={14} /> }
                    ].map(s => (
                      <div 
                        key={s.step}
                        className={cn(
                          "flex items-center gap-3 transition-colors text-left",
                          wizardStep === s.step ? "text-[#0D6EFD]" : wizardStep > s.step ? "text-emerald-500" : "text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border",
                          wizardStep === s.step ? "bg-[#0D6EFD]/10 border-[#0D6EFD]" : 
                          wizardStep > s.step ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "border-slate-800 text-slate-400"
                        )}>
                          {wizardStep > s.step ? <Check size={12} strokeWidth={3} /> : s.step}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{s.label}</p>
                          <p className="text-[9px] text-slate-500 leading-tight">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <Cpu size={12} />
                  <span>KubeSDK Generator engine v1.0</span>
                </div>
              </div>

              {/* Wizard Content Right Area */}
              <div className="flex-1 flex flex-col justify-between relative">
                {/* Close Button */}
                <button 
                  onClick={() => setIsWizardOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-[#E9ECEF] text-[#6C757D] rounded-xl transition-all z-10"
                >
                  ✕
                </button>

                <div className="flex-1 overflow-y-auto p-8">
                  {/* Step 1: Language & Stack */}
                  {wizardStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A]">Select Language & Stack Template</h3>
                        <p className="text-xs text-[#6C757D]">Choose your application runtime template. Options are loaded dynamically from settings configuration.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {isManualWizard && (
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-[#495057] mb-1">App Name</label>
                            <input 
                              type="text"
                              value={wizardForm.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                const sanitized = newName.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                const pkgPostfix = sanitized.replace(/-/g, '');
                                setWizardForm(prev => ({
                                  ...prev,
                                  name: newName,
                                  artifactId: sanitized,
                                  goModuleName: sanitized,
                                  packageName: `${prev.groupId || 'com.example'}.${pkgPostfix}`
                                }));
                              }}
                              className="w-full px-4 py-2 border border-[#DEE2E6] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-medium"
                              placeholder="e.g. my-app"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-[#495057] mb-1">Language</label>
                          <select 
                            value={wizardForm.language}
                            onChange={(e) => handleWizardLanguageChange(e.target.value, isManualWizard ? wizardForm.name : (activeWorkload?.id || 'app'))}
                            className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-semibold text-[#495057] capitalize"
                          >
                            {Object.keys(languagesConfig).map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>

                        {languagesConfig[wizardForm.language] && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-[#495057] mb-1">Framework</label>
                              <select 
                                value={wizardForm.framework}
                                onChange={(e) => setWizardForm(prev => ({ ...prev, framework: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm capitalize"
                              >
                                {languagesConfig[wizardForm.language].frameworks?.map((f: string) => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-[#495057] mb-1">Build Tool</label>
                              <select 
                                value={wizardForm.buildTool}
                                onChange={(e) => setWizardForm(prev => ({ ...prev, buildTool: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm capitalize"
                              >
                                {languagesConfig[wizardForm.language]['build-tools']?.map((bt: string) => (
                                  <option key={bt} value={bt}>{bt}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Language Specific Settings */}
                      {wizardForm.language && (
                        <div className="border-t border-[#E9ECEF] pt-4 mt-4 space-y-4">
                          <h4 className="text-xs font-bold text-[#6C757D] uppercase tracking-wider flex items-center gap-2">
                            <Settings2 size={12} className="text-[#0D6EFD]" /> Language-Specific Settings ({wizardForm.language})
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {wizardForm.language.toLowerCase() === 'java' && (
                              <>
                                <div>
                                  <label className="block text-xs font-semibold text-[#495057] mb-1">Package Name</label>
                                  <input 
                                    type="text"
                                    value={wizardForm.packageName}
                                    onChange={(e) => setWizardForm(prev => ({ ...prev, packageName: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                    placeholder="com.example.demo"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-[#495057] mb-1">Group ID</label>
                                  <input 
                                    type="text"
                                    value={wizardForm.groupId}
                                    onChange={(e) => {
                                      const newGroup = e.target.value;
                                      const sanitized = wizardForm.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                      const pkgPostfix = sanitized.replace(/-/g, '');
                                      setWizardForm(prev => ({ 
                                        ...prev, 
                                        groupId: newGroup,
                                        packageName: `${newGroup}.${pkgPostfix}`
                                      }));
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                    placeholder="com.example"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-semibold text-[#495057] mb-1">Artifact ID</label>
                                  <input 
                                    type="text"
                                    value={wizardForm.artifactId}
                                    onChange={(e) => setWizardForm(prev => ({ ...prev, artifactId: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                    placeholder="demo"
                                  />
                                </div>
                              </>
                            )}

                            {(wizardForm.language.toLowerCase() === 'nodejs' || wizardForm.language.toLowerCase() === 'javascript') && (
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold text-[#495057] mb-1">NodeJS Entrypoint File</label>
                                <input 
                                  type="text"
                                  value={wizardForm.nodeEntrypoint}
                                  onChange={(e) => setWizardForm(prev => ({ ...prev, nodeEntrypoint: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                  placeholder="index.js"
                                />
                              </div>
                            )}

                            {wizardForm.language.toLowerCase() === 'go' && (
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold text-[#495057] mb-1">Go Module Name</label>
                                <input 
                                  type="text"
                                  value={wizardForm.goModuleName}
                                  onChange={(e) => setWizardForm(prev => ({ ...prev, goModuleName: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                  placeholder="my-module"
                                />
                              </div>
                            )}

                            {wizardForm.language.toLowerCase() === 'python' && (
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold text-[#495057] mb-1">Python Version</label>
                                <input 
                                  type="text"
                                  value={wizardForm.pythonVersion}
                                  onChange={(e) => setWizardForm(prev => ({ ...prev, pythonVersion: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-[#DEE2E6] rounded-xl text-sm font-mono"
                                  placeholder="3.9"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Capabilities checklist */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A]">Link Active Capabilities</h3>
                        <p className="text-xs text-[#6C757D]">Attach registered databases, queues, and storages to expose SDK integrations.</p>
                      </div>

                      {registryCaps.length > 0 ? (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {registryCaps.map(cap => {
                            const isAttached = wizardForm.capabilities.some(c => c.id === cap.id);
                            return (
                              <div 
                                key={cap.id} 
                                onClick={() => handleWizardToggleCapability(cap)}
                                className={cn(
                                  "border rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between",
                                  isAttached ? "border-emerald-500 bg-emerald-50/10 shadow-sm" : "border-[#E9ECEF] hover:border-[#0D6EFD]"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isAttached ? "bg-emerald-500 border-emerald-500 text-white" : "border-[#DEE2E6] bg-white")}>
                                    {isAttached && <Check size={12} strokeWidth={3} />}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-[#1A1A1A]">{cap.displayName || cap.id}</h5>
                                    <p className="text-[10px] text-[#6C757D]">Exposed as capability layer <strong>{cap.providerLayerId || cap.type}</strong></p>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase font-mono">{cap.id}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl text-xs leading-relaxed">
                          No registered capabilities found in registry. Expose components in the Capability Registry menu.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Parameters override */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A]">Define Parameters & Custom variables</h3>
                        <p className="text-xs text-[#6C757D]">Customize parameters for linked capabilities and environment variables.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#495057] mb-1">Service Listening Port</label>
                          <input 
                            type="number"
                            value={wizardForm.port}
                            onChange={(e) => setWizardForm(prev => ({ ...prev, port: parseInt(e.target.value) || 8080 }))}
                            className="w-full px-3 py-1.5 border border-[#DEE2E6] rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#495057] mb-1">Target Docker Image</label>
                          <input 
                            type="text"
                            value={wizardForm.image}
                            onChange={(e) => setWizardForm(prev => ({ ...prev, image: e.target.value }))}
                            className="w-full px-3 py-1.5 border border-[#DEE2E6] rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
                          />
                        </div>
                      </div>

                      {wizardForm.capabilities.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider block">Linked Capability Parameters</span>
                          {wizardForm.capabilities.map(cap => (
                            <div key={cap.id} className="bg-[#F8F9FA] border border-[#E9ECEF] p-4 rounded-xl space-y-3">
                              <span className="text-xs font-bold text-[#1A1A1A] block">{cap.displayName} ({cap.id})</span>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.keys(cap.config).map(fieldKey => (
                                  <div key={fieldKey}>
                                    <label className="block text-[10px] font-semibold text-[#6C757D] capitalize mb-1">{fieldKey}</label>
                                    <input 
                                      type="text"
                                      value={cap.config[fieldKey]}
                                      onChange={(e) => handleWizardCapabilityConfigChange(cap.id, fieldKey, e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-[#DEE2E6] rounded-lg text-xs font-mono outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider block">Application Custom Environment Variables</span>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="KEY"
                            value={newEnvKey}
                            onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                            className="w-1/3 px-3 py-1.5 border border-[#DEE2E6] rounded-lg text-xs font-bold font-mono outline-none uppercase"
                          />
                          <input 
                            type="text"
                            placeholder="value"
                            value={newEnvVal}
                            onChange={(e) => setNewEnvVal(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-[#DEE2E6] rounded-lg text-xs font-mono outline-none"
                          />
                          <button 
                            onClick={handleAddWizardEnv}
                            className="px-3 bg-white border border-[#DEE2E6] hover:bg-[#F8F9FA] rounded-lg text-xs font-bold transition-all"
                          >
                            Add
                          </button>
                        </div>
                        {wizardForm.envVars.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 bg-[#F8F9FA] p-2.5 rounded-lg max-h-[100px] overflow-y-auto">
                            {wizardForm.envVars.map(ev => (
                              <span key={ev.key} className="text-[10px] font-mono bg-white border border-[#E9ECEF] px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                <span className="font-bold text-[#0D6EFD]">{ev.key}:</span> {ev.value}
                                <button onClick={() => handleRemoveWizardEnv(ev.key)} className="text-rose-500 font-bold ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Review & Scaffold */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A]">Review & Scaffolding Preview</h3>
                        <p className="text-xs text-[#6C757D]">Review the generated application structure variables and live config sneak peek.</p>
                      </div>

                      <div className="h-60 bg-[#1E1E1E] text-[#D4D4D4] rounded-xl border border-[#DEE2E6] font-mono text-[11px] p-4 overflow-y-auto leading-relaxed shadow-inner">
                        <pre className="whitespace-pre-wrap">{previewContent}</pre>
                      </div>

                      <div className="flex justify-center pt-2">
                        <button 
                          onClick={handleDownloadWizardScaffold}
                          disabled={isDownloading}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-emerald-600/15"
                        >
                          <Download size={15} /> {isDownloading ? 'Compiling ZIP Scaffold...' : 'Download Project Scaffold ZIP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA]">
                  <button 
                    onClick={() => {
                      if (wizardStep === 1) {
                        setIsWizardOpen(false);
                      } else {
                        setWizardStep(prev => prev - 1);
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
                  >
                    {wizardStep === 1 ? 'Cancel' : 'Back'}
                  </button>

                  <div className="flex gap-2">
                    {wizardStep < 4 ? (
                      <button 
                        onClick={() => setWizardStep(prev => prev + 1)}
                        className="px-5 py-2.5 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        Continue <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button 
                        onClick={isManualWizard ? handleSaveManualApp : handleSaveWizardConfig}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Save Configuration
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Project Creator dialog modal */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-2xl w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F5]">
                <h3 className="font-bold text-base text-[#1A1A1A]">Create New Project</h3>
                <button onClick={() => setIsNewProjectModalOpen(false)} className="p-1 hover:bg-[#F8F9FA] rounded text-[#6C757D]">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#495057] mb-1">Project Name</label>
                  <input 
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEE2E6] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#495057] mb-1">Description</label>
                  <textarea 
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEE2E6] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 h-20 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-xs font-bold text-[#6C757D]">Cancel</button>
                <button onClick={handleCreateProject} className="px-5 py-2.5 bg-[#0D6EFD] text-white rounded-xl text-xs font-bold">Create Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
