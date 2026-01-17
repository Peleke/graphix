/**
 * Composition Routes
 *
 * REST API endpoints for page composition and export.
 */

import { Hono } from "hono";
import { z } from "zod";
import { getCompositionService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  nonEmptyString,
  uuidSchema,
} from "../validation/index.js";

// ============================================================================
// Local Zod Schemas
// ============================================================================

const composePageSchema = z.object({
  storyboardId: uuidSchema,
  templateId: nonEmptyString,
  panelIds: z.array(uuidSchema).min(1, "At least one panel ID required"),
  outputName: nonEmptyString,
  pageSize: z.string().optional(),
  backgroundColor: z.string().optional(),
  panelBorder: z.object({
    width: z.number(),
    color: z.string(),
  }).optional(),
});

const composeStoryboardSchema = z.object({
  storyboardId: uuidSchema,
  templateId: z.string().optional(),
  pageSize: z.string().optional(),
  outputPrefix: z.string().optional(),
});

const contactSheetSchema = z.object({
  storyboardId: uuidSchema,
  outputPath: nonEmptyString,
  columns: z.number().int().positive().optional(),
  thumbnailSize: z.number().int().positive().optional(),
});

const exportPageSchema = z.object({
  inputPath: nonEmptyString,
  outputPath: nonEmptyString,
  format: z.enum(["png", "jpeg", "webp", "pdf", "tiff"]),
  quality: z.number().int().min(1).max(100).optional(),
  dpi: z.number().int().positive().optional(),
  bleed: z.number().nonnegative().optional(),
  trimMarks: z.boolean().optional(),
});

// ============================================================================
// Routes
// ============================================================================

const compositionRoutes = new Hono();

// List available templates
compositionRoutes.get("/templates", async (c) => {
  const service = getCompositionService();
  const templates = service.listTemplates();

  return c.json({
    templates,
    count: templates.length,
  });
});

// Get specific template
compositionRoutes.get("/templates/:id", validateId(), async (c) => {
  const service = getCompositionService();
  const { id } = c.req.valid("param");
  const templates = service.listTemplates();
  const template = templates.find((t) => t.id === id);

  if (!template) {
    return errors.notFound(c, "Template", id);
  }

  return c.json(template);
});

// List available page sizes
compositionRoutes.get("/page-sizes", async (c) => {
  const service = getCompositionService();
  const pageSizes = service.listPageSizes();

  return c.json({
    pageSizes,
  });
});

// Compose a page from panels
compositionRoutes.post("/compose", validateBody(composePageSchema), async (c) => {
  const service = getCompositionService();
  const body = c.req.valid("json");

  const result = await service.composePage({
    storyboardId: body.storyboardId,
    templateId: body.templateId,
    panelIds: body.panelIds,
    outputName: body.outputName,
    pageSize: body.pageSize,
    backgroundColor: body.backgroundColor,
    panelBorder: body.panelBorder,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error ?? "Failed to compose page");
  }

  return c.json(result, 201);
});

// Auto-compose entire storyboard into pages
compositionRoutes.post("/compose-storyboard", validateBody(composeStoryboardSchema), async (c) => {
  const service = getCompositionService();
  const body = c.req.valid("json");

  const result = await service.composeStoryboard(body.storyboardId, {
    templateId: body.templateId,
    pageSize: body.pageSize,
    outputPrefix: body.outputPrefix,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error ?? "Failed to compose storyboard");
  }

  return c.json(result, 201);
});

// Create contact sheet
compositionRoutes.post("/contact-sheet", validateBody(contactSheetSchema), async (c) => {
  const service = getCompositionService();
  const body = c.req.valid("json");

  const result = await service.createContactSheet(body.storyboardId, body.outputPath, {
    columns: body.columns,
    thumbnailSize: body.thumbnailSize,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error ?? "Failed to create contact sheet");
  }

  return c.json(result, 201);
});

// Export a composed page
compositionRoutes.post("/export", validateBody(exportPageSchema), async (c) => {
  const service = getCompositionService();
  const body = c.req.valid("json");

  const result = await service.exportPage({
    inputPath: body.inputPath,
    outputPath: body.outputPath,
    format: body.format,
    quality: body.quality,
    dpi: body.dpi,
    bleed: body.bleed,
    trimMarks: body.trimMarks,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error ?? "Failed to export page");
  }

  return c.json(result, 201);
});

export { compositionRoutes };
