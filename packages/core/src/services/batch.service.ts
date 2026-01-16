/**
 * Batch Operations Service
 *
 * Provides efficient batch operations for panels, captions, and generation.
 * Useful for scaffolding complete stories or processing multiple items at once.
 */

import { getDefaultDatabase, type Database } from "../db/index.js";
import { getPanelService, type PanelService } from "./panel.service.js";
import { getCaptionService, type CaptionService, type CreateCaptionInput } from "./caption.service.js";
import { getGeneratedImageService, type GeneratedImageService } from "./generated-image.service.js";
import {
  getPanelGenerator,
  type PanelGenerator,
  type GenerateOptions,
  type PanelGenerationResult,
} from "../generation/index.js";
import {
  compositeCaptions,
  type ComposePageResult,
} from "../composition/index.js";
import type { Panel, PanelCaption, GeneratedImage, PanelDirection } from "../db/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Input for creating a single panel in a batch
 */
export interface BatchPanelInput {
  /** Position in the storyboard (auto-increments if not provided) */
  position?: number;
  /** Panel description */
  description?: string;
  /** Direction hints */
  direction?: Partial<PanelDirection>;
  /** Character IDs to include */
  characterIds?: string[];
}

/**
 * Input for adding a caption to a panel in a batch
 */
export interface BatchCaptionInput {
  /** Panel ID to add caption to */
  panelId: string;
  /** Caption data */
  caption: CreateCaptionInput;
}

/**
 * Options for batch generation
 */
export interface BatchGenerateOptions extends GenerateOptions {
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, current: string) => void;
}

/**
 * Options for batch caption rendering
 */
export interface BatchRenderOptions {
  /** Output directory for rendered images */
  outputDir: string;
  /** Image format (sharp infers from file extension) */
  format?: "png" | "jpeg" | "webp";
  /** Continue on error */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number, current: string) => void;
}

/**
 * Result of batch panel creation
 */
export interface BatchCreateResult {
  success: boolean;
  created: Panel[];
  errors: Array<{ index: number; error: string }>;
}

/**
 * Result of batch caption creation
 */
export interface BatchCaptionResult {
  success: boolean;
  created: PanelCaption[];
  errors: Array<{ panelId: string; error: string }>;
}

/**
 * Result of batch generation
 */
export interface BatchGenerateResult {
  success: boolean;
  results: Array<{
    panelId: string;
    success: boolean;
    generatedImage?: GeneratedImage;
    error?: string;
  }>;
  totalGenerated: number;
  totalFailed: number;
}

/**
 * Result of batch caption rendering
 */
export interface BatchRenderResult {
  success: boolean;
  results: Array<{
    panelId: string;
    success: boolean;
    outputPath?: string;
    error?: string;
  }>;
  totalRendered: number;
  totalFailed: number;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Batch Operations Service
 *
 * Provides efficient batch operations for panels, captions, and generation.
 *
 * Usage:
 * ```typescript
 * const batch = getBatchService();
 *
 * // Create multiple panels at once
 * const panels = await batch.createPanels(storyboardId, [
 *   { description: "Opening shot" },
 *   { description: "Character introduction" },
 *   { description: "Action sequence" },
 * ]);
 *
 * // Add captions to multiple panels
 * await batch.addCaptions([
 *   { panelId: panels.created[0].id, caption: { type: "narration", text: "Once upon..." } },
 *   { panelId: panels.created[1].id, caption: { type: "dialogue", text: "Hello!" } },
 * ]);
 *
 * // Generate images for all panels
 * await batch.generatePanels(
 *   panels.created.map(p => p.id),
 *   { qualityPreset: "production" }
 * );
 * ```
 */
export class BatchService {
  private db: Database;
  private panelService: PanelService;
  private captionService: CaptionService;
  private imageService: GeneratedImageService;
  private generator: PanelGenerator;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
    this.panelService = getPanelService();
    this.captionService = getCaptionService();
    this.imageService = getGeneratedImageService();
    this.generator = getPanelGenerator();
  }

  // ==========================================================================
  // Panel Operations
  // ==========================================================================

  /**
   * Create multiple panels in a storyboard
   *
   * Panels are created in order. If positions are not specified, they
   * auto-increment from the current max position.
   */
  async createPanels(
    storyboardId: string,
    panels: BatchPanelInput[]
  ): Promise<BatchCreateResult> {
    const created: Panel[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < panels.length; i++) {
      const input = panels[i];
      try {
        const panel = await this.panelService.create({
          storyboardId,
          position: input.position,
          description: input.description,
          direction: input.direction,
          characterIds: input.characterIds,
        });
        created.push(panel);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Failed to create panel",
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  }

  /**
   * Delete multiple panels
   */
  async deletePanels(panelIds: string[]): Promise<{
    success: boolean;
    deleted: string[];
    errors: Array<{ panelId: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const panelId of panelIds) {
      try {
        await this.panelService.delete(panelId);
        deleted.push(panelId);
      } catch (error) {
        errors.push({
          panelId,
          error: error instanceof Error ? error.message : "Failed to delete panel",
        });
      }
    }

    return {
      success: errors.length === 0,
      deleted,
      errors,
    };
  }

  // ==========================================================================
  // Caption Operations
  // ==========================================================================

  /**
   * Add captions to multiple panels
   *
   * Each caption input specifies which panel to add to.
   */
  async addCaptions(captions: BatchCaptionInput[]): Promise<BatchCaptionResult> {
    const created: PanelCaption[] = [];
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const input of captions) {
      try {
        // Ensure panelId is set correctly
        const captionData: CreateCaptionInput = {
          ...input.caption,
          panelId: input.panelId,
        };
        const caption = await this.captionService.create(captionData);
        created.push(caption);
      } catch (error) {
        errors.push({
          panelId: input.panelId,
          error: error instanceof Error ? error.message : "Failed to create caption",
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  }

  /**
   * Delete all captions from multiple panels
   */
  async clearCaptions(panelIds: string[]): Promise<{
    success: boolean;
    cleared: number;
    errors: Array<{ panelId: string; error: string }>;
  }> {
    let cleared = 0;
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const panelId of panelIds) {
      try {
        const captions = await this.captionService.getByPanel(panelId);
        for (const caption of captions) {
          await this.captionService.delete(caption.id);
          cleared++;
        }
      } catch (error) {
        errors.push({
          panelId,
          error: error instanceof Error ? error.message : "Failed to clear captions",
        });
      }
    }

    return {
      success: errors.length === 0,
      cleared,
      errors,
    };
  }

  // ==========================================================================
  // Generation Operations
  // ==========================================================================

  /**
   * Generate images for multiple panels
   *
   * Processes panels sequentially to avoid overwhelming the generation server.
   * Use onProgress callback for real-time updates.
   */
  async generatePanels(
    panelIds: string[],
    options: BatchGenerateOptions = {}
  ): Promise<BatchGenerateResult> {
    const { continueOnError = true, onProgress, ...generateOptions } = options;

    const results: BatchGenerateResult["results"] = [];
    let totalGenerated = 0;
    let totalFailed = 0;

    for (let i = 0; i < panelIds.length; i++) {
      const panelId = panelIds[i];
      onProgress?.(i, panelIds.length, panelId);

      try {
        const result: PanelGenerationResult = await this.generator.generate(
          panelId,
          generateOptions
        );

        if (result.success && result.generatedImage) {
          results.push({
            panelId,
            success: true,
            generatedImage: result.generatedImage,
          });
          totalGenerated++;
        } else {
          results.push({
            panelId,
            success: false,
            error: result.error ?? "Generation failed",
          });
          totalFailed++;

          if (!continueOnError) {
            break;
          }
        }
      } catch (error) {
        results.push({
          panelId,
          success: false,
          error: error instanceof Error ? error.message : "Generation failed",
        });
        totalFailed++;

        if (!continueOnError) {
          break;
        }
      }
    }

    onProgress?.(panelIds.length, panelIds.length, "complete");

    return {
      success: totalFailed === 0,
      results,
      totalGenerated,
      totalFailed,
    };
  }

  /**
   * Generate variants for multiple panels
   *
   * Creates multiple variations for each panel.
   */
  async generateVariants(
    panelIds: string[],
    variantCount: number = 3,
    options: BatchGenerateOptions = {}
  ): Promise<BatchGenerateResult> {
    const allPanelIds: string[] = [];
    for (const panelId of panelIds) {
      for (let i = 0; i < variantCount; i++) {
        allPanelIds.push(panelId);
      }
    }

    return this.generatePanels(allPanelIds, {
      ...options,
      // Don't reuse seed - each variant should be different
      seed: undefined,
    });
  }

  // ==========================================================================
  // Render Operations
  // ==========================================================================

  /**
   * Render captions onto generated images for multiple panels
   *
   * Composites captions onto each panel's selected output image.
   */
  async renderCaptions(
    panelIds: string[],
    options: BatchRenderOptions
  ): Promise<BatchRenderResult> {
    const { outputDir, format = "png", continueOnError = true, onProgress } = options;
    const path = await import("node:path");
    const fs = await import("node:fs/promises");

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const results: BatchRenderResult["results"] = [];
    let totalRendered = 0;
    let totalFailed = 0;

    for (let i = 0; i < panelIds.length; i++) {
      const panelId = panelIds[i];
      onProgress?.(i, panelIds.length, panelId);

      try {
        // Get the panel with selected output
        const panel = await this.panelService.getById(panelId);
        if (!panel) {
          results.push({ panelId, success: false, error: "Panel not found" });
          totalFailed++;
          if (!continueOnError) break;
          continue;
        }

        if (!panel.selectedOutputId) {
          results.push({ panelId, success: false, error: "No selected output" });
          totalFailed++;
          if (!continueOnError) break;
          continue;
        }

        // Get the selected image
        const generatedImage = await this.imageService.getById(panel.selectedOutputId);
        if (!generatedImage) {
          results.push({ panelId, success: false, error: "Selected image not found" });
          totalFailed++;
          if (!continueOnError) break;
          continue;
        }

        // Get captions for this panel
        const captions = await this.captionService.getByPanel(panelId);
        if (captions.length === 0) {
          // No captions - just copy the original image
          const outputPath = path.join(outputDir, `${panelId}.${format}`);
          await fs.copyFile(generatedImage.localPath, outputPath);
          results.push({ panelId, success: true, outputPath });
          totalRendered++;
          continue;
        }

        // Render captions onto the image
        // Sharp will infer format from file extension
        const outputPath = path.join(outputDir, `${panelId}.${format}`);

        // Convert database captions to RenderableCaption (null -> undefined)
        const renderableCaptions = captions.map((c) => ({
          id: c.id,
          type: c.type,
          text: c.text,
          characterId: c.characterId ?? undefined,
          position: c.position,
          tailDirection: c.tailDirection ?? undefined,
          style: c.style ?? undefined,
          zIndex: c.zIndex,
        }));

        await compositeCaptions(generatedImage.localPath, renderableCaptions, outputPath);

        results.push({ panelId, success: true, outputPath });
        totalRendered++;
      } catch (error) {
        results.push({
          panelId,
          success: false,
          error: error instanceof Error ? error.message : "Render failed",
        });
        totalFailed++;

        if (!continueOnError) break;
      }
    }

    onProgress?.(panelIds.length, panelIds.length, "complete");

    return {
      success: totalFailed === 0,
      results,
      totalRendered,
      totalFailed,
    };
  }

  // ==========================================================================
  // Utility Operations
  // ==========================================================================

  /**
   * Get panel IDs from a storyboard in position order
   */
  async getPanelIds(storyboardId: string): Promise<string[]> {
    const panels = await this.panelService.getByStoryboard(storyboardId);
    return panels.map((p) => p.id);
  }

  /**
   * Select outputs for multiple panels (e.g., select the first generated image for each)
   */
  async selectOutputs(
    selections: Array<{ panelId: string; outputId: string }>
  ): Promise<{
    success: boolean;
    selected: number;
    errors: Array<{ panelId: string; error: string }>;
  }> {
    let selected = 0;
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const { panelId, outputId } of selections) {
      try {
        await this.panelService.selectOutput(panelId, outputId);
        selected++;
      } catch (error) {
        errors.push({
          panelId,
          error: error instanceof Error ? error.message : "Failed to select output",
        });
      }
    }

    return {
      success: errors.length === 0,
      selected,
      errors,
    };
  }

  /**
   * Auto-select the first (or latest) generated image for each panel
   */
  async autoSelectOutputs(
    panelIds: string[],
    mode: "first" | "latest" = "latest"
  ): Promise<{
    success: boolean;
    selected: number;
    skipped: number;
    errors: Array<{ panelId: string; error: string }>;
  }> {
    let selected = 0;
    let skipped = 0;
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const panelId of panelIds) {
      try {
        const generations = await this.panelService.getGenerations(panelId);
        if (generations.length === 0) {
          skipped++;
          continue;
        }

        // Sort by createdAt
        generations.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const target = mode === "first" ? generations[0] : generations[generations.length - 1];
        await this.panelService.selectOutput(panelId, target.id);
        selected++;
      } catch (error) {
        errors.push({
          panelId,
          error: error instanceof Error ? error.message : "Failed to auto-select output",
        });
      }
    }

    return {
      success: errors.length === 0,
      selected,
      skipped,
      errors,
    };
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: BatchService | null = null;

/**
 * Create a new BatchService with explicit database injection
 */
export function createBatchService(db: Database): BatchService {
  return new BatchService(db);
}

/**
 * Get the singleton BatchService (uses default database)
 */
export function getBatchService(): BatchService {
  if (!instance) {
    instance = new BatchService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetBatchService(): void {
  instance = null;
}
