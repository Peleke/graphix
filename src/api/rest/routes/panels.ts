/**
 * Panel Routes
 *
 * REST API endpoints for panel management.
 */

import { Hono } from "hono";
import { getPanelService, getGeneratedImageService } from "../../../services/index.js";

const panelRoutes = new Hono();
const service = getPanelService();
const imageService = getGeneratedImageService();

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

// Delete panel
panelRoutes.delete("/:id", async (c) => {
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

export { panelRoutes };
