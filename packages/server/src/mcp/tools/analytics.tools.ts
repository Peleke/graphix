/**
 * Analytics MCP Tools
 *
 * Tools for analyzing generation patterns and making recommendations.
 * "Prompt Archaeology" - learning from what worked before.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getPromptAnalyticsService } from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const analyticsTools: Record<string, Tool> = {
  generation_analyze: {
    name: "generation_analyze",
    description:
      "Mine rated generations across a project to discover which parameter combinations (CFG, sampler, model, LoRAs, prompt terms) correlate with high ratings. Call after accumulating 10+ rated generations to learn what works. Unlike generation_stats which analyzes a specific set of IDs, this scans project-wide (up to 500 generations). Returns JSON with {topModels, topSamplers, cfgDistribution, topPromptTerms, sampleSize}. ~500-1000 tokens.",
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
      "Recommend optimal generation parameters (CFG, sampler, steps, model, LoRAs) based on patterns mined from past highly-rated generations. Call before generating a new panel when you want data-driven defaults. Unlike generation_analyze which returns raw pattern data, this returns a ready-to-use parameter set. Returns JSON with {suggestedCfg, suggestedSampler, suggestedSteps, suggestedModel, suggestedLoras, confidence}. ~300 tokens.",
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
      "Search for past highly-rated generations whose prompts are textually similar to a given prompt string. Call before generating a new panel to see what parameters and prompt phrasing worked for similar content. Returns JSON with {similar: [{imageId, prompt, rating, similarity, matchedTerms, localPath}], count}. Up to 20 results, ~500-1500 tokens.",
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
