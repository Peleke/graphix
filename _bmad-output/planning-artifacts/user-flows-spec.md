# Graphix User Flows Specification

**Version:** 1.0.0  
**Date:** January 17, 2026  
**Status:** ELICITED & APPROVED  
**Author:** Mary (BA) + Captain Peleke  

---

## 📋 Document Purpose

This document defines ALL user flows for Graphix MVP and beyond. It serves as:
1. **UAT Scenario Source** — Each flow maps to Gherkin/BDD test scenarios
2. **E2E Test Foundation** — Playwright scripts derive from these flows
3. **UX Design Bible** — Designers reference this for every screen
4. **Development Contract** — What gets built matches what's specified here

---

## 🎯 MVP Priority (Flows 1-5)

| Priority | Flow | Description |
|----------|------|-------------|
| 1 | Entry & Onboarding | First launch, returning user, getting started |
| 2 | Project Creation | Chat-to-start, AI-guided setup |
| 3 | Story/Narrative | Manage story structure, narratives, prompts |
| 4 | Character Management | Create, edit, manage characters |
| 5 | Panel Generation | Generate, iterate, feedback loop |
| 6 | Page Composition | Arrange panels, export pages |
| 7 | ControlNet Config | Set up controls for generation |
| 8 | Export | Output final work |
| 9 | YOLO Mode | AI autonomous generation |

---

## 🚪 FLOW 1: Application Entry

### 1.1 First-Time User Experience

**Trigger:** User launches Graphix for the first time

**Flow:**
```gherkin
Feature: First Launch Onboarding

Scenario: New user completes onboarding
  Given I have never opened Graphix before
  When I launch the application
  Then I should see an onboarding wizard
  And the wizard should offer a sample project tutorial
  And I should be able to skip onboarding if desired
  
Scenario: User explores sample project
  Given I am in the onboarding wizard
  When I choose "Explore Sample Project"
  Then I should be guided through key features
  And I should see tooltips explaining each UI element
  And I should be able to make small edits to learn
```

**UI Elements:**
- Welcome modal with tutorial option
- Sample project pre-loaded
- Tutorial tooltips (progressive disclosure)
- "Skip" option always visible

---

### 1.2 Returning User Experience

**Trigger:** User with existing projects opens Graphix

**Flow:**
```gherkin
Feature: Returning User Entry

Scenario: User sees dashboard on return
  Given I have existing projects
  When I open Graphix
  Then I should see a "What do you want to do?" modal
  And I should see my recent projects on the left sidebar
  And the last opened project should be highlighted
  
Scenario: Resume interrupted work
  Given I was working on a panel when I closed the app
  And I did not save my changes
  When I open Graphix
  Then I should see a recovery notification
  And I should be able to restore my unsaved work
  And the app should resume exactly where I left off

Scenario: Dirty shutdown recovery (Krita-style)
  Given the application crashed during generation
  When I reopen Graphix
  Then the app should detect the dirty shutdown
  And offer to restore the last known state
  And pessimistically cached data should be available
```

**Technical Requirements:**
- Pessimistic caching before persistence
- Auto-save to local storage every N seconds
- Crash recovery with state restoration
- Session state persistence

---

### 1.3 Getting Started Modal

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  GRAPHIX                                           [×]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │ RECENT PROJECTS │  │  🎨 New Comic Project            │  │
│  │                 │  │  🖼️  New Illustration             │  │
│  │ • Otters Yacht  │  │                                  │  │
│  │ • Marina Solo   │  │  ─────────────────────────────   │  │
│  │ • Test Project  │  │                                  │  │
│  │                 │  │  📁 Continue Recent              │  │
│  │                 │  │  ┌─────────────────────────────┐ │  │
│  │                 │  │  │ Otters Yacht (2h ago)       │ │  │
│  │                 │  │  │ Marina Solo (yesterday)     │ │  │
│  │                 │  │  └─────────────────────────────┘ │  │
│  │                 │  │                                  │  │
│  │                 │  │  [📥 Import] [📋 From Template]  │  │
│  │                 │  │                                  │  │
│  └─────────────────┘  │  ─────────────────────────────   │  │
│                       │                                  │  │
│                       │  💬 "What do you want to create?"│  │
│                       │  [________________________________] │  │
│                       │                                  │  │
│                       └──────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elements (Top to Bottom):**
1. **Header**: App title, close button
2. **Left Sidebar**: Recent projects list (Photoshop/ComfyUI style)
3. **Main Area**:
   - New Comic Project (prominent)
   - New Illustration (prominent)
   - Divider
   - Continue Recent (MOST prominent, shows recent with timestamps)
   - Import / From Template (button row)
   - Divider
   - Chat to Start (secondary but clearly visible, at bottom)

---

## 🎨 FLOW 2: Project Creation (Chat-to-Start)

### 2.1 AI-Guided Project Setup

**Trigger:** User clicks "Chat to Start" or types in the chat box

**Flow:**
```gherkin
Feature: Chat-to-Start Project Creation

Scenario: User describes vague idea
  Given I click on the chat input
  When I type "I want to make a story about two otters falling in love on a yacht"
  Then the AI should begin an elicitation conversation
  And the AI should ask about characters
  And the AI should ask about setting details
  And the AI should ask about story arc
  And the AI should ask about tone/style
  And the AI should ask about scope

Scenario: Single character story
  Given I type "An otter comes home after work and needs to relax"
  When the AI asks about characters
  Then I should be able to specify just one character
  And the system should accept this as valid

Scenario: Minimal input accepted
  Given I provide very little information
  When I indicate I want to proceed anyway
  Then the system should allow me to continue
  And nullable fields should be marked for "AI guess" or "leave null"
  And the user should specify per-field handling
```

**AI Elicitation Questions:**

| Question Area | Purpose | Required? |
|---------------|---------|-----------|
| Characters | Who appears in the story? Names, appearances, personalities | No (0+ valid) |
| Setting | Where/when does it happen? Visual environment | No |
| Story Arc | What's the emotional journey? Beginning/middle/end | No |
| Tone/Style | Comedy? Drama? Explicit? Visual style preferences | No |
| Scope | How many pages? One-shot or series? | No |

**"Enough to Start" Definition:**
- User explicitly says "that's enough" OR
- AI determines sufficient info gathered OR
- User can proceed with literally nothing (system passes nulls)

**Per-Field Null Handling:**
```typescript
type FieldHandling = 'ai_guess' | 'leave_null';

interface ProjectSetupField {
  value: any | null;
  handling: FieldHandling;
}
```

---

### 2.2 RAG / Asset Matching

**Trigger:** User mentions existing characters or assets

**Flow:**
```gherkin
Feature: Asset Matching During Chat

Scenario: Exact character name match
  Given I have a character named "Marina" in my library
  When I type "I want to use Marina again"
  Then the AI should search by name
  And present Marina's character card for confirmation
  And ask if I want to use this character

Scenario: Ambiguous name match
  Given I have two characters with similar names
  When I mention a name that could match either
  Then the AI should present both options
  And I should select the correct one

Scenario: Similar but different character
  Given I mention "Marina's sister"
  When no exact match exists
  Then the AI should offer to create a new character
  And suggest basing it on Marina's profile
  And allow me to specify differences

Scenario: Vector similarity search (v2)
  Given I describe a character loosely
  When no name match exists
  Then the system should search via embedding similarity
  And present closest matching characters
  And offer to create new if no match satisfies
```

---

### 2.3 Project Bootstrap Output

**After Chat Completion, System Creates:**

| Asset | Description | Required |
|-------|-------------|----------|
| Project Record | Name, description, settings | Yes |
| Character Profiles | Linked existing or new | If mentioned |
| Story Outline | Beats/scenes structure | If discussed |
| Page Structure | Panel count suggestions | If scope defined |
| Style Preset | Auto-selected or user-chosen | If style discussed |
| Draft Prompts | Initial prompts for panels | Best-effort |

**Hand-off to Workspace:**
```gherkin
Scenario: Transition to workspace
  Given I have completed the chat setup
  When the AI says "Ready to start!"
  Then I should see a "Create Project" button
  And clicking it should create all assets
  And I should be taken to the Storyboard view
  And I should see my first page ready for generation
```

---

## 📖 FLOW 3: Story/Narrative Management

### 3.1 Story Hierarchy Visualization

**Structure:**
```
Project
└── Story
    ├── Global Narrative (overall story)
    ├── Page 1
    │   ├── Page Narrative
    │   ├── Panel 1 → Panel Narrative → Image Intent → Prompt
    │   ├── Panel 2 → Panel Narrative → Image Intent → Prompt
    │   └── Panel 3 → Panel Narrative → Image Intent → Prompt
    └── Page 2
        └── ...
```

**Views (All Available, Switchable):**

| View | Description | Best For |
|------|-------------|----------|
| **Tree View** | Hierarchical sidebar | Navigation, structure overview |
| **Kanban Board** | Columns for status | Production tracking |
| **Outline Editor** | Scrivener-style | Writing, narrative editing |

**Research Recommendation:** Tree view for navigation + Outline editor for narrative work. Kanban for production status (post-MVP enhancement).

---

### 3.2 Narrative ↔ Prompt Relationship

**The Separation:**
```
┌─────────────────────────────────────────────────────────────┐
│ NARRATIVE (Human-readable story text)                       │
│ "Marina realizes she's in love. The sunset catches her      │
│  eyes as she looks at Cove, her heart racing."              │
├─────────────────────────────────────────────────────────────┤
│ IMAGE INTENT (Descriptive prompt seed)                      │
│ "otter, female, looking at viewer with soft expression,     │
│  golden hour lighting, yacht deck background, romantic"     │
├─────────────────────────────────────────────────────────────┤
│ FINAL PROMPT (Machine-optimized)                            │
│ "[Image Intent] + [Style tokens] + [Character LoRA] +       │
│  [Quality boosters] + [Negative prompt]"                    │
└─────────────────────────────────────────────────────────────┘
```

**Conversion Functions:**

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `toPrompt()` | Narrative | Image Intent | Convert story text to visual description |
| `tunePrompt()` | Narrative + Existing Prompt | Styled Prompt | Apply narrative "mood" to explicit content |

**Example of `tunePrompt()`:**
- Narrative: "A tender, loving moment between partners"
- Existing Prompt: "blowjob, oral sex, explicit"
- Tuned Prompt: "blowjob, oral sex, explicit, loving expression, gentle, intimate mood, soft lighting"

**User Capabilities:**
- ✅ Edit narrative → AI regenerates image intent
- ✅ Edit image intent directly
- ✅ Edit final prompt directly (power user)
- ✅ Clear separation between all three layers

---

### 3.3 Text Generation (Ollama)

**Trigger Points:**
- ✅ On demand (user clicks "Generate Narrative")
- ✅ Auto-suggested when panel is created
- ✅ Batch for entire page/story

**UI Presentation:**
- Modal/drawer for editing
- Revealable/findable (not always visible)
- Text readable SEPARATELY from images (accessibility)
- "Literotica mode": Story text as standalone, paired to but divorced from images

---

## 🎭 FLOW 4: Character Management

### 4.1 Character Creation

**Minimum Viable Character (Required):**
```typescript
interface MVPCharacter {
  name: string;                    // Required
  species: string;                 // Required
  appearance: string;              // Required (basic description)
  colorPalette: ColorPalette;      // Required (extracted or manual)
  promptFragments: string[];       // Required (derived from above)
}
```

**Full Character Profile (Progressive Enhancement):**
```typescript
interface FullCharacter extends MVPCharacter {
  age?: string;
  personalityTraits?: string[];
  referenceImages?: string[];      // Optional (can be generated)
  expressionLibrary?: Expression[]; // Progressive
  associatedLoraId?: string;       // Progressive
  turnaroundViews?: string[];      // Progressive
}
```

**Reference Image Handling:**
```gherkin
Scenario: Character without reference image
  Given I am creating a new character
  When I do not provide a reference image
  Then the system should offer to generate one
  And I can trigger generation or skip
  And the character is still valid without one
```

---

### 4.2 Character Consistency System

**Approach: HYBRID (Option C)**

```
Phase 1: IP-Adapter (MVP)
├── User provides reference images
├── System uses IP-Adapter for consistency
└── Works "okay", not perfect

Phase 2: LoRA Training (Post-MVP)
├── User accumulates good generations
├── System offers "Train LoRA from generations"
├── Much better consistency
└── Requires training infrastructure

Phase 3: Automatic (Future)
├── System detects when enough data exists
├── Auto-suggests LoRA training
└── Seamless consistency improvement
```

**Architecture Requirements:**
- DO NOT BLOCK LoRA training path
- Design character system to accommodate future LoRA association
- Track generation quality for training data collection

---

### 4.3 Character in Generation

**Specification Methods (Priority Order):**

1. **Primary: Mention in Narrative**
   - User writes: "Marina looks at Cove lovingly"
   - AI extracts: [Marina, Cove]
   - Characters auto-linked to panel

2. **Secondary: Explicit Selection**
   - Dropdown/tag selector
   - Drag character card onto panel

**Pose/Position Specification:**

| Method | MVP? | Description |
|--------|------|-------------|
| Text description | ✅ | "Marina standing, Cove sitting" |
| Reference image | ✅ | Upload pose reference |
| Interaction preset picker | ⏳ | Progressive (if visual works) |
| Visual drag boxes | ⏳ | Progressive (post-MVP) |

---

## 🖼️ FLOW 5: Panel Generation & Iteration

### 5.1 Generation Trigger

**Methods:**
- ✅ "Generate" button per panel
- ✅ Batch generate all panels on page
- ❌ Auto-generate on prompt change (NEVER until free)
- ✅ Keyboard shortcut

```gherkin
Scenario: Manual generation trigger
  Given I have a panel with a prompt
  When I click the "Generate" button
  Then generation should begin
  And I should see progress feedback
  And I should NOT be auto-charged for prompt changes
```

---

### 5.2 Generation Progress

**Feedback Elements:**
- ✅ Progress bar (step X of Y)
- ✅ Low-res preview as it generates
- ✅ Queue position if multiple pending

**Technical:** SSE (Server-Sent Events), NOT WebSocket
- Unidirectional push is sufficient
- Simpler implementation
- HTTP/2 for any client→server needs

---

### 5.3 Result Presentation (N-Up)

**Configuration:**
- Default: N = 4
- User configurable: 1-8
- If batch size ≠ display size: pagination

**Selection UX:**
```
┌─────┬─────┐
│  1  │  2  │   Click to SELECT (green border)
├─────┼─────┤   Click again to APPROVE ✓
│  3  │  4  │   Right-click to DISMISS ✗
└─────┴─────┘
```

- Click to select as "winner"
- Explicit approve/reject labels (not drag)
- Multi-select for batch approve/dismiss

---

### 5.4 Iteration Actions

**Primary Actions (Always Visible):**
| Action | Icon | Description |
|--------|------|-------------|
| Regenerate | 🔄 | Same settings, new seed |
| Vary | 🎲 | Selected image as base, variations |
| Edit + Regen | ✏️ | Modify prompt, regenerate |
| Add to Refs | ⭐ | Save to character references (IMPORTANT) |

**Secondary Actions (Overflow Menu):**
| Action | Description |
|--------|-------------|
| Inpaint | Fix specific region |
| img2img | Use as base for new prompt |
| Extract Pose | Save skeleton to pose library |

**Tertiary Actions:**
| Action | Description |
|--------|-------------|
| Add to Character | Associate with character profile |
| Feedback | Log gap/issue |

---

### 5.5 Feedback Loop

**Quick Feedback:**
- 👍 / 👎 on every generation (optional)

**Detailed Feedback:**
```typescript
interface GenerationFeedback {
  generationId: string;
  
  // Quick rating
  rating: 'good' | 'bad' | null;
  
  // Detailed (optional)
  gapType?: 'character' | 'pose' | 'composition' | 'style' | 'content' | 'other';
  expectedOutcome?: string;
  actualOutcome?: string;
  notes?: string;
  
  // Auto-analysis (if configured)
  autoAnalyze: boolean;  // AI reads image vs prompt, determines gap
  
  // Always captured
  settingsSnapshot: GenerationSettings;
  promptSnapshot: string;
  
  createdAt: Date;
}
```

**Flow:**
```gherkin
Scenario: Quick feedback
  Given I see a generation result
  When I click the thumbs down
  Then a feedback entry should be created
  And the generation settings should be captured

Scenario: Detailed feedback
  Given I click "Feedback" on a generation
  When I fill out the feedback form
  Then I can describe what I expected vs got
  And the system captures all settings for archaeology

Scenario: Auto-analyze feedback
  Given I have "auto-AI" configured
  When I submit empty feedback
  Then the AI should analyze the image vs prompt
  And determine the likely gap automatically
```

---

## 📄 FLOW 6: Page Composition

### 6.1 Layout Selection

**MVP:** Template picker only
```
┌──────────────────────────────────────┐
│  SELECT LAYOUT                       │
├──────────────────────────────────────┤
│  ┌───┐  ┌─┬─┐  ┌───┐  ┌─┬─┬─┐      │
│  │   │  │ │ │  ├───┤  │ │ │ │      │
│  │   │  │ │ │  │   │  ├─┴─┴─┤      │
│  └───┘  └─┴─┘  └───┘  │     │      │
│  1-panel 2-panel 2-row  3-panel     │
└──────────────────────────────────────┘
```

**Progressive Enhancement (Post-MVP):**
- Draw custom layout
- AI suggests based on panel count
- Customize existing template

**⚠️ CRITICAL:** DO NOT BLOCK custom layouts. Architecture must support arbitrary panel arrangements. "One day we murder Illustrator in an alleyway."

---

### 6.2 Panel Placement

**MVP Flow:**
1. Auto-fill panels in reading order
2. Click slot to edit assignment
3. Edit UI for swapping panels

**Post-MVP:**
- Resize panels within layout
- Overlap panels (for effect)
- Rotate panels
- Full-bleed (extend to edge)

---

### 6.3 Page-Level Adjustments

**MVP:**
- ✅ Adjust gutters (spacing)
- ✅ Page-level effects (borders, background)
- ⚠️ Captions (manual for now, automation weak)

---

### 6.4 Recursive Editing (Drill-Down)

**Trigger:** Click panel in Page Composer

**UI:** Side panel slides out (complex UI, nearly standalone)

**Return Methods:**
- Back button (warns if unsaved changes)
- Auto-return after save
- Breadcrumb navigation (warns if unsaved)

```gherkin
Scenario: Edit panel from page composer
  Given I am in the Page Composer
  When I click on a panel
  Then a side panel should slide out
  And I should see the Panel Editor
  And the Page Composer should remain visible (dimmed)

Scenario: Return with unsaved changes
  Given I have made changes in the Panel Editor
  And I have not saved
  When I click "Back"
  Then I should see a warning
  And I can choose to save, discard, or cancel
```

---

## ⚙️ FLOW 7: ControlNet Configuration

### 7.1 Exposure Levels

**Target:** Level 3 (Visual Cards)  
**Required:** Level 4 (Full Control)  
**Long-term:** Level 0 (System Just Knows™)

| Level | Name | Description | MVP? |
|-------|------|-------------|------|
| 0 | Hidden | System auto-selects everything | Future |
| 1 | Suggested | System suggests, user confirms | Future |
| 2 | Preset-Based | User picks preset, system configures | Post-MVP |
| 3 | Visual | Toggleable cards, drag reference | ✅ Target |
| 4 | Full | Sliders, percentages, model selection | ✅ Required |

**Level 3 UI Concept:**
```
┌─────────────────────────────────────────────┐
│ CONTROLS                                    │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │OpenPose │ │  Depth  │ │ Lineart │        │
│ │   👤    │ │   🏔️   │ │   ✏️    │        │
│ │  [ON]   │ │  [OFF]  │ │  [OFF]  │        │
│ │ 0.85    │ │         │ │         │        │
│ └─────────┘ └─────────┘ └─────────┘        │
│                                             │
│ [Drop reference image here]                 │
└─────────────────────────────────────────────┘
```

---

### 7.2 Reference Image Flow

```gherkin
Scenario: Process reference image
  Given I drop a reference image
  When the system processes it
  Then I should see available control types
  And I should select which aspects to extract
  And I should see preprocessed previews (skeleton, depth map)
  And I should choose which to apply to generation
```

---

### 7.3 MVP ControlNet Flow

```gherkin
Scenario: Ergonomic ControlNet (MVP)
  Given I am setting up a panel generation
  When I select an interaction pose preset
  And I assign characters to positions
  Then the system should show "This will use: OpenPose + Depth"
  And I can override/adjust if needed
  And I add natural language details
  And I click Generate
```

**⚠️ CRITICAL:** DO NOT BLOCK future extensions to Level 0.

---

## 📤 FLOW 8: Export

### 8.1 Export Formats

**MVP:**
| Format | Description |
|--------|-------------|
| PNG (page) | Single page export |
| PNG (all) | Stitched all pages |
| PDF | Print-ready, all pages |

**Post-MVP:**
| Format | Description |
|--------|-------------|
| PSD | Layered (DO NOT BLOCK) |
| Binary Archive | For sharing between instances |
| Web Format | Optimized for viewer |

---

### 8.2 Export Options

**MVP:**
- Metadata always included (prompt, ComfyUI-style + Graphix metadata)

**Post-MVP:**
- Resolution/DPI
- Color profile (sRGB, CMYK)
- Bleed/margins
- Flatten vs. layered (DO NOT BLOCK)

---

## 🔄 FLOW 9: YOLO Mode

### 9.1 Scope

**All levels supported:**
- Single panel (iterate until quality)
- Single page (generate all panels)
- Full story (generate everything)

```gherkin
Scenario: YOLO full story
  Given I have a complete story outline
  When I say "Generate everything, I'm going grocery shopping"
  Then the system should generate all pages
  And all panels within each page
  And iterate on low-quality results
  And I should return to completed work
```

---

### 9.2 Controls

**System Defaults (User-Configurable):**
```typescript
interface YOLOSettings {
  qualityThreshold: number;     // Stop when rating > X (default: 3)
  maxIterations: number;        // Per panel (default: 5)
  timeLimit?: number;           // Optional minutes
  checkpointInterval?: number;  // Pause every N generations for review
}
```

---

### 9.3 Review

**UI:** Full history, per-page/panel, like Cursor file review

```
┌─────────────────────────────────────────────────────────────┐
│ YOLO REVIEW: Otters Yacht Story                             │
├─────────────────────────────────────────────────────────────┤
│ Page 1                                           [Approve All]│
│ ├── Panel 1: ✅ Approved (iteration 2)          [View]      │
│ ├── Panel 2: ⚠️ Needs Review (iteration 5)      [View]      │
│ └── Panel 3: ✅ Approved (iteration 1)          [View]      │
│                                                             │
│ Page 2                                           [Approve All]│
│ ├── Panel 1: ✅ Approved (iteration 3)          [View]      │
│ └── Panel 2: 🔄 In Progress...                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ SYSTEM CONFIGURATION

### User Roles (DO NOT BLOCK)

**MVP:** Single user

**Post-MVP:**
| Role | Permissions |
|------|-------------|
| Admin | Everything |
| Artist | Create, edit, generate |
| Viewer | View only |
| PM | View, comment, approve |
| Collaborator | Edit specific projects |

---

### Persistent Settings

| Setting | Type | Default |
|---------|------|---------|
| Default model/checkpoint | string | "illustrious" |
| Default quality preset | string | "balanced" |
| Theme | 'dark' \| 'light' | 'dark' |
| N-up count | number | 4 |
| Auto-save interval | number | 30s |
| YOLO defaults | YOLOSettings | (see above) |
| Keyboard shortcuts | Map | (standard) |

---

### Error Handling

| Channel | When |
|---------|------|
| Toast notification | Always |
| Push notification | If PWA, for long operations |
| Inline error | If UI element visible |
| Console/log | Always (for debugging) |

**Retry Strategy:**
- Smart defaults with user override
- Detect "network down" vs "transient error"
- "Network down": Pause and notify, don't retry blindly
- "Transient": Retry N times with backoff
- Always fail gracefully with fallback

---

## 🧪 TEST MAPPING

Each flow maps to:

| Artifact | Format | Purpose |
|----------|--------|---------|
| UAT Scenarios | Gherkin (.feature) | Acceptance testing |
| E2E Tests | Playwright (.spec.ts) | Automated testing |
| UX Flows | Figma/diagrams | Design reference |
| API Contracts | OpenAPI | Backend validation |

**Example mapping for Flow 5.4 (Iteration Actions):**

```gherkin
# uat/panel-generation.feature

Feature: Panel Generation Iteration

@mvp @priority-high
Scenario: Regenerate panel with same settings
  Given I have a generated panel
  When I click the "Regenerate" button
  Then a new generation should start
  And it should use the same prompt
  And it should use a different seed
  And I should see the new result in the N-up grid

@mvp @priority-high  
Scenario: Add generation to character references
  Given I see a generation I love
  When I click the "Add to Refs" star icon
  Then the image should be saved to the character's references
  And I should see a confirmation toast
  And the icon should show "saved" state
```

---

## 📊 COVERAGE MATRIX

| Flow | UAT | E2E | UX | API |
|------|-----|-----|----|----|
| 1. Entry | ⬜ | ⬜ | ⬜ | N/A |
| 2. Project Creation | ⬜ | ⬜ | ⬜ | ⬜ |
| 3. Story/Narrative | ⬜ | ⬜ | ⬜ | ⬜ |
| 4. Characters | ⬜ | ⬜ | ⬜ | ⬜ |
| 5. Panel Generation | ⬜ | ⬜ | ⬜ | ⬜ |
| 6. Page Composition | ⬜ | ⬜ | ⬜ | ⬜ |
| 7. ControlNet | ⬜ | ⬜ | ⬜ | ⬜ |
| 8. Export | ⬜ | ⬜ | ⬜ | ⬜ |
| 9. YOLO | ⬜ | ⬜ | ⬜ | ⬜ |

*⬜ = Not started | 🟡 = In progress | ✅ = Complete*

---

## 🚫 DO NOT BLOCK LIST

These features are post-MVP but architecture MUST support them:

1. **Custom layouts** — Illustrator-killer vision
2. **LoRA training** — Character consistency
3. **RBAC** — Multi-user collaboration
4. **Layered export** — PSD, etc.
5. **Level 0 ControlNet** — System Just Knows™
6. **Vector similarity search** — Character matching
7. **Panel visual editing** — Resize, rotate, overlap

---

*This document is the THOROUGH AS SHIT artifact. Update as implementation proceeds.*
