/**
 * E2E Test: ControlNet Consistency Pipeline
 *
 * Tests the full consistency workflow:
 * 1. Generate base panel
 * 2. Extract pose
 * 3. Generate new panel with same pose
 * 4. Verify model resolution works correctly
 *
 * This test requires:
 * - ComfyUI MCP server running
 * - ControlNet Union SDXL downloaded
 * - A known SDXL-compatible checkpoint
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import {
  getComfyUIClient,
  getControlNetStack,
  getModelResolver,
  CHECKPOINT_CATALOG,
} from "../../generation/index.js";

const OUTPUT_DIR = "output/e2e-controlnet";
const MODEL = "novaFurryXL_ilV130.safetensors";

describe("ControlNet Consistency E2E", () => {
  const client = getComfyUIClient();
  const resolver = getModelResolver();
  const stack = getControlNetStack();

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
  // Model Resolution Tests
  // ==========================================================================

  describe("Model Resolution", () => {
    test("resolver identifies novaFurryXL as illustrious family", () => {
      const family = resolver.getFamily(MODEL);
      expect(family).toBe("illustrious");
    });

    test("resolver finds Union ControlNet for openpose + illustrious", () => {
      const result = resolver.resolveControlNet(MODEL, "openpose");

      expect(result.compatible).toBe(true);
      expect(result.controlnet).toContain("union");
      expect(result.preprocessor).toBe("openpose");
    });

    test("resolver finds Union ControlNet for depth + illustrious", () => {
      const result = resolver.resolveControlNet(MODEL, "depth");

      expect(result.compatible).toBe(true);
      expect(result.controlnet).toContain("union");
    });

    test("resolver finds Union ControlNet for canny + illustrious", () => {
      const result = resolver.resolveControlNet(MODEL, "canny");

      expect(result.compatible).toBe(true);
      expect(result.controlnet).toContain("union");
    });

    test("resolver lists all available control types for model", () => {
      const types = resolver.listAvailableControlTypes(MODEL);

      expect(types).toContain("openpose");
      expect(types).toContain("depth");
      expect(types).toContain("canny");
      expect(types).toContain("lineart");
    });

    test("checkpoint catalog contains known models", () => {
      expect(CHECKPOINT_CATALOG[MODEL]).toBeDefined();
      expect(CHECKPOINT_CATALOG[MODEL].family).toBe("illustrious");
      expect(CHECKPOINT_CATALOG[MODEL].nsfw).toBe(true);
    });

    test("family inference works for unknown models", () => {
      // Models with pony in the name
      expect(resolver.getFamily("myCustomPonyModel.safetensors")).toBe("pony");
      // Models with flux in the name
      expect(resolver.getFamily("flux1-schnell-custom.safetensors")).toBe(
        "flux"
      );
      // Models with XL in the name
      expect(resolver.getFamily("customXL_v1.safetensors")).toBe("sdxl");
    });
  });

  // ==========================================================================
  // ControlNet Stack Tests
  // ==========================================================================

  describe("ControlNet Stack Integration", () => {
    test("stack lists control types for specific model", () => {
      const types = stack.listControlTypesForModel(MODEL);

      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain("openpose");
    });

    test("validation prevents incompatible combinations", async () => {
      // SD1.5 ControlNet should fail with SDXL model
      const validation = resolver.validateControlNet(
        MODEL,
        "control_v11p_sd15_openpose_fp16.safetensors"
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("not compatible");
    });

    test("validation allows compatible combinations", () => {
      const validation = resolver.validateControlNet(
        MODEL,
        "union-sdxl/diffusion_pytorch_model.safetensors"
      );

      expect(validation.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Live Generation Tests (require ComfyUI)
  // ==========================================================================

  describe("Live Generation", () => {
    test("generates base panel", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      const result = await client.imagine({
        description: "anthro otter girl, standing confidently, arms crossed",
        model: MODEL,
        output_path: `${OUTPUT_DIR}/panel_01.png`,
        seed: 100,
        width: 768,
        height: 1024,
        quality: "standard",
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_01.png`)).toBe(true);
    }, 120000);

    test("extracts pose from generated panel", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      if (!existsSync(`${OUTPUT_DIR}/panel_01.png`)) {
        console.log("Skipping - base panel not generated");
        return;
      }

      const result = await stack.preprocess(
        "panel_01.png", // Assumes file is in ComfyUI input folder
        "openpose",
        `${OUTPUT_DIR}/panel_01_pose.png`
      );

      expect(result.success).toBe(true);
    }, 60000);

    test("generates panel with same pose, different scene", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      // Note: This test requires the pose image to be in ComfyUI's input folder
      // For a real E2E test, you'd copy the pose image there first

      const result = await stack.generate({
        prompt:
          "anthro otter girl, same character, at a sunny beach, sunset lighting",
        negativePrompt: "bad quality, blurry, deformed",
        controls: [
          {
            type: "openpose",
            image: "panel_01_pose.png",
            strength: 0.85,
          },
        ],
        model: MODEL,
        outputPath: `${OUTPUT_DIR}/panel_02_pose_match.png`,
        seed: 101,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_02_pose_match.png`)).toBe(true);
    }, 120000);

    test("generates variant with img2img for identity preservation", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping - ComfyUI not available");
        return;
      }

      if (!existsSync(`${OUTPUT_DIR}/panel_01.png`)) {
        console.log("Skipping - base panel not generated");
        return;
      }

      const result = await client.img2img({
        prompt: "anthro otter girl, running, action pose, forest background",
        negative_prompt: "bad quality, blurry",
        source_image: "panel_01.png",
        output_path: `${OUTPUT_DIR}/panel_03_img2img.png`,
        denoising_strength: 0.55, // Lower denoise preserves more identity
        seed: 102,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/panel_03_img2img.png`)).toBe(true);
    }, 120000);
  });

  // ==========================================================================
  // Full Pipeline Test
  // ==========================================================================

  describe("Full Consistency Pipeline", () => {
    test("complete multi-panel consistency workflow", async () => {
      const health = await client.health();
      if (health.status !== "healthy") {
        console.log("Skipping full pipeline - ComfyUI not available");
        return;
      }

      console.log("\n=== FULL CONSISTENCY PIPELINE E2E TEST ===\n");

      // Step 1: Verify model compatibility
      console.log("1. Verifying model compatibility...");
      const compat = resolver.getFullCompatibility(MODEL);
      expect(compat).not.toBeNull();
      expect(compat!.controlnets.length).toBeGreaterThan(0);
      console.log(
        `   Model: ${MODEL} (${compat!.checkpoint.family})`
      );
      console.log(
        `   Compatible ControlNets: ${compat!.controlnets.length}`
      );

      // Step 2: Generate base panel
      console.log("\n2. Generating base panel...");
      const panel1 = await client.imagine({
        description:
          "anthro red fox girl, standing with hands on hips, confident pose, wearing casual clothes",
        model: MODEL,
        output_path: `${OUTPUT_DIR}/pipeline_01.png`,
        seed: 42,
        width: 768,
        height: 1024,
        quality: "standard",
      });
      expect(panel1.success).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/pipeline_01.png`);

      // Step 3: Extract pose
      console.log("\n3. Extracting pose...");
      const pose = await stack.preprocess(
        "pipeline_01.png",
        "openpose",
        `${OUTPUT_DIR}/pipeline_01_pose.png`
      );
      expect(pose.success).toBe(true);
      console.log(`   Pose: ${OUTPUT_DIR}/pipeline_01_pose.png`);

      // Step 4: Generate new panel with same pose
      console.log("\n4. Generating panel with matching pose...");
      const panel2 = await stack.generate({
        prompt:
          "anthro red fox girl, same character, at night under streetlights, same confident pose",
        negativePrompt: "bad quality, blurry, deformed",
        controls: [
          { type: "openpose", image: "pipeline_01_pose.png", strength: 0.9 },
        ],
        model: MODEL,
        outputPath: `${OUTPUT_DIR}/pipeline_02.png`,
        seed: 43,
      });
      expect(panel2.success).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/pipeline_02.png`);

      // Step 5: Generate action variant with img2img
      console.log("\n5. Generating action variant (img2img)...");
      const panel3 = await client.img2img({
        prompt: "anthro red fox girl, leaping, dynamic action pose, sunset",
        negative_prompt: "bad quality, blurry",
        source_image: "pipeline_01.png",
        output_path: `${OUTPUT_DIR}/pipeline_03.png`,
        denoising_strength: 0.6,
        seed: 44,
      });
      expect(panel3.success).toBe(true);
      console.log(`   Generated: ${OUTPUT_DIR}/pipeline_03.png`);

      // Verify all outputs exist
      console.log("\n6. Verifying outputs...");
      expect(existsSync(`${OUTPUT_DIR}/pipeline_01.png`)).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/pipeline_02.png`)).toBe(true);
      expect(existsSync(`${OUTPUT_DIR}/pipeline_03.png`)).toBe(true);

      console.log("\n=== PIPELINE COMPLETE ===");
      console.log(`\nView results: open ${OUTPUT_DIR}/pipeline_*.png`);
    }, 300000); // 5 minute timeout for full pipeline
  });
});
