#!/usr/bin/env node
/**
 * MCP-only entry point for npx usage.
 * Sets MCP_MODE=stdio and starts the server with REST disabled.
 *
 * Usage in Claude Desktop / VS Code:
 *   "command": "npx",
 *   "args": ["-y", "@graphix/server"]
 */
process.env.MCP_MODE = "stdio";
process.env.REST_ENABLED = "false";

import { startServer } from "./start.js";

startServer().catch((error) => {
  console.error("[MCP] Failed to start:", error);
  process.exit(1);
});
