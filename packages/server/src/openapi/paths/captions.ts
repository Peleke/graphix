/**
 * Caption Path Definitions
 *
 * OpenAPI path definitions for caption endpoints.
 */

export const captionPaths: Record<string, any> = {
  "/panels/{panelId}/captions": {
    get: {
      tags: ["Captions"],
      summary: "List captions for panel",
      description: "Returns all captions for a specific panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "List of captions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CaptionsListResponse" },
            },
          },
        },
        "400": {
          description: "Invalid panel ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Captions"],
      summary: "Add caption to panel",
      description: "Creates a new caption for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateCaption" },
          },
        },
      },
      responses: {
        "201": {
          description: "Caption created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PanelCaption" },
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
  "/panels/{panelId}/captions/reorder": {
    post: {
      tags: ["Captions"],
      summary: "Reorder captions",
      description: "Reorders captions within a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ReorderCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions reordered",
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
  "/captions/{id}": {
    get: {
      tags: ["Captions"],
      summary: "Get caption by ID",
      description: "Returns a single caption by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Caption found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PanelCaption" },
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
          description: "Caption not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Captions"],
      summary: "Update caption",
      description: "Updates an existing caption.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateCaption" },
          },
        },
      },
      responses: {
        "200": {
          description: "Caption updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PanelCaption" },
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
        "404": {
          description: "Caption not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Captions"],
      summary: "Delete caption",
      description: "Permanently deletes a caption.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Caption deleted" },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Caption not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/panels/{panelId}/captions/generate": {
    post: {
      tags: ["Captions"],
      summary: "Generate captions from beats",
      description: "Generates captions for a panel from story beats.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenerateCaptionsOptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CaptionsListResponse" },
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
        "404": {
          description: "Panel not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/captions/preview": {
    post: {
      tags: ["Captions"],
      summary: "Preview captions",
      description: "Previews captions rendered on an image.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PreviewCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Preview generated",
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
  "/captions/render": {
    post: {
      tags: ["Captions"],
      summary: "Render captions",
      description: "Renders captions onto an image.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RenderWithCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions rendered",
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
  "/captions/render/direct": {
    post: {
      tags: ["Captions"],
      summary: "Render captions directly",
      description: "Renders captions directly onto an image without saving to database.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RenderCaptionsDirect" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions rendered",
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
