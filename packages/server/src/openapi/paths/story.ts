/**
 * Story Scaffold Path Definitions
 *
 * OpenAPI path definitions for story scaffold endpoints.
 */

export const storyPaths: Record<string, any> = {
  "/story/scaffold": {
    post: {
      tags: ["Story"],
      summary: "Scaffold story",
      description: "Creates a complete story structure from structured input (acts, scenes, panels).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ScaffoldStory" },
          },
        },
      },
      responses: {
        "201": {
          description: "Story scaffolded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScaffoldResult" },
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
  "/story/from-outline": {
    post: {
      tags: ["Story"],
      summary: "Create story from outline",
      description: "Parses and scaffolds a story from a text outline (markdown format).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FromOutline" },
          },
        },
      },
      responses: {
        "201": {
          description: "Story created from outline",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScaffoldResult" },
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
  "/story/parse-outline": {
    post: {
      tags: ["Story"],
      summary: "Parse outline",
      description: "Parses a text outline without creating anything (for preview).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ParseOutline" },
          },
        },
      },
      responses: {
        "200": {
          description: "Outline parsed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ParseOutlineResponse" },
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
};
