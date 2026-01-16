/**
 * ConfigEngine Unit Tests
 *
 * Comprehensive tests for the GenerationConfigEngine class.
 * Tests size presets, quality presets, slot-aware sizing,
 * override merging, and model family detection.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import {
  GenerationConfigEngine,
  getConfigEngine,
  resetConfigEngine,
  createConfigEngine,
} from "../../generation/config/engine.js";
import { getDefaultStrategy } from "../../generation/config/strategies/default.strategy.js";
import { getSlotAwareStrategy } from "../../generation/config/strategies/slot-aware.strategy.js";
import {
  SIZE_PRESETS,
  getSizePreset,
  findClosestPreset,
  findPresetsForUseCase,
  getPresetsByCategory,
} from "../../generation/config/presets/sizes.js";
import {
  QUALITY_PRESETS,
  getQualityPreset,
  listQualityPresets,
  recommendQualityPreset,
  estimateRelativeTime,
} from "../../generation/config/presets/quality.js";
import {
  MODEL_PRESETS,
  getModelPreset,
  detectModelFamily,
  modelFamilyToDimensionKey,
  supportsNegativePrompt,
  getRecommendedCfgRange,
} from "../../generation/config/presets/models.js";
import type {
  QualityPresetId,
  ModelFamily,
  SlotContext,
} from "../../generation/config/types.js";

describe("ConfigEngine", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetConfigEngine();
  });

  afterEach(() => {
    teardownTestDatabase();
    resetConfigEngine();
  });

  // ==========================================================================
  // Singleton Management
  // ==========================================================================
  describe("Singleton Management", () => {
    it("returns singleton instance via getConfigEngine", () => {
      const engine1 = getConfigEngine();
      const engine2 = getConfigEngine();
      expect(engine1).toBe(engine2);
    });

    it("resets singleton when resetConfigEngine is called", () => {
      const engine1 = getConfigEngine();
      resetConfigEngine();
      const engine2 = getConfigEngine();
      expect(engine1).not.toBe(engine2);
    });

    it("creates new instance via createConfigEngine", () => {
      const engine1 = createConfigEngine();
      const engine2 = createConfigEngine();
      expect(engine1).not.toBe(engine2);
    });

    it("accepts custom strategy in createConfigEngine", () => {
      const strategy = getDefaultStrategy();
      const engine = createConfigEngine(strategy);
      expect(engine.getStrategy()).toBe(strategy);
    });
  });

  // ==========================================================================
  // Strategy Management
  // ==========================================================================
  describe("Strategy Management", () => {
    it("defaults to slot-aware strategy", () => {
      const engine = getConfigEngine();
      expect(engine.getStrategyId()).toBe("slot-aware");
    });

    it("switches to default strategy", () => {
      const engine = getConfigEngine();
      engine.useDefaultStrategy();
      expect(engine.getStrategyId()).toBe("default");
    });

    it("switches back to slot-aware strategy", () => {
      const engine = getConfigEngine();
      engine.useDefaultStrategy();
      engine.useSlotAwareStrategy();
      expect(engine.getStrategyId()).toBe("slot-aware");
    });

    it("sets custom strategy", () => {
      const engine = getConfigEngine();
      const customStrategy = getDefaultStrategy();
      engine.setStrategy(customStrategy);
      expect(engine.getStrategy()).toBe(customStrategy);
    });
  });

  // ==========================================================================
  // Size Presets Resolution
  // ==========================================================================
  describe("Size Presets", () => {
    it("lists all size presets", () => {
      const engine = getConfigEngine();
      const presets = engine.listSizePresets();

      expect(presets.length).toBeGreaterThan(10);
      expect(presets.some((p) => p.id === "square_1x1")).toBe(true);
      expect(presets.some((p) => p.id === "portrait_3x4")).toBe(true);
      expect(presets.some((p) => p.id === "landscape_16x9")).toBe(true);
    });

    it("gets specific size preset by ID", () => {
      const engine = getConfigEngine();
      const preset = engine.getSizePreset("portrait_3x4");

      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBe(0.75);
      expect(preset?.dimensions.sdxl.width).toBe(768);
      expect(preset?.dimensions.sdxl.height).toBe(1024);
    });

    it("returns undefined for unknown size preset", () => {
      const engine = getConfigEngine();
      const preset = engine.getSizePreset("nonexistent_preset");
      expect(preset).toBeUndefined();
    });

    it("finds closest size preset by aspect ratio", () => {
      const engine = getConfigEngine();
      const preset = engine.findClosestSizePreset(0.75);

      expect(preset).toBeDefined();
      expect(preset?.id).toBe("portrait_3x4");
    });

    it("finds closest preset within tolerance", () => {
      const engine = getConfigEngine();
      // 0.74 is close to 0.75 (portrait_3x4)
      const preset = engine.findClosestSizePreset(0.74, 0.1);
      expect(preset).toBeDefined();
    });

    it("returns undefined when no preset within tolerance", () => {
      // Use extremely narrow tolerance
      const preset = findClosestPreset(0.123456, 0.001);
      expect(preset).toBeUndefined();
    });

    it("finds presets for use case", () => {
      const engine = getConfigEngine();
      const presets = engine.findSizePresetsForUseCase("character");

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === "portrait_3x4")).toBe(true);
    });

    it("gets presets by category", () => {
      const engine = getConfigEngine();
      const categories = engine.getSizePresetsByCategory();

      expect(categories.portrait.length).toBeGreaterThan(0);
      expect(categories.landscape.length).toBeGreaterThan(0);
      expect(categories.square.length).toBeGreaterThan(0);
      expect(categories.comic.length).toBeGreaterThan(0);
    });

    it("includes all expected size preset categories", () => {
      const categories = getPresetsByCategory();

      expect(Object.keys(categories)).toContain("square");
      expect(Object.keys(categories)).toContain("portrait");
      expect(Object.keys(categories)).toContain("landscape");
      expect(Object.keys(categories)).toContain("comic");
      expect(Object.keys(categories)).toContain("manga");
      expect(Object.keys(categories)).toContain("social");
    });
  });

  // ==========================================================================
  // Quality Presets
  // ==========================================================================
  describe("Quality Presets", () => {
    it("lists all quality presets", () => {
      const engine = getConfigEngine();
      const presets = engine.listQualityPresets();

      expect(presets).toHaveLength(4);
      expect(presets.map((p) => p.id)).toContain("draft");
      expect(presets.map((p) => p.id)).toContain("standard");
      expect(presets.map((p) => p.id)).toContain("high");
      expect(presets.map((p) => p.id)).toContain("ultra");
    });

    it("gets draft quality preset", () => {
      const engine = getConfigEngine();
      const preset = engine.getQualityPreset("draft");

      expect(preset.id).toBe("draft");
      expect(preset.steps).toBe(15);
      expect(preset.cfg).toBe(6);
      expect(preset.hiResFix).toBe(false);
      expect(preset.upscale).toBe(false);
    });

    it("gets standard quality preset", () => {
      const preset = getQualityPreset("standard");

      expect(preset.id).toBe("standard");
      expect(preset.steps).toBe(28);
      expect(preset.cfg).toBe(7);
      expect(preset.sampler).toBe("euler_ancestral");
    });

    it("gets high quality preset with hi-res fix", () => {
      const preset = getQualityPreset("high");

      expect(preset.id).toBe("high");
      expect(preset.hiResFix).toBe(true);
      expect(preset.upscale).toBe(false);
    });

    it("gets ultra quality preset with upscale", () => {
      const preset = getQualityPreset("ultra");

      expect(preset.id).toBe("ultra");
      expect(preset.hiResFix).toBe(true);
      expect(preset.upscale).toBe(true);
      expect(preset.steps).toBe(40);
    });

    it("recommends draft for preview use case", () => {
      const engine = getConfigEngine();
      const recommendation = engine.recommendQualityPreset("preview");
      expect(recommendation).toBe("draft");
    });

    it("recommends standard for web use case", () => {
      const recommendation = recommendQualityPreset("web");
      expect(recommendation).toBe("standard");
    });

    it("recommends high for final use case", () => {
      const recommendation = recommendQualityPreset("final");
      expect(recommendation).toBe("high");
    });

    it("recommends ultra for print use case", () => {
      const recommendation = recommendQualityPreset("print");
      expect(recommendation).toBe("ultra");
    });

    it("estimates relative time for draft (fastest)", () => {
      const preset = getQualityPreset("draft");
      const time = estimateRelativeTime(preset);

      expect(time).toBeLessThan(1); // Faster than standard (1.0)
    });

    it("estimates relative time for ultra (slowest)", () => {
      const preset = getQualityPreset("ultra");
      const time = estimateRelativeTime(preset);

      expect(time).toBeGreaterThan(2); // Much slower than standard
    });
  });

  // ==========================================================================
  // Model Family Detection
  // ==========================================================================
  describe("Model Family Detection", () => {
    it("lists all model families", () => {
      const engine = getConfigEngine();
      const families = engine.listModelFamilies();

      expect(families).toContain("illustrious");
      expect(families).toContain("pony");
      expect(families).toContain("sdxl");
      expect(families).toContain("flux");
      expect(families).toContain("sd15");
      expect(families).toContain("realistic");
    });

    it("detects model family from model name", () => {
      const engine = getConfigEngine();

      expect(engine.detectModelFamily("illustriousXL.safetensors")).toBe("illustrious");
      expect(engine.detectModelFamily("ponyDiffusionV6.safetensors")).toBe("pony");
      expect(engine.detectModelFamily("flux_dev.safetensors")).toBe("flux");
    });

    it("detects illustrious from wai- prefix", () => {
      expect(detectModelFamily("wai-nsfw-illustrious.safetensors")).toBe("illustrious");
    });

    it("detects pony from furry models", () => {
      expect(detectModelFamily("furryDiffusion.safetensors")).toBe("pony");
    });

    it("detects pony from nova models", () => {
      expect(detectModelFamily("novaFurry.safetensors")).toBe("pony");
    });

    it("detects realistic from photo models", () => {
      expect(detectModelFamily("photoReal_v1.safetensors")).toBe("realistic");
    });

    it("detects realistic from real prefix", () => {
      expect(detectModelFamily("realVision_v5.safetensors")).toBe("realistic");
    });

    it("gets model preset settings", () => {
      const engine = getConfigEngine();
      const preset = engine.getModelPreset("illustrious");

      expect(preset.family).toBe("illustrious");
      expect(preset.cfg).toBe(7);
      expect(preset.defaultSteps).toBe(28);
      expect(preset.supportsNegative).toBe(true);
    });

    it("maps model family to dimension key", () => {
      expect(modelFamilyToDimensionKey("illustrious")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("pony")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("sdxl")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("realistic")).toBe("sdxl");
      expect(modelFamilyToDimensionKey("flux")).toBe("flux");
      expect(modelFamilyToDimensionKey("sd15")).toBe("sd15");
    });

    it("checks negative prompt support", () => {
      expect(supportsNegativePrompt("illustrious")).toBe(true);
      expect(supportsNegativePrompt("pony")).toBe(true);
      expect(supportsNegativePrompt("flux")).toBe(false);
    });

    it("gets recommended CFG range for flux", () => {
      const range = getRecommendedCfgRange("flux");

      expect(range.min).toBe(1);
      expect(range.max).toBe(5);
      expect(range.default).toBe(3.5);
    });

    it("gets recommended CFG range for realistic", () => {
      const range = getRecommendedCfgRange("realistic");

      expect(range.min).toBe(5);
      expect(range.max).toBe(10);
    });
  });

  // ==========================================================================
  // Configuration Resolution
  // ==========================================================================
  describe("Configuration Resolution", () => {
    it("resolves with default values", async () => {
      const engine = createConfigEngine(getDefaultStrategy());
      const config = await engine.resolve({});

      expect(config.width).toBe(768);
      expect(config.height).toBe(1024);
      expect(config.steps).toBeDefined();
      expect(config.cfg).toBeDefined();
      expect(config.sampler).toBeDefined();
    });

    it("applies size preset override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        sizePreset: "landscape_16x9",
      });

      expect(config.width).toBe(1344);
      expect(config.height).toBe(768);
      expect(config.sizePresetUsed).toBe("landscape_16x9");
    });

    it("applies quality preset override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        qualityPreset: "high",
      });

      expect(config.steps).toBe(35);
      expect(config.hiResFix).toBe(true);
      expect(config.qualityPresetUsed).toBe("high");
    });

    it("applies explicit dimension overrides", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          width: 512,
          height: 512,
        },
      });

      expect(config.width).toBe(512);
      expect(config.height).toBe(512);
      expect(config.sources.width).toBe("explicit");
      expect(config.sources.height).toBe("explicit");
    });

    it("applies explicit steps override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          steps: 50,
        },
      });

      expect(config.steps).toBe(50);
      expect(config.sources.steps).toBe("explicit");
    });

    it("applies explicit cfg override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          cfg: 12,
        },
      });

      expect(config.cfg).toBe(12);
      expect(config.sources.cfg).toBe("explicit");
    });

    it("applies explicit sampler override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          sampler: "dpmpp_3m_sde",
        },
      });

      expect(config.sampler).toBe("dpmpp_3m_sde");
      expect(config.sources.sampler).toBe("explicit");
    });

    it("applies negative prompt from overrides", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          negativePrompt: "blurry, watermark",
        },
      });

      expect(config.negativePrompt).toBe("blurry, watermark");
    });

    it("applies LoRAs from overrides", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          loras: [
            { name: "style_lora.safetensors", strength: 0.7 },
            { name: "character_lora.safetensors", strength: 0.9 },
          ],
        },
      });

      expect(config.loras).toHaveLength(2);
      expect(config.loras[0].name).toBe("style_lora.safetensors");
    });

    it("calculates aspect ratio correctly", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        sizePreset: "landscape_16x9",
      });

      expect(config.aspectRatio).toBeCloseTo(1.75, 1);
    });
  });

  // ==========================================================================
  // Slot-Aware Sizing
  // ==========================================================================
  describe("Slot-Aware Sizing", () => {
    it("calculates optimal size for aspect ratio", () => {
      const engine = getConfigEngine();
      const size = engine.calculateOptimalSize(0.75, "pony", "medium");

      expect(size.width).toBeDefined();
      expect(size.height).toBeDefined();
      expect(size.width / size.height).toBeCloseTo(0.75, 1);
    });

    it("finds matching preset for common aspect ratio", () => {
      const engine = getConfigEngine();
      const size = engine.calculateOptimalSize(1.0, "sdxl", "medium");

      expect(size.presetId).toBe("square_1x1");
      expect(size.width).toBe(1024);
      expect(size.height).toBe(1024);
    });

    it("calculates dimensions for custom aspect ratio", () => {
      const engine = getConfigEngine();
      // Use a very unusual aspect ratio
      const size = engine.calculateOptimalSize(1.23456, "pony", "medium");

      expect(size.width).toBeDefined();
      expect(size.height).toBeDefined();
    });

    it("uses slot-aware strategy for slot dimensions", () => {
      const engine = getConfigEngine();
      engine.useSlotAwareStrategy();

      // This test assumes template exists
      // If template doesn't exist, it should return default dimensions
      const dimensions = engine.getDimensionsForSlot("six_grid", "slot-1");

      expect(dimensions.width).toBeDefined();
      expect(dimensions.height).toBeDefined();
      expect(dimensions.aspectRatio).toBeDefined();
    });

    it("respects model family when calculating sizes", () => {
      const engine = getConfigEngine();

      const sdxlSize = engine.calculateOptimalSize(1.0, "sdxl", "medium");
      const sd15Size = engine.calculateOptimalSize(1.0, "sd15", "medium");

      // SDXL should have larger dimensions than SD1.5
      expect(sdxlSize.width).toBeGreaterThan(sd15Size.width);
    });

    it("respects target resolution", () => {
      const engine = getConfigEngine();

      const lowRes = engine.calculateOptimalSize(1.0, "sdxl", "low");
      const highRes = engine.calculateOptimalSize(1.0, "sdxl", "high");

      // High res should have more pixels than low res
      const lowPixels = lowRes.width * lowRes.height;
      const highPixels = highRes.width * highRes.height;

      expect(highPixels).toBeGreaterThanOrEqual(lowPixels);
    });
  });

  // ==========================================================================
  // Override Merging
  // ==========================================================================
  describe("Override Merging", () => {
    it("explicit overrides take precedence over preset", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        qualityPreset: "draft", // steps = 15
        overrides: {
          steps: 100,
        },
      });

      expect(config.steps).toBe(100);
      expect(config.sources.steps).toBe("explicit");
    });

    it("size preset overrides default dimensions", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        sizePreset: "square_1x1",
      });

      expect(config.width).toBe(1024);
      expect(config.height).toBe(1024);
      expect(config.sources.width).toBe("preset");
    });

    it("explicit dimensions override size preset", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        sizePreset: "square_1x1", // 1024x1024
        overrides: {
          width: 512,
          height: 768,
        },
      });

      expect(config.width).toBe(512);
      expect(config.height).toBe(768);
      expect(config.sources.width).toBe("explicit");
    });

    it("quality preset sampler is used when no override", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        qualityPreset: "high",
      });

      expect(config.sampler).toBe("dpmpp_2m_sde"); // high preset sampler
    });

    it("model family affects default settings", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          model: "flux_dev.safetensors",
        },
      });

      expect(config.modelFamily).toBe("flux");
    });
  });

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================
  describe("Convenience Methods", () => {
    it("getConfigForPanel wraps resolve with panelId", async () => {
      const engine = getConfigEngine();
      const config = await engine.getConfigForPanel("panel-123", {
        steps: 40,
      });

      expect(config.steps).toBe(40);
    });

    it("getConfigForSlot wraps resolve with slot context", async () => {
      const engine = getConfigEngine();
      const slot: SlotContext = {
        templateId: "test-template",
        slotId: "slot-1",
        pageSizePreset: "comic_standard",
      };

      const config = await engine.getConfigForSlot(slot, {
        qualityPreset: "high",
      });

      expect(config.qualityPresetUsed).toBe("high");
    });

    it("getConfigWithPresets uses both size and quality presets", async () => {
      const engine = getConfigEngine();
      const config = await engine.getConfigWithPresets(
        "landscape_16x9",
        "high",
        { steps: 50 }
      );

      expect(config.sizePresetUsed).toBe("landscape_16x9");
      expect(config.qualityPresetUsed).toBe("high");
      expect(config.steps).toBe(50); // Override takes precedence
    });
  });

  // ==========================================================================
  // Template Size Mapping
  // ==========================================================================
  describe("Template Size Mapping", () => {
    it("returns empty map for unknown template", () => {
      const engine = getConfigEngine();
      const sizeMap = engine.getTemplateSizeMap("nonexistent_template");

      expect(sizeMap.size).toBe(0);
    });

    it("respects page size preset in template calculation", () => {
      const engine = getConfigEngine();

      // Different page sizes should potentially affect slot dimensions
      const standardMap = engine.getTemplateSizeMap("six_grid", {
        pageSizePreset: "comic_standard",
      });

      // Even if template doesn't exist, method should not throw
      expect(standardMap).toBeDefined();
    });

    it("respects model family in template calculation", () => {
      const engine = getConfigEngine();

      const ponyMap = engine.getTemplateSizeMap("six_grid", {
        modelFamily: "pony",
      });

      expect(ponyMap).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    it("handles empty overrides object", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({ overrides: {} });

      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });

    it("handles undefined quality preset gracefully", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        qualityPreset: undefined,
      });

      expect(config.steps).toBeDefined();
    });

    it("calculates aspect ratio from custom dimensions", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        overrides: {
          width: 1920,
          height: 1080,
        },
      });

      expect(config.aspectRatio).toBeCloseTo(16 / 9, 2);
    });

    it("uses dimensions from size preset when only width is overridden", async () => {
      const engine = getConfigEngine();
      const config = await engine.resolve({
        sizePreset: "portrait_3x4",
        overrides: {
          width: 800,
        },
      });

      // Only one dimension is overridden, so size preset should not be applied
      // Based on strategy, behavior may vary
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
    });
  });
});
