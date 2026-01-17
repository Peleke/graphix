/**
 * Narrative OpenAPI Schemas
 *
 * Schemas for narrative engine-related API endpoints (premises, stories, beats).
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";

// ============================================================================
// Status and Type Enums
// ============================================================================

/**
 * Premise status enum
 */
export const PremiseStatusSchema = z
  .enum(["draft", "active", "archived"])
  .describe("Premise status");

/**
 * Story status enum
 */
export const StoryStatusSchema = z
  .enum(["draft", "beats_generated", "panels_created", "complete"])
  .describe("Story status");

/**
 * Story structure enum
 */
export const StoryStructureSchema = z
  .enum(["three-act", "five-act", "hero-journey", "custom"])
  .describe("Story structure type");

/**
 * Beat type enum
 */
export const BeatTypeSchema = z
  .enum([
    "setup",
    "inciting",
    "rising",
    "midpoint",
    "complication",
    "crisis",
    "climax",
    "resolution",
    "denouement",
  ])
  .describe("Beat type");

// ============================================================================
// Character Arc Schema
// ============================================================================

/**
 * Character arc schema
 */
export const CharacterArcSchema = z
  .object({
    characterId: IdSchema.describe("Character ID"),
    startState: z.string().describe("Starting character state"),
    endState: z.string().describe("Ending character state"),
    keyMoments: z.array(z.string()).describe("Key moments in arc"),
  })
  .describe("Character arc");

// ============================================================================
// Premise Entity Schema
// ============================================================================

/**
 * Premise entity
 */
export const PremiseSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema.describe("Parent project ID"),
    logline: z.string().describe("Story logline"),
    genre: z.string().nullable().optional().describe("Genre"),
    tone: z.string().nullable().optional().describe("Tone"),
    themes: z.array(z.string()).default([]).describe("Themes"),
    characterIds: z.array(IdSchema).default([]).describe("Character IDs"),
    setting: z.string().nullable().optional().describe("Setting"),
    worldRules: z.array(z.string()).nullable().optional().describe("World rules"),
    generatedBy: z.string().nullable().optional().describe("LLM that generated this"),
    generationPrompt: z.string().nullable().optional().describe("Generation prompt"),
    status: PremiseStatusSchema.default("draft").describe("Premise status"),
  })
  .merge(TimestampsSchema)
  .describe("Premise");

// ============================================================================
// Story Entity Schema
// ============================================================================

/**
 * Story entity
 */
export const StorySchema = z
  .object({
    id: IdSchema,
    premiseId: IdSchema.describe("Parent premise ID"),
    title: z.string().describe("Story title"),
    synopsis: z.string().nullable().optional().describe("Story synopsis"),
    targetLength: z.number().int().nullable().optional().describe("Target panel count"),
    actualLength: z.number().int().nullable().optional().describe("Actual beat count"),
    structure: StoryStructureSchema.default("three-act").describe("Story structure"),
    structureNotes: z
      .record(z.string())
      .nullable()
      .optional()
      .describe("Structure notes"),
    characterArcs: z.array(CharacterArcSchema).nullable().optional().describe("Character arcs"),
    generatedBy: z.string().nullable().optional().describe("LLM that generated this"),
    generationPrompt: z.string().nullable().optional().describe("Generation prompt"),
    status: StoryStatusSchema.default("draft").describe("Story status"),
  })
  .merge(TimestampsSchema)
  .describe("Story");

// ============================================================================
// Beat Entity Schema
// ============================================================================

/**
 * Beat dialogue entry
 */
export const BeatDialogueSchema = z
  .object({
    characterId: IdSchema.optional(),
    characterName: z.string().optional(),
    text: z.string(),
  })
  .describe("Beat dialogue entry");

/**
 * Beat entity
 */
export const BeatSchema = z
  .object({
    id: IdSchema,
    storyId: IdSchema.describe("Parent story ID"),
    position: z.number().int().describe("Position in story"),
    actNumber: z.number().int().nullable().optional().describe("Act number"),
    beatType: BeatTypeSchema.nullable().optional().describe("Beat type"),
    visualDescription: z.string().describe("Visual description"),
    narrativeContext: z.string().nullable().optional().describe("Narrative context"),
    emotionalTone: z.string().nullable().optional().describe("Emotional tone"),
    characterIds: z.array(IdSchema).default([]).describe("Character IDs"),
    characterActions: z
      .record(z.string())
      .nullable()
      .optional()
      .describe("Character actions"),
    cameraAngle: z.string().nullable().optional().describe("Camera angle"),
    composition: z.string().nullable().optional().describe("Composition"),
    dialogue: z.array(BeatDialogueSchema).nullable().optional().describe("Dialogue"),
    narration: z.string().nullable().optional().describe("Narration"),
    sfx: z.string().nullable().optional().describe("Sound effects"),
    panelId: IdSchema.nullable().optional().describe("Linked panel ID"),
    generatedBy: z.string().nullable().optional().describe("LLM that generated this"),
  })
  .merge(TimestampsSchema)
  .describe("Beat");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create premise request body
 */
export const CreatePremiseSchema = z
  .object({
    projectId: IdSchema.describe("Project ID"),
    logline: z.string().min(1).describe("Story logline"),
    genre: z.string().optional(),
    tone: z.string().optional(),
    themes: z.array(z.string()).optional(),
    characterIds: z.array(IdSchema).optional(),
    setting: z.string().optional(),
    worldRules: z.array(z.string()).optional(),
    generatedBy: z.string().optional(),
    generationPrompt: z.string().optional(),
    status: PremiseStatusSchema.optional(),
  })
  .describe("Create premise request");

/**
 * Update premise request body
 */
export const UpdatePremiseSchema = CreatePremiseSchema.omit({ projectId: true })
  .partial()
  .describe("Update premise request");

/**
 * Create story request body
 */
export const CreateStorySchema = z
  .object({
    premiseId: IdSchema.describe("Premise ID"),
    title: z.string().min(1).describe("Story title"),
    synopsis: z.string().optional(),
    targetLength: z.number().int().positive().optional(),
    structure: StoryStructureSchema.optional(),
    structureNotes: z.record(z.string()).optional(),
    characterArcs: z.array(CharacterArcSchema).optional(),
    generatedBy: z.string().optional(),
    generationPrompt: z.string().optional(),
  })
  .describe("Create story request");

/**
 * Update story request body
 */
export const UpdateStorySchema = CreateStorySchema.omit({ premiseId: true })
  .partial()
  .describe("Update story request");

/**
 * Create beat request body
 */
export const CreateBeatSchema = z
  .object({
    storyId: IdSchema.describe("Story ID"),
    position: z.number().int().describe("Position in story"),
    actNumber: z.number().int().optional(),
    beatType: BeatTypeSchema.optional(),
    visualDescription: z.string().min(1).describe("Visual description"),
    narrativeContext: z.string().optional(),
    emotionalTone: z.string().optional(),
    characterIds: z.array(IdSchema).optional(),
    characterActions: z.record(z.string()).optional(),
    cameraAngle: z.string().optional(),
    composition: z.string().optional(),
    dialogue: z.array(BeatDialogueSchema).optional(),
    narration: z.string().optional(),
    sfx: z.string().optional(),
    generatedBy: z.string().optional(),
  })
  .describe("Create beat request");

/**
 * Update beat request body
 */
export const UpdateBeatSchema = CreateBeatSchema.omit({ storyId: true })
  .partial()
  .describe("Update beat request");

/**
 * Generate beats request body
 */
export const GenerateBeatsSchema = z
  .object({
    storyId: IdSchema.describe("Story ID"),
    count: z.number().int().positive().optional().describe("Number of beats to generate"),
  })
  .describe("Generate beats request");

/**
 * Convert beat to panel request body
 */
export const ConvertBeatToPanelSchema = z
  .object({
    beatId: IdSchema.describe("Beat ID"),
    storyboardId: IdSchema.describe("Target storyboard ID"),
    position: z.number().int().optional().describe("Position in storyboard"),
  })
  .describe("Convert beat to panel request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated premises response
 */
export const PaginatedPremisesSchema = createPaginatedSchema(
  PremiseSchema,
  "Premises"
);

/**
 * Paginated stories response
 */
export const PaginatedStoriesSchema = createPaginatedSchema(
  StorySchema,
  "Stories"
);

/**
 * Paginated beats response
 */
export const PaginatedBeatsSchema = createPaginatedSchema(
  BeatSchema,
  "Beats"
);

/**
 * Story with beats response
 */
export const StoryWithBeatsSchema = StorySchema.extend({
  beats: z.array(BeatSchema).describe("Array of beats"),
}).describe("Story with beats");

// ============================================================================
// Type Exports
// ============================================================================

export type Premise = z.infer<typeof PremiseSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Beat = z.infer<typeof BeatSchema>;
