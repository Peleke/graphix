/**
 * Composition Routes
 *
 * REST API endpoints for page composition and export.
 */

import { Hono } from "hono";
import { z } from "zod";
import { getCompositionService, getConfig, getPageLayoutService, getPanelService } from "@graphix/core";
import { errors } from "../errors/index.js";
import { ErrorCodes } from "../errors/types.js";
import {
  validateBody,
  validateId,
  validateParam,
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

const pageLayoutSchema = z.object({
  name: nonEmptyString,
  pageNumber: z.number().int().positive().default(1),
  templateId: nonEmptyString,
  pageSize: z.string().optional(),
  backgroundColor: z.string().optional(),
  slotAssignments: z.record(nonEmptyString, uuidSchema),
});

const pageLayoutQuerySchema = z.object({
  pageNumber: z.coerce.number().int().positive().default(1),
});

const MAX_LAYOUT_ASSIGNMENTS = 64;
const MAX_LAYOUT_PAYLOAD_BYTES = 50_000;

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

// Get saved layout for storyboard/page
compositionRoutes.get(
  "/layouts/:storyboardId",
  validateParam(z.object({ storyboardId: uuidSchema })),
  validateQuery(pageLayoutQuerySchema),
  async (c) => {
    const layoutService = getPageLayoutService();
    const { storyboardId } = c.req.valid("param");
    const { pageNumber } = c.req.valid("query");

    const layout = await layoutService.getByStoryboard(storyboardId, pageNumber);
    return c.json({ layout });
  }
);

// Save layout for storyboard/page
compositionRoutes.put(
  "/layouts/:storyboardId",
  validateParam(z.object({ storyboardId: uuidSchema })),
  validateBody(pageLayoutSchema),
  async (c) => {
    const layoutService = getPageLayoutService();
    const panelService = getPanelService();
    const { storyboardId } = c.req.valid("param");
    const body = c.req.valid("json");
    const service = getCompositionService();

    const assignments = Object.keys(body.slotAssignments);
    const payloadBytes = new TextEncoder().encode(JSON.stringify(body.slotAssignments)).length;
    if (payloadBytes > MAX_LAYOUT_PAYLOAD_BYTES) {
      return errors.limitExceeded(c, "Layout payload", payloadBytes, MAX_LAYOUT_PAYLOAD_BYTES);
    }
    if (assignments.length > MAX_LAYOUT_ASSIGNMENTS) {
      return errors.limitExceeded(c, "Layout assignments", assignments.length, MAX_LAYOUT_ASSIGNMENTS);
    }

    const template = service.listTemplates().find((t) => t.id === body.templateId);
    if (!template) {
      return errors.notFound(c, "Template", body.templateId);
    }

    if (assignments.length > template.slots.length) {
      return errors.limitExceeded(c, "Template slots", assignments.length, template.slots.length);
    }

    const allowedSlots = new Set(template.slots.map((slot) => slot.id));
    for (const slotId of assignments) {
      if (!allowedSlots.has(slotId)) {
        return errors.badRequest(c, "Invalid slot ID for template", ErrorCodes.INVALID_INPUT);
      }
    }

    const storyboardPanels = await panelService.getByStoryboard(storyboardId);
    const panelIds = new Set(storyboardPanels.map((panel) => panel.id));
    for (const panelId of Object.values(body.slotAssignments)) {
      if (!panelIds.has(panelId)) {
        return errors.badRequest(c, "Panel does not belong to storyboard", ErrorCodes.INVALID_INPUT);
      }
    }

    const pageSizes = service.listPageSizes();
    const pageSize = body.pageSize ? pageSizes[body.pageSize] ?? pageSizes.comic_standard : pageSizes.comic_standard;

    const layoutConfig = {
      template: body.templateId,
      width: pageSize.width,
      height: pageSize.height,
      dpi: pageSize.dpi ?? 300,
      margin: template.margin ?? 2,
      gutter: template.gutter ?? 2,
      backgroundColor: body.backgroundColor ?? "#ffffff",
      slotAssignments: body.slotAssignments,
    };

    const panelPlacements = Object.values(body.slotAssignments).map((panelId, index) => ({
      panelId,
      row: index,
      col: 0,
      rowSpan: 1,
      colSpan: 1,
    }));

    const layout = await layoutService.upsertLayout({
      storyboardId,
      name: body.name,
      pageNumber: body.pageNumber,
      layoutConfig,
      panelPlacements,
    });

    return c.json({ layout }, 200);
  }
);

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
