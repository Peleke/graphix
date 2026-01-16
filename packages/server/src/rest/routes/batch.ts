/**
 * Batch Operations Routes
 *
 * REST API endpoints for batch operations on panels, captions, and generation.
 */

import { Hono } from "hono";
import { getBatchService } from "@graphix/core";

const batchRoutes = new Hono();

// ============================================================================
// Panel Operations
// ============================================================================

/**
 * POST /panels
 * Create multiple panels in a storyboard
 *
 * Body:
 * {
 *   storyboardId: string,
 *   panels: [{ description?: string, position?: number, characterIds?: string[], direction?: {...} }]
 * }
 */
batchRoutes.post("/panels", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!body.storyboardId || !Array.isArray(body.panels)) {
    return c.json({ error: "storyboardId and panels array are required" }, 400);
  }

  const result = await service.createPanels(body.storyboardId, body.panels);

  return c.json({
    ...result,
    summary: {
      requested: body.panels.length,
      created: result.created.length,
      failed: result.errors.length,
    },
  }, result.success ? 201 : 207);
});

/**
 * DELETE /panels
 * Delete multiple panels
 *
 * Body:
 * { panelIds: string[] }
 */
batchRoutes.delete("/panels", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds)) {
    return c.json({ error: "panelIds array is required" }, 400);
  }

  const result = await service.deletePanels(body.panelIds);

  return c.json({
    ...result,
    summary: {
      requested: body.panelIds.length,
      deleted: result.deleted.length,
      failed: result.errors.length,
    },
  });
});

// ============================================================================
// Caption Operations
// ============================================================================

/**
 * POST /captions
 * Add captions to multiple panels
 *
 * Body:
 * {
 *   captions: [{
 *     panelId: string,
 *     type: string,
 *     text: string,
 *     position: { x: number, y: number, anchor?: string },
 *     characterId?: string,
 *     tailDirection?: { x: number, y: number },
 *     style?: {...},
 *     zIndex?: number
 *   }]
 * }
 */
batchRoutes.post("/captions", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.captions)) {
    return c.json({ error: "captions array is required" }, 400);
  }

  // Transform to BatchCaptionInput format
  const inputs = body.captions.map((cap: Record<string, unknown>) => ({
    panelId: cap.panelId as string,
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
});

/**
 * DELETE /captions
 * Clear all captions from multiple panels
 *
 * Body:
 * { panelIds: string[] }
 */
batchRoutes.delete("/captions", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds)) {
    return c.json({ error: "panelIds array is required" }, 400);
  }

  const result = await service.clearCaptions(body.panelIds);

  return c.json({
    ...result,
    summary: {
      panels: body.panelIds.length,
      captionsCleared: result.cleared,
    },
  });
});

// ============================================================================
// Generation Operations
// ============================================================================

/**
 * POST /generate
 * Generate images for multiple panels
 *
 * Body:
 * {
 *   panelIds: string[],
 *   options?: { sizePreset?, qualityPreset?, model?, seed?, uploadToCloud? },
 *   continueOnError?: boolean
 * }
 */
batchRoutes.post("/generate", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds)) {
    return c.json({ error: "panelIds array is required" }, 400);
  }

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
});

/**
 * POST /generate/variants
 * Generate multiple variants for each panel
 *
 * Body:
 * {
 *   panelIds: string[],
 *   variantCount?: number (default: 3),
 *   options?: {...},
 *   continueOnError?: boolean
 * }
 */
batchRoutes.post("/generate/variants", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds)) {
    return c.json({ error: "panelIds array is required" }, 400);
  }

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
});

// ============================================================================
// Render Operations
// ============================================================================

/**
 * POST /render/captions
 * Render captions onto generated images for multiple panels
 *
 * Body:
 * {
 *   panelIds: string[],
 *   outputDir: string,
 *   format?: "png" | "jpeg" | "webp",
 *   continueOnError?: boolean
 * }
 */
batchRoutes.post("/render/captions", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds) || !body.outputDir) {
    return c.json({ error: "panelIds array and outputDir are required" }, 400);
  }

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
});

// ============================================================================
// Selection Operations
// ============================================================================

/**
 * POST /select
 * Select outputs for multiple panels
 *
 * Body:
 * {
 *   selections: [{ panelId: string, outputId: string }]
 * }
 */
batchRoutes.post("/select", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.selections)) {
    return c.json({ error: "selections array is required" }, 400);
  }

  const result = await service.selectOutputs(body.selections);

  return c.json({
    ...result,
    summary: {
      requested: body.selections.length,
      selected: result.selected,
      failed: result.errors.length,
    },
  });
});

/**
 * POST /select/auto
 * Auto-select first or latest generated image for multiple panels
 *
 * Body:
 * {
 *   panelIds: string[],
 *   mode?: "first" | "latest" (default: "latest")
 * }
 */
batchRoutes.post("/select/auto", async (c) => {
  const service = getBatchService();
  const body = await c.req.json();

  if (!Array.isArray(body.panelIds)) {
    return c.json({ error: "panelIds array is required" }, 400);
  }

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
});

// ============================================================================
// Utility
// ============================================================================

/**
 * GET /storyboard/:storyboardId/panel-ids
 * Get all panel IDs from a storyboard in position order
 */
batchRoutes.get("/storyboard/:storyboardId/panel-ids", async (c) => {
  const service = getBatchService();
  const storyboardId = c.req.param("storyboardId");
  const panelIds = await service.getPanelIds(storyboardId);

  return c.json({
    storyboardId,
    panelIds,
    count: panelIds.length,
  });
});

export { batchRoutes };
