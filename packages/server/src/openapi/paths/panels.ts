/**
 * Panel Path Definitions
 *
 * OpenAPI path definitions for panel endpoints.
 */

export const panelPaths: Record<string, any> = {
  "/panels/{id}": {
    get: {
      tags: ["Panels"],
      summary: "Get panel by ID",
      description: "Returns a single panel by its unique identifier.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Panel ID (UUID or cuid2)",
        },
      ],
      responses: {
        "200": {
          description: "Panel found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Panel" },
            },
          },
        },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    put: {
      tags: ["Panels"],
      summary: "Update panel",
      description: "Updates an existing panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePanel" } } } },
      responses: {
        "200": { description: "Panel updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    delete: {
      tags: ["Panels"],
      summary: "Delete panel",
      description: "Permanently deletes a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Panel deleted" },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/full": {
    get: {
      tags: ["Panels"],
      summary: "Get panel with generations",
      description: "Returns a panel with all its generations.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Panel with generations", content: { "application/json": { schema: { $ref: "#/components/schemas/PanelWithGenerations" } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/describe": {
    post: {
      tags: ["Panels"],
      summary: "Update panel description",
      description: "Updates the description and direction of a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePanel" } } } },
      responses: {
        "200": { description: "Panel updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/characters": {
    post: {
      tags: ["Panels"],
      summary: "Add character to panel",
      description: "Adds a character to a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AddCharacter" } } } },
      responses: {
        "200": { description: "Character added", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    put: {
      tags: ["Panels"],
      summary: "Set characters for panel",
      description: "Replaces all characters in a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SetCharacters" } } } },
      responses: {
        "200": { description: "Characters set", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/characters/{characterId}": {
    delete: {
      tags: ["Panels"],
      summary: "Remove character from panel",
      description: "Removes a character from a panel.",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "characterId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "Character removed", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel or character not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/select": {
    post: {
      tags: ["Panels"],
      summary: "Select output for panel",
      description: "Selects a generation output for a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SelectOutput" } } } },
      responses: {
        "200": { description: "Output selected", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel or output not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    delete: {
      tags: ["Panels"],
      summary: "Clear selection",
      description: "Clears the selected output for a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Selection cleared", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/generations": {
    get: {
      tags: ["Panels"],
      summary: "Get generations for panel",
      description: "Returns all generations for a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "List of generations", content: { "application/json": { schema: { $ref: "#/components/schemas/GenerationsListResponse" } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/reorder": {
    post: {
      tags: ["Panels"],
      summary: "Reorder panel",
      description: "Changes the position of a panel in its storyboard.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReorderPanel" } } } },
      responses: {
        "200": { description: "Panel reordered", content: { "application/json": { schema: { $ref: "#/components/schemas/Panel" } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/generate": {
    post: {
      tags: ["Panels"],
      summary: "Generate image for panel",
      description: "Generates an image for a panel using AI.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImage" } } } },
      responses: {
        "201": { description: "Image generated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, generatedImage: { $ref: "#/components/schemas/GeneratedImage" }, seed: { type: "number" }, localPath: { type: "string" } } } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "500": { description: "Generation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/{id}/generate/variants": {
    post: {
      tags: ["Panels"],
      summary: "Generate variants for panel",
      description: "Generates multiple variant images for a panel.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImage" } } } },
      responses: {
        "201": { description: "Variants generated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, total: { type: "number" }, successful: { type: "number" }, failed: { type: "number" }, generatedImages: { type: "array", items: { type: "object" } } } } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "404": { description: "Panel not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/panels/config/sizes": {
    get: {
      tags: ["Panels"],
      summary: "List size presets",
      description: "Returns available size presets for panel generation.",
      responses: {
        "200": { description: "List of size presets", content: { "application/json": { schema: { type: "object", properties: { presets: { type: "array", items: { type: "object" } } } } } } } },
      },
    },
  },
  "/panels/config/quality": {
    get: {
      tags: ["Panels"],
      summary: "List quality presets",
      description: "Returns available quality presets for panel generation.",
      responses: {
        "200": { description: "List of quality presets", content: { "application/json": { schema: { type: "object", properties: { presets: { type: "array", items: { type: "object" } } } } } } } },
      },
    },
  },
  "/panels/config/recommend-size": {
    post: {
      tags: ["Panels"],
      summary: "Recommend size for slot",
      description: "Gets recommended dimensions for a composition slot.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RecommendSize" } } } },
      responses: {
        "200": { description: "Recommended dimensions", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/panels/config/template-sizes": {
    post: {
      tags: ["Panels"],
      summary: "Get template sizes",
      description: "Gets all slot sizes for a template.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateSizes" } } } },
      responses: {
        "200": { description: "Template sizes", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
};
