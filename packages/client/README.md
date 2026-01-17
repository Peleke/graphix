# @graphix/client

Type-safe API client for the Graphix REST API, generated from the OpenAPI specification.

## Installation

The package is part of the graphix monorepo workspaces - no separate installation needed.

```bash
# From monorepo root
npm install
```

## Usage

### Basic Client Setup

```typescript
import { createGraphixClient } from "@graphix/client";

const client = createGraphixClient({
  baseUrl: "http://localhost:3000/api",
  timeout: 30000, // optional
});
```

### List Projects

```typescript
const { data, error } = await client.GET("/projects", {
  params: {
    query: { page: 1, limit: 10 },
  },
});

if (data) {
  console.log(data.data);        // Project[]
  console.log(data.pagination);  // PaginationMeta
}
```

### Create a Project

```typescript
import type { CreateProject } from "@graphix/client";

const input: CreateProject = {
  name: "My Project",
  description: "A cool project",
};

const { data, error } = await client.POST("/projects", {
  body: input,
});

if (data) {
  console.log(`Created: ${data.id}`);
}
```

### Get a Project

```typescript
const { data, error } = await client.GET("/projects/{id}", {
  params: {
    path: { id: "abc123" },
  },
});
```

### Update a Project

```typescript
const { data, error } = await client.PATCH("/projects/{id}", {
  params: {
    path: { id: "abc123" },
  },
  body: {
    name: "Updated Name",
  },
});
```

### Delete a Project

```typescript
const { error, response } = await client.DELETE("/projects/{id}", {
  params: {
    path: { id: "abc123" },
  },
});

if (response.status === 204) {
  console.log("Deleted!");
}
```

### Error Handling

Errors are fully typed with the `ApiError` type:

```typescript
import type { ApiError } from "@graphix/client";

const { data, error } = await client.GET("/projects/{id}", {
  params: { path: { id: "invalid" } },
});

if (error) {
  // error is typed as ApiError
  console.log(error.error.message);   // Human-readable message
  console.log(error.error.code);      // Machine-readable code (e.g., "NOT_FOUND")
  console.log(error.requestId);       // For debugging
  console.log(error.error.details);   // Additional context
}
```

## Types

### Schema Types

```typescript
import type {
  Project,
  CreateProject,
  UpdateProject,
  PaginationMeta,
  ErrorCode,
  ApiError,
} from "@graphix/client";
```

### Utility Types

```typescript
import type {
  PaginatedResponse,
  PaginatedProjects,
  PaginationQuery,
  SuccessResponse,
  ErrorResponse,
  RequestBody,
  PathParams,
  QueryParams,
} from "@graphix/client";
```

## Regenerating Types

If the OpenAPI spec changes, regenerate the types:

```bash
# From packages/client
npm run generate

# Or from monorepo root
npm run --workspace @graphix/client generate
```

## Development

```bash
# Type check
npm run typecheck

# Run example (requires server running)
npx tsx examples/basic-usage.ts
```

## Architecture

Built with:

- **openapi-typescript** - Generates TypeScript types from OpenAPI spec
- **openapi-fetch** - Type-safe fetch client using the generated types

This approach provides:

- Zero runtime type overhead (types are compile-time only)
- Full TypeScript inference for requests and responses
- Minimal bundle size
- Flexibility to use with any React data fetching library
