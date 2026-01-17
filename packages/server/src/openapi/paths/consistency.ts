/**
 * Consistency Path Definitions
 *
 * OpenAPI path definitions for consistency endpoints.
 */

export const consistencyPaths: Record<string, any> = {
  "/consistency/identity/extract": {
    post: {
      tags: ["Consistency"],
      summary: "Extract identity",
      description: "Extracts a visual identity from reference images or panels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ExtractIdentity" },
          },
        },
      },
      responses: {
        "200": {
          description: "Identity extracted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExtractIdentityResponse" },
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
  "/consistency/identities": {
    get: {
      tags: ["Consistency"],
      summary: "List identities",
      description: "Returns all stored visual identities.",
      responses: {
        "200": {
          description: "List of identities",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  count: { type: "number" },
                  identities: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/consistency/identity/{id}": {
    get: {
      tags: ["Consistency"],
      summary: "Get identity by ID",
      description: "Returns details for a specific identity.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Identity found",
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
          description: "Identity not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Consistency"],
      summary: "Delete identity",
      description: "Deletes a visual identity.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Identity deleted",
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
          description: "Identity not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/consistency/identity/{id}/apply": {
    post: {
      tags: ["Consistency"],
      summary: "Apply identity to panel",
      description: "Applies a visual identity to a panel for generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApplyIdentity" },
          },
        },
      },
      responses: {
        "200": {
          description: "Identity applied",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChainOperationResponse" },
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
          description: "Identity or panel not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/consistency/chain": {
    post: {
      tags: ["Consistency"],
      summary: "Chain from previous panel",
      description: "Generates a panel chained from a previous panel for visual continuity.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Chain" },
          },
        },
      },
      responses: {
        "200": {
          description: "Panel chained",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChainOperationResponse" },
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
  "/consistency/chain/sequence": {
    post: {
      tags: ["Consistency"],
      summary: "Chain sequence of panels",
      description: "Generates a sequence of panels with visual continuity.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ChainSequence" },
          },
        },
      },
      responses: {
        "200": {
          description: "Sequence chained",
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
