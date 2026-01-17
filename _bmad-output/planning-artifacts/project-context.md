# Graphix — Project Context

**Document Type:** BMad Project Context (Bible)  
**Version:** 1.0.0  
**Date:** 2026-01-17  
**Status:** Active  

---

## Executive Summary

**Graphix** is a production-grade generative AI art workflow system for multi-panel narrative generation. Built on a solid foundation of 22+ services, full REST API, and MCP integration, it now requires a UI layer to enable visual iteration, creative composition, and workflow orchestration.

**Primary Use Case:** NSFW furry art commissions and graphic novel production  
**Target:** Power users first, community tool second (à la A1111/ComfyUI)  
**Philosophy:** Local-first, privacy-focused, extensible

---

## Vision & Goals

### The Problem

Claude + MCP + REST is powerful for AI-assisted generation, but:
- **Iteration is painful** — Can't easily view variants, pick winners, tweak prompts
- **Composition requires imagination** — No WYSIWYG for arranging panels into pages
- **Orchestration is manual** — Multi-step workflows require terminal juggling
- **Animation preview is blind** — T2V/I2V/V2V coming, need visual composition

### The Solution

A **WYSIWYG editor wrapped around AI-led generative processes**:
- See what you're creating as you create it
- Click to iterate, drag to arrange, export when satisfied
- Local-first for privacy, with optional community deployment

### Success Metrics

- **Time to create 20-panel comic:** < 30 minutes (vs 2.5 hours current)
- **Learning curve:** Productive within 15 minutes
- **Iteration cycles:** < 30 seconds per variant review

---

## Target Users

### Primary: Power User (Peleke)

- Professional NSFW commission artist
- Comfortable with technical tools
- Uses Claude + MCP for interactive generation
- Needs visual feedback and iteration speed

### Secondary: Community Users

- Self-hosted users running local instances
- Similar workflow to A1111/ComfyUI users
- Want control over their generation pipeline
- Privacy-conscious (local data, local GPU)

### Tertiary (Future): Hosted Community

- Users on shared infrastructure
- Turso + RunPod deployment
- Less technical, more "app-like" experience

---

## Architecture Overview

### Monorepo Structure

```
graphix/
├── packages/
│   ├── core/           # @graphix/core — Pure business logic (22+ services)
│   ├── server/         # @graphix/server — MCP + REST adapters
│   ├── client/         # @graphix/client — TypeScript API client
│   ├── skills/         # @graphix/skills — DX bundle (placeholder)
│   ├── ui/             # @graphix/ui — NEW: React UI layer
│   └── theme/          # @graphix/theme — NEW: Pluggable theme system
```

### Layer Responsibilities

| Layer | Purpose | Consumer |
|-------|---------|----------|
| **@graphix/core** | Business logic, services, no transport | Any JS/TS consumer |
| **@graphix/server** | MCP + REST adapters | Claude, HTTP clients |
| **@graphix/client** | Type-safe API client | UI, scripts |
| **@graphix/ui** | Visual interface | End users |
| **@graphix/theme** | Design system, themeable | UI, future projects |

### Deployment Modes

| Mode | Database | GPU | Use Case |
|------|----------|-----|----------|
| **Local** | SQLite | Local ComfyUI | Primary — privacy, control |
| **Community** | Turso | RunPod | Future — shared instance |

---

## Technical Stack

### Existing (Stable)

| Component | Technology | Status |
|-----------|------------|--------|
| Runtime | Bun | ✅ Production |
| Language | TypeScript | ✅ Production |
| Database | SQLite (local) / Turso (distributed) | ✅ Production |
| ORM | Drizzle | ✅ Production |
| API Framework | Hono | ✅ Production |
| MCP | @modelcontextprotocol/sdk | ✅ Production |
| Testing | Bun test + Schemathesis | ✅ 214 tests |

### New (UI Layer)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | React 18+ | Industry standard, ecosystem |
| Routing | TanStack Router | Type-safe, modern |
| State | Zustand | Lightweight, fits single-user |
| Components | Radix UI | Accessible primitives |
| Styling | Panda CSS | Type-safe, themeable |
| Canvas | Fabric.js or PixiJS | General-purpose composition |
| Real-time | WebSocket/SSE | Push-based generation progress |
| Distribution | PWA + Electron | Web + desktop from same code |

### Theme System (@graphix/theme)

- Design token architecture (CSS custom properties)
- Dark + Light themes out of box
- User-creatable themes (JSON/TS config)
- **Goal:** Ejectable, npm-publishable, reusable across projects

---

## Data Model

### Core Entities

| Entity | Purpose |
|--------|---------|
| `projects` | Top-level container |
| `characters` | Reusable character definitions with prompt fragments |
| `storyboards` | Ordered collection of panels |
| `panels` | Individual scenes with descriptions |
| `panelCaptions` | Speech/thought/narration overlays |

### Narrative Engine

| Entity | Purpose |
|--------|---------|
| `premises` | Story foundation |
| `stories` | Narrative structure |
| `beats` | Story beats for pacing |

### Generation

| Entity | Purpose |
|--------|---------|
| `generatedImages` | All generation outputs with metadata |
| `generatedTexts` | LLM-generated content (Ollama) |
| `imageReviews` | Approval/rejection tracking |

### Consistency

| Entity | Purpose |
|--------|---------|
| `expressionLibrary` | Character expressions |
| `interactionPoses` | Multi-character poses |
| `poseLibrary` | Reusable poses |
| `customAssets` | User-uploaded references |

### Composition

| Entity | Purpose |
|--------|---------|
| `pageLayouts` | Template-based page compositions |

---

## Service Layer (22 Services)

### CRUD Services
- ProjectService, CharacterService, StoryboardService, PanelService, CaptionService

### Generation Services
- BatchService, GeneratedImageService, ConsistencyService, InpaintingService, InterpolationService

### Narrative Services
- NarrativeService, StoryScaffoldService, LLMService, TextGenerationService, GeneratedTextService

### Visual Services
- StyleService, LightingService, PoseLibraryService, InteractionPoseService, CustomAssetService

### Review Services
- ReviewService, PromptAnalyticsService

---

## UI Components (MVP)

### 1. Project Dashboard
- Project cards with thumbnails
- Progress indicators
- Quick actions

### 2. Story Editor
- Hierarchical structure (Acts → Scenes → Panels)
- AI-assisted descriptions
- Story ↔ Storyboard sync

### 3. Character Designer
- Visual character cards
- Reference image management
- Prompt tag builder
- Identity extraction

### 4. Storyboard View
- Thumbnail grid with status
- Drag-and-drop reordering
- Multi-select batch operations

### 5. Panel Generator
- Variant gallery with selection
- Side-by-side comparison
- Generation settings
- ControlNet/IP-Adapter controls

### 6. Caption Editor (Post-MVP)
- Visual caption placement
- Type selector (speech, thought, narration, SFX)
- Character assignment
- *Note: Text gen via Ollama for stories, not image injection*

### 7. Page Composer — THE HERO VIEW
- Template-based panel arrangement
- Click panel → recursive editing
- Navigate pages
- Character/pose/style panels
- Advanced: ComfyUI config access
- Export controls

### 8. Export Center (Post-MVP)
- Format presets (web, print, ebook)
- Batch export
- Story text export

---

## Key User Flows

### Flow 1: Create New Comic Project
1. Dashboard → New Project
2. Define characters (name, visual refs, prompt fragments)
3. Create storyboard structure
4. Write/generate panel descriptions
5. Generate panels (with iteration)
6. Compose into pages
7. Export

### Flow 2: Iterate on Panel
1. Page Composer → Click panel
2. View variants → Select or regenerate
3. Tweak prompt/style → Generate new variants
4. Compare → Select winner
5. Return to Page Composer

### Flow 3: Review Commission
1. Open project → Page Composer
2. Navigate pages
3. Swap any panel with better variant
4. Adjust composition
5. Export for client review

---

## Future Roadmap

### M1: Static Graphic Novels (CURRENT)
- Multi-panel narrative art generation
- Template-based page composition
- Export to PNG/PDF

### M2: Interactive Panels
- Click any panel → plays I2V animated clip
- T2I → I2V pipeline
- Animation preview in composer

### M3: Animated Shorts
- Full multi-minute videos
- T2I → I2V → V2V pipeline
- Scene/shot management
- Audio sync (TTS)

### Future: Generalized Templates
- Posters, billboards, page spreads
- Any format via template system
- Plugin architecture for custom templates

---

## Content Context

**This is an adult project for NSFW content generation.**

- Primary use: furry art commissions (explicit content)
- No arbitrary content restrictions
- User controls their own instance
- Applicable to any generative art use case
- See `otters-yacht/` for reference examples

---

## Development Principles

1. **Library-first** — Core works standalone, UI is just one consumer
2. **Local-first** — Privacy by default, cloud optional
3. **Type-safe everywhere** — TypeScript end-to-end
4. **Testable** — Services injectable, DB mockable
5. **Themeable** — Design system is a separate, reusable package
6. **Extensible** — Template system generalizes to any format

---

## Related Documents

- `docs/UI-PLAN.md` — Initial UI sketches
- `docs/WORKLOG-RESTRUCTURE.md` — Monorepo extraction history
- `START.md` — Original project vision
- `.github/PR-description.md` — Pre-UI infrastructure summary

---

*This document serves as the authoritative context for all BMad workflows on the graphix project.*
