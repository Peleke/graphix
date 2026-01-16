/**
 * Contract tests for panel MCP tools
 *
 * Tests input schema validation and output structure for:
 * - panel_create
 * - panel_get
 * - panel_describe
 * - panel_add_character
 * - panel_remove_character
 * - panel_select_output
 * - panel_clear_selection
 * - panel_reorder
 * - panel_delete
 * - panel_generate
 * - panel_generate_variants
 * - panel_list_size_presets
 * - panel_list_quality_presets
 * - panel_recommend_size
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestStoryboard,
  createTestCharacter,
  setupMockComfyUI,
  mockComfyUIServer,
} from "@graphix/core/testing";

describe("panel tools contract", () => {
  let projectId: string;
  let storyboardId: string;

  beforeEach(async () => {
    setupTestDatabase();
    const project = await createTestProject();
    projectId = project.id;
    const storyboard = await createTestStoryboard(projectId);
    storyboardId = storyboard.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("panel_create", () => {
    it("accepts valid input with required storyboardId", async () => {
      const result = await handleToolCall("panel_create", { storyboardId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
      expect((result as any).panel).toHaveProperty("id");
      expect((result as any).panel).toHaveProperty("storyboardId", storyboardId);
    });

    it("accepts valid input with position", async () => {
      const result = await handleToolCall("panel_create", {
        storyboardId,
        position: 5,
      });

      expect(result).toHaveProperty("success", true);
      expect((result as any).panel).toHaveProperty("position", 5);
    });

    it("accepts valid input with description", async () => {
      const result = await handleToolCall("panel_create", {
        storyboardId,
        description: "Wide shot of the forest at dawn",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("panel_create", { description: "Test" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("creates unique panel IDs", async () => {
      const result1 = await handleToolCall("panel_create", { storyboardId });
      const result2 = await handleToolCall("panel_create", { storyboardId });

      expect((result1 as any).panel.id).not.toBe((result2 as any).panel.id);
    });

    it("auto-increments position when not specified", async () => {
      const result1 = await handleToolCall("panel_create", { storyboardId });
      const result2 = await handleToolCall("panel_create", { storyboardId });
      const result3 = await handleToolCall("panel_create", { storyboardId });

      expect((result1 as any).panel.position).toBeLessThan(
        (result2 as any).panel.position
      );
      expect((result2 as any).panel.position).toBeLessThan(
        (result3 as any).panel.position
      );
    });
  });

  describe("panel_get", () => {
    it("returns success and panel for valid ID", async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      const panelId = (created as any).panel.id;

      const result = await handleToolCall("panel_get", { panelId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
      expect((result as any).panel.id).toBe(panelId);
    });

    it("returns success false for non-existent ID", async () => {
      const result = await handleToolCall("panel_get", {
        panelId: "non-existent-id",
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_get", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_describe", () => {
    let panelId: string;

    beforeEach(async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("updates panel description", async () => {
      const result = await handleToolCall("panel_describe", {
        panelId,
        description: "A dramatic close-up of the hero",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
    });

    it("accepts valid cameraAngle enum value", async () => {
      const result = await handleToolCall("panel_describe", {
        panelId,
        cameraAngle: "close-up",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("accepts valid lighting enum value", async () => {
      const result = await handleToolCall("panel_describe", {
        panelId,
        lighting: "dramatic",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("accepts valid mood enum value", async () => {
      const result = await handleToolCall("panel_describe", {
        panelId,
        mood: "tense",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("accepts all direction fields together", async () => {
      const result = await handleToolCall("panel_describe", {
        panelId,
        description: "The final confrontation",
        cameraAngle: "low angle",
        lighting: "dramatic",
        mood: "action",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_describe", { description: "Test" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_add_character", () => {
    let panelId: string;
    let characterId: string;

    beforeEach(async () => {
      const createdPanel = await handleToolCall("panel_create", { storyboardId });
      panelId = (createdPanel as any).panel.id;

      const character = await createTestCharacter(projectId);
      characterId = character.id;
    });

    it("adds character to panel successfully", async () => {
      const result = await handleToolCall("panel_add_character", {
        panelId,
        characterId,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_add_character", { characterId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("panel_add_character", { panelId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_remove_character", () => {
    let panelId: string;
    let characterId: string;

    beforeEach(async () => {
      const createdPanel = await handleToolCall("panel_create", { storyboardId });
      panelId = (createdPanel as any).panel.id;

      const character = await createTestCharacter(projectId);
      characterId = character.id;

      await handleToolCall("panel_add_character", { panelId, characterId });
    });

    it("removes character from panel successfully", async () => {
      const result = await handleToolCall("panel_remove_character", {
        panelId,
        characterId,
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_remove_character", { characterId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing characterId", async () => {
      const result = await handleToolCall("panel_remove_character", { panelId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_select_output", () => {
    let panelId: string;

    beforeEach(async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_select_output", { generatedImageId: "some-id" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing generatedImageId", async () => {
      const result = await handleToolCall("panel_select_output", { panelId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_clear_selection", () => {
    let panelId: string;

    beforeEach(async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("clears selection successfully", async () => {
      const result = await handleToolCall("panel_clear_selection", { panelId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_clear_selection", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_reorder", () => {
    let panelId: string;

    beforeEach(async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("reorders panel successfully", async () => {
      const result = await handleToolCall("panel_reorder", {
        panelId,
        newPosition: 10,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("panel");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_reorder", { newPosition: 5 });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing newPosition", async () => {
      const result = await handleToolCall("panel_reorder", { panelId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_delete", () => {
    it("deletes panel successfully", async () => {
      const created = await handleToolCall("panel_create", { storyboardId });
      const panelId = (created as any).panel.id;

      const result = await handleToolCall("panel_delete", { panelId });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");

      // Verify deletion
      const getResult = await handleToolCall("panel_get", { panelId });
      expect(getResult).toHaveProperty("success", false);
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_delete", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_generate", () => {
    let panelId: string;

    beforeEach(async () => {
      setupMockComfyUI();
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("accepts valid input with only panelId", async () => {
      const result = await handleToolCall("panel_generate", { panelId });
      expect(result).toHaveProperty("success");
    });

    it("accepts valid input with size preset", async () => {
      const result = await handleToolCall("panel_generate", {
        panelId,
        sizePreset: "portrait_3x4",
      });
      expect(result).toHaveProperty("success");
    });

    it("accepts valid input with quality preset", async () => {
      const result = await handleToolCall("panel_generate", {
        panelId,
        qualityPreset: "draft",
      });
      expect(result).toHaveProperty("success");
    });

    it("accepts forComposition object", async () => {
      const result = await handleToolCall("panel_generate", {
        panelId,
        forComposition: {
          templateId: "six-grid",
          slotId: "slot-1",
        },
      });
      expect(result).toHaveProperty("success");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_generate", { model: "test.safetensors" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_generate_variants", () => {
    let panelId: string;

    beforeEach(async () => {
      setupMockComfyUI();
      const created = await handleToolCall("panel_create", { storyboardId });
      panelId = (created as any).panel.id;
    });

    it("accepts valid input with variant count", async () => {
      const result = await handleToolCall("panel_generate_variants", {
        panelId,
        count: 4,
      });
      expect(result).toHaveProperty("success");
    });

    it("returns error for missing panelId", async () => {
      const result = await handleToolCall("panel_generate_variants", { count: 4 });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panel_list_size_presets", () => {
    it("returns list of size presets without filter", async () => {
      const result = await handleToolCall("panel_list_size_presets", {});

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("presets");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("categories");
      expect(Array.isArray((result as any).presets)).toBe(true);
    });

    it("returns filtered presets by category", async () => {
      const result = await handleToolCall("panel_list_size_presets", {
        category: "portrait",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("category", "portrait");
      expect(result).toHaveProperty("presets");
    });
  });

  describe("panel_list_quality_presets", () => {
    it("returns list of quality presets", async () => {
      const result = await handleToolCall("panel_list_quality_presets", {});

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("presets");
      expect(result).toHaveProperty("count");
      expect(Array.isArray((result as any).presets)).toBe(true);

      // Check preset structure
      const presets = (result as any).presets;
      if (presets.length > 0) {
        expect(presets[0]).toHaveProperty("id");
        expect(presets[0]).toHaveProperty("name");
        expect(presets[0]).toHaveProperty("steps");
        expect(presets[0]).toHaveProperty("cfg");
      }
    });
  });

  describe("panel_recommend_size", () => {
    it("returns recommended size for valid slot", async () => {
      const result = await handleToolCall("panel_recommend_size", {
        templateId: "six-grid",
        slotId: "slot-1",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("templateId", "six-grid");
      expect(result).toHaveProperty("slotId", "slot-1");
      expect(result).toHaveProperty("recommended");
      expect((result as any).recommended).toHaveProperty("width");
      expect((result as any).recommended).toHaveProperty("height");
    });

    it("accepts optional pageSizePreset", async () => {
      const result = await handleToolCall("panel_recommend_size", {
        templateId: "six-grid",
        slotId: "slot-1",
        pageSizePreset: "comic_standard",
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing templateId", async () => {
      const result = await handleToolCall("panel_recommend_size", { slotId: "slot-1" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing slotId", async () => {
      const result = await handleToolCall("panel_recommend_size", { templateId: "six-grid" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
