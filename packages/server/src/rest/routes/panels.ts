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
  type ModelFamily,
} from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  validateParam,
  updatePanelSchema,
  uuidSchema,
} from "../validation/index.js";
import { z } from "zod";

// Local schemas for panel-specific operations
const addCharacterSchema = z.object({
  characterId: uuidSchema,
});

const setCharactersSchema = z.object({
  characterIds: z.array(uuidSchema),
});

const selectOutputSchema = z.object({
  outputId: uuidSchema,
});

const reorderSchema = z.object({
  position: z.number().int().nonnegative(),
});

const recommendSizeSchema = z.object({
  templateId: z.string().min(1),
  slotId: z.string().min(1),
  pageSizePreset: z.string().optional(),
  modelFamily: z.string().optional(),
});

const templateSizesSchema = z.object({
  templateId: z.string().min(1),
  pageSizePreset: z.string().optional(),
  modelFamily: z.string().optional(),
});

// Schema for character ID param
const characterIdParamSchema = z.object({
  id: uuidSchema,
  characterId: uuidSchema,
});

const panelRoutes = new Hono();

// Get panel by ID
panelRoutes.get("/:id", validateId(), async (c) => {
  const service = getPanelService();
  const { id } = c.req.valid("param");
  const panel = await service.getById(id);

  if (!panel) {
    return errors.notFound(c, "Panel", id);
  }

  return c.json(panel);
});

// Get panel with generations
panelRoutes.get("/:id/full", validateId(), async (c) => {
  const service = getPanelService();
  const { id } = c.req.valid("param");
  const panel = await service.getById(id);

  if (!panel) {
    return errors.notFound(c, "Panel", id);
  }

  const generations = await service.getGenerations(id);

  return c.json({ panel, generations });
});

// Update panel description and direction
panelRoutes.post(
  "/:id/describe",
  validateId(),
  validateBody(updatePanelSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.describe(id, {
      description: body.description,
      direction: body.direction,
    });

    return c.json(panel);
  }
);

// Update panel (general)
panelRoutes.put(
  "/:id",
  validateId(),
  validateBody(updatePanelSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.describe(id, {
      description: body.description,
      direction: body.direction,
    });

    return c.json(panel);
  }
);

// Add character to panel
panelRoutes.post(
  "/:id/characters",
  validateId(),
  validateBody(addCharacterSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.addCharacter(id, body.characterId);

    return c.json(panel);
  }
);

// Set characters (replace all)
panelRoutes.put(
  "/:id/characters",
  validateId(),
  validateBody(setCharactersSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.setCharacters(id, body.characterIds);

    return c.json(panel);
  }
);

// Remove character from panel
panelRoutes.delete(
  "/:id/characters/:characterId",
  validateParam(characterIdParamSchema),
  async (c) => {
    const service = getPanelService();
    const { id, characterId } = c.req.valid("param");
    const panel = await service.removeCharacter(id, characterId);

    return c.json(panel);
  }
);

// Select output
panelRoutes.post(
  "/:id/select",
  validateId(),
  validateBody(selectOutputSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.selectOutput(id, body.outputId);

    return c.json(panel);
  }
);

// Clear selection
panelRoutes.delete("/:id/select", validateId(), async (c) => {
  const service = getPanelService();
  const { id } = c.req.valid("param");
  const panel = await service.clearSelection(id);

  return c.json(panel);
});

// Get generations for panel
panelRoutes.get("/:id/generations", validateId(), async (c) => {
  const service = getPanelService();
  const { id } = c.req.valid("param");
  const generations = await service.getGenerations(id);

  return c.json({ generations });
});

// Reorder panel
panelRoutes.post(
  "/:id/reorder",
  validateId(),
  validateBody(reorderSchema),
  async (c) => {
    const service = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await service.reorder(id, body.position);

    return c.json(panel);
  }
);

// Generate image for panel
panelRoutes.post("/:id/generate", validateId(), async (c) => {
  const generator = getPanelGenerator();
  const { id: panelId } = c.req.valid("param");
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
    return errors.internal(c, result.error || "Generation failed");
  }

  return c.json({
    success: true,
    generatedImage: result.generatedImage,
    seed: result.generationResult?.seed,
    localPath: result.generationResult?.localPath,
  }, 201);
});

// Generate multiple variants for panel
panelRoutes.post("/:id/generate/variants", validateId(), async (c) => {
  const generator = getPanelGenerator();
  const { id: panelId } = c.req.valid("param");
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
panelRoutes.delete("/:id", validateId(), async (c) => {
  const service = getPanelService();
  const { id } = c.req.valid("param");
  await service.delete(id);

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
panelRoutes.post(
  "/config/recommend-size",
  validateBody(recommendSizeSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { templateId, slotId, pageSizePreset, modelFamily } = body;

    const engine = getConfigEngine();
    const dimensions = engine.getDimensionsForSlot(templateId, slotId, {
      pageSizePreset,
      modelFamily: modelFamily as ModelFamily | undefined,
    });

    return c.json({
      templateId,
      slotId,
      pageSizePreset: pageSizePreset ?? "comic_standard",
      modelFamily: modelFamily ?? "pony",
      recommended: dimensions,
    });
  }
);

// Get sizes for all slots in a template
panelRoutes.post(
  "/config/template-sizes",
  validateBody(templateSizesSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { templateId, pageSizePreset, modelFamily } = body;

    const engine = getConfigEngine();
    const sizeMap = engine.getTemplateSizeMap(templateId, {
      pageSizePreset,
      modelFamily: modelFamily as ModelFamily | undefined,
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
  }
);

export { panelRoutes };
