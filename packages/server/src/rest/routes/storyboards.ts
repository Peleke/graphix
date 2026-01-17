/**
 * Storyboard Routes
 *
 * REST API endpoints for storyboard management.
 */

import { Hono } from "hono";
import { getStoryboardService, getPanelService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  createStoryboardSchema,
  updateStoryboardSchema,
  createPanelSchema,
} from "../validation/index.js";
import { z } from "zod";

// Schema for duplicate request (name only)
const duplicateStoryboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const storyboardRoutes = new Hono();

// Get storyboard by ID
storyboardRoutes.get("/:id", validateId(), async (c) => {
  const service = getStoryboardService();
  const { id } = c.req.valid("param");
  const storyboard = await service.getById(id);

  if (!storyboard) {
    return errors.notFound(c, "Storyboard", id);
  }

  return c.json(storyboard);
});

// Get storyboard with panels
storyboardRoutes.get("/:id/full", validateId(), async (c) => {
  const service = getStoryboardService();
  const { id } = c.req.valid("param");
  const result = await service.getWithPanels(id);

  if (!result) {
    return errors.notFound(c, "Storyboard", id);
  }

  return c.json(result);
});

// List storyboards by project
storyboardRoutes.get("/project/:projectId", async (c) => {
  const service = getStoryboardService();
  const storyboards = await service.getByProject(c.req.param("projectId"));

  return c.json({ storyboards });
});

// Create storyboard
storyboardRoutes.post("/", validateBody(createStoryboardSchema), async (c) => {
  const service = getStoryboardService();
  const body = c.req.valid("json");

  const storyboard = await service.create({
    projectId: body.projectId,
    name: body.name,
    description: body.description,
  });

  return c.json(storyboard, 201);
});

// Update storyboard
storyboardRoutes.put(
  "/:id",
  validateId(),
  validateBody(updateStoryboardSchema),
  async (c) => {
    const service = getStoryboardService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const storyboard = await service.update(id, {
      name: body.name,
      description: body.description,
    });

    return c.json(storyboard);
  }
);

// Partial update storyboard
storyboardRoutes.patch(
  "/:id",
  validateId(),
  validateBody(updateStoryboardSchema),
  async (c) => {
    const service = getStoryboardService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const storyboard = await service.update(id, body);

    return c.json(storyboard);
  }
);

// Duplicate storyboard
storyboardRoutes.post(
  "/:id/duplicate",
  validateId(),
  validateBody(duplicateStoryboardSchema),
  async (c) => {
    const service = getStoryboardService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const storyboard = await service.duplicate(id, body.name);

    return c.json(storyboard, 201);
  }
);

// Get panels for storyboard
storyboardRoutes.get("/:id/panels", validateId(), async (c) => {
  const panelService = getPanelService();
  const { id } = c.req.valid("param");
  const panels = await panelService.getByStoryboard(id);

  return c.json({ panels });
});

// Create panel in storyboard
storyboardRoutes.post(
  "/:id/panels",
  validateId(),
  validateBody(createPanelSchema.omit({ storyboardId: true })),
  async (c) => {
    const panelService = getPanelService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const panel = await panelService.create({
      storyboardId: id,
      position: body.position,
      description: body.description,
      direction: body.direction,
      characterIds: body.characterIds,
    });

    return c.json(panel, 201);
  }
);

// Delete storyboard
storyboardRoutes.delete("/:id", validateId(), async (c) => {
  const service = getStoryboardService();
  const { id } = c.req.valid("param");
  await service.delete(id);

  return c.body(null, 204);
});

export { storyboardRoutes };
