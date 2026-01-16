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
    description: "Create a new panel in a storyboard",
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
    description: "Get a panel by ID with all its outputs",
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
    description: "Set or update the artistic direction for a panel",
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
    description: "Add a character to appear in a panel",
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
    description: "Remove a character from a panel",
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
    description: "Select a generated image as the panel's chosen output",
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
    description: "Clear the selected output for a panel",
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
    description: "Move a panel to a new position in the storyboard",
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
    description: "Delete a panel and all its generated outputs",
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
    description: "Generate an image for a panel based on its direction and characters",
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
    description: "Generate multiple variant images for a panel with different seeds",
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
    description: "List all available size presets for image generation",
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
    description: "List all available quality presets for image generation",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  panel_recommend_size: {
    name: "panel_recommend_size",
    description: "Get recommended generation size for a composition slot",
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
      const panel = await service.create({
        storyboardId: args.storyboardId as string,
        position: args.position as number | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, panel };
    }

    case "panel_get": {
      const panel = await service.getById(args.panelId as string);
      if (!panel) {
        return { success: false, error: "Panel not found" };
      }
      return { success: true, panel };
    }

    case "panel_describe": {
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
      const panel = await service.addCharacter(
        args.panelId as string,
        args.characterId as string
      );
      return { success: true, panel };
    }

    case "panel_remove_character": {
      const panel = await service.removeCharacter(
        args.panelId as string,
        args.characterId as string
      );
      return { success: true, panel };
    }

    case "panel_select_output": {
      const panel = await service.selectOutput(
        args.panelId as string,
        args.generatedImageId as string
      );
      return { success: true, panel };
    }

    case "panel_clear_selection": {
      const panel = await service.clearSelection(args.panelId as string);
      return { success: true, panel };
    }

    case "panel_reorder": {
      const panel = await service.reorder(
        args.panelId as string,
        args.newPosition as number
      );
      return { success: true, panel };
    }

    case "panel_delete": {
      await service.delete(args.panelId as string);
      return { success: true, message: "Panel deleted" };
    }

    case "panel_generate": {
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
