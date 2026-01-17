# Graphix Component Inventory

**Version:** 1.0.0  
**Date:** January 17, 2026  
**Author:** Agent 2 (Wireframes & UX Design)  
**Status:** DRAFT  

---

## Document Overview

This document catalogs all UI components needed to implement the Graphix wireframes. Components are organized by category and complexity, with accessibility requirements noted.

---

## 🏗️ Layout Components

### Shell & Navigation

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `AppShell` | Main application wrapper with header, sidebar, content | `sidebar`, `header`, `children` | Skip links, landmarks |
| `Header` | Top bar with logo, search, user menu | `title`, `actions` | `role="banner"` |
| `Sidebar` | Collapsible left navigation | `collapsed`, `items`, `onToggle` | `role="navigation"`, keyboard nav |
| `SidebarItem` | Navigation item with icon | `icon`, `label`, `active`, `badge` | Focus visible |
| `Breadcrumb` | Path navigation | `items`, `separator` | `aria-label="Breadcrumb"` |
| `StatusBar` | Bottom status information | `status`, `connection` | Live region for status |

### Content Layout

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `SplitPane` | Resizable split view | `direction`, `sizes`, `min`, `max` | Keyboard resize |
| `Panel` | Collapsible content panel | `title`, `collapsed`, `actions` | `aria-expanded` |
| `TabGroup` | Tab navigation container | `tabs`, `active`, `onChange` | `role="tablist"` |
| `Tab` | Individual tab | `label`, `icon`, `active` | `role="tab"`, `aria-selected` |
| `TabPanel` | Tab content area | `id`, `active` | `role="tabpanel"` |

---

## 🎯 Core UI Components

### Buttons

| Component | Variants | Props | Accessibility |
|-----------|----------|-------|---------------|
| `Button` | `primary`, `secondary`, `ghost`, `danger` | `variant`, `size`, `icon`, `loading`, `disabled` | Focus visible, disabled state |
| `IconButton` | - | `icon`, `label`, `size`, `variant` | `aria-label` required |
| `ButtonGroup` | - | `orientation`, `children` | `role="group"` |
| `SplitButton` | - | `primary`, `dropdown` | Keyboard accessible dropdown |

### Form Controls

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `Input` | Text input field | `type`, `placeholder`, `error`, `prefix`, `suffix` | `aria-invalid`, `aria-describedby` |
| `Textarea` | Multi-line text | `rows`, `resize`, `maxLength` | Character count announced |
| `Select` | Dropdown select | `options`, `value`, `searchable` | Listbox pattern |
| `Checkbox` | Boolean toggle | `checked`, `indeterminate`, `label` | `role="checkbox"` |
| `Radio` | Single selection | `options`, `value`, `name` | `role="radiogroup"` |
| `Slider` | Range input | `min`, `max`, `step`, `value` | `role="slider"`, keyboard control |
| `Switch` | On/off toggle | `checked`, `label` | `role="switch"` |
| `ColorPicker` | Color selection | `value`, `presets`, `format` | Color name announced |

### Data Display

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `Card` | Content container | `header`, `footer`, `padding` | Semantic grouping |
| `Avatar` | User/character image | `src`, `fallback`, `size` | `alt` text |
| `Badge` | Status indicator | `variant`, `count` | `aria-label` for meaning |
| `Tag` | Label/category | `label`, `color`, `removable` | Keyboard remove |
| `Tooltip` | Hover information | `content`, `placement` | Keyboard accessible |
| `ProgressBar` | Linear progress | `value`, `max`, `label` | `role="progressbar"` |
| `Skeleton` | Loading placeholder | `width`, `height`, `variant` | `aria-busy` |

### Feedback

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `Toast` | Notification popup | `message`, `type`, `duration`, `action` | Live region, focus management |
| `Alert` | Inline message | `type`, `title`, `description`, `dismissible` | `role="alert"` |
| `Spinner` | Loading indicator | `size`, `label` | `aria-label`, hidden from SR when decorative |
| `EmptyState` | No content placeholder | `icon`, `title`, `description`, `action` | Descriptive content |

---

## 🖼️ Canvas & Image Components

### Image Display

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `ImagePreview` | Zoomable image viewer | `src`, `alt`, `zoom`, `onLoad` | `alt` required, keyboard zoom |
| `ImageGrid` | N-up comparison grid | `images`, `columns`, `selected`, `onSelect` | Grid navigation |
| `ImageThumbnail` | Small image preview | `src`, `selected`, `badge` | `aria-selected` |
| `DropZone` | Drag-and-drop area | `accept`, `onDrop`, `multiple` | Keyboard accessible, instructions |
| `ImagePlaceholder` | Empty image slot | `label`, `action` | Descriptive label |

### Canvas

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `PageCanvas` | Page composition canvas | `layout`, `panels`, `editable` | Keyboard panel selection |
| `PanelSlot` | Individual panel container | `panel`, `selected`, `onEdit` | Focus management |
| `LayoutGrid` | Visual layout guide | `columns`, `rows`, `gutters` | Hidden from SR |
| `ZoomControls` | Canvas zoom buttons | `zoom`, `onZoom`, `min`, `max` | Keyboard accessible |

---

## 📝 Content Components

### Text & Narrative

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `NarrativeEditor` | Rich text for story | `value`, `onChange`, `aiAssist` | Semantic editing |
| `PromptEditor` | Prompt text with tokens | `value`, `tokens`, `onChange` | Token navigation |
| `TokenTag` | Prompt token display | `token`, `type`, `removable` | Keyboard management |
| `CharacterMention` | @character reference | `character`, `onClick` | Announced as link |

### Tree & Hierarchy

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `TreeView` | Hierarchical list | `items`, `expanded`, `selected` | `role="tree"`, arrow keys |
| `TreeItem` | Tree node | `label`, `icon`, `expandable`, `children` | `role="treeitem"` |
| `OutlineItem` | Outline editor row | `level`, `content`, `collapsed` | Semantic headings |

---

## 🎭 Domain-Specific Components

### Character Management

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `CharacterCard` | Character summary | `character`, `selected`, `onEdit` | Focus management |
| `CharacterEditor` | Full character form | `character`, `onSave`, `onCancel` | Form validation |
| `ColorPalette` | Character colors | `colors`, `onAdd`, `onRemove` | Color names |
| `ReferenceGallery` | Image reference grid | `images`, `category`, `onSelect` | Grid navigation |
| `ExpressionGrid` | Expression variations | `expressions`, `onGenerate` | Labeled expressions |

### Generation

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `GenerateButton` | Primary generate action | `loading`, `disabled`, `batch` | Loading state |
| `NUpGrid` | Generation results | `results`, `selected`, `onSelect` | `role="listbox"` |
| `GenerationCard` | Single result | `image`, `selected`, `actions` | `role="option"` |
| `IterationActions` | Regen/vary/edit buttons | `onRegenerate`, `onVary`, `onEdit` | Keyboard shortcuts |
| `FeedbackForm` | Generation feedback | `generation`, `onSubmit` | Form validation |
| `ProgressOverlay` | Generation progress | `progress`, `preview`, `onCancel` | Live progress |

### ControlNet

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `ControlCard` | Control toggle card | `control`, `enabled`, `strength` | Switch pattern |
| `ControlPanel` | Full control settings | `controls`, `level`, `onChange` | Collapsible sections |
| `ReferenceProcessor` | Process ref image | `image`, `extractions`, `onApply` | Multi-select |
| `StrengthSlider` | Control strength | `value`, `label`, `onChange` | Slider with label |

### Page Composition

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `PageComposer` | Page layout editor | `page`, `layout`, `onEdit` | Canvas navigation |
| `LayoutPicker` | Layout template selector | `layouts`, `selected`, `onSelect` | Grid selection |
| `LayoutPreview` | Layout thumbnail | `layout`, `selected` | Descriptive label |
| `PanelEditor` | In-context panel edit | `panel`, `onSave`, `onBack` | Focus management |
| `GutterControl` | Spacing adjustment | `value`, `onChange` | Slider pattern |

### Export

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `ExportDialog` | Export options modal | `project`, `onExport` | Focus trap |
| `FormatSelector` | Export format picker | `formats`, `selected` | `role="radiogroup"` |
| `ExportProgress` | Export progress | `progress`, `status` | Live region |

### YOLO Mode

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `YOLOSetup` | YOLO configuration | `scope`, `settings`, `onStart` | Form pattern |
| `YOLOReview` | Review generated content | `results`, `onApprove` | Tree navigation |
| `YOLOStatus` | In-progress status | `progress`, `eta`, `onPause` | Live updates |

---

## 🔲 Modal & Overlay Components

| Component | Description | Props | Accessibility |
|-----------|-------------|-------|---------------|
| `Modal` | Dialog overlay | `open`, `title`, `onClose`, `size` | Focus trap, `role="dialog"` |
| `ConfirmDialog` | Confirmation prompt | `title`, `message`, `onConfirm`, `onCancel` | Destructive warning |
| `Drawer` | Side panel overlay | `open`, `position`, `onClose` | Focus trap |
| `Popover` | Anchored content | `trigger`, `content`, `placement` | Keyboard dismiss |
| `ContextMenu` | Right-click menu | `items`, `position` | `role="menu"` |
| `CommandPalette` | ⌘K search/commands | `commands`, `onSelect` | Combobox pattern |

---

## 📊 Summary Statistics

### Component Count by Category

| Category | Count |
|----------|-------|
| Layout | 12 |
| Core UI | 24 |
| Canvas/Image | 9 |
| Content | 7 |
| Domain-Specific | 24 |
| Modal/Overlay | 6 |
| **Total** | **82** |

### Implementation Priority

| Priority | Components | Rationale |
|----------|------------|-----------|
| **P0 - Foundation** | `AppShell`, `Button`, `Input`, `Modal`, `Toast` | Required for any UI |
| **P1 - Core Flows** | `ImageGrid`, `NUpGrid`, `GenerateButton`, `TreeView` | Enables MVP flows |
| **P2 - Enhancement** | `CharacterEditor`, `ControlPanel`, `PageComposer` | Completes feature set |
| **P3 - Polish** | `CommandPalette`, `YOLOReview`, `ExpressionGrid` | Nice-to-have |

### Accessibility Checklist

All components must support:

- [ ] Keyboard navigation
- [ ] Focus indicators (visible focus ring)
- [ ] Screen reader announcements
- [ ] Color contrast (WCAG AA - 4.5:1 text, 3:1 UI)
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] Touch targets (minimum 44x44px)

---

## 🧩 Component Dependencies

```
AppShell
├── Header
│   ├── Button
│   ├── IconButton
│   └── Avatar
├── Sidebar
│   ├── SidebarItem
│   └── Badge
└── StatusBar
    └── Badge

PageComposer
├── PageCanvas
│   ├── PanelSlot
│   │   ├── ImagePreview
│   │   └── ImagePlaceholder
│   └── LayoutGrid
├── LayoutPicker
│   └── LayoutPreview
└── Panel (sidebar)
    └── GutterControl (Slider)

NUpGrid
├── GenerationCard
│   ├── ImageThumbnail
│   ├── Badge
│   └── Checkbox
├── IterationActions
│   ├── Button
│   └── IconButton
└── ProgressOverlay
    ├── ProgressBar
    └── ImagePreview
```

---

## 🎨 Design Token Integration

Components should consume these token categories:

| Category | Usage |
|----------|-------|
| `colors.background.*` | Surface colors |
| `colors.foreground.*` | Text colors |
| `colors.semantic.*` | Status colors |
| `colors.brand.*` | Accent/CTA |
| `spacing.*` | Padding, margins, gaps |
| `radii.*` | Border radius |
| `shadows.*` | Elevation |
| `typography.*` | Font sizing |
| `animations.*` | Transitions |

---

*This component inventory is a living document. Update as implementation reveals new needs or consolidation opportunities.*
