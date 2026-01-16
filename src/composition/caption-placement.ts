/**
 * Caption Placement Service
 *
 * AI-augmented caption positioning that analyzes panel images
 * to suggest optimal placement avoiding important visual areas.
 */

import sharp from "sharp";
import type { CaptionType, CaptionPosition } from "../db/schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Suggested position for a caption
 */
export interface PlacementSuggestion {
  position: CaptionPosition;
  confidence: number; // 0-1, higher = more confident this is a good spot
  reasoning: string;
  region: "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
}

/**
 * Options for placement analysis
 */
export interface PlacementOptions {
  captionType: CaptionType;
  preferredRegion?: "top" | "bottom" | "left" | "right" | "center" | "any";
  avoidEdges?: boolean; // Avoid placing near image edges (default: true for most types)
  minimumClearance?: number; // Minimum % distance from busy areas (default: 5)
}

/**
 * Analysis result for an image
 */
export interface ImageAnalysis {
  width: number;
  height: number;
  edgeDensityMap: number[][]; // 2D grid of edge density values (0-1)
  calmRegions: Array<{ x: number; y: number; width: number; height: number; score: number }>;
  gridSize: number;
}

// ============================================================================
// Heuristics
// ============================================================================

/**
 * Default preferred regions by caption type
 */
const TYPE_PREFERENCES: Record<CaptionType, { regions: string[]; avoidCenter: boolean }> = {
  speech: {
    regions: ["top-left", "top-right", "top-center"],
    avoidCenter: true, // Speech bubbles should be near character faces, usually top
  },
  thought: {
    regions: ["top-left", "top-right", "top-center"],
    avoidCenter: true,
  },
  narration: {
    regions: ["top-left", "top-center", "bottom-left", "bottom-center"],
    avoidCenter: true, // Narration boxes typically at edges
  },
  sfx: {
    regions: ["center", "center-left", "center-right"],
    avoidCenter: false, // SFX can go anywhere the action is
  },
  whisper: {
    regions: ["bottom-left", "bottom-right", "center-left", "center-right"],
    avoidCenter: true,
  },
};

/**
 * Region center coordinates (as percentages)
 */
const REGION_COORDS: Record<string, CaptionPosition> = {
  "top-left": { x: 20, y: 15 },
  "top-center": { x: 50, y: 12 },
  "top-right": { x: 80, y: 15 },
  "center-left": { x: 15, y: 50 },
  "center": { x: 50, y: 50 },
  "center-right": { x: 85, y: 50 },
  "bottom-left": { x: 20, y: 85 },
  "bottom-center": { x: 50, y: 88 },
  "bottom-right": { x: 80, y: 85 },
};

// ============================================================================
// Image Analysis Functions
// ============================================================================

/**
 * Analyze an image for edge density to find calm regions
 * Uses Sobel edge detection to identify busy vs quiet areas
 */
export async function analyzeImage(imagePath: string, gridSize: number = 8): Promise<ImageAnalysis> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 512;
  const height = metadata.height ?? 768;

  // Convert to grayscale and get raw pixels
  const { data, info } = await image
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Calculate cell dimensions
  const cellWidth = Math.floor(info.width / gridSize);
  const cellHeight = Math.floor(info.height / gridSize);

  // Compute edge density for each grid cell using simple gradient magnitude
  const edgeDensityMap: number[][] = [];

  for (let gy = 0; gy < gridSize; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      // Calculate edge density for this cell
      let totalGradient = 0;
      let pixelCount = 0;

      const startX = gx * cellWidth;
      const startY = gy * cellHeight;
      const endX = Math.min(startX + cellWidth, info.width - 1);
      const endY = Math.min(startY + cellHeight, info.height - 1);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = y * info.width + x;
          const idxRight = y * info.width + (x + 1);
          const idxDown = (y + 1) * info.width + x;

          // Simple gradient (Sobel-like approximation)
          const gx = Math.abs((data[idxRight] ?? data[idx]) - data[idx]);
          const gy = Math.abs((data[idxDown] ?? data[idx]) - data[idx]);
          const gradient = Math.sqrt(gx * gx + gy * gy);

          totalGradient += gradient;
          pixelCount++;
        }
      }

      // Normalize to 0-1 (255 is max possible gradient)
      const avgGradient = pixelCount > 0 ? totalGradient / pixelCount : 0;
      const normalizedDensity = Math.min(avgGradient / 100, 1); // Cap at 100 gradient
      row.push(normalizedDensity);
    }
    edgeDensityMap.push(row);
  }

  // Find calm regions (low edge density areas)
  const calmRegions: ImageAnalysis["calmRegions"] = [];
  const cellWidthPct = 100 / gridSize;
  const cellHeightPct = 100 / gridSize;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const density = edgeDensityMap[gy][gx];
      if (density < 0.3) {
        // This is a calm region
        calmRegions.push({
          x: gx * cellWidthPct,
          y: gy * cellHeightPct,
          width: cellWidthPct,
          height: cellHeightPct,
          score: 1 - density, // Higher score = calmer
        });
      }
    }
  }

  // Sort calm regions by score
  calmRegions.sort((a, b) => b.score - a.score);

  return {
    width,
    height,
    edgeDensityMap,
    calmRegions,
    gridSize,
  };
}

/**
 * Get edge density at a specific position
 */
function getDensityAtPosition(
  analysis: ImageAnalysis,
  x: number,
  y: number
): number {
  const gridX = Math.floor((x / 100) * analysis.gridSize);
  const gridY = Math.floor((y / 100) * analysis.gridSize);

  const clampedX = Math.max(0, Math.min(gridX, analysis.gridSize - 1));
  const clampedY = Math.max(0, Math.min(gridY, analysis.gridSize - 1));

  return analysis.edgeDensityMap[clampedY][clampedX];
}

// ============================================================================
// Placement Suggestion Functions
// ============================================================================

/**
 * Suggest optimal positions for a caption
 */
export async function suggestPlacement(
  imagePath: string,
  options: PlacementOptions
): Promise<PlacementSuggestion[]> {
  const analysis = await analyzeImage(imagePath);
  const preferences = TYPE_PREFERENCES[options.captionType];
  const suggestions: PlacementSuggestion[] = [];

  // Get candidate regions based on type preferences and user preference
  let candidateRegions = [...preferences.regions];

  if (options.preferredRegion && options.preferredRegion !== "any") {
    // Filter to regions matching the preference
    candidateRegions = candidateRegions.filter((region) => {
      if (options.preferredRegion === "top") return region.includes("top");
      if (options.preferredRegion === "bottom") return region.includes("bottom");
      if (options.preferredRegion === "left") return region.includes("left");
      if (options.preferredRegion === "right") return region.includes("right");
      if (options.preferredRegion === "center") return region === "center";
      return true;
    });

    // If no regions match, use all regions from preference
    if (candidateRegions.length === 0) {
      candidateRegions = [...preferences.regions];
    }
  }

  // Score each candidate region
  for (const region of candidateRegions) {
    const basePosition = REGION_COORDS[region];
    const density = getDensityAtPosition(analysis, basePosition.x, basePosition.y);

    // Base confidence from edge density (lower density = higher confidence)
    let confidence = 1 - density;

    // Bonus for preferred regions
    if (preferences.regions[0] === region) {
      confidence += 0.1;
    }

    // Penalty for center if type prefers edges
    if (preferences.avoidCenter && region === "center") {
      confidence -= 0.2;
    }

    // Clamp confidence to 0-1
    confidence = Math.max(0, Math.min(1, confidence));

    // Generate reasoning
    let reasoning = "";
    if (density < 0.2) {
      reasoning = `Clear area with low visual complexity (${Math.round(density * 100)}% edge density)`;
    } else if (density < 0.4) {
      reasoning = `Moderately clear area (${Math.round(density * 100)}% edge density)`;
    } else {
      reasoning = `Some visual activity present (${Math.round(density * 100)}% edge density)`;
    }

    if (region.includes("top") && options.captionType === "speech") {
      reasoning += ". Good position for speech near character faces.";
    }
    if (region.includes("bottom") && options.captionType === "narration") {
      reasoning += ". Traditional narration box placement.";
    }

    suggestions.push({
      position: { ...basePosition },
      confidence,
      reasoning,
      region: region as PlacementSuggestion["region"],
    });
  }

  // Also add suggestions from calm regions not in standard positions
  for (const calmRegion of analysis.calmRegions.slice(0, 3)) {
    const centerX = calmRegion.x + calmRegion.width / 2;
    const centerY = calmRegion.y + calmRegion.height / 2;

    // Skip if too close to an existing suggestion
    const tooClose = suggestions.some((s) => {
      const dist = Math.sqrt(
        Math.pow(s.position.x - centerX, 2) + Math.pow(s.position.y - centerY, 2)
      );
      return dist < 15;
    });

    if (!tooClose) {
      suggestions.push({
        position: { x: centerX, y: centerY },
        confidence: calmRegion.score * 0.8, // Slightly lower confidence for non-standard positions
        reasoning: `Detected calm region with ${Math.round(calmRegion.score * 100)}% clarity`,
        region: getRegionName(centerX, centerY),
      });
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Suggest positions for multiple captions, ensuring they don't overlap
 */
export async function suggestMultiplePlacements(
  imagePath: string,
  captionTypes: CaptionType[]
): Promise<Map<CaptionType, PlacementSuggestion>> {
  const analysis = await analyzeImage(imagePath);
  const result = new Map<CaptionType, PlacementSuggestion>();
  const usedRegions = new Set<string>();

  for (const captionType of captionTypes) {
    const preferences = TYPE_PREFERENCES[captionType];

    // Find best region not yet used
    let bestSuggestion: PlacementSuggestion | null = null;
    let bestScore = -1;

    for (const region of preferences.regions) {
      if (usedRegions.has(region)) continue;

      const position = REGION_COORDS[region];
      const density = getDensityAtPosition(analysis, position.x, position.y);
      const score = 1 - density;

      if (score > bestScore) {
        bestScore = score;
        bestSuggestion = {
          position,
          confidence: score,
          reasoning: `Assigned to ${region} (${Math.round(density * 100)}% edge density)`,
          region: region as PlacementSuggestion["region"],
        };
      }
    }

    if (bestSuggestion) {
      result.set(captionType, bestSuggestion);
      usedRegions.add(bestSuggestion.region);
    }
  }

  return result;
}

/**
 * Get region name from coordinates
 */
function getRegionName(x: number, y: number): PlacementSuggestion["region"] {
  const horizontal = x < 33 ? "left" : x > 66 ? "right" : "center";
  const vertical = y < 33 ? "top" : y > 66 ? "bottom" : "center";

  if (horizontal === "center" && vertical === "center") return "center";
  if (vertical === "center") return `center-${horizontal}` as PlacementSuggestion["region"];
  return `${vertical}-${horizontal}` as PlacementSuggestion["region"];
}

// ============================================================================
// Quick Placement (Heuristics Only)
// ============================================================================

/**
 * Get a quick placement suggestion without image analysis (pure heuristics)
 */
export function getQuickPlacement(captionType: CaptionType): PlacementSuggestion {
  const preferences = TYPE_PREFERENCES[captionType];
  const primaryRegion = preferences.regions[0];
  const position = REGION_COORDS[primaryRegion];

  return {
    position,
    confidence: 0.7,
    reasoning: `Default ${captionType} position based on comic conventions`,
    region: primaryRegion as PlacementSuggestion["region"],
  };
}

/**
 * Get quick placements for multiple caption types
 */
export function getQuickPlacements(captionTypes: CaptionType[]): Map<CaptionType, PlacementSuggestion> {
  const result = new Map<CaptionType, PlacementSuggestion>();
  const usedRegions = new Set<string>();

  for (const captionType of captionTypes) {
    const preferences = TYPE_PREFERENCES[captionType];

    // Find first unused region
    for (const region of preferences.regions) {
      if (!usedRegions.has(region)) {
        result.set(captionType, {
          position: REGION_COORDS[region],
          confidence: 0.7,
          reasoning: `Default ${captionType} position`,
          region: region as PlacementSuggestion["region"],
        });
        usedRegions.add(region);
        break;
      }
    }
  }

  return result;
}
