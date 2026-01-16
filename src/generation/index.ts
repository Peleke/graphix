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
  type PanelDirection,
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

// Model catalog system
export * from "./models/index.js";
