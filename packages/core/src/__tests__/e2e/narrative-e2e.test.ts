/**
 * E2E Tests for Narrative Engine
 *
 * These tests simulate real user workflows from start to finish,
 * testing the complete system including:
 * - Database persistence
 * - Service interactions
 * - Full user journeys
 *
 * Unlike the contract tests which test REST API shape, these tests
 * exercise the full business logic layer.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestCharacter,
} from "../setup.js";
import { getNarrativeService } from "../../services/narrative.service.js";
import { getPanelService } from "../../services/panel.service.js";
import { getStoryboardService } from "../../services/storyboard.service.js";
import { getProjectService } from "../../services/project.service.js";
import { getCharacterService } from "../../services/character.service.js";

describe("E2E: Narrative Engine Workflows", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("Workflow 1: Comic Creator Journey", () => {
    it("creates a complete comic from idea to panels", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();
      const narrativeService = getNarrativeService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      // Step 1: Create a project
      const project = await projectService.create({
        name: "Beach Adventure Comic",
        description: "A summer beach adventure story",
      });

      // Step 2: Create characters
      const char1 = await characterService.create({
        projectId: project.id,
        name: "Sandy",
        profile: { species: "otter", bodyType: "slim", features: ["adventurous expression"] },
      });

      const char2 = await characterService.create({
        projectId: project.id,
        name: "Coral",
        profile: { species: "seal", bodyType: "average", features: ["cautious demeanor"] },
      });

      // Step 3: Create a premise
      const premise = await narrativeService.createPremise({
        projectId: project.id,
        logline: "Sandy convinces Coral to explore a mysterious cave at the beach",
        genre: "adventure",
        tone: "lighthearted",
        themes: ["friendship", "courage", "discovery"],
        characterIds: [char1.id, char2.id],
        setting: "A sunny beach with hidden caves",
      });

      expect(premise.logline).toContain("cave");
      expect(premise.characterIds).toHaveLength(2);

      // Step 4: Create a story from the premise
      const story = await narrativeService.createStory({
        premiseId: premise.id,
        title: "The Hidden Cove",
        synopsis: "When Sandy discovers a mysterious cave, she must convince her cautious friend Coral to join her in exploring its secrets.",
        targetLength: 6,
        structure: "three-act",
      });

      expect(story.premiseId).toBe(premise.id);

      // Step 5: Create beats for the story
      const beats = await narrativeService.createBeats(story.id, [
        {
          position: 0,
          actNumber: 1,
          beatType: "setup",
          visualDescription: "Wide shot of the beach at golden hour. Sandy excitedly points toward a dark opening in the cliffside.",
          narrativeContext: "Sandy discovers the cave",
          emotionalTone: "excited",
          characterIds: [char1.id],
          dialogue: [{ characterId: char1.id, text: "Look what I found!", type: "speech" }],
          cameraAngle: "wide",
        },
        {
          position: 1,
          actNumber: 1,
          beatType: "inciting",
          visualDescription: "Medium shot of Coral looking worried, shaking her head while Sandy gestures enthusiastically.",
          narrativeContext: "Coral refuses to go",
          emotionalTone: "anxious",
          characterIds: [char1.id, char2.id],
          dialogue: [
            { characterId: char2.id, text: "That looks dangerous...", type: "speech" },
            { characterId: char1.id, text: "Where's your sense of adventure?", type: "speech" },
          ],
          cameraAngle: "medium",
        },
        {
          position: 2,
          actNumber: 2,
          beatType: "rising",
          visualDescription: "Close-up of Sandy's determined face as she starts walking toward the cave alone.",
          narrativeContext: "Sandy decides to go alone",
          emotionalTone: "determined",
          characterIds: [char1.id],
          cameraAngle: "close-up",
        },
        {
          position: 3,
          actNumber: 2,
          beatType: "midpoint",
          visualDescription: "Inside the cave - Sandy discovers beautiful bioluminescent creatures lighting up the walls.",
          narrativeContext: "Sandy discovers wonder",
          emotionalTone: "joyful",
          characterIds: [char1.id],
          dialogue: [{ characterId: char1.id, text: "Coral has to see this!", type: "thought" }],
          cameraAngle: "wide",
        },
        {
          position: 4,
          actNumber: 3,
          beatType: "climax",
          visualDescription: "Coral enters the cave, her worried expression transforming to awe as she sees the glowing creatures.",
          narrativeContext: "Coral overcomes her fear",
          emotionalTone: "hopeful",
          characterIds: [char1.id, char2.id],
          dialogue: [{ characterId: char2.id, text: "It's... beautiful!", type: "speech" }],
          cameraAngle: "two-shot",
        },
        {
          position: 5,
          actNumber: 3,
          beatType: "resolution",
          visualDescription: "Both friends sitting together in the cave, surrounded by glowing creatures, smiling at each other.",
          narrativeContext: "Friendship strengthened",
          emotionalTone: "peaceful",
          characterIds: [char1.id, char2.id],
          dialogue: [
            { characterId: char1.id, text: "Thanks for trusting me.", type: "speech" },
            { characterId: char2.id, text: "Thanks for not giving up on me.", type: "speech" },
          ],
          cameraAngle: "medium",
        },
      ]);
      expect(beats).toHaveLength(6);

      // Step 6: Create a storyboard
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Hidden Cove Storyboard",
        description: "Visual storyboard for The Hidden Cove",
      });

      // Step 7: Convert story to storyboard (creates panels)
      const conversion = await narrativeService.convertStoryToStoryboard(story.id, storyboard.id);
      expect(conversion.panelIds).toHaveLength(6);

      // Step 8: Verify panels were created correctly
      const panels = await panelService.getByStoryboard(storyboard.id);

      expect(panels).toHaveLength(6);
      expect(panels[0].description).toContain("beach");
      expect(panels[0].characterIds).toContain(char1.id);
      expect(panels[5].characterIds).toEqual(expect.arrayContaining([char1.id, char2.id]));

      // Step 9: Verify story status was updated
      const finalStory = await narrativeService.getStory(story.id);
      expect(finalStory?.status).toBe("panels_created");

      // Step 10: Verify we can read the complete workflow data
      const storyWithBeats = await narrativeService.getStoryWithBeats(story.id);
      expect(storyWithBeats?.beats).toHaveLength(6);
      expect(storyWithBeats?.beats.every((b) => b.panelId !== null)).toBe(true);
    });
  });

  describe("Workflow 2: Iterative Story Development", () => {
    it("allows iterative refinement of story beats", async () => {
      // Setup
      const project = await createTestProject();
      const char = await createTestCharacter(project.id);

      const premise = await getNarrativeService().createPremise({
        projectId: project.id,
        logline: "A robot learns to dance",
        characterIds: [char.id],
      });

      const story = await getNarrativeService().createStory({
        premiseId: premise.id,
        title: "Dance Protocol",
      });

      // Create initial beats
      const initialBeats = await getNarrativeService().createBeats(story.id, [
        { position: 0, visualDescription: "Robot sees humans dancing" },
        { position: 1, visualDescription: "Robot tries to dance, fails" },
        { position: 2, visualDescription: "Robot succeeds after practice" },
      ]);

      // Refine a beat
      const updatedBeat = await getNarrativeService().updateBeat(initialBeats[1].id, {
        visualDescription: "Robot attempts to mimic dance moves, awkwardly bumping into furniture",
        emotionalTone: "frustrated",
        cameraAngle: "wide",
      });

      expect(updatedBeat.visualDescription).toContain("awkwardly");
      expect(updatedBeat.emotionalTone).toBe("frustrated");

      // Add a new beat in the middle
      const newBeat = await getNarrativeService().createBeat({
        storyId: story.id,
        position: 2,
        visualDescription: "A kind child offers to teach the robot",
        emotionalTone: "hopeful",
      });

      // Reorder beats
      const reordered = await getNarrativeService().reorderBeats(story.id, [
        initialBeats[0].id,
        initialBeats[1].id,
        newBeat.id,
        initialBeats[2].id,
      ]);

      expect(reordered[2].id).toBe(newBeat.id);
      expect(reordered[2].position).toBe(2);
      expect(reordered[3].position).toBe(3);

      // Verify final beat count
      const finalBeats = await getNarrativeService().getBeats(story.id);
      expect(finalBeats).toHaveLength(4);

      // Verify story's actualLength was updated
      const finalStory = await getNarrativeService().getStory(story.id);
      expect(finalStory?.actualLength).toBe(4);
    });
  });

  describe("Workflow 3: Multi-Story Premise", () => {
    it("creates multiple story variations from one premise", async () => {
      const project = await createTestProject();
      const char = await createTestCharacter(project.id);

      // Create a flexible premise
      const premise = await getNarrativeService().createPremise({
        projectId: project.id,
        logline: "A musician faces their biggest challenge",
        genre: "drama",
        characterIds: [char.id],
        themes: ["perseverance", "art", "self-doubt"],
      });

      // Create story variant 1: Comedy version
      const comedyStory = await getNarrativeService().createStory({
        premiseId: premise.id,
        title: "Stage Fright",
        synopsis: "A musician keeps getting interrupted by hilarious mishaps",
        structure: "three-act",
      });

      // Create story variant 2: Drama version
      const dramaStory = await getNarrativeService().createStory({
        premiseId: premise.id,
        title: "The Last Concert",
        synopsis: "A musician prepares for what might be their final performance",
        structure: "five-act",
      });

      // List stories by premise
      const stories = await getNarrativeService().listStoriesByPremise(premise.id);
      expect(stories).toHaveLength(2);

      // Add beats to each
      await getNarrativeService().createBeats(comedyStory.id, [
        { position: 0, visualDescription: "Musician prepares backstage" },
        { position: 1, visualDescription: "Instrument string breaks" },
        { position: 2, visualDescription: "Audience member's phone rings" },
        { position: 3, visualDescription: "Everything goes wrong at once" },
        { position: 4, visualDescription: "Musician improvises brilliantly" },
      ]);

      await getNarrativeService().createBeats(dramaStory.id, [
        { position: 0, visualDescription: "Musician alone in dressing room" },
        { position: 1, visualDescription: "Flashback to their first concert" },
        { position: 2, visualDescription: "Deep breath before walking on stage" },
        { position: 3, visualDescription: "Emotional performance" },
        { position: 4, visualDescription: "Standing ovation" },
        { position: 5, visualDescription: "Quiet smile backstage" },
      ]);

      // Verify each story has its beats
      const comedyBeats = await getNarrativeService().getBeats(comedyStory.id);
      const dramaBeats = await getNarrativeService().getBeats(dramaStory.id);

      expect(comedyBeats).toHaveLength(5);
      expect(dramaBeats).toHaveLength(6);

      // Get premise with all stories
      const premiseWithStories = await getNarrativeService().getPremiseWithStories(premise.id);
      expect(premiseWithStories?.stories).toHaveLength(2);
    });
  });

  describe("Workflow 4: Character Arc Tracking", () => {
    it("tracks character development across beats", async () => {
      const project = await createTestProject();
      const hero = await createTestCharacter(project.id, "Hero");
      const mentor = await createTestCharacter(project.id, "Mentor");

      const premise = await getNarrativeService().createPremise({
        projectId: project.id,
        logline: "A novice learns from a master",
        characterIds: [hero.id, mentor.id],
      });

      const story = await getNarrativeService().createStory({
        premiseId: premise.id,
        title: "The Apprentice",
        characterArcs: [
          {
            characterId: hero.id,
            startState: "Eager but unskilled",
            endState: "Confident and competent",
            keyMoments: ["First failure", "Breakthrough moment", "Final test"],
          },
          {
            characterId: mentor.id,
            startState: "Gruff and distant",
            endState: "Proud and accepting",
            keyMoments: ["Reveals past failure", "Shows vulnerability"],
          },
        ],
      });

      // Create beats that follow the character arcs
      await getNarrativeService().createBeats(story.id, [
        {
          position: 0,
          visualDescription: "Hero eagerly approaches Mentor",
          characterIds: [hero.id, mentor.id],
          characterActions: {
            [hero.id]: "Bowing respectfully",
            [mentor.id]: "Turning away dismissively",
          },
        },
        {
          position: 1,
          visualDescription: "Hero fails at the first task",
          characterIds: [hero.id],
          characterActions: { [hero.id]: "Frustrated, tools scattered" },
        },
        {
          position: 2,
          visualDescription: "Mentor reveals their own past failure",
          characterIds: [hero.id, mentor.id],
          characterActions: { [mentor.id]: "Showing old scars" },
        },
        {
          position: 3,
          visualDescription: "Hero has breakthrough moment",
          characterIds: [hero.id],
          characterActions: { [hero.id]: "Eyes wide with understanding" },
        },
        {
          position: 4,
          visualDescription: "Hero passes final test",
          characterIds: [hero.id, mentor.id],
          characterActions: {
            [hero.id]: "Executing technique perfectly",
            [mentor.id]: "Nodding with pride",
          },
        },
      ]);

      // Verify character involvement across beats
      const beats = await getNarrativeService().getBeats(story.id);

      const heroBeats = beats.filter((b) => b.characterIds?.includes(hero.id));
      const mentorBeats = beats.filter((b) => b.characterIds?.includes(mentor.id));

      expect(heroBeats).toHaveLength(5);
      expect(mentorBeats).toHaveLength(3);

      // Verify character actions are tracked
      expect(beats[0].characterActions?.[hero.id]).toBe("Bowing respectfully");
      expect(beats[4].characterActions?.[mentor.id]).toBe("Nodding with pride");
    });
  });

  describe("Workflow 5: Panel Customization After Conversion", () => {
    it("allows editing panels after beat conversion", async () => {
      const project = await createTestProject();
      const storyboard = await getStoryboardService().create({
        projectId: project.id,
        name: "Test Storyboard",
      });

      const premise = await getNarrativeService().createPremise({
        projectId: project.id,
        logline: "Test story",
      });

      const story = await getNarrativeService().createStory({
        premiseId: premise.id,
        title: "Test",
      });

      await getNarrativeService().createBeats(story.id, [
        { position: 0, visualDescription: "Opening scene", cameraAngle: "wide" },
        { position: 1, visualDescription: "Closing scene", cameraAngle: "close-up" },
      ]);

      // Convert to panels
      await getNarrativeService().convertStoryToStoryboard(story.id, storyboard.id);

      // Get the panels
      const panelService = getPanelService();
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(2);

      // Edit a panel (this would be done by the user in the UI)
      const updatedPanel = await panelService.describe(panels[0].id, {
        description: "Modified opening scene with extra detail",
        direction: {
          cameraAngle: "bird's eye",
          mood: "dramatic",
          lighting: "golden hour",
        },
      });

      expect(updatedPanel.description).toContain("Modified");
      expect(updatedPanel.direction?.cameraAngle).toBe("bird's eye");

      // Verify the beat still references the panel
      const beats = await getNarrativeService().getBeats(story.id);
      expect(beats[0].panelId).toBe(panels[0].id);
    });
  });
});

describe("E2E: Error Recovery and Edge Cases", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  it("handles partial workflow failures gracefully", async () => {
    const project = await createTestProject();

    const premise = await getNarrativeService().createPremise({
      projectId: project.id,
      logline: "Test story",
    });

    const story = await getNarrativeService().createStory({
      premiseId: premise.id,
      title: "Test",
    });

    // Try to convert story without beats - should fail
    const storyboard = await getStoryboardService().create({
      projectId: project.id,
      name: "Test Storyboard",
    });

    try {
      await getNarrativeService().convertStoryToStoryboard(story.id, storyboard.id);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("no beats");
    }

    // Add beats and retry
    await getNarrativeService().createBeat({
      storyId: story.id,
      position: 0,
      visualDescription: "Test beat",
    });

    const result = await getNarrativeService().convertStoryToStoryboard(story.id, storyboard.id);
    expect(result.panelIds).toHaveLength(1);
  });

  it("maintains referential integrity during deletions", async () => {
    const project = await createTestProject();

    const premise = await getNarrativeService().createPremise({
      projectId: project.id,
      logline: "Test",
    });

    const story = await getNarrativeService().createStory({
      premiseId: premise.id,
      title: "Test",
    });

    await getNarrativeService().createBeat({
      storyId: story.id,
      position: 0,
      visualDescription: "Test beat",
    });

    // Delete story - should cascade delete beats
    await getNarrativeService().deleteStory(story.id);

    const beats = await getNarrativeService().getBeats(story.id);
    expect(beats).toHaveLength(0);

    // Delete premise - should cascade delete associated data
    const story2 = await getNarrativeService().createStory({
      premiseId: premise.id,
      title: "Another story",
    });

    await getNarrativeService().deletePremise(premise.id);

    const deletedStory = await getNarrativeService().getStory(story2.id);
    expect(deletedStory).toBeNull();
  });

  it("handles concurrent beat operations safely", async () => {
    const project = await createTestProject();

    const premise = await getNarrativeService().createPremise({
      projectId: project.id,
      logline: "Test",
    });

    const story = await getNarrativeService().createStory({
      premiseId: premise.id,
      title: "Test",
    });

    // Create beats concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      getNarrativeService().createBeat({
        storyId: story.id,
        position: i,
        visualDescription: `Beat ${i}`,
      })
    );

    const beats = await Promise.all(promises);
    expect(beats).toHaveLength(5);

    // Verify all beats were created with correct positions
    const allBeats = await getNarrativeService().getBeats(story.id);
    expect(allBeats).toHaveLength(5);

    // Update story's actualLength
    const updatedStory = await getNarrativeService().getStory(story.id);
    expect(updatedStory?.actualLength).toBe(5);
  });
});
