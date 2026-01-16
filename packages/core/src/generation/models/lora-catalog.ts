/**
 * LoRA Catalog
 *
 * Registry of known LoRA models with their trigger words, compatibility, and strength info.
 * Categories: style, character, quality, pose, concept
 */

import type { LoraCatalog, LoraEntry, LoraCategory, ModelFamily } from "./types.js";

// ============================================================================
// LoRA Registry
// ============================================================================

export const LORA_CATALOG: LoraCatalog = {
  // ==========================================================================
  // Style LoRAs
  // ==========================================================================

  "colorful_line_art_illustriousXL.safetensors": {
    filename: "colorful_line_art_illustriousXL.safetensors",
    name: "Colorful Line Art",
    trigger: "colorful line art style",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.4, recommended: 0.7, max: 1.2 },
    stackPosition: "middle",
    notes: "Great for graphic novel/comic look with vibrant colors",
  },

  "tarot_illustration_style_illustriousXL-000025.safetensors": {
    filename: "tarot_illustration_style_illustriousXL-000025.safetensors",
    name: "Tarot Illustration Style",
    trigger: "tarot card style, ornate border",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.5, recommended: 0.8, max: 1.0 },
    stackPosition: "middle",
    notes: "Mystical tarot card aesthetic",
  },

  "flux_tarot_v1_lora.safetensors": {
    filename: "flux_tarot_v1_lora.safetensors",
    name: "Flux Tarot",
    trigger: "tarot card style",
    compatibleFamilies: ["flux"],
    category: "style",
    strength: { min: 0.5, recommended: 0.8, max: 1.0 },
    stackPosition: "middle",
    notes: "Tarot style for Flux models",
  },

  "pixelart.safetensors": {
    filename: "pixelart.safetensors",
    name: "Pixel Art",
    trigger: "pixel art style, pixelated",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "middle",
    notes: "Retro pixel art aesthetic",
  },

  "pochoir-fluxlora.safetensors": {
    filename: "pochoir-fluxlora.safetensors",
    name: "Pochoir Style",
    trigger: "pochoir style, stencil art",
    compatibleFamilies: ["flux"],
    category: "style",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Stencil/pochoir art style for Flux",
  },

  "cyberpunk-cksc-ilSDXL.safetensors": {
    filename: "cyberpunk-cksc-ilSDXL.safetensors",
    name: "Cyberpunk Style",
    trigger: "cyberpunk style, neon lights, futuristic",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Cyberpunk aesthetic with neon lighting",
  },

  "cyberpunk-cksc-flux.safetensors": {
    filename: "cyberpunk-cksc-flux.safetensors",
    name: "Cyberpunk Style (Flux)",
    trigger: "cyberpunk style, neon lights",
    compatibleFamilies: ["flux"],
    category: "style",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Cyberpunk aesthetic for Flux",
  },

  "illustr_style.safetensors": {
    filename: "illustr_style.safetensors",
    name: "Illustration Style",
    trigger: "illustration style",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.4, recommended: 0.6, max: 0.9 },
    stackPosition: "middle",
    notes: "General illustration enhancement",
  },

  "psycheroticadelia.safetensors": {
    filename: "psycheroticadelia.safetensors",
    name: "Psychedelic",
    trigger: "psychedelic style, trippy, vibrant colors",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.4, recommended: 0.6, max: 0.9 },
    stackPosition: "middle",
    notes: "Psychedelic art style",
  },

  "ral-bubblegum-sdxl.safetensors": {
    filename: "ral-bubblegum-sdxl.safetensors",
    name: "Bubblegum Colors",
    trigger: "ral-bubblegum, pastel colors, pink",
    compatibleFamilies: ["sdxl", "illustrious", "pony"],
    category: "style",
    strength: { min: 0.4, recommended: 0.6, max: 0.9 },
    stackPosition: "middle",
    notes: "Pastel bubblegum color palette",
  },

  "ral-colorswirl-sdxl.safetensors": {
    filename: "ral-colorswirl-sdxl.safetensors",
    name: "Color Swirl",
    trigger: "ral-colorswirl, swirling colors",
    compatibleFamilies: ["sdxl", "illustrious", "pony"],
    category: "style",
    strength: { min: 0.4, recommended: 0.6, max: 0.9 },
    stackPosition: "middle",
    notes: "Swirling color effect",
  },

  "the-look-illustriousXL.safetensors": {
    filename: "the-look-illustriousXL.safetensors",
    name: "The Look (Illustrious)",
    trigger: "the look style",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "style",
    strength: { min: 0.4, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Distinctive artistic look",
  },

  "the-look-flux.safetensors": {
    filename: "the-look-flux.safetensors",
    name: "The Look (Flux)",
    trigger: "the look style",
    compatibleFamilies: ["flux"],
    category: "style",
    strength: { min: 0.4, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Distinctive artistic look for Flux",
  },

  "LineDrawing03_CE_FLUX_AIT3k.safetensors": {
    filename: "LineDrawing03_CE_FLUX_AIT3k.safetensors",
    name: "Line Drawing (Flux)",
    trigger: "line drawing style, sketch",
    compatibleFamilies: ["flux"],
    category: "style",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Line drawing style for Flux",
  },

  // ==========================================================================
  // Quality LoRAs
  // ==========================================================================

  "DetailerILv2-000008.safetensors": {
    filename: "DetailerILv2-000008.safetensors",
    name: "Detailer IL v2",
    trigger: undefined,
    compatibleFamilies: ["illustrious"],
    category: "quality",
    strength: { min: 0.3, recommended: 0.5, max: 0.8 },
    stackPosition: "last",
    notes: "Detail enhancement, apply last in stack",
  },

  "Face_Enhancer_Illustrious.safetensors": {
    filename: "Face_Enhancer_Illustrious.safetensors",
    name: "Face Enhancer",
    trigger: undefined,
    compatibleFamilies: ["illustrious"],
    category: "quality",
    strength: { min: 0.3, recommended: 0.5, max: 0.8 },
    stackPosition: "last",
    notes: "Improves face quality and details",
  },

  "ILXL_Realism_Slider_V.1.safetensors": {
    filename: "ILXL_Realism_Slider_V.1.safetensors",
    name: "Realism Slider",
    trigger: undefined,
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "quality",
    strength: { min: 0.2, recommended: 0.4, max: 0.7 },
    stackPosition: "last",
    notes: "Adjusts realism level - higher = more realistic",
  },

  "Realim_Lora_BSY_IL_V1_RA42.safetensors": {
    filename: "Realim_Lora_BSY_IL_V1_RA42.safetensors",
    name: "Realism LoRA",
    trigger: undefined,
    compatibleFamilies: ["illustrious"],
    category: "quality",
    strength: { min: 0.3, recommended: 0.5, max: 0.8 },
    stackPosition: "last",
    notes: "Enhances realism",
  },

  "Qwen-Image-Lightning-4steps-V1.0.safetensors": {
    filename: "Qwen-Image-Lightning-4steps-V1.0.safetensors",
    name: "Lightning 4-Step",
    trigger: undefined,
    compatibleFamilies: ["sdxl", "illustrious"],
    category: "quality",
    strength: { min: 0.8, recommended: 1.0, max: 1.0 },
    stackPosition: "last",
    notes: "Fast inference LoRA - use with 4 steps",
  },

  // ==========================================================================
  // Pose LoRAs
  // ==========================================================================

  "PosingDynamicsILL.safetensors": {
    filename: "PosingDynamicsILL.safetensors",
    name: "Posing Dynamics",
    trigger: "dynamic pose",
    compatibleFamilies: ["illustrious"],
    category: "pose",
    strength: { min: 0.4, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Improves pose dynamics and variety",
  },

  "posing-dynamics-flux.safetensors": {
    filename: "posing-dynamics-flux.safetensors",
    name: "Posing Dynamics (Flux)",
    trigger: "dynamic pose",
    compatibleFamilies: ["flux"],
    category: "pose",
    strength: { min: 0.4, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Improves pose dynamics for Flux",
  },

  // ==========================================================================
  // Character LoRAs
  // ==========================================================================

  "judy_hopps_v3.safetensors": {
    filename: "judy_hopps_v3.safetensors",
    name: "Judy Hopps",
    trigger: "judy hopps, rabbit, zootopia",
    compatibleFamilies: ["illustrious", "sdxl", "pony"],
    category: "character",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "first",
    notes: "Judy Hopps from Zootopia",
  },

  "Charizard_Pokemon_Illustrious.safetensors": {
    filename: "Charizard_Pokemon_Illustrious.safetensors",
    name: "Charizard",
    trigger: "charizard, pokemon",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "first",
    notes: "Charizard Pokemon character",
  },

  "DeathclawILL.safetensors": {
    filename: "DeathclawILL.safetensors",
    name: "Deathclaw",
    trigger: "deathclaw, fallout",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "first",
    notes: "Deathclaw from Fallout series",
  },

  "Eleptors_Anthro_Furry_Lora_Illustrious_V2.safetensors": {
    filename: "Eleptors_Anthro_Furry_Lora_Illustrious_V2.safetensors",
    name: "Anthro Furry (Eleptor)",
    trigger: "anthro, furry",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "first",
    notes: "General anthro/furry enhancement",
  },

  "Furry_Anthro_Lora_Jackal_Illustrous.safetensors": {
    filename: "Furry_Anthro_Lora_Jackal_Illustrous.safetensors",
    name: "Anthro Jackal",
    trigger: "anthro jackal, furry",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "first",
    notes: "Jackal character LoRA",
  },

  "Furry_Babes_-_Illustrious_Artstyle.safetensors": {
    filename: "Furry_Babes_-_Illustrious_Artstyle.safetensors",
    name: "Furry Babes Style",
    trigger: "furry, anthro female",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "first",
    notes: "Stylized furry characters",
  },

  "Priestess_Crocodile_-_Desert_Furry_Collection_1__Egyptian_Edition_Illustrious-000013.safetensors": {
    filename: "Priestess_Crocodile_-_Desert_Furry_Collection_1__Egyptian_Edition_Illustrious-000013.safetensors",
    name: "Egyptian Crocodile Priestess",
    trigger: "crocodile priestess, egyptian",
    compatibleFamilies: ["illustrious"],
    category: "character",
    strength: { min: 0.6, recommended: 0.8, max: 1.0 },
    stackPosition: "first",
    notes: "Egyptian-themed crocodile character",
  },

  "drunkrussianman.safetensors": {
    filename: "drunkrussianman.safetensors",
    name: "Drunk Russian Man",
    trigger: "drunk russian man",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "character",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "first",
    notes: "Specific character style",
  },

  // ==========================================================================
  // Concept/Scene LoRAs
  // ==========================================================================

  "Egypt_IL.safetensors": {
    filename: "Egypt_IL.safetensors",
    name: "Egyptian Theme",
    trigger: "ancient egypt, egyptian",
    compatibleFamilies: ["illustrious"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Egyptian aesthetic and themes",
  },

  "Classroom-IL.safetensors": {
    filename: "Classroom-IL.safetensors",
    name: "Classroom",
    trigger: "classroom, school",
    compatibleFamilies: ["illustrious"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Classroom/school setting",
  },

  "IL_Medieval_brothel_Bedroom_r1.safetensors": {
    filename: "IL_Medieval_brothel_Bedroom_r1.safetensors",
    name: "Medieval Bedroom",
    trigger: "medieval bedroom, fantasy interior",
    compatibleFamilies: ["illustrious"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Medieval interior setting",
  },

  "fallout_pack_illus.safetensors": {
    filename: "fallout_pack_illus.safetensors",
    name: "Fallout Theme",
    trigger: "fallout, post-apocalyptic, wasteland",
    compatibleFamilies: ["illustrious"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Fallout game aesthetic",
  },

  "falloutpostsdxl.safetensors": {
    filename: "falloutpostsdxl.safetensors",
    name: "Fallout Post (SDXL)",
    trigger: "fallout, post-apocalyptic",
    compatibleFamilies: ["sdxl", "illustrious", "pony"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Fallout aesthetic for SDXL",
  },

  "pipGirlUIChibi.638V.safetensors": {
    filename: "pipGirlUIChibi.638V.safetensors",
    name: "Pip-Girl UI Chibi",
    trigger: "pip-girl, fallout ui, chibi",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Fallout Pip-Girl UI style",
  },

  "stripclub ILXL.safetensors": {
    filename: "stripclub ILXL.safetensors",
    name: "Strip Club",
    trigger: "strip club, nightclub",
    compatibleFamilies: ["illustrious", "sdxl"],
    category: "concept",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Nightclub/strip club setting",
  },

  "Akabur_Mk2Illust.safetensors": {
    filename: "Akabur_Mk2Illust.safetensors",
    name: "Akabur Art Style",
    trigger: "akabur style",
    compatibleFamilies: ["illustrious"],
    category: "style",
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: "middle",
    notes: "Akabur-inspired art style",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get LoRA entry by filename
 */
export function getLora(filename: string): LoraEntry | undefined {
  return LORA_CATALOG[filename];
}

/**
 * Get LoRA by name (case-insensitive partial match)
 */
export function findLoraByName(name: string): LoraEntry | undefined {
  const lowerName = name.toLowerCase();
  return Object.values(LORA_CATALOG).find(
    (lora) =>
      lora.name.toLowerCase().includes(lowerName) ||
      lora.filename.toLowerCase().includes(lowerName)
  );
}

/**
 * List all LoRAs compatible with a model family
 */
export function listLorasByFamily(family: ModelFamily): LoraEntry[] {
  return Object.values(LORA_CATALOG).filter((lora) =>
    lora.compatibleFamilies.includes(family)
  );
}

/**
 * List all LoRAs in a category
 */
export function listLorasByCategory(category: LoraCategory): LoraEntry[] {
  return Object.values(LORA_CATALOG).filter((lora) => lora.category === category);
}

/**
 * List all LoRAs compatible with a checkpoint
 */
export function getCompatibleLoras(
  checkpoint: string,
  checkpointFamily?: ModelFamily
): LoraEntry[] {
  // If family provided, use it; otherwise try to infer from checkpoint name
  let family = checkpointFamily;
  if (!family) {
    // Import inferFamily dynamically to avoid circular deps
    const lower = checkpoint.toLowerCase();
    if (lower.includes("pony") || lower.includes("yiff")) family = "pony";
    else if (lower.includes("illustrious") || lower.includes("nova")) family = "illustrious";
    else if (lower.includes("flux")) family = "flux";
    else if (lower.includes("xl") || lower.includes("sdxl")) family = "sdxl";
    else if (lower.includes("sd15") || lower.includes("1.5") || lower.includes("v1-5"))
      family = "sd15";
    else family = "sdxl"; // Default to SDXL
  }

  return listLorasByFamily(family);
}

/**
 * Suggest LoRAs for a checkpoint based on categories
 */
export function suggestLoras(
  checkpoint: string,
  categories?: LoraCategory[]
): LoraEntry[] {
  const compatible = getCompatibleLoras(checkpoint);

  if (!categories || categories.length === 0) {
    return compatible;
  }

  return compatible.filter((lora) => categories.includes(lora.category));
}

/**
 * Build a sorted LoRA stack (first → middle → last)
 */
export function buildLoraStack(loras: LoraEntry[]): LoraEntry[] {
  const positionOrder: Record<string, number> = {
    first: 0,
    middle: 1,
    last: 2,
  };

  return [...loras].sort(
    (a, b) => positionOrder[a.stackPosition] - positionOrder[b.stackPosition]
  );
}

/**
 * Get trigger words for a list of LoRAs (for prompt injection)
 */
export function getTriggerWords(loraFilenames: string[]): string[] {
  return loraFilenames
    .map((filename) => LORA_CATALOG[filename]?.trigger)
    .filter((trigger): trigger is string => !!trigger);
}

/**
 * List all style LoRAs (convenience function)
 */
export function listStyleLoras(): LoraEntry[] {
  return listLorasByCategory("style");
}

/**
 * List all quality LoRAs (convenience function)
 */
export function listQualityLoras(): LoraEntry[] {
  return listLorasByCategory("quality");
}

/**
 * List all character LoRAs (convenience function)
 */
export function listCharacterLoras(): LoraEntry[] {
  return listLorasByCategory("character");
}

/**
 * Get recommended LoRA stack for a use case
 */
export function getRecommendedStack(
  checkpoint: string,
  useCase: "comic" | "realistic" | "anime" | "general"
): LoraEntry[] {
  const compatible = getCompatibleLoras(checkpoint);
  const stack: LoraEntry[] = [];

  switch (useCase) {
    case "comic":
      // Find colorful line art or similar
      const comicStyle = compatible.find(
        (l) => l.category === "style" && l.name.toLowerCase().includes("line")
      );
      if (comicStyle) stack.push(comicStyle);
      break;

    case "realistic":
      // Find realism enhancer
      const realismLora = compatible.find(
        (l) => l.category === "quality" && l.name.toLowerCase().includes("realis")
      );
      if (realismLora) stack.push(realismLora);
      break;

    case "anime":
      // Find illustration style
      const animeLora = compatible.find(
        (l) => l.category === "style" && l.name.toLowerCase().includes("illustr")
      );
      if (animeLora) stack.push(animeLora);
      break;

    case "general":
    default:
      // Just add a quality enhancer
      const detailer = compatible.find(
        (l) => l.category === "quality" && l.name.toLowerCase().includes("detail")
      );
      if (detailer) stack.push(detailer);
      break;
  }

  // Always add a quality LoRA at the end if available and not already included
  const qualityLora = compatible.find(
    (l) => l.category === "quality" && !stack.includes(l)
  );
  if (qualityLora) stack.push(qualityLora);

  return buildLoraStack(stack);
}
