/**
 * Unit Tests: Quality Presets
 *
 * EXHAUSTIVE testing of the quality preset system.
 * Tests all quality tiers, parameter verification, recommendations.
 */

import { describe, test, expect } from "bun:test";
import {
  QUALITY_PRESETS,
  getQualityPreset,
  getQualityPresetSafe,
  listQualityPresets,
  getQualityPresetsBySpeed,
  estimateRelativeTime,
  recommendQualityPreset,
} from "../../../../generation/config/presets/quality.js";
import type { QualityPresetId } from "../../../../generation/config/types.js";

describe("Quality Presets", () => {
  // ============================================================================
  // Preset Existence and Structure
  // ============================================================================

  describe("Preset Existence", () => {
    test("QUALITY_PRESETS object exists", () => {
      expect(QUALITY_PRESETS).toBeDefined();
      expect(typeof QUALITY_PRESETS).toBe("object");
    });

    const expectedPresets: QualityPresetId[] = ["draft", "standard", "high", "ultra"];

    test.each(expectedPresets)("preset %s exists", (presetId) => {
      expect(QUALITY_PRESETS[presetId]).toBeDefined();
    });

    test("exactly 4 quality presets exist", () => {
      expect(Object.keys(QUALITY_PRESETS).length).toBe(4);
    });

    test("all expected presets are present", () => {
      for (const presetId of expectedPresets) {
        expect(QUALITY_PRESETS[presetId]).toBeDefined();
      }
    });
  });

  describe("Preset Structure Validation", () => {
    test("every preset has required fields", () => {
      for (const [id, preset] of Object.entries(QUALITY_PRESETS)) {
        expect(preset.id).toBe(id as typeof preset.id);
        expect(preset.name).toBeDefined();
        expect(typeof preset.name).toBe("string");
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.steps).toBeDefined();
        expect(typeof preset.steps).toBe("number");
        expect(preset.steps).toBeGreaterThan(0);
        expect(preset.cfg).toBeDefined();
        expect(preset.sampler).toBeDefined();
        expect(preset.scheduler).toBeDefined();
      }
    });

    test("every preset has generation settings", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        expect(typeof preset.steps).toBe("number");
        expect(typeof preset.cfg).toBe("number");
        expect(typeof preset.sampler).toBe("string");
        expect(typeof preset.scheduler).toBe("string");
      }
    });

    test("every preset has optional enhancement flags", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        // These are optional booleans
        if (preset.hiResFix !== undefined) {
          expect(typeof preset.hiResFix).toBe("boolean");
        }
        if (preset.upscale !== undefined) {
          expect(typeof preset.upscale).toBe("boolean");
        }
      }
    });
  });

  // ============================================================================
  // Specific Preset Values
  // ============================================================================

  describe("Draft Preset", () => {
    test("has minimum steps for speed", () => {
      const preset = QUALITY_PRESETS.draft;
      expect(preset.steps).toBeLessThanOrEqual(20);
      expect(preset.steps).toBeGreaterThanOrEqual(10);
    });

    test("does not enable hi-res fix", () => {
      const preset = QUALITY_PRESETS.draft;
      expect(preset.hiResFix).toBeFalsy();
    });

    test("does not enable upscale", () => {
      const preset = QUALITY_PRESETS.draft;
      expect(preset.upscale).toBeFalsy();
    });
  });

  describe("Standard Preset", () => {
    test("has balanced step count", () => {
      const preset = QUALITY_PRESETS.standard;
      expect(preset.steps).toBeGreaterThan(QUALITY_PRESETS.draft.steps);
      expect(preset.steps).toBeLessThan(QUALITY_PRESETS.high.steps);
    });

    test("is the default quality tier", () => {
      const preset = QUALITY_PRESETS.standard;
      expect(preset.steps).toBeGreaterThanOrEqual(25);
      expect(preset.steps).toBeLessThanOrEqual(35);
    });
  });

  describe("High Preset", () => {
    test("has more steps than standard", () => {
      const preset = QUALITY_PRESETS.high;
      expect(preset.steps).toBeGreaterThan(QUALITY_PRESETS.standard.steps);
    });

    test("enables hi-res fix", () => {
      const preset = QUALITY_PRESETS.high;
      expect(preset.hiResFix).toBe(true);
    });
  });

  describe("Ultra Preset", () => {
    test("has maximum step count", () => {
      const preset = QUALITY_PRESETS.ultra;
      expect(preset.steps).toBeGreaterThanOrEqual(35);
    });

    test("has most steps of all presets", () => {
      const preset = QUALITY_PRESETS.ultra;
      expect(preset.steps).toBeGreaterThan(QUALITY_PRESETS.high.steps);
    });

    test("enables all quality enhancements", () => {
      const preset = QUALITY_PRESETS.ultra;
      expect(preset.hiResFix).toBe(true);
      expect(preset.upscale).toBe(true);
    });
  });

  // ============================================================================
  // Step Count Progression
  // ============================================================================

  describe("Step Count Progression", () => {
    test("steps increase from draft to ultra", () => {
      expect(QUALITY_PRESETS.draft.steps).toBeLessThan(QUALITY_PRESETS.standard.steps);
      expect(QUALITY_PRESETS.standard.steps).toBeLessThan(QUALITY_PRESETS.high.steps);
      expect(QUALITY_PRESETS.high.steps).toBeLessThan(QUALITY_PRESETS.ultra.steps);
    });

    test("step progression is reasonable (not too extreme)", () => {
      const draftSteps = QUALITY_PRESETS.draft.steps;
      const ultraSteps = QUALITY_PRESETS.ultra.steps;
      // Ultra should not be more than 5x draft
      expect(ultraSteps / draftSteps).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // getQualityPreset()
  // ============================================================================

  describe("getQualityPreset()", () => {
    test("returns draft preset", () => {
      const preset = getQualityPreset("draft");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("draft");
    });

    test("returns standard preset", () => {
      const preset = getQualityPreset("standard");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("standard");
    });

    test("returns high preset", () => {
      const preset = getQualityPreset("high");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("high");
    });

    test("returns ultra preset", () => {
      const preset = getQualityPreset("ultra");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("ultra");
    });

    test.each(["draft", "standard", "high", "ultra"] as QualityPresetId[])(
      "getQualityPreset(%s) returns correct preset",
      (id) => {
        const preset = getQualityPreset(id);
        expect(preset).toEqual(QUALITY_PRESETS[id]);
      }
    );
  });

  // ============================================================================
  // getQualityPresetSafe()
  // ============================================================================

  describe("getQualityPresetSafe()", () => {
    test("returns preset for valid ID", () => {
      const preset = getQualityPresetSafe("high");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("high");
    });

    test("returns standard for invalid ID", () => {
      const preset = getQualityPresetSafe("invalid");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("standard");
    });

    test("returns standard for empty string", () => {
      const preset = getQualityPresetSafe("");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("standard");
    });

    test("returns standard for undefined", () => {
      const preset = getQualityPresetSafe(undefined);
      expect(preset).toBeDefined();
      expect(preset.id).toBe("standard");
    });

    test.each(["draft", "standard", "high", "ultra"] as QualityPresetId[])(
      "getQualityPresetSafe(%s) returns correct preset for valid IDs",
      (id) => {
        const preset = getQualityPresetSafe(id);
        expect(preset.id).toBe(id);
      }
    );
  });

  // ============================================================================
  // listQualityPresets()
  // ============================================================================

  describe("listQualityPresets()", () => {
    test("returns an array", () => {
      const presets = listQualityPresets();
      expect(Array.isArray(presets)).toBe(true);
    });

    test("returns all 4 presets", () => {
      const presets = listQualityPresets();
      expect(presets.length).toBe(4);
    });

    test("returns presets with id field", () => {
      const presets = listQualityPresets();
      for (const preset of presets) {
        expect(preset.id).toBeDefined();
        expect(["draft", "standard", "high", "ultra"]).toContain(preset.id);
      }
    });

    test("returns same data as QUALITY_PRESETS", () => {
      const presets = listQualityPresets();
      for (const preset of presets) {
        expect(preset).toEqual(QUALITY_PRESETS[preset.id]);
      }
    });
  });

  // ============================================================================
  // getQualityPresetsBySpeed()
  // ============================================================================

  describe("getQualityPresetsBySpeed()", () => {
    test("returns presets sorted by speed (fastest first)", () => {
      const presets = getQualityPresetsBySpeed();
      expect(presets.length).toBe(4);
      // Fastest = fewest steps
      expect(presets[0].id).toBe("draft");
      expect(presets[3].id).toBe("ultra");
    });

    test("presets are in ascending step order", () => {
      const presets = getQualityPresetsBySpeed();
      for (let i = 1; i < presets.length; i++) {
        expect(presets[i].steps).toBeGreaterThan(presets[i - 1].steps);
      }
    });
  });

  // ============================================================================
  // estimateRelativeTime()
  // ============================================================================

  describe("estimateRelativeTime()", () => {
    test("draft is fastest", () => {
      const time = estimateRelativeTime(QUALITY_PRESETS.draft);
      expect(time).toBeLessThan(1.0);
    });

    test("standard is baseline (~1.0)", () => {
      const time = estimateRelativeTime(QUALITY_PRESETS.standard);
      expect(time).toBeCloseTo(1.0, 0);
    });

    test("high is slower than standard", () => {
      const standardTime = estimateRelativeTime(QUALITY_PRESETS.standard);
      const highTime = estimateRelativeTime(QUALITY_PRESETS.high);
      expect(highTime).toBeGreaterThan(standardTime);
    });

    test("ultra is slowest", () => {
      const highTime = estimateRelativeTime(QUALITY_PRESETS.high);
      const ultraTime = estimateRelativeTime(QUALITY_PRESETS.ultra);
      expect(ultraTime).toBeGreaterThan(highTime);
    });

    test("time increases with steps and enhancements", () => {
      const draftTime = estimateRelativeTime(QUALITY_PRESETS.draft);
      const ultraTime = estimateRelativeTime(QUALITY_PRESETS.ultra);
      expect(ultraTime).toBeGreaterThan(draftTime * 2);
    });
  });

  // ============================================================================
  // recommendQualityPreset()
  // ============================================================================

  describe("recommendQualityPreset()", () => {
    test("recommends draft for preview", () => {
      const recommended = recommendQualityPreset("preview");
      expect(recommended).toBe("draft");
    });

    test("recommends standard for iteration", () => {
      const recommended = recommendQualityPreset("iteration");
      expect(recommended).toBe("standard");
    });

    test("recommends high for final", () => {
      const recommended = recommendQualityPreset("final");
      expect(recommended).toBe("high");
    });

    test("recommends ultra for print", () => {
      const recommended = recommendQualityPreset("print");
      expect(recommended).toBe("ultra");
    });

    test("recommends standard for web", () => {
      const recommended = recommendQualityPreset("web");
      expect(recommended).toBe("standard");
    });

    test("recommends standard for social", () => {
      const recommended = recommendQualityPreset("social");
      expect(recommended).toBe("standard");
    });

    test("all recommendations are valid preset IDs", () => {
      const useCases = ["preview", "iteration", "final", "print", "web", "social"] as const;
      for (const useCase of useCases) {
        const recommended = recommendQualityPreset(useCase);
        expect(QUALITY_PRESETS[recommended]).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Edge Cases and Robustness
  // ============================================================================

  describe("Edge Cases", () => {
    test("preset names are non-empty", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        expect(preset.name.length).toBeGreaterThan(0);
      }
    });

    test("no duplicate preset IDs", () => {
      const ids = Object.keys(QUALITY_PRESETS);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test("steps are reasonable integers", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        expect(Number.isInteger(preset.steps)).toBe(true);
        expect(preset.steps).toBeGreaterThanOrEqual(10);
        expect(preset.steps).toBeLessThanOrEqual(100);
      }
    });

    test("cfg values are reasonable", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        expect(preset.cfg).toBeGreaterThanOrEqual(1);
        expect(preset.cfg).toBeLessThanOrEqual(20);
      }
    });

    test("samplers are valid strings", () => {
      for (const preset of Object.values(QUALITY_PRESETS)) {
        expect(typeof preset.sampler).toBe("string");
        expect(preset.sampler.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Type Safety
  // ============================================================================

  describe("Type Safety", () => {
    test("QualityPresetId type includes all presets", () => {
      const validIds: QualityPresetId[] = ["draft", "standard", "high", "ultra"];
      for (const id of validIds) {
        expect(QUALITY_PRESETS[id]).toBeDefined();
      }
    });

    test("QUALITY_PRESETS keys match QualityPresetId type", () => {
      const keys = Object.keys(QUALITY_PRESETS) as QualityPresetId[];
      expect(keys.length).toBe(4);
      expect(keys).toContain("draft");
      expect(keys).toContain("standard");
      expect(keys).toContain("high");
      expect(keys).toContain("ultra");
    });
  });
});
