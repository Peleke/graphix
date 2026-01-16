/**
 * Model Catalog System
 *
 * Provides compatibility tracking between checkpoints, ControlNets, and LoRAs.
 * Ensures the right models are used together.
 *
 * @example
 * ```typescript
 * import { getModelResolver, CHECKPOINT_CATALOG } from "./models";
 *
 * const resolver = getModelResolver();
 *
 * // Resolve best ControlNet for a checkpoint and control type
 * const result = resolver.resolveControlNet(
 *   "novaFurryXL_ilV130.safetensors",
 *   "openpose"
 * );
 *
 * if (result.compatible) {
 *   console.log("Use:", result.controlnet);
 *   console.log("Preprocessor:", result.preprocessor);
 *   console.log("Control mode:", result.controlMode); // For Union models
 * }
 * ```
 */

// Types
export type {
  ModelFamily,
  CheckpointEntry,
  CheckpointType,
  ControlNetEntry,
  LoraEntry,
  LoraCategory,
  LoraStackPosition,
  ControlNetCompatibilityResult,
  FullCompatibilityResult,
  CheckpointCatalog,
  ControlNetCatalog,
  LoraCatalog,
} from "./types.js";

export { SDXL_COMPATIBLE_FAMILIES } from "./types.js";

// Checkpoint Catalog
export {
  CHECKPOINT_CATALOG,
  getCheckpoint,
  listCheckpointsByFamily,
  listRecommendedCheckpoints,
  listNsfwCheckpoints,
  inferFamily,
} from "./checkpoint-catalog.js";

// ControlNet Catalog
export {
  CONTROLNET_CATALOG,
  getControlNet,
  listControlNetsByFamily,
  listControlNetsByType,
  findBestControlNet,
  getSDXLUnion,
  getUnionControlMode,
  UNION_CONTROL_MODES,
} from "./controlnet-catalog.js";

// Resolver
export {
  ModelResolver,
  getModelResolver,
  resetModelResolver,
} from "./resolver.js";

// LoRA Catalog
export {
  LORA_CATALOG,
  getLora,
  findLoraByName,
  listLorasByFamily,
  listLorasByCategory,
  getCompatibleLoras,
  suggestLoras,
  buildLoraStack,
  getTriggerWords,
  listStyleLoras,
  listQualityLoras,
  listCharacterLoras,
  getRecommendedStack,
} from "./lora-catalog.js";
