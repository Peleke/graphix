/**
 * Unit Tests: Default Configuration Strategy
 *
 * EXHAUSTIVE testing of the backward-compatible default strategy.
 * Tests resolution, defaults, overrides, and edge cases.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  DefaultConfigurationStrategy,
  getDefaultStrategy,
} from "../../../../generation/config/strategies/default.strategy.js";
import { QUALITY_PRESETS } from "../../../../generation/config/presets/quality.js";
import { SIZE_PRESETS } from "../../../../generation/config/presets/sizes.js";
import type { ConfigResolutionOptions } from "../../../../generation/config/types.js";

describe("Default Configuration Strategy", () => {
  let strategy: DefaultConfigurationStrategy;

  beforeEach(() => {
    strategy = new DefaultConfigurationStrategy();
  });

  // ============================================================================
  // Strategy Identity
  // ============================================================================

  describe("Strategy Identity", () => {
    test("has correct id", () => {
      expect(strategy.id).toBe("default");
    });

    test("has human-readable name", () => {
      expect(strategy.name).toBeDefined();
      expect(strategy.name.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Singleton
  // ============================================================================

  describe("Singleton", () => {
    test("getDefaultStrategy returns instance", () => {
      const instance = getDefaultStrategy();
      expect(instance).toBeDefined();
      expect(instance instanceof DefaultConfigurationStrategy).toBe(true);
    });

    test("getDefaultStrategy returns same instance", () => {
      const a = getDefaultStrategy();
      const b = getDefaultStrategy();
      expect(a).toBe(b);
    });
  });

  // ============================================================================
  // Default Resolution (No Options)
  // ============================================================================

  describe("Default Resolution", () => {
    test("resolves with no options", async () => {
      const config = await strategy.resolve({});
      expect(config).toBeDefined();
    });

    test("provides default width", async () => {
      const config = await strategy.resolve({});
      expect(config.width).toBeDefined();
      expect(typeof config.width).toBe("number");
      expect(config.width).toBeGreaterThan(0);
    });

    test("provides default height", async () => {
      const config = await strategy.resolve({});
      expect(config.height).toBeDefined();
      expect(typeof config.height).toBe("number");
      expect(config.height).toBeGreaterThan(0);
    });

    test("provides default steps", async () => {
      const config = await strategy.resolve({});
      expect(config.steps).toBeDefined();
      expect(typeof config.steps).toBe("number");
      expect(config.steps).toBeGreaterThan(0);
    });

    test("provides default cfg", async () => {
      const config = await strategy.resolve({});
      expect(config.cfg).toBeDefined();
      expect(typeof config.cfg).toBe("number");
      expect(config.cfg).toBeGreaterThan(0);
    });

    test("provides default model", async () => {
      const config = await strategy.resolve({});
      expect(config.model).toBeDefined();
      expect(typeof config.model).toBe("string");
    });

    test("provides model family", async () => {
      const config = await strategy.resolve({});
      expect(config.modelFamily).toBeDefined();
      expect(["illustrious", "pony", "sdxl", "flux", "sd15", "realistic"]).toContain(
        config.modelFamily
      );
    });

    test("provides sources object for tracking", async () => {
      const config = await strategy.resolve({});
      expect(config.sources).toBeDefined();
      expect(config.sources.width).toBeDefined();
      expect(config.sources.height).toBeDefined();
      expect(config.sources.steps).toBeDefined();
      expect(config.sources.cfg).toBeDefined();
    });

    test("default dimensions are divisible by 64", async () => {
      const config = await strategy.resolve({});
      expect(config.width % 64).toBe(0);
      expect(config.height % 64).toBe(0);
    });

    test("default dimensions are portrait-ish (for comic panels)", async () => {
      const config = await strategy.resolve({});
      // Default should be portrait or square for typical comic use
      expect(config.width).toBeLessThanOrEqual(config.height * 1.5);
    });
  });

  // ============================================================================
  // Quality Preset Resolution
  // ============================================================================

  describe("Quality Preset Resolution", () => {
    test("applies draft preset", async () => {
      const config = await strategy.resolve({ qualityPreset: "draft" });
      expect(config.steps).toBe(QUALITY_PRESETS.draft.steps);
    });

    test("applies standard preset", async () => {
      const config = await strategy.resolve({ qualityPreset: "standard" });
      expect(config.steps).toBe(QUALITY_PRESETS.standard.steps);
    });

    test("applies high preset", async () => {
      const config = await strategy.resolve({ qualityPreset: "high" });
      expect(config.steps).toBe(QUALITY_PRESETS.high.steps);
    });

    test("applies ultra preset", async () => {
      const config = await strategy.resolve({ qualityPreset: "ultra" });
      expect(config.steps).toBe(QUALITY_PRESETS.ultra.steps);
    });

    test("tracks source as 'preset' when using preset", async () => {
      const config = await strategy.resolve({ qualityPreset: "high" });
      expect(config.sources.steps).toBe("preset");
    });

    test("quality preset overrides default steps", async () => {
      const draftConfig = await strategy.resolve({ qualityPreset: "draft" });
      const ultraConfig = await strategy.resolve({ qualityPreset: "ultra" });

      expect(draftConfig.steps).toBeLessThan(ultraConfig.steps);
    });
  });

  // ============================================================================
  // Size Preset Resolution
  // ============================================================================

  describe("Size Preset Resolution", () => {
    test("applies square_1x1 preset", async () => {
      const config = await strategy.resolve({ sizePreset: "square_1x1" });
      const preset = SIZE_PRESETS.square_1x1;
      expect(config.width).toBe(preset.dimensions.sdxl.width);
      expect(config.height).toBe(preset.dimensions.sdxl.height);
    });

    test("applies portrait_3x4 preset", async () => {
      const config = await strategy.resolve({ sizePreset: "portrait_3x4" });
      const preset = SIZE_PRESETS.portrait_3x4;
      expect(config.width).toBe(preset.dimensions.sdxl.width);
      expect(config.height).toBe(preset.dimensions.sdxl.height);
    });

    test("applies landscape_16x9 preset", async () => {
      const config = await strategy.resolve({ sizePreset: "landscape_16x9" });
      const preset = SIZE_PRESETS.landscape_16x9;
      expect(config.width).toBe(preset.dimensions.sdxl.width);
      expect(config.height).toBe(preset.dimensions.sdxl.height);
    });

    test("tracks source as 'preset' when using size preset", async () => {
      const config = await strategy.resolve({ sizePreset: "landscape_16x9" });
      expect(config.sources.width).toBe("preset");
      expect(config.sources.height).toBe("preset");
    });

    test("size preset overrides default dimensions", async () => {
      const squareConfig = await strategy.resolve({ sizePreset: "square_1x1" });
      const wideConfig = await strategy.resolve({ sizePreset: "landscape_21x9" });

      // Square should have equal dimensions
      expect(squareConfig.width).toBe(squareConfig.height);
      // Wide should have width > height
      expect(wideConfig.width).toBeGreaterThan(wideConfig.height);
    });
  });

  // ============================================================================
  // Override Resolution
  // ============================================================================

  describe("Override Resolution", () => {
    test("overrides width and height together", async () => {
      const config = await strategy.resolve({
        overrides: { width: 1280, height: 960 },
      });
      expect(config.width).toBe(1280);
      expect(config.height).toBe(960);
    });

    test("overrides steps", async () => {
      const config = await strategy.resolve({ overrides: { steps: 50 } });
      expect(config.steps).toBe(50);
    });

    test("overrides cfg", async () => {
      const config = await strategy.resolve({ overrides: { cfg: 12 } });
      expect(config.cfg).toBe(12);
    });

    test("overrides model", async () => {
      const config = await strategy.resolve({
        overrides: { model: "custom_model.safetensors" },
      });
      expect(config.model).toBe("custom_model.safetensors");
    });

    test("overrides sampler", async () => {
      const config = await strategy.resolve({ overrides: { sampler: "dpm_2" } });
      expect(config.sampler).toBe("dpm_2");
    });

    test("overrides scheduler", async () => {
      const config = await strategy.resolve({ overrides: { scheduler: "karras" } });
      expect(config.scheduler).toBe("karras");
    });

    test("tracks source as 'explicit' when using overrides", async () => {
      const config = await strategy.resolve({
        overrides: { width: 1024, height: 1024 },
      });
      expect(config.sources.width).toBe("explicit");
      expect(config.sources.height).toBe("explicit");
    });

    test("override takes precedence over quality preset", async () => {
      const config = await strategy.resolve({
        qualityPreset: "draft",
        overrides: { steps: 100 },
      });
      expect(config.steps).toBe(100);
    });

    test("multiple overrides work together", async () => {
      const config = await strategy.resolve({
        overrides: { width: 1024, height: 768, steps: 30, cfg: 8 },
      });
      expect(config.width).toBe(1024);
      expect(config.height).toBe(768);
      expect(config.steps).toBe(30);
      expect(config.cfg).toBe(8);
    });
  });

  // ============================================================================
  // Combined Preset Resolution
  // ============================================================================

  describe("Combined Preset Resolution", () => {
    test("combines size and quality presets", async () => {
      const config = await strategy.resolve({
        sizePreset: "landscape_16x9",
        qualityPreset: "high",
      });

      const sizePreset = SIZE_PRESETS.landscape_16x9;
      const qualityPreset = QUALITY_PRESETS.high;

      expect(config.width).toBe(sizePreset.dimensions.sdxl.width);
      expect(config.height).toBe(sizePreset.dimensions.sdxl.height);
      expect(config.steps).toBe(qualityPreset.steps);
    });

    test("all three sources work together", async () => {
      const config = await strategy.resolve({
        sizePreset: "portrait_3x4",
        qualityPreset: "standard",
        overrides: { cfg: 9 },
      });

      expect(config.width).toBe(SIZE_PRESETS.portrait_3x4.dimensions.sdxl.width);
      expect(config.steps).toBe(QUALITY_PRESETS.standard.steps);
      expect(config.cfg).toBe(9);
    });
  });

  // ============================================================================
  // calculateOptimalSize()
  // ============================================================================

  describe("calculateOptimalSize()", () => {
    test("calculates size for 1:1 aspect ratio", () => {
      const size = strategy.calculateOptimalSize(1.0, "sdxl");
      expect(size.width).toBe(size.height);
      expect(size.width % 64).toBe(0);
    });

    test("calculates size for 16:9 aspect ratio", () => {
      const size = strategy.calculateOptimalSize(16 / 9, "sdxl");
      expect(size.width).toBeGreaterThan(size.height);
      expect(size.width % 64).toBe(0);
      expect(size.height % 64).toBe(0);
    });

    test("calculates size for portrait aspect ratio", () => {
      const size = strategy.calculateOptimalSize(0.75, "sdxl");
      expect(size.width).toBeLessThan(size.height);
      expect(size.width % 64).toBe(0);
      expect(size.height % 64).toBe(0);
    });

    test("returns matching preset ID when available", () => {
      const size = strategy.calculateOptimalSize(1.0, "sdxl");
      expect(size.presetId).toBeDefined();
    });

    test("respects model family for dimensions", () => {
      const sdxlSize = strategy.calculateOptimalSize(1.0, "sdxl");
      const sd15Size = strategy.calculateOptimalSize(1.0, "sd15");
      // SD1.5 should have smaller dimensions
      expect(sd15Size.width * sd15Size.height).toBeLessThan(
        sdxlSize.width * sdxlSize.height
      );
    });

    test("accepts target resolution parameter", () => {
      // Note: Current implementation uses preset dimensions based on aspect ratio
      // Target resolution affects quality settings rather than dimension scaling
      const lowRes = strategy.calculateOptimalSize(1.0, "sdxl", "low");
      const highRes = strategy.calculateOptimalSize(1.0, "sdxl", "high");
      // Both should return valid dimensions
      expect(lowRes.width).toBeGreaterThan(0);
      expect(highRes.width).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    test("handles undefined quality preset gracefully", async () => {
      const config = await strategy.resolve({ qualityPreset: undefined });
      expect(config.steps).toBeDefined();
      expect(config.steps).toBeGreaterThan(0);
    });

    test("handles unknown size preset by using defaults", async () => {
      const config = await strategy.resolve({ sizePreset: "nonexistent_preset" });
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });

    test("handles empty overrides object", async () => {
      const config = await strategy.resolve({ overrides: {} });
      expect(config).toBeDefined();
      expect(config.width).toBeDefined();
    });

    test("handles null-ish override values", async () => {
      const config = await strategy.resolve({
        overrides: { width: undefined, height: undefined },
      });
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });
  });

  // ============================================================================
  // Resolved Config Completeness
  // ============================================================================

  describe("Resolved Config Completeness", () => {
    test("config has all required fields", async () => {
      const config = await strategy.resolve({});

      // Required generation params
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
      expect(config.aspectRatio).toBeDefined();
      expect(config.steps).toBeDefined();
      expect(config.cfg).toBeDefined();
      expect(config.sampler).toBeDefined();
      expect(config.scheduler).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.modelFamily).toBeDefined();
      expect(config.negativePrompt).toBeDefined();
      expect(config.loras).toBeDefined();
      expect(config.hiResFix).toBeDefined();
      expect(config.upscale).toBeDefined();

      // Metadata
      expect(config.sources).toBeDefined();
    });

    test("config values are valid types", async () => {
      const config = await strategy.resolve({});

      expect(typeof config.width).toBe("number");
      expect(typeof config.height).toBe("number");
      expect(typeof config.aspectRatio).toBe("number");
      expect(typeof config.steps).toBe("number");
      expect(typeof config.cfg).toBe("number");
      expect(typeof config.sampler).toBe("string");
      expect(typeof config.scheduler).toBe("string");
      expect(typeof config.model).toBe("string");
      expect(typeof config.modelFamily).toBe("string");
      expect(typeof config.negativePrompt).toBe("string");
      expect(Array.isArray(config.loras)).toBe(true);
      expect(typeof config.hiResFix).toBe("boolean");
      expect(typeof config.upscale).toBe("boolean");
    });

    test("config values are within reasonable bounds", async () => {
      const config = await strategy.resolve({});

      expect(config.width).toBeGreaterThanOrEqual(256);
      expect(config.width).toBeLessThanOrEqual(2048);
      expect(config.height).toBeGreaterThanOrEqual(256);
      expect(config.height).toBeLessThanOrEqual(2048);
      expect(config.steps).toBeGreaterThanOrEqual(1);
      expect(config.steps).toBeLessThanOrEqual(150);
      expect(config.cfg).toBeGreaterThanOrEqual(1);
      expect(config.cfg).toBeLessThanOrEqual(30);
    });
  });
});
