/**
 * Graphix Configuration
 *
 * All configuration is environment-based for deployment flexibility.
 */

const env = process.env;

export const config = {
  // Storage mode
  storage: {
    mode: (env.STORAGE_MODE || "sqlite") as "turso" | "sqlite",
    tursoUrl: env.TURSO_URL,
    tursoToken: env.TURSO_AUTH_TOKEN,
    sqlitePath: env.SQLITE_PATH || "./graphix.db",
  },

  // ComfyUI MCP connection
  comfyui: {
    // Direct HTTP to comfyui-mcp REST server
    restUrl: env.COMFYUI_REST_URL || "http://localhost:3001",
  },

  // Cloud storage for generated images/videos
  cloudStorage: {
    provider: (env.CLOUD_STORAGE_PROVIDER || "local") as
      | "gcp"
      | "supabase"
      | "local",
    bucket: env.CLOUD_STORAGE_BUCKET,
    localPath: env.LOCAL_STORAGE_PATH || "./output",
  },

  // Server
  server: {
    port: parseInt(env.PORT || "3002", 10),
    mcpEnabled: env.MCP_ENABLED !== "false",
    restEnabled: env.REST_ENABLED !== "false",
  },
} as const;

export type Config = typeof config;
