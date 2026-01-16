/**
 * Consistency REST Routes
 *
 * REST endpoints for visual consistency operations.
 */

import { Hono } from "hono";
import {
  getConsistencyService,
  type ChainOptions,
} from "../../../services/consistency.service.js";
import { getIPAdapter, type IPAdapterModel } from "../../../generation/ip-adapter.js";
import { getControlNetStack } from "../../../generation/controlnet-stack.js";
import type { QualityPresetId } from "../../../generation/config/types.js";

// ============================================================================
// Routes
// ============================================================================

export const consistencyRoutes = new Hono();
const consistency = getConsistencyService();
const ipAdapter = getIPAdapter();
const controlStack = getControlNetStack();

// ---------------------------------------------------------------------------
// Identity Management
// ---------------------------------------------------------------------------

/**
 * POST /consistency/identity/extract
 * Extract identity from reference images or panels
 */
consistencyRoutes.post("/identity/extract", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return c.json({ success: false, error: "name is required" }, 400);
    }
    if (!body.sources || !Array.isArray(body.sources) || body.sources.length === 0) {
      return c.json({ success: false, error: "sources array is required" }, 400);
    }

    const result = await consistency.extractIdentity({
      name: body.name,
      description: body.description,
      sources: body.sources,
      sourcesArePanelIds: body.sourcesArePanelIds ?? true,
      adapterModel: body.adapterModel as IPAdapterModel | undefined,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      identityId: result.identityId,
      message: `Identity "${body.name}" created successfully`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid request" },
      400
    );
  }
});

/**
 * GET /consistency/identities
 * List all stored identities
 */
consistencyRoutes.get("/identities", async (c) => {
  const identities = consistency.listIdentities();

  return c.json({
    count: identities.length,
    identities: identities.map((id) => ({
      id: id.id,
      name: id.name,
      description: id.description,
      adapterModel: id.embedding.adapterModel,
      referenceCount: id.referenceImages.length,
      usageCount: id.usageCount,
      createdAt: id.createdAt,
    })),
  });
});

/**
 * GET /consistency/identity/:id
 * Get identity details
 */
consistencyRoutes.get("/identity/:id", async (c) => {
  const identityId = c.req.param("id");
  const identity = consistency.getIdentity(identityId);

  if (!identity) {
    return c.json({ success: false, error: "Identity not found" }, 404);
  }

  return c.json({
    success: true,
    identity: {
      id: identity.id,
      name: identity.name,
      description: identity.description,
      adapterModel: identity.embedding.adapterModel,
      defaultStrength: identity.defaultStrength,
      referenceImages: identity.referenceImages,
      usageCount: identity.usageCount,
      createdAt: identity.createdAt,
      lastUsedAt: identity.lastUsedAt,
    },
  });
});

/**
 * DELETE /consistency/identity/:id
 * Delete a stored identity
 */
consistencyRoutes.delete("/identity/:id", async (c) => {
  const identityId = c.req.param("id");
  const deleted = consistency.deleteIdentity(identityId);

  if (!deleted) {
    return c.json({ success: false, error: "Identity not found" }, 404);
  }

  return c.json({ success: true, message: "Identity deleted" });
});

/**
 * POST /consistency/identity/apply
 * Apply identity to a panel
 */
consistencyRoutes.post("/identity/apply", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.panelId || typeof body.panelId !== "string") {
      return c.json({ success: false, error: "panelId is required" }, 400);
    }
    if (!body.identityId || typeof body.identityId !== "string") {
      return c.json({ success: false, error: "identityId is required" }, 400);
    }

    const result = await consistency.applyIdentity({
      panelId: body.panelId,
      identityId: body.identityId,
      strength: body.strength,
      prompt: body.prompt,
      qualityPreset: body.qualityPreset as QualityPresetId | undefined,
      seed: body.seed,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      panelId: result.panelId,
      generatedPath: result.generationResult?.localPath,
      signedUrl: result.generationResult?.signedUrl,
      seed: result.generationResult?.seed,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid request" },
      400
    );
  }
});

// ---------------------------------------------------------------------------
// Panel Chaining
// ---------------------------------------------------------------------------

/**
 * POST /consistency/chain
 * Chain from previous panel
 */
consistencyRoutes.post("/chain", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.panelId || typeof body.panelId !== "string") {
      return c.json({ success: false, error: "panelId is required" }, 400);
    }
    if (!body.previousPanelId || typeof body.previousPanelId !== "string") {
      return c.json({ success: false, error: "previousPanelId is required" }, 400);
    }

    const result = await consistency.chainFromPrevious({
      panelId: body.panelId,
      previousPanelId: body.previousPanelId,
      maintain: body.maintain ?? { identity: true },
      continuityStrength: body.continuityStrength,
      prompt: body.prompt,
      qualityPreset: body.qualityPreset as QualityPresetId | undefined,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      panelId: result.panelId,
      generatedPath: result.generationResult?.localPath,
      signedUrl: result.generationResult?.signedUrl,
      seed: result.generationResult?.seed,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid request" },
      400
    );
  }
});

/**
 * POST /consistency/chain/sequence
 * Chain an entire sequence of panels
 */
consistencyRoutes.post("/chain/sequence", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.panelIds || !Array.isArray(body.panelIds) || body.panelIds.length < 2) {
      return c.json(
        { success: false, error: "panelIds array with at least 2 panels is required" },
        400
      );
    }

    const result = await consistency.chainSequence(body.panelIds, {
      maintain: body.maintain ?? { identity: true },
      continuityStrength: body.continuityStrength,
      qualityPreset: body.qualityPreset as QualityPresetId | undefined,
    });

    return c.json({
      success: result.successCount === result.results.length,
      totalPanels: result.results.length,
      successCount: result.successCount,
      results: result.results.map((r) => ({
        panelId: r.panelId,
        success: r.success,
        generatedPath: r.generationResult?.localPath,
        error: r.error,
      })),
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid request" },
      400
    );
  }
});

// ---------------------------------------------------------------------------
// Reference Sheets
// ---------------------------------------------------------------------------

/**
 * POST /consistency/reference-sheet
 * Generate reference sheet for an identity
 */
consistencyRoutes.post("/reference-sheet", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.identityId || typeof body.identityId !== "string") {
      return c.json({ success: false, error: "identityId is required" }, 400);
    }
    if (!body.outputDir || typeof body.outputDir !== "string") {
      return c.json({ success: false, error: "outputDir is required" }, 400);
    }

    const result = await consistency.generateReferenceSheet({
      identityId: body.identityId,
      poseCount: body.poseCount,
      poses: body.poses,
      includeExpressions: body.includeExpressions,
      outputDir: body.outputDir,
      qualityPreset: (body.qualityPreset as QualityPresetId) ?? "high",
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      imageCount: result.images.length,
      images: result.images,
    });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid request" },
      400
    );
  }
});

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

/**
 * GET /consistency/adapter-models
 * List available IP-Adapter models with settings
 */
consistencyRoutes.get("/adapter-models", async (c) => {
  const models = ipAdapter.listAdapterModels();
  const modelInfo = models.map((model) => ({
    model,
    ...ipAdapter.getRecommendedSettings(model),
  }));

  return c.json({
    count: models.length,
    models: modelInfo,
  });
});

/**
 * GET /consistency/control-presets
 * List available ControlNet stack presets
 */
consistencyRoutes.get("/control-presets", async (c) => {
  const presets = controlStack.listPresets();

  return c.json({
    count: presets.length,
    presets: presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      controls: p.controls,
    })),
  });
});

/**
 * GET /consistency/control-types
 * List supported ControlNet control types
 */
consistencyRoutes.get("/control-types", async (c) => {
  const types = controlStack.listControlTypes();
  const typeInfo = types.map((type) => ({
    type,
    ...controlStack.getRecommendedStrength(type),
  }));

  return c.json({
    count: types.length,
    types: typeInfo,
  });
});
