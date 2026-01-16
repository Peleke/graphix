/**
 * Page Layout Templates
 *
 * Predefined templates for common graphic novel page layouts.
 * All measurements are in percentages of page dimensions for resolution independence.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Panel slot definition within a template
 */
export interface PanelSlot {
  /** Slot identifier (e.g., "top-left", "panel-1") */
  id: string;
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Width as percentage (0-100) */
  width: number;
  /** Height as percentage (0-100) */
  height: number;
  /** Optional rotation in degrees */
  rotation?: number;
  /** Z-index for overlapping panels */
  zIndex?: number;
}

/**
 * Page template definition
 */
export interface PageTemplate {
  /** Template identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Number of panel slots */
  panelCount: number;
  /** Panel slot definitions */
  slots: PanelSlot[];
  /** Gutter size as percentage */
  gutter: number;
  /** Margin as percentage */
  margin: number;
  /** Aspect ratio (width/height) */
  aspectRatio: number;
}

/**
 * Page size presets (in pixels at 300 DPI)
 */
export interface PageSize {
  name: string;
  width: number;
  height: number;
  dpi: number;
}

// ============================================================================
// Page Sizes
// ============================================================================

export const PAGE_SIZES: Record<string, PageSize> = {
  // US Comic sizes
  comic_standard: {
    name: "US Comic (6.625 x 10.25 in)",
    width: 1988,  // 6.625 * 300
    height: 3075, // 10.25 * 300
    dpi: 300,
  },
  comic_digest: {
    name: "Digest (5.5 x 8.5 in)",
    width: 1650,
    height: 2550,
    dpi: 300,
  },

  // Manga sizes
  manga_b6: {
    name: "Manga B6 (5 x 7 in)",
    width: 1500,
    height: 2100,
    dpi: 300,
  },
  manga_tankoubon: {
    name: "Tankoubon (5.04 x 7.17 in)",
    width: 1512,
    height: 2151,
    dpi: 300,
  },

  // Web/Digital
  web_hd: {
    name: "Web HD (1080 x 1920)",
    width: 1080,
    height: 1920,
    dpi: 72,
  },
  web_4k: {
    name: "Web 4K (2160 x 3840)",
    width: 2160,
    height: 3840,
    dpi: 72,
  },

  // Print spreads (two pages side by side)
  spread_comic: {
    name: "Comic Spread (13.25 x 10.25 in)",
    width: 3975,
    height: 3075,
    dpi: 300,
  },
};

// ============================================================================
// Template Definitions
// ============================================================================

/**
 * Single full-page panel
 */
export const TEMPLATE_FULL_PAGE: PageTemplate = {
  id: "full-page",
  name: "Full Page",
  description: "Single panel filling the entire page",
  panelCount: 1,
  gutter: 0,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "main", x: 2, y: 2, width: 96, height: 96 },
  ],
};

/**
 * Two panels stacked vertically
 */
export const TEMPLATE_TWO_VERTICAL: PageTemplate = {
  id: "two-vertical",
  name: "Two Vertical",
  description: "Two panels stacked vertically (50/50 split)",
  panelCount: 2,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "top", x: 2, y: 2, width: 96, height: 47 },
    { id: "bottom", x: 2, y: 51, width: 96, height: 47 },
  ],
};

/**
 * Two panels side by side
 */
export const TEMPLATE_TWO_HORIZONTAL: PageTemplate = {
  id: "two-horizontal",
  name: "Two Horizontal",
  description: "Two panels side by side",
  panelCount: 2,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "left", x: 2, y: 2, width: 47, height: 96 },
    { id: "right", x: 51, y: 2, width: 47, height: 96 },
  ],
};

/**
 * Three panels - one large top, two small bottom
 */
export const TEMPLATE_THREE_TOP_HEAVY: PageTemplate = {
  id: "three-top-heavy",
  name: "Three (Top Heavy)",
  description: "Large panel on top, two smaller panels below",
  panelCount: 3,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "top", x: 2, y: 2, width: 96, height: 60 },
    { id: "bottom-left", x: 2, y: 64, width: 47, height: 34 },
    { id: "bottom-right", x: 51, y: 64, width: 47, height: 34 },
  ],
};

/**
 * Three panels - two small top, one large bottom
 */
export const TEMPLATE_THREE_BOTTOM_HEAVY: PageTemplate = {
  id: "three-bottom-heavy",
  name: "Three (Bottom Heavy)",
  description: "Two smaller panels on top, large panel below",
  panelCount: 3,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "top-left", x: 2, y: 2, width: 47, height: 34 },
    { id: "top-right", x: 51, y: 2, width: 47, height: 34 },
    { id: "bottom", x: 2, y: 38, width: 96, height: 60 },
  ],
};

/**
 * Four panels in a 2x2 grid
 */
export const TEMPLATE_FOUR_GRID: PageTemplate = {
  id: "four-grid",
  name: "Four Grid",
  description: "Four equal panels in a 2x2 grid",
  panelCount: 4,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "top-left", x: 2, y: 2, width: 47, height: 47 },
    { id: "top-right", x: 51, y: 2, width: 47, height: 47 },
    { id: "bottom-left", x: 2, y: 51, width: 47, height: 47 },
    { id: "bottom-right", x: 51, y: 51, width: 47, height: 47 },
  ],
};

/**
 * Six panels in a 2x3 grid (classic comic layout)
 */
export const TEMPLATE_SIX_GRID: PageTemplate = {
  id: "six-grid",
  name: "Six Grid",
  description: "Six panels in a classic 2x3 comic grid",
  panelCount: 6,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "row1-left", x: 2, y: 2, width: 47, height: 30 },
    { id: "row1-right", x: 51, y: 2, width: 47, height: 30 },
    { id: "row2-left", x: 2, y: 34, width: 47, height: 30 },
    { id: "row2-right", x: 51, y: 34, width: 47, height: 30 },
    { id: "row3-left", x: 2, y: 66, width: 47, height: 32 },
    { id: "row3-right", x: 51, y: 66, width: 47, height: 32 },
  ],
};

/**
 * Nine panels in a 3x3 grid
 */
export const TEMPLATE_NINE_GRID: PageTemplate = {
  id: "nine-grid",
  name: "Nine Grid",
  description: "Nine panels in a 3x3 grid",
  panelCount: 9,
  gutter: 1.5,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "r1c1", x: 2, y: 2, width: 30.67, height: 30.67 },
    { id: "r1c2", x: 34.17, y: 2, width: 30.67, height: 30.67 },
    { id: "r1c3", x: 66.33, y: 2, width: 31.67, height: 30.67 },
    { id: "r2c1", x: 2, y: 34.17, width: 30.67, height: 30.67 },
    { id: "r2c2", x: 34.17, y: 34.17, width: 30.67, height: 30.67 },
    { id: "r2c3", x: 66.33, y: 34.17, width: 31.67, height: 30.67 },
    { id: "r3c1", x: 2, y: 66.33, width: 30.67, height: 31.67 },
    { id: "r3c2", x: 34.17, y: 66.33, width: 30.67, height: 31.67 },
    { id: "r3c3", x: 66.33, y: 66.33, width: 31.67, height: 31.67 },
  ],
};

/**
 * Cinematic widescreen (three horizontal strips)
 */
export const TEMPLATE_CINEMATIC: PageTemplate = {
  id: "cinematic",
  name: "Cinematic",
  description: "Three widescreen panels for cinematic storytelling",
  panelCount: 3,
  gutter: 2,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "top", x: 2, y: 2, width: 96, height: 30 },
    { id: "middle", x: 2, y: 34, width: 96, height: 30 },
    { id: "bottom", x: 2, y: 66, width: 96, height: 32 },
  ],
};

/**
 * Action layout - dynamic asymmetric panels
 */
export const TEMPLATE_ACTION: PageTemplate = {
  id: "action",
  name: "Action",
  description: "Dynamic asymmetric layout for action sequences",
  panelCount: 5,
  gutter: 1.5,
  margin: 2,
  aspectRatio: 0.65,
  slots: [
    { id: "hero", x: 2, y: 2, width: 60, height: 55 },
    { id: "top-right", x: 63.5, y: 2, width: 34.5, height: 26.5 },
    { id: "mid-right", x: 63.5, y: 30, width: 34.5, height: 27 },
    { id: "bottom-left", x: 2, y: 58.5, width: 47, height: 39.5 },
    { id: "bottom-right", x: 50.5, y: 58.5, width: 47.5, height: 39.5 },
  ],
};

/**
 * Splash with insets - one large background with small inset panels
 */
export const TEMPLATE_SPLASH_INSETS: PageTemplate = {
  id: "splash-insets",
  name: "Splash with Insets",
  description: "Large splash panel with small inset panels",
  panelCount: 4,
  gutter: 0,
  margin: 0,
  aspectRatio: 0.65,
  slots: [
    { id: "splash", x: 0, y: 0, width: 100, height: 100, zIndex: 0 },
    { id: "inset-1", x: 3, y: 3, width: 25, height: 20, zIndex: 1 },
    { id: "inset-2", x: 72, y: 3, width: 25, height: 20, zIndex: 1 },
    { id: "inset-3", x: 3, y: 77, width: 35, height: 20, zIndex: 1 },
  ],
};

// ============================================================================
// Template Registry
// ============================================================================

export const TEMPLATES: Record<string, PageTemplate> = {
  "full-page": TEMPLATE_FULL_PAGE,
  "two-vertical": TEMPLATE_TWO_VERTICAL,
  "two-horizontal": TEMPLATE_TWO_HORIZONTAL,
  "three-top-heavy": TEMPLATE_THREE_TOP_HEAVY,
  "three-bottom-heavy": TEMPLATE_THREE_BOTTOM_HEAVY,
  "four-grid": TEMPLATE_FOUR_GRID,
  "six-grid": TEMPLATE_SIX_GRID,
  "nine-grid": TEMPLATE_NINE_GRID,
  "cinematic": TEMPLATE_CINEMATIC,
  "action": TEMPLATE_ACTION,
  "splash-insets": TEMPLATE_SPLASH_INSETS,
};

/**
 * Get a template by ID
 */
export function getTemplate(id: string): PageTemplate | undefined {
  return TEMPLATES[id];
}

/**
 * List all available templates
 */
export function listTemplates(): PageTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Create a custom template
 */
export function createCustomTemplate(
  id: string,
  name: string,
  slots: PanelSlot[],
  options?: {
    description?: string;
    gutter?: number;
    margin?: number;
    aspectRatio?: number;
  }
): PageTemplate {
  return {
    id,
    name,
    description: options?.description ?? "Custom template",
    panelCount: slots.length,
    slots,
    gutter: options?.gutter ?? 2,
    margin: options?.margin ?? 2,
    aspectRatio: options?.aspectRatio ?? 0.65,
  };
}
