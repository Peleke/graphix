/**
 * MCP Workflow Integration Tests
 *
 * End-to-end tests for the MCP tools workflow.
 * These tests use real services (with test database) to verify the full workflow.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  getProjectService,
  getStoryboardService,
  getPanelService,
  getNarrativeService,
} from "@graphix/core";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
} from "@graphix/core/testing";
import { handleToolCall } from "../../mcp/tools/index.js";

describe("MCP Workflow Integration", () => {
  beforeAll(async () => {
    // Initialize test database with schema
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    // Reset services to clear caches
    resetAllServices();
  });

  describe("Beat CRUD Workflow", () => {
    it("should create a project, story, and manage beats end-to-end", async () => {
      // Step 1: Create a project
      const projectResult = (await handleToolCall("project_create", {
        name: "E2E Test Comic",
        description: "Testing the full workflow",
      })) as { success: boolean; project?: { id: string } };

      expect(projectResult.success).toBe(true);
      expect(projectResult.project).toBeDefined();
      const projectId = projectResult.project!.id;

      // Step 2: Create a premise for the project
      const narrativeService = getNarrativeService();
      const premise = await narrativeService.createPremise({
        projectId,
        title: "A Wolf's Journey",
        logline: "A lone wolf finds her pack",
        genre: "Adventure",
        tone: "Hopeful",
      });
      expect(premise.id).toBeDefined();

      // Step 3: Create a story
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Chapter 1",
        structure: "three-act",
      });
      expect(story.id).toBeDefined();

      // Step 4: Create beats via MCP tool
      const beat1Result = (await handleToolCall("story_beat_create", {
        storyId: story.id,
        visualDescription: "A gray wolf stands alone on a snowy hilltop at dawn",
        beatType: "setup",
        emotionalTone: "lonely",
        cameraAngle: "wide shot",
      })) as { success: boolean; beat?: { id: string; visualDescription: string } };

      expect(beat1Result.success).toBe(true);
      expect(beat1Result.beat).toBeDefined();
      expect(beat1Result.beat!.visualDescription).toContain("gray wolf");

      // Step 5: Create more beats in batch
      const batchResult = (await handleToolCall("story_beat_create_batch", {
        storyId: story.id,
        beats: [
          {
            visualDescription: "The wolf howls, echoing across the valley",
            beatType: "inciting",
            emotionalTone: "yearning",
          },
          {
            visualDescription: "A distant howl answers from the forest",
            beatType: "rising",
            emotionalTone: "hopeful",
          },
          {
            visualDescription: "The wolf runs towards the forest",
            beatType: "climax",
            emotionalTone: "determined",
          },
        ],
      })) as { success: boolean; beats?: Array<{ id: string }>; count?: number };

      expect(batchResult.success).toBe(true);
      expect(batchResult.count).toBe(3);

      // Step 6: List all beats
      const listResult = (await handleToolCall("story_beat_list", {
        storyId: story.id,
      })) as { success: boolean; beats?: Array<{ id: string }>; count?: number };

      expect(listResult.success).toBe(true);
      expect(listResult.count).toBe(4); // 1 + 3

      // Step 7: Update a beat
      const beatId = beat1Result.beat!.id;
      const updateResult = (await handleToolCall("story_beat_update", {
        beatId,
        emotionalTone: "contemplative",
        narration: "She had been alone for too long.",
      })) as { success: boolean; beat?: { emotionalTone: string; narration: string } };

      expect(updateResult.success).toBe(true);
      expect(updateResult.beat!.emotionalTone).toBe("contemplative");
      expect(updateResult.beat!.narration).toBe("She had been alone for too long.");

      // Step 8: Get a specific beat
      const getResult = (await handleToolCall("story_beat_get", {
        beatId,
      })) as { success: boolean; beat?: { id: string } };

      expect(getResult.success).toBe(true);
      expect(getResult.beat!.id).toBe(beatId);

      // Step 9: Delete a beat
      const deleteResult = (await handleToolCall("story_beat_delete", {
        beatId,
      })) as { success: boolean; message?: string };

      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const listAfterDelete = (await handleToolCall("story_beat_list", {
        storyId: story.id,
      })) as { success: boolean; count?: number };

      expect(listAfterDelete.count).toBe(3);
    });

    it("should convert beat to panel", async () => {
      // Setup: Create project, story, storyboard, beat
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const narrativeService = getNarrativeService();

      const project = await projectService.create({
        name: "Beat to Panel Test",
      });

      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Main Storyboard",
      });

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        title: "Quick Story",
        logline: "Test",
        genre: "Test",
        tone: "Test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Test Chapter",
        structure: "three-act",
      });

      // Create a beat with rich visual description
      const beatResult = (await handleToolCall("story_beat_create", {
        storyId: story.id,
        visualDescription:
          "A majestic wolf with silver fur standing in a moonlit forest clearing, ancient trees in background",
        beatType: "setup",
        emotionalTone: "mystical",
        cameraAngle: "medium shot",
      })) as { success: boolean; beat?: { id: string } };

      expect(beatResult.success).toBe(true);
      const beatId = beatResult.beat!.id;

      // Convert beat to panel
      const toPanelResult = (await handleToolCall("story_beat_to_panel", {
        beatId,
        storyboardId: storyboard.id,
      })) as { success: boolean; panelId?: string; beat?: { panelId: string } };

      expect(toPanelResult.success).toBe(true);
      expect(toPanelResult.panelId).toBeDefined();

      // Verify panel was created with beat data
      const panelService = getPanelService();
      const panel = await panelService.getById(toPanelResult.panelId!);
      expect(panel).toBeDefined();
      expect(panel!.description).toContain("wolf");

      // Verify beat is now linked to panel
      expect(toPanelResult.beat?.panelId).toBe(toPanelResult.panelId);
    });

    // Note: beat_to_prompt requires an LLM provider (Ollama/Anthropic)
    // This test is skipped in CI but can be run locally with ALLOW_LOCAL_OLLAMA=true
    it.skip("should generate prompt from beat (requires LLM)", async () => {
      const narrativeService = getNarrativeService();
      const projectService = getProjectService();

      const project = await projectService.create({ name: "Prompt Gen Test" });
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        title: "Test",
        logline: "Test",
        genre: "Test",
        tone: "Test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Test",
        structure: "three-act",
      });

      const beatResult = (await handleToolCall("story_beat_create", {
        storyId: story.id,
        visualDescription: "A wolf howling at the moon",
        emotionalTone: "mystical",
      })) as { success: boolean; beat?: { id: string } };

      const promptResult = (await handleToolCall("story_beat_to_prompt", {
        beatId: beatResult.beat!.id,
        style: "anime",
      })) as { success: boolean; prompt?: { positive: string; negative: string } };

      expect(promptResult.success).toBe(true);
      expect(promptResult.prompt).toBeDefined();
      expect(promptResult.prompt!.positive).toBeDefined();
      expect(promptResult.prompt!.positive.length).toBeGreaterThan(10);
    });

    it("should reorder beats correctly", async () => {
      const narrativeService = getNarrativeService();
      const projectService = getProjectService();

      const project = await projectService.create({ name: "Reorder Test" });
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        title: "Reorder",
        logline: "Test",
        genre: "Test",
        tone: "Test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Test",
        structure: "three-act",
      });

      // Create beats
      const beat1 = await narrativeService.createBeat({
        storyId: story.id,
        visualDescription: "First scene",
        position: 0,
      });
      const beat2 = await narrativeService.createBeat({
        storyId: story.id,
        visualDescription: "Second scene",
        position: 1,
      });
      const beat3 = await narrativeService.createBeat({
        storyId: story.id,
        visualDescription: "Third scene",
        position: 2,
      });

      // Reorder: move third to first
      const reorderResult = (await handleToolCall("story_beat_reorder", {
        storyId: story.id,
        beatIds: [beat3.id, beat1.id, beat2.id],
      })) as { success: boolean; beats?: Array<{ id: string; position: number }> };

      expect(reorderResult.success).toBe(true);
      expect(reorderResult.beats![0].id).toBe(beat3.id);
      expect(reorderResult.beats![0].position).toBe(0);
      expect(reorderResult.beats![1].id).toBe(beat1.id);
      expect(reorderResult.beats![1].position).toBe(1);
      expect(reorderResult.beats![2].id).toBe(beat2.id);
      expect(reorderResult.beats![2].position).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should return error for non-existent beat", async () => {
      const result = (await handleToolCall("story_beat_get", {
        beatId: "nonexistent-id",
      })) as { success: boolean; error?: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe("Beat not found");
    });

    it("should return error when required fields missing", async () => {
      const result1 = (await handleToolCall("story_beat_create", {
        visualDescription: "Missing storyId",
      })) as { success: boolean; error?: string };
      expect(result1.success).toBe(false);
      expect(result1.error).toBe("storyId is required");

      const result2 = (await handleToolCall("story_beat_create", {
        storyId: "some-id",
      })) as { success: boolean; error?: string };
      expect(result2.success).toBe(false);
      expect(result2.error).toBe("visualDescription is required");
    });
  });
});
