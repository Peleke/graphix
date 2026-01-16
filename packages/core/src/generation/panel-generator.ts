/**
 * Panel Generator
 *
 * High-level service for generating images for panels.
 * Combines PromptBuilder with ComfyUI MCP client.
 */

import path from "path";
import { config } from "../config/index.js";
import { getPanelService, getCharacterService, getGeneratedImageService, getStoryboardService } from "../services/index.js";
import { getNarrativeService, type GenerateCaptionsOptions } from "../services/narrative.service.js";
import { PromptBuilder, buildPanelPrompt, generateVariantSeeds, type ModelFamily } from "./prompt-builder.js";
import { ComfyUIClient, getComfyUIClient, type GenerationResult, type ControlNetRequest } from "./comfyui-client.js";
import type { Panel, Character, GeneratedImage, PanelCaption } from "../db/schema.js";
import {
  getConfigEngine,
  type QualityPresetId,
  type SlotContext,
  type ResolvedGenerationConfig,
} from "./config/index.js";
import { compositeCaptions } from "../composition/caption-renderer.js";
import type { RenderableCaption } from "../composition/caption-types.js";

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

  // === Caption Integration ===

  /** Auto-generate captions from linked beat (default: false) */
  generateCaptions?: boolean;
  /** Options for caption generation (positions, types to include) */
  captionOptions?: GenerateCaptionsOptions;
  /** Render captions onto the generated image (default: false) */
  renderCaptions?: boolean;
  /** Only render enabled captions (default: true) */
  enabledCaptionsOnly?: boolean;
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
  /** Generated captions (if generateCaptions was true) */
  captions?: PanelCaption[];
  /** Path to captioned image (if renderCaptions was true) */
  captionedImagePath?: string;
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

      // === Caption Integration ===
      let generatedCaptions: PanelCaption[] | undefined;
      let captionedImagePath: string | undefined;

      // Generate captions from beat if requested
      if (options.generateCaptions) {
        const captionResult = await this.generateCaptionsFromBeat(panelId, options.captionOptions);
        generatedCaptions = captionResult.captions;
      }

      // Render captions onto image if requested
      if (options.renderCaptions && generatedImage.localPath) {
        captionedImagePath = await this.renderCaptionsOnImage(
          generatedImage.localPath,
          panelId,
          { enabledOnly: options.enabledCaptionsOnly ?? true }
        );
      }

      return {
        success: true,
        generatedImage,
        generationResult: result,
        captions: generatedCaptions,
        captionedImagePath,
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

  // ==========================================================================
  // CAPTION INTEGRATION
  // ==========================================================================

  /**
   * Generate captions from a panel's linked beat.
   * Looks up the beat that was converted to this panel and extracts its dialogue/narration/sfx.
   */
  async generateCaptionsFromBeat(
    panelId: string,
    options?: GenerateCaptionsOptions
  ): Promise<{ captions: PanelCaption[]; beatId?: string }> {
    const narrativeService = getNarrativeService();

    // Find the beat linked to this panel
    const panel = await this.panelService.getById(panelId);
    if (!panel) {
      throw new Error(`Panel not found: ${panelId}`);
    }

    // Get the storyboard to find related story/beats
    const storyboard = await this.storyboardService.getById(panel.storyboardId);
    if (!storyboard) {
      throw new Error(`Storyboard not found: ${panel.storyboardId}`);
    }

    // Search for beats with this panelId
    const { beats } = await import("../db/schema.js");
    const { eq } = await import("drizzle-orm");
    const { getDefaultDatabase } = await import("../db/client.js");
    const db = getDefaultDatabase();

    const [beat] = await db.select().from(beats).where(eq(beats.panelId, panelId));
    if (!beat) {
      // No beat linked to this panel - return empty
      return { captions: [] };
    }

    // Generate captions using NarrativeService
    const result = await narrativeService.generateCaptionsFromBeat(beat.id, options);
    return {
      captions: result.captions,
      beatId: beat.id,
    };
  }

  /**
   * Render captions onto an image and save to a new file.
   * Returns the path to the captioned image.
   */
  async renderCaptionsOnImage(
    imagePath: string,
    panelId: string,
    options: { enabledOnly?: boolean; outputPath?: string } = {}
  ): Promise<string> {
    const narrativeService = getNarrativeService();
    const { enabledOnly = true, outputPath: customOutputPath } = options;

    // Get captions for this panel
    const captions = await narrativeService.getCaptionsForPanel(panelId, { enabledOnly });

    if (captions.length === 0) {
      // No captions to render - return original path
      return imagePath;
    }

    // Convert PanelCaption to RenderableCaption
    const renderableCaptions: RenderableCaption[] = captions.map((c) => ({
      id: c.id,
      type: c.type,
      text: c.text,
      characterId: c.characterId ?? undefined,
      position: c.position,
      tailDirection: c.tailDirection ?? undefined,
      style: c.style ?? undefined,
      zIndex: c.zIndex,
    }));

    // Use custom output path if provided, otherwise generate default with _captioned suffix
    let outputPath: string;
    if (customOutputPath) {
      outputPath = customOutputPath;
    } else {
      const ext = path.extname(imagePath);
      const base = imagePath.slice(0, -ext.length);
      outputPath = `${base}_captioned${ext}`;
    }

    // Composite captions onto image
    await compositeCaptions(imagePath, renderableCaptions, outputPath);

    return outputPath;
  }

  /**
   * Re-render captions for an existing generated image.
   * Useful when captions are modified after initial generation.
   */
  async rerenderWithCaptions(
    generatedImageId: string,
    options: { enabledOnly?: boolean } = {}
  ): Promise<{ success: boolean; captionedImagePath?: string; error?: string }> {
    try {
      const image = await this.imageService.getById(generatedImageId);
      if (!image) {
        return { success: false, error: "Generated image not found" };
      }

      const captionedPath = await this.renderCaptionsOnImage(
        image.localPath,
        image.panelId,
        options
      );

      return { success: true, captionedImagePath: captionedPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render captions",
      };
    }
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
