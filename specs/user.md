### AI specification — SDK “New Menu” (capability-driven code generator)

This spec defines a user‑facing **“New Project / Add Capability”** menu for an SDK generator (Spring Initializr‑style). It covers goals, user journeys, UI patterns (palettes & stacks), data model, backend generation flow, integration points, and non‑functional requirements so the team can implement a production‑grade feature.

---

### 1. Goals and success criteria

| **Goal** | **Metric / Acceptance** |
|---|---|
| **Fast project bootstrap** | Create a working project scaffold in < 30s for common combos |
| **Capability-first selection** | Users can pick capabilities from a visual catalog (palettes/stacks) |
| **Correct code injection** | Generated project contains language/framework specific code, configs, and samples for each selected capability |
| **Low friction UX** | Single page flow with progressive disclosure; < 4 clicks to generate a starter project |
| **Extensible registry** | New capabilities can be added via YAML manifest without code changes |

**Quick verdict:** Deliver a single‑page app with a left palette (capability categories), central canvas (stack builder), right panel (configuration & preview), and a bottom action bar (generate, download, open in IDE).

---

### 2. Personas and user flows

#### Primary personas
- **Developer (fast bootstrap)** — wants a runnable project with minimal choices.
- **Platform engineer (policy aware)** — selects capabilities with HA/infra constraints and compliance.
- **Architect (catalog curator)** — adds/edits capabilities in the registry.

#### Key flows (ordered)
1. **New Project** — choose language, build tool, framework.  
2. **Select Capabilities** — open **Capability Catalog** palette; drag capabilities into the **Stack** canvas or click to add.  
3. **Configure Capability** — right panel shows capability metadata, minimal resources, dependencies, and optional toggles (HA, replication, region).  
4. **Preview & Validate** — live dependency graph and conflict warnings.  
5. **Generate** — choose output (zip, Git repo, open in IDE). Project scaffold includes injected code, config, and sample files.  
6. **Save Template** — user can save stack as a template for reuse.

---

### 3. UI design, components, and UX patterns

#### Layout
- **Left: Capability Catalog (Palette)** — searchable, filterable by category, tags, and maturity.  
- **Center: Stack Canvas** — visual stack builder; shows layers (Orchestrator, Storage, Database, Messaging, Security, AI/ML, Monitoring, Applications, Data).  
- **Right: Capability Inspector** — metadata, minimal resources, dependencies, HA recommendation, sample code links, toggles for optional features.  
- **Bottom: Action Bar** — Generate, Validate, Save Template, Share.

#### Visual patterns
- **Palettes & Stacks**: capabilities appear as cards with icon, short description, and tags. Dragging a card onto a stack column adds it. Stacks are vertical lanes representing layers.
- **Dependency graph overlay**: small graph icon on canvas opens a modal showing dependency edges and missing prerequisites.
- **Capability badges**: show **resources**, **deps**, **HA** as small chips on each card.
- **Progressive disclosure**: show minimal info by default; expand to show sample code and config templates.
- **Conflict resolution**: inline warnings with suggested fixes (e.g., incompatible versions, missing runtime).

#### Accessibility & responsiveness
- Keyboard navigation for palette and canvas.
- High contrast mode and ARIA labels for drag/drop.
- Mobile: simplified flow — select language → pick capabilities via list → generate.

---

### 4. Capability Catalog UX and data model

#### Catalog UX rules
- **Primary view**: grid of capability cards grouped by layer.  
- **Search & filters**: by name, tags (e.g., “S3-compatible”, “Kubernetes-native”), language support, license.  
- **Stacks**: users can save stacks (named templates) and share them.  
- **Card details**: open inspector with full metadata and sample file links.

#### Canonical capability manifest (YAML) — single provider entry example

```yaml
# capabilities/<layer>/<provider>.yaml
name: "MinIO"
layer: "object-storage"
parent: "Storage"
description: "Open-source high-performance object storage compatible with S3 API."
image_url: "images/minio.png"
version: "v1"
latest_version: "2026.1"
license_conditions: "Apache License"
protocols_supported: ["S3 API","HTTP"]
default_ports: [443,80]
resources:
  vcpu: "4"
  memory: "8Gi"
  disk: "200Gi"
dependencies:
  - "Docker or Kubernetes runtime"
  - "Persistent volumes provisioned"
ha_recommendation: "Deploy MinIO in distributed mode with 4+ nodes."
languages:
  java:
    frameworks: ["Spring Boot"]
    sample_code: "samples/java/storage/object-storage/minio/sample.yaml"
    config_template: "samples/java/storage/object-storage/minio/config.mustache"
  python:
    frameworks: ["FastAPI"]
    sample_code: "samples/python/storage/object-storage/minio/sample.yaml"
    config_template: "samples/python/storage/object-storage/minio/config.mustache"
ui:
  tags: ["s3-compatible","on-prem","k8s"]
  maturity: "stable"
  palette_icon: "minio"
```

**Notes:** the UI reads these manifests to render cards, inspector details, and to drive generation logic.

#### Registry model (DB / storage)
- **Capability** (id, name, layer, description, manifest_path, tags, maturity, icon)
- **LanguageSupport** (capability_id, language, frameworks[], sample_paths[])
- **StackTemplate** (id, name, owner, capabilities[], created_at)
- **Versioning**: manifest files stored in Git; UI supports manifest updates and rollback.

---

### 5. SDK generation engine — backend architecture & code injection

#### Components
- **Registry service** — serves capability manifests and resolves dependencies.
- **Template engine** — language/framework templates (mustache/handlebars/Jinja) for files and config.
- **Injector** — merges capability templates into project scaffold (code snippets, config fragments, Dockerfiles, CI).
- **Builder** — optional: runs build (Maven/Gradle/npm) and returns artifact or logs.
- **Validation service** — checks compatibility, missing dependencies, resource constraints.
- **Telemetry & audit** — logs generation events, selected capabilities, and template versions.

#### API surface (selected endpoints)

| **Endpoint** | **Method** | **Purpose** |
|---|---:|---|
| `/api/registry/capabilities` | GET | List capabilities with filters |
| `/api/registry/capability/{id}` | GET | Get manifest and UI metadata |
| `/api/stacks/validate` | POST | Validate stack (capabilities + language + build tool) |
| `/api/stacks/generate` | POST | Generate project scaffold (returns zip or repo link) |
| `/api/templates/save` | POST | Save stack as template |

#### Generation flow (sequence)
1. **Client** posts selected language, build tool, frameworks, and capability IDs to `/api/stacks/validate`.  
2. **Registry** resolves manifests, flattens dependencies, and returns validation result and warnings.  
3. **Client** requests `/api/stacks/generate` with final options (HA toggles, region, resource overrides).  
4. **Template engine** composes base project (language + build tool + framework) and **injects** capability fragments in deterministic locations:
   - **src/**: capability sample code (namespaced)
   - **config/**: merged config files (application.yml, env files)
   - **docker/**: Dockerfile and k8s manifests (if selected)
   - **ci/**: CI pipeline snippets (GitHub Actions, GitLab CI)
   - **README.md**: list of selected capabilities and run instructions
5. **Builder** optionally runs a dry build and returns logs.  
6. **Artifact** (zip or Git repo) is returned to user.

#### Injection rules and conflict resolution
- **Deterministic insertion points**: templates define anchors (e.g., `// CAPABILITY:LOGGING`) where code is appended.  
- **Config merging**: use layered merge strategy (base ← framework ← capability ← user overrides). YAML/JSON merges must preserve arrays with deduplication.  
- **Version pinning**: if two capabilities require different versions of the same library, validation returns conflict with suggested resolution (upgrade/downgrade or alternative capability).

---

### 6. Implementation recommendations, non‑functional requirements, and rollout

#### Recommended tech stack
- **Frontend**: React + TypeScript, Next.js (SSR optional), Tailwind CSS, DnD: `react-beautiful-dnd` or `dnd-kit`, Monaco editor for preview.  
- **Backend**: Node.js (TypeScript) or Go; template engine: Mustache/Handlebars/Jinja; storage: Git-backed manifest store + PostgreSQL for metadata.  
- **Code generation**: run in isolated containers (Docker) for security; use ephemeral build workers.  
- **Authentication**: OAuth2 / SSO (Keycloak) for template saving and sharing.

#### Observability & security
- **Audit trail**: record who generated what and which manifest versions were used.  
- **Secrets**: never inject secrets into generated code; provide placeholders and guidance to use Secrets Manager / Vault.  
- **Policy enforcement**: integrate OPA to block disallowed capability combinations (e.g., unsupported license + enterprise-only libs).

#### Performance & scaling
- Cache rendered templates per (language, framework, capability set) key to speed repeated generation.  
- Use worker pool for builds; autoscale based on queue length.

#### Testing & QA
- **Unit tests** for manifest parsing and template injection.  
- **Integration tests** that generate projects for common stacks and run a build.  
- **E2E tests** for the UI flows (add capability, configure, generate).

#### Rollout plan (phased)
1. **MVP**: REST API + single‑page UI with core layers (Kubernetes, Storage, DB, Messaging, Security). Basic generation to zip.  
2. **Phase 2**: Add preview build, templates, and saved stacks.  
3. **Phase 3**: Enterprise features — policy enforcement, audit, multi‑tenant registry, IDE integration.

---

### Appendix — Example UI interactions and microcopy

- **Palette card microcopy**:  
  **MinIO** — *S3-compatible object storage; distributed mode recommended for HA.*  
  **Button**: *Add to stack*  
  **Inspector header**: **MinIO — resources: 4 vCPU, 8Gi RAM, 200Gi disk**

- **Validation warning example**:  
  **Warning**: *Selected: MinIO requires persistent volumes. No storage class selected. Add a storage class or choose a managed object store.*

- **Generate modal**: shows **project name**, **language**, **build tool**, **capabilities summary**, **estimated generation time**, and **advanced options** (include CI, include Docker, run build).

