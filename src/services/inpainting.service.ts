/**
 * Inpainting Service
 *
 * Smart region-based regeneration with preset masks and text-based editing.
 */

import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client.js";
import { generatedImages, panels, type GeneratedImage } from "../db/schema.js";
import {
  getComfyUIClient,
  type InpaintRequest,
  type Img2ImgRequest,
  type GenerationResult,
} from "../generation/comfyui-client.js";
import { getControlNetStack } from "../generation/controlnet-stack.js";
import * as path from "path";
import * as fs from "fs/promises";

// ============================================================================
// Types
// ============================================================================

/**
 * Preset mask types for common fixes
 */
export const MASK_PRESETS = [
  "hands",
  "left_hand",
  "right_hand",
  "face",
  "eyes",
  "mouth",
  "background",
  "foreground",
  "clothing",
] as const;
export type MaskPreset = (typeof MASK_PRESETS)[number];

/**
 * Options for inpainting a region
 */
export interface InpaintOptions {
  /** ID of the generated image to fix */
  generatedImageId: string;
  /** What to regenerate (prompt for the inpainted region) */
  prompt: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Mask preset or custom mask path */
  maskPreset?: MaskPreset;
  customMaskPath?: string;
  /** Denoising strength (0-1, higher = more change) */
  denoisingStrength?: number;
  /** Blur the mask edges */
  maskBlur?: number;
  /** Inpaint at full resolution */
  inpaintFullRes?: boolean;
  /** Padding around inpaint region */
  inpaintPadding?: number;
  /** Output directory */
  outputDir: string;
  /** Optional seed for reproducibility */
  seed?: number;
}

/**
 * Options for text-based editing (InstructPix2Pix style)
 */
export interface EditOptions {
  /** ID of the generated image to edit */
  generatedImageId: string;
  /** Edit instruction (e.g., "make the hands look better", "add more detail to the face") */
  instruction: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Denoising strength (0-1, lower = preserve more) */
  denoisingStrength?: number;
  /** Output directory */
  outputDir: string;
  /** Optional seed for reproducibility */
  seed?: number;
}

/**
 * Options for mask generation
 */
export interface MaskGenerationOptions {
  /** Source image path */
  sourceImagePath: string;
  /** Preset to generate mask for */
  preset: MaskPreset;
  /** Output path for mask */
  outputPath: string;
  /** Expand mask by N pixels */
  expandPixels?: number;
  /** Feather/blur the mask edges */
  featherPixels?: number;
}

/**
 * Result of an inpainting operation
 */
export interface InpaintResult {
  success: boolean;
  /** New generated image record */
  generatedImage?: GeneratedImage;
  /** Path to the inpainted image */
  localPath?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

export class InpaintingService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Inpaint a region of an existing generated image
   */
  async inpaint(options: InpaintOptions): Promise<InpaintResult> {
    // Get the source generation
    const [sourceGen] = await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.id, options.generatedImageId));

    if (!sourceGen) {
      return { success: false, error: `Generation not found: ${options.generatedImageId}` };
    }

    // Determine mask path
    let maskPath: string;
    if (options.customMaskPath) {
      maskPath = options.customMaskPath;
    } else if (options.maskPreset) {
      // Generate mask from preset
      const maskResult = await this.generateMask({
        sourceImagePath: sourceGen.localPath,
        preset: options.maskPreset,
        outputPath: path.join(options.outputDir, `mask_${Date.now()}.png`),
        expandPixels: 10,
        featherPixels: 5,
      });
      if (!maskResult.success) {
        return { success: false, error: maskResult.error };
      }
      maskPath = maskResult.maskPath!;
    } else {
      return { success: false, error: "Must provide either maskPreset or customMaskPath" };
    }

    // Ensure output directory exists
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate output path
    const timestamp = Date.now();
    const outputPath = path.join(options.outputDir, `inpaint_${timestamp}.png`);

    // Call ComfyUI inpaint
    const client = getComfyUIClient();
    const result = await client.inpaint({
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      source_image: sourceGen.localPath,
      mask_image: maskPath,
      denoising_strength: options.denoisingStrength ?? 0.75,
      mask_blur: options.maskBlur ?? 4,
      inpaint_full_res: options.inpaintFullRes ?? true,
      inpaint_padding: options.inpaintPadding ?? 32,
      width: sourceGen.width,
      height: sourceGen.height,
      steps: sourceGen.steps,
      cfg_scale: sourceGen.cfg,
      sampler: sourceGen.sampler,
      model: sourceGen.model,
      seed: options.seed ?? Math.floor(Math.random() * 2147483647),
      loras: sourceGen.loras,
      output_path: outputPath,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Create new generation record
    const now = new Date();
    const [newGen] = await this.db
      .insert(generatedImages)
      .values({
        panelId: sourceGen.panelId,
        localPath: result.localPath ?? outputPath,
        seed: result.seed ?? options.seed ?? 0,
        prompt: `[INPAINT: ${options.maskPreset ?? "custom"}] ${options.prompt}`,
        negativePrompt: options.negativePrompt ?? sourceGen.negativePrompt ?? "",
        model: sourceGen.model,
        loras: sourceGen.loras,
        steps: sourceGen.steps,
        cfg: sourceGen.cfg,
        sampler: sourceGen.sampler,
        scheduler: sourceGen.scheduler ?? "normal",
        width: sourceGen.width,
        height: sourceGen.height,
        variantStrategy: "custom",
        variantIndex: null,
        usedIPAdapter: false,
        usedControlNet: false,
        isSelected: false,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      success: true,
      generatedImage: newGen,
      localPath: result.localPath ?? outputPath,
    };
  }

  /**
   * Edit an image using text instructions (InstructPix2Pix style)
   *
   * Use this when you want to make changes without defining a mask.
   * Example: "improve the hands" or "add more detail to the background"
   */
  async edit(options: EditOptions): Promise<InpaintResult> {
    // Get the source generation
    const [sourceGen] = await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.id, options.generatedImageId));

    if (!sourceGen) {
      return { success: false, error: `Generation not found: ${options.generatedImageId}` };
    }

    // Ensure output directory exists
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate output path
    const timestamp = Date.now();
    const outputPath = path.join(options.outputDir, `edit_${timestamp}.png`);

    // Call ComfyUI img2img
    const client = getComfyUIClient();
    const result = await client.img2img({
      prompt: options.instruction,
      negative_prompt: options.negativePrompt,
      source_image: sourceGen.localPath,
      denoising_strength: options.denoisingStrength ?? 0.4, // Lower for edits to preserve more
      width: sourceGen.width,
      height: sourceGen.height,
      steps: sourceGen.steps,
      cfg_scale: sourceGen.cfg,
      sampler: sourceGen.sampler,
      model: sourceGen.model,
      seed: options.seed ?? Math.floor(Math.random() * 2147483647),
      loras: sourceGen.loras,
      output_path: outputPath,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Create new generation record
    const now = new Date();
    const [newGen] = await this.db
      .insert(generatedImages)
      .values({
        panelId: sourceGen.panelId,
        localPath: result.localPath ?? outputPath,
        seed: result.seed ?? options.seed ?? 0,
        prompt: `[EDIT] ${options.instruction}`,
        negativePrompt: options.negativePrompt ?? sourceGen.negativePrompt ?? "",
        model: sourceGen.model,
        loras: sourceGen.loras,
        steps: sourceGen.steps,
        cfg: sourceGen.cfg,
        sampler: sourceGen.sampler,
        scheduler: sourceGen.scheduler ?? "normal",
        width: sourceGen.width,
        height: sourceGen.height,
        variantStrategy: "custom",
        variantIndex: null,
        usedIPAdapter: false,
        usedControlNet: false,
        isSelected: false,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      success: true,
      generatedImage: newGen,
      localPath: result.localPath ?? outputPath,
    };
  }

  /**
   * Generate a mask from a preset
   *
   * Uses semantic segmentation or detection to create masks for common regions.
   */
  async generateMask(
    options: MaskGenerationOptions
  ): Promise<{ success: boolean; maskPath?: string; error?: string }> {
    try {
      // Ensure output directory exists
      await fs.mkdir(path.dirname(options.outputPath), { recursive: true });

      // Use ControlNet semantic segmentation to generate mask
      // For now, we'll use the preprocessor to extract regions
      const stack = getControlNetStack();

      // Map preset to detection approach
      // Note: This is a simplified implementation
      // A full implementation would use actual segmentation models
      const controlType = this.getControlTypeForPreset(options.preset);

      if (!controlType) {
        // For presets we can't auto-detect, return an error
        // User should provide a custom mask
        return {
          success: false,
          error: `Auto-mask generation not yet supported for preset: ${options.preset}. Please provide a custom mask.`,
        };
      }

      const result = await stack.preprocess(
        options.sourceImagePath,
        controlType,
        options.outputPath
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // TODO: Post-process the mask (expand, feather)
      // This would require image processing library like sharp

      return {
        success: true,
        maskPath: result.localPath ?? options.outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate mask",
      };
    }
  }

  /**
   * List available mask presets with descriptions
   */
  listMaskPresets(): Array<{ preset: MaskPreset; description: string; autoSupported: boolean }> {
    return [
      { preset: "hands", description: "Both hands region", autoSupported: false },
      { preset: "left_hand", description: "Left hand only", autoSupported: false },
      { preset: "right_hand", description: "Right hand only", autoSupported: false },
      { preset: "face", description: "Face region", autoSupported: true },
      { preset: "eyes", description: "Eyes region only", autoSupported: false },
      { preset: "mouth", description: "Mouth region only", autoSupported: false },
      { preset: "background", description: "Everything except the subject", autoSupported: true },
      { preset: "foreground", description: "Subject only (inverse of background)", autoSupported: true },
      { preset: "clothing", description: "Clothing/outfit region", autoSupported: false },
    ];
  }

  /**
   * Map preset to ControlNet type for detection
   */
  private getControlTypeForPreset(preset: MaskPreset): "openpose" | "depth" | "semantic_seg" | null {
    switch (preset) {
      case "face":
        return "openpose"; // OpenPose includes face detection
      case "background":
      case "foreground":
        return "depth"; // Depth can separate foreground/background
      default:
        return null; // Not auto-supported
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: InpaintingService | null = null;

export function getInpaintingService(): InpaintingService {
  if (!instance) {
    instance = new InpaintingService();
  }
  return instance;
}

export function resetInpaintingService(): void {
  instance = null;
}
