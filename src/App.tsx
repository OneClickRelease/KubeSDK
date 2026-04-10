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

// Wizard Steps
import { SourceStep } from './components/wizard/steps/SourceStep';
import { ModeStep } from './components/wizard/steps/ModeStep';
import { ImportStep } from './components/wizard/steps/ImportStep';
import { UploadStep } from './components/wizard/steps/UploadStep';
import { ModelStep } from './components/wizard/steps/ModelStep';
import { MappingStep } from './components/wizard/steps/MappingStep';
import { LaptopStep } from './components/wizard/steps/LaptopStep';
import { FeasibilityStep } from './components/wizard/steps/FeasibilityStep';
import { ValidationStep } from './components/wizard/steps/ValidationStep';
import { DeploymentStep } from './components/wizard/steps/DeploymentStep';

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
    nextStep: baseNextStep,
    prevStep
  } = useWizard();

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

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus(['Initializing k3d cluster...', 'Creating namespaces...', 'Applying base policies...']);
    const steps = ['Deploying infra components...', 'Deploying app workloads...', 'Verifying readiness...', 'Cluster ready!'];
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeploymentStatus(prev => [...prev, step]);
    }
    setIsDeploying(false);
    setIsReady(true);
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
          activeMenu === 'define' && ['model', 'mapping', 'feasibility', 'laptop'].includes(visibleSteps[currentStep]?.id) ? "max-w-[1800px]" : "max-w-5xl"
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
                    <SourceStep source={config.wizard.source} onSourceChange={handleSourceChange} />
                  )}
                  {visibleSteps[currentStep].id === 'mode' && <ModeStep />}
                  {visibleSteps[currentStep].id === 'import' && (
                    <ImportStep 
                      config={config} 
                      setConfig={setConfig} 
                      isFetching={isFetching} 
                      onFetchCluster={handleFetchCluster} 
                    />
                  )}
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
                  {visibleSteps[currentStep].id === 'laptop' && (
                    <LaptopStep config={config} setConfig={setConfig} />
                  )}
                  {visibleSteps[currentStep].id === 'feasibility' && (
                    <FeasibilityStep config={config} isValidating={isValidating} />
                  )}
                  {visibleSteps[currentStep].id === 'validation' && <ValidationStep />}
                  {visibleSteps[currentStep].id === 'deployment' && (
                    <DeploymentStep 
                      isReady={isReady}
                      isDeploying={isDeploying}
                      deploymentStatus={deploymentStatus}
                      modelYamlContent={modelYamlContent}
                      onDeploy={handleDeploy}
                      onDirectDeploy={() => alert('SDK link successful')}
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

            {activeMenu === 'settings' && <SettingsView />}
            
            {(activeMenu === 'history' ) && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center border border-[#E9ECEF]">
                  <Activity size={32} className="text-[#ADB5BD]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">No History Found</h3>
                  <p className="text-[#6C757D]">Previous simulation runs will appear here once completed.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
