/**
 * Text Generation & Generated Text OpenAPI Schemas
 *
 * Schemas for text generation and generated text storage API endpoints.
 * Combines text-generation.ts and generated-texts.ts routes.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";
import {
  textGenerateSchema,
  textProviderSchema,
} from "../../rest/validation/schemas.js";

// ============================================================================
// Text Type and Status Enums
// ============================================================================

/**
 * Generated text type enum
 */
export const GeneratedTextTypeSchema = z
  .enum([
    "panel_description",
    "dialogue",
    "caption",
    "narration",
    "refinement",
    "raw",
    "custom",
  ])
  .describe("Generated text type");

/**
 * Generated text status enum
 */
export const GeneratedTextStatusSchema = z
  .enum(["active", "archived", "superseded"])
  .describe("Generated text status");

/**
 * Text provider enum
 */
export const TextProviderSchema = z
  .enum(["ollama", "claude", "openai"])
  .describe("Text generation provider");

// ============================================================================
// Generated Text Entity Schema
// ============================================================================

/**
 * Generated text entity
 */
export const GeneratedTextSchema = z
  .object({
    id: IdSchema,
    panelId: IdSchema.nullable().optional().describe("Associated panel ID"),
    pageLayoutId: IdSchema.nullable().optional().describe("Associated page layout ID"),
    projectId: IdSchema.nullable().optional().describe("Associated project ID"),
    text: z.string().describe("Generated text content"),
    textType: GeneratedTextTypeSchema.describe("Text type"),
    provider: z.string().describe("Provider name"),
    model: z.string().describe("Model name"),
    tokensUsed: z.number().int().nullable().optional().describe("Total tokens used"),
    inputTokens: z.number().int().nullable().optional().describe("Input tokens"),
    outputTokens: z.number().int().nullable().optional().describe("Output tokens"),
    prompt: z.string().nullable().optional().describe("Prompt used"),
    systemPrompt: z.string().nullable().optional().describe("System prompt used"),
    temperature: z.number().nullable().optional().describe("Temperature setting"),
    maxTokens: z.number().int().nullable().optional().describe("Max tokens setting"),
    status: GeneratedTextStatusSchema.default("active").describe("Status"),
    isEdited: z.boolean().default(false).describe("Whether text was edited"),
    editedAt: z.string().datetime().nullable().optional().describe("Edit timestamp"),
    originalText: z.string().nullable().optional().describe("Original text before edits"),
    metadata: z.record(z.unknown()).nullable().optional().describe("Additional metadata"),
  })
  .merge(TimestampsSchema)
  .describe("Generated text");

// ============================================================================
// Text Generation Request Schemas
// ============================================================================

/**
 * Generate text request body
 */
export const GenerateTextSchema = textGenerateSchema
  .describe("Generate text request");

/**
 * Set provider request body
 */
export const SetProviderSchema = textProviderSchema
  .describe("Set text generation provider request");

/**
 * Panel description context
 */
export const PanelDescriptionContextSchema = z
  .object({
    setting: z.string().max(20000).optional(),
    action: z.string().max(20000).optional(),
    previousPanel: z.string().max(20000).optional(),
    characters: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .optional(),
    mood: z.string().optional(),
    cameraAngle: z.string().optional(),
    lighting: z.string().optional(),
  })
  .describe("Panel description context");

/**
 * Generate panel description request body
 */
export const GeneratePanelDescriptionSchema = z
  .object({
    context: PanelDescriptionContextSchema.describe("Panel description context"),
  })
  .describe("Generate panel description request");

/**
 * Dialogue context
 */
export const DialogueContextSchema = z
  .object({
    character: z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        personality: z.string().optional(),
      })
      .describe("Character information"),
    situation: z.string().min(1).max(20000).describe("Situation description"),
    emotion: z.string().optional(),
    previousDialogue: z
      .array(
        z.object({
          speaker: z.string(),
          text: z.string(),
        })
      )
      .optional(),
    dialogueType: z.enum(["speech", "thought", "whisper", "narration"]).optional(),
  })
  .describe("Dialogue context");

/**
 * Generate dialogue request body
 */
export const GenerateDialogueSchema = z
  .object({
    context: DialogueContextSchema.describe("Dialogue context"),
  })
  .describe("Generate dialogue request");

/**
 * Suggest captions request body
 */
export const SuggestCaptionsSchema = z
  .object({
    visualDescription: z.string().min(1).max(20000).describe("Visual description"),
    characters: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .optional(),
    includeDialogue: z.boolean().optional(),
    includeNarration: z.boolean().optional(),
    includeSfx: z.boolean().optional(),
  })
  .describe("Suggest captions request");

/**
 * Refine text context
 */
export const RefineTextContextSchema = z
  .object({
    originalText: z.string().min(1).describe("Original text"),
    feedback: z.string().max(10000).optional(),
    style: z.string().optional(),
    tone: z.string().optional(),
    length: z.enum(["shorter", "longer", "same"]).optional(),
  })
  .describe("Refine text context");

/**
 * Refine text request body
 */
export const RefineTextSchema = z
  .object({
    context: RefineTextContextSchema.describe("Refinement context"),
  })
  .describe("Refine text request");

// ============================================================================
// Generated Text Request Schemas
// ============================================================================

/**
 * Create generated text request body
 */
export const CreateGeneratedTextSchema = z
  .object({
    panelId: IdSchema.optional().nullable(),
    pageLayoutId: IdSchema.optional().nullable(),
    projectId: IdSchema.optional().nullable(),
    text: z.string().min(1).max(500000).describe("Text content"),
    textType: GeneratedTextTypeSchema.describe("Text type"),
    provider: z.string().describe("Provider name"),
    model: z.string().describe("Model name"),
    tokensUsed: z.number().int().optional(),
    inputTokens: z.number().int().optional(),
    outputTokens: z.number().int().optional(),
    prompt: z.string().max(100000).optional(),
    systemPrompt: z.string().max(100000).optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().int().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .describe("Create generated text request");

/**
 * Update generated text request body
 */
export const UpdateGeneratedTextSchema = z
  .object({
    text: z.string().min(1).max(500000).optional(),
    status: GeneratedTextStatusSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .describe("Update generated text request");

/**
 * Regenerate text request body
 */
export const RegenerateTextSchema = z
  .object({
    prompt: z.string().max(100000).optional(),
    systemPrompt: z.string().max(100000).optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().int().optional(),
  })
  .describe("Regenerate text request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Paginated generated texts response
 */
export const PaginatedGeneratedTextsSchema = createPaginatedSchema(
  GeneratedTextSchema,
  "Generated Texts"
);

/**
 * Provider status response
 */
export const ProviderStatusSchema = z
  .object({
    provider: TextProviderSchema.describe("Current provider"),
    available: z.boolean().describe("Whether provider is available"),
    models: z.array(z.string()).optional().describe("Available models"),
  })
  .describe("Provider status");

/**
 * Generate text response
 */
export const GenerateTextResponseSchema = z
  .object({
    text: z.string().describe("Generated text"),
    tokensUsed: z.number().int().optional(),
    model: z.string().describe("Model used"),
  })
  .describe("Generate text response");

/**
 * Suggest captions response
 */
export const SuggestCaptionsResponseSchema = z
  .object({
    captions: z
      .array(
        z.object({
          type: z.string(),
          text: z.string(),
          characterId: IdSchema.optional(),
        })
      )
      .describe("Suggested captions"),
  })
  .describe("Suggest captions response");

/**
 * Generated text stats response
 */
export const GeneratedTextStatsSchema = z
  .object({
    total: z.number().int(),
    byType: z.record(z.number().int()),
    byStatus: z.record(z.number().int()),
    totalTokens: z.number().int().optional(),
  })
  .describe("Generated text statistics");

// ============================================================================
// Type Exports
// ============================================================================

export type GeneratedText = z.infer<typeof GeneratedTextSchema>;
export type CreateGeneratedText = z.infer<typeof CreateGeneratedTextSchema>;
export type UpdateGeneratedText = z.infer<typeof UpdateGeneratedTextSchema>;
