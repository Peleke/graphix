/**
 * Services Index
 *
 * Export all services from a single entry point.
 * Each service provides:
 * - Class for explicit instantiation
 * - createXService(db) factory for explicit DI
 * - getXService() singleton getter (uses default db)
 * - resetXService() for testing
 */

// Core CRUD Services
export {
  ProjectService,
  createProjectService,
  getProjectService,
  resetProjectService,
} from "./project.service.js";

export {
  CharacterService,
  getCharacterService,
} from "./character.service.js";

export {
  StoryboardService,
  getStoryboardService,
} from "./storyboard.service.js";

export {
  PanelService,
  getPanelService,
} from "./panel.service.js";

export {
  GeneratedImageService,
  getGeneratedImageService,
} from "./generated-image.service.js";

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

// Consistency Service
export {
  getConsistencyService,
  resetConsistencyService,
} from "./consistency.service.js";
export type {
  StoredIdentity,
  ExtractIdentityOptions,
  ApplyIdentityOptions,
  ChainOptions,
  ReferenceSheetOptions,
  ConsistencyResult,
} from "./consistency.service.js";

// Style Service
export {
  StyleService,
  getStyleService,
  resetStyleService,
} from "./style.service.js";
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

// Story Scaffold Service
export {
  StoryScaffoldService,
  createStoryScaffoldService,
  getStoryScaffoldService,
  resetStoryScaffoldService,
} from "./story-scaffold.service.js";
export type {
  ScaffoldPanel,
  ScaffoldScene,
  ScaffoldAct,
  StoryScaffoldInput,
  ScaffoldedScene,
  ScaffoldedAct,
  StoryScaffoldResult,
  ParsedOutline,
} from "./story-scaffold.service.js";

// Batch Service
export {
  BatchService,
  createBatchService,
  getBatchService,
  resetBatchService,
} from "./batch.service.js";
export type {
  BatchPanelInput,
  BatchCaptionInput,
  BatchGenerateOptions,
  BatchRenderOptions,
  BatchCreateResult,
  BatchCaptionResult,
  BatchGenerateResult,
  BatchRenderResult,
} from "./batch.service.js";

// Narrative Service
export {
  NarrativeService,
  createNarrativeService,
  getNarrativeService,
  resetNarrativeService,
} from "./narrative.service.js";
export type {
  CreatePremiseInput,
  UpdatePremiseInput,
  CreateStoryInput,
  UpdateStoryInput,
  CreateBeatInput,
  UpdateBeatInput,
  GeneratedCaption,
  GenerateCaptionsOptions,
  GenerateCaptionsResult,
} from "./narrative.service.js";

// LLM Service
export {
  LLMService,
  createLLMService,
  getLLMService,
  resetLLMService,
} from "./llm.service.js";
export type {
  LLMProvider,
  LLMModel,
  LLMConfig,
  PremisePrompt,
  StoryOptions,
  BeatOptions,
  GeneratedPremise,
  GeneratedStory,
  GeneratedBeat,
  FullStoryGeneration,
} from "./llm.service.js";

// Review Service
export {
  ReviewService,
  createReviewService,
  getReviewService,
  resetReviewService,
} from "./review.service.js";
export {
  DEFAULT_REVIEW_CONFIG,
  DEFAULT_VISION_CONFIG,
} from "./review.types.js";
export type {
  ReviewConfig,
  ReviewResult,
  HumanDecision,
  AutoReviewResult,
  PanelContext,
  ReviewQueueItem,
  BatchReviewOptions,
  BatchReviewResult,
  VisionProviderConfig,
  ImageAnalysis,
  QueueProcessResult,
  ReviewStatus,
  ReviewAction,
  ReviewIssue,
  ReviewIssueType,
  ReviewIssueSeverity,
} from "./review.types.js";

// Text Generation Service
export {
  TextGenerationService,
  createTextGenerationService,
  getTextGenerationService,
  resetTextGenerationService,
} from "./text-generation.service.js";
export {
  DEFAULT_TEXT_CONFIG,
} from "./text-generation.types.js";
export type {
  TextProvider,
  TextGenerationConfig,
  TextGenerationProvider,
  ProviderStatus,
  GenerateOptions,
  GenerateResult,
  PanelDescriptionContext,
  DialogueContext,
  GeneratedDialogue,
  InferredCaption,
  RefineTextContext,
} from "./text-generation.types.js";

// Generated Text Service (for storing/managing generated text)
export {
  GeneratedTextService,
  createGeneratedTextService,
  getGeneratedTextService,
  resetGeneratedTextService,
} from "./generated-text.service.js";
export type {
  CreateGeneratedTextInput,
  UpdateGeneratedTextInput,
  ListGeneratedTextsOptions,
  RegenerateTextOptions,
  GenerateAndStoreOptions,
} from "./generated-text.service.js";

// Providers
export { OllamaProvider } from "./providers/ollama.provider.js";
export { ClaudeProvider } from "./providers/claude.provider.js";
