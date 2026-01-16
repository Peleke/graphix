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
import { mkdir, access } from "fs/promises";
import { dirname, resolve } from "path";

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Get allowed base directories for file operations.
 * Restricts file operations to safe locations.
 */
function getAllowedBaseDirs(): string[] {
  const outputDir = process.env.GRAPHIX_OUTPUT_DIR || resolve(process.cwd(), "output");
  const inputDir = process.env.GRAPHIX_INPUT_DIR || resolve(process.cwd(), "input");
  const tempDir = process.env.GRAPHIX_TEMP_DIR || resolve(process.cwd(), "temp");
  return [outputDir, inputDir, tempDir, process.cwd()];
}

/**
 * Validate that a file path is safe and within allowed directories.
 * Prevents path traversal attacks.
 */
function validateFilePath(filePath: string, operation: "read" | "write"): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("File path must be a non-empty string");
  }

  // Reject null bytes
  if (filePath.includes("\0")) {
    throw new Error("File path contains invalid characters");
  }

  // Reject obvious traversal attempts
  if (filePath.includes("..")) {
    throw new Error("Path traversal is not allowed");
  }

  // Resolve the path
  const resolvedPath = resolve(filePath);

  // Check if path is within allowed directories
  const allowedDirs = getAllowedBaseDirs();
  const isAllowed = allowedDirs.some(dir => {
    const resolvedDir = resolve(dir);
    return resolvedPath.startsWith(resolvedDir + "/") || resolvedPath === resolvedDir;
  });

  if (!isAllowed) {
    throw new Error(`File path must be within allowed directories: ${allowedDirs.join(", ")}`);
  }

  // For write operations, ensure we're not writing to sensitive locations
  if (operation === "write") {
    const sensitivePatterns = [
      /^\/etc\//,
      /^\/usr\//,
      /^\/bin\//,
      /^\/sbin\//,
      /^\/var\/log\//,
      /\.env$/,
      /\.git\//,
      /node_modules\//,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(resolvedPath)) {
        throw new Error("Cannot write to sensitive system locations");
      }
    }
  }

  return resolvedPath;
}

/**
 * Validate input types for common request body fields.
 */
function validateRequestBody(body: Record<string, unknown>, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Validate position coordinates (must be 0-100 percentage).
 */
function validatePosition(x: unknown, y: unknown): { x: number; y: number } {
  const xNum = Number(x);
  const yNum = Number(y);

  if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) {
    throw new Error("Position x and y must be valid numbers");
  }

  if (xNum < 0 || xNum > 100 || yNum < 0 || yNum > 100) {
    throw new Error("Position values must be between 0 and 100 (percentage)");
  }

  return { x: xNum, y: yNum };
}

/**
 * Validate caption type.
 */
const VALID_CAPTION_TYPES = ["speech", "thought", "narration", "sfx", "whisper"];

function validateCaptionType(type: unknown): CaptionType {
  if (typeof type !== "string" || !VALID_CAPTION_TYPES.includes(type)) {
    throw new Error(`Invalid caption type. Must be one of: ${VALID_CAPTION_TYPES.join(", ")}`);
  }
  return type as CaptionType;
}

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

  try {
    // Validate file paths to prevent path traversal
    const validatedInputPath = validateFilePath(body.imagePath, "read");
    const validatedOutputPath = validateFilePath(body.outputPath, "write");

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
    await mkdir(dirname(validatedOutputPath), { recursive: true });

    await compositeCaptions(validatedInputPath, renderableCaptions, validatedOutputPath);

    return c.json({
      success: true,
      outputPath: validatedOutputPath,
      captionCount: captions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render preview";
    return c.json({ error: message }, 400);
  }
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

  try {
    // Validate input path to prevent path traversal
    const validatedInputPath = validateFilePath(body.imagePath, "read");
    const enabledOnly = body.enabledOnly !== false; // Default to true

    const generator = getPanelGenerator();
    const outputPath = await generator.renderCaptionsOnImage(
      validatedInputPath,
      panelId,
      { enabledOnly }
    );

    return c.json({
      success: true,
      outputPath,
      originalPath: validatedInputPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render captions";
    // Use 400 for validation errors, 500 for internal errors
    const status = message.includes("path") || message.includes("traversal") ? 400 : 500;
    return c.json({ error: message }, status);
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

  try {
    // Validate file paths to prevent path traversal
    const validatedInputPath = validateFilePath(body.imagePath, "read");
    const validatedOutputPath = validateFilePath(body.outputPath, "write");

    // Map inline captions to RenderableCaption format with validation
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
    }, index: number) => {
      // Validate required fields
      if (!cap.text || typeof cap.text !== "string") {
        throw new Error(`Caption ${index}: text is required`);
      }

      // Validate caption type
      const validType = validateCaptionType(cap.type);

      // Validate position
      const position = validatePosition(cap.x, cap.y);

      // Validate tail direction if provided
      let tailDirection: { x: number; y: number } | undefined;
      if (cap.tailX !== undefined && cap.tailY !== undefined) {
        tailDirection = validatePosition(cap.tailX, cap.tailY);
      }

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
        type: validType,
        text: cap.text,
        characterId: cap.characterId,
        position,
        tailDirection,
        style: Object.keys(style).length > 0 ? style : undefined,
        zIndex: cap.zIndex,
        effectPreset: cap.effectPreset,
      } as RenderableCaption;
    });

    // Ensure output directory exists
    await mkdir(dirname(validatedOutputPath), { recursive: true });

    await compositeCaptions(validatedInputPath, renderableCaptions, validatedOutputPath);

    return c.json({
      success: true,
      outputPath: validatedOutputPath,
      captionCount: renderableCaptions.length,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render captions";
    return c.json({ error: message }, 400);
  }
});

export { captionRoutes };
