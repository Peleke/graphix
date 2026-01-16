/**
 * Graphix Configuration Types
 *
 * Type definitions for configuration. No environment reading here -
 * that happens in the server package at startup.
 */

import type { DatabaseConfig } from "../db/client.js";

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Database config (passed to createDatabase) */
  database: DatabaseConfig;
  /** Output directory for generated images */
  outputDir: string;
}

/**
 * ComfyUI MCP configuration
 */
export interface ComfyUIConfig {
  /** Base URL for comfyui-mcp HTTP server */
  baseUrl: string;
  /** API key for authentication (optional in dev) */
  apiKey?: string;
  /** API secret for HMAC signing (optional in dev) */
  apiSecret?: string;
  /** Default model checkpoint */
  defaultModel: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Cloud storage configuration
 */
export interface CloudStorageConfig {
  /** Storage provider */
  provider: "gcp" | "supabase" | "local";
  /** Bucket name (for cloud providers) */
  bucket?: string;
  /** Local path (for local provider) */
  localPath?: string;
}

/**
 * Server configuration (used by @graphix/server)
 */
export interface ServerConfig {
  /** HTTP port */
  port: number;
  /** Enable MCP server */
  mcpEnabled: boolean;
  /** Enable REST API */
  restEnabled: boolean;
}

/**
 * Complete Graphix configuration
 */
export interface GraphixConfig {
  storage: StorageConfig;
  comfyui: ComfyUIConfig;
  cloudStorage: CloudStorageConfig;
  server: ServerConfig;
}

/**
 * Create default configuration
 * Use this as a base and override with environment values
 */
export function createDefaultConfig(): GraphixConfig {
  return {
    storage: {
      database: {
        mode: "sqlite",
        sqlitePath: "./graphix.db",
        verbose: false,
      },
      outputDir: "./output",
    },
    comfyui: {
      baseUrl: "http://localhost:3001",
      defaultModel: "yiffInHell_yihXXXTended.safetensors",
      timeout: 300000,
    },
    cloudStorage: {
      provider: "local",
      localPath: "./output",
    },
    server: {
      port: 3002,
      mcpEnabled: true,
      restEnabled: true,
    },
  };
}

/**
 * Minimal config for library usage (no server)
 */
export interface CoreConfig {
  storage: StorageConfig;
  comfyui: ComfyUIConfig;
  cloudStorage?: CloudStorageConfig;
}

/**
 * Create minimal config for library usage
 */
export function createCoreConfig(
  overrides: Partial<CoreConfig> = {}
): CoreConfig {
  const defaults = createDefaultConfig();
  return {
    storage: overrides.storage ?? defaults.storage,
    comfyui: overrides.comfyui ?? defaults.comfyui,
    cloudStorage: overrides.cloudStorage ?? defaults.cloudStorage,
  };
}

// ============================================================================
// RUNTIME CONFIG (singleton pattern like database)
// ============================================================================

let runtimeConfig: GraphixConfig | null = null;

/**
 * Set the runtime configuration
 * Call this at server startup after loading from environment
 */
export function setConfig(config: GraphixConfig): void {
  runtimeConfig = config;
}

/**
 * Get the current runtime configuration
 * Throws if not initialized via setConfig()
 */
export function getConfig(): GraphixConfig {
  if (!runtimeConfig) {
    // Return defaults if not explicitly set (for library usage)
    return createDefaultConfig();
  }
  return runtimeConfig;
}

/**
 * Check if config has been explicitly set
 */
export function hasConfig(): boolean {
  return runtimeConfig !== null;
}

/**
 * Reset the runtime config (for testing)
 */
export function resetConfig(): void {
  runtimeConfig = null;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy config object that reads from runtime config
 * For backward compatibility with existing code that imports { config }
 */
export const config = {
  get storage() {
    const cfg = getConfig();
    return {
      mode: cfg.storage.database.mode,
      tursoUrl: cfg.storage.database.tursoUrl,
      tursoToken: cfg.storage.database.tursoToken,
      sqlitePath: cfg.storage.database.sqlitePath,
      outputDir: cfg.storage.outputDir,
    };
  },
  get comfyui() {
    return getConfig().comfyui;
  },
  get cloudStorage() {
    return getConfig().cloudStorage;
  },
  get server() {
    return getConfig().server;
  },
};
