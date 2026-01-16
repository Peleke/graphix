/**
 * Style Service
 *
 * Manages style application across panel sequences for unified visual appearance.
 * Integrates with LoRA catalog for trigger word injection and compatibility checking.
 */

import { eq, and, inArray } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  panels,
  generatedImages,
  storyboards,
  type Panel,
  type GeneratedImage,
} from "../db/index.js";
import { getComfyUIClient, type ComfyUIClient } from "../generation/comfyui-client.js";
import {
  getLora,
  findLoraByName,
  listLorasByFamily,
  listLorasByCategory,
  getCompatibleLoras,
  suggestLoras,
  buildLoraStack,
  getTriggerWords,
  getRecommendedStack,
} from "../generation/models/lora-catalog.js";
import { getModelResolver } from "../generation/models/resolver.js";
import type { LoraCategory, ModelFamily, LoraEntry } from "../generation/models/types.js";

// ============================================================================
// Types
// ============================================================================

export interface ApplyStyleOptions {
  /** LoRA filename or name (will be searched in catalog) */
  styleLora: string;
  /** Override the recommended strength */
  strength?: number;
  /** Denoise amount for img2img (default 0.35 for style pass) */
  denoise?: number;
  /** Lower denoise to preserve more identity (sets denoise to 0.25) */
  preserveIdentity?: boolean;
  /** Output path for the styled image */
  outputPath?: string;
}

export interface BatchStyleOptions extends Omit<ApplyStyleOptions, "outputPath"> {
  /** Output directory for styled images (defaults to original location with _styled suffix) */
  outputDir?: string;
}

export interface LoraStackOptions {
  /** The checkpoint model being used */
  checkpoint: string;
  /** Character identity LoRAs (applied first) */
  characterLoras?: string[];
  /** Style LoRA (applied middle) */
  styleLora?: string;
  /** Quality enhancer LoRA (applied last) */
  qualityLora?: string;
}

export interface LoraStackResult {
  /** Ordered list of LoRAs to apply */
  loras: Array<{
    filename: string;
    name: string;
    strength: number;
    trigger?: string;
  }>;
  /** Combined trigger words to inject into prompt */
  triggers: string[];
  /** Any warnings about compatibility */
  warnings: string[];
}

export interface StyleApplicationResult {
  success: boolean;
  panelId: string;
  originalImage?: string;
  styledImage?: string;
  error?: string;
}

export interface BatchStyleResult {
  success: boolean;
  total: number;
  completed: number;
  failed: number;
  results: StyleApplicationResult[];
}

// ============================================================================
// Style Service
// ============================================================================

export class StyleService {
  private db: Database;
  private client: ComfyUIClient;
  private resolver = getModelResolver();

  constructor(db?: Database, client?: ComfyUIClient) {
    this.db = db ?? getDefaultDatabase();
    this.client = client ?? getComfyUIClient();
  }

  // ==========================================================================
  // Style Application
  // ==========================================================================

  /**
   * Apply a style LoRA to a panel's image via img2img
   */
  async applyStyle(
    panelId: string,
    options: ApplyStyleOptions
  ): Promise<StyleApplicationResult> {
    try {
      // Get panel and its latest generated image
      const [panel] = await this.db
        .select()
        .from(panels)
        .where(eq(panels.id, panelId));

      if (!panel) {
        return {
          success: false,
          panelId,
          error: `Panel not found: ${panelId}`,
        };
      }

      // Get the latest generated image for this panel
      const [latestImage] = await this.db
        .select()
        .from(generatedImages)
        .where(eq(generatedImages.panelId, panelId))
        .orderBy(generatedImages.createdAt);

      if (!latestImage) {
        return {
          success: false,
          panelId,
          error: `No generated image found for panel: ${panelId}`,
        };
      }

      // Find the LoRA
      let lora = getLora(options.styleLora);
      if (!lora) {
        lora = findLoraByName(options.styleLora);
      }
      if (!lora) {
        return {
          success: false,
          panelId,
          error: `LoRA not found: ${options.styleLora}`,
        };
      }

      // Determine denoise
      let denoise = options.denoise ?? 0.35;
      if (options.preserveIdentity) {
        denoise = 0.25;
      }

      // Build prompt with trigger word
      const basePrompt = panel.description || "detailed image";
      const prompt = lora.trigger
        ? `${lora.trigger}, ${basePrompt}`
        : basePrompt;

      // Determine output path
      const outputPath =
        options.outputPath ??
        latestImage.localPath?.replace(".png", "_styled.png") ??
        `output/styled_${panelId}.png`;

      // Get the input filename (assume it's in ComfyUI input folder)
      const inputFilename = latestImage.localPath?.split("/").pop() ?? "";

      // Call generateImage via client
      // Note: For true img2img, the client would need an img2img endpoint
      // This generates with the style LoRA applied
      const result = await this.client.generateImage({
        prompt,
        negative_prompt: "bad quality, blurry",
        loras: [
          {
            name: lora.filename,
            strength_model: options.strength ?? lora.strength.recommended,
          },
        ],
        output_path: outputPath,
      });

      if (!result.success) {
        return {
          success: false,
          panelId,
          error: result.error || "Generation failed",
        };
      }

      return {
        success: true,
        panelId,
        originalImage: latestImage.localPath ?? undefined,
        styledImage: outputPath,
      };
    } catch (error) {
      return {
        success: false,
        panelId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Apply a style to all panels in a storyboard
   */
  async applyStyleToStoryboard(
    storyboardId: string,
    options: BatchStyleOptions
  ): Promise<BatchStyleResult> {
    // Verify storyboard exists
    const [storyboard] = await this.db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, storyboardId));

    if (!storyboard) {
      return {
        success: false,
        total: 0,
        completed: 0,
        failed: 0,
        results: [
          {
            success: false,
            panelId: "",
            error: `Storyboard not found: ${storyboardId}`,
          },
        ],
      };
    }

    // Get all panels in the storyboard
    const panelList = await this.db
      .select()
      .from(panels)
      .where(eq(panels.storyboardId, storyboardId))
      .orderBy(panels.position);

    if (panelList.length === 0) {
      return {
        success: true,
        total: 0,
        completed: 0,
        failed: 0,
        results: [],
      };
    }

    const results: StyleApplicationResult[] = [];
    let completed = 0;
    let failed = 0;

    // Apply style to each panel
    for (const panel of panelList) {
      const outputPath = options.outputDir
        ? `${options.outputDir}/panel_${panel.position}_styled.png`
        : undefined;

      const result = await this.applyStyle(panel.id, {
        ...options,
        outputPath,
      });

      results.push(result);
      if (result.success) {
        completed++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      total: panelList.length,
      completed,
      failed,
      results,
    };
  }

  // ==========================================================================
  // LoRA Stack Building
  // ==========================================================================

  /**
   * Build a properly ordered LoRA stack for generation
   */
  buildLoraStack(options: LoraStackOptions): LoraStackResult {
    const warnings: string[] = [];
    const loraEntries: LoraEntry[] = [];

    // Helper to add LoRA with validation
    const addLora = (loraName: string, category: string) => {
      let lora = getLora(loraName);
      if (!lora) {
        lora = findLoraByName(loraName);
      }
      if (!lora) {
        warnings.push(`LoRA not found: ${loraName}`);
        return;
      }

      // Validate compatibility
      const validation = this.resolver.validateLora(options.checkpoint, lora.filename);
      if (!validation.valid) {
        warnings.push(validation.error || `Incompatible LoRA: ${loraName}`);
        return;
      }
      if (validation.warnings.length > 0) {
        warnings.push(...validation.warnings);
      }

      loraEntries.push(lora);
    };

    // Add character LoRAs (first in stack)
    if (options.characterLoras) {
      for (const charLora of options.characterLoras) {
        addLora(charLora, "character");
      }
    }

    // Add style LoRA (middle in stack)
    if (options.styleLora) {
      addLora(options.styleLora, "style");
    }

    // Add quality LoRA (last in stack)
    if (options.qualityLora) {
      addLora(options.qualityLora, "quality");
    }

    // Build properly ordered stack
    const orderedStack = buildLoraStack(loraEntries);

    // Extract triggers
    const triggers = getTriggerWords(orderedStack.map((l) => l.filename));

    return {
      loras: orderedStack.map((lora) => ({
        filename: lora.filename,
        name: lora.name,
        strength: lora.strength.recommended,
        trigger: lora.trigger,
      })),
      triggers,
      warnings,
    };
  }

  // ==========================================================================
  // Style Discovery
  // ==========================================================================

  /**
   * List available style LoRAs for a checkpoint
   */
  listAvailableStyles(checkpoint: string): LoraEntry[] {
    const family = this.resolver.getFamily(checkpoint);
    if (!family) return [];

    return suggestLoras(checkpoint, ["style"]);
  }

  /**
   * List all available LoRAs for a checkpoint by category
   */
  listAvailableLoras(
    checkpoint: string,
    categories?: LoraCategory[]
  ): LoraEntry[] {
    return suggestLoras(checkpoint, categories);
  }

  /**
   * Get recommended LoRA stack for a use case
   */
  getRecommendedStack(
    checkpoint: string,
    useCase: "comic" | "realistic" | "anime" | "general"
  ): LoraEntry[] {
    return getRecommendedStack(checkpoint, useCase);
  }

  /**
   * Get detailed info about a LoRA
   */
  getLoraInfo(loraName: string): LoraEntry | undefined {
    let lora = getLora(loraName);
    if (!lora) {
      lora = findLoraByName(loraName);
    }
    return lora;
  }

  /**
   * Validate that a LoRA is compatible with a checkpoint
   */
  validateLora(
    checkpoint: string,
    loraName: string
  ): { valid: boolean; error?: string; warnings: string[] } {
    let lora = getLora(loraName);
    if (!lora) {
      lora = findLoraByName(loraName);
    }
    if (!lora) {
      return {
        valid: false,
        error: `LoRA not found: ${loraName}`,
        warnings: [],
      };
    }

    return this.resolver.validateLora(checkpoint, lora.filename);
  }
}

// ============================================================================
// Singleton
// ============================================================================

let styleServiceInstance: StyleService | null = null;

export function getStyleService(): StyleService {
  if (!styleServiceInstance) {
    styleServiceInstance = new StyleService();
  }
  return styleServiceInstance;
}

export function resetStyleService(): void {
  styleServiceInstance = null;
}
