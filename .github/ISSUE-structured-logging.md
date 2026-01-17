# Replace Console Logging with Structured Logging

**Labels:** `enhancement`, `observability`, `refactoring`

**Priority:** Low

## Description

Ruthless Reviewer identified that `console.warn` is used in `packages/server/src/openapi/index.ts` for non-critical schema conversion failures. While functional, structured logging would be more appropriate for production systems.

## Current State
```typescript
console.warn(`Failed to convert schema ${key}:`, error);
```

## Proposed Changes

1. **Integrate a structured logging library** (e.g., `pino`, `winston`, or Bun's built-in logger)
2. **Replace `console.warn` with structured logging:**
   ```typescript
   logger.warn({
     schema: key,
     error: error.message,
     stack: error.stack,
   }, "Failed to convert schema");
   ```
3. **Add log levels** (debug, info, warn, error)
4. **Add request context to logs** (requestId, userId, etc.)
5. **Configure log output format** (JSON for production, pretty for development)

## Benefits
- Better observability in production
- Structured logs enable better log aggregation and analysis
- Request context improves debugging
- Consistent logging patterns across the codebase

## Considerations
- Choose a logging library that works well with Bun runtime
- Ensure logs don't expose sensitive information
- Consider log retention and storage for production

## Timing
Can be addressed independently, but would be valuable before production deployment.

## Related Files
- `packages/server/src/openapi/index.ts`
- Potentially other files using `console.log/warn/error`

## Review Context
Identified by **Ruthless Reviewer** during review gauntlet for `feat/pre-ui-infrastructure` branch.
