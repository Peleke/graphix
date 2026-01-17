/**
 * OpenAPI Documentation App
 *
 * Serves OpenAPI specification and Swagger UI for the Graphix API.
 * Generates spec from Zod schemas using zod-to-json-schema.
 */

import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import zodToJsonSchema from "zod-to-json-schema";
import * as schemas from "./schemas/index.js";
import { allPaths } from "./paths/index.js";

// ============================================================================
// Convert Zod Schemas to JSON Schema
// ============================================================================

// Extract the schema definitions
function extractSchema(schemaWithDefs: any): any {
  // zod-to-json-schema wraps the schema in a definitions structure
  if (schemaWithDefs.definitions) {
    const defKey = Object.keys(schemaWithDefs.definitions)[0];
    return schemaWithDefs.definitions[defKey];
  }
  return schemaWithDefs;
}

// Convert all schemas to JSON Schema
// Filter to only Zod schemas (those ending with Schema)
const schemaEntries = Object.entries(schemas).filter(([key]) => key.endsWith("Schema"));
const convertedSchemas: Record<string, any> = {};

for (const [key, schema] of schemaEntries) {
  try {
    // Remove "Schema" suffix for component name
    const componentName = key.replace(/Schema$/, "");
    convertedSchemas[componentName] = zodToJsonSchema(schema as any, componentName);
  } catch (error) {
    console.warn(`Failed to convert schema ${key}:`, error);
  }
}

// Build components.schemas object
const componentsSchemas: Record<string, any> = {};
for (const [name, converted] of Object.entries(convertedSchemas)) {
  componentsSchemas[name] = extractSchema(converted);
}

// ============================================================================
// OpenAPI Spec
// ============================================================================

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Graphix API",
    version: "0.2.0",
    description: `# Graphix API

REST API for comic generation and storyboard management.

## Features
- **Projects**: Manage comic projects
- **Characters**: Create and configure characters with profiles and LoRAs
- **Storyboards**: Organize panels into storyboards
- **Panels**: Individual comic panels with descriptions and generation settings
- **Generation**: AI-powered image generation via ComfyUI
- **Captions**: Dialogue, narration, and sound effects
- **Batch Operations**: Bulk operations on panels, captions, and generations
- **Composition**: Page composition and export
- **Consistency**: Visual consistency tools (IP-Adapter, ControlNet)
- **Story**: Story scaffolding from structured input or outlines
- **Narrative**: Narrative engine (premises, stories, beats)
- **Review**: AI-powered image review and regeneration
- **Text**: Text generation and storage

## Error Handling
All errors follow a consistent format:
\`\`\`json
{
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "details": { ... }
  }
}
\`\`\`

Error codes: \`VALIDATION_ERROR\`, \`NOT_FOUND\`, \`BAD_REQUEST\`, \`INTERNAL_ERROR\`

## Pagination
List endpoints use page-based pagination:
\`\`\`
GET /api/projects?page=1&limit=20
\`\`\`

Response format:
\`\`\`json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "count": 5, "hasMore": false }
}
\`\`\``,
    contact: {
      name: "Graphix",
      url: "https://github.com/Peleke/graphix",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API base path",
    },
  ],
  tags: [
    { name: "Projects", description: "Project management endpoints" },
    { name: "Characters", description: "Character creation and configuration" },
    { name: "Storyboards", description: "Storyboard management" },
    { name: "Panels", description: "Panel management and generation" },
    { name: "Generations", description: "Generated image management" },
    { name: "Captions", description: "Caption management for panels" },
    { name: "Batch", description: "Batch operations on multiple resources" },
    { name: "Composition", description: "Page composition and export" },
    { name: "Consistency", description: "Visual consistency tools" },
    { name: "Story", description: "Story scaffolding endpoints" },
    { name: "Narrative", description: "Narrative engine (premises, stories, beats)" },
    { name: "Review", description: "Image review and regeneration" },
    { name: "Text", description: "Text generation and storage" },
  ],
  paths: allPaths,
  components: {
    schemas: componentsSchemas,
  },
};

// ============================================================================
// OpenAPI App
// ============================================================================

const openapi = new Hono();

// Serve OpenAPI JSON spec
openapi.get("/spec.json", (c) => {
  return c.json(openApiSpec);
});

// Serve Swagger UI
openapi.get(
  "/",
  swaggerUI({
    url: "/api/docs/spec.json",
  })
);

export { openapi, openApiSpec };
