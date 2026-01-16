/**
 * Slot-Aware Configuration Strategy
 *
 * Intelligently calculates generation sizes based on composition slots.
 * This is the SMART strategy that solves the aspect ratio mismatch.
 */

import { BaseConfigurationStrategy } from "./strategy.js";
import {
  getSizePreset,
  findClosestPreset,
  SIZE_PRESETS,
} from "../presets/sizes.js";
import { getQualityPresetSafe } from "../presets/quality.js";
import { getModelPreset } from "../presets/models.js";
import { getTemplate, PAGE_SIZES } from "../../../composition/templates.js";
import { config } from "../../../config/index.js";
import type {
  ConfigResolutionOptions,
  ResolvedGenerationConfig,
  ModelFamily,
  TargetResolution,
  SlotContext,
} from "../types.js";

/**
 * Slot-Aware Configuration Strategy
 *
 * Calculates optimal generation sizes based on composition slot dimensions.
 * When a slot context is provided, this strategy:
 *
 * 1. Calculates the slot's pixel dimensions from template + page size
 * 2. Determines the slot's aspect ratio
 * 3. Finds the closest size preset for that aspect ratio
 * 4. Uses optimal dimensions for the detected model family
 *
 * This ensures generated images match slot aspect ratios, minimizing cropping.
 */
export class SlotAwareConfigurationStrategy extends BaseConfigurationStrategy {
  readonly id = "slot-aware";
  readonly name = "Slot-Aware Strategy";

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

    // Calculate dimensions with smart priority
    let width = 768;
    let height = 1024;
    let aspectRatio = 0.75;
    let sizePresetUsed: string | undefined;

    // Priority: explicit override > size preset > slot calculation > default
    if (
      options.overrides?.width !== undefined &&
      options.overrides?.height !== undefined
    ) {
      // Explicit dimensions always win
      width = options.overrides.width;
      height = options.overrides.height;
      aspectRatio = width / height;
      sources.width = "explicit";
      sources.height = "explicit";
    } else if (options.sizePreset) {
      // Size preset takes priority over slot
      const preset = getSizePreset(options.sizePreset);
      if (preset) {
        const dimKey = this.modelFamilyToDimensionKey(modelFamily);
        width = preset.dimensions[dimKey].width;
        height = preset.dimensions[dimKey].height;
        aspectRatio = preset.aspectRatio;
        sizePresetUsed = preset.id;
        sources.width = "preset";
        sources.height = "preset";
      }
    } else if (options.slot) {
      // SMART: Calculate optimal size from slot context
      const slotSize = this.calculateSlotSize(options.slot, modelFamily);
      width = slotSize.width;
      height = slotSize.height;
      aspectRatio = width / height;
      sizePresetUsed = slotSize.presetId;
      sources.width = "slot";
      sources.height = "slot";
    }

    // Get quality settings
    const qualityPreset = getQualityPresetSafe(options.qualityPreset);
    const qualityPresetUsed = options.qualityPreset;

    // Resolve generation parameters
    let steps: number;
    let cfg: number;
    let sampler: string;
    let scheduler: string;

    if (options.overrides?.steps !== undefined) {
      steps = options.overrides.steps;
      sources.steps = "explicit";
    } else if (options.qualityPreset) {
      steps = qualityPreset.steps;
      sources.steps = "preset";
    } else {
      steps = modelPreset.defaultSteps;
    }

    if (options.overrides?.cfg !== undefined) {
      cfg = options.overrides.cfg;
      sources.cfg = "explicit";
    } else if (options.qualityPreset) {
      cfg = qualityPreset.cfg;
      sources.cfg = "preset";
    } else {
      cfg = modelPreset.cfg;
    }

    if (options.overrides?.sampler) {
      sampler = options.overrides.sampler;
      sources.sampler = "explicit";
    } else if (options.qualityPreset) {
      sampler = qualityPreset.sampler;
      sources.sampler = "preset";
    } else {
      sampler = modelPreset.sampler;
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
    // Try to find a matching preset first (within 10% tolerance)
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

    // Validate the calculated dimensions
    const validation = this.validateDimensions(
      dims.width,
      dims.height,
      modelFamily
    );
    if (!validation.valid) {
      // Fall back to closest preset even if it's not that close
      const fallback = findClosestPreset(aspectRatio, 0.5);
      if (fallback) {
        const dimKey = this.modelFamilyToDimensionKey(modelFamily);
        return {
          width: fallback.dimensions[dimKey].width,
          height: fallback.dimensions[dimKey].height,
          presetId: fallback.id,
        };
      }
    }

    return {
      width: dims.width,
      height: dims.height,
    };
  }

  /**
   * Calculate optimal generation size from slot context
   *
   * This is the key intelligence of this strategy. It:
   * 1. Gets the template definition
   * 2. Gets the page size definition
   * 3. Calculates the slot's pixel dimensions
   * 4. Determines the slot's aspect ratio
   * 5. Finds optimal generation dimensions for that aspect ratio
   */
  private calculateSlotSize(
    slot: SlotContext,
    modelFamily: ModelFamily
  ): { width: number; height: number; presetId?: string } {
    // Use cached aspect ratio if available
    if (slot.aspectRatio !== undefined) {
      return this.calculateOptimalSize(slot.aspectRatio, modelFamily);
    }

    // Get template and page size
    const template = getTemplate(slot.templateId);
    const pageSize =
      PAGE_SIZES[slot.pageSizePreset ?? "comic_standard"] ??
      PAGE_SIZES.comic_standard;

    if (!template) {
      // Template not found - fall back to default portrait
      console.warn(
        `Template not found: ${slot.templateId}, using default dimensions`
      );
      return { width: 768, height: 1024, presetId: "portrait_3x4" };
    }

    // Find the slot in template
    const templateSlot = template.slots.find((s) => s.id === slot.slotId);
    if (!templateSlot) {
      // Slot not found - fall back to default portrait
      console.warn(
        `Slot not found: ${slot.slotId} in template ${slot.templateId}, using default dimensions`
      );
      return { width: 768, height: 1024, presetId: "portrait_3x4" };
    }

    // Calculate slot dimensions in pixels
    // Template slots use percentages (0-100)
    const slotWidthPx = (templateSlot.width / 100) * pageSize.width;
    const slotHeightPx = (templateSlot.height / 100) * pageSize.height;
    const slotAspect = slotWidthPx / slotHeightPx;

    // Get optimal size for this aspect ratio
    return this.calculateOptimalSize(slotAspect, modelFamily);
  }

  /**
   * Calculate all slot sizes for a template
   *
   * Useful for pre-planning generation sizes for an entire page.
   */
  calculateAllSlotSizes(
    templateId: string,
    pageSizePreset: string = "comic_standard",
    modelFamily: ModelFamily = "pony"
  ): Map<
    string,
    { width: number; height: number; aspectRatio: number; presetId?: string }
  > {
    const result = new Map();

    const template = getTemplate(templateId);
    if (!template) {
      return result;
    }

    for (const slot of template.slots) {
      const size = this.calculateSlotSize(
        {
          templateId,
          slotId: slot.id,
          pageSizePreset,
        },
        modelFamily
      );

      result.set(slot.id, {
        ...size,
        aspectRatio: size.width / size.height,
      });
    }

    return result;
  }

  /**
   * Recommend generation sizes for a template
   *
   * Returns a summary of recommended sizes for all slots in a template,
   * grouped by preset to minimize unique generation configurations.
   */
  recommendSizesForTemplate(
    templateId: string,
    pageSizePreset: string = "comic_standard",
    modelFamily: ModelFamily = "pony"
  ): {
    byPreset: Map<string, string[]>; // presetId -> slotIds
    bySlot: Map<string, { width: number; height: number; presetId?: string }>;
    uniquePresets: string[];
  } {
    const bySlot = this.calculateAllSlotSizes(
      templateId,
      pageSizePreset,
      modelFamily
    );
    const byPreset = new Map<string, string[]>();

    for (const [slotId, size] of bySlot) {
      const presetKey = size.presetId ?? `custom_${size.width}x${size.height}`;
      if (!byPreset.has(presetKey)) {
        byPreset.set(presetKey, []);
      }
      byPreset.get(presetKey)!.push(slotId);
    }

    return {
      byPreset,
      bySlot,
      uniquePresets: Array.from(byPreset.keys()),
    };
  }
}

/**
 * Singleton instance of the slot-aware strategy
 */
let slotAwareStrategyInstance: SlotAwareConfigurationStrategy | null = null;

/**
 * Get the slot-aware strategy singleton
 */
export function getSlotAwareStrategy(): SlotAwareConfigurationStrategy {
  if (!slotAwareStrategyInstance) {
    slotAwareStrategyInstance = new SlotAwareConfigurationStrategy();
  }
  return slotAwareStrategyInstance;
}
