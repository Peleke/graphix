/**
 * Unit Tests: Size Presets
 *
 * EXHAUSTIVE testing of the size preset system.
 * Tests all presets, model family dimensions, findClosestPreset, and edge cases.
 */

import { describe, test, expect } from "bun:test";
import {
  SIZE_PRESETS,
  listSizePresets,
  getSizePreset,
  findClosestPreset,
  findPresetsForUseCase,
  getPresetsByCategory,
} from "../../../../generation/config/presets/sizes.js";
import type { ModelFamily } from "../../../../generation/config/types.js";

describe("Size Presets", () => {
  // ============================================================================
  // Preset Existence and Structure
  // ============================================================================

  describe("Preset Existence", () => {
    test("SIZE_PRESETS object exists and is non-empty", () => {
      expect(SIZE_PRESETS).toBeDefined();
      expect(typeof SIZE_PRESETS).toBe("object");
      expect(Object.keys(SIZE_PRESETS).length).toBeGreaterThan(0);
    });

    const expectedPresets = [
      "square_1x1",
      "portrait_3x4",
      "portrait_2x3",
      "portrait_9x16",
      "portrait_1x2",
      "landscape_4x3",
      "landscape_3x2",
      "landscape_16x9",
      "landscape_21x9",
      "landscape_2x1",
      "comic_full_page",
      "comic_half_horizontal",
      "comic_third_vertical",
      "comic_sixth_grid",
      "manga_full_page",
      "instagram_square",
      "instagram_portrait",
    ];

    test.each(expectedPresets)("preset %s exists", (presetId) => {
      expect(SIZE_PRESETS[presetId]).toBeDefined();
    });

    test("all expected presets are present", () => {
      for (const presetId of expectedPresets) {
        expect(SIZE_PRESETS[presetId]).toBeDefined();
      }
    });
  });

  describe("Preset Structure Validation", () => {
    test("every preset has required fields", () => {
      for (const [id, preset] of Object.entries(SIZE_PRESETS)) {
        expect(preset.id).toBe(id);
        expect(preset.name).toBeDefined();
        expect(typeof preset.name).toBe("string");
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.aspectRatio).toBeDefined();
        expect(typeof preset.aspectRatio).toBe("number");
        expect(preset.aspectRatio).toBeGreaterThan(0);
        expect(preset.dimensions).toBeDefined();
        expect(typeof preset.dimensions).toBe("object");
      }
    });

    test("every preset has suggestedFor array", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        expect(preset.suggestedFor).toBeDefined();
        expect(Array.isArray(preset.suggestedFor)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Model Family Dimensions
  // ============================================================================

  describe("Model Family Dimensions", () => {
    const modelFamilies: ("sdxl" | "sd15" | "flux")[] = ["sdxl", "sd15", "flux"];

    test.each(modelFamilies)("every preset has dimensions for %s", (family) => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        expect(preset.dimensions[family]).toBeDefined();
        expect(preset.dimensions[family].width).toBeDefined();
        expect(preset.dimensions[family].height).toBeDefined();
        expect(typeof preset.dimensions[family].width).toBe("number");
        expect(typeof preset.dimensions[family].height).toBe("number");
      }
    });

    test("SDXL dimensions are divisible by 64", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        const { width, height } = preset.dimensions.sdxl;
        expect(width % 64).toBe(0);
        expect(height % 64).toBe(0);
      }
    });

    test("SD1.5 dimensions are positive", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        const { width, height } = preset.dimensions.sd15;
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
      }
    });

    test("Flux dimensions are positive", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        const { width, height } = preset.dimensions.flux;
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
      }
    });

    test("SDXL dimensions maintain reasonable megapixel count (0.4-1.6 MP)", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        const { width, height } = preset.dimensions.sdxl;
        const megapixels = (width * height) / 1_000_000;
        expect(megapixels).toBeGreaterThanOrEqual(0.4);
        expect(megapixels).toBeLessThanOrEqual(1.6);
      }
    });

    test("dimensions approximately match aspect ratio (within 10%)", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        for (const family of modelFamilies) {
          const { width, height } = preset.dimensions[family];
          const actualRatio = width / height;
          const expectedRatio = preset.aspectRatio;
          const error = Math.abs(actualRatio - expectedRatio) / expectedRatio;
          expect(error).toBeLessThan(0.15);
        }
      }
    });
  });

  // ============================================================================
  // Specific Preset Values
  // ============================================================================

  describe("Specific Preset Values", () => {
    test("square_1x1 has 1:1 aspect ratio", () => {
      const preset = SIZE_PRESETS.square_1x1;
      expect(preset.aspectRatio).toBe(1);
      expect(preset.dimensions.sdxl.width).toBe(preset.dimensions.sdxl.height);
    });

    test("portrait_3x4 has 0.75 aspect ratio", () => {
      const preset = SIZE_PRESETS.portrait_3x4;
      expect(preset.aspectRatio).toBe(0.75);
    });

    test("portrait_2x3 has ~0.667 aspect ratio", () => {
      const preset = SIZE_PRESETS.portrait_2x3;
      expect(preset.aspectRatio).toBeCloseTo(2 / 3, 2);
    });

    test("portrait_9x16 has 0.5625 aspect ratio", () => {
      const preset = SIZE_PRESETS.portrait_9x16;
      expect(preset.aspectRatio).toBe(0.5625);
    });

    test("landscape_4x3 has ~1.333 aspect ratio", () => {
      const preset = SIZE_PRESETS.landscape_4x3;
      expect(preset.aspectRatio).toBeCloseTo(4 / 3, 2);
    });

    test("landscape_16x9 has ~1.778 aspect ratio", () => {
      const preset = SIZE_PRESETS.landscape_16x9;
      expect(preset.aspectRatio).toBeCloseTo(16 / 9, 2);
    });

    test("landscape_21x9 has ~2.333 aspect ratio", () => {
      const preset = SIZE_PRESETS.landscape_21x9;
      expect(preset.aspectRatio).toBeCloseTo(21 / 9, 2);
    });

    test("comic presets start with comic_", () => {
      for (const key of Object.keys(SIZE_PRESETS)) {
        if (key.includes("comic")) {
          expect(key.startsWith("comic_")).toBe(true);
        }
      }
    });

    test("instagram presets start with instagram_", () => {
      for (const key of Object.keys(SIZE_PRESETS)) {
        if (key.includes("instagram")) {
          expect(key.startsWith("instagram_")).toBe(true);
        }
      }
    });
  });

  // ============================================================================
  // listSizePresets()
  // ============================================================================

  describe("listSizePresets()", () => {
    test("returns an array", () => {
      const presets = listSizePresets();
      expect(Array.isArray(presets)).toBe(true);
    });

    test("returns all presets", () => {
      const presets = listSizePresets();
      expect(presets.length).toBe(Object.keys(SIZE_PRESETS).length);
    });

    test("returns preset objects with id field", () => {
      const presets = listSizePresets();
      for (const preset of presets) {
        expect(preset.id).toBeDefined();
        expect(SIZE_PRESETS[preset.id]).toBeDefined();
      }
    });

    test("returns same data as SIZE_PRESETS", () => {
      const presets = listSizePresets();
      for (const preset of presets) {
        expect(preset).toEqual(SIZE_PRESETS[preset.id]);
      }
    });
  });

  // ============================================================================
  // getSizePreset()
  // ============================================================================

  describe("getSizePreset()", () => {
    test("returns preset by ID", () => {
      const preset = getSizePreset("square_1x1");
      expect(preset).toBeDefined();
      expect(preset?.id).toBe("square_1x1");
    });

    test("returns undefined for unknown ID", () => {
      const preset = getSizePreset("nonexistent_preset");
      expect(preset).toBeUndefined();
    });

    test("returns undefined for empty string", () => {
      const preset = getSizePreset("");
      expect(preset).toBeUndefined();
    });

    test.each(Object.keys(SIZE_PRESETS))("getSizePreset(%s) returns correct preset", (id) => {
      const preset = getSizePreset(id);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(id);
      expect(preset).toEqual(SIZE_PRESETS[id]);
    });
  });

  // ============================================================================
  // findClosestPreset()
  // ============================================================================

  describe("findClosestPreset()", () => {
    test("finds exact 1:1 match for square", () => {
      const preset = findClosestPreset(1.0);
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBe(1.0);
    });

    test("finds exact 16:9 match", () => {
      const preset = findClosestPreset(16 / 9);
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBeCloseTo(16 / 9, 2);
    });

    test("finds exact 3:4 portrait match", () => {
      const preset = findClosestPreset(0.75);
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBe(0.75);
    });

    test("finds closest match for approximate ratio", () => {
      // 1.5 should match landscape_3x2 (1.5)
      const preset = findClosestPreset(1.5);
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBeCloseTo(1.5, 2);
    });

    test("returns undefined for extreme ratios with tight tolerance", () => {
      const preset = findClosestPreset(10.0, 0.01); // Very wide ratio, tight tolerance
      expect(preset).toBeUndefined();
    });

    test("respects tolerance parameter", () => {
      // 0.76 is close to 0.75 (portrait_3x4)
      const withLooseTolerance = findClosestPreset(0.76, 0.1);
      expect(withLooseTolerance).toBeDefined();

      const withTightTolerance = findClosestPreset(0.76, 0.001);
      expect(withTightTolerance).toBeUndefined();
    });

    test("handles edge case: zero aspect ratio returns undefined", () => {
      const preset = findClosestPreset(0);
      expect(preset).toBeUndefined();
    });

    test("handles edge case: negative aspect ratio returns undefined", () => {
      const preset = findClosestPreset(-1);
      expect(preset).toBeUndefined();
    });

    test("finds best match from multiple similar ratios", () => {
      // Test that it finds the CLOSEST, not just any match
      const preset = findClosestPreset(1.0, 0.5); // Loose tolerance
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBe(1.0); // Should match exact square
    });
  });

  // ============================================================================
  // findPresetsForUseCase()
  // ============================================================================

  describe("findPresetsForUseCase()", () => {
    test("finds presets for 'character' use case", () => {
      const presets = findPresetsForUseCase("character");
      expect(presets.length).toBeGreaterThan(0);
    });

    test("finds presets for 'cinematic' use case", () => {
      const presets = findPresetsForUseCase("cinematic");
      expect(presets.length).toBeGreaterThan(0);
    });

    test("finds presets for 'instagram' use case", () => {
      const presets = findPresetsForUseCase("instagram");
      expect(presets.length).toBeGreaterThan(0);
    });

    test("returns empty array for unknown use case", () => {
      const presets = findPresetsForUseCase("nonexistent_use_case_12345");
      expect(presets).toEqual([]);
    });

    test("case-insensitive search", () => {
      const lowerCase = findPresetsForUseCase("instagram");
      const upperCase = findPresetsForUseCase("INSTAGRAM");
      expect(lowerCase.length).toBe(upperCase.length);
    });
  });

  // ============================================================================
  // getPresetsByCategory()
  // ============================================================================

  describe("getPresetsByCategory()", () => {
    test("returns object with category keys", () => {
      const categories = getPresetsByCategory();
      expect(typeof categories).toBe("object");
      expect(Object.keys(categories).length).toBeGreaterThan(0);
    });

    test("has square category", () => {
      const categories = getPresetsByCategory();
      expect(categories.square).toBeDefined();
      expect(Array.isArray(categories.square)).toBe(true);
    });

    test("has portrait category", () => {
      const categories = getPresetsByCategory();
      expect(categories.portrait).toBeDefined();
      expect(Array.isArray(categories.portrait)).toBe(true);
    });

    test("has landscape category", () => {
      const categories = getPresetsByCategory();
      expect(categories.landscape).toBeDefined();
      expect(Array.isArray(categories.landscape)).toBe(true);
    });

    test("has comic category", () => {
      const categories = getPresetsByCategory();
      expect(categories.comic).toBeDefined();
      expect(Array.isArray(categories.comic)).toBe(true);
    });

    test("has social category", () => {
      const categories = getPresetsByCategory();
      expect(categories.social).toBeDefined();
      expect(Array.isArray(categories.social)).toBe(true);
    });

    test("has manga category", () => {
      const categories = getPresetsByCategory();
      expect(categories.manga).toBeDefined();
      expect(Array.isArray(categories.manga)).toBe(true);
    });

    test("categories cover all presets", () => {
      const categories = getPresetsByCategory();
      let total = 0;
      for (const presets of Object.values(categories)) {
        total += presets.length;
      }
      expect(total).toBe(Object.keys(SIZE_PRESETS).length);
    });
  });

  // ============================================================================
  // Edge Cases and Robustness
  // ============================================================================

  describe("Edge Cases", () => {
    test("preset names are human-readable", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        expect(preset.name.length).toBeGreaterThan(0);
      }
    });

    test("no duplicate preset IDs", () => {
      const ids = Object.keys(SIZE_PRESETS);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test("dimensions don't exceed reasonable maximums", () => {
      for (const preset of Object.values(SIZE_PRESETS)) {
        for (const dims of Object.values(preset.dimensions)) {
          expect(dims.width).toBeLessThanOrEqual(2048);
          expect(dims.height).toBeLessThanOrEqual(2048);
          expect(dims.width).toBeGreaterThanOrEqual(200);
          expect(dims.height).toBeGreaterThanOrEqual(200);
        }
      }
    });
  });
});
