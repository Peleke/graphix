/**
 * Rich Text Types
 *
 * TypeScript types for TipTap content and editor state.
 */

// TipTap document content
export type TipTapContent = {
  type: "doc";
  content: TipTapNode[];
};

export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
};

export type TipTapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

// Caption type presets
export type CaptionType = "speech" | "thought" | "narration" | "sfx" | "whisper";

// Style preset for caption types
export interface CaptionStylePreset {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: "normal" | "bold";
  backgroundColor: string;
  borderColor: string;
  textAlign?: "left" | "center" | "right";
}

// Default styles per caption type
export const CAPTION_STYLE_PRESETS: Record<CaptionType, CaptionStylePreset> = {
  speech: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 16,
    fontColor: "#000000",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#000000",
  },
  thought: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 14,
    fontColor: "#444444",
    fontWeight: "normal",
    backgroundColor: "#F0F0F0",
    borderColor: "#888888",
  },
  narration: {
    fontFamily: "Georgia, serif",
    fontSize: 14,
    fontColor: "#333333",
    fontWeight: "normal",
    backgroundColor: "#FFFACD",
    borderColor: "#8B4513",
  },
  sfx: {
    fontFamily: "Impact, sans-serif",
    fontSize: 32,
    fontColor: "#FF0000",
    fontWeight: "bold",
    backgroundColor: "transparent",
    borderColor: "#000000",
    textAlign: "center",
  },
  whisper: {
    fontFamily: "Comic Sans MS, cursive",
    fontSize: 12,
    fontColor: "#666666",
    fontWeight: "normal",
    backgroundColor: "#FFFFFF",
    borderColor: "#999999",
  },
};

// Font options
export const FONT_FAMILIES = [
  { value: "Comic Sans MS, cursive", label: "Comic Sans" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Courier New, monospace", label: "Courier" },
  { value: "Times New Roman, serif", label: "Times" },
];

// Color presets
export const COLOR_PRESETS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#71717A", // Gray
];

// Font sizes
export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
