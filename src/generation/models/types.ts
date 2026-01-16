/**
 * Model Catalog Types
 *
 * Type definitions for the model/controlnet/lora compatibility system.
 * Designed to be extensible for future model families (SD3, etc.)
 */

import type { ControlType } from "../controlnet-stack.js";

// ============================================================================
// Model Families
// ============================================================================

/**
 * Base model architecture families
 *
 * Add new families here as they become available:
 * - sd3, sd35 for Stable Diffusion 3.x
 * - cascade for Stable Cascade
 * - etc.
 */
export type ModelFamily =
  | "sd15" // Stable Diffusion 1.5
  | "sdxl" // Stable Diffusion XL
  | "illustrious" // Illustrious XL (SDXL fine-tune)
  | "pony" // Pony Diffusion (SDXL fine-tune)
  | "flux"; // Flux models

/**
 * Model families that share SDXL architecture (for ControlNet compatibility)
 */
export const SDXL_COMPATIBLE_FAMILIES: ModelFamily[] = [
  "sdxl",
  "illustrious",
  "pony",
];

// ============================================================================
// Checkpoint Entries
// ============================================================================

export type CheckpointType = "base" | "inpaint" | "refiner";

export interface CheckpointEntry {
  /** Filename as it appears in the models folder */
  filename: string;

  /** Base architecture family */
  family: ModelFamily;

  /** Type of checkpoint */
  type: CheckpointType;

  /** Whether this model is suitable for NSFW content */
  nsfw: boolean;

  /** Recommended for its category */
  recommended?: boolean;

  /** Human-readable notes about this model */
  notes?: string;

  /**
   * LoRA families this checkpoint is compatible with.
   * Usually same as family, but some cross-compatibility exists.
   * e.g., illustrious checkpoints often work with pony LoRAs
   */
  compatibleLoraFamilies: ModelFamily[];

  /**
   * Default prompting style for this model.
   * Some models need specific quality tags, etc.
   */
  promptStyle?: "danbooru" | "natural" | "pony" | "flux";

  /**
   * Clip skip setting (if model requires specific value)
   */
  clipSkip?: number;
}

// ============================================================================
// ControlNet Entries
// ============================================================================

export interface ControlNetEntry {
  /** Filename/path relative to controlnet folder */
  filename: string;

  /** Human-readable name */
  name: string;

  /** Model families this ControlNet is compatible with */
  compatibleFamilies: ModelFamily[];

  /** Control types this model supports */
  controlTypes: ControlType[];

  /**
   * Whether this is a Union model (supports multiple control types)
   * Union models require a control_mode parameter
   */
  isUnion: boolean;

  /**
   * Preprocessor to use for this ControlNet
   * e.g., "canny", "openpose", "depth_midas"
   */
  preprocessor?: string;

  /** Notes about usage */
  notes?: string;
}

// ============================================================================
// LoRA Entries
// ============================================================================

export type LoraCategory =
  | "character" // Character/identity LoRAs
  | "style" // Art style LoRAs
  | "concept" // Concept/object LoRAs
  | "quality" // Quality enhancement LoRAs
  | "pose"; // Pose/composition LoRAs

export type LoraStackPosition = "first" | "middle" | "last";

export interface LoraEntry {
  /** Filename as it appears in loras folder */
  filename: string;

  /** Human-readable name */
  name: string;

  /** Trigger word/phrase (if required) */
  trigger?: string;

  /** Model families this LoRA is compatible with */
  compatibleFamilies: ModelFamily[];

  /** Category for organization and auto-selection */
  category: LoraCategory;

  /** Recommended strength range */
  strength: {
    min: number;
    recommended: number;
    max: number;
  };

  /**
   * Position in LoRA stack
   * - first: Apply early (character/identity)
   * - middle: Apply in middle (style/concept)
   * - last: Apply last (quality boosters like DetailerIL)
   */
  stackPosition: LoraStackPosition;

  /** Notes about usage */
  notes?: string;
}

// ============================================================================
// Compatibility Results
// ============================================================================

export interface ControlNetCompatibilityResult {
  /** Whether a compatible ControlNet was found */
  compatible: boolean;

  /** The ControlNet to use (if compatible) */
  controlnet?: string;

  /** The preprocessor to use */
  preprocessor?: string;

  /** Control mode for Union models */
  controlMode?: string;

  /** Any warnings about the compatibility */
  warnings: string[];

  /** Error message if not compatible */
  error?: string;
}

export interface FullCompatibilityResult {
  /** The checkpoint being checked */
  checkpoint: CheckpointEntry;

  /** All compatible ControlNets */
  controlnets: ControlNetEntry[];

  /** All compatible LoRAs */
  loras: LoraEntry[];

  /** Any warnings */
  warnings: string[];
}

// ============================================================================
// Catalog Types
// ============================================================================

export type CheckpointCatalog = Record<string, CheckpointEntry>;
export type ControlNetCatalog = Record<string, ControlNetEntry>;
export type LoraCatalog = Record<string, LoraEntry>;
