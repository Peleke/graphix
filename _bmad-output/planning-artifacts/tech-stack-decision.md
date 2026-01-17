# Graphix UI Tech Stack Decision

**Version:** 1.0.0  
**Date:** January 17, 2026  
**Status:** APPROVED  
**Author:** Agent 1 (Tech Stack Finalization)

---

## Executive Summary

This document finalizes the UI technology stack for Graphix based on requirements from the product brief, user flows specification, and technical research. Each decision includes rationale, validation approach, and architectural implications.

---

## Decision Matrix

| Category | Decision | Runner-up | Rationale |
|----------|----------|-----------|-----------|
| **Canvas Library** | Fabric.js | Konva.js | Best image manipulation, JSON serialization, mature ecosystem |
| **CSS Solution** | Panda CSS | Vanilla Extract | Type-safe, build-time extraction, native theming support |
| **Component Library** | Radix UI | Ark UI | Most mature, best accessibility, large community |
| **State Management** | Zustand | Jotai | Simpler API, better for canvas state, proven at scale |
| **Routing** | TanStack Router | React Router | Type-safe, modern API, better DX |
| **Build Tool** | Vite | Turbopack | Proven stability, excellent plugin ecosystem, fast HMR |
| **Desktop Wrapper** | PWA-first, Tauri (Phase 2) | Electron | Tiny bundle, native performance, same codebase |
| **Icons** | Lucide React | Heroicons | Tree-shakeable, consistent style, active development |

---

## 1. Canvas Library: Fabric.js

### Decision

**Fabric.js v6** is the selected canvas library.

### Rationale

| Requirement | Fabric.js | Konva.js | PixiJS |
|-------------|-----------|----------|--------|
| Image manipulation | ✅ Native | ⚠️ Limited | ✅ Good |
| JSON serialization | ✅ Native `toJSON()/loadFromJSON()` | ⚠️ Manual | ❌ None |
| Object grouping (panels) | ✅ Native groups | ✅ Groups | ⚠️ Containers |
| Transform controls | ✅ Built-in | ✅ Transformer | ⚠️ Manual |
| TypeScript support | ✅ Official types | ✅ Good | ✅ Good |
| SVG import/export | ✅ Native | ⚠️ Limited | ❌ None |
| Bundle size | ~300KB | ~150KB | ~400KB |
| Learning curve | Medium | Medium | Steep |

### Key Advantages for Graphix

1. **Image-First**: Built specifically for image manipulation, filtering, cropping
2. **State Persistence**: Native JSON serialization enables saving/loading canvas state
3. **Panel Composition**: Object grouping maps perfectly to comic panels
4. **Transform UX**: Built-in controls for resize, rotate, scale
5. **Export Ready**: Native PNG/JPEG export with quality controls

### Validation PoC

See `packages/ui/src/canvas/fabric-poc.ts` for proof-of-concept demonstrating:
- Image loading and manipulation
- Object grouping (panel simulation)
- JSON serialization round-trip
- Transform interactions

### Architecture Implications

- Canvas state stored in Zustand, serialized to SQLite on save
- Panel = Fabric.Group containing images and overlays
- Page = Fabric.Canvas with multiple panel groups
- Undo/Redo via state snapshots (JSON diffs)

---

## 2. CSS Solution: Panda CSS

### Decision

**Panda CSS** is the selected styling solution.

### Rationale

| Requirement | Panda CSS | Vanilla Extract | Tailwind |
|-------------|-----------|-----------------|----------|
| Type-safe tokens | ✅ Native | ✅ Native | ⚠️ Plugin |
| Build-time extraction | ✅ Zero runtime | ✅ Zero runtime | ✅ JIT |
| Theme system | ✅ Semantic tokens | ✅ Themes | ⚠️ CSS vars |
| NPM publishable | ✅ Preset system | ⚠️ Complex | ⚠️ Config |
| DX (autocomplete) | ✅ Excellent | ✅ Good | ✅ Excellent |
| Component variants | ✅ CVA-style | ✅ Recipes | ⚠️ Manual |
| Dark mode | ✅ Native | ✅ Native | ✅ Native |

### Key Advantages for Graphix

1. **Type-Safe Tokens**: Catch theme errors at build time
2. **Zero Runtime**: No CSS-in-JS overhead for canvas-heavy app
3. **Semantic Tokens**: `color.primary` maps to different values per theme
4. **CVA Integration**: Native variant API for component states
5. **Preset System**: Future npm-publishable theme packages

### Theme Architecture

```
@graphix/ui/
├── theme/
│   ├── tokens/
│   │   ├── colors.ts      # Semantic color tokens
│   │   ├── typography.ts  # Font scales
│   │   ├── spacing.ts     # Spacing scale
│   │   └── radii.ts       # Border radius
│   ├── recipes/
│   │   ├── button.ts      # Button variants
│   │   └── panel.ts       # Panel styles
│   └── index.ts           # Theme export
```

### Validation PoC

See `packages/ui/src/theme/panda-poc.ts` for proof-of-concept demonstrating:
- Token definition and type safety
- Dark/light theme switching
- Component recipe patterns
- Semantic token resolution

### Architecture Implications

- `panda.config.ts` at package root defines design system
- Tokens exported for consumption by other packages
- Recipes co-located with components
- CSS variables for runtime theme switching

---

## 3. Component Library: Radix UI

### Decision

**Radix UI Primitives** is the selected component foundation.

### Rationale

| Requirement | Radix UI | Ark UI | shadcn/ui |
|-------------|----------|--------|-----------|
| Unstyled primitives | ✅ Core mission | ✅ Yes | ⚠️ Pre-styled |
| Accessibility (ARIA) | ✅ Best-in-class | ✅ Good | ✅ Via Radix |
| Keyboard navigation | ✅ Comprehensive | ✅ Good | ✅ Via Radix |
| Component coverage | ✅ 30+ primitives | ⚠️ 25+ | ✅ 40+ |
| Animation support | ✅ data-state attrs | ✅ Good | ✅ Good |
| Maturity | ✅ 4+ years | ⚠️ 2 years | ⚠️ 2 years |
| React 19 ready | ✅ Yes | ⚠️ In progress | ✅ Yes |

### Key Advantages for Graphix

1. **Accessibility First**: WCAG AA compliance out of the box
2. **Composable**: Build complex UIs from simple primitives
3. **Unstyled**: Apply Panda CSS without fighting default styles
4. **Animation Ready**: data-state attributes for CSS/Framer Motion
5. **Battle Tested**: Used by Vercel, Linear, Supabase

### Components We'll Use

| Component | Use Case |
|-----------|----------|
| Dialog | Modals (Getting Started, Export, Feedback) |
| Dropdown Menu | Context menus, action menus |
| Popover | Tooltips, popovers |
| Tabs | View switching (Tree/Kanban/Outline) |
| Slider | ControlNet weights, opacity |
| Toggle | Panel visibility, settings |
| Select | Dropdown selections |
| Toast | Notifications |
| Alert Dialog | Confirmation dialogs |
| Context Menu | Right-click menus on canvas |

### Architecture Implications

- Primitives wrapped with Panda CSS styles as `@graphix/ui` components
- Compound component pattern for complex widgets
- Headless logic separable from presentation

---

## 4. State Management: Zustand

### Decision

**Zustand** is the selected state management solution.

### Rationale

| Requirement | Zustand | Jotai | Redux Toolkit |
|-------------|---------|-------|---------------|
| Simplicity | ✅ Minimal API | ✅ Atomic | ⚠️ Boilerplate |
| Canvas state | ✅ Object-oriented | ⚠️ Atomic split | ⚠️ Serialization |
| Subscriptions | ✅ Selector-based | ✅ Fine-grained | ⚠️ Connect |
| Middleware | ✅ Persist, devtools | ⚠️ Plugins | ✅ Extensive |
| Bundle size | ✅ ~2KB | ✅ ~2KB | ⚠️ ~12KB |
| TypeScript | ✅ Excellent | ✅ Excellent | ✅ Good |

### Key Advantages for Graphix

1. **Canvas-Friendly**: Object-based stores match Fabric.js state model
2. **Selective Updates**: Only re-render components that need data
3. **Persist Middleware**: Built-in IndexedDB/localStorage persistence
4. **Devtools**: Redux DevTools integration for debugging
5. **SSE Integration**: Easy to update from server events

### Store Architecture

```typescript
// Proposed store structure
interface GraphixStore {
  // Project state
  project: Project | null;
  characters: Character[];
  pages: Page[];
  
  // Canvas state
  canvas: {
    activePanel: string | null;
    selection: string[];
    zoom: number;
    pan: { x: number; y: number };
  };
  
  // Generation state
  generations: Map<string, GenerationState>;
  queue: GenerationQueueItem[];
  
  // UI state
  ui: {
    sidebar: 'tree' | 'kanban' | 'outline';
    modal: ModalState | null;
    theme: 'dark' | 'light';
  };
}
```

### Architecture Implications

- Single store with slices for different domains
- Persist middleware for offline support
- SSE subscription updates generation state
- Canvas state syncs bidirectionally with Fabric.js

---

## 5. Routing: TanStack Router

### Decision

**TanStack Router** is the selected routing solution.

### Rationale

| Requirement | TanStack Router | React Router v7 |
|-------------|-----------------|-----------------|
| Type-safe params | ✅ Full inference | ⚠️ Manual types |
| Search params | ✅ Schema-validated | ⚠️ String-based |
| Data loading | ✅ Built-in loaders | ✅ Loaders |
| Preloading | ✅ Automatic | ⚠️ Manual |
| File-based routes | ✅ Optional | ✅ Remix-style |
| Bundle splitting | ✅ Automatic | ✅ Automatic |
| DX | ✅ Excellent | ✅ Good |

### Key Advantages for Graphix

1. **Type Safety**: Catch routing errors at compile time
2. **Search Params**: Type-safe filters, pagination, modal state
3. **Preloading**: Faster navigation with link prefetching
4. **Loaders**: Data fetching integrated with routing
5. **Devtools**: Visual route inspection

### Route Structure

```
/                           # Dashboard / Getting Started
/projects/:projectId        # Project workspace
/projects/:projectId/story  # Story/narrative view
/projects/:projectId/page/:pageId  # Page composer
/projects/:projectId/panel/:panelId  # Panel editor
/projects/:projectId/characters  # Character management
/projects/:projectId/export  # Export flow
```

### Architecture Implications

- Routes co-located with feature modules
- Search params for UI state (modal open, selected tab)
- Loaders fetch data before render
- Error boundaries per route

---

## 6. Build Tool: Vite

### Decision

**Vite** is the selected build tool.

### Rationale

| Requirement | Vite | Turbopack |
|-------------|------|-----------|
| Stability | ✅ Proven (4+ years) | ⚠️ Beta |
| Plugin ecosystem | ✅ Rich (500+) | ⚠️ Limited |
| HMR speed | ✅ ~50ms | ✅ ~50ms |
| Build speed | ✅ Fast (esbuild) | ✅ Fast (SWC) |
| SSR support | ✅ Native | ✅ Native |
| Panda CSS plugin | ✅ Official | ⚠️ Community |
| PWA support | ✅ vite-plugin-pwa | ⚠️ Manual |

### Key Advantages for Graphix

1. **Stability**: Battle-tested in production
2. **Plugin Ecosystem**: Official plugins for Panda, PWA, etc.
3. **Fast Iteration**: Sub-50ms HMR for rapid development
4. **Flexible Output**: ESM for modern, IIFE for legacy
5. **Library Mode**: Can build publishable packages

### Configuration

```typescript
// vite.config.ts key plugins
export default defineConfig({
  plugins: [
    react(),
    pandacss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { /* offline config */ }
    }),
    TanStackRouterVite(),
  ],
  build: {
    target: 'es2022',
    rollupOptions: { /* chunking strategy */ }
  }
});
```

### Architecture Implications

- Development server with HMR
- Production builds with code splitting
- PWA service worker for offline support
- Separate chunks for canvas library (lazy load)

---

## 7. Desktop Distribution: PWA-first, Tauri Phase 2

### Decision

**PWA-first** architecture with **Tauri** wrapper planned for Phase 2.

### Rationale

| Requirement | PWA Only | Tauri | Electron |
|-------------|----------|-------|----------|
| Bundle size | ✅ 0 (web) | ✅ 3-10MB | ❌ 150MB+ |
| Offline support | ✅ Service Worker | ✅ Full | ✅ Full |
| File system access | ⚠️ File System Access API | ✅ Full | ✅ Full |
| Auto-update | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| Performance | ✅ Good | ✅ Native | ⚠️ Heavy |
| Development | ✅ Simplest | ⚠️ Rust knowledge | ⚠️ Chromium |
| Installation | ✅ "Add to Home" | ✅ .dmg/.exe | ✅ .dmg/.exe |

### Phase 1: PWA (MVP)

- Service Worker for offline capability
- IndexedDB for local data persistence
- File System Access API for import/export
- Web manifest for installability

### Phase 2: Tauri Wrapper (Post-MVP)

When we need:
- Deep file system integration
- Native menu bar
- System tray presence
- Better GPU access (for future animation features)

### Architecture Implications

- Core app is a web app that works in browser
- Progressive enhancement for desktop features
- Shared codebase between web and desktop
- Feature detection for native capabilities

---

## 8. Supporting Libraries

| Category | Library | Version | Purpose |
|----------|---------|---------|---------|
| Icons | Lucide React | ^0.400 | Consistent, tree-shakeable icons |
| Forms | React Hook Form | ^7.50 | Form state, validation |
| Dates | date-fns | ^3.0 | Date formatting, manipulation |
| Animation | Framer Motion | ^11.0 | UI animations, gestures |
| HTTP Client | @graphix/client | * | Generated API client |
| Query | TanStack Query | ^5.0 | Server state, caching |
| DnD | @dnd-kit/core | ^6.0 | Drag and drop interactions |

---

## Validation Summary

| Decision | PoC Status | Notes |
|----------|------------|-------|
| Fabric.js | ✅ Validated | Image load, group, serialize works |
| Panda CSS | ✅ Validated | Tokens, recipes, dark mode works |
| Radix UI | ✅ Validated | Unstyled primitives work with Panda |
| Zustand | ✅ Validated | Standard pattern, persist works |
| TanStack Router | ✅ Validated | Type safety, loaders work |
| Vite | ✅ Validated | Standard setup, plugins work |
| PWA | ✅ Validated | vite-plugin-pwa works |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fabric.js v6 breaking changes | LOW | MEDIUM | Pin version, test upgrades |
| Panda CSS learning curve | MEDIUM | LOW | Good docs, team training |
| Canvas performance on large projects | MEDIUM | HIGH | Lazy loading, pagination, web workers |
| PWA limitations | LOW | LOW | Tauri fallback ready |
| Bundle size bloat | MEDIUM | MEDIUM | Tree shaking, lazy loading |

---

## Implementation Order

1. **Week 1**: Project scaffolding (Vite + React + Panda + Zustand)
2. **Week 1**: Design system foundation (tokens, base components)
3. **Week 2**: Canvas integration (Fabric.js + persistence)
4. **Week 2**: Routing setup (TanStack Router + layouts)
5. **Week 3**: Core components (Radix primitives + Panda styles)
6. **Week 4**: Feature development begins

---

## Appendix A: Version Lock

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "fabric": "^6.6.0",
  "@pandacss/dev": "^0.52.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "zustand": "^5.0.0",
  "@tanstack/react-router": "^1.95.0",
  "@tanstack/react-query": "^5.64.0",
  "vite": "^6.0.0"
}
```

---

## Appendix B: References

- [Fabric.js Documentation](http://fabricjs.com/)
- [Panda CSS Documentation](https://panda-css.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Router Documentation](https://tanstack.com/router/)
- [Vite Documentation](https://vitejs.dev/)

---

*This document is the source of truth for UI tech stack decisions. Update as implementation reveals new constraints or opportunities.*
