/**
 * Composition Path Definitions
 *
 * OpenAPI path definitions for composition endpoints.
 */

export const compositionPaths: Record<string, any> = {
  "/composition/templates": {
    get: {
      tags: ["Composition"],
      summary: "List templates",
      description: "Returns all available page composition templates.",
      responses: {
        "200": {
          description: "List of templates",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  templates: { type: "array", items: { type: "object" } },
                  count: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/composition/templates/{id}": {
    get: {
      tags: ["Composition"],
      summary: "Get template by ID",
      description: "Returns a specific template by its ID.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Template found",
          content: {
            "application/json": {
              schema: { type: "object" },
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
          description: "Template not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/composition/page-sizes": {
    get: {
      tags: ["Composition"],
      summary: "List page sizes",
      description: "Returns all available page size presets.",
      responses: {
        "200": {
          description: "List of page sizes",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  pageSizes: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/composition/compose": {
    post: {
      tags: ["Composition"],
      summary: "Compose page",
      description: "Composes a page from multiple panels using a template.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ComposePage" },
          },
        },
      },
      responses: {
        "201": {
          description: "Page composed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ComposePageResponse" },
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
  "/composition/compose-storyboard": {
    post: {
      tags: ["Composition"],
      summary: "Compose storyboard",
      description: "Automatically composes an entire storyboard into pages.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ComposeStoryboard" },
          },
        },
      },
      responses: {
        "201": {
          description: "Storyboard composed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ComposeStoryboardResponse" },
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
  "/composition/contact-sheet": {
    post: {
      tags: ["Composition"],
      summary: "Create contact sheet",
      description: "Creates a contact sheet from a storyboard.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ContactSheet" },
          },
        },
      },
      responses: {
        "201": {
          description: "Contact sheet created",
          content: {
            "application/json": {
              schema: { type: "object" },
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
  "/composition/export": {
    post: {
      tags: ["Composition"],
      summary: "Export page",
      description: "Exports a composed page to various formats.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ExportPage" },
          },
        },
      },
      responses: {
        "201": {
          description: "Page exported",
          content: {
            "application/json": {
              schema: { type: "object" },
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
};
