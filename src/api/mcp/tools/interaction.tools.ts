/**
 * Interaction Pose MCP Tools
 *
 * Tools for managing multi-character pose presets.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getInteractionPoseService,
  type InteractionCategory,
  type ContentRating,
} from "../../../services/interaction-pose.service.js";
import type { InteractionPoseDefinition, GligenBox } from "../../../db/schema.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const interactionTools: Record<string, Tool> = {
  interaction_pose_list: {
    name: "interaction_pose_list",
    description:
      "List available interaction pose presets. Filter by category (romantic, intimate, action, conversation), " +
      "rating (safe, suggestive, explicit), character count, or search by name.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["romantic", "intimate", "action", "conversation", "custom"],
          description: "Filter by category",
        },
        rating: {
          type: "string",
          enum: ["safe", "suggestive", "explicit"],
          description: "Filter by exact rating",
        },
        maxRating: {
          type: "string",
          enum: ["safe", "suggestive", "explicit"],
          description: "Filter by maximum rating (inclusive)",
        },
        characterCount: {
          type: "number",
          description: "Filter by number of characters (default: 2)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (matches any)",
        },
        search: {
          type: "string",
          description: "Search by name",
        },
        includeBuiltin: {
          type: "boolean",
          description: "Include built-in presets (default: true)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return",
        },
      },
    },
  },

  interaction_pose_get: {
    name: "interaction_pose_get",
    description: "Get details of a specific interaction pose preset by ID or name.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Pose ID (use either id or name)",
        },
        name: {
          type: "string",
          description: "Pose name (use either id or name)",
        },
      },
    },
  },

  interaction_pose_create: {
    name: "interaction_pose_create",
    description:
      "Create a new custom interaction pose preset. Define pose positions for each character, " +
      "prompt fragments, and optionally GLIGEN bounding boxes for precise placement.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Unique identifier (lowercase, underscores)",
        },
        displayName: {
          type: "string",
          description: "Human-readable display name",
        },
        description: {
          type: "string",
          description: "Description of the pose",
        },
        category: {
          type: "string",
          enum: ["romantic", "intimate", "action", "conversation", "custom"],
          description: "Pose category",
        },
        characterCount: {
          type: "number",
          description: "Number of characters (default: 2)",
        },
        poseDefinitions: {
          type: "array",
          description: "Pose definition for each character position",
          items: {
            type: "object",
            properties: {
              position: {
                type: "string",
                enum: ["character_a", "character_b", "character_c"],
              },
              role: { type: "string" },
              poseDescription: { type: "string" },
              relativePosition: { type: "string" },
            },
            required: ["position", "role", "poseDescription"],
          },
        },
        gligenBoxes: {
          type: "array",
          description: "GLIGEN bounding boxes for each character (normalized 0-1)",
          items: {
            type: "object",
            properties: {
              position: {
                type: "string",
                enum: ["character_a", "character_b", "character_c"],
              },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
            required: ["position", "x", "y", "width", "height"],
          },
        },
        promptFragment: {
          type: "string",
          description: "Prompt text to inject for this pose",
        },
        negativeFragment: {
          type: "string",
          description: "Negative prompt text",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Searchable tags",
        },
        rating: {
          type: "string",
          enum: ["safe", "suggestive", "explicit"],
          description: "Content rating",
        },
      },
      required: ["name", "displayName", "category", "poseDefinitions", "promptFragment", "rating"],
    },
  },

  interaction_pose_update: {
    name: "interaction_pose_update",
    description: "Update an existing interaction pose preset.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Pose ID to update",
        },
        displayName: { type: "string" },
        description: { type: "string" },
        category: {
          type: "string",
          enum: ["romantic", "intimate", "action", "conversation", "custom"],
        },
        characterCount: { type: "number" },
        poseDefinitions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "string" },
              role: { type: "string" },
              poseDescription: { type: "string" },
              relativePosition: { type: "string" },
            },
          },
        },
        gligenBoxes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
          },
        },
        promptFragment: { type: "string" },
        negativeFragment: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        rating: {
          type: "string",
          enum: ["safe", "suggestive", "explicit"],
        },
      },
      required: ["id"],
    },
  },

  interaction_pose_delete: {
    name: "interaction_pose_delete",
    description: "Delete a custom interaction pose preset (cannot delete built-in presets).",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Pose ID to delete",
        },
      },
      required: ["id"],
    },
  },

  interaction_pose_apply: {
    name: "interaction_pose_apply",
    description:
      "Apply an interaction pose to a panel, mapping characters to positions. " +
      "Returns prompt fragments and GLIGEN boxes ready for generation.",
    inputSchema: {
      type: "object",
      properties: {
        poseId: {
          type: "string",
          description: "Interaction pose ID or name",
        },
        characterMapping: {
          type: "object",
          description:
            "Map character IDs to positions. E.g., { 'char-uuid-1': 'character_a', 'char-uuid-2': 'character_b' }",
          additionalProperties: {
            type: "string",
            enum: ["character_a", "character_b", "character_c"],
          },
        },
      },
      required: ["poseId", "characterMapping"],
    },
  },

  interaction_pose_popular: {
    name: "interaction_pose_popular",
    description: "Get the most frequently used interaction poses.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of poses to return (default: 10)",
        },
      },
    },
  },

  interaction_pose_list_categories: {
    name: "interaction_pose_list_categories",
    description: "List all available interaction pose categories and ratings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  interaction_pose_seed: {
    name: "interaction_pose_seed",
    description:
      "Seed the default interaction pose presets. Only adds presets that don't already exist.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleInteractionTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getInteractionPoseService();

  switch (name) {
    case "interaction_pose_list": {
      const {
        category,
        rating,
        maxRating,
        characterCount,
        tags,
        search,
        includeBuiltin,
        limit,
      } = args as {
        category?: InteractionCategory;
        rating?: ContentRating;
        maxRating?: ContentRating;
        characterCount?: number;
        tags?: string[];
        search?: string;
        includeBuiltin?: boolean;
        limit?: number;
      };

      const poses = await service.list({
        category,
        rating,
        maxRating,
        characterCount,
        tags,
        search,
        includeBuiltin,
        limit,
      });

      return {
        count: poses.length,
        poses: poses.map((p) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          category: p.category,
          characterCount: p.characterCount,
          rating: p.rating,
          tags: p.tags,
          usageCount: p.usageCount,
          isBuiltin: p.isBuiltin,
        })),
      };
    }

    case "interaction_pose_get": {
      const { id, name: poseName } = args as { id?: string; name?: string };

      if (!id && !poseName) {
        return { error: "Either id or name is required" };
      }

      const pose = id ? await service.getById(id) : await service.getByName(poseName!);

      if (!pose) {
        return { error: `Pose not found: ${id ?? poseName}` };
      }

      return pose;
    }

    case "interaction_pose_create": {
      const {
        name: poseName,
        displayName,
        description,
        category,
        characterCount,
        poseDefinitions,
        gligenBoxes,
        promptFragment,
        negativeFragment,
        tags,
        rating,
      } = args as {
        name: string;
        displayName: string;
        description?: string;
        category: InteractionCategory;
        characterCount?: number;
        poseDefinitions: InteractionPoseDefinition[];
        gligenBoxes?: GligenBox[];
        promptFragment: string;
        negativeFragment?: string;
        tags?: string[];
        rating: ContentRating;
      };

      // Check name availability
      const available = await service.isNameAvailable(poseName);
      if (!available) {
        return { error: `Pose name already exists: ${poseName}` };
      }

      const pose = await service.create({
        name: poseName,
        displayName,
        description,
        category,
        characterCount,
        poseDefinitions,
        gligenBoxes,
        promptFragment,
        negativeFragment,
        tags,
        rating,
        isBuiltin: false,
      });

      return pose;
    }

    case "interaction_pose_update": {
      const { id, ...updates } = args as { id: string } & Record<string, unknown>;

      const pose = await service.getById(id);
      if (!pose) {
        return { error: `Pose not found: ${id}` };
      }

      if (pose.isBuiltin) {
        return { error: "Cannot modify built-in presets" };
      }

      const updated = await service.update(id, updates as Parameters<typeof service.update>[1]);
      return updated;
    }

    case "interaction_pose_delete": {
      const { id } = args as { id: string };

      const pose = await service.getById(id);
      if (!pose) {
        return { error: `Pose not found: ${id}` };
      }

      if (pose.isBuiltin) {
        return { error: "Cannot delete built-in presets" };
      }

      const deleted = await service.delete(id);
      return { success: deleted, id };
    }

    case "interaction_pose_apply": {
      const { poseId, characterMapping } = args as {
        poseId: string;
        characterMapping: Record<string, "character_a" | "character_b" | "character_c">;
      };

      // Try to get by ID first, then by name
      let pose = await service.getById(poseId);
      if (!pose) {
        pose = await service.getByName(poseId);
      }

      if (!pose) {
        return { error: `Pose not found: ${poseId}` };
      }

      // Convert object to Map
      const mapping = new Map(
        Object.entries(characterMapping) as Array<
          [string, "character_a" | "character_b" | "character_c"]
        >
      );

      const result = service.applyPose(pose, mapping);

      // Record usage
      await service.recordUsage(pose.id);

      return {
        poseName: pose.name,
        promptFragment: result.promptFragment,
        negativeFragment: result.negativeFragment,
        gligenBoxes: result.gligenBoxes,
        poseDescriptions: Object.fromEntries(result.poseDescriptions),
      };
    }

    case "interaction_pose_popular": {
      const { limit = 10 } = args as { limit?: number };

      const poses = await service.getPopular(limit);

      return {
        poses: poses.map((p) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          category: p.category,
          rating: p.rating,
          usageCount: p.usageCount,
        })),
      };
    }

    case "interaction_pose_list_categories": {
      return {
        categories: service.getCategories(),
        ratings: service.getRatings(),
      };
    }

    case "interaction_pose_seed": {
      // Dynamic import to avoid loading seed data unless needed
      const { DEFAULT_INTERACTION_POSES } = await import(
        "../../../services/interaction-pose.seed.js"
      );

      const seeded = await service.seedDefaults(DEFAULT_INTERACTION_POSES);

      return {
        message: `Seeded ${seeded} new interaction pose presets`,
        totalPresets: DEFAULT_INTERACTION_POSES.length,
        newlyAdded: seeded,
      };
    }

    default:
      throw new Error(`Unknown interaction tool: ${name}`);
  }
}
