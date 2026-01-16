/**
 * Caption Types and Defaults
 *
 * Type definitions and default styles for comic caption rendering.
 */

// Re-export schema types for convenience
export type {
  CaptionType,
  CaptionPosition,
  CaptionStyle,
  PanelCaption,
} from "../db/index.js";

import type { CaptionType, CaptionPosition, CaptionStyle } from "../db/index.js";
import type { CaptionEffect } from "./caption-effects.js";

/**
 * Caption data for rendering (can come from DB or be passed directly)
 */
export interface RenderableCaption {
  id?: string;
  type: CaptionType;
  text: string;
  characterId?: string;
  position: CaptionPosition;
  tailDirection?: CaptionPosition;
  style?: Partial<CaptionStyle>;
  zIndex?: number;
  /** Optional visual effects (speed lines, explosions, glow, etc.) */
  effects?: CaptionEffect[];
  /** Effect preset name (alternative to specifying effects directly) */
  effectPreset?: string;
}

/**
 * Computed caption bounds after measuring text
 */
export interface CaptionBounds {
  x: number;      // pixel position
  y: number;      // pixel position
  width: number;  // pixel width
  height: number; // pixel height
}

/**
 * Result from rendering a single caption
 */
export interface RenderedCaption {
  caption: RenderableCaption;
  bounds: CaptionBounds;
  svgContent: string;
  buffer: Buffer;
}

/**
 * Default styles per caption type
 */
export const DEFAULT_STYLES: Record<CaptionType, CaptionStyle> = {
  speech: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 16,
    fontColor: "#000000",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#000000",
    borderWidth: 2,
    borderStyle: "solid",
    opacity: 1,
    padding: 12,
    maxWidth: 40,
  },
  thought: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 14,
    fontColor: "#444444",
    fontWeight: "normal",
    backgroundColor: "#F0F0F0",
    borderColor: "#888888",
    borderWidth: 1,
    borderStyle: "solid",
    opacity: 0.95,
    padding: 12,
    maxWidth: 35,
  },
  narration: {
    fontFamily: "Georgia, serif",
    fontSize: 14,
    fontColor: "#333333",
    fontWeight: "normal",
    backgroundColor: "#FFFACD",
    borderColor: "#8B4513",
    borderWidth: 2,
    borderStyle: "solid",
    opacity: 1,
    padding: 10,
    maxWidth: 80,
  },
  sfx: {
    fontFamily: "Impact, sans-serif",
    fontSize: 32,
    fontColor: "#FF0000",
    fontWeight: "bold",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 3,
    borderStyle: "solid",
    opacity: 1,
    padding: 0,
    maxWidth: 50,
  },
  whisper: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 12,
    fontColor: "#666666",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#999999",
    borderWidth: 1,
    borderStyle: "dashed",
    opacity: 0.9,
    padding: 10,
    maxWidth: 30,
  },
};

/**
 * Merge custom style with defaults for a caption type
 */
export function getMergedStyle(
  type: CaptionType,
  customStyle?: Partial<CaptionStyle>
): CaptionStyle {
  const defaults = DEFAULT_STYLES[type];
  return {
    ...defaults,
    ...customStyle,
  };
}
