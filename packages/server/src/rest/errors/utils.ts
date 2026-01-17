/**
 * Error Handling Utilities
 *
 * Standardized error creation and response helpers for consistent API errors.
 */

import type { Context } from "hono";
import {
  ErrorCodes,
  ErrorCodeToStatus,
  type ErrorCode,
  type ErrorResponse,
  type PartialSuccessResponse,
} from "./types.js";

// ============================================================================
// API Error Class
// ============================================================================

/**
 * Custom API error class for consistent error handling.
 * Throw this in routes to get standardized error responses.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = ErrorCodeToStatus[code] ?? 500;
    this.details = details;
  }

  /**
   * Create a validation error.
   */
  static validation(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(message, ErrorCodes.VALIDATION_ERROR, details);
  }

  /**
   * Create a not found error.
   */
  static notFound(resource: string, id?: string): ApiError {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    return new ApiError(message, ErrorCodes.NOT_FOUND, { resource, id });
  }

  /**
   * Create a forbidden error.
   */
  static forbidden(message = "Access denied"): ApiError {
    return new ApiError(message, ErrorCodes.FORBIDDEN);
  }

  /**
   * Create a limit exceeded error.
   */
  static limitExceeded(
    resource: string,
    current: number,
    max: number
  ): ApiError {
    return new ApiError(
      `Maximum ${max} ${resource} allowed`,
      ErrorCodes.LIMIT_EXCEEDED,
      { resource, current, max }
    );
  }

  /**
   * Create a service unavailable error.
   */
  static serviceUnavailable(service: string): ApiError {
    return new ApiError(
      `${service} is currently unavailable`,
      ErrorCodes.SERVICE_UNAVAILABLE,
      { service }
    );
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a standardized error response.
 */
export function createErrorResponse(
  c: Context,
  error: ApiError | Error,
  requestId?: string
): ErrorResponse {
  const id = requestId ?? c.get("requestId") ?? "unknown";

  if (error instanceof ApiError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
      requestId: id,
      timestamp: new Date().toISOString(),
    };
  }

  // Generic error
  return {
    error: {
      message: error.message || "An unexpected error occurred",
      code: ErrorCodes.INTERNAL_ERROR,
    },
    requestId: id,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send an error response with appropriate status code.
 */
export function errorResponse(
  c: Context,
  error: ApiError | Error,
  statusOverride?: number
) {
  const response = createErrorResponse(c, error);
  const status =
    statusOverride ??
    (error instanceof ApiError ? error.statusCode : 500);

  return c.json(response, status as any);
}

/**
 * Quick helpers for common error responses.
 */
export const errors = {
  notFound: (c: Context, resource: string, id?: string) =>
    errorResponse(c, ApiError.notFound(resource, id)),

  validation: (c: Context, message: string, details?: Record<string, unknown>) =>
    errorResponse(c, ApiError.validation(message, details)),

  forbidden: (c: Context, message?: string) =>
    errorResponse(c, ApiError.forbidden(message)),

  limitExceeded: (c: Context, resource: string, current: number, max: number) =>
    errorResponse(c, ApiError.limitExceeded(resource, current, max)),

  serviceUnavailable: (c: Context, service: string) =>
    errorResponse(c, ApiError.serviceUnavailable(service)),

  badRequest: (c: Context, message: string, code: ErrorCode = ErrorCodes.INVALID_INPUT) =>
    errorResponse(c, new ApiError(message, code)),

  internal: (c: Context, message = "Internal server error") =>
    errorResponse(c, new ApiError(message, ErrorCodes.INTERNAL_ERROR)),
};

// ============================================================================
// Partial Success Response
// ============================================================================

/**
 * Create a partial success response for batch operations (HTTP 207).
 */
export function createPartialSuccessResponse<T>(
  c: Context,
  results: Array<{ success: true; data: T } | { success: false; index: number; error: ApiError }>,
  requestId?: string
): PartialSuccessResponse<T> {
  const id = requestId ?? c.get("requestId") ?? "unknown";
  const data: T[] = [];
  const errors: PartialSuccessResponse<T>["errors"] = [];

  for (const result of results) {
    if (result.success) {
      data.push(result.data);
    } else {
      errors.push({
        index: result.index,
        error: {
          message: result.error.message,
          code: result.error.code,
        },
      });
    }
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    requestId: id,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a partial success response (HTTP 207 Multi-Status).
 */
export function partialSuccessResponse<T>(
  c: Context,
  results: Array<{ success: true; data: T } | { success: false; index: number; error: ApiError }>
) {
  const response = createPartialSuccessResponse(c, results);
  const status = response.success ? 200 : 207;
  return c.json(response, status);
}

// ============================================================================
// Error Inference from Exceptions
// ============================================================================

/**
 * Infer an ApiError from a generic error based on message patterns.
 * Use this as a fallback for errors not thrown as ApiError.
 */
export function inferApiError(error: Error): ApiError {
  const message = error.message.toLowerCase();

  // Not found patterns
  if (message.includes("not found") || message.includes("does not exist")) {
    return new ApiError(error.message, ErrorCodes.NOT_FOUND);
  }

  // Validation patterns
  if (
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("invalid") ||
    message.includes("cannot be")
  ) {
    return new ApiError(error.message, ErrorCodes.VALIDATION_ERROR);
  }

  // File patterns
  if (message.includes("file too large") || message.includes("exceeds maximum")) {
    return new ApiError(error.message, ErrorCodes.FILE_TOO_LARGE);
  }

  if (message.includes("file type") || message.includes("mime type")) {
    return new ApiError(error.message, ErrorCodes.INVALID_FILE_TYPE);
  }

  if (message.includes("path traversal") || message.includes("outside allowed")) {
    return new ApiError(error.message, ErrorCodes.PATH_TRAVERSAL);
  }

  if (message.includes("symlink")) {
    return new ApiError(error.message, ErrorCodes.SYMLINK_NOT_ALLOWED);
  }

  // Service patterns
  if (message.includes("unavailable") || message.includes("connection refused")) {
    return new ApiError(error.message, ErrorCodes.SERVICE_UNAVAILABLE);
  }

  if (message.includes("timeout") || message.includes("timed out")) {
    return new ApiError(error.message, ErrorCodes.TIMEOUT);
  }

  // Database patterns
  if (
    message.includes("database") ||
    message.includes("sqlite") ||
    message.includes("constraint")
  ) {
    return new ApiError(error.message, ErrorCodes.DATABASE_ERROR);
  }

  // Default to internal error
  return new ApiError(error.message, ErrorCodes.INTERNAL_ERROR);
}
