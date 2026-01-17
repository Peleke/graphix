# GitHub Issues for Pre-UI Infrastructure Follow-ups

## Issue 1: Add BDD Structure to Contract Tests

**Labels:** `enhancement`, `testing`, `ui-phase`

**Priority:** Medium

**Description:**

During the review gauntlet, Test Terrorist identified that contract tests lack BDD-style structure. While we have 196 passing contract tests with good coverage, they would benefit from Given/When/Then structure for better readability and alignment with business requirements.

**Current State:**
- 196 contract tests across 15 files
- All tests passing
- Good coverage of REST API contracts
- Tests cover error cases, validation, and edge cases

**Proposed Changes:**
1. Refactor contract tests to use BDD-style structure:
   ```typescript
   describe("POST /api/projects", () => {
     describe("Given a valid project request", () => {
       it("When creating a project, Then returns 201 with project data", async () => {
         // test implementation
       });
     });
     
     describe("Given an invalid project request", () => {
       it("When creating a project with missing name, Then returns 400 with validation error", async () => {
         // test implementation
       });
     });
   });
   ```

2. Add property-based testing for edge cases:
   - Use a property-based testing library (e.g., `fast-check` or similar)
   - Test boundary conditions, invalid inputs, and edge cases
   - Complement existing Schemathesis fuzz testing with unit-level property tests

**Benefits:**
- Improved test readability and maintainability
- Better alignment with business requirements
- Property-based tests catch edge cases unit tests might miss
- More comprehensive test coverage

**Timing:**
Address this when beginning UI layer work, as it will help ensure UI tests follow the same patterns.

**Related Files:**
- `packages/server/src/__tests__/contract/rest/*.test.ts` (15 files)

---

## Issue 2: Restrict CORS Origins in Production

**Labels:** `security`, `enhancement`, `ui-phase`, `production`

**Priority:** High (for production)

**Description:**

Security Karen identified that CORS is currently configured to allow all origins (`origin: "*"`). While acceptable for development, this should be restricted in production to known origins.

**Current State:**
```typescript
app.use(
  "*",
  cors({
    origin: "*",  // Allows all origins
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
```

**Proposed Changes:**
1. Add environment-based CORS configuration:
   ```typescript
   const corsOptions = {
     origin: process.env.NODE_ENV === "production"
       ? process.env.ALLOWED_ORIGINS?.split(",") || []
       : "*",
     allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     allowHeaders: ["Content-Type", "Authorization"],
     credentials: true, // If needed for auth cookies
   };
   ```

2. Add `ALLOWED_ORIGINS` environment variable to production config
3. Document CORS configuration in deployment docs
4. Add validation to ensure at least one origin is configured in production

**Security Impact:**
- **CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)
- **OWASP Category:** A05 (Security Misconfiguration)
- **Risk:** Low in development, High in production

**Timing:**
Address this when beginning UI layer work, as we'll need to know the UI origin(s) to configure properly.

**Related Files:**
- `packages/server/src/rest/app.ts`

---

## Issue 3: Replace Console Logging with Structured Logging

**Labels:** `enhancement`, `observability`, `refactoring`

**Priority:** Low

**Description:**

Ruthless Reviewer identified that `console.warn` is used in `packages/server/src/openapi/index.ts` for non-critical schema conversion failures. While functional, structured logging would be more appropriate for production systems.

**Current State:**
```typescript
console.warn(`Failed to convert schema ${key}:`, error);
```

**Proposed Changes:**
1. Integrate a structured logging library (e.g., `pino`, `winston`, or Bun's built-in logger)
2. Replace `console.warn` with structured logging:
   ```typescript
   logger.warn({
     schema: key,
     error: error.message,
     stack: error.stack,
   }, "Failed to convert schema");
   ```
3. Add log levels (debug, info, warn, error)
4. Add request context to logs (requestId, userId, etc.)
5. Configure log output format (JSON for production, pretty for development)

**Benefits:**
- Better observability in production
- Structured logs enable better log aggregation and analysis
- Request context improves debugging
- Consistent logging patterns across the codebase

**Considerations:**
- Choose a logging library that works well with Bun runtime
- Ensure logs don't expose sensitive information
- Consider log retention and storage for production

**Timing:**
Can be addressed independently, but would be valuable before production deployment.

**Related Files:**
- `packages/server/src/openapi/index.ts`
- Potentially other files using `console.log/warn/error`

---

## Notes

These issues were identified during the review gauntlet for the `feat/pre-ui-infrastructure` branch:
- **Ruthless Reviewer:** Identified structured logging improvement
- **Test Terrorist:** Identified BDD structure and property-based testing needs
- **Security Karen:** Identified CORS configuration concern

All issues are non-blocking for the current PR and can be addressed in follow-up work.
