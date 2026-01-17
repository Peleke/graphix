/**
 * Story Scaffold OpenAPI Schemas
 *
 * Schemas for story scaffold-related API endpoints.
 */

import { z } from "zod";
import { IdSchema } from "./common.js";

// ============================================================================
// Story Structure Schemas
// ============================================================================

/**
 * Panel direction for scaffolding
 */
export const ScaffoldDirectionSchema = z
  .object({
    cameraAngle: z.string().optional(),
    mood: z.string().optional(),
    lighting: z.string().optional(),
  })
  .partial()
  .optional()
  .describe("Panel direction");

/**
 * Panel input for scaffolding
 */
export const ScaffoldPanelSchema = z
  .object({
    description: z.string().describe("Panel description"),
    characterNames: z.array(z.string()).optional().describe("Character names in panel"),
    direction: ScaffoldDirectionSchema,
  })
  .describe("Panel input");

/**
 * Scene input for scaffolding
 */
export const ScaffoldSceneSchema = z
  .object({
    name: z.string().min(1).describe("Scene name"),
    description: z.string().optional().describe("Scene description"),
    panels: z.array(ScaffoldPanelSchema).describe("Array of panels in scene"),
  })
  .describe("Scene input");

/**
 * Act input for scaffolding
 */
export const ScaffoldActSchema = z
  .object({
    name: z.string().min(1).describe("Act name"),
    description: z.string().optional().describe("Act description"),
    scenes: z.array(ScaffoldSceneSchema).describe("Array of scenes in act"),
  })
  .describe("Act input");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Scaffold story request body
 */
export const ScaffoldStorySchema = z
  .object({
    projectId: IdSchema.describe("Project ID"),
    title: z.string().min(1).describe("Story title"),
    description: z.string().optional().describe("Story description"),
    characterNames: z.array(z.string()).optional().describe("Character names"),
    acts: z.array(ScaffoldActSchema).describe("Array of acts"),
  })
  .describe("Scaffold story request");

/**
 * Create story from outline request body
 */
export const FromOutlineSchema = z
  .object({
    projectId: IdSchema.describe("Project ID"),
    outline: z.string().min(1).describe("Story outline (markdown format)"),
  })
  .describe("Create story from outline request");

/**
 * Parse outline request body
 */
export const ParseOutlineSchema = z
  .object({
    outline: z.string().min(1).describe("Story outline to parse"),
  })
  .describe("Parse outline request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Scaffold result response
 */
export const ScaffoldResultSchema = z
  .object({
    success: z.boolean().describe("Whether scaffold succeeded"),
    storyId: z.string().optional().describe("Created story ID"),
    storyboardId: z.string().optional().describe("Created storyboard ID"),
    error: z.string().optional().describe("Error message if failed"),
  })
  .describe("Scaffold result");

/**
 * Parse outline response
 */
export const ParseOutlineResponseSchema = z
  .object({
    parsed: z.boolean().describe("Whether parsing succeeded"),
    acts: z.array(ScaffoldActSchema).describe("Parsed acts"),
    characterNames: z.array(z.string()).describe("Extracted character names"),
    summary: z
      .object({
        actCount: z.number().int(),
        sceneCount: z.number().int(),
        panelCount: z.number().int(),
        characterCount: z.number().int(),
      })
      .describe("Summary statistics"),
  })
  .describe("Parse outline response");

// ============================================================================
// Type Exports
// ============================================================================

export type ScaffoldStory = z.infer<typeof ScaffoldStorySchema>;
export type FromOutline = z.infer<typeof FromOutlineSchema>;
export type ParseOutline = z.infer<typeof ParseOutlineSchema>;
