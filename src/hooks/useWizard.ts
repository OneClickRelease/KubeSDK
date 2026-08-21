import { useState, useEffect, useMemo, useCallback } from 'react';
import { KubeSDKLocalRun, LocalRunSource, ValidationResult, ResourcePlan } from '../types';
import { STORAGE_KEY, STEP_KEY, NS_KEY, MENU_KEY, INITIAL_CONFIG } from '../lib/constants';
import { generateYamlFromConfig } from '../lib/yaml-utils';

export function useWizard() {
  const [activeMenu, setActiveMenu] = useState<'home' | 'define' | 'registry' | 'history' | 'settings' | 'catalog' | 'create-application'>(() => {
    try { return (localStorage.getItem(MENU_KEY) as any) || 'home'; } catch { return 'home'; }
  });
  
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(STEP_KEY) || '0') || 0; } catch { return 0; }
  });

  const [config, setConfig] = useState<KubeSDKLocalRun>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as KubeSDKLocalRun;
    } catch (e) { console.warn('Could not restore config from localStorage', e); }
    return INITIAL_CONFIG;
  });

  const [selectedNamespace, setSelectedNamespace] = useState<string>(() => {
    try { return localStorage.getItem(NS_KEY) || ''; } catch { return ''; }
  });

  // UI States
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(0);
  const [validationStatus, setValidationStatus] = useState<Record<string, { status: 'checking' | 'valid' | 'invalid', message?: string }>>({});
  const [isModelYamlMode, setIsModelYamlMode] = useState(false);
  const [modelYamlContent, setModelYamlContent] = useState('');

  // Derived state
  const namespaces = useMemo(() => {
    const ignoredNS = config.wizard.ignoredNamespaces || [];
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
    return Array.from(new Set([...nsFromComponents, ...nsFromWorkloads]));
  }, [config.components, config.wizard.ignoredNamespaces]);

  // Persist config
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) { console.warn('Could not save config', e); }
  }, [config]);

  // Persist menu
  useEffect(() => {
    try { localStorage.setItem(MENU_KEY, activeMenu); } catch {}
  }, [activeMenu]);

  // Persist step
  useEffect(() => {
    try { localStorage.setItem(STEP_KEY, String(currentStep)); } catch {}
  }, [currentStep]);

  // Persist selected namespace
  useEffect(() => {
    try { localStorage.setItem(NS_KEY, selectedNamespace); } catch {}
  }, [selectedNamespace]);

  // Sync YAML content
  useEffect(() => {
    if (!isModelYamlMode) {
      setModelYamlContent(generateYamlFromConfig(config));
    }
  }, [config, isModelYamlMode]);

  const updateConfig = useCallback((updates: Partial<KubeSDKLocalRun> | ((prev: KubeSDKLocalRun) => KubeSDKLocalRun)) => {
    if (typeof updates === 'function') {
      setConfig(updates);
    } else {
      setConfig(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const handleSourceChange = useCallback((source: LocalRunSource) => {
    setConfig(prev => ({ 
      ...prev, 
      wizard: { ...prev.wizard, source } 
    }));
  }, []);

  const handleSnapshotImport = useCallback((data: Partial<KubeSDKLocalRun>) => {
    setConfig(prev => ({
      ...prev,
      ...data,
      wizard: { 
        ...prev.wizard, 
        source: 'snapshot_yaml' 
      },
      steps: { 
        ...prev.steps, 
        completed: ['source', 'mode', 'import', 'upload'] 
      }
    }));
    // Jump to Step 4 (ModelStep)
    setCurrentStep(4);
  }, []);

  const nextStep = useCallback((visibleStepsLength: number) => {
    setCurrentStep(prev => Math.min(prev + 1, visibleStepsLength - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  return {
    activeMenu, setActiveMenu,
    currentStep, setCurrentStep,
    config, setConfig, updateConfig,
    selectedNamespace, setSelectedNamespace,
    isDeploying, setIsDeploying,
    deploymentStatus, setDeploymentStatus,
    isReady, setIsReady,
    isFetching, setIsFetching,
    isValidating, setIsValidating,
    isUploading, setIsUploading,
    isFitting, setIsFitting,
    selectedComponentIndex, setSelectedComponentIndex,
    validationStatus, setValidationStatus,
    isModelYamlMode, setIsModelYamlMode,
    modelYamlContent, setModelYamlContent,
    namespaces,
    handleSourceChange,
    handleSnapshotImport,
    nextStep,
    prevStep
  };
}
