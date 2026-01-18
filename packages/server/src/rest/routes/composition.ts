/**
 * Composition Routes
 *
 * REST API endpoints for page composition and export.
 */

import { Hono } from "hono";
import { z } from "zod";
import { getCompositionService, getConfig } from "@graphix/core";
import { errors } from "../errors/index.js";
import { ErrorCodes } from "../errors/types.js";
import {
  validateBody,
  validateId,
  validateQuery,
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

const downloadQuerySchema = z.object({
  path: nonEmptyString,
});

const exportStoryboardSchema = z.object({
  storyboardId: uuidSchema,
  templateId: z.string().optional(),
  pageSize: z.string().optional(),
  outputName: nonEmptyString,
  format: z.enum(["png-all"]),
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
  const { resolve, sep } = await import("path");
  const config = getConfig();

  const outputRoot = resolve(config.storage.outputDir);
  const outputRootPrefix = outputRoot.endsWith(sep) ? outputRoot : outputRoot + sep;
  const resolveWithinOutput = (value: string) => resolve(outputRoot, value);
  const inputPath = resolveWithinOutput(body.inputPath);
  const outputPath = resolveWithinOutput(body.outputPath);

  if (!inputPath.startsWith(outputRootPrefix) || !outputPath.startsWith(outputRootPrefix)) {
    return errors.badRequest(c, "Invalid file path", ErrorCodes.PATH_TRAVERSAL);
  }

  const result = await service.exportPage({
    inputPath,
    outputPath,
    format: body.format,
    quality: body.quality,
    dpi: body.dpi,
    bleed: body.bleed,
    trimMarks: body.trimMarks,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error ?? "Failed to export page");
  }

  const downloadUrl = `/api/composition/download?path=${encodeURIComponent(outputPath)}`;
  return c.json({ ...result, downloadUrl }, 201);
});

compositionRoutes.post(
  "/export-storyboard",
  validateBody(exportStoryboardSchema),
  async (c) => {
    const service = getCompositionService();
    const body = c.req.valid("json");
    const { resolve, extname, basename, sep } = await import("path");
    const config = getConfig();

    const outputRoot = resolve(config.storage.outputDir);
    const outputRootPrefix = outputRoot.endsWith(sep) ? outputRoot : outputRoot + sep;
    const outputName = body.outputName.endsWith(".png")
      ? body.outputName
      : `${body.outputName}.png`;
    const outputPath = resolve(outputRoot, "pages", outputName);

    if (!outputPath.startsWith(outputRootPrefix)) {
      return errors.badRequest(c, "Invalid file path", ErrorCodes.PATH_TRAVERSAL);
    }

    const prefixBase = basename(outputName, extname(outputName));
    const composeResult = await service.composeStoryboard(body.storyboardId, {
      templateId: body.templateId,
      pageSize: body.pageSize,
      outputPrefix: prefixBase,
    });

    if (!composeResult.success) {
      return errors.badRequest(c, composeResult.error ?? "Failed to compose storyboard");
    }

    const imagePaths = composeResult.pages
      .filter((page) => page.outputPath)
      .map((page) => page.outputPath as string);

    const stitchResult = await service.stitchPages({
      imagePaths,
      outputPath,
    });

    if (!stitchResult.success) {
      return errors.badRequest(c, stitchResult.error ?? "Failed to stitch pages");
    }

    const downloadUrl = `/api/composition/download?path=${encodeURIComponent(outputPath)}`;
    return c.json({ ...stitchResult, downloadUrl }, 201);
  }
);

compositionRoutes.get("/download", validateQuery(downloadQuerySchema), async (c) => {
  const { path } = c.req.valid("query");
  const { readFile } = await import("fs/promises");
  const { extname, resolve, sep } = await import("path");
  const config = getConfig();

  const outputRoot = resolve(config.storage.outputDir);
  const outputRootPrefix = outputRoot.endsWith(sep) ? outputRoot : outputRoot + sep;
  const resolvedPath = resolve(path);

  if (!resolvedPath.startsWith(outputRootPrefix)) {
    return errors.badRequest(c, "Invalid file path", ErrorCodes.PATH_TRAVERSAL);
  }

  try {
    const fileBuffer = await readFile(resolvedPath);
    const ext = extname(resolvedPath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".pdf"
              ? "application/pdf"
              : "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="export${ext}"`,
      },
    });
  } catch (err) {
    return errors.badRequest(c, "Export file not found", ErrorCodes.FILE_NOT_FOUND);
  }
});

export { compositionRoutes };
