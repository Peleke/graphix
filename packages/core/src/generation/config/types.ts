/**
 * Generation Configuration Types
 *
 * Type definitions for the Generation Configuration Engine.
 * Supports hierarchical configuration, presets, and strategy-based resolution.
 */

import type { ModelFamily } from "../prompt-builder.js";

// ============================================================================
// Size Presets
// ============================================================================

/**
 * Dimensions for a specific model class
 */
export interface ModelDimensions {
  width: number;
  height: number;
}

/**
 * Size preset with optimal dimensions per model family
 *
 * SDXL-based models (SDXL, Illustrious, Pony) work best at specific
 * "bucket" resolutions. SD1.5 prefers 512-based, Flux is more flexible.
 */
export interface SizePreset {
  /** Unique identifier (e.g., "portrait_3x4") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
  /** Optimal dimensions per model family */
  dimensions: Record<"sdxl" | "sd15" | "flux", ModelDimensions>;
  /** Optional: slot types this preset is good for */
  suggestedFor?: string[];
}

// ============================================================================
// Quality Presets
// ============================================================================

/** Quality preset identifiers */
export type QualityPresetId = "draft" | "standard" | "high" | "ultra";

/**
 * Quality tier preset
 *
 * Defines generation quality settings that can be selected by name.
 */
export interface QualityPreset {
  /** Unique identifier */
  id: QualityPresetId;
  /** Human-readable name */
  name: string;
  /** Sampling steps */
  steps: number;
  /** CFG scale */
  cfg: number;
  /** Sampler name */
  sampler: string;
  /** Scheduler name */
  scheduler: string;
  /** Whether to enable hi-res fix */
  hiResFix?: boolean;
  /** Whether to enable upscaling */
  upscale?: boolean;
}

// ============================================================================
// Model Presets
// ============================================================================

/**
 * Default settings for a model family
 */
export interface ModelPreset {
  /** Model family identifier */
  family: ModelFamily;
  /** Default model file (can be overridden by env) */
  defaultModel?: string;
  /** Default CFG scale */
  cfg: number;
  /** Recommended sampler */
  sampler: string;
  /** Recommended scheduler */
  scheduler: string;
  /** Minimum recommended steps */
  minSteps: number;
  /** Default steps */
  defaultSteps: number;
  /** Whether model supports negative prompts effectively */
  supportsNegative: boolean;
}

// ============================================================================
// LoRA Configuration
// ============================================================================

/**
 * LoRA configuration for generation
 */
export interface LoraConfig {
  /** LoRA filename */
  name: string;
  /** Model strength (default: 1.0) */
  strength: number;
  /** CLIP strength (default: same as strength) */
  strengthClip?: number;
}

// ============================================================================
// Configuration Hierarchy
// ============================================================================

/**
 * Partial generation settings that can be defined at any level
 */
export interface PartialGenerationSettings {
  /** Size preset to use */
  sizePreset?: string;
  /** Quality preset to use */
  qualityPreset?: QualityPresetId;
  /** Custom width (overrides preset) */
  width?: number;
  /** Custom height (overrides preset) */
  height?: number;
  /** Custom steps */
  steps?: number;
  /** Custom CFG */
  cfg?: number;
  /** Custom sampler */
  sampler?: string;
  /** Custom scheduler */
  scheduler?: string;
  /** Model to use */
  model?: string;
  /** Additional negative prompt fragments */
  negativePrompt?: string;
  /** Additional LoRAs */
  loras?: LoraConfig[];
}

/**
 * Storyboard-level generation settings (stored in DB)
 */
export interface StoryboardGenerationSettings extends PartialGenerationSettings {
  /** Default template for composition */
  defaultTemplate?: string;
  /** Default page size */
  defaultPageSize?: string;
}

/**
 * Panel-level generation settings (stored in DB)
 */
export interface PanelGenerationSettings extends PartialGenerationSettings {
  /** Lock to prevent hierarchy overrides */
  locked?: boolean;
}

// ============================================================================
// Slot Context
// ============================================================================

/**
 * Context about a composition slot for size calculation
 */
export interface SlotContext {
  /** Template ID */
  templateId: string;
  /** Slot ID within template */
  slotId: string;
  /** Page size preset name */
  pageSizePreset?: string;
  /** Calculated slot dimensions in pixels (for caching) */
  slotPixels?: {
    width: number;
    height: number;
  };
  /** Calculated aspect ratio (for caching) */
  aspectRatio?: number;
}

// ============================================================================
// Resolved Configuration
// ============================================================================

/**
 * Source of a configuration value (for debugging/transparency)
 */
export type ConfigSource =
  | "global" // Built-in defaults
  | "env" // Environment variable
  | "project" // Project settings
  | "storyboard" // Storyboard settings
  | "panel" // Panel settings
  | "slot" // Calculated from slot
  | "preset" // From a named preset
  | "explicit"; // Passed directly

/**
 * Fully resolved generation configuration
 *
 * This is what gets passed to the generator - all values are concrete.
 */
export interface ResolvedGenerationConfig {
  // === Dimensions ===
  width: number;
  height: number;
  aspectRatio: number;
  sizePresetUsed?: string;

  // === Generation Parameters ===
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  seed?: number;

  // === Model ===
  model: string;
  modelFamily: ModelFamily;

  // === Prompts ===
  /** Merged negative prompt from all sources */
  negativePrompt: string;

  // === LoRAs ===
  /** Merged LoRAs from project + characters */
  loras: LoraConfig[];

  // === Quality ===
  qualityPresetUsed?: QualityPresetId;
  hiResFix: boolean;
  upscale: boolean;

  // === Provenance (for debugging) ===
  sources: {
    width: ConfigSource;
    height: ConfigSource;
    steps: ConfigSource;
    cfg: ConfigSource;
    sampler: ConfigSource;
    model: ConfigSource;
  };
}

// ============================================================================
// Strategy Interface
// ============================================================================

/**
 * Options passed to strategy for resolution
 */
export interface ConfigResolutionOptions {
  /** Panel ID (for loading from DB) */
  panelId?: string;
  /** Project ID (for loading settings) */
  projectId?: string;
  /** Storyboard ID (for loading settings) */
  storyboardId?: string;
  /** Slot context for slot-aware sizing */
  slot?: SlotContext;
  /** Explicit overrides (highest priority) */
  overrides?: PartialGenerationSettings;
  /** Force a specific quality preset */
  qualityPreset?: QualityPresetId;
  /** Force a specific size preset */
  sizePreset?: string;
}

/** Target resolution tier */
export type TargetResolution = "low" | "medium" | "high";

/**
 * Configuration Strategy Interface
 *
 * Strategies determine how configuration is resolved.
 * The engine delegates to the active strategy.
 */
export interface IConfigurationStrategy {
  /** Strategy identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;

  /**
   * Resolve configuration for a generation request
   */
  resolve(options: ConfigResolutionOptions): Promise<ResolvedGenerationConfig>;

  /**
   * Calculate optimal size for a given aspect ratio
   */
  calculateOptimalSize(
    aspectRatio: number,
    modelFamily: ModelFamily,
    targetResolution?: TargetResolution
  ): { width: number; height: number; presetId?: string };
}

// ============================================================================
// Re-export ModelFamily for convenience
// ============================================================================

export type { ModelFamily };
