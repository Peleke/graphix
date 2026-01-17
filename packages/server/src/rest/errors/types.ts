/**
 * Standardized Error Types
 *
 * Consistent error codes and HTTP status mappings for the REST API.
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Standard error codes for consistent client handling.
 */
export const ErrorCodes = {
  // Validation Errors (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Resource Errors (404, 409)
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  INVALID_ID: "INVALID_ID",

  // Business Logic Errors (400, 409)
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  INVALID_STATE: "INVALID_STATE",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",

  // Authentication/Authorization (401, 403)
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // File Operation Errors (400, 413)
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  INVALID_MAGIC_BYTES: "INVALID_MAGIC_BYTES",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  SYMLINK_NOT_ALLOWED: "SYMLINK_NOT_ALLOWED",
  PATH_TRAVERSAL: "PATH_TRAVERSAL",

  // Service Errors (500, 503)
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// HTTP Status Codes
// ============================================================================

/**
 * Map error codes to HTTP status codes.
 */
export const ErrorCodeToStatus: Record<ErrorCode, number> = {
  // Validation -> 400
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.INVALID_ID]: 400,

  // Not Found -> 404
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.FILE_NOT_FOUND]: 404,

  // Conflict -> 409
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.INVALID_STATE]: 409,

  // Business Logic -> 400
  [ErrorCodes.LIMIT_EXCEEDED]: 400,
  [ErrorCodes.OPERATION_NOT_ALLOWED]: 400,

  // Auth -> 401/403
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,

  // File -> 400/413
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 400,
  [ErrorCodes.INVALID_MAGIC_BYTES]: 400,
  [ErrorCodes.SYMLINK_NOT_ALLOWED]: 400,
  [ErrorCodes.PATH_TRAVERSAL]: 400,

  // Service -> 500/503
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,

  // Rate Limit -> 429
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
};

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response body.
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
}

/**
 * Partial success response for batch operations.
 */
export interface PartialSuccessResponse<T> {
  success: boolean;
  data: T[];
  errors: Array<{
    index: number;
    error: {
      message: string;
      code: ErrorCode;
    };
  }>;
  requestId: string;
  timestamp: string;
}
