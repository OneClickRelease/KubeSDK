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

  // 1b. Real-time Status Polling (30s) - Active on Step 8
  React.useEffect(() => {
    if (currentStep !== 8) return;
    
    console.log("Starting 30s health-check polling...");
    const interval = setInterval(() => {
      handleHealthCheck();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentStep, config.wizard.connectivity]);

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

  // Derived visible steps
  const visibleSteps = React.useMemo(() => WIZARD_STEPS.filter(step => {
    if (step.id === 'import' && config.wizard.source === 'manual') return false;
    if (step.id === 'upload' && config.wizard.source === 'live') return false;
    return true;
  }), [config.wizard.source]);

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
  const handleResetSession = () => {
    if (confirm('Reset all session data and start fresh?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_KEY);
      localStorage.removeItem(NS_KEY);
      window.location.reload();
    }
  };

  // Rendering logic
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex">
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

            {activeMenu === 'settings' && <SettingsView config={config} setConfig={setConfig} />}
            
            {activeMenu === 'history' && <HistoryView onRestore={handleHistoryRestore} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
