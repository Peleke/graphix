/**
 * Batch Operations Routes
 *
 * REST API endpoints for batch operations on panels, captions, and generation.
 */

import { Hono } from "hono";
import { getBatchService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateParam,
  uuidSchema,
} from "../validation/index.js";
import { z } from "zod";

// Schemas for batch operations
const batchCreatePanelsSchema = z.object({
  storyboardId: uuidSchema,
  panels: z.array(z.object({
    description: z.string().optional(),
    position: z.number().int().optional(),
    characterIds: z.array(uuidSchema).optional(),
    direction: z.object({
      cameraAngle: z.string().optional(),
      mood: z.string().optional(),
      lighting: z.string().optional(),
    }).optional(),
  })).min(1),
});

const batchDeletePanelsSchema = z.object({
  panelIds: z.array(uuidSchema).min(1),
});

const captionTypeSchema = z.enum(["speech", "thought", "narration", "sfx", "whisper"]);

const batchAddCaptionsSchema = z.object({
  captions: z.array(z.object({
    panelId: uuidSchema,
    type: captionTypeSchema,
    text: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      anchor: z.string().optional(),
    }),
    characterId: uuidSchema.optional(),
    tailDirection: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
    zIndex: z.number().int().optional(),
  })).min(1),
});

const qualityPresetSchema = z.enum(["draft", "standard", "high", "ultra"]);

const batchGenerateSchema = z.object({
  panelIds: z.array(uuidSchema).min(1),
  options: z.object({
    sizePreset: z.string().optional(),
    qualityPreset: qualityPresetSchema.optional(),
    model: z.string().optional(),
    seed: z.number().int().optional(),
    uploadToCloud: z.boolean().optional(),
  }).optional(),
  continueOnError: z.boolean().optional(),
});

const batchGenerateVariantsSchema = z.object({
  panelIds: z.array(uuidSchema).min(1),
  variantCount: z.number().int().min(1).max(10).optional(),
  options: z.object({
    sizePreset: z.string().optional(),
    qualityPreset: qualityPresetSchema.optional(),
    model: z.string().optional(),
    seed: z.number().int().optional(),
    uploadToCloud: z.boolean().optional(),
  }).optional(),
  continueOnError: z.boolean().optional(),
});

const batchRenderCaptionsSchema = z.object({
  panelIds: z.array(uuidSchema).min(1),
  outputDir: z.string().min(1),
  format: z.enum(["png", "jpeg", "webp"]).optional(),
  continueOnError: z.boolean().optional(),
});

const batchSelectOutputsSchema = z.object({
  selections: z.array(z.object({
    panelId: uuidSchema,
    outputId: uuidSchema,
  })).min(1),
});

const batchAutoSelectSchema = z.object({
  panelIds: z.array(uuidSchema).min(1),
  mode: z.enum(["first", "latest"]).optional(),
});

const storyboardIdParamSchema = z.object({
  storyboardId: uuidSchema,
});

const batchRoutes = new Hono();

// ============================================================================
// Panel Operations
// ============================================================================

/**
 * POST /panels
 * Create multiple panels in a storyboard
 */
batchRoutes.post(
  "/panels",
  validateBody(batchCreatePanelsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.createPanels(body.storyboardId, body.panels);

    return c.json({
      ...result,
      summary: {
        requested: body.panels.length,
        created: result.created.length,
        failed: result.errors.length,
      },
    }, result.success ? 201 : 207);
  }
);

/**
 * DELETE /panels
 * Delete multiple panels
 */
batchRoutes.delete(
  "/panels",
  validateBody(batchDeletePanelsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.deletePanels(body.panelIds);

    return c.json({
      ...result,
      summary: {
        requested: body.panelIds.length,
        deleted: result.deleted.length,
        failed: result.errors.length,
      },
    });
  }
);

// ============================================================================
// Caption Operations
// ============================================================================

/**
 * POST /captions
 * Add captions to multiple panels
 */
batchRoutes.post(
  "/captions",
  validateBody(batchAddCaptionsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    // Transform to BatchCaptionInput format
    const inputs = body.captions.map((cap) => ({
      panelId: cap.panelId,
      caption: {
        panelId: cap.panelId,
        type: cap.type,
        text: cap.text,
        characterId: cap.characterId,
        position: cap.position,
        tailDirection: cap.tailDirection,
        style: cap.style,
        zIndex: cap.zIndex,
      },
    }));

    const result = await service.addCaptions(inputs);

    return c.json({
      ...result,
      summary: {
        requested: body.captions.length,
        created: result.created.length,
        failed: result.errors.length,
      },
    }, result.success ? 201 : 207);
  }
);

/**
 * DELETE /captions
 * Clear all captions from multiple panels
 */
batchRoutes.delete(
  "/captions",
  validateBody(batchDeletePanelsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.clearCaptions(body.panelIds);

    return c.json({
      ...result,
      summary: {
        panels: body.panelIds.length,
        captionsCleared: result.cleared,
      },
    });
  }
);

// ============================================================================
// Generation Operations
// ============================================================================

/**
 * POST /generate
 * Generate images for multiple panels
 */
batchRoutes.post(
  "/generate",
  validateBody(batchGenerateSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.generatePanels(body.panelIds, {
      ...body.options,
      continueOnError: body.continueOnError,
    });

    return c.json({
      ...result,
      summary: {
        requested: body.panelIds.length,
        generated: result.totalGenerated,
        failed: result.totalFailed,
      },
    });
  }
);

/**
 * POST /generate/variants
 * Generate multiple variants for each panel
 */
batchRoutes.post(
  "/generate/variants",
  validateBody(batchGenerateVariantsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.generateVariants(
      body.panelIds,
      body.variantCount,
      {
        ...body.options,
        continueOnError: body.continueOnError,
      }
    );

    return c.json({
      ...result,
      summary: {
        panels: body.panelIds.length,
        variantsPerPanel: body.variantCount ?? 3,
        totalGenerated: result.totalGenerated,
        totalFailed: result.totalFailed,
      },
    });
  }
);

// ============================================================================
// Render Operations
// ============================================================================

/**
 * POST /render/captions
 * Render captions onto generated images for multiple panels
 */
batchRoutes.post(
  "/render/captions",
  validateBody(batchRenderCaptionsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.renderCaptions(body.panelIds, {
      outputDir: body.outputDir,
      format: body.format,
      continueOnError: body.continueOnError,
    });

    return c.json({
      ...result,
      summary: {
        requested: body.panelIds.length,
        rendered: result.totalRendered,
        failed: result.totalFailed,
        outputDir: body.outputDir,
      },
    });
  }
);

// ============================================================================
// Selection Operations
// ============================================================================

/**
 * POST /select
 * Select outputs for multiple panels
 */
batchRoutes.post(
  "/select",
  validateBody(batchSelectOutputsSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.selectOutputs(body.selections);

    return c.json({
      ...result,
      summary: {
        requested: body.selections.length,
        selected: result.selected,
        failed: result.errors.length,
      },
    });
  }
);

/**
 * POST /select/auto
 * Auto-select first or latest generated image for multiple panels
 */
batchRoutes.post(
  "/select/auto",
  validateBody(batchAutoSelectSchema),
  async (c) => {
    const service = getBatchService();
    const body = c.req.valid("json");

    const result = await service.autoSelectOutputs(body.panelIds, body.mode);

    return c.json({
      ...result,
      summary: {
        panels: body.panelIds.length,
        selected: result.selected,
        skipped: result.skipped,
        failed: result.errors.length,
      },
    });
  }
);

// ============================================================================
// Utility
// ============================================================================

/**
 * GET /storyboard/:storyboardId/panel-ids
 * Get all panel IDs from a storyboard in position order
 */
batchRoutes.get(
  "/storyboard/:storyboardId/panel-ids",
  validateParam(storyboardIdParamSchema),
  async (c) => {
    const service = getBatchService();
    const { storyboardId } = c.req.valid("param");
    const panelIds = await service.getPanelIds(storyboardId);

    return c.json({
      storyboardId,
      panelIds,
      count: panelIds.length,
    });
  }
);

export { batchRoutes };
