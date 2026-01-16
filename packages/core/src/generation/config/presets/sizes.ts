/**
 * Size Presets
 *
 * Aspect-ratio based size presets with optimal dimensions per model family.
 * These are the "magic" resolutions that produce best results.
 *
 * SDXL-based models work best at specific bucket resolutions that total ~1MP.
 * SD1.5 works best at 512-based resolutions.
 * Flux is more flexible but still has preferences.
 */

import type { SizePreset } from "../types.js";

/**
 * All available size presets
 *
 * Organized by aspect ratio category. Each preset has optimal
 * dimensions for SDXL-based models (which require specific buckets),
 * SD1.5 (512-based), and Flux (more flexible).
 */
export const SIZE_PRESETS: Record<string, SizePreset> = {
  // ============================================================================
  // Square (1:1)
  // ============================================================================
  square_1x1: {
    id: "square_1x1",
    name: "Square (1:1)",
    aspectRatio: 1.0,
    dimensions: {
      sdxl: { width: 1024, height: 1024 },
      sd15: { width: 512, height: 512 },
      flux: { width: 1024, height: 1024 },
    },
    suggestedFor: ["avatar", "icon", "thumbnail", "profile"],
  },

  // ============================================================================
  // Portrait (taller than wide)
  // ============================================================================
  portrait_3x4: {
    id: "portrait_3x4",
    name: "Portrait (3:4)",
    aspectRatio: 0.75,
    dimensions: {
      sdxl: { width: 768, height: 1024 },
      sd15: { width: 384, height: 512 },
      flux: { width: 768, height: 1024 },
    },
    suggestedFor: ["character", "full-body", "standard-panel"],
  },
  portrait_2x3: {
    id: "portrait_2x3",
    name: "Portrait (2:3)",
    aspectRatio: 0.667,
    dimensions: {
      sdxl: { width: 832, height: 1216 },
      sd15: { width: 341, height: 512 },
      flux: { width: 832, height: 1248 },
    },
    suggestedFor: ["comic-panel", "page", "poster"],
  },
  portrait_9x16: {
    id: "portrait_9x16",
    name: "Portrait (9:16)",
    aspectRatio: 0.5625,
    dimensions: {
      sdxl: { width: 768, height: 1344 },
      sd15: { width: 288, height: 512 },
      flux: { width: 720, height: 1280 },
    },
    suggestedFor: ["mobile", "story", "vertical-video"],
  },
  portrait_1x2: {
    id: "portrait_1x2",
    name: "Portrait (1:2)",
    aspectRatio: 0.5,
    dimensions: {
      sdxl: { width: 704, height: 1408 },
      sd15: { width: 256, height: 512 },
      flux: { width: 640, height: 1280 },
    },
    suggestedFor: ["tall-panel", "vertical-strip"],
  },

  // ============================================================================
  // Landscape (wider than tall)
  // ============================================================================
  landscape_4x3: {
    id: "landscape_4x3",
    name: "Landscape (4:3)",
    aspectRatio: 1.333,
    dimensions: {
      sdxl: { width: 1024, height: 768 },
      sd15: { width: 512, height: 384 },
      flux: { width: 1024, height: 768 },
    },
    suggestedFor: ["scene", "establishing-shot", "dialog"],
  },
  landscape_3x2: {
    id: "landscape_3x2",
    name: "Landscape (3:2)",
    aspectRatio: 1.5,
    dimensions: {
      sdxl: { width: 1216, height: 832 },
      sd15: { width: 512, height: 341 },
      flux: { width: 1248, height: 832 },
    },
    suggestedFor: ["cinematic", "wide-panel", "photography"],
  },
  landscape_16x9: {
    id: "landscape_16x9",
    name: "Landscape (16:9)",
    aspectRatio: 1.778,
    dimensions: {
      sdxl: { width: 1344, height: 768 },
      sd15: { width: 512, height: 288 },
      flux: { width: 1280, height: 720 },
    },
    suggestedFor: ["cinematic-wide", "banner", "video-frame"],
  },
  landscape_21x9: {
    id: "landscape_21x9",
    name: "Ultra-wide (21:9)",
    aspectRatio: 2.333,
    dimensions: {
      sdxl: { width: 1536, height: 640 },
      sd15: { width: 512, height: 219 },
      flux: { width: 1344, height: 576 },
    },
    suggestedFor: ["panoramic", "establishing", "ultra-wide"],
  },
  landscape_2x1: {
    id: "landscape_2x1",
    name: "Double-wide (2:1)",
    aspectRatio: 2.0,
    dimensions: {
      sdxl: { width: 1408, height: 704 },
      sd15: { width: 512, height: 256 },
      flux: { width: 1280, height: 640 },
    },
    suggestedFor: ["horizontal-strip", "spread"],
  },

  // ============================================================================
  // Comic-specific (matched to common page layouts)
  // ============================================================================
  comic_full_page: {
    id: "comic_full_page",
    name: "Comic Full Page",
    aspectRatio: 0.65, // Matches comic_standard PAGE_SIZE (1988/3075)
    dimensions: {
      sdxl: { width: 832, height: 1280 },
      sd15: { width: 333, height: 512 },
      flux: { width: 832, height: 1280 },
    },
    suggestedFor: ["full-page", "splash", "cover"],
  },
  comic_half_horizontal: {
    id: "comic_half_horizontal",
    name: "Comic Half Page (Horizontal)",
    aspectRatio: 1.3, // Half of 0.65 page (horizontal strip)
    dimensions: {
      sdxl: { width: 1024, height: 768 },
      sd15: { width: 512, height: 394 },
      flux: { width: 1024, height: 787 },
    },
    suggestedFor: ["half-page", "wide-panel", "action-strip"],
  },
  comic_third_vertical: {
    id: "comic_third_vertical",
    name: "Comic Vertical Third",
    aspectRatio: 0.48, // Narrow vertical strip (1/3 page width, full height)
    dimensions: {
      sdxl: { width: 640, height: 1344 },
      sd15: { width: 246, height: 512 },
      flux: { width: 640, height: 1344 },
    },
    suggestedFor: ["vertical-strip", "side-panel", "action-sequence"],
  },
  comic_sixth_grid: {
    id: "comic_sixth_grid",
    name: "Comic Grid Panel (1/6)",
    aspectRatio: 0.97, // Standard 6-grid panel (slightly taller than square)
    dimensions: {
      sdxl: { width: 1024, height: 1056 },
      sd15: { width: 496, height: 512 },
      flux: { width: 1024, height: 1056 },
    },
    suggestedFor: ["grid-panel", "six-grid", "four-grid"],
  },

  // ============================================================================
  // Manga-specific
  // ============================================================================
  manga_full_page: {
    id: "manga_full_page",
    name: "Manga Full Page",
    aspectRatio: 0.71, // Matches manga_b6 PAGE_SIZE (1500/2100)
    dimensions: {
      sdxl: { width: 832, height: 1152 },
      sd15: { width: 363, height: 512 },
      flux: { width: 832, height: 1168 },
    },
    suggestedFor: ["manga-page", "manga-splash"],
  },

  // ============================================================================
  // Web/Social
  // ============================================================================
  instagram_square: {
    id: "instagram_square",
    name: "Instagram Square",
    aspectRatio: 1.0,
    dimensions: {
      sdxl: { width: 1080, height: 1080 },
      sd15: { width: 512, height: 512 },
      flux: { width: 1080, height: 1080 },
    },
    suggestedFor: ["instagram", "social-square"],
  },
  instagram_portrait: {
    id: "instagram_portrait",
    name: "Instagram Portrait (4:5)",
    aspectRatio: 0.8,
    dimensions: {
      sdxl: { width: 864, height: 1080 },
      sd15: { width: 410, height: 512 },
      flux: { width: 864, height: 1080 },
    },
    suggestedFor: ["instagram-portrait", "social-portrait"],
  },
};

/**
 * Get all size presets as array
 */
export function listSizePresets(): SizePreset[] {
  return Object.values(SIZE_PRESETS);
}

/**
 * Get size preset by ID
 */
export function getSizePreset(id: string): SizePreset | undefined {
  return SIZE_PRESETS[id];
}

/**
 * Find the closest preset to a given aspect ratio
 *
 * @param targetAspect - The aspect ratio to match
 * @param tolerance - How close is "close enough" (default 0.15 = 15%)
 * @returns The closest preset, or undefined if none within tolerance
 */
export function findClosestPreset(
  targetAspect: number,
  tolerance: number = 0.15
): SizePreset | undefined {
  let closest: SizePreset | undefined;
  let closestDiff = Infinity;

  for (const preset of Object.values(SIZE_PRESETS)) {
    const diff = Math.abs(preset.aspectRatio - targetAspect);
    // Calculate relative difference for better matching across aspect ratios
    const relativeDiff = diff / Math.max(preset.aspectRatio, targetAspect);

    if (relativeDiff < closestDiff && relativeDiff <= tolerance) {
      closest = preset;
      closestDiff = relativeDiff;
    }
  }

  return closest;
}

/**
 * Find presets suggested for a specific use case
 *
 * @param useCase - The use case to search for (e.g., "character", "cinematic")
 * @returns Array of matching presets
 */
export function findPresetsForUseCase(useCase: string): SizePreset[] {
  const lowerCase = useCase.toLowerCase();
  return Object.values(SIZE_PRESETS).filter(
    (preset) =>
      preset.suggestedFor?.some((suggested) =>
        suggested.toLowerCase().includes(lowerCase)
      )
  );
}

/**
 * Get presets grouped by category
 */
export function getPresetsByCategory(): Record<string, SizePreset[]> {
  const categories: Record<string, SizePreset[]> = {
    square: [],
    portrait: [],
    landscape: [],
    comic: [],
    manga: [],
    social: [],
  };

  for (const preset of Object.values(SIZE_PRESETS)) {
    if (preset.id.startsWith("square")) {
      categories.square.push(preset);
    } else if (preset.id.startsWith("portrait")) {
      categories.portrait.push(preset);
    } else if (preset.id.startsWith("landscape")) {
      categories.landscape.push(preset);
    } else if (preset.id.startsWith("comic")) {
      categories.comic.push(preset);
    } else if (preset.id.startsWith("manga")) {
      categories.manga.push(preset);
    } else if (preset.id.startsWith("instagram")) {
      categories.social.push(preset);
    }
  }

  return categories;
}
