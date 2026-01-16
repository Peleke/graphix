/**
 * Panel Routes
 *
 * REST API endpoints for panel management.
 */

import { Hono } from "hono";
import { getPanelService, getGeneratedImageService } from "@graphix/core";
import { getPanelGenerator } from "@graphix/core";
import {
  getConfigEngine,
  listSizePresets,
  listQualityPresets,
  type QualityPresetId,
  type SlotContext,
} from "@graphix/core";

const panelRoutes = new Hono();
const service = getPanelService();
const imageService = getGeneratedImageService();
const generator = getPanelGenerator();

// Get panel by ID
panelRoutes.get("/:id", async (c) => {
  const panel = await service.getById(c.req.param("id"));

  if (!panel) {
    return c.json({ error: "Panel not found" }, 404);
  }

  return c.json(panel);
});

// Get panel with generations
panelRoutes.get("/:id/full", async (c) => {
  const panel = await service.getById(c.req.param("id"));

  if (!panel) {
    return c.json({ error: "Panel not found" }, 404);
  }

  const generations = await service.getGenerations(c.req.param("id"));

  return c.json({ panel, generations });
});

// Update panel description and direction
panelRoutes.post("/:id/describe", async (c) => {
  const body = await c.req.json();

  const panel = await service.describe(c.req.param("id"), {
    description: body.description,
    direction: body.direction,
  });

  return c.json(panel);
});

// Update panel (general)
panelRoutes.put("/:id", async (c) => {
  const body = await c.req.json();

  const panel = await service.describe(c.req.param("id"), {
    description: body.description,
    direction: body.direction,
  });

  return c.json(panel);
});

// Add character to panel
panelRoutes.post("/:id/characters", async (c) => {
  const body = await c.req.json();

  const panel = await service.addCharacter(c.req.param("id"), body.characterId);

  return c.json(panel);
});

// Set characters (replace all)
panelRoutes.put("/:id/characters", async (c) => {
  const body = await c.req.json();

  const panel = await service.setCharacters(c.req.param("id"), body.characterIds);

  return c.json(panel);
});

// Remove character from panel
panelRoutes.delete("/:id/characters/:characterId", async (c) => {
  const panel = await service.removeCharacter(c.req.param("id"), c.req.param("characterId"));

  return c.json(panel);
});

// Select output
panelRoutes.post("/:id/select", async (c) => {
  const body = await c.req.json();

  const panel = await service.selectOutput(c.req.param("id"), body.outputId);

  return c.json(panel);
});

// Clear selection
panelRoutes.delete("/:id/select", async (c) => {
  const panel = await service.clearSelection(c.req.param("id"));

  return c.json(panel);
});

// Get generations for panel
panelRoutes.get("/:id/generations", async (c) => {
  const generations = await service.getGenerations(c.req.param("id"));

  return c.json({ generations });
});

// Reorder panel
panelRoutes.post("/:id/reorder", async (c) => {
  const body = await c.req.json();

  const panel = await service.reorder(c.req.param("id"), body.position);

  return c.json(panel);
});

// Generate image for panel
panelRoutes.post("/:id/generate", async (c) => {
  const panelId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  // Build slot context if composition params provided
  let forComposition: SlotContext | undefined;
  if (body.forComposition) {
    forComposition = {
      templateId: body.forComposition.templateId,
      slotId: body.forComposition.slotId,
      pageSizePreset: body.forComposition.pageSizePreset,
    };
  }

  const result = await generator.generate(panelId, {
    model: body.model,
    modelFamily: body.modelFamily,
    width: body.width,
    height: body.height,
    steps: body.steps,
    cfg: body.cfg,
    seed: body.seed,
    sampler: body.sampler,
    scheduler: body.scheduler,
    // Config engine presets
    sizePreset: body.sizePreset,
    qualityPreset: body.qualityPreset as QualityPresetId | undefined,
    forComposition,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({
    success: true,
    generatedImage: result.generatedImage,
    seed: result.generationResult?.seed,
    localPath: result.generationResult?.localPath,
  }, 201);
});

// Generate multiple variants for panel
panelRoutes.post("/:id/generate/variants", async (c) => {
  const panelId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  // Build slot context if composition params provided
  let forComposition: SlotContext | undefined;
  if (body.forComposition) {
    forComposition = {
      templateId: body.forComposition.templateId,
      slotId: body.forComposition.slotId,
      pageSizePreset: body.forComposition.pageSizePreset,
    };
  }

  const result = await generator.generateVariants(panelId, {
    count: body.count ?? 4,
    baseSeed: body.baseSeed,
    varyCfg: body.varyCfg,
    cfgRange: body.cfgRange,
    model: body.model,
    modelFamily: body.modelFamily,
    width: body.width,
    height: body.height,
    // Config engine presets
    sizePreset: body.sizePreset,
    qualityPreset: body.qualityPreset as QualityPresetId | undefined,
    forComposition,
  });

  return c.json({
    success: result.success,
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    generatedImages: result.results
      .filter((r) => r.success)
      .map((r) => ({
        id: r.generatedImage?.id,
        seed: r.generationResult?.seed,
        localPath: r.generationResult?.localPath,
      })),
  }, result.success ? 201 : 207);
});

// Delete panel
panelRoutes.delete("/:id", async (c) => {
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

// ============================================================================
// Config Presets
// ============================================================================

// List available size presets
panelRoutes.get("/config/sizes", async (c) => {
  const presets = listSizePresets();
  return c.json({ presets });
});

// List available quality presets
panelRoutes.get("/config/quality", async (c) => {
  const presets = listQualityPresets();
  return c.json({ presets });
});

// Get recommended size for a slot
panelRoutes.post("/config/recommend-size", async (c) => {
  const body = await c.req.json();
  const { templateId, slotId, pageSizePreset, modelFamily } = body;

  if (!templateId || !slotId) {
    return c.json({ error: "templateId and slotId are required" }, 400);
  }

  const engine = getConfigEngine();
  const dimensions = engine.getDimensionsForSlot(templateId, slotId, {
    pageSizePreset,
    modelFamily,
  });

  return c.json({
    templateId,
    slotId,
    pageSizePreset: pageSizePreset ?? "comic_standard",
    modelFamily: modelFamily ?? "pony",
    recommended: dimensions,
  });
});

// Get sizes for all slots in a template
panelRoutes.post("/config/template-sizes", async (c) => {
  const body = await c.req.json();
  const { templateId, pageSizePreset, modelFamily } = body;

  if (!templateId) {
    return c.json({ error: "templateId is required" }, 400);
  }

  const engine = getConfigEngine();
  const sizeMap = engine.getTemplateSizeMap(templateId, {
    pageSizePreset,
    modelFamily,
  });

  // Convert Map to object for JSON serialization
  const slots: Record<string, { width: number; height: number; aspectRatio: number; presetId?: string }> = {};
  for (const [slotId, dimensions] of sizeMap) {
    slots[slotId] = dimensions;
  }

  return c.json({
    templateId,
    pageSizePreset: pageSizePreset ?? "comic_standard",
    modelFamily: modelFamily ?? "pony",
    slots,
  });
});

export { panelRoutes };
