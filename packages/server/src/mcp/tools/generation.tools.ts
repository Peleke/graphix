/**
 * Generation MCP Tools
 *
 * Tools for managing generated images via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getGeneratedImageService } from "@graphix/core";

export const generationTools: Record<string, Tool> = {
  generation_create: {
    name: "generation_create",
    description: "Register a generated image record in the database after ComfyUI has produced output. Typically called internally by panel_generate, not directly by the agent. Call this only if you have a raw ComfyUI output that was produced outside the normal panel_generate flow and needs to be tracked. Returns {success, generation: {id, panelId, localPath, seed, prompt, model, width, height, ...}}. Metadata write; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID this image was generated for",
        },
        localPath: {
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
        scheduler: {
          type: "string",
          description: "Scheduler used",
        },
        loras: {
          type: "array",
          description: "LoRAs applied during generation",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              strength: { type: "number" },
              strengthClip: { type: "number" },
            },
          },
        },
      },
      required: ["panelId", "localPath", "seed", "prompt", "model", "width", "height", "steps", "cfg", "sampler"],
    },
  },

  generation_get: {
    name: "generation_get",
    description: "Fetch a single generated image's full metadata: prompt, seed, model, dimensions, CFG, sampler, LoRAs, rating, and favorite status. Call this when inspecting a specific generation's parameters (e.g., to reproduce or compare settings). For listing all generations under a panel, use generation_list instead. Returns {success, generation} with all generation fields. Small JSON response; no GPU cost.",
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
    description: "List all generated images belonging to a panel, optionally filtered to favorites only. Call this when reviewing a panel's generation history to compare outputs, check ratings, or decide which to select via panel_select_output. Returns {success, generations: [{id, seed, prompt, model, width, height, rating, isFavorite, ...}], count}. Response size scales with generation count. No GPU cost.",
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
      },
      required: ["panelId"],
    },
  },

  generation_favorite: {
    name: "generation_favorite",
    description: "Toggle the favorite flag on a generated image (on if off, off if on). Use this to bookmark promising outputs for later comparison. Unlike panel_select_output (which commits one image as the panel's canonical output), favoriting is non-exclusive -- multiple generations can be favorited simultaneously. Returns {success, generation} with updated isFavorite. Metadata write; no GPU cost.",
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

  generation_rate: {
    name: "generation_rate",
    description: "Assign a 1-5 star rating to a generated image, or pass null to clear the rating. Use this for structured quality scoring across generations (e.g., ranking variants before selecting a winner with panel_select_output). Unlike generation_favorite (binary bookmark), this captures degree of quality. Returns {success, generation} with updated rating field. Metadata write; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        generationId: {
          type: "string",
          description: "Generated image ID",
        },
        rating: {
          type: "number",
          description: "Rating from 1 to 5 (or null to clear)",
        },
      },
      required: ["generationId"],
    },
  },

  generation_delete: {
    name: "generation_delete",
    description: "Permanently delete a single generated image record and its metadata. Call this to discard a bad generation and reduce clutter. If this image is the panel's selected output, the selection will be cleared. To delete the entire panel and all its generations at once, use panel_delete instead. Returns {success, message}. Destructive and irreversible. No GPU cost.",
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
        localPath: args.localPath as string,
        seed: args.seed as number,
        prompt: args.prompt as string,
        negativePrompt: args.negativePrompt as string | undefined,
        model: args.model as string,
        width: args.width as number,
        height: args.height as number,
        steps: args.steps as number,
        cfg: args.cfg as number,
        sampler: args.sampler as string,
        scheduler: args.scheduler as string | undefined,
        loras: args.loras as Array<{ name: string; strength: number; strengthClip?: number }> | undefined,
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
      let generations;
      if (args.favoritesOnly) {
        generations = await service.getFavorites(args.panelId as string);
      } else {
        generations = await service.getByPanel(args.panelId as string);
      }
      return { success: true, generations, count: generations.length };
    }

    case "generation_favorite": {
      const generation = await service.toggleFavorite(args.generationId as string);
      return { success: true, generation };
    }

    case "generation_rate": {
      const generation = await service.setRating(
        args.generationId as string,
        args.rating as number | null
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
