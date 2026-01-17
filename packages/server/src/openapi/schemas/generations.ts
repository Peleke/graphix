/**
 * Generation OpenAPI Schemas
 *
 * Schemas for generated image-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  generateImageSchema,
  regenerateImageSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// LoRA Configuration Schema
// ============================================================================

/**
 * LoRA configuration for generation
 */
export const LoraConfigSchema = z
  .object({
    name: z.string().describe("LoRA name"),
    strength: z.number().min(0).max(2).optional().describe("LoRA strength (0-2)"),
    strengthClip: z.number().min(0).max(2).optional().describe("CLIP strength (0-2)"),
  })
  .describe("LoRA configuration");

// ============================================================================
// Generation Entity Schema
// ============================================================================

/**
 * Review status enum
 */
export const ReviewStatusSchema = z
  .enum(["pending", "approved", "needs_work", "rejected", "human_review"])
  .describe("Review status");

/**
 * Generated image entity
 */
export const GeneratedImageSchema = z
  .object({
    id: IdSchema,
    panelId: IdSchema.describe("Parent panel ID"),
    localPath: z.string().describe("Local file path"),
    cloudUrl: z.string().nullable().optional().describe("Cloud storage URL"),
    thumbnailPath: z.string().nullable().optional().describe("Thumbnail path"),
    seed: z.number().int().describe("Random seed used for generation"),
    prompt: z.string().describe("Generation prompt"),
    negativePrompt: z.string().default("").describe("Negative prompt"),
    model: z.string().describe("Model name"),
    loras: z
      .array(LoraConfigSchema)
      .default([])
      .describe("Array of LoRA configurations"),
    steps: z.number().int().describe("Number of steps"),
    cfg: z.number().describe("CFG scale"),
    sampler: z.string().describe("Sampler name"),
    scheduler: z.string().default("normal").describe("Scheduler"),
    width: z.number().int().describe("Image width"),
    height: z.number().int().describe("Image height"),
    variantStrategy: z
      .string()
      .nullable()
      .optional()
      .describe("Variant strategy (seed, cfg, sampler, custom)"),
    variantIndex: z.number().int().nullable().optional().describe("Variant index"),
    usedIPAdapter: z.boolean().default(false).describe("Whether IP-Adapter was used"),
    ipAdapterImages: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("IP-Adapter image paths"),
    usedControlNet: z.boolean().default(false).describe("Whether ControlNet was used"),
    controlNetType: z.string().nullable().optional().describe("ControlNet type"),
    controlNetImage: z.string().nullable().optional().describe("ControlNet image path"),
    isSelected: z.boolean().default(false).describe("Whether this is the selected output"),
    isFavorite: z.boolean().default(false).describe("Whether this is favorited"),
    rating: z.number().int().min(1).max(5).nullable().optional().describe("User rating (1-5)"),
    reviewStatus: ReviewStatusSchema.default("pending").describe("Review status"),
  })
  .merge(TimestampsSchema)
  .describe("Generated image");

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Generate image request body
 */
export const GenerateImageSchema = generateImageSchema
  .describe("Generate image request");

/**
 * Regenerate image request body
 */
export const RegenerateImageSchema = regenerateImageSchema
  .describe("Regenerate image request");

/**
 * Set rating request body
 */
export const SetRatingSchema = z
  .object({
    rating: z.number().int().min(1).max(5).describe("Rating (1-5)"),
  })
  .describe("Set rating request");

/**
 * Set cloud URL request body
 */
export const SetCloudUrlSchema = z
  .object({
    cloudUrl: z.string().min(1).describe("Cloud storage URL"),
  })
  .describe("Set cloud URL request");

/**
 * Set thumbnail request body
 */
export const SetThumbnailSchema = z
  .object({
    thumbnailPath: z.string().min(1).describe("Thumbnail path"),
  })
  .describe("Set thumbnail request");

/**
 * Create generation request body (manual creation)
 */
export const CreateGenerationSchema = z
  .object({
    panelId: IdSchema.describe("Panel ID"),
    localPath: z.string().min(1).describe("Local file path"),
    cloudUrl: z.string().optional().describe("Cloud storage URL"),
    thumbnailPath: z.string().optional().describe("Thumbnail path"),
    seed: z.number().int().describe("Random seed"),
    prompt: z.string().describe("Generation prompt"),
    negativePrompt: z.string().optional().describe("Negative prompt"),
    model: z.string().describe("Model name"),
    loras: z.array(LoraConfigSchema).optional().describe("LoRA configurations"),
    steps: z.number().int().describe("Number of steps"),
    cfg: z.number().describe("CFG scale"),
    sampler: z.string().describe("Sampler name"),
    scheduler: z.string().optional().describe("Scheduler"),
    width: z.number().int().describe("Image width"),
    height: z.number().int().describe("Image height"),
    variantStrategy: z.string().optional().describe("Variant strategy"),
    variantIndex: z.number().int().optional().describe("Variant index"),
    usedIPAdapter: z.boolean().optional().describe("Whether IP-Adapter was used"),
    ipAdapterImages: z.array(z.string()).optional().describe("IP-Adapter image paths"),
    usedControlNet: z.boolean().optional().describe("Whether ControlNet was used"),
    controlNetType: z.string().optional().describe("ControlNet type"),
    controlNetImage: z.string().optional().describe("ControlNet image path"),
  })
  .describe("Create generation request (manual)");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated generations response
 */
export const PaginatedGenerationsSchema = createPaginatedSchema(
  GeneratedImageSchema,
  "Generations"
);

/**
 * Generations list response (by panel)
 */
export const GenerationsListResponseSchema = z
  .object({
    generations: z.array(GeneratedImageSchema),
  })
  .describe("List of generations for a panel");

// ============================================================================
// Type Exports
// ============================================================================

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;
export type GenerateImage = z.infer<typeof GenerateImageSchema>;
export type RegenerateImage = z.infer<typeof RegenerateImageSchema>;
