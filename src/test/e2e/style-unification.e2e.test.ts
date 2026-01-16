/**
 * E2E Test: Style Unification Pipeline
 *
 * Tests the style unification workflow:
 * 1. Generate base panel without style
 * 2. Generate panel with style LoRA
 * 3. Generate different scene with same style
 * 4. Verify model/LoRA compatibility resolution
 *
 * This test requires:
 * - ComfyUI MCP server running
 * - Style LoRAs installed (colorful_line_art, etc.)
 * - A known SDXL-compatible checkpoint
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { getComfyUIClient } from "../../generation/index.js";
import {
  getModelResolver,
  LORA_CATALOG,
  getLora,
  listLorasByFamily,
  getCompatibleLoras,
  getRecommendedStack,
  buildLoraStack,
  getTriggerWords,
} from "../../generation/models/index.js";

const OUTPUT_DIR = "output/e2e-style";
const MODEL = "novaFurryXL_ilV130.safetensors";

describe("Style Unification E2E", () => {
  const client = getComfyUIClient();
  const resolver = getModelResolver();

  beforeAll(async () => {
    // Create output directory
    if (existsSync(OUTPUT_DIR)) {
      rmSync(OUTPUT_DIR, { recursive: true });
    }
    mkdirSync(OUTPUT_DIR, { recursive: true });

    // Verify ComfyUI is accessible
    const health = await client.health();
    if (health.status !== "healthy") {
      console.warn("ComfyUI not available - some tests will be skipped");
    }
  });

  afterAll(() => {
    // Optionally clean up
    // rmSync(OUTPUT_DIR, { recursive: true });
  });

  // ==========================================================================
  // LoRA Catalog Tests
  // ==========================================================================

  describe("LoRA Catalog", () => {
    test("catalog has LoRA entries", () => {
      const count = Object.keys(LORA_CATALOG).length;
      expect(count).toBeGreaterThan(0);
      console.log(`   Catalog has ${count} LoRAs`);
    });

    test("getLora returns entry for known LoRA", () => {
      const lora = getLora("colorful_line_art_illustriousXL.safetensors");
      expect(lora).toBeDefined();
      expect(lora?.name).toBe("Colorful Line Art");
      expect(lora?.trigger).toBe("colorful line art style");
    });

    test("lists LoRAs by family - illustrious", () => {
      const loras = listLorasByFamily("illustrious");
      expect(loras.length).toBeGreaterThan(0);
      console.log(`   Found ${loras.length} LoRAs for illustrious`);
    });

    test("lists LoRAs by family - flux", () => {
      const loras = listLorasByFamily("flux");
      expect(loras.length).toBeGreaterThan(0);
      console.log(`   Found ${loras.length} LoRAs for flux`);
    });

    test("getCompatibleLoras returns LoRAs for checkpoint", () => {
      const loras = getCompatibleLoras(MODEL);
      expect(loras.length).toBeGreaterThan(0);
      console.log(`   Found ${loras.length} compatible LoRAs for ${MODEL}`);
    });
  });

  // ==========================================================================
  // LoRA Stack Building Tests
  // ==========================================================================

  describe("LoRA Stack Building", () => {
    test("builds recommended stack for comic use case", () => {
      const stack = getRecommendedStack(MODEL, "comic");
      expect(stack.length).toBeGreaterThan(0);
      console.log(
        `   Comic stack: ${stack.map((l) => l.name).join(" -> ")}`
      );
    });

    test("builds recommended stack for realistic use case", () => {
      const stack = getRecommendedStack(MODEL, "realistic");
      expect(stack.length).toBeGreaterThan(0);
      console.log(
        `   Realistic stack: ${stack.map((l) => l.name).join(" -> ")}`
      );
    });

    test("builds recommended stack for anime use case", () => {
      const stack = getRecommendedStack(MODEL, "anime");
      expect(stack.length).toBeGreaterThan(0);
      console.log(
        `   Anime stack: ${stack.map((l) => l.name).join(" -> ")}`
      );
    });

    test("buildLoraStack orders by position (first -> middle -> last)", () => {
      const styleLora = getLora("colorful_line_art_illustriousXL.safetensors");
      const qualityLora = getLora("DetailerILv2-000008.safetensors");
      const characterLora = getLora("judy_hopps_v3.safetensors");

      if (styleLora && qualityLora && characterLora) {
        const unordered = [qualityLora, styleLora, characterLora];
        const ordered = buildLoraStack(unordered);

        expect(ordered[0].stackPosition).toBe("first"); // character
        expect(ordered[1].stackPosition).toBe("middle"); // style
        expect(ordered[2].stackPosition).toBe("last"); // quality
      }
    });

    test("getTriggerWords extracts triggers from LoRAs", () => {
      const triggers = getTriggerWords([
        "colorful_line_art_illustriousXL.safetensors",
        "DetailerILv2-000008.safetensors", // No trigger
      ]);
      expect(triggers.length).toBe(1);
      expect(triggers[0]).toBe("colorful line art style");
    });
  });

  // ==========================================================================
  // Resolver LoRA Methods Tests
  // ==========================================================================

  describe("Resolver LoRA Methods", () => {
    test("resolver.getCompatibleLoras returns LoRAs for checkpoint", () => {
      const loras = resolver.getCompatibleLoras(MODEL);
      expect(loras.length).toBeGreaterThan(0);
    });

    test("resolver.validateLora passes for compatible LoRA", () => {
      const result = resolver.validateLora(
        MODEL,
        "colorful_line_art_illustriousXL.safetensors"
      );
      expect(result.valid).toBe(true);
    });

    test("resolver.validateLora fails for incompatible LoRA", () => {
      // Flux LoRA should not be compatible with illustrious model
      const result = resolver.validateLora(
        MODEL,
        "flux_tarot_v1_lora.safetensors"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not compatible");
    });

    test("resolver.validateLora warns for unknown LoRA", () => {
      const result = resolver.validateLora(
        MODEL,
        "unknown_lora.safetensors"
      );
      // Unknown LoRAs are allowed with warning
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("resolver.buildLoraStack returns ordered array", () => {
      const stack = resolver.buildLoraStack([
        "DetailerILv2-000008.safetensors",
        "colorful_line_art_illustriousXL.safetensors",
      ]);
      expect(stack.length).toBe(2);
      // Style (middle) should come before quality (last)
      expect(stack[0].category).toBe("style");
      expect(stack[1].category).toBe("quality");
    });

    test("resolver.getTriggerWords extracts triggers", () => {
      const triggers = resolver.getTriggerWords([
        "colorful_line_art_illustriousXL.safetensors",
      ]);
      expect(triggers).toContain("colorful line art style");
    });
  });

  // ==========================================================================
  // Live Generation Tests (require ComfyUI)
  // ==========================================================================

  describe("Live Style Generation", () => {
    test("generates base panel without style LoRA", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      console.log("\n=== STYLE UNIFICATION E2E TEST ===\n");
      console.log("1. Generating base panel (no style)...");

      const result = await client.imagine({
        description: "anthro fox girl standing in a forest clearing",
        model: MODEL,
        output_path: `${OUTPUT_DIR}/panel_01_base.png`,
        seed: 200,
        width: 768,
        height: 1024,
        quality: "standard",
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_01_base.png`)).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/panel_01_base.png`);
    }, 120000);

    test("generates panel with colorful line art style", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      const styleLora = getLora("colorful_line_art_illustriousXL.safetensors");
      expect(styleLora).toBeDefined();

      console.log("\n2. Generating panel with style LoRA...");
      console.log(`   Using: ${styleLora?.name}`);
      console.log(`   Trigger: ${styleLora?.trigger}`);

      const result = await client.generateImage({
        prompt: `${styleLora?.trigger}, anthro fox girl standing in a forest clearing`,
        negative_prompt: "bad quality, blurry",
        model: MODEL,
        loras: [
          {
            name: styleLora!.filename,
            strength_model: styleLora!.strength.recommended,
          },
        ],
        output_path: `${OUTPUT_DIR}/panel_02_styled.png`,
        seed: 200,
        width: 768,
        height: 1024,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_02_styled.png`)).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/panel_02_styled.png`);
    }, 120000);

    test("generates different scene with same style", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      const styleLora = getLora("colorful_line_art_illustriousXL.safetensors");
      expect(styleLora).toBeDefined();

      console.log("\n3. Generating different scene with same style...");

      const result = await client.generateImage({
        prompt: `${styleLora?.trigger}, anthro fox girl at beach sunset, ocean waves`,
        negative_prompt: "bad quality, blurry",
        model: MODEL,
        loras: [
          {
            name: styleLora!.filename,
            strength_model: styleLora!.strength.recommended,
          },
        ],
        output_path: `${OUTPUT_DIR}/panel_03_styled_new_scene.png`,
        seed: 201,
        width: 768,
        height: 1024,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_03_styled_new_scene.png`)).toBe(
        true
      );
      console.log(`   Generated: ${OUTPUT_DIR}/panel_03_styled_new_scene.png`);
    }, 120000);

    test("generates with recommended comic stack", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      const stack = getRecommendedStack(MODEL, "comic");
      if (stack.length === 0) {
        console.log("Skipping - no comic stack available");
        return;
      }

      console.log("\n4. Generating with recommended comic stack...");
      console.log(`   Stack: ${stack.map((l) => l.name).join(" -> ")}`);

      const triggers = getTriggerWords(stack.map((l) => l.filename));
      const triggerString = triggers.join(", ");

      const result = await client.generateImage({
        prompt: `${triggerString}, anthro fox girl action pose, leaping through air`,
        negative_prompt: "bad quality, blurry",
        model: MODEL,
        loras: stack.map((l) => ({
          name: l.filename,
          strength_model: l.strength.recommended,
        })),
        output_path: `${OUTPUT_DIR}/panel_04_comic_stack.png`,
        seed: 202,
        width: 768,
        height: 1024,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_04_comic_stack.png`)).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/panel_04_comic_stack.png`);
    }, 120000);
  });

  // ==========================================================================
  // Full Pipeline Test
  // ==========================================================================

  describe("Full Style Pipeline", () => {
    test("complete style unification workflow", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping full pipeline - ComfyUI not available");
        return;
      }

      console.log("\n=== FULL STYLE PIPELINE E2E TEST ===\n");

      // Step 1: Get style LoRA info
      console.log("1. Getting style LoRA info...");
      const styleLora = getLora("colorful_line_art_illustriousXL.safetensors");
      expect(styleLora).toBeDefined();
      console.log(`   Name: ${styleLora?.name}`);
      console.log(`   Trigger: ${styleLora?.trigger}`);
      console.log(`   Strength: ${styleLora?.strength.recommended}`);

      // Step 2: Validate compatibility
      console.log("\n2. Validating LoRA compatibility...");
      const validation = resolver.validateLora(MODEL, styleLora!.filename);
      expect(validation.valid).toBe(true);
      console.log(`   Compatible: ${validation.valid}`);

      // Step 3: Build LoRA stack
      console.log("\n3. Building LoRA stack...");
      const stack = resolver.buildLoraStack([
        styleLora!.filename,
        "DetailerILv2-000008.safetensors",
      ]);
      console.log(`   Stack order: ${stack.map((l) => l.name).join(" -> ")}`);

      // Step 4: Generate panel sequence with unified style
      console.log("\n4. Generating panel sequence...");

      const panels = [
        {
          name: "panel_sequence_01",
          description: "anthro otter girl, standing confidently, arms crossed",
        },
        {
          name: "panel_sequence_02",
          description: "anthro otter girl, running, action pose",
        },
        {
          name: "panel_sequence_03",
          description: "anthro otter girl, sitting on rock, sunset background",
        },
      ];

      const triggers = getTriggerWords(stack.map((l) => l.filename));
      const triggerString = triggers.join(", ");

      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        console.log(`   Generating ${panel.name}...`);

        const result = await client.generateImage({
          prompt: `${triggerString}, ${panel.description}`,
          negative_prompt: "bad quality, blurry, deformed",
          model: MODEL,
          loras: stack.map((l) => ({
            name: l.filename,
            strength_model: l.strength.recommended,
          })),
          output_path: `${OUTPUT_DIR}/${panel.name}.png`,
          seed: 300 + i,
          width: 768,
          height: 1024,
        });

        expect(result.success).toBe(true);
        console.log(`   Generated: ${OUTPUT_DIR}/${panel.name}.png`);
      }

      // Verify all outputs exist
      console.log("\n5. Verifying outputs...");
      for (const panel of panels) {
        expect(existsSync(`${OUTPUT_DIR}/${panel.name}.png`)).toBe(true);
      }

      console.log("\n=== PIPELINE COMPLETE ===");
      console.log(`\nView results: open ${OUTPUT_DIR}/panel_sequence_*.png`);
    }, 600000); // 10 minute timeout for full pipeline
  });
});
