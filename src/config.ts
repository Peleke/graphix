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
    // Output directory for generated images
    outputDir: env.OUTPUT_DIR || "./output",
  },

  // ComfyUI MCP connection (hits comfyui-mcp HTTP API)
  comfyui: {
    // Base URL for comfyui-mcp HTTP server
    baseUrl: env.COMFYUI_MCP_URL || "http://localhost:3001",
    // API key for authentication (optional in dev)
    apiKey: env.COMFYUI_API_KEY || "",
    // API secret for HMAC signing (optional in dev)
    apiSecret: env.COMFYUI_API_SECRET || "",
    // Default model checkpoint
    defaultModel: env.COMFYUI_DEFAULT_MODEL || "yiffInHell_yihXXXTended.safetensors",
    // Request timeout (ms) - generation can take a while
    timeout: parseInt(env.COMFYUI_TIMEOUT || "300000", 10),
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
