/**
 * Narrative Routes
 *
 * REST API endpoints for the narrative engine:
 * - Premises CRUD
 * - Stories CRUD
 * - Beats CRUD
 * - LLM Generation endpoints
 * - Conversion endpoints (Beat → Panel)
 */

import { Hono } from "hono";
import {
  getNarrativeService,
  getLLMService,
  type PremiseStatus,
  type StoryStatus,
  type StoryStructure,
  type BeatType,
} from "@graphix/core";

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_PREMISE_STATUSES: readonly string[] = ["draft", "active", "archived"];
const VALID_STORY_STATUSES: readonly string[] = ["draft", "beats_generated", "panels_created", "complete"];
const VALID_STORY_STRUCTURES: readonly string[] = ["three-act", "five-act", "hero-journey", "custom"];
const VALID_BEAT_TYPES: readonly string[] = [
  "setup", "inciting", "rising", "midpoint", "complication",
  "crisis", "climax", "resolution", "denouement"
];

/**
 * Safely parse an integer from a string with validation.
 * Returns defaultValue if parsing fails or value is out of range.
 */
function safeParseInt(value: string | undefined, defaultValue: number, min = 0, max = 10000): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

/**
 * Validate that a value is a valid enum member.
 * Returns undefined if invalid (instead of blindly casting).
 */
function validateEnum<T extends string>(
  value: string | undefined,
  validValues: readonly string[],
  _fieldName: string
): T | undefined {
  if (!value) return undefined;
  if (validValues.includes(value)) {
    return value as T;
  }
  return undefined;
}

/**
 * Create a consistent error response.
 */
function errorResponse(message: string, code: string = "BAD_REQUEST") {
  return { error: message, code };
}

const narrativeRoutes = new Hono();

// ============================================================================
// PREMISE ROUTES
// ============================================================================

// List premises for a project
narrativeRoutes.get("/projects/:projectId/premises", async (c) => {
  const service = getNarrativeService();
  const projectId = c.req.param("projectId");
  const status = validateEnum<PremiseStatus>(c.req.query("status"), VALID_PREMISE_STATUSES, "status");
  const limit = safeParseInt(c.req.query("limit"), 100, 1, 1000);
  const offset = safeParseInt(c.req.query("offset"), 0, 0);

  const premises = await service.listPremises(projectId, { status, limit, offset });

  return c.json({
    premises,
    pagination: { limit, offset, count: premises.length },
  });
});

// Create premise
narrativeRoutes.post("/premises", async (c) => {
  const service = getNarrativeService();
  const body = await c.req.json();

  if (!body.projectId || !body.logline) {
    return c.json(errorResponse("projectId and logline are required", "MISSING_REQUIRED_FIELDS"), 400);
  }

  const status = validateEnum<PremiseStatus>(body.status, VALID_PREMISE_STATUSES, "status");

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
    status,
  });

  return c.json(premise, 201);
});

// Get premise by ID
narrativeRoutes.get("/premises/:id", async (c) => {
  const service = getNarrativeService();
  const premise = await service.getPremise(c.req.param("id"));

  if (!premise) {
    return c.json({ error: "Premise not found" }, 404);
  }

  return c.json(premise);
});

// Get premise with stories
narrativeRoutes.get("/premises/:id/full", async (c) => {
  const service = getNarrativeService();
  const premise = await service.getPremiseWithStories(c.req.param("id"));

  if (!premise) {
    return c.json({ error: "Premise not found" }, 404);
  }

  return c.json(premise);
});

// Update premise
narrativeRoutes.patch("/premises/:id", async (c) => {
  const service = getNarrativeService();
  const body = await c.req.json();

  const premise = await service.updatePremise(c.req.param("id"), {
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
});

// Delete premise
narrativeRoutes.delete("/premises/:id", async (c) => {
  const service = getNarrativeService();
  await service.deletePremise(c.req.param("id"));

  return c.body(null, 204);
});

// ============================================================================
// STORY ROUTES
// ============================================================================

// Create story from premise
narrativeRoutes.post("/premises/:premiseId/stories", async (c) => {
  const service = getNarrativeService();
  const premiseId = c.req.param("premiseId");
  const body = await c.req.json();

  if (!body.title) {
    return c.json(errorResponse("title is required", "MISSING_REQUIRED_FIELDS"), 400);
  }

  const structure = validateEnum<StoryStructure>(body.structure, VALID_STORY_STRUCTURES, "structure");
  const status = validateEnum<StoryStatus>(body.status, VALID_STORY_STATUSES, "status");

  const story = await service.createStory({
    premiseId,
    title: body.title,
    synopsis: body.synopsis,
    targetLength: body.targetLength,
    structure,
    structureNotes: body.structureNotes,
    characterArcs: body.characterArcs,
    generatedBy: body.generatedBy,
    generationPrompt: body.generationPrompt,
    status,
  });

  return c.json(story, 201);
});

// List stories for a premise
narrativeRoutes.get("/premises/:premiseId/stories", async (c) => {
  const service = getNarrativeService();
  const premiseId = c.req.param("premiseId");
  const status = validateEnum<StoryStatus>(c.req.query("status"), VALID_STORY_STATUSES, "status");
  const limit = safeParseInt(c.req.query("limit"), 100, 1, 1000);
  const offset = safeParseInt(c.req.query("offset"), 0, 0);

  const stories = await service.listStoriesByPremise(premiseId, { status, limit, offset });

  return c.json({
    stories,
    pagination: { limit, offset, count: stories.length },
  });
});

// Get story by ID
narrativeRoutes.get("/stories/:id", async (c) => {
  const service = getNarrativeService();
  const story = await service.getStory(c.req.param("id"));

  if (!story) {
    return c.json({ error: "Story not found" }, 404);
  }

  return c.json(story);
});

// Get story with beats
narrativeRoutes.get("/stories/:id/full", async (c) => {
  const service = getNarrativeService();
  const story = await service.getStoryWithBeats(c.req.param("id"));

  if (!story) {
    return c.json({ error: "Story not found" }, 404);
  }

  return c.json(story);
});

// Update story
narrativeRoutes.patch("/stories/:id", async (c) => {
  const service = getNarrativeService();
  const body = await c.req.json();

  const structure = validateEnum<StoryStructure>(body.structure, VALID_STORY_STRUCTURES, "structure");
  const status = validateEnum<StoryStatus>(body.status, VALID_STORY_STATUSES, "status");

  const story = await service.updateStory(c.req.param("id"), {
    title: body.title,
    synopsis: body.synopsis,
    targetLength: body.targetLength,
    structure,
    structureNotes: body.structureNotes,
    characterArcs: body.characterArcs,
    generatedBy: body.generatedBy,
    generationPrompt: body.generationPrompt,
    status,
  });

  return c.json(story);
});

// Delete story
narrativeRoutes.delete("/stories/:id", async (c) => {
  const service = getNarrativeService();
  await service.deleteStory(c.req.param("id"));

  return c.body(null, 204);
});

// ============================================================================
// BEAT ROUTES
// ============================================================================

// Create beat
narrativeRoutes.post("/stories/:storyId/beats", async (c) => {
  const service = getNarrativeService();
  const storyId = c.req.param("storyId");
  const body = await c.req.json();

  if (!body.visualDescription) {
    return c.json(errorResponse("visualDescription is required", "MISSING_REQUIRED_FIELDS"), 400);
  }

  // Get next position if not provided
  let position = body.position;
  if (position === undefined) {
    const existingBeats = await service.getBeats(storyId);
    position = existingBeats.length;
  }

  const beatType = validateEnum<BeatType>(body.beatType, VALID_BEAT_TYPES, "beatType");

  const beat = await service.createBeat({
    storyId,
    position,
    actNumber: body.actNumber,
    beatType,
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
});

// Batch create beats
narrativeRoutes.post("/stories/:storyId/beats/batch", async (c) => {
  const service = getNarrativeService();
  const storyId = c.req.param("storyId");
  const body = await c.req.json();

  if (!Array.isArray(body.beats)) {
    return c.json({ error: "beats array is required" }, 400);
  }

  const beats = await service.createBeats(storyId, body.beats);

  return c.json({ beats, count: beats.length }, 201);
});

// Get all beats for a story
narrativeRoutes.get("/stories/:storyId/beats", async (c) => {
  const service = getNarrativeService();
  const storyId = c.req.param("storyId");

  const beats = await service.getBeats(storyId);

  return c.json({ beats, count: beats.length });
});

// Get beat by ID
narrativeRoutes.get("/beats/:id", async (c) => {
  const service = getNarrativeService();
  const beat = await service.getBeat(c.req.param("id"));

  if (!beat) {
    return c.json({ error: "Beat not found" }, 404);
  }

  return c.json(beat);
});

// Update beat
narrativeRoutes.patch("/beats/:id", async (c) => {
  const service = getNarrativeService();
  const body = await c.req.json();

  const beatType = validateEnum<BeatType>(body.beatType, VALID_BEAT_TYPES, "beatType");

  const beat = await service.updateBeat(c.req.param("id"), {
    position: body.position,
    actNumber: body.actNumber,
    beatType,
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
});

// Reorder beats
narrativeRoutes.post("/stories/:storyId/beats/reorder", async (c) => {
  const service = getNarrativeService();
  const storyId = c.req.param("storyId");
  const body = await c.req.json();

  if (!Array.isArray(body.beatIds)) {
    return c.json({ error: "beatIds array is required" }, 400);
  }

  const beats = await service.reorderBeats(storyId, body.beatIds);

  return c.json({ beats, count: beats.length });
});

// Delete beat
narrativeRoutes.delete("/beats/:id", async (c) => {
  const service = getNarrativeService();
  await service.deleteBeat(c.req.param("id"));

  return c.body(null, 204);
});

// ============================================================================
// LLM GENERATION ROUTES
// ============================================================================

// Generate premise from logline
narrativeRoutes.post("/generate/premise", async (c) => {
  const llmService = getLLMService();
  const body = await c.req.json();

  if (!body.logline) {
    return c.json({ error: "logline is required" }, 400);
  }

  if (!llmService.isReady()) {
    return c.json({ error: "LLM service not configured. Set ANTHROPIC_API_KEY." }, 503);
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
});

// Generate story from premise
narrativeRoutes.post("/premises/:premiseId/generate-story", async (c) => {
  const narrativeService = getNarrativeService();
  const llmService = getLLMService();
  const premiseId = c.req.param("premiseId");
  const body = await c.req.json();

  const premise = await narrativeService.getPremise(premiseId);
  if (!premise) {
    return c.json({ error: "Premise not found" }, 404);
  }

  if (!llmService.isReady()) {
    return c.json({ error: "LLM service not configured. Set ANTHROPIC_API_KEY." }, 503);
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
});

// Generate beats for story
narrativeRoutes.post("/stories/:storyId/generate-beats", async (c) => {
  const narrativeService = getNarrativeService();
  const llmService = getLLMService();
  const storyId = c.req.param("storyId");
  const body = await c.req.json();

  const story = await narrativeService.getStory(storyId);
  if (!story) {
    return c.json({ error: "Story not found" }, 404);
  }

  const premise = await narrativeService.getPremise(story.premiseId);
  if (!premise) {
    return c.json({ error: "Premise not found" }, 404);
  }

  if (!llmService.isReady()) {
    return c.json({ error: "LLM service not configured. Set ANTHROPIC_API_KEY." }, 503);
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
});

// Generate full story from logline (one-shot)
narrativeRoutes.post("/generate/full-story", async (c) => {
  const narrativeService = getNarrativeService();
  const llmService = getLLMService();
  const body = await c.req.json();

  if (!body.logline || !body.projectId) {
    return c.json({ error: "logline and projectId are required" }, 400);
  }

  if (!llmService.isReady()) {
    return c.json({ error: "LLM service not configured. Set ANTHROPIC_API_KEY." }, 503);
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
});

// Refine a beat
narrativeRoutes.post("/beats/:id/refine", async (c) => {
  const narrativeService = getNarrativeService();
  const llmService = getLLMService();
  const beatId = c.req.param("id");
  const body = await c.req.json();

  if (!body.feedback) {
    return c.json({ error: "feedback is required" }, 400);
  }

  const beat = await narrativeService.getBeat(beatId);
  if (!beat) {
    return c.json({ error: "Beat not found" }, 404);
  }

  if (!llmService.isReady()) {
    return c.json({ error: "LLM service not configured. Set ANTHROPIC_API_KEY." }, 503);
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
});

// ============================================================================
// CONVERSION ROUTES
// ============================================================================

// Convert beat to panel
narrativeRoutes.post("/beats/:id/to-panel", async (c) => {
  const service = getNarrativeService();
  const beatId = c.req.param("id");
  const body = await c.req.json();

  if (!body.storyboardId) {
    return c.json({ error: "storyboardId is required" }, 400);
  }

  const result = await service.convertBeatToPanel(beatId, body.storyboardId);

  return c.json(result, 201);
});

// Convert story to storyboard
narrativeRoutes.post("/stories/:id/to-storyboard", async (c) => {
  const service = getNarrativeService();
  const storyId = c.req.param("id");
  const body = await c.req.json();

  if (!body.storyboardId) {
    return c.json({ error: "storyboardId is required" }, 400);
  }

  const result = await service.convertStoryToStoryboard(storyId, body.storyboardId);

  return c.json({ ...result, count: result.panelIds.length }, 201);
});

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
