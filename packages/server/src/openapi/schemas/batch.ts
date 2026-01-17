/**
 * Batch Operations OpenAPI Schemas
 *
 * Schemas for batch operation-related API endpoints.
 */

import { z } from "zod";
import { IdSchema } from "./common.js";
import { batchGenerateSchema } from "../../rest/validation/schemas.js";

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Batch create panels request body
 */
export const BatchCreatePanelsSchema = z
  .object({
    storyboardId: IdSchema.describe("Storyboard ID"),
    panels: z
      .array(
        z.object({
          description: z.string().optional().describe("Panel description"),
          position: z.number().int().optional().describe("Panel position"),
          characterIds: z.array(IdSchema).optional().describe("Character IDs"),
          direction: z
            .object({
              cameraAngle: z.string().optional(),
              mood: z.string().optional(),
              lighting: z.string().optional(),
            })
            .optional()
            .describe("Panel direction"),
        })
      )
      .min(1)
      .describe("Array of panels to create"),
  })
  .describe("Batch create panels request");

/**
 * Batch delete panels request body
 */
export const BatchDeletePanelsSchema = z
  .object({
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs to delete"),
  })
  .describe("Batch delete panels request");

/**
 * Batch add captions request body
 */
export const BatchAddCaptionsSchema = z
  .object({
    captions: z
      .array(
        z.object({
          panelId: IdSchema.describe("Panel ID"),
          type: z.enum(["speech", "thought", "narration", "sfx", "whisper"]).describe("Caption type"),
          text: z.string().describe("Caption text"),
          position: z
            .object({
              x: z.number().describe("X position"),
              y: z.number().describe("Y position"),
              anchor: z.string().optional().describe("Position anchor"),
            })
            .describe("Caption position"),
          characterId: IdSchema.optional().describe("Character ID"),
          tailDirection: z
            .object({
              x: z.number(),
              y: z.number(),
            })
            .optional()
            .describe("Tail direction"),
          style: z.record(z.string(), z.unknown()).optional().describe("Caption style"),
          zIndex: z.number().int().optional().describe("Z-index"),
        })
      )
      .min(1)
      .describe("Array of captions to add"),
  })
  .describe("Batch add captions request");

/**
 * Batch clear captions request body
 */
export const BatchClearCaptionsSchema = z
  .object({
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs"),
  })
  .describe("Batch clear captions request");

/**
 * Batch generate request body
 */
export const BatchGenerateSchema = batchGenerateSchema
  .describe("Batch generate images request");

/**
 * Batch generate variants request body
 */
export const BatchGenerateVariantsSchema = z
  .object({
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs"),
    variantCount: z.number().int().min(1).max(10).optional().describe("Number of variants per panel"),
    options: z
      .object({
        sizePreset: z.string().optional(),
        qualityPreset: z.enum(["draft", "standard", "high", "ultra"]).optional(),
        model: z.string().optional(),
        seed: z.number().int().optional(),
        uploadToCloud: z.boolean().optional(),
      })
      .optional(),
    continueOnError: z.boolean().optional().describe("Continue on individual errors"),
  })
  .describe("Batch generate variants request");

/**
 * Batch render captions request body
 */
export const BatchRenderCaptionsSchema = z
  .object({
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs"),
    enabledOnly: z.boolean().optional().describe("Render only enabled captions"),
  })
  .describe("Batch render captions request");

/**
 * Batch select outputs request body
 */
export const BatchSelectOutputsSchema = z
  .object({
    selections: z
      .array(
        z.object({
          panelId: IdSchema.describe("Panel ID"),
          outputId: IdSchema.describe("Generation output ID to select"),
        })
      )
      .min(1)
      .describe("Array of panel-output selections"),
  })
  .describe("Batch select outputs request");

/**
 * Batch auto-select request body
 */
export const BatchAutoSelectSchema = z
  .object({
    panelIds: z.array(IdSchema).min(1).describe("Array of panel IDs"),
    criteria: z
      .object({
        preferRated: z.boolean().optional().describe("Prefer rated images"),
        minRating: z.number().int().min(1).max(5).optional().describe("Minimum rating"),
        preferFavorites: z.boolean().optional().describe("Prefer favorited images"),
      })
      .optional()
      .describe("Selection criteria"),
  })
  .describe("Batch auto-select outputs request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Batch operation result
 */
export const BatchOperationResultSchema = z
  .object({
    success: z.number().int().describe("Number of successful operations"),
    failed: z.number().int().describe("Number of failed operations"),
    errors: z
      .array(
        z.object({
          item: z.string().describe("Item identifier (panel ID, etc.)"),
          error: z.string().describe("Error message"),
        })
      )
      .optional()
      .describe("Array of errors"),
  })
  .describe("Batch operation result");

// ============================================================================
// Type Exports
// ============================================================================

export type BatchOperationResult = z.infer<typeof BatchOperationResultSchema>;
