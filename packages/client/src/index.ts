/**
 * @graphix/client
 *
 * Type-safe API client for the Graphix REST API.
 * Generated from OpenAPI specification with full TypeScript inference.
 *
 * @example
 * ```ts
 * import { createGraphixClient } from "@graphix/client";
 * import type { Project, CreateProject } from "@graphix/client/types";
 *
 * const client = createGraphixClient({ baseUrl: "http://localhost:3000/api" });
 *
 * // List projects with full type inference
 * const { data, error } = await client.GET("/projects", {
 *   params: { query: { page: 1, limit: 10 } }
 * });
 *
 * if (data) {
 *   // data.data is Project[]
 *   // data.pagination is PaginationMeta
 *   console.log(data.data);
 * }
 * ```
 */

// Client exports
export {
  createGraphixClient,
  getDefaultClient,
  configureDefaultClient,
  GraphixApiError,
  isGraphixApiError,
  type ClientOptions,
  type GraphixClient,
} from "./client.js";

// Type exports
export type {
  // Schema types
  Project,
  CreateProject,
  UpdateProject,
  PaginationMeta,
  ErrorCode,
  ApiError,
  // Response types
  PaginatedResponse,
  PaginatedProjects,
  PaginationQuery,
  // Utility types
  SuccessResponse,
  ErrorResponse,
  RequestBody,
  PathParams,
  QueryParams,
  // Raw generated types
  components,
  operations,
  paths,
} from "./types.js";
