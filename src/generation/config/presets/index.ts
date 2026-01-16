/**
 * Presets Index
 *
 * Re-exports all preset modules for convenient access.
 */

// Size presets
export {
  SIZE_PRESETS,
  listSizePresets,
  getSizePreset,
  findClosestPreset,
  findPresetsForUseCase,
  getPresetsByCategory,
} from "./sizes.js";

// Quality presets
export {
  QUALITY_PRESETS,
  getQualityPreset,
  getQualityPresetSafe,
  listQualityPresets,
  getQualityPresetsBySpeed,
  estimateRelativeTime,
  recommendQualityPreset,
} from "./quality.js";

// Model presets
export {
  MODEL_PRESETS,
  getModelPreset,
  detectModelFamily,
  listModelFamilies,
  modelFamilyToDimensionKey,
  supportsNegativePrompt,
  getRecommendedCfgRange,
} from "./models.js";
