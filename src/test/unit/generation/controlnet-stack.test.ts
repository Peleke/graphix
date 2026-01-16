/**
 * Unit Tests: ControlNet Stack
 *
 * EXHAUSTIVE testing of ControlNet stacking for multi-control generation.
 * Tests presets, control types, strength calculations, and edge cases.
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  ControlNetStackClient,
  getControlNetStack,
  resetControlNetStack,
  CONTROL_STACK_PRESETS,
  type ControlType,
  type ControlCondition,
  type ControlNetStackRequest,
} from "../../../generation/controlnet-stack.js";

// Track call arguments
let lastControlNetCall: Record<string, unknown> | null = null;
let lastPreprocessCall: Record<string, unknown> | null = null;
let controlNetCallCount = 0;
let preprocessCallCount = 0;

// Mock the ComfyUI client
const mockGenerateWithControlNet = mock(async (params: Record<string, unknown>) => {
  lastControlNetCall = params;
  controlNetCallCount++;
  return {
    success: true,
    localPath: "/output/test.png",
    seed: 12345,
  };
});

const mockPreprocessImage = mock(async (params: Record<string, unknown>) => {
  lastPreprocessCall = params;
  preprocessCallCount++;
  return {
    success: true,
    localPath: "/output/preprocessed.png",
  };
});

mock.module("../../../generation/comfyui-client.js", () => ({
  getComfyUIClient: () => ({
    generateWithControlNet: mockGenerateWithControlNet,
    preprocessImage: mockPreprocessImage,
  }),
}));

describe("ControlNet Stack", () => {
  let stack: ControlNetStackClient;

  beforeEach(() => {
    resetControlNetStack();
    stack = getControlNetStack();
    mockGenerateWithControlNet.mockClear();
    mockPreprocessImage.mockClear();
    lastControlNetCall = null;
    lastPreprocessCall = null;
    controlNetCallCount = 0;
    preprocessCallCount = 0;
  });

  // ============================================================================
  // Singleton Behavior
  // ============================================================================

  describe("Singleton", () => {
    test("getControlNetStack returns same instance", () => {
      const instance1 = getControlNetStack();
      const instance2 = getControlNetStack();
      expect(instance1).toBe(instance2);
    });

    test("resetControlNetStack creates new instance", () => {
      const instance1 = getControlNetStack();
      resetControlNetStack();
      const instance2 = getControlNetStack();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Control Stack Presets
  // ============================================================================

  describe("CONTROL_STACK_PRESETS", () => {
    test("has pose_transfer preset", () => {
      expect(CONTROL_STACK_PRESETS.pose_transfer).toBeDefined();
      expect(CONTROL_STACK_PRESETS.pose_transfer.controls).toHaveLength(1);
      expect(CONTROL_STACK_PRESETS.pose_transfer.controls[0].type).toBe("openpose");
    });

    test("has pose_depth preset", () => {
      expect(CONTROL_STACK_PRESETS.pose_depth).toBeDefined();
      expect(CONTROL_STACK_PRESETS.pose_depth.controls).toHaveLength(2);
    });

    test("has character_consistency preset", () => {
      expect(CONTROL_STACK_PRESETS.character_consistency).toBeDefined();
      const types = CONTROL_STACK_PRESETS.character_consistency.controls.map((c) => c.type);
      expect(types).toContain("openpose");
      expect(types).toContain("lineart");
    });

    test("has lineart_color preset", () => {
      expect(CONTROL_STACK_PRESETS.lineart_color).toBeDefined();
      expect(CONTROL_STACK_PRESETS.lineart_color.controls[0].type).toBe("lineart");
    });

    test("has scene_reconstruction preset", () => {
      expect(CONTROL_STACK_PRESETS.scene_reconstruction).toBeDefined();
      const types = CONTROL_STACK_PRESETS.scene_reconstruction.controls.map((c) => c.type);
      expect(types).toContain("depth");
      expect(types).toContain("canny");
    });

    test("has panel_continuity preset", () => {
      expect(CONTROL_STACK_PRESETS.panel_continuity).toBeDefined();
      expect(CONTROL_STACK_PRESETS.panel_continuity.controls.length).toBeGreaterThanOrEqual(2);
    });

    test("all presets have valid structure", () => {
      for (const [id, preset] of Object.entries(CONTROL_STACK_PRESETS)) {
        expect(preset.id).toBe(id);
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(Array.isArray(preset.controls)).toBe(true);
        expect(preset.controls.length).toBeGreaterThan(0);

        for (const control of preset.controls) {
          expect(control.type).toBeDefined();
          expect(control.defaultStrength).toBeGreaterThan(0);
          expect(control.defaultStrength).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  // ============================================================================
  // Generation - Single Control
  // ============================================================================

  describe("generate - single control", () => {
    const baseRequest: ControlNetStackRequest = {
      prompt: "1girl, standing",
      controls: [{ type: "openpose", image: "pose.png" }],
      outputPath: "/output/test.png",
    };

    test("generates with single control", async () => {
      const result = await stack.generate(baseRequest);

      expect(result.success).toBe(true);
      expect(controlNetCallCount).toBe(1);
    });

    test("uses default dimensions", async () => {
      await stack.generate(baseRequest);

      expect(lastControlNetCall).not.toBeNull();
      expect(lastControlNetCall!.width).toBe(768);
      expect(lastControlNetCall!.height).toBe(1024);
    });

    test("respects custom dimensions", async () => {
      await stack.generate({
        ...baseRequest,
        width: 1024,
        height: 768,
      });

      expect(lastControlNetCall!.width).toBe(1024);
      expect(lastControlNetCall!.height).toBe(768);
    });

    test("uses default control strength of 1.0", async () => {
      await stack.generate(baseRequest);

      expect(lastControlNetCall!.strength).toBe(1.0);
    });

    test("respects custom control strength", async () => {
      await stack.generate({
        ...baseRequest,
        controls: [{ type: "openpose", image: "pose.png", strength: 0.85 }],
      });

      expect(lastControlNetCall!.strength).toBe(0.85);
    });

    test("includes negative prompt", async () => {
      await stack.generate({
        ...baseRequest,
        negativePrompt: "bad quality, blurry",
      });

      expect(lastControlNetCall!.negative_prompt).toBe("bad quality, blurry");
    });

    test("includes quality settings", async () => {
      await stack.generate({
        ...baseRequest,
        steps: 40,
        cfgScale: 8,
        sampler: "dpmpp_2m",
      });

      expect(lastControlNetCall!.steps).toBe(40);
      expect(lastControlNetCall!.cfg_scale).toBe(8);
      expect(lastControlNetCall!.sampler).toBe("dpmpp_2m");
    });

    test("includes model specification", async () => {
      await stack.generate({
        ...baseRequest,
        model: "novaFurryXL.safetensors",
      });

      expect(lastControlNetCall!.model).toBe("novaFurryXL.safetensors");
    });

    test("includes LoRAs", async () => {
      await stack.generate({
        ...baseRequest,
        loras: [{ name: "style.safetensors", strengthModel: 0.8 }],
      });

      expect(lastControlNetCall!.loras).toBeDefined();
    });

    test("includes seed", async () => {
      await stack.generate({
        ...baseRequest,
        seed: 42,
      });

      expect(lastControlNetCall!.seed).toBe(42);
    });
  });

  // ============================================================================
  // Generation - Multiple Controls
  // ============================================================================

  describe("generate - multiple controls", () => {
    test("handles two controls (uses primary)", async () => {
      const result = await stack.generate({
        prompt: "1girl",
        controls: [
          { type: "openpose", image: "pose.png", strength: 0.85 },
          { type: "depth", image: "depth.png", strength: 0.5 },
        ],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
      expect(controlNetCallCount).toBeGreaterThanOrEqual(1);
    });

    test("handles three controls", async () => {
      const result = await stack.generate({
        prompt: "1girl",
        controls: [
          { type: "openpose", image: "pose.png" },
          { type: "depth", image: "depth.png" },
          { type: "lineart", image: "lineart.png" },
        ],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("adds prompt hints for multiple controls", async () => {
      await stack.generate({
        prompt: "1girl, forest background",
        controls: [
          { type: "openpose", image: "pose.png" },
          { type: "depth", image: "depth.png" },
        ],
        outputPath: "/output/test.png",
      });

      const prompt = lastControlNetCall!.prompt as string;
      expect(prompt).toContain("accurate pose");
    });

    test("fails with more than 5 controls", async () => {
      const result = await stack.generate({
        prompt: "test",
        controls: [
          { type: "openpose", image: "1.png" },
          { type: "depth", image: "2.png" },
          { type: "canny", image: "3.png" },
          { type: "lineart", image: "4.png" },
          { type: "scribble", image: "5.png" },
          { type: "softedge", image: "6.png" },
        ],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum 5");
    });

    test("fails with no controls", async () => {
      const result = await stack.generate({
        prompt: "test",
        controls: [],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one");
    });
  });

  // ============================================================================
  // Generate With Preset
  // ============================================================================

  describe("generateWithPreset", () => {
    test("generates with pose_transfer preset", async () => {
      const result = await stack.generateWithPreset(
        "pose_transfer",
        "ref.png",
        "1girl, standing",
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(true);
      expect(controlNetCallCount).toBeGreaterThanOrEqual(1);
    });

    test("generates with character_consistency preset", async () => {
      const result = await stack.generateWithPreset(
        "character_consistency",
        "ref.png",
        "1girl, detailed",
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(true);
    });

    test("generates with panel_continuity preset", async () => {
      const result = await stack.generateWithPreset(
        "panel_continuity",
        "ref.png",
        "next panel scene",
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(true);
    });

    test("fails with unknown preset", async () => {
      const result = await stack.generateWithPreset(
        "nonexistent_preset",
        "ref.png",
        "test",
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown preset");
    });

    test("passes additional options", async () => {
      await stack.generateWithPreset("pose_transfer", "ref.png", "1girl", {
        outputPath: "/output/test.png",
        negativePrompt: "bad quality",
        width: 1024,
        height: 768,
        steps: 40,
      });

      expect(lastControlNetCall!.negative_prompt).toBe("bad quality");
      expect(lastControlNetCall!.width).toBe(1024);
      expect(lastControlNetCall!.height).toBe(768);
      expect(lastControlNetCall!.steps).toBe(40);
    });

    test("uses preset default strengths", async () => {
      await stack.generateWithPreset("pose_transfer", "ref.png", "1girl", {
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.strength).toBe(0.9); // pose_transfer default
    });
  });

  // ============================================================================
  // Preprocessing
  // ============================================================================

  describe("preprocess", () => {
    test("preprocesses image for openpose", async () => {
      const result = await stack.preprocess("input.png", "openpose", "/output/pose.png");

      expect(result.success).toBe(true);
      expect(lastPreprocessCall).toEqual({
        input_image: "input.png",
        control_type: "openpose",
        output_path: "/output/pose.png",
      });
    });

    test("preprocesses image for canny", async () => {
      await stack.preprocess("input.png", "canny", "/output/canny.png");

      expect(lastPreprocessCall!.control_type).toBe("canny");
    });

    test("preprocesses image for depth", async () => {
      await stack.preprocess("input.png", "depth", "/output/depth.png");

      expect(lastPreprocessCall!.control_type).toBe("depth");
    });

    test("preprocesses image for lineart", async () => {
      await stack.preprocess("input.png", "lineart", "/output/lineart.png");

      expect(lastPreprocessCall!.control_type).toBe("lineart");
    });
  });

  // ============================================================================
  // Preprocess For Stack
  // ============================================================================

  describe("preprocessForStack", () => {
    test("preprocesses multiple control types", async () => {
      const results = await stack.preprocessForStack("input.png", ["openpose", "depth"], "/output");

      expect(preprocessCallCount).toBe(2);
      expect(results.size).toBe(2);
    });

    test("returns map of control type to path", async () => {
      const results = await stack.preprocessForStack(
        "input.png",
        ["openpose", "canny"],
        "/output"
      );

      expect(results.has("openpose")).toBe(true);
      expect(results.has("canny")).toBe(true);
    });

    test("handles single control type", async () => {
      const results = await stack.preprocessForStack("input.png", ["depth"], "/output");

      expect(preprocessCallCount).toBe(1);
      expect(results.size).toBe(1);
    });
  });

  // ============================================================================
  // Preset Management
  // ============================================================================

  describe("listPresets", () => {
    test("returns all presets", () => {
      const presets = stack.listPresets();

      expect(presets.length).toBe(Object.keys(CONTROL_STACK_PRESETS).length);
    });

    test("presets have required properties", () => {
      const presets = stack.listPresets();

      for (const preset of presets) {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.controls).toBeDefined();
      }
    });
  });

  describe("getPreset", () => {
    test("returns preset by ID", () => {
      const preset = stack.getPreset("pose_transfer");

      expect(preset).toBeDefined();
      expect(preset?.id).toBe("pose_transfer");
    });

    test("returns undefined for unknown preset", () => {
      const preset = stack.getPreset("nonexistent");

      expect(preset).toBeUndefined();
    });
  });

  describe("getPresetsForUseCase", () => {
    test("returns pose presets", () => {
      const presets = stack.getPresetsForUseCase("pose");

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === "pose_transfer")).toBe(true);
    });

    test("returns style presets", () => {
      const presets = stack.getPresetsForUseCase("style");

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === "lineart_color")).toBe(true);
    });

    test("returns sketch presets", () => {
      const presets = stack.getPresetsForUseCase("sketch");

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === "sketch_to_render")).toBe(true);
    });

    test("returns continuity presets", () => {
      const presets = stack.getPresetsForUseCase("continuity");

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === "panel_continuity")).toBe(true);
    });

    test("returns detail presets", () => {
      const presets = stack.getPresetsForUseCase("detail");

      expect(presets.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Control Types
  // ============================================================================

  describe("listControlTypes", () => {
    test("returns all control types", () => {
      const types = stack.listControlTypes();

      expect(types).toContain("canny");
      expect(types).toContain("depth");
      expect(types).toContain("openpose");
      expect(types).toContain("lineart");
      expect(types).toContain("scribble");
      expect(types).toContain("softedge");
      expect(types).toContain("normalbae");
      expect(types).toContain("mlsd");
      expect(types).toContain("shuffle");
      expect(types).toContain("tile");
      expect(types).toContain("blur");
      expect(types).toContain("inpaint");
      expect(types).toContain("semantic_seg");
      expect(types).toContain("qrcode");
      expect(types).toContain("reference");
    });

    test("types are unique", () => {
      const types = stack.listControlTypes();
      const unique = new Set(types);

      expect(unique.size).toBe(types.length);
    });
  });

  // ============================================================================
  // Recommended Strengths
  // ============================================================================

  describe("getRecommendedStrength", () => {
    const controlTypes: ControlType[] = [
      "canny",
      "depth",
      "openpose",
      "lineart",
      "scribble",
      "softedge",
    ];

    test.each(controlTypes)("returns settings for %s", (type) => {
      const settings = stack.getRecommendedStrength(type);

      expect(settings.min).toBeDefined();
      expect(settings.max).toBeDefined();
      expect(settings.default).toBeDefined();
      expect(settings.notes).toBeDefined();

      expect(settings.min).toBeLessThan(settings.max);
      expect(settings.default).toBeGreaterThanOrEqual(settings.min);
      expect(settings.default).toBeLessThanOrEqual(settings.max);
    });

    test("openpose has high default strength", () => {
      const settings = stack.getRecommendedStrength("openpose");
      expect(settings.default).toBeGreaterThanOrEqual(0.8);
    });

    test("depth has moderate default strength", () => {
      const settings = stack.getRecommendedStrength("depth");
      expect(settings.default).toBeLessThanOrEqual(0.7);
    });

    test("softedge has low default strength", () => {
      const settings = stack.getRecommendedStrength("softedge");
      expect(settings.default).toBeLessThanOrEqual(0.6);
    });
  });

  // ============================================================================
  // Total Influence Calculation
  // ============================================================================

  describe("calculateTotalInfluence", () => {
    test("calculates sum of control strengths", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png", strength: 0.8 },
        { type: "depth", image: "2.png", strength: 0.5 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(1.3);
    });

    test("uses default strength of 1.0 when not specified", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png" },
        { type: "depth", image: "2.png" },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(2.0);
    });

    test("no warning for moderate influence", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png", strength: 0.7 },
        { type: "depth", image: "2.png", strength: 0.4 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.warning).toBeNull();
    });

    test("warning for high influence (>1.5)", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png", strength: 0.9 },
        { type: "depth", image: "2.png", strength: 0.7 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain("High total influence");
    });

    test("stronger warning for very high influence (>2.0)", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png", strength: 1.0 },
        { type: "depth", image: "2.png", strength: 0.8 },
        { type: "lineart", image: "3.png", strength: 0.5 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.warning).toContain("Very high");
    });

    test("handles empty controls array", () => {
      const result = stack.calculateTotalInfluence([]);

      expect(result.total).toBe(0);
      expect(result.warning).toBeNull();
    });

    test("handles single control", () => {
      const controls: ControlCondition[] = [
        { type: "openpose", image: "1.png", strength: 0.9 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(0.9);
      expect(result.warning).toBeNull();
    });
  });

  // ============================================================================
  // Control Type Mapping
  // ============================================================================

  describe("Control Type Mapping", () => {
    test("maps openpose correctly", async () => {
      await stack.generate({
        prompt: "test",
        controls: [{ type: "openpose", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.control_type).toBe("openpose");
    });

    test("maps canny correctly", async () => {
      await stack.generate({
        prompt: "test",
        controls: [{ type: "canny", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.control_type).toBe("canny");
    });

    test("maps depth correctly", async () => {
      await stack.generate({
        prompt: "test",
        controls: [{ type: "depth", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.control_type).toBe("depth");
    });

    test("maps lineart correctly", async () => {
      await stack.generate({
        prompt: "test",
        controls: [{ type: "lineart", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.control_type).toBe("lineart");
    });

    test("maps unsupported types to scribble fallback", async () => {
      await stack.generate({
        prompt: "test",
        controls: [{ type: "tile", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(lastControlNetCall!.control_type).toBe("scribble");
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    test("handles very high strength", async () => {
      const result = await stack.generate({
        prompt: "test",
        controls: [{ type: "openpose", image: "test.png", strength: 2.0 }],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles very low strength", async () => {
      const result = await stack.generate({
        prompt: "test",
        controls: [{ type: "openpose", image: "test.png", strength: 0.01 }],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles special characters in prompt", async () => {
      const result = await stack.generate({
        prompt: "1girl, (detailed:1.3), [background], {option1|option2}",
        controls: [{ type: "openpose", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles paths with spaces", async () => {
      const result = await stack.generate({
        prompt: "test",
        controls: [{ type: "openpose", image: "/path/with spaces/test.png" }],
        outputPath: "/output/with spaces/result.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles unicode in prompt", async () => {
      const result = await stack.generate({
        prompt: "キャラクター テスト",
        controls: [{ type: "openpose", image: "test.png" }],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });
  });
});
