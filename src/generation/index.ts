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

// ComfyUI client
export {
  ComfyUIClient,
  getComfyUIClient,
  resetComfyUIClient,
  type GenerateImageParams,
  type Img2ImgParams,
  type ControlNetParams,
  type IPAdapterParams,
  type PipelineParams,
  type GenerationResult,
  type ConnectionStatus,
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
