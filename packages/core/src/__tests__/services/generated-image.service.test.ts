/**
 * GeneratedImageService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, selection/favorite,
 * rating, filtering, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
} from "../setup.js";
import {
  getGeneratedImageService,
  type GeneratedImageService,
} from "../../services/index.js";

describe("GeneratedImageService", () => {
  let service: GeneratedImageService;
  let projectId: string;
  let storyboardId: string;
  let panelId: string;

  // Default valid image data
  const validImageData = {
    localPath: "/output/test-image.png",
    seed: 12345,
    prompt: "masterpiece, best quality, test image",
    negativePrompt: "bad quality, blurry",
    model: "test-model.safetensors",
    steps: 28,
    cfg: 7,
    sampler: "euler",
    scheduler: "normal",
    width: 512,
    height: 768,
  };

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getGeneratedImageService();

    // Create test hierarchy
    const project = await createTestProject("Image Test Project");
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;

    const panel = await createTestPanel(storyboardId);
    panelId = panel.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a generated image with required fields", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
      });

      expect(image).toBeDefined();
      expect(image.id).toBeDefined();
      expect(image.panelId).toBe(panelId);
      expect(image.localPath).toBe("/output/test-image.png");
      expect(image.seed).toBe(12345);
      expect(image.prompt).toBe("masterpiece, best quality, test image");
      expect(image.model).toBe("test-model.safetensors");
      expect(image.steps).toBe(28);
      expect(image.cfg).toBe(7);
      expect(image.sampler).toBe("euler");
      expect(image.width).toBe(512);
      expect(image.height).toBe(768);
      expect(image.isSelected).toBe(false);
      expect(image.isFavorite).toBe(false);
      expect(image.createdAt).toBeInstanceOf(Date);
    });

    it("creates a generated image with cloud URL", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        cloudUrl: "https://storage.example.com/images/test.png",
      });

      expect(image.cloudUrl).toBe("https://storage.example.com/images/test.png");
    });

    it("creates a generated image with thumbnail path", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        thumbnailPath: "/output/thumbnails/test-thumb.png",
      });

      expect(image.thumbnailPath).toBe("/output/thumbnails/test-thumb.png");
    });

    it("creates a generated image with LoRAs", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        loras: [
          { name: "style-lora.safetensors", strength: 0.8 },
          { name: "character-lora.safetensors", strength: 0.6, strengthClip: 0.5 },
        ],
      });

      expect(image.loras).toHaveLength(2);
      expect(image.loras[0].name).toBe("style-lora.safetensors");
      expect(image.loras[0].strength).toBe(0.8);
      expect(image.loras[1].strengthClip).toBe(0.5);
    });

    it("creates a generated image with variant info", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        variantStrategy: "seed",
        variantIndex: 3,
      });

      expect(image.variantStrategy).toBe("seed");
      expect(image.variantIndex).toBe(3);
    });

    it("creates a generated image with IP-Adapter info", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        usedIPAdapter: true,
        ipAdapterImages: ["/refs/ref1.png", "/refs/ref2.png"],
      });

      expect(image.usedIPAdapter).toBe(true);
      expect(image.ipAdapterImages).toHaveLength(2);
    });

    it("creates a generated image with ControlNet info", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        usedControlNet: true,
        controlNetType: "openpose",
        controlNetImage: "/controls/pose.png",
      });

      expect(image.usedControlNet).toBe(true);
      expect(image.controlNetType).toBe("openpose");
      expect(image.controlNetImage).toBe("/controls/pose.png");
    });

    it("creates a generated image with rating", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        rating: 4,
      });

      expect(image.rating).toBe(4);
    });

    it("throws on non-existent panel", async () => {
      await expect(
        service.create({
          panelId: "nonexistent-id",
          ...validImageData,
        })
      ).rejects.toThrow("Panel not found: nonexistent-id");
    });

    it("throws on missing local path", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          localPath: "",
        })
      ).rejects.toThrow("Local path is required");
    });

    it("throws on missing prompt", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          prompt: "",
        })
      ).rejects.toThrow("Prompt is required");
    });

    it("throws on missing model", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          model: "",
        })
      ).rejects.toThrow("Model is required");
    });

    it("throws on steps below 1", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          steps: 0,
        })
      ).rejects.toThrow("Steps must be between 1 and 150");
    });

    it("throws on steps above 150", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          steps: 200,
        })
      ).rejects.toThrow("Steps must be between 1 and 150");
    });

    it("throws on cfg below 1", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          cfg: 0,
        })
      ).rejects.toThrow("CFG must be between 1 and 30");
    });

    it("throws on cfg above 30", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          cfg: 35,
        })
      ).rejects.toThrow("CFG must be between 1 and 30");
    });

    it("throws on width below 256", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          width: 128,
        })
      ).rejects.toThrow("Width must be between 256 and 4096");
    });

    it("throws on height below 256", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          height: 128,
        })
      ).rejects.toThrow("Height must be between 256 and 4096");
    });

    it("throws on rating below 1", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          rating: 0,
        })
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws on rating above 5", async () => {
      await expect(
        service.create({
          panelId,
          ...validImageData,
          rating: 6,
        })
      ).rejects.toThrow("Rating must be between 1 and 5");
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns generated image when exists", async () => {
      const created = await service.create({
        panelId,
        ...validImageData,
      });

      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.prompt).toBe(validImageData.prompt);
    });

    it("returns null when not found", async () => {
      const found = await service.getById("nonexistent-id");
      expect(found).toBeNull();
    });

    it("returns null for empty id", async () => {
      const found = await service.getById("");
      expect(found).toBeNull();
    });
  });

  // ============================================================================
  // GET BY PANEL TESTS
  // ============================================================================

  describe("getByPanel", () => {
    it("returns empty array when no images", async () => {
      const images = await service.getByPanel(panelId);
      expect(images).toEqual([]);
    });

    it("returns all images for panel", async () => {
      await service.create({ panelId, ...validImageData });
      await service.create({ panelId, ...validImageData, seed: 12346 });
      await service.create({ panelId, ...validImageData, seed: 12347 });

      const images = await service.getByPanel(panelId);
      expect(images).toHaveLength(3);
    });

    it("orders images by createdAt", async () => {
      const i1 = await service.create({ panelId, ...validImageData });
      const i2 = await service.create({ panelId, ...validImageData, seed: 12346 });

      const images = await service.getByPanel(panelId);
      expect(images[0].id).toBe(i1.id);
      expect(images[1].id).toBe(i2.id);
    });

    it("only returns images for specified panel", async () => {
      const panel2 = await createTestPanel(storyboardId);

      await service.create({ panelId, ...validImageData });
      await service.create({ panelId: panel2.id, ...validImageData, seed: 99999 });

      const images = await service.getByPanel(panelId);
      expect(images).toHaveLength(1);
      expect(images[0].seed).toBe(12345);
    });
  });

  // ============================================================================
  // GET BY SEED TESTS
  // ============================================================================

  describe("getBySeed", () => {
    it("returns images matching seed", async () => {
      await service.create({ panelId, ...validImageData, seed: 11111 });
      await service.create({ panelId, ...validImageData, seed: 22222 });
      await service.create({ panelId, ...validImageData, seed: 11111 });

      const images = await service.findBySeed(11111);
      expect(images).toHaveLength(2);
      expect(images.every((i) => i.seed === 11111)).toBe(true);
    });

    it("returns empty array when no matching seed", async () => {
      await service.create({ panelId, ...validImageData });

      const images = await service.findBySeed(99999);
      expect(images).toEqual([]);
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates cloud URL", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const updated = await service.update(created.id, {
        cloudUrl: "https://new-url.com/image.png",
      });

      expect(updated.cloudUrl).toBe("https://new-url.com/image.png");
    });

    it("updates thumbnail path", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const updated = await service.update(created.id, {
        thumbnailPath: "/new-thumb.png",
      });

      expect(updated.thumbnailPath).toBe("/new-thumb.png");
    });

    it("updates isSelected", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const updated = await service.update(created.id, { isSelected: true });

      expect(updated.isSelected).toBe(true);
    });

    it("updates isFavorite", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const updated = await service.update(created.id, { isFavorite: true });

      expect(updated.isFavorite).toBe(true);
    });

    it("updates rating", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const updated = await service.update(created.id, { rating: 5 });

      expect(updated.rating).toBe(5);
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const originalUpdatedAt = created.updatedAt;

      // Wait for a full second to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { isFavorite: true });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("throws on non-existent image", async () => {
      await expect(
        service.update("nonexistent-id", { isFavorite: true })
      ).rejects.toThrow("Generated image not found: nonexistent-id");
    });

    it("validates rating on update", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await expect(service.update(created.id, { rating: 10 })).rejects.toThrow(
        "Rating must be between 1 and 5"
      );
    });
  });

  // ============================================================================
  // SELECT/DESELECT TESTS
  // ============================================================================

  describe("select", () => {
    it("selects an image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const selected = await service.select(created.id);

      expect(selected.isSelected).toBe(true);
    });

    it("deselects other images in same panel", async () => {
      const i1 = await service.create({ panelId, ...validImageData });
      const i2 = await service.create({ panelId, ...validImageData, seed: 99999 });

      await service.select(i1.id);
      await service.select(i2.id);

      const refreshed1 = await service.getById(i1.id);
      const refreshed2 = await service.getById(i2.id);

      expect(refreshed1?.isSelected).toBe(false);
      expect(refreshed2?.isSelected).toBe(true);
    });

    it("throws on non-existent image", async () => {
      await expect(service.select("nonexistent-id")).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  describe("deselect", () => {
    it("deselects an image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await service.select(created.id);
      const deselected = await service.deselect(created.id);

      expect(deselected.isSelected).toBe(false);
    });

    it("throws on non-existent image", async () => {
      await expect(service.deselect("nonexistent-id")).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  // ============================================================================
  // FAVORITE TESTS
  // ============================================================================

  describe("favorite", () => {
    it("favorites an image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const favorited = await service.favorite(created.id);

      expect(favorited.isFavorite).toBe(true);
    });

    it("throws on non-existent image", async () => {
      await expect(service.favorite("nonexistent-id")).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  describe("unfavorite", () => {
    it("unfavorites an image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await service.favorite(created.id);
      const unfavorited = await service.unfavorite(created.id);

      expect(unfavorited.isFavorite).toBe(false);
    });

    it("throws on non-existent image", async () => {
      await expect(service.unfavorite("nonexistent-id")).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  // ============================================================================
  // RATE TESTS
  // ============================================================================

  describe("rate", () => {
    it("rates an image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const rated = await service.rate(created.id, 4);

      expect(rated.rating).toBe(4);
    });

    it("updates existing rating", async () => {
      const created = await service.create({ panelId, ...validImageData, rating: 3 });
      const rated = await service.rate(created.id, 5);

      expect(rated.rating).toBe(5);
    });

    it("throws on rating below 1", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await expect(service.rate(created.id, 0)).rejects.toThrow(
        "Rating must be between 1 and 5"
      );
    });

    it("throws on rating above 5", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await expect(service.rate(created.id, 6)).rejects.toThrow(
        "Rating must be between 1 and 5"
      );
    });

    it("throws on non-existent image", async () => {
      await expect(service.rate("nonexistent-id", 5)).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  describe("clearRating", () => {
    it("clears the rating", async () => {
      const created = await service.create({ panelId, ...validImageData, rating: 4 });
      const cleared = await service.clearRating(created.id);

      expect(cleared.rating).toBeNull();
    });

    it("throws on non-existent image", async () => {
      await expect(service.clearRating("nonexistent-id")).rejects.toThrow(
        "Generated image not found"
      );
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing image", async () => {
      const created = await service.create({ panelId, ...validImageData });
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent image", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Generated image not found: nonexistent-id"
      );
    });

    it("removes image from panel list after deletion", async () => {
      const i1 = await service.create({ panelId, ...validImageData });
      const i2 = await service.create({ panelId, ...validImageData, seed: 99999 });

      await service.delete(i2.id);

      const images = await service.getByPanel(panelId);
      expect(images).toHaveLength(1);
      expect(images[0].id).toBe(i1.id);
    });
  });

  // ============================================================================
  // GET FAVORITES TESTS
  // ============================================================================

  describe("getFavorites", () => {
    it("returns empty array when no favorites", async () => {
      await service.create({ panelId, ...validImageData });

      const favorites = await service.getFavorites(panelId);
      expect(favorites).toEqual([]);
    });

    it("returns only favorited images", async () => {
      const i1 = await service.create({ panelId, ...validImageData });
      await service.create({ panelId, ...validImageData, seed: 99999 });
      await service.favorite(i1.id);

      const favorites = await service.getFavorites(panelId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(i1.id);
    });
  });

  // ============================================================================
  // GET SELECTED TESTS
  // ============================================================================

  describe("getSelected", () => {
    it("returns null when no selection", async () => {
      await service.create({ panelId, ...validImageData });

      const selected = await service.getSelected(panelId);
      expect(selected).toBeNull();
    });

    it("returns selected image", async () => {
      const i1 = await service.create({ panelId, ...validImageData });
      await service.select(i1.id);

      const selected = await service.getSelected(panelId);
      expect(selected?.id).toBe(i1.id);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles long prompt", async () => {
      const longPrompt = "a".repeat(5000);
      const image = await service.create({
        panelId,
        ...validImageData,
        prompt: longPrompt,
      });

      expect(image.prompt).toBe(longPrompt);
    });

    it("handles special characters in prompt", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        prompt: 'Test with <special> & "chars"',
      });

      expect(image.prompt).toContain("<special>");
    });

    it("handles many LoRAs", async () => {
      const loras = Array.from({ length: 10 }, (_, i) => ({
        name: `lora-${i}.safetensors`,
        strength: 0.5 + i * 0.05,
      }));

      const image = await service.create({
        panelId,
        ...validImageData,
        loras,
      });

      expect(image.loras).toHaveLength(10);
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({ panelId, ...validImageData });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await service.update(created.id, { isFavorite: true });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("handles concurrent creates", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.create({
          panelId,
          ...validImageData,
          seed: 10000 + i,
        })
      );

      const images = await Promise.all(promises);
      expect(images).toHaveLength(10);

      const ids = new Set(images.map((i) => i.id));
      expect(ids.size).toBe(10);
    });

    it("handles boundary dimension values", async () => {
      const minImage = await service.create({
        panelId,
        ...validImageData,
        width: 256,
        height: 256,
      });
      expect(minImage.width).toBe(256);
      expect(minImage.height).toBe(256);

      const maxImage = await service.create({
        panelId,
        ...validImageData,
        seed: 99998,
        width: 4096,
        height: 4096,
      });
      expect(maxImage.width).toBe(4096);
      expect(maxImage.height).toBe(4096);
    });

    it("handles boundary cfg values", async () => {
      const minCfg = await service.create({
        panelId,
        ...validImageData,
        cfg: 1,
      });
      expect(minCfg.cfg).toBe(1);

      const maxCfg = await service.create({
        panelId,
        ...validImageData,
        seed: 99997,
        cfg: 30,
      });
      expect(maxCfg.cfg).toBe(30);
    });

    it("handles decimal cfg values", async () => {
      const image = await service.create({
        panelId,
        ...validImageData,
        cfg: 7.5,
      });
      expect(image.cfg).toBe(7.5);
    });
  });
});
