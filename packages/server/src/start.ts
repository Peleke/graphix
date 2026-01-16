/**
 * Server Startup
 *
 * Initializes database, config, and starts MCP + REST servers.
 */

import {
  createDatabase,
  setDefaultDatabase,
  migrateDatabase,
  setConfig,
  createDefaultConfig,
  type GraphixConfig,
  type DatabaseConfig,
} from "@graphix/core";
import { serve } from "@hono/node-server";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./rest/app.js";
import { startMCPServer } from "./mcp/index.js";

// Compute absolute path to monorepo root for consistent db location
const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dirname, "../../..");
const DEFAULT_DB_PATH = resolve(MONOREPO_ROOT, "graphix.db");

/**
 * Load configuration from environment
 */
function loadConfigFromEnv(): GraphixConfig {
  const env = process.env;

  const databaseConfig: DatabaseConfig = {
    mode: (env.STORAGE_MODE || "sqlite") as "turso" | "sqlite" | "memory",
    tursoUrl: env.TURSO_URL,
    tursoToken: env.TURSO_AUTH_TOKEN,
    sqlitePath: env.SQLITE_PATH || DEFAULT_DB_PATH,
    verbose: env.DB_VERBOSE === "true",
  };

  return {
    storage: {
      database: databaseConfig,
      outputDir: env.OUTPUT_DIR || "./output",
    },
    comfyui: {
      baseUrl: env.COMFYUI_MCP_URL || "http://localhost:3001",
      apiKey: env.COMFYUI_API_KEY,
      apiSecret: env.COMFYUI_API_SECRET,
      defaultModel: env.COMFYUI_DEFAULT_MODEL || "yiffInHell_yihXXXTended.safetensors",
      timeout: parseInt(env.COMFYUI_TIMEOUT || "300000", 10),
    },
    cloudStorage: {
      provider: (env.CLOUD_STORAGE_PROVIDER || "local") as "gcp" | "supabase" | "local",
      bucket: env.CLOUD_STORAGE_BUCKET,
      localPath: env.LOCAL_STORAGE_PATH || "./output",
    },
    server: {
      port: parseInt(env.PORT || "3002", 10),
      mcpEnabled: env.MCP_ENABLED !== "false",
      restEnabled: env.REST_ENABLED !== "false",
    },
  };
}

/**
 * Start the Graphix server
 */
export async function startServer(configOverrides?: Partial<GraphixConfig>): Promise<void> {
  // Load config from environment and apply overrides
  const envConfig = loadConfigFromEnv();
  const config: GraphixConfig = {
    ...envConfig,
    ...configOverrides,
    storage: { ...envConfig.storage, ...configOverrides?.storage },
    comfyui: { ...envConfig.comfyui, ...configOverrides?.comfyui },
    cloudStorage: { ...envConfig.cloudStorage, ...configOverrides?.cloudStorage },
    server: { ...envConfig.server, ...configOverrides?.server },
  };

  // Set global config
  setConfig(config);

  // Initialize database
  console.error("[Server] Initializing database...");
  const connection = createDatabase(config.storage.database);
  setDefaultDatabase(connection);

  // Run migrations
  await migrateDatabase(connection.client);

  // Start REST server
  if (config.server.restEnabled) {
    console.error(`[Server] Starting REST API on port ${config.server.port}...`);
    serve({
      fetch: app.fetch,
      port: config.server.port,
    });
    console.error(`[REST] API available at http://localhost:${config.server.port}/api`);
  }

  // Start MCP server (stdio mode, typically run separately)
  if (config.server.mcpEnabled && process.env.MCP_MODE === "stdio") {
    console.error("[Server] Starting MCP server on stdio...");
    await startMCPServer();
  }

  console.error("[Server] Graphix server started successfully");
}

// Run if executed directly
startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
