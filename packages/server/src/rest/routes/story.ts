/**
 * Story Scaffold Routes
 *
 * REST API endpoints for creating complete story structures.
 */

import { Hono } from "hono";
import { getStoryScaffoldService } from "@graphix/core";

const storyRoutes = new Hono();

/**
 * POST /scaffold
 * Scaffold a complete story structure from structured input
 *
 * Body:
 * {
 *   projectId: string,
 *   title: string,
 *   description?: string,
 *   characterNames?: string[],
 *   acts: [{
 *     name: string,
 *     description?: string,
 *     scenes: [{
 *       name: string,
 *       description?: string,
 *       panels: [{ description: string, characterNames?: string[], direction?: {...} }]
 *     }]
 *   }]
 * }
 */
storyRoutes.post("/scaffold", async (c) => {
  const service = getStoryScaffoldService();
  const body = await c.req.json();

  const result = await service.scaffold({
    projectId: body.projectId,
    title: body.title,
    description: body.description,
    characterNames: body.characterNames,
    acts: body.acts,
  });

  if (!result.success) {
    return c.json({ error: result.error, result }, 400);
  }

  return c.json(result, 201);
});

/**
 * POST /from-outline
 * Parse and scaffold a story from a text outline
 *
 * Body:
 * {
 *   projectId: string,
 *   outline: string (markdown format)
 * }
 */
storyRoutes.post("/from-outline", async (c) => {
  const service = getStoryScaffoldService();
  const body = await c.req.json();

  if (!body.projectId || !body.outline) {
    return c.json({ error: "projectId and outline are required" }, 400);
  }

  const result = await service.fromOutline(body.projectId, body.outline);

  if (!result.success) {
    return c.json({ error: result.error, result }, 400);
  }

  return c.json(result, 201);
});

/**
 * POST /parse-outline
 * Parse a text outline without creating anything (for preview)
 *
 * Body:
 * { outline: string }
 */
storyRoutes.post("/parse-outline", async (c) => {
  const service = getStoryScaffoldService();
  const body = await c.req.json();

  if (!body.outline) {
    return c.json({ error: "outline is required" }, 400);
  }

  const parsed = service.parseOutline(body.outline);

  return c.json({
    parsed: true,
    ...parsed,
    summary: {
      actCount: parsed.acts.length,
      sceneCount: parsed.acts.reduce((sum, act) => sum + act.scenes.length, 0),
      panelCount: parsed.acts.reduce(
        (sum, act) => sum + act.scenes.reduce((s, scene) => s + scene.panels.length, 0),
        0
      ),
      characterCount: parsed.characterNames.length,
    },
  });
});

export { storyRoutes };
