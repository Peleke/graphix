/**
 * Composition Routes
 *
 * REST API endpoints for page composition and export.
 */

import { Hono } from "hono";
import { getCompositionService } from "@graphix/core";

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
compositionRoutes.get("/templates/:id", async (c) => {
  const service = getCompositionService();
  const templates = service.listTemplates();
  const template = templates.find((t) => t.id === c.req.param("id"));

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
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
compositionRoutes.post("/compose", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.storyboardId || !body.templateId || !body.panelIds || !body.outputName) {
    return c.json({
      error: "Missing required fields: storyboardId, templateId, panelIds, outputName",
    }, 400);
  }

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
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

// Auto-compose entire storyboard into pages
compositionRoutes.post("/compose-storyboard", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.storyboardId) {
    return c.json({ error: "Missing required field: storyboardId" }, 400);
  }

  const result = await service.composeStoryboard(body.storyboardId, {
    templateId: body.templateId,
    pageSize: body.pageSize,
    outputPrefix: body.outputPrefix,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

// Create contact sheet
compositionRoutes.post("/contact-sheet", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.storyboardId || !body.outputPath) {
    return c.json({
      error: "Missing required fields: storyboardId, outputPath",
    }, 400);
  }

  const result = await service.createContactSheet(body.storyboardId, body.outputPath, {
    columns: body.columns,
    thumbnailSize: body.thumbnailSize,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

// Export a composed page
compositionRoutes.post("/export", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.inputPath || !body.outputPath || !body.format) {
    return c.json({
      error: "Missing required fields: inputPath, outputPath, format",
    }, 400);
  }

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
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

// Compose a page directly from file paths (no database)
compositionRoutes.post("/compose-from-paths", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.templateId || !body.panelPaths || !body.outputPath) {
    return c.json({
      error: "Missing required fields: templateId, panelPaths, outputPath",
    }, 400);
  }

  const result = await service.composeFromPaths({
    templateId: body.templateId,
    panelPaths: body.panelPaths,
    outputPath: body.outputPath,
    pageSize: body.pageSize,
    backgroundColor: body.backgroundColor,
    gutterSize: body.gutterSize,
    margin: body.margin,
    panelBorderRadius: body.panelBorderRadius,
    panelBorderWidth: body.panelBorderWidth,
    panelBorderColor: body.panelBorderColor,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

// Create contact sheet from file paths (no database)
compositionRoutes.post("/contact-sheet-from-paths", async (c) => {
  const service = getCompositionService();
  const body = await c.req.json();

  // Validate required fields
  if (!body.imagePaths || !body.outputPath) {
    return c.json({
      error: "Missing required fields: imagePaths, outputPath",
    }, 400);
  }

  const result = await service.contactSheetFromPaths({
    imagePaths: body.imagePaths,
    outputPath: body.outputPath,
    columns: body.columns,
    thumbnailSize: body.thumbnailSize,
    gap: body.gap,
    backgroundColor: body.backgroundColor,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result, 201);
});

export { compositionRoutes };
