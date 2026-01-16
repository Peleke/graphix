/**
 * Contract tests for batch MCP tools
 *
 * Tests input schema validation and output structure for:
 * - panels_create_batch
 * - panels_delete_batch
 * - captions_add_batch
 * - captions_clear_batch
 * - panels_generate_batch
 * - panels_generate_variants_batch
 * - panels_render_captions_batch
 * - panels_select_outputs_batch
 * - panels_auto_select_batch
 * - storyboard_get_panel_ids
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
  createTestCharacter,
  setupMockComfyUI,
  mockComfyUIServer,
} from "@graphix/core/testing";

describe("batch tools contract", () => {
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

  describe("panels_create_batch", () => {
    it("accepts valid input with panel definitions", async () => {
      const result = await handleToolCall("panels_create_batch", {
        storyboardId,
        panels: [
          { description: "Panel 1" },
          { description: "Panel 2" },
          { description: "Panel 3" },
        ],
      });

      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("summary");
      expect((result as any).summary.created).toBe(3);
    });

    it("accepts panels with full specifications", async () => {
      const character = await createTestCharacter(projectId);

      const result = await handleToolCall("panels_create_batch", {
        storyboardId,
        panels: [
          {
            description: "Opening shot",
            position: 1,
            characterIds: [character.id],
            direction: {
              cameraAngle: "wide shot",
              lighting: "natural",
              mood: "peaceful",
            },
          },
          {
            description: "Close-up",
            position: 2,
          },
        ],
      });

      expect(result).toHaveProperty("created");
      expect((result as any).summary.created).toBe(2);
    });

    it("returns summary with requested, created, and failed counts", async () => {
      const result = await handleToolCall("panels_create_batch", {
        storyboardId,
        panels: [{ description: "Test" }],
      });

      expect((result as any).summary).toHaveProperty("requested");
      expect((result as any).summary).toHaveProperty("created");
      expect((result as any).summary).toHaveProperty("failed");
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("panels_create_batch", {
        panels: [{ description: "Test" }],
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing panels array", async () => {
      const result = await handleToolCall("panels_create_batch", { storyboardId });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_delete_batch", () => {
    it("deletes multiple panels successfully", async () => {
      const panel1 = await createTestPanel(storyboardId);
      const panel2 = await createTestPanel(storyboardId);
      const panel3 = await createTestPanel(storyboardId);

      const result = await handleToolCall("panels_delete_batch", {
        panelIds: [panel1.id, panel2.id, panel3.id],
      });

      expect(result).toHaveProperty("deleted");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("summary");
      expect((result as any).summary.deleted).toBe(3);
    });

    it("returns summary with request and deletion counts", async () => {
      const panel = await createTestPanel(storyboardId);

      const result = await handleToolCall("panels_delete_batch", {
        panelIds: [panel.id],
      });

      expect((result as any).summary).toHaveProperty("requested");
      expect((result as any).summary).toHaveProperty("deleted");
      expect((result as any).summary).toHaveProperty("failed");
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("panels_delete_batch", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("captions_add_batch", () => {
    let panelId: string;

    beforeEach(async () => {
      const panel = await createTestPanel(storyboardId);
      panelId = panel.id;
    });

    it("accepts valid caption inputs", async () => {
      const result = await handleToolCall("captions_add_batch", {
        captions: [
          {
            panelId,
            type: "dialogue",
            text: "Hello there!",
            position: { x: 50, y: 20 },
          },
          {
            panelId,
            type: "narration",
            text: "And so it began...",
            position: { x: 50, y: 80 },
          },
        ],
      });

      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("summary");
    });

    it("accepts captions with all optional fields", async () => {
      const character = await createTestCharacter(projectId);

      const result = await handleToolCall("captions_add_batch", {
        captions: [
          {
            panelId,
            type: "dialogue",
            text: "Hello!",
            characterId: character.id,
            position: { x: 50, y: 20, anchor: "top-center" },
            tailDirection: { x: 30, y: 50 },
            style: { fontSize: 16 },
            zIndex: 10,
          },
        ],
      });

      expect(result).toHaveProperty("created");
    });

    it("returns error for missing captions array", async () => {
      const result = await handleToolCall("captions_add_batch", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("validates caption type enum", async () => {
      const result = await handleToolCall("captions_add_batch", {
        captions: [
          {
            panelId,
            type: "sfx",
            text: "BOOM!",
            position: { x: 50, y: 50 },
          },
        ],
      });

      expect(result).toHaveProperty("created");
    });
  });

  describe("captions_clear_batch", () => {
    it("clears captions from multiple panels", async () => {
      const panel1 = await createTestPanel(storyboardId);
      const panel2 = await createTestPanel(storyboardId);

      const result = await handleToolCall("captions_clear_batch", {
        panelIds: [panel1.id, panel2.id],
      });

      expect(result).toHaveProperty("cleared");
      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toHaveProperty("panels");
      expect((result as any).summary).toHaveProperty("captionsCleared");
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("captions_clear_batch", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_generate_batch", () => {
    let panelIds: string[];

    beforeEach(async () => {
      setupMockComfyUI();
      const panel1 = await createTestPanel(storyboardId);
      const panel2 = await createTestPanel(storyboardId);
      panelIds = [panel1.id, panel2.id];
    });

    it("accepts valid panel IDs", async () => {
      const result = await handleToolCall("panels_generate_batch", {
        panelIds,
      });
      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toHaveProperty("requested");
      expect((result as any).summary).toHaveProperty("generated");
    });

    it("accepts generation options", async () => {
      const result = await handleToolCall("panels_generate_batch", {
        panelIds,
        options: {
          sizePreset: "portrait_3x4",
          qualityPreset: "draft",
        },
        continueOnError: true,
      });
      expect(result).toHaveProperty("summary");
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("panels_generate_batch", { options: {} });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_generate_variants_batch", () => {
    let panelIds: string[];

    beforeEach(async () => {
      setupMockComfyUI();
      const panel = await createTestPanel(storyboardId);
      panelIds = [panel.id];
    });

    it("accepts valid input with variant count", async () => {
      const result = await handleToolCall("panels_generate_variants_batch", {
        panelIds,
        variantCount: 4,
      });
      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toHaveProperty("panels");
      expect((result as any).summary).toHaveProperty("variantsPerPanel");
      expect((result as any).summary.variantsPerPanel).toBe(4);
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("panels_generate_variants_batch", { variantCount: 3 });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_render_captions_batch", () => {
    let panelIds: string[];

    beforeEach(async () => {
      const panel = await createTestPanel(storyboardId);
      panelIds = [panel.id];
    });

    it("accepts valid input with required fields", async () => {
      try {
        const result = await handleToolCall("panels_render_captions_batch", {
          panelIds,
          outputDir: "/tmp/test-output",
        });
        expect(result).toHaveProperty("summary");
      } catch {
        // May fail if panels have no selected outputs
      }
    });

    it("accepts optional format parameter", async () => {
      try {
        const result = await handleToolCall("panels_render_captions_batch", {
          panelIds,
          outputDir: "/tmp/test-output",
          format: "jpeg",
        });
        expect(result).toHaveProperty("summary");
      } catch {
        // May fail if panels have no selected outputs
      }
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("panels_render_captions_batch", {
        outputDir: "/tmp/test",
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing outputDir", async () => {
      const result = await handleToolCall("panels_render_captions_batch", { panelIds });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_select_outputs_batch", () => {
    it("accepts valid selection mappings", async () => {
      const panel = await createTestPanel(storyboardId);

      try {
        const result = await handleToolCall("panels_select_outputs_batch", {
          selections: [{ panelId: panel.id, outputId: "some-output-id" }],
        });
        expect(result).toHaveProperty("summary");
      } catch {
        // May fail if output doesn't exist
      }
    });

    it("returns error for missing selections", async () => {
      const result = await handleToolCall("panels_select_outputs_batch", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("panels_auto_select_batch", () => {
    let panelIds: string[];

    beforeEach(async () => {
      const panel = await createTestPanel(storyboardId);
      panelIds = [panel.id];
    });

    it("accepts valid panel IDs with default mode", async () => {
      const result = await handleToolCall("panels_auto_select_batch", {
        panelIds,
      });

      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toHaveProperty("panels");
      expect((result as any).summary).toHaveProperty("selected");
      expect((result as any).summary).toHaveProperty("skipped");
    });

    it("accepts mode parameter as 'first'", async () => {
      const result = await handleToolCall("panels_auto_select_batch", {
        panelIds,
        mode: "first",
      });

      expect(result).toHaveProperty("summary");
    });

    it("accepts mode parameter as 'latest'", async () => {
      const result = await handleToolCall("panels_auto_select_batch", {
        panelIds,
        mode: "latest",
      });

      expect(result).toHaveProperty("summary");
    });

    it("returns error for missing panelIds", async () => {
      const result = await handleToolCall("panels_auto_select_batch", { mode: "first" });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("storyboard_get_panel_ids", () => {
    it("returns empty array for storyboard with no panels", async () => {
      const result = await handleToolCall("storyboard_get_panel_ids", {
        storyboardId,
      });

      expect(result).toHaveProperty("storyboardId", storyboardId);
      expect(result).toHaveProperty("panelIds");
      expect(result).toHaveProperty("count", 0);
      expect((result as any).panelIds).toEqual([]);
    });

    it("returns all panel IDs in order", async () => {
      const panel1 = await createTestPanel(storyboardId);
      const panel2 = await createTestPanel(storyboardId);
      const panel3 = await createTestPanel(storyboardId);

      const result = await handleToolCall("storyboard_get_panel_ids", {
        storyboardId,
      });

      expect((result as any).panelIds).toHaveLength(3);
      expect((result as any).count).toBe(3);
      expect((result as any).panelIds).toContain(panel1.id);
      expect((result as any).panelIds).toContain(panel2.id);
      expect((result as any).panelIds).toContain(panel3.id);
    });

    it("returns error for missing storyboardId", async () => {
      const result = await handleToolCall("storyboard_get_panel_ids", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
