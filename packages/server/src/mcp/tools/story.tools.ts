/**
 * Story Scaffold MCP Tools
 *
 * Tools for creating complete story structures from high-level outlines.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getStoryScaffoldService, type ScaffoldAct } from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const storyTools: Record<string, Tool> = {
  story_scaffold: {
    name: "story_scaffold",
    description:
      "Create an entire storyboard hierarchy (acts > scenes > panels) in one call from a structured JSON definition. " +
      "Call when you already have a fully specified act/scene/panel tree and want to materialize it into the project database. " +
      "Unlike story_from_outline (which accepts markdown text) or story_parse_outline (dry-run parse only), this writes directly to the DB. " +
      "Returns { storyboards: [{ id, sceneId, panels: [{ id, position }] }], characterMapping: {} }. " +
      "Response ~1-3 KB depending on panel count. " +
      "Characters are matched by name to existing project characters; unmatched names are silently skipped.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to scaffold into",
        },
        title: {
          type: "string",
          description: "Story title (used for storyboard naming)",
        },
        description: {
          type: "string",
          description: "Overall story description",
        },
        characterNames: {
          type: "array",
          items: { type: "string" },
          description: "Character names referenced in the story (for validation)",
        },
        acts: {
          type: "array",
          description: "Story structure organized by acts",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Act name (e.g., 'Act 1: Setup')",
              },
              description: {
                type: "string",
                description: "Act description",
              },
              scenes: {
                type: "array",
                description: "Scenes in this act",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Scene name",
                    },
                    description: {
                      type: "string",
                      description: "Scene description",
                    },
                    panels: {
                      type: "array",
                      description: "Panels in this scene",
                      items: {
                        type: "object",
                        properties: {
                          description: {
                            type: "string",
                            description: "Panel description/prompt",
                          },
                          characterNames: {
                            type: "array",
                            items: { type: "string" },
                            description: "Characters appearing in this panel (by name)",
                          },
                          direction: {
                            type: "object",
                            description: "Direction hints for generation",
                            properties: {
                              cameraAngle: { type: "string" },
                              lighting: { type: "string" },
                              mood: { type: "string" },
                              shotType: { type: "string" },
                            },
                          },
                        },
                        required: ["description"],
                      },
                    },
                  },
                  required: ["name", "panels"],
                },
              },
            },
            required: ["name", "scenes"],
          },
        },
      },
      required: ["projectId", "title", "acts"],
    },
  },

  story_from_outline: {
    name: "story_from_outline",
    description:
      "Parse a markdown outline AND create all storyboards/panels in one step. " +
      "Call when the user provides a plain-text story outline and you want to immediately scaffold it into the project (no dry-run). " +
      "Input format: '# Title\\n## Act\\n### Scene\\n- Panel: [CHAR] description'. " +
      "Unlike story_scaffold (requires structured JSON) or story_parse_outline (parse-only, no DB writes), this is the fastest path from raw text to a populated storyboard. " +
      "Returns { storyboards: [...], characterMapping, summary: { actCount, sceneCount, panelCount } }. Response ~1-3 KB.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to scaffold into",
        },
        outline: {
          type: "string",
          description: "Markdown-style story outline text",
        },
      },
      required: ["projectId", "outline"],
    },
  },

  story_parse_outline: {
    name: "story_parse_outline",
    description:
      "Dry-run parse of a markdown outline into a structured scaffold definition without writing anything to the database. " +
      "Call before story_from_outline to let the user preview and adjust the parsed structure. " +
      "Returns { parsed: true, title, acts: [...], characterNames: [...], summary: { actCount, sceneCount, panelCount, characterCount } }. " +
      "Response ~1-2 KB. Pure preprocessing -- no side effects, no storyboard creation.",
    inputSchema: {
      type: "object",
      properties: {
        outline: {
          type: "string",
          description: "Markdown-style story outline text",
        },
      },
      required: ["outline"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleStoryTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getStoryScaffoldService();

  switch (name) {
    case "story_scaffold": {
      const { projectId, title, description, characterNames, acts } = args as {
        projectId: string;
        title: string;
        description?: string;
        characterNames?: string[];
        acts?: ScaffoldAct[];
      };

      // Validate required parameters
      if (!projectId) {
        return { success: false, error: "projectId is required" };
      }
      if (!title) {
        return { success: false, error: "title is required" };
      }

      const result = await service.scaffold({
        projectId,
        title,
        description,
        characterNames,
        acts: acts || [], // Default to empty array if not provided
      });

      return result;
    }

    case "story_from_outline": {
      const { projectId, outline } = args as {
        projectId: string;
        outline: string;
      };

      // Validate required parameters
      if (!projectId) {
        return { success: false, error: "projectId is required" };
      }
      if (!outline) {
        return { success: false, error: "outline is required" };
      }

      const result = await service.fromOutline(projectId, outline);

      return result;
    }

    case "story_parse_outline": {
      const { outline } = args as { outline: string };

      // Validate required parameters
      if (!outline) {
        return { success: false, error: "outline is required" };
      }

      const parsed = service.parseOutline(outline);

      return {
        parsed: true,
        ...parsed,
        summary: {
          actCount: parsed.acts.length,
          sceneCount: parsed.acts.reduce((sum, act) => sum + act.scenes.length, 0),
          panelCount: parsed.acts.reduce(
            (sum, act) => sum + act.scenes.reduce((s, scene) => s + scene.panels.length, 0),
            0
          ),
          characterCount: parsed.characterNames.length,
        },
      };
    }

    default:
      throw new Error(`Unknown story tool: ${name}`);
  }
}
