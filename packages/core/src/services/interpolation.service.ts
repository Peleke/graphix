/**
 * Panel Interpolation Service
 *
 * Generate in-between panels from keyframe panels.
 * Combines pose interpolation with identity preservation.
 */

import { eq } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  panels,
  generatedImages,
  storyboards,
  type Panel,
  type GeneratedImage,
  type Storyboard,
} from "../db/index.js";
import { getPoseLibraryService } from "./pose-library.service.js";
import { getControlNetStack } from "../generation/controlnet-stack.js";
import { getIPAdapter } from "../generation/ip-adapter.js";
import { getComfyUIClient } from "../generation/comfyui-client.js";
import * as path from "path";
import * as fs from "fs/promises";

// ============================================================================
// Types
// ============================================================================

export type EasingFunction = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface InterpolationOptions {
  /** ID of the first (start) panel */
  panelAId: string;
  /** ID of the second (end) panel */
  panelBId: string;
  /** Number of in-between panels to generate */
  count: number;
  /** Output directory for generated images */
  outputDir: string;
  /** Use IP-Adapter to maintain character identity */
  maintainIdentity?: boolean;
  /** Interpolate pose keypoints between panels */
  blendPose?: boolean;
  /** Easing function for interpolation */
  easing?: EasingFunction;
  /** Prompt to use for all interpolated panels (or blend from A and B) */
  prompt?: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Generation settings */
  model?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  seed?: number;
}

export interface InterpolationResult {
  success: boolean;
  /** Generated intermediate panels */
  panels: Array<{
    index: number;
    factor: number; // 0-1 position between A and B
    generation?: GeneratedImage;
    localPath?: string;
    error?: string;
  }>;
  /** Source panel info */
  panelA?: Panel;
  panelB?: Panel;
  error?: string;
}

// ============================================================================
// Easing Functions
// ============================================================================

function applyEasing(t: number, easing: EasingFunction): number {
  switch (easing) {
    case "linear":
      return t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

// ============================================================================
// Service
// ============================================================================

export class InterpolationService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Generate interpolated panels between two keyframes
   */
  async interpolate(options: InterpolationOptions): Promise<InterpolationResult> {
    const { panelAId, panelBId, count, outputDir, easing = "linear" } = options;

    // Get source panels
    const [panelA] = await this.db.select().from(panels).where(eq(panels.id, panelAId));
    const [panelB] = await this.db.select().from(panels).where(eq(panels.id, panelBId));

    if (!panelA) {
      return { success: false, panels: [], error: `Panel A not found: ${panelAId}` };
    }
    if (!panelB) {
      return { success: false, panels: [], error: `Panel B not found: ${panelBId}` };
    }

    // Get selected outputs (source images for interpolation)
    const generationA = panelA.selectedOutputId
      ? await this.db
          .select()
          .from(generatedImages)
          .where(eq(generatedImages.id, panelA.selectedOutputId))
          .then((r) => r[0])
      : null;

    const generationB = panelB.selectedOutputId
      ? await this.db
          .select()
          .from(generatedImages)
          .where(eq(generatedImages.id, panelB.selectedOutputId))
          .then((r) => r[0])
      : null;

    if (!generationA) {
      return { success: false, panels: [], panelA, panelB, error: "Panel A has no selected output" };
    }
    if (!generationB) {
      return { success: false, panels: [], panelA, panelB, error: "Panel B has no selected output" };
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Extract poses from both panels (if blendPose enabled)
    let poseA: string | null = null;
    let poseB: string | null = null;

    if (options.blendPose !== false) {
      const poseService = getPoseLibraryService();
      const controlNet = getControlNetStack();

      // Extract pose from panel A
      const poseAPath = path.join(outputDir, `pose_A_${Date.now()}.png`);
      const poseAResult = await controlNet.preprocess(generationA.localPath, "openpose", poseAPath);
      if (poseAResult.success) {
        poseA = poseAResult.localPath ?? poseAPath;
      }

      // Extract pose from panel B
      const poseBPath = path.join(outputDir, `pose_B_${Date.now()}.png`);
      const poseBResult = await controlNet.preprocess(generationB.localPath, "openpose", poseBPath);
      if (poseBResult.success) {
        poseB = poseBResult.localPath ?? poseBPath;
      }
    }

    // Calculate interpolation factors
    const factors: number[] = [];
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1); // Evenly space between 0 and 1 (exclusive)
      factors.push(applyEasing(t, easing));
    }

    // Generate intermediate panels
    const results: InterpolationResult["panels"] = [];
    const client = getComfyUIClient();
    const ipAdapter = getIPAdapter();

    // Build base prompt
    const basePrompt =
      options.prompt ??
      this.blendPrompts(generationA.prompt, generationB.prompt, 0.5);
    const negativePrompt =
      options.negativePrompt ??
      generationA.negativePrompt ??
      "bad quality, blurry, deformed";

    for (let i = 0; i < factors.length; i++) {
      const factor = factors[i];
      const index = i + 1;

      try {
        const outputPath = path.join(outputDir, `interp_${index}_${Date.now()}.png`);

        // Blend prompt based on factor
        const interpolatedPrompt = options.prompt
          ? options.prompt
          : this.blendPrompts(generationA.prompt, generationB.prompt, factor);

        // For now, we use the pose that's closer to the current factor
        // A full implementation would actually blend the pose skeletons
        const controlPose = factor < 0.5 ? poseA : poseB;

        // Build generation request
        let result;

        if (options.maintainIdentity) {
          // Use IP-Adapter to maintain character identity
          // Note: Combined IP-Adapter + ControlNet not yet supported via comfyui-mcp
          // IP-Adapter will preserve identity; pose blending is approximate through prompt
          result = await ipAdapter.generateWithIdentity({
            prompt: interpolatedPrompt,
            negativePrompt,
            referenceImages: [generationA.localPath, generationB.localPath],
            strength: 0.7,
            model: options.model ?? generationA.model,
            width: generationA.width,
            height: generationA.height,
            steps: options.steps ?? generationA.steps,
            cfgScale: options.cfg ?? generationA.cfg,
            sampler: options.sampler ?? generationA.sampler,
            seed: options.seed ? options.seed + index : undefined,
            outputPath,
          });
        } else if (controlPose) {
          // Use ControlNet pose without IP-Adapter
          const controlNet = getControlNetStack();
          result = await controlNet.generate({
            prompt: interpolatedPrompt,
            negativePrompt,
            controls: [{ type: "openpose", image: controlPose, strength: 0.8 }],
            model: options.model ?? generationA.model,
            width: generationA.width,
            height: generationA.height,
            steps: options.steps ?? generationA.steps,
            cfgScale: options.cfg ?? generationA.cfg,
            sampler: options.sampler ?? generationA.sampler,
            seed: options.seed ? options.seed + index : undefined,
            outputPath,
          });
        } else {
          // Simple img2img blend
          result = await client.img2img({
            prompt: interpolatedPrompt,
            negative_prompt: negativePrompt,
            source_image: factor < 0.5 ? generationA.localPath : generationB.localPath,
            denoising_strength: 0.5 + Math.abs(factor - 0.5) * 0.3, // More change in middle
            model: options.model ?? generationA.model,
            width: generationA.width,
            height: generationA.height,
            steps: options.steps ?? generationA.steps,
            cfg_scale: options.cfg ?? generationA.cfg,
            sampler: options.sampler ?? generationA.sampler,
            seed: options.seed ? options.seed + index : undefined,
            output_path: outputPath,
          });
        }

        if (result.success) {
          // Create generation record
          const now = new Date();
          const [generation] = await this.db
            .insert(generatedImages)
            .values({
              panelId: panelA.id, // Associate with source panel
              localPath: result.localPath ?? outputPath,
              seed: result.seed ?? options.seed ?? 0,
              prompt: `[INTERP ${index}/${count}] ${interpolatedPrompt}`,
              negativePrompt: negativePrompt ?? "",
              model: options.model ?? generationA.model,
              loras: generationA.loras,
              steps: options.steps ?? generationA.steps,
              cfg: options.cfg ?? generationA.cfg,
              sampler: options.sampler ?? generationA.sampler,
              scheduler: generationA.scheduler ?? "normal",
              width: generationA.width,
              height: generationA.height,
              variantStrategy: "interpolation",
              variantIndex: index,
              usedIPAdapter: options.maintainIdentity ?? false,
              usedControlNet: !!controlPose,
              controlNetType: controlPose ? "openpose" : null,
              isSelected: false,
              isFavorite: false,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          results.push({
            index,
            factor,
            generation,
            localPath: result.localPath ?? outputPath,
          });
        } else {
          results.push({
            index,
            factor,
            error: result.error ?? "Generation failed",
          });
        }
      } catch (error) {
        results.push({
          index,
          factor,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: results.some((r) => !r.error),
      panels: results,
      panelA,
      panelB,
    };
  }

  /**
   * Blend two prompts based on factor
   *
   * Simple approach: use unique terms from both, weighted by factor
   */
  private blendPrompts(promptA: string, promptB: string, factor: number): string {
    const termsA = new Set(promptA.split(/[,]+/).map((t) => t.trim()).filter(Boolean));
    const termsB = new Set(promptB.split(/[,]+/).map((t) => t.trim()).filter(Boolean));

    // Common terms (keep these)
    const common = [...termsA].filter((t) => termsB.has(t));

    // Unique terms from A (weight by 1-factor)
    const uniqueA = [...termsA].filter((t) => !termsB.has(t));

    // Unique terms from B (weight by factor)
    const uniqueB = [...termsB].filter((t) => !termsA.has(t));

    // For a simple blend, include all common terms
    // and a mix of unique terms based on factor
    const result = [...common];

    // Include unique terms based on factor threshold
    if (factor < 0.7) {
      result.push(...uniqueA);
    }
    if (factor > 0.3) {
      result.push(...uniqueB);
    }

    return result.join(", ");
  }

  /**
   * Get suggested count based on panel distance
   */
  suggestCount(options: {
    panelAPosition: number;
    panelBPosition: number;
    framesPerSecond?: number;
    durationSeconds?: number;
  }): number {
    const fps = options.framesPerSecond ?? 24;
    const duration = options.durationSeconds ?? 1;
    const positionDiff = Math.abs(options.panelBPosition - options.panelAPosition);

    // Base suggestion on panel gap and desired smoothness
    // More panels for larger gaps
    const baseSuggestion = Math.ceil(fps * duration * positionDiff);

    // Clamp to reasonable range
    return Math.max(1, Math.min(baseSuggestion, 30));
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: InterpolationService | null = null;

export function getInterpolationService(): InterpolationService {
  if (!instance) {
    instance = new InterpolationService();
  }
  return instance;
}

export function resetInterpolationService(): void {
  instance = null;
}
