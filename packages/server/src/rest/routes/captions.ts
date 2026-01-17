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
import {
  validateFilePathWithinAllowedDirs,
  VALID_CAPTION_TYPES as CORE_CAPTION_TYPES,
  validateCaptionType as coreValidateCaptionType,
} from "@graphix/core";
import type { CaptionType, CaptionPosition, CaptionStyle } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  validateParam,
  panelIdParamSchema,
  imageIdParamSchema,
  storyIdParamSchema,
  panelCaptionParamSchema,
} from "../validation/index.js";
import { z } from "zod";
import { mkdir } from "fs/promises";
import { dirname } from "path";

// Max caption text length (DoS prevention)
const MAX_CAPTION_TEXT_LENGTH = 2000;

// Local schemas for caption-specific operations
const reorderCaptionsSchema = z.object({
  captionIds: z.array(z.string().uuid()),
});

const previewCaptionsSchema = z.object({
  imagePath: z.string().min(1),
  outputPath: z.string().min(1),
});

const generateCaptionsOptionsSchema = z.object({
  includeDialogue: z.boolean().optional(),
  includeNarration: z.boolean().optional(),
  includeSfx: z.boolean().optional(),
  defaultPositions: z.record(z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })).optional(),
}).optional();

const renderWithCaptionsSchema = z.object({
  imagePath: z.string().min(1),
  enabledOnly: z.boolean().optional(),
});

const renderCaptionsDirectSchema = z.object({
  imagePath: z.string().min(1),
  outputPath: z.string().min(1),
  captions: z.array(z.object({
    type: z.string(),
    text: z.string().max(MAX_CAPTION_TEXT_LENGTH),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    tailX: z.number().min(0).max(100).optional(),
    tailY: z.number().min(0).max(100).optional(),
    characterId: z.string().uuid().optional(),
    zIndex: z.number().int().optional(),
    fontSize: z.number().positive().optional(),
    fontColor: z.string().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.enum(["normal", "bold"]).optional(),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().nonnegative().optional(),
    opacity: z.number().min(0).max(1).optional(),
    padding: z.number().nonnegative().optional(),
    maxWidth: z.number().positive().optional(),
    effectPreset: z.string().optional(),
  })),
});

// ============================================================================
// Request Validation Utilities
// ============================================================================

/**
 * Validate that a file path is safe and within allowed directories.
 */
function validateFilePath(filePath: string, operation: "read" | "write"): string {
  return validateFilePathWithinAllowedDirs(filePath, operation);
}

/**
 * Validate caption type (delegates to core).
 */
function validateCaptionType(type: unknown): CaptionType {
  if (typeof type !== "string") {
    throw new Error(`Invalid caption type. Must be one of: ${CORE_CAPTION_TYPES.join(", ")}`);
  }
  return coreValidateCaptionType(type);
}

const captionRoutes = new Hono();

// ============================================================================
// Panel Caption Routes (nested under panels)
// ============================================================================

// List captions for a panel
captionRoutes.get(
  "/panels/:panelId/captions",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getCaptionService();
    const { panelId } = c.req.valid("param");

    const captions = await service.getByPanel(panelId);

    return c.json({ captions });
  }
);

// Add caption to panel
captionRoutes.post(
  "/panels/:panelId/captions",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getCaptionService();
    const { panelId } = c.req.valid("param");
    const body = await c.req.json();

    if (!body.type || !body.text || body.x === undefined || body.y === undefined) {
      return errors.badRequest(c, "type, text, x, and y are required");
    }

    // Validate text length to prevent DoS
    if (typeof body.text === "string" && body.text.length > MAX_CAPTION_TEXT_LENGTH) {
      return errors.badRequest(c, `Text exceeds maximum length of ${MAX_CAPTION_TEXT_LENGTH} characters`);
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
  }
);

// Reorder captions within a panel
captionRoutes.post(
  "/panels/:panelId/captions/reorder",
  validateParam(panelIdParamSchema),
  validateBody(reorderCaptionsSchema),
  async (c) => {
    const service = getCaptionService();
    const { panelId } = c.req.valid("param");
    const { captionIds } = c.req.valid("json");

    const captions = await service.reorder(panelId, captionIds);

    return c.json({
      captions,
      message: "Captions reordered",
    });
  }
);

// Preview panel with captions rendered
captionRoutes.post(
  "/panels/:panelId/captions/preview",
  validateParam(panelIdParamSchema),
  validateBody(previewCaptionsSchema),
  async (c) => {
    const service = getCaptionService();
    const { panelId } = c.req.valid("param");
    const { imagePath, outputPath } = c.req.valid("json");

    try {
      // Validate file paths to prevent path traversal
      const validatedInputPath = validateFilePath(imagePath, "read");
      const validatedOutputPath = validateFilePath(outputPath, "write");

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
      return errors.badRequest(c, message);
    }
  }
);

// ============================================================================
// Caption Generation Routes
// ============================================================================

// Generate captions from linked beat
captionRoutes.post(
  "/panels/:panelId/captions/generate",
  validateParam(panelIdParamSchema),
  async (c) => {
    const { panelId } = c.req.valid("param");
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
      return errors.badRequest(c, message);
    }
  }
);

// Toggle caption enabled/disabled
captionRoutes.patch(
  "/panels/:panelId/captions/:captionId/toggle",
  validateParam(panelCaptionParamSchema),
  async (c) => {
    const { captionId } = c.req.valid("param");

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
      return errors.badRequest(c, message);
    }
  }
);

// Render panel image with captions
captionRoutes.post(
  "/panels/:panelId/render-with-captions",
  validateParam(panelIdParamSchema),
  validateBody(renderWithCaptionsSchema),
  async (c) => {
    const { panelId } = c.req.valid("param");
    const body = c.req.valid("json");

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
      // Use badRequest for validation errors, internal for others
      if (message.includes("path") || message.includes("traversal")) {
        return errors.badRequest(c, message);
      }
      return errors.internal(c, message);
    }
  }
);

// Re-render captions for a generated image
captionRoutes.post(
  "/images/:imageId/render-with-captions",
  validateParam(imageIdParamSchema),
  async (c) => {
    const { imageId } = c.req.valid("param");
    const body = await c.req.json().catch(() => ({}));

    const enabledOnly = body.enabledOnly !== false;

    try {
      const generator = getPanelGenerator();
      const result = await generator.rerenderWithCaptions(imageId, { enabledOnly });

      if (!result.success) {
        return errors.badRequest(c, result.error ?? "Failed to render captions");
      }

      return c.json({
        success: true,
        captionedImagePath: result.captionedImagePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to render captions";
      return errors.internal(c, message);
    }
  }
);

// ============================================================================
// Batch Caption Operations
// ============================================================================

// Generate captions for all beats in a story
captionRoutes.post(
  "/stories/:storyId/generate-captions",
  validateParam(storyIdParamSchema),
  async (c) => {
    const { storyId } = c.req.valid("param");
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
      return errors.badRequest(c, message);
    }
  }
);

// Delete all captions for a panel
captionRoutes.delete(
  "/panels/:panelId/captions",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getCaptionService();
    const { panelId } = c.req.valid("param");

    await service.deleteByPanel(panelId);

    return c.body(null, 204);
  }
);

// ============================================================================
// Direct Caption Routes
// ============================================================================

// Get caption by ID
captionRoutes.get("/captions/:id", validateId(), async (c) => {
  const service = getCaptionService();
  const { id } = c.req.valid("param");

  const caption = await service.getById(id);

  if (!caption) {
    return errors.notFound(c, "Caption", id);
  }

  return c.json(caption);
});

// Update caption
captionRoutes.patch(
  "/captions/:id",
  validateId(),
  async (c) => {
    const service = getCaptionService();
    const { id } = c.req.valid("param");
    const body = await c.req.json();

    const existing = await service.getById(id);
    if (!existing) {
      return errors.notFound(c, "Caption", id);
    }

    const updateData: Record<string, unknown> = {};

    if (body.type !== undefined) updateData.type = body.type;
    if (body.text !== undefined) {
      // Validate text length to prevent DoS
      if (typeof body.text === "string" && body.text.length > MAX_CAPTION_TEXT_LENGTH) {
        return errors.badRequest(c, `Text exceeds maximum length of ${MAX_CAPTION_TEXT_LENGTH} characters`);
      }
      updateData.text = body.text;
    }
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
      id,
      updateData as Parameters<typeof service.update>[1]
    );

    return c.json(caption);
  }
);

// Delete caption
captionRoutes.delete("/captions/:id", validateId(), async (c) => {
  const service = getCaptionService();
  const { id } = c.req.valid("param");

  const existing = await service.getById(id);
  if (!existing) {
    return errors.notFound(c, "Caption", id);
  }

  await service.delete(id);

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
captionRoutes.post(
  "/captions/render",
  validateBody(renderCaptionsDirectSchema),
  async (c) => {
    const body = c.req.valid("json");

    try {
      // Validate file paths to prevent path traversal
      const validatedInputPath = validateFilePath(body.imagePath, "read");
      const validatedOutputPath = validateFilePath(body.outputPath, "write");

      // Map inline captions to RenderableCaption format with validation
      const renderableCaptions: RenderableCaption[] = body.captions.map((cap) => {
        // Validate caption type
        const validType = validateCaptionType(cap.type);

        const position = { x: cap.x, y: cap.y };

        // Tail direction if provided
        let tailDirection: { x: number; y: number } | undefined;
        if (cap.tailX !== undefined && cap.tailY !== undefined) {
          tailDirection = { x: cap.tailX, y: cap.tailY };
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
      return errors.badRequest(c, message);
    }
  }
);

export { captionRoutes };
