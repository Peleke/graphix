#!/usr/bin/env node
/**
 * CLI entry point for graphix-server.
 * Starts both REST API and MCP (if MCP_MODE=stdio).
 */
import { startServer } from "./start.js";

startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
