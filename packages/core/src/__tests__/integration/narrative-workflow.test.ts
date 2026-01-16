/**
 * Narrative Engine Integration Tests
 *
 * Tests the complete workflow from premise to panels,
 * including cross-service interactions and data consistency.
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
  getProjectService,
  getCharacterService,
  getStoryboardService,
  getPanelService,
} from "../../services/index.js";

describe("Narrative Engine Integration", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // FULL WORKFLOW TESTS
  // ============================================================================

  describe("Full Workflow: Premise → Story → Beats → Panels", () => {
    it("completes the entire narrative pipeline", async () => {
      const narrativeService = getNarrativeService();
      const panelService = getPanelService();

      // Step 1: Create project and storyboard
      const project = await createTestProject("Integration Test Project");
      const storyboard = await createTestStoryboard(project.id, "Comic Storyboard");

      // Step 2: Create characters
      const char1 = await createTestCharacter(project.id, "Hero");
      const char2 = await createTestCharacter(project.id, "Sidekick");

      // Step 3: Create premise
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "A hero and sidekick save the day",
        genre: "action",
        tone: "exciting",
        themes: ["heroism", "friendship"],
        characterIds: [char1.id, char2.id],
        setting: "A bustling city",
        worldRules: ["No magic", "Modern technology"],
        status: "active",
      });

      expect(premise.id).toBeDefined();
      expect(premise.status).toBe("active");

      // Step 4: Create story from premise
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "City Guardians",
        synopsis: "When trouble strikes, our heroes must work together",
        targetLength: 6,
        structure: "three-act",
        characterArcs: [
          {
            characterId: char1.id,
            startState: "Overconfident",
            endState: "Humble leader",
            keyMoments: ["Fails alone", "Learns teamwork"],
          },
          {
            characterId: char2.id,
            startState: "Insecure",
            endState: "Confident partner",
            keyMoments: ["Steps up", "Saves the day"],
          },
        ],
      });

      expect(story.premiseId).toBe(premise.id);

      // Step 5: Create beats
      const beatInputs = [
        {
          position: 0,
          actNumber: 1,
          beatType: "setup" as const,
          visualDescription: "Wide shot of the city skyline at dawn",
          narrativeContext: "Establishing the setting",
          emotionalTone: "peaceful",
          cameraAngle: "wide",
          characterIds: [],
        },
        {
          position: 1,
          actNumber: 1,
          beatType: "inciting" as const,
          visualDescription: "Hero spots trouble from a rooftop",
          narrativeContext: "The call to action",
          emotionalTone: "tense",
          cameraAngle: "medium",
          characterIds: [char1.id],
          dialogue: [{ characterId: char1.id, text: "This looks bad...", type: "speech" as const }],
        },
        {
          position: 2,
          actNumber: 2,
          beatType: "rising" as const,
          visualDescription: "Hero rushes in alone and struggles",
          narrativeContext: "The hero's overconfidence backfires",
          emotionalTone: "frustrated",
          cameraAngle: "close-up",
          characterIds: [char1.id],
        },
        {
          position: 3,
          actNumber: 2,
          beatType: "midpoint" as const,
          visualDescription: "Sidekick arrives to help",
          narrativeContext: "The turning point",
          emotionalTone: "hopeful",
          cameraAngle: "two-shot",
          characterIds: [char1.id, char2.id],
          dialogue: [{ characterId: char2.id, text: "You're not alone!", type: "speech" as const }],
        },
        {
          position: 4,
          actNumber: 3,
          beatType: "climax" as const,
          visualDescription: "Both heroes combine their strengths",
          narrativeContext: "The climactic battle",
          emotionalTone: "triumphant",
          cameraAngle: "wide",
          characterIds: [char1.id, char2.id],
          sfx: "BOOM!",
        },
        {
          position: 5,
          actNumber: 3,
          beatType: "resolution" as const,
          visualDescription: "Heroes celebrate their victory together",
          narrativeContext: "The new normal",
          emotionalTone: "joyful",
          cameraAngle: "medium",
          characterIds: [char1.id, char2.id],
          dialogue: [
            { characterId: char1.id, text: "Thanks, partner.", type: "speech" as const },
            { characterId: char2.id, text: "Always.", type: "speech" as const },
          ],
        },
      ];

      const beats = await narrativeService.createBeats(story.id, beatInputs);
      expect(beats).toHaveLength(6);

      // Verify story actualLength updated
      const updatedStory = await narrativeService.getStory(story.id);
      expect(updatedStory?.actualLength).toBe(6);

      // Step 6: Convert beats to panels
      const conversionResult = await narrativeService.convertStoryToStoryboard(
        story.id,
        storyboard.id
      );

      expect(conversionResult.panelIds).toHaveLength(6);

      // Verify panels were created
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(6);

      // Verify panels have correct descriptions from beats
      expect(panels[0].description).toBe("Wide shot of the city skyline at dawn");
      expect(panels[5].description).toBe("Heroes celebrate their victory together");

      // Verify story status updated
      const finalStory = await narrativeService.getStory(story.id);
      expect(finalStory?.status).toBe("panels_created");

      // Verify beats are linked to panels
      const finalBeats = await narrativeService.getBeats(story.id);
      for (const beat of finalBeats) {
        expect(beat.panelId).toBeDefined();
      }
    });

    it("maintains data consistency on partial failures", async () => {
      const narrativeService = getNarrativeService();

      // Create project and premise
      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Test consistency",
      });

      // Create story
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Consistency Test",
      });

      // Create beats
      await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Beat 1",
      });
      await narrativeService.createBeat({
        storyId: story.id,
        position: 1,
        visualDescription: "Beat 2",
      });

      // Attempting conversion without a storyboard should fail
      await expect(
        narrativeService.convertStoryToStoryboard(story.id, "nonexistent-storyboard")
      ).rejects.toThrow();

      // Original beats should be unchanged
      const beats = await narrativeService.getBeats(story.id);
      expect(beats).toHaveLength(2);
      for (const beat of beats) {
        expect(beat.panelId).toBeNull();
      }
    });
  });

  // ============================================================================
  // CASCADE DELETE TESTS
  // ============================================================================

  describe("Cascade Deletion", () => {
    it("deleting a project cascades to premises, stories, and beats", async () => {
      const narrativeService = getNarrativeService();
      const projectService = getProjectService();

      // Build full hierarchy
      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Cascade test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });
      await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Beat",
      });

      // Delete project
      await projectService.delete(project.id);

      // Verify cascade
      expect(await narrativeService.getPremise(premise.id)).toBeNull();
      expect(await narrativeService.getStory(story.id)).toBeNull();
    });

    it("deleting a premise cascades to stories and beats", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Cascade test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });
      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Beat",
      });

      await narrativeService.deletePremise(premise.id);

      expect(await narrativeService.getStory(story.id)).toBeNull();
      expect(await narrativeService.getBeat(beat.id)).toBeNull();
    });

    it("deleting a story cascades to beats", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Cascade test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });
      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Beat",
      });

      await narrativeService.deleteStory(story.id);

      expect(await narrativeService.getBeat(beat.id)).toBeNull();
      // Premise should still exist
      expect(await narrativeService.getPremise(premise.id)).toBeDefined();
    });
  });

  // ============================================================================
  // CROSS-SERVICE DATA INTEGRITY
  // ============================================================================

  describe("Cross-Service Data Integrity", () => {
    it("character references remain valid after narrative creation", async () => {
      const narrativeService = getNarrativeService();
      const characterService = getCharacterService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "Reference Test");

      // Create premise with character reference
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Test character reference",
        characterIds: [character.id],
      });

      // Verify character still accessible
      const retrievedChar = await characterService.getById(character.id);
      expect(retrievedChar).toBeDefined();
      expect(retrievedChar?.id).toBe(character.id);

      // Verify premise has character reference
      expect(premise.characterIds).toContain(character.id);
    });

    it("beat to panel conversion preserves character references", async () => {
      const narrativeService = getNarrativeService();
      const panelService = getPanelService();

      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "Panel Char");
      const storyboard = await createTestStoryboard(project.id);

      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Character in panel test",
        characterIds: [character.id],
      });

      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });

      const beat = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Character appears",
        characterIds: [character.id],
      });

      const result = await narrativeService.convertBeatToPanel(beat.id, storyboard.id);

      // Get the created panel
      const panel = await panelService.getById(result.panelId);
      expect(panel).toBeDefined();
      expect(panel?.characterIds).toContain(character.id);
    });

    it("multiple premises can reference the same characters", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const char1 = await createTestCharacter(project.id, "Shared Char 1");
      const char2 = await createTestCharacter(project.id, "Shared Char 2");

      const premise1 = await narrativeService.createPremise({
        projectId: project.id,
        logline: "First story with chars",
        characterIds: [char1.id, char2.id],
      });

      const premise2 = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Second story with same chars",
        characterIds: [char1.id, char2.id],
      });

      expect(premise1.characterIds).toEqual(premise2.characterIds);
    });
  });

  // ============================================================================
  // STORY STRUCTURE TESTS
  // ============================================================================

  describe("Story Structure Integrity", () => {
    it("beats maintain order after reordering", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Reorder test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });

      // Create beats
      const beat1 = await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "First",
      });
      const beat2 = await narrativeService.createBeat({
        storyId: story.id,
        position: 1,
        visualDescription: "Second",
      });
      const beat3 = await narrativeService.createBeat({
        storyId: story.id,
        position: 2,
        visualDescription: "Third",
      });

      // Reorder: 3, 1, 2
      await narrativeService.reorderBeats(story.id, [beat3.id, beat1.id, beat2.id]);

      const reorderedBeats = await narrativeService.getBeats(story.id);
      expect(reorderedBeats[0].visualDescription).toBe("Third");
      expect(reorderedBeats[1].visualDescription).toBe("First");
      expect(reorderedBeats[2].visualDescription).toBe("Second");
    });

    it("story actualLength updates after beat deletion", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Length test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });

      // Create 3 beats
      await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "Beat 1",
      });
      const beat2 = await narrativeService.createBeat({
        storyId: story.id,
        position: 1,
        visualDescription: "Beat 2",
      });
      await narrativeService.createBeat({
        storyId: story.id,
        position: 2,
        visualDescription: "Beat 3",
      });

      let storyCheck = await narrativeService.getStory(story.id);
      expect(storyCheck?.actualLength).toBe(3);

      // Delete middle beat
      await narrativeService.deleteBeat(beat2.id);

      storyCheck = await narrativeService.getStory(story.id);
      expect(storyCheck?.actualLength).toBe(2);
    });

    it("getStoryWithBeats returns beats in position order", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Order test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });

      // Create beats out of order
      await narrativeService.createBeat({
        storyId: story.id,
        position: 2,
        visualDescription: "Third",
      });
      await narrativeService.createBeat({
        storyId: story.id,
        position: 0,
        visualDescription: "First",
      });
      await narrativeService.createBeat({
        storyId: story.id,
        position: 1,
        visualDescription: "Second",
      });

      const storyWithBeats = await narrativeService.getStoryWithBeats(story.id);

      expect(storyWithBeats?.beats[0].visualDescription).toBe("First");
      expect(storyWithBeats?.beats[1].visualDescription).toBe("Second");
      expect(storyWithBeats?.beats[2].visualDescription).toBe("Third");
    });
  });

  // ============================================================================
  // MULTI-PROJECT ISOLATION
  // ============================================================================

  describe("Multi-Project Isolation", () => {
    it("premises are isolated by project", async () => {
      const narrativeService = getNarrativeService();

      const project1 = await createTestProject("Project 1");
      const project2 = await createTestProject("Project 2");

      await narrativeService.createPremise({
        projectId: project1.id,
        logline: "Project 1 premise",
      });
      await narrativeService.createPremise({
        projectId: project1.id,
        logline: "Another project 1 premise",
      });
      await narrativeService.createPremise({
        projectId: project2.id,
        logline: "Project 2 premise",
      });

      const project1Premises = await narrativeService.listPremises(project1.id);
      const project2Premises = await narrativeService.listPremises(project2.id);

      expect(project1Premises).toHaveLength(2);
      expect(project2Premises).toHaveLength(1);

      expect(project1Premises.every((p) => p.projectId === project1.id)).toBe(true);
      expect(project2Premises.every((p) => p.projectId === project2.id)).toBe(true);
    });
  });

  // ============================================================================
  // CONCURRENT OPERATIONS
  // ============================================================================

  describe("Concurrent Operations", () => {
    it("handles concurrent beat creations safely", async () => {
      const narrativeService = getNarrativeService();

      const project = await createTestProject();
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Concurrent test",
      });
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "Story",
      });

      // Create 10 beats concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        narrativeService.createBeat({
          storyId: story.id,
          position: i,
          visualDescription: `Concurrent beat ${i}`,
        })
      );

      const beats = await Promise.all(promises);
      expect(beats).toHaveLength(10);

      // Verify all unique IDs
      const ids = new Set(beats.map((b) => b.id));
      expect(ids.size).toBe(10);

      // Verify story length
      const updatedStory = await narrativeService.getStory(story.id);
      expect(updatedStory?.actualLength).toBe(10);
    });

    it("handles concurrent premise creations across projects", async () => {
      const narrativeService = getNarrativeService();

      const project1 = await createTestProject("Concurrent 1");
      const project2 = await createTestProject("Concurrent 2");

      const promises = [
        ...Array.from({ length: 5 }, (_, i) =>
          narrativeService.createPremise({
            projectId: project1.id,
            logline: `P1 premise ${i}`,
          })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          narrativeService.createPremise({
            projectId: project2.id,
            logline: `P2 premise ${i}`,
          })
        ),
      ];

      const premises = await Promise.all(promises);
      expect(premises).toHaveLength(10);

      const p1Premises = await narrativeService.listPremises(project1.id);
      const p2Premises = await narrativeService.listPremises(project2.id);

      expect(p1Premises).toHaveLength(5);
      expect(p2Premises).toHaveLength(5);
    });
  });
});
