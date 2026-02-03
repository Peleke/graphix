/**
 * Beat MCP Tools Contract Tests
 *
 * Tests for story beat management via MCP.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { beatTools, handleBeatTool } from "../../../mcp/tools/beat.tools.js";

// Mock the narrative service
const mockCreateBeat = vi.fn();
const mockCreateBeats = vi.fn();
const mockGetBeat = vi.fn();
const mockGetBeats = vi.fn();
const mockUpdateBeat = vi.fn();
const mockReorderBeats = vi.fn();
const mockDeleteBeat = vi.fn();
const mockLinkBeatToPanel = vi.fn();
const mockGeneratePromptFromBeat = vi.fn();

vi.mock("@graphix/core", () => ({
  getNarrativeService: () => ({
    createBeat: mockCreateBeat,
    createBeats: mockCreateBeats,
    getBeat: mockGetBeat,
    getBeats: mockGetBeats,
    updateBeat: mockUpdateBeat,
    reorderBeats: mockReorderBeats,
    deleteBeat: mockDeleteBeat,
    linkBeatToPanel: mockLinkBeatToPanel,
    generatePromptFromBeat: mockGeneratePromptFromBeat,
  }),
}));

describe("Beat MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Tool Schema Tests
  // ==========================================================================

  describe("Tool Schemas", () => {
    it("should export all beat tools", () => {
      expect(beatTools).toHaveProperty("story_beat_create");
      expect(beatTools).toHaveProperty("story_beat_create_batch");
      expect(beatTools).toHaveProperty("story_beat_get");
      expect(beatTools).toHaveProperty("story_beat_list");
      expect(beatTools).toHaveProperty("story_beat_update");
      expect(beatTools).toHaveProperty("story_beat_reorder");
      expect(beatTools).toHaveProperty("story_beat_delete");
      expect(beatTools).toHaveProperty("story_beat_to_panel");
      expect(beatTools).toHaveProperty("story_beat_to_prompt");
    });

    it("should have correct schema for story_beat_create", () => {
      const tool = beatTools.story_beat_create;
      expect(tool.name).toBe("story_beat_create");
      expect(tool.inputSchema.required).toContain("storyId");
      expect(tool.inputSchema.required).toContain("visualDescription");
      expect(tool.inputSchema.properties).toHaveProperty("beatType");
      expect(tool.inputSchema.properties).toHaveProperty("emotionalTone");
    });

    it("should have correct schema for story_beat_list", () => {
      const tool = beatTools.story_beat_list;
      expect(tool.name).toBe("story_beat_list");
      expect(tool.inputSchema.required).toContain("storyId");
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_create
  // ==========================================================================

  describe("story_beat_create", () => {
    it("should create a beat with required fields", async () => {
      const mockBeat = {
        id: "beat-1",
        storyId: "story-1",
        position: 0,
        visualDescription: "A wolf stands at the edge of the forest",
      };
      mockCreateBeat.mockResolvedValue(mockBeat);

      const result = await handleBeatTool("story_beat_create", {
        storyId: "story-1",
        visualDescription: "A wolf stands at the edge of the forest",
      });

      expect(result).toEqual({ success: true, beat: mockBeat });
      expect(mockCreateBeat).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: "story-1",
          visualDescription: "A wolf stands at the edge of the forest",
        })
      );
    });

    it("should create a beat with all optional fields", async () => {
      const mockBeat = {
        id: "beat-1",
        storyId: "story-1",
        position: 0,
        visualDescription: "A wolf stands at the edge",
        beatType: "setup",
        emotionalTone: "mysterious",
        cameraAngle: "wide shot",
      };
      mockCreateBeat.mockResolvedValue(mockBeat);

      const result = await handleBeatTool("story_beat_create", {
        storyId: "story-1",
        visualDescription: "A wolf stands at the edge",
        beatType: "setup",
        emotionalTone: "mysterious",
        cameraAngle: "wide shot",
        actNumber: 1,
        narration: "In the beginning...",
        sfx: "wind howling",
      });

      expect(result).toEqual({ success: true, beat: mockBeat });
    });

    it("should fail without storyId", async () => {
      const result = await handleBeatTool("story_beat_create", {
        visualDescription: "A wolf stands at the edge",
      });

      expect(result).toEqual({ success: false, error: "storyId is required" });
      expect(mockCreateBeat).not.toHaveBeenCalled();
    });

    it("should fail without visualDescription", async () => {
      const result = await handleBeatTool("story_beat_create", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: false, error: "visualDescription is required" });
      expect(mockCreateBeat).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_create_batch
  // ==========================================================================

  describe("story_beat_create_batch", () => {
    it("should create multiple beats", async () => {
      const mockBeats = [
        { id: "beat-1", position: 0, visualDescription: "Scene 1" },
        { id: "beat-2", position: 1, visualDescription: "Scene 2" },
      ];
      mockCreateBeats.mockResolvedValue(mockBeats);

      const result = await handleBeatTool("story_beat_create_batch", {
        storyId: "story-1",
        beats: [
          { visualDescription: "Scene 1" },
          { visualDescription: "Scene 2" },
        ],
      });

      expect(result).toEqual({ success: true, beats: mockBeats, count: 2 });
    });

    it("should fail without storyId", async () => {
      const result = await handleBeatTool("story_beat_create_batch", {
        beats: [{ visualDescription: "Scene 1" }],
      });

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });

    it("should fail without beats array", async () => {
      const result = await handleBeatTool("story_beat_create_batch", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: false, error: "beats array is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_get
  // ==========================================================================

  describe("story_beat_get", () => {
    it("should get a beat by ID", async () => {
      const mockBeat = { id: "beat-1", visualDescription: "A scene" };
      mockGetBeat.mockResolvedValue(mockBeat);

      const result = await handleBeatTool("story_beat_get", {
        beatId: "beat-1",
      });

      expect(result).toEqual({ success: true, beat: mockBeat });
    });

    it("should return error for non-existent beat", async () => {
      mockGetBeat.mockResolvedValue(null);

      const result = await handleBeatTool("story_beat_get", {
        beatId: "nonexistent",
      });

      expect(result).toEqual({ success: false, error: "Beat not found" });
    });

    it("should fail without beatId", async () => {
      const result = await handleBeatTool("story_beat_get", {});

      expect(result).toEqual({ success: false, error: "beatId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_list
  // ==========================================================================

  describe("story_beat_list", () => {
    it("should list beats for a story", async () => {
      const mockBeats = [
        { id: "beat-1", position: 0 },
        { id: "beat-2", position: 1 },
      ];
      mockGetBeats.mockResolvedValue(mockBeats);

      const result = await handleBeatTool("story_beat_list", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: true, beats: mockBeats, count: 2 });
    });

    it("should return empty array for story with no beats", async () => {
      mockGetBeats.mockResolvedValue([]);

      const result = await handleBeatTool("story_beat_list", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: true, beats: [], count: 0 });
    });

    it("should fail without storyId", async () => {
      const result = await handleBeatTool("story_beat_list", {});

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_update
  // ==========================================================================

  describe("story_beat_update", () => {
    it("should update a beat", async () => {
      const mockBeat = {
        id: "beat-1",
        visualDescription: "Updated description",
        emotionalTone: "tense",
      };
      mockUpdateBeat.mockResolvedValue(mockBeat);

      const result = await handleBeatTool("story_beat_update", {
        beatId: "beat-1",
        visualDescription: "Updated description",
        emotionalTone: "tense",
      });

      expect(result).toEqual({ success: true, beat: mockBeat });
      expect(mockUpdateBeat).toHaveBeenCalledWith("beat-1", expect.objectContaining({
        visualDescription: "Updated description",
        emotionalTone: "tense",
      }));
    });

    it("should fail without beatId", async () => {
      const result = await handleBeatTool("story_beat_update", {
        visualDescription: "Updated",
      });

      expect(result).toEqual({ success: false, error: "beatId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_reorder
  // ==========================================================================

  describe("story_beat_reorder", () => {
    it("should reorder beats", async () => {
      const mockBeats = [
        { id: "beat-2", position: 0 },
        { id: "beat-1", position: 1 },
      ];
      mockReorderBeats.mockResolvedValue(mockBeats);

      const result = await handleBeatTool("story_beat_reorder", {
        storyId: "story-1",
        beatIds: ["beat-2", "beat-1"],
      });

      expect(result).toEqual({ success: true, beats: mockBeats });
      expect(mockReorderBeats).toHaveBeenCalledWith("story-1", ["beat-2", "beat-1"]);
    });

    it("should fail without storyId", async () => {
      const result = await handleBeatTool("story_beat_reorder", {
        beatIds: ["beat-1"],
      });

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });

    it("should fail without beatIds array", async () => {
      const result = await handleBeatTool("story_beat_reorder", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: false, error: "beatIds array is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_delete
  // ==========================================================================

  describe("story_beat_delete", () => {
    it("should delete a beat", async () => {
      mockDeleteBeat.mockResolvedValue(undefined);

      const result = await handleBeatTool("story_beat_delete", {
        beatId: "beat-1",
      });

      expect(result).toEqual({ success: true, message: "Beat deleted" });
      expect(mockDeleteBeat).toHaveBeenCalledWith("beat-1");
    });

    it("should fail without beatId", async () => {
      const result = await handleBeatTool("story_beat_delete", {});

      expect(result).toEqual({ success: false, error: "beatId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_to_panel
  // ==========================================================================

  describe("story_beat_to_panel", () => {
    it("should convert beat to panel", async () => {
      const mockResult = {
        beat: { id: "beat-1", panelId: "panel-1" },
        panelId: "panel-1",
      };
      mockLinkBeatToPanel.mockResolvedValue(mockResult);

      const result = await handleBeatTool("story_beat_to_panel", {
        beatId: "beat-1",
        storyboardId: "storyboard-1",
      });

      expect(result).toEqual({
        success: true,
        beat: mockResult.beat,
        panelId: "panel-1",
      });
    });

    it("should fail without beatId", async () => {
      const result = await handleBeatTool("story_beat_to_panel", {
        storyboardId: "storyboard-1",
      });

      expect(result).toEqual({ success: false, error: "beatId is required" });
    });

    it("should fail without storyboardId", async () => {
      const result = await handleBeatTool("story_beat_to_panel", {
        beatId: "beat-1",
      });

      expect(result).toEqual({ success: false, error: "storyboardId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - story_beat_to_prompt
  // ==========================================================================

  describe("story_beat_to_prompt", () => {
    it("should generate prompt from beat", async () => {
      const mockPrompt = {
        positive: "a wolf in forest, wide shot",
        negative: "bad quality",
      };
      mockGeneratePromptFromBeat.mockResolvedValue(mockPrompt);

      const result = await handleBeatTool("story_beat_to_prompt", {
        beatId: "beat-1",
        style: "anime",
      });

      expect(result).toEqual({ success: true, prompt: mockPrompt });
      expect(mockGeneratePromptFromBeat).toHaveBeenCalledWith("beat-1", {
        style: "anime",
        includeCharacters: true,
        includeComposition: true,
      });
    });

    it("should fail without beatId", async () => {
      const result = await handleBeatTool("story_beat_to_prompt", {});

      expect(result).toEqual({ success: false, error: "beatId is required" });
    });
  });

  // ==========================================================================
  // Unknown Tool Handler
  // ==========================================================================

  describe("Unknown tool", () => {
    it("should throw for unknown tool", async () => {
      await expect(
        handleBeatTool("story_beat_unknown", {})
      ).rejects.toThrow("Unknown beat tool: story_beat_unknown");
    });
  });
});
