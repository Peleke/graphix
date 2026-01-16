#!/usr/bin/env bun

/**
 * Graphix - GenAI Art + Video Workflow System
 *
 * Legacy entry point that re-exports from @graphix/server.
 * For new code, import directly from @graphix/core or @graphix/server.
 *
 * This file exists for backwards compatibility with existing workflows.
 */

// Re-export everything from core for programmatic use
export * from "@graphix/core";

// Re-export server components
export { startServer } from "@graphix/server";

// Default export: start the server
import { startServer } from "@graphix/server";

async function main() {
  await startServer();
}

// Only run if this is the entry point (not imported)
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
