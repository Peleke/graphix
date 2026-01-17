/**
 * Consistency REST Routes
 *
 * REST endpoints for visual consistency operations.
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  getConsistencyService,
  type ChainOptions,
} from "@graphix/core";
import { getIPAdapter, type IPAdapterModel } from "@graphix/core";
import { getControlNetStack } from "@graphix/core";
import type { QualityPresetId } from "@graphix/core";
import { errors } from "../errors/index.js";
import { validateBody, validateId, validateParam } from "../validation/index.js";
import { uuidSchema, nonEmptyString } from "../validation/index.js";

// ============================================================================
// Zod Schemas
// ============================================================================

/** Schema for extracting identity */
const extractIdentitySchema = z.object({
  name: nonEmptyString,
  description: z.string().optional(),
  sources: z.array(z.string()).min(1, "At least one source is required"),
  sourcesArePanelIds: z.boolean().optional(),
  adapterModel: z.string().optional(),
});

/** Schema for applying identity to a panel */
const applyIdentitySchema = z.object({
  panelId: nonEmptyString,
  identityId: nonEmptyString,
  strength: z.number().min(0).max(2).optional(),
  prompt: z.string().optional(),
  qualityPreset: z.string().optional(),
  seed: z.number().int().optional(),
});

/** Schema for chaining from previous panel */
const chainSchema = z.object({
  panelId: nonEmptyString,
  previousPanelId: nonEmptyString,
  maintain: z.object({
    identity: z.boolean().optional(),
  }).optional(),
  continuityStrength: z.number().min(0).max(1).optional(),
  prompt: z.string().optional(),
  qualityPreset: z.string().optional(),
});

/** Schema for chaining a sequence of panels */
const chainSequenceSchema = z.object({
  panelIds: z.array(z.string()).min(2, "At least 2 panel IDs are required"),
  maintain: z.object({
    identity: z.boolean().optional(),
  }).optional(),
  continuityStrength: z.number().min(0).max(1).optional(),
  qualityPreset: z.string().optional(),
});

/** Schema for generating a reference sheet */
const referenceSheetSchema = z.object({
  identityId: nonEmptyString,
  outputDir: nonEmptyString,
  poseCount: z.number().int().positive().optional(),
  poses: z.array(z.string()).optional(),
  includeExpressions: z.boolean().optional(),
  qualityPreset: z.string().optional(),
});

/** Schema for identity ID param */
const identityIdParamSchema = z.object({
  id: nonEmptyString,
});

// ============================================================================
// Routes
// ============================================================================

export const consistencyRoutes = new Hono();

// ---------------------------------------------------------------------------
// Identity Management
// ---------------------------------------------------------------------------

/**
 * POST /consistency/identity/extract
 * Extract identity from reference images or panels
 */
consistencyRoutes.post(
  "/identity/extract",
  validateBody(extractIdentitySchema),
  async (c) => {
    const consistency = getConsistencyService();
    const body = c.req.valid("json");

    const result = await consistency.extractIdentity({
      name: body.name,
      description: body.description,
      sources: body.sources,
      sourcesArePanelIds: body.sourcesArePanelIds ?? true,
      adapterModel: body.adapterModel as IPAdapterModel | undefined,
    });

    if (!result.success) {
      return errors.badRequest(c, result.error ?? "Failed to extract identity");
    }

    return c.json({
      success: true,
      identityId: result.identityId,
      message: `Identity "${body.name}" created successfully`,
    });
  }
);

/**
 * GET /consistency/identities
 * List all stored identities
 */
consistencyRoutes.get("/identities", async (c) => {
  const consistency = getConsistencyService();
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
consistencyRoutes.get(
  "/identity/:id",
  validateParam(identityIdParamSchema),
  async (c) => {
    const consistency = getConsistencyService();
    const { id: identityId } = c.req.valid("param");
    const identity = consistency.getIdentity(identityId);

    if (!identity) {
      return errors.notFound(c, "Identity", identityId);
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
  }
);

/**
 * DELETE /consistency/identity/:id
 * Delete a stored identity
 */
consistencyRoutes.delete(
  "/identity/:id",
  validateParam(identityIdParamSchema),
  async (c) => {
    const consistency = getConsistencyService();
    const { id: identityId } = c.req.valid("param");
    const deleted = consistency.deleteIdentity(identityId);

    if (!deleted) {
      return errors.notFound(c, "Identity", identityId);
    }

    return c.json({ success: true, message: "Identity deleted" });
  }
);

/**
 * POST /consistency/identity/apply
 * Apply identity to a panel
 */
consistencyRoutes.post(
  "/identity/apply",
  validateBody(applyIdentitySchema),
  async (c) => {
    const consistency = getConsistencyService();
    const body = c.req.valid("json");

    const result = await consistency.applyIdentity({
      panelId: body.panelId,
      identityId: body.identityId,
      strength: body.strength,
      prompt: body.prompt,
      qualityPreset: body.qualityPreset as QualityPresetId | undefined,
      seed: body.seed,
    });

    if (!result.success) {
      return errors.badRequest(c, result.error ?? "Failed to apply identity");
    }

    return c.json({
      success: true,
      panelId: result.panelId,
      generatedPath: result.generationResult?.localPath,
      signedUrl: result.generationResult?.signedUrl,
      seed: result.generationResult?.seed,
    });
  }
);

// ---------------------------------------------------------------------------
// Panel Chaining
// ---------------------------------------------------------------------------

/**
 * POST /consistency/chain
 * Chain from previous panel
 */
consistencyRoutes.post(
  "/chain",
  validateBody(chainSchema),
  async (c) => {
    const consistency = getConsistencyService();
    const body = c.req.valid("json");

    const result = await consistency.chainFromPrevious({
      panelId: body.panelId,
      previousPanelId: body.previousPanelId,
      maintain: body.maintain ?? { identity: true },
      continuityStrength: body.continuityStrength,
      prompt: body.prompt,
      qualityPreset: body.qualityPreset as QualityPresetId | undefined,
    });

    if (!result.success) {
      return errors.badRequest(c, result.error ?? "Failed to chain panels");
    }

    return c.json({
      success: true,
      panelId: result.panelId,
      generatedPath: result.generationResult?.localPath,
      signedUrl: result.generationResult?.signedUrl,
      seed: result.generationResult?.seed,
    });
  }
);

/**
 * POST /consistency/chain/sequence
 * Chain an entire sequence of panels
 */
consistencyRoutes.post(
  "/chain/sequence",
  validateBody(chainSequenceSchema),
  async (c) => {
    const consistency = getConsistencyService();
    const body = c.req.valid("json");

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
  }
);

// ---------------------------------------------------------------------------
// Reference Sheets
// ---------------------------------------------------------------------------

/**
 * POST /consistency/reference-sheet
 * Generate reference sheet for an identity
 */
consistencyRoutes.post(
  "/reference-sheet",
  validateBody(referenceSheetSchema),
  async (c) => {
    const consistency = getConsistencyService();
    const body = c.req.valid("json");

    const result = await consistency.generateReferenceSheet({
      identityId: body.identityId,
      poseCount: body.poseCount,
      poses: body.poses,
      includeExpressions: body.includeExpressions,
      outputDir: body.outputDir,
      qualityPreset: (body.qualityPreset as QualityPresetId) ?? "high",
    });

    if (!result.success) {
      return errors.badRequest(c, result.error ?? "Failed to generate reference sheet");
    }

    return c.json({
      success: true,
      imageCount: result.images.length,
      images: result.images,
    });
  }
);

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

/**
 * GET /consistency/adapter-models
 * List available IP-Adapter models with settings
 */
consistencyRoutes.get("/adapter-models", async (c) => {
  const ipAdapter = getIPAdapter();
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
  const controlStack = getControlNetStack();
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
  const controlStack = getControlNetStack();
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
