/**
 * Project Path Definitions
 *
 * OpenAPI path definitions for project endpoints.
 * Note: Currently defined inline in index.ts, but kept here for consistency.
 */

export const projectPaths: Record<string, any> = {
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
};
