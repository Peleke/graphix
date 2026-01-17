/**
 * Composition OpenAPI Schemas
 *
 * Schemas for page composition and export-related API endpoints.
 */

import { z } from "zod";
import { IdSchema } from "./common.js";

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Compose page request body
 */
export const ComposePageSchema = z
  .object({
    storyboardId: IdSchema.describe("Storyboard ID"),
    templateId: z.string().min(1).describe("Template ID"),
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs to include"),
    outputName: z.string().min(1).describe("Output filename"),
    pageSize: z.string().optional().describe("Page size preset"),
    backgroundColor: z.string().optional().describe("Background color"),
    panelBorder: z
      .object({
        width: z.number().describe("Border width"),
        color: z.string().describe("Border color"),
      })
      .optional()
      .describe("Panel border configuration"),
  })
  .describe("Compose page request");

/**
 * Compose storyboard request body
 */
export const ComposeStoryboardSchema = z
  .object({
    storyboardId: IdSchema.describe("Storyboard ID"),
    templateId: z.string().optional().describe("Template ID"),
    pageSize: z.string().optional().describe("Page size preset"),
    outputPrefix: z.string().optional().describe("Output filename prefix"),
  })
  .describe("Compose storyboard request");

/**
 * Create contact sheet request body
 */
export const ContactSheetSchema = z
  .object({
    storyboardId: IdSchema.describe("Storyboard ID"),
    outputPath: z.string().min(1).describe("Output file path"),
    columns: z.number().int().positive().optional().describe("Number of columns"),
    thumbnailSize: z.number().int().positive().optional().describe("Thumbnail size in pixels"),
  })
  .describe("Create contact sheet request");

/**
 * Export page request body
 */
export const ExportPageSchema = z
  .object({
    inputPath: z.string().min(1).describe("Input file path"),
    outputPath: z.string().min(1).describe("Output file path"),
    format: z.enum(["png", "jpeg", "webp", "pdf", "tiff"]).describe("Export format"),
    quality: z.number().int().min(1).max(100).optional().describe("Quality (1-100)"),
    dpi: z.number().int().positive().optional().describe("DPI for print"),
    bleed: z.number().nonnegative().optional().describe("Bleed size"),
    trimMarks: z.boolean().optional().describe("Include trim marks"),
  })
  .describe("Export page request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Compose page response
 */
export const ComposePageResponseSchema = z
  .object({
    outputPath: z.string().describe("Path to composed page"),
    pageNumber: z.number().int().optional().describe("Page number"),
  })
  .describe("Compose page response");

/**
 * Compose storyboard response
 */
export const ComposeStoryboardResponseSchema = z
  .object({
    pages: z
      .array(
        z.object({
          pageNumber: z.number().int(),
          outputPath: z.string(),
        })
      )
      .describe("Array of composed pages"),
  })
  .describe("Compose storyboard response");

// ============================================================================
// Type Exports
// ============================================================================

export type ComposePage = z.infer<typeof ComposePageSchema>;
export type ComposeStoryboard = z.infer<typeof ComposeStoryboardSchema>;
export type ExportPage = z.infer<typeof ExportPageSchema>;
