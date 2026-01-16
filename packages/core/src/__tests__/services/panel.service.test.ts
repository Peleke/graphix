/**
 * PanelService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, character assignment,
 * output selection, reordering, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestCharacter,
  createTestStoryboard,
} from "../setup.js";
import {
  getPanelService,
  getGeneratedImageService,
  type PanelService,
} from "../../services/index.js";

describe("PanelService", () => {
  let service: PanelService;
  let projectId: string;
  let storyboardId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getPanelService();

    // Create project and storyboard for panels
    const project = await createTestProject("Panel Test Project");
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a panel with required fields", async () => {
      const panel = await service.create({ storyboardId });

      expect(panel).toBeDefined();
      expect(panel.id).toBeDefined();
      expect(panel.storyboardId).toBe(storyboardId);
      expect(panel.position).toBe(1);
      expect(panel.description).toBe("");
      expect(panel.direction).toBeNull();
      expect(panel.characterIds).toEqual([]);
      expect(panel.selectedOutputId).toBeNull();
      expect(panel.createdAt).toBeInstanceOf(Date);
    });

    it("creates a panel with description", async () => {
      const panel = await service.create({
        storyboardId,
        description: "A dramatic scene",
      });

      expect(panel.description).toBe("A dramatic scene");
    });

    it("creates a panel with direction", async () => {
      const panel = await service.create({
        storyboardId,
        direction: {
          cameraAngle: "low angle",
          mood: "dramatic",
          lighting: "golden hour",
        },
      });

      expect(panel.direction).toBeDefined();
      expect(panel.direction?.cameraAngle).toBe("low angle");
      expect(panel.direction?.mood).toBe("dramatic");
      expect(panel.direction?.lighting).toBe("golden hour");
    });

    it("auto-assigns position at end", async () => {
      const p1 = await service.create({ storyboardId });
      const p2 = await service.create({ storyboardId });
      const p3 = await service.create({ storyboardId });

      expect(p1.position).toBe(1);
      expect(p2.position).toBe(2);
      expect(p3.position).toBe(3);
    });

    it("creates a panel at specific position", async () => {
      await service.create({ storyboardId }); // position 1
      await service.create({ storyboardId }); // position 2

      const inserted = await service.create({ storyboardId, position: 2 });

      expect(inserted.position).toBe(2);

      // Other panels should shift
      const panels = await service.getByStoryboard(storyboardId);
      expect(panels[0].position).toBe(1);
      expect(panels[1].position).toBe(2);
      expect(panels[2].position).toBe(3);
    });

    it("creates a panel with character IDs", async () => {
      const char = await createTestCharacter(projectId, "Test Character");
      const panel = await service.create({
        storyboardId,
        characterIds: [char.id],
      });

      expect(panel.characterIds).toContain(char.id);
    });

    it("trims whitespace from description", async () => {
      const panel = await service.create({
        storyboardId,
        description: "  Trimmed  ",
      });

      expect(panel.description).toBe("Trimmed");
    });

    it("throws on non-existent storyboard", async () => {
      await expect(
        service.create({ storyboardId: "nonexistent-id" })
      ).rejects.toThrow("Storyboard not found: nonexistent-id");
    });

    it("throws on description exceeding 5000 characters", async () => {
      const longDesc = "a".repeat(5001);
      await expect(
        service.create({ storyboardId, description: longDesc })
      ).rejects.toThrow("Panel description must be 5000 characters or less");
    });

    it("throws on invalid camera angle", async () => {
      await expect(
        service.create({
          storyboardId,
          direction: { cameraAngle: "invalid-angle" },
        })
      ).rejects.toThrow("Invalid camera angle");
    });

    it("throws on invalid mood", async () => {
      await expect(
        service.create({
          storyboardId,
          direction: { mood: "invalid-mood" },
        })
      ).rejects.toThrow("Invalid mood");
    });

    it("throws on invalid lighting", async () => {
      await expect(
        service.create({
          storyboardId,
          direction: { lighting: "invalid-lighting" },
        })
      ).rejects.toThrow("Invalid lighting");
    });

    it("accepts all valid camera angles", async () => {
      const angles = [
        "eye level", "low angle", "high angle", "dutch angle", "bird's eye",
        "worm's eye", "close-up", "medium shot", "wide shot", "extreme close-up",
      ];

      for (const angle of angles) {
        const panel = await service.create({
          storyboardId,
          direction: { cameraAngle: angle },
        });
        expect(panel.direction?.cameraAngle).toBe(angle);
      }
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns panel when exists", async () => {
      const created = await service.create({ storyboardId, description: "Find Me" });
      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.description).toBe("Find Me");
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
  // GET BY STORYBOARD TESTS
  // ============================================================================

  describe("getByStoryboard", () => {
    it("returns empty array when no panels", async () => {
      const panels = await service.getByStoryboard(storyboardId);
      expect(panels).toEqual([]);
    });

    it("returns all panels for storyboard", async () => {
      await service.create({ storyboardId });
      await service.create({ storyboardId });
      await service.create({ storyboardId });

      const panels = await service.getByStoryboard(storyboardId);
      expect(panels).toHaveLength(3);
    });

    it("orders panels by position", async () => {
      await service.create({ storyboardId }); // 1
      await service.create({ storyboardId }); // 2
      await service.create({ storyboardId }); // 3

      const panels = await service.getByStoryboard(storyboardId);
      expect(panels[0].position).toBe(1);
      expect(panels[1].position).toBe(2);
      expect(panels[2].position).toBe(3);
    });
  });

  // ============================================================================
  // DESCRIBE (UPDATE) TESTS
  // ============================================================================

  describe("describe", () => {
    it("updates panel description", async () => {
      const created = await service.create({ storyboardId });
      const updated = await service.describe(created.id, {
        description: "Updated description",
      });

      expect(updated.description).toBe("Updated description");
    });

    it("updates panel direction", async () => {
      const created = await service.create({ storyboardId });
      const updated = await service.describe(created.id, {
        direction: { cameraAngle: "dutch angle", mood: "tense", lighting: "harsh" },
      });

      expect(updated.direction?.cameraAngle).toBe("dutch angle");
      expect(updated.direction?.mood).toBe("tense");
      expect(updated.direction?.lighting).toBe("harsh");
    });

    it("merges direction on update", async () => {
      const created = await service.create({
        storyboardId,
        direction: { cameraAngle: "eye level", mood: "neutral", lighting: "natural" },
      });
      const updated = await service.describe(created.id, {
        direction: { mood: "dramatic" },
      });

      expect(updated.direction?.cameraAngle).toBe("eye level");
      expect(updated.direction?.mood).toBe("dramatic");
      expect(updated.direction?.lighting).toBe("natural");
    });

    it("throws on non-existent panel", async () => {
      await expect(
        service.describe("nonexistent-id", { description: "New" })
      ).rejects.toThrow("Panel not found: nonexistent-id");
    });

    it("throws on description exceeding limit", async () => {
      const created = await service.create({ storyboardId });
      const longDesc = "a".repeat(5001);
      await expect(
        service.describe(created.id, { description: longDesc })
      ).rejects.toThrow("Panel description must be 5000 characters or less");
    });
  });

  // ============================================================================
  // CHARACTER MANAGEMENT TESTS
  // ============================================================================

  describe("addCharacter", () => {
    it("adds a character to panel", async () => {
      const char = await createTestCharacter(projectId, "Test Char");
      const panel = await service.create({ storyboardId });

      const updated = await service.addCharacter(panel.id, char.id);

      expect(updated.characterIds).toContain(char.id);
    });

    it("does not duplicate character", async () => {
      const char = await createTestCharacter(projectId, "Test Char");
      const panel = await service.create({ storyboardId, characterIds: [char.id] });

      const updated = await service.addCharacter(panel.id, char.id);

      expect(updated.characterIds).toHaveLength(1);
    });

    it("throws on non-existent panel", async () => {
      const char = await createTestCharacter(projectId, "Test Char");
      await expect(service.addCharacter("nonexistent-id", char.id)).rejects.toThrow(
        "Panel not found"
      );
    });

    it("throws on non-existent character", async () => {
      const panel = await service.create({ storyboardId });
      await expect(service.addCharacter(panel.id, "nonexistent-char")).rejects.toThrow(
        "Character not found"
      );
    });
  });

  describe("removeCharacter", () => {
    it("removes a character from panel", async () => {
      const char1 = await createTestCharacter(projectId, "Char 1");
      const char2 = await createTestCharacter(projectId, "Char 2");
      const panel = await service.create({
        storyboardId,
        characterIds: [char1.id, char2.id],
      });

      const updated = await service.removeCharacter(panel.id, char1.id);

      expect(updated.characterIds).not.toContain(char1.id);
      expect(updated.characterIds).toContain(char2.id);
    });

    it("handles removing non-existent character gracefully", async () => {
      const panel = await service.create({ storyboardId });
      const updated = await service.removeCharacter(panel.id, "nonexistent-char");

      expect(updated.characterIds).toEqual([]);
    });
  });

  describe("setCharacters", () => {
    it("sets characters for panel", async () => {
      const char1 = await createTestCharacter(projectId, "Char 1");
      const char2 = await createTestCharacter(projectId, "Char 2");
      const panel = await service.create({ storyboardId });

      const updated = await service.setCharacters(panel.id, [char1.id, char2.id]);

      expect(updated.characterIds).toContain(char1.id);
      expect(updated.characterIds).toContain(char2.id);
    });

    it("replaces existing characters", async () => {
      const char1 = await createTestCharacter(projectId, "Char 1");
      const char2 = await createTestCharacter(projectId, "Char 2");
      const panel = await service.create({
        storyboardId,
        characterIds: [char1.id],
      });

      const updated = await service.setCharacters(panel.id, [char2.id]);

      expect(updated.characterIds).not.toContain(char1.id);
      expect(updated.characterIds).toContain(char2.id);
    });

    it("throws on non-existent character in list", async () => {
      const char = await createTestCharacter(projectId, "Char 1");
      const panel = await service.create({ storyboardId });

      await expect(
        service.setCharacters(panel.id, [char.id, "nonexistent-char"])
      ).rejects.toThrow("Character not found");
    });
  });

  // ============================================================================
  // OUTPUT SELECTION TESTS
  // ============================================================================

  describe("selectOutput", () => {
    it("selects an output", async () => {
      const panel = await service.create({ storyboardId });
      const imageService = getGeneratedImageService();

      const image = await imageService.create({
        panelId: panel.id,
        localPath: "/output/image.png",
        seed: 12345,
        prompt: "test prompt",
        model: "test-model.safetensors",
        steps: 20,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      const updated = await service.selectOutput(panel.id, image.id);

      expect(updated.selectedOutputId).toBe(image.id);
    });

    it("throws on non-existent panel", async () => {
      await expect(service.selectOutput("nonexistent-id", "image-id")).rejects.toThrow(
        "Panel not found"
      );
    });

    it("throws on non-existent generation", async () => {
      const panel = await service.create({ storyboardId });
      await expect(service.selectOutput(panel.id, "nonexistent-image")).rejects.toThrow(
        "Generation not found"
      );
    });
  });

  describe("clearSelection", () => {
    it("clears output selection", async () => {
      const panel = await service.create({ storyboardId });
      const imageService = getGeneratedImageService();

      const image = await imageService.create({
        panelId: panel.id,
        localPath: "/output/image.png",
        seed: 12345,
        prompt: "test prompt",
        model: "test-model.safetensors",
        steps: 20,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      await service.selectOutput(panel.id, image.id);
      const updated = await service.clearSelection(panel.id);

      expect(updated.selectedOutputId).toBeNull();
    });

    it("throws on non-existent panel", async () => {
      await expect(service.clearSelection("nonexistent-id")).rejects.toThrow(
        "Panel not found"
      );
    });
  });

  // ============================================================================
  // REORDER TESTS
  // ============================================================================

  describe("reorder", () => {
    it("moves panel to later position", async () => {
      await service.create({ storyboardId }); // 1
      await service.create({ storyboardId }); // 2
      const p3 = await service.create({ storyboardId }); // 3

      await service.reorder(p3.id, 1);

      const panels = await service.getByStoryboard(storyboardId);
      expect(panels.find((p) => p.id === p3.id)?.position).toBe(1);
    });

    it("moves panel to earlier position", async () => {
      const p1 = await service.create({ storyboardId }); // 1
      await service.create({ storyboardId }); // 2
      await service.create({ storyboardId }); // 3

      await service.reorder(p1.id, 3);

      const panels = await service.getByStoryboard(storyboardId);
      expect(panels.find((p) => p.id === p1.id)?.position).toBe(3);
    });

    it("does nothing when position unchanged", async () => {
      const p1 = await service.create({ storyboardId });
      const updated = await service.reorder(p1.id, 1);

      expect(updated.position).toBe(1);
    });

    it("throws on position less than 1", async () => {
      const panel = await service.create({ storyboardId });
      await expect(service.reorder(panel.id, 0)).rejects.toThrow(
        "Position must be at least 1"
      );
    });

    it("throws on non-existent panel", async () => {
      await expect(service.reorder("nonexistent-id", 1)).rejects.toThrow(
        "Panel not found"
      );
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing panel", async () => {
      const created = await service.create({ storyboardId });
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent panel", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Panel not found: nonexistent-id"
      );
    });

    it("reorders remaining panels after deletion", async () => {
      await service.create({ storyboardId }); // 1
      const p2 = await service.create({ storyboardId }); // 2
      await service.create({ storyboardId }); // 3

      await service.delete(p2.id);

      const panels = await service.getByStoryboard(storyboardId);
      expect(panels).toHaveLength(2);
      expect(panels[0].position).toBe(1);
      expect(panels[1].position).toBe(2);
    });
  });

  // ============================================================================
  // GET GENERATIONS TESTS
  // ============================================================================

  describe("getGenerations", () => {
    it("returns empty array when no generations", async () => {
      const panel = await service.create({ storyboardId });
      const generations = await service.getGenerations(panel.id);

      expect(generations).toEqual([]);
    });

    it("returns all generations for panel", async () => {
      const panel = await service.create({ storyboardId });
      const imageService = getGeneratedImageService();

      await imageService.create({
        panelId: panel.id,
        localPath: "/output/image1.png",
        seed: 12345,
        prompt: "test prompt 1",
        model: "test-model.safetensors",
        steps: 20,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      await imageService.create({
        panelId: panel.id,
        localPath: "/output/image2.png",
        seed: 12346,
        prompt: "test prompt 2",
        model: "test-model.safetensors",
        steps: 20,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      const generations = await service.getGenerations(panel.id);
      expect(generations).toHaveLength(2);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode in description", async () => {
      const panel = await service.create({
        storyboardId,
        description: "Japanese text: and more",
      });
      expect(panel.description).toBe("Japanese text: and more");
    });

    it("allows multiple panels with same description", async () => {
      const p1 = await service.create({ storyboardId, description: "Same" });
      const p2 = await service.create({ storyboardId, description: "Same" });

      expect(p1.id).not.toBe(p2.id);
      expect(p1.description).toBe(p2.description);
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({ storyboardId });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await service.describe(created.id, { description: "Updated" });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("handles concurrent creates", async () => {
      const promises = Array.from({ length: 5 }, () => service.create({ storyboardId }));

      const panels = await Promise.all(promises);
      expect(panels).toHaveLength(5);

      const ids = new Set(panels.map((p) => p.id));
      expect(ids.size).toBe(5);
    });
  });
});
