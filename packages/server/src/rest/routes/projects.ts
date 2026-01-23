/**
 * Project Routes
 *
 * REST API endpoints for project management.
 * Demonstrates validation middleware and standardized error responses.
 */

import { Hono } from "hono";
import { getProjectService, getStoryboardService, getPanelService, getGenerationService } from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateQuery,
  validateId,
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
} from "../validation/index.js";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

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

// Get project thumbnail (first generated image)
projectRoutes.get("/:id/thumbnail", validateId(), async (c) => {
  const projectService = getProjectService();
  const storyboardService = getStoryboardService();
  const panelService = getPanelService();
  const generationService = getGenerationService();
  const { id } = c.req.valid("param");

  // Verify project exists
  const project = await projectService.getById(id);
  if (!project) {
    return errors.notFound(c, "Project", id);
  }

  // Get the first storyboard for this project
  const storyboards = await storyboardService.listByProject(id);
  if (!storyboards || storyboards.length === 0) {
    // Return 204 No Content if no storyboards
    return c.body(null, 204);
  }

  // Get panels from the first storyboard
  const panels = await panelService.listByStoryboard(storyboards[0].id);
  if (!panels || panels.length === 0) {
    return c.body(null, 204);
  }

  // Find the first panel with a selected generation or any generation
  for (const panel of panels) {
    const generations = await generationService.listByPanel(panel.id);
    if (generations && generations.length > 0) {
      // Prefer selected output, otherwise use the first generation
      const selectedGen = generations.find((g: any) => g.id === panel.selectedOutputId) || generations[0];

      // Try to serve the image
      const imagePath = selectedGen.localPath || selectedGen.cloudUrl;
      if (imagePath && typeof imagePath === 'string') {
        // If it's a cloud URL, redirect
        if (imagePath.startsWith('http')) {
          return c.redirect(imagePath);
        }

        // If it's a local path, serve the file
        if (existsSync(imagePath)) {
          const imageData = await readFile(imagePath);
          const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                          ext === 'webp' ? 'image/webp' : 'image/png';

          c.header('Content-Type', mimeType);
          c.header('Cache-Control', 'public, max-age=3600');
          return c.body(imageData);
        }
      }
    }
  }

  // No thumbnail available
  return c.body(null, 204);
});

export { projectRoutes };
