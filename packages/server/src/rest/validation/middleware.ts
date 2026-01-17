/**
 * Validation Middleware
 *
 * Hono middleware for Zod validation with standardized error responses.
 */

import { zValidator } from "@hono/zod-validator";
import type { z, ZodSchema } from "zod";
import type { Context } from "hono";
import { ApiError, ErrorCodes } from "../errors/index.js";

/**
 * Format Zod errors into a readable structure.
 */
function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Create a validation middleware for JSON body.
 * Returns standardized error response on validation failure.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      const details = formatZodErrors(result.error);
      const firstError = result.error.issues[0];
      const message = firstError
        ? `${firstError.path.join(".") || "body"}: ${firstError.message}`
        : "Validation failed";

      throw new ApiError(message, ErrorCodes.VALIDATION_ERROR, {
        fields: details,
      });
    }
  });
}

/**
 * Create a validation middleware for query parameters.
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return zValidator("query", schema, (result, c) => {
    if (!result.success) {
      const details = formatZodErrors(result.error);
      const firstError = result.error.issues[0];
      const message = firstError
        ? `Query param ${firstError.path.join(".") || "query"}: ${firstError.message}`
        : "Invalid query parameters";

      throw new ApiError(message, ErrorCodes.VALIDATION_ERROR, {
        fields: details,
      });
    }
  });
}

/**
 * Create a validation middleware for route parameters.
 */
export function validateParam<T extends ZodSchema>(schema: T) {
  return zValidator("param", schema, (result, c) => {
    if (!result.success) {
      const details = formatZodErrors(result.error);
      const firstError = result.error.issues[0];
      const message = firstError
        ? `Invalid ${firstError.path[0] || "parameter"}: ${firstError.message}`
        : "Invalid route parameter";

      throw new ApiError(message, ErrorCodes.INVALID_ID, {
        fields: details,
      });
    }
  });
}

/**
 * Common ID parameter validation.
 * Use: validateId() for routes with :id parameter.
 */
export function validateId() {
  return validateParam(idParamSchema);
}

// Import at the end to avoid circular dependency
import { idParamSchema } from "./schemas.js";
