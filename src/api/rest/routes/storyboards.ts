/**
 * Storyboard Routes
 *
 * REST API endpoints for storyboard management.
 */

import { Hono } from "hono";
import { getStoryboardService, getPanelService } from "../../../services/index.js";

const storyboardRoutes = new Hono();
const service = getStoryboardService();
const panelService = getPanelService();

// Get storyboard by ID
storyboardRoutes.get("/:id", async (c) => {
  const storyboard = await service.getById(c.req.param("id"));

  if (!storyboard) {
    return c.json({ error: "Storyboard not found" }, 404);
  }

  return c.json(storyboard);
});

// Get storyboard with panels
storyboardRoutes.get("/:id/full", async (c) => {
  const result = await service.getWithPanels(c.req.param("id"));

  if (!result) {
    return c.json({ error: "Storyboard not found" }, 404);
  }

  return c.json(result);
});

// List storyboards by project
storyboardRoutes.get("/project/:projectId", async (c) => {
  const storyboards = await service.getByProject(c.req.param("projectId"));

  return c.json({ storyboards });
});

// Create storyboard
storyboardRoutes.post("/", async (c) => {
  const body = await c.req.json();

  const storyboard = await service.create({
    projectId: body.projectId,
    name: body.name,
    description: body.description,
    panelCount: body.panelCount,
  });

  return c.json(storyboard, 201);
});

// Update storyboard
storyboardRoutes.put("/:id", async (c) => {
  const body = await c.req.json();

  const storyboard = await service.update(c.req.param("id"), {
    name: body.name,
    description: body.description,
  });

  return c.json(storyboard);
});

// Partial update storyboard
storyboardRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();

  const storyboard = await service.update(c.req.param("id"), body);

  return c.json(storyboard);
});

// Duplicate storyboard
storyboardRoutes.post("/:id/duplicate", async (c) => {
  const body = await c.req.json();

  const storyboard = await service.duplicate(c.req.param("id"), body.name);

  return c.json(storyboard, 201);
});

// Get panels for storyboard
storyboardRoutes.get("/:id/panels", async (c) => {
  const panels = await panelService.getByStoryboard(c.req.param("id"));

  return c.json({ panels });
});

// Create panel in storyboard
storyboardRoutes.post("/:id/panels", async (c) => {
  const body = await c.req.json();

  const panel = await panelService.create({
    storyboardId: c.req.param("id"),
    position: body.position,
    description: body.description,
    direction: body.direction,
    characterIds: body.characterIds,
  });

  return c.json(panel, 201);
});

// Delete storyboard
storyboardRoutes.delete("/:id", async (c) => {
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

export { storyboardRoutes };
