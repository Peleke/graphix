# Restrict CORS Origins in Production

**Labels:** `security`, `enhancement`, `ui-phase`, `production`

**Priority:** High (for production)

## Description

Security Karen identified that CORS is currently configured to allow all origins (`origin: "*"`). While acceptable for development, this should be restricted in production to known origins.

## Current State
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

## Proposed Changes

1. **Add environment-based CORS configuration:**
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

2. **Add `ALLOWED_ORIGINS` environment variable to production config**
3. **Document CORS configuration in deployment docs**
4. **Add validation to ensure at least one origin is configured in production**

## Security Impact
- **CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)
- **OWASP Category:** A05 (Security Misconfiguration)
- **Risk:** Low in development, High in production

## Timing
Address this when beginning UI layer work, as we'll need to know the UI origin(s) to configure properly.

## Related Files
- `packages/server/src/rest/app.ts`

## Review Context
Identified by **Security Karen** during review gauntlet for `feat/pre-ui-infrastructure` branch.
