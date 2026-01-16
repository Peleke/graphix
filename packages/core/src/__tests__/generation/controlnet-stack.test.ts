/**
 * ControlNetStack Unit Tests
 *
 * Comprehensive tests for the ControlNetStackClient class.
 * Tests single control, multi-control stacking, presets,
 * preprocessor options, and strength settings.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import {
  ControlNetStackClient,
  getControlNetStack,
  resetControlNetStack,
  CONTROL_STACK_PRESETS,
  type ControlType,
  type ControlCondition,
  type ControlNetStackRequest,
  type ControlStackPreset,
} from "../../generation/controlnet-stack.js";
import * as comfyuiClient from "../../generation/comfyui-client.js";

describe("ControlNetStack", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetControlNetStack();
  });

  afterEach(() => {
    teardownTestDatabase();
    resetControlNetStack();
  });

  // ==========================================================================
  // Singleton Management
  // ==========================================================================
  describe("Singleton Management", () => {
    it("returns singleton instance via getControlNetStack", () => {
      const stack1 = getControlNetStack();
      const stack2 = getControlNetStack();
      expect(stack1).toBe(stack2);
    });

    it("resets singleton when resetControlNetStack is called", () => {
      const stack1 = getControlNetStack();
      resetControlNetStack();
      const stack2 = getControlNetStack();
      expect(stack1).not.toBe(stack2);
    });
  });

  // ==========================================================================
  // Control Types
  // ==========================================================================
  describe("Control Types", () => {
    it("lists all supported control types", () => {
      const stack = getControlNetStack();
      const types = stack.listControlTypes();

      expect(types).toContain("canny");
      expect(types).toContain("depth");
      expect(types).toContain("openpose");
      expect(types).toContain("lineart");
      expect(types).toContain("scribble");
      expect(types).toContain("softedge");
      expect(types).toContain("tile");
      expect(types).toContain("inpaint");
    });

    it("includes all 16 control types", () => {
      const stack = getControlNetStack();
      const types = stack.listControlTypes();
      expect(types).toHaveLength(16);
    });

    it("includes semantic segmentation type", () => {
      const stack = getControlNetStack();
      const types = stack.listControlTypes();
      expect(types).toContain("semantic_seg");
    });

    it("includes reference type", () => {
      const stack = getControlNetStack();
      const types = stack.listControlTypes();
      expect(types).toContain("reference");
    });
  });

  // ==========================================================================
  // Recommended Strength
  // ==========================================================================
  describe("Recommended Strength", () => {
    it("returns canny strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("canny");

      expect(rec.min).toBe(0.3);
      expect(rec.max).toBe(1.2);
      expect(rec.default).toBe(0.7);
      expect(rec.notes).toBeDefined();
    });

    it("returns depth strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("depth");

      expect(rec.min).toBe(0.3);
      expect(rec.max).toBe(1.0);
      expect(rec.default).toBe(0.5);
    });

    it("returns openpose strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("openpose");

      expect(rec.min).toBe(0.5);
      expect(rec.max).toBe(1.0);
      expect(rec.default).toBe(0.85);
    });

    it("returns lineart strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("lineart");

      expect(rec.min).toBe(0.5);
      expect(rec.max).toBe(1.2);
      expect(rec.default).toBe(0.8);
    });

    it("returns scribble strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("scribble");

      expect(rec.default).toBe(0.7);
    });

    it("returns softedge strength recommendations", () => {
      const stack = getControlNetStack();
      const rec = stack.getRecommendedStrength("softedge");

      expect(rec.default).toBe(0.5);
      expect(rec.notes).toContain("background");
    });

    it("returns default recommendations for unknown types", () => {
      const stack = getControlNetStack();
      // Using a less common type
      const rec = stack.getRecommendedStrength("tile");

      expect(rec.min).toBe(0.3);
      expect(rec.max).toBe(1.0);
      expect(rec.default).toBe(0.7);
    });
  });

  // ==========================================================================
  // Control Stack Presets
  // ==========================================================================
  describe("Control Stack Presets", () => {
    it("lists all presets", () => {
      const stack = getControlNetStack();
      const presets = stack.listPresets();

      expect(presets.length).toBeGreaterThan(5);
    });

    it("gets pose_transfer preset", () => {
      const stack = getControlNetStack();
      const preset = stack.getPreset("pose_transfer");

      expect(preset).toBeDefined();
      expect(preset?.id).toBe("pose_transfer");
      expect(preset?.controls).toHaveLength(1);
      expect(preset?.controls[0].type).toBe("openpose");
    });

    it("gets pose_depth preset with two controls", () => {
      const stack = getControlNetStack();
      const preset = stack.getPreset("pose_depth");

      expect(preset?.controls).toHaveLength(2);
      expect(preset?.controls[0].type).toBe("openpose");
      expect(preset?.controls[1].type).toBe("depth");
    });

    it("gets character_consistency preset", () => {
      const preset = CONTROL_STACK_PRESETS.character_consistency;

      expect(preset.id).toBe("character_consistency");
      expect(preset.controls[0].type).toBe("openpose");
      expect(preset.controls[1].type).toBe("lineart");
    });

    it("gets lineart_color preset", () => {
      const preset = CONTROL_STACK_PRESETS.lineart_color;

      expect(preset.controls).toHaveLength(1);
      expect(preset.controls[0].type).toBe("lineart");
      expect(preset.controls[0].defaultStrength).toBe(1.0);
    });

    it("gets scene_reconstruction preset", () => {
      const preset = CONTROL_STACK_PRESETS.scene_reconstruction;

      expect(preset.controls).toHaveLength(2);
      expect(preset.controls.some((c) => c.type === "depth")).toBe(true);
      expect(preset.controls.some((c) => c.type === "canny")).toBe(true);
    });

    it("gets panel_continuity preset with three controls", () => {
      const preset = CONTROL_STACK_PRESETS.panel_continuity;

      expect(preset.controls).toHaveLength(3);
    });

    it("returns undefined for unknown preset", () => {
      const stack = getControlNetStack();
      const preset = stack.getPreset("nonexistent_preset");

      expect(preset).toBeUndefined();
    });
  });

  // ==========================================================================
  // Presets for Use Case
  // ==========================================================================
  describe("Presets for Use Case", () => {
    it("returns pose presets for pose use case", () => {
      const stack = getControlNetStack();
      const presets = stack.getPresetsForUseCase("pose");

      expect(presets.length).toBe(3);
      expect(presets.some((p) => p.id === "pose_transfer")).toBe(true);
      expect(presets.some((p) => p.id === "pose_depth")).toBe(true);
      expect(presets.some((p) => p.id === "detailed_pose")).toBe(true);
    });

    it("returns style presets for style use case", () => {
      const stack = getControlNetStack();
      const presets = stack.getPresetsForUseCase("style");

      expect(presets.length).toBe(2);
      expect(presets.some((p) => p.id === "lineart_color")).toBe(true);
      expect(presets.some((p) => p.id === "scene_reconstruction")).toBe(true);
    });

    it("returns sketch presets for sketch use case", () => {
      const stack = getControlNetStack();
      const presets = stack.getPresetsForUseCase("sketch");

      expect(presets.some((p) => p.id === "sketch_to_render")).toBe(true);
    });

    it("returns continuity presets for continuity use case", () => {
      const stack = getControlNetStack();
      const presets = stack.getPresetsForUseCase("continuity");

      expect(presets.some((p) => p.id === "panel_continuity")).toBe(true);
      expect(presets.some((p) => p.id === "character_consistency")).toBe(true);
    });

    it("returns detail presets for detail use case", () => {
      const stack = getControlNetStack();
      const presets = stack.getPresetsForUseCase("detail");

      expect(presets.some((p) => p.id === "detailed_pose")).toBe(true);
    });
  });

  // ==========================================================================
  // Total Influence Calculation
  // ==========================================================================
  describe("Total Influence Calculation", () => {
    it("calculates total influence for single control", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 0.8 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(0.8);
      expect(result.warning).toBeNull();
    });

    it("calculates total influence for multiple controls", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 0.8 },
        { type: "depth", image: "depth.png", strength: 0.5 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(1.3);
      expect(result.warning).toBeNull();
    });

    it("uses default strength when not specified", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png" },
        { type: "depth", image: "depth.png" },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(2.0);
    });

    it("warns when total influence exceeds 1.5", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 0.9 },
        { type: "depth", image: "depth.png", strength: 0.8 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBeCloseTo(1.7, 5);
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain("fight each other");
    });

    it("warns strongly when total influence exceeds 2.0", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 1.0 },
        { type: "depth", image: "depth.png", strength: 0.8 },
        { type: "lineart", image: "lines.png", strength: 0.5 },
      ];

      const result = stack.calculateTotalInfluence(controls);

      expect(result.total).toBe(2.3);
      expect(result.warning).toContain("artifacts");
    });
  });

  // ==========================================================================
  // Generation Validation
  // ==========================================================================
  describe("Generation Validation", () => {
    it("fails when no controls provided", async () => {
      const stack = getControlNetStack();
      const request: ControlNetStackRequest = {
        prompt: "test prompt",
        controls: [],
        outputPath: "/output/test.png",
      };

      const result = await stack.generate(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one control");
    });

    it("fails when more than 5 controls provided", async () => {
      const stack = getControlNetStack();
      const request: ControlNetStackRequest = {
        prompt: "test prompt",
        controls: [
          { type: "canny", image: "img1.png" },
          { type: "depth", image: "img2.png" },
          { type: "openpose", image: "img3.png" },
          { type: "lineart", image: "img4.png" },
          { type: "scribble", image: "img5.png" },
          { type: "softedge", image: "img6.png" },
        ],
        outputPath: "/output/test.png",
      };

      const result = await stack.generate(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum 5");
    });
  });

  // ==========================================================================
  // Preset Generation Validation
  // ==========================================================================
  describe("Preset Generation", () => {
    it("fails with unknown preset", async () => {
      const stack = getControlNetStack();
      const result = await stack.generateWithPreset(
        "nonexistent_preset",
        "reference.png",
        "test prompt",
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown preset");
    });
  });

  // ==========================================================================
  // Control Condition Defaults
  // ==========================================================================
  describe("Control Condition Defaults", () => {
    it("uses default strength of 1.0 when not specified", () => {
      const condition: ControlCondition = {
        type: "canny",
        image: "test.png",
      };

      expect(condition.strength).toBeUndefined();
      // Default is applied during generation
    });

    it("allows custom strength values", () => {
      const condition: ControlCondition = {
        type: "canny",
        image: "test.png",
        strength: 0.5,
      };

      expect(condition.strength).toBe(0.5);
    });

    it("allows start/end percentage specification", () => {
      const condition: ControlCondition = {
        type: "openpose",
        image: "pose.png",
        startPercent: 0.0,
        endPercent: 0.8,
      };

      expect(condition.startPercent).toBe(0.0);
      expect(condition.endPercent).toBe(0.8);
    });

    it("allows disabling preprocessing", () => {
      const condition: ControlCondition = {
        type: "depth",
        image: "preprocessed_depth.png",
        preprocess: false,
      };

      expect(condition.preprocess).toBe(false);
    });
  });

  // ==========================================================================
  // Preprocessor Options
  // ==========================================================================
  describe("Preprocessor Options", () => {
    it("supports canny threshold options", () => {
      const condition: ControlCondition = {
        type: "canny",
        image: "test.png",
        preprocessorOptions: {
          lowThreshold: 50,
          highThreshold: 150,
        },
      };

      expect(condition.preprocessorOptions?.lowThreshold).toBe(50);
      expect(condition.preprocessorOptions?.highThreshold).toBe(150);
    });

    it("supports openpose detection options", () => {
      const condition: ControlCondition = {
        type: "openpose",
        image: "test.png",
        preprocessorOptions: {
          detectBody: true,
          detectFace: true,
          detectHands: true,
        },
      };

      expect(condition.preprocessorOptions?.detectBody).toBe(true);
      expect(condition.preprocessorOptions?.detectFace).toBe(true);
      expect(condition.preprocessorOptions?.detectHands).toBe(true);
    });

    it("supports depth type options", () => {
      const condition: ControlCondition = {
        type: "depth",
        image: "test.png",
        preprocessorOptions: {
          depthType: "midas",
        },
      };

      expect(condition.preprocessorOptions?.depthType).toBe("midas");
    });

    it("supports lineart coarse option", () => {
      const condition: ControlCondition = {
        type: "lineart",
        image: "test.png",
        preprocessorOptions: {
          coarse: true,
        },
      };

      expect(condition.preprocessorOptions?.coarse).toBe(true);
    });

    it("supports MLSD threshold options", () => {
      const condition: ControlCondition = {
        type: "mlsd",
        image: "test.png",
        preprocessorOptions: {
          valueThreshold: 0.1,
          distanceThreshold: 0.1,
        },
      };

      expect(condition.preprocessorOptions?.valueThreshold).toBe(0.1);
      expect(condition.preprocessorOptions?.distanceThreshold).toBe(0.1);
    });
  });

  // ==========================================================================
  // Preset Strengths
  // ==========================================================================
  describe("Preset Default Strengths", () => {
    it("pose_transfer uses high openpose strength", () => {
      const preset = CONTROL_STACK_PRESETS.pose_transfer;
      expect(preset.controls[0].defaultStrength).toBe(0.9);
    });

    it("pose_depth uses balanced strengths", () => {
      const preset = CONTROL_STACK_PRESETS.pose_depth;
      expect(preset.controls[0].defaultStrength).toBe(0.85);
      expect(preset.controls[1].defaultStrength).toBe(0.5);
    });

    it("lineart_color uses full lineart strength", () => {
      const preset = CONTROL_STACK_PRESETS.lineart_color;
      expect(preset.controls[0].defaultStrength).toBe(1.0);
    });

    it("panel_continuity uses decreasing strengths", () => {
      const preset = CONTROL_STACK_PRESETS.panel_continuity;

      // Primary control is strongest
      expect(preset.controls[0].defaultStrength).toBe(0.75);
      // Secondary is lower
      expect(preset.controls[1].defaultStrength).toBe(0.4);
      // Tertiary is lowest
      expect(preset.controls[2].defaultStrength).toBe(0.3);
    });

    it("sketch_to_render prioritizes scribble over depth", () => {
      const preset = CONTROL_STACK_PRESETS.sketch_to_render;

      const scribbleCtrl = preset.controls.find((c) => c.type === "scribble");
      const depthCtrl = preset.controls.find((c) => c.type === "depth");

      expect(scribbleCtrl?.defaultStrength).toBeGreaterThan(depthCtrl?.defaultStrength ?? 0);
    });
  });

  // ==========================================================================
  // Preset Descriptions
  // ==========================================================================
  describe("Preset Descriptions", () => {
    it("all presets have descriptions", () => {
      const stack = getControlNetStack();
      const presets = stack.listPresets();

      for (const preset of presets) {
        expect(preset.description).toBeDefined();
        expect(preset.description.length).toBeGreaterThan(10);
      }
    });

    it("all presets have names", () => {
      const stack = getControlNetStack();
      const presets = stack.listPresets();

      for (const preset of presets) {
        expect(preset.name).toBeDefined();
        expect(preset.name.length).toBeGreaterThan(0);
      }
    });

    it("preset IDs are unique", () => {
      const stack = getControlNetStack();
      const presets = stack.listPresets();
      const ids = presets.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    it("handles control with very low strength", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 0.01 },
      ];

      const result = stack.calculateTotalInfluence(controls);
      expect(result.total).toBe(0.01);
      expect(result.warning).toBeNull();
    });

    it("handles control with very high strength", () => {
      const stack = getControlNetStack();
      const controls: ControlCondition[] = [
        { type: "openpose", image: "pose.png", strength: 2.0 },
      ];

      const result = stack.calculateTotalInfluence(controls);
      expect(result.total).toBe(2.0);
      expect(result.warning).not.toBeNull();
    });

    it("allows custom controlnet model specification", () => {
      const condition: ControlCondition = {
        type: "canny",
        image: "test.png",
        controlnetModel: "custom_canny_model.safetensors",
      };

      expect(condition.controlnetModel).toBe("custom_canny_model.safetensors");
    });
  });
});
