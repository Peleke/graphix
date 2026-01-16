/**
 * PromptBuilder
 *
 * Assembles generation prompts from characters, panel direction,
 * and project settings. Produces optimized prompts for various
 * model families (Illustrious, Pony, SDXL, Flux, etc.).
 */

import type { Character, Panel, SceneLightingConfig } from "../db/schema.js";
import { getLightingService } from "../services/lighting.service.js";

/**
 * Character placement in a panel with modifiers
 */
export interface CharacterPlacement {
  character: Character;
  position?: string;
  action?: string;
  expression?: string;
}

/**
 * Panel direction input for prompt building
 * Different from schema.PanelDirection - this is the generation-specific input type
 */
export interface PromptDirection {
  sceneDescription?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
  additionalPrompt?: string;
  negativePrompt?: string;
}

/**
 * Generation parameters beyond the prompt
 */
export interface GenerationSettings {
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
}

/**
 * Model family for prompt style optimization
 */
export type ModelFamily =
  | "illustrious"
  | "pony"
  | "sdxl"
  | "flux"
  | "sd15"
  | "realistic";

/**
 * Built prompt result
 */
export interface BuiltPrompt {
  positive: string;
  negative: string;
  characterLoras: Array<{ name: string; weight: number }>;
  referenceImages: string[];
}

/**
 * Quality tags for different model families
 */
const QUALITY_TAGS: Record<ModelFamily, { positive: string[]; negative: string[] }> = {
  illustrious: {
    positive: ["masterpiece", "best quality", "very aesthetic", "absurdres"],
    negative: ["worst quality", "low quality", "bad anatomy", "bad hands", "missing fingers"],
  },
  pony: {
    positive: ["score_9", "score_8_up", "score_7_up", "source_anime"],
    negative: ["score_4", "score_3", "score_2", "score_1", "bad anatomy"],
  },
  sdxl: {
    positive: ["high quality", "detailed", "8k uhd"],
    negative: ["blurry", "low quality", "bad anatomy", "deformed"],
  },
  flux: {
    positive: [], // Flux prefers natural language
    negative: [],
  },
  sd15: {
    positive: ["masterpiece", "best quality", "highly detailed"],
    negative: ["worst quality", "low quality", "bad anatomy", "bad hands"],
  },
  realistic: {
    positive: ["RAW photo", "8k uhd", "DSLR", "high quality", "detailed skin"],
    negative: ["cartoon", "anime", "illustration", "painting", "drawing"],
  },
};

/**
 * Camera angle prompt fragments
 */
const CAMERA_ANGLES: Record<string, string> = {
  "close-up": "close-up shot, face focus",
  "extreme close-up": "extreme close-up, macro",
  "medium shot": "medium shot, waist up",
  "full body": "full body shot",
  "wide shot": "wide shot, full scene",
  "bird's eye": "bird's eye view, from above",
  "low angle": "low angle shot, from below",
  "dutch angle": "dutch angle, tilted",
  "over shoulder": "over the shoulder shot",
  "profile": "profile view, side view",
};

/**
 * Lighting style prompt fragments
 */
const LIGHTING_STYLES: Record<string, string> = {
  dramatic: "dramatic lighting, high contrast, chiaroscuro",
  soft: "soft lighting, diffused light",
  "golden hour": "golden hour lighting, warm tones, sunset",
  "blue hour": "blue hour, twilight, cool tones",
  studio: "studio lighting, professional",
  natural: "natural lighting",
  neon: "neon lighting, cyberpunk",
  candlelight: "candlelight, warm glow",
  moonlight: "moonlight, night scene, soft blue light",
  backlit: "backlit, rim lighting, silhouette",
};

/**
 * Mood/atmosphere prompt fragments
 */
const MOOD_FRAGMENTS: Record<string, string> = {
  tense: "tense atmosphere, suspenseful",
  romantic: "romantic atmosphere, intimate",
  mysterious: "mysterious atmosphere, enigmatic",
  peaceful: "peaceful, serene, calm",
  energetic: "dynamic, energetic, action",
  melancholic: "melancholic, somber mood",
  whimsical: "whimsical, playful, fantastical",
  dark: "dark atmosphere, ominous",
  cheerful: "cheerful, happy, bright",
  nostalgic: "nostalgic, vintage feel",
};

/**
 * Detect model family from model filename
 */
export function detectModelFamily(modelName: string): ModelFamily {
  const lower = modelName.toLowerCase();

  if (lower.includes("illustrious") || lower.includes("noob")) {
    return "illustrious";
  }
  if (lower.includes("pony") || lower.includes("yiff")) {
    return "pony";
  }
  if (lower.includes("flux")) {
    return "flux";
  }
  if (lower.includes("realistic") || lower.includes("photon")) {
    return "realistic";
  }
  if (lower.includes("sdxl") || lower.includes("xl")) {
    return "sdxl";
  }
  return "sd15"; // Default fallback
}

/**
 * PromptBuilder class for assembling generation prompts
 */
export class PromptBuilder {
  private modelFamily: ModelFamily;
  private characters: CharacterPlacement[] = [];
  private direction: PromptDirection = {};
  private customPositive: string[] = [];
  private customNegative: string[] = [];
  private sceneLighting: SceneLightingConfig | null = null;

  constructor(modelFamily: ModelFamily = "illustrious") {
    this.modelFamily = modelFamily;
  }

  /**
   * Set model family (affects prompt style)
   */
  setModelFamily(family: ModelFamily): this {
    this.modelFamily = family;
    return this;
  }

  /**
   * Auto-detect model family from model name
   */
  detectFromModel(modelName: string): this {
    this.modelFamily = detectModelFamily(modelName);
    return this;
  }

  /**
   * Add a character to the prompt
   */
  addCharacter(placement: CharacterPlacement): this {
    this.characters.push(placement);
    return this;
  }

  /**
   * Set multiple characters at once
   */
  setCharacters(placements: CharacterPlacement[]): this {
    this.characters = placements;
    return this;
  }

  /**
   * Set panel direction
   */
  setDirection(direction: PromptDirection): this {
    this.direction = direction;
    return this;
  }

  /**
   * Set scene lighting configuration (from storyboard)
   *
   * This will auto-inject lighting keywords into the prompt.
   * Takes precedence over direction.lighting if both are set.
   */
  setSceneLighting(config: SceneLightingConfig | null): this {
    this.sceneLighting = config;
    return this;
  }

  /**
   * Add custom positive prompt elements
   */
  addPositive(...elements: string[]): this {
    this.customPositive.push(...elements);
    return this;
  }

  /**
   * Add custom negative prompt elements
   */
  addNegative(...elements: string[]): this {
    this.customNegative.push(...elements);
    return this;
  }

  /**
   * Build character prompt fragment
   */
  private buildCharacterFragment(placement: CharacterPlacement): string {
    const { character, position, action, expression } = placement;
    const profile = character.profile as {
      basePrompt?: string;
      [key: string]: unknown;
    } | null;

    const parts: string[] = [];

    // Base character prompt
    if (profile?.basePrompt) {
      parts.push(profile.basePrompt);
    }

    // Position modifier
    if (position) {
      parts.push(`(${position})`);
    }

    // Action modifier
    if (action) {
      parts.push(action);
    }

    // Expression modifier
    if (expression) {
      parts.push(`${expression} expression`);
    }

    return parts.join(", ");
  }

  /**
   * Build the complete prompt
   */
  build(): BuiltPrompt {
    const positive: string[] = [];
    const negative: string[] = [];
    const loras: Array<{ name: string; weight: number }> = [];
    const references: string[] = [];

    // Quality tags (model-family specific)
    const quality = QUALITY_TAGS[this.modelFamily];
    if (quality.positive.length > 0) {
      positive.push(...quality.positive);
    }

    // Scene description
    if (this.direction.sceneDescription) {
      positive.push(this.direction.sceneDescription);
    }

    // Camera angle
    if (this.direction.cameraAngle) {
      const angleFragment = CAMERA_ANGLES[this.direction.cameraAngle.toLowerCase()];
      if (angleFragment) {
        positive.push(angleFragment);
      } else {
        positive.push(this.direction.cameraAngle);
      }
    }

    // Lighting - scene lighting takes precedence over direction.lighting
    if (this.sceneLighting) {
      // Generate lighting fragment from scene lighting config
      const lightingService = getLightingService();
      const sceneLightingFragment = lightingService.generatePromptFragment(this.sceneLighting);
      if (sceneLightingFragment) {
        positive.push(sceneLightingFragment);
      }
    } else if (this.direction.lighting) {
      const lightingFragment = LIGHTING_STYLES[this.direction.lighting.toLowerCase()];
      if (lightingFragment) {
        positive.push(lightingFragment);
      } else {
        positive.push(this.direction.lighting);
      }
    }

    // Mood
    if (this.direction.mood) {
      const moodFragment = MOOD_FRAGMENTS[this.direction.mood.toLowerCase()];
      if (moodFragment) {
        positive.push(moodFragment);
      } else {
        positive.push(this.direction.mood);
      }
    }

    // Characters
    for (const placement of this.characters) {
      const fragment = this.buildCharacterFragment(placement);
      if (fragment) {
        positive.push(fragment);
      }

      // Collect character LoRAs
      const profile = placement.character.profile as {
        lora?: { path: string; weight: number };
        referenceImages?: Array<{ path: string; isPrimary?: boolean }>;
        [key: string]: unknown;
      } | null;

      if (profile?.lora?.path) {
        loras.push({
          name: profile.lora.path,
          weight: profile.lora.weight ?? 0.8,
        });
      }

      // Collect reference images
      if (profile?.referenceImages) {
        for (const ref of profile.referenceImages) {
          references.push(ref.path);
        }
      }

      // Character-specific negative
      const charNegative = (profile as { negativePrompt?: string } | null)?.negativePrompt;
      if (charNegative) {
        negative.push(charNegative);
      }
    }

    // Additional panel prompt
    if (this.direction.additionalPrompt) {
      positive.push(this.direction.additionalPrompt);
    }

    // Custom positive elements
    if (this.customPositive.length > 0) {
      positive.push(...this.customPositive);
    }

    // Negative prompt assembly
    if (quality.negative.length > 0) {
      negative.push(...quality.negative);
    }

    if (this.direction.negativePrompt) {
      negative.push(this.direction.negativePrompt);
    }

    if (this.customNegative.length > 0) {
      negative.push(...this.customNegative);
    }

    return {
      positive: positive.join(", "),
      negative: negative.join(", "),
      characterLoras: loras,
      referenceImages: references,
    };
  }

  /**
   * Reset the builder for reuse
   */
  reset(): this {
    this.characters = [];
    this.direction = {};
    this.customPositive = [];
    this.customNegative = [];
    this.sceneLighting = null;
    return this;
  }
}

/**
 * Build a prompt from panel data and characters
 *
 * Convenience function for common use case.
 */
export function buildPanelPrompt(
  panel: Panel,
  characters: Character[],
  modelFamily: ModelFamily = "illustrious"
): BuiltPrompt {
  const builder = new PromptBuilder(modelFamily);

  // Extract direction from panel
  const direction = panel.direction as PromptDirection | null;
  if (direction) {
    builder.setDirection(direction);
  }

  // Add characters from panel's characterIds
  const characterIds = panel.characterIds;
  if (characterIds && characterIds.length > 0) {
    for (const characterId of characterIds) {
      const character = characters.find((c) => c.id === characterId);
      if (character) {
        builder.addCharacter({ character });
      }
    }
  }

  return builder.build();
}

/**
 * Create prompt variants with different seeds/parameters
 */
export interface VariantConfig {
  seedBase: number;
  count: number;
  varyConfig?: boolean;
  cfgRange?: [number, number];
}

export function generateVariantSeeds(config: VariantConfig): number[] {
  const { seedBase, count } = config;
  const seeds: number[] = [];

  for (let i = 0; i < count; i++) {
    // Use deterministic but spread out seeds
    seeds.push(seedBase + i * 12345);
  }

  return seeds;
}
