#!/usr/bin/env node
/**
 * MCP-only entry point for npx usage.
 * Sets MCP_MODE=stdio and starts the server with REST disabled.
 *
 * Uses dynamic import() so env vars are guaranteed to be set before
 * any module-level initialization in @graphix/core runs.
 *
 * Usage in Claude Desktop / VS Code:
 *   "command": "npx",
 *   "args": ["-y", "@graphix/server"]
 */
process.env.MCP_MODE = "stdio";
process.env.REST_ENABLED = "false";
process.env.ALLOW_LOCAL_OLLAMA = process.env.ALLOW_LOCAL_OLLAMA || "true";

const { startServer } = await import("./start.js");

startServer().catch((error) => {
  console.error("[MCP] Failed to start:", error);
  process.exit(1);
});
