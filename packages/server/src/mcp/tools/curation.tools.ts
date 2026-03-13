/**
 * Curation MCP Tools
 *
 * Tools for comparing and selecting generated image variants.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getGeneratedImageService } from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const curationTools: Record<string, Tool> = {
  generation_compare: {
    name: "generation_compare",
    description:
      "Retrieve all (or specific) generated image variants for a panel, formatted for side-by-side comparison with metadata summaries. Call after generating multiple variants for a panel when you need to present them for selection. Returns JSON with array of {imageId, localPath, prompt, rating, isFavorite, params} plus aggregate stats. Unlike generation_stats which returns statistical analysis, this returns the images themselves. ~500-3000 tokens depending on variant count.",
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
    description:
      "Assign 1-5 star ratings to multiple generated images in a single call. Call after reviewing variants when you want to rate several at once instead of one by one. Accepts an array of {imageId, rating} pairs. Returns JSON with {updated: count, results: [{imageId, rating, success}]}. ~200-500 tokens.",
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
    description:
      "Toggle the favorite flag on multiple generated images in a single call. Call when bookmarking the best variants for later use or clearing old favorites. Unlike generation_batch_rate (1-5 stars), this is a binary favorite/unfavorite toggle. Returns JSON with {updated: count}. ~100 tokens.",
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
      "Auto-select the single best generated image for a panel based on a sorting criterion: highest_rating, most_recent, oldest, or favorite. Call when you want to finalize a panel's image without manual comparison. Returns JSON with {selected: {imageId, localPath, rating, ...}} or {success: false} if no match. ~200 tokens.",
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
      "Compute aggregate rating statistics (average, distribution, top-rated settings) across a specific set of generation IDs. Call when you want to understand rating patterns for a batch of variants. Unlike generation_compare which returns full image data for display, this returns only statistical summaries. Unlike generation_analyze which mines project-wide patterns, this scopes to the exact IDs you provide. Returns JSON with rating distribution and parameter correlations. ~300 tokens.",
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
    description:
      "Fetch all generated images for a panel that have no rating yet. Call at the start of a curation session to identify which variants still need review. Returns JSON with {unrated: [{imageId, localPath, prompt, ...}], count}. ~300-2000 tokens depending on unrated count.",
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
