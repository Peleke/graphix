/**
 * Character Routes
 *
 * REST API endpoints for character management.
 */

import { Hono } from "hono";
import { getCharacterService } from "@graphix/core";

const characterRoutes = new Hono();

// Get character by ID
characterRoutes.get("/:id", async (c) => {
  const service = getCharacterService();
  const character = await service.getById(c.req.param("id"));

  if (!character) {
    return c.json({ error: "Character not found" }, 404);
  }

  return c.json(character);
});

// List characters by project
characterRoutes.get("/project/:projectId", async (c) => {
  const service = getCharacterService();
  const characters = await service.getByProject(c.req.param("projectId"));

  return c.json({ characters });
});

// Create character
characterRoutes.post("/", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.create({
    projectId: body.projectId,
    name: body.name,
    profile: body.profile,
    promptFragments: body.promptFragments,
    referenceImages: body.referenceImages,
  });

  return c.json(character, 201);
});

// Update character
characterRoutes.put("/:id", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.update(c.req.param("id"), {
    name: body.name,
    profile: body.profile,
    promptFragments: body.promptFragments,
  });

  return c.json(character);
});

// Partial update character
characterRoutes.patch("/:id", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.update(c.req.param("id"), body);

  return c.json(character);
});

// Add reference image
characterRoutes.post("/:id/references", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.addReference(c.req.param("id"), body.imagePath);

  return c.json(character);
});

// Remove reference image
characterRoutes.delete("/:id/references", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.removeReference(c.req.param("id"), body.imagePath);

  return c.json(character);
});

// Set LoRA
characterRoutes.post("/:id/lora", async (c) => {
  const service = getCharacterService();
  const body = await c.req.json();

  const character = await service.setLora(c.req.param("id"), {
    path: body.path,
    strength: body.strength,
    strengthClip: body.strengthClip,
    trainingImages: body.trainingImages,
  });

  return c.json(character);
});

// Clear LoRA
characterRoutes.delete("/:id/lora", async (c) => {
  const service = getCharacterService();
  const character = await service.clearLora(c.req.param("id"));

  return c.json(character);
});

// Delete character
characterRoutes.delete("/:id", async (c) => {
  const service = getCharacterService();
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

export { characterRoutes };
