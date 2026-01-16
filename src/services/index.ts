/**
 * Services Index
 *
 * Export all services from a single entry point.
 */

export { ProjectService, getProjectService } from "./project.service.js";
export { CharacterService, getCharacterService } from "./character.service.js";
export { StoryboardService, getStoryboardService } from "./storyboard.service.js";
export { PanelService, getPanelService } from "./panel.service.js";
export { GeneratedImageService, getGeneratedImageService } from "./generated-image.service.js";
export {
  CaptionService,
  getCaptionService,
  resetCaptionService,
  DEFAULT_CAPTION_STYLES,
} from "./caption.service.js";
export type {
  CreateCaptionInput,
  UpdateCaptionInput,
} from "./caption.service.js";
export { getConsistencyService, resetConsistencyService } from "./consistency.service.js";
export type {
  StoredIdentity,
  ExtractIdentityOptions,
  ApplyIdentityOptions,
  ChainOptions,
  ReferenceSheetOptions,
  ConsistencyResult,
} from "./consistency.service.js";

export { StyleService, getStyleService, resetStyleService } from "./style.service.js";
export type {
  ApplyStyleOptions,
  BatchStyleOptions,
  LoraStackOptions,
  LoraStackResult,
  StyleApplicationResult,
  BatchStyleResult,
} from "./style.service.js";

// Phase 3.5 Services
export {
  PoseLibraryService,
  getPoseLibraryService,
  resetPoseLibraryService,
  POSE_CATEGORIES,
  EXPRESSION_NAMES,
} from "./pose-library.service.js";
export type {
  PoseCategory,
  ExpressionName,
  ExtractPoseOptions,
  ExtractExpressionOptions,
} from "./pose-library.service.js";

export {
  InpaintingService,
  getInpaintingService,
  resetInpaintingService,
  MASK_PRESETS,
} from "./inpainting.service.js";
export type {
  MaskPreset,
  InpaintOptions,
  EditOptions,
  MaskGenerationOptions,
  InpaintResult,
} from "./inpainting.service.js";

export {
  LightingService,
  getLightingService,
  resetLightingService,
  LIGHT_TYPES,
  LIGHT_DIRECTIONS,
  TIMES_OF_DAY,
  WEATHER_CONDITIONS,
} from "./lighting.service.js";
export type {
  LightType,
  LightDirection,
  TimeOfDay,
  WeatherCondition,
} from "./lighting.service.js";

export {
  PromptAnalyticsService,
  getPromptAnalyticsService,
  resetPromptAnalyticsService,
} from "./prompt-analytics.service.js";
export type {
  GenerationPattern,
  AnalysisResult,
  SuggestedParams,
  SimilarGeneration,
} from "./prompt-analytics.service.js";

export {
  InterpolationService,
  getInterpolationService,
  resetInterpolationService,
} from "./interpolation.service.js";
export type {
  EasingFunction,
  InterpolationOptions,
  InterpolationResult,
} from "./interpolation.service.js";

export {
  InteractionPoseService,
  getInteractionPoseService,
  resetInteractionPoseService,
  INTERACTION_CATEGORIES,
  CONTENT_RATINGS,
} from "./interaction-pose.service.js";
export type {
  InteractionCategory,
  ContentRating,
  CreateInteractionPoseOptions,
  UpdateInteractionPoseOptions,
  ListInteractionPosesOptions,
  ApplyInteractionPoseResult,
} from "./interaction-pose.service.js";

// Seed data
export { DEFAULT_INTERACTION_POSES } from "./interaction-pose.seed.js";

export {
  CustomAssetService,
  getCustomAssetService,
  resetCustomAssetService,
} from "./custom-asset.service.js";
export type {
  AssetType,
  RegisterAssetOptions,
  UpdateAssetOptions,
  ListAssetsOptions,
  AppliedAsset,
} from "./custom-asset.service.js";
