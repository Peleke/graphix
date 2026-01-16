/**
 * Generation Configuration Engine
 *
 * Main entry point for resolving generation configurations.
 * Uses the strategy pattern for flexible configuration resolution.
 */

import type {
  IConfigurationStrategy,
  ConfigResolutionOptions,
  ResolvedGenerationConfig,
  SlotContext,
  QualityPresetId,
  PartialGenerationSettings,
  ModelFamily,
  TargetResolution,
  SizePreset,
  QualityPreset,
} from "./types.js";
import {
  DefaultConfigurationStrategy,
  getDefaultStrategy,
} from "./strategies/default.strategy.js";
import {
  SlotAwareConfigurationStrategy,
  getSlotAwareStrategy,
} from "./strategies/slot-aware.strategy.js";
import {
  SIZE_PRESETS,
  listSizePresets,
  getSizePreset,
  findClosestPreset,
  findPresetsForUseCase,
  getPresetsByCategory,
} from "./presets/sizes.js";
import {
  QUALITY_PRESETS,
  getQualityPreset,
  listQualityPresets,
  recommendQualityPreset,
} from "./presets/quality.js";
import {
  MODEL_PRESETS,
  getModelPreset,
  detectModelFamily,
  listModelFamilies,
} from "./presets/models.js";

/**
 * Generation Configuration Engine
 *
 * Singleton that manages configuration resolution using pluggable strategies.
 *
 * Usage:
 * ```typescript
 * const engine = getConfigEngine();
 *
 * // Basic resolution
 * const config = await engine.resolve({});
 *
 * // With slot context (smart sizing)
 * const config = await engine.resolve({
 *   slot: { templateId: "six-grid", slotId: "row1-left" }
 * });
 *
 * // With presets
 * const config = await engine.resolve({
 *   sizePreset: "landscape_16x9",
 *   qualityPreset: "high"
 * });
 * ```
 */
export class GenerationConfigEngine {
  private strategy: IConfigurationStrategy;

  constructor(strategy?: IConfigurationStrategy) {
    // Default to slot-aware strategy for smart behavior
    this.strategy = strategy ?? getSlotAwareStrategy();
  }

  // ============================================================================
  // Strategy Management
  // ============================================================================

  /**
   * Get the current strategy
   */
  getStrategy(): IConfigurationStrategy {
    return this.strategy;
  }

  /**
   * Get the current strategy ID
   */
  getStrategyId(): string {
    return this.strategy.id;
  }

  /**
   * Set a new strategy
   */
  setStrategy(strategy: IConfigurationStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Use the default (backward-compatible) strategy
   */
  useDefaultStrategy(): void {
    this.strategy = getDefaultStrategy();
  }

  /**
   * Use the slot-aware (smart) strategy
   */
  useSlotAwareStrategy(): void {
    this.strategy = getSlotAwareStrategy();
  }

  // ============================================================================
  // Configuration Resolution
  // ============================================================================

  /**
   * Resolve configuration for a generation request
   *
   * This is the main entry point for getting a resolved configuration.
   */
  async resolve(
    options: ConfigResolutionOptions = {}
  ): Promise<ResolvedGenerationConfig> {
    return this.strategy.resolve(options);
  }

  /**
   * Get configuration for a specific panel
   *
   * Convenience method that wraps `resolve()` with panel context.
   */
  async getConfigForPanel(
    panelId: string,
    overrides?: PartialGenerationSettings
  ): Promise<ResolvedGenerationConfig> {
    return this.resolve({
      panelId,
      overrides,
    });
  }

  /**
   * Get configuration for a specific composition slot
   *
   * Convenience method that wraps `resolve()` with slot context.
   * This is the key method for smart slot-aware generation.
   */
  async getConfigForSlot(
    slot: SlotContext,
    options?: {
      qualityPreset?: QualityPresetId;
      overrides?: PartialGenerationSettings;
    }
  ): Promise<ResolvedGenerationConfig> {
    return this.resolve({
      slot,
      qualityPreset: options?.qualityPreset,
      overrides: options?.overrides,
    });
  }

  /**
   * Get configuration with a specific size and quality preset
   *
   * Convenience method for preset-based configuration.
   */
  async getConfigWithPresets(
    sizePreset: string,
    qualityPreset: QualityPresetId = "standard",
    overrides?: PartialGenerationSettings
  ): Promise<ResolvedGenerationConfig> {
    return this.resolve({
      sizePreset,
      qualityPreset,
      overrides,
    });
  }

  // ============================================================================
  // Size Calculations
  // ============================================================================

  /**
   * Calculate optimal size for an aspect ratio
   *
   * Delegates to the current strategy's calculation.
   */
  calculateOptimalSize(
    aspectRatio: number,
    modelFamily: ModelFamily = "pony",
    targetResolution: TargetResolution = "medium"
  ): { width: number; height: number; presetId?: string } {
    return this.strategy.calculateOptimalSize(
      aspectRatio,
      modelFamily,
      targetResolution
    );
  }

  /**
   * Get optimal dimensions for a slot
   *
   * Convenience method that calculates dimensions for a specific slot.
   */
  getDimensionsForSlot(
    templateId: string,
    slotId: string,
    options?: {
      pageSizePreset?: string;
      modelFamily?: ModelFamily;
    }
  ): { width: number; height: number; aspectRatio: number; presetId?: string } {
    // Use slot-aware strategy for this calculation regardless of current strategy
    const slotStrategy = getSlotAwareStrategy();

    const slot: SlotContext = {
      templateId,
      slotId,
      pageSizePreset: options?.pageSizePreset ?? "comic_standard",
    };

    const size = slotStrategy["calculateSlotSize"](
      slot,
      options?.modelFamily ?? "pony"
    );

    return {
      ...size,
      aspectRatio: size.width / size.height,
    };
  }

  /**
   * Get recommended sizes for all slots in a template
   *
   * Returns a map of slot IDs to recommended dimensions.
   */
  getTemplateSizeMap(
    templateId: string,
    options?: {
      pageSizePreset?: string;
      modelFamily?: ModelFamily;
    }
  ): Map<
    string,
    { width: number; height: number; aspectRatio: number; presetId?: string }
  > {
    const slotStrategy = getSlotAwareStrategy();
    return slotStrategy.calculateAllSlotSizes(
      templateId,
      options?.pageSizePreset ?? "comic_standard",
      options?.modelFamily ?? "pony"
    );
  }

  // ============================================================================
  // Preset Access (Convenience Methods)
  // ============================================================================

  // --- Size Presets ---

  listSizePresets(): SizePreset[] {
    return listSizePresets();
  }

  getSizePreset(id: string): SizePreset | undefined {
    return getSizePreset(id);
  }

  findClosestSizePreset(
    aspectRatio: number,
    tolerance?: number
  ): SizePreset | undefined {
    return findClosestPreset(aspectRatio, tolerance);
  }

  findSizePresetsForUseCase(useCase: string): SizePreset[] {
    return findPresetsForUseCase(useCase);
  }

  getSizePresetsByCategory(): Record<string, SizePreset[]> {
    return getPresetsByCategory();
  }

  // --- Quality Presets ---

  listQualityPresets(): QualityPreset[] {
    return listQualityPresets();
  }

  getQualityPreset(id: QualityPresetId): QualityPreset {
    return getQualityPreset(id);
  }

  recommendQualityPreset(
    useCase: "preview" | "iteration" | "final" | "print" | "web" | "social"
  ): QualityPresetId {
    return recommendQualityPreset(useCase);
  }

  // --- Model Presets ---

  listModelFamilies(): ModelFamily[] {
    return listModelFamilies();
  }

  getModelPreset(family: ModelFamily) {
    return getModelPreset(family);
  }

  detectModelFamily(modelName: string): ModelFamily {
    return detectModelFamily(modelName);
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

let engineInstance: GenerationConfigEngine | null = null;

/**
 * Get the configuration engine singleton
 */
export function getConfigEngine(): GenerationConfigEngine {
  if (!engineInstance) {
    engineInstance = new GenerationConfigEngine();
  }
  return engineInstance;
}

/**
 * Reset the engine singleton (for testing)
 */
export function resetConfigEngine(): void {
  engineInstance = null;
}

/**
 * Create a new engine instance (for testing or custom use)
 *
 * Unlike `getConfigEngine()`, this always creates a fresh instance.
 */
export function createConfigEngine(
  strategy?: IConfigurationStrategy
): GenerationConfigEngine {
  return new GenerationConfigEngine(strategy);
}
