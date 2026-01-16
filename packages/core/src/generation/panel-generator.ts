/**
 * Panel Generator
 *
 * High-level service for generating images for panels.
 * Combines PromptBuilder with ComfyUI MCP client.
 */

import { config } from "../config/index.js";
import { getPanelService, getCharacterService, getGeneratedImageService, getStoryboardService } from "../services/index.js";
import { PromptBuilder, buildPanelPrompt, generateVariantSeeds, type ModelFamily } from "./prompt-builder.js";
import { ComfyUIClient, getComfyUIClient, type GenerationResult, type ControlNetRequest } from "./comfyui-client.js";
import type { Panel, Character, GeneratedImage } from "../db/schema.js";
import {
  getConfigEngine,
  type QualityPresetId,
  type SlotContext,
  type ResolvedGenerationConfig,
} from "./config/index.js";

// ============================================================================
// ControlNet Types
// ============================================================================

/** Supported ControlNet control types */
export type ControlType = "canny" | "depth" | "openpose" | "lineart" | "scribble";

/** Reference configuration for consistency chaining */
export interface ReferenceConfig {
  /** Panel ID to use as reference */
  panelId?: string;
  /** Specific generation ID to use (otherwise uses panel's selected output) */
  generationId?: string;
  /** ControlNet type for extracting control signal */
  controlType: ControlType;
  /** Control strength (0.0-1.0) */
  strength?: number;
  /** Preprocess the reference image (extract edges/depth/pose) */
  preprocess?: boolean;
}

// ============================================================================
// Types
// ============================================================================

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
  /** Upload to cloud storage */
  uploadToCloud?: boolean;
  /** Reference image for ControlNet consistency */
  reference?: ReferenceConfig;
  /** Use previous panel in sequence as reference (auto-chains) */
  chainFromPrevious?: boolean;
  /** Control type when chaining from previous */
  chainControlType?: ControlType;
  /** Control strength when chaining */
  chainStrength?: number;

  // === Config Engine Presets ===

  /** Use a named size preset (e.g., "portrait_3x4", "landscape_16x9") */
  sizePreset?: string;
  /** Use a named quality preset (draft, standard, high, ultra) */
  qualityPreset?: QualityPresetId;
  /** Generate for a specific composition slot (enables smart sizing) */
  forComposition?: SlotContext;
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

// ============================================================================
// Panel Generator
// ============================================================================

/**
 * Panel Generator class
 */
export class PanelGenerator {
  private client: ComfyUIClient;
  private panelService = getPanelService();
  private characterService = getCharacterService();
  private imageService = getGeneratedImageService();
  private storyboardService = getStoryboardService();
  private configEngine = getConfigEngine();

  constructor(client?: ComfyUIClient) {
    this.client = client ?? getComfyUIClient();
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

      // Resolve configuration using the config engine
      // This handles size presets, quality presets, and slot-aware sizing
      const resolvedConfig = await this.configEngine.resolve({
        panelId,
        sizePreset: options.sizePreset,
        qualityPreset: options.qualityPreset,
        slot: options.forComposition,
        overrides: {
          width: options.width,
          height: options.height,
          steps: options.steps,
          cfg: options.cfg,
          sampler: options.sampler,
          scheduler: options.scheduler,
          model: options.model,
        },
      });

      // Load characters in the panel
      const characters = await this.loadPanelCharacters(panel);

      // Build the prompt using resolved model family
      const modelFamily = options.modelFamily ?? resolvedConfig.modelFamily;
      const prompt = buildPanelPrompt(panel, characters, modelFamily);

      // Resolve reference if using chaining or explicit reference
      const reference = await this.resolveReference(panel, options);

      // Choose generation method based on whether we have a reference
      let result: GenerationResult;

      if (reference) {
        // Generate with ControlNet guidance
        result = await this.client.generateWithControlNet({
          prompt: prompt.positive,
          negative_prompt: prompt.negative,
          control_image: reference.imagePath,
          control_type: reference.controlType,
          strength: reference.strength,
          model: resolvedConfig.model,
          width: resolvedConfig.width,
          height: resolvedConfig.height,
          steps: resolvedConfig.steps,
          cfg_scale: resolvedConfig.cfg,
          seed: options.seed,
          sampler: resolvedConfig.sampler,
          loras: prompt.characterLoras.map((l) => ({
            name: l.name,
            strength_model: l.weight,
            strength_clip: l.weight,
          })),
          upload_to_cloud: options.uploadToCloud ?? true,
        });
      } else {
        // Standard generation
        result = await this.client.generateImage({
          prompt: prompt.positive,
          negative_prompt: prompt.negative,
          model: resolvedConfig.model,
          width: resolvedConfig.width,
          height: resolvedConfig.height,
          steps: resolvedConfig.steps,
          cfg_scale: resolvedConfig.cfg,
          seed: options.seed,
          sampler: resolvedConfig.sampler,
          scheduler: resolvedConfig.scheduler,
          loras: prompt.characterLoras.map((l) => ({
            name: l.name,
            strength_model: l.weight,
            strength_clip: l.weight,
          })),
          upload_to_cloud: options.uploadToCloud ?? true,
        });
      }

      if (!result.success) {
        return { success: false, error: result.error, generationResult: result };
      }

      // Store generation record with resolved config values
      const generatedImage = await this.imageService.create({
        panelId,
        localPath: result.localPath ?? result.signedUrl ?? "",
        seed: result.seed ?? 0,
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        model: resolvedConfig.model,
        width: resolvedConfig.width,
        height: resolvedConfig.height,
        steps: resolvedConfig.steps,
        cfg: resolvedConfig.cfg,
        sampler: resolvedConfig.sampler,
        loras: prompt.characterLoras.map((l) => ({ name: l.name, strength: l.weight })),
        controlNetImage: reference?.imagePath,
        controlNetType: reference?.controlType,
        usedControlNet: !!reference,
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
   * Generate with explicit reference from another panel/generation
   */
  async generateWithReference(
    panelId: string,
    referenceConfig: ReferenceConfig,
    options: Omit<GenerateOptions, "reference"> = {}
  ): Promise<PanelGenerationResult> {
    return this.generate(panelId, { ...options, reference: referenceConfig });
  }

  /**
   * Generate all panels in a storyboard with automatic chaining
   *
   * Each panel uses the previous panel's output as ControlNet reference
   */
  async generateChained(
    panelIds: string[],
    options: Omit<GenerateOptions, "reference" | "chainFromPrevious"> & {
      controlType?: ControlType;
      controlStrength?: number;
    } = {}
  ): Promise<BatchGenerationResult> {
    const results: PanelGenerationResult[] = [];
    let previousGenerationId: string | undefined;

    for (const panelId of panelIds) {
      const genOptions: GenerateOptions = { ...options };

      // After first panel, chain from previous
      if (previousGenerationId) {
        genOptions.reference = {
          generationId: previousGenerationId,
          controlType: options.controlType ?? "lineart",
          strength: options.controlStrength ?? 0.5,
          preprocess: true,
        };
      }

      const result = await this.generate(panelId, genOptions);
      results.push(result);

      // Track successful generation for next panel
      if (result.success && result.generatedImage) {
        previousGenerationId = result.generatedImage.id;
      }
    }

    const successful = results.filter((r) => r.success).length;
    return {
      success: successful === panelIds.length,
      total: panelIds.length,
      successful,
      failed: panelIds.length - successful,
      results,
    };
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
        variantOptions.cfg = minCfg + ((maxCfg - minCfg) * i) / Math.max(seeds.length - 1, 1);
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

    // Merge original params with modifications
    const options: GenerateOptions = {
      seed: modifications.seed ?? original.seed,
      model: modifications.model ?? original.model,
      width: modifications.width ?? original.width,
      height: modifications.height ?? original.height,
      steps: modifications.steps ?? original.steps,
      cfg: modifications.cfg ?? original.cfg,
      sampler: modifications.sampler ?? original.sampler,
      scheduler: modifications.scheduler ?? original.scheduler ?? undefined,
      ...modifications,
    };

    return this.generate(original.panelId, options);
  }

  // ==================== Helper Methods ====================

  /**
   * Resolved reference info for ControlNet generation
   */
  private resolvedReference?: {
    imagePath: string;
    controlType: ControlType;
    strength: number;
    generationId?: string;
  };

  /**
   * Resolve reference image for ControlNet generation
   */
  private async resolveReference(
    panel: Panel,
    options: GenerateOptions
  ): Promise<{
    imagePath: string;
    controlType: ControlType;
    strength: number;
    generationId?: string;
  } | null> {
    // Explicit reference takes priority
    if (options.reference) {
      return this.resolveExplicitReference(options.reference);
    }

    // Auto-chain from previous panel
    if (options.chainFromPrevious) {
      return this.resolvePreviousPanelReference(panel, options);
    }

    return null;
  }

  /**
   * Resolve explicit reference config to image path
   */
  private async resolveExplicitReference(ref: ReferenceConfig): Promise<{
    imagePath: string;
    controlType: ControlType;
    strength: number;
    generationId?: string;
  } | null> {
    let imagePath: string | undefined;
    let generationId: string | undefined;

    // If explicit generation ID provided
    if (ref.generationId) {
      const generation = await this.imageService.getById(ref.generationId);
      if (generation) {
        imagePath = generation.localPath;
        generationId = generation.id;
      }
    }
    // If panel ID provided, get selected output
    else if (ref.panelId) {
      const refPanel = await this.panelService.getById(ref.panelId);
      if (refPanel?.selectedOutputId) {
        const generation = await this.imageService.getById(refPanel.selectedOutputId);
        if (generation) {
          imagePath = generation.localPath;
          generationId = generation.id;
        }
      } else if (refPanel) {
        // Get most recent generation for panel
        const generations = await this.panelService.getGenerations(ref.panelId);
        if (generations.length > 0) {
          imagePath = generations[0].localPath;
          generationId = generations[0].id;
        }
      }
    }

    if (!imagePath) {
      return null;
    }

    return {
      imagePath,
      controlType: ref.controlType,
      strength: ref.strength ?? 0.5,
      generationId,
    };
  }

  /**
   * Resolve reference from previous panel in sequence
   */
  private async resolvePreviousPanelReference(
    panel: Panel,
    options: GenerateOptions
  ): Promise<{
    imagePath: string;
    controlType: ControlType;
    strength: number;
    generationId?: string;
  } | null> {
    // Get all panels in the storyboard to find previous panel
    const panels = await this.panelService.getByStoryboard(panel.storyboardId);
    if (panels.length === 0) return null;

    // Sort by position to find sequence
    const sortedPanels = [...panels].sort((a, b) => a.position - b.position);
    const panelIndex = sortedPanels.findIndex((p) => p.id === panel.id);
    if (panelIndex <= 0) return null; // First panel or not found

    const prevPanel = sortedPanels[panelIndex - 1];
    if (!prevPanel) return null;

    // Get selected output or most recent
    let imagePath: string | undefined;
    let generationId: string | undefined;

    if (prevPanel.selectedOutputId) {
      const generation = await this.imageService.getById(prevPanel.selectedOutputId);
      if (generation) {
        imagePath = generation.localPath;
        generationId = generation.id;
      }
    } else {
      const generations = await this.panelService.getGenerations(prevPanel.id);
      if (generations.length > 0) {
        imagePath = generations[0].localPath;
        generationId = generations[0].id;
      }
    }

    if (!imagePath) return null;

    return {
      imagePath,
      controlType: options.chainControlType ?? "lineart",
      strength: options.chainStrength ?? 0.5,
      generationId,
    };
  }

  /**
   * Load all characters referenced in a panel
   */
  private async loadPanelCharacters(panel: Panel): Promise<Character[]> {
    const characterIds = panel.characterIds;
    if (!characterIds || characterIds.length === 0) {
      return [];
    }

    const characters: Character[] = [];
    for (const characterId of characterIds) {
      const character = await this.characterService.getById(characterId);
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
}

// ============================================================================
// Singleton
// ============================================================================

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

/**
 * Create a panel generator with injected client (for testing)
 */
export function createPanelGenerator(client: ComfyUIClient): PanelGenerator {
  return new PanelGenerator(client);
}

/**
 * Set the panel generator singleton (for testing)
 */
export function setPanelGenerator(generator: PanelGenerator): void {
  generatorInstance = generator;
}
