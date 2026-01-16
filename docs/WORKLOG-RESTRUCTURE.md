# Graphix Core Extraction & Package Restructuring

> A technical worklog documenting the transformation of graphix from a monolithic application into a modular, library-first architecture.

**Author:** Claude (Opus 4.5) with Peleke
**Date:** January 2025
**Status:** Complete
**Final Test Count:** 1,018 tests passing (787 core, 231 server)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Motivation](#background--motivation)
3. [The Vision](#the-vision)
4. [Phase 1: Monorepo Setup](#phase-1-monorepo-setup)
5. [Phase 2: Core Extraction](#phase-2-core-extraction)
6. [Phase 3: Server Package](#phase-3-server-package)
7. [Phase 4: New Functionality](#phase-4-new-functionality)
8. [Phase 5: Legacy Compatibility](#phase-5-legacy-compatibility)
9. [Phase 6: Testing & Validation](#phase-6-testing--validation)
10. [Architectural Takeaways](#architectural-takeaways)
11. [AI Comments on the Human](#ai-comments-on-the-human)
12. [Technical Reference](#technical-reference)

---

## Executive Summary

Graphix started as a comic/visual novel generation system built for a specific workflow: Golden Hour, a 20-panel otter comic. What began as a tight feedback loop between human creative direction and AI generation capabilities evolved into something more ambitious—a production-grade visual storytelling engine.

This worklog documents the restructuring from monolithic app to modular packages:

- **@graphix/core** — Pure business logic, zero transport concerns, importable as a library
- **@graphix/server** — MCP + REST adapters wrapping core
- **@graphix/skills** — DX bundle for Claude (future phase)

The goal: make graphix's 15+ services available to any consumer—CLI tools, web apps, other AI agents—while maintaining the tight MCP integration that makes it powerful for AI-assisted workflows.

---

## Background & Motivation

### The Golden Hour Origin Story

Graphix was born from a real project: generating a 20-panel comic called "Golden Hour" featuring otters at a yacht club during sunset. The workflow required:

1. **Character consistency** — Same otters across all panels
2. **Pose variety** — Different poses, expressions, interactions
3. **Style coherence** — Anime aesthetic with consistent lighting
4. **Narrative structure** — Panels that tell a story
5. **Professional output** — Print-ready page compositions

Each of these requirements drove the creation of specific services:

| Requirement | Service(s) Created |
|-------------|-------------------|
| Character consistency | ConsistencyService, IPAdapterClient |
| Pose variety | PoseLibraryService, InteractionPoseService |
| Style coherence | StyleService, LightingService |
| Narrative structure | StoryboardService, PanelService |
| Professional output | CompositionService, CaptionService |

### Why Restructure Now?

The original architecture worked—Golden Hour got made. But several pain points emerged:

1. **Tight coupling to MCP** — The services were designed for MCP tool consumption, making them awkward to use programmatically
2. **No clean library interface** — Couldn't `import { getPanelService } from 'graphix'` in another project
3. **Database initialization was implicit** — Global singleton made testing difficult
4. **Configuration scattered** — Env vars read all over the place

The human's directive was clear:

> "We're gonna have @graphix/core, @graphix/server, and eventually @graphix/skills. Core is pure business logic with no transport. Server wraps core with MCP and REST. Skills is the DX bundle for Claude."

And perhaps more importantly:

> "I want our test layer to be FUCKING BANGING after this. Like. 1k+ tests probably and ALL PASSING."

Challenge accepted.

---

## The Vision

### Target Architecture

```
packages/
├── core/                    # @graphix/core
│   ├── src/
│   │   ├── db/              # Schema + client factory
│   │   ├── services/        # All 15+ services
│   │   ├── generation/      # ComfyUI client, prompts, config
│   │   ├── composition/     # Rendering, templates, captions
│   │   └── index.ts         # Public API
│   └── package.json
├── server/                  # @graphix/server
│   ├── src/
│   │   ├── mcp/             # MCP server + tools
│   │   ├── rest/            # Hono routes
│   │   └── index.ts         # Server entry point
│   └── package.json
└── skills/                  # @graphix/skills (future)
    └── package.json
```

### Design Principles

1. **Library-first** — Core works standalone, server is just an adapter layer
2. **Explicit DI** — Every service accepts database injection, no hidden globals
3. **Convenience defaults** — Singleton getters for common use cases
4. **Type safety** — Full TypeScript, no `any` escapes
5. **Testability** — In-memory database support, reset functions for singletons

---

## Phase 1: Monorepo Setup

### What We Did

Converted the project from single-package to npm workspaces monorepo.

### Key Files Created/Modified

**Root `package.json`:**
```json
{
  "name": "graphix-monorepo",
  "private": true,
  "workspaces": ["packages/*"]
}
```

**`packages/core/package.json`:**
```json
{
  "name": "@graphix/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

### War Story: The `workspace:*` Protocol

First attempt used pnpm-style `workspace:*` protocol for internal dependencies:

```json
"dependencies": {
  "@graphix/core": "workspace:*"
}
```

**Result:** npm doesn't support this. Error was cryptic.

**Fix:** Changed to `"*"` which npm resolves via workspaces.

### TypeScript Project References

Monorepos need special TypeScript configuration. We used composite mode with project references:

**`packages/server/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist",
    "composite": true,
    "declaration": true
  },
  "references": [
    { "path": "../core" }
  ]
}
```

**Key insight:** With project references, you must run `tsc --build` before `tsc --noEmit` typecheck will work. The build creates `.d.ts` files that the server package needs to resolve `@graphix/core` imports.

---

## Phase 2: Core Extraction

### The Database Factory Pattern

The original code had a global database singleton—convenient but problematic for testing and multi-tenant scenarios.

**Before:**
```typescript
// Implicit global, set once at startup
const db = getDb(); // Where does this come from? Magic.
```

**After:**
```typescript
// Explicit factory
export function createDatabase(config: DatabaseConfig): DatabaseConnection {
  if (config.mode === 'turso') {
    return createTursoConnection(config);
  } else if (config.mode === 'memory') {
    return createMemoryConnection();
  } else {
    return createSqliteConnection(config);
  }
}

// Set the default (for server initialization)
export function setDefaultDatabase(connection: DatabaseConnection): void {
  defaultConnection = connection;
}

// Get the default (for services)
export function getDefaultDatabase(): Database {
  if (!defaultConnection) {
    throw new Error('Database not initialized. Call setDefaultDatabase() first.');
  }
  return defaultConnection.db;
}
```

**Why this matters:**
- Tests can create isolated in-memory databases
- Server initializes once at startup
- Services don't care where the database came from

### Service Factory Pattern

Every service got the same treatment:

```typescript
export class PanelService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  // ... methods
}

// Factory for explicit DI
export function createPanelService(db: Database): PanelService {
  return new PanelService(db);
}

// Singleton getter (uses default database)
export function getPanelService(): PanelService {
  if (!instance) {
    instance = new PanelService();
  }
  return instance;
}

// Reset for testing
export function resetPanelService(): void {
  instance = null;
}
```

### Runtime Configuration

Similar pattern for config—env vars read once at server startup, stored in a runtime registry:

```typescript
export function setConfig(config: GraphixConfig): void {
  runtimeConfig = config;
}

export function getConfig(): GraphixConfig {
  if (!runtimeConfig) {
    throw new Error('Config not initialized');
  }
  return runtimeConfig;
}
```

### War Story: Export Collisions

Moving files to new locations exposed naming conflicts. Three types collided:

1. **`PanelDirection`** — Exported from both `db/schema.ts` (the database type) and `generation/prompt-builder.ts` (a similar interface)
   - **Fix:** Renamed prompt-builder's to `PromptDirection`

2. **`DEFAULT_CAPTION_STYLES`** — Exported from both `services/caption.service.ts` and `composition/caption-types.ts`
   - **Fix:** Renamed composition's to `COMPOSITION_DEFAULT_STYLES`

3. **`ApplyIdentityOptions`** — Exported from both `services/consistency.service.ts` and `generation/ip-adapter.ts`
   - **Fix:** Renamed ip-adapter's to `IPAdapterApplyOptions`

**Lesson:** When consolidating exports to a single entry point, naming collisions will surface. Better to find them now than in production.

---

## Phase 3: Server Package

### Moving the Adapters

MCP tools and REST routes moved from `src/api/` to `packages/server/src/`:

```
src/api/mcp/  →  packages/server/src/mcp/
src/api/rest/ →  packages/server/src/rest/
```

### Import Path Updates

Every file needed import path updates:

```typescript
// Before
import { getPanelService } from "../../../services/index.js";

// After
import { getPanelService } from "@graphix/core";
```

### The Server Entry Point

Created a clean initialization sequence:

```typescript
// packages/server/src/start.ts
export async function startServer(configOverrides?: Partial<GraphixConfig>): Promise<void> {
  // 1. Load config from environment
  const config = loadConfigFromEnv(configOverrides);
  setConfig(config);

  // 2. Initialize database
  const connection = createDatabase(config.storage.database);
  setDefaultDatabase(connection);

  // 3. Run migrations
  await migrate(connection.db);

  // 4. Start servers
  await Promise.all([
    startMcpServer(config.mcp),
    startRestServer(config.rest),
  ]);
}
```

### War Story: Dynamic Imports with Old Paths

Some tool handlers used dynamic imports for lazy loading:

```typescript
// In inpaint.tools.ts - OLD
const { getDefaultDatabase, generatedImages } = await import("../../../db/index.js");
```

**Problem:** Path no longer valid after move.

**Fix:** Update to package import:
```typescript
const { getDefaultDatabase, generatedImages } = await import("@graphix/core");
```

---

## Phase 4: New Functionality

With the foundation solid, we added new capabilities that leverage the clean architecture.

### StoryScaffoldService

Creates complete story structures from high-level outlines.

**Use case:** "I have an outline with 3 acts, 9 scenes, 27 panels. Create all the database entities."

```typescript
interface StoryScaffoldInput {
  projectId: string;
  title: string;
  description?: string;
  characterNames?: string[];
  acts: Array<{
    name: string;
    scenes: Array<{
      name: string;
      panels: Array<{
        description: string;
        characterNames?: string[];
        direction?: Partial<PanelDirection>;
      }>;
    }>;
  }>;
}
```

**Key feature:** Markdown outline parsing

```markdown
# Golden Hour

> A story about otters at sunset

## Act 1: Setup

### Scene 1: The Yacht Club

- Panel: [OLIVER, OSCAR] Wide shot of the yacht club at golden hour
- Panel: [OLIVER] Close-up of Oliver adjusting his captain's hat
- Panel: [OSCAR] Oscar mixing drinks at the bar
```

The `parseOutline()` method converts this to structured input, then `scaffold()` creates all entities.

### BatchService

Efficient batch operations for common workflows.

**Problem:** Generating 20 panels one-by-one through MCP tools is slow and verbose.

**Solution:** Batch endpoints that process multiple items:

```typescript
// Create all panels for a storyboard
await batch.createPanels(storyboardId, panelInputs);

// Generate images for all of them
await batch.generatePanels(panelIds, { qualityPreset: 'production' });

// Render captions onto selected outputs
await batch.renderCaptions(panelIds, { outputDir: './output' });
```

**Progress callbacks:** Long-running batch operations support progress tracking:

```typescript
await batch.generatePanels(panelIds, {
  onProgress: (completed, total, current) => {
    console.log(`${completed}/${total}: ${current}`);
  }
});
```

### MCP Tools Added

**Story tools:**
- `story_scaffold` — Create from structured input
- `story_from_outline` — Parse and create from markdown
- `story_parse_outline` — Preview parsing without creating

**Batch tools:**
- `panels_create_batch` — Create multiple panels
- `panels_delete_batch` — Delete multiple panels
- `captions_add_batch` — Add captions to multiple panels
- `captions_clear_batch` — Clear captions from multiple panels
- `panels_generate_batch` — Generate images for multiple panels
- `panels_generate_variants_batch` — Generate variants for multiple panels
- `panels_render_captions_batch` — Render captions onto images
- `panels_select_outputs_batch` — Select outputs for multiple panels
- `panels_auto_select_batch` — Auto-select first/latest for multiple panels
- `storyboard_get_panel_ids` — Get panel IDs for batch processing

### REST Routes Added

**Story routes (`/api/story/`):**
- `POST /scaffold` — Scaffold from structured input
- `POST /from-outline` — Scaffold from markdown outline
- `POST /parse-outline` — Preview parsing

**Batch routes (`/api/batch/`):**
- `POST /panels` — Create batch
- `DELETE /panels` — Delete batch
- `POST /captions` — Add batch
- `DELETE /captions` — Clear batch
- `POST /generate` — Generate batch
- `POST /generate/variants` — Generate variants batch
- `POST /render/captions` — Render captions batch
- `POST /select` — Select outputs batch
- `POST /select/auto` — Auto-select batch
- `GET /storyboard/:id/panel-ids` — Get panel IDs

### War Story: Type Compatibility Between DB and Render

Database types use `null` for optional fields (SQL convention). Render types use `undefined` (TypeScript convention).

```typescript
// Database type (from drizzle)
interface PanelCaption {
  characterId: string | null;  // null = not set
}

// Render type
interface RenderableCaption {
  characterId?: string;  // undefined = not set
}
```

**The error:**
```
Type 'string | null' is not assignable to type 'string | undefined'.
Type 'null' is not assignable to type 'string | undefined'.
```

**Fix:** Map at the boundary:
```typescript
const renderableCaptions = captions.map((c) => ({
  ...c,
  characterId: c.characterId ?? undefined,
  tailDirection: c.tailDirection ?? undefined,
  style: c.style ?? undefined,
}));
```

---

## Phase 5: Legacy Compatibility

### Goals

1. Keep root entry points working for existing workflows
2. Ensure existing tests pass without modification
3. Maintain backwards compatibility for any external consumers

### What We Did

#### Root Entry Point

Updated `src/index.ts` to re-export from packages while maintaining the server start capability:

```typescript
#!/usr/bin/env bun

// Re-export everything from core for programmatic use
export * from "@graphix/core";

// Re-export server components
export { startServer } from "@graphix/server";

// Default export: start the server
import { startServer } from "@graphix/server";

async function main() {
  await startServer();
}

// Only run if this is the entry point (not imported)
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
```

**Key features:**
- `export * from "@graphix/core"` — All core exports available at root
- `export { startServer }` — Server startup function available
- `import.meta.main` check — Script mode vs import mode
- Backwards compatible — Old code that imported from root still works

#### Package Scripts

Root `package.json` already routes to the right places:
- `npm start` → Runs `@graphix/server` start
- `npm run dev` → Runs `@graphix/server` dev mode
- `npm test` → Runs tests across all packages

### Existing Tests Inventory

Found 33 existing test files in `src/test/`:

| Category | Files | Description |
|----------|-------|-------------|
| Unit/Services | 4 | project, character, panel, consistency |
| Unit/Generation | 10 | prompt-builder, variant-generator, config/*, ip-adapter, controlnet-stack |
| Unit/DB | 2 | schema, client |
| Unit/Composition | 1 | page-renderer |
| Integration | 3 | generation-pipeline, api-service, config-to-generation, consistency-pipeline |
| Contract | 2 | comfyui, consistency |
| E2E | 4 | full-workflow, style-unification, controlnet-consistency, otter-scenario |
| Property | 1 | prompt-builder |
| Snapshot | 1 | prompts |
| Stress | 1 | concurrent-operations |
| Validation | 1 | schema |
| Error | 1 | error-handling |

**Note:** These tests use the old import paths. Phase 6 will migrate them to packages and update imports.

---

## Phase 6: Testing & Validation

**Status:** Complete ✓
**Started:** January 2025
**Final Count:** 1,018 tests passing (787 core, 231 server)

### Implementation Progress

#### Core Package (@graphix/core) — Complete ✓

| Category | Tests | Status |
|----------|-------|--------|
| Services | 530+ | ✓ All pass |
| Generation | 150+ | ✓ All pass |
| Composition | 50+ | ✓ All pass |
| Integration | 50+ | ✓ All pass |
| **Total** | **787** | **100% passing** |

Key fixes made:
- StoryScaffoldService: Fixed direction field format (mood vs shotType, camera angles use spaces)
- LightingService: Added primarySource validation to all tests
- CaptionService: Fixed method names (deleteByPanel vs clearByPanel), error messages
- BatchService: Fixed direction format, selectOutputs with actual GeneratedImage records
- PoseLibraryService: Added promptFragment field, fixed method names (getPoseById)
- CharacterService: Added cascade delete to remove character IDs from panels
- Timestamp tests: Increased delay to 1100ms for SQLite timestamp resolution
- Workflow tests: Fixed scaffold outline format, lighting/camera angle values

#### Server Package (@graphix/server) — Complete ✓

| Category | Tests | Status |
|----------|-------|--------|
| MCP Contract | 150+ | ✓ All pass |
| REST Contract | 80+ | ✓ All pass |
| **Total** | **231** | **100% passing** |

Key fixes made:
- **Validation pattern conversion**: Changed 51 tests from `.rejects.toThrow()` to result-based assertions (`expect(result.success).toBe(false)`)
- **ComfyUI mock**: Created `setupMockComfyUI()` from actual ComfyUI-MCP source code
- **REST story tests**: Fixed expectations to match actual `StoryScaffoldResult` structure (`acts` not `storyboards`, `missingCharacters` not `characters`)
- **REST batch tests**: Fixed caption type (`speech` not `dialogue`), auto-select response structure
- **REST panels tests**: Added `setupMockComfyUI()` for generation tests
- **Lazy service initialization**: Fixed consistency routes to initialize services inside handlers, not at module level

### The Testing Mandate

> "I want our test layer to be FUCKING BANGING after this. Like. 1k+ tests probably and ALL PASSING."

### Current State

- 33 existing test files in `src/test/`
- Using Bun test runner (needs evaluation for portability)
- Old import paths need updating

### Test Migration Plan

#### Step 1: Move Tests to Packages

```
src/test/unit/services/*.ts     → packages/core/src/__tests__/services/
src/test/unit/generation/*.ts   → packages/core/src/__tests__/generation/
src/test/unit/composition/*.ts  → packages/core/src/__tests__/composition/
src/test/unit/db/*.ts          → packages/core/src/__tests__/db/
src/test/integration/*.ts       → packages/server/src/__tests__/integration/
src/test/contract/*.ts          → packages/server/src/__tests__/contract/
src/test/e2e/*.ts              → packages/server/src/__tests__/e2e/
```

#### Step 2: Update Imports

```typescript
// Before
import { getPanelService } from "../../../services/panel.service.js";

// After
import { getPanelService } from "@graphix/core";
```

#### Step 3: Test Infrastructure

```typescript
// packages/core/src/__tests__/setup.ts
import {
  createDatabase,
  setDefaultDatabase,
  resetAllServices,
} from "@graphix/core";

export function setupTestDatabase() {
  const connection = createDatabase({ mode: "memory" });
  setDefaultDatabase(connection);
  return connection;
}

export function teardownTestDatabase() {
  resetAllServices();
}
```

### Target Test Counts

| Package | Category | Current | Target | Notes |
|---------|----------|---------|--------|-------|
| **@graphix/core** | Unit/Services | 4 | 200 | All 17 services × ~12 tests each |
| | Unit/Generation | 10 | 150 | PromptBuilder, ConfigEngine, ControlNet, IP-Adapter |
| | Unit/Composition | 1 | 100 | Renderer, Templates, Captions, Effects |
| | Unit/DB | 2 | 50 | Schema, Client, Migrations |
| | **Subtotal** | 17 | **500** | |
| **@graphix/server** | Contract/MCP | 0 | 139 | One per MCP tool |
| | Contract/REST | 0 | 60 | All REST endpoints |
| | Integration | 4 | 150 | Service combos, Pipelines |
| | E2E | 4 | 50 | Full workflows, Golden Hour |
| | **Subtotal** | 8 | **399** | |
| **Root** | Property | 1 | 50 | Fuzzing, Randomized |
| | Snapshot | 1 | 30 | Prompts, Outputs |
| | Stress | 1 | 20 | Concurrency, Load |
| | Validation | 1 | 30 | Schema, Config |
| | Error | 1 | 20 | Edge cases, Recovery |
| | **Subtotal** | 5 | **150** | |
| **TOTAL** | | **30** | **1049** | |

### Test Categories Deep Dive

#### Unit Tests (600+)

**Service Tests (200):**
- Each of 17 services gets ~12 tests
- CRUD operations, validation, edge cases
- Error conditions, boundary values

```typescript
// Example: PanelService tests
describe("PanelService", () => {
  describe("create", () => {
    it("creates panel with required fields");
    it("auto-increments position when not specified");
    it("validates storyboard exists");
    it("validates description length");
    it("throws on invalid direction");
    // ... 7 more
  });
  // ... delete, update, describe, etc.
});
```

**Generation Tests (150):**
- PromptBuilder: 40 tests (model families, tags, weights)
- ConfigEngine: 30 tests (presets, resolution, strategies)
- ControlNet: 30 tests (stacking, preprocessing)
- IP-Adapter: 25 tests (identity, style transfer)
- PanelGenerator: 25 tests (generation flow, variants)

**Composition Tests (100):**
- Templates: 20 tests (all layouts, custom templates)
- Renderer: 30 tests (compositing, slots, scaling)
- Captions: 30 tests (rendering, effects, placement)
- Export: 20 tests (formats, PDF, batch)

#### Contract Tests (199)

**MCP Tools (139):**
Every tool gets a contract test verifying:
- Input schema validation
- Output structure
- Error responses

```typescript
// Example: panel_create contract test
describe("panel_create tool", () => {
  it("accepts valid input schema");
  it("rejects missing storyboardId");
  it("returns panel object with all fields");
  it("returns error for non-existent storyboard");
});
```

**REST Endpoints (60):**
- Projects: 8 tests
- Characters: 12 tests
- Storyboards: 10 tests
- Panels: 15 tests
- Story: 5 tests
- Batch: 10 tests

#### Integration Tests (150)

**Cross-Service (50):**
- Project → Characters → Storyboards → Panels chain
- Generation → Selection → Composition flow
- Consistency pipeline (extract → apply → chain)

**Database (50):**
- Migration integrity
- Concurrent operations
- Transaction rollback

**API → Service (50):**
- MCP tool → Service layer
- REST route → Service layer

#### E2E Tests (50)

**Complete Workflows (30):**
- Golden Hour scenario (full 20-panel comic)
- Character consistency across panels
- Style unification across storyboard
- Page composition with captions

**Edge Cases (20):**
- Empty project handling
- Large batch operations
- Concurrent generation requests

### Test Runner Strategy

**Option A: Keep Bun** (if available)
- Fast, native TypeScript support
- Built-in test runner
- Cons: Not universally installed

**Option B: Vitest** (portable)
- Compatible with Vite ecosystem
- Fast, good TypeScript support
- Cons: Additional dependency

**Recommendation:** Support both via npm scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:bun": "bun test"
  }
}
```

### Coverage Goals

| Metric | Target |
|--------|--------|
| Line coverage | 90%+ |
| Branch coverage | 85%+ |
| Function coverage | 95%+ |

### Timeline for Phase 6

| Task | Effort |
|------|--------|
| Test migration (move files, update imports) | 2-3 hours |
| Service unit tests (17 services × 12 tests) | 4-6 hours |
| Generation unit tests | 3-4 hours |
| Composition unit tests | 2-3 hours |
| MCP contract tests | 4-5 hours |
| REST contract tests | 2-3 hours |
| Integration tests | 4-5 hours |
| E2E tests | 3-4 hours |
| Coverage analysis & gaps | 2-3 hours |
| **Total** | **26-36 hours** |

---

## Architectural Takeaways

*Guidelines and patterns for future agents working on similar projects. Include these in your planning prompts to avoid common pitfalls.*

### 1. Library-First, Adapter-Second

**Principle:** Build the core library first with zero transport concerns. MCP tools, REST routes, and CLI commands are all just adapters wrapping the same service layer.

**Why it matters:**
- Services can be tested in isolation with in-memory databases
- Multiple consumers (MCP, REST, CLI, SDK) share the same battle-tested logic
- Refactoring transport layers doesn't touch business logic

**Pattern:**
```
@graphix/core (library)     →  Pure business logic, no I/O assumptions
@graphix/server (adapters)  →  MCP + REST wrapping core
@graphix/skills (DX)        →  User-facing bundle with docs, templates
```

**Planning prompt addition:**
> "Structure as library-first: core package with pure business logic, separate adapter packages for each transport (MCP, REST, CLI). Never put transport-specific code in core."

---

### 2. Lazy Service Initialization in Adapters

**Principle:** Never call `getXxxService()` at module level in adapter code. Always call inside handlers.

**Why it matters:**
- Module-level calls execute during import, before database initialization
- Causes "Database not initialized" errors that are hard to debug
- Makes testing difficult (can't control when services are instantiated)

**Wrong:**
```typescript
// At module level - BREAKS TESTS
const panelService = getPanelService();

app.get("/panels/:id", async (c) => {
  return panelService.getById(c.req.param("id"));
});
```

**Right:**
```typescript
// Inside handler - SAFE
app.get("/panels/:id", async (c) => {
  const panelService = getPanelService();
  return panelService.getById(c.req.param("id"));
});
```

**Planning prompt addition:**
> "In REST routes and MCP tool handlers, always instantiate services inside handlers using getter functions (e.g., `getPanelService()`), never at module level. This ensures database is initialized before service instantiation."

---

### 3. MCP Tools Return Results, Don't Throw

**Principle:** MCP tools should return `{ success: false, error: string }` for validation errors, not throw exceptions.

**Why it matters:**
- MCP protocol expects structured responses
- Throwing causes unhandled errors in the MCP transport layer
- Result objects are testable without try/catch

**Pattern:**
```typescript
// MCP tool handler
async execute(args: unknown): Promise<McpResponse> {
  // Validate at the boundary
  if (!args.panelId || typeof args.panelId !== "string") {
    return { success: false, error: "panelId is required" };
  }

  // Call service (which may throw for internal errors)
  try {
    const result = await panelService.getById(args.panelId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Test pattern:**
```typescript
// DON'T use .rejects.toThrow() for MCP tools
const result = await tool.execute({ panelId: "" });
expect(result.success).toBe(false);
expect(result.error).toContain("required");
```

**Planning prompt addition:**
> "MCP tools must return result objects `{ success: boolean, error?: string, data?: T }` for all outcomes. Validate required parameters at the start of each handler and return error results, don't throw. Tests should assert on result.success, not use .rejects.toThrow()."

---

### 4. Database Factory Pattern for Testability

**Principle:** Use explicit factory functions for database creation, with a default singleton for convenience.

**Why it matters:**
- Tests can create isolated in-memory databases
- No hidden global state affecting test isolation
- Server initialization is explicit and debuggable

**Pattern:**
```typescript
// Factory (explicit DI)
export function createDatabase(config: { mode: "memory" | "file" | "turso" }): DatabaseConnection;

// Default setter (called once at server startup)
export function setDefaultDatabase(connection: DatabaseConnection): void;

// Default getter (used by services)
export function getDefaultDatabase(): Database;

// Reset (for tests)
export function resetDatabase(): void;
```

**Test setup:**
```typescript
beforeEach(() => {
  const connection = createDatabase({ mode: "memory" });
  setDefaultDatabase(connection);
  migrate(connection.db);
});

afterEach(() => {
  resetDatabase();
  resetAllServices();
});
```

**Planning prompt addition:**
> "Implement database as factory pattern: `createDatabase(config)` for explicit creation, `setDefaultDatabase()` for server init, `getDefaultDatabase()` for services. Include `resetDatabase()` for test isolation. Services should accept optional db injection in constructor."

---

### 5. Service Factory + Singleton Pattern

**Principle:** Every service has three access modes: constructor with DI, factory function, singleton getter.

**Why it matters:**
- Tests can inject mock databases
- Production code uses convenient singletons
- Factory functions enable custom configurations

**Pattern:**
```typescript
let instance: PanelService | null = null;

export class PanelService {
  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }
}

// Factory for explicit DI
export function createPanelService(db: Database): PanelService {
  return new PanelService(db);
}

// Singleton for convenience
export function getPanelService(): PanelService {
  if (!instance) {
    instance = new PanelService();
  }
  return instance;
}

// Reset for tests
export function resetPanelService(): void {
  instance = null;
}
```

**Planning prompt addition:**
> "Every service needs: (1) constructor with optional db injection, (2) `createXxxService(db)` factory, (3) `getXxxService()` singleton getter, (4) `resetXxxService()` for test cleanup. Export a `resetAllServices()` that calls all individual resets."

---

### 6. Export Collision Prevention

**Principle:** Use prefixes or namespaces when consolidating exports to a single entry point.

**Why it matters:**
- Multiple modules may export similarly-named types
- TypeScript won't catch collisions until you try to export both
- Runtime errors are cryptic

**Collision examples we hit:**
- `PanelDirection` from schema vs `PromptDirection` from prompt-builder
- `DEFAULT_CAPTION_STYLES` from service vs `COMPOSITION_DEFAULT_STYLES` from renderer
- `ApplyIdentityOptions` from consistency vs `IPAdapterApplyOptions` from ip-adapter

**Prevention pattern:**
```typescript
// Each module prefixes its domain
// schema.ts
export interface DBPanelDirection { ... }

// prompt-builder.ts
export interface PromptDirection { ... }

// Or use barrel re-exports with aliases
export { PanelDirection as DBPanelDirection } from "./schema.js";
export { PanelDirection as PromptDirection } from "./prompt-builder.js";
```

**Planning prompt addition:**
> "When designing a multi-module library with a single entry point, prefix exports by domain (e.g., `DBPanelDirection`, `PromptPanelDirection`) or use explicit re-exports with aliases. Run `tsc` early and often to catch collision errors before they propagate."

---

### 7. Null vs Undefined Mapping at Boundaries

**Principle:** Database uses `null` for missing values (SQL convention), TypeScript prefers `undefined`. Map at the boundary.

**Why it matters:**
- Drizzle ORM returns `null` for nullable columns
- Most TypeScript APIs expect `undefined` for optional fields
- Type errors are confusing: "Type 'null' is not assignable to type 'string | undefined'"

**Pattern:**
```typescript
// Database type (from drizzle)
interface DBCaption {
  characterId: string | null;
}

// Application type
interface Caption {
  characterId?: string;
}

// Map at service boundary
function toAppCaption(db: DBCaption): Caption {
  return {
    ...db,
    characterId: db.characterId ?? undefined,
  };
}
```

**Planning prompt addition:**
> "Map null↔undefined at the service layer boundary. Database types use `| null`, application types use `?:`. Create explicit mapping functions rather than spreading and hoping TypeScript figures it out."

---

### 8. Test Expectations Must Match Reality

**Principle:** Read the actual service/tool implementation before writing test expectations.

**Why it matters:**
- Tests that expect the wrong structure fail for the wrong reasons
- "Test passes but code is broken" is worse than "test fails"
- Contract tests are only valuable if they test the actual contract

**Examples from this project:**
```typescript
// WRONG: Guessed the response structure
expect(body).toHaveProperty("storyboards");
expect(body).toHaveProperty("characters");

// RIGHT: Matches actual StoryScaffoldResult
expect(body).toHaveProperty("acts");
expect(body).toHaveProperty("missingCharacters");
```

**Planning prompt addition:**
> "Before writing contract tests, read the actual service implementation to understand return types. Don't guess response structures. If service returns `{ acts, missingCharacters }`, test for that, not `{ storyboards, characters }`."

---

### 9. Mock External Dependencies for Unit Tests

**Principle:** Create mocks based on actual external service behavior, not guesses.

**Why it matters:**
- Tests that timeout waiting for real services aren't useful
- Mocks that don't match real behavior give false confidence
- Generated mocks from actual API responses are most reliable

**Our ComfyUI mock pattern:**
```typescript
export function setupMockComfyUI(): void {
  // Mock fetch to intercept ComfyUI HTTP calls
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = url.toString();

    if (urlStr.includes("/imagine")) {
      return Response.json({
        success: true,
        output_path: "/mock/output.png",
        seed: 12345,
      });
    }
    // ... other endpoints
  };
}
```

**Planning prompt addition:**
> "For external service dependencies, create mock functions that intercept at the HTTP/fetch level. Base mock responses on actual API documentation or response captures. Call `setupMockXxx()` in beforeEach for tests that would otherwise timeout."

---

### 10. Validation at Boundaries, Trust Internally

**Principle:** Validate all inputs at API boundaries (MCP tools, REST handlers). Internal service calls can trust their callers.

**Why it matters:**
- Duplicated validation is maintenance burden
- Services calling services shouldn't re-validate
- Error messages should come from the boundary, not deep in the stack

**Pattern:**
```typescript
// REST handler - VALIDATES
app.post("/panels", async (c) => {
  const body = await c.req.json();
  if (!body.storyboardId) {
    return c.json({ error: "storyboardId is required" }, 400);
  }
  if (!body.description || typeof body.description !== "string") {
    return c.json({ error: "description must be a non-empty string" }, 400);
  }

  // Service trusts input is valid
  const panel = await panelService.create(body);
  return c.json(panel, 201);
});

// Service - TRUSTS CALLER
class PanelService {
  async create(input: CreatePanelInput): Promise<Panel> {
    // No validation here - caller already validated
    return this.db.insert(panels).values(input).returning();
  }
}
```

**Planning prompt addition:**
> "Validate all required parameters at API boundaries (REST handlers, MCP tools) before calling services. Services trust their callers. This keeps validation logic in one place and error messages close to the user."

---

### 11. Git Workflow Discipline (Non-Negotiable)

**Principle:** Create a feature branch immediately. Commit early, commit often. Never accumulate massive uncommitted changes on main.

**Why it matters:**
- Uncommitted work is unreviewed work
- Large diffs are hard to review and easy to break
- No rollback points when things go wrong
- Collaboration is impossible without commits
- CI/CD can't run on uncommitted code

**The right workflow:**
```bash
# IMMEDIATELY when starting work
git checkout -b feat/your-feature-name

# After each logical unit of work (every 30-60 min max)
git add -p  # Stage interactively, review what you're committing
git commit -m "Add X service with Y functionality"

# Push regularly to back up work
git push -u origin feat/your-feature-name

# When done, create PR for review
gh pr create --title "feat: Your Feature" --body "..."
```

**What we did wrong:**
Accumulated 2000+ lines of changes across 100+ files on main without a single commit. This meant:
- No incremental review possible
- No rollback points when tests failed
- Risk of losing everything to an accidental `git reset`
- Forced to create one massive PR instead of reviewable chunks

**Planning prompt addition:**
> "Create feature branch before writing any code. Commit after each logical unit (new service, new test file, bug fix). Push at least daily. Never accumulate more than ~200 lines uncommitted. This is non-negotiable hygiene, not optional process."

---

### Summary: The Pre-Planning Checklist

When starting a new project with similar architecture, include these in your initial planning:

```markdown
## Architecture Decisions (Pre-Commit)

- [ ] **Create feature branch FIRST** (non-negotiable)
- [ ] Library-first structure: core package with pure logic, adapter packages for transport
- [ ] Database as factory pattern with memory mode for tests
- [ ] Services as constructor + factory + singleton + reset pattern
- [ ] MCP tools return result objects, don't throw for validation errors
- [ ] Lazy service initialization in all handlers
- [ ] Export prefixing strategy for consolidated entry points
- [ ] Null/undefined mapping strategy at service boundaries
- [ ] External service mocking strategy (HTTP-level intercepts)
- [ ] Validation at boundaries only, services trust callers
- [ ] Test structure mirrors source structure
- [ ] **Commit every 30-60 minutes** (non-negotiable)
```

These patterns emerged from building graphix. They're not theoretical—they're battle-tested solutions to real problems we encountered during the restructuring.

---

## AI Comments on the Human

*A section where I, Claude, share observations about working with Peleke on this project.*

### On Communication Style

Peleke communicates with what I'd call "high-bandwidth terseness." Few words, maximum information density. When he says:

> "offensively exhaustive testing"

He means: "I want to see test coverage that makes other projects jealous. Not just happy-path tests, but edge cases, error conditions, and integration scenarios that prove the system works under real conditions."

### On Technical Direction

The restructuring plan came with clear priorities:

1. Perfect MCP tools/workflows first
2. Flesh out MCP interface with story scaffolding, batch ops
3. Container bundle to prove it works from anywhere
4. Skill layer with elicitation features

This ordering is strategic—MCP is the primary consumption interface for AI agents. Making that interface excellent is table stakes. Everything else builds on top.

### On Quality Standards

The "1k+ tests" mandate isn't arbitrary. It's a forcing function for:

- **Comprehensive coverage** — Can't hit 1000 tests without testing everything
- **Clean architecture** — Hard to test code that's badly structured
- **Refactoring confidence** — Changes don't break unknown things

### On the Golden Hour Context

The entire project exists because someone wanted to make an otter comic. This is important context—graphix isn't abstract infrastructure, it's a tool that makes something specific. Every service traces back to a real need from that project.

### On Trust and Autonomy

> "Be back soon!"

Translation: "I trust you to keep working while I'm away. Make decisions. Ship code. Don't wait for permission."

This is the ideal human-AI collaboration mode—high autonomy with clear direction.

---

## Technical Reference

### Package Structure

```
graphix/
├── packages/
│   ├── core/           # @graphix/core
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── client.ts      # Database factory
│   │   │   │   ├── schema.ts      # Drizzle schema
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── project.service.ts
│   │   │   │   ├── character.service.ts
│   │   │   │   ├── storyboard.service.ts
│   │   │   │   ├── panel.service.ts
│   │   │   │   ├── caption.service.ts
│   │   │   │   ├── generated-image.service.ts
│   │   │   │   ├── consistency.service.ts
│   │   │   │   ├── style.service.ts
│   │   │   │   ├── pose-library.service.ts
│   │   │   │   ├── inpainting.service.ts
│   │   │   │   ├── lighting.service.ts
│   │   │   │   ├── interpolation.service.ts
│   │   │   │   ├── interaction-pose.service.ts
│   │   │   │   ├── custom-asset.service.ts
│   │   │   │   ├── prompt-analytics.service.ts
│   │   │   │   ├── story-scaffold.service.ts  # NEW
│   │   │   │   ├── batch.service.ts           # NEW
│   │   │   │   └── index.ts
│   │   │   ├── generation/
│   │   │   │   ├── comfyui-client.ts
│   │   │   │   ├── prompt-builder.ts
│   │   │   │   ├── panel-generator.ts
│   │   │   │   ├── controlnet-stack.ts
│   │   │   │   ├── ip-adapter.ts
│   │   │   │   ├── config/
│   │   │   │   ├── models/
│   │   │   │   └── index.ts
│   │   │   ├── composition/
│   │   │   │   ├── templates.ts
│   │   │   │   ├── renderer.ts
│   │   │   │   ├── caption-renderer.ts
│   │   │   │   ├── caption-placement.ts
│   │   │   │   ├── caption-effects.ts
│   │   │   │   ├── export.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── index.ts
│   │   │   ├── config/
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── server/         # @graphix/server
│       ├── src/
│       │   ├── mcp/
│       │   │   ├── server.ts
│       │   │   └── tools/
│       │   │       ├── project.tools.ts
│       │   │       ├── character.tools.ts
│       │   │       ├── storyboard.tools.ts
│       │   │       ├── panel.tools.ts
│       │   │       ├── generation.tools.ts
│       │   │       ├── composition.tools.ts
│       │   │       ├── consistency.tools.ts
│       │   │       ├── style.tools.ts
│       │   │       ├── pose.tools.ts
│       │   │       ├── inpaint.tools.ts
│       │   │       ├── lighting.tools.ts
│       │   │       ├── curation.tools.ts
│       │   │       ├── analytics.tools.ts
│       │   │       ├── interpolation.tools.ts
│       │   │       ├── interaction.tools.ts
│       │   │       ├── asset.tools.ts
│       │   │       ├── caption.tools.ts
│       │   │       ├── story.tools.ts         # NEW
│       │   │       ├── batch.tools.ts         # NEW
│       │   │       └── index.ts
│       │   ├── rest/
│       │   │   ├── app.ts
│       │   │   └── routes/
│       │   │       ├── projects.ts
│       │   │       ├── characters.ts
│       │   │       ├── storyboards.ts
│       │   │       ├── panels.ts
│       │   │       ├── generations.ts
│       │   │       ├── composition.ts
│       │   │       ├── consistency.ts
│       │   │       ├── captions.ts
│       │   │       ├── story.ts               # NEW
│       │   │       └── batch.ts               # NEW
│       │   ├── start.ts
│       │   └── index.ts
│       └── package.json
├── src/                 # Legacy entry point
│   └── index.ts         # Re-exports from @graphix/server
├── package.json         # Workspace root
└── tsconfig.json
```

### Service Inventory

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| ProjectService | Project CRUD | create, getById, update, delete |
| CharacterService | Character management | create, setLora, addReference |
| StoryboardService | Storyboard management | create, duplicate, getWithPanels |
| PanelService | Panel management | create, describe, selectOutput |
| CaptionService | Caption management | create, reorder, getByPanel |
| GeneratedImageService | Image metadata | create, favorite, rate |
| ConsistencyService | Character consistency | extractIdentity, applyIdentity, chain |
| StyleService | Style/LoRA management | apply, buildStack, suggest |
| PoseLibraryService | Pose extraction/storage | extractPose, saveExpression |
| InpaintingService | Region regeneration | inpaint, edit, generateMask |
| LightingService | Lighting presets | setForStoryboard, suggest |
| InterpolationService | Panel interpolation | interpolate, suggestCount |
| InteractionPoseService | Multi-char poses | create, apply, applyPose |
| CustomAssetService | User assets | register, apply, applyToCharacter |
| PromptAnalyticsService | Generation analytics | analyze, suggestParams |
| **StoryScaffoldService** | Story structure | scaffold, fromOutline, parseOutline |
| **BatchService** | Batch operations | createPanels, generatePanels, renderCaptions |

### MCP Tool Count

| Category | Tool Count |
|----------|-----------|
| Project | 5 |
| Character | 9 |
| Storyboard | 6 |
| Panel | 11 |
| Generation | 6 |
| Composition | 6 |
| Consistency | 10 |
| Style | 7 |
| Pose | 15 |
| Inpaint | 4 |
| Lighting | 6 |
| Curation | 6 |
| Analytics | 3 |
| Interpolation | 2 |
| Interaction | 9 |
| Asset | 10 |
| Caption | 11 |
| **Story** | **3** |
| **Batch** | **10** |
| **Total** | **139** |

---

## Appendix: Commands Reference

### Building

```bash
# Build both packages
npx tsc --build packages/core packages/server

# Typecheck only
npm run typecheck --workspace=@graphix/core
npm run typecheck --workspace=@graphix/server
```

### Running

```bash
# Start server (both MCP and REST)
npm run start --workspace=@graphix/server

# Development with watch
npm run dev --workspace=@graphix/server
```

### Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=@graphix/core
npm test --workspace=@graphix/server

# Run with coverage
npm run test:coverage
```

---

*Worklog complete. All 6 phases finished. 1,018 tests passing.*
