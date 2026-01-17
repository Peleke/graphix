# Graphix UI Wireframes

**Version:** 1.0.0  
**Date:** January 17, 2026  
**Author:** Agent 2 (Wireframes & UX Design)  
**Status:** DRAFT  

---

## Document Overview

This document contains low-fidelity wireframes for all MVP screens based on the user flows specification. Each wireframe uses ASCII diagrams optimized for dark theme, Illustrator-style collapsible panels, and keyboard-first interaction.

### Design Constraints Applied
- **Dark theme default** — All wireframes assume dark background
- **Collapsible panels** — Sidebars and panels can collapse to icons
- **Keyboard shortcuts** — All major actions have shortcuts (shown in brackets)
- **Desktop-first** — Optimized for 1920x1080+, responsive down to 1280x720
- **WCAG AA** — Contrast ratios, focus indicators, screen reader support

### Notation Key
```
┌─────┐  Box/Container
│     │  
└─────┘  

[Button]  Clickable button
(○)       Radio button
[×]       Close button
[▼]       Dropdown
───────   Divider
│ │ │     Vertical divider/splitter
...       Content truncated
⌘K        Keyboard shortcut
```

---

## 🚪 FLOW 1: Application Entry

### 1.1 First-Time Onboarding Wizard

**Trigger:** First launch of Graphix  
**Keyboard:** `Esc` to skip, `Enter` to proceed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                            ┌─────────────────────┐                          │
│                            │      GRAPHIX        │                          │
│                            │    ────────────     │                          │
│                            │                     │                          │
│                            │   Welcome, Creator  │                          │
│                            │                     │                          │
│                            │  Let's get you set  │                          │
│                            │  up in 60 seconds   │                          │
│                            │                     │                          │
│                            │  ┌───────────────┐  │                          │
│                            │  │ Start Tour    │  │  ← Primary action        │
│                            │  └───────────────┘  │                          │
│                            │                     │                          │
│                            │  ┌───────────────┐  │                          │
│                            │  │ Skip to App   │  │  ← Secondary             │
│                            │  └───────────────┘  │                          │
│                            │                     │                          │
│                            │  ○ ○ ○ ○ ○         │  ← Progress dots          │
│                            └─────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Onboarding Step: Sample Project

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────┐       │
│     │                                                               │       │
│     │   Step 2 of 5: Explore a Sample Project                       │       │
│     │   ─────────────────────────────────────────────────────────   │       │
│     │                                                               │       │
│     │   ┌─────────────────────────────────────────────────────┐     │       │
│     │   │                                                     │     │       │
│     │   │    [Sample Comic Preview]                           │     │       │
│     │   │                                                     │     │       │
│     │   │    "Otters at Sunset" - 4 pages                     │     │       │
│     │   │                                                     │     │       │
│     │   │    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │     │       │
│     │   │    │ P1  │ │ P2  │ │ P3  │ │ P4  │                  │     │       │
│     │   │    └─────┘ └─────┘ └─────┘ └─────┘                  │     │       │
│     │   │                                                     │     │       │
│     │   └─────────────────────────────────────────────────────┘     │       │
│     │                                                               │       │
│     │   [◀ Back]                      [Explore This] [Skip ▶]       │       │
│     │                                                               │       │
│     │   ● ○ ○ ○ ○                                                   │       │
│     └───────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Getting Started Modal (Returning User)

**Trigger:** Returning user with existing projects  
**Keyboard:** `N` new project, `1-9` recent projects, `Esc` close

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  GRAPHIX                                                        [×]   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────────┐ │  │
│  │  │ RECENT PROJECTS     │  │                                         │ │  │
│  │  │                     │  │  🎨 New Comic Project           [⌘N]    │ │  │
│  │  │ ▸ Otters Yacht Club │  │  🖼️  New Illustration           [⌘⇧N]   │ │  │
│  │  │   Marina Solo       │  │                                         │ │  │
│  │  │   Test Project      │  │  ─────────────────────────────────────  │ │  │
│  │  │                     │  │                                         │ │  │
│  │  │                     │  │  📁 Continue Recent                     │ │  │
│  │  │                     │  │  ┌─────────────────────────────────────┐│ │  │
│  │  │                     │  │  │ ▸ Otters Yacht Club (2h ago)    [1] ││ │  │
│  │  │                     │  │  │   Marina Solo (yesterday)       [2] ││ │  │
│  │  │                     │  │  │   Test Project (3 days ago)     [3] ││ │  │
│  │  │                     │  │  └─────────────────────────────────────┘│ │  │
│  │  │                     │  │                                         │ │  │
│  │  │                     │  │  [📥 Import]        [📋 From Template]  │ │  │
│  │  │                     │  │                                         │ │  │
│  │  └─────────────────────┘  │  ─────────────────────────────────────  │ │  │
│  │                           │                                         │ │  │
│  │                           │  💬 "What do you want to create?"       │ │  │
│  │                           │  ┌─────────────────────────────────────┐│ │  │
│  │                           │  │ Type here to chat...          [⌘K] ││ │  │
│  │                           │  └─────────────────────────────────────┘│ │  │
│  │                           └─────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Main Dashboard

**Trigger:** After dismissing Getting Started or from menu  
**Keyboard:** `⌘1-4` switch views, `⌘N` new project

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX          [🔍 Search ⌘K]                    [⚙️] [👤] [?]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ALL PROJECTS                              [+ New Project]     │
│  │ 📁      │  ──────────────────────────────────────────────────────────    │
│  │ All     │                                                                │
│  │         │  Sort: [Recent ▼]  Filter: [All Types ▼]  View: [▦] [≡]        │
│  ├─────────┤  ──────────────────────────────────────────────────────────    │
│  │ 📚      │                                                                │
│  │ Comics  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │         │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │             │
│  ├─────────┤  │ │         │ │  │ │         │ │  │ │         │ │             │
│  │ 🖼️      │  │ │ Preview │ │  │ │ Preview │ │  │ │ Preview │ │             │
│  │ Illust  │  │ │         │ │  │ │         │ │  │ │         │ │             │
│  │         │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │             │
│  ├─────────┤  │             │  │             │  │             │             │
│  │ ⭐      │  │ Otters Yacht│  │ Marina Solo │  │ Test Proj   │             │
│  │ Starred │  │ 12 pages    │  │ 4 pages     │  │ 1 page      │             │
│  │         │  │ 2 hours ago │  │ Yesterday   │  │ 3 days ago  │             │
│  ├─────────┤  └─────────────┘  └─────────────┘  └─────────────┘             │
│  │ 🗑️      │                                                                │
│  │ Trash   │                                                                │
│  └─────────┘                                                                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [?] Help  │  Status: Ready  │  ComfyUI: Connected ●                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 FLOW 2: Project Creation (Chat-to-Start)

### 2.1 Chat Interface

**Trigger:** Click chat input or ⌘K  
**Keyboard:** `Enter` send, `⇧Enter` newline, `Esc` close

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  ◀ Back to Dashboard                       [⚙️] [👤] [?]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌────────────────────────────────────────┐               │
│                    │                                        │               │
│                    │   🤖 What would you like to create?    │               │
│                    │                                        │               │
│                    │   I can help you start a new comic,    │               │
│                    │   illustration, or continue an         │               │
│                    │   existing project.                    │               │
│                    │                                        │               │
│                    ├────────────────────────────────────────┤               │
│                    │                                        │               │
│                    │   👤 I want to make a story about      │               │
│                    │   two otters falling in love on a      │               │
│                    │   yacht at sunset                      │               │
│                    │                                        │               │
│                    ├────────────────────────────────────────┤               │
│                    │                                        │               │
│                    │   🤖 That sounds lovely! Let me ask    │               │
│                    │   a few questions to help set this up: │               │
│                    │                                        │               │
│                    │   **Characters:**                      │               │
│                    │   Who are the two otters? Do they      │               │
│                    │   have names, personalities?           │               │
│                    │                                        │               │
│                    │   [Marina] [Cove] [+ Add Character]    │               │
│                    │                                        │               │
│                    └────────────────────────────────────────┘               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Type your response...                                    [Send ⏎]   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Quick responses: [Use existing characters] [Create new] [Skip for now]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Project Bootstrap Confirmation

**Trigger:** AI has gathered enough information  
**Keyboard:** `Enter` create, `E` edit details, `Esc` cancel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  ◀ Back to Chat                            [⚙️] [👤] [?]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   ✨ Ready to Create Your Project                                     │  │
│  │   ─────────────────────────────────────────────────────────────────   │  │
│  │                                                                       │  │
│  │   PROJECT: "Otters Yacht Romance"                          [Edit ✏️] │  │
│  │   ─────────────────────────────────────────────────────────────────   │  │
│  │                                                                       │  │
│  │   📖 STORY                                                            │  │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │   │ A romantic 8-page comic about Marina and Cove's evening         │ │  │
│  │   │ together on a luxury yacht as the sun sets...                   │ │  │
│  │   └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │   🎭 CHARACTERS (2)                                       [Edit ✏️]  │  │
│  │   ┌──────────────┐  ┌──────────────┐                                 │  │
│  │   │ 👤 Marina    │  │ 👤 Cove      │                                 │  │
│  │   │ Female otter │  │ Male otter   │                                 │  │
│  │   │ Brown fur    │  │ Gray fur     │                                 │  │
│  │   └──────────────┘  └──────────────┘                                 │  │
│  │                                                                       │  │
│  │   📄 PAGES: 8 suggested                                   [Edit ✏️]  │  │
│  │   🎨 STYLE: Warm, romantic, golden hour lighting          [Edit ✏️]  │  │
│  │                                                                       │  │
│  │   ─────────────────────────────────────────────────────────────────   │  │
│  │                                                                       │  │
│  │   [◀ Back to Chat]                              [Create Project ⏎]   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📖 FLOW 3: Story/Narrative Management

### 3.1 Tree View (Navigation Sidebar)

**Trigger:** Project open, default left panel  
**Keyboard:** `↑↓` navigate, `→` expand, `←` collapse, `Enter` select

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Otters Yacht Romance                     [⚙️] [👤] [?]       │
├──────────────┼──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  STORY       │                                                              │
│  ──────────  │                                                              │
│              │             [Main Content Area]                              │
│  ▼ 📖 Story  │                                                              │
│    │         │             Currently showing:                               │
│    ├─ Global │             Selected node's editor                           │
│    │  Narr.  │                                                              │
│    │         │                                                              │
│    ▼ 📄 Pg 1 │                                                              │
│      │       │                                                              │
│      ├─ Narr │                                                              │
│      ├─ 🖼️ 1 │                                                              │
│      ├─ 🖼️ 2 │                                                              │
│      └─ 🖼️ 3 │                                                              │
│              │                                                              │
│    ▸ 📄 Pg 2 │                                                              │
│    ▸ 📄 Pg 3 │                                                              │
│    ▸ 📄 Pg 4 │                                                              │
│              │                                                              │
│  ──────────  │                                                              │
│  [+ Page]    │                                                              │
│              │                                                              │
│  CHARACTERS  │                                                              │
│  ──────────  │                                                              │
│  👤 Marina   │                                                              │
│  👤 Cove     │                                                              │
│  [+ Char]    │                                                              │
│              │                                                              │
├──────────────┴──────────────────────────────────────────────────────────────┤
│  Tree [⌘1] │ Outline [⌘2] │ Board [⌘3]                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Outline Editor (Scrivener-style)

**Trigger:** Switch to Outline view (⌘2)  
**Keyboard:** `Tab` indent, `⇧Tab` outdent, `⌘↵` new item

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Otters Yacht Romance                     [⚙️] [👤] [?]       │
├──────────────┴──────────────────────────────────────────────────────────────┤
│                                                                             │
│  OUTLINE EDITOR                                                   [▼ ≡ ▦]  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  📖 GLOBAL NARRATIVE                                       [⚙️]    │    │
│  │  ───────────────────────────────────────────────────────────────    │    │
│  │  A romantic evening unfolds as Marina and Cove share a sunset       │    │
│  │  dinner on their yacht. What starts as a casual meal becomes...     │    │
│  │                                                                     │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │                                                                     │    │
│  │  📄 PAGE 1: The Invitation                              [Generate]  │    │
│  │  ───────────────────────────────────────────────────────────────    │    │
│  │  Marina receives an unexpected invitation from Cove...              │    │
│  │                                                                     │    │
│  │    🖼️ Panel 1.1                                                     │    │
│  │    ─────────────────────────────────────────────────────────────    │    │
│  │    NARRATIVE: Marina checks her phone, eyes widening               │    │
│  │    INTENT: female otter, looking at phone, surprised expression    │    │
│  │    [Edit Prompt] [Generate] [View Image]                           │    │
│  │                                                                     │    │
│  │    🖼️ Panel 1.2                                                     │    │
│  │    ─────────────────────────────────────────────────────────────    │    │
│  │    NARRATIVE: She smiles, already imagining the evening            │    │
│  │    INTENT: female otter, dreamy smile, soft lighting               │    │
│  │    [Edit Prompt] [Generate] [View Image]                           │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Tree [⌘1] │ Outline [⌘2] │ Board [⌘3]                    Word count: 342   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Narrative Editor Modal

**Trigger:** Click "Edit" on any narrative field  
**Keyboard:** `⌘S` save, `Esc` cancel, `⌘⏎` save and generate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  EDIT NARRATIVE                                             [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  Panel 1.1 • Page 1                                               │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  NARRATIVE (Story Text)                              [AI ✨]      │   │
│     │  ┌───────────────────────────────────────────────────────────┐    │   │
│     │  │ Marina's phone buzzes. She glances down, her eyes         │    │   │
│     │  │ widening as she reads Cove's message: "Sunset dinner      │    │   │
│     │  │ on the yacht tonight. Just us."                           │    │   │
│     │  │                                                           │    │   │
│     │  │ Her heart skips a beat.                                   │    │   │
│     │  └───────────────────────────────────────────────────────────┘    │   │
│     │                                                                   │   │
│     │  ↓ [Convert to Prompt]                                            │   │
│     │                                                                   │   │
│     │  IMAGE INTENT                                        [AI ✨]      │   │
│     │  ┌───────────────────────────────────────────────────────────┐    │   │
│     │  │ female otter, brown fur, looking at smartphone,           │    │   │
│     │  │ surprised expression, eyes wide, indoor setting,          │    │   │
│     │  │ soft window lighting, casual clothes                      │    │   │
│     │  └───────────────────────────────────────────────────────────┘    │   │
│     │                                                                   │   │
│     │  [Show Final Prompt ▼]  ← Expands to show machine-optimized       │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [Cancel]                        [Save ⌘S] [Save & Generate ⌘⏎]   │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎭 FLOW 4: Character Management

### 4.1 Character List Panel

**Trigger:** Click Characters in sidebar or ⌘4  
**Keyboard:** `↑↓` select, `Enter` edit, `N` new character

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Otters Yacht Romance                     [⚙️] [👤] [?]       │
├──────────────┼──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  STORY       │  CHARACTERS                                   [+ New ⌘N]    │
│  ──────────  │  ────────────────────────────────────────────────────────   │
│  ▸ 📖 Story  │                                                              │
│              │  ┌─────────────────────────────────────────────────────────┐ │
│  CHARACTERS  │  │                                                         │ │
│  ──────────  │  │  ┌──────────┐  ┌──────────────────────────────────────┐ │ │
│              │  │  │          │  │ MARINA                               │ │ │
│  ▸ Marina ●  │  │  │  [REF]   │  │ ──────────────────────────────────── │ │ │
│    Cove      │  │  │  IMAGE   │  │ Species: Sea Otter                   │ │ │
│              │  │  │          │  │ Fur: Brown with cream belly          │ │ │
│  [+ Char]    │  │  └──────────┘  │ Eyes: Amber                          │ │ │
│              │  │                │ Personality: Playful, romantic       │ │ │
│              │  │                │                                      │ │ │
│              │  │                │ [Edit] [Generate Ref] [Delete]       │ │ │
│              │  │                └──────────────────────────────────────┘ │ │
│              │  │                                                         │ │
│              │  └─────────────────────────────────────────────────────────┘ │
│              │                                                              │
│              │  ┌─────────────────────────────────────────────────────────┐ │
│              │  │                                                         │ │
│              │  │  ┌──────────┐  ┌──────────────────────────────────────┐ │ │
│              │  │  │          │  │ COVE                                 │ │ │
│              │  │  │  [REF]   │  │ ──────────────────────────────────── │ │ │
│              │  │  │  IMAGE   │  │ Species: Sea Otter                   │ │ │
│              │  │  │          │  │ Fur: Silver-gray                     │ │ │
│              │  │  └──────────┘  │ Eyes: Deep blue                      │ │ │
│              │  │                │ Personality: Calm, thoughtful        │ │ │
│              │  │                │                                      │ │ │
│              │  │                │ [Edit] [Generate Ref] [Delete]       │ │ │
│              │  │                └──────────────────────────────────────┘ │ │
│              │  │                                                         │ │
│              │  └─────────────────────────────────────────────────────────┘ │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 4.2 Character Editor

**Trigger:** Click "Edit" on character or double-click  
**Keyboard:** `⌘S` save, `Tab` next field, `Esc` cancel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Character Editor: Marina                 [⚙️] [👤] [?]       │
├──────────────┴──────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │                              │  │                                      │ │
│  │  REFERENCE IMAGES            │  │  BASIC INFO                          │ │
│  │  ────────────────────────    │  │  ────────────────────────────────    │ │
│  │                              │  │                                      │ │
│  │  ┌────────┐ ┌────────┐       │  │  Name*     [Marina________________]  │ │
│  │  │        │ │        │       │  │  Species*  [Sea Otter_____________]  │ │
│  │  │ Front  │ │  Side  │       │  │                                      │ │
│  │  │        │ │        │       │  │  ────────────────────────────────    │ │
│  │  └────────┘ └────────┘       │  │                                      │ │
│  │  ┌────────┐ ┌────────┐       │  │  APPEARANCE*                         │ │
│  │  │        │ │        │       │  │  ┌──────────────────────────────┐    │ │
│  │  │  3/4   │ │  Back  │       │  │  │ Brown fur with cream belly,  │    │ │
│  │  │        │ │        │       │  │  │ amber eyes, small rounded    │    │ │
│  │  └────────┘ └────────┘       │  │  │ ears, sleek whiskers...      │    │ │
│  │                              │  │  └──────────────────────────────┘    │ │
│  │  [+ Upload] [Generate ✨]    │  │                                      │ │
│  │                              │  │  COLOR PALETTE*                      │ │
│  │                              │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │ │
│  └──────────────────────────────┘  │  │#8B5│ │#F5E│ │#D4A│ │#2C1│        │ │
│                                    │  │ A2B│ │ BD7│ │ 574│ │ 810│        │ │
│  ┌──────────────────────────────┐  │  └────┘ └────┘ └────┘ └────┘        │ │
│  │                              │  │  [Extract from Image] [+ Add]        │ │
│  │  PROMPT FRAGMENTS            │  │                                      │ │
│  │  ────────────────────────    │  └──────────────────────────────────────┘ │
│  │                              │                                           │
│  │  Auto-generated from above:  │  ┌──────────────────────────────────────┐ │
│  │                              │  │                                      │ │
│  │  ┌────────────────────────┐  │  │  PERSONALITY (Optional)              │ │
│  │  │ sea otter, female,     │  │  │  ────────────────────────────────    │ │
│  │  │ brown fur, cream belly,│  │  │                                      │ │
│  │  │ amber eyes, (marina)   │  │  │  [Playful] [Romantic] [+ Add Trait]  │ │
│  │  └────────────────────────┘  │  │                                      │ │
│  │                              │  │  Notes:                              │ │
│  │  [Edit] [Regenerate ✨]      │  │  ┌──────────────────────────────┐    │ │
│  │                              │  │  │ Usually smiling, ears perked │    │ │
│  └──────────────────────────────┘  │  └──────────────────────────────┘    │ │
│                                    │                                      │ │
│                                    └──────────────────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Cancel]                                                    [Save ⌘S]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Reference Gallery (Expressions/Poses)

**Trigger:** Expand "Reference Images" section  
**Keyboard:** `←→` navigate, `Space` select, `Del` remove

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  REFERENCE GALLERY: Marina                                           [×]    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TURNAROUND VIEWS                                          [+ Generate All] │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                               │
│  │        │ │        │ │        │ │        │                               │
│  │ Front  │ │  Side  │ │  3/4   │ │  Back  │                               │
│  │   ✓    │ │   ✓    │ │   ○    │ │   ○    │   ○ = needs generation        │
│  └────────┘ └────────┘ └────────┘ └────────┘                               │
│                                                                             │
│  EXPRESSIONS                                                  [+ Generate]  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │        │ │        │ │        │ │        │ │        │ │        │        │
│  │ Happy  │ │  Sad   │ │ Angry  │ │Surprise│ │ Flirty │ │   +    │        │
│  │   ✓    │ │   ✓    │ │   ○    │ │   ✓    │ │   ✓    │ │  Add   │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                                             │
│  FROM GENERATIONS (Auto-collected)                         [View All →]     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │        │ │        │ │        │ │        │ │        │   Starred from     │
│  │ Gen #1 │ │ Gen #2 │ │ Gen #5 │ │Gen #12 │ │Gen #18 │   panel generation │
│  │  ⭐    │ │  ⭐    │ │  ⭐    │ │  ⭐    │ │  ⭐    │                    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Selected: 3 images                    [Use in Panel] [Train LoRA →]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖼️ FLOW 5: Panel Generation & Iteration

### 5.1 Panel Editor (Main Generation View)

**Trigger:** Click on panel from Tree/Outline or Page Composer  
**Keyboard:** `G` generate, `R` regenerate, `V` vary, `1-4` select result

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Page 1 › Panel 2                         [⚙️] [👤] [?]       │
├──────────────┼──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  STORY       │  ┌────────────────────────────────────────────────────────┐  │
│  ──────────  │  │                                                        │  │
│  ▸ 📖 Story  │  │                    PANEL PREVIEW                       │  │
│              │  │                                                        │  │
│  ▼ 📄 Pg 1   │  │  ┌─────────────────────────────────────────────────┐   │  │
│    ├─ 🖼️ 1   │  │  │                                                 │   │  │
│    ├─ 🖼️ 2 ● │  │  │                                                 │   │  │
│    └─ 🖼️ 3   │  │  │              [Current Image]                    │   │  │
│              │  │  │                                                 │   │  │
│  ▸ 📄 Pg 2   │  │  │               or "No image yet"                 │   │  │
│              │  │  │                                                 │   │  │
│  ──────────  │  │  │                                                 │   │  │
│              │  │  └─────────────────────────────────────────────────┘   │  │
│  CHARACTERS  │  │                                                        │  │
│  ──────────  │  │  [👍] [👎]    [⭐ Add to Refs]    [🔍 Zoom]            │  │
│  ☑ Marina    │  │                                                        │  │
│  ☑ Cove      │  └────────────────────────────────────────────────────────┘  │
│              │                                                              │
│  ──────────  │  PROMPT                                                      │
│              │  ┌────────────────────────────────────────────────────────┐  │
│  CONTROLS    │  │ two sea otters, romantic dinner, yacht deck, sunset,   │  │
│  ──────────  │  │ golden hour lighting, wine glasses, intimate mood...   │  │
│  [ControlNet]│  └────────────────────────────────────────────────────────┘  │
│  [Settings]  │  [Edit Full Prompt ✏️]                                       │
│              │                                                              │
│              │  ─────────────────────────────────────────────────────────   │
│              │                                                              │
│              │  [Generate G]  [Batch 4]  N-up: [4▼]  Seed: [Random▼]       │
│              │                                                              │
├──────────────┴──────────────────────────────────────────────────────────────┤
│  ◀ Prev Panel [←]                              [→] Next Panel ▶             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 N-up Grid (Result Comparison)

**Trigger:** After generation completes  
**Keyboard:** `1-4` select, `Enter` approve, `X` dismiss, `Space` toggle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Page 1 › Panel 2 › Results              [⚙️] [👤] [?]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GENERATION RESULTS                              Batch #3 • 4 of 4 complete │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │           [1]               │  │           [2]               │          │
│  │                             │  │     ┌───────────────┐       │          │
│  │                             │  │     │   SELECTED    │       │  ← green │
│  │                             │  │     └───────────────┘       │    border│
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │           [3]               │  │           [4]               │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  │                             │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Selected: #2                                                               │
│                                                                             │
│  [✓ Approve]  [✗ Dismiss All]  [🔄 Regenerate]  [🎲 Vary Selected]          │
│                                                                             │
│  [✏️ Edit + Regen]  [⭐ Add to Refs]  [💬 Feedback]  [More ▼]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Generation Progress (Inline)

**Trigger:** Generation started  
**Keyboard:** `Esc` cancel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  GENERATING...                                                 [Cancel ⎋]  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │                             │  │                             │          │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │          │
│  │  │                       │  │  │  │                       │  │          │
│  │  │    [Low-res preview]  │  │  │  │    [Low-res preview]  │  │          │
│  │  │                       │  │  │  │                       │  │          │
│  │  │   Step 12/20          │  │  │  │   Step 8/20           │  │          │
│  │  │   ████████░░░░ 60%    │  │  │  │   █████░░░░░░░ 40%    │  │          │
│  │  └───────────────────────┘  │  │  └───────────────────────┘  │          │
│  │                             │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │                             │  │                             │          │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │          │
│  │  │                       │  │  │  │                       │  │          │
│  │  │      Queued (3)       │  │  │  │      Queued (4)       │  │          │
│  │  │                       │  │  │  │                       │  │          │
│  │  │         ⏳            │  │  │  │         ⏳            │  │          │
│  │  │                       │  │  │  │                       │  │          │
│  │  └───────────────────────┘  │  │  └───────────────────────┘  │          │
│  │                             │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  Queue: 2 remaining • ETA: ~45 seconds                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Iteration Actions (Expanded Menu)

**Trigger:** Click "More" or right-click on result  
**Keyboard:** `I` inpaint, `P` extract pose

```
┌───────────────────────────────────┐
│  ACTIONS                          │
├───────────────────────────────────┤
│  PRIMARY                          │
│  ─────────────────────────────    │
│  🔄 Regenerate          [R]       │
│  🎲 Vary                [V]       │
│  ✏️ Edit + Regen        [E]       │
│  ⭐ Add to Refs         [S]       │
├───────────────────────────────────┤
│  SECONDARY                        │
│  ─────────────────────────────    │
│  🎨 Inpaint Region      [I]       │
│  🖼️ img2img             [M]       │
│  🦴 Extract Pose        [P]       │
├───────────────────────────────────┤
│  ORGANIZATION                     │
│  ─────────────────────────────    │
│  👤 Add to Character              │
│  💬 Log Feedback        [F]       │
│  📋 Copy Prompt                   │
│  💾 Export Image                  │
└───────────────────────────────────┘
```

### 5.5 Feedback Modal

**Trigger:** Click "Feedback" on generation  
**Keyboard:** `⌘Enter` submit, `Esc` cancel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  GENERATION FEEDBACK                                        [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  ┌──────────────┐                                                 │   │
│     │  │              │   Generation #127                               │   │
│     │  │   [Thumb]    │   Panel 1.2 • Batch 3, Image 2                  │   │
│     │  │              │                                                 │   │
│     │  └──────────────┘                                                 │   │
│     │                                                                   │   │
│     │  QUICK RATING                                                     │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [👍 Good]     [👎 Bad]     [Skip]                                │   │
│     │                                                                   │   │
│     │  WHAT WENT WRONG? (Optional)                                      │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  (○) Character wrong    (○) Pose wrong    (○) Composition         │   │
│     │  (○) Style mismatch     (○) Content issue (○) Other               │   │
│     │                                                                   │   │
│     │  DETAILS                                                          │   │
│     │  ┌───────────────────────────────────────────────────────────┐    │   │
│     │  │ Expected: Marina looking at Cove lovingly                 │    │   │
│     │  │ Got: Marina looking away, wrong fur color                 │    │   │
│     │  └───────────────────────────────────────────────────────────┘    │   │
│     │                                                                   │   │
│     │  ☑ Auto-analyze with AI (compare prompt vs result)                │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [Cancel]                                        [Submit ⌘⏎]      │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 FLOW 6: Page Composition

### 6.1 Page Composer (Main View)

**Trigger:** Click "Page View" or ⌘5  
**Keyboard:** `1-9` select slot, `↑↓←→` navigate, `Space` swap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Page 1 Composer                          [⚙️] [👤] [?]       │
├──────────────┼──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  PAGES       │  ┌────────────────────────────────────────────────────────┐  │
│  ──────────  │  │                                                        │  │
│  [📄 1] ●    │  │  ┌──────────────────┐  ┌──────────────────┐            │  │
│  [📄 2]      │  │  │                  │  │                  │            │  │
│  [📄 3]      │  │  │                  │  │                  │            │  │
│  [📄 4]      │  │  │     Panel 1      │  │     Panel 2      │            │  │
│  [+ Page]    │  │  │    [SELECTED]    │  │                  │            │  │
│              │  │  │                  │  │                  │            │  │
│  ──────────  │  │  │   Click to edit  │  │                  │            │  │
│              │  │  └──────────────────┘  └──────────────────┘            │  │
│  LAYOUT      │  │                                                        │  │
│  ──────────  │  │  ┌──────────────────────────────────────────┐          │  │
│  Current:    │  │  │                                          │          │  │
│  ┌───┬───┐   │  │  │                                          │          │  │
│  │ 1 │ 2 │   │  │  │              Panel 3                     │          │  │
│  ├───┴───┤   │  │  │                                          │          │  │
│  │   3   │   │  │  │                                          │          │  │
│  └───────┘   │  │  │                                          │          │  │
│              │  │  └──────────────────────────────────────────┘          │  │
│  [Change]    │  │                                                        │  │
│              │  └────────────────────────────────────────────────────────┘  │
│  ──────────  │                                                              │
│              │  ─────────────────────────────────────────────────────────   │
│  SETTINGS    │                                                              │
│  Gutter: 12  │  Selected: Panel 1                                           │
│  Bleed: On   │  [Edit Panel ✏️]  [Swap ⇄]  [Regen 🔄]  [Remove ✗]           │
│              │                                                              │
├──────────────┴──────────────────────────────────────────────────────────────┤
│  [◀ Prev Page]  Page 1 of 4  [Next Page ▶]              [Export Page 📤]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Layout Picker Modal

**Trigger:** Click "Change" layout  
**Keyboard:** `1-9` select, `Enter` apply

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  SELECT PAGE LAYOUT                                         [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  STANDARD LAYOUTS                                                 │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │   │
│     │  │     │  │  │  │  │     │  │ │ │ │  │     │  │  │  │           │   │
│     │  │  1  │  │ 1│ 2│  ├─────┤  │1│2│3│  │  1  │  │ 1│ 2│           │   │
│     │  │     │  │  │  │  │  2  │  ├─┴─┴─┤  ├──┬──┤  ├──┼──┤           │   │
│     │  │     │  │  │  │  │     │  │  4  │  │ 2│ 3│  │ 3│ 4│           │   │
│     │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │   │
│     │   [1]      [2]      [3]      [4]      [5]      [6]              │   │
│     │                                     ▲ selected                   │   │
│     │                                                                   │   │
│     │  CINEMATIC                                                        │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  ┌─────────┐  ┌─────────┐  ┌─────────┐                           │   │
│     │  │    1    │  │ 1 │  2  │  │ 1 │ 2│ 3│                           │   │
│     │  ├─────────┤  ├───┴─────┤  ├───┴──┴──┤                           │   │
│     │  │    2    │  │    3    │  │    4    │                           │   │
│     │  └─────────┘  └─────────┘  └─────────┘                           │   │
│     │     [7]          [8]          [9]                                │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [Cancel]                                       [Apply Layout]    │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Panel Slot Editor (Side Panel Drill-down)

**Trigger:** Double-click panel slot in Page Composer  
**Keyboard:** `Esc` return, `⌘S` save changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ Page 1 Composer                          [⚙️] [👤] [?]       │
├──────────────┼────────────────────────────┬─────────────────────────────────┤
│              │                            │                                 │
│  PAGES       │  PAGE VIEW (Dimmed)        │  PANEL 1 EDITOR                 │
│  ──────────  │  ┌──────────────────────┐  │  ────────────────────────────   │
│  [📄 1] ●    │  │ ┌────────┐┌────────┐ │  │                                 │
│  [📄 2]      │  │ │ [1] ●  ││   2    │ │  │  ◀ Back to Page [Esc]           │
│  [📄 3]      │  │ └────────┘└────────┘ │  │                                 │
│  [📄 4]      │  │ ┌──────────────────┐ │  │  ┌─────────────────────────┐    │
│              │  │ │        3         │ │  │  │                         │    │
│              │  │ └──────────────────┘ │  │  │    [Panel Preview]      │    │
│              │  └──────────────────────┘  │  │                         │    │
│              │                            │  │                         │    │
│              │                            │  └─────────────────────────┘    │
│              │                            │                                 │
│              │                            │  PROMPT                         │
│              │                            │  ┌─────────────────────────┐    │
│              │                            │  │ Marina looking at phone │    │
│              │                            │  │ surprised expression... │    │
│              │                            │  └─────────────────────────┘    │
│              │                            │                                 │
│              │                            │  [Edit] [Generate] [History]    │
│              │                            │                                 │
│              │                            │  ─────────────────────────────  │
│              │                            │                                 │
│              │                            │  [Swap Image ▼]                 │
│              │                            │  [Apply & Return ⌘S]            │
│              │                            │                                 │
├──────────────┴────────────────────────────┴─────────────────────────────────┤
│  Editing Panel 1 • Unsaved changes                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ FLOW 7: ControlNet Configuration

### 7.1 ControlNet Panel (Level 3 - Visual Cards)

**Trigger:** Click "Controls" in Panel Editor  
**Keyboard:** `1-9` toggle control, `D` drop reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CONTROLS                                                      [Level 3 ▼] │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ACTIVE CONTROLS                                                            │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │            │  │            │  │            │  │            │            │
│  │  OpenPose  │  │   Depth    │  │  Lineart   │  │ IP-Adapter │            │
│  │     👤     │  │     🏔️    │  │     ✏️     │  │     🎨     │            │
│  │            │  │            │  │            │  │            │            │
│  │  ████████  │  │  ░░░░░░░░  │  │  ░░░░░░░░  │  │  ████░░░░  │            │
│  │   [ON]     │  │   [OFF]    │  │   [OFF]    │  │   [ON]     │            │
│  │   0.85     │  │     -      │  │     -      │  │   0.60     │            │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘            │
│       [1]            [2]            [3]            [4]                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  REFERENCE IMAGE                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │            Drop reference image here or [Browse...]                 │    │
│  │                                                                     │    │
│  │                    Supports: JPG, PNG, WebP                         │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Quick: [From Character ▼]  [From Previous Gen ▼]  [Pose Library ▼]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 ControlNet Panel (Level 4 - Full Control)

**Trigger:** Switch to Level 4 in dropdown  
**Keyboard:** `Tab` next field, `⇧Tab` previous

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CONTROLS                                                      [Level 4 ▼] │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ OPENPOSE                                                    [ON ●]  │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                     │    │
│  │  Model:        [openpose_full ▼]                                    │    │
│  │  Preprocessor: [dw_openpose_full ▼]                                 │    │
│  │                                                                     │    │
│  │  Control Weight    ├──────────●──────┤  0.85                        │    │
│  │  Start Step        ├●────────────────┤  0.00                        │    │
│  │  End Step          ├────────────────●┤  1.00                        │    │
│  │                                                                     │    │
│  │  Resize Mode:      (●) Crop  (○) Fit  (○) Stretch                   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ IP-ADAPTER                                                  [ON ●]  │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                     │    │
│  │  Model:        [ip-adapter-plus_sd15 ▼]                             │    │
│  │                                                                     │    │
│  │  Weight            ├──────────●──────┤  0.60                        │    │
│  │  Noise:            ├────●────────────┤  0.20                        │    │
│  │                                                                     │    │
│  │  Reference:  ┌──────────┐                                           │    │
│  │              │ [thumb]  │  marina-ref-01.png                        │    │
│  │              └──────────┘  [Change] [Remove]                        │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [+ Add Control ▼]                    [Save as Preset] [Load Preset ▼]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Reference Processor

**Trigger:** Drop reference image  
**Keyboard:** `Enter` apply selected

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  PROCESS REFERENCE IMAGE                                    [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  SOURCE                    EXTRACTED CONTROLS                     │   │
│     │  ┌──────────────┐         ┌──────────────┐ ┌──────────────┐      │   │
│     │  │              │         │              │ │              │      │   │
│     │  │              │         │   Skeleton   │ │  Depth Map   │      │   │
│     │  │   [Input     │   →     │              │ │              │      │   │
│     │  │    Image]    │         │     [✓]      │ │     [✓]      │      │   │
│     │  │              │         │              │ │              │      │   │
│     │  │              │         └──────────────┘ └──────────────┘      │   │
│     │  │              │         ┌──────────────┐ ┌──────────────┐      │   │
│     │  └──────────────┘         │              │ │              │      │   │
│     │                           │   Lineart    │ │    Canny     │      │   │
│     │                           │              │ │              │      │   │
│     │                           │     [ ]      │ │     [ ]      │      │   │
│     │                           │              │ │              │      │   │
│     │                           └──────────────┘ └──────────────┘      │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  Selected: Skeleton, Depth Map                                    │   │
│     │  Will apply: OpenPose (0.85), Depth (0.70)                        │   │
│     │                                                                   │   │
│     │  [Cancel]                                    [Apply Controls ⏎]   │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📤 FLOW 8: Export

### 8.1 Export Dialog

**Trigger:** Click "Export" from Page Composer or menu  
**Keyboard:** `⌘E` open, `Enter` export

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  EXPORT PROJECT                                             [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  PROJECT: Otters Yacht Romance (4 pages)                          │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  WHAT TO EXPORT                                                   │   │
│     │  (●) Current Page (Page 1)                                        │   │
│     │  (○) Page Range:  [1] to [4]                                      │   │
│     │  (○) Entire Project (4 pages)                                     │   │
│     │                                                                   │   │
│     │  FORMAT                                                           │   │
│     │  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │   │
│     │  │            │  │            │  │            │                  │   │
│     │  │    PNG     │  │    PDF     │  │   PAGES    │                  │   │
│     │  │    🖼️     │  │    📄     │  │    📑     │                  │   │
│     │  │            │  │            │  │            │                  │   │
│     │  │  [ACTIVE]  │  │            │  │            │                  │   │
│     │  └────────────┘  └────────────┘  └────────────┘                  │   │
│     │   Individual      Single PDF      PNG per page                    │   │
│     │   stitched        document        (ZIP)                           │   │
│     │                                                                   │   │
│     │  OPTIONS                                                          │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  ☑ Include metadata (prompts, settings)                           │   │
│     │  ☐ Include source files                                           │   │
│     │  Resolution: [Print 300 DPI ▼]                                    │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  Destination: ~/Downloads/                          [Choose...]   │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [Cancel]                                          [Export ⌘E]    │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLOW 9: YOLO Mode

### 9.1 YOLO Setup

**Trigger:** Click "YOLO Mode" from menu or ⌘Y  
**Keyboard:** `Enter` start, `Esc` cancel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │  🔄 YOLO MODE SETUP                                         [×]   │   │
│     ├───────────────────────────────────────────────────────────────────┤   │
│     │                                                                   │   │
│     │  "Generate everything while you're away"                          │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  SCOPE                                                            │   │
│     │  (○) Single Panel (current)                                       │   │
│     │  (○) Single Page (Page 1)                                         │   │
│     │  (●) Entire Story (4 pages, 12 panels)                            │   │
│     │                                                                   │   │
│     │  QUALITY SETTINGS                                                 │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  Quality Threshold     ├────────────●──┤  Good (3/5)              │   │
│     │  Max Iterations/Panel  ├────●──────────┤  5 attempts              │   │
│     │                                                                   │   │
│     │  ☐ Time Limit: [ 60 ] minutes                                     │   │
│     │  ☐ Pause for review every [ 10 ] generations                      │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │                                                                   │   │
│     │  ESTIMATES                                                        │   │
│     │  • Panels to generate: 12                                         │   │
│     │  • Max generations: 60 (12 × 5)                                   │   │
│     │  • Estimated time: 30-90 minutes                                  │   │
│     │                                                                   │   │
│     │  ─────────────────────────────────────────────────────────────    │   │
│     │  [Cancel]           [🔄 Start YOLO Mode - Go get coffee! ☕]      │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 YOLO Review

**Trigger:** YOLO completes or user returns  
**Keyboard:** `A` approve all, `↑↓` navigate, `Enter` view

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  GRAPHIX  │ YOLO Review: Otters Yacht Romance        [⚙️] [👤] [?]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOLO REVIEW                                               Status: COMPLETE │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Summary: 12 panels generated • 10 approved • 2 need review                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  PAGE 1                                              [Approve All]  │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  ├── Panel 1.1  ✅ Approved (iteration 2)              [View]       │    │
│  │  ├── Panel 1.2  ✅ Approved (iteration 1)              [View]       │    │
│  │  └── Panel 1.3  ⚠️ Needs Review (iteration 5)          [View]       │    │
│  │                                                                     │    │
│  │  PAGE 2                                              [Approve All]  │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  ├── Panel 2.1  ✅ Approved (iteration 3)              [View]       │    │
│  │  ├── Panel 2.2  ✅ Approved (iteration 1)              [View]       │    │
│  │  └── Panel 2.3  ✅ Approved (iteration 2)              [View]       │    │
│  │                                                                     │    │
│  │  PAGE 3                                              [Approve All]  │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  ├── Panel 3.1  ⚠️ Needs Review (iteration 5)          [View]       │    │
│  │  └── Panel 3.2  ✅ Approved (iteration 2)              [View]       │    │
│  │                                                                     │    │
│  │  PAGE 4                                              [Approve All]  │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  ├── Panel 4.1  ✅ Approved (iteration 1)              [View]       │    │
│  │  ├── Panel 4.2  ✅ Approved (iteration 4)              [View]       │    │
│  │  └── Panel 4.3  ✅ Approved (iteration 2)              [View]       │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Approve All Good]  [Review Flagged (2)]  [Export When Done]  [Re-run ⚠️]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 INTERACTION PATTERNS

### Navigation Patterns

| Pattern | Trigger | Behavior |
|---------|---------|----------|
| **Breadcrumb** | Click path segment | Navigate to that level |
| **Sidebar Nav** | Click item | Load in main content area |
| **Modal Drill-down** | Double-click | Open editor in overlay |
| **Side Panel** | Single-click | Slide-out contextual editor |
| **Tab Switch** | ⌘1-5 | Switch main view mode |

### State Transitions

```
Dashboard → [New Project] → Chat Interface → Bootstrap → Workspace
              ↓
         [Open Project] → Workspace
```

```
Workspace Navigation:
Tree View ⟷ Outline Editor ⟷ Kanban Board (future)
     ↓            ↓
Panel Editor ← → Page Composer
     ↓
N-up Grid → Feedback Modal
```

### Keyboard Shortcut Summary

| Context | Shortcut | Action |
|---------|----------|--------|
| Global | `⌘K` | Command palette / Chat |
| Global | `⌘N` | New project |
| Global | `⌘S` | Save |
| Global | `⌘Z` / `⌘⇧Z` | Undo / Redo |
| Global | `⌘1-5` | Switch views |
| Panel | `G` | Generate |
| Panel | `R` | Regenerate |
| Panel | `V` | Vary |
| Panel | `1-4` | Select result |
| Panel | `Enter` | Approve selected |
| Panel | `X` | Dismiss |
| Navigation | `←` / `→` | Prev/Next panel |
| Navigation | `⌘←` / `⌘→` | Prev/Next page |

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Desktop XL | ≥1920px | Full layout, all panels |
| Desktop | ≥1280px | Standard layout |
| Tablet | ≥768px | Collapsible sidebar |
| Mobile | <768px | Not supported (warning) |

---

*This wireframe document is a living artifact. Update as implementation proceeds and feedback is gathered.*
