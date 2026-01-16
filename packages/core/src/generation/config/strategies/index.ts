/**
 * Strategies Index
 *
 * Re-exports all strategy modules for convenient access.
 */

// Base strategy
export { BaseConfigurationStrategy } from "./strategy.js";

// Default strategy (backward compatible)
export {
  DefaultConfigurationStrategy,
  getDefaultStrategy,
} from "./default.strategy.js";

// Slot-aware strategy (smart sizing)
export {
  SlotAwareConfigurationStrategy,
  getSlotAwareStrategy,
} from "./slot-aware.strategy.js";
