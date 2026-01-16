/**
 * Smoke Tests for Narrative Engine
 *
 * These are quick, lightweight tests that verify the critical paths
 * are working. Run these first before more exhaustive tests.
 *
 * Smoke tests should:
 * - Run fast (< 1 second total)
 * - Test happy paths only
 * - Verify basic CRUD and key workflows
 * - Not test edge cases or error handling
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestCharacter,
} from "../setup.js";
import {
  getNarrativeService,
  resetNarrativeService,
} from "../../services/narrative.service.js";
import { getPanelService, resetPanelService } from "../../services/panel.service.js";
import { getStoryboardService, resetStoryboardService } from "../../services/storyboard.service.js";

describe("Smoke: Narrative Engine Critical Paths", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("Premise Operations", () => {
    it("creates and retrieves a premise", async () => {
      const project = await createTestProject();
      const service = getNarrativeService();

      const premise = await service.createPremise({
        projectId: project.id,
        logline: "Smoke test premise",
      });

      expect(premise.id).toBeDefined();

      const retrieved = await service.getPremise(premise.id);
      expect(retrieved?.logline).toBe("Smoke test premise");
    });
  });

  describe("Story Operations", () => {
    it("creates a story from premise", async () => {
      const project = await createTestProject();
      const service = getNarrativeService();

      const premise = await service.createPremise({
        projectId: project.id,
        logline: "Test",
      });

      const story = await service.createStory({
        premiseId: premise.id,
        title: "Smoke Test Story",
      });

      expect(story.premiseId).toBe(premise.id);
      expect(story.title).toBe("Smoke Test Story");
    });
  });

  describe("Beat Operations", () => {
    it("creates and retrieves beats", async () => {
      const project = await createTestProject();
      const service = getNarrativeService();

      const premise = await service.createPremise({
        projectId: project.id,
        logline: "Test",
      });

      const story = await service.createStory({
        premiseId: premise.id,
        title: "Test",
      });

      await service.createBeats(story.id, [
        { position: 0, visualDescription: "Beat 1" },
        { position: 1, visualDescription: "Beat 2" },
      ]);

      const beats = await service.getBeats(story.id);
      expect(beats).toHaveLength(2);
    });
  });

  describe("Beat to Panel Conversion", () => {
    it("converts beats to panels", async () => {
      const project = await createTestProject();
      const narrativeService = getNarrativeService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Test",
      });

      await narrativeService.createBeats(story.id, [
        { position: 0, visualDescription: "Panel description" },
      ]);

      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Test Storyboard",
      });

      const result = await narrativeService.convertStoryToStoryboard(story.id, storyboard.id);
      expect(result.panelIds).toHaveLength(1);

      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels[0].description).toBe("Panel description");
    });
  });

  describe("Cascade Deletions", () => {
    it("deletes premise and cascades to stories and beats", async () => {
      const project = await createTestProject();
      const service = getNarrativeService();

      const premise = await service.createPremise({
        projectId: project.id,
        logline: "Test",
      });

      const story = await service.createStory({
        premiseId: premise.id,
        title: "Test",
      });

      await service.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Test",
      });

      await service.deletePremise(premise.id);

      const deletedPremise = await service.getPremise(premise.id);
      const deletedStory = await service.getStory(story.id);

      expect(deletedPremise).toBeNull();
      expect(deletedStory).toBeNull();
    });
  });

  describe("Character Association", () => {
    it("associates characters with beats", async () => {
      const project = await createTestProject();
      const char = await createTestCharacter(project.id);
      const service = getNarrativeService();

      const premise = await service.createPremise({
        projectId: project.id,
        logline: "Test",
        characterIds: [char.id],
      });

      const story = await service.createStory({
        premiseId: premise.id,
        title: "Test",
      });

      const beat = await service.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Test",
        characterIds: [char.id],
      });

      expect(beat.characterIds).toContain(char.id);
    });
  });
});

describe("Smoke: Service Singleton Pattern", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  it("returns same instance on multiple calls", () => {
    const service1 = getNarrativeService();
    const service2 = getNarrativeService();
    expect(service1).toBe(service2);
  });

  it("resets instance correctly", () => {
    const service1 = getNarrativeService();
    resetNarrativeService();
    const service2 = getNarrativeService();
    expect(service1).not.toBe(service2);
  });
});

describe("Smoke: Data Integrity", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  it("maintains beat ordering", async () => {
    const project = await createTestProject();
    const service = getNarrativeService();

    const premise = await service.createPremise({
      projectId: project.id,
      logline: "Test",
    });

    const story = await service.createStory({
      premiseId: premise.id,
      title: "Test",
    });

    await service.createBeats(story.id, [
      { position: 0, visualDescription: "First" },
      { position: 1, visualDescription: "Second" },
      { position: 2, visualDescription: "Third" },
    ]);

    const beats = await service.getBeats(story.id);
    expect(beats[0].position).toBe(0);
    expect(beats[1].position).toBe(1);
    expect(beats[2].position).toBe(2);
    expect(beats[0].visualDescription).toBe("First");
    expect(beats[2].visualDescription).toBe("Third");
  });

  it("updates actualLength on beat creation", async () => {
    const project = await createTestProject();
    const service = getNarrativeService();

    const premise = await service.createPremise({
      projectId: project.id,
      logline: "Test",
    });

    const story = await service.createStory({
      premiseId: premise.id,
      title: "Test",
    });

    await service.createBeats(story.id, [
      { position: 0, visualDescription: "Beat 1" },
      { position: 1, visualDescription: "Beat 2" },
    ]);

    const updated = await service.getStory(story.id);
    expect(updated?.actualLength).toBe(2);
  });
});
