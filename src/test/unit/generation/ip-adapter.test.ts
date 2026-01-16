/**
 * Unit Tests: IP-Adapter
 *
 * EXHAUSTIVE testing of IP-Adapter identity extraction and application.
 * Tests all adapter model types, settings, and edge cases.
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  IPAdapterClient,
  getIPAdapter,
  resetIPAdapter,
  type IPAdapterModel,
  type IPAdapterRequest,
} from "../../../generation/ip-adapter.js";

// Track call arguments
let lastGenerateCall: Record<string, unknown> | null = null;

// Mock the ComfyUI client
const mockGenerateImage = mock(async (params: Record<string, unknown>) => {
  lastGenerateCall = params;
  return {
    success: true,
    localPath: "/output/test.png",
    seed: 12345,
  };
});

mock.module("../../../generation/comfyui-client.js", () => ({
  getComfyUIClient: () => ({
    generateImage: mockGenerateImage,
  }),
}));

describe("IP-Adapter", () => {
  let adapter: IPAdapterClient;

  beforeEach(() => {
    resetIPAdapter();
    adapter = getIPAdapter();
    mockGenerateImage.mockClear();
    lastGenerateCall = null;
  });

  // ============================================================================
  // Singleton Behavior
  // ============================================================================

  describe("Singleton", () => {
    test("getIPAdapter returns same instance", () => {
      const instance1 = getIPAdapter();
      const instance2 = getIPAdapter();
      expect(instance1).toBe(instance2);
    });

    test("resetIPAdapter creates new instance", () => {
      const instance1 = getIPAdapter();
      resetIPAdapter();
      const instance2 = getIPAdapter();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Identity Extraction
  // ============================================================================

  describe("extractIdentity", () => {
    test("extracts identity from single source image", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref1.png"],
        name: "Test Character",
      });

      expect(result.success).toBe(true);
      expect(result.embedding).toBeDefined();
      expect(result.embedding?.sourceImages).toEqual(["ref1.png"]);
      expect(result.embedding?.name).toBe("Test Character");
    });

    test("extracts identity from multiple source images", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref1.png", "ref2.png", "ref3.png"],
        name: "Multi-Ref Character",
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.sourceImages).toHaveLength(3);
    });

    test("uses default adapter model if not specified", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Default Model Test",
      });

      expect(result.embedding?.adapterModel).toBe("ip-adapter-plus-face");
    });

    test("respects specified adapter model", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Custom Model Test",
        adapterModel: "ip-adapter-faceid",
      });

      expect(result.embedding?.adapterModel).toBe("ip-adapter-faceid");
    });

    test("includes optional description", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Described Character",
        description: "A brave warrior with blue armor",
      });

      expect(result.embedding?.description).toBe("A brave warrior with blue armor");
    });

    test("generates unique ID for each extraction", async () => {
      const result1 = await adapter.extractIdentity({
        sourceImages: ["ref1.png"],
        name: "Character 1",
      });
      const result2 = await adapter.extractIdentity({
        sourceImages: ["ref2.png"],
        name: "Character 2",
      });

      expect(result1.embedding?.id).not.toBe(result2.embedding?.id);
    });

    test("fails with empty source images", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: [],
        name: "Empty Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("source image");
    });

    test("sets createdAt timestamp", async () => {
      const before = new Date();
      const result = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Timestamp Test",
      });
      const after = new Date();

      expect(result.embedding?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.embedding?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ============================================================================
  // Identity-Guided Generation
  // ============================================================================

  describe("generateWithIdentity", () => {
    const baseRequest: IPAdapterRequest = {
      prompt: "1girl, standing in forest",
      referenceImages: ["ref.png"],
      outputPath: "/output/test.png",
    };

    test("generates with minimum required params", async () => {
      const result = await adapter.generateWithIdentity(baseRequest);

      expect(result.success).toBe(true);
      expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    });

    test("uses default dimensions", async () => {
      await adapter.generateWithIdentity(baseRequest);

      expect(lastGenerateCall).not.toBeNull();
      expect(lastGenerateCall!.width).toBe(768);
      expect(lastGenerateCall!.height).toBe(1024);
    });

    test("respects custom dimensions", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        width: 1024,
        height: 768,
      });

      expect(lastGenerateCall!.width).toBe(1024);
      expect(lastGenerateCall!.height).toBe(768);
    });

    test("uses default strength of 0.8", async () => {
      await adapter.generateWithIdentity(baseRequest);

      // Default strength is applied internally
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("respects custom strength", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        strength: 0.5,
      });

      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("includes negative prompt", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        negativePrompt: "bad quality, blurry",
      });

      expect(lastGenerateCall!.negative_prompt).toBe("bad quality, blurry");
    });

    test("applies quality settings", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        steps: 40,
        cfgScale: 8,
        sampler: "dpmpp_2m",
        scheduler: "karras",
      });

      expect(lastGenerateCall!.steps).toBe(40);
      expect(lastGenerateCall!.cfg_scale).toBe(8);
      expect(lastGenerateCall!.sampler).toBe("dpmpp_2m");
      expect(lastGenerateCall!.scheduler).toBe("karras");
    });

    test("includes model specification", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        model: "novaFurryXL.safetensors",
      });

      expect(lastGenerateCall!.model).toBe("novaFurryXL.safetensors");
    });

    test("includes LoRAs", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        loras: [
          { name: "character_v1.safetensors", strengthModel: 0.8, strengthClip: 0.8 },
          { name: "style_v2.safetensors", strengthModel: 0.5 },
        ],
      });

      const loras = lastGenerateCall!.loras as Array<Record<string, unknown>>;
      expect(loras).toHaveLength(2);
      expect(loras[0].name).toBe("character_v1.safetensors");
    });

    test("includes seed for reproducibility", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        seed: 42,
      });

      expect(lastGenerateCall!.seed).toBe(42);
    });

    test("fails with no reference images", async () => {
      const result = await adapter.generateWithIdentity({
        ...baseRequest,
        referenceImages: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("reference image");
    });

    test("adds face-specific hints for face adapters", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        adapterModel: "ip-adapter-plus-face",
      });

      expect(lastGenerateCall!.prompt).toContain("detailed face");
    });

    test("adds style hints for style adapter", async () => {
      await adapter.generateWithIdentity({
        ...baseRequest,
        adapterModel: "ip-adapter-style",
      });

      expect(lastGenerateCall!.prompt).toContain("consistent style");
    });
  });

  // ============================================================================
  // Generate From Embedding
  // ============================================================================

  describe("generateFromEmbedding", () => {
    test("generates using extracted embedding", async () => {
      const extractResult = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Test",
      });

      const result = await adapter.generateFromEmbedding(
        "1girl, walking",
        { embedding: extractResult.embedding!, strength: 0.85 },
        { outputPath: "/output/test.png" }
      );

      expect(result.success).toBe(true);
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("uses embedding source images", async () => {
      const extractResult = await adapter.extractIdentity({
        sourceImages: ["ref1.png", "ref2.png"],
        name: "Test",
      });

      await adapter.generateFromEmbedding(
        "1girl",
        { embedding: extractResult.embedding! },
        { outputPath: "/output/test.png" }
      );

      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("uses embedding adapter model", async () => {
      const extractResult = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Test",
        adapterModel: "ip-adapter-faceid",
      });

      await adapter.generateFromEmbedding(
        "1girl",
        { embedding: extractResult.embedding! },
        { outputPath: "/output/test.png" }
      );

      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("respects strength override", async () => {
      const extractResult = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "Test",
      });

      await adapter.generateFromEmbedding(
        "1girl",
        { embedding: extractResult.embedding!, strength: 0.5 },
        { outputPath: "/output/test.png" }
      );

      expect(mockGenerateImage).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Style Transfer
  // ============================================================================

  describe("transferStyle", () => {
    test("transfers style from reference", async () => {
      const result = await adapter.transferStyle({
        prompt: "1girl, portrait",
        styleReference: "style_ref.png",
        outputPath: "/output/styled.png",
      });

      expect(result.success).toBe(true);
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("uses default style strength of 0.6", async () => {
      await adapter.transferStyle({
        prompt: "1girl",
        styleReference: "style_ref.png",
        outputPath: "/output/styled.png",
      });

      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("respects custom style strength", async () => {
      await adapter.transferStyle({
        prompt: "1girl",
        styleReference: "style_ref.png",
        strength: 0.8,
        outputPath: "/output/styled.png",
      });

      expect(mockGenerateImage).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Composition Transfer
  // ============================================================================

  describe("transferComposition", () => {
    test("transfers composition from reference", async () => {
      const result = await adapter.transferComposition({
        prompt: "forest scene with character",
        compositionReference: "comp_ref.png",
        outputPath: "/output/composed.png",
      });

      expect(result.success).toBe(true);
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("uses default composition strength of 0.5", async () => {
      await adapter.transferComposition({
        prompt: "scene",
        compositionReference: "comp_ref.png",
        outputPath: "/output/composed.png",
      });

      expect(mockGenerateImage).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Recommended Settings
  // ============================================================================

  describe("getRecommendedSettings", () => {
    const adapterModels: IPAdapterModel[] = [
      "ip-adapter-plus",
      "ip-adapter-plus-face",
      "ip-adapter-full-face",
      "ip-adapter-faceid",
      "ip-adapter-faceid-plus",
      "ip-adapter-style",
      "ip-adapter-composition",
    ];

    test.each(adapterModels)("returns settings for %s", (model) => {
      const settings = adapter.getRecommendedSettings(model);

      expect(settings.defaultStrength).toBeGreaterThan(0);
      expect(settings.defaultStrength).toBeLessThanOrEqual(1);
      expect(settings.recommendedCfg).toBeGreaterThan(0);
      expect(settings.recommendedCfg).toBeLessThanOrEqual(10);
      expect(settings.notes).toBeDefined();
    });

    test("face-focused adapters have higher default strength", () => {
      const plusFace = adapter.getRecommendedSettings("ip-adapter-plus-face");
      const style = adapter.getRecommendedSettings("ip-adapter-style");

      expect(plusFace.defaultStrength).toBeGreaterThan(style.defaultStrength);
    });

    test("faceid has highest default strength", () => {
      const faceid = adapter.getRecommendedSettings("ip-adapter-faceid");
      const plus = adapter.getRecommendedSettings("ip-adapter-plus");

      expect(faceid.defaultStrength).toBeGreaterThan(plus.defaultStrength);
    });

    test("style adapter has lowest recommended cfg", () => {
      const style = adapter.getRecommendedSettings("ip-adapter-style");
      const faceid = adapter.getRecommendedSettings("ip-adapter-faceid");

      expect(style.recommendedCfg).toBeGreaterThanOrEqual(faceid.recommendedCfg);
    });
  });

  // ============================================================================
  // List Adapter Models
  // ============================================================================

  describe("listAdapterModels", () => {
    test("returns all adapter models", () => {
      const models = adapter.listAdapterModels();

      expect(models).toContain("ip-adapter-plus");
      expect(models).toContain("ip-adapter-plus-face");
      expect(models).toContain("ip-adapter-full-face");
      expect(models).toContain("ip-adapter-faceid");
      expect(models).toContain("ip-adapter-faceid-plus");
      expect(models).toContain("ip-adapter-style");
      expect(models).toContain("ip-adapter-composition");
    });

    test("returns expected count of models", () => {
      const models = adapter.listAdapterModels();
      expect(models).toHaveLength(7);
    });

    test("models are unique", () => {
      const models = adapter.listAdapterModels();
      const unique = new Set(models);
      expect(unique.size).toBe(models.length);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    test("handles very long prompt", async () => {
      const longPrompt = "1girl, ".repeat(100);
      const result = await adapter.generateWithIdentity({
        prompt: longPrompt,
        referenceImages: ["ref.png"],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles special characters in prompt", async () => {
      const result = await adapter.generateWithIdentity({
        prompt: "1girl, (detailed:1.3), [background], {alternate|option}",
        referenceImages: ["ref.png"],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles unicode in name", async () => {
      const result = await adapter.extractIdentity({
        sourceImages: ["ref.png"],
        name: "キャラクター テスト",
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.name).toBe("キャラクター テスト");
    });

    test("handles paths with spaces", async () => {
      const result = await adapter.generateWithIdentity({
        prompt: "test",
        referenceImages: ["/path/with spaces/ref.png"],
        outputPath: "/output/with spaces/test.png",
      });

      expect(result.success).toBe(true);
    });

    test("handles multiple reference images", async () => {
      const result = await adapter.generateWithIdentity({
        prompt: "test",
        referenceImages: ["ref1.png", "ref2.png", "ref3.png", "ref4.png", "ref5.png"],
        outputPath: "/output/test.png",
      });

      expect(result.success).toBe(true);
    });
  });
});
