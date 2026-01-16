/**
 * Generation Module Index
 *
 * Exports all generation-related functionality.
 */

// Prompt building
export {
  PromptBuilder,
  buildPanelPrompt,
  generateVariantSeeds,
  detectModelFamily,
  type CharacterPlacement,
  type PromptDirection,
  type GenerationSettings,
  type ModelFamily,
  type BuiltPrompt,
  type VariantConfig,
} from "./prompt-builder.js";

// ComfyUI MCP client
export {
  ComfyUIClient,
  getComfyUIClient,
  resetComfyUIClient,
  type ImageGenerateRequest,
  type ImagineRequest,
  type PortraitRequest,
  type TTSRequest,
  type LipsyncRequest,
  type GenerationResult,
  type HealthResult,
} from "./comfyui-client.js";

// Panel generation
export {
  PanelGenerator,
  getPanelGenerator,
  resetPanelGenerator,
  createPanelGenerator,
  setPanelGenerator,
  type GenerateOptions,
  type VariantOptions,
  type PanelGenerationResult,
  type BatchGenerationResult,
} from "./panel-generator.js";

// ControlNet stacking
export {
  ControlNetStackClient,
  getControlNetStack,
  resetControlNetStack,
  CONTROL_STACK_PRESETS,
  type ControlType,
  type ControlCondition,
  type ControlNetStackRequest,
  type ControlStackPreset,
  type PreprocessorOptions,
} from "./controlnet-stack.js";

// IP-Adapter client
export {
  IPAdapterClient,
  getIPAdapter,
  resetIPAdapter,
  type IPAdapterRequest,
  type IdentityEmbedding,
  type IPAdapterModel,
  type IdentityExtractionResult,
  type IPAdapterApplyOptions,
} from "./ip-adapter.js";

// Model catalog system
export * from "./models/index.js";

// Configuration engine and presets
export * from "./config/index.js";
