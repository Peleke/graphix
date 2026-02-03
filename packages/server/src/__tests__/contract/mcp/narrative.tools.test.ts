/**
 * Narrative MCP Tools Contract Tests
 *
 * Tests for premise and story CRUD via MCP.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { narrativeTools, handleNarrativeTool } from "../../../mcp/tools/narrative.tools.js";

// Mock the narrative service
const mockCreatePremise = vi.fn();
const mockGetPremise = vi.fn();
const mockGetPremiseWithStories = vi.fn();
const mockGetPremises = vi.fn();
const mockUpdatePremise = vi.fn();
const mockDeletePremise = vi.fn();

const mockCreateStory = vi.fn();
const mockGetStory = vi.fn();
const mockGetStoryWithBeats = vi.fn();
const mockGetStories = vi.fn();
const mockUpdateStory = vi.fn();
const mockDeleteStory = vi.fn();

vi.mock("@graphix/core", () => ({
  getNarrativeService: () => ({
    createPremise: mockCreatePremise,
    getPremise: mockGetPremise,
    getPremiseWithStories: mockGetPremiseWithStories,
    getPremises: mockGetPremises,
    updatePremise: mockUpdatePremise,
    deletePremise: mockDeletePremise,
    createStory: mockCreateStory,
    getStory: mockGetStory,
    getStoryWithBeats: mockGetStoryWithBeats,
    getStories: mockGetStories,
    updateStory: mockUpdateStory,
    deleteStory: mockDeleteStory,
  }),
}));

describe("Narrative MCP Tools", () => {
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
    it("should export all premise tools", () => {
      expect(narrativeTools).toHaveProperty("story_premise_create");
      expect(narrativeTools).toHaveProperty("story_premise_get");
      expect(narrativeTools).toHaveProperty("story_premise_get_with_stories");
      expect(narrativeTools).toHaveProperty("story_premise_list");
      expect(narrativeTools).toHaveProperty("story_premise_update");
      expect(narrativeTools).toHaveProperty("story_premise_delete");
    });

    it("should export all story tools", () => {
      expect(narrativeTools).toHaveProperty("narrative_story_create");
      expect(narrativeTools).toHaveProperty("narrative_story_get");
      expect(narrativeTools).toHaveProperty("narrative_story_get_with_beats");
      expect(narrativeTools).toHaveProperty("narrative_story_list");
      expect(narrativeTools).toHaveProperty("narrative_story_update");
      expect(narrativeTools).toHaveProperty("narrative_story_delete");
    });

    it("should have correct schema for story_premise_create", () => {
      const tool = narrativeTools.story_premise_create;
      expect(tool.name).toBe("story_premise_create");
      expect(tool.inputSchema.required).toContain("projectId");
      expect(tool.inputSchema.required).toContain("logline");
      expect(tool.inputSchema.properties).toHaveProperty("genre");
      expect(tool.inputSchema.properties).toHaveProperty("tone");
    });

    it("should have correct schema for narrative_story_create", () => {
      const tool = narrativeTools.narrative_story_create;
      expect(tool.name).toBe("narrative_story_create");
      expect(tool.inputSchema.required).toContain("premiseId");
      expect(tool.inputSchema.required).toContain("title");
      expect(tool.inputSchema.properties).toHaveProperty("structure");
    });
  });

  // ==========================================================================
  // Premise CRUD Tests
  // ==========================================================================

  describe("story_premise_create", () => {
    it("should create a premise with required fields", async () => {
      const mockPremise = {
        id: "premise-1",
        projectId: "project-1",
        logline: "A wolf finds her pack",
      };
      mockCreatePremise.mockResolvedValue(mockPremise);

      const result = await handleNarrativeTool("story_premise_create", {
        projectId: "project-1",
        logline: "A wolf finds her pack",
      });

      expect(result).toEqual({ success: true, premise: mockPremise });
      expect(mockCreatePremise).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-1",
          logline: "A wolf finds her pack",
        })
      );
    });

    it("should create a premise with all optional fields", async () => {
      const mockPremise = {
        id: "premise-1",
        projectId: "project-1",
        logline: "A wolf finds her pack",
        genre: "adventure",
        tone: "hopeful",
        themes: ["belonging", "family"],
      };
      mockCreatePremise.mockResolvedValue(mockPremise);

      const result = await handleNarrativeTool("story_premise_create", {
        projectId: "project-1",
        logline: "A wolf finds her pack",
        genre: "adventure",
        tone: "hopeful",
        themes: ["belonging", "family"],
        setting: "Northern wilderness",
      });

      expect(result).toEqual({ success: true, premise: mockPremise });
    });

    it("should fail without projectId", async () => {
      const result = await handleNarrativeTool("story_premise_create", {
        logline: "A wolf finds her pack",
      });

      expect(result).toEqual({ success: false, error: "projectId is required" });
      expect(mockCreatePremise).not.toHaveBeenCalled();
    });

    it("should fail without logline", async () => {
      const result = await handleNarrativeTool("story_premise_create", {
        projectId: "project-1",
      });

      expect(result).toEqual({ success: false, error: "logline is required" });
      expect(mockCreatePremise).not.toHaveBeenCalled();
    });
  });

  describe("story_premise_get", () => {
    it("should get a premise by ID", async () => {
      const mockPremise = { id: "premise-1", logline: "Test" };
      mockGetPremise.mockResolvedValue(mockPremise);

      const result = await handleNarrativeTool("story_premise_get", {
        premiseId: "premise-1",
      });

      expect(result).toEqual({ success: true, premise: mockPremise });
    });

    it("should return error for non-existent premise", async () => {
      mockGetPremise.mockResolvedValue(null);

      const result = await handleNarrativeTool("story_premise_get", {
        premiseId: "nonexistent",
      });

      expect(result).toEqual({ success: false, error: "Premise not found" });
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("story_premise_get", {});

      expect(result).toEqual({ success: false, error: "premiseId is required" });
    });
  });

  describe("story_premise_get_with_stories", () => {
    it("should get a premise with stories", async () => {
      const mockPremise = {
        id: "premise-1",
        logline: "Test",
        stories: [{ id: "story-1", title: "Chapter 1" }],
      };
      mockGetPremiseWithStories.mockResolvedValue(mockPremise);

      const result = await handleNarrativeTool("story_premise_get_with_stories", {
        premiseId: "premise-1",
      });

      expect(result).toEqual({
        success: true,
        premise: mockPremise,
        stories: mockPremise.stories,
      });
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("story_premise_get_with_stories", {});

      expect(result).toEqual({ success: false, error: "premiseId is required" });
    });
  });

  describe("story_premise_list", () => {
    it("should list premises for a project", async () => {
      const mockPremises = [
        { id: "premise-1", logline: "Story 1" },
        { id: "premise-2", logline: "Story 2" },
      ];
      mockGetPremises.mockResolvedValue(mockPremises);

      const result = await handleNarrativeTool("story_premise_list", {
        projectId: "project-1",
      });

      expect(result).toEqual({ success: true, premises: mockPremises, count: 2 });
    });

    it("should fail without projectId", async () => {
      const result = await handleNarrativeTool("story_premise_list", {});

      expect(result).toEqual({ success: false, error: "projectId is required" });
    });
  });

  describe("story_premise_update", () => {
    it("should update a premise", async () => {
      const mockPremise = { id: "premise-1", logline: "Updated logline", tone: "dark" };
      mockUpdatePremise.mockResolvedValue(mockPremise);

      const result = await handleNarrativeTool("story_premise_update", {
        premiseId: "premise-1",
        logline: "Updated logline",
        tone: "dark",
      });

      expect(result).toEqual({ success: true, premise: mockPremise });
      expect(mockUpdatePremise).toHaveBeenCalledWith("premise-1", expect.objectContaining({
        logline: "Updated logline",
        tone: "dark",
      }));
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("story_premise_update", {
        logline: "Updated",
      });

      expect(result).toEqual({ success: false, error: "premiseId is required" });
    });
  });

  describe("story_premise_delete", () => {
    it("should delete a premise", async () => {
      mockDeletePremise.mockResolvedValue(undefined);

      const result = await handleNarrativeTool("story_premise_delete", {
        premiseId: "premise-1",
      });

      expect(result).toEqual({ success: true, message: "Premise deleted" });
      expect(mockDeletePremise).toHaveBeenCalledWith("premise-1");
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("story_premise_delete", {});

      expect(result).toEqual({ success: false, error: "premiseId is required" });
    });
  });

  // ==========================================================================
  // Story CRUD Tests
  // ==========================================================================

  describe("narrative_story_create", () => {
    it("should create a story with required fields", async () => {
      const mockStory = {
        id: "story-1",
        premiseId: "premise-1",
        title: "Chapter 1",
      };
      mockCreateStory.mockResolvedValue(mockStory);

      const result = await handleNarrativeTool("narrative_story_create", {
        premiseId: "premise-1",
        title: "Chapter 1",
      });

      expect(result).toEqual({ success: true, story: mockStory });
      expect(mockCreateStory).toHaveBeenCalledWith(
        expect.objectContaining({
          premiseId: "premise-1",
          title: "Chapter 1",
        })
      );
    });

    it("should create a story with optional fields", async () => {
      const mockStory = {
        id: "story-1",
        premiseId: "premise-1",
        title: "Chapter 1",
        synopsis: "The journey begins",
        structure: "three-act",
      };
      mockCreateStory.mockResolvedValue(mockStory);

      const result = await handleNarrativeTool("narrative_story_create", {
        premiseId: "premise-1",
        title: "Chapter 1",
        synopsis: "The journey begins",
        structure: "three-act",
        targetLength: 10,
      });

      expect(result).toEqual({ success: true, story: mockStory });
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("narrative_story_create", {
        title: "Chapter 1",
      });

      expect(result).toEqual({ success: false, error: "premiseId is required" });
      expect(mockCreateStory).not.toHaveBeenCalled();
    });

    it("should fail without title", async () => {
      const result = await handleNarrativeTool("narrative_story_create", {
        premiseId: "premise-1",
      });

      expect(result).toEqual({ success: false, error: "title is required" });
      expect(mockCreateStory).not.toHaveBeenCalled();
    });
  });

  describe("narrative_story_get", () => {
    it("should get a story by ID", async () => {
      const mockStory = { id: "story-1", title: "Chapter 1" };
      mockGetStory.mockResolvedValue(mockStory);

      const result = await handleNarrativeTool("narrative_story_get", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: true, story: mockStory });
    });

    it("should return error for non-existent story", async () => {
      mockGetStory.mockResolvedValue(null);

      const result = await handleNarrativeTool("narrative_story_get", {
        storyId: "nonexistent",
      });

      expect(result).toEqual({ success: false, error: "Story not found" });
    });

    it("should fail without storyId", async () => {
      const result = await handleNarrativeTool("narrative_story_get", {});

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });
  });

  describe("narrative_story_get_with_beats", () => {
    it("should get a story with beats", async () => {
      const mockStory = {
        id: "story-1",
        title: "Chapter 1",
        beats: [{ id: "beat-1", visualDescription: "Scene 1" }],
      };
      mockGetStoryWithBeats.mockResolvedValue(mockStory);

      const result = await handleNarrativeTool("narrative_story_get_with_beats", {
        storyId: "story-1",
      });

      expect(result).toEqual({
        success: true,
        story: mockStory,
        beats: mockStory.beats,
      });
    });

    it("should fail without storyId", async () => {
      const result = await handleNarrativeTool("narrative_story_get_with_beats", {});

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });
  });

  describe("narrative_story_list", () => {
    it("should list stories for a premise", async () => {
      const mockStories = [
        { id: "story-1", title: "Chapter 1" },
        { id: "story-2", title: "Chapter 2" },
      ];
      mockGetStories.mockResolvedValue(mockStories);

      const result = await handleNarrativeTool("narrative_story_list", {
        premiseId: "premise-1",
      });

      expect(result).toEqual({ success: true, stories: mockStories, count: 2 });
    });

    it("should fail without premiseId", async () => {
      const result = await handleNarrativeTool("narrative_story_list", {});

      expect(result).toEqual({ success: false, error: "premiseId is required" });
    });
  });

  describe("narrative_story_update", () => {
    it("should update a story", async () => {
      const mockStory = { id: "story-1", title: "Updated Title", structure: "five-act" };
      mockUpdateStory.mockResolvedValue(mockStory);

      const result = await handleNarrativeTool("narrative_story_update", {
        storyId: "story-1",
        title: "Updated Title",
        structure: "five-act",
      });

      expect(result).toEqual({ success: true, story: mockStory });
      expect(mockUpdateStory).toHaveBeenCalledWith("story-1", expect.objectContaining({
        title: "Updated Title",
        structure: "five-act",
      }));
    });

    it("should fail without storyId", async () => {
      const result = await handleNarrativeTool("narrative_story_update", {
        title: "Updated",
      });

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });
  });

  describe("narrative_story_delete", () => {
    it("should delete a story", async () => {
      mockDeleteStory.mockResolvedValue(undefined);

      const result = await handleNarrativeTool("narrative_story_delete", {
        storyId: "story-1",
      });

      expect(result).toEqual({ success: true, message: "Story deleted" });
      expect(mockDeleteStory).toHaveBeenCalledWith("story-1");
    });

    it("should fail without storyId", async () => {
      const result = await handleNarrativeTool("narrative_story_delete", {});

      expect(result).toEqual({ success: false, error: "storyId is required" });
    });
  });

  // ==========================================================================
  // Unknown Tool Handler
  // ==========================================================================

  describe("Unknown tool", () => {
    it("should throw for unknown tool", async () => {
      await expect(
        handleNarrativeTool("narrative_unknown", {})
      ).rejects.toThrow("Unknown narrative tool: narrative_unknown");
    });
  });
});
