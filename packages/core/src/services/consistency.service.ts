/**
 * Consistency Service
 *
 * High-level service for maintaining visual consistency across panel sequences.
 * Orchestrates IP-Adapter (identity), ControlNet (pose/composition), and
 * prompt engineering to ensure characters and scenes remain consistent.
 */

import { getIPAdapter, type IdentityEmbedding, type IPAdapterModel } from "../generation/ip-adapter.js";
import { getControlNetStack, type ControlCondition, type ControlType, CONTROL_STACK_PRESETS } from "../generation/controlnet-stack.js";
import { getComfyUIClient, type GenerationResult } from "../generation/comfyui-client.js";
import { getPanelService } from "./panel.service.js";
import { getGeneratedImageService } from "./generated-image.service.js";
import type { Panel, GeneratedImage } from "../db/index.js";
import { getConfigEngine } from "../generation/config/index.js";
import type { QualityPresetId } from "../generation/config/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Stored identity for reuse across panels
 */
export interface StoredIdentity {
  id: string;
  name: string;
  description?: string;
  embedding: IdentityEmbedding;
  defaultStrength: number;
  referenceImages: string[];
  createdAt: Date;
  lastUsedAt: Date;
  usageCount: number;
}

/**
 * Options for extracting identity from panel(s)
 */
export interface ExtractIdentityOptions {
  /** Name for this identity (e.g., "Main Character") */
  name: string;
  /** Optional description */
  description?: string;
  /** IP-Adapter model to use */
  adapterModel?: IPAdapterModel;
  /** Source panel IDs or image paths */
  sources: string[];
  /** Whether sources are panel IDs (true) or file paths (false) */
  sourcesArePanelIds?: boolean;
}

/**
 * Options for applying identity to a panel
 */
export interface ApplyIdentityOptions {
  /** Panel ID to generate for */
  panelId: string;
  /** Identity ID to apply */
  identityId: string;
  /** Override identity strength (default from identity) */
  strength?: number;
  /** Additional prompt to merge */
  prompt?: string;
  /** Quality preset */
  qualityPreset?: QualityPresetId;
  /** Seed for reproducibility */
  seed?: number;
}

/**
 * Options for chaining from previous panel
 */
export interface ChainOptions {
  /** Panel ID to generate for */
  panelId: string;
  /** Previous panel ID to chain from */
  previousPanelId: string;
  /** What aspects to maintain */
  maintain: {
    identity?: boolean;
    pose?: boolean;
    composition?: boolean;
    style?: boolean;
  };
  /** Strength of continuity (0.0-1.0) */
  continuityStrength?: number;
  /** Additional prompt modifications */
  prompt?: string;
  /** Quality preset */
  qualityPreset?: QualityPresetId;
}

/**
 * Reference sheet generation options
 */
export interface ReferenceSheetOptions {
  /** Identity to create sheet for */
  identityId: string;
  /** Number of poses to generate */
  poseCount?: number;
  /** Poses to include (front, side, back, etc.) */
  poses?: string[];
  /** Include expression variants */
  includeExpressions?: boolean;
  /** Output directory */
  outputDir: string;
  /** Quality preset */
  qualityPreset?: QualityPresetId;
}

/**
 * Result from consistency operations
 */
export interface ConsistencyResult {
  success: boolean;
  panelId?: string;
  identityId?: string;
  generationResult?: GenerationResult;
  error?: string;
}

// ============================================================================
// In-Memory Storage (would be DB in production)
// ============================================================================

const identityStore = new Map<string, StoredIdentity>();

// ============================================================================
// Consistency Service
// ============================================================================

/**
 * Consistency Service
 *
 * Maintains visual consistency across comic panel sequences.
 *
 * Key features:
 * - Identity extraction and storage
 * - Identity application to new panels
 * - Panel chaining for sequence continuity
 * - Reference sheet generation
 *
 * Usage:
 * ```typescript
 * const consistency = getConsistencyService();
 *
 * // Extract identity from reference panels
 * const identity = await consistency.extractIdentity({
 *   name: "Hero",
 *   sources: ["panel_001", "panel_002"],
 *   sourcesArePanelIds: true
 * });
 *
 * // Apply to new panel
 * await consistency.applyIdentity({
 *   panelId: "panel_003",
 *   identityId: identity.id,
 *   strength: 0.8
 * });
 *
 * // Chain from previous panel
 * await consistency.chainFromPrevious({
 *   panelId: "panel_004",
 *   previousPanelId: "panel_003",
 *   maintain: { identity: true, pose: false }
 * });
 * ```
 */
class ConsistencyService {
  private ipAdapter = getIPAdapter();
  private controlStack = getControlNetStack();
  private comfyClient = getComfyUIClient();
  private panelService = getPanelService();
  private imageService = getGeneratedImageService();
  private configEngine = getConfigEngine();

  // ==========================================================================
  // Identity Management
  // ==========================================================================

  /**
   * Extract identity from reference image(s) or panel(s)
   */
  async extractIdentity(options: ExtractIdentityOptions): Promise<ConsistencyResult> {
    const {
      name,
      description,
      adapterModel = "ip-adapter-plus-face",
      sources,
      sourcesArePanelIds = true,
    } = options;

    try {
      // Resolve source images
      let sourceImages: string[] = [];

      if (sourcesArePanelIds) {
        // Get generated image paths from panels
        for (const panelId of sources) {
          const selectedImage = await this.imageService.getSelected(panelId);
          if (selectedImage?.localPath) {
            sourceImages.push(selectedImage.localPath);
          }
        }
      } else {
        sourceImages = sources;
      }

      if (sourceImages.length === 0) {
        return { success: false, error: "No valid source images found" };
      }

      // Extract embedding
      const result = await this.ipAdapter.extractIdentity({
        sourceImages,
        adapterModel,
        name,
        description,
      });

      if (!result.success || !result.embedding) {
        return { success: false, error: result.error ?? "Failed to extract identity" };
      }

      // Store identity
      const storedIdentity: StoredIdentity = {
        id: result.embedding.id,
        name,
        description,
        embedding: result.embedding,
        defaultStrength: this.ipAdapter.getRecommendedSettings(adapterModel).defaultStrength,
        referenceImages: sourceImages,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 0,
      };

      identityStore.set(storedIdentity.id, storedIdentity);

      return {
        success: true,
        identityId: storedIdentity.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply stored identity to a panel
   */
  async applyIdentity(options: ApplyIdentityOptions): Promise<ConsistencyResult> {
    const { panelId, identityId, strength, prompt, qualityPreset = "standard", seed } = options;

    try {
      // Get identity
      const identity = identityStore.get(identityId);
      if (!identity) {
        return { success: false, error: `Identity not found: ${identityId}` };
      }

      // Get panel
      const panel = await this.panelService.getById(panelId);
      if (!panel) {
        return { success: false, error: `Panel not found: ${panelId}` };
      }

      // Get config for this panel
      const config = await this.configEngine.resolve({
        qualityPreset,
        panelId,
      });

      // Build prompt
      const finalPrompt = prompt
        ? `${panel.description}, ${prompt}`
        : panel.description ?? "1girl";

      // Generate with identity
      const outputPath = this.generateOutputPath(panelId);
      const genResult = await this.ipAdapter.generateFromEmbedding(
        finalPrompt,
        {
          embedding: identity.embedding,
          strength: strength ?? identity.defaultStrength,
        },
        {
          negativePrompt: config.negativePrompt,
          width: config.width,
          height: config.height,
          steps: config.steps,
          cfgScale: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          model: config.model,
          seed,
          outputPath,
        }
      );

      if (genResult.success && genResult.localPath) {
        // Create generated image record
        const image = await this.imageService.create({
          panelId,
          localPath: genResult.localPath,
          cloudUrl: genResult.signedUrl,
          seed: genResult.seed ?? seed ?? Math.floor(Math.random() * 2147483647),
          prompt: finalPrompt,
          negativePrompt: config.negativePrompt,
          model: genResult.model ?? config.model,
          steps: config.steps,
          cfg: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          width: config.width,
          height: config.height,
          usedIPAdapter: true,
          ipAdapterImages: identity.referenceImages,
        });

        // Select the new output
        await this.panelService.selectOutput(panelId, image.id);

        // Update identity usage
        identity.lastUsedAt = new Date();
        identity.usageCount++;
      }

      return {
        success: genResult.success,
        panelId,
        identityId,
        generationResult: genResult,
        error: genResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get stored identity by ID
   */
  getIdentity(identityId: string): StoredIdentity | undefined {
    return identityStore.get(identityId);
  }

  /**
   * List all stored identities
   */
  listIdentities(): StoredIdentity[] {
    return Array.from(identityStore.values());
  }

  /**
   * Delete stored identity
   */
  deleteIdentity(identityId: string): boolean {
    return identityStore.delete(identityId);
  }

  // ==========================================================================
  // Panel Chaining
  // ==========================================================================

  /**
   * Chain generation from previous panel
   *
   * Maintains continuity by using the previous panel as reference.
   */
  async chainFromPrevious(options: ChainOptions): Promise<ConsistencyResult> {
    const {
      panelId,
      previousPanelId,
      maintain,
      continuityStrength = 0.7,
      prompt,
      qualityPreset = "standard",
    } = options;

    try {
      // Get both panels
      const [panel, previousPanel] = await Promise.all([
        this.panelService.getById(panelId),
        this.panelService.getById(previousPanelId),
      ]);

      if (!panel) {
        return { success: false, error: `Panel not found: ${panelId}` };
      }
      if (!previousPanel) {
        return { success: false, error: `Previous panel not found: ${previousPanelId}` };
      }

      // Get selected image from previous panel
      const previousImage = await this.imageService.getSelected(previousPanelId);
      if (!previousImage?.localPath) {
        return {
          success: false,
          error: "Previous panel has no selected image to chain from",
        };
      }

      // Get config
      const config = await this.configEngine.resolve({
        qualityPreset,
        panelId,
      });

      // Build control stack based on what to maintain
      const controls: ControlCondition[] = [];

      if (maintain.pose) {
        controls.push({
          type: "openpose",
          image: previousImage.localPath,
          strength: continuityStrength * 0.9,
        });
      }

      if (maintain.composition) {
        controls.push({
          type: "depth",
          image: previousImage.localPath,
          strength: continuityStrength * 0.5,
        });
      }

      if (maintain.style) {
        controls.push({
          type: "softedge",
          image: previousImage.localPath,
          strength: continuityStrength * 0.4,
        });
      }

      // Build prompt
      const finalPrompt = prompt
        ? `${panel.description}, ${prompt}`
        : panel.description ?? "1girl";

      const outputPath = this.generateOutputPath(panelId);

      let genResult: GenerationResult;
      let usedControlNet = false;
      let controlNetType: string | undefined;

      if (controls.length > 0) {
        // Use ControlNet stack
        genResult = await this.controlStack.generate({
          prompt: finalPrompt,
          negativePrompt: config.negativePrompt,
          controls,
          width: config.width,
          height: config.height,
          steps: config.steps,
          cfgScale: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          model: config.model,
          outputPath,
        });
        usedControlNet = true;
        controlNetType = controls.map((c) => c.type).join("+");
      } else if (maintain.identity) {
        // Use IP-Adapter for identity only
        genResult = await this.ipAdapter.generateWithIdentity({
          prompt: finalPrompt,
          negativePrompt: config.negativePrompt,
          referenceImages: [previousImage.localPath],
          strength: continuityStrength,
          width: config.width,
          height: config.height,
          steps: config.steps,
          cfgScale: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          model: config.model,
          outputPath,
        });
      } else {
        // No continuity, just generate normally
        genResult = await this.comfyClient.generateImage({
          prompt: finalPrompt,
          negative_prompt: config.negativePrompt,
          width: config.width,
          height: config.height,
          steps: config.steps,
          cfg_scale: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          model: config.model,
          output_path: outputPath,
        });
      }

      if (genResult.success && genResult.localPath) {
        // Create generated image record
        const image = await this.imageService.create({
          panelId,
          localPath: genResult.localPath,
          cloudUrl: genResult.signedUrl,
          seed: genResult.seed ?? Math.floor(Math.random() * 2147483647),
          prompt: finalPrompt,
          negativePrompt: config.negativePrompt,
          model: genResult.model ?? config.model,
          steps: config.steps,
          cfg: config.cfg,
          sampler: config.sampler,
          scheduler: config.scheduler,
          width: config.width,
          height: config.height,
          usedIPAdapter: maintain.identity,
          ipAdapterImages: maintain.identity ? [previousImage.localPath] : undefined,
          usedControlNet,
          controlNetType,
          controlNetImage: usedControlNet ? previousImage.localPath : undefined,
        });

        // Select the new output
        await this.panelService.selectOutput(panelId, image.id);
      }

      return {
        success: genResult.success,
        panelId,
        generationResult: genResult,
        error: genResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==========================================================================
  // Reference Sheet Generation
  // ==========================================================================

  /**
   * Generate reference sheet for an identity
   *
   * Creates multiple views/poses of a character for reference.
   */
  async generateReferenceSheet(
    options: ReferenceSheetOptions
  ): Promise<{ success: boolean; images: string[]; error?: string }> {
    const {
      identityId,
      poseCount = 4,
      poses = ["front view", "side view", "back view", "three-quarter view"],
      includeExpressions = false,
      outputDir,
      qualityPreset = "high",
    } = options;

    const identity = identityStore.get(identityId);
    if (!identity) {
      return { success: false, images: [], error: `Identity not found: ${identityId}` };
    }

    const config = await this.configEngine.resolve({ qualityPreset });
    const generatedImages: string[] = [];
    const posesToGenerate = poses.slice(0, poseCount);

    for (let i = 0; i < posesToGenerate.length; i++) {
      const pose = posesToGenerate[i];
      const outputPath = `${outputDir}/ref_${identity.id}_${i}.png`;

      const result = await this.ipAdapter.generateFromEmbedding(
        `${identity.name}, ${pose}, full body, simple background, character reference sheet`,
        {
          embedding: identity.embedding,
          strength: identity.defaultStrength + 0.1, // Slightly higher for reference
        },
        {
          width: config.width,
          height: config.height,
          steps: config.steps,
          cfgScale: config.cfg,
          sampler: config.sampler,
          model: config.model,
          outputPath,
        }
      );

      if (result.success && result.localPath) {
        generatedImages.push(result.localPath);
      }
    }

    // Optionally generate expressions
    if (includeExpressions) {
      const expressions = ["smiling", "serious", "surprised", "angry"];
      for (let i = 0; i < expressions.length; i++) {
        const expression = expressions[i];
        const outputPath = `${outputDir}/ref_${identity.id}_expr_${i}.png`;

        const result = await this.ipAdapter.generateFromEmbedding(
          `${identity.name}, portrait, ${expression} expression, simple background`,
          {
            embedding: identity.embedding,
            strength: identity.defaultStrength + 0.15,
          },
          {
            width: config.width,
            height: config.height,
            steps: config.steps,
            cfgScale: config.cfg,
            outputPath,
          }
        );

        if (result.success && result.localPath) {
          generatedImages.push(result.localPath);
        }
      }
    }

    return {
      success: generatedImages.length > 0,
      images: generatedImages,
    };
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Apply identity to multiple panels
   */
  async applyIdentityToMany(
    identityId: string,
    panelIds: string[],
    options?: { strength?: number; qualityPreset?: QualityPresetId }
  ): Promise<{ results: ConsistencyResult[]; successCount: number }> {
    const results: ConsistencyResult[] = [];
    let successCount = 0;

    for (const panelId of panelIds) {
      const result = await this.applyIdentity({
        panelId,
        identityId,
        strength: options?.strength,
        qualityPreset: options?.qualityPreset,
      });

      results.push(result);
      if (result.success) successCount++;
    }

    return { results, successCount };
  }

  /**
   * Chain entire sequence of panels
   */
  async chainSequence(
    panelIds: string[],
    options: Omit<ChainOptions, "panelId" | "previousPanelId">
  ): Promise<{ results: ConsistencyResult[]; successCount: number }> {
    const results: ConsistencyResult[] = [];
    let successCount = 0;

    // First panel has no previous, skip or generate normally
    for (let i = 1; i < panelIds.length; i++) {
      const result = await this.chainFromPrevious({
        panelId: panelIds[i],
        previousPanelId: panelIds[i - 1],
        ...options,
      });

      results.push(result);
      if (result.success) successCount++;
    }

    return { results, successCount };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Generate output path for panel
   */
  private generateOutputPath(panelId: string): string {
    const timestamp = Date.now();
    return `output/panels/${panelId}_${timestamp}.png`;
  }

  // ==========================================================================
  // Reference Data Methods
  // ==========================================================================

  /**
   * List available IP-Adapter models
   */
  listAdapterModels() {
    return this.ipAdapter.listAdapterModels();
  }

  /**
   * List available ControlNet presets
   */
  listControlPresets() {
    return this.controlStack.listPresets();
  }

  /**
   * List available control types
   */
  listControlTypes() {
    return this.controlStack.listControlTypes();
  }

  /**
   * Get recommended settings for an IP-Adapter model
   */
  getRecommendedAdapterSettings(model: string) {
    return this.ipAdapter.getRecommendedSettings(model as IPAdapterModel);
  }

  /**
   * Get recommended strength for a control type
   */
  getRecommendedControlStrength(controlType: string) {
    return this.controlStack.getRecommendedStrength(controlType as ControlType);
  }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: ConsistencyService | null = null;

/**
 * Get the consistency service singleton
 */
export function getConsistencyService(): ConsistencyService {
  if (!serviceInstance) {
    serviceInstance = new ConsistencyService();
  }
  return serviceInstance;
}

/**
 * Reset the consistency service singleton (for testing)
 */
export function resetConsistencyService(): void {
  serviceInstance = null;
  identityStore.clear();
}
