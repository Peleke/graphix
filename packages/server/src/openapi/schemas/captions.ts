/**
 * Caption OpenAPI Schemas
 *
 * Schemas for caption-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  createCaptionSchema,
  updateCaptionSchema,
  captionTypeSchema,
  captionStyleSchema,
  captionPositionSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// Caption Type and Style Schemas
// ============================================================================

/**
 * Caption type enum
 */
export const CaptionTypeSchema = captionTypeSchema
  .describe("Caption type (dialogue, thought, narration, sfx, caption)");

/**
 * Caption style enum
 */
export const CaptionStyleSchema = captionStyleSchema
  .describe("Caption style (normal, bold, italic, whisper, shout, electronic)");

/**
 * Caption position enum
 */
export const CaptionPositionSchema = captionPositionSchema
  .describe("Caption position preset");

/**
 * Caption position object (x, y coordinates)
 */
export const CaptionPositionObjectSchema = z
  .object({
    x: z.number().min(0).max(100).describe("X position (0-100, percentage)"),
    y: z.number().min(0).max(100).describe("Y position (0-100, percentage)"),
  })
  .describe("Caption position coordinates");

/**
 * Caption style object
 */
export const CaptionStyleObjectSchema = z
  .record(z.unknown())
  .optional()
  .describe("Caption style configuration (JSON)");

// ============================================================================
// Caption Entity Schema
// ============================================================================

/**
 * Panel caption entity
 */
export const PanelCaptionSchema = z
  .object({
    id: IdSchema,
    panelId: IdSchema.describe("Parent panel ID"),
    type: CaptionTypeSchema.describe("Caption type"),
    text: z.string().describe("Caption text"),
    characterId: IdSchema.nullable().optional().describe("Character ID if dialogue/thought"),
    position: CaptionPositionObjectSchema.describe("Caption position"),
    tailDirection: CaptionPositionObjectSchema.optional().describe("Tail direction for speech bubbles"),
    style: CaptionStyleObjectSchema,
    zIndex: z.number().int().default(0).describe("Z-index for layering"),
    enabled: z.boolean().default(true).describe("Whether caption is enabled"),
    orderIndex: z.number().int().default(0).describe("Display order"),
    beatId: IdSchema.nullable().optional().describe("Beat ID if generated from beat"),
    generatedFromBeat: z.boolean().default(false).describe("Whether generated from beat"),
    manuallyEdited: z.boolean().default(false).describe("Whether manually edited"),
  })
  .merge(TimestampsSchema)
  .describe("Panel caption");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create caption request body
 */
export const CreateCaptionSchema = createCaptionSchema
  .describe("Create caption request");

/**
 * Update caption request body
 */
export const UpdateCaptionSchema = updateCaptionSchema
  .describe("Update caption request");

/**
 * Reorder captions request body
 */
export const ReorderCaptionsSchema = z
  .object({
    captionIds: z.array(IdSchema).min(1).describe("Array of caption IDs in desired order"),
  })
  .describe("Reorder captions request");

/**
 * Preview captions request body
 */
export const PreviewCaptionsSchema = z
  .object({
    imagePath: z.string().min(1).describe("Image path to preview"),
    outputPath: z.string().min(1).describe("Output path for preview"),
  })
  .describe("Preview captions request");

/**
 * Generate captions options
 */
export const GenerateCaptionsOptionsSchema = z
  .object({
    includeDialogue: z.boolean().optional().describe("Include dialogue captions"),
    includeNarration: z.boolean().optional().describe("Include narration captions"),
    includeSfx: z.boolean().optional().describe("Include sound effects"),
    defaultPositions: z
      .record(CaptionPositionObjectSchema)
      .optional()
      .describe("Default positions by caption type"),
  })
  .optional()
  .describe("Generate captions options");

/**
 * Render with captions request body
 */
export const RenderWithCaptionsSchema = z
  .object({
    imagePath: z.string().min(1).describe("Image path"),
    enabledOnly: z.boolean().optional().describe("Render only enabled captions"),
  })
  .describe("Render with captions request");

/**
 * Render captions direct request body
 */
export const RenderCaptionsDirectSchema = z
  .object({
    imagePath: z.string().min(1).describe("Image path"),
    outputPath: z.string().min(1).describe("Output path"),
    captions: z
      .array(
        z.object({
          type: z.string().describe("Caption type"),
          text: z.string().max(2000).describe("Caption text"),
          x: z.number().min(0).max(100).describe("X position"),
          y: z.number().min(0).max(100).describe("Y position"),
          tailX: z.number().min(0).max(100).optional().describe("Tail X"),
          tailY: z.number().min(0).max(100).optional().describe("Tail Y"),
          characterId: IdSchema.optional().describe("Character ID"),
          zIndex: z.number().int().optional().describe("Z-index"),
          fontSize: z.number().positive().optional().describe("Font size"),
          fontColor: z.string().optional().describe("Font color"),
          fontFamily: z.string().optional().describe("Font family"),
          fontWeight: z.enum(["normal", "bold"]).optional().describe("Font weight"),
          backgroundColor: z.string().optional().describe("Background color"),
          borderColor: z.string().optional().describe("Border color"),
          borderWidth: z.number().nonnegative().optional().describe("Border width"),
          opacity: z.number().min(0).max(1).optional().describe("Opacity"),
        })
      )
      .min(1)
      .describe("Array of captions to render"),
  })
  .describe("Render captions direct request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated captions response
 */
export const PaginatedCaptionsSchema = createPaginatedSchema(
  PanelCaptionSchema,
  "Captions"
);

/**
 * Captions list response (by panel)
 */
export const CaptionsListResponseSchema = z
  .object({
    captions: z.array(PanelCaptionSchema),
  })
  .describe("List of captions for a panel");

// ============================================================================
// Type Exports
// ============================================================================

export type PanelCaption = z.infer<typeof PanelCaptionSchema>;
export type CreateCaption = z.infer<typeof CreateCaptionSchema>;
export type UpdateCaption = z.infer<typeof UpdateCaptionSchema>;
