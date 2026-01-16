/**
 * Curation MCP Tools
 *
 * Tools for comparing and selecting generated image variants.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getGeneratedImageService } from "../../../services/index.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const curationTools: Record<string, Tool> = {
  generation_compare: {
    name: "generation_compare",
    description:
      "Get generations for side-by-side comparison with metadata summary. " +
      "Returns images with stats like average rating, favorite count, etc.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to get generations for",
        },
        imageIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional specific image IDs to compare. If omitted, returns all.",
        },
      },
      required: ["panelId"],
    },
  },

  generation_batch_rate: {
    name: "generation_batch_rate",
    description: "Rate multiple generations at once. Efficient for bulk curation.",
    inputSchema: {
      type: "object",
      properties: {
        ratings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              imageId: { type: "string", description: "Generation ID" },
              rating: {
                type: "number",
                minimum: 1,
                maximum: 5,
                description: "Rating 1-5 (or null to clear)",
              },
            },
            required: ["imageId", "rating"],
          },
          description: "Array of {imageId, rating} pairs",
        },
      },
      required: ["ratings"],
    },
  },

  generation_batch_favorite: {
    name: "generation_batch_favorite",
    description: "Favorite or unfavorite multiple generations at once.",
    inputSchema: {
      type: "object",
      properties: {
        imageIds: {
          type: "array",
          items: { type: "string" },
          description: "Generation IDs to update",
        },
        favorite: {
          type: "boolean",
          description: "true to favorite, false to unfavorite",
        },
      },
      required: ["imageIds", "favorite"],
    },
  },

  generation_quick_select: {
    name: "generation_quick_select",
    description:
      "Automatically select the best generation based on criteria. " +
      "Useful for quickly picking winners without manual review.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        criteria: {
          type: "string",
          enum: ["highest_rating", "most_recent", "oldest", "favorite"],
          description:
            "Selection criteria: highest_rating (best rated), most_recent, oldest, or favorite (best rated favorite)",
        },
      },
      required: ["panelId", "criteria"],
    },
  },

  generation_stats: {
    name: "generation_stats",
    description:
      "Get statistics and patterns from a set of generations. " +
      "Helps identify which settings produce the best results.",
    inputSchema: {
      type: "object",
      properties: {
        imageIds: {
          type: "array",
          items: { type: "string" },
          description: "Generation IDs to analyze",
        },
      },
      required: ["imageIds"],
    },
  },

  generation_get_unrated: {
    name: "generation_get_unrated",
    description: "Get all unrated generations for a panel. Useful for curation workflow.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
      },
      required: ["panelId"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleCurationTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getGeneratedImageService();

  switch (name) {
    case "generation_compare": {
      const { panelId, imageIds } = args as {
        panelId: string;
        imageIds?: string[];
      };

      return service.getForComparison(panelId, imageIds);
    }

    case "generation_batch_rate": {
      const { ratings } = args as {
        ratings: Array<{ imageId: string; rating: number | null }>;
      };

      return service.batchRate(ratings);
    }

    case "generation_batch_favorite": {
      const { imageIds, favorite } = args as {
        imageIds: string[];
        favorite: boolean;
      };

      return service.batchFavorite(imageIds, favorite);
    }

    case "generation_quick_select": {
      const { panelId, criteria } = args as {
        panelId: string;
        criteria: "highest_rating" | "most_recent" | "oldest" | "favorite";
      };

      const selected = await service.quickSelect(panelId, criteria);

      if (!selected) {
        return {
          success: false,
          message:
            criteria === "highest_rating"
              ? "No rated images found"
              : criteria === "favorite"
                ? "No favorite images found"
                : "No images found",
        };
      }

      return {
        success: true,
        selected,
        message: `Selected generation by ${criteria}`,
      };
    }

    case "generation_stats": {
      const { imageIds } = args as { imageIds: string[] };

      return service.getComparisonStats(imageIds);
    }

    case "generation_get_unrated": {
      const { panelId } = args as { panelId: string };

      const unrated = await service.getUnrated(panelId);

      return {
        unrated,
        count: unrated.length,
      };
    }

    default:
      throw new Error(`Unknown curation tool: ${name}`);
  }
}
