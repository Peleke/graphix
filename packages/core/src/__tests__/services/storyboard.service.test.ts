/**
 * StoryboardService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
} from "../setup.js";
import { getStoryboardService, type StoryboardService } from "../../services/index.js";

describe("StoryboardService", () => {
  let service: StoryboardService;
  let projectId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getStoryboardService();

    // Create a project for storyboards
    const project = await createTestProject("Storyboard Test Project");
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a storyboard with required fields", async () => {
      const storyboard = await service.create({
        projectId,
        name: "Test Storyboard",
      });

      expect(storyboard).toBeDefined();
      expect(storyboard.id).toBeDefined();
      expect(storyboard.name).toBe("Test Storyboard");
      expect(storyboard.projectId).toBe(projectId);
      expect(storyboard.description).toBe("");
      expect(storyboard.createdAt).toBeInstanceOf(Date);
      expect(storyboard.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a storyboard with all fields", async () => {
      const storyboard = await service.create({
        projectId,
        name: "Full Storyboard",
        description: "A complete storyboard with description",
      });

      expect(storyboard.name).toBe("Full Storyboard");
      expect(storyboard.description).toBe("A complete storyboard with description");
    });

    it("creates a storyboard with initial panels", async () => {
      const storyboard = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 5,
      });

      const result = await service.getWithPanels(storyboard.id);
      expect(result?.panels).toHaveLength(5);
      expect(result?.panels[0].position).toBe(1);
      expect(result?.panels[4].position).toBe(5);
    });

    it("trims whitespace from name and description", async () => {
      const storyboard = await service.create({
        projectId,
        name: "  Trimmed Name  ",
        description: "  Trimmed Description  ",
      });

      expect(storyboard.name).toBe("Trimmed Name");
      expect(storyboard.description).toBe("Trimmed Description");
    });

    it("throws on missing name", async () => {
      await expect(service.create({ projectId, name: "" })).rejects.toThrow(
        "Storyboard name is required"
      );
    });

    it("throws on whitespace-only name", async () => {
      await expect(service.create({ projectId, name: "   " })).rejects.toThrow(
        "Storyboard name is required"
      );
    });

    it("throws on name exceeding 255 characters", async () => {
      const longName = "a".repeat(256);
      await expect(service.create({ projectId, name: longName })).rejects.toThrow(
        "Storyboard name must be 255 characters or less"
      );
    });

    it("allows name with exactly 255 characters", async () => {
      const maxName = "a".repeat(255);
      const storyboard = await service.create({ projectId, name: maxName });
      expect(storyboard.name).toBe(maxName);
    });

    it("throws on description exceeding 10000 characters", async () => {
      const longDesc = "a".repeat(10001);
      await expect(service.create({ projectId, name: "Test", description: longDesc })).rejects.toThrow(
        "Storyboard description must be 10000 characters or less"
      );
    });

    it("throws on non-existent project", async () => {
      await expect(
        service.create({ projectId: "nonexistent-project", name: "Test" })
      ).rejects.toThrow("Project not found: nonexistent-project");
    });

    it("handles panelCount of 0", async () => {
      const storyboard = await service.create({
        projectId,
        name: "No Panels",
        panelCount: 0,
      });

      const result = await service.getWithPanels(storyboard.id);
      expect(result?.panels).toHaveLength(0);
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns storyboard when exists", async () => {
      const created = await service.create({ projectId, name: "Find Me" });
      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Find Me");
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
  // GET WITH PANELS TESTS
  // ============================================================================

  describe("getWithPanels", () => {
    it("returns storyboard with panels", async () => {
      const created = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 3,
      });

      const result = await service.getWithPanels(created.id);

      expect(result).toBeDefined();
      expect(result?.storyboard.id).toBe(created.id);
      expect(result?.panels).toHaveLength(3);
    });

    it("returns panels ordered by position", async () => {
      const created = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 5,
      });

      const result = await service.getWithPanels(created.id);

      for (let i = 0; i < 5; i++) {
        expect(result?.panels[i].position).toBe(i + 1);
      }
    });

    it("returns null when storyboard not found", async () => {
      const result = await service.getWithPanels("nonexistent-id");
      expect(result).toBeNull();
    });

    it("returns empty panels array for storyboard without panels", async () => {
      const created = await service.create({ projectId, name: "No Panels" });
      const result = await service.getWithPanels(created.id);

      expect(result?.panels).toEqual([]);
    });
  });

  // ============================================================================
  // GET BY PROJECT TESTS
  // ============================================================================

  describe("getByProject", () => {
    it("returns empty array when no storyboards", async () => {
      const storyboards = await service.getByProject(projectId);
      expect(storyboards).toEqual([]);
    });

    it("returns all storyboards for project", async () => {
      await service.create({ projectId, name: "Storyboard 1" });
      await service.create({ projectId, name: "Storyboard 2" });
      await service.create({ projectId, name: "Storyboard 3" });

      const storyboards = await service.getByProject(projectId);
      expect(storyboards).toHaveLength(3);
    });

    it("orders storyboards by name", async () => {
      await service.create({ projectId, name: "Zeta" });
      await service.create({ projectId, name: "Alpha" });
      await service.create({ projectId, name: "Beta" });

      const storyboards = await service.getByProject(projectId);
      expect(storyboards[0].name).toBe("Alpha");
      expect(storyboards[1].name).toBe("Beta");
      expect(storyboards[2].name).toBe("Zeta");
    });

    it("does not return storyboards from other projects", async () => {
      const otherProject = await createTestProject("Other Project");

      await service.create({ projectId, name: "My Storyboard" });
      await service.create({ projectId: otherProject.id, name: "Other Storyboard" });

      const storyboards = await service.getByProject(projectId);
      expect(storyboards).toHaveLength(1);
      expect(storyboards[0].name).toBe("My Storyboard");
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates storyboard name", async () => {
      const created = await service.create({ projectId, name: "Original" });
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.name).toBe("Updated");
      expect(updated.id).toBe(created.id);
    });

    it("updates storyboard description", async () => {
      const created = await service.create({ projectId, name: "Test" });
      const updated = await service.update(created.id, { description: "New description" });

      expect(updated.description).toBe("New description");
    });

    it("updates only specified fields", async () => {
      const created = await service.create({
        projectId,
        name: "Original",
        description: "Original description",
      });
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.name).toBe("Updated");
      expect(updated.description).toBe("Original description");
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.create({ projectId, name: "Test" });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("throws on non-existent storyboard", async () => {
      await expect(service.update("nonexistent-id", { name: "New" })).rejects.toThrow(
        "Storyboard not found: nonexistent-id"
      );
    });

    it("throws on empty name update", async () => {
      const created = await service.create({ projectId, name: "Test" });
      await expect(service.update(created.id, { name: "" })).rejects.toThrow(
        "Storyboard name is required"
      );
    });

    it("throws on name exceeding limit during update", async () => {
      const created = await service.create({ projectId, name: "Test" });
      const longName = "a".repeat(256);
      await expect(service.update(created.id, { name: longName })).rejects.toThrow(
        "Storyboard name must be 255 characters or less"
      );
    });

    it("throws on description exceeding limit during update", async () => {
      const created = await service.create({ projectId, name: "Test" });
      const longDesc = "a".repeat(10001);
      await expect(service.update(created.id, { description: longDesc })).rejects.toThrow(
        "Storyboard description must be 10000 characters or less"
      );
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing storyboard", async () => {
      const created = await service.create({ projectId, name: "To Delete" });
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent storyboard", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Storyboard not found: nonexistent-id"
      );
    });

    it("removes storyboard from project list after deletion", async () => {
      const s1 = await service.create({ projectId, name: "Keep" });
      const s2 = await service.create({ projectId, name: "Delete" });

      await service.delete(s2.id);

      const storyboards = await service.getByProject(projectId);
      expect(storyboards).toHaveLength(1);
      expect(storyboards[0].id).toBe(s1.id);
    });

    it("cascades deletion to panels", async () => {
      const created = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 3,
      });

      // Verify panels exist
      let result = await service.getWithPanels(created.id);
      expect(result?.panels).toHaveLength(3);

      await service.delete(created.id);

      // Panels should be gone with storyboard
      result = await service.getWithPanels(created.id);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // DUPLICATE TESTS
  // ============================================================================

  describe("duplicate", () => {
    it("duplicates storyboard with default name", async () => {
      const original = await service.create({
        projectId,
        name: "Original Storyboard",
        description: "Original description",
      });

      const duplicate = await service.duplicate(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe("Original Storyboard (copy)");
      expect(duplicate.description).toBe("Original description");
      expect(duplicate.projectId).toBe(projectId);
    });

    it("duplicates storyboard with custom name", async () => {
      const original = await service.create({ projectId, name: "Original" });
      const duplicate = await service.duplicate(original.id, "Custom Copy Name");

      expect(duplicate.name).toBe("Custom Copy Name");
    });

    it("duplicates panels", async () => {
      const original = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 4,
      });

      const duplicate = await service.duplicate(original.id);
      const result = await service.getWithPanels(duplicate.id);

      expect(result?.panels).toHaveLength(4);
    });

    it("duplicated panels have correct positions", async () => {
      const original = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 3,
      });

      const duplicate = await service.duplicate(original.id);
      const result = await service.getWithPanels(duplicate.id);

      expect(result?.panels[0].position).toBe(1);
      expect(result?.panels[1].position).toBe(2);
      expect(result?.panels[2].position).toBe(3);
    });

    it("duplicated panels have new IDs", async () => {
      const original = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 2,
      });

      const originalPanels = await service.getWithPanels(original.id);
      const duplicate = await service.duplicate(original.id);
      const duplicatePanels = await service.getWithPanels(duplicate.id);

      expect(duplicatePanels?.panels[0].id).not.toBe(originalPanels?.panels[0].id);
      expect(duplicatePanels?.panels[1].id).not.toBe(originalPanels?.panels[1].id);
    });

    it("does not copy selectedOutputId on panels", async () => {
      const original = await service.create({
        projectId,
        name: "With Panels",
        panelCount: 1,
      });

      const duplicate = await service.duplicate(original.id);
      const result = await service.getWithPanels(duplicate.id);

      expect(result?.panels[0].selectedOutputId).toBeNull();
    });

    it("throws on non-existent storyboard", async () => {
      await expect(service.duplicate("nonexistent-id")).rejects.toThrow(
        "Storyboard not found: nonexistent-id"
      );
    });

    it("creates independent copy (modifying original does not affect copy)", async () => {
      const original = await service.create({ projectId, name: "Original" });
      const duplicate = await service.duplicate(original.id);

      await service.update(original.id, { name: "Modified Original" });

      const refreshedDuplicate = await service.getById(duplicate.id);
      expect(refreshedDuplicate?.name).toBe("Original (copy)");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode characters in name", async () => {
      const storyboard = await service.create({
        projectId,
        name: "Storyboard with unicode",
      });
      expect(storyboard.name).toBe("Storyboard with unicode");
    });

    it("handles special characters in description", async () => {
      const storyboard = await service.create({
        projectId,
        name: "Test",
        description: 'Special chars: <>&"\' and newlines\nand tabs\t',
      });
      expect(storyboard.description).toContain("<>&");
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({ projectId, name: "Test" });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("allows multiple storyboards with same name", async () => {
      const s1 = await service.create({ projectId, name: "Duplicate" });
      const s2 = await service.create({ projectId, name: "Duplicate" });

      expect(s1.id).not.toBe(s2.id);
      expect(s1.name).toBe(s2.name);
    });

    it("handles concurrent creates", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create({ projectId, name: `Concurrent ${i}` })
      );

      const storyboards = await Promise.all(promises);
      expect(storyboards).toHaveLength(5);

      const ids = new Set(storyboards.map((s) => s.id));
      expect(ids.size).toBe(5);
    });

    it("handles large panelCount", async () => {
      const storyboard = await service.create({
        projectId,
        name: "Many Panels",
        panelCount: 50,
      });

      const result = await service.getWithPanels(storyboard.id);
      expect(result?.panels).toHaveLength(50);
    });
  });
});
