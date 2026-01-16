/**
 * Model Presets
 *
 * Default settings optimized for each model family.
 * These represent known-good configurations for specific model architectures.
 */

import type { ModelPreset, ModelFamily } from "../types.js";

/**
 * Model family presets with optimized defaults
 */
export const MODEL_PRESETS: Record<ModelFamily, ModelPreset> = {
  /**
   * Illustrious - Best for anime/stylized content
   *
   * Based on SDXL, optimized for illustration and anime.
   * Excellent with danbooru-style tags and specific LoRAs.
   */
  illustrious: {
    family: "illustrious",
    defaultModel: "illustriousNSFWFrom_gammaUpdate.safetensors",
    cfg: 7,
    sampler: "euler_ancestral",
    scheduler: "normal",
    minSteps: 20,
    defaultSteps: 28,
    supportsNegative: true,
  },

  /**
   * Pony - Furry/anthro specialized
   *
   * SDXL-based, optimized for furry content.
   * Uses specific score tags and quality boosters.
   */
  pony: {
    family: "pony",
    defaultModel: "yiffInHell_yihXXXTended.safetensors",
    cfg: 7,
    sampler: "euler_ancestral",
    scheduler: "normal",
    minSteps: 20,
    defaultSteps: 28,
    supportsNegative: true,
  },

  /**
   * SDXL - General purpose high quality
   *
   * Base SDXL models, good for diverse content.
   * Natural language prompting works well.
   */
  sdxl: {
    family: "sdxl",
    defaultModel: "sdxl_base_1.0.safetensors",
    cfg: 7,
    sampler: "dpmpp_2m_sde",
    scheduler: "karras",
    minSteps: 25,
    defaultSteps: 30,
    supportsNegative: true,
  },

  /**
   * Flux - Latest generation, most flexible
   *
   * Transformer-based, very flexible with prompting.
   * Lower CFG works better. Minimal negative prompt.
   */
  flux: {
    family: "flux",
    cfg: 3.5, // Flux prefers lower CFG
    sampler: "euler",
    scheduler: "simple",
    minSteps: 20,
    defaultSteps: 28,
    supportsNegative: false, // Flux doesn't use negative prompts effectively
  },

  /**
   * SD1.5 - Classic, fast, well-understood
   *
   * Original Stable Diffusion architecture.
   * Fast generation, huge ecosystem of fine-tunes and LoRAs.
   */
  sd15: {
    family: "sd15",
    cfg: 7.5,
    sampler: "euler_ancestral",
    scheduler: "normal",
    minSteps: 20,
    defaultSteps: 30,
    supportsNegative: true,
  },

  /**
   * Realistic - Photorealistic content
   *
   * SDXL-based, optimized for realistic/photographic output.
   * Higher CFG often needed for detail.
   */
  realistic: {
    family: "realistic",
    cfg: 7.5,
    sampler: "dpmpp_2m_sde",
    scheduler: "karras",
    minSteps: 25,
    defaultSteps: 35,
    supportsNegative: true,
  },
};

/**
 * Get model preset by family
 */
export function getModelPreset(family: ModelFamily): ModelPreset {
  return MODEL_PRESETS[family];
}

/**
 * Detect model family from model filename
 *
 * @param modelName - Filename of the model checkpoint
 * @returns Detected model family
 */
export function detectModelFamily(modelName: string): ModelFamily {
  const lower = modelName.toLowerCase();

  // Illustrious variants
  if (
    lower.includes("illustrious") ||
    lower.includes("noob") ||
    lower.includes("wai-")
  ) {
    return "illustrious";
  }

  // Pony/furry models
  if (
    lower.includes("pony") ||
    lower.includes("yiff") ||
    lower.includes("furry") ||
    lower.includes("nova")
  ) {
    return "pony";
  }

  // Flux models
  if (lower.includes("flux")) {
    return "flux";
  }

  // Realistic models
  if (
    lower.includes("realistic") ||
    lower.includes("photon") ||
    lower.includes("real") ||
    lower.includes("photo")
  ) {
    return "realistic";
  }

  // SDXL models
  if (lower.includes("sdxl") || lower.includes("xl")) {
    return "sdxl";
  }

  // Default to SD1.5 for unknown models
  return "sd15";
}

/**
 * List all model families
 */
export function listModelFamilies(): ModelFamily[] {
  return Object.keys(MODEL_PRESETS) as ModelFamily[];
}

/**
 * Get the dimension key for a model family
 *
 * Maps model families to the dimension keys used in size presets.
 * SDXL-based models (illustrious, pony, sdxl, realistic) all use "sdxl" dimensions.
 */
export function modelFamilyToDimensionKey(
  family: ModelFamily
): "sdxl" | "sd15" | "flux" {
  switch (family) {
    case "illustrious":
    case "pony":
    case "sdxl":
    case "realistic":
      return "sdxl";
    case "flux":
      return "flux";
    case "sd15":
    default:
      return "sd15";
  }
}

/**
 * Check if a model family supports negative prompts effectively
 */
export function supportsNegativePrompt(family: ModelFamily): boolean {
  return MODEL_PRESETS[family].supportsNegative;
}

/**
 * Get recommended CFG range for a model family
 */
export function getRecommendedCfgRange(
  family: ModelFamily
): { min: number; max: number; default: number } {
  const preset = MODEL_PRESETS[family];

  switch (family) {
    case "flux":
      return { min: 1, max: 5, default: preset.cfg };
    case "realistic":
      return { min: 5, max: 10, default: preset.cfg };
    default:
      return { min: 4, max: 12, default: preset.cfg };
  }
}
