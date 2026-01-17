# API Migration Guide: v0.1 to v0.2

This document describes breaking changes introduced in the route validation migration.

## Summary

The REST API has been updated with:
- Standardized Zod validation on all endpoints
- Consistent error response format
- Page-based pagination (replacing offset-based)
- Stricter ID format validation

## Breaking Changes

### 1. Pagination Format Change

**Before (v0.1):**
```json
{
  "projects": [...],
  "pagination": {
    "offset": 0,
    "limit": 100,
    "total": 5
  }
}
```

**After (v0.2):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "count": 5,
    "hasMore": false
  }
}
```

**Migration:**
- Change `projects`, `characters`, `storyboards`, etc. to `data`
- Change `offset` parameter to `page` (1-indexed)
- Default `limit` changed from 100 to 20
- Use `hasMore` boolean instead of computing from total

### 2. Error Response Format Change

**Before (v0.1):**
```json
{
  "error": "Project not found"
}
```

**After (v0.2):**
```json
{
  "error": {
    "message": "Project not found",
    "code": "NOT_FOUND",
    "details": { "resource": "Project", "id": "..." }
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Request body/params failed validation
- `NOT_FOUND` - Resource does not exist
- `BAD_REQUEST` - Invalid request format
- `INTERNAL_ERROR` - Server error

### 3. Validation Error Details

Validation errors now include detailed field-level information:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "issues": [
        {
          "path": ["name"],
          "message": "Cannot be empty"
        }
      ]
    }
  }
}
```

### 4. ID Format Validation

IDs are now validated to be either:
- UUID format: `00000000-0000-0000-0000-000000000000`
- cuid2 format: `bjjjtxe5k8pbziaecqogx81w`

Invalid ID formats now return 400 Bad Request instead of 404 Not Found.

**Before:** `GET /api/projects/invalid` returned 404
**After:** `GET /api/projects/invalid` returns 400

### 5. Character Profile Updates

Character profile updates now use partial semantics - you can update individual fields without re-specifying all required fields:

**Before (v0.1):** Updating clothing required re-sending species
```json
{
  "profile": {
    "species": "fox",
    "clothing": ["new-outfit"]
  }
}
```

**After (v0.2):** Can update just the field you need
```json
{
  "profile": {
    "clothing": ["new-outfit"]
  }
}
```

## Endpoint Changes

All list endpoints now follow the same pattern:

| Endpoint | Query Params |
|----------|--------------|
| `GET /api/projects` | `?page=1&limit=20` |
| `GET /api/characters` | `?page=1&limit=20` |
| `GET /api/storyboards` | `?page=1&limit=20` |

## Client Code Migration

### JavaScript/TypeScript

```typescript
// Before
const { projects, pagination } = await fetch('/api/projects').then(r => r.json());
const nextOffset = pagination.offset + pagination.limit;

// After
const { data, pagination } = await fetch('/api/projects').then(r => r.json());
const nextPage = pagination.hasMore ? pagination.page + 1 : null;
```

### Error Handling

```typescript
// Before
if (response.error) {
  showError(response.error);
}

// After
if (response.error) {
  showError(response.error.message);
  if (response.error.code === 'VALIDATION_ERROR') {
    highlightFields(response.error.details.issues);
  }
}
```
