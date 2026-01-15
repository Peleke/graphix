/**
 * Generation Routes
 *
 * REST API endpoints for generated image management.
 */

import { Hono } from "hono";
import { getGeneratedImageService } from "../../../services/index.js";

const generationRoutes = new Hono();
const service = getGeneratedImageService();

// Get generation by ID
generationRoutes.get("/:id", async (c) => {
  const generation = await service.getById(c.req.param("id"));

  if (!generation) {
    return c.json({ error: "Generation not found" }, 404);
  }

  return c.json(generation);
});

// Get generations by panel
generationRoutes.get("/panel/:panelId", async (c) => {
  const generations = await service.getByPanel(c.req.param("panelId"));

  return c.json({ generations });
});

// Get selected generation for panel
generationRoutes.get("/panel/:panelId/selected", async (c) => {
  const generation = await service.getSelected(c.req.param("panelId"));

  if (!generation) {
    return c.json({ error: "No selected generation" }, 404);
  }

  return c.json(generation);
});

// Get favorite generations for panel
generationRoutes.get("/panel/:panelId/favorites", async (c) => {
  const generations = await service.getFavorites(c.req.param("panelId"));

  return c.json({ generations });
});

// Find generations by seed
generationRoutes.get("/seed/:seed", async (c) => {
  const seed = parseInt(c.req.param("seed"));
  const generations = await service.findBySeed(seed);

  return c.json({ generations });
});

// Record new generation (usually called internally after ComfyUI generation)
generationRoutes.post("/", async (c) => {
  const body = await c.req.json();

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
});

// Toggle favorite
generationRoutes.post("/:id/favorite", async (c) => {
  const generation = await service.toggleFavorite(c.req.param("id"));

  return c.json(generation);
});

// Set rating
generationRoutes.post("/:id/rating", async (c) => {
  const body = await c.req.json();

  const generation = await service.setRating(c.req.param("id"), body.rating);

  return c.json(generation);
});

// Update cloud URL
generationRoutes.patch("/:id/cloud-url", async (c) => {
  const body = await c.req.json();

  const generation = await service.setCloudUrl(c.req.param("id"), body.cloudUrl);

  return c.json(generation);
});

// Update thumbnail
generationRoutes.patch("/:id/thumbnail", async (c) => {
  const body = await c.req.json();

  const generation = await service.setThumbnail(c.req.param("id"), body.thumbnailPath);

  return c.json(generation);
});

// Delete generation
generationRoutes.delete("/:id", async (c) => {
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

// Delete all generations for panel
generationRoutes.delete("/panel/:panelId", async (c) => {
  const count = await service.deleteByPanel(c.req.param("panelId"));

  return c.json({ deleted: count });
});

export { generationRoutes };
