/**
 * Page Renderer
 *
 * Composites panel images onto a page using Sharp.
 * Supports templates, custom layouts, and various output formats.
 */

import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import type { PageTemplate, PanelSlot, PageSize } from "./templates.js";
import { PAGE_SIZES, getTemplate } from "./templates.js";
import type { RenderableCaption } from "./caption-types.js";
import { renderCaptions } from "./caption-renderer.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Panel image to be placed on the page
 */
export interface PanelImage {
  /** Path to the image file */
  path: string;
  /** Slot ID to place this image in */
  slotId: string;
  /** Optional override for fit mode */
  fit?: "cover" | "contain" | "fill";
  /** Optional border settings */
  border?: {
    width: number;
    color: string;
  };
  /** Optional captions to overlay on this panel */
  captions?: RenderableCaption[];
}

/**
 * Render options
 */
export interface RenderOptions {
  /** Page size preset or custom dimensions */
  pageSize: PageSize | { width: number; height: number };
  /** Background color (default: white) */
  backgroundColor?: string;
  /** Border around each panel */
  panelBorder?: {
    width: number;
    color: string;
  };
  /** Drop shadow on panels */
  panelShadow?: {
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  };
  /** Output quality (for JPEG/WebP) */
  quality?: number;
}

/**
 * Render result
 */
export interface RenderResult {
  success: boolean;
  outputPath?: string;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

// ============================================================================
// Renderer Class
// ============================================================================

/**
 * Page Renderer
 *
 * Composites multiple panel images onto a single page.
 */
export class PageRenderer {
  private template: PageTemplate;
  private options: RenderOptions;

  constructor(template: PageTemplate | string, options: RenderOptions) {
    this.template = typeof template === "string"
      ? getTemplate(template) ?? { id: "default", name: "Default", description: "", panelCount: 1, slots: [], gutter: 2, margin: 2, aspectRatio: 0.65 }
      : template;
    this.options = options;
  }

  /**
   * Get page dimensions in pixels
   */
  private getPageDimensions(): { width: number; height: number } {
    if ("dpi" in this.options.pageSize) {
      return {
        width: this.options.pageSize.width,
        height: this.options.pageSize.height,
      };
    }
    return this.options.pageSize;
  }

  /**
   * Convert percentage position to pixels
   */
  private toPixels(percentage: number, dimension: number): number {
    return Math.round((percentage / 100) * dimension);
  }

  /**
   * Get slot bounds in pixels
   */
  private getSlotBounds(slot: PanelSlot, pageWidth: number, pageHeight: number) {
    return {
      x: this.toPixels(slot.x, pageWidth),
      y: this.toPixels(slot.y, pageHeight),
      width: this.toPixels(slot.width, pageWidth),
      height: this.toPixels(slot.height, pageHeight),
    };
  }

  /**
   * Render a page with the given panel images
   */
  async render(panels: PanelImage[], outputPath: string): Promise<RenderResult> {
    try {
      const { width: pageWidth, height: pageHeight } = this.getPageDimensions();
      const bgColor = this.options.backgroundColor ?? "#FFFFFF";

      // Create base canvas
      const canvas = sharp({
        create: {
          width: pageWidth,
          height: pageHeight,
          channels: 4,
          background: this.parseColor(bgColor),
        },
      });

      // Sort panels by z-index if specified
      const sortedPanels = [...panels].sort((a, b) => {
        const slotA = this.template.slots.find(s => s.id === a.slotId);
        const slotB = this.template.slots.find(s => s.id === b.slotId);
        return (slotA?.zIndex ?? 0) - (slotB?.zIndex ?? 0);
      });

      // Build composite operations
      const composites: sharp.OverlayOptions[] = [];

      for (const panel of sortedPanels) {
        const slot = this.template.slots.find(s => s.id === panel.slotId);
        if (!slot) {
          console.warn(`Slot not found: ${panel.slotId}`);
          continue;
        }

        const bounds = this.getSlotBounds(slot, pageWidth, pageHeight);
        const border = panel.border ?? this.options.panelBorder;

        // Load and resize panel image
        let panelImage = sharp(panel.path);
        const metadata = await panelImage.metadata();

        if (!metadata.width || !metadata.height) {
          console.warn(`Could not read image dimensions: ${panel.path}`);
          continue;
        }

        // Resize to fit slot
        const fit = panel.fit ?? "cover";
        panelImage = panelImage.resize(bounds.width, bounds.height, {
          fit,
          position: "center",
        });

        // Add border if specified
        if (border && border.width > 0) {
          panelImage = panelImage.extend({
            top: border.width,
            bottom: border.width,
            left: border.width,
            right: border.width,
            background: this.parseColor(border.color),
          });
        }

        // Get panel buffer
        let buffer = await panelImage.toBuffer();

        // Overlay captions if present
        if (panel.captions && panel.captions.length > 0) {
          const renderedCaptions = await renderCaptions(
            panel.captions,
            bounds.width,
            bounds.height
          );

          // Build caption composites relative to panel
          const captionComposites = renderedCaptions.map((rc) => ({
            input: rc.buffer,
            left: Math.round(rc.bounds.x),
            top: Math.round(rc.bounds.y),
          }));

          // Composite captions onto panel
          buffer = await sharp(buffer)
            .composite(captionComposites)
            .toBuffer();
        }

        // Add to composites
        composites.push({
          input: buffer,
          left: bounds.x - (border?.width ?? 0),
          top: bounds.y - (border?.width ?? 0),
        });
      }

      // Apply all composites
      const result = canvas.composite(composites);

      // Ensure output directory exists
      await mkdir(dirname(outputPath), { recursive: true });

      // Determine output format from extension
      const format = this.getFormatFromPath(outputPath);

      // Save with appropriate format
      switch (format) {
        case "jpeg":
        case "jpg":
          await result.jpeg({ quality: this.options.quality ?? 90 }).toFile(outputPath);
          break;
        case "webp":
          await result.webp({ quality: this.options.quality ?? 90 }).toFile(outputPath);
          break;
        case "png":
        default:
          await result.png().toFile(outputPath);
          break;
      }

      return {
        success: true,
        outputPath,
        width: pageWidth,
        height: pageHeight,
        format,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Render failed",
      };
    }
  }

  /**
   * Parse color string to Sharp color object
   */
  private parseColor(color: string): { r: number; g: number; b: number; alpha: number } {
    // Handle hex colors
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          alpha: 1,
        };
      }
      if (hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          alpha: parseInt(hex.slice(6, 8), 16) / 255,
        };
      }
    }

    // Default to white
    return { r: 255, g: 255, b: 255, alpha: 1 };
  }

  /**
   * Get format from file path
   */
  private getFormatFromPath(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    return ext ?? "png";
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Render a page using a template
 */
export async function renderPage(
  templateId: string,
  panels: PanelImage[],
  outputPath: string,
  options?: Partial<RenderOptions>
): Promise<RenderResult> {
  const template = getTemplate(templateId);
  if (!template) {
    return { success: false, error: `Template not found: ${templateId}` };
  }

  const renderer = new PageRenderer(template, {
    pageSize: options?.pageSize ?? PAGE_SIZES.comic_standard,
    backgroundColor: options?.backgroundColor ?? "#FFFFFF",
    panelBorder: options?.panelBorder,
    quality: options?.quality ?? 90,
  });

  return renderer.render(panels, outputPath);
}

/**
 * Render a simple grid of images (auto-layout)
 */
export async function renderGrid(
  imagePaths: string[],
  outputPath: string,
  options?: {
    columns?: number;
    pageSize?: PageSize;
    gutter?: number;
    backgroundColor?: string;
  }
): Promise<RenderResult> {
  const columns = options?.columns ?? 2;
  const rows = Math.ceil(imagePaths.length / columns);
  const gutter = options?.gutter ?? 2;
  const margin = 2;

  // Calculate slot dimensions
  const slotWidth = (100 - margin * 2 - gutter * (columns - 1)) / columns;
  const slotHeight = (100 - margin * 2 - gutter * (rows - 1)) / rows;

  // Generate slots
  const slots: PanelSlot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index >= imagePaths.length) break;

      slots.push({
        id: `cell-${index}`,
        x: margin + col * (slotWidth + gutter),
        y: margin + row * (slotHeight + gutter),
        width: slotWidth,
        height: slotHeight,
      });
    }
  }

  // Create template
  const template: PageTemplate = {
    id: "auto-grid",
    name: "Auto Grid",
    description: `${columns}x${rows} auto-generated grid`,
    panelCount: imagePaths.length,
    slots,
    gutter,
    margin,
    aspectRatio: 0.65,
  };

  // Create panel mappings
  const panels: PanelImage[] = imagePaths.map((path, index) => ({
    path,
    slotId: `cell-${index}`,
  }));

  const renderer = new PageRenderer(template, {
    pageSize: options?.pageSize ?? PAGE_SIZES.comic_standard,
    backgroundColor: options?.backgroundColor ?? "#FFFFFF",
  });

  return renderer.render(panels, outputPath);
}

/**
 * Create a contact sheet from multiple images
 */
export async function renderContactSheet(
  imagePaths: string[],
  outputPath: string,
  options?: {
    columns?: number;
    thumbnailSize?: number;
    padding?: number;
    backgroundColor?: string;
    labels?: string[];
  }
): Promise<RenderResult> {
  const columns = options?.columns ?? 4;
  const thumbSize = options?.thumbnailSize ?? 256;
  const padding = options?.padding ?? 10;
  const bgColor = options?.backgroundColor ?? "#FFFFFF";

  const rows = Math.ceil(imagePaths.length / columns);
  const pageWidth = columns * thumbSize + (columns + 1) * padding;
  const pageHeight = rows * thumbSize + (rows + 1) * padding;

  try {
    // Create base canvas
    const canvas = sharp({
      create: {
        width: pageWidth,
        height: pageHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    // Build composites
    const composites: sharp.OverlayOptions[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;

      const x = padding + col * (thumbSize + padding);
      const y = padding + row * (thumbSize + padding);

      const thumb = await sharp(imagePaths[i])
        .resize(thumbSize, thumbSize, { fit: "cover" })
        .toBuffer();

      composites.push({
        input: thumb,
        left: x,
        top: y,
      });
    }

    await canvas.composite(composites).png().toFile(outputPath);

    return {
      success: true,
      outputPath,
      width: pageWidth,
      height: pageHeight,
      format: "png",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Contact sheet failed",
    };
  }
}
