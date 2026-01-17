/**
 * Narrative Path Definitions
 *
 * OpenAPI path definitions for narrative engine endpoints (premises, stories, beats).
 */

export const narrativePaths: Record<string, any> = {
  "/narrative/projects/{projectId}/premises": {
    get: {
      tags: ["Narrative"],
      summary: "List premises",
      description: "Returns paginated list of premises for a project.",
      parameters: [
        { name: "projectId", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        { name: "status", in: "query", schema: { type: "string", enum: ["draft", "active", "archived"] } },
      ],
      responses: {
        "200": { description: "Paginated premises", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedPremises" } } } } },
        "400": { description: "Invalid project ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/premises": {
    post: {
      tags: ["Narrative"],
      summary: "Create premise",
      description: "Creates a new premise.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePremise" } } } },
      responses: {
        "201": { description: "Premise created", content: { "application/json": { schema: { $ref: "#/components/schemas/Premise" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/premises/{id}": {
    get: {
      tags: ["Narrative"],
      summary: "Get premise by ID",
      description: "Returns a single premise by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Premise found", content: { "application/json": { schema: { $ref: "#/components/schemas/Premise" } } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Premise not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    patch: {
      tags: ["Narrative"],
      summary: "Update premise",
      description: "Updates an existing premise.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePremise" } } } },
      responses: {
        "200": { description: "Premise updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Premise" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Premise not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    delete: {
      tags: ["Narrative"],
      summary: "Delete premise",
      description: "Permanently deletes a premise.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Premise deleted" },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Premise not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/premises/{id}/full": {
    get: {
      tags: ["Narrative"],
      summary: "Get premise with stories",
      description: "Returns a premise with all its stories.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Premise with stories", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Premise not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/premises/{premiseId}/stories": {
    post: {
      tags: ["Narrative"],
      summary: "Create story",
      description: "Creates a new story from a premise.",
      parameters: [{ name: "premiseId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateStory" } } } },
      responses: {
        "201": { description: "Story created", content: { "application/json": { schema: { $ref: "#/components/schemas/Story" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    get: {
      tags: ["Narrative"],
      summary: "List stories for premise",
      description: "Returns paginated list of stories for a premise.",
      parameters: [
        { name: "premiseId", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        { name: "status", in: "query", schema: { type: "string", enum: ["draft", "beats_generated", "panels_created", "complete"] } },
      ],
      responses: {
        "200": { description: "Paginated stories", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedStories" } } } } },
        "400": { description: "Invalid premise ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/stories/{id}": {
    get: {
      tags: ["Narrative"],
      summary: "Get story by ID",
      description: "Returns a single story by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Story found", content: { "application/json": { schema: { $ref: "#/components/schemas/Story" } } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Story not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    patch: {
      tags: ["Narrative"],
      summary: "Update story",
      description: "Updates an existing story.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateStory" } } } },
      responses: {
        "200": { description: "Story updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Story" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Story not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    delete: {
      tags: ["Narrative"],
      summary: "Delete story",
      description: "Permanently deletes a story.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Story deleted" },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Story not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/stories/{id}/full": {
    get: {
      tags: ["Narrative"],
      summary: "Get story with beats",
      description: "Returns a story with all its beats.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Story with beats", content: { "application/json": { schema: { $ref: "#/components/schemas/StoryWithBeats" } } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Story not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/stories/{storyId}/beats": {
    get: {
      tags: ["Narrative"],
      summary: "List beats for story",
      description: "Returns all beats for a story.",
      parameters: [{ name: "storyId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "List of beats", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedBeats" } } } } },
        "400": { description: "Invalid story ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    post: {
      tags: ["Narrative"],
      summary: "Create beat",
      description: "Creates a new beat for a story.",
      parameters: [{ name: "storyId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBeat" } } } },
      responses: {
        "201": { description: "Beat created", content: { "application/json": { schema: { $ref: "#/components/schemas/Beat" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/beats/{id}": {
    get: {
      tags: ["Narrative"],
      summary: "Get beat by ID",
      description: "Returns a single beat by its unique identifier.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Beat found", content: { "application/json": { schema: { $ref: "#/components/schemas/Beat" } } } } },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Beat not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    patch: {
      tags: ["Narrative"],
      summary: "Update beat",
      description: "Updates an existing beat.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateBeat" } } } },
      responses: {
        "200": { description: "Beat updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Beat" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Beat not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    delete: {
      tags: ["Narrative"],
      summary: "Delete beat",
      description: "Permanently deletes a beat.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Beat deleted" },
        "400": { description: "Invalid ID format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
        "404": { description: "Beat not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/stories/{storyId}/generate": {
    post: {
      tags: ["Narrative"],
      summary: "Generate story",
      description: "Generates a complete story structure using LLM.",
      parameters: [{ name: "storyId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
      responses: {
        "200": { description: "Story generated", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/stories/{storyId}/beats/generate": {
    post: {
      tags: ["Narrative"],
      summary: "Generate beats",
      description: "Generates beats for a story using LLM.",
      parameters: [{ name: "storyId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateBeats" } } } },
      responses: {
        "200": { description: "Beats generated", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
  "/narrative/beats/{beatId}/convert": {
    post: {
      tags: ["Narrative"],
      summary: "Convert beat to panel",
      description: "Converts a beat to a panel in a storyboard.",
      parameters: [{ name: "beatId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ConvertBeatToPanel" } } } },
      responses: {
        "200": { description: "Beat converted", content: { "application/json": { schema: { type: "object" } } } } },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
  },
};
