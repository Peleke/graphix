/**
 * UI Constants
 * 
 * Centralized constants for the UI package.
 * ARRR! Keep yer magic numbers in one place! 🏴‍☠️
 */

// ============================================================================
// Character Management
// ============================================================================

/** Maximum number of colors in a character's palette */
export const MAX_COLOR_PALETTE_SIZE = 5;

/** Maximum number of prompt fragments per character */
export const MAX_PROMPT_FRAGMENTS = 10;

/** Maximum number of reference images per character */
export const MAX_REFERENCE_IMAGES = 10;

/** Maximum file size for reference image uploads (in MB) */
export const MAX_FILE_SIZE_MB = 10;

/** Maximum length for character description */
export const MAX_DESCRIPTION_LENGTH = 1000;

/** Maximum length for character name */
export const MAX_NAME_LENGTH = 100;

/** Maximum length for species name */
export const MAX_SPECIES_LENGTH = 50;

/** Maximum length for individual prompt fragment */
export const MAX_FRAGMENT_LENGTH = 200;

// ============================================================================
// LoRA Configuration
// ============================================================================

/** Default LoRA strength */
export const DEFAULT_LORA_STRENGTH = 0.8;

/** Minimum LoRA strength */
export const MIN_LORA_STRENGTH = 0;

/** Maximum LoRA strength */
export const MAX_LORA_STRENGTH = 1;

// ============================================================================
// UI Dimensions
// ============================================================================

/** Character panel width when expanded */
export const PANEL_WIDTH_EXPANDED = 320;

/** Character panel width when collapsed */
export const PANEL_WIDTH_COLLAPSED = 80;

/** Character card thumbnail size */
export const THUMBNAIL_SIZE = 48;

/** Reference image grid item minimum width */
export const REFERENCE_GRID_MIN_WIDTH = 120;

// ============================================================================
// Animation Durations
// ============================================================================

/** Panel collapse/expand animation duration (ms) */
export const PANEL_ANIMATION_DURATION = 200;

/** Card hover animation duration (ms) */
export const CARD_HOVER_DURATION = 150;

// ============================================================================
// Debounce/Throttle
// ============================================================================

/** Search input debounce delay (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Auto-save debounce delay (ms) */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

// ============================================================================
// Validation Patterns
// ============================================================================

/** Hex color validation regex */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Valid image MIME types for reference uploads */
export const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
