/**
 * Project Routes
 *
 * REST API endpoints for project management.
 * Demonstrates validation middleware and standardized error responses.
 */

import { Hono } from "hono";
import { getProjectService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateQuery,
  validateId,
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
} from "../validation/index.js";

const projectRoutes = new Hono();

// List all projects with pagination
projectRoutes.get("/", validateQuery(paginationSchema), async (c) => {
  const service = getProjectService();
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const projects = await service.list({ limit, offset });

  return c.json({
    data: projects,
    pagination: {
      page,
      limit,
      count: projects.length,
      hasMore: projects.length === limit,
    },
  });
});

// Get project by ID
projectRoutes.get("/:id", validateId(), async (c) => {
  const service = getProjectService();
  const { id } = c.req.valid("param");
  const project = await service.getById(id);

  if (!project) {
    return errors.notFound(c, "Project", id);
  }

  return c.json(project);
});

// Create project
projectRoutes.post("/", validateBody(createProjectSchema), async (c) => {
  const service = getProjectService();
  const body = c.req.valid("json");

  const project = await service.create({
    name: body.name,
    description: body.description,
    settings: body.settings,
  });

  return c.json(project, 201);
});

// Update project (full)
projectRoutes.put(
  "/:id",
  validateId(),
  validateBody(createProjectSchema),
  async (c) => {
    const service = getProjectService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const project = await service.update(id, {
      name: body.name,
      description: body.description,
      settings: body.settings,
    });

    return c.json(project);
  }
);

// Partial update project
projectRoutes.patch(
  "/:id",
  validateId(),
  validateBody(updateProjectSchema),
  async (c) => {
    const service = getProjectService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const project = await service.update(id, body);

    return c.json(project);
  }
);

// Delete project
projectRoutes.delete("/:id", validateId(), async (c) => {
  const service = getProjectService();
  const { id } = c.req.valid("param");

  await service.delete(id);

  return c.body(null, 204);
});

export { projectRoutes };
