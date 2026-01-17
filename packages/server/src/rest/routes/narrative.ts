/**
 * Narrative Routes
 *
 * REST API endpoints for the narrative engine:
 * - Premises CRUD
 * - Stories CRUD
 * - Beats CRUD
 * - LLM Generation endpoints
 * - Conversion endpoints (Beat -> Panel)
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getNarrativeService,
  getLLMService,
  type PremiseStatus,
  type StoryStatus,
  type StoryStructure,
  type BeatType,
} from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateId,
  validateQuery,
  validateParam,
  paginationSchema,
  createPaginatedResponse,
  uuidSchema,
  nonEmptyString,
  optionalString,
  projectIdParamSchema,
  premiseIdParamSchema,
  storyIdParamSchema,
} from "../validation/index.js";

// ============================================================================
// Zod Schemas for Narrative Routes
// ============================================================================

const premiseStatusSchema = z.enum(["draft", "active", "archived"]);
const storyStatusSchema = z.enum(["draft", "beats_generated", "panels_created", "complete"]);
const storyStructureSchema = z.enum(["three-act", "five-act", "hero-journey", "custom"]);
const beatTypeSchema = z.enum([
  "setup", "inciting", "rising", "midpoint", "complication",
  "crisis", "climax", "resolution", "denouement"
]);

// Premise schemas
const createPremiseSchema = z.object({
  projectId: uuidSchema,
  logline: nonEmptyString,
  genre: optionalString,
  tone: optionalString,
  themes: z.array(z.string()).optional(),
  characterIds: z.array(uuidSchema).optional(),
  setting: optionalString,
  worldRules: z.array(z.string()).optional(),
  generatedBy: optionalString,
  generationPrompt: optionalString,
  status: premiseStatusSchema.optional(),
});

const updatePremiseSchema = z.object({
  logline: optionalString,
  genre: optionalString,
  tone: optionalString,
  themes: z.array(z.string()).optional(),
  characterIds: z.array(uuidSchema).optional(),
  setting: optionalString,
  worldRules: z.array(z.string()).optional(),
  generatedBy: optionalString,
  generationPrompt: optionalString,
  status: premiseStatusSchema.optional(),
});

const listPremisesQuerySchema = paginationSchema.extend({
  status: premiseStatusSchema.optional(),
});

// Character arc schema matching CharacterArc type
const characterArcSchema = z.object({
  characterId: uuidSchema,
  startState: z.string(),
  endState: z.string(),
  keyMoments: z.array(z.string()),
});

// Story schemas
const createStorySchema = z.object({
  title: nonEmptyString,
  synopsis: optionalString,
  targetLength: z.number().int().positive().optional(),
  structure: storyStructureSchema.optional(),
  structureNotes: z.record(z.string()).optional(),
  characterArcs: z.array(characterArcSchema).optional(),
  generatedBy: optionalString,
  generationPrompt: optionalString,
  status: storyStatusSchema.optional(),
});

const updateStorySchema = z.object({
  title: optionalString,
  synopsis: optionalString,
  targetLength: z.number().int().positive().optional(),
  structure: storyStructureSchema.optional(),
  structureNotes: z.record(z.string()).optional(),
  characterArcs: z.array(characterArcSchema).optional(),
  generatedBy: optionalString,
  generationPrompt: optionalString,
  status: storyStatusSchema.optional(),
});

const listStoriesQuerySchema = paginationSchema.extend({
  status: storyStatusSchema.optional(),
});

// Beat dialogue schema matching BeatDialogue type
const beatDialogueSchema = z.object({
  characterId: uuidSchema,
  text: z.string(),
  type: z.enum(["speech", "thought", "whisper"]),
});

// Beat schemas
const createBeatSchema = z.object({
  position: z.number().int().nonnegative(),
  actNumber: z.number().int().positive().optional(),
  beatType: beatTypeSchema.optional(),
  visualDescription: nonEmptyString,
  narrativeContext: optionalString,
  emotionalTone: optionalString,
  characterIds: z.array(uuidSchema).optional(),
  characterActions: z.record(z.string()).optional(),
  cameraAngle: optionalString,
  composition: optionalString,
  dialogue: z.array(beatDialogueSchema).optional(),
  narration: optionalString,
  sfx: optionalString,
  generatedBy: optionalString,
});

const updateBeatSchema = z.object({
  position: z.number().int().nonnegative().optional(),
  actNumber: z.number().int().positive().optional(),
  beatType: beatTypeSchema.optional(),
  visualDescription: optionalString,
  narrativeContext: optionalString,
  emotionalTone: optionalString,
  characterIds: z.array(uuidSchema).optional(),
  characterActions: z.record(z.string()).optional(),
  cameraAngle: optionalString,
  composition: optionalString,
  dialogue: z.array(beatDialogueSchema).optional(),
  narration: optionalString,
  sfx: optionalString,
  generatedBy: optionalString,
});

const batchCreateBeatsSchema = z.object({
  beats: z.array(createBeatSchema).min(1),
});

const reorderBeatsSchema = z.object({
  beatIds: z.array(uuidSchema).min(1),
});

// LLM Generation schemas
const generatePremiseSchema = z.object({
  logline: nonEmptyString,
  genre: optionalString,
  tone: optionalString,
  themes: z.array(z.string()).optional(),
  characterIds: z.array(uuidSchema).optional(),
  setting: optionalString,
});

const generateStorySchema = z.object({
  structure: storyStructureSchema.optional(),
  targetLength: z.number().int().positive().optional(),
  includeCharacterArcs: z.boolean().optional(),
  save: z.boolean().optional(),
});

const generateBeatsSchema = z.object({
  includeDialogue: z.boolean().optional(),
  includeNarration: z.boolean().optional(),
  includeSfx: z.boolean().optional(),
  detailLevel: z.enum(["minimal", "standard", "detailed"]).optional(),
  save: z.boolean().optional(),
});

const generateFullStorySchema = z.object({
  logline: nonEmptyString,
  projectId: uuidSchema,
  genre: optionalString,
  tone: optionalString,
  targetLength: z.number().int().positive().optional(),
  structure: storyStructureSchema.optional(),
  characterIds: z.array(uuidSchema).optional(),
  save: z.boolean().optional(),
});

const refineBeatSchema = z.object({
  feedback: nonEmptyString,
  save: z.boolean().optional(),
});

// Conversion schemas
const convertToPanelSchema = z.object({
  storyboardId: uuidSchema,
});

const convertToStoryboardSchema = z.object({
  storyboardId: uuidSchema,
});

const narrativeRoutes = new Hono();

// ============================================================================
// PREMISE ROUTES
// ============================================================================

// List premises for a project
narrativeRoutes.get(
  "/projects/:projectId/premises",
  validateParam(projectIdParamSchema),
  validateQuery(listPremisesQuerySchema),
  async (c) => {
    const service = getNarrativeService();
    const { projectId } = c.req.valid("param");
    const { page, limit, status } = c.req.valid("query");
    const offset = (page - 1) * limit;

    const premises = await service.listPremises(projectId, { status, limit, offset });

    return c.json(createPaginatedResponse(premises, page, limit));
  }
);

// Create premise
narrativeRoutes.post("/premises", validateBody(createPremiseSchema), async (c) => {
  const service = getNarrativeService();
  const body = c.req.valid("json");

  const premise = await service.createPremise({
    projectId: body.projectId,
    logline: body.logline,
    genre: body.genre,
    tone: body.tone,
    themes: body.themes,
    characterIds: body.characterIds,
    setting: body.setting,
    worldRules: body.worldRules,
    generatedBy: body.generatedBy,
    generationPrompt: body.generationPrompt,
    status: body.status,
  });

  return c.json(premise, 201);
});

// Get premise by ID
narrativeRoutes.get("/premises/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  const premise = await service.getPremise(id);

  if (!premise) {
    return errors.notFound(c, "Premise", id);
  }

  return c.json(premise);
});

// Get premise with stories
narrativeRoutes.get("/premises/:id/full", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  const premise = await service.getPremiseWithStories(id);

  if (!premise) {
    return errors.notFound(c, "Premise", id);
  }

  return c.json(premise);
});

// Update premise
narrativeRoutes.patch(
  "/premises/:id",
  validateId(),
  validateBody(updatePremiseSchema),
  async (c) => {
    const service = getNarrativeService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const premise = await service.updatePremise(id, {
      logline: body.logline,
      genre: body.genre,
      tone: body.tone,
      themes: body.themes,
      characterIds: body.characterIds,
      setting: body.setting,
      worldRules: body.worldRules,
      generatedBy: body.generatedBy,
      generationPrompt: body.generationPrompt,
      status: body.status,
    });

    return c.json(premise);
  }
);

// Delete premise
narrativeRoutes.delete("/premises/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  await service.deletePremise(id);

  return c.body(null, 204);
});

// ============================================================================
// STORY ROUTES
// ============================================================================

// Create story from premise
narrativeRoutes.post(
  "/premises/:premiseId/stories",
  validateParam(premiseIdParamSchema),
  validateBody(createStorySchema),
  async (c) => {
    const service = getNarrativeService();
    const { premiseId } = c.req.valid("param");
    const body = c.req.valid("json");

    const story = await service.createStory({
      premiseId,
      title: body.title,
      synopsis: body.synopsis,
      targetLength: body.targetLength,
      structure: body.structure,
      structureNotes: body.structureNotes,
      characterArcs: body.characterArcs,
      generatedBy: body.generatedBy,
      generationPrompt: body.generationPrompt,
      status: body.status,
    });

    return c.json(story, 201);
  }
);

// List stories for a premise
narrativeRoutes.get(
  "/premises/:premiseId/stories",
  validateParam(premiseIdParamSchema),
  validateQuery(listStoriesQuerySchema),
  async (c) => {
    const service = getNarrativeService();
    const { premiseId } = c.req.valid("param");
    const { page, limit, status } = c.req.valid("query");
    const offset = (page - 1) * limit;

    const stories = await service.listStoriesByPremise(premiseId, { status, limit, offset });

    return c.json(createPaginatedResponse(stories, page, limit));
  }
);

// Get story by ID
narrativeRoutes.get("/stories/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  const story = await service.getStory(id);

  if (!story) {
    return errors.notFound(c, "Story", id);
  }

  return c.json(story);
});

// Get story with beats
narrativeRoutes.get("/stories/:id/full", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  const story = await service.getStoryWithBeats(id);

  if (!story) {
    return errors.notFound(c, "Story", id);
  }

  return c.json(story);
});

// Update story
narrativeRoutes.patch(
  "/stories/:id",
  validateId(),
  validateBody(updateStorySchema),
  async (c) => {
    const service = getNarrativeService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const story = await service.updateStory(id, {
      title: body.title,
      synopsis: body.synopsis,
      targetLength: body.targetLength,
      structure: body.structure,
      structureNotes: body.structureNotes,
      characterArcs: body.characterArcs,
      generatedBy: body.generatedBy,
      generationPrompt: body.generationPrompt,
      status: body.status,
    });

    return c.json(story);
  }
);

// Delete story
narrativeRoutes.delete("/stories/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  await service.deleteStory(id);

  return c.body(null, 204);
});

// ============================================================================
// BEAT ROUTES
// ============================================================================

// Create beat
narrativeRoutes.post(
  "/stories/:storyId/beats",
  validateParam(storyIdParamSchema),
  validateBody(createBeatSchema),
  async (c) => {
    const service = getNarrativeService();
    const { storyId } = c.req.valid("param");
    const body = c.req.valid("json");

    // Get next position if not provided
    let position = body.position;
    if (position === undefined) {
      const existingBeats = await service.getBeats(storyId);
      position = existingBeats.length;
    }

    const beat = await service.createBeat({
      storyId,
      position,
      actNumber: body.actNumber,
      beatType: body.beatType,
      visualDescription: body.visualDescription,
      narrativeContext: body.narrativeContext,
      emotionalTone: body.emotionalTone,
      characterIds: body.characterIds,
      characterActions: body.characterActions,
      cameraAngle: body.cameraAngle,
      composition: body.composition,
      dialogue: body.dialogue,
      narration: body.narration,
      sfx: body.sfx,
      generatedBy: body.generatedBy,
    });

    return c.json(beat, 201);
  }
);

// Batch create beats
narrativeRoutes.post(
  "/stories/:storyId/beats/batch",
  validateParam(storyIdParamSchema),
  validateBody(batchCreateBeatsSchema),
  async (c) => {
    const service = getNarrativeService();
    const { storyId } = c.req.valid("param");
    const body = c.req.valid("json");

    const beats = await service.createBeats(storyId, body.beats);

    return c.json({ beats, count: beats.length }, 201);
  }
);

// Get all beats for a story
narrativeRoutes.get(
  "/stories/:storyId/beats",
  validateParam(storyIdParamSchema),
  async (c) => {
    const service = getNarrativeService();
    const { storyId } = c.req.valid("param");

    const beats = await service.getBeats(storyId);

    return c.json({ beats, count: beats.length });
  }
);

// Get beat by ID
narrativeRoutes.get("/beats/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  const beat = await service.getBeat(id);

  if (!beat) {
    return errors.notFound(c, "Beat", id);
  }

  return c.json(beat);
});

// Update beat
narrativeRoutes.patch(
  "/beats/:id",
  validateId(),
  validateBody(updateBeatSchema),
  async (c) => {
    const service = getNarrativeService();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const beat = await service.updateBeat(id, {
      position: body.position,
      actNumber: body.actNumber,
      beatType: body.beatType,
      visualDescription: body.visualDescription,
      narrativeContext: body.narrativeContext,
      emotionalTone: body.emotionalTone,
      characterIds: body.characterIds,
      characterActions: body.characterActions,
      cameraAngle: body.cameraAngle,
      composition: body.composition,
      dialogue: body.dialogue,
      narration: body.narration,
      sfx: body.sfx,
      generatedBy: body.generatedBy,
    });

    return c.json(beat);
  }
);

// Reorder beats
narrativeRoutes.post(
  "/stories/:storyId/beats/reorder",
  validateParam(storyIdParamSchema),
  validateBody(reorderBeatsSchema),
  async (c) => {
    const service = getNarrativeService();
    const { storyId } = c.req.valid("param");
    const body = c.req.valid("json");

    const beats = await service.reorderBeats(storyId, body.beatIds);

    return c.json({ beats, count: beats.length });
  }
);

// Delete beat
narrativeRoutes.delete("/beats/:id", validateId(), async (c) => {
  const service = getNarrativeService();
  const { id } = c.req.valid("param");
  await service.deleteBeat(id);

  return c.body(null, 204);
});

// ============================================================================
// LLM GENERATION ROUTES
// ============================================================================

// Generate premise from logline
narrativeRoutes.post(
  "/generate/premise",
  validateBody(generatePremiseSchema),
  async (c) => {
    const llmService = getLLMService();
    const body = c.req.valid("json");

    if (!llmService.isReady()) {
      return errors.serviceUnavailable(c, "LLM service (set ANTHROPIC_API_KEY)");
    }

    const generated = await llmService.generatePremise({
      logline: body.logline,
      genre: body.genre,
      tone: body.tone,
      themes: body.themes,
      characterIds: body.characterIds,
      setting: body.setting,
    });

    return c.json({ generated, model: llmService.getConfig().model });
  }
);

// Generate story from premise
narrativeRoutes.post(
  "/premises/:premiseId/generate-story",
  validateParam(premiseIdParamSchema),
  validateBody(generateStorySchema),
  async (c) => {
    const narrativeService = getNarrativeService();
    const llmService = getLLMService();
    const { premiseId } = c.req.valid("param");
    const body = c.req.valid("json");

    const premise = await narrativeService.getPremise(premiseId);
    if (!premise) {
      return errors.notFound(c, "Premise", premiseId);
    }

    if (!llmService.isReady()) {
      return errors.serviceUnavailable(c, "LLM service (set ANTHROPIC_API_KEY)");
    }

    const generated = await llmService.expandPremiseToStory(premise, {
      structure: body.structure,
      targetLength: body.targetLength,
      includeCharacterArcs: body.includeCharacterArcs,
    });

    // Optionally save the generated story
    if (body.save) {
      const story = await narrativeService.createStory({
        premiseId,
        title: generated.title,
        synopsis: generated.synopsis,
        targetLength: generated.targetLength,
        structure: generated.structure,
        structureNotes: generated.structureNotes,
        characterArcs: generated.characterArcs,
        generatedBy: llmService.getConfig().model,
      });

      return c.json({
        generated,
        saved: story,
        model: llmService.getConfig().model,
      });
    }

    return c.json({ generated, model: llmService.getConfig().model });
  }
);

// Generate beats for story
narrativeRoutes.post(
  "/stories/:storyId/generate-beats",
  validateParam(storyIdParamSchema),
  validateBody(generateBeatsSchema),
  async (c) => {
    const narrativeService = getNarrativeService();
    const llmService = getLLMService();
    const { storyId } = c.req.valid("param");
    const body = c.req.valid("json");

    const story = await narrativeService.getStory(storyId);
    if (!story) {
      return errors.notFound(c, "Story", storyId);
    }

    const premise = await narrativeService.getPremise(story.premiseId);
    if (!premise) {
      return errors.notFound(c, "Premise", story.premiseId);
    }

    if (!llmService.isReady()) {
      return errors.serviceUnavailable(c, "LLM service (set ANTHROPIC_API_KEY)");
    }

    const generated = await llmService.generateBeats(story, premise, {
      includeDialogue: body.includeDialogue,
      includeNarration: body.includeNarration,
      includeSfx: body.includeSfx,
      detailLevel: body.detailLevel,
    });

    // Optionally save the generated beats
    if (body.save) {
      const savedBeats = await narrativeService.createBeats(
        storyId,
        generated.map((g) => ({
          position: g.position,
          actNumber: g.actNumber,
          beatType: g.beatType,
          visualDescription: g.visualDescription,
          narrativeContext: g.narrativeContext,
          emotionalTone: g.emotionalTone,
          characterIds: g.characterIds,
          characterActions: g.characterActions,
          cameraAngle: g.cameraAngle,
          composition: g.composition,
          dialogue: g.dialogue,
          narration: g.narration,
          sfx: g.sfx,
          generatedBy: llmService.getConfig().model,
        }))
      );

      // Update story status
      await narrativeService.updateStory(storyId, { status: "beats_generated" });

      return c.json({
        generated,
        saved: savedBeats,
        count: savedBeats.length,
        model: llmService.getConfig().model,
      });
    }

    return c.json({ generated, count: generated.length, model: llmService.getConfig().model });
  }
);

// Generate full story from logline (one-shot)
narrativeRoutes.post(
  "/generate/full-story",
  validateBody(generateFullStorySchema),
  async (c) => {
    const narrativeService = getNarrativeService();
    const llmService = getLLMService();
    const body = c.req.valid("json");

    if (!llmService.isReady()) {
      return errors.serviceUnavailable(c, "LLM service (set ANTHROPIC_API_KEY)");
    }

    const { premise, story, beats } = await llmService.generateFullStory(
      body.logline,
      body.characterIds ?? [],
      {
        genre: body.genre,
        tone: body.tone,
        targetLength: body.targetLength,
        structure: body.structure,
      }
    );

    // Save everything if requested
    if (body.save) {
      // Save premise
      const savedPremise = await narrativeService.createPremise({
        projectId: body.projectId,
        logline: premise.logline,
        genre: premise.genre,
        tone: premise.tone,
        themes: premise.themes,
        characterIds: body.characterIds ?? [],
        setting: premise.setting,
        worldRules: premise.worldRules,
        generatedBy: llmService.getConfig().model,
        status: "active",
      });

      // Save story
      const savedStory = await narrativeService.createStory({
        premiseId: savedPremise.id,
        title: story.title,
        synopsis: story.synopsis,
        targetLength: story.targetLength,
        structure: story.structure,
        structureNotes: story.structureNotes,
        characterArcs: story.characterArcs,
        generatedBy: llmService.getConfig().model,
        status: "beats_generated",
      });

      // Save beats
      const savedBeats = await narrativeService.createBeats(
        savedStory.id,
        beats.map((g) => ({
          position: g.position,
          actNumber: g.actNumber,
          beatType: g.beatType,
          visualDescription: g.visualDescription,
          narrativeContext: g.narrativeContext,
          emotionalTone: g.emotionalTone,
          characterIds: g.characterIds,
          characterActions: g.characterActions,
          cameraAngle: g.cameraAngle,
          composition: g.composition,
          dialogue: g.dialogue,
          narration: g.narration,
          sfx: g.sfx,
          generatedBy: llmService.getConfig().model,
        }))
      );

      return c.json({
        generated: { premise, story, beats },
        saved: {
          premise: savedPremise,
          story: savedStory,
          beats: savedBeats,
        },
        model: llmService.getConfig().model,
      });
    }

    return c.json({
      generated: { premise, story, beats },
      model: llmService.getConfig().model,
    });
  }
);

// Refine a beat
narrativeRoutes.post(
  "/beats/:id/refine",
  validateId(),
  validateBody(refineBeatSchema),
  async (c) => {
    const narrativeService = getNarrativeService();
    const llmService = getLLMService();
    const { id: beatId } = c.req.valid("param");
    const body = c.req.valid("json");

    const beat = await narrativeService.getBeat(beatId);
    if (!beat) {
      return errors.notFound(c, "Beat", beatId);
    }

    if (!llmService.isReady()) {
      return errors.serviceUnavailable(c, "LLM service (set ANTHROPIC_API_KEY)");
    }

    // Convert DB beat to GeneratedBeat format
    const beatForRefinement = {
      position: beat.position,
      actNumber: beat.actNumber ?? 1,
      beatType: beat.beatType ?? ("rising" as BeatType),
      visualDescription: beat.visualDescription,
      narrativeContext: beat.narrativeContext ?? "",
      emotionalTone: beat.emotionalTone ?? "",
      characterIds: beat.characterIds,
      characterActions: beat.characterActions ?? {},
      cameraAngle: beat.cameraAngle ?? "",
      composition: beat.composition ?? "",
      dialogue: beat.dialogue ?? [],
      narration: beat.narration ?? "",
      sfx: beat.sfx ?? "",
    };

    const refined = await llmService.refineBeat(beatForRefinement, body.feedback);

    // Update if requested
    if (body.save) {
      const updated = await narrativeService.updateBeat(beatId, {
        position: refined.position,
        actNumber: refined.actNumber,
        beatType: refined.beatType,
        visualDescription: refined.visualDescription,
        narrativeContext: refined.narrativeContext,
        emotionalTone: refined.emotionalTone,
        characterIds: refined.characterIds,
        characterActions: refined.characterActions,
        cameraAngle: refined.cameraAngle,
        composition: refined.composition,
        dialogue: refined.dialogue,
        narration: refined.narration,
        sfx: refined.sfx,
      });

      return c.json({ refined, saved: updated, model: llmService.getConfig().model });
    }

    return c.json({ refined, model: llmService.getConfig().model });
  }
);

// ============================================================================
// CONVERSION ROUTES
// ============================================================================

// Convert beat to panel
narrativeRoutes.post(
  "/beats/:id/to-panel",
  validateId(),
  validateBody(convertToPanelSchema),
  async (c) => {
    const service = getNarrativeService();
    const { id: beatId } = c.req.valid("param");
    const body = c.req.valid("json");

    const result = await service.convertBeatToPanel(beatId, body.storyboardId);

    return c.json(result, 201);
  }
);

// Convert story to storyboard
narrativeRoutes.post(
  "/stories/:id/to-storyboard",
  validateId(),
  validateBody(convertToStoryboardSchema),
  async (c) => {
    const service = getNarrativeService();
    const { id: storyId } = c.req.valid("param");
    const body = c.req.valid("json");

    const result = await service.convertStoryToStoryboard(storyId, body.storyboardId);

    return c.json({ ...result, count: result.panelIds.length }, 201);
  }
);

// ============================================================================
// LLM STATUS
// ============================================================================

// Get LLM service status
narrativeRoutes.get("/llm/status", async (c) => {
  const llmService = getLLMService();
  const config = llmService.getConfig();

  return c.json({
    ready: llmService.isReady(),
    provider: config.provider,
    model: config.model,
    hasApiKey: config.hasApiKey,
  });
});

export { narrativeRoutes };
