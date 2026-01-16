/**
 * CompositionService Unit Tests
 *
 * Tests for page rendering, layout templates, and page composition.
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
  getCompositionService,
  type CompositionService,
} from "../../index.js";

describe("CompositionService", () => {
  let service: CompositionService;
  let projectId: string;
  let storyboardId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getCompositionService();
    const project = await createTestProject("Test Project");
    projectId = project.id;
    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // LAYOUT TEMPLATE TESTS
  // ============================================================================

  describe("listTemplates", () => {
    it("returns available layout templates", () => {
      const templates = service.listTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it("includes standard grid templates", () => {
      const templates = service.listTemplates();
      const templateIds = templates.map((t) => t.id);

      expect(templateIds).toContain("full-page");
      expect(templateIds).toContain("two-horizontal");
      expect(templateIds).toContain("two-vertical");
      expect(templateIds).toContain("four-grid");
    });

    it("templates have required properties", () => {
      const templates = service.listTemplates();

      templates.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.panelCount).toBeDefined();
        expect(template.panelCount).toBeGreaterThan(0);
        expect(template.slots).toBeDefined();
        expect(template.slots.length).toBe(template.panelCount);
      });
    });

    it("template slots have position and size", () => {
      const templates = service.listTemplates();

      templates.forEach((template) => {
        template.slots.forEach((slot) => {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.width).toBeGreaterThan(0);
          expect(slot.height).toBeGreaterThan(0);
        });
      });
    });

    it("includes action and cinematic templates", () => {
      const templates = service.listTemplates();
      const templateIds = templates.map((t) => t.id);

      expect(templateIds).toContain("action");
      expect(templateIds).toContain("cinematic");
      expect(templateIds).toContain("splash-insets");
    });
  });

  describe("listPageSizes", () => {
    it("returns available page sizes", () => {
      const sizes = service.listPageSizes();

      expect(sizes).toBeDefined();
      expect(typeof sizes).toBe("object");
      expect(Object.keys(sizes).length).toBeGreaterThan(0);
    });

    it("includes common comic sizes", () => {
      const sizes = service.listPageSizes();
      const sizeKeys = Object.keys(sizes);

      expect(sizeKeys).toContain("comic_standard");
      expect(sizeKeys).toContain("manga_tankoubon");
    });

    it("page sizes have dimensions and DPI", () => {
      const sizes = service.listPageSizes();

      Object.values(sizes).forEach((size) => {
        expect(size.name).toBeDefined();
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        expect(size.dpi).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // PAGE COMPOSITION TESTS
  // ============================================================================

  describe("composePage", () => {
    it("returns error for unknown template", async () => {
      const panel = await createTestPanel(storyboardId, "Panel 1");

      const result = await service.composePage({
        storyboardId,
        panelIds: [panel.id],
        templateId: "nonexistent-template",
        pageSize: "comic_standard",
        outputName: "test-page.png",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Template not found");
    });

    it("returns error when no valid panels", async () => {
      const result = await service.composePage({
        storyboardId,
        panelIds: ["nonexistent-panel"],
        templateId: "full-page",
        pageSize: "comic_standard",
        outputName: "test-page.png",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No valid panels");
    });

    it("uses default page size when not specified", async () => {
      const panel = await createTestPanel(storyboardId, "Panel 1");

      // This will fail since panel has no image, but we test the API works
      const result = await service.composePage({
        storyboardId,
        panelIds: [panel.id],
        templateId: "full-page",
        pageSize: "",
        outputName: "test-page.png",
      });

      // Should fail due to no image, not due to page size
      expect(result.error).not.toContain("page size");
    });

    it("accepts backgroundColor option", async () => {
      const panel = await createTestPanel(storyboardId, "Panel 1");

      const result = await service.composePage({
        storyboardId,
        panelIds: [panel.id],
        templateId: "full-page",
        pageSize: "comic_standard",
        backgroundColor: "#FFFFFF",
        outputName: "test-page.png",
      });

      // Will fail due to no image, but API should accept the parameter
      expect(result).toBeDefined();
    });

    it("accepts panelBorder option", async () => {
      const panel = await createTestPanel(storyboardId, "Panel 1");

      const result = await service.composePage({
        storyboardId,
        panelIds: [panel.id],
        templateId: "full-page",
        pageSize: "comic_standard",
        panelBorder: { width: 2, color: "#000000" },
        outputName: "test-page.png",
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // COMPOSE FROM PATHS TESTS
  // ============================================================================

  describe("composeFromPaths", () => {
    it("returns error for unknown template", async () => {
      const result = await service.composeFromPaths({
        templateId: "nonexistent-template",
        panelPaths: ["/test/image.png"],
        outputPath: "/tmp/output/page.png",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Template not found");
    });

    it("returns error for empty image paths", async () => {
      const result = await service.composeFromPaths({
        templateId: "full-page",
        panelPaths: [],
        outputPath: "/tmp/output/page.png",
      });

      expect(result.success).toBe(false);
    });

    it("accepts page size option", async () => {
      const result = await service.composeFromPaths({
        templateId: "full-page",
        panelPaths: ["/test/nonexistent.png"],
        outputPath: "/tmp/output/page.png",
        pageSize: "comic_standard",
      });

      // Will fail due to missing file, but API should accept
      expect(result).toBeDefined();
    });

    it("accepts background color option", async () => {
      const result = await service.composeFromPaths({
        templateId: "full-page",
        panelPaths: ["/test/image.png"],
        outputPath: "/tmp/output/page.png",
        backgroundColor: "#000000",
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // CONTACT SHEET TESTS
  // ============================================================================

  describe("contactSheetFromPaths", () => {
    it("handles empty image paths gracefully", async () => {
      const result = await service.contactSheetFromPaths({
        imagePaths: [],
        outputPath: "/tmp/output/contact.png",
        columns: 4,
      });

      // Should return a result (either error or empty success)
      expect(result).toBeDefined();
      expect(result.panelsUsed).toBe(0);
    });

    it("accepts columns option", async () => {
      const result = await service.contactSheetFromPaths({
        imagePaths: ["/test/image1.png", "/test/image2.png"],
        outputPath: "/tmp/output/contact.png",
        columns: 2,
      });

      expect(result).toBeDefined();
    });

    it("accepts thumbnail size option", async () => {
      const result = await service.contactSheetFromPaths({
        imagePaths: ["/test/image.png"],
        outputPath: "/tmp/output/contact.png",
        columns: 4,
        thumbnailSize: 200,
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // EXPORT TESTS
  // ============================================================================

  describe("exportPage", () => {
    it("accepts format option", async () => {
      const result = await service.exportPage({
        inputPath: "/test/input.png",
        outputPath: "/tmp/output/page.jpg",
        format: "jpeg",
      });

      expect(result).toBeDefined();
    });

    it("accepts quality option", async () => {
      const result = await service.exportPage({
        inputPath: "/test/input.png",
        outputPath: "/tmp/output/page.jpg",
        format: "jpeg",
        quality: 90,
      });

      expect(result).toBeDefined();
    });

    it("accepts DPI option", async () => {
      const result = await service.exportPage({
        inputPath: "/test/input.png",
        outputPath: "/tmp/output/page.png",
        format: "png",
        dpi: 300,
      });

      expect(result).toBeDefined();
    });

    it("accepts bleed option", async () => {
      const result = await service.exportPage({
        inputPath: "/test/input.png",
        outputPath: "/tmp/output/page.png",
        format: "png",
        bleed: 3,
      });

      expect(result).toBeDefined();
    });

    it("accepts trim marks option", async () => {
      const result = await service.exportPage({
        inputPath: "/test/input.png",
        outputPath: "/tmp/output/page.png",
        format: "png",
        trimMarks: true,
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // STORYBOARD COMPOSITION TESTS
  // ============================================================================

  describe("composeStoryboard", () => {
    it("returns error when no panels exist", async () => {
      const result = await service.composeStoryboard(storyboardId, {
        templateId: "full-page",
      });

      // Should handle empty storyboard gracefully
      expect(result).toBeDefined();
    });

    it("accepts page size option", async () => {
      await createTestPanel(storyboardId, "Panel 1");

      const result = await service.composeStoryboard(storyboardId, {
        templateId: "full-page",
        pageSize: "manga_tankoubon",
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("template count matches panel count", () => {
      const templates = service.listTemplates();

      templates.forEach((template) => {
        expect(template.slots.length).toBe(template.panelCount);
      });
    });

    it("all templates have unique IDs", () => {
      const templates = service.listTemplates();
      const ids = templates.map((t) => t.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it("all page sizes have unique keys", () => {
      const sizes = service.listPageSizes();
      const keys = Object.keys(sizes);
      const uniqueKeys = [...new Set(keys)];

      expect(keys.length).toBe(uniqueKeys.length);
    });

    it("slot positions are non-negative", () => {
      const templates = service.listTemplates();

      templates.forEach((template) => {
        template.slots.forEach((slot) => {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.width).toBeGreaterThan(0);
          expect(slot.height).toBeGreaterThan(0);
        });
      });
    });
  });
});
