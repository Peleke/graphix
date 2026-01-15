#!/bin/bash
# Create all 72 GitHub issues for Graphix
# Run from repo root: ./scripts/create-issues.sh

set -e

echo "Creating EPIC 1: Foundation Infrastructure..."

gh issue create --title "Project setup: Bun, TypeScript, Drizzle" \
  --label "infra,m1-static" \
  --body "Initialize Bun project with TypeScript, Drizzle ORM setup.

## Tasks
- [x] package.json with dependencies
- [x] tsconfig.json for Bun
- [x] drizzle.config.ts
- [ ] bun install

## Acceptance
- \`bun run typecheck\` passes
- \`bun run dev\` starts without errors"

gh issue create --title "Database schema: Projects, Characters, Storyboards, Panels" \
  --label "infra,m1-static,test-first" \
  --body "Drizzle schema for all core entities.

Depends on #1

## Entities
- Project (id, name, description, settings, timestamps)
- Character (id, projectId, name, profile, promptFragments, referenceImages, lora)
- Storyboard (id, projectId, name, description, timestamps)
- Panel (id, storyboardId, position, description, direction, generation, outputs)
- GeneratedImage (id, panelId, path, seed, prompt, metadata, rating)
- PageLayout (id, storyboardId, pageNumber, template, panelPlacements)

## Tests Required
- Schema validation tests
- Relation integrity tests"

gh issue create --title "DB client with Turso/SQLite toggle" \
  --label "infra,m1-static,test-first" \
  --body "libsql client with env-based storage mode.

Depends on #2

## Implementation
- Create \`src/db/client.ts\`
- Support STORAGE_MODE=turso|sqlite
- Connection pooling for Turso
- File-based for SQLite

## Tests Required
- Connection tests for both modes
- Toggle behavior tests"

gh issue create --title "Configuration module (env-based)" \
  --label "infra,m1-static" \
  --body "Central config for all env vars.

Depends on #1

## Config Sections
- storage (mode, tursoUrl, tursoToken, sqlitePath)
- comfyui (restUrl)
- cloudStorage (provider, bucket, localPath)
- server (port, mcpEnabled, restEnabled)

## Status: DONE
- [x] src/config.ts created"

gh issue create --title "ComfyUI HTTP client" \
  --label "infra,generation,m1-static,test-first" \
  --body "REST client to call comfyui-mcp.

Depends on #4

## Methods
- imagine(params) - full pipeline
- generateImage(params) - txt2img
- img2img(params)
- upscale(params)
- generateWithControlNet(params)
- listModels(), listLoras()

## Tests Required
- Mock server response tests
- Error handling tests
- Retry logic tests"

echo "Creating EPIC 2: Core Services..."

gh issue create --title "ProjectService: CRUD operations" \
  --label "api,test-first,m1-static" \
  --body "Project create/read/update/delete.

Depends on #3

## Methods
- create(data): Project
- getById(id): Project | null
- getAll(): Project[]
- update(id, data): Project
- delete(id): void

## Tests Required
- Unit tests for all CRUD ops
- Validation tests
- Not found handling"

gh issue create --title "CharacterService: CRUD + prompt fragments" \
  --label "api,test-first,m1-static" \
  --body "Character management with prompt injection.

Depends on #6

## Methods
- create(projectId, data): Character
- getById(id): Character | null
- getByProject(projectId): Character[]
- update(id, data): Character
- delete(id): void
- buildPromptFragments(character): { positive, negative }

## Tests Required
- CRUD operation tests
- Prompt fragment generation tests
- Project relation tests"

gh issue create --title "StoryboardService: CRUD + panel management" \
  --label "api,test-first,m1-static" \
  --body "Storyboard with panel array management.

Depends on #6

## Methods
- create(projectId, name, panelCount): Storyboard
- getById(id): Storyboard (with panels)
- getByProject(projectId): Storyboard[]
- update(id, data): Storyboard
- delete(id): void
- reorderPanels(id, newOrder): void

## Tests Required
- CRUD tests
- Panel creation on storyboard create
- Reordering tests"

gh issue create --title "PanelService: CRUD + generation tracking" \
  --label "api,test-first,m1-static" \
  --body "Panel management with output tracking.

Depends on #8

## Methods
- getById(id): Panel
- update(id, data): Panel
- setDescription(id, description, direction): Panel
- addOutput(id, generatedImage): Panel
- selectOutput(id, outputId): Panel
- getOutputs(id): GeneratedImage[]

## Tests Required
- Update tests
- Output management tests
- Selection tests"

gh issue create --title "GeneratedImageService: Store outputs + metadata" \
  --label "api,test-first,m1-static" \
  --body "Track all generation attempts.

Depends on #9

## Methods
- create(panelId, data): GeneratedImage
- getById(id): GeneratedImage
- getByPanel(panelId): GeneratedImage[]
- updateRating(id, rating): GeneratedImage
- addNotes(id, notes): GeneratedImage
- delete(id): void

## Tests Required
- CRUD tests
- Metadata storage tests
- Rating/notes update tests"

echo "Creating EPIC 3: REST API..."

gh issue create --title "Hono server setup + middleware" \
  --label "api,m1-static" \
  --body "Initialize Hono HTTP server with middleware.

Depends on #4

## Setup
- Hono app instance
- CORS middleware
- JSON body parsing
- Error handling middleware
- Request logging

## Routes Structure
- /api/projects
- /api/characters
- /api/storyboards
- /api/panels
- /api/generate"

gh issue create --title "REST routes: /projects" \
  --label "api,test-first,m1-static" \
  --body "Project CRUD endpoints.

Depends on #6, #11

## Endpoints
- POST /api/projects - create
- GET /api/projects - list all
- GET /api/projects/:id - get one
- PATCH /api/projects/:id - update
- DELETE /api/projects/:id - delete

## Tests Required
- Integration tests for all endpoints
- Validation error tests
- 404 handling tests"

gh issue create --title "REST routes: /characters" \
  --label "api,test-first,m1-static" \
  --body "Character CRUD endpoints.

Depends on #7, #11

## Endpoints
- POST /api/projects/:projectId/characters - create
- GET /api/projects/:projectId/characters - list by project
- GET /api/characters/:id - get one
- PATCH /api/characters/:id - update
- DELETE /api/characters/:id - delete

## Tests Required
- Integration tests
- Project relation tests
- Prompt fragment response tests"

gh issue create --title "REST routes: /storyboards" \
  --label "api,test-first,m1-static" \
  --body "Storyboard CRUD endpoints.

Depends on #8, #11

## Endpoints
- POST /api/projects/:projectId/storyboards - create
- GET /api/projects/:projectId/storyboards - list by project
- GET /api/storyboards/:id - get one (with panels)
- PATCH /api/storyboards/:id - update
- DELETE /api/storyboards/:id - delete
- POST /api/storyboards/:id/reorder - reorder panels

## Tests Required
- Integration tests
- Panel inclusion tests
- Reorder tests"

gh issue create --title "REST routes: /panels" \
  --label "api,test-first,m1-static" \
  --body "Panel management endpoints.

Depends on #9, #11

## Endpoints
- GET /api/panels/:id - get panel with outputs
- PATCH /api/panels/:id - update description/direction
- POST /api/panels/:id/select - select output
- GET /api/panels/:id/outputs - list outputs

## Tests Required
- Integration tests
- Output listing tests
- Selection tests"

gh issue create --title "REST routes: /generate" \
  --label "api,generation,test-first,m1-static" \
  --body "Image generation endpoints.

Depends on #10, #11

## Endpoints
- POST /api/panels/:id/generate - generate panel image(s)
  - body: { variants?: number, strategy?: string }
- POST /api/generate/preview - preview prompt without generating

## Tests Required
- Mock ComfyUI response tests
- Variant generation tests
- Error handling tests"

echo "Creating EPIC 4: Image Generation Pipeline..."

gh issue create --title "PromptBuilder: Assemble from chars + panel" \
  --label "generation,m1-static,test-first" \
  --body "Assemble optimized prompts from characters and panel data.

Depends on #7, #9

## Logic
1. Load panel description + direction
2. Load referenced characters
3. Inject character.promptFragments.positive
4. Inject character.profile (features, ageDescriptors)
5. Combine project.settings.defaultNegative + char negatives
6. Apply model-family-specific formatting

## Tests Required
- Prompt assembly tests
- Multi-character combination tests
- Negative prompt merging tests
- Model family formatting tests"

gh issue create --title "Single panel generation via comfyui-mcp" \
  --label "generation,test-first,m1-static" \
  --body "Generate single panel image through ComfyUI.

Depends on #5, #17

## Flow
1. Build prompt via PromptBuilder
2. Call comfyui client.imagine()
3. Store result as GeneratedImage
4. Return image path + metadata

## Tests Required
- End-to-end generation mock tests
- Error handling tests
- Metadata storage tests"

gh issue create --title "Variant generation: seed/cfg/sampler strategies" \
  --label "generation,m1-static,test-first" \
  --body "Batch generate variants with systematic parameter variation.

Depends on #18

## Strategies
- seed: Same everything, different seeds
- cfg: Vary CFG within range
- sampler: Try different samplers
- prompt_weight: Vary emphasis weights
- full: Systematic grid across params

## Tests Required
- Strategy parameter generation tests
- Batch execution tests
- Result aggregation tests"

gh issue create --title "Output storage + cloud upload integration" \
  --label "generation,infra,m1-static,test-first" \
  --body "Store generated images locally and/or cloud.

Depends on #10, #18

## Implementation
- Local file storage (default)
- GCP Cloud Storage upload
- Supabase Storage upload
- Signed URL generation

## Tests Required
- Local storage tests
- Mock cloud upload tests
- URL generation tests"

echo "Creating EPIC 5: MCP Server Layer..."

gh issue create --title "MCP server setup (stdio transport)" \
  --label "api,m1-static" \
  --body "Initialize MCP server for Claude Code integration.

Depends on #4

## Setup
- MCP Server instance
- stdio transport
- Tool registration
- Error handling

## Structure
- src/api/mcp/index.ts - server setup
- src/api/mcp/tools.ts - tool definitions"

gh issue create --title "MCP tools: project/character/storyboard" \
  --label "api,m1-static" \
  --body "MCP tools for project management.

Depends on #6, #7, #8, #21

## Tools
- project_create
- project_list
- character_create
- character_list
- storyboard_create
- storyboard_show"

gh issue create --title "MCP tools: panel describe/generate" \
  --label "api,generation,m1-static" \
  --body "MCP tools for panel operations.

Depends on #9, #18, #21

## Tools
- panel_describe
- panel_generate
- panel_select"

gh issue create --title "MCP tools: page layout/render" \
  --label "api,composition,m1-static" \
  --body "MCP tools for page composition.

Depends on #26, #21

## Tools
- page_layout
- page_render
- page_export"

echo "Creating EPIC 6: Page Composition..."

gh issue create --title "PageLayout schema + templates" \
  --label "composition,m1-static" \
  --body "Page layout data structures and template system.

Depends on #2

## Schema
- PageLayout entity
- Template format (JSON)
- Panel placement coordinates

## Templates
- 6-panel-left
- 6-panel-right
- full-spread
- 4-panel-grid
- custom"

gh issue create --title "Sharp/canvas renderer: composite panels" \
  --label "composition,m1-static,test-first" \
  --body "Render panels into page layout using Sharp.

Depends on #25

## Implementation
- Load panel images
- Apply template coordinates
- Composite with gutters/borders
- Export as single image

## Tests Required
- Image compositing tests
- Template application tests
- Output dimension tests"

gh issue create --title "Template library: 6-panel, full-spread, custom" \
  --label "composition,m1-static" \
  --body "Built-in page layout templates.

Depends on #25

## Templates
- 6-panel-left: 6 panels, speech bubbles left
- 6-panel-right: 6 panels, speech bubbles right
- full-spread: single panel full page
- 4-panel-grid: 2x2 grid
- manga-right-to-left: Japanese reading order
- custom: user-defined coordinates"

gh issue create --title "Export: final page at print resolution" \
  --label "composition,m1-static,test-first" \
  --body "Export composed pages at print-ready resolution.

Depends on #26

## Formats
- PNG (lossless)
- JPEG (web)
- PDF (print)

## Resolutions
- Web: 1200px width
- Print: 300 DPI @ letter/A4

## Tests Required
- Resolution accuracy tests
- Format conversion tests
- Multi-page PDF tests"

echo "Creating EPIC 7: Character Consistency (Phase 1)..."

gh issue create --title "[comfyui-mcp] IP-Adapter workflow" \
  --label "comfyui-mcp,consistency,m1-static" \
  --body "Add IP-Adapter workflow to comfyui-mcp.

## Workflow
- Load reference image
- Extract IP-Adapter embeddings
- Apply to generation pipeline

## Files
- workflows/ip-adapter.json
- workflows/ip-adapter-face.json"

gh issue create --title "[comfyui-mcp] generate_with_ip_adapter tool" \
  --label "comfyui-mcp,consistency,m1-static" \
  --body "MCP tool for IP-Adapter generation.

Depends on #29

## Parameters
- prompt
- reference_image
- strength (0.0-1.0)
- standard generation params

## Returns
- Generated image path
- Metadata"

gh issue create --title "[comfyui-mcp] generate_with_multi_reference tool" \
  --label "comfyui-mcp,consistency,m1-static" \
  --body "IP-Adapter with multiple reference images.

Depends on #30

## Parameters
- prompt
- references: [{ image, weight }]
- standard generation params"

gh issue create --title "Character.referenceImages integration" \
  --label "consistency,m1-static,test-first" \
  --body "Store and use character reference images.

Depends on #7, #30

## Implementation
- Add referenceImages[] to Character
- Upload/manage reference images
- Pass to IP-Adapter during generation

## Tests Required
- Reference storage tests
- Integration with generation tests"

gh issue create --title "/panel generate --consistency ip-adapter" \
  --label "generation,consistency,m1-static,test-first" \
  --body "Panel generation with IP-Adapter consistency.

Depends on #18, #32

## Flow
1. Load panel + characters
2. Gather character.referenceImages
3. Call generate_with_multi_reference
4. Store output

## Tests Required
- Reference loading tests
- Multi-character reference tests"

echo "Creating EPIC 8: Character Consistency (Phase 2 - LoRA)..."

gh issue create --title "[comfyui-mcp] LoRA training workflow (kohya_ss)" \
  --label "comfyui-mcp,consistency,m1-static" \
  --body "Integrate LoRA training via kohya_ss.

## Implementation
- kohya_ss CLI integration
- Training config generation
- RunPod deployment option

## Parameters
- training images
- character name
- steps, learning rate, etc."

gh issue create --title "[comfyui-mcp] train_character_lora tool" \
  --label "comfyui-mcp,consistency,m1-static" \
  --body "MCP tool to train character LoRA.

Depends on #34

## Parameters
- images: string[]
- character_name: string
- steps: number
- output_name: string

## Returns
- LoRA file path
- Training metrics"

gh issue create --title "/character train-lora --from-outputs" \
  --label "consistency,m1-static,test-first" \
  --body "Train character LoRA from best generated outputs.

Depends on #35, #10

## Flow
1. Get character's best rated GeneratedImages
2. Call train_character_lora
3. Store LoRA path in character.lora

## Tests Required
- Image selection tests
- LoRA storage tests"

gh issue create --title "Character.lora storage + auto-injection" \
  --label "consistency,m1-static,test-first" \
  --body "Store and automatically use character LoRAs.

Depends on #36

## Implementation
- character.lora: { path, strength }
- Auto-add to generation loras array

## Tests Required
- LoRA injection tests
- Strength application tests"

gh issue create --title "Hybrid consistency: auto-select IP-Adapter vs LoRA" \
  --label "consistency,m1-static,test-first" \
  --body "Automatically choose best consistency method.

Depends on #33, #37

## Logic
- No references, no LoRA → prompts only
- References, no LoRA → IP-Adapter
- LoRA available → LoRA (+ optional IP-Adapter boost)

## Tests Required
- Selection logic tests
- Fallback behavior tests"

echo "Creating EPIC 9: Video Generation Infrastructure (M2)..."

gh issue create --title "[comfyui-mcp] AnimateDiff workflow" \
  --label "comfyui-mcp,generation,m2-interactive" \
  --body "Add AnimateDiff workflow for I2V animation.

## Workflow
- Load source image
- Apply AnimateDiff motion module
- Generate N frames
- Encode to video

## Parameters
- source_image
- motion_module
- frames
- fps"

gh issue create --title "[comfyui-mcp] generate_animation tool (I2V)" \
  --label "comfyui-mcp,generation,m2-interactive" \
  --body "MCP tool for image-to-video animation.

Depends on #39

## Parameters
- source_image
- motion_type: 'breathing' | 'hair' | 'subtle' | 'dynamic'
- duration: number (seconds)
- fps: number

## Returns
- Video path
- Metadata"

gh issue create --title "[comfyui-mcp] SVD workflow (Stable Video Diffusion)" \
  --label "comfyui-mcp,generation,m2-interactive" \
  --body "Add Stable Video Diffusion workflow.

## Workflow
- Load source image
- SVD img2vid model
- Generate video frames
- Encode to video"

gh issue create --title "[comfyui-mcp] generate_video_svd tool" \
  --label "comfyui-mcp,generation,m2-interactive" \
  --body "MCP tool for SVD video generation.

Depends on #41

## Parameters
- source_image
- motion_bucket_id
- fps
- num_frames
- decode_chunk_size"

gh issue create --title "Panel.videoOutput schema extension" \
  --label "infra,m2-interactive" \
  --body "Extend Panel schema for video outputs.

Depends on #9

## Additions
- Panel.videoOutputs: GeneratedVideo[]
- GeneratedVideo entity (similar to GeneratedImage)
- Animation config storage"

echo "Creating EPIC 10: Panel Animation (M2)..."

gh issue create --title "AnimationConfig: motion type, duration, intensity" \
  --label "generation,m2-interactive" \
  --body "Configuration for panel animations.

Depends on #43

## Config
- motionType: 'breathing' | 'hair' | 'subtle' | 'dynamic' | 'custom'
- duration: number (seconds)
- intensity: number (0.0-1.0)
- fps: number
- loop: boolean"

gh issue create --title "/panel animate: I2V from selected output" \
  --label "generation,test-first,m2-interactive" \
  --body "Generate animation from panel's selected image.

Depends on #18, #40

## Flow
1. Get panel's selectedOutput
2. Apply AnimationConfig
3. Call generate_animation
4. Store as videoOutput

## Tests Required
- Animation generation tests
- Config application tests"

gh issue create --title "Motion presets: breathing, hair, subtle, dynamic" \
  --label "generation,m2-interactive" \
  --body "Pre-configured animation presets.

Depends on #45

## Presets
- breathing: Subtle chest/body motion
- hair: Hair and fabric movement
- subtle: Minimal ambient motion
- dynamic: Full body movement"

gh issue create --title "Video storage + cloud upload" \
  --label "infra,m2-interactive,test-first" \
  --body "Store animated videos locally and cloud.

Depends on #45, #20

## Implementation
- Local video storage
- Cloud upload (GCP, Supabase)
- HLS streaming support

## Tests Required
- Video storage tests
- Upload tests
- Streaming URL tests"

echo "Creating EPIC 11: Interactive Viewer (M2)..."

gh issue create --title "Web viewer: static page with panels" \
  --label "composition,m2-interactive" \
  --body "HTML viewer displaying composed page.

Depends on #28

## Implementation
- Static HTML template
- Panel image display
- Responsive layout"

gh issue create --title "Click-to-play: panel hover/click → video" \
  --label "composition,m2-interactive,test-first" \
  --body "Interactive panel video playback.

Depends on #47, #48

## Implementation
- Hover: show play icon
- Click: play video overlay
- Click elsewhere: close video

## Tests Required
- Interaction tests (e2e)
- Video loading tests"

gh issue create --title "Video player integration (HLS/MP4)" \
  --label "composition,m2-interactive" \
  --body "Embed video player for animated panels.

Depends on #49

## Implementation
- hls.js for streaming
- Native video for MP4 fallback
- Autoplay on interaction
- Loop support"

gh issue create --title "Export: interactive HTML package" \
  --label "composition,m2-interactive,test-first" \
  --body "Export self-contained interactive viewer.

Depends on #50

## Output
- index.html
- assets/ (images, videos)
- player.js
- styles.css

## Tests Required
- Package completeness tests
- Offline playback tests"

echo "Creating EPIC 12: Video-to-Video Pipeline (M3)..."

gh issue create --title "[comfyui-mcp] V2V workflow (video-to-video)" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "Add video-to-video transformation workflow.

## Use Cases
- Style transfer on video
- Video upscaling
- Character re-render"

gh issue create --title "[comfyui-mcp] video_to_video tool" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "MCP tool for V2V transformation.

Depends on #52

## Parameters
- input_video
- prompt
- denoise
- standard params"

gh issue create --title "[comfyui-mcp] video_interpolation tool" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "Frame interpolation for smoother video.

Depends on #52

## Parameters
- input_video
- target_fps
- interpolation_model"

gh issue create --title "[comfyui-mcp] T2V workflow (text-to-video)" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "Add text-to-video generation workflow.

## Models
- ModelScope
- ZeroScope
- AnimateDiff T2V"

gh issue create --title "[comfyui-mcp] generate_video_t2v tool" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "MCP tool for text-to-video generation.

Depends on #55

## Parameters
- prompt
- negative_prompt
- duration
- fps
- width/height"

echo "Creating EPIC 13: Motion Control (M3)..."

gh issue create --title "[comfyui-mcp] ControlNet video (pose sequences)" \
  --label "comfyui-mcp,consistency,m3-animated" \
  --body "Apply ControlNet to video with pose sequences.

## Implementation
- Frame-by-frame ControlNet
- Pose sequence input
- Temporal consistency"

gh issue create --title "[comfyui-mcp] Keypoint extraction from video" \
  --label "comfyui-mcp,consistency,m3-animated" \
  --body "Extract pose keypoints from reference video.

Depends on #57

## Output
- JSON keypoint sequence
- Visualization video"

gh issue create --title "[comfyui-mcp] generate_video_with_pose tool" \
  --label "comfyui-mcp,generation,m3-animated" \
  --body "Generate video following pose sequence.

Depends on #57, #58

## Parameters
- prompt
- pose_sequence (JSON or video)
- standard params"

gh issue create --title "Pose sequence editor/importer" \
  --label "composition,m3-animated" \
  --body "Import and edit pose sequences.

Depends on #58

## Features
- Import from video
- Manual keyframe editing
- Interpolation between poses"

echo "Creating EPIC 14: Scene & Shot Management (M3)..."

gh issue create --title "Scene schema: shots, transitions, timing" \
  --label "infra,m3-animated" \
  --body "Data structures for animated scenes.

Depends on #43

## Schema
- Scene: id, projectId, name, shots[], duration
- Transition types between shots
- Timing/sync metadata"

gh issue create --title "Shot schema: video clip + audio + effects" \
  --label "infra,m3-animated" \
  --body "Individual shot data structure.

Depends on #61

## Schema
- Shot: id, sceneId, videoPath, audioPath, duration
- Effects: filters, overlays
- Timing: startTime, endTime"

gh issue create --title "SceneService: manage shots, ordering" \
  --label "api,m3-animated,test-first" \
  --body "Service for scene management.

Depends on #61, #62

## Methods
- createScene(projectId, name)
- addShot(sceneId, shotData)
- reorderShots(sceneId, newOrder)
- setTransition(shot1Id, shot2Id, type)

## Tests Required
- CRUD tests
- Ordering tests
- Transition tests"

gh issue create --title "/scene create, /shot add, /shot generate" \
  --label "api,m3-animated" \
  --body "MCP/REST endpoints for scene management.

Depends on #63

## Endpoints/Tools
- scene_create
- shot_add
- shot_generate
- scene_preview"

echo "Creating EPIC 15: Video Composition (M3)..."

gh issue create --title "Transition types: cut, fade, morph, panel-to-panel" \
  --label "composition,m3-animated" \
  --body "Video transition implementations.

Depends on #61

## Types
- cut: Instant switch
- fade: Crossfade
- morph: AI-generated morph
- panel: Comic panel transition effect"

gh issue create --title "/scene transition: generate morph between shots" \
  --label "composition,generation,m3-animated,test-first" \
  --body "Generate AI morph transitions.

Depends on #54, #65

## Implementation
- Take last frame of shot A
- Take first frame of shot B
- Generate interpolation video

## Tests Required
- Morph generation tests
- Frame extraction tests"

gh issue create --title "Audio sync: TTS dialogue + timing" \
  --label "composition,m3-animated" \
  --body "Synchronize TTS dialogue with video.

Uses existing TTS tools from comfyui-mcp

## Implementation
- Generate TTS for dialogue
- Align with shot timing
- Mix with background audio"

gh issue create --title "/scene render: composite final video" \
  --label "composition,m3-animated,test-first" \
  --body "Render complete scene to video.

Depends on #65, #67

## Implementation
- Concatenate shots
- Apply transitions
- Mix audio tracks
- Encode final output

## Tests Required
- Rendering tests
- Audio sync tests
- Output format tests"

echo "Creating EPIC 16: Full Short Pipeline (M3)..."

gh issue create --title "/short create: project type for animated short" \
  --label "api,m3-animated" \
  --body "Create animated short project.

Depends on #61

## Implementation
- New project type: 'short'
- Includes scenes, shots
- Target duration, resolution"

gh issue create --title "/short generate: full pipeline orchestration" \
  --label "generation,m3-animated,test-first" \
  --body "Orchestrate complete short generation.

Depends on #68, #69

## Pipeline
1. Generate all shots (T2I → I2V)
2. Generate transitions
3. Sync audio
4. Render final video

## Tests Required
- Pipeline orchestration tests
- Error recovery tests"

gh issue create --title "Export: MP4/WebM at target resolution + quality" \
  --label "composition,m3-animated,test-first" \
  --body "Export final video in multiple formats.

Depends on #70

## Formats
- MP4 (H.264, H.265)
- WebM (VP9, AV1)

## Quality Presets
- Draft: 720p, fast encode
- Standard: 1080p
- High: 1080p, high bitrate
- 4K: 2160p

## Tests Required
- Format tests
- Quality preset tests
- File size estimation tests"

gh issue create --title "UAT: Generate 30-second test short" \
  --label "test-first,m3-animated" \
  --body "End-to-end validation of full pipeline.

Depends on #71

## Test Case: Midnight Charter Teaser
1. Create short project
2. Define 3-4 scenes
3. Generate all shots
4. Add transitions
5. Add TTS dialogue
6. Render 30-second video
7. Export MP4 1080p

## Acceptance
- Video plays correctly
- Audio synced
- Transitions smooth
- < 100MB file size"

echo "Done! Created 72 issues."
