# Flow 10: Custom LoRA Training & Deployment (One-Shot Spec)

**Status:** Draft → Implementation-Ready  
**Owner:** Graphix team  
**Scope:** Local-first LoRA training + global library + backend swap (RunPod ready)

---

## 1) Objectives & Constraints

**Objectives**
- Train and deploy custom LoRAs via wizard-style UI.
- Store LoRAs in a **global library** with project/character associations.
- Support **CPU / Unified Memory / GPU** training automatically.
- Keep backend **swappable** (local now, RunPod later) via config.
- Capture **sharing metadata** now without blocking local use.

**Constraints**
- Local use is always allowed (policy flags are informational only).
- Do not block future sharing/publishing integrations.
- Backend must be a drop-in swap (config/env var).
- Interfaces must be defined before implementation.

---

## 2) Flow Summary (User Journeys)

### Entry Points
1. Character editor → “Train LoRA”
2. Generation results → “Train from selected”
3. Library → “Train New”
4. Import existing LoRA

### Wizard Steps
0. Source selection  
1. Dataset curation  
2. Captions & trigger words  
3. Training config (backend + compute mode)  
4. Training run + progress  
5. Evaluate & deploy  

---

## 3) Exhaustive UI/UX Sketches

### 3.1 Global LoRA Library
```
┌────────────────────────────────────────────────────────────────┐
│  LoRA Library                             [+ Train] [+ Import] │
├────────────────────────────────────────────────────────────────┤
│  Search [.............]  Filter: [All▼] [Character▼] [Style▼]  │
│  Tags: [otter] [romantic] [illustrious] [sdxl] [nsfw]          │
│────────────────────────────────────────────────────────────────│
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ Marina LoRA  │ │ Yacht Style  │ │ Otter Poses  │           │
│  │ [preview]    │ │ [preview]    │ │ [preview]    │           │
│  │ Trigger:     │ │ Trigger:     │ │ Trigger:     │           │
│  │ marina_ottr  │ │ yacht_art    │ │ otter_pose   │           │
│  │ Base: SDXL   │ │ Base: SDXL   │ │ Base: ILXL   │           │
│  │ Strength: .8 │ │ Strength: .6 │ │ Strength: .7 │           │
│  │ [Use] [⋯]    │ │ [Use] [⋯]    │ │ [Use] [⋯]    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Wizard: Source Selection
```
┌────────────────────────────────────────────────────────────────┐
│  Train a LoRA — Choose Source                                  │
├────────────────────────────────────────────────────────────────┤
│  ( ) From Character          ( ) From Generation History       │
│  ( ) Import Images           ( ) Upload Dataset (zip)           │
│  ( ) Import Existing LoRA                                        │
│                                                                │
│  [Next]                                                         │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Wizard: Dataset Curation
```
┌────────────────────────────────────────────────────────────────┐
│  Step 1 — Dataset Curation                                      │
├────────────────────────────────────────────────────────────────┤
│  Selected images: 24 (recommended 15–30 for characters)        │
│  Warnings: 3 duplicates, 5 low-res, 2 blur candidates          │
│  [Auto Clean] [Remove Low-Res] [Duplicate Finder] [Crop 1:1]   │
│  Grid of thumbnails with type tags                              │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 Wizard: Captions & Trigger Words
```
┌────────────────────────────────────────────────────────────────┐
│  Step 2 — Captions & Trigger Words                              │
├────────────────────────────────────────────────────────────────┤
│  Trigger word: [marina_ottr]  Aliases: [marina] [otter_girl]    │
│  Captioning mode: [Auto ▾] (BLIP / LLaVA / manual)              │
│  Guidance: 8–20 tokens, include trigger on all images           │
│  Image list | Caption editor                                    │
└────────────────────────────────────────────────────────────────┘
```

### 3.5 Wizard: Training Config
```
┌────────────────────────────────────────────────────────────────┐
│  Step 3 — Training Configuration                                │
├────────────────────────────────────────────────────────────────┤
│  Backend: [Diffusers ▼]     Compute: [Auto (CPU/MPS/GPU) ▼]     │
│  Preset: [Character Balanced ▼]                                 │
│  Base Model: [SDXL ▼]  Resolution: [1024]                       │
│  Rank: [32]  Alpha: [16]  LR: [1e-4]  Steps: [1800]             │
│  [Advanced ▾] [Save preset]                                     │
└────────────────────────────────────────────────────────────────┘
```

### 3.6 Wizard: Training Progress
```
┌────────────────────────────────────────────────────────────────┐
│  Step 4 — Training                                              │
├────────────────────────────────────────────────────────────────┤
│  Status: Training (42%)  ETA 12m  Compute: CPU (fallback)       │
│  Steps: 780/1800  Loss: 0.014                                   │
│  [Pause] [Stop] [View Logs]                                     │
└────────────────────────────────────────────────────────────────┘
```

### 3.7 Wizard: Evaluate & Deploy
```
┌────────────────────────────────────────────────────────────────┐
│  Step 5 — Evaluate & Deploy                                     │
├────────────────────────────────────────────────────────────────┤
│  Test prompts + preview grid                                    │
│  Default strength: [0.8]  Clip: [1.0]                           │
│  Associate to character: [Marina ✓]                             │
│  Save to library: [✓]                                           │
└────────────────────────────────────────────────────────────────┘
```

### 3.8 Share Modal (Future-ready, non-blocking)
```
┌────────────────────────────────────────────────────────────────┐
│  Share LoRA (Export Package)                                    │
├────────────────────────────────────────────────────────────────┤
│  Title: Marina LoRA                                             │
│  Description: ...                                               │
│  Triggers: marina_ottr, otter_girl                              │
│  Tags: [anthro] [romance] [sdxl]                                │
│  License: [Custom ▼]  NSFW: [ ]                                 │
│  [Export .zip] [Copy model card] [Publish (coming soon)]        │
└────────────────────────────────────────────────────────────────┘
```

---

## 4) Architecture (Swappable Backend)

### 4.1 Training Backend Interface
```typescript
export interface TrainingBackend {
  id: string;
  displayName: string;
  supports: {
    cpu: boolean;
    gpu: boolean;
    unifiedMemory: boolean;
    sdxl: boolean;
    sd15: boolean;
    flux: boolean;
  };
  validate(config: TrainingConfig): BackendValidation[];
  start(job: TrainingJobRequest): Promise<TrainingJobHandle>;
  cancel(jobId: string): Promise<void>;
  status(jobId: string): Promise<TrainingJobStatus>;
  stream(jobId: string): AsyncIterable<TrainingEvent>;
}
```

### 4.2 Backend Routing
- **Local-first** (Diffusers runner) is default.
- **RunPod** is the primary cloud backend for future (same API surface).
- Backend selection via env/config:
  - `TRAINING_BACKEND=local|runpod`
  - `RUNPOD_BASE_URL`, `RUNPOD_API_KEY`

### 4.3 Device Selection (Automatic)
- Backend auto-selects device via torch (`cuda` → `mps` → `cpu`).
- UI exposes “Compute Mode” but does not block.
- If MPS fallback is configured, Diffusers uses it automatically.

### 4.4 Streaming & Observability
- SSE channel for `progress`, `log`, `sample`, `complete`, `error`.
- Training logs saved to disk, referenced by job.

---

## 5) Data Model (Global Library + Associations)

### 5.1 Global Assets
**Existing:** `custom_assets` already stores LoRAs and embeddings.  
**Change:** make assets **global** and attach to projects via join table.

**Proposed changes:**
- `custom_assets.projectId` → nullable (asset can be global).
- New table: `project_assets` for associations.
- Keep `characters.lora` for direct character binding.

```typescript
export type ProjectAsset = {
  projectId: string;
  assetId: string;
  role: 'default' | 'favorite' | 'suggested';
  isActive: boolean;
  addedAt: Date;
};
```

### 5.2 Training Tables
```typescript
export type TrainingJob = {
  id: string;
  assetId?: string;
  backend: 'local' | 'runpod';
  computeMode: 'auto' | 'gpu' | 'mps' | 'cpu';
  status: 'queued' | 'running' | 'complete' | 'failed' | 'canceled';
  progress: number;
  config: Record<string, unknown>;
  logsPath?: string;
  startedAt?: Date;
  finishedAt?: Date;
};

export type TrainingDataset = {
  id: string;
  name: string;
  triggerWord: string;
  images: Array<{ path: string; caption: string; tags?: string[] }>;
  stats: { count: number; duplicates: number; lowRes: number };
};

export type TrainingSample = {
  jobId: string;
  prompt: string;
  imagePath: string;
  step: number;
  seed: number;
};
```

### 5.3 Sharing Metadata (Non-blocking)
```typescript
export type ShareMetadata = {
  trainedWords: string[];
  tags: string[];
  license?: {
    allowNoCredit?: boolean;
    allowCommercialUse?: string;
    allowDerivatives?: boolean;
    allowDifferentLicense?: boolean;
  };
  nsfw?: boolean;
  previewImages?: string[];
};
```

---

## 6) API Surface (REST + SSE)

### 6.1 Training
- `POST /api/lora/train`
  - body: `{ datasetId, config, backendId, computeMode }`
- `GET /api/lora/jobs/:id`
- `POST /api/lora/jobs/:id/cancel`
- `GET /api/lora/jobs/:id/stream` (SSE)

### 6.2 Library
- `GET /api/lora/library`
- `GET /api/lora/:id`
- `PATCH /api/lora/:id`
- `POST /api/lora/import`
- `POST /api/lora/:id/associate` (project)
- `DELETE /api/lora/:id/associate/:projectId`

---

## 7) Local vs RunPod Execution

### 7.1 Local (Diffusers Runner)
- Python runner invoked by server (spawned process).
- Reads a job JSON spec, writes output:
  - `.safetensors` file
  - `metadata.json`
  - sample grid images
  - training logs

### 7.2 RunPod (Future Default)
- Server submits job to RunPod endpoint.
- Poll job status / subscribe to RunPod logs.
- Download artifacts to local storage when complete.
- Same job schema as local runner for drop-in swap.

### 7.3 Config Switch
```bash
TRAINING_BACKEND=local
RUNPOD_BASE_URL=https://api.runpod.ai
RUNPOD_API_KEY=...
```

---

## 8) UX Details (Behavior & Guardrails)

**Dataset Curation**
- Dedupe candidates (hash + similarity).
- Low-res flag (below 768 or 1024).
- One-click auto-crop to square.

**Captioning**
- Auto-captions always include trigger word.
- Provide “Append trigger to all” action.

**Compute Mode**
- Auto selects device based on availability.
- CPU / MPS auto works without user input.
- Show ETA warnings but do not block.

**Policy Flags**
- Local use always allowed.
- Warnings displayed on “Share” only.

---

## 9) Granular Implementation Plan (EOD One-Shot)

### 9.1 Interfaces & Types (Define first)
- Add shared `TrainingBackend` interface in `packages/core`.
- Define `TrainingJob`, `TrainingDataset`, `TrainingSample`, `ShareMetadata`.
- Add API DTOs in `packages/server/src/openapi/schemas`.

### 9.2 Database & Migrations
- Migration: make `custom_assets.projectId` nullable.
- Create `project_assets` join table.
- Add `training_jobs`, `training_datasets`, `training_samples`.
- Add indices for `assetId`, `projectId`, `status`.

### 9.3 Core Services
- `TrainingService`: create job, update progress, finalize asset.
- `BackendRouterService`: selects backend via config.
- `AssetLibraryService`: list, filter, associate to project.

### 9.4 Server Layer (Hono)
- REST routes for training and library.
- SSE endpoint for job stream.
- RunPod client module (stubbed, no hard dependency).
- Local diffusers runner invocation (spawn + logs).

### 9.5 OpenAPI + Client
- Add schemas for training config + job status.
- Generate client types for UI hooks.

### 9.6 UI: Global Library
- New route: `Library > LoRAs`
- Filters, tags, project association toggles.
- Detail drawer (metadata + share export).

### 9.7 UI: Wizard
- Step 0: source selection
- Step 1: dataset curation (grid, tagging, crop)
- Step 2: captions & triggers (editor)
- Step 3: config (backend + compute + presets)
- Step 4: progress (SSE)
- Step 5: evaluate + deploy

### 9.8 UI: Character Integration
- Character editor: “Train LoRA” entry.
- Auto-associate after training.

### 9.9 UI: Generation Integration
- Selection UI → “Train from selected”.

### 9.10 Tests
- Unit: training config validation.
- Contract: training endpoints.
- E2E: wizard from character → library.

### 9.11 Docs
- Update `user-flows-spec.md` (Flow 10).
- Update `docs/UI-PLAN.md` with LoRA library/wizard.
- Add training backend config section to `README.md`.

---

## 10) Default Training Presets (CPU-friendly)

**Character Balanced (CPU)**
- Resolution: 512–768
- Rank: 16–32
- Steps: 800–1500
- Batch: 1, Grad Accum: 4–8
- LR: 1e-4 (adjust with alpha)

**Character Balanced (GPU)**
- Resolution: 1024
- Rank: 32
- Steps: 1500–3000
- Batch: 1–2

---

## 11) Non-Blocking Sharing

**Now**
- Capture metadata + previews.
- Export package for later upload.

**Later**
- Publish to Civitai/HF with policy gating.
- Enforce license only at upload time.

---

## 12) Done Definition

- Flow 10 added to user flows spec.
- LoRA training wizard shipped and functional.
- Local training works on CPU/MPS/GPU.
- RunPod switch is a config change only.
- Global library with project/character associations.
- Policy flags present, never blocking local use.

---

## 13) LoRA Studio (Standalone Module Strategy)

**Goal:** Make the LoRA training/library experience usable as a standalone “LoRA Studio” without microfrontend complexity.

### 13.1 Approach
- **Single codebase, modular surface** (no microfrontend runtime).
- **Dedicated route**: `/lora-studio` with its own minimal shell.
- **Embed in Graphix** by mounting the same module in the main app.
- **Same backend + storage** (local or RunPod) for both modes.

### 13.2 App Modes
```bash
APP_MODE=full        # Graphix full suite (default)
APP_MODE=lora-studio # LoRA Studio surface only
```

**Behavior**
- `full`: normal navigation + LoRA Studio as a section.
- `lora-studio`: only LoRA Library + Wizard + minimal settings.

### 13.3 Navigation Shell (Studio Mode)
- Top-level: Library, Train Wizard, Settings.
- No project/storyboard/panel navigation visible.
- Project association still supported via selectors.

### 13.4 Build/Deploy Notes
- Same build pipeline; flag-based routing to choose shell.
- Tauri not specialized (studio is just a different app mode).

### 13.5 Benefits
- **Low overhead** vs microfrontend.
- **Standalone viability** for Civitai creators.
- **Shared maintenance** with Graphix.
