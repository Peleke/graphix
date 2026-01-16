/**
 * Checkpoint Catalog
 *
 * Registry of known checkpoint models with their family and compatibility info.
 * Add new models here as they're installed.
 */

import type { CheckpointCatalog, CheckpointEntry } from "./types.js";

// ============================================================================
// Checkpoint Registry
// ============================================================================

export const CHECKPOINT_CATALOG: CheckpointCatalog = {
  // ==========================================================================
  // Furry/Anthro Specialists (Recommended)
  // ==========================================================================

  "yiffInHell_yihXXXTended.safetensors": {
    filename: "yiffInHell_yihXXXTended.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    recommended: true,
    notes: "Best overall for explicit furry/anthro. Pony-based.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  "novaFurryXL_ilV130.safetensors": {
    filename: "novaFurryXL_ilV130.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: true,
    recommended: true,
    notes: "Great for anthro. Illustrious-based, good with LoRAs.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  "furryDreams_v10.safetensors": {
    filename: "furryDreams_v10.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "SDXL furry specialist.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "yiffymix_v62Noobxl.safetensors": {
    filename: "yiffymix_v62Noobxl.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    notes: "Yiffy mix variant.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  // ==========================================================================
  // Illustrious Family
  // ==========================================================================

  "illustriousNSFWFrom_gammaUpdate.safetensors": {
    filename: "illustriousNSFWFrom_gammaUpdate.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: true,
    notes: "Great with LoRAs. Anime-focused but versatile.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  "mistoonAnime_v10Illustrious.safetensors": {
    filename: "mistoonAnime_v10Illustrious.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: false,
    notes: "Cartoon/anime style.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  "prefectIllustriousXL_v5.safetensors": {
    filename: "prefectIllustriousXL_v5.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: true,
    notes: "General purpose Illustrious.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  "waiIllustriousSDXL_v160.safetensors": {
    filename: "waiIllustriousSDXL_v160.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: true,
    notes: "Wai Illustrious variant.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  "realismIllustriousBy_v50FP16.safetensors": {
    filename: "realismIllustriousBy_v50FP16.safetensors",
    family: "illustrious",
    type: "base",
    nsfw: true,
    notes: "More realistic Illustrious variant.",
    compatibleLoraFamilies: ["illustrious", "sdxl"],
    promptStyle: "danbooru",
  },

  // ==========================================================================
  // Pony Family
  // ==========================================================================

  "ponyDiffusionV6XL_v6StartWithThisOne.safetensors": {
    filename: "ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    notes: "Base Pony v6. Good starting point.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  "hassakuXLPony_v13BetterEyesVersion.safetensors": {
    filename: "hassakuXLPony_v13BetterEyesVersion.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    notes: "Hassaku Pony variant with better eyes.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  "cyberrealisticPony_semiRealV40.safetensors": {
    filename: "cyberrealisticPony_semiRealV40.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    notes: "Semi-realistic Pony variant.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  "cyberrealisticPony_v141.safetensors": {
    filename: "cyberrealisticPony_v141.safetensors",
    family: "pony",
    type: "base",
    nsfw: true,
    notes: "Cyber-realistic Pony.",
    compatibleLoraFamilies: ["pony", "sdxl"],
    promptStyle: "pony",
  },

  // ==========================================================================
  // Base SDXL
  // ==========================================================================

  "sdXL_v10.safetensors": {
    filename: "sdXL_v10.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: false,
    notes: "Base SDXL 1.0.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "sdXL_v10VAEFix.safetensors": {
    filename: "sdXL_v10VAEFix.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: false,
    notes: "SDXL with VAE fix.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "sdXL_v10RefinerVAEFix.safetensors": {
    filename: "sdXL_v10RefinerVAEFix.safetensors",
    family: "sdxl",
    type: "refiner",
    nsfw: false,
    notes: "SDXL Refiner.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "AnythingXL_v50.safetensors": {
    filename: "AnythingXL_v50.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "Anime-focused SDXL.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "danbooru",
  },

  // ==========================================================================
  // Realistic
  // ==========================================================================

  "cyberrealistic_v90.safetensors": {
    filename: "cyberrealistic_v90.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "Photorealistic SDXL.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "perfectdeliberate_v50.safetensors": {
    filename: "perfectdeliberate_v50.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "Deliberate style.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "unnamedixlRealisticModel_v4.safetensors": {
    filename: "unnamedixlRealisticModel_v4.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "Realistic SDXL variant.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "awpainting_v14.safetensors": {
    filename: "awpainting_v14.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: false,
    notes: "Artistic/painting style.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  "coffeemix_v20.safetensors": {
    filename: "coffeemix_v20.safetensors",
    family: "sdxl",
    type: "base",
    nsfw: true,
    notes: "Coffee mix style.",
    compatibleLoraFamilies: ["sdxl"],
    promptStyle: "natural",
  },

  // ==========================================================================
  // Flux
  // ==========================================================================

  "flux1-schnell-fp8.safetensors": {
    filename: "flux1-schnell-fp8.safetensors",
    family: "flux",
    type: "base",
    nsfw: false,
    notes: "Flux Schnell (fast). FP8 quantized.",
    compatibleLoraFamilies: ["flux"],
    promptStyle: "flux",
  },

  // ==========================================================================
  // SD 1.5 (Legacy)
  // ==========================================================================

  "SD1.5/v1-5-pruned-emaonly.ckpt": {
    filename: "SD1.5/v1-5-pruned-emaonly.ckpt",
    family: "sd15",
    type: "base",
    nsfw: false,
    notes: "Base SD 1.5. Use SD1.5 ControlNets with this.",
    compatibleLoraFamilies: ["sd15"],
    promptStyle: "natural",
  },

  "512-inpainting-ema.safetensors": {
    filename: "512-inpainting-ema.safetensors",
    family: "sd15",
    type: "inpaint",
    nsfw: false,
    notes: "SD 1.5 inpainting model.",
    compatibleLoraFamilies: ["sd15"],
    promptStyle: "natural",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get checkpoint entry by filename
 */
export function getCheckpoint(filename: string): CheckpointEntry | undefined {
  return CHECKPOINT_CATALOG[filename];
}

/**
 * List all checkpoints for a given family
 */
export function listCheckpointsByFamily(
  family: string
): CheckpointEntry[] {
  return Object.values(CHECKPOINT_CATALOG).filter((c) => c.family === family);
}

/**
 * List recommended checkpoints
 */
export function listRecommendedCheckpoints(): CheckpointEntry[] {
  return Object.values(CHECKPOINT_CATALOG).filter((c) => c.recommended);
}

/**
 * List NSFW-capable checkpoints
 */
export function listNsfwCheckpoints(): CheckpointEntry[] {
  return Object.values(CHECKPOINT_CATALOG).filter((c) => c.nsfw);
}

/**
 * Infer family from checkpoint filename (fallback for unknown models)
 */
export function inferFamily(filename: string): string | null {
  const lower = filename.toLowerCase();

  if (lower.includes("pony") || lower.includes("yiff")) return "pony";
  if (lower.includes("illustrious") || lower.includes("nova")) return "illustrious";
  if (lower.includes("flux")) return "flux";
  if (lower.includes("xl") || lower.includes("sdxl")) return "sdxl";
  if (lower.includes("sd15") || lower.includes("1.5") || lower.includes("v1-5"))
    return "sd15";

  return null;
}
