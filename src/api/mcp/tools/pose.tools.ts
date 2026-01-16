/**
 * Pose & Expression Library MCP Tools
 *
 * Tools for extracting, storing, and applying poses and expressions.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getPoseLibraryService,
  POSE_CATEGORIES,
  EXPRESSION_NAMES,
  type PoseCategory,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const poseTools: Record<string, Tool> = {
  // --------------------------------------------------------------------------
  // POSE TOOLS
  // --------------------------------------------------------------------------

  pose_extract: {
    name: "pose_extract",
    description:
      "Extract OpenPose skeleton from an existing generated image. Returns the skeleton image path for preview or saving to library.",
    inputSchema: {
      type: "object",
      properties: {
        sourceGenerationId: {
          type: "string",
          description: "ID of the generated image to extract pose from",
        },
        outputDir: {
          type: "string",
          description: "Directory to save extracted skeleton image",
        },
        detectHands: {
          type: "boolean",
          description: "Include hand detection (default: true)",
        },
        detectFace: {
          type: "boolean",
          description: "Include face detection (default: true)",
        },
      },
      required: ["sourceGenerationId", "outputDir"],
    },
  },

  pose_save: {
    name: "pose_save",
    description: "Save an extracted pose to the project's pose library for reuse",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to save pose to",
        },
        name: {
          type: "string",
          description: "Name for this pose (e.g., 'Standing Confident', 'Action Leap')",
        },
        description: {
          type: "string",
          description: "Optional description of the pose",
        },
        category: {
          type: "string",
          enum: POSE_CATEGORIES as unknown as string[],
          description: "Pose category for organization",
        },
        skeletonPath: {
          type: "string",
          description: "Path to the skeleton image (from pose_extract)",
        },
        sourceGenerationId: {
          type: "string",
          description: "Optional: ID of generation this was extracted from",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for searching (e.g., 'dynamic', 'sitting', 'combat')",
        },
      },
      required: ["projectId", "name", "category", "skeletonPath"],
    },
  },

  pose_extract_and_save: {
    name: "pose_extract_and_save",
    description: "Extract pose from a generated image and save it to the library in one step",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to save pose to",
        },
        sourceGenerationId: {
          type: "string",
          description: "ID of the generated image to extract pose from",
        },
        name: {
          type: "string",
          description: "Name for this pose",
        },
        description: {
          type: "string",
          description: "Optional description",
        },
        category: {
          type: "string",
          enum: POSE_CATEGORIES as unknown as string[],
          description: "Pose category",
        },
        outputDir: {
          type: "string",
          description: "Directory to save skeleton image",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for searching",
        },
        detectHands: {
          type: "boolean",
          description: "Include hand detection (default: true)",
        },
        detectFace: {
          type: "boolean",
          description: "Include face detection (default: true)",
        },
      },
      required: ["projectId", "sourceGenerationId", "name", "category", "outputDir"],
    },
  },

  pose_list: {
    name: "pose_list",
    description: "List poses in a project's library, optionally filtered by category or tags",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to list poses from",
        },
        category: {
          type: "string",
          enum: POSE_CATEGORIES as unknown as string[],
          description: "Filter by category",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (matches any)",
        },
        limit: {
          type: "number",
          description: "Maximum poses to return (default: 50)",
        },
      },
      required: ["projectId"],
    },
  },

  pose_get: {
    name: "pose_get",
    description: "Get details of a specific pose from the library",
    inputSchema: {
      type: "object",
      properties: {
        poseId: {
          type: "string",
          description: "Pose ID",
        },
      },
      required: ["poseId"],
    },
  },

  pose_update: {
    name: "pose_update",
    description: "Update pose metadata",
    inputSchema: {
      type: "object",
      properties: {
        poseId: {
          type: "string",
          description: "Pose ID to update",
        },
        name: {
          type: "string",
          description: "New name",
        },
        description: {
          type: "string",
          description: "New description",
        },
        category: {
          type: "string",
          enum: POSE_CATEGORIES as unknown as string[],
          description: "New category",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "New tags (replaces existing)",
        },
      },
      required: ["poseId"],
    },
  },

  pose_delete: {
    name: "pose_delete",
    description: "Delete a pose from the library",
    inputSchema: {
      type: "object",
      properties: {
        poseId: {
          type: "string",
          description: "Pose ID to delete",
        },
      },
      required: ["poseId"],
    },
  },

  pose_list_categories: {
    name: "pose_list_categories",
    description: "List available pose categories",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // --------------------------------------------------------------------------
  // EXPRESSION TOOLS
  // --------------------------------------------------------------------------

  expression_save: {
    name: "expression_save",
    description: "Save an expression to a character's expression library",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID to save expression for",
        },
        name: {
          type: "string",
          description: "Expression name (e.g., 'happy', 'angry', 'ahegao')",
        },
        description: {
          type: "string",
          description: "Optional description",
        },
        referencePath: {
          type: "string",
          description: "Path to reference image showing this expression",
        },
        sourceGenerationId: {
          type: "string",
          description: "Optional: ID of generation this was captured from",
        },
        promptFragment: {
          type: "string",
          description: "Prompt fragment that produces this expression (e.g., 'wide smile, happy, bright eyes')",
        },
        intensity: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Expression intensity 1-10 (default: 5)",
        },
      },
      required: ["characterId", "name", "referencePath", "promptFragment"],
    },
  },

  expression_list: {
    name: "expression_list",
    description: "List expressions for a character",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        limit: {
          type: "number",
          description: "Maximum expressions to return",
        },
      },
      required: ["characterId"],
    },
  },

  expression_get: {
    name: "expression_get",
    description: "Get details of a specific expression",
    inputSchema: {
      type: "object",
      properties: {
        expressionId: {
          type: "string",
          description: "Expression ID",
        },
      },
      required: ["expressionId"],
    },
  },

  expression_get_by_name: {
    name: "expression_get_by_name",
    description: "Get expression by name for a character",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        name: {
          type: "string",
          description: "Expression name (e.g., 'happy', 'angry')",
        },
      },
      required: ["characterId", "name"],
    },
  },

  expression_update: {
    name: "expression_update",
    description: "Update expression metadata",
    inputSchema: {
      type: "object",
      properties: {
        expressionId: {
          type: "string",
          description: "Expression ID to update",
        },
        name: {
          type: "string",
          description: "New name",
        },
        description: {
          type: "string",
          description: "New description",
        },
        promptFragment: {
          type: "string",
          description: "New prompt fragment",
        },
        intensity: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "New intensity",
        },
      },
      required: ["expressionId"],
    },
  },

  expression_delete: {
    name: "expression_delete",
    description: "Delete an expression from the library",
    inputSchema: {
      type: "object",
      properties: {
        expressionId: {
          type: "string",
          description: "Expression ID to delete",
        },
      },
      required: ["expressionId"],
    },
  },

  expression_list_common: {
    name: "expression_list_common",
    description: "List common expression names for reference",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ============================================================================
// Tool Handler
// ============================================================================

export async function handlePoseTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const service = getPoseLibraryService();

  try {
    switch (toolName) {
      // POSE HANDLERS
      case "pose_extract": {
        const result = await service.extractPose({
          sourceGenerationId: args.sourceGenerationId as string,
          outputDir: args.outputDir as string,
          detectHands: (args.detectHands as boolean) ?? true,
          detectFace: (args.detectFace as boolean) ?? true,
        });
        return jsonResponse({
          success: true,
          skeletonPath: result.skeletonPath,
          message: "Pose extracted successfully. Use pose_save to add to library.",
        });
      }

      case "pose_save": {
        const pose = await service.savePose({
          projectId: args.projectId as string,
          name: args.name as string,
          description: args.description as string | undefined,
          category: args.category as PoseCategory,
          skeletonPath: args.skeletonPath as string,
          sourceGenerationId: args.sourceGenerationId as string | undefined,
          tags: args.tags as string[] | undefined,
        });
        return jsonResponse({
          success: true,
          pose: { id: pose.id, name: pose.name, category: pose.category },
          message: `Pose "${pose.name}" saved to library`,
        });
      }

      case "pose_extract_and_save": {
        const pose = await service.extractAndSavePose({
          projectId: args.projectId as string,
          name: args.name as string,
          description: args.description as string | undefined,
          category: args.category as PoseCategory,
          sourceGenerationId: args.sourceGenerationId as string,
          outputDir: args.outputDir as string,
          tags: args.tags as string[] | undefined,
          detectHands: (args.detectHands as boolean) ?? true,
          detectFace: (args.detectFace as boolean) ?? true,
        });
        return jsonResponse({
          success: true,
          pose: { id: pose.id, name: pose.name, category: pose.category, skeletonPath: pose.skeletonPath },
          message: `Pose "${pose.name}" extracted and saved`,
        });
      }

      case "pose_list": {
        const poses = await service.listPoses(args.projectId as string, {
          category: args.category as PoseCategory | undefined,
          tags: args.tags as string[] | undefined,
          limit: (args.limit as number) ?? 50,
        });
        return jsonResponse({
          success: true,
          count: poses.length,
          poses: poses.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            tags: p.tags,
            usageCount: p.usageCount,
            skeletonPath: p.skeletonPath,
          })),
        });
      }

      case "pose_get": {
        const pose = await service.getPoseById(args.poseId as string);
        if (!pose) {
          return jsonResponse({ success: false, error: "Pose not found" });
        }
        return jsonResponse({ success: true, pose });
      }

      case "pose_update": {
        const pose = await service.updatePose(args.poseId as string, {
          name: args.name as string | undefined,
          description: args.description as string | undefined,
          category: args.category as PoseCategory | undefined,
          tags: args.tags as string[] | undefined,
        });
        return jsonResponse({
          success: true,
          pose: { id: pose.id, name: pose.name, category: pose.category },
          message: "Pose updated",
        });
      }

      case "pose_delete": {
        await service.deletePose(args.poseId as string);
        return jsonResponse({ success: true, message: "Pose deleted" });
      }

      case "pose_list_categories": {
        return jsonResponse({
          success: true,
          categories: POSE_CATEGORIES.map((c) => ({
            name: c,
            description: getCategoryDescription(c),
          })),
        });
      }

      // EXPRESSION HANDLERS
      case "expression_save": {
        const expression = await service.saveExpression({
          characterId: args.characterId as string,
          name: args.name as string,
          description: args.description as string | undefined,
          referencePath: args.referencePath as string,
          sourceGenerationId: args.sourceGenerationId as string | undefined,
          promptFragment: args.promptFragment as string,
          intensity: args.intensity as number | undefined,
        });
        return jsonResponse({
          success: true,
          expression: { id: expression.id, name: expression.name, characterId: expression.characterId },
          message: `Expression "${expression.name}" saved`,
        });
      }

      case "expression_list": {
        const expressions = await service.listExpressions(args.characterId as string, {
          limit: args.limit as number | undefined,
        });
        return jsonResponse({
          success: true,
          count: expressions.length,
          expressions: expressions.map((e) => ({
            id: e.id,
            name: e.name,
            promptFragment: e.promptFragment,
            intensity: e.intensity,
            usageCount: e.usageCount,
          })),
        });
      }

      case "expression_get": {
        const expression = await service.getExpressionById(args.expressionId as string);
        if (!expression) {
          return jsonResponse({ success: false, error: "Expression not found" });
        }
        return jsonResponse({ success: true, expression });
      }

      case "expression_get_by_name": {
        const expression = await service.getExpressionByName(
          args.characterId as string,
          args.name as string
        );
        if (!expression) {
          return jsonResponse({ success: false, error: "Expression not found for this character" });
        }
        return jsonResponse({ success: true, expression });
      }

      case "expression_update": {
        const expression = await service.updateExpression(args.expressionId as string, {
          name: args.name as string | undefined,
          description: args.description as string | undefined,
          promptFragment: args.promptFragment as string | undefined,
          intensity: args.intensity as number | undefined,
        });
        return jsonResponse({
          success: true,
          expression: { id: expression.id, name: expression.name },
          message: "Expression updated",
        });
      }

      case "expression_delete": {
        await service.deleteExpression(args.expressionId as string);
        return jsonResponse({ success: true, message: "Expression deleted" });
      }

      case "expression_list_common": {
        return jsonResponse({
          success: true,
          expressions: EXPRESSION_NAMES.map((name) => ({
            name,
            suggestedPrompt: getExpressionPromptSuggestion(name),
          })),
        });
      }

      default:
        return jsonResponse({ success: false, error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function jsonResponse(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    standing: "Standing poses - upright, walking, leaning",
    sitting: "Sitting poses - chair, floor, lounging",
    action: "Dynamic action poses - jumping, fighting, running",
    lying: "Lying poses - prone, supine, side-lying",
    kneeling: "Kneeling poses - one knee, both knees, crouching",
    custom: "Custom/uncategorized poses",
  };
  return descriptions[category] ?? "Unknown category";
}

function getExpressionPromptSuggestion(name: string): string {
  const suggestions: Record<string, string> = {
    neutral: "neutral expression, calm face",
    happy: "happy, smiling, bright expression",
    sad: "sad expression, downcast eyes, frown",
    angry: "angry expression, furrowed brow, scowl",
    surprised: "surprised expression, wide eyes, open mouth",
    disgusted: "disgusted expression, wrinkled nose",
    fearful: "fearful expression, wide eyes, trembling",
    smirk: "smirk, confident half-smile",
    ahegao: "ahegao, rolled back eyes, tongue out, drooling",
    blushing: "blushing, embarrassed, red cheeks",
    crying: "crying, tears, sad",
    laughing: "laughing, open mouth smile, joyful",
    thinking: "thinking expression, looking up, contemplative",
    sleeping: "sleeping, closed eyes, peaceful",
    wink: "winking, one eye closed, playful",
    custom: "",
  };
  return suggestions[name] ?? "";
}
