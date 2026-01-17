# Pre-UI Completion Plan: OpenAPI + Schemathesis + TS Client

## Goal
Complete all pre-UI infrastructure within the hour. No tech debt, no hardcoding, spec complete.

## Current State
- **OpenAPI spec**: Only `/projects` documented (5 ops). 13 route files missing (129 endpoints).
- **Schemathesis**: Port chaos (3000 vs 3002), no config source of truth.
- **TS Client**: Depends on spec. Also has timeout middleware bug.

## Execution Strategy

**Parallelize aggressively:**
1. One agent fixes Schemathesis config (fast)
2. Multiple agents expand OpenAPI spec (bulk of work)
3. One agent fixes TS client after spec is done

---

## Phase 1: Fix Schemathesis Config (15 min)

### Create Single Source of Truth
**File:** `packages/server/src/config/server.ts`

```typescript
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  get baseUrl() { return `http://${this.host}:${this.port}`; },
  get specUrl() { return `${this.baseUrl}/api/docs/spec.json`; },
  get healthUrl() { return `${this.baseUrl}/health`; },
} as const;
```

### Update All Scripts to Use Config
- `scripts/run-fuzz.sh` - Read port from config or env
- `scripts/pre-push-fuzz.sh` - Same
- `.github/workflows/api-fuzz.yml` - Use env vars
- `schemathesis.toml` - Comment noting config source

### Fix Critical Bugs
- Remove hardcoded `3000` in run-fuzz.sh line for macOS Docker
- Add port validation in shell scripts
- Fix SERVER_PID capture in CI

---

## Phase 2: Expand OpenAPI Spec (30 min)

### Approach
Rather than 13 separate schema files, create **modular spec files** that get merged:

```
packages/server/src/openapi/
├── index.ts              # Main entry, merges all specs
├── schemas/
│   ├── common.ts         # Existing (ID, pagination, errors)
│   ├── projects.ts       # Existing
│   ├── characters.ts     # NEW
│   ├── storyboards.ts    # NEW
│   ├── panels.ts         # NEW
│   ├── generations.ts    # NEW
│   ├── captions.ts       # NEW
│   ├── batch.ts          # NEW
│   ├── composition.ts    # NEW
│   ├── consistency.ts    # NEW
│   ├── story.ts          # NEW
│   ├── narrative.ts      # NEW
│   ├── review.ts         # NEW
│   ├── text.ts           # NEW (generated-texts + text-generation)
│   └── index.ts          # Export all
└── paths/
    ├── projects.ts       # Move from index.ts
    ├── characters.ts     # NEW
    ├── storyboards.ts    # NEW
    ├── panels.ts         # NEW
    ├── generations.ts    # NEW
    ├── captions.ts       # NEW
    ├── batch.ts          # NEW
    ├── composition.ts    # NEW
    ├── consistency.ts    # NEW
    ├── story.ts          # NEW
    ├── narrative.ts      # NEW
    ├── review.ts         # NEW
    ├── text.ts           # NEW
    └── index.ts          # Merge all paths
```

### Schema Pattern (reuse validation schemas)
```typescript
// schemas/characters.ts
import { z } from "zod";
import { IdSchema, TimestampsSchema } from "./common.js";

// Import existing validation schemas
import {
  createCharacterSchema,
  updateCharacterSchema,
} from "../../rest/validation/schemas.js";

// OpenAPI versions with .describe() annotations
export const CharacterSchema = z.object({
  id: IdSchema,
  projectId: IdSchema.describe("Parent project ID"),
  name: z.string().describe("Character name"),
  // ... mirror DB entity
}).merge(TimestampsSchema).describe("Character");

// Reuse validation schemas directly for request bodies
export const CreateCharacterSchema = createCharacterSchema.describe("Create character request");
export const UpdateCharacterSchema = updateCharacterSchema.describe("Update character request");
```

### Path Pattern
```typescript
// paths/characters.ts
export const characterPaths = {
  "/characters": {
    get: { /* list */ },
    post: { /* create */ },
  },
  "/characters/{id}": {
    get: { /* get by id */ },
    put: { /* full update */ },
    patch: { /* partial update */ },
    delete: { /* delete */ },
  },
  "/characters/{id}/references": {
    post: { /* add reference */ },
    delete: { /* remove reference */ },
  },
  // ... etc
};
```

### Parallelization Strategy
Split into 3 agents by route complexity:

**Agent A - Core CRUD (5 files, ~50 endpoints):**
- characters.ts (11 endpoints)
- storyboards.ts (10 endpoints)
- panels.ts (18 endpoints)
- generations.ts (12 endpoints)

**Agent B - Specialized (5 files, ~45 endpoints):**
- captions.ts (15 endpoints)
- batch.ts (10 endpoints)
- composition.ts (7 endpoints)
- consistency.ts (11 endpoints)

**Agent C - Narrative/AI (4 files, ~50 endpoints):**
- narrative.ts (27 endpoints)
- review.ts (14 endpoints)
- story.ts (3 endpoints)
- text.ts (18 + 8 = 26 endpoints)

---

## Phase 3: Fix TS Client (10 min)

### After spec is complete:
1. Regenerate `schema.d.ts` from full spec
2. Fix timeout middleware (use WeakMap instead of property hack)
3. Fix error response types (handle all status codes, not just 400/404)
4. Remove unused `GraphixApiError` class or wire it up
5. Add proper build output (not just source files)

### Timeout Middleware Fix
```typescript
// Use WeakMap to track timeouts without mutating request
const timeoutMap = new WeakMap<Request, NodeJS.Timeout>();

const timeoutMiddleware: Middleware = {
  onRequest({ request }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const newRequest = new Request(request, { signal: controller.signal });
    timeoutMap.set(newRequest, timeoutId);
    return newRequest;
  },
  onResponse({ request, response }) {
    const timeoutId = timeoutMap.get(request);
    if (timeoutId) clearTimeout(timeoutId);
    return response;
  },
};
```

---

## Phase 4: Verification

```bash
# 1. Type check everything
bun run typecheck

# 2. Run all tests
bun test

# 3. Start server, verify spec
bun run dev &
curl http://localhost:3000/api/docs/spec.json | jq '.paths | keys | length'
# Expected: 50+ paths (not just 2)

# 4. Verify Swagger UI shows all endpoints
open http://localhost:3000/api/docs

# 5. Regenerate client, verify types
cd packages/client && bun run generate

# 6. Run Schemathesis quick fuzz
bun run test:fuzz:quick
```

---

## Commits

1. `fix(tooling): add server config as single source of truth`
2. `feat(openapi): add schemas for all 14 route files`
3. `feat(openapi): add path definitions for all endpoints`
4. `fix(client): fix timeout middleware and error types`
5. `chore: regenerate client types from complete spec`

---

## Files to Modify/Create

### Schemathesis Fixes
- `packages/server/src/config/server.ts` (NEW)
- `scripts/run-fuzz.sh` (FIX port extraction)
- `scripts/pre-push-fuzz.sh` (FIX port extraction)
- `.github/workflows/api-fuzz.yml` (USE env vars)

### OpenAPI Expansion (NEW files)
- `packages/server/src/openapi/schemas/characters.ts`
- `packages/server/src/openapi/schemas/storyboards.ts`
- `packages/server/src/openapi/schemas/panels.ts`
- `packages/server/src/openapi/schemas/generations.ts`
- `packages/server/src/openapi/schemas/captions.ts`
- `packages/server/src/openapi/schemas/batch.ts`
- `packages/server/src/openapi/schemas/composition.ts`
- `packages/server/src/openapi/schemas/consistency.ts`
- `packages/server/src/openapi/schemas/story.ts`
- `packages/server/src/openapi/schemas/narrative.ts`
- `packages/server/src/openapi/schemas/review.ts`
- `packages/server/src/openapi/schemas/text.ts`
- `packages/server/src/openapi/paths/*.ts` (13 files)
- `packages/server/src/openapi/index.ts` (MODIFY to merge)

### TS Client Fixes
- `packages/client/src/client.ts` (FIX timeout)
- `packages/client/src/types.ts` (FIX error types)
- `packages/client/src/schema.d.ts` (REGENERATE)
- `packages/client/package.json` (FIX build)

---

## Time Budget

| Phase | Time | Parallel |
|-------|------|----------|
| Schemathesis config | 10 min | 1 agent |
| OpenAPI expansion | 25 min | 3 agents |
| TS client fixes | 10 min | 1 agent (after spec) |
| Verification | 5 min | Manual |
| **Total** | **~50 min** | |

---

## Auth Note
User confirmed: Build without auth, but ensure models are user-ready. All entities already have `userId` fields in schema - just bypass auth middleware during dev. No changes needed now.

---

## Route Files Reference (from packages/server/src/rest/routes/)

1. `projects.ts` - DONE
2. `characters.ts` - TODO
3. `storyboards.ts` - TODO
4. `panels.ts` - TODO
5. `generations.ts` - TODO
6. `captions.ts` - TODO
7. `batch.ts` - TODO
8. `composition.ts` - TODO
9. `consistency.ts` - TODO
10. `story.ts` - TODO
11. `narrative.ts` - TODO
12. `review.ts` - TODO
13. `generated-texts.ts` - TODO (combine with text-generation.ts)
14. `text-generation.ts` - TODO (combine with generated-texts.ts)
