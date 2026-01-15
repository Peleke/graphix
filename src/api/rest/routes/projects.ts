/**
 * Project Routes
 *
 * REST API endpoints for project management.
 */

import { Hono } from "hono";
import { getProjectService } from "../../../services/index.js";

const projectRoutes = new Hono();
const service = getProjectService();

// List all projects
projectRoutes.get("/", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "100");
  const offset = parseInt(c.req.query("offset") ?? "0");

  const projects = await service.list({ limit, offset });

  return c.json({
    projects,
    pagination: {
      limit,
      offset,
      count: projects.length,
    },
  });
});

// Get project by ID
projectRoutes.get("/:id", async (c) => {
  const project = await service.getById(c.req.param("id"));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json(project);
});

// Create project
projectRoutes.post("/", async (c) => {
  const body = await c.req.json();

  const project = await service.create({
    name: body.name,
    description: body.description,
    settings: body.settings,
  });

  return c.json(project, 201);
});

// Update project
projectRoutes.put("/:id", async (c) => {
  const body = await c.req.json();

  const project = await service.update(c.req.param("id"), {
    name: body.name,
    description: body.description,
    settings: body.settings,
  });

  return c.json(project);
});

// Partial update project
projectRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();

  const project = await service.update(c.req.param("id"), body);

  return c.json(project);
});

// Delete project
projectRoutes.delete("/:id", async (c) => {
  await service.delete(c.req.param("id"));

  return c.body(null, 204);
});

export { projectRoutes };
