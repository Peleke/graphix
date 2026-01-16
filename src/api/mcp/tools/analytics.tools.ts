/**
 * Analytics MCP Tools
 *
 * Tools for analyzing generation patterns and making recommendations.
 * "Prompt Archaeology" - learning from what worked before.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getPromptAnalyticsService } from "../../../services/prompt-analytics.service.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const analyticsTools: Record<string, Tool> = {
  generation_analyze: {
    name: "generation_analyze",
    description:
      "Analyze successful generations to find patterns. Identifies which CFG, sampler, " +
      "model, LoRAs, and prompt terms lead to the highest-rated results.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID to scope analysis. If omitted, analyzes all generations.",
        },
        minRating: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "Minimum rating to consider 'successful' (default: 3)",
        },
        limit: {
          type: "number",
          minimum: 10,
          maximum: 1000,
          description: "Maximum number of generations to analyze (default: 500)",
        },
      },
      required: [],
    },
  },

  generation_suggest_params: {
    name: "generation_suggest_params",
    description:
      "Get AI-suggested generation parameters based on past successes. " +
      "Returns recommended CFG, sampler, steps, model, and LoRAs.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID to base recommendations on",
        },
        prompt: {
          type: "string",
          description: "Optional prompt to find related successful terms",
        },
      },
      required: [],
    },
  },

  generation_find_similar: {
    name: "generation_find_similar",
    description:
      "Find past successful generations similar to a prompt. " +
      "Useful for seeing what worked before for similar content.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to find similar generations for",
        },
        projectId: {
          type: "string",
          description: "Optional project ID to scope search",
        },
        minRating: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "Minimum rating to consider (default: 3)",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Maximum results to return (default: 20)",
        },
      },
      required: ["prompt"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleAnalyticsTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getPromptAnalyticsService();

  switch (name) {
    case "generation_analyze": {
      const { projectId, minRating, limit } = args as {
        projectId?: string;
        minRating?: number;
        limit?: number;
      };

      return service.analyze({ projectId, minRating, limit });
    }

    case "generation_suggest_params": {
      const { projectId, prompt } = args as {
        projectId?: string;
        prompt?: string;
      };

      return service.suggestParams({ projectId, prompt });
    }

    case "generation_find_similar": {
      const { prompt, projectId, minRating, limit } = args as {
        prompt: string;
        projectId?: string;
        minRating?: number;
        limit?: number;
      };

      const similar = await service.findSimilar({ prompt, projectId, minRating, limit });

      return {
        similar: similar.map((s) => ({
          imageId: s.image.id,
          prompt: s.image.prompt,
          rating: s.image.rating,
          similarity: s.similarity,
          matchedTerms: s.matchedTerms,
          localPath: s.image.localPath,
        })),
        count: similar.length,
      };
    }

    default:
      throw new Error(`Unknown analytics tool: ${name}`);
  }
}
