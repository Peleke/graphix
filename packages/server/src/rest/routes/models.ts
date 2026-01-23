/**
 * Models REST Routes
 *
 * REST endpoints for model/checkpoint management.
 */

import { Hono } from "hono";
import { getComfyUIClient, getModelResolver, CHECKPOINT_CATALOG } from "@graphix/core";

// ============================================================================
// Types
// ============================================================================

export interface ModelInfo {
  filename: string;
  family: string | null;
  compatibleControlTypes: string[];
}

// ============================================================================
// Routes
// ============================================================================

export const modelsRoutes = new Hono();

/**
 * GET /models
 * List available checkpoint models with family detection
 */
modelsRoutes.get("/", async (c) => {
  const comfyui = getComfyUIClient();
  const resolver = getModelResolver();

  try {
    // Get raw model list from ComfyUI
    let modelFilenames = await comfyui.listModels();

    // Fallback: If live endpoint returns empty, use catalog as fallback
    let usedFallback = false;
    if (modelFilenames.length === 0) {
      modelFilenames = Object.keys(CHECKPOINT_CATALOG);
      usedFallback = true;
      console.log(`[models] Using catalog fallback (${modelFilenames.length} models)`);
    }

    // Enrich with family and compatibility info
    const models: ModelInfo[] = modelFilenames.map((filename) => {
      const family = resolver.getFamily(filename);
      const compatibleControlTypes = family
        ? resolver.listAvailableControlTypes(filename)
        : [];

      return {
        filename,
        family,
        compatibleControlTypes,
      };
    });

    // Group by family for easier frontend consumption
    const byFamily: Record<string, ModelInfo[]> = {};
    for (const model of models) {
      const familyKey = model.family ?? "unknown";
      if (!byFamily[familyKey]) {
        byFamily[familyKey] = [];
      }
      byFamily[familyKey].push(model);
    }

    return c.json({
      count: models.length,
      models,
      byFamily,
      ...(usedFallback && { note: "Using catalog fallback - ComfyUI models endpoint unavailable" }),
    });
  } catch (error) {
    // On error, also try fallback to catalog
    const modelFilenames = Object.keys(CHECKPOINT_CATALOG);
    const models: ModelInfo[] = modelFilenames.map((filename) => {
      const family = resolver.getFamily(filename);
      const compatibleControlTypes = family
        ? resolver.listAvailableControlTypes(filename)
        : [];
      return { filename, family, compatibleControlTypes };
    });

    const byFamily: Record<string, ModelInfo[]> = {};
    for (const model of models) {
      const familyKey = model.family ?? "unknown";
      if (!byFamily[familyKey]) byFamily[familyKey] = [];
      byFamily[familyKey].push(model);
    }

    const message = error instanceof Error ? error.message : "Failed to list models";
    return c.json({
      count: models.length,
      models,
      byFamily,
      note: `Using catalog fallback - ${message}`,
    });
  }
});

/**
 * GET /models/:filename/compatibility
 * Get detailed compatibility info for a specific model
 */
modelsRoutes.get("/:filename", async (c) => {
  const { filename } = c.req.param();
  const resolver = getModelResolver();

  const family = resolver.getFamily(filename);
  if (!family) {
    return c.json(
      {
        error: `Unknown model: ${filename}. Model family could not be detected.`,
      },
      404
    );
  }

  const compatibleControlTypes = resolver.listAvailableControlTypes(filename);
  const fullCompat = resolver.getFullCompatibility(filename);

  return c.json({
    filename,
    family,
    compatibleControlTypes,
    controlnets: fullCompat?.controlnets ?? [],
    loras: fullCompat?.loras ?? [],
    warnings: fullCompat?.warnings ?? [],
  });
});

/**
 * GET /models/:filename/control-types
 * Get available control types for a model
 */
modelsRoutes.get("/:filename/control-types", async (c) => {
  const { filename } = c.req.param();
  const resolver = getModelResolver();

  const family = resolver.getFamily(filename);
  if (!family) {
    return c.json(
      {
        error: `Unknown model: ${filename}`,
        types: [],
      },
      404
    );
  }

  const controlTypes = resolver.listAvailableControlTypes(filename);

  return c.json({
    filename,
    family,
    count: controlTypes.length,
    types: controlTypes,
  });
});
