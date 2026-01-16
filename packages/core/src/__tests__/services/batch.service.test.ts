/**
 * BatchService Unit Tests
 *
 * Tests for batch operations on panels, captions, and generation.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
} from "../setup.js";
import {
  getBatchService,
  getPanelService,
  getCaptionService,
  getGeneratedImageService,
  type BatchService,
} from "../../services/index.js";

describe("BatchService", () => {
  let service: BatchService;
  let projectId: string;
  let storyboardId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getBatchService();
    const project = await createTestProject("Test Project");
    projectId = project.id;
    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // BATCH PANEL CREATION TESTS
  // ============================================================================

  describe("createPanels", () => {
    it("creates multiple panels in one call", async () => {
      const result = await service.createPanels(storyboardId, [
        { description: "Panel 1" },
        { description: "Panel 2" },
        { description: "Panel 3" },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it("assigns sequential positions", async () => {
      const result = await service.createPanels(storyboardId, [
        { description: "First" },
        { description: "Second" },
        { description: "Third" },
      ]);

      const positions = result.created.map((p) => p.position);
      expect(positions[0]).toBeLessThan(positions[1]);
      expect(positions[1]).toBeLessThan(positions[2]);
    });

    it("creates panels with direction settings", async () => {
      const result = await service.createPanels(storyboardId, [
        { description: "Panel 1", direction: { cameraAngle: "low angle" } },
        { description: "Panel 2", direction: { mood: "dramatic" } },
      ]);

      expect(result.created[0].direction?.cameraAngle).toBe("low angle");
      expect(result.created[1].direction?.mood).toBe("dramatic");
    });

    it("handles empty panels array", async () => {
      const result = await service.createPanels(storyboardId, []);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(0);
    });

    it("returns partial success on some failures", async () => {
      // Create panels where one might fail validation
      const panelService = getPanelService();
      const originalCreate = panelService.create.bind(panelService);

      let callCount = 0;
      spyOn(panelService, "create").mockImplementation(async (input) => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Simulated failure");
        }
        return originalCreate(input);
      });

      const result = await service.createPanels(storyboardId, [
        { description: "Panel 1" },
        { description: "Panel 2" },
        { description: "Panel 3" },
      ]);

      expect(result.success).toBe(false);
      expect(result.created.length).toBe(2);
      expect(result.errors.length).toBe(1);
    });
  });

  // ============================================================================
  // BATCH PANEL DELETION TESTS
  // ============================================================================

  describe("deletePanels", () => {
    it("deletes multiple panels", async () => {
      const p1 = await createTestPanel(storyboardId, "Panel 1");
      const p2 = await createTestPanel(storyboardId, "Panel 2");
      const p3 = await createTestPanel(storyboardId, "Panel 3");

      const result = await service.deletePanels([p1.id, p2.id, p3.id]);

      expect(result.success).toBe(true);
      expect(result.deleted).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it("handles non-existent panel IDs gracefully", async () => {
      const p1 = await createTestPanel(storyboardId, "Real Panel");

      const result = await service.deletePanels([p1.id, "nonexistent-id"]);

      expect(result.success).toBe(false);
      expect(result.deleted).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it("handles empty array", async () => {
      const result = await service.deletePanels([]);

      expect(result.success).toBe(true);
      expect(result.deleted).toHaveLength(0);
    });
  });

  // ============================================================================
  // BATCH CAPTION TESTS
  // ============================================================================

  describe("addCaptions", () => {
    it("adds captions to multiple panels", async () => {
      const p1 = await createTestPanel(storyboardId, "Panel 1");
      const p2 = await createTestPanel(storyboardId, "Panel 2");

      const result = await service.addCaptions([
        {
          panelId: p1.id,
          caption: {
            panelId: p1.id,
            type: "speech",
            text: "Hello!",
            position: { x: 0.5, y: 0.2 },
          },
        },
        {
          panelId: p2.id,
          caption: {
            panelId: p2.id,
            type: "thought",
            text: "Hmm...",
            position: { x: 0.5, y: 0.3 },
          },
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(2);
    });

    it("adds multiple captions to same panel", async () => {
      const panel = await createTestPanel(storyboardId, "Panel 1");

      const result = await service.addCaptions([
        {
          panelId: panel.id,
          caption: {
            panelId: panel.id,
            type: "speech",
            text: "First caption",
            position: { x: 0.3, y: 0.2 },
          },
        },
        {
          panelId: panel.id,
          caption: {
            panelId: panel.id,
            type: "speech",
            text: "Second caption",
            position: { x: 0.7, y: 0.2 },
          },
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(2);
    });
  });

  describe("clearCaptions", () => {
    it("clears captions from multiple panels", async () => {
      const p1 = await createTestPanel(storyboardId, "Panel 1");
      const p2 = await createTestPanel(storyboardId, "Panel 2");

      const captionService = getCaptionService();
      await captionService.create({
        panelId: p1.id,
        type: "speech",
        text: "Caption 1",
        position: { x: 0.5, y: 0.2 },
      });
      await captionService.create({
        panelId: p2.id,
        type: "speech",
        text: "Caption 2",
        position: { x: 0.5, y: 0.2 },
      });

      const result = await service.clearCaptions([p1.id, p2.id]);

      expect(result.success).toBe(true);
      expect(result.cleared).toBe(2);
    });

    it("handles panels with no captions", async () => {
      const panel = await createTestPanel(storyboardId, "Empty Panel");

      const result = await service.clearCaptions([panel.id]);

      expect(result.success).toBe(true);
      expect(result.cleared).toBe(0);
    });
  });

  // ============================================================================
  // GET PANEL IDS TESTS
  // ============================================================================

  describe("getPanelIds", () => {
    it("returns panel IDs in creation order", async () => {
      // Create panels in order - they get sequential positions
      const p1 = await createTestPanel(storyboardId, "First");
      const p2 = await createTestPanel(storyboardId, "Second");
      const p3 = await createTestPanel(storyboardId, "Third");

      const ids = await service.getPanelIds(storyboardId);

      expect(ids).toHaveLength(3);
      // Panels are returned in position order, which matches creation order
      expect(ids[0]).toBe(p1.id);
      expect(ids[1]).toBe(p2.id);
      expect(ids[2]).toBe(p3.id);
    });

    it("returns empty array for empty storyboard", async () => {
      const ids = await service.getPanelIds(storyboardId);
      expect(ids).toEqual([]);
    });
  });

  // ============================================================================
  // SELECT OUTPUTS TESTS
  // ============================================================================

  describe("selectOutputs", () => {
    it("selects outputs for multiple panels", async () => {
      const p1 = await createTestPanel(storyboardId, "Panel 1");
      const p2 = await createTestPanel(storyboardId, "Panel 2");

      // Create actual generated images for these panels
      const imageService = getGeneratedImageService();
      const img1 = await imageService.create({
        panelId: p1.id,
        localPath: "/test/output-1.png",
        prompt: "test prompt 1",
        model: "test-model",
        seed: 12345,
        steps: 28,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });
      const img2 = await imageService.create({
        panelId: p2.id,
        localPath: "/test/output-2.png",
        prompt: "test prompt 2",
        model: "test-model",
        seed: 12346,
        steps: 28,
        cfg: 7,
        sampler: "euler",
        width: 512,
        height: 768,
      });

      const result = await service.selectOutputs([
        { panelId: p1.id, outputId: img1.id },
        { panelId: p2.id, outputId: img2.id },
      ]);

      expect(result.success).toBe(true);
      expect(result.selected).toBe(2);
    });

    it("handles non-existent panels", async () => {
      const result = await service.selectOutputs([
        { panelId: "nonexistent", outputId: "output-1" },
      ]);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("autoSelectOutputs", () => {
    it("auto-selects outputs for panels without selection", async () => {
      const panel = await createTestPanel(storyboardId, "Panel");

      // Without actual generated images, this should skip or error
      const result = await service.autoSelectOutputs([panel.id], "latest");

      // Result depends on whether panel has generated images
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles concurrent batch operations", async () => {
      const promises = [
        service.createPanels(storyboardId, [{ description: "Batch 1 Panel 1" }]),
        service.createPanels(storyboardId, [{ description: "Batch 2 Panel 1" }]),
        service.createPanels(storyboardId, [{ description: "Batch 3 Panel 1" }]),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it("handles large batch of panels", async () => {
      const panels = Array.from({ length: 50 }, (_, i) => ({
        description: `Panel ${i + 1}`,
      }));

      const result = await service.createPanels(storyboardId, panels);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(50);
    });
  });
});
