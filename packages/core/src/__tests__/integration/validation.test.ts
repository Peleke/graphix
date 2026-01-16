/**
 * Validation Integration Tests
 *
 * Tests verifying input validation across all services.
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
  getProjectService,
  getCharacterService,
  getStoryboardService,
  getPanelService,
  getCaptionService,
} from "../../services/index.js";

describe("Input Validation", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // PROJECT VALIDATION
  // ============================================================================

  describe("Project validation", () => {
    it("rejects empty project name", async () => {
      const service = getProjectService();
      await expect(service.create({ name: "" })).rejects.toThrow();
    });

    it("rejects whitespace-only project name", async () => {
      const service = getProjectService();
      await expect(service.create({ name: "   " })).rejects.toThrow();
    });

    it("rejects project name over 255 characters", async () => {
      const service = getProjectService();
      await expect(service.create({ name: "a".repeat(256) })).rejects.toThrow();
    });

    it("accepts project name at exactly 255 characters", async () => {
      const service = getProjectService();
      const project = await service.create({ name: "a".repeat(255) });
      expect(project.name).toHaveLength(255);
    });

    it("rejects description over 10000 characters", async () => {
      const service = getProjectService();
      await expect(
        service.create({ name: "Test", description: "a".repeat(10001) })
      ).rejects.toThrow();
    });

    it("accepts description at exactly 10000 characters", async () => {
      const service = getProjectService();
      const project = await service.create({
        name: "Test",
        description: "a".repeat(10000),
      });
      expect(project.description).toHaveLength(10000);
    });

    it("rejects invalid resolution width", async () => {
      const service = getProjectService();
      await expect(
        service.create({
          name: "Test",
          settings: { resolution: { width: 100, height: 512 } },
        })
      ).rejects.toThrow();
    });

    it("rejects resolution width over 4096", async () => {
      const service = getProjectService();
      await expect(
        service.create({
          name: "Test",
          settings: { resolution: { width: 5000, height: 512 } },
        })
      ).rejects.toThrow();
    });

    it("rejects invalid LoRA strength", async () => {
      const service = getProjectService();
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "test", strength: 3.0 }] },
        })
      ).rejects.toThrow();
    });

    it("rejects negative LoRA strength", async () => {
      const service = getProjectService();
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "test", strength: -0.5 }] },
        })
      ).rejects.toThrow();
    });

    it("rejects LoRA without name", async () => {
      const service = getProjectService();
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "", strength: 0.5 }] },
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // CHARACTER VALIDATION
  // ============================================================================

  describe("Character validation", () => {
    it("rejects empty character name", async () => {
      const project = await createTestProject("Test");
      const service = getCharacterService();
      await expect(
        service.create({ projectId: project.id, name: "", profile: { species: "fox" } })
      ).rejects.toThrow();
    });

    it("auto-generates positive prompt when not provided", async () => {
      const project = await createTestProject("Test");
      const service = getCharacterService();
      const character = await service.create({
        projectId: project.id,
        name: "Hero",
        profile: { species: "fox" },
      });
      // Service auto-generates positive prompt from profile
      expect(character.promptFragments.positive).toBeDefined();
      expect(character.promptFragments.positive.length).toBeGreaterThan(0);
    });

    it("rejects character name over 255 characters", async () => {
      const project = await createTestProject("Test");
      const service = getCharacterService();
      await expect(
        service.create({
          projectId: project.id,
          name: "a".repeat(256),
          profile: { species: "fox" },
        })
      ).rejects.toThrow();
    });

    it("rejects invalid projectId", async () => {
      const service = getCharacterService();
      await expect(
        service.create({
          projectId: "invalid-id",
          name: "Hero",
          profile: { species: "fox" },
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // STORYBOARD VALIDATION
  // ============================================================================

  describe("Storyboard validation", () => {
    it("rejects empty storyboard name", async () => {
      const project = await createTestProject("Test");
      const service = getStoryboardService();
      await expect(
        service.create({ projectId: project.id, name: "" })
      ).rejects.toThrow();
    });

    it("rejects storyboard name over 255 characters", async () => {
      const project = await createTestProject("Test");
      const service = getStoryboardService();
      await expect(
        service.create({ projectId: project.id, name: "a".repeat(256) })
      ).rejects.toThrow();
    });

    it("rejects invalid projectId", async () => {
      const service = getStoryboardService();
      await expect(
        service.create({ projectId: "invalid-id", name: "Chapter" })
      ).rejects.toThrow();
    });

    it("rejects description over 10000 characters", async () => {
      const project = await createTestProject("Test");
      const service = getStoryboardService();
      await expect(
        service.create({
          projectId: project.id,
          name: "Chapter",
          description: "a".repeat(10001),
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // PANEL VALIDATION
  // ============================================================================

  describe("Panel validation", () => {
    it("rejects invalid storyboardId", async () => {
      const service = getPanelService();
      await expect(
        service.create({ storyboardId: "invalid-id" })
      ).rejects.toThrow();
    });

    it("rejects description over 5000 characters", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getPanelService();
      await expect(
        service.create({
          storyboardId: storyboard.id,
          description: "a".repeat(5001),
        })
      ).rejects.toThrow();
    });

    it("accepts description at exactly 5000 characters", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getPanelService();
      const panel = await service.create({
        storyboardId: storyboard.id,
        description: "a".repeat(5000),
      });
      expect(panel.description).toHaveLength(5000);
    });

    it("rejects invalid camera angle", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getPanelService();
      await expect(
        service.create({
          storyboardId: storyboard.id,
          direction: { cameraAngle: "invalid-angle" },
        })
      ).rejects.toThrow();
    });

    it("rejects invalid mood", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getPanelService();
      await expect(
        service.create({
          storyboardId: storyboard.id,
          direction: { mood: "invalid-mood" },
        })
      ).rejects.toThrow();
    });

    it("rejects invalid lighting", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getPanelService();
      await expect(
        service.create({
          storyboardId: storyboard.id,
          direction: { lighting: "invalid-lighting" },
        })
      ).rejects.toThrow();
    });

    it("rejects position less than 1 on reorder", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getPanelService();
      await expect(service.reorder(panel.id, 0)).rejects.toThrow();
    });
  });

  // ============================================================================
  // CAPTION VALIDATION
  // ============================================================================

  describe("Caption validation", () => {
    it("rejects invalid panelId", async () => {
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: "invalid-id",
          type: "speech",
          text: "Hello",
          position: { x: 0.5, y: 0.5 },
        })
      ).rejects.toThrow();
    });

    it("rejects empty caption text", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "speech",
          text: "",
          position: { x: 0.5, y: 0.5 },
        })
      ).rejects.toThrow();
    });

    it("rejects invalid caption type", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "invalid" as any,
          text: "Hello",
          position: { x: 0.5, y: 0.5 },
        })
      ).rejects.toThrow();
    });

    it("rejects position x less than 0", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "speech",
          text: "Hello",
          position: { x: -10, y: 50 },
        })
      ).rejects.toThrow();
    });

    it("rejects position x greater than 100", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "speech",
          text: "Hello",
          position: { x: 110, y: 50 },
        })
      ).rejects.toThrow();
    });

    it("rejects position y less than 0", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "speech",
          text: "Hello",
          position: { x: 50, y: -10 },
        })
      ).rejects.toThrow();
    });

    it("rejects position y greater than 100", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      await expect(
        service.create({
          panelId: panel.id,
          type: "speech",
          text: "Hello",
          position: { x: 50, y: 110 },
        })
      ).rejects.toThrow();
    });

    it("accepts boundary positions (0, 0)", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello",
        position: { x: 0, y: 0 },
      });
      expect(caption.position.x).toBe(0);
      expect(caption.position.y).toBe(0);
    });

    it("accepts boundary positions (100, 100)", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello",
        position: { x: 100, y: 100 },
      });
      expect(caption.position.x).toBe(100);
      expect(caption.position.y).toBe(100);
    });
  });

  // ============================================================================
  // UPDATE VALIDATION
  // ============================================================================

  describe("Update validation", () => {
    it("rejects empty name on project update", async () => {
      const project = await createTestProject("Test");
      const service = getProjectService();
      await expect(service.update(project.id, { name: "" })).rejects.toThrow();
    });

    it("rejects empty name on storyboard update", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const service = getStoryboardService();
      await expect(
        service.update(storyboard.id, { name: "" })
      ).rejects.toThrow();
    });

    it("rejects empty text on caption update", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const captionService = getCaptionService();
      const caption = await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello",
        position: { x: 0.5, y: 0.5 },
      });
      await expect(
        captionService.update(caption.id, { text: "" })
      ).rejects.toThrow();
    });

    it("validates position on caption update", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const captionService = getCaptionService();
      const caption = await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello",
        position: { x: 50, y: 50 },
      });
      await expect(
        captionService.update(caption.id, { position: { x: 200, y: 50 } })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge cases", () => {
    it("trims whitespace from project name", async () => {
      const service = getProjectService();
      const project = await service.create({ name: "  Test Project  " });
      expect(project.name).toBe("Test Project");
    });

    it("trims whitespace from character name", async () => {
      const project = await createTestProject("Test");
      const service = getCharacterService();
      const character = await service.create({
        projectId: project.id,
        name: "  Hero  ",
        profile: { species: "fox" },
      });
      expect(character.name).toBe("Hero");
    });

    it("trims whitespace from storyboard name", async () => {
      const project = await createTestProject("Test");
      const service = getStoryboardService();
      const storyboard = await service.create({
        projectId: project.id,
        name: "  Chapter  ",
      });
      expect(storyboard.name).toBe("Chapter");
    });

    it("handles unicode in project name", async () => {
      const service = getProjectService();
      const project = await service.create({ name: "プロジェクト" });
      expect(project.name).toBe("プロジェクト");
    });

    it("handles unicode in character name", async () => {
      const project = await createTestProject("Test");
      const service = getCharacterService();
      const character = await service.create({
        projectId: project.id,
        name: "英雄",
        profile: { species: "fox" },
      });
      expect(character.name).toBe("英雄");
    });

    it("handles unicode in caption text", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "speech",
        text: "こんにちは！",
        position: { x: 0.5, y: 0.5 },
      });
      expect(caption.text).toBe("こんにちは！");
    });
  });
});
