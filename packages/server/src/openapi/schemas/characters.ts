/**
 * Character OpenAPI Schemas
 *
 * Schemas for character-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  createCharacterSchema,
  updateCharacterSchema,
  addReferenceSchema,
  setLoraSchema,
  characterProfileSchema,
  promptFragmentsSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// Character Profile Schemas
// ============================================================================

/**
 * Character profile (species, body type, features, etc.)
 */
export const CharacterProfileSchema = characterProfileSchema
  .describe("Character profile with physical and visual attributes");

/**
 * Prompt fragments (positive, negative, triggers)
 */
export const PromptFragmentsSchema = promptFragmentsSchema
  .describe("Prompt fragments for character generation");

/**
 * Character LoRA configuration
 */
export const CharacterLoraSchema = z
  .object({
    path: z.string().describe("Path to LoRA file"),
    strength: z.number().min(0).max(2).describe("LoRA strength (0-2)"),
    strengthClip: z.number().min(0).max(2).optional().describe("CLIP strength (0-2)"),
    trainedAt: z.string().datetime().describe("ISO 8601 timestamp when LoRA was trained"),
    trainingImages: z.number().int().positive().describe("Number of training images used"),
  })
  .describe("Character LoRA configuration");

// ============================================================================
// Character Entity Schema
// ============================================================================

/**
 * Character entity
 */
export const CharacterSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema.describe("Parent project ID"),
    name: z.string().describe("Character name"),
    profile: CharacterProfileSchema.describe("Character profile"),
    promptFragments: PromptFragmentsSchema.describe("Prompt fragments"),
    referenceImages: z
      .array(z.string())
      .default([])
      .describe("Array of reference image paths"),
    lora: CharacterLoraSchema.nullable().optional().describe("LoRA configuration if set"),
  })
  .merge(TimestampsSchema)
  .describe("Character");

// ============================================================================
// Request Schemas (reuse validation schemas)
// ============================================================================

/**
 * Create character request body
 */
export const CreateCharacterSchema = createCharacterSchema
  .describe("Create character request");

/**
 * Update character request body
 */
export const UpdateCharacterSchema = updateCharacterSchema
  .describe("Update character request");

/**
 * Add reference image request body
 */
export const AddReferenceSchema = addReferenceSchema
  .describe("Add reference image request");

/**
 * Set LoRA request body
 */
export const SetLoraSchema = setLoraSchema.describe("Set LoRA request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated characters response
 */
export const PaginatedCharactersSchema = createPaginatedSchema(
  CharacterSchema,
  "Characters"
);

/**
 * Characters list response (by project)
 */
export const CharactersListResponseSchema = z
  .object({
    characters: z.array(CharacterSchema),
  })
  .describe("List of characters for a project");

/**
 * Upload reference image response
 */
export const UploadReferenceResponseSchema = z
  .object({
    originalPath: z.string().describe("Path to uploaded image"),
    thumbnailPath: z.string().optional().describe("Path to thumbnail if generated"),
    filename: z.string().describe("Saved filename"),
    originalFilename: z.string().describe("Original filename"),
    size: z.number().describe("File size in bytes"),
    mimeType: z.string().describe("MIME type"),
    dimensions: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional()
      .describe("Image dimensions if available"),
  })
  .describe("Upload reference image response");

// ============================================================================
// Type Exports
// ============================================================================

export type Character = z.infer<typeof CharacterSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
