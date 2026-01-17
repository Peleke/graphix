/**
 * Generation Routes
 *
 * REST API endpoints for generated image management.
 */

import { Hono } from "hono";
import { getGeneratedImageService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  validateParam,
  uuidSchema,
} from "../validation/index.js";
import { z } from "zod";

// Local schemas for generation-specific operations
const panelIdParamSchema = z.object({
  panelId: uuidSchema,
});

const seedParamSchema = z.object({
  seed: z.coerce.number().int(),
});

const createGenerationSchema = z.object({
  panelId: uuidSchema,
  localPath: z.string().min(1),
  cloudUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  seed: z.number().int(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  model: z.string(),
  loras: z.array(z.object({
    name: z.string(),
    strength: z.number(),
    strengthClip: z.number().optional(),
  })).optional(),
  steps: z.number().int(),
  cfg: z.number(),
  sampler: z.string(),
  scheduler: z.string().optional(),
  width: z.number().int(),
  height: z.number().int(),
  variantStrategy: z.string().optional(),
  variantIndex: z.number().int().optional(),
  usedIPAdapter: z.boolean().optional(),
  ipAdapterImages: z.array(z.string()).optional(),
  usedControlNet: z.boolean().optional(),
  controlNetType: z.string().optional(),
  controlNetImage: z.string().optional(),
});

const setRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

const setCloudUrlSchema = z.object({
  cloudUrl: z.string().min(1),
});

const setThumbnailSchema = z.object({
  thumbnailPath: z.string().min(1),
});

const generationRoutes = new Hono();

// Get generation by ID
generationRoutes.get("/:id", validateId(), async (c) => {
  const service = getGeneratedImageService();
  const { id } = c.req.valid("param");

  const generation = await service.getById(id);

  if (!generation) {
    return errors.notFound(c, "Generation", id);
  }

  return c.json(generation);
});

// Get generations by panel
generationRoutes.get(
  "/panel/:panelId",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { panelId } = c.req.valid("param");

    const generations = await service.getByPanel(panelId);

    return c.json({ generations });
  }
);

// Get selected generation for panel
generationRoutes.get(
  "/panel/:panelId/selected",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { panelId } = c.req.valid("param");

    const generation = await service.getSelected(panelId);

    if (!generation) {
      return errors.notFound(c, "Selected generation for panel", panelId);
    }

    return c.json(generation);
  }
);

// Get favorite generations for panel
generationRoutes.get(
  "/panel/:panelId/favorites",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { panelId } = c.req.valid("param");

    const generations = await service.getFavorites(panelId);

    return c.json({ generations });
  }
);

// Find generations by seed
generationRoutes.get(
  "/seed/:seed",
  validateParam(seedParamSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { seed } = c.req.valid("param");

    const generations = await service.findBySeed(seed);

    return c.json({ generations });
  }
);

// Record new generation (usually called internally after ComfyUI generation)
generationRoutes.post(
  "/",
  validateBody(createGenerationSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const body = c.req.valid("json");

    const generation = await service.create({
      panelId: body.panelId,
      localPath: body.localPath,
      cloudUrl: body.cloudUrl,
      thumbnailPath: body.thumbnailPath,
      seed: body.seed,
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      model: body.model,
      loras: body.loras,
      steps: body.steps,
      cfg: body.cfg,
      sampler: body.sampler,
      scheduler: body.scheduler,
      width: body.width,
      height: body.height,
      variantStrategy: body.variantStrategy,
      variantIndex: body.variantIndex,
      usedIPAdapter: body.usedIPAdapter,
      ipAdapterImages: body.ipAdapterImages,
      usedControlNet: body.usedControlNet,
      controlNetType: body.controlNetType,
      controlNetImage: body.controlNetImage,
    });

    return c.json(generation, 201);
  }
);

// Toggle favorite
generationRoutes.post("/:id/favorite", validateId(), async (c) => {
  const service = getGeneratedImageService();
  const { id } = c.req.valid("param");

  const existing = await service.getById(id);
  if (!existing) {
    return errors.notFound(c, "Generation", id);
  }

  const generation = await service.toggleFavorite(id);

  return c.json(generation);
});

// Set rating
generationRoutes.post(
  "/:id/rating",
  validateId(),
  validateBody(setRatingSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { id } = c.req.valid("param");
    const { rating } = c.req.valid("json");

    const existing = await service.getById(id);
    if (!existing) {
      return errors.notFound(c, "Generation", id);
    }

    const generation = await service.setRating(id, rating);

    return c.json(generation);
  }
);

// Update cloud URL
generationRoutes.patch(
  "/:id/cloud-url",
  validateId(),
  validateBody(setCloudUrlSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { id } = c.req.valid("param");
    const { cloudUrl } = c.req.valid("json");

    const existing = await service.getById(id);
    if (!existing) {
      return errors.notFound(c, "Generation", id);
    }

    const generation = await service.setCloudUrl(id, cloudUrl);

    return c.json(generation);
  }
);

// Update thumbnail
generationRoutes.patch(
  "/:id/thumbnail",
  validateId(),
  validateBody(setThumbnailSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { id } = c.req.valid("param");
    const { thumbnailPath } = c.req.valid("json");

    const existing = await service.getById(id);
    if (!existing) {
      return errors.notFound(c, "Generation", id);
    }

    const generation = await service.setThumbnail(id, thumbnailPath);

    return c.json(generation);
  }
);

// Delete generation
generationRoutes.delete("/:id", validateId(), async (c) => {
  const service = getGeneratedImageService();
  const { id } = c.req.valid("param");

  const existing = await service.getById(id);
  if (!existing) {
    return errors.notFound(c, "Generation", id);
  }

  await service.delete(id);

  return c.body(null, 204);
});

// Delete all generations for panel
generationRoutes.delete(
  "/panel/:panelId",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getGeneratedImageService();
    const { panelId } = c.req.valid("param");

    const count = await service.deleteByPanel(panelId);

    return c.json({ deleted: count });
  }
);

export { generationRoutes };
