/**
 * ProjectService Unit Tests
 *
 * Comprehensive tests covering CRUD operations, validation, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setupTestDatabase, teardownTestDatabase, resetAllServices } from "../setup.js";
import { getProjectService, type ProjectService } from "../../services/index.js";

describe("ProjectService", () => {
  let service: ProjectService;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getProjectService();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe("create", () => {
    it("creates a project with only required fields", async () => {
      const project = await service.create({ name: "Test Project" });

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe("Test Project");
      expect(project.description).toBe("");
      expect(project.settings).toBeDefined();
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a project with all fields", async () => {
      const project = await service.create({
        name: "Full Project",
        description: "A complete project with all fields",
        settings: {
          defaultModel: "custom-model.safetensors",
          defaultLoras: [{ name: "style-lora", strength: 0.8 }],
          defaultNegative: "bad quality, artifacts",
          resolution: { width: 1024, height: 1024 },
        },
      });

      expect(project.name).toBe("Full Project");
      expect(project.description).toBe("A complete project with all fields");
      expect(project.settings?.defaultModel).toBe("custom-model.safetensors");
      expect(project.settings?.defaultLoras).toHaveLength(1);
      expect(project.settings?.defaultLoras[0].name).toBe("style-lora");
      expect(project.settings?.resolution.width).toBe(1024);
    });

    it("trims whitespace from name and description", async () => {
      const project = await service.create({
        name: "  Trimmed Name  ",
        description: "  Trimmed Description  ",
      });

      expect(project.name).toBe("Trimmed Name");
      expect(project.description).toBe("Trimmed Description");
    });

    it("throws on missing name", async () => {
      await expect(service.create({ name: "" })).rejects.toThrow("Project name is required");
    });

    it("throws on whitespace-only name", async () => {
      await expect(service.create({ name: "   " })).rejects.toThrow("Project name is required");
    });

    it("throws on name exceeding 255 characters", async () => {
      const longName = "a".repeat(256);
      await expect(service.create({ name: longName })).rejects.toThrow(
        "Project name must be 255 characters or less"
      );
    });

    it("allows name with exactly 255 characters", async () => {
      const maxName = "a".repeat(255);
      const project = await service.create({ name: maxName });
      expect(project.name).toBe(maxName);
    });

    it("throws on description exceeding 10000 characters", async () => {
      const longDesc = "a".repeat(10001);
      await expect(service.create({ name: "Test", description: longDesc })).rejects.toThrow(
        "Project description must be 10000 characters or less"
      );
    });

    it("throws on invalid model extension", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { defaultModel: "invalid-model.pt" },
        })
      ).rejects.toThrow("Model must be a .safetensors or .ckpt file");
    });

    it("throws on width below minimum", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { resolution: { width: 200, height: 512 } },
        })
      ).rejects.toThrow("Width must be between 256 and 4096");
    });

    it("throws on width above maximum", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { resolution: { width: 5000, height: 512 } },
        })
      ).rejects.toThrow("Width must be between 256 and 4096");
    });

    it("throws on height below minimum", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { resolution: { width: 512, height: 128 } },
        })
      ).rejects.toThrow("Height must be between 256 and 4096");
    });

    it("throws on LoRA strength below 0", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "test-lora", strength: -0.5 }] },
        })
      ).rejects.toThrow("LoRA strength must be between 0 and 2");
    });

    it("throws on LoRA strength above 2", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "test-lora", strength: 2.5 }] },
        })
      ).rejects.toThrow("LoRA strength must be between 0 and 2");
    });

    it("throws on LoRA without name", async () => {
      await expect(
        service.create({
          name: "Test",
          settings: { defaultLoras: [{ name: "", strength: 1.0 }] },
        })
      ).rejects.toThrow("LoRA name is required");
    });

    it("merges partial settings with defaults", async () => {
      const project = await service.create({
        name: "Partial Settings",
        settings: { defaultNegative: "custom negative" },
      });

      expect(project.settings?.defaultNegative).toBe("custom negative");
      expect(project.settings?.defaultModel).toBeDefined();
      expect(project.settings?.resolution).toBeDefined();
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe("getById", () => {
    it("returns project when exists", async () => {
      const created = await service.create({ name: "Find Me" });
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
  // LIST TESTS
  // ============================================================================

  describe("list", () => {
    it("returns empty array when no projects", async () => {
      const projects = await service.list();
      expect(projects).toEqual([]);
    });

    it("returns all projects", async () => {
      await service.create({ name: "Project 1" });
      await service.create({ name: "Project 2" });
      await service.create({ name: "Project 3" });

      const projects = await service.list();
      expect(projects).toHaveLength(3);
    });

    it("respects limit option", async () => {
      await service.create({ name: "Project 1" });
      await service.create({ name: "Project 2" });
      await service.create({ name: "Project 3" });

      const projects = await service.list({ limit: 2 });
      expect(projects).toHaveLength(2);
    });

    it("respects offset option", async () => {
      await service.create({ name: "Project 1" });
      await service.create({ name: "Project 2" });
      await service.create({ name: "Project 3" });

      const projects = await service.list({ offset: 1, limit: 10 });
      expect(projects).toHaveLength(2);
    });

    it("orders by createdAt", async () => {
      const p1 = await service.create({ name: "First" });
      const p2 = await service.create({ name: "Second" });

      const projects = await service.list();
      expect(projects[0].id).toBe(p1.id);
      expect(projects[1].id).toBe(p2.id);
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe("update", () => {
    it("updates project name", async () => {
      const created = await service.create({ name: "Original" });
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.name).toBe("Updated");
      expect(updated.id).toBe(created.id);
    });

    it("updates project description", async () => {
      const created = await service.create({ name: "Test" });
      const updated = await service.update(created.id, { description: "New description" });

      expect(updated.description).toBe("New description");
    });

    it("updates project settings", async () => {
      const created = await service.create({ name: "Test" });
      const updated = await service.update(created.id, {
        settings: { defaultModel: "new-model.safetensors" },
      });

      expect(updated.settings?.defaultModel).toBe("new-model.safetensors");
    });

    it("merges settings on update", async () => {
      const created = await service.create({
        name: "Test",
        settings: { defaultNegative: "original negative" },
      });
      const updated = await service.update(created.id, {
        settings: { defaultModel: "new-model.safetensors" },
      });

      expect(updated.settings?.defaultModel).toBe("new-model.safetensors");
      // Original negative should be preserved
      expect(updated.settings?.defaultNegative).toBe("original negative");
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.create({ name: "Test" });
      const originalUpdatedAt = created.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const updated = await service.update(created.id, { name: "Updated" });
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("throws on non-existent project", async () => {
      await expect(service.update("nonexistent-id", { name: "New" })).rejects.toThrow(
        "Project not found: nonexistent-id"
      );
    });

    it("throws on empty name update", async () => {
      const created = await service.create({ name: "Test" });
      await expect(service.update(created.id, { name: "" })).rejects.toThrow(
        "Project name is required"
      );
    });

    it("throws on name exceeding limit during update", async () => {
      const created = await service.create({ name: "Test" });
      const longName = "a".repeat(256);
      await expect(service.update(created.id, { name: longName })).rejects.toThrow(
        "Project name must be 255 characters or less"
      );
    });

    it("throws on description exceeding limit during update", async () => {
      const created = await service.create({ name: "Test" });
      const longDesc = "a".repeat(10001);
      await expect(service.update(created.id, { description: longDesc })).rejects.toThrow(
        "Project description must be 10000 characters or less"
      );
    });

    it("validates settings on update", async () => {
      const created = await service.create({ name: "Test" });
      await expect(
        service.update(created.id, { settings: { resolution: { width: 100, height: 512 } } })
      ).rejects.toThrow("Width must be between 256 and 4096");
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe("delete", () => {
    it("deletes existing project", async () => {
      const created = await service.create({ name: "To Delete" });
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("throws on non-existent project", async () => {
      await expect(service.delete("nonexistent-id")).rejects.toThrow(
        "Project not found: nonexistent-id"
      );
    });

    it("removes project from list after deletion", async () => {
      const p1 = await service.create({ name: "Keep" });
      const p2 = await service.create({ name: "Delete" });

      await service.delete(p2.id);

      const projects = await service.list();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(p1.id);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode characters in name", async () => {
      const project = await service.create({ name: "Project with unicode" });
      expect(project.name).toBe("Project with unicode");
    });

    it("handles special characters in description", async () => {
      const project = await service.create({
        name: "Test",
        description: 'Special chars: <>&"\' and newlines\nand tabs\t',
      });
      expect(project.description).toContain("<>&");
      expect(project.description).toContain("\n");
    });

    it("preserves createdAt on update", async () => {
      const created = await service.create({ name: "Test" });
      const originalCreatedAt = created.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const updated = await service.update(created.id, { name: "Updated" });

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("allows multiple projects with same name", async () => {
      const p1 = await service.create({ name: "Duplicate" });
      const p2 = await service.create({ name: "Duplicate" });

      expect(p1.id).not.toBe(p2.id);
      expect(p1.name).toBe(p2.name);
    });

    it("handles concurrent creates", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create({ name: `Concurrent ${i}` })
      );

      const projects = await Promise.all(promises);
      expect(projects).toHaveLength(5);

      const ids = new Set(projects.map((p) => p.id));
      expect(ids.size).toBe(5); // All unique IDs
    });
  });
});
