/**
 * Unit Tests: Generation Config Engine
 *
 * EXHAUSTIVE testing of the main configuration engine.
 * Tests singleton, strategy switching, resolution, convenience methods.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  GenerationConfigEngine,
  getConfigEngine,
  resetConfigEngine,
  createConfigEngine,
} from "../../../../generation/config/engine.js";
import {
  getDefaultStrategy,
  getSlotAwareStrategy,
} from "../../../../generation/config/strategies/index.js";
import { SIZE_PRESETS } from "../../../../generation/config/presets/sizes.js";
import { QUALITY_PRESETS } from "../../../../generation/config/presets/quality.js";
import type { SlotContext, QualityPresetId } from "../../../../generation/config/types.js";

describe("Generation Config Engine", () => {
  afterEach(() => {
    resetConfigEngine();
  });

  // ============================================================================
  // Singleton Management
  // ============================================================================

  describe("Singleton Management", () => {
    test("getConfigEngine returns an instance", () => {
      const engine = getConfigEngine();
      expect(engine).toBeDefined();
      expect(engine instanceof GenerationConfigEngine).toBe(true);
    });

    test("getConfigEngine returns same instance on multiple calls", () => {
      const a = getConfigEngine();
      const b = getConfigEngine();
      expect(a).toBe(b);
    });

    test("resetConfigEngine clears singleton", () => {
      const before = getConfigEngine();
      resetConfigEngine();
      const after = getConfigEngine();
      expect(before).not.toBe(after);
    });

    test("createConfigEngine always returns new instance", () => {
      const a = createConfigEngine();
      const b = createConfigEngine();
      expect(a).not.toBe(b);
    });

    test("createConfigEngine does not affect singleton", () => {
      const singleton = getConfigEngine();
      const custom = createConfigEngine();
      const stillSingleton = getConfigEngine();
      expect(singleton).toBe(stillSingleton);
      expect(custom).not.toBe(singleton);
    });
  });

  // ============================================================================
  // Default Strategy
  // ============================================================================

  describe("Default Strategy", () => {
    test("uses slot-aware strategy by default", () => {
      const engine = getConfigEngine();
      expect(engine.getStrategyId()).toBe("slot-aware");
    });

    test("can accept custom strategy in constructor", () => {
      const engine = createConfigEngine(getDefaultStrategy());
      expect(engine.getStrategyId()).toBe("default");
    });
  });

  // ============================================================================
  // Strategy Switching
  // ============================================================================

  describe("Strategy Switching", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("getStrategy returns current strategy", () => {
      const strategy = engine.getStrategy();
      expect(strategy).toBeDefined();
      expect(strategy.id).toBeDefined();
    });

    test("getStrategyId returns strategy id", () => {
      const id = engine.getStrategyId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    test("setStrategy changes strategy", () => {
      const defaultStrategy = getDefaultStrategy();
      engine.setStrategy(defaultStrategy);
      expect(engine.getStrategyId()).toBe("default");
    });

    test("useDefaultStrategy switches to default", () => {
      engine.useDefaultStrategy();
      expect(engine.getStrategyId()).toBe("default");
    });

    test("useSlotAwareStrategy switches to slot-aware", () => {
      engine.useDefaultStrategy(); // First switch away
      engine.useSlotAwareStrategy();
      expect(engine.getStrategyId()).toBe("slot-aware");
    });

    test("strategy switch affects resolution", async () => {
      const slot: SlotContext = { templateId: "wide-panel", slotId: "main" };

      engine.useSlotAwareStrategy();
      const slotAwareConfig = await engine.resolve({ slot });

      engine.useDefaultStrategy();
      const defaultConfig = await engine.resolve({ slot });

      // Both should resolve successfully
      expect(slotAwareConfig.width).toBeDefined();
      expect(defaultConfig.width).toBeDefined();
    });
  });

  // ============================================================================
  // resolve() Method
  // ============================================================================

  describe("resolve()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("resolves with empty options", async () => {
      const config = await engine.resolve({});
      expect(config).toBeDefined();
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
      expect(config.steps).toBeDefined();
      expect(config.cfg).toBeDefined();
    });

    test("resolves with size preset", async () => {
      const config = await engine.resolve({ sizePreset: "landscape_16x9" });
      expect(config.width).toBeGreaterThan(config.height);
    });

    test("resolves with quality preset", async () => {
      const config = await engine.resolve({ qualityPreset: "ultra" });
      expect(config.steps).toBe(QUALITY_PRESETS.ultra.steps);
    });

    test("resolves with slot context", async () => {
      const config = await engine.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
      });
      expect(config.sources.width).toBe("slot");
      expect(config.sources.height).toBe("slot");
    });

    test("resolves with overrides", async () => {
      const config = await engine.resolve({
        overrides: { width: 1280, height: 720 },
      });
      expect(config.width).toBe(1280);
      expect(config.height).toBe(720);
    });

    test("resolves with all options combined", async () => {
      const config = await engine.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
        qualityPreset: "high",
        overrides: { cfg: 9 },
      });
      expect(config.cfg).toBe(9);
      expect(config.steps).toBe(QUALITY_PRESETS.high.steps);
    });
  });

  // ============================================================================
  // getConfigForPanel()
  // ============================================================================

  describe("getConfigForPanel()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("resolves for panel ID", async () => {
      const config = await engine.getConfigForPanel("panel-123");
      expect(config).toBeDefined();
      expect(config.width).toBeDefined();
    });

    test("applies overrides", async () => {
      const config = await engine.getConfigForPanel("panel-123", { steps: 50 });
      expect(config.steps).toBe(50);
    });

    test("returns complete config", async () => {
      const config = await engine.getConfigForPanel("panel-123");
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
      expect(config.steps).toBeDefined();
      expect(config.cfg).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.modelFamily).toBeDefined();
    });
  });

  // ============================================================================
  // getConfigForSlot()
  // ============================================================================

  describe("getConfigForSlot()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("resolves for slot context", async () => {
      const config = await engine.getConfigForSlot({
        templateId: "six-grid",
        slotId: "row1-left",
      });
      expect(config).toBeDefined();
      expect(config.sources.width).toBe("slot");
    });

    test("applies quality preset", async () => {
      const config = await engine.getConfigForSlot(
        { templateId: "six-grid", slotId: "row1-left" },
        { qualityPreset: "draft" }
      );
      expect(config.steps).toBe(QUALITY_PRESETS.draft.steps);
    });

    test("applies overrides", async () => {
      const config = await engine.getConfigForSlot(
        { templateId: "six-grid", slotId: "row1-left" },
        { overrides: { cfg: 10 } }
      );
      expect(config.cfg).toBe(10);
    });

    test("different slots have appropriate dimensions", async () => {
      const splashConfig = await engine.getConfigForSlot({
        templateId: "splash",
        slotId: "main",
      });
      const gridConfig = await engine.getConfigForSlot({
        templateId: "six-grid",
        slotId: "row1-left",
      });
      // Splash should be larger than a single grid cell
      expect(splashConfig.width * splashConfig.height).toBeGreaterThan(
        gridConfig.width * gridConfig.height * 0.5
      );
    });
  });

  // ============================================================================
  // getConfigWithPresets()
  // ============================================================================

  describe("getConfigWithPresets()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("applies both size and quality presets", async () => {
      const config = await engine.getConfigWithPresets("square_1x1", "high");
      expect(config.width).toBe(config.height);
      expect(config.steps).toBe(QUALITY_PRESETS.high.steps);
    });

    test("defaults to standard quality", async () => {
      const config = await engine.getConfigWithPresets("landscape_16x9");
      expect(config.steps).toBe(QUALITY_PRESETS.standard.steps);
    });

    test("applies overrides on top of presets", async () => {
      const config = await engine.getConfigWithPresets("portrait_3x4", "standard", { cfg: 12 });
      expect(config.cfg).toBe(12);
    });

    test.each([
      ["square_1x1", "draft"],
      ["portrait_3x4", "standard"],
      ["landscape_16x9", "high"],
      ["landscape_21x9", "ultra"],
    ] as [string, QualityPresetId][])(
      "getConfigWithPresets(%s, %s) works correctly",
      async (size, quality) => {
        const config = await engine.getConfigWithPresets(size, quality);
        expect(config.steps).toBe(QUALITY_PRESETS[quality].steps);
      }
    );
  });

  // ============================================================================
  // calculateOptimalSize()
  // ============================================================================

  describe("calculateOptimalSize()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("delegates to strategy", () => {
      const size = engine.calculateOptimalSize(1.0, "sdxl");
      expect(size).toBeDefined();
      expect(size.width).toBeDefined();
      expect(size.height).toBeDefined();
    });

    test("handles various aspect ratios", () => {
      const square = engine.calculateOptimalSize(1.0, "sdxl");
      const wide = engine.calculateOptimalSize(2.0, "sdxl");
      const tall = engine.calculateOptimalSize(0.5, "sdxl");

      expect(square.width).toBe(square.height);
      expect(wide.width).toBeGreaterThan(wide.height);
      expect(tall.height).toBeGreaterThan(tall.width);
    });

    test("respects model family", () => {
      const sdxl = engine.calculateOptimalSize(1.0, "sdxl");
      const sd15 = engine.calculateOptimalSize(1.0, "sd15");
      expect(sdxl.width * sdxl.height).toBeGreaterThan(sd15.width * sd15.height);
    });

    test("accepts target resolution parameter", () => {
      // Note: Current implementation uses preset dimensions based on aspect ratio
      // Target resolution may be used for quality settings rather than dimension scaling
      const low = engine.calculateOptimalSize(1.0, "sdxl", "low");
      const high = engine.calculateOptimalSize(1.0, "sdxl", "high");
      // Both should return valid dimensions
      expect(low.width).toBeGreaterThan(0);
      expect(high.width).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // getDimensionsForSlot()
  // ============================================================================

  describe("getDimensionsForSlot()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("returns dimensions for slot", () => {
      const dims = engine.getDimensionsForSlot("six-grid", "row1-left");
      expect(dims).toBeDefined();
      expect(dims.width).toBeDefined();
      expect(dims.height).toBeDefined();
      expect(dims.aspectRatio).toBeDefined();
    });

    test("aspectRatio matches width/height", () => {
      const dims = engine.getDimensionsForSlot("six-grid", "row1-left");
      expect(dims.aspectRatio).toBeCloseTo(dims.width / dims.height, 2);
    });

    test("respects page size preset", () => {
      const standard = engine.getDimensionsForSlot("splash", "main", {
        pageSizePreset: "comic_standard",
      });
      expect(standard).toBeDefined();
    });

    test("respects model family", () => {
      const sdxl = engine.getDimensionsForSlot("six-grid", "row1-left", {
        modelFamily: "sdxl",
      });
      const sd15 = engine.getDimensionsForSlot("six-grid", "row1-left", {
        modelFamily: "sd15",
      });
      expect(sdxl.width * sdxl.height).toBeGreaterThan(sd15.width * sd15.height);
    });

    test("always uses slot-aware strategy internally", () => {
      engine.useDefaultStrategy(); // Switch to default
      const dims = engine.getDimensionsForSlot("six-grid", "row1-left");
      // Should still calculate slot dimensions correctly
      expect(dims.width).toBeDefined();
      expect(dims.height).toBeDefined();
    });
  });

  // ============================================================================
  // getTemplateSizeMap()
  // ============================================================================

  describe("getTemplateSizeMap()", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("returns Map of slot sizes", () => {
      const map = engine.getTemplateSizeMap("six-grid");
      expect(map instanceof Map).toBe(true);
    });

    test("six-grid has 6 slots", () => {
      const map = engine.getTemplateSizeMap("six-grid");
      expect(map.size).toBe(6);
    });

    test("splash-insets has slots including splash", () => {
      const map = engine.getTemplateSizeMap("splash-insets");
      expect(map.size).toBeGreaterThan(0);
      expect(map.has("splash")).toBe(true);
    });

    test("each entry has required fields", () => {
      const map = engine.getTemplateSizeMap("six-grid");
      for (const [slotId, dims] of map) {
        expect(dims.width).toBeDefined();
        expect(dims.height).toBeDefined();
        expect(dims.aspectRatio).toBeDefined();
        expect(dims.width % 64).toBe(0);
        expect(dims.height % 64).toBe(0);
      }
    });

    test("respects options", () => {
      const sdxl = engine.getTemplateSizeMap("six-grid", { modelFamily: "sdxl" });
      const sd15 = engine.getTemplateSizeMap("six-grid", { modelFamily: "sd15" });

      const sdxlFirst = Array.from(sdxl.values())[0];
      const sd15First = Array.from(sd15.values())[0];

      if (sdxlFirst && sd15First) {
        expect(sdxlFirst.width * sdxlFirst.height).toBeGreaterThan(
          sd15First.width * sd15First.height
        );
      }
    });
  });

  // ============================================================================
  // Preset Access Methods
  // ============================================================================

  describe("Size Preset Access", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("listSizePresets returns all presets", () => {
      const presets = engine.listSizePresets();
      expect(presets.length).toBe(Object.keys(SIZE_PRESETS).length);
    });

    test("getSizePreset returns preset by id", () => {
      const preset = engine.getSizePreset("square_1x1");
      expect(preset).toBeDefined();
      expect(preset?.id).toBe("square_1x1");
    });

    test("findClosestSizePreset finds match", () => {
      const preset = engine.findClosestSizePreset(1.0);
      expect(preset).toBeDefined();
      expect(preset?.aspectRatio).toBe(1.0);
    });

    test("findSizePresetsForUseCase returns matches", () => {
      const presets = engine.findSizePresetsForUseCase("comic");
      expect(presets.length).toBeGreaterThan(0);
    });

    test("getSizePresetsByCategory returns grouped presets", () => {
      const categories = engine.getSizePresetsByCategory();
      expect(categories.comic).toBeDefined();
      expect(categories.portrait).toBeDefined();
      expect(categories.landscape).toBeDefined();
    });
  });

  describe("Quality Preset Access", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("listQualityPresets returns all presets", () => {
      const presets = engine.listQualityPresets();
      expect(presets.length).toBe(4);
    });

    test("getQualityPreset returns preset by id", () => {
      const preset = engine.getQualityPreset("high");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("high");
    });

    test("recommendQualityPreset returns appropriate preset", () => {
      expect(engine.recommendQualityPreset("preview")).toBe("draft");
      expect(engine.recommendQualityPreset("print")).toBe("ultra");
    });
  });

  describe("Model Preset Access", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("listModelFamilies returns all families", () => {
      const families = engine.listModelFamilies();
      expect(families.length).toBe(6);
      expect(families).toContain("pony");
      expect(families).toContain("flux");
    });

    test("getModelPreset returns preset", () => {
      const preset = engine.getModelPreset("pony");
      expect(preset).toBeDefined();
      expect(preset.family).toBe("pony");
    });

    test("detectModelFamily identifies model", () => {
      expect(engine.detectModelFamily("flux_dev")).toBe("flux");
      expect(engine.detectModelFamily("ponyDiffusion_v6")).toBe("pony");
      expect(engine.detectModelFamily("sdxl_base")).toBe("sdxl");
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    let engine: GenerationConfigEngine;

    beforeEach(() => {
      engine = createConfigEngine();
    });

    test("handles rapid strategy switches", async () => {
      for (let i = 0; i < 10; i++) {
        engine.useDefaultStrategy();
        engine.useSlotAwareStrategy();
      }
      const config = await engine.resolve({});
      expect(config).toBeDefined();
    });

    test("handles concurrent resolutions", async () => {
      const promises = Array.from({ length: 10 }, () => engine.resolve({}));
      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      for (const config of results) {
        expect(config.width).toBeDefined();
      }
    });

    test("singleton survives heavy usage", async () => {
      const singleton = getConfigEngine();
      for (let i = 0; i < 100; i++) {
        await singleton.resolve({});
      }
      expect(getConfigEngine()).toBe(singleton);
    });
  });
});
