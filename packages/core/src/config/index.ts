/**
 * Configuration Module
 *
 * Exports configuration types, factory functions, and runtime config management.
 * Environment reading happens in the server package.
 */

export {
  // Types
  type StorageConfig,
  type ComfyUIConfig,
  type CloudStorageConfig,
  type ServerConfig,
  type GraphixConfig,
  type CoreConfig,
  // Factory functions
  createDefaultConfig,
  createCoreConfig,
  // Runtime config management
  setConfig,
  getConfig,
  hasConfig,
  resetConfig,
  // Legacy compatibility
  config,
} from "./types.js";
