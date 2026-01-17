/**
 * OpenAPI Documentation App
 *
 * Serves OpenAPI specification and Swagger UI for the Graphix API.
 * Generates spec from Zod schemas using zod-to-json-schema.
 */

import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import zodToJsonSchema from "zod-to-json-schema";
import {
  IdSchema,
  PaginationQuerySchema,
  PaginationMetaSchema,
  ErrorSchema,
} from "./schemas/common.js";
import {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
} from "./schemas/projects.js";

// ============================================================================
// Convert Zod Schemas to JSON Schema
// ============================================================================

const schemas = {
  Id: zodToJsonSchema(IdSchema, "Id"),
  PaginationQuery: zodToJsonSchema(PaginationQuerySchema, "PaginationQuery"),
  PaginationMeta: zodToJsonSchema(PaginationMetaSchema, "PaginationMeta"),
  Error: zodToJsonSchema(ErrorSchema, "Error"),
  Project: zodToJsonSchema(ProjectSchema, "Project"),
  CreateProject: zodToJsonSchema(CreateProjectSchema, "CreateProject"),
  UpdateProject: zodToJsonSchema(UpdateProjectSchema, "UpdateProject"),
};

// Extract the schema definitions
function extractSchema(schemaWithDefs: any): any {
  // zod-to-json-schema wraps the schema in a definitions structure
  if (schemaWithDefs.definitions) {
    const defKey = Object.keys(schemaWithDefs.definitions)[0];
    return schemaWithDefs.definitions[defKey];
  }
  return schemaWithDefs;
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
  ],
  paths: {
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List all projects",
        description: "Returns a paginated list of all projects.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number (1-indexed)",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Items per page (max 100)",
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of projects",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Project" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a new project",
        description: "Creates a new project with the provided details.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProject" },
            },
          },
        },
        responses: {
          "201": {
            description: "Project created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project by ID",
        description: "Returns a single project by its unique identifier.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project ID (UUID or cuid2)",
          },
        ],
        responses: {
          "200": {
            description: "Project found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Invalid ID format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        description: "Updates an existing project with the provided details.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project ID (UUID or cuid2)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProject" },
            },
          },
        },
        responses: {
          "200": {
            description: "Project updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Invalid ID format or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Partially update a project",
        description: "Updates specific fields of an existing project. Only provided fields are updated.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project ID (UUID or cuid2)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProject" },
            },
          },
        },
        responses: {
          "200": {
            description: "Project updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Invalid ID format or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        description: "Permanently deletes a project and all associated data.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project ID (UUID or cuid2)",
          },
        ],
        responses: {
          "204": {
            description: "Project deleted successfully",
          },
          "400": {
            description: "Invalid ID format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Project: extractSchema(schemas.Project),
      CreateProject: extractSchema(schemas.CreateProject),
      UpdateProject: extractSchema(schemas.UpdateProject),
      PaginationMeta: extractSchema(schemas.PaginationMeta),
      Error: extractSchema(schemas.Error),
    },
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
