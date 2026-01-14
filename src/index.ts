#!/usr/bin/env bun

/**
 * Graphix - GenAI Art + Video Workflow System
 *
 * Entry point that starts both MCP and REST servers.
 */

import { config } from "./config.js";

async function main() {
  console.log("Starting Graphix server...");
  console.log(`  Storage mode: ${config.storage.mode}`);
  console.log(`  REST enabled: ${config.server.restEnabled}`);
  console.log(`  MCP enabled: ${config.server.mcpEnabled}`);

  // TODO: Initialize database
  // TODO: Start REST server (Hono)
  // TODO: Start MCP server (if enabled)

  console.log("Graphix server ready");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
