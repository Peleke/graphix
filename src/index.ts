#!/usr/bin/env bun

/**
 * Graphix - GenAI Art + Video Workflow System
 *
 * Entry point that starts both MCP and REST servers.
 */

import { serve } from "bun";
import { config } from "./config.js";
import { migrateDb, checkDbHealth } from "./db/client.js";
import { app } from "./api/rest/app.js";
import { startMCPServer } from "./api/mcp/index.js";

async function main() {
  console.log("Starting Graphix server...");
  console.log(`  Storage mode: ${config.storage.mode}`);
  console.log(`  REST enabled: ${config.server.restEnabled}`);
  console.log(`  MCP enabled: ${config.server.mcpEnabled}`);

  // Initialize database
  console.log("Initializing database...");
  await migrateDb();

  const health = await checkDbHealth();
  if (!health.connected) {
    throw new Error(`Database connection failed: ${health.error}`);
  }
  console.log(`  Database connected (${health.latencyMs}ms)`);

  // Start REST server
  if (config.server.restEnabled) {
    serve({
      fetch: app.fetch,
      port: config.server.port,
    });
    console.log(`  REST API listening on http://localhost:${config.server.port}`);
  }

  // Start MCP server (if enabled)
  if (config.server.mcpEnabled) {
    await startMCPServer();
  }

  console.log("Graphix server ready");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
