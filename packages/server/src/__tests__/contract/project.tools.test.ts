/**
 * Contract tests for project MCP tools
 *
 * Tests input schema validation and output structure for:
 * - project_create
 * - project_get
 * - project_list
 * - project_update
 * - project_delete
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("project tools contract", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("project_create", () => {
    it("accepts valid input with only required fields", async () => {
      const result = await handleToolCall("project_create", {
        name: "Test Project",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("project");
      expect((result as any).project).toHaveProperty("id");
      expect((result as any).project).toHaveProperty("name", "Test Project");
    });

    it("accepts valid input with all optional fields", async () => {
      const result = await handleToolCall("project_create", {
        name: "Full Project",
        description: "A complete project with all fields",
        defaultModel: "yiffInHell_yihXXXTended.safetensors",
        width: 1024,
        height: 768,
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).project).toHaveProperty("name", "Full Project");
      expect((result as any).project).toHaveProperty(
        "description",
        "A complete project with all fields"
      );
    });

    it("returns error for missing name", async () => {
      const result = await handleToolCall("project_create", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("creates unique project IDs", async () => {
      const result1 = await handleToolCall("project_create", { name: "Project 1" });
      const result2 = await handleToolCall("project_create", { name: "Project 2" });

      expect((result1 as any).project.id).not.toBe((result2 as any).project.id);
    });
  });

  describe("project_get", () => {
    it("returns success and project for valid ID", async () => {
      const created = await handleToolCall("project_create", { name: "Test" });
      const projectId = (created as any).project.id;

      const result = await handleToolCall("project_get", { projectId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("project");
      expect((result as any).project.id).toBe(projectId);
    });

    it("returns success false for non-existent ID", async () => {
      const result = await handleToolCall("project_get", {
        projectId: "non-existent-id",
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("project_get", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("project_list", () => {
    it("returns empty list when no projects exist", async () => {
      const result = await handleToolCall("project_list", {});

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("projects");
      expect(result).toHaveProperty("count", 0);
      expect((result as any).projects).toEqual([]);
    });

    it("returns all created projects", async () => {
      await handleToolCall("project_create", { name: "Project 1" });
      await handleToolCall("project_create", { name: "Project 2" });
      await handleToolCall("project_create", { name: "Project 3" });

      const result = await handleToolCall("project_list", {});

      expect(result).toHaveProperty("success", true);
      expect((result as any).projects).toHaveLength(3);
      expect((result as any).count).toBe(3);
    });

    it("respects limit parameter", async () => {
      await handleToolCall("project_create", { name: "Project 1" });
      await handleToolCall("project_create", { name: "Project 2" });
      await handleToolCall("project_create", { name: "Project 3" });

      const result = await handleToolCall("project_list", { limit: 2 });

      expect((result as any).projects).toHaveLength(2);
    });

    it("respects offset parameter", async () => {
      await handleToolCall("project_create", { name: "Project 1" });
      await handleToolCall("project_create", { name: "Project 2" });
      await handleToolCall("project_create", { name: "Project 3" });

      const result = await handleToolCall("project_list", { offset: 1, limit: 10 });

      expect((result as any).projects).toHaveLength(2);
    });
  });

  describe("project_update", () => {
    it("updates project name successfully", async () => {
      const created = await handleToolCall("project_create", { name: "Original" });
      const projectId = (created as any).project.id;

      const result = await handleToolCall("project_update", {
        projectId,
        name: "Updated Name",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).project.name).toBe("Updated Name");
    });

    it("updates project description successfully", async () => {
      const created = await handleToolCall("project_create", { name: "Test" });
      const projectId = (created as any).project.id;

      const result = await handleToolCall("project_update", {
        projectId,
        description: "New description",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).project.description).toBe("New description");
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("project_update", { name: "New Name" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("project_delete", () => {
    it("deletes project successfully", async () => {
      const created = await handleToolCall("project_create", { name: "To Delete" });
      const projectId = (created as any).project.id;

      const result = await handleToolCall("project_delete", { projectId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");

      // Verify deletion
      const getResult = await handleToolCall("project_get", { projectId });
      expect(getResult).toHaveProperty("success", false);
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("project_delete", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
