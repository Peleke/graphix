/**
 * Graphix API Client Types
 *
 * Re-exports of generated OpenAPI types for convenient usage.
 * These types are auto-generated from the OpenAPI spec.
 */

import type { components, operations, paths } from "./schema.js";

// ============================================================================
// Schema Types
// ============================================================================

/** Project entity */
export type Project = components["schemas"]["Project"];

/** Create project request body */
export type CreateProject = components["schemas"]["CreateProject"];

/** Update project request body */
export type UpdateProject = components["schemas"]["UpdateProject"];

/** Pagination metadata */
export type PaginationMeta = components["schemas"]["PaginationMeta"];

/** Machine-readable error codes */
export type ErrorCode = components["schemas"]["ErrorCode"];

/** Standard error response */
export type ApiError = components["schemas"]["Error"];

// ============================================================================
// Operation Types
// ============================================================================

/** List projects operation */
export type ListProjectsOp = operations["listProjects"];

/** Create project operation */
export type CreateProjectOp = operations["createProject"];

/** Get project operation */
export type GetProjectOp = operations["getProject"];

/** Update project operation */
export type UpdateProjectOp = operations["updateProject"];

/** Delete project operation */
export type DeleteProjectOp = operations["deleteProject"];

/** Patch project operation */
export type PatchProjectOp = operations["patchProject"];

// ============================================================================
// Request/Response Types
// ============================================================================

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Paginated projects response */
export type PaginatedProjects = PaginatedResponse<Project>;

/** Pagination query parameters */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Extract success response type from an operation */
export type SuccessResponse<Op> = Op extends { responses: { 200: { content: { "application/json": infer R } } } }
  ? R
  : Op extends { responses: { 201: { content: { "application/json": infer R } } } }
    ? R
    : never;

/** Extract error response type from an operation */
export type ErrorResponse<Op> = Op extends { responses: infer R }
  ? R extends { 400: { content: { "application/json": infer E } } }
    ? E
    : R extends { 401: { content: { "application/json": infer E } } }
      ? E
      : R extends { 403: { content: { "application/json": infer E } } }
        ? E
        : R extends { 404: { content: { "application/json": infer E } } }
          ? E
          : R extends { 409: { content: { "application/json": infer E } } }
            ? E
            : R extends { 413: { content: { "application/json": infer E } } }
              ? E
              : R extends { 429: { content: { "application/json": infer E } } }
                ? E
                : R extends { 500: { content: { "application/json": infer E } } }
                  ? E
                  : R extends { 503: { content: { "application/json": infer E } } }
                    ? E
                    : never
  : never;

/** Extract request body type from an operation */
export type RequestBody<Op> = Op extends { requestBody: { content: { "application/json": infer R } } }
  ? R
  : never;

/** Extract path parameters type from an operation */
export type PathParams<Op> = Op extends { parameters: { path: infer P } } ? P : never;

/** Extract query parameters type from an operation */
export type QueryParams<Op> = Op extends { parameters: { query?: infer Q } } ? Q : never;

// Re-export the raw generated types for advanced usage
export type { components, operations, paths };
