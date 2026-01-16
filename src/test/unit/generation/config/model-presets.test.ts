/**
 * Unit Tests: Model Presets
 *
 * EXHAUSTIVE testing of the model preset system.
 * Tests all model families, detection logic, and helper functions.
 */

import { describe, test, expect } from "bun:test";
import {
  MODEL_PRESETS,
  getModelPreset,
  detectModelFamily,
  listModelFamilies,
  modelFamilyToDimensionKey,
  supportsNegativePrompt,
  getRecommendedCfgRange,
} from "../../../../generation/config/presets/models.js";
import type { ModelFamily } from "../../../../generation/config/types.js";

describe("Model Presets", () => {
  // ============================================================================
  // Preset Existence and Structure
  // ============================================================================

  describe("Preset Existence", () => {
    test("MODEL_PRESETS object exists", () => {
      expect(MODEL_PRESETS).toBeDefined();
      expect(typeof MODEL_PRESETS).toBe("object");
    });

    const expectedFamilies: ModelFamily[] = [
      "illustrious",
      "pony",
      "sdxl",
      "flux",
      "sd15",
      "realistic",
    ];

    test.each(expectedFamilies)("preset for %s exists", (family) => {
      expect(MODEL_PRESETS[family]).toBeDefined();
    });

    test("exactly 6 model families exist", () => {
      expect(Object.keys(MODEL_PRESETS).length).toBe(6);
    });
  });

  describe("Preset Structure Validation", () => {
    test("every preset has required fields", () => {
      for (const [family, preset] of Object.entries(MODEL_PRESETS)) {
        expect(preset.family).toBe(family as typeof preset.family);
        expect(typeof preset.cfg).toBe("number");
        expect(preset.cfg).toBeGreaterThan(0);
        expect(typeof preset.sampler).toBe("string");
        expect(preset.sampler.length).toBeGreaterThan(0);
        expect(typeof preset.scheduler).toBe("string");
        expect(preset.scheduler.length).toBeGreaterThan(0);
        expect(typeof preset.minSteps).toBe("number");
        expect(preset.minSteps).toBeGreaterThan(0);
        expect(typeof preset.defaultSteps).toBe("number");
        expect(preset.defaultSteps).toBeGreaterThanOrEqual(preset.minSteps);
        expect(typeof preset.supportsNegative).toBe("boolean");
      }
    });

    test("optional defaultModel is string when present", () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        if (preset.defaultModel !== undefined) {
          expect(typeof preset.defaultModel).toBe("string");
          expect(preset.defaultModel.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================================================
  // Specific Model Family Values
  // ============================================================================

  describe("Illustrious Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.illustrious.family).toBe("illustrious");
    });

    test("has default model defined", () => {
      expect(MODEL_PRESETS.illustrious.defaultModel).toBeDefined();
    });

    test("supports negative prompts", () => {
      expect(MODEL_PRESETS.illustrious.supportsNegative).toBe(true);
    });

    test("has reasonable CFG", () => {
      expect(MODEL_PRESETS.illustrious.cfg).toBeGreaterThanOrEqual(5);
      expect(MODEL_PRESETS.illustrious.cfg).toBeLessThanOrEqual(10);
    });
  });

  describe("Pony Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.pony.family).toBe("pony");
    });

    test("has default model defined", () => {
      expect(MODEL_PRESETS.pony.defaultModel).toBeDefined();
    });

    test("supports negative prompts", () => {
      expect(MODEL_PRESETS.pony.supportsNegative).toBe(true);
    });
  });

  describe("SDXL Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.sdxl.family).toBe("sdxl");
    });

    test("has default model defined", () => {
      expect(MODEL_PRESETS.sdxl.defaultModel).toBeDefined();
    });

    test("supports negative prompts", () => {
      expect(MODEL_PRESETS.sdxl.supportsNegative).toBe(true);
    });

    test("uses karras scheduler", () => {
      expect(MODEL_PRESETS.sdxl.scheduler).toBe("karras");
    });
  });

  describe("Flux Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.flux.family).toBe("flux");
    });

    test("does NOT support negative prompts", () => {
      expect(MODEL_PRESETS.flux.supportsNegative).toBe(false);
    });

    test("has lower CFG than other models", () => {
      expect(MODEL_PRESETS.flux.cfg).toBeLessThan(MODEL_PRESETS.sdxl.cfg);
    });

    test("uses simple scheduler", () => {
      expect(MODEL_PRESETS.flux.scheduler).toBe("simple");
    });
  });

  describe("SD1.5 Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.sd15.family).toBe("sd15");
    });

    test("supports negative prompts", () => {
      expect(MODEL_PRESETS.sd15.supportsNegative).toBe(true);
    });

    test("uses euler_ancestral sampler", () => {
      expect(MODEL_PRESETS.sd15.sampler).toBe("euler_ancestral");
    });
  });

  describe("Realistic Preset", () => {
    test("has correct family", () => {
      expect(MODEL_PRESETS.realistic.family).toBe("realistic");
    });

    test("supports negative prompts", () => {
      expect(MODEL_PRESETS.realistic.supportsNegative).toBe(true);
    });

    test("has higher default steps", () => {
      expect(MODEL_PRESETS.realistic.defaultSteps).toBeGreaterThanOrEqual(
        MODEL_PRESETS.sd15.defaultSteps
      );
    });
  });

  // ============================================================================
  // getModelPreset()
  // ============================================================================

  describe("getModelPreset()", () => {
    test.each([
      "illustrious",
      "pony",
      "sdxl",
      "flux",
      "sd15",
      "realistic",
    ] as ModelFamily[])("getModelPreset(%s) returns correct preset", (family) => {
      const preset = getModelPreset(family);
      expect(preset).toBeDefined();
      expect(preset.family).toBe(family);
      expect(preset).toBe(MODEL_PRESETS[family]);
    });
  });

  // ============================================================================
  // detectModelFamily()
  // ============================================================================

  describe("detectModelFamily()", () => {
    describe("Illustrious detection", () => {
      test.each([
        "illustriousXL_v1.safetensors",
        "illustriousNSFWFrom_gammaUpdate.safetensors",
        "noob_v1.0.safetensors",
        "NOOB_XL.ckpt",
        "wai-illustrious.safetensors",
        "WAI-NSFW.safetensors",
      ])("detects %s as illustrious", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("illustrious");
      });
    });

    describe("Pony detection", () => {
      test.each([
        "ponyDiffusionV6.safetensors",
        "ponyXL_v2.ckpt",
        "yiffInHell_yihXXXTended.safetensors",
        "yiffymix.safetensors",
        "furry_v1.safetensors",
        "novaFurry_v2.safetensors",
      ])("detects %s as pony", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("pony");
      });
    });

    describe("Flux detection", () => {
      test.each([
        "flux_dev.safetensors",
        "flux-schnell.safetensors",
        "FLUX_pro_v1.ckpt",
        "flux1-dev-fp8.safetensors",
      ])("detects %s as flux", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("flux");
      });
    });

    describe("Realistic detection", () => {
      test.each([
        "realistic_vision_v5.safetensors",
        "realisticVision.ckpt",
        "photon_v1.safetensors",
        "realvision_v4.safetensors",
        "photo_v2.safetensors",
      ])("detects %s as realistic", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("realistic");
      });
    });

    describe("SDXL detection", () => {
      test.each([
        "sdxl_base_1.0.safetensors",
        "SDXL_refiner.ckpt",
        "sdxl-vae.safetensors",
        "juggernautXL_v8.safetensors",
        "dreamshaper_xl.safetensors",
      ])("detects %s as sdxl", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("sdxl");
      });
    });

    describe("SD1.5 fallback", () => {
      test.each([
        "v1-5-pruned.safetensors",
        "dreamshaper_8.safetensors",
        "deliberate_v3.ckpt",
        "unknown_model.safetensors",
        "random.ckpt",
      ])("detects %s as sd15 (fallback)", (modelName) => {
        expect(detectModelFamily(modelName)).toBe("sd15");
      });
    });

    describe("Case insensitivity", () => {
      test("handles uppercase model names", () => {
        expect(detectModelFamily("FLUX_DEV.SAFETENSORS")).toBe("flux");
        expect(detectModelFamily("ILLUSTRIOUS_XL.CKPT")).toBe("illustrious");
      });

      test("handles mixed case model names", () => {
        expect(detectModelFamily("FlUx_DeV.safetensors")).toBe("flux");
        expect(detectModelFamily("PonyDiffusion_v6.ckpt")).toBe("pony");
      });
    });
  });

  // ============================================================================
  // listModelFamilies()
  // ============================================================================

  describe("listModelFamilies()", () => {
    test("returns array of all families", () => {
      const families = listModelFamilies();
      expect(Array.isArray(families)).toBe(true);
      expect(families.length).toBe(6);
    });

    test("includes all expected families", () => {
      const families = listModelFamilies();
      expect(families).toContain("illustrious");
      expect(families).toContain("pony");
      expect(families).toContain("sdxl");
      expect(families).toContain("flux");
      expect(families).toContain("sd15");
      expect(families).toContain("realistic");
    });
  });

  // ============================================================================
  // modelFamilyToDimensionKey()
  // ============================================================================

  describe("modelFamilyToDimensionKey()", () => {
    test("SDXL-based families map to sdxl", () => {
      expect(modelFamilyToDimensionKey("illustrious")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("pony")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("sdxl")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("realistic")).toBe("sdxl");
    });

    test("flux maps to flux", () => {
      expect(modelFamilyToDimensionKey("flux")).toBe("flux");
    });

    test("sd15 maps to sd15", () => {
      expect(modelFamilyToDimensionKey("sd15")).toBe("sd15");
    });
  });

  // ============================================================================
  // supportsNegativePrompt()
  // ============================================================================

  describe("supportsNegativePrompt()", () => {
    test("returns true for illustrious", () => {
      expect(supportsNegativePrompt("illustrious")).toBe(true);
    });

    test("returns true for pony", () => {
      expect(supportsNegativePrompt("pony")).toBe(true);
    });

    test("returns true for sdxl", () => {
      expect(supportsNegativePrompt("sdxl")).toBe(true);
    });

    test("returns false for flux", () => {
      expect(supportsNegativePrompt("flux")).toBe(false);
    });

    test("returns true for sd15", () => {
      expect(supportsNegativePrompt("sd15")).toBe(true);
    });

    test("returns true for realistic", () => {
      expect(supportsNegativePrompt("realistic")).toBe(true);
    });

    test("matches preset values", () => {
      for (const family of listModelFamilies()) {
        expect(supportsNegativePrompt(family)).toBe(
          MODEL_PRESETS[family].supportsNegative
        );
      }
    });
  });

  // ============================================================================
  // getRecommendedCfgRange()
  // ============================================================================

  describe("getRecommendedCfgRange()", () => {
    test("returns object with min, max, default", () => {
      const range = getRecommendedCfgRange("sdxl");
      expect(range).toHaveProperty("min");
      expect(range).toHaveProperty("max");
      expect(range).toHaveProperty("default");
    });

    test("min is less than max", () => {
      for (const family of listModelFamilies()) {
        const range = getRecommendedCfgRange(family);
        expect(range.min).toBeLessThan(range.max);
      }
    });

    test("default is within range", () => {
      for (const family of listModelFamilies()) {
        const range = getRecommendedCfgRange(family);
        expect(range.default).toBeGreaterThanOrEqual(range.min);
        expect(range.default).toBeLessThanOrEqual(range.max);
      }
    });

    test("flux has lower range than others", () => {
      const fluxRange = getRecommendedCfgRange("flux");
      const sdxlRange = getRecommendedCfgRange("sdxl");
      expect(fluxRange.max).toBeLessThan(sdxlRange.max);
    });

    test("default matches preset CFG", () => {
      for (const family of listModelFamilies()) {
        const range = getRecommendedCfgRange(family);
        expect(range.default).toBe(MODEL_PRESETS[family].cfg);
      }
    });
  });

  // ============================================================================
  // Edge Cases and Robustness
  // ============================================================================

  describe("Edge Cases", () => {
    test("all samplers are valid strings", () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(typeof preset.sampler).toBe("string");
        expect(preset.sampler.length).toBeGreaterThan(0);
      }
    });

    test("all schedulers are valid strings", () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(typeof preset.scheduler).toBe("string");
        expect(preset.scheduler.length).toBeGreaterThan(0);
      }
    });

    test("step counts are reasonable", () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(preset.minSteps).toBeGreaterThanOrEqual(10);
        expect(preset.minSteps).toBeLessThanOrEqual(50);
        expect(preset.defaultSteps).toBeGreaterThanOrEqual(20);
        expect(preset.defaultSteps).toBeLessThanOrEqual(50);
      }
    });

    test("CFG values are positive", () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(preset.cfg).toBeGreaterThan(0);
      }
    });
  });
});
