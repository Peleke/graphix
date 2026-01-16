/**
 * Contract tests for storyboard MCP tools
 *
 * Tests input schema validation and output structure for:
 * - storyboard_create
 * - storyboard_get
 * - storyboard_list
 * - storyboard_update
 * - storyboard_duplicate
 * - storyboard_delete
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
} from "@graphix/core/testing";

describe("storyboard tools contract", () => {
  let projectId: string;

  beforeEach(async () => {
    setupTestDatabase();
    const project = await createTestProject();
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("storyboard_create", () => {
    it("accepts valid input with required fields", async () => {
      const result = await handleToolCall("storyboard_create", {
        projectId,
        name: "Chapter 1",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("storyboard");
      expect((result as any).storyboard).toHaveProperty("id");
      expect((result as any).storyboard).toHaveProperty("name", "Chapter 1");
    });

    it("accepts valid input with optional description", async () => {
      const result = await handleToolCall("storyboard_create", {
        projectId,
        name: "Chapter 1",
        description: "The adventure begins in the forest",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboard.description).toBe(
        "The adventure begins in the forest"
      );
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("storyboard_create", { name: "Test" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing name", async () => {
      const result = await handleToolCall("storyboard_create", { projectId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("creates unique storyboard IDs", async () => {
      const result1 = await handleToolCall("storyboard_create", {
        projectId,
        name: "Story 1",
      });
      const result2 = await handleToolCall("storyboard_create", {
        projectId,
        name: "Story 2",
      });

      expect((result1 as any).storyboard.id).not.toBe(
        (result2 as any).storyboard.id
      );
    });
  });

  describe("storyboard_get", () => {
    it("returns success and storyboard for valid ID", async () => {
      const created = await handleToolCall("storyboard_create", {
        projectId,
        name: "Test Storyboard",
      });
      const storyboardId = (created as any).storyboard.id;

      const result = await handleToolCall("storyboard_get", { storyboardId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("storyboard");
      expect((result as any).storyboard.id).toBe(storyboardId);
    });

    it("returns success false for non-existent ID", async () => {
      const result = await handleToolCall("storyboard_get", {
        storyboardId: "non-existent-id",
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("storyboard_get", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("storyboard_list", () => {
    it("returns empty list when no storyboards exist", async () => {
      const result = await handleToolCall("storyboard_list", { projectId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("storyboards");
      expect(result).toHaveProperty("count", 0);
      expect((result as any).storyboards).toEqual([]);
    });

    it("returns all storyboards in project", async () => {
      await handleToolCall("storyboard_create", { projectId, name: "Chapter 1" });
      await handleToolCall("storyboard_create", { projectId, name: "Chapter 2" });
      await handleToolCall("storyboard_create", { projectId, name: "Chapter 3" });

      const result = await handleToolCall("storyboard_list", { projectId });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboards).toHaveLength(3);
      expect((result as any).count).toBe(3);
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("storyboard_list", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("storyboard_update", () => {
    let storyboardId: string;

    beforeEach(async () => {
      const created = await handleToolCall("storyboard_create", {
        projectId,
        name: "Original",
      });
      storyboardId = (created as any).storyboard.id;
    });

    it("updates storyboard name successfully", async () => {
      const result = await handleToolCall("storyboard_update", {
        storyboardId,
        name: "Updated Name",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboard.name).toBe("Updated Name");
    });

    it("updates storyboard description successfully", async () => {
      const result = await handleToolCall("storyboard_update", {
        storyboardId,
        description: "New description",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboard.description).toBe("New description");
    });

    it("updates both name and description", async () => {
      const result = await handleToolCall("storyboard_update", {
        storyboardId,
        name: "New Name",
        description: "New Desc",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboard.name).toBe("New Name");
      expect((result as any).storyboard.description).toBe("New Desc");
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("storyboard_update", { name: "New Name" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("storyboard_duplicate", () => {
    let storyboardId: string;

    beforeEach(async () => {
      const created = await handleToolCall("storyboard_create", {
        projectId,
        name: "Original Storyboard",
        description: "The original",
      });
      storyboardId = (created as any).storyboard.id;
    });

    it("duplicates storyboard with default name", async () => {
      const result = await handleToolCall("storyboard_duplicate", {
        storyboardId,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("storyboard");
      expect((result as any).storyboard.id).not.toBe(storyboardId);
    });

    it("duplicates storyboard with custom name", async () => {
      const result = await handleToolCall("storyboard_duplicate", {
        storyboardId,
        newName: "My Custom Copy",
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).storyboard.name).toBe("My Custom Copy");
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("storyboard_duplicate", { newName: "Copy" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("storyboard_delete", () => {
    it("deletes storyboard successfully", async () => {
      const created = await handleToolCall("storyboard_create", {
        projectId,
        name: "To Delete",
      });
      const storyboardId = (created as any).storyboard.id;

      const result = await handleToolCall("storyboard_delete", { storyboardId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");

      // Verify deletion
      const getResult = await handleToolCall("storyboard_get", { storyboardId });
      expect(getResult).toHaveProperty("success", false);
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("storyboard_delete", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
