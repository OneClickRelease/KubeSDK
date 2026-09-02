import * as yaml from 'js-yaml';
import { KubeSDKLocalRun } from '../types';

export function generateYamlFromConfig(config: KubeSDKLocalRun): string {
  const ignoredNamespaces = config.wizard.ignoredNamespaces || [];
  const docs: any[] = [];
  
  // 0. CRD Definition (Ensure it exists)
  docs.push({
    apiVersion: 'apiextensions.k8s.io/v1',
    kind: 'CustomResourceDefinition',
    metadata: {
      name: 'localrundefinitions.kubesdk.dev',
    },
    spec: {
      group: 'kubesdk.dev',
      versions: [{
        name: 'v1alpha1',
        served: true,
        storage: true,
        schema: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                'x-kubernetes-preserve-unknown-fields': true,
              },
            },
          },
        },
      }],
      scope: 'Namespaced',
      names: {
        plural: 'localrundefinitions',
        singular: 'localrundefinition',
        kind: 'LocalRunDefinition',
        shortNames: ['lrd'],
      },
    },
  });

  // 1. Project Metadata & Dependency Graph
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
      components: config.components,
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
    
    // Custom User ENVs for this app
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
      const edges = config.dependencyGraph.edges.filter(e => e.from === app.id);
      edges.forEach(edge => {
        const target = config.components.find(c => c.id === edge.to);
        if (!target) return;
        const targetNS = target.namespace || 'cluster';
        if (!aggregatedEnv[appNS][targetNS]) aggregatedEnv[appNS][targetNS] = {};
        
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

      const nsComp = config.components.find(c => c.id === ns && c.category === 'namespace');
      const baseData: Record<string, string> = {};
      if (nsComp && nsComp.properties?.configSet) {
        nsComp.properties.configSet.split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#')).forEach(line => {
          const [key, ...vals] = line.split('=');
          if (key.trim()) baseData[key.trim()] = vals.join('=').trim();
        });
      }
      
      if (Object.keys(baseData).length > 0) {
      }

      if (aggregatedEnv[ns]) {
        Object.entries(aggregatedEnv[ns]).forEach(([targetNS, data]) => {
          if (Object.keys(data).length > 0) {
            docs.push({
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: { 
                name: targetNS,
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

  // 3. Components
  for (const comp of config.components) {
    if (comp.category === 'namespace') continue;
    if (comp.namespace && ignoredNamespaces.includes(comp.namespace)) continue;

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
    else if (comp.category === 'application' || comp.category === 'workload') {
      const appNS = comp.namespace || 'default';
      const envFrom: any[] = [];

      if (Object.keys(comp.properties?.customEnv || {}).length > 0) {
        envFrom.push({ configMapRef: { name: `${comp.id}-custom-config` } });
      }

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

      const resources = config.resourcePlan?.components[comp.id] || comp.resources?.sdk || comp.resources?.original;

      const pod: any = {
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
          volumes: comp.properties?.volumes || [],
          containers: [{
            name: comp.id,
            image: comp.properties?.image || 'example/app:1.0.0',
            imagePullPolicy: comp.properties?.imagePullPolicy || 'Always',
            env: comp.properties?.env || [],
            envFrom: envFrom,
            volumeMounts: (comp.properties?.volumeMounts || []).filter((m: any) => 
               !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name)
            ),
            ports: comp.properties?.ports || [],
            resources: {
              requests: {
                cpu: resources.cpu || '100m',
                memory: resources.memory || '128Mi'
              },
              limits: {
                cpu: resources.cpu || '200m',
                memory: resources.memory || '1Gi'
              }
            }
          }]
        }
      };

      if (comp.config?.configMaps?.length || comp.config?.secrets?.length) {
        comp.config.configMaps?.forEach(cm => {
          envFrom.push({ configMapRef: { name: cm } });
        });
        comp.config.secrets?.forEach(sec => {
          envFrom.push({ secretRef: { name: sec } });
        });
      }

      docs.push(pod);

      if (comp.helm) {
        docs.push({
          apiVersion: 'helm.toolkit.fluxcd.io/v2beta1',
          kind: 'HelmRelease',
          metadata: {
            name: `${comp.id}-helm`,
            namespace: comp.namespace,
            annotations
          },
          spec: {
            interval: '1m',
            chart: {
              spec: {
                chart: comp.helm.chart.path || comp.id,
                version: comp.helm.chart.version,
                sourceRef: {
                  kind: comp.helm.chart.source === 'git' ? 'GitRepository' : 'HelmRepository',
                  name: comp.helm.chart.repo
                }
              }
            },
            values: {
              // Extract basic overrides if any
              ...(comp.properties?.customEnv || {})
            }
          }
        });
      }
    }
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

  if (docs.length === 0) return '# Upload a cluster zip or define components to generate YAML.';
  return docs.map(d => yaml.dump(d)).join('\n---\n');
}
