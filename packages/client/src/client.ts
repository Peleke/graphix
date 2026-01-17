/**
 * Graphix API Client
 *
 * Type-safe HTTP client for the Graphix API.
 * Built with openapi-fetch for full TypeScript inference.
 */

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema.js";
import type { ApiError } from "./types.js";

// ============================================================================
// Client Configuration
// ============================================================================

export interface ClientOptions {
  /** Base URL for the API (default: "/api") */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** Request headers */
  headers?: HeadersInit;
  /** Request timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// Error Handling
// ============================================================================

/** API error class with typed error response */
export class GraphixApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(status: number, errorResponse: ApiError) {
    super(errorResponse.error.message);
    this.name = "GraphixApiError";
    this.status = status;
    this.code = errorResponse.error.code;
    this.requestId = errorResponse.requestId;
    this.details = errorResponse.error.details;
    this.timestamp = errorResponse.timestamp;
  }
}

/** Check if an error is a GraphixApiError */
export function isGraphixApiError(error: unknown): error is GraphixApiError {
  return error instanceof GraphixApiError;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create a type-safe Graphix API client
 *
 * @example
 * ```ts
 * const client = createGraphixClient({ baseUrl: "http://localhost:3000/api" });
 *
 * // List projects with pagination
 * const { data, error } = await client.GET("/projects", {
 *   params: { query: { page: 1, limit: 10 } }
 * });
 *
 * // Create a project
 * const { data, error } = await client.POST("/projects", {
 *   body: { name: "My Project", description: "A cool project" }
 * });
 *
 * // Get a specific project
 * const { data, error } = await client.GET("/projects/{id}", {
 *   params: { path: { id: "abc123" } }
 * });
 * ```
 */
export function createGraphixClient(options: ClientOptions = {}) {
  const { baseUrl = "/api", fetch: customFetch, headers, timeout } = options;

  const client = createClient<paths>({
    baseUrl,
    fetch: customFetch,
    headers,
  });

  // Add timeout middleware if specified
  if (timeout) {
    const timeoutMiddleware: Middleware = {
      async onRequest({ request }) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Store the timeout ID for cleanup
        (request as any).__timeoutId = timeoutId;

        return new Request(request, { signal: controller.signal });
      },
      async onResponse({ response, request }) {
        // Clean up the timeout
        const timeoutId = (request as any).__timeoutId;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        return response;
      },
    };
    client.use(timeoutMiddleware);
  }

  return client;
}

// ============================================================================
// Pre-configured Client Instance
// ============================================================================

/** Default client instance (can be reconfigured) */
let defaultClient: ReturnType<typeof createGraphixClient> | null = null;

/**
 * Get the default client instance
 *
 * Creates a client with default options on first call.
 * Use `configureDefaultClient` to customize.
 */
export function getDefaultClient() {
  if (!defaultClient) {
    defaultClient = createGraphixClient();
  }
  return defaultClient;
}

/**
 * Configure the default client instance
 *
 * @example
 * ```ts
 * configureDefaultClient({
 *   baseUrl: "http://localhost:3000/api",
 *   timeout: 30000,
 * });
 * ```
 */
export function configureDefaultClient(options: ClientOptions) {
  defaultClient = createGraphixClient(options);
  return defaultClient;
}

// ============================================================================
// Type Exports
// ============================================================================

/** The type of the Graphix API client */
export type GraphixClient = ReturnType<typeof createGraphixClient>;
