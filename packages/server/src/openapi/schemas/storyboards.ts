/**
 * Storyboard OpenAPI Schemas
 *
 * Schemas for storyboard-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  createStoryboardSchema,
  updateStoryboardSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// Storyboard Entity Schema
// ============================================================================

/**
 * Storyboard entity
 */
export const StoryboardSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema.describe("Parent project ID"),
    name: z.string().describe("Storyboard name"),
    description: z.string().nullable().describe("Optional storyboard description"),
    lightingConfig: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Scene lighting configuration (JSON)"),
  })
  .merge(TimestampsSchema)
  .describe("Storyboard");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create storyboard request body
 */
export const CreateStoryboardSchema = createStoryboardSchema
  .describe("Create storyboard request");

/**
 * Update storyboard request body
 */
export const UpdateStoryboardSchema = updateStoryboardSchema
  .describe("Update storyboard request");

/**
 * Duplicate storyboard request body
 */
export const DuplicateStoryboardSchema = z
  .object({
    name: z.string().min(1).max(255).optional().describe("New name for duplicated storyboard"),
  })
  .describe("Duplicate storyboard request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated storyboards response
 */
export const PaginatedStoryboardsSchema = createPaginatedSchema(
  StoryboardSchema,
  "Storyboards"
);

/**
 * Storyboards list response (by project)
 */
export const StoryboardsListResponseSchema = z
  .object({
    storyboards: z.array(StoryboardSchema),
  })
  .describe("List of storyboards for a project");

/**
 * Storyboard with panels response
 */
export const StoryboardWithPanelsSchema = StoryboardSchema.extend({
  panels: z.array(z.any()).describe("Array of panels in this storyboard"),
}).describe("Storyboard with panels");

// ============================================================================
// Type Exports
// ============================================================================

export type Storyboard = z.infer<typeof StoryboardSchema>;
export type CreateStoryboard = z.infer<typeof CreateStoryboardSchema>;
export type UpdateStoryboard = z.infer<typeof UpdateStoryboardSchema>;
