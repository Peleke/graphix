/**
 * Storyboard Path Definitions
 *
 * OpenAPI path definitions for storyboard endpoints.
 */

export const storyboardPaths: Record<string, any> = {
  "/storyboards": {
    post: {
      tags: ["Storyboards"],
      summary: "Create a new storyboard",
      description: "Creates a new storyboard with the provided details.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateStoryboard" },
          },
        },
      },
      responses: {
        "201": {
          description: "Storyboard created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Storyboard" },
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
  "/storyboards/{id}": {
    get: {
      tags: ["Storyboards"],
      summary: "Get storyboard by ID",
      description: "Returns a single storyboard by its unique identifier.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "Storyboard found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Storyboard" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Storyboards"],
      summary: "Update a storyboard",
      description: "Updates an existing storyboard with the provided details.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateStoryboard" },
          },
        },
      },
      responses: {
        "200": {
          description: "Storyboard updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Storyboard" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Storyboards"],
      summary: "Partially update a storyboard",
      description: "Updates specific fields of an existing storyboard.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateStoryboard" },
          },
        },
      },
      responses: {
        "200": {
          description: "Storyboard updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Storyboard" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Storyboards"],
      summary: "Delete a storyboard",
      description: "Permanently deletes a storyboard and all associated panels.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      responses: {
        "204": {
          description: "Storyboard deleted successfully",
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/storyboards/{id}/full": {
    get: {
      tags: ["Storyboards"],
      summary: "Get storyboard with panels",
      description: "Returns a storyboard with all its panels included.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "Storyboard with panels",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StoryboardWithPanels" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/storyboards/project/{projectId}": {
    get: {
      tags: ["Storyboards"],
      summary: "List storyboards by project",
      description: "Returns all storyboards for a specific project.",
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Project ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "List of storyboards",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StoryboardsListResponse" },
            },
          },
        },
        "400": {
          description: "Invalid project ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/storyboards/{id}/duplicate": {
    post: {
      tags: ["Storyboards"],
      summary: "Duplicate a storyboard",
      description: "Creates a copy of a storyboard with all its panels.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DuplicateStoryboard" },
          },
        },
      },
      responses: {
        "201": {
          description: "Storyboard duplicated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Storyboard" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/storyboards/{id}/panels": {
    get: {
      tags: ["Storyboards"],
      summary: "Get panels for storyboard",
      description: "Returns all panels in a storyboard.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "List of panels",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PanelsListResponse" },
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
          description: "Storyboard not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Storyboards"],
      summary: "Create panel in storyboard",
      description: "Creates a new panel in a storyboard.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Storyboard ID (UUID or cuid2)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreatePanel" },
          },
        },
      },
      responses: {
        "201": {
          description: "Panel created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Panel" },
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
          description: "Storyboard not found",
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
