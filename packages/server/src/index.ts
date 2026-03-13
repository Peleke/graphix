/**
 * @graphix/server
 *
 * MCP + REST server for graphix.
 * Wraps @graphix/core with transport adapters.
 */

// Re-export core for convenience
export * from "@graphix/core";

// MCP server
export * from "./mcp/index.js";

// REST server
export * from "./rest/index.js";

// Server startup
export { startServer } from "./start.js";
