/**
 * Caption Generation Tests
 *
 * Tests for the caption generation integration:
 * - generateCaptionsFromBeat() - Extract captions from beat data
 * - generateCaptionsForStory() - Batch generation for all beats
 * - getCaptionsForPanel() - Query captions with filters
 * - toggleCaptionEnabled() - Enable/disable captions
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestCharacter,
} from "../setup.js";
import {
  getNarrativeService,
  getCaptionService,
  type NarrativeService,
  type CaptionService,
} from "../../services/index.js";

describe("Caption Generation", () => {
  let narrativeService: NarrativeService;
  let captionService: CaptionService;
  let projectId: string;
  let storyboardId: string;
  let premiseId: string;
  let storyId: string;
  let characterId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    narrativeService = getNarrativeService();
    captionService = getCaptionService();

    // Create test hierarchy
    const project = await createTestProject("Caption Gen Test");
    projectId = project.id;

    const storyboard = await createTestStoryboard(projectId, "Test Storyboard");
    storyboardId = storyboard.id;

    // Create a character for dialogue
    const character = await createTestCharacter(projectId, "Hero");
    characterId = character.id;

    // Create a premise
    const premise = await narrativeService.createPremise({
      projectId,
      logline: "A hero embarks on an epic adventure",
      genre: "fantasy",
      tone: "adventurous",
    });
    premiseId = premise.id;

    // Create a story
    const story = await narrativeService.createStory({
      premiseId,
      title: "The Quest",
      synopsis: "An epic tale of heroism",
    });
    storyId = story.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GENERATE CAPTIONS FROM BEAT
  // ============================================================================

  describe("generateCaptionsFromBeat", () => {
    it("generates captions from beat with dialogue", async () => {
      // Create beat with dialogue
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Hero stands before the castle",
        dialogue: [
          { characterId, text: "I will save the kingdom!", type: "speech" },
        ],
      });

      // Convert to panel
      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      // Generate captions
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(1);
      expect(result.panelId).toBe(panelId);
      expect(result.beatId).toBe(beat.id);
      expect(result.captions[0].type).toBe("speech");
      expect(result.captions[0].text).toBe("I will save the kingdom!");
      expect(result.captions[0].characterId).toBe(characterId);
      expect(result.captions[0].generatedFromBeat).toBe(true);
      expect(result.captions[0].enabled).toBe(true);
    });

    it("generates captions from beat with multiple dialogue lines", async () => {
      const character2 = await createTestCharacter(projectId, "Villain");

      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Hero confronts the villain",
        dialogue: [
          { characterId, text: "Stop right there!", type: "speech" },
          { characterId: character2.id, text: "You'll never defeat me!", type: "speech" },
        ],
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(2);
      expect(result.captions[0].text).toBe("Stop right there!");
      expect(result.captions[1].text).toBe("You'll never defeat me!");
      // Verify staggered positioning
      expect(result.captions[0].position.y).toBeLessThan(result.captions[1].position.y);
    });

    it("generates captions from beat with narration", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "A dark forest at night",
        narration: "The wind howled through the ancient trees...",
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].type).toBe("narration");
      expect(result.captions[0].text).toBe("The wind howled through the ancient trees...");
      expect(result.captions[0].characterId).toBeNull();
    });

    it("generates captions from beat with sfx", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Explosion rocks the battlefield",
        sfx: "kaboom",
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].type).toBe("sfx");
      expect(result.captions[0].text).toBe("KABOOM"); // Uppercased
    });

    it("generates captions from beat with all types", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Climactic battle scene",
        dialogue: [{ characterId, text: "For glory!", type: "speech" }],
        narration: "The final battle had begun.",
        sfx: "clash",
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(3);
      const types = result.captions.map((c) => c.type);
      expect(types).toContain("speech");
      expect(types).toContain("narration");
      expect(types).toContain("sfx");
    });

    it("handles thought dialogue type", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Hero contemplates",
        dialogue: [{ characterId, text: "What should I do?", type: "thought" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions[0].type).toBe("thought");
    });

    it("handles whisper dialogue type", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Hero whispers a secret",
        dialogue: [{ characterId, text: "psst... over here", type: "whisper" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions[0].type).toBe("whisper");
    });

    it("respects includeDialogue option", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene description",
        dialogue: [{ characterId, text: "Speech!", type: "speech" }],
        narration: "Narration text",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id, {
        includeDialogue: false,
      });

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].type).toBe("narration");
    });

    it("respects includeNarration option", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene description",
        dialogue: [{ characterId, text: "Speech!", type: "speech" }],
        narration: "Narration text",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id, {
        includeNarration: false,
      });

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].type).toBe("speech");
    });

    it("respects includeSfx option", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene description",
        sfx: "boom",
        narration: "Narration text",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id, {
        includeSfx: false,
      });

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].type).toBe("narration");
    });

    it("uses custom default positions", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Hello", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id, {
        defaultPositions: {
          dialogue: { x: 25, y: 75 },
        },
      });

      expect(result.captions[0].position.x).toBe(25);
      expect(result.captions[0].position.y).toBe(75);
    });

    it("replaces existing generated captions on regeneration", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "First version", type: "speech" }],
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );

      // First generation
      await narrativeService.generateCaptionsFromBeat(beat.id);

      // Update beat and regenerate
      await narrativeService.updateBeat(beat.id, {
        dialogue: [{ characterId, text: "Second version", type: "speech" }],
      });

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(1);
      expect(result.captions[0].text).toBe("Second version");

      // Verify only one caption exists
      const allCaptions = await narrativeService.getCaptionsForPanel(panelId);
      expect(allCaptions).toHaveLength(1);
    });

    it("throws when beat not found", async () => {
      await expect(
        narrativeService.generateCaptionsFromBeat("nonexistent-id")
      ).rejects.toThrow("Beat not found");
    });

    it("throws when beat has no panel", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene without panel",
        dialogue: [{ characterId, text: "Hello", type: "speech" }],
      });

      await expect(
        narrativeService.generateCaptionsFromBeat(beat.id)
      ).rejects.toThrow("has no associated panel");
    });

    it("returns empty array when beat has no captions to generate", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Silent scene with no dialogue or narration",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(0);
    });
  });

  // ============================================================================
  // GENERATE CAPTIONS FOR STORY
  // ============================================================================

  describe("generateCaptionsForStory", () => {
    it("generates captions for all beats with panels", async () => {
      // Create multiple beats
      const beat1 = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene 1",
        dialogue: [{ characterId, text: "Line 1", type: "speech" }],
      });

      const beat2 = await narrativeService.createBeat({
        storyId,
        position: 1,
        visualDescription: "Scene 2",
        narration: "Narration for scene 2",
      });

      const beat3 = await narrativeService.createBeat({
        storyId,
        position: 2,
        visualDescription: "Scene 3",
        sfx: "whoosh",
      });

      // Convert all to panels
      await narrativeService.convertBeatToPanel(beat1.id, storyboardId);
      await narrativeService.convertBeatToPanel(beat2.id, storyboardId);
      await narrativeService.convertBeatToPanel(beat3.id, storyboardId);

      // Generate captions for entire story
      const results = await narrativeService.generateCaptionsForStory(storyId);

      expect(results).toHaveLength(3);
      expect(results[0].captions[0].type).toBe("speech");
      expect(results[1].captions[0].type).toBe("narration");
      expect(results[2].captions[0].type).toBe("sfx");
    });

    it("skips beats without panels", async () => {
      const beat1 = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "With panel",
        dialogue: [{ characterId, text: "Hello", type: "speech" }],
      });

      // Beat without panel
      await narrativeService.createBeat({
        storyId,
        position: 1,
        visualDescription: "Without panel",
        dialogue: [{ characterId, text: "World", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat1.id, storyboardId);

      const results = await narrativeService.generateCaptionsForStory(storyId);

      expect(results).toHaveLength(1);
    });

    it("passes options to each beat", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Speech", type: "speech" }],
        narration: "Narration",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);

      const results = await narrativeService.generateCaptionsForStory(storyId, {
        includeDialogue: false,
      });

      expect(results[0].captions).toHaveLength(1);
      expect(results[0].captions[0].type).toBe("narration");
    });

    it("throws when story not found", async () => {
      await expect(
        narrativeService.generateCaptionsForStory("nonexistent-id")
      ).rejects.toThrow("Story not found");
    });
  });

  // ============================================================================
  // GET CAPTIONS FOR PANEL
  // ============================================================================

  describe("getCaptionsForPanel", () => {
    it("returns all captions for panel", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Hello", type: "speech" }],
        narration: "Narration here",
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );
      await narrativeService.generateCaptionsFromBeat(beat.id);

      const captions = await narrativeService.getCaptionsForPanel(panelId);

      expect(captions).toHaveLength(2);
    });

    it("filters by enabled status", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [
          { characterId, text: "Visible", type: "speech" },
          { characterId, text: "Hidden", type: "speech" },
        ],
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Disable one caption
      await narrativeService.toggleCaptionEnabled(captions[1].id);

      const enabledCaptions = await narrativeService.getCaptionsForPanel(panelId, {
        enabledOnly: true,
      });

      expect(enabledCaptions).toHaveLength(1);
      expect(enabledCaptions[0].text).toBe("Visible");
    });

    it("orders by orderIndex", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [
          { characterId, text: "First", type: "speech" },
          { characterId, text: "Second", type: "speech" },
          { characterId, text: "Third", type: "speech" },
        ],
      });

      const { panelId } = await narrativeService.convertBeatToPanel(
        beat.id,
        storyboardId
      );
      await narrativeService.generateCaptionsFromBeat(beat.id);

      const captions = await narrativeService.getCaptionsForPanel(panelId);

      expect(captions[0].text).toBe("First");
      expect(captions[1].text).toBe("Second");
      expect(captions[2].text).toBe("Third");
    });
  });

  // ============================================================================
  // TOGGLE CAPTION ENABLED
  // ============================================================================

  describe("toggleCaptionEnabled", () => {
    it("disables an enabled caption", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Toggle me", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(captions[0].enabled).toBe(true);

      const toggled = await narrativeService.toggleCaptionEnabled(captions[0].id);

      expect(toggled.enabled).toBe(false);
    });

    it("enables a disabled caption", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Toggle me", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Disable first
      await narrativeService.toggleCaptionEnabled(captions[0].id);

      // Then enable
      const toggled = await narrativeService.toggleCaptionEnabled(captions[0].id);

      expect(toggled.enabled).toBe(true);
    });

    it("throws when caption not found", async () => {
      await expect(
        narrativeService.toggleCaptionEnabled("nonexistent-id")
      ).rejects.toThrow("Caption not found");
    });

    it("updates updatedAt timestamp", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Toggle me", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const { captions } = await narrativeService.generateCaptionsFromBeat(beat.id);

      const originalUpdatedAt = captions[0].updatedAt;

      // Wait long enough for timestamp to differ (SQLite has second-level precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const toggled = await narrativeService.toggleCaptionEnabled(captions[0].id);

      expect(toggled.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty dialogue text gracefully", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [
          { characterId, text: "", type: "speech" }, // Empty text
        ],
        narration: "Has content",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Should only have narration, not the empty dialogue
      expect(result.captions.some((c) => c.type === "narration")).toBe(true);
    });

    it("handles whitespace-only narration", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        narration: "   ",
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions).toHaveLength(0);
    });

    it("sanitizes HTML tags from text (XSS prevention)", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: '<script>alert("XSS")</script>', type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      // HTML tags should be stripped for XSS prevention
      expect(result.captions[0].text).toBe('alert("XSS")');
    });

    it("preserves safe special characters in text", async () => {
      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: "Hello! How are you? I'm fine... #awesome @user", type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      // Safe special characters should be preserved
      expect(result.captions[0].text).toBe("Hello! How are you? I'm fine... #awesome @user");
    });

    it("handles very long dialogue", async () => {
      const longText = "A".repeat(999); // Just under 1000 char limit

      const beat = await narrativeService.createBeat({
        storyId,
        position: 0,
        visualDescription: "Scene",
        dialogue: [{ characterId, text: longText, type: "speech" }],
      });

      await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      const result = await narrativeService.generateCaptionsFromBeat(beat.id);

      expect(result.captions[0].text.length).toBe(999);
    });

    it("handles concurrent generation calls", async () => {
      const beats = await Promise.all([
        narrativeService.createBeat({
          storyId,
          position: 0,
          visualDescription: "Scene 1",
          dialogue: [{ characterId, text: "Line 1", type: "speech" }],
        }),
        narrativeService.createBeat({
          storyId,
          position: 1,
          visualDescription: "Scene 2",
          dialogue: [{ characterId, text: "Line 2", type: "speech" }],
        }),
      ]);

      // Convert to panels
      for (const beat of beats) {
        await narrativeService.convertBeatToPanel(beat.id, storyboardId);
      }

      // Generate captions concurrently
      const results = await Promise.all(
        beats.map((beat) => narrativeService.generateCaptionsFromBeat(beat.id))
      );

      expect(results[0].captions[0].text).toBe("Line 1");
      expect(results[1].captions[0].text).toBe("Line 2");
    });
  });
});
