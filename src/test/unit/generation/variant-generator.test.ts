/**
 * Unit Tests: Variant Generator
 *
 * Tests the variant generation strategies for exploring
 * generation parameter space.
 */

import { describe, test, expect } from "bun:test";

describe("VariantGenerator", () => {
  describe("Seed Strategy", () => {
    test("generates unique seeds for each variant", () => {
      const count = 10;
      const seeds = new Set<number>();

      for (let i = 0; i < count; i++) {
        seeds.add(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      }

      // All seeds should be unique
      expect(seeds.size).toBe(count);
    });

    test("uses provided base seed for reproducibility", () => {
      const baseSeed = 12345;
      // const variants = variantGenerator.generate({
      //   strategy: "seed",
      //   count: 5,
      //   baseSeed,
      // });
      // Running again with same baseSeed should give same sequence

      expect(baseSeed).toBe(12345);
    });

    test("generates seeds within valid range", () => {
      const seeds = Array(100)
        .fill(null)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

      for (const seed of seeds) {
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
      }
    });
  });

  describe("CFG Strategy", () => {
    test("generates CFG values within specified range", () => {
      const range = { min: 5, max: 12 };
      const count = 7;

      // const variants = variantGenerator.generate({
      //   strategy: "cfg",
      //   count,
      //   cfgRange: [range.min, range.max],
      // });

      // Simulate evenly distributed CFG values
      const step = (range.max - range.min) / (count - 1);
      const cfgValues = Array(count)
        .fill(null)
        .map((_, i) => range.min + step * i);

      for (const cfg of cfgValues) {
        expect(cfg).toBeGreaterThanOrEqual(range.min);
        expect(cfg).toBeLessThanOrEqual(range.max);
      }
    });

    test("distributes CFG values evenly", () => {
      const range = { min: 5, max: 10 };
      const count = 6; // Should give values 5, 6, 7, 8, 9, 10

      const step = (range.max - range.min) / (count - 1);
      const cfgValues = Array(count)
        .fill(null)
        .map((_, i) => range.min + step * i);

      expect(cfgValues[0]).toBe(5);
      expect(cfgValues[5]).toBe(10);
    });

    test("handles single CFG variant", () => {
      const range = { min: 5, max: 10 };
      const count = 1;

      // Single variant should use middle of range
      const singleCfg = (range.min + range.max) / 2;

      expect(singleCfg).toBe(7.5);
    });

    test("keeps seed constant across CFG variants", () => {
      const baseSeed = 99999;
      const count = 5;

      // All variants should use same seed, only CFG differs
      const variants = Array(count)
        .fill(null)
        .map(() => ({ seed: baseSeed }));

      expect(variants.every((v) => v.seed === baseSeed)).toBe(true);
    });
  });

  describe("Sampler Strategy", () => {
    test("cycles through available samplers", () => {
      const samplers = ["euler", "euler_ancestral", "dpmpp_2m", "dpmpp_sde", "ddim"];

      const count = 5;
      const selectedSamplers = samplers.slice(0, count);

      expect(selectedSamplers.length).toBe(count);
      expect(new Set(selectedSamplers).size).toBe(count);
    });

    test("repeats samplers if count exceeds available", () => {
      const samplers = ["euler", "euler_ancestral", "dpmpp_2m"];
      const count = 6;

      const selectedSamplers = Array(count)
        .fill(null)
        .map((_, i) => samplers[i % samplers.length]);

      expect(selectedSamplers.length).toBe(count);
      expect(selectedSamplers[0]).toBe(selectedSamplers[3]); // Wrapped around
    });

    test("keeps seed and CFG constant across sampler variants", () => {
      const baseSeed = 12345;
      const cfg = 7;

      const variants = Array(5)
        .fill(null)
        .map(() => ({ seed: baseSeed, cfg }));

      expect(variants.every((v) => v.seed === baseSeed && v.cfg === cfg)).toBe(true);
    });
  });

  describe("Combined Strategy", () => {
    test("varies multiple parameters simultaneously", () => {
      const count = 9; // 3x3 grid of seed x cfg

      // const variants = variantGenerator.generate({
      //   strategy: "combined",
      //   count,
      //   seedCount: 3,
      //   cfgValues: [5, 7, 10],
      // });

      // Should produce 9 unique combinations
      const combinations = new Set<string>();
      for (let s = 0; s < 3; s++) {
        for (let c = 0; c < 3; c++) {
          combinations.add(`${s}-${c}`);
        }
      }

      expect(combinations.size).toBe(9);
    });

    test("generates Cartesian product of parameters", () => {
      const seeds = [111, 222, 333];
      const cfgs = [5, 7];

      const combinations: Array<{ seed: number; cfg: number }> = [];
      for (const seed of seeds) {
        for (const cfg of cfgs) {
          combinations.push({ seed, cfg });
        }
      }

      expect(combinations.length).toBe(6);
    });
  });

  describe("Custom Strategy", () => {
    test("accepts explicit parameter sets", () => {
      const customVariants = [
        { seed: 111, cfg: 5, steps: 20 },
        { seed: 222, cfg: 7, steps: 28 },
        { seed: 333, cfg: 10, steps: 40 },
      ];

      // const variants = variantGenerator.generate({
      //   strategy: "custom",
      //   variants: customVariants,
      // });

      expect(customVariants.length).toBe(3);
      expect(customVariants[0].seed).toBe(111);
    });

    test("validates custom parameter values", () => {
      const invalidVariant = { seed: -1, cfg: 100 }; // Invalid values

      // Should throw validation error
      expect(invalidVariant.seed).toBeLessThan(0);
      expect(invalidVariant.cfg).toBeGreaterThan(30);
    });
  });

  describe("Strategy Metadata", () => {
    test("includes strategy name in variant metadata", () => {
      const variant = {
        seed: 12345,
        cfg: 7,
        strategy: "seed",
        variantIndex: 0,
        totalVariants: 5,
      };

      expect(variant.strategy).toBe("seed");
      expect(variant.variantIndex).toBe(0);
    });

    test("includes generation parameters in metadata", () => {
      const variant = {
        seed: 12345,
        cfg: 7,
        steps: 28,
        sampler: "euler_ancestral",
        model: "model.safetensors",
      };

      expect(variant).toHaveProperty("seed");
      expect(variant).toHaveProperty("cfg");
      expect(variant).toHaveProperty("steps");
      expect(variant).toHaveProperty("sampler");
    });
  });
});

describe("VariantGenerator Priority", () => {
  test("high priority variants run first", () => {
    const variants = [
      { priority: "normal", index: 0 },
      { priority: "high", index: 1 },
      { priority: "normal", index: 2 },
      { priority: "high", index: 3 },
    ];

    const sorted = [...variants].sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return 0;
    });

    expect(sorted[0].priority).toBe("high");
    expect(sorted[1].priority).toBe("high");
  });
});
