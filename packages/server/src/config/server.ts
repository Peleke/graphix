/**
 * Server Configuration - Single Source of Truth
 *
 * All server-related configuration values should be accessed from here.
 * This ensures consistency across the codebase, scripts, and CI.
 */

/** Default port for the server */
export const DEFAULT_PORT = 3002;

/** Default host for the server */
export const DEFAULT_HOST = "localhost";

/**
 * Server configuration object
 *
 * @example
 * ```ts
 * import { SERVER_CONFIG } from "./config/server.js";
 * console.log(SERVER_CONFIG.baseUrl); // http://localhost:3002
 * ```
 */
export const SERVER_CONFIG = {
  /** Server port (from PORT env var or default) */
  port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),

  /** Server host (from HOST env var or default) */
  host: process.env.HOST || DEFAULT_HOST,

  /** Full base URL for the server */
  get baseUrl() {
    return `http://${this.host}:${this.port}`;
  },

  /** URL for the OpenAPI spec JSON */
  get specUrl() {
    return `${this.baseUrl}/api/docs/spec.json`;
  },

  /** URL for health check endpoint */
  get healthUrl() {
    return `${this.baseUrl}/health`;
  },

  /** URL for the API docs UI */
  get docsUrl() {
    return `${this.baseUrl}/api/docs`;
  },
} as const;

/**
 * Get server configuration with optional overrides
 *
 * @param overrides - Optional values to override defaults
 */
export function getServerConfig(overrides?: { port?: number; host?: string }) {
  const port = overrides?.port ?? SERVER_CONFIG.port;
  const host = overrides?.host ?? SERVER_CONFIG.host;

  return {
    port,
    host,
    baseUrl: `http://${host}:${port}`,
    specUrl: `http://${host}:${port}/api/docs/spec.json`,
    healthUrl: `http://${host}:${port}/health`,
    docsUrl: `http://${host}:${port}/api/docs`,
  };
}

export default SERVER_CONFIG;
