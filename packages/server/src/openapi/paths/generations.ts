/**
 * Generation Path Definitions
 *
 * OpenAPI path definitions for generation endpoints.
 */

export const generationPaths: Record<string, any> = {
  "/generations": {
    post: {
      tags: ["Generations"],
      summary: "Create generation",
      description: "Records a new generated image (usually called internally after ComfyUI generation).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateGeneration" },
          },
        },
      },
      responses: {
        "201": {
          description: "Generation created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
  "/generations/{id}": {
    get: {
      tags: ["Generations"],
      summary: "Get generation by ID",
      description: "Returns a single generation by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Generation found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
          description: "Generation not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Generations"],
      summary: "Delete generation",
      description: "Permanently deletes a generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Generation deleted" },
        "400": {
          description: "Invalid ID format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "404": {
          description: "Generation not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/panel/{panelId}": {
    get: {
      tags: ["Generations"],
      summary: "Get generations by panel",
      description: "Returns all generations for a specific panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "List of generations",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerationsListResponse" },
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
    delete: {
      tags: ["Generations"],
      summary: "Delete all generations for panel",
      description: "Deletes all generations for a specific panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Generations deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  deleted: { type: "number" },
                },
              },
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
  },
  "/generations/panel/{panelId}/selected": {
    get: {
      tags: ["Generations"],
      summary: "Get selected generation for panel",
      description: "Returns the currently selected generation for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Selected generation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
        "404": {
          description: "No selected generation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/panel/{panelId}/favorites": {
    get: {
      tags: ["Generations"],
      summary: "Get favorite generations for panel",
      description: "Returns all favorited generations for a panel.",
      parameters: [{ name: "panelId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "List of favorite generations",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerationsListResponse" },
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
  },
  "/generations/seed/{seed}": {
    get: {
      tags: ["Generations"],
      summary: "Find generations by seed",
      description: "Finds all generations with a specific seed value.",
      parameters: [{ name: "seed", in: "path", required: true, schema: { type: "integer" } }],
      responses: {
        "200": {
          description: "List of generations",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerationsListResponse" },
            },
          },
        },
        "400": {
          description: "Invalid seed format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/{id}/favorite": {
    post: {
      tags: ["Generations"],
      summary: "Toggle favorite",
      description: "Toggles the favorite status of a generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Favorite toggled",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
          description: "Generation not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/{id}/rating": {
    post: {
      tags: ["Generations"],
      summary: "Set rating",
      description: "Sets a rating (1-5) for a generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SetRating" },
          },
        },
      },
      responses: {
        "200": {
          description: "Rating set",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
          description: "Generation not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/{id}/cloud-url": {
    patch: {
      tags: ["Generations"],
      summary: "Update cloud URL",
      description: "Updates the cloud storage URL for a generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SetCloudUrl" },
          },
        },
      },
      responses: {
        "200": {
          description: "Cloud URL updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
          description: "Generation not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/generations/{id}/thumbnail": {
    patch: {
      tags: ["Generations"],
      summary: "Update thumbnail",
      description: "Updates the thumbnail path for a generation.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SetThumbnail" },
          },
        },
      },
      responses: {
        "200": {
          description: "Thumbnail updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GeneratedImage" },
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
          description: "Generation not found",
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
