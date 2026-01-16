/**
 * Unit Tests: Slot-Aware Configuration Strategy
 *
 * Tests the smart slot-aware strategy for size calculations.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  SlotAwareConfigurationStrategy,
  getSlotAwareStrategy,
} from "../../../../generation/config/strategies/slot-aware.strategy.js";
import { SIZE_PRESETS } from "../../../../generation/config/presets/sizes.js";
import type { SlotContext } from "../../../../generation/config/types.js";

describe("Slot-Aware Configuration Strategy", () => {
  let strategy: SlotAwareConfigurationStrategy;

  beforeEach(() => {
    strategy = new SlotAwareConfigurationStrategy();
  });

  // ============================================================================
  // Strategy Identity
  // ============================================================================

  describe("Strategy Identity", () => {
    test("has correct id", () => {
      expect(strategy.id).toBe("slot-aware");
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
    test("getSlotAwareStrategy returns instance", () => {
      const instance = getSlotAwareStrategy();
      expect(instance).toBeDefined();
      expect(instance instanceof SlotAwareConfigurationStrategy).toBe(true);
    });

    test("getSlotAwareStrategy returns same instance", () => {
      const a = getSlotAwareStrategy();
      const b = getSlotAwareStrategy();
      expect(a).toBe(b);
    });
  });

  // ============================================================================
  // Basic Resolution
  // ============================================================================

  describe("Basic Resolution", () => {
    test("resolves with no options", async () => {
      const config = await strategy.resolve({});
      expect(config).toBeDefined();
      expect(config.width).toBeDefined();
      expect(config.height).toBeDefined();
      expect(config.steps).toBeDefined();
      expect(config.cfg).toBeDefined();
    });

    test("provides reasonable default dimensions", async () => {
      const config = await strategy.resolve({});
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.width % 64).toBe(0);
      expect(config.height % 64).toBe(0);
    });
  });

  // ============================================================================
  // Size Preset Resolution
  // ============================================================================

  describe("Size Preset Resolution", () => {
    test("applies size preset", async () => {
      const config = await strategy.resolve({ sizePreset: "square_1x1" });
      expect(config.width).toBe(config.height); // Square
    });

    test("size preset provides correct dimensions", async () => {
      const config = await strategy.resolve({ sizePreset: "landscape_16x9" });
      expect(config.width).toBeGreaterThan(config.height); // Landscape
    });
  });

  // ============================================================================
  // Quality Preset Resolution
  // ============================================================================

  describe("Quality Preset Resolution", () => {
    test("applies quality preset steps", async () => {
      const draftConfig = await strategy.resolve({ qualityPreset: "draft" });
      const ultraConfig = await strategy.resolve({ qualityPreset: "ultra" });
      expect(ultraConfig.steps).toBeGreaterThan(draftConfig.steps);
    });
  });

  // ============================================================================
  // Slot Context Resolution
  // ============================================================================

  describe("Slot Context", () => {
    test("resolves with slot context", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
      });
      expect(config).toBeDefined();
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
    });

    test("slot dimensions are divisible by 64", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
      });
      expect(config.width % 64).toBe(0);
      expect(config.height % 64).toBe(0);
    });

    test("handles unknown template gracefully", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "nonexistent", slotId: "main" },
      });
      // Should fall back to defaults
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
    });

    test("tracks source as 'slot' when using slot context", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
      });
      expect(config.sources.width).toBe("slot");
      expect(config.sources.height).toBe("slot");
    });
  });

  // ============================================================================
  // calculateOptimalSize()
  // ============================================================================

  describe("calculateOptimalSize()", () => {
    test("calculates size for square aspect ratio", () => {
      const size = strategy.calculateOptimalSize(1.0, "sdxl");
      expect(size.width).toBe(size.height);
      expect(size.width % 64).toBe(0);
    });

    test("calculates size for landscape aspect ratio", () => {
      const size = strategy.calculateOptimalSize(16 / 9, "sdxl");
      expect(size.width).toBeGreaterThan(size.height);
    });

    test("calculates size for portrait aspect ratio", () => {
      const size = strategy.calculateOptimalSize(0.75, "sdxl");
      expect(size.width).toBeLessThan(size.height);
    });

    test("respects model family", () => {
      const sdxlSize = strategy.calculateOptimalSize(1.0, "sdxl");
      const sd15Size = strategy.calculateOptimalSize(1.0, "sd15");
      expect(sdxlSize.width * sdxlSize.height).toBeGreaterThan(
        sd15Size.width * sd15Size.height
      );
    });
  });

  // ============================================================================
  // calculateAllSlotSizes()
  // ============================================================================

  describe("calculateAllSlotSizes()", () => {
    test("returns Map of slot sizes", () => {
      const sizes = strategy.calculateAllSlotSizes("six-grid");
      expect(sizes instanceof Map).toBe(true);
    });

    test("six-grid has multiple slots", () => {
      const sizes = strategy.calculateAllSlotSizes("six-grid");
      expect(sizes.size).toBeGreaterThan(0);
    });

    test("each slot has valid dimensions", () => {
      const sizes = strategy.calculateAllSlotSizes("six-grid");
      for (const [slotId, dims] of sizes) {
        expect(dims.width).toBeGreaterThan(0);
        expect(dims.height).toBeGreaterThan(0);
        expect(dims.aspectRatio).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Override Handling
  // ============================================================================

  describe("Override Handling", () => {
    test("explicit dimensions override slot calculation", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
        overrides: { width: 1920, height: 1080 },
      });
      expect(config.width).toBe(1920);
      expect(config.height).toBe(1080);
    });

    test("quality preset applies with slot", async () => {
      const config = await strategy.resolve({
        slot: { templateId: "six-grid", slotId: "row1-left" },
        qualityPreset: "ultra",
      });
      expect(config.steps).toBeGreaterThanOrEqual(35);
    });
  });

  // ============================================================================
  // Resolved Config Completeness
  // ============================================================================

  describe("Resolved Config Completeness", () => {
    test("config has all required fields", async () => {
      const config = await strategy.resolve({});

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
      expect(config.sources).toBeDefined();
    });
  });
});
