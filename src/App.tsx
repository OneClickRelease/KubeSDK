import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useWizard } from './hooks/useWizard';
import { WIZARD_STEPS, STORAGE_KEY, STEP_KEY, NS_KEY } from './lib/constants';
import { generateYamlFromConfig } from './lib/yaml-utils';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { HomeView } from './components/layout/HomeView';
import { SettingsView } from './components/layout/SettingsView';
import { HistoryView } from './components/layout/HistoryView';
import { RegistryView } from './components/registry/RegistryView';
import { CapabilityLayersBrowser } from './components/registry/CapabilityLayersBrowser';
import { CreateApplicationView } from './components/layout/CreateApplicationView';

// Wizard Steps
import { SourceStep } from './components/wizard/steps/SourceStep';
import { ModeStep } from './components/wizard/steps/ModeStep';
import { UploadStep } from './components/wizard/steps/UploadStep';
import { ModelStep } from './components/wizard/steps/ModelStep';
import { MappingStep } from './components/wizard/steps/MappingStep';
import { ReviewStep } from './components/wizard/steps/ReviewStep';
import { DeploymentStep } from './components/wizard/steps/DeploymentStep';
import { VerificationStep } from './components/wizard/steps/VerificationStep';

export default function App() {
  const {
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
    nextStep: baseNextStep,
    prevStep
  } = useWizard();

  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [clusterCapacity, setClusterCapacity] = React.useState<{ cpu: number, memory: number } | null>(null);
  const [healthStatus, setHealthStatus] = React.useState<Record<string, any>>({});
  const [wizardError, setWizardError] = React.useState<string | null>(null);
  const [deploymentItems, setDeploymentItems] = React.useState<any[]>([]);
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetLog, setResetLog] = React.useState<{ text: string; ok: boolean }[]>([]);
  const [resetDone, setResetDone] = React.useState(false);

  // Derived visible steps — MUST be declared before any effect that references it
  // (const is NOT hoisted; referencing it before this line causes a ReferenceError)
  const visibleSteps = React.useMemo(() => WIZARD_STEPS.filter(step => {
    if (step.id === 'import' && config.wizard.source === 'manual') return false;
    if (step.id === 'upload' && config.wizard.source === 'live') return false;
    return true;
  }), [config.wizard.source]);

  // 1. Global Validation Effect
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        const data = await response.json();
        setConfig(prev => ({ ...prev, validation: data }));
        
        const newStatus: any = {};
        config.components.forEach(c => {
          if (c.category === 'application' && !c.properties?.image) {
            newStatus[c.id] = { status: 'invalid', message: 'Missing image' };
          } else {
            newStatus[c.id] = { status: 'valid' };
          }
        });
        setValidationStatus(newStatus);
      } catch (err) {
        console.error('Validation sync failed', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [config.components]);

  // 1b. Real-time Status Polling (5s) - Active on Verification Step
  React.useEffect(() => {
    const currentStepId = visibleSteps[currentStep]?.id;
    if (currentStepId !== 'verification') return;
    
    console.log("Starting 5s health-check polling...");
    // Poll immediately when entering the step
    handleHealthCheck();
    
    const interval = setInterval(() => {
      handleHealthCheck();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentStep, visibleSteps, config.wizard.connectivity]);

  // 1c. Auto-detect cluster credentials on load
  React.useEffect(() => {
    const detectCredentials = async () => {
      try {
        const response = await fetch('/api/cluster/credentials');
        const data = await response.json();
        if (data.status === 'success' && data.apiServerUrl && data.token) {
          console.log("Auto-detected cluster credentials:", data);
          setConfig(prev => {
            if (
              !prev.wizard.connectivity?.token ||
              prev.wizard.connectivity.apiServerUrl !== data.apiServerUrl ||
              prev.wizard.connectivity.token !== data.token
            ) {
              return {
                ...prev,
                wizard: {
                  ...prev.wizard,
                  connectivity: {
                    apiServerUrl: data.apiServerUrl,
                    token: data.token,
                    caCert: prev.wizard.connectivity?.caCert || ''
                  }
                }
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to auto-detect cluster credentials:', err);
      }
    };
    detectCredentials();
  }, []);

  // 2. Individual Component Resource Validation
  React.useEffect(() => {
    const selectedComponent = config.components[selectedComponentIndex];
    if (!selectedComponent || selectedComponent.category !== 'application') return;

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
      } catch (e) {
        setValidationStatus(prev => ({ ...prev, [selectedComponent.id]: { status: 'invalid', message: 'Validation failed' } }));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [config.components[selectedComponentIndex]?.properties?.image]);

  // Derived visible steps — now declared above; duplicate removed

  // Enhanced nextStep with API triggers
  const nextStep = async () => {
    const currentStepId = visibleSteps[currentStep].id;
    
    if (currentStepId === 'laptop') {
      await handleFitResources();
    } else if (currentStepId === 'feasibility') {
      await handleValidate();
    }

    baseNextStep(visibleSteps.length);
  };

  // Handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('export', file);
    formData.append('kindWhitelist', JSON.stringify(config.wizard.kindWhitelist || []));

    try {
      const response = await fetch('/api/upload-export', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.status === 'success') {
        setConfig(prev => ({ ...prev, components: data.components }));
        const nsList = Array.from(new Set(data.components.filter((c: any) => c.category === 'namespace').map((c: any) => c.id)));
        if (nsList.length > 0) setSelectedNamespace(nsList[0] as string);
        nextStep();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Upload failed', error);
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
        setConfig(prev => ({ ...prev, clusterSnapshot: data.snapshot }));
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
      const data = await response.json();
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
      const data = await response.json();
      setConfig(prev => ({ ...prev, resourcePlan: data }));
    } catch (error) {
      console.error('Fitting failed', error);
    } finally {
      setIsFitting(false);
    }
  };
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setClusterCapacity(null);
    setWizardError(null);
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServerUrl: config.wizard.connectivity?.apiServerUrl,
          token: config.wizard.connectivity?.token
        }),
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Invalid server response (Non-JSON): ${text.slice(0, 100)}...`);
      }

      if (!response.ok) throw new Error(data.error || 'Failed to connect');
      
      setConnectionStatus('success');
      setClusterCapacity(data.capacity); 
    } catch (e: any) {
      console.error("Connection failed:", e.message);
      setConnectionStatus('failed');
      setWizardError(e.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDeploy = async (itemsToDeploy: any[]) => {
    setIsDeploying(true);
    setWizardError(null);
    setDeploymentItems(itemsToDeploy.map(item => ({ ...item, status: 'pending' })));
    
    const updatedItems = itemsToDeploy.map(item => ({ ...item, status: 'pending' }));

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      
      // Update status to 'applying'
      updatedItems[i].status = 'applying';
      setDeploymentItems([...updatedItems]);
      setDeploymentStatus(prev => [...prev, `Applying ${item.kind}/${item.name}...`]);

      try {
        const response = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiServerUrl: config.wizard.connectivity?.apiServerUrl,
            token: config.wizard.connectivity?.token,
            yamlContent: item.content
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Deployment failed');

        updatedItems[i].status = 'success';
        setDeploymentItems([...updatedItems]);
        setDeploymentStatus(prev => [...prev, `Successfully applied ${item.kind}/${item.name}`]);
      } catch (e: any) {
        updatedItems[i].status = 'failed';
        updatedItems[i].error = e.message;
        setDeploymentItems([...updatedItems]);
        setWizardError(`Failed to apply ${item.kind}/${item.name}: ${e.message}`);
        setDeploymentStatus(prev => [...prev, `Error applying ${item.kind}/${item.name}: ${e.message}`]);
        setIsDeploying(false);
        return; // Halt deployment on error
      }
    }

    setDeploymentStatus(prev => [...prev, 'All resources applied. Verifying health...']);
    await handleHealthCheck();
    await saveToHistory(); // Archive the successful run
    setIsReady(true);
    setIsDeploying(false);
  };

  const handleHealthCheck = async () => {
    try {
      const namespaces = Array.from(new Set(config.components.map(c => c.namespace).filter(Boolean)));
      const response = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServerUrl: config.wizard.connectivity?.apiServerUrl,
          token: config.wizard.connectivity?.token,
          namespaces
        }),
      });

      const results = await response.json();
      if (response.ok) {
        setHealthStatus(results);
      }
    } catch (e) {
      console.error("Health check failed", e);
    }
  };

  const handleHistoryRestore = (yaml: string) => {
    handleSnapshotImport({ components: [], ...config, ...JSON.parse(JSON.stringify(config)) }); // Placeholder to reset
    // Actually our handleSnapshotImport takes the config object. 
    // We need to parse the YAML back to JSON components or just fetch the backend to do it.
    // For now, let's trigger handleSnapshotImport with the parsed data
    fetch('/api/parse-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.status !== 'error') {
        handleSnapshotImport(data);
        setActiveMenu('define');
        setCurrentStep(visibleSteps.findIndex(s => s.id === 'model'));
      }
    });
  };

  const saveToHistory = async () => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          yaml: modelYamlContent,
          name: 'SDK_Simulation'
        }),
      });
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };
  const handleResetSession = async () => {
    if (!confirm('This will delete ALL KubeSDK-deployed resources from the K3s cluster and reset the wizard. Continue?')) return;
    setIsResetting(true);
    setResetDone(false);
    setResetLog([{ text: '⏳ Connecting to K3s cluster...', ok: true }]);

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServerUrl: config.wizard.connectivity?.apiServerUrl,
          token: config.wizard.connectivity?.token,
        }),
      });
      const data = await response.json();

      // Stream deleted resources into log
      const entries: { text: string; ok: boolean }[] = [
        { text: `✅ Connected. Found resources to clean up.`, ok: true }
      ];
      (data.deleted || []).forEach((d: string) => entries.push({ text: `🗑  ${d}`, ok: true }));
      (data.errors || []).forEach((e: string) => entries.push({ text: `⚠️  ${e}`, ok: false }));
      entries.push({ text: `✔  ${data.summary || 'Cluster cleaned.'}`, ok: true });
      setResetLog(entries);
    } catch (e: any) {
      setResetLog(prev => [...prev, { text: `⚠️  Cluster cleanup failed: ${e.message}. Resetting local state only.`, ok: false }]);
    }

    // Reset registry and local state
    try { await fetch('/api/registry/reset', { method: 'POST' }); } catch (_) {}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(NS_KEY);
    setResetLog(prev => [...prev, { text: '🔄 Session cleared. Ready to start fresh!', ok: true }]);
    setResetDone(true);
  };

  // Rendering logic
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex">

      {/* ─── Cluster Reset / Cleanup Overlay ─── */}
      {isResetting && (
        <div className="fixed inset-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-[#1A1A1A] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                {resetDone ? <span className="text-2xl">✓</span> : <span className="animate-spin text-xl">⟳</span>}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{resetDone ? 'Cluster Cleaned!' : 'Cleaning K3s Cluster...'}</h3>
                <p className="text-gray-400 text-xs">{resetDone ? 'All KubeSDK resources removed. Click below to start fresh.' : 'Removing all KubeSDK-deployed resources...'}</p>
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
              {resetLog.map((entry, i) => (
                <div key={i} className={entry.ok ? 'text-emerald-400' : 'text-amber-400'}>{entry.text}</div>
              ))}
              {!resetDone && <div className="text-gray-500 animate-pulse">_</div>}
            </div>
            {resetDone && (
              <div className="px-8 py-6 border-t border-white/10">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#0D6EFD]/30 text-sm"
                >
                  🚀 Start New Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        onResetSession={handleResetSession} 
      />

      <main className="flex-1 overflow-y-auto">
        <div className={cn(
          "mx-auto p-8 lg:p-12 transition-all duration-300 w-full", 
          activeMenu === 'define' && ['model', 'mapping', 'review', 'deployment', 'verification'].includes(visibleSteps[currentStep]?.id) ? "max-w-[1800px]" : "max-w-5xl"
        )}>
          <AnimatePresence mode="wait">
            {activeMenu === 'home' && <HomeView onStart={() => setActiveMenu('define')} />}
            
            {activeMenu === 'define' && (
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

                {/* Step Content Card */}
                <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 shadow-sm min-h-[400px]">
                  {visibleSteps[currentStep].id === 'source' && (
                    <SourceStep 
                      source={config.wizard.source} 
                      onSourceChange={handleSourceChange} 
                      onSnapshotImport={handleSnapshotImport}
                    />
                  )}
                  {visibleSteps[currentStep].id === 'mode' && <ModeStep />}
                  {visibleSteps[currentStep].id === 'upload' && (
                    <UploadStep isUploading={isUploading} onUpload={handleUpload} />
                  )}
                  {visibleSteps[currentStep].id === 'model' && (
                    <ModelStep 
                      config={config} 
                      setConfig={setConfig}
                      selectedNamespace={selectedNamespace}
                      setSelectedNamespace={setSelectedNamespace}
                      isModelYamlMode={isModelYamlMode}
                      setIsModelYamlMode={setIsModelYamlMode}
                      modelYamlContent={modelYamlContent}
                      setModelYamlContent={setModelYamlContent}
                      selectedComponentIndex={selectedComponentIndex}
                      setSelectedComponentIndex={setSelectedComponentIndex}
                      namespaces={namespaces}
                      validationStatus={validationStatus}
                      onFetchCluster={handleFetchCluster}
                      onTestConnection={handleTestConnection}
                      connectionStatus={connectionStatus}
                      isFetching={isFetching}
                    />
                  )}
                  {visibleSteps[currentStep].id === 'mapping' && (
                    <MappingStep 
                      config={config} 
                      setConfig={setConfig} 
                      namespaces={namespaces} 
                      generateYamlFromConfig={generateYamlFromConfig} 
                    />
                  )}
                  {visibleSteps[currentStep].id === 'review' && (
                  <ReviewStep 
                    config={config} 
                    setConfig={setConfig} 
                    onTestConnection={handleTestConnection}
                    isTesting={isTestingConnection}
                    connectionStatus={connectionStatus}
                    modelYamlContent={modelYamlContent}
                    clusterCapacity={clusterCapacity}
                    error={wizardError}
                    clearError={() => setWizardError(null)}
                  />
                )}
                
                {visibleSteps[currentStep].id === 'deployment' && (
                    <DeploymentStep 
                      isDeploying={isDeploying}
                      deploymentStatus={deploymentStatus}
                      modelYamlContent={modelYamlContent}
                      onDeploy={handleDeploy}
                      config={config}
                      deploymentItems={deploymentItems}
                    />
                  )}
                  {visibleSteps[currentStep].id === 'verification' && (
                    <VerificationStep 
                      config={config}
                      healthStatus={healthStatus}
                      onRerunHealthCheck={handleHealthCheck}
                      onResetSession={handleResetSession}
                      error={wizardError}
                    />
                  )}
                </div>

                {/* Wizard Navigation Footer */}
                <div className="flex items-center justify-between pt-6">
                  <button 
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="px-6 py-3 rounded-xl font-bold border-2 border-[#E9ECEF] text-[#6C757D] hover:bg-[#F8F9FA] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button 
                    onClick={nextStep}
                    disabled={currentStep === visibleSteps.length - 1}
                    className="px-8 py-3 bg-[#0D6EFD] text-white rounded-xl font-bold hover:bg-[#0B5ED7] transition-all shadow-lg shadow-[#0D6EFD]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {activeMenu === 'create-application' && (
              <motion.div
                key="create-application"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CreateApplicationView />
              </motion.div>
            )}

            {activeMenu === 'settings' && <SettingsView config={config} setConfig={setConfig} />}
            
            {activeMenu === 'history' && <HistoryView onRestore={handleHistoryRestore} />}
            
            {activeMenu === 'registry' && <RegistryView />}
            
            {activeMenu === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 pb-20"
              >
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-[#1A1A1A]">Capability Catalog</h2>
                  <p className="text-[#6C757D]">Browse all capability layers and providers loaded dynamically from YAML.</p>
                </div>
                <CapabilityLayersBrowser />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
