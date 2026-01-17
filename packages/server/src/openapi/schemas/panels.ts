/**
 * Panel OpenAPI Schemas
 *
 * Schemas for panel-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  createPanelSchema,
  updatePanelSchema,
  reorderPanelsSchema,
  panelDirectionSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// Panel Direction Schema
// ============================================================================

/**
 * Panel direction (camera angle, mood, lighting)
 */
export const PanelDirectionSchema = panelDirectionSchema
  .describe("Panel direction configuration");

// ============================================================================
// Panel Entity Schema
// ============================================================================

/**
 * Panel entity
 */
export const PanelSchema = z
  .object({
    id: IdSchema,
    storyboardId: IdSchema.describe("Parent storyboard ID"),
    position: z.number().int().describe("Position in storyboard"),
    description: z.string().nullable().describe("Panel description"),
    direction: PanelDirectionSchema.optional().nullable().describe("Panel direction"),
    characterIds: z
      .array(IdSchema)
      .default([])
      .describe("Array of character IDs in this panel"),
    selectedOutputId: IdSchema.nullable().optional().describe("Selected generation output ID"),
  })
  .merge(TimestampsSchema)
  .describe("Panel");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create panel request body
 */
export const CreatePanelSchema = createPanelSchema
  .describe("Create panel request");

/**
 * Update panel request body
 */
export const UpdatePanelSchema = updatePanelSchema
  .describe("Update panel request");

/**
 * Reorder panels request body
 */
export const ReorderPanelsSchema = reorderPanelsSchema
  .describe("Reorder panels request");

/**
 * Add character to panel request body
 */
export const AddCharacterSchema = z
  .object({
    characterId: IdSchema.describe("Character ID to add"),
  })
  .describe("Add character to panel request");

/**
 * Set characters for panel request body
 */
export const SetCharactersSchema = z
  .object({
    characterIds: z.array(IdSchema).describe("Array of character IDs"),
  })
  .describe("Set characters for panel request");

/**
 * Select output request body
 */
export const SelectOutputSchema = z
  .object({
    outputId: IdSchema.describe("Generation output ID to select"),
  })
  .describe("Select output request");

/**
 * Reorder panel request body
 */
export const ReorderPanelSchema = z
  .object({
    position: z.number().int().nonnegative().describe("New position"),
  })
  .describe("Reorder panel request");

/**
 * Recommend size request body
 */
export const RecommendSizeSchema = z
  .object({
    templateId: z.string().min(1).describe("Template ID"),
    slotId: z.string().min(1).describe("Slot ID"),
    pageSizePreset: z.string().optional().describe("Page size preset"),
    modelFamily: z.string().optional().describe("Model family"),
  })
  .describe("Recommend size request");

/**
 * Template sizes request body
 */
export const TemplateSizesSchema = z
  .object({
    templateId: z.string().min(1).describe("Template ID"),
    pageSizePreset: z.string().optional().describe("Page size preset"),
    modelFamily: z.string().optional().describe("Model family"),
  })
  .describe("Template sizes request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated panels response
 */
export const PaginatedPanelsSchema = createPaginatedSchema(
  PanelSchema,
  "Panels"
);

/**
 * Panels list response (by storyboard)
 */
export const PanelsListResponseSchema = z
  .object({
    panels: z.array(PanelSchema),
  })
  .describe("List of panels for a storyboard");

/**
 * Panel with generations response
 */
export const PanelWithGenerationsSchema = PanelSchema.extend({
  generations: z.array(z.any()).describe("Array of generations for this panel"),
}).describe("Panel with generations");

// ============================================================================
// Type Exports
// ============================================================================

export type Panel = z.infer<typeof PanelSchema>;
export type CreatePanel = z.infer<typeof CreatePanelSchema>;
export type UpdatePanel = z.infer<typeof UpdatePanelSchema>;
