# Graphix UI Research Deep Dive

**Research Date:** January 17, 2026  
**Focus Areas:** UX/Design (Primary), Domain Research, Technical Patterns, Market Viability

---

## 🎯 Executive Summary

This research document provides the foundation for Graphix's UI layer development. Key findings:

1. **UX Trends 2025-2026** favor adaptive UIs, micro-interactions, dark mode defaults, and accessibility-first design
2. **Canvas Libraries:** Fabric.js emerges as the strongest candidate for our generalized canvas needs
3. **Theme Systems:** Design tokens + CSS variables enable the pluggable, npm-publishable theme system desired
4. **Distribution:** Tauri > Electron for modern desktop apps; PWA provides excellent web-first with offline support
5. **Professional Workflows:** Comic production follows a clear pipeline we should mirror in our UX

---

## 📊 Section 1: UX/Design Research (PRIMARY FOCUS)

### 1.1 Key UX Trends Shaping 2025-2026

| Trend | Description | Relevance to Graphix |
|-------|-------------|---------------------|
| **AI-Powered Adaptive UX** | Interfaces that adjust in real-time to user behavior, context, preferences | HIGH - Our AI generation should adapt to user's style preferences over time |
| **Micro-interactions & Motion** | Subtle animations for feedback, state changes, delight | HIGH - Generation progress, image selection, panel transitions |
| **Dark Mode as Default** | Auto-detection, OLED optimization, reduced eye strain | CRITICAL - Creative professionals work long hours; dark mode is expected |
| **Inclusive/Accessible Design** | WCAG compliance, neurodiversity support, motion reduction options | HIGH - Broadens audience, ethical foundation |
| **Narrative UI Over Dashboards** | "Here's what happened" summaries vs raw data dumps | MEDIUM - Project status, generation history storytelling |
| **Warm Minimalism** | Clean but not cold; soft textures, personality | HIGH - Avoid "AI slop" aesthetic; feel designed, not generated |
| **Multimodal Interfaces** | Voice, gesture, keyboard, touch all working together | MEDIUM - Future consideration for accessibility |

### 1.2 Comic Composition UI Patterns

From professional tools (Clip Studio Paint, Manga Studio, Procreate):

**Panel Layout Patterns:**
- **Gutter Control**: Adjustable spacing between panels (typically 10-30px)
- **Panel Shapes**: Rectangle (90%), trapezoid, circular, borderless
- **Reading Flow Guides**: Visual indicators for reading order (Z-pattern, manga right-to-left)
- **Snap-to-Grid**: Smart alignment with optional free-form override
- **Layer Management**: Panels as containers with internal layers (lineart, color, effects)

**Page Composition Patterns:**
- **Template System**: Pre-built layouts (3-panel, 4-panel, splash page, double-page spread)
- **Aspect Ratio Presets**: Standard comic sizes (US Letter, A4, Webtoon vertical scroll)
- **Bleed/Safe Area Guides**: Visual margins for print production
- **Master Pages**: Reusable layouts across project

**Interaction Patterns:**
- **Direct Manipulation**: Drag corners to resize, click to select
- **Context Menus**: Right-click for panel-specific actions
- **Property Panels**: Sidebar for detailed adjustments
- **Zoom + Pan**: Canvas navigation (scroll wheel, space+drag)
- **Multi-select**: Shift+click, marquee selection

### 1.3 AI Image Generation UI Patterns

From Midjourney, ComfyUI, A1111, and emerging tools:

**Iteration Workflow Patterns:**

| Pattern | Tool Example | UX Insight |
|---------|--------------|------------|
| **Grid Selection** | Midjourney 4-up | Users compare variations side-by-side; click to select favorite |
| **Linear History** | A1111 | Scroll through previous generations; compare with current |
| **Branching History** | ComfyUI | Tree view of variations; fork from any point |
| **Favorites/Pinning** | All | Star/heart to save promising results |
| **Quick Actions** | Midjourney | U1-U4 (upscale), V1-V4 (variation) buttons directly on results |

**Prompt Management Patterns:**
- **Prompt Templates**: Save and reuse prompt structures
- **Prompt History**: Quick access to recent prompts
- **Prompt Builder**: GUI for constructing prompts (style dropdowns, weight sliders)
- **Negative Prompts**: Separate input area for exclusions
- **Dynamic Tokens**: Variables like `{character_name}`, `{style}` that populate

**Generation Feedback Patterns:**
- **Progress Indicators**: Denoising step visualization, estimated time
- **Preview Thumbnails**: Low-res previews during generation
- **Queue Management**: Reorder, cancel, prioritize pending generations
- **Batch Controls**: Generate X variations, apply to all panels

### 1.4 Page Composer UX Requirements

Based on your "hero view" description, the Page Composer needs:

**Core Interactions:**
1. **Arrange Panels**: Drag-drop panels onto page layout
2. **Recursive Edit**: Click panel → drill into Panel Editor → return to Page
3. **Swap Image**: Quick-replace without leaving composer
4. **Regen from Here**: Regenerate with current prompt/settings
5. **Prompt Tweaking**: Inline prompt editing on selected panel
6. **Style Inheritance**: Apply page-level style that cascades to panels

**Navigation Patterns:**
- **Breadcrumb Trail**: Project > Story > Page 3 > Panel 2
- **Thumbnail Sidebar**: All pages in scrollable strip
- **Keyboard Navigation**: Arrow keys between panels, Page Up/Down between pages
- **Quick Jump**: Cmd+G to go to page number

**Advanced Operations:**
- **Panel Grouping**: Lock multiple panels together
- **Copy/Paste Layout**: Duplicate panel arrangements
- **Export Options**: Single page, page range, entire story
- **Presentation Mode**: Hide UI, full-screen for client review

### 1.5 Accessibility Requirements

**WCAG 2.2 Compliance (Target: AA):**

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | 4.5:1 minimum for text; 3:1 for UI components |
| **Keyboard Navigation** | Full app navigable without mouse |
| **Focus Indicators** | Visible focus rings on interactive elements |
| **Motion Reduction** | `prefers-reduced-motion` media query support |
| **Screen Reader** | ARIA labels, live regions for status updates |
| **Text Scaling** | Support 200% zoom without horizontal scroll |
| **Touch Targets** | Minimum 44x44px for touch interactions |

**Canvas-Specific Accessibility:**
- Provide alt-text for generated images
- Keyboard shortcuts for canvas operations
- Audio feedback option for generation complete
- High-contrast mode for canvas editing

---

## 🎨 Section 2: Domain Research (Furry Commission Workflows)

### 2.1 Professional Commission Pipeline

Based on industry research, the typical workflow:

```
1. CONCEPT PHASE
   └─> Client provides: Character refs, scenario description, mood
   └─> Artist creates: Rough thumbnails (3-5 options)
   └─> Client selects: Preferred composition

2. SKETCH PHASE
   └─> Artist creates: Refined sketch with poses, expressions
   └─> Client feedback: Adjustments to anatomy, expressions
   └─> Approval checkpoint

3. LINEART PHASE
   └─> Artist creates: Clean lines, final details
   └─> Client feedback: Minor tweaks (usually limited changes allowed)
   └─> Approval checkpoint

4. COLOR PHASE
   └─> Artist creates: Flat colors → shading → highlights
   └─> Client feedback: Color corrections, lighting adjustments
   └─> Final approval

5. DELIVERY
   └─> High-res files, multiple formats
   └─> Optional: Process video, layered files
```

### 2.2 Character Reference Sheet Components

For AI consistency, we need to capture:

| Component | Purpose | Typical Content |
|-----------|---------|-----------------|
| **Turnaround Views** | 3D understanding | Front, side, back, 3/4 views |
| **Expression Sheet** | Emotional range | Happy, sad, angry, surprised, neutral |
| **Color Palette** | Exact colors | Hex codes for fur, eyes, markings |
| **Marking Patterns** | Unique identifiers | Spots, stripes, scars, tattoos |
| **Outfit Variations** | Wardrobe | Casual, formal, action, sleep |
| **Accessories** | Props | Glasses, jewelry, weapons |
| **Scale Reference** | Size context | Height comparison, paw size |
| **Personality Notes** | Posture/attitude | "Usually smirking", "ears always perked" |

### 2.3 What Makes It "Professional"

Key differentiators from amateur work:

1. **Consistency**: Character looks the same across all panels/pages
2. **Composition**: Rule of thirds, leading lines, visual hierarchy
3. **Lighting**: Consistent light source, mood-appropriate
4. **Color Theory**: Harmonious palettes, intentional contrast
5. **Storytelling**: Clear visual narrative, emotional beats
6. **Polish**: Clean edges, no artifacts, high resolution
7. **Presentation**: Proper margins, professional export formats

### 2.4 Creative Flexibility Needs

Artists need room to:
- **Experiment**: Try wild variations without commitment
- **Happy Accidents**: Keep unexpected good results
- **Style Exploration**: Same scene, different aesthetics
- **Client Collaboration**: Share WIPs, gather feedback
- **Version Control**: Revert to previous approaches

**UI Implications:**
- Non-destructive editing
- Extensive history/undo
- Branching/forking workflows
- Easy comparison tools
- Shareable preview links (future)

---

## ⚙️ Section 3: Technical Research

### 3.1 Canvas Library Comparison

| Library | Pros | Cons | Best For |
|---------|------|------|----------|
| **Fabric.js** | Rich API, great docs, active community, image manipulation built-in, JSON serialization | Slightly larger bundle (~300KB) | ✅ **OUR USE CASE** - image placement, manipulation, export |
| **Konva.js** | Good React integration, performant, staging/layers | Less image-specific features | Interactive graphics, games |
| **PixiJS** | Extremely fast (WebGL), great for animation | Overkill for static layouts, steeper learning curve | Games, heavy animation |
| **Paper.js** | Vector-focused, great for paths | Less suited for raster images | Vector illustration |
| **React-Konva** | React bindings for Konva | Same limitations as Konva | React-specific projects |

**Fabric.js Advantages for Graphix:**
- Built-in image handling (load, crop, filter, transform)
- JSON serialization (save/restore canvas state)
- SVG import/export
- Object grouping (for panels)
- Free-form polygon support (for non-rectangular panels)
- Active development, good TypeScript support

### 3.2 Theme System Architecture

**Design Token Approach:**

```typescript
// @graphix/theme structure
interface ThemeTokens {
  colors: {
    background: { primary: string; secondary: string; tertiary: string };
    foreground: { primary: string; muted: string; accent: string };
    semantic: { success: string; warning: string; error: string; info: string };
    brand: { primary: string; secondary: string };
  };
  typography: {
    fonts: { sans: string; mono: string; display: string };
    sizes: { xs: string; sm: string; md: string; lg: string; xl: string };
    weights: { normal: number; medium: number; bold: number };
  };
  spacing: { 0: string; 1: string; 2: string; /* ... */ };
  radii: { none: string; sm: string; md: string; lg: string; full: string };
  shadows: { sm: string; md: string; lg: string };
  animations: { fast: string; normal: string; slow: string };
}
```

**Implementation Options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Panda CSS** | Atomic CSS, type-safe, build-time extraction | Newer, smaller ecosystem |
| **Vanilla Extract** | Zero-runtime, TypeScript-first | Requires build step |
| **CSS Variables + Runtime** | Simple, dynamic theming | Runtime overhead |
| **Tailwind + CSS Vars** | Familiar, large ecosystem | User requested NOT Tailwind |

**Recommendation:** Panda CSS for atomic styles + CSS variables for dynamic theme switching

**NPM Package Structure:**
```
@graphix/theme/
├── tokens/
│   ├── dark.ts       # Dark theme tokens
│   ├── light.ts      # Light theme tokens
│   └── base.ts       # Shared tokens
├── presets/
│   ├── cyberpunk.ts  # Example custom theme
│   ├── nord.ts
│   └── dracula.ts
├── utils/
│   ├── contrast.ts   # Accessibility utilities
│   └── generator.ts  # Theme generation helpers
└── index.ts          # Main export
```

### 3.3 PWA + Desktop Distribution

**Approach Comparison:**

| Aspect | PWA Only | Electron | Tauri | PWA + Tauri |
|--------|----------|----------|-------|-------------|
| **Bundle Size** | 0 (web) | 150MB+ | 3-10MB | 3-10MB |
| **Performance** | Good | Heavy | Native | Native |
| **File System** | Limited | Full | Full | Full |
| **Auto-Update** | Built-in | Manual | Built-in | Both |
| **Offline** | Service Worker | Full | Full | Full |
| **Development** | Simplest | Moderate | Moderate | Moderate |

**Recommendation:** **PWA-first, with Tauri wrapper for desktop**

Why:
1. PWA provides excellent web experience with offline support
2. Tauri uses system webview (not bundled Chromium like Electron)
3. Much smaller bundle size than Electron
4. Rust backend for performance-critical operations
5. Same codebase serves web and desktop

**Implementation Strategy:**
```
Phase 1: PWA (web-first)
├── Service worker for offline
├── Manifest for installability
└── IndexedDB for local storage

Phase 2: Tauri wrapper (when needed)
├── File system access
├── Native menus
└── System tray integration
```

### 3.4 Real-Time Generation Updates

**WebSocket/SSE Architecture:**

```typescript
// Server-sent events for generation progress
interface GenerationEvent {
  type: 'progress' | 'preview' | 'complete' | 'error';
  generationId: string;
  data: {
    step?: number;
    totalSteps?: number;
    previewUrl?: string;    // Low-res preview during gen
    imageUrl?: string;      // Final image URL
    error?: string;
  };
}

// Client subscription
const eventSource = new EventSource('/api/generations/stream');
eventSource.onmessage = (event) => {
  const data: GenerationEvent = JSON.parse(event.data);
  // Update UI based on event type
};
```

**Zustand Store Pattern:**
```typescript
interface GenerationStore {
  activeGenerations: Map<string, GenerationState>;
  subscribe: (generationId: string) => void;
  unsubscribe: (generationId: string) => void;
  updateProgress: (generationId: string, progress: GenerationEvent) => void;
}
```

---

## 💰 Section 4: Market Viability (Quick Assessment)

### 4.1 Monetization Potential

| Model | Viability | Notes |
|-------|-----------|-------|
| **Tool Sales** | LOW | Market saturated (A1111, ComfyUI are free) |
| **SaaS Subscription** | MEDIUM | Requires hosted compute, ongoing costs |
| **Commission Facilitation** | HIGH | Connect artists with clients, take % |
| **Template/Asset Marketplace** | MEDIUM | Sell pre-made styles, characters |
| **Enterprise Licensing** | LOW | Market too niche |

### 4.2 Realistic Path

Your instinct is correct: **monetize commissions, not the tool.**

Graphix becomes your competitive advantage for:
1. **Speed**: Faster iteration than manual artists
2. **Consistency**: AI-enforced character consistency
3. **Scale**: Handle more clients simultaneously
4. **Quality**: Professional output that rivals hand-drawn

The tool is your moat, not your product.

---

## 🎬 Section 5: Key Recommendations

### 5.1 Tech Stack Decisions

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| **Framework** | React 18+ | Ecosystem, talent pool, your familiarity |
| **State** | Zustand | Simple, performant, great for canvas state |
| **Routing** | TanStack Router | Type-safe, modern, good DX |
| **Styling** | Panda CSS + CSS Variables | Type-safe, no runtime, supports theming |
| **Canvas** | Fabric.js | Best image manipulation, JSON serialization |
| **Components** | Radix UI | Accessible primitives, unstyled |
| **Real-time** | SSE (Server-Sent Events) | Simpler than WebSocket for unidirectional |
| **Desktop** | Tauri (Phase 2) | Tiny bundle, native performance |
| **Icons** | Lucide React | Consistent, tree-shakeable |

### 5.2 UX Priorities for MVP

**MUST HAVE:**
1. Project Dashboard (list, create, manage projects)
2. Character Designer (define characters for consistency)
3. Storyboard View (arrange panels, set prompts)
4. Panel Generator (generate + iterate on single panels)
5. Page Composer (arrange panels into pages, export)

**SHOULD HAVE:**
6. Real-time generation progress
7. Dark/Light theme toggle
8. Keyboard shortcuts
9. Basic export (PNG, PDF)

**NICE TO HAVE (Post-MVP):**
10. Caption Editor (text generation)
11. Export Center (advanced formats)
12. Custom themes
13. Animation timeline (T2V, I2V)

### 5.3 Design Principles

1. **"Working Canvas" First**: Always show the creative work, minimize chrome
2. **Progressive Disclosure**: Simple by default, power features available
3. **Non-Destructive**: Every action can be undone/reverted
4. **Keyboard-First**: All common actions have shortcuts
5. **Feedback Rich**: Always show what's happening, progress, status
6. **Offline-Capable**: Core editing works without network
7. **Export-Ready**: One-click to professional output

---

## 📋 Section 6: Open Questions for Brainstorm

These are the questions we should discuss together:

### UX Questions
1. **Panel Generation Flow**: Generate one at a time, or batch generate entire page?
2. **Iteration UI**: Grid comparison (Midjourney-style) or linear history (A1111-style)?
3. **Character Consistency**: How prominent is the character reference in the UI?
4. **Style Presets**: How do users save/share their style configurations?

### Technical Questions
5. **Offline Storage**: SQLite (via OPFS) or IndexedDB for local project storage?
6. **Image Storage**: Keep images in DB or file system with references?
7. **Sync Strategy**: How do local and server storage reconcile?

### Business Questions
8. **Multi-User**: Will this ever need collaboration features?
9. **Community Sharing**: Share styles/templates with other Graphix users?
10. **ComfyUI Integration**: Direct integration or keep it abstracted?

---

## 🔗 References & Resources

### UX/Design
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Panda CSS Documentation](https://panda-css.com/)

### Canvas
- [Fabric.js Documentation](http://fabricjs.com/)
- [Fabric.js GitHub](https://github.com/fabricjs/fabric.js)

### Desktop Distribution
- [Tauri Documentation](https://tauri.app/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

### Comic Production
- [Clip Studio Paint Tips](https://www.clipstudio.net/)
- [Professional Comic Production Workflows](https://www.manga-audition.com/)

---

*This research document is a living artifact. Update as decisions are made and new information emerges.*
