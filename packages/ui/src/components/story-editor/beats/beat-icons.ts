/**
 * Emoji mapping for beat types
 */

import type { BeatType } from "./types";

export const BEAT_TYPE_ICONS: Record<BeatType, string> = {
  setup: "🎬",
  inciting: "💥",
  rising: "📈",
  midpoint: "🔄",
  complication: "⚡",
  crisis: "🔥",
  climax: "🎯",
  resolution: "✅",
  denouement: "🌅",
};

export function getBeatIcon(beatType: BeatType | null): string {
  if (!beatType) return "📝";
  return BEAT_TYPE_ICONS[beatType] || "📝";
}
