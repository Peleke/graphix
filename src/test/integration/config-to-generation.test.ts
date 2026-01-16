/**
 * Integration Tests: Config to Generation Flow
 *
 * Tests the complete flow from configuration resolution to panel generation.
 * Ensures config engine integrates correctly with PanelGenerator.
 */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import {
  getConfigEngine,
  resetConfigEngine,
  listSizePresets,
  listQualityPresets,
} from "../../generation/config/index.js";
import { SIZE_PRESETS } from "../../generation/config/presets/sizes.js";
import { QUALITY_PRESETS } from "../../generation/config/presets/quality.js";
import type { SlotContext, QualityPresetId } from "../../generation/config/types.js";

describe("Config to Generation Integration", () => {
  beforeAll(() => {
    resetConfigEngine();
  });

  afterAll(() => {
    resetConfigEngine();
  });

  // ============================================================================
  // Config Engine Integration
  // ============================================================================

  describe("Config Engine Exports", () => {
    test("all exports are available from index", () => {
      expect(getConfigEngine).toBeDefined();
      expect(resetConfigEngine).toBeDefined();
      expect(listSizePresets).toBeDefined();
      expect(listQualityPresets).toBeDefined();
    });

    test("engine singleton works across imports", () => {
      const engine1 = getConfigEngine();
      const engine2 = getConfigEngine();
      expect(engine1).toBe(engine2);
    });
  });

  // ============================================================================
  // Size Preset → Generation Config Flow
  // ============================================================================

  describe("Size Preset Flow", () => {
    test.each(Object.keys(SIZE_PRESETS))("size preset %s resolves to valid config", async (presetId) => {
      const engine = getConfigEngine();
      const config = await engine.resolve({ sizePreset: presetId });

      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
      expect(config.width % 64).toBe(0);
      expect(config.height % 64).toBe(0);
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
    });

    test("aspect ratio is preserved from preset", async () => {
      const engine = getConfigEngine();

      for (const preset of listSizePresets()) {
        const config = await engine.resolve({ sizePreset: preset.id });
        const actualRatio = config.width / config.height;
        const expectedRatio = preset.aspectRatio;
        const error = Math.abs(actualRatio - expectedRatio) / expectedRatio;
        expect(error).toBeLessThan(0.1); // Within 10%
      }
    });
  });

  // ============================================================================
  // Quality Preset → Generation Config Flow
  // ============================================================================

  describe("Quality Preset Flow", () => {
    test.each(["draft", "standard", "high", "ultra"] as QualityPresetId[])(
      "quality preset %s resolves correctly",
      async (presetId) => {
        const engine = getConfigEngine();
        const config = await engine.resolve({ qualityPreset: presetId });

        expect(config.steps).toBe(QUALITY_PRESETS[presetId].steps);
      }
    );

    test("quality presets are ordered by speed", async () => {
      const engine = getConfigEngine();

      const draftConfig = await engine.resolve({ qualityPreset: "draft" });
      const standardConfig = await engine.resolve({ qualityPreset: "standard" });
      const highConfig = await engine.resolve({ qualityPreset: "high" });
      const ultraConfig = await engine.resolve({ qualityPreset: "ultra" });

      expect(draftConfig.steps).toBeLessThan(standardConfig.steps);
      expect(standardConfig.steps).toBeLessThan(highConfig.steps);
      expect(highConfig.steps).toBeLessThan(ultraConfig.steps);
    });
  });

  // ============================================================================
  // Slot Context → Generation Config Flow
  // ============================================================================

  describe("Slot Context Flow", () => {
    const templates = ["six-grid", "splash", "wide-panel", "three-row", "two-column"];

    test.each(templates)("template %s produces valid slot configs", async (templateId) => {
      const engine = getConfigEngine();
      const sizeMap = engine.getTemplateSizeMap(templateId);

      expect(sizeMap.size).toBeGreaterThan(0);

      for (const [slotId, dims] of sizeMap) {
        expect(dims.width % 64).toBe(0);
        expect(dims.height % 64).toBe(0);
        expect(dims.aspectRatio).toBeCloseTo(dims.width / dims.height, 2);
      }
    });

    test("slot config resolution works end-to-end", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
        qualityPreset: "standard",
      });

      expect(config.sources.width).toBe("slot");
      expect(config.steps).toBe(QUALITY_PRESETS.standard.steps);
      expect(config.width % 64).toBe(0);
      expect(config.height % 64).toBe(0);
    });
  });

  // ============================================================================
  // Combined Flow
  // ============================================================================

  describe("Combined Options Flow", () => {
    test("all options work together", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
        qualityPreset: "high",
        overrides: { cfg: 9, sampler: "dpm_2" },
      });

      expect(config.steps).toBe(QUALITY_PRESETS.high.steps);
      expect(config.cfg).toBe(9);
      expect(config.sampler).toBe("dpm_2");
    });

    test("override precedence is correct", async () => {
      const engine = getConfigEngine();

      // Override should beat quality preset
      const config = await engine.resolve({
        qualityPreset: "draft",
        overrides: { steps: 100 },
      });
      expect(config.steps).toBe(100);
    });
  });

  // ============================================================================
  // Model Family Detection Flow
  // ============================================================================

  describe("Model Family Flow", () => {
    const modelFamilies = [
      { model: "illustrious_v1.safetensors", expectedFamily: "illustrious" },
      { model: "ponyDiffusion_v6.safetensors", expectedFamily: "pony" },
      { model: "sdxl_base_1.0.safetensors", expectedFamily: "sdxl" },
      { model: "flux_dev.safetensors", expectedFamily: "flux" },
      { model: "realistic_vision_v5.safetensors", expectedFamily: "realistic" },
      { model: "unknown_model.safetensors", expectedFamily: "sd15" }, // Fallback
    ];

    test.each(modelFamilies)(
      "model $model is detected as $expectedFamily",
      async ({ model, expectedFamily }) => {
        const engine = getConfigEngine();
        const family = engine.detectModelFamily(model);
        expect(family).toBe(expectedFamily as typeof family);
      }
    );

    test("model family affects dimension resolution", async () => {
      const engine = getConfigEngine();

      const sdxlConfig = await engine.resolve({
        sizePreset: "square_1x1",
        overrides: { model: "sdxl_base.safetensors" },
      });

      // SDXL dimensions should be from SDXL presets
      expect(sdxlConfig.width).toBe(SIZE_PRESETS.square_1x1.dimensions.sdxl.width);
    });
  });

  // ============================================================================
  // Dimension Calculation Flow
  // ============================================================================

  describe("Dimension Calculation Flow", () => {
    test("dimensions are always divisible by 64", async () => {
      const engine = getConfigEngine();

      // Test many different configurations
      const configs = await Promise.all([
        engine.resolve({}),
        engine.resolve({ sizePreset: "portrait_9x16" }),
        engine.resolve({ sizePreset: "landscape_21x9" }),
        engine.resolve({ slot: { templateId: "six-grid", slotId: "row1-left" } }),
        engine.resolve({ slot: { templateId: "wide-panel", slotId: "main" } }),
      ]);

      for (const config of configs) {
        expect(config.width % 64).toBe(0);
        expect(config.height % 64).toBe(0);
      }
    });

    test("dimensions stay within reasonable bounds", async () => {
      const engine = getConfigEngine();

      for (const preset of listSizePresets()) {
        const config = await engine.resolve({ sizePreset: preset.id });
        expect(config.width).toBeGreaterThanOrEqual(256);
        expect(config.width).toBeLessThanOrEqual(2048);
        expect(config.height).toBeGreaterThanOrEqual(256);
        expect(config.height).toBeLessThanOrEqual(2048);
      }
    });

    test("megapixel count is reasonable", async () => {
      const engine = getConfigEngine();

      for (const preset of listSizePresets()) {
        const config = await engine.resolve({ sizePreset: preset.id });
        const megapixels = (config.width * config.height) / 1_000_000;
        expect(megapixels).toBeGreaterThanOrEqual(0.2);
        expect(megapixels).toBeLessThanOrEqual(2.0);
      }
    });
  });

  // ============================================================================
  // Strategy Switching Flow
  // ============================================================================

  describe("Strategy Switching Flow", () => {
    test("strategy switch changes resolution behavior", async () => {
      const engine = getConfigEngine();
      const slot: SlotContext = { templateId: "wide-panel", slotId: "main" };

      engine.useSlotAwareStrategy();
      const slotAwareResult = await engine.resolve({ slot });

      engine.useDefaultStrategy();
      const defaultResult = await engine.resolve({ slot });

      // Both should produce valid configs
      expect(slotAwareResult.width).toBeDefined();
      expect(defaultResult.width).toBeDefined();

      // Slot-aware should have "slot" source when given slot context
      expect(slotAwareResult.sources.width).toBe("slot");
    });

    test("convenience methods work regardless of strategy", async () => {
      const engine = getConfigEngine();

      engine.useDefaultStrategy();
      const dims1 = engine.getDimensionsForSlot("six-grid", "row1-left");

      engine.useSlotAwareStrategy();
      const dims2 = engine.getDimensionsForSlot("six-grid", "row1-left");

      // getDimensionsForSlot always uses slot-aware internally
      expect(dims1.width).toBe(dims2.width);
      expect(dims1.height).toBe(dims2.height);
    });
  });

  // ============================================================================
  // Preset Consistency
  // ============================================================================

  describe("Preset Consistency", () => {
    test("size presets produce consistent results", async () => {
      const engine = getConfigEngine();

      for (const preset of listSizePresets()) {
        const config1 = await engine.resolve({ sizePreset: preset.id });
        const config2 = await engine.resolve({ sizePreset: preset.id });

        expect(config1.width).toBe(config2.width);
        expect(config1.height).toBe(config2.height);
      }
    });

    test("quality presets produce consistent results", async () => {
      const engine = getConfigEngine();

      for (const preset of listQualityPresets()) {
        const config1 = await engine.resolve({ qualityPreset: preset.id as QualityPresetId });
        const config2 = await engine.resolve({ qualityPreset: preset.id as QualityPresetId });

        expect(config1.steps).toBe(config2.steps);
      }
    });
  });

  // ============================================================================
  // Error Recovery
  // ============================================================================

  describe("Error Recovery", () => {
    test("handles invalid size preset gracefully", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({ sizePreset: "nonexistent" });

      // Should fall back to defaults
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });

    test("handles invalid slot context gracefully", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        slot: { templateId: "fake-template", slotId: "fake-slot" },
      });

      // Should fall back to defaults
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });

    test("handles extreme override values gracefully", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: { steps: -10, cfg: 0 },
      });

      // Should use reasonable defaults instead of invalid values
      expect(config.steps).toBeGreaterThan(0);
      expect(config.cfg).toBeGreaterThan(0);
    });
  });
});
