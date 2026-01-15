/**
 * Panel Generator
 *
 * High-level service for generating images for panels.
 * Combines PromptBuilder and ComfyUIClient with database operations.
 */

import { config } from "../config.js";
import { getPanelService, getCharacterService, getGeneratedImageService } from "../services/index.js";
import { PromptBuilder, buildPanelPrompt, generateVariantSeeds, type ModelFamily } from "./prompt-builder.js";
import { ComfyUIClient, getComfyUIClient, type GenerationResult, type PipelineParams } from "./comfyui-client.js";
import type { Panel, Character, GeneratedImage } from "../db/schema.js";

/**
 * Generation options
 */
export interface GenerateOptions {
  /** Model checkpoint to use */
  model?: string;
  /** Model family for prompt optimization */
  modelFamily?: ModelFamily;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Number of sampling steps */
  steps?: number;
  /** CFG scale */
  cfg?: number;
  /** Sampler name */
  sampler?: string;
  /** Scheduler name */
  scheduler?: string;
  /** Specific seed (random if not provided) */
  seed?: number;
  /** Quality preset */
  quality?: "draft" | "standard" | "high" | "ultra";
  /** Enable hi-res fix */
  enableHiresFix?: boolean;
  /** Enable upscaling */
  enableUpscale?: boolean;
  /** Use IP-Adapter for character consistency */
  useIPAdapter?: boolean;
  /** IP-Adapter strength (0.0-1.0) */
  ipAdapterStrength?: number;
}

/**
 * Variant generation options
 */
export interface VariantOptions extends GenerateOptions {
  /** Number of variants to generate */
  count: number;
  /** Base seed for variant generation */
  baseSeed?: number;
  /** Vary CFG scale across variants */
  varyCfg?: boolean;
  /** CFG range if varying */
  cfgRange?: [number, number];
}

/**
 * Generation result with database record
 */
export interface PanelGenerationResult {
  success: boolean;
  generatedImage?: GeneratedImage;
  generationResult?: GenerationResult;
  error?: string;
}

/**
 * Batch generation result
 */
export interface BatchGenerationResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: PanelGenerationResult[];
}

/**
 * Panel Generator class
 */
export class PanelGenerator {
  private comfyui: ComfyUIClient;
  private panelService = getPanelService();
  private characterService = getCharacterService();
  private imageService = getGeneratedImageService();

  constructor(comfyuiClient?: ComfyUIClient) {
    this.comfyui = comfyuiClient ?? getComfyUIClient();
  }

  /**
   * Generate a single image for a panel
   */
  async generate(panelId: string, options: GenerateOptions = {}): Promise<PanelGenerationResult> {
    try {
      // Load panel data
      const panel = await this.panelService.getById(panelId);
      if (!panel) {
        return { success: false, error: "Panel not found" };
      }

      // Load characters in the panel
      const characters = await this.loadPanelCharacters(panel);

      // Build the prompt
      const modelFamily = options.modelFamily ?? this.detectModelFamily(options.model);
      const prompt = buildPanelPrompt(panel, characters, modelFamily);

      // Determine output path
      const outputPath = this.generateOutputPath(panelId, options.seed);

      // Prepare generation parameters
      const params: PipelineParams = {
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        model: options.model ?? config.comfyui.defaultModel,
        width: options.width ?? 768,
        height: options.height ?? 1024,
        steps: options.steps ?? 28,
        cfg: options.cfg ?? 7,
        seed: options.seed,
        sampler: options.sampler ?? "euler_ancestral",
        scheduler: options.scheduler ?? "normal",
        loras: prompt.characterLoras,
        outputPath,
        quality: options.quality ?? "standard",
        enableHiresFix: options.enableHiresFix,
        enableUpscale: options.enableUpscale,
      };

      // Generate with IP-Adapter if requested and references exist
      let result: GenerationResult;
      if (options.useIPAdapter && prompt.referenceImages.length > 0) {
        result = await this.comfyui.generateWithIPAdapter({
          ...params,
          referenceImages: prompt.referenceImages,
          ipAdapterStrength: options.ipAdapterStrength ?? 0.8,
        });
      } else {
        result = await this.comfyui.executePipeline(params);
      }

      if (!result.success) {
        return { success: false, error: result.error, generationResult: result };
      }

      // Store generation record
      const generatedImage = await this.imageService.create({
        panelId,
        imagePath: result.imagePath!,
        params: {
          seed: result.seed!,
          prompt: result.prompt!,
          negativePrompt: result.negativePrompt,
          model: result.model,
          width: result.width,
          height: result.height,
          steps: result.steps,
          cfg: result.cfg,
          sampler: result.sampler,
          loras: prompt.characterLoras,
        },
      });

      return {
        success: true,
        generatedImage,
        generationResult: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  /**
   * Generate multiple variants for a panel
   */
  async generateVariants(panelId: string, options: VariantOptions): Promise<BatchGenerationResult> {
    const results: PanelGenerationResult[] = [];
    const baseSeed = options.baseSeed ?? Math.floor(Math.random() * 2147483647);
    const seeds = generateVariantSeeds({ seedBase: baseSeed, count: options.count });

    let successful = 0;
    let failed = 0;

    for (let i = 0; i < seeds.length; i++) {
      const variantOptions: GenerateOptions = {
        ...options,
        seed: seeds[i],
      };

      // Vary CFG if requested
      if (options.varyCfg && options.cfgRange) {
        const [minCfg, maxCfg] = options.cfgRange;
        variantOptions.cfg = minCfg + ((maxCfg - minCfg) * i) / (seeds.length - 1);
      }

      const result = await this.generate(panelId, variantOptions);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      total: options.count,
      successful,
      failed,
      results,
    };
  }

  /**
   * Regenerate from an existing generation with modified parameters
   */
  async regenerate(
    generationId: string,
    modifications: Partial<GenerateOptions> = {}
  ): Promise<PanelGenerationResult> {
    // Load original generation
    const original = await this.imageService.getById(generationId);
    if (!original) {
      return { success: false, error: "Original generation not found" };
    }

    const originalParams = original.params as {
      seed?: number;
      prompt?: string;
      negativePrompt?: string;
      model?: string;
      width?: number;
      height?: number;
      steps?: number;
      cfg?: number;
      sampler?: string;
    } | null;

    // Merge original params with modifications
    const options: GenerateOptions = {
      seed: modifications.seed ?? originalParams?.seed,
      model: modifications.model ?? originalParams?.model,
      width: modifications.width ?? originalParams?.width,
      height: modifications.height ?? originalParams?.height,
      steps: modifications.steps ?? originalParams?.steps,
      cfg: modifications.cfg ?? originalParams?.cfg,
      sampler: modifications.sampler ?? originalParams?.sampler,
      ...modifications,
    };

    return this.generate(original.panelId, options);
  }

  /**
   * Generate with same seed but different prompt modifications
   */
  async generateWithPromptModification(
    panelId: string,
    promptAdditions: { positive?: string; negative?: string },
    options: GenerateOptions = {}
  ): Promise<PanelGenerationResult> {
    try {
      const panel = await this.panelService.getById(panelId);
      if (!panel) {
        return { success: false, error: "Panel not found" };
      }

      const characters = await this.loadPanelCharacters(panel);
      const modelFamily = options.modelFamily ?? this.detectModelFamily(options.model);

      // Build base prompt
      const builder = new PromptBuilder(modelFamily);
      const direction = panel.direction as {
        sceneDescription?: string;
        cameraAngle?: string;
        lighting?: string;
        mood?: string;
        additionalPrompt?: string;
        negativePrompt?: string;
      } | null;

      if (direction) {
        builder.setDirection(direction);
      }

      // Add characters
      const panelCharacters = panel.characters as Array<{
        characterId: string;
        position?: string;
        action?: string;
        expression?: string;
      }> | null;

      if (panelCharacters) {
        for (const pc of panelCharacters) {
          const character = characters.find((c) => c.id === pc.characterId);
          if (character) {
            builder.addCharacter({
              character,
              position: pc.position,
              action: pc.action,
              expression: pc.expression,
            });
          }
        }
      }

      // Add prompt modifications
      if (promptAdditions.positive) {
        builder.addPositive(promptAdditions.positive);
      }
      if (promptAdditions.negative) {
        builder.addNegative(promptAdditions.negative);
      }

      const prompt = builder.build();
      const outputPath = this.generateOutputPath(panelId, options.seed);

      const result = await this.comfyui.executePipeline({
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        model: options.model ?? config.comfyui.defaultModel,
        width: options.width ?? 768,
        height: options.height ?? 1024,
        steps: options.steps ?? 28,
        cfg: options.cfg ?? 7,
        seed: options.seed,
        sampler: options.sampler ?? "euler_ancestral",
        loras: prompt.characterLoras,
        outputPath,
        quality: options.quality ?? "standard",
      });

      if (!result.success) {
        return { success: false, error: result.error, generationResult: result };
      }

      const generatedImage = await this.imageService.create({
        panelId,
        imagePath: result.imagePath!,
        params: {
          seed: result.seed!,
          prompt: result.prompt!,
          negativePrompt: result.negativePrompt,
          model: result.model,
          width: result.width,
          height: result.height,
          steps: result.steps,
          cfg: result.cfg,
          sampler: result.sampler,
          loras: prompt.characterLoras,
        },
      });

      return { success: true, generatedImage, generationResult: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Load all characters referenced in a panel
   */
  private async loadPanelCharacters(panel: Panel): Promise<Character[]> {
    const panelCharacters = panel.characters as Array<{ characterId: string }> | null;
    if (!panelCharacters || panelCharacters.length === 0) {
      return [];
    }

    const characters: Character[] = [];
    for (const pc of panelCharacters) {
      const character = await this.characterService.getById(pc.characterId);
      if (character) {
        characters.push(character);
      }
    }

    return characters;
  }

  /**
   * Detect model family from model name
   */
  private detectModelFamily(model?: string): ModelFamily {
    if (!model) {
      model = config.comfyui.defaultModel;
    }

    const lower = model.toLowerCase();
    if (lower.includes("illustrious") || lower.includes("noob")) return "illustrious";
    if (lower.includes("pony") || lower.includes("yiff")) return "pony";
    if (lower.includes("flux")) return "flux";
    if (lower.includes("realistic") || lower.includes("photon")) return "realistic";
    if (lower.includes("sdxl") || lower.includes("xl")) return "sdxl";
    return "sd15";
  }

  /**
   * Generate output path for a new image
   */
  private generateOutputPath(panelId: string, seed?: number): string {
    const timestamp = Date.now();
    const seedStr = seed ?? "random";
    return `${config.storage.outputDir}/panels/${panelId}/${timestamp}_${seedStr}.png`;
  }
}

// Singleton instance
let generatorInstance: PanelGenerator | null = null;

/**
 * Get the panel generator singleton
 */
export function getPanelGenerator(): PanelGenerator {
  if (!generatorInstance) {
    generatorInstance = new PanelGenerator();
  }
  return generatorInstance;
}

/**
 * Reset the generator singleton (for testing)
 */
export function resetPanelGenerator(): void {
  generatorInstance = null;
}
