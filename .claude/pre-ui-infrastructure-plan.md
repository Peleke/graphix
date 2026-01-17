# Pre-UI Infrastructure Completion Plan

**Branch:** `feat/pre-ui-infrastructure`  
**Goal:** Complete OpenAPI spec expansion, TS client fixes, Schemathesis integration, and contract tests before UI planning phase.

---

## Current State

- ✅ Server config exists (`packages/server/src/config/server.ts`)
- ✅ OpenAPI: `/projects` documented (5 endpoints)
- ❌ Missing: 13 route files need OpenAPI schemas + paths (129 endpoints)
- ❌ TS Client: Timeout middleware bug (property hack → WeakMap)
- ❌ Schemathesis: Not integrated (Docker setup needed)
- ❌ Contract tests: Only projects have full coverage

---

## Architecture Understanding

### Layer Separation
- **@graphix/core**: Pure business logic, zero transport concerns
- **@graphix/server**: MCP + REST adapters wrapping core services
- **@graphix/client**: TypeScript client generated from OpenAPI spec

### Service Pattern
- Services instantiated **inside handlers** (not module-level) to avoid DB init issues
- Use `getXxxService()` functions inside route handlers

### Testing Structure
- **Unit**: `packages/core/src/__tests__/services/` - Service logic
- **Integration**: `packages/core/src/__tests__/integration/` - Cross-service flows
- **E2E**: `packages/core/src/__tests__/e2e/` - Full workflows
- **Contract**: `packages/server/src/__tests__/contract/` - REST + MCP API contracts

---

## Execution Plan

### Phase 1: Branch Setup & Initial State Verification (5 min)

**Tasks:**
1. Create feature branch: `feat/pre-ui-infrastructure`
2. Verify current OpenAPI spec state
3. Verify TS client current state
4. Document baseline metrics

**Verification:**
```bash
git checkout -b feat/pre-ui-infrastructure
curl http://localhost:3002/api/docs/spec.json | jq '.paths | keys | length'
# Current: ~2 paths (projects only)
```

---

### Phase 2: OpenAPI Spec Expansion (Foundation) (60-90 min)

**Goal:** Document all 13 missing route files with schemas and paths.

**Approach:** Modular spec files that merge:
```
packages/server/src/openapi/
├── index.ts              # Main entry, merges all specs
├── schemas/
│   ├── common.ts         # ✅ Existing
│   ├── projects.ts       # ✅ Existing
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
│   └── text.ts           # NEW (generated-texts + text-generation)
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
    └── text.ts           # NEW
```

**Schema Pattern:**
- Reuse validation schemas from `packages/server/src/rest/validation/schemas.ts`
- Add `.describe()` annotations for OpenAPI docs
- Mirror DB entity structure from `packages/core/src/db/schema.ts`

**Path Pattern:**
- Follow existing `/projects` pattern
- Include all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Document query params, path params, request bodies, responses
- Reference component schemas via `$ref`

**Route Files to Document:**
1. `characters.ts` - 11 endpoints
2. `storyboards.ts` - 10 endpoints
3. `panels.ts` - 18 endpoints
4. `generations.ts` - 12 endpoints
5. `captions.ts` - 15 endpoints
6. `batch.ts` - 10 endpoints
7. `composition.ts` - 7 endpoints
8. `consistency.ts` - 11 endpoints
9. `story.ts` - 3 endpoints
10. `narrative.ts` - 27 endpoints
11. `review.ts` - 14 endpoints
12. `generated-texts.ts` + `text-generation.ts` - 26 endpoints (combined as `text.ts`)

**Validation:**
- Type check: `bun run typecheck`
- Verify spec: `curl http://localhost:3002/api/docs/spec.json | jq '.paths | keys | length'`
- Expected: 50+ paths (not just 2)
- Swagger UI: `open http://localhost:3002/api/docs`

---

### Phase 3: TS Client Fixes (15-20 min)

**After OpenAPI spec is complete:**

1. **Regenerate schema types:**
   ```bash
   cd packages/client
   bun run generate:live  # Uses running server
   ```

2. **Fix timeout middleware:**
   - File: `packages/client/src/client.ts`
   - Replace property hack with WeakMap
   - Pattern:
   ```typescript
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

3. **Fix error response types:**
   - File: `packages/client/src/types.ts`
   - Handle all status codes (not just 400/404)
   - Ensure GraphixApiError class is properly wired

4. **Fix build output:**
   - File: `packages/client/package.json`
   - Add proper build script if needed

**Validation:**
- Type check: `cd packages/client && bun run typecheck`
- Test client import: `import { createGraphixClient } from '@graphix/client'`

---

### Phase 4: Schemathesis Docker Integration (20-30 min)

**Approach:** Use schemathesis Docker image (most portable, CI/CD friendly). Server runs separately, schemathesis hits it via Docker network.

**Why Docker image (not Dockerfile):**
- ✅ Most portable (works locally, CI/CD, anywhere Docker runs)
- ✅ No Python/Node version conflicts
- ✅ Official image maintained by schemathesis team
- ✅ CI/CD friendly (just pull image and run)
- ✅ No build step needed

**Files to Create:**

1. **`schemathesis.toml`** (config file):
   ```toml
   [schemathesis]
   # Base URL set via CLI/env, not hardcoded here
   
   [schemathesis.checks]
   # Enable comprehensive checks
   not_a_server_error = true
   status_code_conformance = true
   content_type_conformance = true
   response_schema_conformance = true
   response_headers_conformance = true
   
   [schemathesis.hypothesis]
   # Reasonable defaults for CI/CD
   max_examples = 50
   deadline = 5000
   ```

2. **`scripts/run-fuzz.sh`** (local fuzz script):
   ```bash
   #!/bin/bash
   # Run schemathesis fuzz tests via Docker
   # Most portable approach: Docker image + running server
   
   set -e
   
   PORT=${PORT:-3002}
   BASE_URL="http://host.docker.internal:${PORT}/api"
   SPEC_URL="${BASE_URL}/docs/spec.json"
   
   # Ensure server is running
   echo "Checking server health..."
   if ! curl -f "${BASE_URL}/health" > /dev/null 2>&1; then
     echo "❌ Error: Server not running on port ${PORT}"
     echo "   Start server with: bun run dev"
     exit 1
   fi
   
   echo "✅ Server is running"
   echo "Running schemathesis fuzz tests..."
   
   # Run schemathesis via Docker (most portable)
   docker run --rm \
     --add-host=host.docker.internal:host-gateway \
     -v "$(pwd)/schemathesis.toml:/app/schemathesis.toml:ro" \
     schemathesis/schemathesis:stable \
     run "${SPEC_URL}" \
     --checks all \
     --base-url "${BASE_URL}" \
     --config /app/schemathesis.toml
   ```

3. **`scripts/pre-push-fuzz.sh`** (pre-push hook - quick smoke test):
   ```bash
   #!/bin/bash
   # Quick fuzz test before push (fast, limited examples)
   
   set -e
   
   PORT=${PORT:-3002}
   BASE_URL="http://host.docker.internal:${PORT}/api"
   SPEC_URL="${BASE_URL}/docs/spec.json"
   
   # Quick health check
   if ! curl -f "${BASE_URL}/health" > /dev/null 2>&1; then
     echo "❌ Server not running. Start with: bun run dev"
     exit 1
   fi
   
   echo "Running quick fuzz test (pre-push)..."
   
   docker run --rm \
     --add-host=host.docker.internal:host-gateway \
     schemathesis/schemathesis:stable \
     run "${SPEC_URL}" \
     --checks all \
     --base-url "${BASE_URL}" \
     --max-failures 5 \
     --hypothesis-max-examples 20 \
     --hypothesis-deadline 2000
   ```

4. **`.github/workflows/api-fuzz.yml`** (CI/CD - most portable):
   ```yaml
   name: API Fuzz Testing
   
   on:
     pull_request:
       paths:
         - 'packages/server/src/**'
         - 'packages/server/src/openapi/**'
         - 'schemathesis.toml'
         - '.github/workflows/api-fuzz.yml'
     workflow_dispatch:
   
   jobs:
     fuzz:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Bun
           uses: oven-sh/setup-bun@v1
           with:
             bun-version: latest
         
         - name: Install dependencies
           run: bun install
         
         - name: Start server (background)
           run: |
             bun run --cwd packages/server dev > server.log 2>&1 &
             echo $! > server.pid
             
             # Wait for server to be ready
             timeout=30
             elapsed=0
             while ! curl -f http://localhost:3002/api/health > /dev/null 2>&1; do
               if [ $elapsed -ge $timeout ]; then
                 echo "❌ Server failed to start"
                 cat server.log
                 exit 1
               fi
               sleep 1
               elapsed=$((elapsed + 1))
             done
             echo "✅ Server is ready"
         
         - name: Run Schemathesis (all endpoints)
           run: |
             docker run --rm \
               --network host \
               -v "${{ github.workspace }}/schemathesis.toml:/app/schemathesis.toml:ro" \
               schemathesis/schemathesis:stable \
               run http://localhost:3002/api/docs/spec.json \
               --checks all \
               --base-url http://localhost:3002/api \
               --config /app/schemathesis.toml \
               --max-failures 10
         
         - name: Stop server
           if: always()
           run: |
             if [ -f server.pid ]; then
               kill $(cat server.pid) || true
             fi
   ```

5. **Update `package.json` scripts:**
   ```json
   {
     "scripts": {
       "test:fuzz": "bash scripts/run-fuzz.sh",
       "test:fuzz:quick": "bash scripts/pre-push-fuzz.sh"
     }
   }
   ```

**Validation:**
- Test locally: `bun run test:fuzz:quick`
- Verify Docker image pulls correctly
- Test CI workflow (dry run)

---

### Phase 5: Contract Test Stubs (30-45 min)

**Goal:** Minimal structure with smoke tests (80/20 rule), but complete if straightforward.

**Approach:** Follow existing pattern from `packages/server/src/__tests__/contract/rest/projects.test.ts`

**Files to Create/Update:**

For each route file, create contract test:
- `packages/server/src/__tests__/contract/rest/characters.test.ts`
- `packages/server/src/__tests__/contract/rest/storyboards.test.ts`
- `packages/server/src/__tests__/contract/rest/panels.test.ts`
- `packages/server/src/__tests__/contract/rest/generations.test.ts`
- `packages/server/src/__tests__/contract/rest/captions.test.ts`
- `packages/server/src/__tests__/contract/rest/batch.test.ts`
- `packages/server/src/__tests__/contract/rest/composition.test.ts`
- `packages/server/src/__tests__/contract/rest/consistency.test.ts`
- `packages/server/src/__tests__/contract/rest/story.test.ts`
- `packages/server/src/__tests__/contract/rest/narrative.test.ts`
- `packages/server/src/__tests__/contract/rest/review.test.ts`
- `packages/server/src/__tests__/contract/rest/text.test.ts`

**Minimal Test Structure (Smoke Tests):**
```typescript
describe("REST /api/{resource}", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("GET /api/{resource}", () => {
    it("returns 200 with empty data array when none exist", async () => {
      const res = await app.request("/api/{resource}");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toBeArray();
    });
  });

  describe("POST /api/{resource}", () => {
    it("creates resource and returns 201", async () => {
      // Minimal valid payload
      const res = await app.request("/api/{resource}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ /* minimal required fields */ }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
    });
  });

  describe("GET /api/{resource}/{id}", () => {
    it("returns 404 when resource does not exist", async () => {
      const res = await app.request("/api/{resource}/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });
});
```

**If straightforward to complete:** Add full CRUD coverage (GET list, GET by ID, POST, PUT, PATCH, DELETE) with proper test data setup.

**Validation:**
- Run tests: `bun test packages/server/src/__tests__/contract/rest/`
- All smoke tests pass
- No false positives

---

### Phase 6: Test Execution & Verification (10 min)

**Run all tests:**

```bash
# 1. Type check everything
bun run typecheck

# 2. Run core tests
bun test packages/core

# 3. Run server tests (including contract tests)
bun test packages/server

# 4. Verify OpenAPI spec
curl http://localhost:3002/api/docs/spec.json | jq '.paths | keys | length'
# Expected: 50+ paths

# 5. Verify Swagger UI
open http://localhost:3002/api/docs

# 6. Regenerate client types
cd packages/client && bun run generate:live

# 7. Verify client builds
cd packages/client && bun run typecheck

# 8. Quick fuzz test (if server running)
bun run test:fuzz:quick
```

**Success Criteria:**
- ✅ All type checks pass
- ✅ All tests pass
- ✅ OpenAPI spec has 50+ paths
- ✅ Swagger UI shows all endpoints
- ✅ Client types regenerate successfully
- ✅ Client typechecks pass

---

### Phase 7: Review Gauntlet (After Implementation Complete)

**Process:** Run Review Gauntlet from buildlog (all three reviewers in sequence)

**Reviewers:**
1. **Ruthless Reviewer** - Code quality, functional principles, invariants
2. **Test Terrorist** - Testing coverage, BDD, contract tests
3. **Security Karen** - OWASP Top 10, security vulnerabilities

**Execution:**
- Review all changed files
- Aggregate findings
- Document issues with severity/category
- Extract learnable rules

**Output Format:**
```json
{
  "gauntlet_verdict": "ANNIHILATED" | "NEEDS_WORK" | "ACCEPTABLE" | "EXEMPLARY",
  "stages": {
    "ruthless_reviewer": { "verdict": "...", "issues_count": N },
    "test_terrorist": { "verdict": "...", "issues_count": N },
    "security_karen": { "verdict": "...", "issues_count": N }
  },
  "all_issues": [ /* structured issues */ ],
  "priority_fixes": [ /* ordered list */ ]
}
```

**After Review:**
- Fix all critical/major issues
- Re-run tests
- Optionally run second review pass if significant changes

---

### Phase 8: Final Verification & Commit (5 min)

**Final checks:**
- All tests pass
- Type checks pass
- OpenAPI spec complete
- Client regenerated
- Review gauntlet passed (or issues documented)

**Commits (incremental, push after each):**
- Commit frequently (after each logical unit)
- Push after every commit
- Suggested commits:
  1. `feat(openapi): add schemas for characters, storyboards, panels`
  2. `feat(openapi): add schemas for generations, captions, batch`
  3. `feat(openapi): add schemas for composition, consistency, story`
  4. `feat(openapi): add schemas for narrative, review, text`
  5. `feat(openapi): add path definitions for characters, storyboards, panels`
  6. `feat(openapi): add path definitions for generations, captions, batch`
  7. `feat(openapi): add path definitions for composition, consistency, story`
  8. `feat(openapi): add path definitions for narrative, review, text`
  9. `feat(openapi): merge all schemas and paths in index.ts`
  10. `fix(client): fix timeout middleware using WeakMap`
  11. `fix(client): fix error response types for all status codes`
  12. `chore(client): regenerate types from complete spec`
  13. `feat(testing): add schemathesis Docker integration`
  14. `test(contract): add smoke tests for characters, storyboards, panels`
  15. `test(contract): add smoke tests for remaining endpoints`

**Push branch:**
```bash
git push -u origin feat/pre-ui-infrastructure
```

---

## Time Budget

| Phase | Time | Notes |
|-------|------|-------|
| Branch setup | 5 min | Verification |
| OpenAPI expansion | 60-90 min | Bulk of work |
| TS client fixes | 15-20 min | After spec done |
| Schemathesis setup | 20-30 min | Docker integration |
| Contract test stubs | 30-45 min | Smoke tests (or full if easy) |
| Test execution | 10 min | Verification |
| Review gauntlet | 30-60 min | Three reviewers |
| Fix issues | Variable | Depends on findings |
| Final verification | 5 min | Final checks |
| **Total** | **~3-4 hours** | Plus review/fix time |

---

## Success Criteria

- ✅ **ALL OpenAPI paths documented** - Every endpoint from all 13 route files (129 endpoints, 50+ paths)
- ✅ **TS client reflects totality** - Regenerated from complete spec, all types accurate
- ✅ **Schemathesis hits EVERYTHING** - Fuzz tests cover all documented endpoints
- ✅ **All tests pass** - Unit, integration, E2E, contract tests all green
- ✅ **Review gauntlet passed** - All three reviewers (Ruthless Reviewer, Test Terrorist, Security Karen) begrudgingly allow PR through
- ✅ **Ready for UI planning phase** - Pre-UI infrastructure complete, no tech debt

---

## Notes

- **Service instantiation:** Always call `getXxxService()` inside handlers, never at module level
- **Schema reuse:** Import validation schemas from `rest/validation/schemas.ts` and add `.describe()` for OpenAPI
- **DB schema reference:** Use `packages/core/src/db/schema.ts` for entity structure
- **Test patterns:** Follow existing contract test patterns from `projects.test.ts`
- **Review timing:** Gauntlet runs AFTER implementation AND tests pass

---

## Files to Create/Modify

### OpenAPI Expansion
- `packages/server/src/openapi/schemas/*.ts` (12 new schema files)
- `packages/server/src/openapi/paths/*.ts` (13 new path files)
- `packages/server/src/openapi/index.ts` (modify to merge all)

### TS Client Fixes
- `packages/client/src/client.ts` (fix timeout middleware)
- `packages/client/src/types.ts` (fix error types)
- `packages/client/src/schema.d.ts` (regenerate)

### Schemathesis Integration
- `schemathesis.toml` (config)
- `scripts/run-fuzz.sh` (local fuzz)
- `scripts/pre-push-fuzz.sh` (pre-push hook)
- `.github/workflows/api-fuzz.yml` (CI/CD)
- `package.json` (add fuzz scripts)

### Contract Tests
- `packages/server/src/__tests__/contract/rest/*.test.ts` (12 new test files)

---

**Ready to execute!** 🚀
