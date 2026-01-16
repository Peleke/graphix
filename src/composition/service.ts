/**
 * Composition Service
 *
 * High-level service for composing storyboard panels into pages.
 * Integrates with the panel and storyboard services.
 */

import { join } from "path";
import { config } from "../config.js";
import { getPanelService, getStoryboardService, getGeneratedImageService } from "../services/index.js";
import { PageRenderer, renderPage, renderGrid, type PanelImage, type RenderOptions } from "./renderer.js";
import { exportPage, exportBatch, prepareForPrint, type ExportOptions, type ExportResult } from "./export.js";
import { getTemplate, listTemplates, PAGE_SIZES, type PageTemplate, type PageSize } from "./templates.js";
import type { Panel } from "../db/schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Page composition request
 */
export interface ComposePageRequest {
  /** Storyboard ID to compose from */
  storyboardId: string;
  /** Template to use */
  templateId: string;
  /** Panel IDs in order (maps to template slots) */
  panelIds: string[];
  /** Output filename (relative to output dir) */
  outputName: string;
  /** Page size preset */
  pageSize?: string;
  /** Background color */
  backgroundColor?: string;
  /** Panel border settings */
  panelBorder?: {
    width: number;
    color: string;
  };
}

/**
 * Page composition result
 */
export interface ComposePageResult {
  success: boolean;
  outputPath?: string;
  width?: number;
  height?: number;
  panelsUsed?: number;
  error?: string;
}

/**
 * Export page request
 */
export interface ExportPageRequest {
  /** Path to the composed page image */
  inputPath: string;
  /** Output path */
  outputPath: string;
  /** Export format */
  format: "png" | "jpeg" | "webp" | "tiff" | "pdf";
  /** Quality (for lossy formats) */
  quality?: number;
  /** DPI for print */
  dpi?: number;
  /** Add bleed for print */
  bleed?: number;
  /** Add trim marks */
  trimMarks?: boolean;
}

// ============================================================================
// Composition Service
// ============================================================================

/**
 * Composition Service
 *
 * Manages page composition and export.
 */
export class CompositionService {
  private panelService = getPanelService();
  private storyboardService = getStoryboardService();
  private imageService = getGeneratedImageService();

  /**
   * Compose a page from panels using a template
   */
  async composePage(request: ComposePageRequest): Promise<ComposePageResult> {
    try {
      // Get template
      const template = getTemplate(request.templateId);
      if (!template) {
        return { success: false, error: `Template not found: ${request.templateId}` };
      }

      // Get page size
      const pageSize = request.pageSize
        ? PAGE_SIZES[request.pageSize] ?? PAGE_SIZES.comic_standard
        : PAGE_SIZES.comic_standard;

      // Load panels and their selected outputs
      const panels: PanelImage[] = [];

      for (let i = 0; i < request.panelIds.length; i++) {
        const panelId = request.panelIds[i];
        const panel = await this.panelService.getById(panelId);

        if (!panel) {
          console.warn(`Panel not found: ${panelId}`);
          continue;
        }

        // Get selected output image
        const imagePath = await this.getPanelImagePath(panel);
        if (!imagePath) {
          console.warn(`No selected output for panel: ${panelId}`);
          continue;
        }

        // Map to template slot
        const slot = template.slots[i];
        if (!slot) {
          console.warn(`No slot for panel index ${i}`);
          continue;
        }

        panels.push({
          path: imagePath,
          slotId: slot.id,
        });
      }

      if (panels.length === 0) {
        return { success: false, error: "No valid panels to compose" };
      }

      // Compose the page
      const outputPath = join(config.storage.outputDir, "pages", request.outputName);

      const result = await renderPage(request.templateId, panels, outputPath, {
        pageSize,
        backgroundColor: request.backgroundColor,
        panelBorder: request.panelBorder,
      });

      return {
        success: result.success,
        outputPath: result.outputPath,
        width: result.width,
        height: result.height,
        panelsUsed: panels.length,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Composition failed",
      };
    }
  }

  /**
   * Auto-compose all panels in a storyboard into pages
   */
  async composeStoryboard(
    storyboardId: string,
    options?: {
      templateId?: string;
      pageSize?: string;
      outputPrefix?: string;
    }
  ): Promise<{ success: boolean; pages: ComposePageResult[]; error?: string }> {
    try {
      // Load storyboard with panels
      const storyboard = await this.storyboardService.getById(storyboardId);
      if (!storyboard) {
        return { success: false, pages: [], error: "Storyboard not found" };
      }

      // Get all panels for this storyboard
      const panelsForStoryboard = await this.panelService.getByStoryboard(storyboardId);
      const panelIds = panelsForStoryboard.map((p) => p.id);
      if (panelIds.length === 0) {
        return { success: false, pages: [], error: "Storyboard has no panels" };
      }

      // Determine template
      const templateId = options?.templateId ?? "six-grid";
      const template = getTemplate(templateId);
      if (!template) {
        return { success: false, pages: [], error: `Template not found: ${templateId}` };
      }

      // Chunk panels into pages based on template
      const panelsPerPage = template.panelCount;
      const pageChunks: string[][] = [];

      for (let i = 0; i < panelIds.length; i += panelsPerPage) {
        pageChunks.push(panelIds.slice(i, i + panelsPerPage));
      }

      // Compose each page
      const pages: ComposePageResult[] = [];
      const prefix = options?.outputPrefix ?? storyboard.name.replace(/\s+/g, "_").toLowerCase();

      for (let i = 0; i < pageChunks.length; i++) {
        const result = await this.composePage({
          storyboardId,
          templateId,
          panelIds: pageChunks[i],
          outputName: `${prefix}_page${i + 1}.png`,
          pageSize: options?.pageSize,
        });

        pages.push(result);
      }

      const allSuccess = pages.every((p) => p.success);
      return { success: allSuccess, pages };
    } catch (error) {
      return {
        success: false,
        pages: [],
        error: error instanceof Error ? error.message : "Storyboard composition failed",
      };
    }
  }

  /**
   * Create a contact sheet from a storyboard
   */
  async createContactSheet(
    storyboardId: string,
    outputPath: string,
    options?: {
      columns?: number;
      thumbnailSize?: number;
    }
  ): Promise<ComposePageResult> {
    try {
      const storyboard = await this.storyboardService.getById(storyboardId);
      if (!storyboard) {
        return { success: false, error: "Storyboard not found" };
      }

      // Get all panels for this storyboard
      const panelsForStoryboard = await this.panelService.getByStoryboard(storyboardId);
      const panelIds = panelsForStoryboard.map((p) => p.id);
      if (panelIds.length === 0) {
        return { success: false, error: "Storyboard has no panels" };
      }

      // Get image paths for all panels
      const imagePaths: string[] = [];
      for (const panelId of panelIds) {
        const panel = await this.panelService.getById(panelId);
        if (panel) {
          const imagePath = await this.getPanelImagePath(panel);
          if (imagePath) {
            imagePaths.push(imagePath);
          }
        }
      }

      if (imagePaths.length === 0) {
        return { success: false, error: "No panel images found" };
      }

      // Render contact sheet
      const result = await renderGrid(imagePaths, outputPath, {
        columns: options?.columns ?? 3,
      });

      return {
        success: result.success,
        outputPath: result.outputPath,
        width: result.width,
        height: result.height,
        panelsUsed: imagePaths.length,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Contact sheet failed",
      };
    }
  }

  /**
   * Export a composed page
   */
  async exportPage(request: ExportPageRequest): Promise<ExportResult> {
    if (request.bleed || request.trimMarks) {
      return prepareForPrint(request.inputPath, request.outputPath, {
        bleed: request.bleed ?? 36, // 0.12 inches at 300 DPI
        trimMarks: request.trimMarks ?? false,
        dpi: request.dpi ?? 300,
      });
    }

    return exportPage(request.inputPath, request.outputPath, {
      format: request.format,
      quality: request.quality,
      dpi: request.dpi,
    });
  }

  /**
   * Compose a page directly from file paths (no database lookup)
   */
  async composeFromPaths(options: {
    templateId: string;
    panelPaths: string[];
    outputPath: string;
    pageSize?: string;
    backgroundColor?: string;
    gutterSize?: number;
    margin?: number;
    panelBorderRadius?: number;
    panelBorderWidth?: number;
    panelBorderColor?: string;
  }): Promise<ComposePageResult> {
    try {
      const template = getTemplate(options.templateId);
      if (!template) {
        return { success: false, error: `Template not found: ${options.templateId}` };
      }

      const pageSize = options.pageSize
        ? PAGE_SIZES[options.pageSize] ?? PAGE_SIZES.letter
        : PAGE_SIZES.letter;

      // Map paths to panel images
      const panels: PanelImage[] = options.panelPaths.map((path, i) => ({
        path,
        slotId: template.slots[i]?.id ?? `slot-${i}`,
      }));

      const result = await renderPage(options.templateId, panels, options.outputPath, {
        pageSize,
        backgroundColor: options.backgroundColor,
        panelBorder: options.panelBorderWidth
          ? { width: options.panelBorderWidth, color: options.panelBorderColor ?? "#000000" }
          : undefined,
      });

      return {
        success: result.success,
        outputPath: result.outputPath,
        width: result.width,
        height: result.height,
        panelsUsed: panels.length,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Composition failed",
      };
    }
  }

  /**
   * Create a contact sheet directly from file paths (no database lookup)
   */
  async contactSheetFromPaths(options: {
    imagePaths: string[];
    outputPath: string;
    columns?: number;
    thumbnailSize?: number;
    gap?: number;
    backgroundColor?: string;
  }): Promise<ComposePageResult> {
    try {
      const result = await renderGrid(options.imagePaths, options.outputPath, {
        columns: options.columns ?? 4,
        gutter: options.gap ?? 10,
        backgroundColor: options.backgroundColor ?? "#ffffff",
      });

      return {
        success: result.success,
        outputPath: result.outputPath,
        width: result.width,
        height: result.height,
        panelsUsed: options.imagePaths.length,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Contact sheet failed",
      };
    }
  }

  /**
   * List available templates
   */
  listTemplates(): PageTemplate[] {
    return listTemplates();
  }

  /**
   * List available page sizes
   */
  listPageSizes(): Record<string, PageSize> {
    return PAGE_SIZES;
  }

  // ==================== Helper Methods ====================

  /**
   * Get the image path for a panel's selected output
   */
  private async getPanelImagePath(panel: Panel): Promise<string | null> {
    // Check if panel has a selected output
    if (panel.selectedOutputId) {
      const output = await this.imageService.getById(panel.selectedOutputId);
      if (output) {
        return output.localPath;
      }
    }

    // Fall back to most recent generation
    const outputs = await this.imageService.getByPanel(panel.id);
    if (outputs.length > 0) {
      return outputs[0].localPath;
    }

    return null;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: CompositionService | null = null;

/**
 * Get the composition service singleton
 */
export function getCompositionService(): CompositionService {
  if (!serviceInstance) {
    serviceInstance = new CompositionService();
  }
  return serviceInstance;
}

/**
 * Reset the service singleton (for testing)
 */
export function resetCompositionService(): void {
  serviceInstance = null;
}
