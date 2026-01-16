/**
 * Caption Routes
 *
 * REST API endpoints for panel caption management.
 * Includes caption CRUD, generation from beats, and rendering.
 */

import { Hono } from "hono";
import { getCaptionService, DEFAULT_CAPTION_STYLES } from "@graphix/core";
import { getNarrativeService, type GenerateCaptionsOptions } from "@graphix/core";
import { getPanelGenerator } from "@graphix/core";
import { compositeCaptions, type RenderableCaption } from "@graphix/core";
import type { CaptionType, CaptionPosition, CaptionStyle } from "@graphix/core";
import { mkdir } from "fs/promises";
import { dirname } from "path";

const captionRoutes = new Hono();

// ============================================================================
// Panel Caption Routes (nested under panels)
// ============================================================================

// List captions for a panel
captionRoutes.get("/panels/:panelId/captions", async (c) => {
  const service = getCaptionService();
  const captions = await service.getByPanel(c.req.param("panelId"));

  return c.json({
    captions,
    count: captions.length,
  });
});

// Add caption to panel
captionRoutes.post("/panels/:panelId/captions", async (c) => {
  const service = getCaptionService();
  const panelId = c.req.param("panelId");
  const body = await c.req.json();

  if (!body.type || !body.text || body.x === undefined || body.y === undefined) {
    return c.json(
      { error: "type, text, x, and y are required" },
      400
    );
  }

  const position: CaptionPosition = {
    x: body.x,
    y: body.y,
  };

  const tailDirection: CaptionPosition | undefined =
    body.tailX !== undefined && body.tailY !== undefined
      ? { x: body.tailX, y: body.tailY }
      : undefined;

  const style: Partial<CaptionStyle> = {};
  if (body.fontSize) style.fontSize = body.fontSize;
  if (body.fontColor) style.fontColor = body.fontColor;
  if (body.fontFamily) style.fontFamily = body.fontFamily;
  if (body.fontWeight) style.fontWeight = body.fontWeight;
  if (body.backgroundColor) style.backgroundColor = body.backgroundColor;
  if (body.borderColor) style.borderColor = body.borderColor;
  if (body.borderWidth) style.borderWidth = body.borderWidth;
  if (body.opacity !== undefined) style.opacity = body.opacity;
  if (body.padding) style.padding = body.padding;
  if (body.maxWidth) style.maxWidth = body.maxWidth;

  const caption = await service.create({
    panelId,
    type: body.type as CaptionType,
    text: body.text,
    characterId: body.characterId,
    position,
    tailDirection,
    style: Object.keys(style).length > 0 ? style : undefined,
    zIndex: body.zIndex,
  });

  return c.json(caption, 201);
});

// Reorder captions within a panel
captionRoutes.post("/panels/:panelId/captions/reorder", async (c) => {
  const service = getCaptionService();
  const panelId = c.req.param("panelId");
  const body = await c.req.json();

  if (!Array.isArray(body.captionIds)) {
    return c.json({ error: "captionIds array is required" }, 400);
  }

  const captions = await service.reorder(panelId, body.captionIds);

  return c.json({
    captions,
    message: "Captions reordered",
  });
});

// Preview panel with captions rendered
captionRoutes.post("/panels/:panelId/captions/preview", async (c) => {
  const service = getCaptionService();
  const panelId = c.req.param("panelId");
  const body = await c.req.json();

  if (!body.imagePath || !body.outputPath) {
    return c.json(
      { error: "imagePath and outputPath are required" },
      400
    );
  }

  const captions = await service.getByPanel(panelId);

  const renderableCaptions: RenderableCaption[] = captions.map((cap) => ({
    id: cap.id,
    type: cap.type as CaptionType,
    text: cap.text,
    characterId: cap.characterId ?? undefined,
    position: cap.position as CaptionPosition,
    tailDirection: cap.tailDirection as CaptionPosition | undefined,
    style: cap.style as Partial<CaptionStyle> | undefined,
    zIndex: cap.zIndex,
  }));

  // Ensure output directory exists
  await mkdir(dirname(body.outputPath), { recursive: true });

  await compositeCaptions(body.imagePath, renderableCaptions, body.outputPath);

  return c.json({
    success: true,
    outputPath: body.outputPath,
    captionCount: captions.length,
  });
});

// ============================================================================
// Caption Generation Routes
// ============================================================================

// Generate captions from linked beat
captionRoutes.post("/panels/:panelId/captions/generate", async (c) => {
  const panelId = c.req.param("panelId");
  const body = await c.req.json().catch(() => ({}));

  const options: GenerateCaptionsOptions = {};
  if (body.includeDialogue !== undefined) options.includeDialogue = body.includeDialogue;
  if (body.includeNarration !== undefined) options.includeNarration = body.includeNarration;
  if (body.includeSfx !== undefined) options.includeSfx = body.includeSfx;
  if (body.defaultPositions) options.defaultPositions = body.defaultPositions;

  try {
    const generator = getPanelGenerator();
    const result = await generator.generateCaptionsFromBeat(panelId, options);

    return c.json({
      success: true,
      captions: result.captions,
      beatId: result.beatId,
      count: result.captions.length,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate captions";
    return c.json({ error: message }, 400);
  }
});

// Toggle caption enabled/disabled
captionRoutes.patch("/panels/:panelId/captions/:captionId/toggle", async (c) => {
  const captionId = c.req.param("captionId");

  try {
    const narrativeService = getNarrativeService();
    const caption = await narrativeService.toggleCaptionEnabled(captionId);

    return c.json({
      success: true,
      caption,
      enabled: caption.enabled,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle caption";
    return c.json({ error: message }, 400);
  }
});

// Render panel image with captions
captionRoutes.post("/panels/:panelId/render-with-captions", async (c) => {
  const panelId = c.req.param("panelId");
  const body = await c.req.json();

  if (!body.imagePath) {
    return c.json({ error: "imagePath is required" }, 400);
  }

  const enabledOnly = body.enabledOnly !== false; // Default to true

  try {
    const generator = getPanelGenerator();
    const outputPath = await generator.renderCaptionsOnImage(
      body.imagePath,
      panelId,
      { enabledOnly }
    );

    return c.json({
      success: true,
      outputPath,
      originalPath: body.imagePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render captions";
    return c.json({ error: message }, 500);
  }
});

// Re-render captions for a generated image
captionRoutes.post("/images/:imageId/render-with-captions", async (c) => {
  const imageId = c.req.param("imageId");
  const body = await c.req.json().catch(() => ({}));

  const enabledOnly = body.enabledOnly !== false;

  try {
    const generator = getPanelGenerator();
    const result = await generator.rerenderWithCaptions(imageId, { enabledOnly });

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      success: true,
      captionedImagePath: result.captionedImagePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render captions";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// Batch Caption Operations
// ============================================================================

// Generate captions for all beats in a story
captionRoutes.post("/stories/:storyId/generate-captions", async (c) => {
  const storyId = c.req.param("storyId");
  const body = await c.req.json().catch(() => ({}));

  const options: GenerateCaptionsOptions = {};
  if (body.includeDialogue !== undefined) options.includeDialogue = body.includeDialogue;
  if (body.includeNarration !== undefined) options.includeNarration = body.includeNarration;
  if (body.includeSfx !== undefined) options.includeSfx = body.includeSfx;
  if (body.defaultPositions) options.defaultPositions = body.defaultPositions;

  try {
    const narrativeService = getNarrativeService();
    const results = await narrativeService.generateCaptionsForStory(storyId, options);

    const totalCaptions = results.reduce((sum, r) => sum + r.captions.length, 0);

    return c.json({
      success: true,
      panelsProcessed: results.length,
      totalCaptions,
      results: results.map(r => ({
        beatId: r.beatId,
        panelId: r.panelId,
        captionCount: r.captions.length,
      })),
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate captions";
    return c.json({ error: message }, 400);
  }
});

// Delete all captions for a panel
captionRoutes.delete("/panels/:panelId/captions", async (c) => {
  const service = getCaptionService();
  await service.deleteByPanel(c.req.param("panelId"));

  return c.body(null, 204);
});

// ============================================================================
// Direct Caption Routes
// ============================================================================

// Get caption by ID
captionRoutes.get("/captions/:id", async (c) => {
  const service = getCaptionService();
  const caption = await service.getById(c.req.param("id"));

  if (!caption) {
    return c.json({ error: "Caption not found" }, 404);
  }

  return c.json(caption);
});

// Update caption
captionRoutes.patch("/captions/:id", async (c) => {
  const service = getCaptionService();
  const captionId = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};

  if (body.type !== undefined) updateData.type = body.type;
  if (body.text !== undefined) updateData.text = body.text;
  if (body.characterId !== undefined) updateData.characterId = body.characterId;
  if (body.x !== undefined && body.y !== undefined) {
    updateData.position = { x: body.x, y: body.y };
  }
  if (body.tailX !== undefined && body.tailY !== undefined) {
    updateData.tailDirection = { x: body.tailX, y: body.tailY };
  }
  if (body.zIndex !== undefined) updateData.zIndex = body.zIndex;

  // Style updates
  const style: Partial<CaptionStyle> = {};
  if (body.fontSize) style.fontSize = body.fontSize;
  if (body.fontColor) style.fontColor = body.fontColor;
  if (body.fontFamily) style.fontFamily = body.fontFamily;
  if (body.fontWeight) style.fontWeight = body.fontWeight;
  if (body.backgroundColor) style.backgroundColor = body.backgroundColor;
  if (body.borderColor) style.borderColor = body.borderColor;
  if (body.borderWidth) style.borderWidth = body.borderWidth;
  if (body.opacity !== undefined) style.opacity = body.opacity;
  if (body.padding) style.padding = body.padding;
  if (body.maxWidth) style.maxWidth = body.maxWidth;

  if (Object.keys(style).length > 0) {
    updateData.style = style;
  }

  const caption = await service.update(
    captionId,
    updateData as Parameters<typeof service.update>[1]
  );

  return c.json(caption);
});

// Delete caption
captionRoutes.delete("/captions/:id", async (c) => {
  const service = getCaptionService();
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

// ============================================================================
// Utility Routes
// ============================================================================

// Get default styles for all caption types
captionRoutes.get("/captions/defaults", async (c) => {
  return c.json({
    defaults: DEFAULT_CAPTION_STYLES,
    types: ["speech", "thought", "narration", "sfx", "whisper"] as CaptionType[],
  });
});

// Render captions directly onto an image (no database)
captionRoutes.post("/captions/render", async (c) => {
  const body = await c.req.json();

  if (!body.imagePath || !body.outputPath || !Array.isArray(body.captions)) {
    return c.json({
      error: "Missing required fields: imagePath, outputPath, captions[]",
    }, 400);
  }

  // Map inline captions to RenderableCaption format
  const renderableCaptions: RenderableCaption[] = body.captions.map((cap: {
    type: CaptionType;
    text: string;
    x: number;
    y: number;
    tailX?: number;
    tailY?: number;
    characterId?: string;
    zIndex?: number;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    padding?: number;
    maxWidth?: number;
    effectPreset?: string;
  }) => {
    const style: Partial<CaptionStyle> = {};
    if (cap.fontSize) style.fontSize = cap.fontSize;
    if (cap.fontColor) style.fontColor = cap.fontColor;
    if (cap.fontFamily) style.fontFamily = cap.fontFamily;
    if (cap.fontWeight) style.fontWeight = cap.fontWeight;
    if (cap.backgroundColor) style.backgroundColor = cap.backgroundColor;
    if (cap.borderColor) style.borderColor = cap.borderColor;
    if (cap.borderWidth !== undefined) style.borderWidth = cap.borderWidth;
    if (cap.opacity !== undefined) style.opacity = cap.opacity;
    if (cap.padding) style.padding = cap.padding;
    if (cap.maxWidth) style.maxWidth = cap.maxWidth;

    return {
      type: cap.type,
      text: cap.text,
      characterId: cap.characterId,
      position: { x: cap.x, y: cap.y },
      tailDirection: cap.tailX !== undefined && cap.tailY !== undefined
        ? { x: cap.tailX, y: cap.tailY }
        : undefined,
      style: Object.keys(style).length > 0 ? style : undefined,
      zIndex: cap.zIndex,
      effectPreset: cap.effectPreset,
    } as RenderableCaption;
  });

  // Ensure output directory exists
  await mkdir(dirname(body.outputPath), { recursive: true });

  await compositeCaptions(body.imagePath, renderableCaptions, body.outputPath);

  return c.json({
    success: true,
    outputPath: body.outputPath,
    captionCount: renderableCaptions.length,
  }, 201);
});

export { captionRoutes };
