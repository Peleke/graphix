/**
 * Configuration Strategy Base
 *
 * Defines the interface and base class for configuration strategies.
 * Strategies determine how generation configuration is resolved.
 */

import type {
  IConfigurationStrategy,
  ConfigResolutionOptions,
  ResolvedGenerationConfig,
  ModelFamily,
  TargetResolution,
} from "../types.js";
import { detectModelFamily, modelFamilyToDimensionKey } from "../presets/models.js";

/**
 * Base abstract class providing common functionality
 *
 * Extend this class to create new configuration strategies.
 */
export abstract class BaseConfigurationStrategy
  implements IConfigurationStrategy
{
  abstract readonly id: string;
  abstract readonly name: string;

  abstract resolve(
    options: ConfigResolutionOptions
  ): Promise<ResolvedGenerationConfig>;

  abstract calculateOptimalSize(
    aspectRatio: number,
    modelFamily: ModelFamily,
    targetResolution?: TargetResolution
  ): { width: number; height: number; presetId?: string };

  /**
   * Detect model family from model name
   */
  protected detectModelFamily(modelName: string): ModelFamily {
    return detectModelFamily(modelName);
  }

  /**
   * Map model family to dimensions key for size presets
   */
  protected modelFamilyToDimensionKey(
    family: ModelFamily
  ): "sdxl" | "sd15" | "flux" {
    return modelFamilyToDimensionKey(family);
  }

  /**
   * Round a dimension to the nearest multiple of 64
   *
   * SDXL and SD models work best with dimensions divisible by 64.
   */
  protected roundTo64(value: number): number {
    return Math.round(value / 64) * 64;
  }

  /**
   * Calculate dimensions that maintain aspect ratio with target pixel count
   *
   * @param aspectRatio - Desired width/height ratio
   * @param targetPixels - Target total pixels (e.g., 1048576 for 1MP)
   * @returns Dimensions rounded to 64
   */
  protected calculateDimensionsForPixelCount(
    aspectRatio: number,
    targetPixels: number
  ): { width: number; height: number } {
    // height = sqrt(targetPixels / aspectRatio)
    // width = height * aspectRatio
    const height = Math.sqrt(targetPixels / aspectRatio);
    const width = height * aspectRatio;

    return {
      width: this.roundTo64(width),
      height: this.roundTo64(height),
    };
  }

  /**
   * Get target pixel count for a model family and resolution tier
   */
  protected getTargetPixelCount(
    modelFamily: ModelFamily,
    resolution: TargetResolution = "medium"
  ): number {
    const basePixels = {
      sdxl: 1048576, // 1024 * 1024 = 1MP
      sd15: 262144, // 512 * 512 = 0.25MP
      flux: 1048576, // 1MP
    };

    const multipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
    };

    const dimKey = this.modelFamilyToDimensionKey(modelFamily);
    return basePixels[dimKey] * multipliers[resolution];
  }

  /**
   * Validate that dimensions are within acceptable range
   */
  protected validateDimensions(
    width: number,
    height: number,
    modelFamily: ModelFamily
  ): { valid: boolean; reason?: string } {
    const dimKey = this.modelFamilyToDimensionKey(modelFamily);

    // Minimum and maximum dimensions by model class
    const limits = {
      sdxl: { min: 512, max: 2048 },
      sd15: { min: 256, max: 1024 },
      flux: { min: 512, max: 2048 },
    };

    const { min, max } = limits[dimKey];

    if (width < min || height < min) {
      return {
        valid: false,
        reason: `Dimensions too small for ${modelFamily} (min: ${min}px)`,
      };
    }

    if (width > max || height > max) {
      return {
        valid: false,
        reason: `Dimensions too large for ${modelFamily} (max: ${max}px)`,
      };
    }

    // Check total pixels (to prevent OOM)
    const maxPixels = dimKey === "sd15" ? 786432 : 4194304; // 0.75MP or 4MP
    if (width * height > maxPixels) {
      return {
        valid: false,
        reason: `Total pixels exceed maximum for ${modelFamily}`,
      };
    }

    return { valid: true };
  }
}
