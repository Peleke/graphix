/**
 * Default Configuration Strategy
 *
 * Backward-compatible strategy that mimics the original hard-coded behavior.
 * Use this when you want predictable, consistent defaults without smart sizing.
 */

import { BaseConfigurationStrategy } from "./strategy.js";
import { getSizePreset, findClosestPreset, SIZE_PRESETS } from "../presets/sizes.js";
import { getQualityPresetSafe, QUALITY_PRESETS } from "../presets/quality.js";
import { getModelPreset } from "../presets/models.js";
import { config } from "../../../config/index.js";
import type {
  ConfigResolutionOptions,
  ResolvedGenerationConfig,
  ModelFamily,
  TargetResolution,
  ConfigSource,
} from "../types.js";

/**
 * Default Configuration Strategy
 *
 * Provides backward-compatible defaults:
 * - Width: 768
 * - Height: 1024
 * - Steps: 28
 * - CFG: 7
 * - Sampler: euler_ancestral
 * - Scheduler: normal
 *
 * This strategy does NOT do smart slot-aware sizing.
 */
export class DefaultConfigurationStrategy extends BaseConfigurationStrategy {
  readonly id = "default";
  readonly name = "Default Strategy (Backward Compatible)";

  // Default values matching original hard-coded behavior
  private readonly DEFAULT_WIDTH = 768;
  private readonly DEFAULT_HEIGHT = 1024;
  private readonly DEFAULT_STEPS = 28;
  private readonly DEFAULT_CFG = 7;
  private readonly DEFAULT_SAMPLER = "euler_ancestral";
  private readonly DEFAULT_SCHEDULER = "normal";

  async resolve(
    options: ConfigResolutionOptions
  ): Promise<ResolvedGenerationConfig> {
    // Track sources for debugging
    const sources: ResolvedGenerationConfig["sources"] = {
      width: "global",
      height: "global",
      steps: "global",
      cfg: "global",
      sampler: "global",
      model: "global",
    };

    // Determine model and family
    const model = options.overrides?.model ?? config.comfyui.defaultModel;
    const modelFamily = this.detectModelFamily(model);
    sources.model = options.overrides?.model ? "explicit" : "env";

    // Get model-specific defaults
    const modelPreset = getModelPreset(modelFamily);

    // Calculate dimensions
    let width = this.DEFAULT_WIDTH;
    let height = this.DEFAULT_HEIGHT;
    let sizePresetUsed: string | undefined;

    // Priority: explicit override > size preset > default
    if (
      options.overrides?.width !== undefined &&
      options.overrides?.height !== undefined
    ) {
      width = options.overrides.width;
      height = options.overrides.height;
      sources.width = "explicit";
      sources.height = "explicit";
    } else if (options.sizePreset) {
      const preset = getSizePreset(options.sizePreset);
      if (preset) {
        const dimKey = this.modelFamilyToDimensionKey(modelFamily);
        width = preset.dimensions[dimKey].width;
        height = preset.dimensions[dimKey].height;
        sizePresetUsed = preset.id;
        sources.width = "preset";
        sources.height = "preset";
      }
    }

    const aspectRatio = width / height;

    // Get quality settings
    const qualityPreset = getQualityPresetSafe(options.qualityPreset);
    const qualityPresetUsed = options.qualityPreset;

    // Resolve generation parameters
    // Priority: explicit override > quality preset > model preset > default
    let steps = this.DEFAULT_STEPS;
    let cfg = this.DEFAULT_CFG;
    let sampler = this.DEFAULT_SAMPLER;
    let scheduler = this.DEFAULT_SCHEDULER;

    if (options.overrides?.steps !== undefined) {
      steps = options.overrides.steps;
      sources.steps = "explicit";
    } else if (options.qualityPreset) {
      steps = qualityPreset.steps;
      sources.steps = "preset";
    } else {
      steps = modelPreset.defaultSteps;
      sources.steps = "global";
    }

    if (options.overrides?.cfg !== undefined) {
      cfg = options.overrides.cfg;
      sources.cfg = "explicit";
    } else if (options.qualityPreset) {
      cfg = qualityPreset.cfg;
      sources.cfg = "preset";
    } else {
      cfg = modelPreset.cfg;
      sources.cfg = "global";
    }

    if (options.overrides?.sampler) {
      sampler = options.overrides.sampler;
      sources.sampler = "explicit";
    } else if (options.qualityPreset) {
      sampler = qualityPreset.sampler;
      sources.sampler = "preset";
    } else {
      sampler = modelPreset.sampler;
      sources.sampler = "global";
    }

    if (options.overrides?.scheduler) {
      scheduler = options.overrides.scheduler;
    } else if (options.qualityPreset) {
      scheduler = qualityPreset.scheduler;
    } else {
      scheduler = modelPreset.scheduler;
    }

    return {
      width,
      height,
      aspectRatio,
      sizePresetUsed,
      steps,
      cfg,
      sampler,
      scheduler,
      model,
      modelFamily,
      negativePrompt: options.overrides?.negativePrompt ?? "",
      loras: options.overrides?.loras ?? [],
      qualityPresetUsed,
      hiResFix: qualityPreset.hiResFix ?? false,
      upscale: qualityPreset.upscale ?? false,
      sources,
    };
  }

  calculateOptimalSize(
    aspectRatio: number,
    modelFamily: ModelFamily,
    targetResolution: TargetResolution = "medium"
  ): { width: number; height: number; presetId?: string } {
    // Try to find a matching preset first
    const preset = findClosestPreset(aspectRatio, 0.1);

    if (preset) {
      const dimKey = this.modelFamilyToDimensionKey(modelFamily);
      return {
        width: preset.dimensions[dimKey].width,
        height: preset.dimensions[dimKey].height,
        presetId: preset.id,
      };
    }

    // No close preset - calculate custom dimensions
    const targetPixels = this.getTargetPixelCount(modelFamily, targetResolution);
    const dims = this.calculateDimensionsForPixelCount(aspectRatio, targetPixels);

    return {
      width: dims.width,
      height: dims.height,
    };
  }
}

/**
 * Singleton instance of the default strategy
 */
let defaultStrategyInstance: DefaultConfigurationStrategy | null = null;

/**
 * Get the default strategy singleton
 */
export function getDefaultStrategy(): DefaultConfigurationStrategy {
  if (!defaultStrategyInstance) {
    defaultStrategyInstance = new DefaultConfigurationStrategy();
  }
  return defaultStrategyInstance;
}
