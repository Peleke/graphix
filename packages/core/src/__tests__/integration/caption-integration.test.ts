/**
 * Caption System Integration Tests
 *
 * Tests cross-service interactions for caption generation,
 * including NarrativeService, CaptionService, and PanelService.
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
import {
  getNarrativeService,
  getCaptionService,
  getPanelService,
  getStoryboardService,
} from "../../services/index.js";

describe("Caption System Integration", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // CAPTION GENERATION INTEGRATION
  // ============================================================================

  describe("Caption Generation from Beats", () => {
    it("generates captions from beat dialogue and stores in CaptionService", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();

      // Setup
      const project = await createTestProject("Caption Test");
      const character = await createTestCharacter(project.id, "Speaker");
      const storyboard = await createTestStoryboard(project.id);

      // Create story structure
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Test story for caption generation",
        characterIds: [character.id],
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Caption Test Story",
      });

      // Create beat with dialogue
      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Character speaking",
        dialogue: [
          { characterId: character.id, text: "Hello, world!", type: "speech" },
          { characterId: character.id, text: "I wonder what's happening...", type: "thought" },
        ],
        narration: "The scene unfolds dramatically.",
      });

      // Convert beat to panel
      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);

      // Generate captions from beat
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions.length).toBeGreaterThanOrEqual(2); // At least dialogue + narration
      expect(result.beatId).toBe(beat.id);

      // Verify captions are retrievable via CaptionService
      const captionServiceResults = await captionService.getByPanel(result.panelId);
      expect(captionServiceResults.length).toBe(result.captions.length);

      // Verify caption types
      const types = captionServiceResults.map((c) => c.type);
      expect(types).toContain("speech");
      expect(types).toContain("thought");
      expect(types).toContain("narration");
    });

    it("links captions to their source beat", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Beat linking test",
        characterIds: [character.id],
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Beat Link Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Test scene",
        dialogue: [{ characterId: character.id, text: "Test dialogue", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Every generated caption should be linked to the beat
      expect(captions.every((c) => c.beatId === beat.id)).toBe(true);
      expect(captions.every((c) => c.generatedFromBeat === true)).toBe(true);
    });

    it("generates captions for story with multiple beats", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const char1 = await createTestCharacter(project.id, "Char1");
      const char2 = await createTestCharacter(project.id, "Char2");
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Multi-beat caption test",
        characterIds: [char1.id, char2.id],
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Multi-Beat Story",
      });

      // Create multiple beats with different dialogue
      await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene 1",
        dialogue: [{ characterId: char1.id, text: "First line!", type: "speech" }],
      });

      await narrativeService.createBeat({
        storyId: story.id,
        position: 1,
        visualDescription: "Scene 2",
        dialogue: [
          { characterId: char2.id, text: "Hello there", type: "speech" },
          { characterId: char1.id, text: "Hi back!", type: "speech" },
        ],
      });

      await narrativeService.createBeat({
        storyId: story.id,
        position: 2,
        visualDescription: "Scene 3",
        narration: "And so the story concludes.",
        sfx: "BANG!",
      });

      // Convert all to panels
      await narrativeService.convertStoryToStoryboard(story.id, storyboard.id);

      // Generate captions for entire story
      const results = await narrativeService.generateCaptionsForStory(story.id);

      expect(results).toHaveLength(3);

      // Verify each panel got appropriate captions
      const captionCounts = results.map((r) => r.captions.length);
      expect(captionCounts[0]).toBe(1); // First beat: 1 dialogue
      expect(captionCounts[1]).toBe(2); // Second beat: 2 dialogues
      expect(captionCounts[2]).toBe(2); // Third beat: 1 narration + 1 sfx
    });
  });

  // ============================================================================
  // CAPTION-PANEL RELATIONSHIP
  // ============================================================================

  describe("Caption-Panel Relationship", () => {
    it("maintains caption order when reordering", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Reorder test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Reorder Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene with multiple captions",
        dialogue: [
          { characterId: character.id, text: "First", type: "speech" },
          { characterId: character.id, text: "Second", type: "speech" },
          { characterId: character.id, text: "Third", type: "speech" },
        ],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions, panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Reorder captions
      const reorderedIds = [captions[2].id, captions[0].id, captions[1].id];
      const reordered = await captionService.reorder(panelId, reorderedIds);

      expect(reordered[0].text).toBe("Third");
      expect(reordered[1].text).toBe("First");
      expect(reordered[2].text).toBe("Second");

      // Verify order indices are correct
      expect(reordered.map((c) => c.orderIndex)).toEqual([0, 1, 2]);
    });

    it("toggles caption enabled state correctly", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Toggle test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Toggle Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId: character.id, text: "Toggle me", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions, panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Initially enabled
      expect(captions[0].enabled).toBe(true);

      // Toggle off
      const toggled = await narrativeService.toggleCaptionEnabled(captions[0].id);
      expect(toggled.enabled).toBe(false);

      // Get enabled-only captions
      const enabledCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        enabledOnly: true,
      });
      expect(enabledCaptions).toHaveLength(0);

      // Toggle back on
      const toggledBack = await narrativeService.toggleCaptionEnabled(captions[0].id);
      expect(toggledBack.enabled).toBe(true);

      // Now enabled captions should include it
      const enabledAgain = await narrativeService.getCaptionsForPanel(panelId, {
        enabledOnly: true,
      });
      expect(enabledAgain).toHaveLength(1);
    });

    it("deletes captions when panel is deleted", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();
      const panelService = getPanelService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Deletion test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Deletion Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId: character.id, text: "Will be deleted", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions, panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(captions.length).toBeGreaterThan(0);

      // Delete the panel
      await panelService.delete(panelId);

      // Captions should be cascade deleted
      const remainingCaptions = await captionService.getByPanel(panelId);
      expect(remainingCaptions).toHaveLength(0);
    });
  });

  // ============================================================================
  // CROSS-SERVICE CAPTION FILTERING
  // ============================================================================

  describe("Caption Filtering Across Services", () => {
    it("filters captions by type", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Filter test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Filter Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene with multiple caption types",
        dialogue: [
          { characterId: character.id, text: "Spoken words", type: "speech" },
          { characterId: character.id, text: "Inner thoughts", type: "thought" },
        ],
        narration: "Narrator voice",
        sfx: "BOOM!",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Filter by speech only
      const speechCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        types: ["speech"],
      });
      expect(speechCaptions).toHaveLength(1);
      expect(speechCaptions[0].type).toBe("speech");

      // Filter by thought only
      const thoughtCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        types: ["thought"],
      });
      expect(thoughtCaptions).toHaveLength(1);
      expect(thoughtCaptions[0].type).toBe("thought");

      // Filter by multiple types
      const dialogueCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        types: ["speech", "thought"],
      });
      expect(dialogueCaptions).toHaveLength(2);

      // Get SFX only
      const sfxCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        types: ["sfx"],
      });
      expect(sfxCaptions).toHaveLength(1);
      expect(sfxCaptions[0].text).toBe("BOOM!");
    });

    it("combines enabled and type filters", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Combined filter test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Combined Filter Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene",
        dialogue: [
          { characterId: character.id, text: "Speech 1", type: "speech" },
          { characterId: character.id, text: "Speech 2", type: "speech" },
        ],
        narration: "Narration text",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions, panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Disable one speech caption
      const speechCaptions = captions.filter((c) => c.type === "speech");
      await narrativeService.toggleCaptionEnabled(speechCaptions[0].id);

      // Get enabled speech captions
      const enabledSpeech = await narrativeService.getCaptionsForPanel(panelId, {
        enabledOnly: true,
        types: ["speech"],
      });
      expect(enabledSpeech).toHaveLength(1);
      expect(enabledSpeech[0].text).toBe("Speech 2");

      // Get all enabled captions
      const allEnabled = await narrativeService.getCaptionsForPanel(panelId, {
        enabledOnly: true,
      });
      expect(allEnabled).toHaveLength(2); // 1 speech + 1 narration
    });
  });

  // ============================================================================
  // MANUAL CAPTION EDITING
  // ============================================================================

  describe("Manual Caption Editing", () => {
    it("marks caption as manually edited when updated", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Manual edit test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Manual Edit Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId: character.id, text: "Original text", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Initially not manually edited
      expect(captions[0].manuallyEdited).toBe(false);

      // Update the caption text
      const updated = await captionService.update(captions[0].id, {
        text: "Edited text",
      });

      expect(updated.text).toBe("Edited text");
      expect(updated.manuallyEdited).toBe(true);
    });

    it("allows adding manual captions to panel", async () => {
      const narrativeService = getNarrativeService();
      const captionService = getCaptionService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Manual add test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Manual Add Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId: character.id, text: "Generated caption", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);
      const { panelId } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Add a manual caption
      const manualCaption = await captionService.create({
        panelId,
        type: "narration",
        text: "This is a manual narration",
        position: { x: 100, y: 50 },
      });

      expect(manualCaption.generatedFromBeat).toBe(false);

      // Verify both captions exist
      const allCaptions = await captionService.getByPanel(panelId);
      expect(allCaptions).toHaveLength(2);

      const manualCap = allCaptions.find((c) => c.text === "This is a manual narration");
      expect(manualCap?.generatedFromBeat).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("Error Handling", () => {
    it("fails gracefully when beat has no panel", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "No panel test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "No Panel Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene without panel",
        dialogue: [{ characterId: character.id, text: "Test", type: "speech" }],
      });

      // Beat hasn't been converted to panel yet
      await expect(narrativeService.generateCaptionsFromBeat(beat.id)).rejects.toThrow(
        /has no associated panel/i
      );
    });

    it("handles beat with empty dialogue gracefully", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Empty dialogue test",
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Empty Dialogue Test",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Scene with no dialogue",
        // No dialogue, no narration, no sfx
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboard.id);

      // Should not throw, just return empty captions
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);
      expect(captions).toHaveLength(0);
    });

    it("handles non-existent caption ID in toggle", async () => {
      const narrativeService = getNarrativeService();

      await expect(
        narrativeService.toggleCaptionEnabled("non-existent-id")
      ).rejects.toThrow(/not found/i);
    });
  });
});
