# Graphix UI Layer Plan

## Executive Summary

Based on the "Golden Hour" comic generation workflow, graphix needs a comprehensive UI layer to make the comic creation process accessible and efficient. The current REST API and MCP tools are powerful but require technical knowledge to use effectively.

## Target Users

1. **Comic Artists** - Want visual tools for storyboarding and composition
2. **Writers** - Need story scaffolding and narrative tools
3. **Hybrid Creators** - Use AI generation with manual refinement
4. **Teams** - Collaborate on multi-chapter projects

## Core UI Components

### 1. Project Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  📚 My Projects                              [+ New Project] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ Golden  │  │ Chapter │  │  New    │                      │
│  │  Hour   │  │   2     │  │ Project │                      │
│  │ 20/20 ✓ │  │  5/24   │  │         │                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Project cards with thumbnail and progress
- Quick filters: In Progress, Completed, All
- Bulk operations: Archive, Export, Duplicate

### 2. Story Editor (NEW - Priority)

```
┌─────────────────────────────────────────────────────────────┐
│  📖 Story: Golden Hour                        [AI Assist ▼] │
├─────────────────────────────────────────────────────────────┤
│  ACT I: The Arrival                                    [+]  │
│  ├── Scene 1: Marina at the dock                            │
│  │   └── Panel 1: Wide shot, golden hour lighting           │
│  │   └── Panel 2: Leo extends hand                          │
│  ├── Scene 2: Boarding the yacht                            │
│  │   └── Panel 3: Wonder on her face                        │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  [Generate Panels from Story] [Export to Storyboard]        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Hierarchical story structure (Acts → Scenes → Panels)
- AI-assisted panel description generation
- Drag-and-drop reordering
- Story → Storyboard sync
- Prose export for companion novellas

### 3. Character Designer

```
┌─────────────────────────────────────────────────────────────┐
│  🎭 Characters                                [+ Character] │
├────────────────────┬────────────────────────────────────────┤
│  Marina            │  Visual Reference        Prompt Tags   │
│  ┌────────┐        │  ┌─────────────┐        ┌───────────┐ │
│  │  [img] │        │  │ [reference] │        │ female    │ │
│  └────────┘        │  └─────────────┘        │ otter     │ │
│                    │                          │ curvy     │ │
│  Leo               │  Identity Embedding      │ floral    │ │
│  ┌────────┐        │  [Extract] [Apply]       │ sundress  │ │
│  │  [img] │        │                          └───────────┘ │
│  └────────┘        │                                        │
└────────────────────┴────────────────────────────────────────┘
```

**Features:**
- Visual character cards
- Reference image upload
- Prompt tag builder with autocomplete
- Identity extraction from generated images
- Character templates library

### 4. Storyboard View

```
┌─────────────────────────────────────────────────────────────┐
│  🎬 Storyboard: Golden Hour                   [Grid] [List] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │          │
│  │ ✓   │ │ ✓   │ │ ⏳  │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│  Marina  Leo     Marina   Pour    Toast   Chat             │
│  arrives helps   boards   champ.  clink   sunset           │
├─────────────────────────────────────────────────────────────┤
│  [Generate Selected] [Generate All] [Batch Settings]       │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Thumbnail grid with status indicators
- Drag-and-drop reordering
- Multi-select for batch operations
- Quick preview on hover
- Inline panel editing

### 5. Panel Generator

```
┌─────────────────────────────────────────────────────────────┐
│  🖼️ Panel 3: Marina stepping aboard          [◀ Prev][Next ▶]│
├──────────────────────────────┬──────────────────────────────┤
│  Generated Variants          │  Panel Settings              │
│  ┌─────┐ ┌─────┐ ┌─────┐    │  Description:                │
│  │  A  │ │  B  │ │  C  │    │  ┌──────────────────────────┐│
│  │ ★   │ │     │ │     │    │  │Marina stepping onto deck ││
│  └─────┘ └─────┘ └─────┘    │  │looking around with wonder││
│  ┌─────┐                     │  └──────────────────────────┘│
│  │  D  │                     │  Characters: [Marina] [Leo]  │
│  │     │                     │  Quality: [Standard ▼]       │
│  └─────┘                     │  Style: [Anime ▼]            │
│                              │  ControlNet: [□Pose □Depth]  │
│  [Generate More] [Regenerate]│  [Apply to All Similar]      │
└──────────────────────────────┴──────────────────────────────┘
```

**Features:**
- Variant gallery with selection
- Side-by-side comparison
- Generation settings panel
- ControlNet reference upload
- IP-Adapter reference selection
- "Apply settings to similar panels" batch operation

### 6. Caption Editor

```
┌─────────────────────────────────────────────────────────────┐
│  💬 Captions: Panel 5                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │    ┌───────────────────┐                               ││
│  │    │ To unexpected     │                               ││
│  │    │ connections.      │◀─────                         ││
│  │    └───────────────────┘                               ││
│  │                           ┌───────────────┐            ││
│  │                           │ To tonight.   │            ││
│  │                        ───▶└───────────────┘            ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Captions:                                                  │
│  [Speech] "To unexpected connections." - Leo    [Edit][Del] │
│  [Speech] "To tonight." - Marina                [Edit][Del] │
│  [+ Add Caption]                                            │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Visual caption placement (drag-and-drop)
- Caption type selector (speech, thought, narration, SFX)
- Tail direction drag handle
- Character assignment
- Style presets per type
- Live preview

### 7. Page Composer

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Compose Pages                      [Template: Six Grid ▼]│
├─────────────────────────────────────────────────────────────┤
│  Available Panels          │  Page Preview                  │
│  ┌───┐┌───┐┌───┐┌───┐     │  ┌─────────────────────────┐   │
│  │ 1 ││ 2 ││ 3 ││ 4 │     │  │┌─────┐┌─────┐┌─────┐  │   │
│  └───┘└───┘└───┘└───┘     │  ││  1  ││  2  ││  3  │  │   │
│  ┌───┐┌───┐┌───┐┌───┐     │  │└─────┘└─────┘└─────┘  │   │
│  │ 5 ││ 6 ││ 7 ││ 8 │     │  │┌─────┐┌─────┐┌─────┐  │   │
│  └───┘└───┘└───┘└───┘     │  ││  4  ││  5  ││  6  │  │   │
│  ...                       │  │└─────┘└─────┘└─────┘  │   │
│                            │  └─────────────────────────┘   │
│  [Auto-Compose All]        │  Page 1 of 4  [◀][▶]          │
│  [Include Captions: ✓]     │  [Export Page] [Export All]    │
└────────────────────────────┴────────────────────────────────┘
```

**Features:**
- Drag panels to page slots
- Template selector with previews
- Auto-compose entire storyboard
- Caption toggle (with/without)
- Page navigation
- Export options (PNG, PDF, print-ready)

### 8. Export Center

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Export: Golden Hour                                     │
├─────────────────────────────────────────────────────────────┤
│  Export Presets:                                            │
│  ○ Web (PNG, 72dpi, sRGB)                                   │
│  ○ Print (TIFF, 300dpi, CMYK)                               │
│  ○ Ebook (PNG, optimized)                                   │
│  ● Custom                                                   │
│                                                             │
│  Include:                                                   │
│  [✓] Composed pages with captions                           │
│  [✓] Composed pages without captions                        │
│  [ ] Individual panels                                      │
│  [✓] Story text (Markdown)                                  │
│  [ ] Character sheets                                       │
│                                                             │
│  Output: [~/Desktop/golden-hour-export/]    [Browse]        │
│                                                             │
│  [Export Now]                                               │
└─────────────────────────────────────────────────────────────┘
```

## Technical Architecture

### Frontend Stack

- **Framework:** React 18+ with TypeScript
- **State:** Zustand or Jotai (lightweight, fits single-user)
- **UI Components:** Radix UI primitives + Tailwind CSS
- **Canvas:** Konva.js for visual editors (caption placement, page composition)
- **Routing:** React Router or TanStack Router

### API Integration

```typescript
// Generated from OpenAPI spec
import { GraphixClient } from '@graphix/client';

const client = new GraphixClient({
  baseUrl: 'http://localhost:3002',
});

// Type-safe API calls
const project = await client.projects.create({
  name: 'Golden Hour',
  description: 'A yacht romance',
});
```

### Real-time Updates

- **Option A:** Server-Sent Events for generation progress
- **Option B:** WebSocket for collaborative editing (future)
- **Polling fallback:** For simpler deployment

### File Handling

- Drag-and-drop image upload
- Progress indicators for generation
- Local caching for quick previews
- Cloud sync (optional, future)

## Implementation Phases

### Phase 1: Foundation (2-3 weeks)
- [ ] Project dashboard
- [ ] Character list view
- [ ] Basic storyboard grid
- [ ] Panel detail view
- [ ] OpenAPI client generation

### Phase 2: Generation (2-3 weeks)
- [ ] Panel generator with variants
- [ ] Generation progress UI
- [ ] Settings panels
- [ ] Batch operations

### Phase 3: Editing (2-3 weeks)
- [ ] Caption editor with visual placement
- [ ] Page composer with templates
- [ ] Export center
- [ ] Preview mode

### Phase 4: Story Tools (2-3 weeks)
- [ ] Story editor (hierarchical)
- [ ] AI-assisted descriptions
- [ ] Story → Storyboard sync
- [ ] Prose export

### Phase 5: Polish (ongoing)
- [ ] Keyboard shortcuts
- [ ] Undo/redo
- [ ] Responsive design
- [ ] Dark mode
- [ ] Accessibility audit

## Open Questions

1. **Deployment model:** Electron app vs. web app vs. both?
2. **Authentication:** Single-user local vs. multi-user with accounts?
3. **Collaboration:** Real-time editing or async sharing?
4. **Mobile:** Responsive web or native apps?

## Success Metrics

- Time to create 20-panel comic: < 30 minutes (vs. 2.5 hours current)
- Learning curve: Productive within 15 minutes
- User satisfaction: Net Promoter Score > 50

## Related Issues

- #20: IP-Adapter node installation
- (TBD): Batch panel creation API
- (TBD): Story scaffolding service
- (TBD): Caption position presets
