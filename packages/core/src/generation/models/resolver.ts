/**
 * Model Resolver
 *
 * Smart resolution of compatible models based on checkpoint, control type, and LoRAs.
 * Handles the compatibility matrix between model families.
 */

import type {
  ControlNetCompatibilityResult,
  ControlNetEntry,
  CheckpointEntry,
  FullCompatibilityResult,
  ModelFamily,
  LoraEntry,
} from "./types.js";
import type { ControlType } from "../controlnet-stack.js";
import {
  CHECKPOINT_CATALOG,
  getCheckpoint,
  inferFamily,
} from "./checkpoint-catalog.js";
import {
  CONTROLNET_CATALOG,
  findBestControlNet,
  getUnionControlMode,
  listControlNetsByFamily,
} from "./controlnet-catalog.js";
import {
  getCompatibleLoras,
  buildLoraStack,
  suggestLoras,
  getLora,
  listLorasByFamily,
  listLorasByCategory,
  getTriggerWords,
  getRecommendedStack,
} from "./lora-catalog.js";

// ============================================================================
// Preprocessor Mapping
// ============================================================================

/**
 * Default preprocessors for each control type
 */
const DEFAULT_PREPROCESSORS: Record<ControlType, string> = {
  canny: "canny",
  depth: "depth_midas",
  openpose: "openpose",
  scribble: "scribble",
  lineart: "lineart",
  softedge: "softedge",
  tile: "tile",
  blur: "blur",
  normalbae: "normalbae",
  semantic_seg: "semantic_seg",
  qrcode: "qrcode",
  ip2p: "ip2p",
  inpaint: "inpaint",
  mlsd: "mlsd",
  shuffle: "shuffle",
  reference: "reference",
};

// ============================================================================
// Model Resolver Class
// ============================================================================

export class ModelResolver {
  /**
   * Resolve the best ControlNet for a checkpoint and control type
   */
  resolveControlNet(
    checkpoint: string,
    controlType: ControlType
  ): ControlNetCompatibilityResult {
    // Get checkpoint info
    const ckpt = this.getCheckpointInfo(checkpoint);
    if (!ckpt) {
      // Try to infer family from filename
      const inferredFamily = inferFamily(checkpoint);
      if (!inferredFamily) {
        return {
          compatible: false,
          warnings: [],
          error: `Unknown checkpoint: ${checkpoint}. Add it to the catalog or use a known model.`,
        };
      }
      // Create a temporary entry for the inferred family
      return this.resolveForFamily(inferredFamily as ModelFamily, controlType);
    }

    return this.resolveForFamily(ckpt.family, controlType);
  }

  /**
   * Resolve ControlNet for a specific model family
   */
  private resolveForFamily(
    family: ModelFamily,
    controlType: ControlType
  ): ControlNetCompatibilityResult {
    const warnings: string[] = [];

    // Find compatible ControlNet
    const controlnet = findBestControlNet(family, controlType);

    if (!controlnet) {
      return {
        compatible: false,
        warnings,
        error: `No ControlNet found for ${controlType} compatible with ${family} models.`,
      };
    }

    // Build result
    const result: ControlNetCompatibilityResult = {
      compatible: true,
      controlnet: controlnet.filename,
      preprocessor:
        controlnet.preprocessor ?? DEFAULT_PREPROCESSORS[controlType],
      warnings,
    };

    // Add control mode for Union models
    if (controlnet.isUnion) {
      const mode = getUnionControlMode(controlType);
      if (mode >= 0) {
        result.controlMode = String(mode);
      } else {
        warnings.push(
          `Control type ${controlType} may not be fully supported by Union model.`
        );
      }
    }

    // Add warning if using legacy dedicated model
    if (!controlnet.isUnion && family !== "sd15") {
      warnings.push(
        `Using dedicated ${controlType} model. Consider upgrading to ControlNet Union.`
      );
    }

    return result;
  }

  /**
   * Get checkpoint entry, handling unknown models
   */
  getCheckpointInfo(checkpoint: string): CheckpointEntry | undefined {
    return getCheckpoint(checkpoint);
  }

  /**
   * Get model family for a checkpoint
   */
  getFamily(checkpoint: string): ModelFamily | null {
    const ckpt = getCheckpoint(checkpoint);
    if (ckpt) return ckpt.family;

    // Try to infer
    const inferred = inferFamily(checkpoint);
    return inferred as ModelFamily | null;
  }

  /**
   * Check if a checkpoint is compatible with a control type
   */
  isCompatible(checkpoint: string, controlType: ControlType): boolean {
    const result = this.resolveControlNet(checkpoint, controlType);
    return result.compatible;
  }

  /**
   * List all control types available for a checkpoint
   */
  listAvailableControlTypes(checkpoint: string): ControlType[] {
    const family = this.getFamily(checkpoint);
    if (!family) return [];

    const controlnets = listControlNetsByFamily(family);
    const types = new Set<ControlType>();

    for (const cn of controlnets) {
      for (const type of cn.controlTypes) {
        types.add(type);
      }
    }

    return Array.from(types);
  }

  /**
   * Get full compatibility info for a checkpoint
   */
  getFullCompatibility(checkpoint: string): FullCompatibilityResult | null {
    const ckpt = this.getCheckpointInfo(checkpoint);
    if (!ckpt) {
      // Try inference
      const family = this.getFamily(checkpoint);
      if (!family) return null;

      // Create synthetic entry
      const syntheticCkpt: CheckpointEntry = {
        filename: checkpoint,
        family,
        type: "base",
        nsfw: false,
        compatibleLoraFamilies: [family],
      };

      return this.buildFullCompatibility(syntheticCkpt);
    }

    return this.buildFullCompatibility(ckpt);
  }

  /**
   * Build full compatibility result for a checkpoint
   */
  private buildFullCompatibility(
    ckpt: CheckpointEntry
  ): FullCompatibilityResult {
    const warnings: string[] = [];

    // Get compatible ControlNets
    const controlnets = listControlNetsByFamily(ckpt.family);

    // Get compatible LoRAs
    const loras = listLorasByFamily(ckpt.family);

    // Add warnings
    if (controlnets.length === 0) {
      warnings.push(`No ControlNets found for ${ckpt.family} family.`);
    }

    const hasUnion = controlnets.some((cn) => cn.isUnion);
    if (!hasUnion && ckpt.family !== "sd15") {
      warnings.push(
        `No Union model found for ${ckpt.family}. Consider downloading ControlNet Union.`
      );
    }

    return {
      checkpoint: ckpt,
      controlnets,
      loras,
      warnings,
    };
  }

  /**
   * Validate that a specific ControlNet works with a checkpoint
   */
  validateControlNet(
    checkpoint: string,
    controlnetFilename: string
  ): { valid: boolean; error?: string; warnings: string[] } {
    const family = this.getFamily(checkpoint);
    if (!family) {
      return {
        valid: false,
        error: `Unknown checkpoint: ${checkpoint}`,
        warnings: [],
      };
    }

    const cn = CONTROLNET_CATALOG[controlnetFilename];
    if (!cn) {
      return {
        valid: false,
        error: `Unknown ControlNet: ${controlnetFilename}`,
        warnings: [],
      };
    }

    if (!cn.compatibleFamilies.includes(family)) {
      return {
        valid: false,
        error: `ControlNet ${cn.name} is not compatible with ${family} models. Compatible families: ${cn.compatibleFamilies.join(", ")}`,
        warnings: [],
      };
    }

    return {
      valid: true,
      warnings: [],
    };
  }

  // ==========================================================================
  // LoRA Resolution Methods
  // ==========================================================================

  /**
   * Get all LoRAs compatible with a checkpoint
   */
  getCompatibleLoras(checkpoint: string): LoraEntry[] {
    const family = this.getFamily(checkpoint);
    if (!family) return [];
    return getCompatibleLoras(checkpoint, family);
  }

  /**
   * Suggest LoRAs for a checkpoint based on categories
   */
  suggestLoras(
    checkpoint: string,
    categories?: ("style" | "character" | "quality" | "pose" | "concept")[]
  ): LoraEntry[] {
    return suggestLoras(checkpoint, categories);
  }

  /**
   * Get recommended LoRA stack for a use case
   */
  getRecommendedLoraStack(
    checkpoint: string,
    useCase: "comic" | "realistic" | "anime" | "general"
  ): LoraEntry[] {
    return getRecommendedStack(checkpoint, useCase);
  }

  /**
   * Validate that a LoRA is compatible with a checkpoint
   */
  validateLora(
    checkpoint: string,
    loraFilename: string
  ): { valid: boolean; error?: string; warnings: string[] } {
    const family = this.getFamily(checkpoint);
    if (!family) {
      return {
        valid: false,
        error: `Unknown checkpoint: ${checkpoint}`,
        warnings: [],
      };
    }

    const lora = getLora(loraFilename);
    if (!lora) {
      // Unknown LoRA - allow with warning
      return {
        valid: true,
        warnings: [`LoRA ${loraFilename} not in catalog. Compatibility unknown.`],
      };
    }

    if (!lora.compatibleFamilies.includes(family)) {
      return {
        valid: false,
        error: `LoRA ${lora.name} is not compatible with ${family} models. Compatible families: ${lora.compatibleFamilies.join(", ")}`,
        warnings: [],
      };
    }

    return {
      valid: true,
      warnings: [],
    };
  }

  /**
   * Build a properly ordered LoRA stack from filenames
   */
  buildLoraStack(loraFilenames: string[]): LoraEntry[] {
    const loras = loraFilenames
      .map((filename) => getLora(filename))
      .filter((lora): lora is LoraEntry => lora !== undefined);
    return buildLoraStack(loras);
  }

  /**
   * Get trigger words for LoRAs (for prompt injection)
   */
  getTriggerWords(loraFilenames: string[]): string[] {
    return getTriggerWords(loraFilenames);
  }

  /**
   * Get LoRA info by filename
   */
  getLoraInfo(filename: string): LoraEntry | undefined {
    return getLora(filename);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let resolverInstance: ModelResolver | null = null;

/**
 * Get the singleton ModelResolver instance
 */
export function getModelResolver(): ModelResolver {
  if (!resolverInstance) {
    resolverInstance = new ModelResolver();
  }
  return resolverInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetModelResolver(): void {
  resolverInstance = null;
}
