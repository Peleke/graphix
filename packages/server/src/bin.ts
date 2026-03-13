#!/usr/bin/env node
/**
 * CLI entry point for graphix-server.
 * Starts both REST API and MCP (if MCP_MODE=stdio).
 *
 * Uses dynamic import to ensure env vars are set before any
 * module-level initialization in @graphix/core runs.
 */
process.env.ALLOW_LOCAL_OLLAMA = process.env.ALLOW_LOCAL_OLLAMA || "true";

const { startServer } = await import("./start.js");

startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
