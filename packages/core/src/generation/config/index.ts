/**
 * Generation Configuration Module
 *
 * Provides a flexible, strategy-based configuration system for image generation.
 *
 * Key Features:
 * - Size presets with optimal dimensions per model family
 * - Quality presets for different use cases (draft, standard, high, ultra)
 * - Model presets with optimized settings per model family
 * - Strategy pattern for pluggable configuration resolution
 * - Slot-aware sizing for composition-optimized generation
 *
 * Quick Start:
 * ```typescript
 * import { getConfigEngine } from "./generation/config/index.js";
 *
 * const engine = getConfigEngine();
 *
 * // Basic resolution (uses defaults)
 * const config = await engine.resolve({});
 *
 * // With presets
 * const config = await engine.resolve({
 *   sizePreset: "landscape_16x9",
 *   qualityPreset: "high"
 * });
 *
 * // Slot-aware (smart sizing for composition)
 * const config = await engine.resolve({
 *   slot: {
 *     templateId: "six-grid",
 *     slotId: "row1-left",
 *     pageSizePreset: "comic_standard"
 *   }
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Size types
  SizePreset,
  ModelDimensions,

  // Quality types
  QualityPreset,
  QualityPresetId,

  // Model types
  ModelPreset,
  ModelFamily,

  // LoRA types
  LoraConfig,

  // Configuration hierarchy types
  PartialGenerationSettings,
  StoryboardGenerationSettings,
  PanelGenerationSettings,

  // Slot context
  SlotContext,

  // Resolution types
  ConfigSource,
  ResolvedGenerationConfig,
  ConfigResolutionOptions,
  TargetResolution,

  // Strategy interface
  IConfigurationStrategy,
} from "./types.js";

// ============================================================================
// Engine
// ============================================================================

export {
  GenerationConfigEngine,
  getConfigEngine,
  resetConfigEngine,
  createConfigEngine,
} from "./engine.js";

// ============================================================================
// Strategies
// ============================================================================

export {
  BaseConfigurationStrategy,
  DefaultConfigurationStrategy,
  getDefaultStrategy,
  SlotAwareConfigurationStrategy,
  getSlotAwareStrategy,
} from "./strategies/index.js";

// ============================================================================
// Presets
// ============================================================================

// Size presets
export {
  SIZE_PRESETS,
  listSizePresets,
  getSizePreset,
  findClosestPreset,
  findPresetsForUseCase,
  getPresetsByCategory,
} from "./presets/index.js";

// Quality presets
export {
  QUALITY_PRESETS,
  getQualityPreset,
  getQualityPresetSafe,
  listQualityPresets,
  getQualityPresetsBySpeed,
  estimateRelativeTime,
  recommendQualityPreset,
} from "./presets/index.js";

// Model presets
export {
  MODEL_PRESETS,
  getModelPreset,
  detectModelFamily,
  listModelFamilies,
  modelFamilyToDimensionKey,
  supportsNegativePrompt,
  getRecommendedCfgRange,
} from "./presets/index.js";
