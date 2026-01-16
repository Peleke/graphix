/**
 * Composition Routes
 *
 * REST API endpoints for page composition and export.
 */

import { Hono } from "hono";
import { getCompositionService } from "../../../composition/index.js";

const compositionRoutes = new Hono();
const service = getCompositionService();

// List available templates
compositionRoutes.get("/templates", async (c) => {
  const templates = service.listTemplates();

  return c.json({
    templates,
    count: templates.length,
  });
});

// Get specific template
compositionRoutes.get("/templates/:id", async (c) => {
  const templates = service.listTemplates();
  const template = templates.find((t) => t.id === c.req.param("id"));

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

// List available page sizes
compositionRoutes.get("/page-sizes", async (c) => {
  const pageSizes = service.listPageSizes();

  return c.json({
    pageSizes,
  });
});

// Compose a page from panels
compositionRoutes.post("/compose", async (c) => {
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

export { compositionRoutes };
