/**
 * IPAdapter Unit Tests
 *
 * Comprehensive tests for the IPAdapterClient class.
 * Tests identity extraction, generateWithIdentity, style transfer,
 * composition transfer, and model variant settings.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import {
  IPAdapterClient,
  getIPAdapter,
  resetIPAdapter,
  type IPAdapterRequest,
  type IdentityEmbedding,
  type IPAdapterModel,
  type IdentityExtractionResult,
  type IPAdapterApplyOptions,
} from "../../generation/ip-adapter.js";

describe("IPAdapter", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetIPAdapter();
  });

  afterEach(() => {
    teardownTestDatabase();
    resetIPAdapter();
  });

  // ==========================================================================
  // Singleton Management
  // ==========================================================================
  describe("Singleton Management", () => {
    it("returns singleton instance via getIPAdapter", () => {
      const adapter1 = getIPAdapter();
      const adapter2 = getIPAdapter();
      expect(adapter1).toBe(adapter2);
    });

    it("resets singleton when resetIPAdapter is called", () => {
      const adapter1 = getIPAdapter();
      resetIPAdapter();
      const adapter2 = getIPAdapter();
      expect(adapter1).not.toBe(adapter2);
    });

    it("creates fresh instance on each reset", () => {
      const instances: IPAdapterClient[] = [];
      for (let i = 0; i < 3; i++) {
        resetIPAdapter();
        instances.push(getIPAdapter());
      }
      // All instances should be different
      expect(instances[0]).not.toBe(instances[1]);
      expect(instances[1]).not.toBe(instances[2]);
    });
  });

  // ==========================================================================
  // Adapter Model Listing
  // ==========================================================================
  describe("Adapter Model Listing", () => {
    it("lists all adapter models", () => {
      const adapter = getIPAdapter();
      const models = adapter.listAdapterModels();

      expect(models).toContain("ip-adapter-plus");
      expect(models).toContain("ip-adapter-plus-face");
      expect(models).toContain("ip-adapter-full-face");
      expect(models).toContain("ip-adapter-faceid");
      expect(models).toContain("ip-adapter-faceid-plus");
      expect(models).toContain("ip-adapter-style");
      expect(models).toContain("ip-adapter-composition");
    });

    it("lists exactly 7 adapter models", () => {
      const adapter = getIPAdapter();
      const models = adapter.listAdapterModels();
      expect(models).toHaveLength(7);
    });
  });

  // ==========================================================================
  // Recommended Settings
  // ==========================================================================
  describe("Recommended Settings", () => {
    it("returns settings for ip-adapter-plus", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-plus");

      expect(settings.defaultStrength).toBe(0.7);
      expect(settings.recommendedCfg).toBe(7);
      expect(settings.notes).toBeDefined();
      expect(settings.notes).toContain("all-around");
    });

    it("returns settings for ip-adapter-plus-face", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-plus-face");

      expect(settings.defaultStrength).toBe(0.8);
      expect(settings.recommendedCfg).toBe(7);
      expect(settings.notes).toContain("portrait");
    });

    it("returns settings for ip-adapter-full-face", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-full-face");

      expect(settings.defaultStrength).toBe(0.85);
      expect(settings.recommendedCfg).toBe(6);
      expect(settings.notes).toContain("pose flexibility");
    });

    it("returns settings for ip-adapter-faceid", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-faceid");

      expect(settings.defaultStrength).toBe(0.9);
      expect(settings.recommendedCfg).toBe(5);
      expect(settings.notes).toContain("FaceID");
    });

    it("returns settings for ip-adapter-faceid-plus", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-faceid-plus");

      expect(settings.defaultStrength).toBe(0.85);
      expect(settings.recommendedCfg).toBe(6);
    });

    it("returns settings for ip-adapter-style", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-style");

      expect(settings.defaultStrength).toBe(0.6);
      expect(settings.recommendedCfg).toBe(7);
      expect(settings.notes).toContain("style");
    });

    it("returns settings for ip-adapter-composition", () => {
      const adapter = getIPAdapter();
      const settings = adapter.getRecommendedSettings("ip-adapter-composition");

      expect(settings.defaultStrength).toBe(0.5);
      expect(settings.recommendedCfg).toBe(7);
      expect(settings.notes).toContain("layout");
    });
  });

  // ==========================================================================
  // Identity Extraction
  // ==========================================================================
  describe("Identity Extraction", () => {
    it("extracts identity successfully with single image", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
      });

      expect(result.success).toBe(true);
      expect(result.embedding).toBeDefined();
      expect(result.embedding?.sourceImages).toHaveLength(1);
    });

    it("extracts identity with multiple images", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/ref1.png", "/path/to/ref2.png", "/path/to/ref3.png"],
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.sourceImages).toHaveLength(3);
    });

    it("fails with no source images", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one source image");
    });

    it("uses default adapter model when not specified", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
      });

      expect(result.embedding?.adapterModel).toBe("ip-adapter-plus-face");
    });

    it("uses specified adapter model", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
        adapterModel: "ip-adapter-style",
      });

      expect(result.embedding?.adapterModel).toBe("ip-adapter-style");
    });

    it("includes name in embedding", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
        name: "My Character",
      });

      expect(result.embedding?.name).toBe("My Character");
    });

    it("includes description in embedding", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
        description: "Main protagonist with blue eyes",
      });

      expect(result.embedding?.description).toBe("Main protagonist with blue eyes");
    });

    it("generates unique embedding ID", async () => {
      const adapter = getIPAdapter();
      const result1 = await adapter.extractIdentity({
        sourceImages: ["/path/to/ref1.png"],
      });
      const result2 = await adapter.extractIdentity({
        sourceImages: ["/path/to/ref2.png"],
      });

      expect(result1.embedding?.id).not.toBe(result2.embedding?.id);
    });

    it("sets createdAt timestamp", async () => {
      const adapter = getIPAdapter();
      const before = new Date();
      const result = await adapter.extractIdentity({
        sourceImages: ["/path/to/reference.png"],
      });
      const after = new Date();

      expect(result.embedding?.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result.embedding?.createdAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  // ==========================================================================
  // Generate With Identity Validation
  // ==========================================================================
  describe("Generate With Identity Validation", () => {
    it("fails with no reference images", async () => {
      const adapter = getIPAdapter();
      const request: IPAdapterRequest = {
        prompt: "test prompt",
        referenceImages: [],
        outputPath: "/output/test.png",
      };

      const result = await adapter.generateWithIdentity(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one reference image");
    });
  });

  // ==========================================================================
  // Request Structure
  // ==========================================================================
  describe("Request Structure", () => {
    it("supports all request parameters", () => {
      const request: IPAdapterRequest = {
        prompt: "1girl, standing",
        negativePrompt: "blurry, bad quality",
        referenceImages: ["/ref1.png", "/ref2.png"],
        strength: 0.9,
        adapterModel: "ip-adapter-faceid",
        width: 1024,
        height: 1024,
        steps: 35,
        cfgScale: 6,
        sampler: "dpmpp_2m_sde",
        scheduler: "karras",
        model: "sdxl_base.safetensors",
        loras: [{ name: "style_lora.safetensors", strengthModel: 0.7 }],
        seed: 12345,
        outputPath: "/output/result.png",
      };

      expect(request.prompt).toBeDefined();
      expect(request.referenceImages).toHaveLength(2);
      expect(request.strength).toBe(0.9);
    });

    it("allows partial request with defaults", () => {
      const request: IPAdapterRequest = {
        prompt: "minimal request",
        referenceImages: ["/ref.png"],
        outputPath: "/output/result.png",
      };

      expect(request.strength).toBeUndefined();
      expect(request.width).toBeUndefined();
      // Defaults applied during generation
    });
  });

  // ==========================================================================
  // Apply Options
  // ==========================================================================
  describe("Apply Options", () => {
    it("supports strength in apply options", async () => {
      const adapter = getIPAdapter();
      const embeddingResult = await adapter.extractIdentity({
        sourceImages: ["/ref.png"],
      });

      const applyOptions: IPAdapterApplyOptions = {
        embedding: embeddingResult.embedding!,
        strength: 0.95,
      };

      expect(applyOptions.strength).toBe(0.95);
    });

    it("supports startAt and endAt in apply options", async () => {
      const adapter = getIPAdapter();
      const embeddingResult = await adapter.extractIdentity({
        sourceImages: ["/ref.png"],
      });

      const applyOptions: IPAdapterApplyOptions = {
        embedding: embeddingResult.embedding!,
        startAt: 0.1,
        endAt: 0.9,
      };

      expect(applyOptions.startAt).toBe(0.1);
      expect(applyOptions.endAt).toBe(0.9);
    });
  });

  // ==========================================================================
  // Strength Recommendations Per Model
  // ==========================================================================
  describe("Strength Recommendations Per Model", () => {
    it("face-focused models have higher default strength", () => {
      const adapter = getIPAdapter();

      const plusFace = adapter.getRecommendedSettings("ip-adapter-plus-face");
      const plus = adapter.getRecommendedSettings("ip-adapter-plus");

      expect(plusFace.defaultStrength).toBeGreaterThan(plus.defaultStrength);
    });

    it("style model has lower default strength", () => {
      const adapter = getIPAdapter();

      const style = adapter.getRecommendedSettings("ip-adapter-style");
      const plus = adapter.getRecommendedSettings("ip-adapter-plus");

      expect(style.defaultStrength).toBeLessThan(plus.defaultStrength);
    });

    it("composition model has lowest default strength", () => {
      const adapter = getIPAdapter();

      const composition = adapter.getRecommendedSettings("ip-adapter-composition");
      const allSettings = adapter
        .listAdapterModels()
        .map((m) => adapter.getRecommendedSettings(m));

      const minStrength = Math.min(...allSettings.map((s) => s.defaultStrength));
      expect(composition.defaultStrength).toBe(minStrength);
    });

    it("faceid has highest default strength", () => {
      const adapter = getIPAdapter();

      const faceid = adapter.getRecommendedSettings("ip-adapter-faceid");
      const allSettings = adapter
        .listAdapterModels()
        .map((m) => adapter.getRecommendedSettings(m));

      const maxStrength = Math.max(...allSettings.map((s) => s.defaultStrength));
      expect(faceid.defaultStrength).toBe(maxStrength);
    });
  });

  // ==========================================================================
  // CFG Recommendations Per Model
  // ==========================================================================
  describe("CFG Recommendations Per Model", () => {
    it("faceid models use lower CFG", () => {
      const adapter = getIPAdapter();

      const faceid = adapter.getRecommendedSettings("ip-adapter-faceid");
      const plus = adapter.getRecommendedSettings("ip-adapter-plus");

      expect(faceid.recommendedCfg).toBeLessThan(plus.recommendedCfg);
    });

    it("style model uses standard CFG", () => {
      const adapter = getIPAdapter();

      const style = adapter.getRecommendedSettings("ip-adapter-style");
      expect(style.recommendedCfg).toBe(7);
    });

    it("full-face uses moderate CFG", () => {
      const adapter = getIPAdapter();

      const fullFace = adapter.getRecommendedSettings("ip-adapter-full-face");
      expect(fullFace.recommendedCfg).toBe(6);
    });
  });

  // ==========================================================================
  // Model Notes Content
  // ==========================================================================
  describe("Model Notes Content", () => {
    it("all models have descriptive notes", () => {
      const adapter = getIPAdapter();
      const models = adapter.listAdapterModels();

      for (const model of models) {
        const settings = adapter.getRecommendedSettings(model);
        expect(settings.notes.length).toBeGreaterThan(20);
      }
    });

    it("face models mention face in notes", () => {
      const adapter = getIPAdapter();
      const faceModels: IPAdapterModel[] = [
        "ip-adapter-plus-face",
        "ip-adapter-full-face",
        "ip-adapter-faceid",
        "ip-adapter-faceid-plus",
      ];

      for (const model of faceModels) {
        const settings = adapter.getRecommendedSettings(model);
        expect(settings.notes.toLowerCase()).toContain("face");
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    it("handles very long file paths in source images", async () => {
      const adapter = getIPAdapter();
      const longPath = "/very/long/nested/directory/structure/".repeat(10) + "image.png";

      const result = await adapter.extractIdentity({
        sourceImages: [longPath],
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.sourceImages[0]).toBe(longPath);
    });

    it("handles unicode characters in paths", async () => {
      const adapter = getIPAdapter();
      const unicodePath = "/images/\u65e5\u672c\u8a9e/\ud83c\udf1f/reference.png";

      const result = await adapter.extractIdentity({
        sourceImages: [unicodePath],
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.sourceImages[0]).toBe(unicodePath);
    });

    it("handles many source images", async () => {
      const adapter = getIPAdapter();
      const manyImages = Array.from({ length: 50 }, (_, i) => `/ref/image_${i}.png`);

      const result = await adapter.extractIdentity({
        sourceImages: manyImages,
      });

      expect(result.success).toBe(true);
      expect(result.embedding?.sourceImages).toHaveLength(50);
    });

    it("preserves image order in embedding", async () => {
      const adapter = getIPAdapter();
      const images = ["/first.png", "/second.png", "/third.png"];

      const result = await adapter.extractIdentity({
        sourceImages: images,
      });

      expect(result.embedding?.sourceImages[0]).toBe("/first.png");
      expect(result.embedding?.sourceImages[1]).toBe("/second.png");
      expect(result.embedding?.sourceImages[2]).toBe("/third.png");
    });
  });

  // ==========================================================================
  // Embedding Structure
  // ==========================================================================
  describe("Embedding Structure", () => {
    it("embedding has all required fields", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/ref.png"],
        name: "Test",
        description: "Test description",
      });

      const embedding = result.embedding!;
      expect(embedding.id).toBeDefined();
      expect(embedding.sourceImages).toBeDefined();
      expect(embedding.adapterModel).toBeDefined();
      expect(embedding.createdAt).toBeDefined();
      expect(embedding.name).toBeDefined();
      expect(embedding.description).toBeDefined();
    });

    it("embedding ID starts with identity prefix", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/ref.png"],
      });

      expect(result.embedding?.id.startsWith("identity_")).toBe(true);
    });

    it("embedding ID contains timestamp component", async () => {
      const adapter = getIPAdapter();
      const result = await adapter.extractIdentity({
        sourceImages: ["/ref.png"],
      });

      const id = result.embedding?.id ?? "";
      const parts = id.split("_");
      // Should be identity_<timestamp>_<random>
      expect(parts.length).toBe(3);
    });
  });
});
