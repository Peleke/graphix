/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas for API request bodies.
 * These schemas ensure data integrity at the API boundary.
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * ID validation - accepts both UUID and cuid2 formats
 * cuid2: alphanumeric string ~24 chars (e.g., "bjjjtxe5k8pbziaecqogx81w")
 * uuid: standard UUID format (e.g., "00000000-0000-0000-0000-000000000000")
 */
export const uuidSchema = z.string().min(1, "ID is required").refine(
  (val) => {
    // Accept UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(val)) return true;
    // Accept cuid2 format (21-24 char alphanumeric, starts with lowercase letter)
    const cuid2Regex = /^[a-z][a-z0-9]{20,23}$/;
    if (cuid2Regex.test(val)) return true;
    return false;
  },
  { message: "Invalid ID format" }
);

/** Non-empty string */
export const nonEmptyString = z.string().min(1, "Cannot be empty");

/** Optional string that becomes undefined if empty */
export const optionalString = z.string().optional().transform(val => val === "" ? undefined : val);

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative integer */
export const nonNegativeInt = z.number().int().nonnegative();

/** Pagination params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Project Schemas
// ============================================================================

export const createProjectSchema = z.object({
  name: nonEmptyString.max(255, "Name must be 255 characters or less"),
  description: optionalString,
  settings: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================================================
// Character Schemas
// ============================================================================

/** Valid body types for characters */
const VALID_BODY_TYPES = ["athletic", "slim", "muscular", "shortstack", "tall", "average"] as const;

export const characterProfileSchema = z.object({
  species: z.string().min(1, "Species is required"),
  bodyType: z.enum(VALID_BODY_TYPES).optional(),
  features: z.array(z.string()).optional(),
  ageDescriptors: z.array(z.string()).optional(),
  clothing: z.array(z.string()).optional(),
  distinguishing: z.array(z.string()).optional(),
});

export const promptFragmentsSchema = z.object({
  positive: optionalString,
  negative: optionalString,
  triggers: z.array(z.string()).optional(),
}).partial();

export const createCharacterSchema = z.object({
  projectId: uuidSchema,
  name: nonEmptyString.max(255),
  profile: characterProfileSchema.optional(),
  promptFragments: promptFragmentsSchema.optional(),
  referenceImages: z.array(z.string()).optional(),
});

export const updateCharacterSchema = z.object({
  name: nonEmptyString.max(255).optional(),
  profile: characterProfileSchema.optional(),
  promptFragments: promptFragmentsSchema.optional(),
});

export const addReferenceSchema = z.object({
  imagePath: nonEmptyString,
});

export const setLoraSchema = z.object({
  path: nonEmptyString,
  strength: z.number().min(0).max(2).optional(),
  strengthClip: z.number().min(0).max(2).optional(),
  trainingImages: z.number().int().positive(),
});

// ============================================================================
// Storyboard Schemas
// ============================================================================

export const createStoryboardSchema = z.object({
  projectId: uuidSchema,
  name: nonEmptyString.max(255),
  description: optionalString,
  lightingConfig: z.record(z.unknown()).optional(),
});

export const updateStoryboardSchema = z.object({
  name: nonEmptyString.max(255).optional(),
  description: optionalString,
  lightingConfig: z.record(z.unknown()).optional(),
});

// ============================================================================
// Panel Schemas
// ============================================================================

export const panelDirectionSchema = z.object({
  cameraAngle: z.string().optional(),
  mood: z.string().optional(),
  lighting: z.string().optional(),
}).partial();

export const createPanelSchema = z.object({
  storyboardId: uuidSchema,
  description: optionalString,
  position: nonNegativeInt.optional(),
  direction: panelDirectionSchema.optional(),
  characterIds: z.array(uuidSchema).optional(),
});

export const updatePanelSchema = z.object({
  description: optionalString,
  position: nonNegativeInt.optional(),
  direction: panelDirectionSchema.optional(),
  characterIds: z.array(uuidSchema).optional(),
  selectedOutputId: uuidSchema.optional().nullable(),
});

export const reorderPanelsSchema = z.object({
  panelIds: z.array(uuidSchema).min(1, "At least one panel ID required"),
});

// ============================================================================
// Generation Schemas
// ============================================================================

export const generateImageSchema = z.object({
  panelId: uuidSchema,
  prompt: optionalString,
  negativePrompt: optionalString,
  model: optionalString,
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  steps: z.number().int().min(1).max(150).optional(),
  cfg: z.number().min(1).max(30).optional(),
  seed: z.number().int().optional(),
  sampler: optionalString,
  scheduler: optionalString,
  variantCount: z.number().int().min(1).max(10).optional(),
  loras: z.array(z.object({
    name: nonEmptyString,
    strength: z.number().min(0).max(2).optional(),
    strengthClip: z.number().min(0).max(2).optional(),
  })).optional(),
  useControlNet: z.boolean().optional(),
  controlNetImage: optionalString,
  controlNetType: optionalString,
  useIPAdapter: z.boolean().optional(),
  ipAdapterImages: z.array(z.string()).optional(),
});

export const regenerateImageSchema = z.object({
  imageId: uuidSchema,
  preserveSeed: z.boolean().optional(),
  adjustments: z.object({
    prompt: optionalString,
    negativePrompt: optionalString,
    cfg: z.number().min(1).max(30).optional(),
    steps: z.number().int().min(1).max(150).optional(),
  }).optional(),
});

// ============================================================================
// Caption Schemas
// ============================================================================

export const captionTypeSchema = z.enum([
  "dialogue",
  "thought",
  "narration",
  "sfx",
  "caption",
]);

export const captionStyleSchema = z.enum([
  "normal",
  "bold",
  "italic",
  "whisper",
  "shout",
  "electronic",
]);

export const captionPositionSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "auto",
]);

export const createCaptionSchema = z.object({
  panelId: uuidSchema,
  text: nonEmptyString.max(2000, "Caption text must be 2000 characters or less"),
  type: captionTypeSchema.optional(),
  style: captionStyleSchema.optional(),
  position: captionPositionSchema.optional(),
  characterId: uuidSchema.optional().nullable(),
  orderIndex: nonNegativeInt.optional(),
  enabled: z.boolean().optional(),
});

export const updateCaptionSchema = z.object({
  text: nonEmptyString.max(2000).optional(),
  type: captionTypeSchema.optional(),
  style: captionStyleSchema.optional(),
  position: captionPositionSchema.optional(),
  characterId: uuidSchema.optional().nullable(),
  orderIndex: nonNegativeInt.optional(),
  enabled: z.boolean().optional(),
});

// ============================================================================
// Batch Schemas
// ============================================================================

export const batchGenerateSchema = z.object({
  panelIds: z.array(uuidSchema).min(1).max(50, "Maximum 50 panels per batch"),
  options: z.object({
    model: optionalString,
    steps: z.number().int().min(1).max(150).optional(),
    cfg: z.number().min(1).max(30).optional(),
    variantCount: z.number().int().min(1).max(4).optional(),
  }).optional(),
});

// ============================================================================
// Text Generation Schemas
// ============================================================================

export const textGenerateSchema = z.object({
  prompt: nonEmptyString.max(10000, "Prompt must be 10000 characters or less"),
  systemPrompt: optionalString,
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(16000).optional(),
});

export const textProviderSchema = z.object({
  provider: z.enum(["ollama", "claude", "openai"]),
});

// ============================================================================
// Review Schemas
// ============================================================================

export const reviewDecisionSchema = z.object({
  imageId: uuidSchema,
  decision: z.enum(["approve", "reject", "regenerate"]),
  feedback: optionalString,
});

// ============================================================================
// ID Param Schemas
// ============================================================================

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const projectIdParamSchema = z.object({
  projectId: uuidSchema,
});

export const panelIdParamSchema = z.object({
  panelId: uuidSchema,
});

export const storyboardIdParamSchema = z.object({
  storyboardId: uuidSchema,
});

export const characterIdParamSchema = z.object({
  characterId: uuidSchema,
});

export const captionIdParamSchema = z.object({
  captionId: uuidSchema,
});

export const imageIdParamSchema = z.object({
  imageId: uuidSchema,
});

export const storyIdParamSchema = z.object({
  storyId: uuidSchema,
});

export const premiseIdParamSchema = z.object({
  premiseId: uuidSchema,
});

export const seedParamSchema = z.object({
  seed: z.coerce.number().int(),
});

// Combined param schemas for nested routes
export const panelCaptionParamSchema = z.object({
  panelId: uuidSchema,
  captionId: uuidSchema,
});

export const idCharacterIdParamSchema = z.object({
  id: uuidSchema,
  characterId: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type CreateCharacter = z.infer<typeof createCharacterSchema>;
export type UpdateCharacter = z.infer<typeof updateCharacterSchema>;
export type CreateStoryboard = z.infer<typeof createStoryboardSchema>;
export type UpdateStoryboard = z.infer<typeof updateStoryboardSchema>;
export type CreatePanel = z.infer<typeof createPanelSchema>;
export type UpdatePanel = z.infer<typeof updatePanelSchema>;
export type GenerateImage = z.infer<typeof generateImageSchema>;
export type CreateCaption = z.infer<typeof createCaptionSchema>;
export type UpdateCaption = z.infer<typeof updateCaptionSchema>;
export type Pagination = z.infer<typeof paginationSchema>;

// ============================================================================
// Pagination Response Helper
// ============================================================================

/**
 * Standard paginated response structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    count: number;
    total?: number;
    hasMore: boolean;
  };
}

/**
 * Create a paginated response.
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total?: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      count: data.length,
      ...(total !== undefined && { total }),
      hasMore: data.length === limit,
    },
  };
}
