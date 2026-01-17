/**
 * Text Generation & Generated Text Path Definitions
 *
 * OpenAPI path definitions for text generation and generated text storage endpoints.
 * Combines text-generation.ts and generated-texts.ts routes.
 */

export const textPaths: Record<string, any> = {
  // ============================================================================
  // Text Generation Routes
  // ============================================================================
  "/text/status": {
    get: {
      tags: ["Text"],
      summary: "Get provider status",
      description: "Returns the current text generation provider status.",
      responses: {
        "200": {
          description: "Provider status",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProviderStatus" },
            },
          },
        },
      },
    },
  },
  "/text/providers": {
    get: {
      tags: ["Text"],
      summary: "List providers",
      description: "Returns all available text generation providers.",
      responses: {
        "200": {
          description: "List of providers",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  current: { type: "string" },
                  providers: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/text/provider": {
    post: {
      tags: ["Text"],
      summary: "Set provider",
      description: "Switches to a different text generation provider.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SetProvider" },
          },
        },
      },
      responses: {
        "200": {
          description: "Provider switched",
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
  "/text/generate": {
    post: {
      tags: ["Text"],
      summary: "Generate text",
      description: "Generates text from a prompt.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenerateText" },
          },
        },
      },
      responses: {
        "200": {
          description: "Text generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateTextResponse" },
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
  "/text/panel-description": {
    post: {
      tags: ["Text"],
      summary: "Generate panel description",
      description: "Generates a panel description for a comic/storyboard.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GeneratePanelDescription" },
          },
        },
      },
      responses: {
        "200": {
          description: "Panel description generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateTextResponse" },
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
  },
  "/text/dialogue": {
    post: {
      tags: ["Text"],
      summary: "Generate dialogue",
      description: "Generates dialogue for a character in a situation.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenerateDialogue" },
          },
        },
      },
      responses: {
        "200": {
          description: "Dialogue generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateTextResponse" },
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
  },
  "/text/suggest-captions": {
    post: {
      tags: ["Text"],
      summary: "Suggest captions",
      description: "Suggests captions based on visual description.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SuggestCaptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Captions suggested",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuggestCaptionsResponse" },
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
  },
  "/text/refine": {
    post: {
      tags: ["Text"],
      summary: "Refine text",
      description: "Refines existing text based on feedback.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RefineText" },
          },
        },
      },
      responses: {
        "200": {
          description: "Text refined",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateTextResponse" },
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
  },
  // ============================================================================
  // Generated Text Storage Routes
  // ============================================================================
  "/generated-texts": {
    get: {
      tags: ["Text"],
      summary: "List generated texts",
      description: "Returns paginated list of stored generated texts with optional filtering.",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        { name: "panelId", in: "query", schema: { type: "string" } },
        { name: "pageLayoutId", in: "query", schema: { type: "string" } },
        { name: "projectId", in: "query", schema: { type: "string" } },
        { name: "textType", in: "query", schema: { type: "string", enum: ["panel_description", "dialogue", "caption", "narration", "refinement", "raw", "custom"] } },
        { name: "status", in: "query", schema: { type: "string", enum: ["active", "archived", "superseded"] } },
      ],
      responses: {
        "200": {
          description: "Paginated generated texts",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaginatedGeneratedTexts" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Text"],
      summary: "Create generated text",
      description: "Creates a new generated text entry.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateGeneratedText" },
          },
        },
      },
      responses: {
        "201": {
          description: "Generated text created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedText" },
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
  },
  "/generated-texts/{id}": {
    get: {
      tags: ["Text"],
      summary: "Get generated text by ID",
      description: "Returns a single generated text by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Generated text found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedText" },
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
          description: "Generated text not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Text"],
      summary: "Update generated text",
      description: "Updates an existing generated text.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateGeneratedText" },
          },
        },
      },
      responses: {
        "200": {
          description: "Generated text updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedText" },
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
          description: "Generated text not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      },
    },
    delete: {
      tags: ["Text"],
      summary: "Delete generated text",
      description: "Permanently deletes a generated text.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Generated text deleted" },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Generated text not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generated-texts/{id}/regenerate": {
    post: {
      tags: ["Text"],
      summary: "Regenerate text",
      description: "Regenerates a stored text with optional new parameters.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RegenerateText" },
          },
        },
      },
      responses: {
        "200": {
          description: "Text regenerated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedText" },
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
          description: "Generated text not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generated-texts/stats": {
    get: {
      tags: ["Text"],
      summary: "Get generated text statistics",
      description: "Returns statistics about stored generated texts.",
      responses: {
        "200": {
          description: "Statistics",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedTextStats" },
            },
          },
        },
      },
    },
  },
};
