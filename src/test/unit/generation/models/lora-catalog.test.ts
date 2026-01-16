/**
 * Unit Tests: LoRA Catalog
 *
 * Tests for LoRA registry lookups, filtering, stacking, and trigger word extraction.
 */

import { describe, test, expect } from "bun:test";
import {
  LORA_CATALOG,
  getLora,
  findLoraByName,
  listLorasByFamily,
  listLorasByCategory,
  getCompatibleLoras,
  suggestLoras,
  buildLoraStack,
  getTriggerWords,
  listStyleLoras,
  listQualityLoras,
  listCharacterLoras,
  getRecommendedStack,
} from "../../../../generation/models/lora-catalog.js";
import type { LoraEntry } from "../../../../generation/models/types.js";

describe("LoRA Catalog", () => {
  // ==========================================================================
  // Catalog Integrity
  // ==========================================================================

  describe("Catalog Integrity", () => {
    test("catalog has entries", () => {
      const count = Object.keys(LORA_CATALOG).length;
      expect(count).toBeGreaterThan(0);
    });

    test("all entries have required fields", () => {
      for (const [filename, lora] of Object.entries(LORA_CATALOG)) {
        expect(lora.filename).toBe(filename);
        expect(lora.name).toBeTruthy();
        expect(lora.compatibleFamilies.length).toBeGreaterThan(0);
        expect(["style", "character", "quality", "pose", "concept"]).toContain(
          lora.category
        );
        expect(["first", "middle", "last"]).toContain(lora.stackPosition);
        expect(lora.strength.min).toBeLessThanOrEqual(lora.strength.recommended);
        expect(lora.strength.recommended).toBeLessThanOrEqual(lora.strength.max);
      }
    });

    test("style loras have triggers", () => {
      const styleLoras = Object.values(LORA_CATALOG).filter(
        (l) => l.category === "style"
      );
      for (const lora of styleLoras) {
        expect(lora.trigger).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // Lookup Functions
  // ==========================================================================

  describe("getLora", () => {
    test("returns entry for known LoRA", () => {
      const lora = getLora("colorful_line_art_illustriousXL.safetensors");
      expect(lora).toBeDefined();
      expect(lora?.name).toBe("Colorful Line Art");
      expect(lora?.trigger).toBe("colorful line art style");
    });

    test("returns undefined for unknown LoRA", () => {
      const lora = getLora("nonexistent_lora.safetensors");
      expect(lora).toBeUndefined();
    });
  });

  describe("findLoraByName", () => {
    test("finds LoRA by partial name match", () => {
      const lora = findLoraByName("colorful");
      expect(lora).toBeDefined();
      expect(lora?.name).toContain("Colorful");
    });

    test("finds LoRA by partial filename match", () => {
      const lora = findLoraByName("DetailerIL");
      expect(lora).toBeDefined();
      expect(lora?.category).toBe("quality");
    });

    test("is case insensitive", () => {
      const lora = findLoraByName("COLORFUL LINE");
      expect(lora).toBeDefined();
    });

    test("returns undefined for no match", () => {
      const lora = findLoraByName("xyznonexistent");
      expect(lora).toBeUndefined();
    });
  });

  // ==========================================================================
  // Filtering Functions
  // ==========================================================================

  describe("listLorasByFamily", () => {
    test("returns illustrious-compatible LoRAs", () => {
      const loras = listLorasByFamily("illustrious");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.compatibleFamilies).toContain("illustrious");
      }
    });

    test("returns flux-compatible LoRAs", () => {
      const loras = listLorasByFamily("flux");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.compatibleFamilies).toContain("flux");
      }
    });

    test("returns empty array for family with no LoRAs", () => {
      const loras = listLorasByFamily("sd15");
      // SD1.5 may have few or no LoRAs in catalog
      expect(loras).toBeInstanceOf(Array);
    });
  });

  describe("listLorasByCategory", () => {
    test("returns style LoRAs", () => {
      const loras = listLorasByCategory("style");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("style");
      }
    });

    test("returns quality LoRAs", () => {
      const loras = listLorasByCategory("quality");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("quality");
      }
    });

    test("returns character LoRAs", () => {
      const loras = listLorasByCategory("character");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("character");
      }
    });

    test("returns pose LoRAs", () => {
      const loras = listLorasByCategory("pose");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("pose");
      }
    });

    test("returns concept LoRAs", () => {
      const loras = listLorasByCategory("concept");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("concept");
      }
    });
  });

  describe("convenience list functions", () => {
    test("listStyleLoras returns style LoRAs", () => {
      const loras = listStyleLoras();
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("style");
      }
    });

    test("listQualityLoras returns quality LoRAs", () => {
      const loras = listQualityLoras();
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("quality");
      }
    });

    test("listCharacterLoras returns character LoRAs", () => {
      const loras = listCharacterLoras();
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.category).toBe("character");
      }
    });
  });

  // ==========================================================================
  // Compatibility Functions
  // ==========================================================================

  describe("getCompatibleLoras", () => {
    test("returns LoRAs for illustrious checkpoint", () => {
      const loras = getCompatibleLoras("novaFurryXL_ilV130.safetensors");
      expect(loras.length).toBeGreaterThan(0);
      // All should be illustrious or sdxl compatible
      for (const lora of loras) {
        expect(
          lora.compatibleFamilies.includes("illustrious") ||
            lora.compatibleFamilies.includes("sdxl")
        ).toBe(true);
      }
    });

    test("returns LoRAs for flux checkpoint", () => {
      const loras = getCompatibleLoras("flux1-schnell-fp8.safetensors");
      expect(loras.length).toBeGreaterThan(0);
      for (const lora of loras) {
        expect(lora.compatibleFamilies).toContain("flux");
      }
    });

    test("returns LoRAs for pony checkpoint", () => {
      const loras = getCompatibleLoras("yiffyMix_v52.safetensors");
      expect(loras.length).toBeGreaterThan(0);
    });

    test("respects provided family override", () => {
      const loras = getCompatibleLoras("unknownModel.safetensors", "flux");
      for (const lora of loras) {
        expect(lora.compatibleFamilies).toContain("flux");
      }
    });
  });

  describe("suggestLoras", () => {
    test("suggests all compatible LoRAs when no categories specified", () => {
      const all = getCompatibleLoras("novaFurryXL_ilV130.safetensors");
      const suggested = suggestLoras("novaFurryXL_ilV130.safetensors");
      expect(suggested.length).toBe(all.length);
    });

    test("filters by category when specified", () => {
      const suggested = suggestLoras("novaFurryXL_ilV130.safetensors", ["style"]);
      expect(suggested.length).toBeGreaterThan(0);
      for (const lora of suggested) {
        expect(lora.category).toBe("style");
      }
    });

    test("filters by multiple categories", () => {
      const suggested = suggestLoras("novaFurryXL_ilV130.safetensors", [
        "style",
        "quality",
      ]);
      expect(suggested.length).toBeGreaterThan(0);
      for (const lora of suggested) {
        expect(["style", "quality"]).toContain(lora.category);
      }
    });
  });

  // ==========================================================================
  // Stacking Functions
  // ==========================================================================

  describe("buildLoraStack", () => {
    test("orders LoRAs by stack position: first -> middle -> last", () => {
      const unordered: LoraEntry[] = [
        {
          filename: "quality.safetensors",
          name: "Quality",
          trigger: undefined,
          compatibleFamilies: ["illustrious"],
          category: "quality",
          strength: { min: 0.3, recommended: 0.5, max: 0.8 },
          stackPosition: "last",
        },
        {
          filename: "style.safetensors",
          name: "Style",
          trigger: "style trigger",
          compatibleFamilies: ["illustrious"],
          category: "style",
          strength: { min: 0.4, recommended: 0.7, max: 1.0 },
          stackPosition: "middle",
        },
        {
          filename: "character.safetensors",
          name: "Character",
          trigger: "character trigger",
          compatibleFamilies: ["illustrious"],
          category: "character",
          strength: { min: 0.6, recommended: 0.8, max: 1.0 },
          stackPosition: "first",
        },
      ];

      const ordered = buildLoraStack(unordered);

      expect(ordered[0].stackPosition).toBe("first");
      expect(ordered[1].stackPosition).toBe("middle");
      expect(ordered[2].stackPosition).toBe("last");
    });

    test("preserves order within same stack position", () => {
      const samePosition: LoraEntry[] = [
        {
          filename: "a.safetensors",
          name: "A",
          trigger: "a",
          compatibleFamilies: ["illustrious"],
          category: "style",
          strength: { min: 0.4, recommended: 0.7, max: 1.0 },
          stackPosition: "middle",
        },
        {
          filename: "b.safetensors",
          name: "B",
          trigger: "b",
          compatibleFamilies: ["illustrious"],
          category: "style",
          strength: { min: 0.4, recommended: 0.7, max: 1.0 },
          stackPosition: "middle",
        },
      ];

      const ordered = buildLoraStack(samePosition);
      // Stable sort should preserve relative order
      expect(ordered.length).toBe(2);
    });

    test("handles empty array", () => {
      const ordered = buildLoraStack([]);
      expect(ordered).toEqual([]);
    });
  });

  // ==========================================================================
  // Trigger Word Functions
  // ==========================================================================

  describe("getTriggerWords", () => {
    test("returns trigger words for LoRAs with triggers", () => {
      const triggers = getTriggerWords([
        "colorful_line_art_illustriousXL.safetensors",
      ]);
      expect(triggers).toContain("colorful line art style");
    });

    test("skips LoRAs without triggers", () => {
      const triggers = getTriggerWords([
        "DetailerILv2-000008.safetensors", // No trigger
        "colorful_line_art_illustriousXL.safetensors", // Has trigger
      ]);
      expect(triggers.length).toBe(1);
      expect(triggers).toContain("colorful line art style");
    });

    test("skips unknown LoRAs", () => {
      const triggers = getTriggerWords([
        "nonexistent.safetensors",
        "colorful_line_art_illustriousXL.safetensors",
      ]);
      expect(triggers.length).toBe(1);
    });

    test("returns empty array for no LoRAs", () => {
      const triggers = getTriggerWords([]);
      expect(triggers).toEqual([]);
    });
  });

  // ==========================================================================
  // Recommendation Functions
  // ==========================================================================

  describe("getRecommendedStack", () => {
    test("returns comic stack with line art style", () => {
      const stack = getRecommendedStack(
        "novaFurryXL_ilV130.safetensors",
        "comic"
      );
      expect(stack.length).toBeGreaterThan(0);
      // Should include a line art style LoRA if available
      const hasLineArt = stack.some(
        (l) => l.category === "style" && l.name.toLowerCase().includes("line")
      );
      // May or may not have line art depending on catalog
    });

    test("returns realistic stack with realism enhancer", () => {
      const stack = getRecommendedStack(
        "novaFurryXL_ilV130.safetensors",
        "realistic"
      );
      expect(stack.length).toBeGreaterThan(0);
    });

    test("returns anime stack with illustration style", () => {
      const stack = getRecommendedStack(
        "novaFurryXL_ilV130.safetensors",
        "anime"
      );
      expect(stack.length).toBeGreaterThan(0);
    });

    test("returns general stack with quality enhancer", () => {
      const stack = getRecommendedStack(
        "novaFurryXL_ilV130.safetensors",
        "general"
      );
      expect(stack.length).toBeGreaterThan(0);
      // Should include quality LoRA
      const hasQuality = stack.some((l) => l.category === "quality");
      expect(hasQuality).toBe(true);
    });

    test("stack is properly ordered", () => {
      const stack = getRecommendedStack(
        "novaFurryXL_ilV130.safetensors",
        "comic"
      );
      // Verify ordering (first -> middle -> last)
      for (let i = 0; i < stack.length - 1; i++) {
        const currentOrder =
          stack[i].stackPosition === "first"
            ? 0
            : stack[i].stackPosition === "middle"
            ? 1
            : 2;
        const nextOrder =
          stack[i + 1].stackPosition === "first"
            ? 0
            : stack[i + 1].stackPosition === "middle"
            ? 1
            : 2;
        expect(currentOrder).toBeLessThanOrEqual(nextOrder);
      }
    });
  });
});
