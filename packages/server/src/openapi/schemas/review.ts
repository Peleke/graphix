/**
 * Review OpenAPI Schemas
 *
 * Schemas for image review and regeneration-related API endpoints.
 */

import { z } from "zod";
import { IdSchema, createPaginatedSchema } from "./common.js";
import { ReviewStatusSchema } from "./generations.js";

// ============================================================================
// Review Status and Config Schemas
// ============================================================================

// Re-export ReviewStatusSchema from generations for consistency
export { ReviewStatusSchema };

/**
 * Review mode enum
 */
export const ReviewModeSchema = z
  .enum(["unattended", "hitl"])
  .describe("Review mode (unattended or human-in-the-loop)");

/**
 * Review config schema
 */
export const ReviewConfigSchema = z
  .object({
    mode: ReviewModeSchema.optional().describe("Review mode"),
    maxIterations: z.number().int().min(1).max(10).optional().describe("Maximum regeneration iterations"),
    minAcceptanceScore: z.number().min(0).max(1).optional().describe("Minimum acceptance score"),
    autoApproveAbove: z.number().min(0).max(1).optional().describe("Auto-approve above this score"),
    pauseForHumanBelow: z.number().min(0).max(1).optional().describe("Pause for human review below this score"),
  })
  .describe("Review configuration");

/**
 * Batch review options schema
 */
export const BatchReviewOptionsSchema = ReviewConfigSchema.extend({
  onlyPending: z.boolean().optional().describe("Only review pending images"),
  limit: z.number().int().min(1).max(1000).optional().describe("Maximum number of panels to review"),
  parallel: z.boolean().optional().describe("Process in parallel"),
  concurrency: z.number().int().min(1).max(10).optional().describe("Concurrency level"),
}).describe("Batch review options");

// ============================================================================
// Review Entity Schema
// ============================================================================

/**
 * Image review entity
 */
export const ImageReviewSchema = z
  .object({
    id: IdSchema,
    generatedImageId: IdSchema.describe("Reviewed image ID"),
    panelId: IdSchema.describe("Panel ID"),
    score: z.number().min(0).max(1).describe("Review score (0-1)"),
    status: ReviewStatusSchema.describe("Review status"),
    issues: z.string().nullable().optional().describe("Identified issues"),
    recommendation: z.string().nullable().optional().describe("Recommendation"),
    iteration: z.number().int().default(1).describe("Iteration number"),
    previousReviewId: IdSchema.nullable().optional().describe("Previous review ID"),
    reviewedBy: z.string().describe("Reviewer (AI or human ID)"),
    humanReviewerId: z.string().nullable().optional().describe("Human reviewer ID"),
    humanFeedback: z.string().nullable().optional().describe("Human feedback"),
    actionTaken: z.string().nullable().optional().describe("Action taken"),
    regeneratedImageId: IdSchema.nullable().optional().describe("Regenerated image ID"),
  })
  .merge(
    z.object({
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
  )
  .describe("Image review");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Review image request body
 */
export const ReviewImageSchema = z
  .object({
    prompt: z.string().max(20000).optional().describe("Prompt override"),
    context: z.record(z.unknown()).optional().describe("Additional context"),
  })
  .describe("Review image request");

/**
 * Batch review request body
 */
export const BatchReviewSchema = BatchReviewOptionsSchema
  .describe("Batch review request");

/**
 * Approve image request body
 */
export const ApproveImageSchema = z
  .object({
    feedback: z.string().max(10000).optional().describe("Optional feedback"),
  })
  .describe("Approve image request");

/**
 * Reject image request body
 */
export const RejectImageSchema = z
  .object({
    feedback: z.string().min(1).max(10000).describe("Rejection feedback (required)"),
  })
  .describe("Reject image request");

/**
 * Regenerate image request body (for review system)
 */
export const RegenerateImageReviewSchema = z
  .object({
    feedback: z.string().max(10000).optional().describe("Feedback for regeneration"),
    hints: z.string().max(5000).optional().describe("Regeneration hints"),
  })
  .describe("Regenerate image request (review system)");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Review result response
 */
export const ReviewResultSchema = z
  .object({
    review: ImageReviewSchema.describe("Review record"),
    regenerated: z.boolean().optional().describe("Whether image was regenerated"),
    newImageId: IdSchema.nullable().optional().describe("New image ID if regenerated"),
  })
  .describe("Review result");

/**
 * Batch review result response
 */
export const BatchReviewResultSchema = z
  .object({
    total: z.number().int().describe("Total panels reviewed"),
    approved: z.number().int().describe("Number approved"),
    needsWork: z.number().int().describe("Number needing work"),
    rejected: z.number().int().describe("Number rejected"),
    pendingHuman: z.number().int().describe("Number pending human review"),
    errors: z
      .array(
        z.object({
          panelId: IdSchema,
          error: z.string(),
        })
      )
      .optional()
      .describe("Errors encountered"),
  })
  .describe("Batch review result");

/**
 * Paginated review queue response
 */
export const PaginatedReviewQueueSchema = createPaginatedSchema(
  ImageReviewSchema,
  "Review Queue"
);

// ============================================================================
// Type Exports
// ============================================================================

export type ImageReview = z.infer<typeof ImageReviewSchema>;
export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;
export type BatchReviewResult = z.infer<typeof BatchReviewResultSchema>;
