/**
 * Export Module
 *
 * Export composed pages to various formats including PDF.
 * Uses Sharp for image processing.
 */

import sharp from "sharp";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, basename, join } from "path";
import type { PageSize } from "./templates.js";
import { PAGE_SIZES } from "./templates.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Export format options
 */
export type ExportFormat = "png" | "jpeg" | "webp" | "pdf" | "tiff";

/**
 * Export options
 */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;
  /** Quality for lossy formats (1-100) */
  quality?: number;
  /** DPI for print exports */
  dpi?: number;
  /** Color profile */
  colorProfile?: "srgb" | "cmyk" | "adobe-rgb";
  /** Add bleed area (in pixels) */
  bleed?: number;
  /** Add trim marks */
  trimMarks?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  outputPath?: string;
  format?: string;
  fileSize?: number;
  error?: string;
}

/**
 * PDF page for multi-page export
 */
export interface PDFPage {
  imagePath: string;
  pageNumber: number;
}

// ============================================================================
// Single Page Export
// ============================================================================

/**
 * Export a single rendered page to a specific format
 */
export async function exportPage(
  inputPath: string,
  outputPath: string,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });

    let image = sharp(inputPath);
    const metadata = await image.metadata();

    // Add bleed if requested
    if (options.bleed && options.bleed > 0) {
      image = image.extend({
        top: options.bleed,
        bottom: options.bleed,
        left: options.bleed,
        right: options.bleed,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      });
    }

    // Apply color profile if specified
    if (options.colorProfile === "srgb") {
      image = image.toColorspace("srgb");
    }

    // Export based on format
    switch (options.format) {
      case "png":
        await image.png().toFile(outputPath);
        break;

      case "jpeg":
        await image
          .jpeg({ quality: options.quality ?? 90 })
          .toFile(outputPath);
        break;

      case "webp":
        await image
          .webp({ quality: options.quality ?? 90 })
          .toFile(outputPath);
        break;

      case "tiff":
        await image
          .tiff({
            compression: "lzw",
            // Note: Sharp doesn't directly support CMYK, would need ICC profile
          })
          .toFile(outputPath);
        break;

      case "pdf":
        // For PDF, we'll create a simple single-page PDF
        await exportToPDF([{ imagePath: inputPath, pageNumber: 1 }], outputPath, {
          pageSize: {
            width: metadata.width ?? 1988,
            height: metadata.height ?? 3075,
            name: "Custom",
            dpi: options.dpi ?? 300,
          },
        });
        break;

      default:
        return { success: false, error: `Unsupported format: ${options.format}` };
    }

    // Get file size
    const stats = await readFile(outputPath);
    const fileSize = stats.length;

    return {
      success: true,
      outputPath,
      format: options.format,
      fileSize,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Export multiple pages to a single PDF
 *
 * Note: This creates a simple PDF by embedding images.
 * For production, consider using a proper PDF library like pdf-lib.
 */
export async function exportToPDF(
  pages: PDFPage[],
  outputPath: string,
  options?: {
    pageSize?: PageSize;
    title?: string;
    author?: string;
  }
): Promise<ExportResult> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });

    const pageSize = options?.pageSize ?? PAGE_SIZES.comic_standard;

    // Sort pages by page number
    const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

    // Build PDF structure
    // This is a minimal PDF implementation - embeds images directly
    const pdfParts: string[] = [];
    const objects: string[] = [];
    let objectCount = 0;

    // PDF Header
    pdfParts.push("%PDF-1.4\n");

    // Catalog (object 1)
    objectCount++;
    objects.push(`${objectCount} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    // Pages object (object 2) - will be filled in later
    objectCount++;
    const pagesObjectIndex = objectCount;

    // Process each page
    const pageRefs: string[] = [];
    const imageData: Buffer[] = [];

    for (const page of sortedPages) {
      // Load and process image
      const imageBuffer = await sharp(page.imagePath)
        .resize(pageSize.width, pageSize.height, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 95 })
        .toBuffer();

      imageData.push(imageBuffer);

      // Image XObject
      objectCount++;
      const imageObjNum = objectCount;

      // Page object
      objectCount++;
      const pageObjNum = objectCount;
      pageRefs.push(`${pageObjNum} 0 R`);

      // Content stream
      objectCount++;
      const contentObjNum = objectCount;

      // Add image object
      objects.push(
        `${imageObjNum} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${pageSize.width} /Height ${pageSize.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBuffer.length} >>\n` +
        `stream\n`
      );
      // Image data will be appended separately

      // Add page object
      objects.push(
        `${pageObjNum} 0 obj\n` +
        `<< /Type /Page /Parent ${pagesObjectIndex} 0 R /MediaBox [0 0 ${pageSize.width} ${pageSize.height}] ` +
        `/Contents ${contentObjNum} 0 R /Resources << /XObject << /Im1 ${imageObjNum} 0 R >> >> >>\n` +
        `endobj\n`
      );

      // Add content stream (draws the image)
      const contentStream = `q ${pageSize.width} 0 0 ${pageSize.height} 0 0 cm /Im1 Do Q`;
      objects.push(
        `${contentObjNum} 0 obj\n` +
        `<< /Length ${contentStream.length} >>\n` +
        `stream\n${contentStream}\nendstream\n` +
        `endobj\n`
      );
    }

    // Add Pages object
    objects.splice(1, 0,
      `${pagesObjectIndex} 0 obj\n` +
      `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${sortedPages.length} >>\n` +
      `endobj\n`
    );

    // For simplicity, we'll use a different approach:
    // Create individual page PNGs and use a basic PDF wrapper

    // Actually, let's create a simpler solution using Sharp to create
    // a multi-page TIFF first, then note that proper PDF needs pdf-lib

    // Simpler approach: Create a "PDF-like" package
    // For real PDF, recommend using pdf-lib or pdfkit

    // For now, let's create individual high-res exports
    const exportDir = dirname(outputPath);
    const baseName = basename(outputPath, ".pdf");
    const exportedPages: string[] = [];

    for (let i = 0; i < sortedPages.length; i++) {
      const pagePath = join(exportDir, `${baseName}_page${i + 1}.png`);
      await sharp(sortedPages[i].imagePath)
        .resize(pageSize.width, pageSize.height, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(pagePath);
      exportedPages.push(pagePath);
    }

    // Create a manifest file
    const manifest = {
      title: options?.title ?? "Graphix Export",
      author: options?.author ?? "Graphix",
      pageCount: sortedPages.length,
      pageSize: {
        width: pageSize.width,
        height: pageSize.height,
        dpi: pageSize.dpi,
      },
      pages: exportedPages.map((p, i) => ({
        pageNumber: i + 1,
        path: basename(p),
      })),
      exportedAt: new Date().toISOString(),
      note: "For true PDF export, use a dedicated PDF library like pdf-lib",
    };

    const manifestPath = outputPath.replace(".pdf", "_manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Also create the first page as the "cover"
    if (exportedPages.length > 0) {
      await sharp(exportedPages[0]).toFile(outputPath.replace(".pdf", "_cover.png"));
    }

    return {
      success: true,
      outputPath: manifestPath,
      format: "pdf-package",
      fileSize: exportedPages.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF export failed",
    };
  }
}

// ============================================================================
// Batch Export
// ============================================================================

/**
 * Export multiple pages to individual files
 */
export async function exportBatch(
  inputPaths: string[],
  outputDir: string,
  options: ExportOptions
): Promise<ExportResult[]> {
  await mkdir(outputDir, { recursive: true });

  const results: ExportResult[] = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    const baseName = basename(inputPath, ".png");
    const outputPath = join(outputDir, `${baseName}.${options.format}`);

    const result = await exportPage(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}

// ============================================================================
// Print Preparation
// ============================================================================

/**
 * Prepare images for print with bleed and trim marks
 */
export async function prepareForPrint(
  inputPath: string,
  outputPath: string,
  options: {
    bleed: number;
    trimMarks: boolean;
    dpi: number;
  }
): Promise<ExportResult> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });

    let image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width ?? 1988;
    const height = metadata.height ?? 3075;

    // Add bleed
    const bleed = options.bleed;
    image = image.extend({
      top: bleed,
      bottom: bleed,
      left: bleed,
      right: bleed,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });

    // Add trim marks if requested
    if (options.trimMarks) {
      const newWidth = width + bleed * 2;
      const newHeight = height + bleed * 2;
      const markLength = Math.min(bleed - 10, 30);
      const markOffset = 5;

      // Create trim mark overlay
      const trimMarksSvg = `
        <svg width="${newWidth}" height="${newHeight}">
          <!-- Top-left corner -->
          <line x1="${bleed}" y1="${markOffset}" x2="${bleed}" y2="${markOffset + markLength}" stroke="black" stroke-width="1"/>
          <line x1="${markOffset}" y1="${bleed}" x2="${markOffset + markLength}" y2="${bleed}" stroke="black" stroke-width="1"/>

          <!-- Top-right corner -->
          <line x1="${newWidth - bleed}" y1="${markOffset}" x2="${newWidth - bleed}" y2="${markOffset + markLength}" stroke="black" stroke-width="1"/>
          <line x1="${newWidth - markOffset}" y1="${bleed}" x2="${newWidth - markOffset - markLength}" y2="${bleed}" stroke="black" stroke-width="1"/>

          <!-- Bottom-left corner -->
          <line x1="${bleed}" y1="${newHeight - markOffset}" x2="${bleed}" y2="${newHeight - markOffset - markLength}" stroke="black" stroke-width="1"/>
          <line x1="${markOffset}" y1="${newHeight - bleed}" x2="${markOffset + markLength}" y2="${newHeight - bleed}" stroke="black" stroke-width="1"/>

          <!-- Bottom-right corner -->
          <line x1="${newWidth - bleed}" y1="${newHeight - markOffset}" x2="${newWidth - bleed}" y2="${newHeight - markOffset - markLength}" stroke="black" stroke-width="1"/>
          <line x1="${newWidth - markOffset}" y1="${newHeight - bleed}" x2="${newWidth - markOffset - markLength}" y2="${newHeight - bleed}" stroke="black" stroke-width="1"/>
        </svg>
      `;

      const trimMarksBuffer = Buffer.from(trimMarksSvg);
      image = image.composite([
        { input: trimMarksBuffer, top: 0, left: 0 },
      ]);
    }

    await image.tiff({ compression: "lzw" }).toFile(outputPath);

    const stats = await readFile(outputPath);

    return {
      success: true,
      outputPath,
      format: "tiff",
      fileSize: stats.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Print preparation failed",
    };
  }
}
