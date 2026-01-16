/**
 * Graphix Configuration (Legacy Compatibility)
 *
 * Re-exports configuration from @graphix/core.
 * New code should import directly from @graphix/core.
 */
export {
  config,
  createDefaultConfig,
  setConfig,
  getConfig,
  hasConfig,
  resetConfig,
  type StorageConfig,
  type ComfyUIConfig,
  type CloudStorageConfig,
  type ServerConfig,
  type GraphixConfig,
} from "@graphix/core";

// Legacy alias - use GraphixConfig instead
export type Config = import("@graphix/core").GraphixConfig;
