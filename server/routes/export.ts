import { Router } from "express";
import multer from "multer";
import yaml from "js-yaml";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import mustache from "mustache";
import { Component, KubeSDKLocalRun } from "../../src/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Offline Cluster Upload & YAML Parsing
router.post("/upload-export", upload.single("export"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    const components: Component[] = [];
    const namespaces = new Set<string>();
    
    // Parse kind whitelist from body
    let whitelist: string[] = ['pod', 'service', 'ingress', 'configmap', 'secret', 'namespace', 'deployment', 'statefulset', 'daemonset'];
    if (req.body.kindWhitelist) {
      try {
        whitelist = JSON.parse(req.body.kindWhitelist);
      } catch (e) {
        console.error("Failed to parse kindWhitelist from request body", e);
      }
    }

    zipEntries.forEach(entry => {
      if (!entry.isDirectory && entry.entryName.endsWith('.yaml')) {
        try {
          const content = entry.getData().toString('utf8');
          yaml.loadAll(content, (doc: any) => {
            const processResource = (res: any) => {
              if (res && res.kind && res.metadata && res.metadata.name) {
                const kindStr = res.kind.toLowerCase();
                
                // Enforcement of Kind Whitelist
                if (!whitelist.includes(kindStr)) {
                  return;
                }

                const ns = res.metadata.namespace || 'default';
                
                let kind: 'workload' | 'infra' | 'capability' = 'infra';
                let category = 'unknown';

                if (['replicaset', 'deployment', 'statefulset', 'daemonset', 'job', 'cronjob'].includes(kindStr)) {
                  // Strictly ignore higher-level controllers. Pod is the sole canonical workload source.
                  return;
                }

                if (kindStr === 'pod') {
                  kind = 'workload';
                  category = 'application';
                } else if (kindStr === 'service') {
                  kind = 'workload';
                  category = 'service';
                } else if (['ingress', 'endpoints', 'endpointslice'].includes(kindStr)) {
                  kind = 'infra';
                  category = 'ingress';
                } else if (['configmap', 'secret'].includes(kindStr)) {
                  kind = 'infra';
                  category = 'config';
                } else if (kindStr === 'namespace') {
                  kind = 'infra';
                  category = 'namespace';
                  namespaces.add(res.metadata.name);
                }

                if (category !== 'unknown') {
                  if (kindStr !== 'namespace') {
                    namespaces.add(ns);
                  }

                  let properties: any = {};
                  let cpu = '100m';
                  let memory = '128Mi';

                  if (category === 'application') {
                    const spec = res.spec?.template?.spec || res.spec;
                    if (spec?.containers && spec.containers.length > 0) {
                      const container = spec.containers[0];
                      properties.image = container.image;
                      properties.imagePullPolicy = container.imagePullPolicy || 'Always';
                      properties.env = container.env || [];
                      
                      // Filter out ephemeral mounts
                      properties.volumeMounts = (container.volumeMounts || []).filter((m: any) => 
                        !/^kube-api-access-/.test(m.name) && !/^default-token-/.test(m.name)
                      );
                      
                      // Capture and filter volumes
                      properties.volumes = (spec.volumes || []).filter((v: any) => 
                        !/^kube-api-access-/.test(v.name) && !/^default-token-/.test(v.name)
                      );

                      properties.ports = container.ports || [];
                      
                      const reqs = container.resources?.requests;
                      if (reqs) {
                        cpu = reqs.cpu || cpu;
                        memory = reqs.memory || memory;
                      }
                    }
                    properties.sourceKind = res.kind;
                    properties.labels = res.metadata.labels || {};
                  } else if (category === 'service') {
                    if (res.spec?.ports && res.spec.ports.length > 0) {
                      properties.port = res.spec.ports[0].port;
                      properties.targetPort = res.spec.ports[0].targetPort || res.spec.ports[0].port;
                    }
                    properties.serviceType = res.spec?.type || 'ClusterIP';
                    properties.clusterIP = res.spec?.clusterIP;
                    properties.selector = res.spec?.selector || {};
                  } else if (category === 'ingress') {
                    if (res.spec?.rules && res.spec.rules.length > 0) {
                      properties.hostname = res.spec.rules[0].host;
                      const paths = res.spec.rules[0].http?.paths;
                      if (paths && paths.length > 0) {
                        properties.path = paths[0].path;
                        properties.targetService = paths[0].backend?.service?.name || paths[0].backend?.serviceName;
                      }
                    }
                  } else if (category === 'config') {
                    properties.data = res.data || res.stringData || {};
                  }

                  const readableId = (category === 'application' && res.metadata.labels?.app) 
                    ? res.metadata.labels.app 
                    : res.metadata.name;

                  components.push({
                    id: readableId,
                    kind,
                    namespace: kindStr === 'namespace' ? 'cluster' : ns,
                    category,
                    mandatory: true,
                    runtimeClass: kind === 'workload' ? 'application' : 'infra',
                    properties,
                    resources: {
                      original: {
                        cpu,
                        memory,
                        replicas: res.spec?.replicas || 1
                      },
                      sdk: {
                        cpu: '100m',
                        memory: '128Mi',
                        replicas: 1
                      }
                    }
                  });
                }
              }
            };

            if (doc && doc.items && Array.isArray(doc.items)) {
              doc.items.forEach(processResource);
            } else {
              processResource(doc);
            }
          });
        } catch (e) {
          console.error(`Failed to parse yaml entry ${entry.entryName}`, e);
        }
      }
    });

    namespaces.forEach(ns => {
      if (!components.find(c => c.kind === 'infra' && c.category === 'namespace' && c.id === ns)) {
        components.push({
           id: ns,
           kind: 'infra',
           namespace: 'cluster',
           category: 'namespace',
           mandatory: true,
           runtimeClass: 'infra',
           resources: { 
             original: { cpu: '0', memory: '0', replicas: 1 },
             sdk: { cpu: '0', memory: '0', replicas: 1 } 
           }
        });
      }
    });

    const uniqueComps = new Map<string, Component>();
    components.forEach(c => {
      const key = `${c.namespace}/${c.category}/${c.id}`;
      if (!uniqueComps.has(key)) {
        uniqueComps.set(key, c);
      }
    });

    const finalComponents = Array.from(uniqueComps.values());

    finalComponents.forEach(comp => {
      if (comp.category === 'service' && comp.properties?.selector && Object.keys(comp.properties.selector).length > 0) {
        const selector = comp.properties.selector;
        const targetPod = finalComponents.find(c => {
          if (c.category !== 'application' || c.namespace !== comp.namespace) return false;
          const podLabels = c.properties?.labels || {};
          return Object.entries(selector).every(([key, value]) => podLabels[key] === value);
        });

        if (targetPod) {
          comp.properties.targetApp = targetPod.id;
        }
      }
    });

    res.json({
      status: 'success',
      components: finalComponents,
      namespaces: Array.from(namespaces)
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Deployment Generation logic
router.post("/generate", (req, res) => {
  const run: KubeSDKLocalRun = req.body;
  const runtime = run.runtimeExecution?.type || 'k3d';
  
  const simulationManifest = yaml.dump(run);
  const files = [];

  if (runtime === 'k3d') {
    const k3dConfig = yaml.dump({
      apiVersion: 'k3d.io/v1alpha4',
      kind: 'Simple',
      metadata: { name: run.runtimeExecution?.cluster?.name || 'kubesdk-cluster' },
      servers: 1,
      agents: 2,
      image: `rancher/k3s:${run.runtimeExecution?.cluster?.version || 'latest'}`,
      ports: [
        { port: '8080:80', nodeFilters: ['loadbalancer'] }
      ]
    });

    files.push(
      { path: 'k3d-config.yaml', content: k3dConfig },
      { path: 'simulation.yaml', content: simulationManifest },
      { path: 'deploy.sh', content: '#!/bin/bash\nk3d cluster create --config k3d-config.yaml\nkubectl apply -f simulation.yaml' }
    );
  } else if (runtime === 'inbuild-k3s') {
    files.push(
      { path: 'simulation.yaml', content: simulationManifest },
      { path: 'deploy.sh', content: '#!/bin/bash\n# In-built K3s (Docker Compose combined mode)\n# Run: docker compose up -d --build\n# Then trigger deployment from the KubeSDK UI at http://localhost:3000\nkubectl apply -f simulation.yaml' }
    );
  }

  res.json({ files });
});

router.post("/stacks/generate", (req, res) => {
  try {
    const { projectName, namespace, app } = req.body;
    if (!projectName || !namespace || !app || !app.name) {
      return res.status(400).json({ error: "Missing required parameters: projectName, namespace, app.name" });
    }

    const { 
      name, language, framework, buildTool, port = 8080, image = "nginx:alpine", capabilities = [], envVars = [],
      packageName = "com.example.demo", groupId = "com.example", artifactId = "demo",
      nodeEntrypoint = "index.js", goModuleName = name, pythonVersion = "3.9"
    } = app;

    const zip = new AdmZip();
    
    // Load registry to resolve capability configs and snippets
    const REGISTRY_FILE = path.join(process.cwd(), 'registry.json');
    let registryData: any[] = [];
    if (fs.existsSync(REGISTRY_FILE)) {
      try {
        registryData = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
      } catch (err) {
        console.error("Failed to parse registry.json", err);
      }
    }

    // Resolve capabilities
    const resolvedDeps: string[] = [];
    const resolvedEnv: { key: string; value: string }[] = [...envVars];
    const resolvedSnippets: string[] = [];

    capabilities.forEach((cap: any) => {
      const regCap = registryData.find((rc: any) => rc.id === cap.id || rc.serviceId === cap.id);
      if (regCap) {
        let matchedPayload: any = null;
        if (regCap.comboPayloads) {
          const keys = Object.keys(regCap.comboPayloads);
          const bestKey = keys.find(k => {
            const kl = k.toLowerCase();
            return kl.includes(language.toLowerCase()) && 
                   kl.includes(framework.toLowerCase()) && 
                   (buildTool ? kl.includes(buildTool.toLowerCase()) : true);
          }) || keys.find(k => {
            const kl = k.toLowerCase();
            return kl.includes(language.toLowerCase()) && kl.includes(framework.toLowerCase());
          }) || keys[0];

          if (bestKey) {
            matchedPayload = regCap.comboPayloads[bestKey];
          }
        }

        const configContext = cap.config || regCap.config || {};
        
        // Process payload
        if (matchedPayload) {
          if (matchedPayload.dependencies) {
            resolvedDeps.push(matchedPayload.dependencies);
          }
          if (Array.isArray(matchedPayload.envVars)) {
            matchedPayload.envVars.forEach((ev: any) => {
              try {
                const renderedVal = mustache.render(ev.value, configContext);
                resolvedEnv.push({ key: ev.key, value: renderedVal });
              } catch {
                resolvedEnv.push({ key: ev.key, value: ev.value });
              }
            });
          }
          if (matchedPayload.snippetTemplate) {
            try {
              const snippet = mustache.render(matchedPayload.snippetTemplate, configContext);
              resolvedSnippets.push(snippet);
            } catch {
              resolvedSnippets.push(matchedPayload.snippetTemplate);
            }
          }
        }
      }
    });

    // 1. Generate main app files
    let appContent = "";
    let buildFile = "";
    let buildFileName = "";
    let dockerfile = "";

    const langLower = language.toLowerCase();
    
    if (langLower === "python") {
      appContent = `
# Generated by KubeSDK Simulator for project ${projectName}
from fastapi import FastAPI
import os

app = FastAPI(title="${name}")

@app.get("/")
def read_root():
    return {"message": "Hello World from ${name} running in namespace ${namespace}!"}

@app.get("/health")
def health():
    return {"status": "UP"}

# --- Capability Integrations ---
${resolvedSnippets.join("\n\n")}
`;
      buildFileName = "requirements.txt";
      buildFile = ["fastapi", "uvicorn", ...resolvedDeps].join("\n");
      
      dockerfile = `FROM python:${pythonVersion}-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]
`;
      zip.addFile("main.py", Buffer.from(appContent, 'utf-8'));
    } else if (langLower === "nodejs" || langLower === "javascript") {
      appContent = `
// Generated by KubeSDK Simulator for project ${projectName}
const express = require('express');
const app = express();
const PORT = process.env.PORT || ${port};

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Hello World from ${name} running in namespace ${namespace}!" });
});

app.get('/health', (req, res) => {
  res.json({ status: "UP" });
});

// --- Capability Integrations ---
${resolvedSnippets.join("\n\n")}

app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});
`;
      buildFileName = "package.json";
      const pkgJson = {
        name: name,
        version: "1.0.0",
        description: `Scaffolded express app for ${name}`,
        main: nodeEntrypoint,
        scripts: {
          start: `node ${nodeEntrypoint}`
        },
        dependencies: {
          express: "^4.18.2"
        }
      };
      // Merge other deps from resolvedDeps
      resolvedDeps.forEach(d => {
        const parts = d.split('@');
        const depName = parts[0].trim();
        const depVer = parts[1] ? parts[1].trim() : "latest";
        if (depName) (pkgJson.dependencies as any)[depName] = depVer;
      });
      buildFile = JSON.stringify(pkgJson, null, 2);
      
      dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${port}
CMD ["npm", "start"]
`;
      zip.addFile(nodeEntrypoint, Buffer.from(appContent, 'utf-8'));
    } else if (langLower === "java") {
      appContent = `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/")
    public String hello() {
        return "Hello World from ${name} running in namespace ${namespace}!";
    }

    @GetMapping("/health")
    public String health() {
        return "{\\"status\\":\\"UP\\"}";
    }
}
`;
      buildFileName = "pom.xml";
      buildFile = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${artifactId}</name>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <!-- Dynamic Capability Dependencies -->
        ${resolvedDeps.join("\n        ")}
    </dependencies>
</project>
`;
      dockerfile = `FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "app.jar"]
`;
      
      const appProperties = `
# Consolidated Config for project ${projectName}
server.port=${port}

# --- Capability Integrations ---
${resolvedSnippets.join("\n\n")}
`;
      const javaPackagePath = packageName.replace(/\./g, "/");
      zip.addFile(`src/main/java/${javaPackagePath}/DemoApplication.java`, Buffer.from(appContent, 'utf-8'));
      zip.addFile("src/main/resources/application.properties", Buffer.from(appProperties, 'utf-8'));
    } else {
      // Default to Go
      appContent = `package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello World from ${name} running in namespace ${namespace}!")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("{\\"status\\":\\"UP\\"}"))
	})

	fmt.Println("Server starting on port ${port}...")
	http.ListenAndServe(":${port}", nil)
}
`;
      buildFileName = "go.mod";
      buildFile = `module ${goModuleName}

go 1.20
`;
      dockerfile = `FROM golang:1.20-alpine
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go build -o main .
EXPOSE ${port}
CMD ["./main"]
`;
      zip.addFile("main.go", Buffer.from(appContent, 'utf-8'));
    }

    zip.addFile(buildFileName, Buffer.from(buildFile, 'utf-8'));
    zip.addFile("Dockerfile", Buffer.from(dockerfile, 'utf-8'));

    const k8sDeployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          app: name,
          project: projectName
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: name
          }
        },
        template: {
          metadata: {
            labels: {
              app: name
            }
          },
          spec: {
            containers: [
              {
                name: name,
                image: image,
                ports: [
                  {
                    containerPort: port
                  }
                ],
                env: resolvedEnv.map(e => ({ name: e.key, value: String(e.value) }))
              }
            ]
          }
        }
      }
    };

    const k8sService = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: name,
        namespace: namespace,
        labels: {
          app: name
        }
      },
      spec: {
        type: "ClusterIP",
        ports: [
          {
            port: 80,
            targetPort: port
          }
        ],
        selector: {
          app: name
        }
      }
    };

    const k8sManifest = yaml.dump(k8sDeployment) + "---\n" + yaml.dump(k8sService);
    zip.addFile("k8s/deployment.yaml", Buffer.from(k8sManifest, 'utf-8'));

    const readme = `# Application: ${name}
Generated by KubeSDK Simulator.

## Details
- **Project**: ${projectName}
- **Namespace**: ${namespace}
- **Language**: ${language}
- **Framework**: ${framework}
- **Build Tool**: ${buildTool}
- **Port**: ${port}
- **Capabilities Attached**:
${capabilities.map((c: any) => `  - **${c.id}** (${c.displayName || 'attached'})`).join("\n")}

## How to Run locally (Docker)
1. Build the Docker image:
   \`\`\`bash
   docker build -t ${name}:latest .
   \`\`\`
2. Run the Docker container:
   \`\`\`bash
   docker run -p ${port}:${port} ${name}:latest
   \`\`\`

## Deployment in Kubernetes
Apply the deployment manifest to your cluster:
\`\`\`bash
kubectl apply -f k8s/deployment.yaml
\`\`\`
`;
    zip.addFile("README.md", Buffer.from(readme, 'utf-8'));

    const buffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-scaffold.zip"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
