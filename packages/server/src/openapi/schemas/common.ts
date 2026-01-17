/**
 * Common OpenAPI Schemas
 *
 * Shared schemas used across all API endpoints.
 * Uses standard Zod with .describe() for documentation.
 */

import { z } from "zod";

// ============================================================================
// ID Schemas
// ============================================================================

/**
 * ID parameter - accepts both UUID and cuid2 formats
 */
export const IdSchema = z
  .string()
  .min(1)
  .regex(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z][a-z0-9]{20,23})$/i,
    "Invalid ID format"
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
// Error Schemas
// ============================================================================

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
 * Error response body
 */
export const ErrorSchema = z
  .object({
    error: z.object({
      message: z.string().describe("Human-readable error message"),
      code: z
        .enum(["VALIDATION_ERROR", "NOT_FOUND", "BAD_REQUEST", "INTERNAL_ERROR"])
        .describe("Machine-readable error code"),
      details: z
        .object({
          resource: z.string().optional(),
          id: z.string().optional(),
          issues: z.array(ValidationIssueSchema).optional(),
        })
        .optional()
        .describe("Additional error context"),
    }),
  })
  .describe("Error response");

/**
 * 400 Bad Request error
 */
export const BadRequestErrorSchema = ErrorSchema.describe("Bad Request error");

/**
 * 404 Not Found error
 */
export const NotFoundErrorSchema = ErrorSchema.describe("Not Found error");

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
