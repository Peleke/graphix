/**
 * Panel MCP Tools
 *
 * Tools for panel management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getPanelService } from "@graphix/core";
import { getPanelGenerator, type GenerateOptions, type VariantOptions } from "@graphix/core";
import type { PanelDirection } from "@graphix/core";
import {
  getConfigEngine,
  listSizePresets,
  listQualityPresets,
  getPresetsByCategory,
  type QualityPresetId,
  type SlotContext,
} from "@graphix/core";

export const panelTools: Record<string, Tool> = {
  panel_create: {
    name: "panel_create",
    description: "Create an empty panel (scene slot) in a storyboard at a given position. Call this when starting a new scene before setting artistic direction with panel_describe or assigning characters with panel_add_character. Returns a JSON object with {success, panel: {id, storyboardId, position, description, characters[], selectedOutputId}}. Lightweight metadata write; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID to add panel to",
        },
        position: {
          type: "number",
          description: "Position in sequence (auto-assigned if not provided)",
        },
        description: {
          type: "string",
          description: "Brief description of the panel content",
        },
      },
      required: ["storyboardId"],
    },
  },

  panel_get: {
    name: "panel_get",
    description: "Fetch a single panel's full state including its artistic direction, assigned characters, all generation outputs, and the currently selected output ID. Call this when you need to inspect a panel before generating, editing, or selecting an output. Returns {success, panel} where panel contains id, description, direction, characters[], generatedImages[], and selectedOutputId. Small JSON response; no GPU cost.",
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

  panel_describe: {
    name: "panel_describe",
    description: "Set or update a panel's artistic direction -- scene description, camera angle, lighting, and mood -- WITHOUT generating an image. Call this after panel_create and before panel_generate to define what the scene should look like. This is a metadata-only write (no GPU cost). To actually produce an image from this direction, call panel_generate afterward. To edit an already-generated image, use panel_inpaint or panel_edit instead. Returns {success, panel} with the updated direction fields.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        description: {
          type: "string",
          description: "Description of the scene (setting, action, mood)",
        },
        cameraAngle: {
          type: "string",
          enum: [
            "eye level",
            "low angle",
            "high angle",
            "dutch angle",
            "bird's eye",
            "worm's eye",
            "close-up",
            "medium shot",
            "wide shot",
            "extreme close-up",
          ],
          description: "Camera angle",
        },
        lighting: {
          type: "string",
          enum: [
            "natural",
            "golden hour",
            "dramatic",
            "soft",
            "harsh",
            "neon",
            "candlelight",
            "moonlight",
            "studio",
            "rim light",
          ],
          description: "Lighting style",
        },
        mood: {
          type: "string",
          enum: [
            "dramatic",
            "romantic",
            "comedic",
            "tense",
            "peaceful",
            "action",
            "mysterious",
            "melancholic",
            "joyful",
            "neutral",
          ],
          description: "Emotional mood",
        },
      },
      required: ["panelId"],
    },
  },

  panel_add_character: {
    name: "panel_add_character",
    description: "Attach an existing character (by ID) to a panel so the character appears in future generations. Call this after panel_create and before panel_generate; the character's visual description will be woven into the generation prompt automatically. To remove a character, use panel_remove_character. Returns {success, panel} with the updated characters[] array. Metadata-only write; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        characterId: {
          type: "string",
          description: "Character ID to add",
        },
      },
      required: ["panelId", "characterId"],
    },
  },

  panel_remove_character: {
    name: "panel_remove_character",
    description: "Detach a character from a panel so they no longer appear in future generations. Call this when a character should exit a scene. Does not affect already-generated images; only influences subsequent panel_generate calls. Returns {success, panel} with the updated characters[] array. Metadata-only write; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        characterId: {
          type: "string",
          description: "Character ID to remove",
        },
      },
      required: ["panelId", "characterId"],
    },
  },

  panel_select_output: {
    name: "panel_select_output",
    description: "Promote one of a panel's generated images to be the panel's final chosen output for page composition. Call this after reviewing generations (via generation_list, generation_rate, or generation_favorite) to lock in the winner. Unlike generation_favorite (which bookmarks for comparison), this sets the canonical image used when composing pages. To undo, use panel_clear_selection. Returns {success, panel} with selectedOutputId set. Metadata-only; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        generatedImageId: {
          type: "string",
          description: "ID of the generated image to select",
        },
      },
      required: ["panelId", "generatedImageId"],
    },
  },

  panel_clear_selection: {
    name: "panel_clear_selection",
    description: "Remove the panel's selected output, reverting it to having no chosen image for page composition. Call this when you want to re-evaluate generations before committing to a final pick via panel_select_output. Returns {success, panel} with selectedOutputId cleared. Metadata-only; no GPU cost.",
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

  panel_reorder: {
    name: "panel_reorder",
    description: "Move a panel to a new sequence position within its storyboard, shifting other panels to accommodate. Call this when reordering scenes in the narrative flow. Returns {success, panel} with the updated position. Metadata-only; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to move",
        },
        newPosition: {
          type: "number",
          description: "New position in sequence",
        },
      },
      required: ["panelId", "newPosition"],
    },
  },

  panel_delete: {
    name: "panel_delete",
    description: "Permanently delete a panel and all of its generated images from the storyboard. Call this to remove a scene entirely. This is destructive and cannot be undone. To merely remove the selected output without deleting the panel, use panel_clear_selection instead. Returns {success, message}. No GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to delete",
        },
      },
      required: ["panelId"],
    },
  },

  panel_generate: {
    name: "panel_generate",
    description: "Trigger GPU image generation for a panel using its artistic direction and assigned characters. This is the primary GPU-expensive call (~5-30s depending on quality preset). Call this after panel_describe and panel_add_character have set up the scene. Produces exactly one image per call; use panel_generate_variants for batch exploration. To modify an existing image region, use panel_inpaint instead. Returns {success, generatedImage: {id, localPath, width, height}, seed, dimensions}. Supports size/quality presets and composition slot targeting.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to generate image for",
        },
        model: {
          type: "string",
          description: "Model checkpoint to use (e.g., 'yiffInHell_yihXXXTended.safetensors')",
        },
        width: {
          type: "number",
          description: "Image width (256-4096) - overrides sizePreset if provided",
        },
        height: {
          type: "number",
          description: "Image height (256-4096) - overrides sizePreset if provided",
        },
        steps: {
          type: "number",
          description: "Number of sampling steps - overrides qualityPreset if provided",
        },
        cfg: {
          type: "number",
          description: "CFG scale - overrides qualityPreset if provided",
        },
        seed: {
          type: "number",
          description: "Specific seed (random if not provided)",
        },
        sampler: {
          type: "string",
          description: "Sampler name - overrides qualityPreset if provided",
        },
        sizePreset: {
          type: "string",
          description: "Size preset ID (e.g., 'portrait_3x4', 'landscape_16x9', 'comic_full_page'). Use panel_list_size_presets to see options.",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset: draft (fast preview), standard (balanced), high (hi-res fix), ultra (publication ready)",
        },
        forComposition: {
          type: "object",
          description: "Generate optimized for a specific composition slot (enables smart sizing)",
          properties: {
            templateId: {
              type: "string",
              description: "Template ID (e.g., 'six-grid', 'four-grid', 'full-page')",
            },
            slotId: {
              type: "string",
              description: "Slot ID within the template",
            },
            pageSizePreset: {
              type: "string",
              description: "Page size preset (default: 'comic_standard')",
            },
          },
          required: ["templateId", "slotId"],
        },
      },
      required: ["panelId"],
    },
  },

  panel_generate_variants: {
    name: "panel_generate_variants",
    description: "Batch-generate N variant images for a panel (default 4), each with a different seed and optionally varying CFG scale. Call this when exploring creative options before committing to a final image via panel_select_output. GPU-expensive: cost scales linearly with count (~5-30s per variant). Unlike panel_generate (single image), this produces a comparison set. Returns {success, total, successful, failed, generatedImages: [{id, localPath, width, height}, ...]}.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to generate variants for",
        },
        count: {
          type: "number",
          description: "Number of variants to generate (default 4)",
        },
        baseSeed: {
          type: "number",
          description: "Base seed for variant generation (random if not provided)",
        },
        varyCfg: {
          type: "boolean",
          description: "Vary CFG scale across variants",
        },
        cfgMin: {
          type: "number",
          description: "Minimum CFG if varying (default 5)",
        },
        cfgMax: {
          type: "number",
          description: "Maximum CFG if varying (default 9)",
        },
        model: {
          type: "string",
          description: "Model checkpoint to use",
        },
        sizePreset: {
          type: "string",
          description: "Size preset ID (e.g., 'portrait_3x4', 'landscape_16x9')",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset for all variants",
        },
        forComposition: {
          type: "object",
          description: "Generate optimized for a specific composition slot",
          properties: {
            templateId: { type: "string" },
            slotId: { type: "string" },
            pageSizePreset: { type: "string" },
          },
          required: ["templateId", "slotId"],
        },
      },
      required: ["panelId"],
    },
  },

  panel_list_size_presets: {
    name: "panel_list_size_presets",
    description: "List available image size presets (aspect ratios and pixel dimensions), optionally filtered by category: square, portrait, landscape, comic, manga, or social. Call this before panel_generate to pick the right sizePreset ID. Returns {success, presets: [{id, name, aspectRatio, suggestedFor, dimensions}], count}. Small static lookup; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["square", "portrait", "landscape", "comic", "manga", "social"],
          description: "Filter by category (optional)",
        },
      },
    },
  },

  panel_list_quality_presets: {
    name: "panel_list_quality_presets",
    description: "List the four quality presets (draft, standard, high, ultra) with their steps, CFG, sampler, scheduler, and hi-res fix settings. Call this before panel_generate to understand the speed/quality tradeoffs of each qualityPreset. Returns {success, presets: [{id, name, steps, cfg, sampler, scheduler, hiResFix, upscale}], count}. Small static lookup; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  panel_recommend_size: {
    name: "panel_recommend_size",
    description: "Calculate the optimal pixel dimensions for generating an image that fits a specific slot in a page composition template (e.g., slot 'A' in 'six-grid'). Call this before panel_generate when targeting a layout slot, to avoid cropping or stretching. Returns {success, templateId, slotId, recommended: {width, height, aspectRatio, presetId}}. Lightweight computation; no GPU cost.",
    inputSchema: {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          description: "Template ID (e.g., 'six-grid', 'four-grid')",
        },
        slotId: {
          type: "string",
          description: "Slot ID within the template",
        },
        pageSizePreset: {
          type: "string",
          description: "Page size preset (default: 'comic_standard')",
        },
      },
      required: ["templateId", "slotId"],
    },
  },
};

export async function handlePanelTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getPanelService();

  switch (name) {
    case "panel_create": {
      // Validate required parameters
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const panel = await service.create({
        storyboardId: args.storyboardId as string,
        position: args.position as number | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, panel };
    }

    case "panel_get": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      const panel = await service.getById(args.panelId as string);
      if (!panel) {
        return { success: false, error: "Panel not found" };
      }
      return { success: true, panel };
    }

    case "panel_describe": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      const direction: Partial<PanelDirection> = {};
      if (args.cameraAngle) direction.cameraAngle = args.cameraAngle as PanelDirection["cameraAngle"];
      if (args.lighting) direction.lighting = args.lighting as PanelDirection["lighting"];
      if (args.mood) direction.mood = args.mood as PanelDirection["mood"];

      const panel = await service.describe(args.panelId as string, {
        description: args.description as string | undefined,
        direction: Object.keys(direction).length > 0 ? direction : undefined,
      });
      return { success: true, panel };
    }

    case "panel_add_character": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      const panel = await service.addCharacter(
        args.panelId as string,
        args.characterId as string
      );
      return { success: true, panel };
    }

    case "panel_remove_character": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      const panel = await service.removeCharacter(
        args.panelId as string,
        args.characterId as string
      );
      return { success: true, panel };
    }

    case "panel_select_output": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }
      if (!args.generatedImageId) {
        return { success: false, error: "generatedImageId is required" };
      }

      const panel = await service.selectOutput(
        args.panelId as string,
        args.generatedImageId as string
      );
      return { success: true, panel };
    }

    case "panel_clear_selection": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      const panel = await service.clearSelection(args.panelId as string);
      return { success: true, panel };
    }

    case "panel_reorder": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }
      if (args.newPosition === undefined) {
        return { success: false, error: "newPosition is required" };
      }

      const panel = await service.reorder(
        args.panelId as string,
        args.newPosition as number
      );
      return { success: true, panel };
    }

    case "panel_delete": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      await service.delete(args.panelId as string);
      return { success: true, message: "Panel deleted" };
    }

    case "panel_generate": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      const generator = getPanelGenerator();

      // Parse forComposition if provided
      let forComposition: SlotContext | undefined;
      if (args.forComposition && typeof args.forComposition === "object") {
        const fc = args.forComposition as Record<string, unknown>;
        forComposition = {
          templateId: fc.templateId as string,
          slotId: fc.slotId as string,
          pageSizePreset: fc.pageSizePreset as string | undefined,
        };
      }

      const options: GenerateOptions = {
        model: args.model as string | undefined,
        width: args.width as number | undefined,
        height: args.height as number | undefined,
        steps: args.steps as number | undefined,
        cfg: args.cfg as number | undefined,
        seed: args.seed as number | undefined,
        sampler: args.sampler as string | undefined,
        sizePreset: args.sizePreset as string | undefined,
        qualityPreset: args.qualityPreset as QualityPresetId | undefined,
        forComposition,
      };
      const result = await generator.generate(args.panelId as string, options);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        generatedImage: result.generatedImage,
        seed: result.generationResult?.seed,
        localPath: result.generationResult?.localPath,
        dimensions: {
          width: result.generatedImage?.width,
          height: result.generatedImage?.height,
        },
      };
    }

    case "panel_generate_variants": {
      // Validate required parameters
      if (!args.panelId) {
        return { success: false, error: "panelId is required" };
      }

      const generator = getPanelGenerator();

      // Parse forComposition if provided
      let forComposition: SlotContext | undefined;
      if (args.forComposition && typeof args.forComposition === "object") {
        const fc = args.forComposition as Record<string, unknown>;
        forComposition = {
          templateId: fc.templateId as string,
          slotId: fc.slotId as string,
          pageSizePreset: fc.pageSizePreset as string | undefined,
        };
      }

      const variantOptions: VariantOptions = {
        count: (args.count as number) || 4,
        baseSeed: args.baseSeed as number | undefined,
        varyCfg: args.varyCfg as boolean | undefined,
        cfgRange: args.varyCfg
          ? [(args.cfgMin as number) || 5, (args.cfgMax as number) || 9]
          : undefined,
        model: args.model as string | undefined,
        sizePreset: args.sizePreset as string | undefined,
        qualityPreset: args.qualityPreset as QualityPresetId | undefined,
        forComposition,
      };
      const result = await generator.generateVariants(args.panelId as string, variantOptions);
      return {
        success: result.success,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        generatedImages: result.results
          .filter((r) => r.success)
          .map((r) => r.generatedImage),
      };
    }

    case "panel_list_size_presets": {
      const category = args.category as string | undefined;

      if (category) {
        const byCategory = getPresetsByCategory();
        const presets = byCategory[category] ?? [];
        return {
          success: true,
          category,
          presets: presets.map((p) => ({
            id: p.id,
            name: p.name,
            aspectRatio: p.aspectRatio,
            suggestedFor: p.suggestedFor,
            dimensions: p.dimensions.sdxl, // Show SDXL dims as default
          })),
          count: presets.length,
        };
      }

      const presets = listSizePresets();
      return {
        success: true,
        presets: presets.map((p) => ({
          id: p.id,
          name: p.name,
          aspectRatio: p.aspectRatio,
          suggestedFor: p.suggestedFor,
          dimensions: p.dimensions.sdxl,
        })),
        count: presets.length,
        categories: ["square", "portrait", "landscape", "comic", "manga", "social"],
      };
    }

    case "panel_list_quality_presets": {
      const presets = listQualityPresets();
      return {
        success: true,
        presets: presets.map((p) => ({
          id: p.id,
          name: p.name,
          steps: p.steps,
          cfg: p.cfg,
          sampler: p.sampler,
          scheduler: p.scheduler,
          hiResFix: p.hiResFix,
          upscale: p.upscale,
        })),
        count: presets.length,
      };
    }

    case "panel_recommend_size": {
      // Validate required parameters
      if (!args.templateId) {
        return { success: false, error: "templateId is required" };
      }
      if (!args.slotId) {
        return { success: false, error: "slotId is required" };
      }

      const engine = getConfigEngine();
      const size = engine.getDimensionsForSlot(
        args.templateId as string,
        args.slotId as string,
        {
          pageSizePreset: args.pageSizePreset as string | undefined,
        }
      );
      return {
        success: true,
        templateId: args.templateId,
        slotId: args.slotId,
        recommended: {
          width: size.width,
          height: size.height,
          aspectRatio: size.aspectRatio,
          presetId: size.presetId,
        },
      };
    }

    default:
      throw new Error(`Unknown panel tool: ${name}`);
  }
}
