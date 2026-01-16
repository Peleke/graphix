/**
 * Composition Module Index
 *
 * Exports all page composition functionality.
 */

// Templates
export {
  getTemplate,
  listTemplates,
  createCustomTemplate,
  PAGE_SIZES,
  TEMPLATES,
  TEMPLATE_FULL_PAGE,
  TEMPLATE_TWO_VERTICAL,
  TEMPLATE_TWO_HORIZONTAL,
  TEMPLATE_THREE_TOP_HEAVY,
  TEMPLATE_THREE_BOTTOM_HEAVY,
  TEMPLATE_FOUR_GRID,
  TEMPLATE_SIX_GRID,
  TEMPLATE_NINE_GRID,
  TEMPLATE_CINEMATIC,
  TEMPLATE_ACTION,
  TEMPLATE_SPLASH_INSETS,
  type PageTemplate,
  type PanelSlot,
  type PageSize,
} from "./templates.js";

// Renderer
export {
  PageRenderer,
  renderPage,
  renderGrid,
  renderContactSheet,
  type PanelImage,
  type RenderOptions,
  type RenderResult,
} from "./renderer.js";

// Export
export {
  exportPage,
  exportToPDF,
  exportBatch,
  prepareForPrint,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type PDFPage,
} from "./export.js";

// Service
export {
  CompositionService,
  getCompositionService,
  resetCompositionService,
  type ComposePageRequest,
  type ComposePageResult,
  type ExportPageRequest,
} from "./service.js";

// Caption Types
export {
  DEFAULT_STYLES as COMPOSITION_DEFAULT_STYLES,
  getMergedStyle,
  type RenderableCaption,
  type CaptionBounds,
  type RenderedCaption,
} from "./caption-types.js";

// Caption Renderer
export {
  renderCaption,
  renderCaptions,
  compositeCaptions,
} from "./caption-renderer.js";

// Caption Placement (AI-augmented)
export {
  analyzeImage,
  suggestPlacement,
  suggestMultiplePlacements,
  getQuickPlacement,
  getQuickPlacements,
  type PlacementSuggestion,
  type PlacementOptions,
  type ImageAnalysis,
} from "./caption-placement.js";

// Caption Effects
export {
  getEffectPreset,
  listEffectPresets,
  EFFECT_PRESETS,
  type EffectType,
  type CaptionEffect,
  type SpeedLinesEffect,
  type ExplosionEffect,
  type GradientEffect,
  type WobbleEffect,
  type GlowEffect,
  type JaggedEffect,
  type ElectricEffect,
  type MangaEmphasisEffect,
  type ScreentoneEffect,
} from "./caption-effects.js";
