# Graphix Product Brief

**Version:** 1.0.0  
**Date:** January 17, 2026  
**Author:** Mary (Business Analyst)  
**Status:** APPROVED FOR DEVELOPMENT  

---

## 1. Executive Summary

### 1.1 Product Vision

**Graphix** is an AI-native graphic novel and comic creation tool that empowers artists to produce professional-quality visual narratives with unprecedented speed and consistency. Starting as a power-user tool for AI-assisted commission work, Graphix will evolve into the "Illustrator-killer" — a comprehensive creative suite where AI handles the tedious while humans focus on the creative.

### 1.2 One-Liner

> **"Chat your story into existence, then polish it to perfection."**

### 1.3 Target Outcome

A local-first application that enables a single artist to:
- Create a 20-page graphic novel in days instead of months
- Maintain perfect character consistency across hundreds of panels
- Iterate rapidly on compositions without starting from scratch
- Export print-ready, professional output

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Impact | Who Feels It |
|------------|--------|--------------|
| **Character Inconsistency** | AI generates different faces/bodies each time | All AI artists |
| **Tedious Iteration** | Must regenerate entire image for small changes | Commission artists |
| **Composition Control** | Can't specify "character A here, B there" reliably | Sequential artists |
| **Workflow Fragmentation** | Jump between ComfyUI, Photoshop, text editors | Professional artists |
| **No Project Organization** | Scattered files, lost prompts, no version history | Everyone |

### 2.2 Why Now?

- **ControlNet maturity**: Pose, depth, and composition controls are production-ready
- **LoRA accessibility**: Character-specific models can be trained on consumer hardware  
- **Local inference**: ComfyUI + modern GPUs enable fast, private generation
- **Market gap**: No tool optimizes for *sequential art* specifically

---

## 3. Target Users

### 3.1 Primary User: The AI-Assisted Commission Artist

**Persona: "Alex"**
- Professional furry artist taking commissions
- Already uses A1111/ComfyUI for generation
- Frustrated by inconsistency and iteration time
- Wants to scale output without sacrificing quality
- Technical enough to run local inference
- Values privacy (NSFW content)

**Jobs to Be Done:**
1. Generate consistent characters across multi-panel commissions
2. Iterate quickly on client feedback
3. Maintain a library of poses, expressions, styles
4. Produce professional, print-ready output
5. Track project history and prompts for learning

### 3.2 Secondary User: The Solo Creator

**Persona: "Jordan"**
- Creating their own graphic novel / webcomic
- May or may not be a traditional artist
- Wants AI to handle rendering while they focus on story
- Needs long-term project organization
- Values the "chat to create" workflow

### 3.3 Future User: The Community

**Persona: "The Community"**
- A1111/ComfyUI power users seeking better workflow
- Style/template creators and sharers
- Collaborative teams (post-MVP)

---

## 4. Success Metrics

### 4.1 North Star Metric

**Time from concept to finished page** (target: < 30 minutes for a 4-panel page)

### 4.2 Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Character consistency score | > 85% | AI similarity analysis |
| Iterations to "good" result | < 3 | Generation feedback data |
| Project completion rate | > 70% | Projects with exports |
| Daily active usage | > 4 hours | Session tracking |
| Feedback gap reduction | 50% weekly | Feedback archaeology |

### 4.3 Qualitative Success

- Artists describe it as "indispensable"
- Jaw-drop reaction from skeptical professionals
- "I can't go back to raw ComfyUI"

---

## 5. Scope & Features

### 5.1 MVP Features (Priority 1-5)

| # | Feature | Description | Flow |
|---|---------|-------------|------|
| 1 | **Application Entry** | Onboarding, project dashboard, session recovery | Flow 1 |
| 2 | **Chat-to-Start** | AI-guided project creation from natural language | Flow 2 |
| 3 | **Story Management** | Hierarchical narrative structure, text generation | Flow 3 |
| 4 | **Character System** | Create, manage, maintain consistency (IP-Adapter) | Flow 4 |
| 5 | **Panel Generation** | Generate, iterate, N-up comparison, feedback loop | Flow 5 |

### 5.2 MVP Features (Priority 6-9)

| # | Feature | Description | Flow |
|---|---------|-------------|------|
| 6 | **Page Composition** | Arrange panels in templates, recursive editing | Flow 6 |
| 7 | **ControlNet Config** | Visual control setup, presets, reference processing | Flow 7 |
| 8 | **Export** | PNG, PDF output with metadata | Flow 8 |
| 9 | **YOLO Mode** | Autonomous AI generation with review | Flow 9 |

### 5.3 Post-MVP (DO NOT BLOCK)

| Feature | Reason to Defer | Architecture Impact |
|---------|-----------------|---------------------|
| Custom Layouts | Complex canvas editor | Must support arbitrary panels |
| LoRA Training | Infrastructure heavy | Must track training data |
| RBAC / Multi-user | Auth complexity | Must have user model ready |
| Layered Export | Format complexity | Must preserve layer data |
| Level 0 ControlNet | AI sophistication | Must log all decisions |
| Vector Search | Embedding infrastructure | Must store embeddings |

---

## 6. User Flows Summary

*Full specification in: `user-flows-spec.md`*

### 6.1 Happy Path: Create a Comic Page

```
1. Launch Graphix
2. Click "Chat to Start"
3. Describe: "Two otters on a yacht at sunset, romantic scene"
4. AI elicits: characters, setting, mood, scope
5. Project created with characters, outline, first page
6. See 4-panel page template with draft prompts
7. Click "Generate All" → batch generation begins
8. Review N-up results for each panel
9. Select winners, iterate on weak panels
10. Arrange in Page Composer
11. Export as PDF
```

### 6.2 Critical Flows

| Flow | Criticality | Risk |
|------|-------------|------|
| Panel Generation + Iteration | HIGHEST | Core value prop |
| Character Consistency | HIGHEST | Key differentiator |
| ControlNet Configuration | HIGH | UX complexity |
| Feedback Loop | HIGH | Learning system |
| State Recovery | MEDIUM | Data loss prevention |

---

## 7. Technical Architecture

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      GRAPHIX UI (React)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Dashboard│ │Storyboard│ │Panel Ed│ │Page Comp│          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       └───────────┴───────────┴───────────┘                │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │  Zustand  │ (State)                   │
│                    └─────┬─────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/SSE
┌──────────────────────────┼──────────────────────────────────┐
│                    @graphix/server                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │REST API │ │MCP Tools│ │  SSE    │                       │
│  └────┬────┘ └────┬────┘ └────┬────┘                       │
│       └───────────┴───────────┘                            │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────────────┐
│                @graphix/core                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Generation│ │Characters│ │  Story   │ │Composition│      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └────────────┴────────────┴────────────┘             │
│                         │                                   │
│  ┌──────────────────────┴──────────────────────┐           │
│  │               SQLite / Turso                 │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ComfyUI (External)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │Checkpoints│ │  LoRAs   │ │ControlNet│                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Tech Stack (Proposed)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **UI Framework** | React 18+ | Ecosystem, talent, familiarity |
| **State** | Zustand | Simple, performant, good for canvas |
| **Routing** | TanStack Router | Type-safe, modern |
| **Styling** | Panda CSS + CSS Variables | Type-safe, theming support |
| **Canvas** | Fabric.js | Best image manipulation, JSON state |
| **Components** | Radix UI | Accessible primitives |
| **Real-time** | SSE | Simpler than WebSocket for our needs |
| **Desktop** | Tauri (Phase 2) | Tiny bundle vs Electron |
| **Backend** | Existing @graphix/server | Already built |
| **Database** | SQLite (local) / Turso (cloud) | Already implemented |

### 7.3 Data Flow

```
User Input → Zustand Store → REST API → Core Service → Database
                                    ↓
                              ComfyUI Client
                                    ↓
                              SSE Progress → UI Update
                                    ↓
                              Result → Database → UI
```

---

## 8. Design Principles

### 8.1 UX Principles

1. **"Working Canvas" First** — Always show the creative work, minimize chrome
2. **Progressive Disclosure** — Simple by default, power features available
3. **Non-Destructive** — Every action can be undone/reverted
4. **Keyboard-First** — All common actions have shortcuts
5. **Feedback Rich** — Always show what's happening
6. **Offline-Capable** — Core editing works without network
7. **Export-Ready** — One-click to professional output

### 8.2 Visual Design

**Aesthetic Target:** "$1,999 and you DON'T regret it"

| Inspiration | What to Take |
|-------------|--------------|
| Apple | Polish, attention to detail |
| Procreate | Creative fluidity, gesture |
| Illustrator | Professional depth, panels |
| DaVinci Resolve | Cinematic gravitas, dark theme |

**Theme:**
- Dark mode default
- Full theme customization (post-MVP)
- Warm minimalism (clean but not cold)
- Micro-interactions for feedback

### 8.3 Technical Principles

1. **Pessimistic Caching** — Save before persist (Krita-style recovery)
2. **Offline-First** — Work without network, sync when available
3. **API-First** — UI consumes same API as MCP tools
4. **Test-Driven** — E2E tests before features
5. **Extensible** — Never block future capabilities

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ControlNet UX too complex | HIGH | HIGH | Start with presets, progressive disclosure |
| Character consistency insufficient | MEDIUM | HIGH | Hybrid approach, LoRA path ready |
| Performance issues (large projects) | MEDIUM | MEDIUM | Pagination, lazy loading, indexing |
| Scope creep | HIGH | MEDIUM | Strict MVP, "DO NOT BLOCK" list |
| ComfyUI dependency | LOW | HIGH | Abstraction layer, fallback options |

---

## 10. Timeline & Milestones

### 10.1 Phase 1: Foundation (Weeks 1-2)

- [ ] Tech stack finalized
- [ ] Project scaffolding (React + Vite + Panda)
- [ ] Design system foundation
- [ ] E2E test infrastructure (Playwright)
- [ ] Core component library started

### 10.2 Phase 2: Core Flows (Weeks 3-6)

- [ ] Flow 1: Entry & Dashboard
- [ ] Flow 2: Chat-to-Start (basic)
- [ ] Flow 4: Character Management
- [ ] Flow 5: Panel Generation & Iteration
- [ ] Flow 7: ControlNet (Level 3-4)

### 10.3 Phase 3: Composition (Weeks 7-8)

- [ ] Flow 3: Story/Narrative Management
- [ ] Flow 6: Page Composition
- [ ] Flow 8: Export

### 10.4 Phase 4: Polish (Weeks 9-10)

- [ ] Flow 9: YOLO Mode
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

### 10.5 Phase 5: Beta (Week 11+)

- [ ] Internal dogfooding
- [ ] Feedback collection
- [ ] Iteration

---

## 11. Open Questions

| Question | Owner | Due |
|----------|-------|-----|
| Exact Fabric.js vs alternatives comparison | Tech Lead | Week 1 |
| LoRA training infrastructure requirements | Tech Lead | Week 2 |
| Tauri vs PWA-only for MVP | Tech Lead | Week 1 |
| Community features scope | Product | Week 4 |
| Monetization model (if any) | Business | Week 6 |

---

## 12. Appendices

### A. Reference Documents

| Document | Location |
|----------|----------|
| User Flows Specification | `_bmad-output/planning-artifacts/user-flows-spec.md` |
| UI Research Deep Dive | `_bmad-output/planning-artifacts/ui-research-deep-dive.md` |
| Project Context | `_bmad-output/planning-artifacts/project-context.md` |
| Existing API Docs | `docs/API-MIGRATION-v0.2.md` |
| UI Plan (Legacy) | `docs/UI-PLAN.md` |

### B. Glossary

| Term | Definition |
|------|------------|
| **N-up** | Display N images in a grid for comparison |
| **ControlNet** | Neural network for controlling image generation |
| **LoRA** | Low-Rank Adaptation, lightweight model fine-tuning |
| **IP-Adapter** | Image Prompt Adapter for style/character transfer |
| **GLIGEN** | Grounded Language-to-Image Generation (bounding boxes) |
| **YOLO Mode** | "You Only Live Once" — autonomous AI generation |

### C. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | Peleke | 2026-01-17 | ✅ |
| Business Analyst | Mary | 2026-01-17 | ✅ |
| Tech Lead | TBD | | |

---

*This Product Brief is a living document. Update as decisions are made and understanding evolves.*
