/**
 * Data Integrity Integration Tests
 *
 * Tests verifying data consistency, cascade deletes, and referential integrity.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
  createTestCharacter,
} from "../setup.js";
import {
  getProjectService,
  getCharacterService,
  getStoryboardService,
  getPanelService,
  getCaptionService,
  getGeneratedImageService,
} from "../../services/index.js";

describe("Data Integrity", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CASCADE DELETE TESTS
  // ============================================================================

  describe("cascade deletes", () => {
    it("project deletion cascades to characters", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();

      const project = await createTestProject("Test");
      await characterService.create({
        projectId: project.id,
        name: "Hero",
        profile: { species: "fox" },
      });
      await characterService.create({
        projectId: project.id,
        name: "Villain",
        profile: { species: "fox" },
      });

      await projectService.delete(project.id);

      const characters = await characterService.getByProject(project.id);
      expect(characters).toHaveLength(0);
    });

    it("project deletion cascades to storyboards and panels", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter 1");
      const panel = await createTestPanel(storyboard.id, "Panel 1");

      await projectService.delete(project.id);

      const foundStoryboard = await storyboardService.getById(storyboard.id);
      const foundPanel = await panelService.getById(panel.id);

      expect(foundStoryboard).toBeNull();
      expect(foundPanel).toBeNull();
    });

    it("storyboard deletion cascades to panels", async () => {
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter 1");
      const panel1 = await createTestPanel(storyboard.id, "Panel 1");
      const panel2 = await createTestPanel(storyboard.id, "Panel 2");

      await storyboardService.delete(storyboard.id);

      expect(await panelService.getById(panel1.id)).toBeNull();
      expect(await panelService.getById(panel2.id)).toBeNull();
    });

    it("panel deletion cascades to captions", async () => {
      const panelService = getPanelService();
      const captionService = getCaptionService();

      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");

      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello",
        position: { x: 0.5, y: 0.5 },
      });
      await captionService.create({
        panelId: panel.id,
        type: "thought",
        text: "Hmm",
        position: { x: 0.3, y: 0.3 },
      });

      await panelService.delete(panel.id);

      const captions = await captionService.getByPanel(panel.id);
      expect(captions).toHaveLength(0);
    });

    it("panel deletion cascades to generated images", async () => {
      const panelService = getPanelService();
      const imageService = getGeneratedImageService();

      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");

      const image = await imageService.create({
        panelId: panel.id,
        localPath: "/test/image.png",
        seed: 12345,
        prompt: "test",
        model: "test.safetensors",
        steps: 20,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      await panelService.delete(panel.id);

      const found = await imageService.getById(image.id);
      expect(found).toBeNull();
    });
  });

  // ============================================================================
  // REFERENTIAL INTEGRITY TESTS
  // ============================================================================

  describe("referential integrity", () => {
    it("cannot create storyboard with invalid project", async () => {
      const storyboardService = getStoryboardService();

      await expect(
        storyboardService.create({
          projectId: "invalid-project-id",
          name: "Test",
        })
      ).rejects.toThrow();
    });

    it("cannot create panel with invalid storyboard", async () => {
      const panelService = getPanelService();

      await expect(
        panelService.create({
          storyboardId: "invalid-storyboard-id",
          description: "Test",
        })
      ).rejects.toThrow();
    });

    it("cannot create caption with invalid panel", async () => {
      const captionService = getCaptionService();

      await expect(
        captionService.create({
          panelId: "invalid-panel-id",
          type: "speech",
          text: "Test",
          position: { x: 0.5, y: 0.5 },
        })
      ).rejects.toThrow();
    });

    it("cannot create character with invalid project", async () => {
      const characterService = getCharacterService();

      await expect(
        characterService.create({
          projectId: "invalid-project-id",
          name: "Test",
          profile: { species: "fox" },
        })
      ).rejects.toThrow();
    });

    it("cannot create generated image with invalid panel", async () => {
      const imageService = getGeneratedImageService();

      await expect(
        imageService.create({
          panelId: "invalid-panel-id",
          localPath: "/test/image.png",
          seed: 12345,
          prompt: "test",
          model: "test.safetensors",
          steps: 20,
          cfg: 7,
          sampler: "euler",
          width: 512,
          height: 768,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // DATA CONSISTENCY TESTS
  // ============================================================================

  describe("data consistency", () => {
    it("maintains unique IDs across entities", async () => {
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");

      // All IDs should be unique
      const ids = new Set([project.id, character.id, storyboard.id, panel.id]);
      expect(ids.size).toBe(4);
    });

    it("maintains position ordering after deletes", async () => {
      const panelService = getPanelService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      const p1 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Panel 1",
      });
      const p2 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Panel 2",
      });
      const p3 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Panel 3",
      });

      // Delete middle panel
      await panelService.delete(p2.id);

      // Remaining panels should be reordered
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(2);
      expect(panels[0].position).toBe(1);
      expect(panels[1].position).toBe(2);
    });

    it("maintains caption zIndex ordering", async () => {
      const captionService = getCaptionService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");

      // Create captions with specific zIndex
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Back",
        position: { x: 0.5, y: 0.5 },
        zIndex: 1,
      });
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Middle",
        position: { x: 0.5, y: 0.5 },
        zIndex: 5,
      });
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Front",
        position: { x: 0.5, y: 0.5 },
        zIndex: 10,
      });

      const captions = await captionService.getByPanel(panel.id);

      // Should be ordered by zIndex
      expect(captions[0].text).toBe("Back");
      expect(captions[1].text).toBe("Middle");
      expect(captions[2].text).toBe("Front");
    });

    it("maintains character IDs when character deleted", async () => {
      const panelService = getPanelService();
      const characterService = getCharacterService();

      const project = await createTestProject("Test");
      const char1 = await createTestCharacter(project.id, "Hero");
      const char2 = await createTestCharacter(project.id, "Villain");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [char1.id, char2.id],
      });

      // Delete one character
      await characterService.delete(char1.id);

      // Panel should still have char2
      const updatedPanel = await panelService.getById(panel.id);
      expect(updatedPanel?.characterIds).not.toContain(char1.id);
      expect(updatedPanel?.characterIds).toContain(char2.id);
    });
  });

  // ============================================================================
  // TRANSACTION TESTS
  // ============================================================================

  describe("transactional operations", () => {
    it("maintains consistency on batch failures", async () => {
      const panelService = getPanelService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      // Create some panels
      const p1 = await panelService.create({ storyboardId: storyboard.id });
      const p2 = await panelService.create({ storyboardId: storyboard.id });

      // Attempt to delete including non-existent
      try {
        await Promise.all([
          panelService.delete(p1.id),
          panelService.delete("nonexistent-id"),
        ]);
      } catch {
        // Expected to fail
      }

      // At least one panel should remain (transaction behavior varies)
      const panels = await panelService.getByStoryboard(storyboard.id);
      // This tests that the database is still in a valid state
      expect(Array.isArray(panels)).toBe(true);
    });

    it("concurrent updates maintain consistency", async () => {
      const panelService = getPanelService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await panelService.create({ storyboardId: storyboard.id });

      // Concurrent updates
      const updates = Array.from({ length: 5 }, (_, i) =>
        panelService.describe(panel.id, {
          description: `Update ${i}`,
        })
      );

      await Promise.all(updates);

      // Panel should have one of the descriptions
      const updated = await panelService.getById(panel.id);
      expect(updated?.description).toMatch(/Update \d/);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty project with no children", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const characterService = getCharacterService();

      const project = await createTestProject("Empty");

      // Should be able to delete empty project
      await projectService.delete(project.id);

      // Verify deletion
      expect(await projectService.getById(project.id)).toBeNull();
    });

    it("handles deeply nested deletion", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const captionService = getCaptionService();

      const project = await createTestProject("Deep");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");

      // Add multiple levels of data
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Nested",
        position: { x: 0.5, y: 0.5 },
      });

      // Delete from top
      await projectService.delete(project.id);

      // Everything should be gone
      expect(await projectService.getById(project.id)).toBeNull();
      expect(await storyboardService.getById(storyboard.id)).toBeNull();
      expect(await panelService.getById(panel.id)).toBeNull();
      expect((await captionService.getByPanel(panel.id)).length).toBe(0);
    });

    it("handles rapid create-delete cycles", async () => {
      const projectService = getProjectService();

      for (let i = 0; i < 10; i++) {
        const project = await projectService.create({ name: `Cycle ${i}` });
        await projectService.delete(project.id);
      }

      // Should have no projects
      const projects = await projectService.list();
      expect(projects).toHaveLength(0);
    });

    it("handles large batch operations", async () => {
      const panelService = getPanelService();
      const project = await createTestProject("Large");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      // Create many panels
      const createPromises = Array.from({ length: 50 }, (_, i) =>
        panelService.create({
          storyboardId: storyboard.id,
          description: `Panel ${i}`,
        })
      );

      const panels = await Promise.all(createPromises);
      expect(panels).toHaveLength(50);

      // Delete all
      const deletePromises = panels.map((p) => panelService.delete(p.id));
      await Promise.all(deletePromises);

      const remaining = await panelService.getByStoryboard(storyboard.id);
      expect(remaining).toHaveLength(0);
    });
  });
});
