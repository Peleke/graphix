/**
 * Story Scaffold Routes
 *
 * REST API endpoints for creating complete story structures.
 */

import { Hono } from "hono";
import { z } from "zod";
import { getStoryScaffoldService } from "@graphix/core";
import { errors } from "../errors/index.js";
import { validateBody } from "../validation/index.js";

// ============================================================================
// Local Schemas
// ============================================================================

/** Panel direction schema for scaffolding */
const scaffoldDirectionSchema = z.object({
  cameraAngle: z.string().optional(),
  mood: z.string().optional(),
  lighting: z.string().optional(),
}).partial().optional();

/** Panel input schema */
const scaffoldPanelSchema = z.object({
  description: z.string(),
  characterNames: z.array(z.string()).optional(),
  direction: scaffoldDirectionSchema,
});

/** Scene input schema */
const scaffoldSceneSchema = z.object({
  name: z.string().min(1, "Scene name is required"),
  description: z.string().optional(),
  panels: z.array(scaffoldPanelSchema),
});

/** Act input schema */
const scaffoldActSchema = z.object({
  name: z.string().min(1, "Act name is required"),
  description: z.string().optional(),
  scenes: z.array(scaffoldSceneSchema),
});

/** ID validation - accepts both UUID and cuid2 formats */
const idSchema = z.string().min(1, "ID is required").refine(
  (val) => {
    // Accept UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(val)) return true;
    // Accept cuid2 format (21-24 char alphanumeric, starts with lowercase letter)
    const cuid2Regex = /^[a-z][a-z0-9]{20,23}$/;
    if (cuid2Regex.test(val)) return true;
    return false;
  },
  { message: "Invalid ID format" }
);

/** POST /scaffold body schema */
const scaffoldBodySchema = z.object({
  projectId: idSchema,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  characterNames: z.array(z.string()).optional(),
  acts: z.array(scaffoldActSchema),
});

/** POST /from-outline body schema */
const fromOutlineBodySchema = z.object({
  projectId: idSchema,
  outline: z.string().min(1, "Outline is required"),
});

/** POST /parse-outline body schema */
const parseOutlineBodySchema = z.object({
  outline: z.string().min(1, "Outline is required"),
});

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
storyRoutes.post("/scaffold", validateBody(scaffoldBodySchema), async (c) => {
  const service = getStoryScaffoldService();
  const body = c.req.valid("json");

  const result = await service.scaffold({
    projectId: body.projectId,
    title: body.title,
    description: body.description,
    characterNames: body.characterNames,
    acts: body.acts,
  });

  if (!result.success) {
    return errors.badRequest(c, result.error || "Scaffold operation failed");
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
storyRoutes.post("/from-outline", validateBody(fromOutlineBodySchema), async (c) => {
  const service = getStoryScaffoldService();
  const body = c.req.valid("json");

  const result = await service.fromOutline(body.projectId, body.outline);

  if (!result.success) {
    return errors.badRequest(c, result.error || "Failed to create story from outline");
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
storyRoutes.post("/parse-outline", validateBody(parseOutlineBodySchema), async (c) => {
  const service = getStoryScaffoldService();
  const body = c.req.valid("json");

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
