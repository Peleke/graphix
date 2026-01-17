/**
 * Common OpenAPI Schemas
 *
 * Shared schemas used across all API endpoints.
 * Uses standard Zod with .describe() for documentation.
 *
 * NOTE: These schemas MUST stay in sync with:
 * - rest/validation/schemas.ts (validation schemas)
 * - rest/errors/types.ts (error codes and response format)
 */

import { z } from "zod";

// ============================================================================
// ID Schemas
// ============================================================================

/**
 * ID parameter - accepts both UUID and cuid2 formats
 * NOTE: UUID is case-insensitive, cuid2 is case-SENSITIVE (lowercase only)
 */
export const IdSchema = z
  .string()
  .min(1)
  .refine(
    (val) => {
      // UUID: case-insensitive
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(val)) return true;
      // cuid2: case-SENSITIVE (lowercase only)
      const cuid2Regex = /^[a-z][a-z0-9]{20,23}$/;
      if (cuid2Regex.test(val)) return true;
      return false;
    },
    { message: "Invalid ID format" }
  )
  .describe("Unique identifier (UUID or cuid2 format)");

/**
 * ID path parameter schema
 */
export const IdParamSchema = z
  .object({
    id: IdSchema,
  })
  .describe("ID parameter");

// ============================================================================
// Pagination Schemas
// ============================================================================

/**
 * Pagination query parameters
 */
export const PaginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).describe("Page number (1-indexed)"),
    limit: z.coerce.number().int().min(1).max(100).default(20).describe("Items per page (max 100)"),
  })
  .describe("Pagination query parameters");

/**
 * Pagination response metadata
 */
export const PaginationMetaSchema = z
  .object({
    page: z.number().int().describe("Current page number"),
    limit: z.number().int().describe("Items per page"),
    count: z.number().int().describe("Number of items in current page"),
    total: z.number().int().optional().describe("Total number of items"),
    hasMore: z.boolean().describe("Whether more pages exist"),
  })
  .describe("Pagination metadata");

// ============================================================================
// Error Schemas - MUST match rest/errors/types.ts
// ============================================================================

/**
 * All supported error codes - keep in sync with ErrorCodes in types.ts
 */
export const ErrorCodeSchema = z.enum([
  // Validation Errors (400)
  "VALIDATION_ERROR",
  "INVALID_INPUT",
  "MISSING_REQUIRED_FIELD",
  "INVALID_FORMAT",

  // Resource Errors (404, 409)
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "INVALID_ID",

  // Business Logic Errors (400, 409)
  "LIMIT_EXCEEDED",
  "INVALID_STATE",
  "OPERATION_NOT_ALLOWED",

  // Authentication/Authorization (401, 403)
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",

  // File Operation Errors (400, 413)
  "FILE_TOO_LARGE",
  "INVALID_FILE_TYPE",
  "INVALID_MAGIC_BYTES",
  "FILE_NOT_FOUND",
  "SYMLINK_NOT_ALLOWED",
  "PATH_TRAVERSAL",

  // Service Errors (500, 503)
  "SERVICE_UNAVAILABLE",
  "TIMEOUT",
  "INTERNAL_ERROR",
  "DATABASE_ERROR",
  "EXTERNAL_SERVICE_ERROR",

  // Rate Limiting (429)
  "RATE_LIMIT_EXCEEDED",
]).describe("Machine-readable error code");

/**
 * Validation error details
 */
export const ValidationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])).describe("Path to the invalid field"),
    message: z.string().describe("Error message for this field"),
  })
  .describe("Validation issue");

/**
 * Error response body - MUST match ErrorResponse in types.ts
 */
export const ErrorSchema = z
  .object({
    error: z.object({
      message: z.string().describe("Human-readable error message"),
      code: ErrorCodeSchema,
      details: z
        .record(z.unknown())
        .optional()
        .describe("Additional error context"),
    }),
    requestId: z.string().describe("Unique request identifier for debugging"),
    timestamp: z.string().datetime().describe("ISO 8601 timestamp of the error"),
  })
  .describe("Error response");

/**
 * 400 Bad Request error
 */
export const BadRequestErrorSchema = ErrorSchema.describe("Bad Request error");

/**
 * 401 Unauthorized error
 */
export const UnauthorizedErrorSchema = ErrorSchema.describe("Unauthorized error");

/**
 * 403 Forbidden error
 */
export const ForbiddenErrorSchema = ErrorSchema.describe("Forbidden error");

/**
 * 404 Not Found error
 */
export const NotFoundErrorSchema = ErrorSchema.describe("Not Found error");

/**
 * 409 Conflict error
 */
export const ConflictErrorSchema = ErrorSchema.describe("Conflict error");

/**
 * 429 Rate Limit error
 */
export const RateLimitErrorSchema = ErrorSchema.describe("Rate Limit Exceeded error");

/**
 * 500 Internal Server error
 */
export const InternalErrorSchema = ErrorSchema.describe("Internal Server error");

// ============================================================================
// Timestamp Schemas
// ============================================================================

/**
 * ISO 8601 timestamp
 */
export const TimestampSchema = z.string().datetime().describe("ISO 8601 timestamp");

/**
 * Common entity timestamps
 */
export const TimestampsSchema = z.object({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// ============================================================================
// Helper for paginated responses
// ============================================================================

/**
 * Create a paginated response schema for a given item schema
 */
export function createPaginatedSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  name: string
) {
  return z
    .object({
      data: z.array(itemSchema),
      pagination: PaginationMetaSchema,
    })
    .describe(`Paginated ${name}`);
}
