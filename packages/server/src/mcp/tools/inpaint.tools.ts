/**
 * Inpainting MCP Tools
 *
 * Smart region-based regeneration and text-based editing tools.
 */

import { z } from "zod";
import {
  getInpaintingService,
  MASK_PRESETS,
  type MaskPreset,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const inpaintTools = {
  /**
   * Inpaint a region using a mask preset or custom mask
   */
  panel_inpaint: {
    name: "panel_inpaint",
    description:
      "Inpaint (regenerate) a specific region of a generated image using a mask. " +
      "Use mask presets like 'hands', 'face', 'background' for common fixes, " +
      "or provide a custom mask image path.",
    inputSchema: {
      type: "object" as const,
      properties: {
        generatedImageId: {
          type: "string",
          description: "ID of the generated image to fix",
        },
        prompt: {
          type: "string",
          description: "What to generate in the masked region (e.g., 'detailed hands with five fingers')",
        },
        negativePrompt: {
          type: "string",
          description: "What to avoid in the generation",
        },
        maskPreset: {
          type: "string",
          enum: MASK_PRESETS as unknown as string[],
          description: "Preset mask type: hands, left_hand, right_hand, face, eyes, mouth, background, foreground, clothing",
        },
        customMaskPath: {
          type: "string",
          description: "Path to custom mask image (white = inpaint, black = preserve). Use instead of maskPreset.",
        },
        denoisingStrength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "How much to change the region (0-1, default 0.75). Higher = more change.",
        },
        maskBlur: {
          type: "number",
          minimum: 0,
          description: "Blur mask edges in pixels (default 4). Higher = softer blend.",
        },
        inpaintFullRes: {
          type: "boolean",
          description: "Inpaint at full resolution (default true). Better quality but slower.",
        },
        inpaintPadding: {
          type: "number",
          minimum: 0,
          description: "Padding around inpaint region in pixels (default 32)",
        },
        outputDir: {
          type: "string",
          description: "Directory to save the inpainted image",
        },
        seed: {
          type: "number",
          description: "Random seed for reproducibility",
        },
      },
      required: ["generatedImageId", "prompt", "outputDir"],
    },
  },

  /**
   * Edit an image using text instructions (InstructPix2Pix style)
   */
  panel_edit: {
    name: "panel_edit",
    description:
      "Edit an image using natural language instructions without needing a mask. " +
      "Good for global adjustments or when you can't easily define a mask region. " +
      "Examples: 'improve the hands', 'add more detail to the background', 'make it more dramatic'",
    inputSchema: {
      type: "object" as const,
      properties: {
        generatedImageId: {
          type: "string",
          description: "ID of the generated image to edit",
        },
        instruction: {
          type: "string",
          description: "Natural language edit instruction (e.g., 'make the hands look better')",
        },
        negativePrompt: {
          type: "string",
          description: "What to avoid in the edit",
        },
        denoisingStrength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "How much to change (0-1, default 0.4). Lower = preserve more of original.",
        },
        outputDir: {
          type: "string",
          description: "Directory to save the edited image",
        },
        seed: {
          type: "number",
          description: "Random seed for reproducibility",
        },
      },
      required: ["generatedImageId", "instruction", "outputDir"],
    },
  },

  /**
   * Generate a mask from a preset
   */
  panel_create_mask: {
    name: "panel_create_mask",
    description:
      "Generate a mask image from a preset type. Use this to preview or customize " +
      "the mask before inpainting. Note: some presets require manual mask creation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        generatedImageId: {
          type: "string",
          description: "ID of the generated image to create mask for",
        },
        preset: {
          type: "string",
          enum: MASK_PRESETS as unknown as string[],
          description: "Mask preset type",
        },
        outputPath: {
          type: "string",
          description: "Path to save the generated mask",
        },
        expandPixels: {
          type: "number",
          minimum: 0,
          description: "Expand mask by N pixels (default 10)",
        },
        featherPixels: {
          type: "number",
          minimum: 0,
          description: "Feather/blur mask edges by N pixels (default 5)",
        },
      },
      required: ["generatedImageId", "preset", "outputPath"],
    },
  },

  /**
   * List available mask presets
   */
  inpaint_list_presets: {
    name: "inpaint_list_presets",
    description: "List all available mask presets with descriptions and auto-detection support status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
};

// ============================================================================
// Tool Handler
// ============================================================================

export async function handleInpaintTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getInpaintingService();

  switch (name) {
    case "panel_inpaint": {
      const {
        generatedImageId,
        prompt,
        negativePrompt,
        maskPreset,
        customMaskPath,
        denoisingStrength,
        maskBlur,
        inpaintFullRes,
        inpaintPadding,
        outputDir,
        seed,
      } = args as {
        generatedImageId: string;
        prompt: string;
        negativePrompt?: string;
        maskPreset?: MaskPreset;
        customMaskPath?: string;
        denoisingStrength?: number;
        maskBlur?: number;
        inpaintFullRes?: boolean;
        inpaintPadding?: number;
        outputDir: string;
        seed?: number;
      };

      // Validate that either maskPreset or customMaskPath is provided
      if (!maskPreset && !customMaskPath) {
        return {
          success: false,
          error: "Must provide either maskPreset or customMaskPath",
        };
      }

      return service.inpaint({
        generatedImageId,
        prompt,
        negativePrompt,
        maskPreset,
        customMaskPath,
        denoisingStrength,
        maskBlur,
        inpaintFullRes,
        inpaintPadding,
        outputDir,
        seed,
      });
    }

    case "panel_edit": {
      const { generatedImageId, instruction, negativePrompt, denoisingStrength, outputDir, seed } =
        args as {
          generatedImageId: string;
          instruction: string;
          negativePrompt?: string;
          denoisingStrength?: number;
          outputDir: string;
          seed?: number;
        };

      return service.edit({
        generatedImageId,
        instruction,
        negativePrompt,
        denoisingStrength,
        outputDir,
        seed,
      });
    }

    case "panel_create_mask": {
      const { generatedImageId, preset, outputPath, expandPixels, featherPixels } = args as {
        generatedImageId: string;
        preset: MaskPreset;
        outputPath: string;
        expandPixels?: number;
        featherPixels?: number;
      };

      // Get the source image path from the generation
      const { eq } = await import("drizzle-orm");
      const { getDefaultDatabase, generatedImages } = await import("@graphix/core");

      const db = getDefaultDatabase();
      const [generation] = await db
        .select()
        .from(generatedImages)
        .where(eq(generatedImages.id, generatedImageId));

      if (!generation) {
        return {
          success: false,
          error: `Generation not found: ${generatedImageId}`,
        };
      }

      return service.generateMask({
        sourceImagePath: generation.localPath,
        preset,
        outputPath,
        expandPixels,
        featherPixels,
      });
    }

    case "inpaint_list_presets": {
      return {
        presets: service.listMaskPresets(),
      };
    }

    default:
      throw new Error(`Unknown inpaint tool: ${name}`);
  }
}
