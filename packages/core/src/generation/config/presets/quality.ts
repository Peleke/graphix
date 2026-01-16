/**
 * Quality Presets
 *
 * Pre-defined quality tiers for different use cases.
 * Each tier balances speed vs quality for specific workflows.
 */

import type { QualityPreset, QualityPresetId } from "../types.js";

/**
 * Quality presets from fastest to highest quality
 */
export const QUALITY_PRESETS: Record<QualityPresetId, QualityPreset> = {
  /**
   * Draft - Fast preview generation
   *
   * Use for: Quick iteration, concept exploration, layout testing
   * Trade-off: Lower detail, potential artifacts, but very fast
   */
  draft: {
    id: "draft",
    name: "Draft (Fast Preview)",
    steps: 15,
    cfg: 6,
    sampler: "euler",
    scheduler: "normal",
    hiResFix: false,
    upscale: false,
  },

  /**
   * Standard - Balanced quality and speed
   *
   * Use for: Regular generation, most panel work, iteration
   * Trade-off: Good quality, reasonable speed
   */
  standard: {
    id: "standard",
    name: "Standard",
    steps: 28,
    cfg: 7,
    sampler: "euler_ancestral",
    scheduler: "normal",
    hiResFix: false,
    upscale: false,
  },

  /**
   * High - Enhanced quality with hi-res fix
   *
   * Use for: Final panels, important scenes, detailed work
   * Trade-off: Slower, but significantly better detail
   */
  high: {
    id: "high",
    name: "High Quality",
    steps: 35,
    cfg: 7.5,
    sampler: "dpmpp_2m_sde",
    scheduler: "karras",
    hiResFix: true,
    upscale: false,
  },

  /**
   * Ultra - Publication-ready quality
   *
   * Use for: Final export, print-ready, hero images
   * Trade-off: Slowest, but maximum quality
   */
  ultra: {
    id: "ultra",
    name: "Ultra (Publication Ready)",
    steps: 40,
    cfg: 7.5,
    sampler: "dpmpp_2m_sde",
    scheduler: "karras",
    hiResFix: true,
    upscale: true,
  },
};

/**
 * Get quality preset by ID
 */
export function getQualityPreset(id: QualityPresetId): QualityPreset {
  return QUALITY_PRESETS[id];
}

/**
 * Get quality preset by ID (with optional fallback)
 */
export function getQualityPresetSafe(
  id: string | undefined,
  fallback: QualityPresetId = "standard"
): QualityPreset {
  if (id && id in QUALITY_PRESETS) {
    return QUALITY_PRESETS[id as QualityPresetId];
  }
  return QUALITY_PRESETS[fallback];
}

/**
 * List all quality presets
 */
export function listQualityPresets(): QualityPreset[] {
  return Object.values(QUALITY_PRESETS);
}

/**
 * Get quality presets ordered by speed (fastest first)
 */
export function getQualityPresetsBySpeed(): QualityPreset[] {
  return [
    QUALITY_PRESETS.draft,
    QUALITY_PRESETS.standard,
    QUALITY_PRESETS.high,
    QUALITY_PRESETS.ultra,
  ];
}

/**
 * Estimate relative generation time for a quality preset
 *
 * @returns Multiplier relative to "standard" (1.0)
 */
export function estimateRelativeTime(preset: QualityPreset): number {
  // Base time is proportional to steps
  let multiplier = preset.steps / 28; // 28 is standard steps

  // Hi-res fix roughly doubles time
  if (preset.hiResFix) {
    multiplier *= 1.8;
  }

  // Upscale adds significant time
  if (preset.upscale) {
    multiplier *= 1.5;
  }

  // DPM++ samplers are slightly slower
  if (preset.sampler.includes("dpmpp")) {
    multiplier *= 1.1;
  }

  return Math.round(multiplier * 100) / 100;
}

/**
 * Get recommended quality preset based on use case
 */
export function recommendQualityPreset(
  useCase:
    | "preview"
    | "iteration"
    | "final"
    | "print"
    | "web"
    | "social"
): QualityPresetId {
  switch (useCase) {
    case "preview":
      return "draft";
    case "iteration":
    case "web":
    case "social":
      return "standard";
    case "final":
      return "high";
    case "print":
      return "ultra";
    default:
      return "standard";
  }
}
