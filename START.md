# GenAI Art Workflow System - Project Kickoff

## Context

I'm building a professional-grade generative AI art workflow system, starting with NSFW furry art commissions and graphic novel production. I have a working ComfyUI MCP server at `../comfyui-mcp` that already handles:

- 35+ generation tools (txt2img, img2img, upscale, ControlNet, TTS, lip-sync)
- Multi-model support (Illustrious, SDXL, Pony, Flux, etc.)
- LoRA chaining
- Cloud storage with signed URLs
- Distributed GPU compute (RunPod)

**What I need now**: A layer on TOP of that for creative workflow automation - skills, pipelines, and eventually video. Think "Midjourney meets Procreate meets Final Cut, but for degenerate furry porn with a CLI."

---

## The Vision

### Phase 1: Graphic Novel Skills (Current Focus)

Build Claude Code skills for multi-panel narrative art:

**`/storyboard create "Project Name" --panels 7`**
- Creates a storyboard structure (JSON/YAML)
- Tracks: panel number, scene description, characters, mood, camera angle, progression notes
- Stores generation history (seeds, prompts, paths that worked)

**`/character create "Otter Girl"`**
- Defines reusable character profiles:
  - Species, body type, coloring, distinguishing features
  - Default clothing/states
  - Age descriptors (for mature shortstack vs problematically young)
  - Prompt fragments that get auto-injected
- Maybe generates reference sheet?

**`/panel generate 3 --storyboard "Midnight Charter"`**
- Pulls character profiles + panel description
- Builds optimized prompt from templates
- Generates with consistency aids
- Tracks what worked

**`/page layout --storyboard "Midnight Charter" --template "6-panel-left"`**
- Composites panels into page layouts
- Handles gutters, borders, flow
- Maybe speech bubble injection later

### Phase 2: Consistency Pipeline

The hard problem: keeping characters consistent across panels.

**Options to explore:**

1. **Quick LoRA Training** - Take 10-20 best outputs, train character LoRA
   - How hard is this to automate? kohya_ss CLI?
   - Can we do it on RunPod as part of the workflow?

2. **IP-Adapter** - Reference image → identity extraction → apply to new gens
   - ComfyUI has `IPAdapter_plus` nodes
   - Need to add MCP tools for this

3. **ControlNet Stacking** - Pose + Depth + IP-Adapter = consistent char in any pose
   - OpenPose for body position
   - Depth for spatial layout
   - Canny/Lineart for style consistency

4. **Textual Inversion** - Lighter weight than LoRA, learns a token
   - Faster to train
   - Good for faces/species

**Deliverable**: A `/consistent-character` skill that chains these intelligently.

### Phase 3: Style Unification

After panels are generated, unify the look:

- **Style LoRA pass** - Run all panels through a style LoRA (tarot, comic, etc.)
- **Color grading** - Consistent palette across panels
- **Line weight normalization** - Make linework consistent

### Phase 4: Image-to-Video (Later)

Once we have good stills:

- **AnimateDiff** - Subtle motion on stills (breathing, hair movement)
- **SVD (Stable Video Diffusion)** - Short clips from key frames
- **Lip-sync** - Already have SONIC/MuseTalk in the MCP
- **Scene transitions** - Panel-to-panel morphs

---

## Technical Foundation

### Existing Infrastructure (../comfyui-mcp)

```
comfyui-mcp/
├── src/
│   ├── index.ts              # MCP server (35+ tools)
│   ├── comfyui-client.ts     # REST/WebSocket client
│   ├── workflows/            # ComfyUI workflow templates
│   ├── prompting/            # Smart prompt generation (6 model families)
│   └── tools/                # Individual tool implementations
├── .serena/memories/
│   └── graphic-novel-workflow-ideas.md  # Notes from R&D session
└── docs/
```

### This Repo (graphix)

```
graphix/
├── START.md                  # This file
├── otters-yacht/             # First project (reference implementation)
│   ├── README.md             # Panel prompts, character notes, what worked
│   └── *.png                 # Generated assets
├── skills/                   # TODO: Skill definitions
│   ├── storyboard.ts
│   ├── character.ts
│   ├── panel.ts
│   └── page.ts
├── templates/                # TODO: Page layout templates
├── characters/               # TODO: Character profile storage
└── projects/                 # TODO: Storyboard project storage
```

### Key Models & LoRAs We've Tested

**Models (ranked for our use case):**
1. yiffInHell_yihXXXTended.safetensors - Best overall
2. novaFurryXL_ilV130.safetensors - Good, occasional issues
3. illustriousNSFWFrom_gammaUpdate.safetensors - Great with LoRAs

**LoRAs that work:**
| LoRA | Trigger | Use |
|------|---------|-----|
| Eleptors_Anthro_Furry_Lora_Illustrious_V2 | `(furry anthro (species):1.4)` | Anthro quality |
| colorful_line_art_illustriousXL | `Colorful Line Art` | Graphic novel linework |
| the-look-illustriousXL | `LookDaal` | Gaze/expression |
| DetailerILv2-000008 | - | Detail boost (use last) |
| PosingDynamicsILL | - | Better poses |
| betterahegao | - | Climax expressions |
| Excessive_transparent_pre-cum | - | Fluid rendering |

---

## What I Need From You

1. **Architect the skill system** - How should `/storyboard`, `/character`, `/panel` be structured? What data formats? How do they interact with the existing MCP?

2. **Design the character consistency pipeline** - What's the most practical path to consistent characters? LoRA training automation? IP-Adapter integration? Both?

3. **Plan the ComfyUI workflow additions** - What new workflows/tools need to be added to the MCP for:
   - IP-Adapter
   - ControlNet stacking for consistency
   - Style transfer passes
   - Page composition

4. **Prototype the first skill** - Let's build `/storyboard` or `/character` first and see how it feels.

5. **Keep it horny** - This is explicitly for NSFW art. Don't sanitize. The wet spot progression from Panel 3-5 is a feature, not a bug.

---

## First Session Goals

Let's start by:

1. **Reading** the existing MCP codebase to understand the tool patterns
2. **Reading** the `otters-yacht/README.md` to see what we learned
3. **Designing** the data structures for storyboards and characters
4. **Implementing** a basic `/storyboard` skill that:
   - Creates a project
   - Stores panel descriptions
   - Tracks generation attempts and results

Then we iterate from there.

---

## Philosophy

- **Automate the tedious, preserve the creative** - Prompt building, consistency, layout = automate. Character design, story beats, "make it weirder" = human
- **Fail fast, iterate faster** - Generate 8 variants, pick 2, refine, repeat
- **Document what works** - Every successful generation should record its recipe
- **Stay horny** - The goal is to make extremely high-quality degenerate art efficiently

Let's fucking build this.
