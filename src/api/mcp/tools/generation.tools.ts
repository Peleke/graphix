/**
 * Generation MCP Tools
 *
 * Tools for managing generated images via MCP.
 * Note: Actual generation is triggered via panel_generate (not yet implemented).
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getGeneratedImageService } from "../../../services/index.js";

export const generationTools: Record<string, Tool> = {
  generation_create: {
    name: "generation_create",
    description: "Record a new generated image (usually called internally after ComfyUI generation)",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID this image was generated for",
        },
        imagePath: {
          type: "string",
          description: "Path to the generated image file",
        },
        seed: {
          type: "number",
          description: "Seed used for generation",
        },
        prompt: {
          type: "string",
          description: "Full positive prompt used",
        },
        negativePrompt: {
          type: "string",
          description: "Negative prompt used",
        },
        model: {
          type: "string",
          description: "Model checkpoint used",
        },
        width: {
          type: "number",
          description: "Image width",
        },
        height: {
          type: "number",
          description: "Image height",
        },
        steps: {
          type: "number",
          description: "Number of sampling steps",
        },
        cfg: {
          type: "number",
          description: "CFG scale used",
        },
        sampler: {
          type: "string",
          description: "Sampler used",
        },
        loras: {
          type: "array",
          description: "LoRAs applied during generation",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              weight: { type: "number" },
            },
          },
        },
      },
      required: ["panelId", "imagePath", "seed", "prompt"],
    },
  },

  generation_get: {
    name: "generation_get",
    description: "Get a generated image by ID",
    inputSchema: {
      type: "object",
      properties: {
        generationId: {
          type: "string",
          description: "Generated image ID",
        },
      },
      required: ["generationId"],
    },
  },

  generation_list: {
    name: "generation_list",
    description: "List all generated images for a panel",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        favoritesOnly: {
          type: "boolean",
          description: "Only return favorited images",
        },
        minRating: {
          type: "number",
          description: "Minimum rating filter (1-5)",
        },
      },
      required: ["panelId"],
    },
  },

  generation_favorite: {
    name: "generation_favorite",
    description: "Toggle favorite status on a generated image",
    inputSchema: {
      type: "object",
      properties: {
        generationId: {
          type: "string",
          description: "Generated image ID",
        },
        isFavorite: {
          type: "boolean",
          description: "Favorite status (true/false)",
        },
      },
      required: ["generationId", "isFavorite"],
    },
  },

  generation_rate: {
    name: "generation_rate",
    description: "Rate a generated image (1-5 stars)",
    inputSchema: {
      type: "object",
      properties: {
        generationId: {
          type: "string",
          description: "Generated image ID",
        },
        rating: {
          type: "number",
          description: "Rating from 1 to 5",
        },
      },
      required: ["generationId", "rating"],
    },
  },

  generation_delete: {
    name: "generation_delete",
    description: "Delete a generated image record",
    inputSchema: {
      type: "object",
      properties: {
        generationId: {
          type: "string",
          description: "Generated image ID to delete",
        },
      },
      required: ["generationId"],
    },
  },
};

export async function handleGenerationTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getGeneratedImageService();

  switch (name) {
    case "generation_create": {
      const generation = await service.create({
        panelId: args.panelId as string,
        imagePath: args.imagePath as string,
        params: {
          seed: args.seed as number,
          prompt: args.prompt as string,
          negativePrompt: args.negativePrompt as string | undefined,
          model: args.model as string | undefined,
          width: args.width as number | undefined,
          height: args.height as number | undefined,
          steps: args.steps as number | undefined,
          cfg: args.cfg as number | undefined,
          sampler: args.sampler as string | undefined,
          loras: args.loras as Array<{ name: string; weight: number }> | undefined,
        },
      });
      return { success: true, generation };
    }

    case "generation_get": {
      const generation = await service.getById(args.generationId as string);
      if (!generation) {
        return { success: false, error: "Generated image not found" };
      }
      return { success: true, generation };
    }

    case "generation_list": {
      const generations = await service.listByPanel(args.panelId as string, {
        favoritesOnly: args.favoritesOnly as boolean | undefined,
        minRating: args.minRating as number | undefined,
      });
      return { success: true, generations, count: generations.length };
    }

    case "generation_favorite": {
      const generation = await service.toggleFavorite(
        args.generationId as string,
        args.isFavorite as boolean
      );
      return { success: true, generation };
    }

    case "generation_rate": {
      const generation = await service.rate(
        args.generationId as string,
        args.rating as number
      );
      return { success: true, generation };
    }

    case "generation_delete": {
      await service.delete(args.generationId as string);
      return { success: true, message: "Generated image deleted" };
    }

    default:
      throw new Error(`Unknown generation tool: ${name}`);
  }
}
