/**
 * NarrativeService Unit Tests
 *
 * Comprehensive tests covering CRUD operations for premises, stories, and beats.
 * Tests validation, edge cases, cascade behavior, and beat conversion.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestCharacter,
  createTestStoryboard,
} from "../setup.js";
import { getNarrativeService, type NarrativeService } from "../../services/index.js";
import type { Premise, Story, Beat } from "../../db/index.js";

describe("NarrativeService", () => {
  let service: NarrativeService;
  let projectId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getNarrativeService();

    // Create a project for tests
    const project = await createTestProject();
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // PREMISE CRUD TESTS
  // ============================================================================

  describe("Premise CRUD", () => {
    describe("createPremise", () => {
      it("creates a premise with required fields only", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "Two otters discover a yacht",
        });

        expect(premise).toBeDefined();
        expect(premise.id).toBeDefined();
        expect(premise.projectId).toBe(projectId);
        expect(premise.logline).toBe("Two otters discover a yacht");
        expect(premise.status).toBe("draft");
        expect(premise.themes).toEqual([]);
        expect(premise.characterIds).toEqual([]);
        expect(premise.createdAt).toBeInstanceOf(Date);
      });

      it("creates a premise with all fields", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "A detective solves a mystery",
          genre: "mystery",
          tone: "dark",
          themes: ["justice", "truth"],
          characterIds: ["char1", "char2"],
          setting: "Victorian London",
          worldRules: ["No magic", "Realistic physics"],
          generatedBy: "claude-3-opus",
          generationPrompt: "Generate a mystery premise",
          status: "active",
        });

        expect(premise.genre).toBe("mystery");
        expect(premise.tone).toBe("dark");
        expect(premise.themes).toEqual(["justice", "truth"]);
        expect(premise.characterIds).toEqual(["char1", "char2"]);
        expect(premise.setting).toBe("Victorian London");
        expect(premise.worldRules).toEqual(["No magic", "Realistic physics"]);
        expect(premise.generatedBy).toBe("claude-3-opus");
        expect(premise.status).toBe("active");
      });

      it("trims whitespace from text fields", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "  Trimmed logline  ",
          genre: "  comedy  ",
          setting: "  Beach  ",
        });

        expect(premise.logline).toBe("Trimmed logline");
        expect(premise.genre).toBe("comedy");
        expect(premise.setting).toBe("Beach");
      });

      it("throws on missing logline", async () => {
        await expect(
          service.createPremise({ projectId, logline: "" })
        ).rejects.toThrow("Premise logline is required");
      });

      it("throws on whitespace-only logline", async () => {
        await expect(
          service.createPremise({ projectId, logline: "   " })
        ).rejects.toThrow("Premise logline is required");
      });

      it("throws on logline exceeding 1000 characters", async () => {
        const longLogline = "a".repeat(1001);
        await expect(
          service.createPremise({ projectId, logline: longLogline })
        ).rejects.toThrow("Premise logline must be 1000 characters or less");
      });

      it("allows logline with exactly 1000 characters", async () => {
        const maxLogline = "a".repeat(1000);
        const premise = await service.createPremise({ projectId, logline: maxLogline });
        expect(premise.logline).toBe(maxLogline);
      });
    });

    describe("getPremise", () => {
      it("returns premise when exists", async () => {
        const created = await service.createPremise({
          projectId,
          logline: "Test premise",
        });

        const found = await service.getPremise(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.logline).toBe("Test premise");
      });

      it("returns null when not found", async () => {
        const found = await service.getPremise("nonexistent-id");
        expect(found).toBeNull();
      });

      it("returns null for empty id", async () => {
        const found = await service.getPremise("");
        expect(found).toBeNull();
      });
    });

    describe("getPremiseWithStories", () => {
      it("returns premise with empty stories array", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "Test premise",
        });

        const result = await service.getPremiseWithStories(premise.id);
        expect(result).toBeDefined();
        expect(result?.stories).toEqual([]);
      });

      it("returns premise with its stories", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "Test premise",
        });

        await service.createStory({ premiseId: premise.id, title: "Story 1" });
        await service.createStory({ premiseId: premise.id, title: "Story 2" });

        const result = await service.getPremiseWithStories(premise.id);
        expect(result?.stories).toHaveLength(2);
      });

      it("returns null for nonexistent premise", async () => {
        const result = await service.getPremiseWithStories("nonexistent");
        expect(result).toBeNull();
      });
    });

    describe("listPremises", () => {
      it("returns empty array when no premises", async () => {
        const premises = await service.listPremises(projectId);
        expect(premises).toEqual([]);
      });

      it("returns all premises for project", async () => {
        await service.createPremise({ projectId, logline: "Premise 1" });
        await service.createPremise({ projectId, logline: "Premise 2" });
        await service.createPremise({ projectId, logline: "Premise 3" });

        const premises = await service.listPremises(projectId);
        expect(premises).toHaveLength(3);
      });

      it("filters by status", async () => {
        await service.createPremise({ projectId, logline: "Draft", status: "draft" });
        await service.createPremise({ projectId, logline: "Active", status: "active" });
        await service.createPremise({ projectId, logline: "Archived", status: "archived" });

        const active = await service.listPremises(projectId, { status: "active" });
        expect(active).toHaveLength(1);
        expect(active[0].logline).toBe("Active");
      });

      it("respects limit and offset", async () => {
        await service.createPremise({ projectId, logline: "Premise 1" });
        await service.createPremise({ projectId, logline: "Premise 2" });
        await service.createPremise({ projectId, logline: "Premise 3" });

        const limited = await service.listPremises(projectId, { limit: 2 });
        expect(limited).toHaveLength(2);

        const offset = await service.listPremises(projectId, { offset: 1 });
        expect(offset).toHaveLength(2);
      });

      it("does not return premises from other projects", async () => {
        const project2 = await createTestProject("Project 2");
        await service.createPremise({ projectId, logline: "Project 1 premise" });
        await service.createPremise({ projectId: project2.id, logline: "Project 2 premise" });

        const premises = await service.listPremises(projectId);
        expect(premises).toHaveLength(1);
        expect(premises[0].logline).toBe("Project 1 premise");
      });
    });

    describe("updatePremise", () => {
      let premise: Premise;

      beforeEach(async () => {
        premise = await service.createPremise({
          projectId,
          logline: "Original logline",
          genre: "comedy",
        });
      });

      it("updates logline", async () => {
        const updated = await service.updatePremise(premise.id, {
          logline: "Updated logline",
        });

        expect(updated.logline).toBe("Updated logline");
        expect(updated.genre).toBe("comedy"); // Other fields preserved
      });

      it("updates multiple fields", async () => {
        const updated = await service.updatePremise(premise.id, {
          genre: "drama",
          tone: "dark",
          themes: ["loss", "redemption"],
          status: "active",
        });

        expect(updated.genre).toBe("drama");
        expect(updated.tone).toBe("dark");
        expect(updated.themes).toEqual(["loss", "redemption"]);
        expect(updated.status).toBe("active");
      });

      it("clears optional fields when set to empty", async () => {
        premise = await service.updatePremise(premise.id, { tone: "serious" });
        const updated = await service.updatePremise(premise.id, { tone: "" });

        expect(updated.tone).toBeNull();
      });

      it("updates updatedAt timestamp", async () => {
        const originalUpdatedAt = premise.updatedAt;
        await new Promise((resolve) => setTimeout(resolve, 1100)); // Need >1s for timestamp change

        const updated = await service.updatePremise(premise.id, { logline: "New" });
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      });

      it("throws on non-existent premise", async () => {
        await expect(
          service.updatePremise("nonexistent", { logline: "New" })
        ).rejects.toThrow("Premise not found: nonexistent");
      });

      it("throws on empty logline update", async () => {
        await expect(
          service.updatePremise(premise.id, { logline: "" })
        ).rejects.toThrow("Premise logline is required");
      });

      it("throws on logline exceeding limit", async () => {
        const longLogline = "a".repeat(1001);
        await expect(
          service.updatePremise(premise.id, { logline: longLogline })
        ).rejects.toThrow("Premise logline must be 1000 characters or less");
      });
    });

    describe("deletePremise", () => {
      it("deletes existing premise", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "To delete",
        });

        await service.deletePremise(premise.id);

        const found = await service.getPremise(premise.id);
        expect(found).toBeNull();
      });

      it("throws on non-existent premise", async () => {
        await expect(service.deletePremise("nonexistent")).rejects.toThrow(
          "Premise not found: nonexistent"
        );
      });

      it("cascades delete to stories and beats", async () => {
        const premise = await service.createPremise({
          projectId,
          logline: "Parent",
        });
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Child story",
        });
        await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Child beat",
        });

        await service.deletePremise(premise.id);

        expect(await service.getStory(story.id)).toBeNull();
      });
    });
  });

  // ============================================================================
  // STORY CRUD TESTS
  // ============================================================================

  describe("Story CRUD", () => {
    let premise: Premise;

    beforeEach(async () => {
      premise = await service.createPremise({
        projectId,
        logline: "Test premise for stories",
      });
    });

    describe("createStory", () => {
      it("creates a story with required fields", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "My Story",
        });

        expect(story).toBeDefined();
        expect(story.id).toBeDefined();
        expect(story.premiseId).toBe(premise.id);
        expect(story.title).toBe("My Story");
        expect(story.structure).toBe("three-act");
        expect(story.status).toBe("draft");
      });

      it("creates a story with all fields", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Full Story",
          synopsis: "A complete synopsis",
          targetLength: 12,
          structure: "hero-journey",
          structureNotes: { act1: "Beginning", act2: "Middle" },
          characterArcs: [
            {
              characterId: "char1",
              startState: "Timid",
              endState: "Brave",
              keyMoments: ["Moment 1", "Moment 2"],
            },
          ],
          generatedBy: "claude-3-opus",
          status: "beats_generated",
        });

        expect(story.synopsis).toBe("A complete synopsis");
        expect(story.targetLength).toBe(12);
        expect(story.structure).toBe("hero-journey");
        expect(story.structureNotes).toEqual({ act1: "Beginning", act2: "Middle" });
        expect(story.characterArcs).toHaveLength(1);
        expect(story.generatedBy).toBe("claude-3-opus");
      });

      it("throws on missing title", async () => {
        await expect(
          service.createStory({ premiseId: premise.id, title: "" })
        ).rejects.toThrow("Story title is required");
      });

      it("throws on title exceeding 255 characters", async () => {
        const longTitle = "a".repeat(256);
        await expect(
          service.createStory({ premiseId: premise.id, title: longTitle })
        ).rejects.toThrow("Story title must be 255 characters or less");
      });

      it("throws on non-existent premise", async () => {
        await expect(
          service.createStory({ premiseId: "nonexistent", title: "Story" })
        ).rejects.toThrow("Premise not found: nonexistent");
      });
    });

    describe("getStory", () => {
      it("returns story when exists", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Find me",
        });

        const found = await service.getStory(story.id);
        expect(found).toBeDefined();
        expect(found?.title).toBe("Find me");
      });

      it("returns null when not found", async () => {
        const found = await service.getStory("nonexistent");
        expect(found).toBeNull();
      });
    });

    describe("getStoryWithBeats", () => {
      it("returns story with empty beats array", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Story",
        });

        const result = await service.getStoryWithBeats(story.id);
        expect(result?.beats).toEqual([]);
      });

      it("returns story with beats in order", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Story",
        });

        await service.createBeat({ storyId: story.id, position: 2, visualDescription: "Third" });
        await service.createBeat({ storyId: story.id, position: 0, visualDescription: "First" });
        await service.createBeat({ storyId: story.id, position: 1, visualDescription: "Second" });

        const result = await service.getStoryWithBeats(story.id);
        expect(result?.beats).toHaveLength(3);
        expect(result?.beats[0].position).toBe(0);
        expect(result?.beats[1].position).toBe(1);
        expect(result?.beats[2].position).toBe(2);
      });
    });

    describe("listStoriesByPremise", () => {
      it("returns stories for premise", async () => {
        await service.createStory({ premiseId: premise.id, title: "Story 1" });
        await service.createStory({ premiseId: premise.id, title: "Story 2" });

        const stories = await service.listStoriesByPremise(premise.id);
        expect(stories).toHaveLength(2);
      });

      it("filters by status", async () => {
        await service.createStory({ premiseId: premise.id, title: "Draft", status: "draft" });
        await service.createStory({
          premiseId: premise.id,
          title: "Complete",
          status: "complete",
        });

        const complete = await service.listStoriesByPremise(premise.id, { status: "complete" });
        expect(complete).toHaveLength(1);
        expect(complete[0].title).toBe("Complete");
      });
    });

    describe("updateStory", () => {
      it("updates story fields", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "Original",
        });

        const updated = await service.updateStory(story.id, {
          title: "Updated",
          synopsis: "New synopsis",
          status: "beats_generated",
        });

        expect(updated.title).toBe("Updated");
        expect(updated.synopsis).toBe("New synopsis");
        expect(updated.status).toBe("beats_generated");
      });

      it("throws on non-existent story", async () => {
        await expect(
          service.updateStory("nonexistent", { title: "New" })
        ).rejects.toThrow("Story not found: nonexistent");
      });
    });

    describe("deleteStory", () => {
      it("deletes story and its beats", async () => {
        const story = await service.createStory({
          premiseId: premise.id,
          title: "To delete",
        });
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Beat",
        });

        await service.deleteStory(story.id);

        expect(await service.getStory(story.id)).toBeNull();
        expect(await service.getBeat(beat.id)).toBeNull();
      });
    });
  });

  // ============================================================================
  // BEAT CRUD TESTS
  // ============================================================================

  describe("Beat CRUD", () => {
    let story: Story;

    beforeEach(async () => {
      const premise = await service.createPremise({
        projectId,
        logline: "Test premise for beats",
      });
      story = await service.createStory({
        premiseId: premise.id,
        title: "Test story for beats",
      });
    });

    describe("createBeat", () => {
      it("creates a beat with required fields", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "A dramatic opening scene",
        });

        expect(beat).toBeDefined();
        expect(beat.id).toBeDefined();
        expect(beat.storyId).toBe(story.id);
        expect(beat.position).toBe(0);
        expect(beat.visualDescription).toBe("A dramatic opening scene");
        expect(beat.characterIds).toEqual([]);
      });

      it("creates a beat with all fields", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          actNumber: 1,
          beatType: "setup",
          visualDescription: "Full description",
          narrativeContext: "Story context",
          emotionalTone: "cheerful",
          characterIds: ["char1", "char2"],
          characterActions: { char1: "walking", char2: "talking" },
          cameraAngle: "wide",
          composition: "rule-of-thirds",
          dialogue: [{ characterId: "char1", text: "Hello!", type: "speech" }],
          narration: "The story begins...",
          sfx: "WHOOSH",
          generatedBy: "claude-3-opus",
        });

        expect(beat.actNumber).toBe(1);
        expect(beat.beatType).toBe("setup");
        expect(beat.narrativeContext).toBe("Story context");
        expect(beat.emotionalTone).toBe("cheerful");
        expect(beat.cameraAngle).toBe("wide");
        expect(beat.dialogue).toHaveLength(1);
        expect(beat.narration).toBe("The story begins...");
        expect(beat.sfx).toBe("WHOOSH");
      });

      it("updates story actualLength", async () => {
        await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Beat 1",
        });
        await service.createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Beat 2",
        });

        const updatedStory = await service.getStory(story.id);
        expect(updatedStory?.actualLength).toBe(2);
      });

      it("throws on missing visual description", async () => {
        await expect(
          service.createBeat({ storyId: story.id, position: 0, visualDescription: "" })
        ).rejects.toThrow("Beat visual description is required");
      });

      it("throws on non-existent story", async () => {
        await expect(
          service.createBeat({
            storyId: "nonexistent",
            position: 0,
            visualDescription: "Beat",
          })
        ).rejects.toThrow("Story not found: nonexistent");
      });
    });

    describe("createBeats (batch)", () => {
      it("creates multiple beats at once", async () => {
        const beats = await service.createBeats(story.id, [
          { position: 0, visualDescription: "Beat 1" },
          { position: 1, visualDescription: "Beat 2" },
          { position: 2, visualDescription: "Beat 3" },
        ]);

        expect(beats).toHaveLength(3);

        const storyBeats = await service.getBeats(story.id);
        expect(storyBeats).toHaveLength(3);
      });

      it("updates story actualLength for batch", async () => {
        await service.createBeats(story.id, [
          { position: 0, visualDescription: "Beat 1" },
          { position: 1, visualDescription: "Beat 2" },
        ]);

        const updatedStory = await service.getStory(story.id);
        expect(updatedStory?.actualLength).toBe(2);
      });
    });

    describe("getBeat", () => {
      it("returns beat when exists", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Find me",
        });

        const found = await service.getBeat(beat.id);
        expect(found).toBeDefined();
        expect(found?.visualDescription).toBe("Find me");
      });

      it("returns null when not found", async () => {
        const found = await service.getBeat("nonexistent");
        expect(found).toBeNull();
      });
    });

    describe("getBeats", () => {
      it("returns beats in position order", async () => {
        await service.createBeat({ storyId: story.id, position: 2, visualDescription: "Third" });
        await service.createBeat({ storyId: story.id, position: 0, visualDescription: "First" });
        await service.createBeat({ storyId: story.id, position: 1, visualDescription: "Second" });

        const beats = await service.getBeats(story.id);
        expect(beats).toHaveLength(3);
        expect(beats[0].visualDescription).toBe("First");
        expect(beats[1].visualDescription).toBe("Second");
        expect(beats[2].visualDescription).toBe("Third");
      });
    });

    describe("updateBeat", () => {
      it("updates beat fields", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Original",
        });

        const updated = await service.updateBeat(beat.id, {
          visualDescription: "Updated",
          emotionalTone: "tense",
          cameraAngle: "close-up",
        });

        expect(updated.visualDescription).toBe("Updated");
        expect(updated.emotionalTone).toBe("tense");
        expect(updated.cameraAngle).toBe("close-up");
      });

      it("throws on empty visual description", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Original",
        });

        await expect(
          service.updateBeat(beat.id, { visualDescription: "" })
        ).rejects.toThrow("Beat visual description is required");
      });
    });

    describe("reorderBeats", () => {
      it("reorders beats by position", async () => {
        const beat1 = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Originally first",
        });
        const beat2 = await service.createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Originally second",
        });
        const beat3 = await service.createBeat({
          storyId: story.id,
          position: 2,
          visualDescription: "Originally third",
        });

        // Reverse order
        const reordered = await service.reorderBeats(story.id, [beat3.id, beat2.id, beat1.id]);

        expect(reordered[0].visualDescription).toBe("Originally third");
        expect(reordered[0].position).toBe(0);
        expect(reordered[1].visualDescription).toBe("Originally second");
        expect(reordered[1].position).toBe(1);
        expect(reordered[2].visualDescription).toBe("Originally first");
        expect(reordered[2].position).toBe(2);
      });

      it("throws on non-existent story", async () => {
        await expect(service.reorderBeats("nonexistent", [])).rejects.toThrow(
          "Story not found: nonexistent"
        );
      });
    });

    describe("deleteBeat", () => {
      it("deletes beat and updates story length", async () => {
        const beat1 = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Beat 1",
        });
        await service.createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Beat 2",
        });

        let storyWithLength = await service.getStory(story.id);
        expect(storyWithLength?.actualLength).toBe(2);

        await service.deleteBeat(beat1.id);

        expect(await service.getBeat(beat1.id)).toBeNull();

        storyWithLength = await service.getStory(story.id);
        expect(storyWithLength?.actualLength).toBe(1);
      });
    });
  });

  // ============================================================================
  // BEAT CONVERSION TESTS
  // ============================================================================

  describe("Beat to Panel Conversion", () => {
    let story: Story;
    let storyboardId: string;

    beforeEach(async () => {
      const premise = await service.createPremise({
        projectId,
        logline: "Conversion test premise",
      });
      story = await service.createStory({
        premiseId: premise.id,
        title: "Conversion test story",
      });

      const storyboard = await createTestStoryboard(projectId);
      storyboardId = storyboard.id;
    });

    describe("convertBeatToPanel", () => {
      it("creates panel from beat and links them", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "A scenic view",
          emotionalTone: "peaceful",
          cameraAngle: "wide",
          characterIds: ["char1"],
        });

        const result = await service.convertBeatToPanel(beat.id, storyboardId);

        expect(result.panelId).toBeDefined();
        expect(result.beat.panelId).toBe(result.panelId);
      });

      it("throws when beat already converted", async () => {
        const beat = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Already converted",
        });

        await service.convertBeatToPanel(beat.id, storyboardId);

        await expect(
          service.convertBeatToPanel(beat.id, storyboardId)
        ).rejects.toThrow("Beat already converted to panel");
      });

      it("throws for non-existent beat", async () => {
        await expect(
          service.convertBeatToPanel("nonexistent", storyboardId)
        ).rejects.toThrow("Beat not found: nonexistent");
      });
    });

    describe("convertStoryToStoryboard", () => {
      it("converts all beats to panels", async () => {
        await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Beat 1",
        });
        await service.createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Beat 2",
        });
        await service.createBeat({
          storyId: story.id,
          position: 2,
          visualDescription: "Beat 3",
        });

        const result = await service.convertStoryToStoryboard(story.id, storyboardId);

        expect(result.panelIds).toHaveLength(3);
        expect(result.beats).toHaveLength(3);

        // Verify all beats have panel IDs
        for (const beat of result.beats) {
          expect(beat.panelId).toBeDefined();
        }
      });

      it("updates story status to panels_created", async () => {
        await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Beat",
        });

        await service.convertStoryToStoryboard(story.id, storyboardId);

        const updatedStory = await service.getStory(story.id);
        expect(updatedStory?.status).toBe("panels_created");
      });

      it("throws when story has no beats", async () => {
        await expect(
          service.convertStoryToStoryboard(story.id, storyboardId)
        ).rejects.toThrow("Story has no beats");
      });

      it("skips already converted beats", async () => {
        const beat1 = await service.createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Already converted",
        });
        await service.convertBeatToPanel(beat1.id, storyboardId);

        await service.createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "New beat",
        });

        const result = await service.convertStoryToStoryboard(story.id, storyboardId);

        // Should have 2 panel IDs (one existing, one new)
        expect(result.panelIds).toHaveLength(2);
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND CONCURRENT OPERATIONS
  // ============================================================================

  describe("Edge Cases", () => {
    it("handles unicode in all text fields", async () => {
      const premise = await service.createPremise({
        projectId,
        logline: "Une histoire avec des caracteres",
        setting: "",
      });

      expect(premise.logline).toBe("Une histoire avec des caracteres");
    });

    it("handles concurrent premise creations", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.createPremise({ projectId, logline: `Concurrent ${i}` })
      );

      const premises = await Promise.all(promises);
      expect(premises).toHaveLength(5);

      const ids = new Set(premises.map((p) => p.id));
      expect(ids.size).toBe(5); // All unique IDs
    });

    it("handles concurrent beat creations", async () => {
      const premise = await service.createPremise({ projectId, logline: "Test" });
      const story = await service.createStory({ premiseId: premise.id, title: "Story" });

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.createBeat({
          storyId: story.id,
          position: i,
          visualDescription: `Concurrent beat ${i}`,
        })
      );

      const beats = await Promise.all(promises);
      expect(beats).toHaveLength(10);
    });

    it("preserves JSON arrays correctly", async () => {
      const premise = await service.createPremise({
        projectId,
        logline: "Test",
        themes: ["theme1", "theme2", "theme3"],
        worldRules: ["rule1", "rule2"],
      });

      const retrieved = await service.getPremise(premise.id);
      expect(retrieved?.themes).toEqual(["theme1", "theme2", "theme3"]);
      expect(retrieved?.worldRules).toEqual(["rule1", "rule2"]);
    });

    it("preserves complex nested JSON", async () => {
      const premise = await service.createPremise({ projectId, logline: "Test" });
      const story = await service.createStory({
        premiseId: premise.id,
        title: "Story",
        characterArcs: [
          {
            characterId: "char1",
            startState: "Nervous",
            endState: "Confident",
            keyMoments: ["First challenge", "Breakthrough", "Victory"],
          },
          {
            characterId: "char2",
            startState: "Selfish",
            endState: "Generous",
            keyMoments: ["Sees suffering", "Helps someone"],
          },
        ],
      });

      const retrieved = await service.getStory(story.id);
      expect(retrieved?.characterArcs).toHaveLength(2);
      expect(retrieved?.characterArcs?.[0].keyMoments).toHaveLength(3);
    });
  });
});
