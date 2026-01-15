/**
 * Panel MCP Tools
 *
 * Tools for panel management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getPanelService } from "../../../services/index.js";
import { getPanelGenerator, type GenerateOptions, type VariantOptions } from "../../../generation/index.js";

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
        sequenceNumber: {
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
        sceneDescription: {
          type: "string",
          description: "Description of the scene (setting, action, mood)",
        },
        cameraAngle: {
          type: "string",
          description: "Camera angle (e.g., 'close-up', 'wide shot', 'bird\\'s eye')",
        },
        lighting: {
          type: "string",
          description: "Lighting style (e.g., 'dramatic', 'soft', 'golden hour')",
        },
        mood: {
          type: "string",
          description: "Emotional mood (e.g., 'tense', 'romantic', 'mysterious')",
        },
        additionalPrompt: {
          type: "string",
          description: "Additional prompt elements to include",
        },
        negativePrompt: {
          type: "string",
          description: "Elements to avoid in this panel",
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
        position: {
          type: "string",
          description: "Position hint (e.g., 'left', 'center', 'right', 'background')",
        },
        action: {
          type: "string",
          description: "What the character is doing (e.g., 'standing', 'sitting', 'running')",
        },
        expression: {
          type: "string",
          description: "Character expression (e.g., 'smiling', 'angry', 'surprised')",
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
        newSequenceNumber: {
          type: "number",
          description: "New position in sequence",
        },
      },
      required: ["panelId", "newSequenceNumber"],
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
          description: "Image width (256-4096, default 768)",
        },
        height: {
          type: "number",
          description: "Image height (256-4096, default 1024)",
        },
        steps: {
          type: "number",
          description: "Number of sampling steps (default 28)",
        },
        cfg: {
          type: "number",
          description: "CFG scale (default 7)",
        },
        seed: {
          type: "number",
          description: "Specific seed (random if not provided)",
        },
        sampler: {
          type: "string",
          description: "Sampler name (default 'euler_ancestral')",
        },
        quality: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset: draft (fast), standard (balanced), high (hi-res fix), ultra (hi-res + upscale)",
        },
        useIPAdapter: {
          type: "boolean",
          description: "Use IP-Adapter for character consistency (requires reference images)",
        },
        ipAdapterStrength: {
          type: "number",
          description: "IP-Adapter strength (0.0-1.0, default 0.8)",
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
        quality: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset",
        },
      },
      required: ["panelId"],
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
        sequenceNumber: args.sequenceNumber as number | undefined,
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
      const panel = await service.updateDirection(args.panelId as string, {
        sceneDescription: args.sceneDescription as string | undefined,
        cameraAngle: args.cameraAngle as string | undefined,
        lighting: args.lighting as string | undefined,
        mood: args.mood as string | undefined,
        additionalPrompt: args.additionalPrompt as string | undefined,
        negativePrompt: args.negativePrompt as string | undefined,
      });
      return { success: true, panel };
    }

    case "panel_add_character": {
      const panel = await service.addCharacter(args.panelId as string, {
        characterId: args.characterId as string,
        position: args.position as string | undefined,
        action: args.action as string | undefined,
        expression: args.expression as string | undefined,
      });
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
        args.newSequenceNumber as number
      );
      return { success: true, panel };
    }

    case "panel_delete": {
      await service.delete(args.panelId as string);
      return { success: true, message: "Panel deleted" };
    }

    case "panel_generate": {
      const generator = getPanelGenerator();
      const options: GenerateOptions = {
        model: args.model as string | undefined,
        width: args.width as number | undefined,
        height: args.height as number | undefined,
        steps: args.steps as number | undefined,
        cfg: args.cfg as number | undefined,
        seed: args.seed as number | undefined,
        sampler: args.sampler as string | undefined,
        quality: args.quality as "draft" | "standard" | "high" | "ultra" | undefined,
        useIPAdapter: args.useIPAdapter as boolean | undefined,
        ipAdapterStrength: args.ipAdapterStrength as number | undefined,
      };
      const result = await generator.generate(args.panelId as string, options);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        generatedImage: result.generatedImage,
        seed: result.generationResult?.seed,
        imagePath: result.generationResult?.imagePath,
      };
    }

    case "panel_generate_variants": {
      const generator = getPanelGenerator();
      const variantOptions: VariantOptions = {
        count: (args.count as number) || 4,
        baseSeed: args.baseSeed as number | undefined,
        varyCfg: args.varyCfg as boolean | undefined,
        cfgRange: args.varyCfg
          ? [(args.cfgMin as number) || 5, (args.cfgMax as number) || 9]
          : undefined,
        model: args.model as string | undefined,
        quality: args.quality as "draft" | "standard" | "high" | "ultra" | undefined,
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

    default:
      throw new Error(`Unknown panel tool: ${name}`);
  }
}
