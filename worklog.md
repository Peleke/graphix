# Graphix Worklog: "Golden Hour" Comic Generation

**Date:** January 15, 2026
**Project:** AI-Assisted Graphic Novel Creation
**Goal:** Generate a 20-panel romantic comic with consistent characters, then composite into graphic novel pages with and without captions.

---

## Session Overview

Using the graphix toolkit to create a complete comic workflow:
- Character creation with prompt fragments
- Identity extraction for consistency
- Panel generation with variants
- Composition into pages
- Caption overlay

---

## Workflow Log

### 10:00 PM - Initial Assessment

**What I'm working with:**
- Graphix MCP server with comprehensive tools for comic creation
- ComfyUI MCP for image generation
- Existing reference images in `otters-yacht/` directory

**Available Tools Inventory:**
- **Core:** project, character, storyboard, panel management
- **Generation:** panel_generate, panel_generate_variants with quality presets
- **Consistency:** identity extraction/application, panel chaining
- **Composition:** page templates, contact sheets, export
- **Captions:** speech, thought, narration, SFX with smart positioning

**Models Available:**
- novaFurryXL_ilV130.safetensors (good for this style)
- yiffInHell_yihXXXTended.safetensors
- illustriousNSFWFrom_gammaUpdate.safetensors

**ControlNet Working:** canny, depth, openpose (SDXL)

---

### 10:15 PM - Story Development

Wrote a 20-panel narrative "Golden Hour" - a yacht romance between Marina (curvy female otter) and Leo (smaller male otter).

**Story Arc:**
- Act I (1-5): Arrival at yacht
- Act II (6-10): Connection over sunset
- Act III (11-16): Intimacy
- Act IV (17-20): Afterglow

---

## Improvement Opportunities

### 🚨 Critical Gap: No Story Scaffolding

The entire story writing process happened **outside of graphix**:
- Narrative structure (acts, beats, emotional arc)
- Panel descriptions with camera angles, lighting, mood
- Character interactions and dialogue
- The text version of the novel (`golden-hour-novel.md`)

**This should be integrated into graphix.** Ideas:
1. `story_create` - Create story outline with acts/beats
2. `story_add_scene` - Add scene with description, characters, location
3. `story_to_panels` - Auto-generate panel descriptions from story scenes
4. `narrative_suggest` - AI suggestions for pacing, emotional beats
5. Store the prose version alongside the visual version

### 🔧 Streamlining Ideas

1. **Story-to-Panel Generator Skill**
   - A `/story-to-panels` skill that takes a narrative outline and automatically:
     - Creates storyboard
     - Generates panel descriptions with camera angles, lighting, mood
     - Suggests which panels need character consistency
   - Could use Claude to parse story beats into visual directions

2. **Batch Panel Setup Tool**
   - Current workflow: create panels one at a time
   - Better: `panel_create_batch` that takes array of descriptions
   - Even better: Accept markdown story format and parse

3. **Character Template Library**
   - Pre-built character archetypes (species, body types, common features)
   - Quick-start for common furry species with optimized prompts

4. **Auto-Identity Extraction**
   - When first panel generates well, auto-extract identity
   - Offer to apply to subsequent panels automatically

5. **Composition Preset Chains**
   - "Manga style" = specific template sequence + caption styling
   - "Western comic" = different defaults
   - One-click style application

---

## Current Session Progress

- [ ] Server startup
- [ ] Project creation
- [ ] Character setup
- [ ] Storyboard creation
- [ ] Panel descriptions
- [ ] Identity extraction
- [ ] Panel generation (batches)
- [ ] Variant selection
- [ ] Composition (no captions)
- [ ] Caption addition
- [ ] Composition (with captions)

---

---

### 10:45 PM - Panel Creation via REST API

**Workflow Pain Point Discovered:**
- Panels are created via `POST /api/storyboards/:id/panels`, not `/api/panels`
- This is logically correct but not intuitive
- Had to read route files to figure this out

**Improvement:** Add route documentation or OpenAPI spec generation

---

### 10:50 PM - Character Assignment

Added characters to panels. Works well but requires:
- Knowing all panel IDs
- Multiple API calls (one per panel)

**Improvement Ideas:**
1. `PUT /api/storyboards/:id/panels/bulk-characters` - Assign characters to multiple panels at once
2. When creating panels, allow `characterIds` in the creation payload (actually exists!)
3. Character assignment presets: "add protagonist to all panels" type operations

---

### 10:55 PM - Direct ComfyUI Generation Strategy

**Decision:** Skip graphix consistency REST API, use ComfyUI MCP directly with IP-Adapter.

**Reasoning:**
- Faster iteration
- More direct control
- Can still register results back to graphix later

**Improvement Ideas:**
1. `graphix generate --panel-id X --use-ipadapter --reference /path/to/ref.png` CLI command
2. Graphix should handle ComfyUI input folder management automatically
3. "Reference image library" feature - upload once, use across projects

---

### 11:00 PM - Batch Generation Starting

Generating 20 panels with IP-Adapter consistency using ComfyUI MCP.

**Workflow:**
1. Generate 4 variants per panel
2. Auto-select best (or review later)
3. Register selected images back to graphix panels

*Worklog continues below as work progresses...*

---

### 11:20 PM - Panel Generation Complete

**All 20 panels generated successfully!** Used ComfyUI MCP `imagine` tool with:
- Model: novaFurryXL_ilV130 (auto-detected)
- Quality: standard
- Style: anime/cinematic hybrid via prompt optimization

**IP-Adapter Challenge:**
- IP-Adapter node not installed in ComfyUI
- Created GitHub issue #20 to track
- Workaround: Strong style prompts with consistent character descriptions

**Generated panels saved to:** `otters-yacht/golden-hour/selected/`

---

### 11:25 PM - Page Composition (No Captions)

Used graphix composition REST API to create 4 pages:
- 3 pages with 6-grid template (panels 1-18)
- 1 page with 2-panel template (panels 19-20)

**Output:** `output/pages/golden_hour_page1-4.png`

---

### 12:15 AM - Caption Addition

Added captions to panels via REST API:
- Narration boxes for scene-setting
- Speech bubbles with tail directions
- Thought bubbles for internal monologue
- Mix of dialogue and prose

**Caption Types Used:**
- `narration` - Establishing mood and transitions
- `speech` - Character dialogue
- `thought` - Internal feelings (Marina's POV)

**Workflow Note:** Had to specify x/y as percentages (0-100). Position presets would be helpful.

---

### 12:18 AM - Captioned Panel Rendering

Created preview of each panel with captions rendered:
- `POST /api/panels/:id/captions/preview`
- Input: original panel image + caption data from DB
- Output: panel with captions composited

**Output:** `otters-yacht/golden-hour/captioned/panel_01-20.png`

---

### 12:20 AM - Final Page Composition (With Captions)

Composed captioned panels into final pages using custom script.

**Output:** `otters-yacht/golden-hour/pages-captioned/page_01-04_captioned.png`

---

## Final Deliverables

| Artifact | Location | Description |
|----------|----------|-------------|
| Story Text | `otters-yacht/golden-hour-novel.md` | Prose version of narrative |
| Raw Panels | `otters-yacht/golden-hour/selected/` | 20 generated panels |
| Captioned Panels | `otters-yacht/golden-hour/captioned/` | Panels with captions |
| Pages (no captions) | `output/pages/golden_hour_page*.png` | 4 composed pages |
| Pages (with captions) | `otters-yacht/golden-hour/pages-captioned/` | 4 captioned pages |

---

## Session Summary: Key Improvement Opportunities

### 🎯 Highest Priority

1. **Story Scaffolding System**
   - No tools exist for narrative development
   - Story writing happens entirely outside graphix
   - Need: story outlines, acts, scenes, panel auto-generation

2. **Batch Operations**
   - Creating 20 panels = 20 API calls
   - Adding captions = 20 more calls
   - Rendering previews = 20 more calls
   - Need: bulk endpoints and batch processing

3. **IP-Adapter Integration**
   - Critical for character consistency
   - Node not installed, workaround needed
   - Need: ComfyUI dependency checker, auto-install prompts

### 🔧 Medium Priority

4. **Caption Position Presets**
   - Currently need x/y percentages
   - Want: "top-left", "bottom-center" presets
   - Smart positioning based on image analysis

5. **Composition with Captions Pipeline**
   - Currently: render captions → manual compose
   - Want: single endpoint that handles both

6. **Reference Image Management**
   - Manual copying to ComfyUI input folder
   - Want: auto-sync, image library, version tracking

### 📋 Nice to Have

7. **OpenAPI Documentation** - Auto-generate from routes
8. **CLI Commands** - `graphix generate --panel-id X`
9. **Character Template Library** - Pre-built archetypes
10. **Style Preset Chains** - One-click manga/comic styles

---

## Time Breakdown

| Phase | Duration | Notes |
|-------|----------|-------|
| Tool assessment | 15 min | Understanding available tools |
| Story writing | 30 min | External to graphix |
| Project setup | 10 min | Project, characters, storyboard |
| Panel creation | 20 min | 20 panels via API |
| Panel generation | 45 min | ComfyUI generation |
| Composition | 5 min | Pages without captions |
| Caption creation | 15 min | 20 captions via API |
| Caption rendering | 10 min | Preview all panels |
| Final composition | 5 min | Custom script |

**Total: ~2.5 hours** for a 20-panel comic

**With proposed improvements (batch ops, story scaffolding):**
Estimated: ~45 minutes

