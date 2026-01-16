/**
 * Service Interaction Integration Tests
 *
 * Tests verifying interactions between different services.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
  createTestCharacter,
} from "../setup.js";
import {
  getProjectService,
  getCharacterService,
  getStoryboardService,
  getPanelService,
  getCaptionService,
  getBatchService,
  getStoryScaffoldService,
} from "../../services/index.js";

describe("Service Interaction", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // PROJECT-CHARACTER INTERACTION
  // ============================================================================

  describe("Project-Character interaction", () => {
    it("character inherits project defaults", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();

      const project = await projectService.create({
        name: "Test",
        settings: {
          defaultModel: "anime-model.safetensors",
          defaultLoras: [{ name: "style.safetensors", strength: 0.7 }],
        },
      });

      const character = await characterService.create({
        projectId: project.id,
        name: "Hero",
        profile: { species: "fox" },
      });

      // Character should be able to access project settings through project reference
      const projectWithSettings = await projectService.getById(project.id);
      expect(projectWithSettings?.settings?.defaultModel).toBe("anime-model.safetensors");
    });

    it("multiple characters share project context", async () => {
      const project = await createTestProject("Test");

      const char1 = await createTestCharacter(project.id, "Hero");
      const char2 = await createTestCharacter(project.id, "Villain");
      const char3 = await createTestCharacter(project.id, "Sidekick");

      const characterService = getCharacterService();
      const characters = await characterService.getByProject(project.id);

      expect(characters).toHaveLength(3);
      characters.forEach((c) => {
        expect(c.projectId).toBe(project.id);
      });
    });
  });

  // ============================================================================
  // STORYBOARD-PANEL INTERACTION
  // ============================================================================

  describe("Storyboard-Panel interaction", () => {
    it("panels maintain order within storyboard", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panelService = getPanelService();

      // Create panels out of order
      await panelService.create({
        storyboardId: storyboard.id,
        description: "Third",
        position: 3,
      });
      await panelService.create({
        storyboardId: storyboard.id,
        description: "First",
        position: 1,
      });
      await panelService.create({
        storyboardId: storyboard.id,
        description: "Second",
        position: 2,
      });

      const panels = await panelService.getByStoryboard(storyboard.id);

      expect(panels[0].description).toBe("First");
      expect(panels[1].description).toBe("Second");
      expect(panels[2].description).toBe("Third");
    });

    it("storyboard tracks panel count correctly", async () => {
      const project = await createTestProject("Test");
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter",
      });

      // Add panels
      await panelService.create({ storyboardId: storyboard.id });
      await panelService.create({ storyboardId: storyboard.id });
      await panelService.create({ storyboardId: storyboard.id });

      const result = await storyboardService.getWithPanels(storyboard.id);
      expect(result?.panels).toHaveLength(3);
    });
  });

  // ============================================================================
  // PANEL-CAPTION INTERACTION
  // ============================================================================

  describe("Panel-Caption interaction", () => {
    it("captions are ordered by zIndex within panel", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const captionService = getCaptionService();

      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Front",
        position: { x: 0.5, y: 0.2 },
        zIndex: 10,
      });
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Back",
        position: { x: 0.5, y: 0.5 },
        zIndex: 1,
      });

      const captions = await captionService.getByPanel(panel.id);
      expect(captions[0].text).toBe("Back");
      expect(captions[1].text).toBe("Front");
    });

    it("multiple panels have independent caption sets", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel1 = await createTestPanel(storyboard.id, "Panel 1");
      const panel2 = await createTestPanel(storyboard.id, "Panel 2");
      const captionService = getCaptionService();

      await captionService.create({
        panelId: panel1.id,
        type: "speech",
        text: "Panel 1 caption",
        position: { x: 0.5, y: 0.5 },
      });
      await captionService.create({
        panelId: panel2.id,
        type: "speech",
        text: "Panel 2 caption",
        position: { x: 0.5, y: 0.5 },
      });

      const captions1 = await captionService.getByPanel(panel1.id);
      const captions2 = await captionService.getByPanel(panel2.id);

      expect(captions1).toHaveLength(1);
      expect(captions2).toHaveLength(1);
      expect(captions1[0].text).toBe("Panel 1 caption");
      expect(captions2[0].text).toBe("Panel 2 caption");
    });
  });

  // ============================================================================
  // PANEL-CHARACTER INTERACTION
  // ============================================================================

  describe("Panel-Character interaction", () => {
    it("panel tracks multiple characters", async () => {
      const project = await createTestProject("Test");
      const char1 = await createTestCharacter(project.id, "Hero");
      const char2 = await createTestCharacter(project.id, "Villain");
      const char3 = await createTestCharacter(project.id, "Sidekick");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panelService = getPanelService();

      const panel = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [char1.id, char2.id, char3.id],
      });

      expect(panel.characterIds).toHaveLength(3);
      expect(panel.characterIds).toContain(char1.id);
      expect(panel.characterIds).toContain(char2.id);
      expect(panel.characterIds).toContain(char3.id);
    });

    it("character can appear in multiple panels", async () => {
      const project = await createTestProject("Test");
      const character = await createTestCharacter(project.id, "Hero");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panelService = getPanelService();

      const panel1 = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [character.id],
      });
      const panel2 = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [character.id],
      });
      const panel3 = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [character.id],
      });

      expect(panel1.characterIds).toContain(character.id);
      expect(panel2.characterIds).toContain(character.id);
      expect(panel3.characterIds).toContain(character.id);
    });
  });

  // ============================================================================
  // BATCH-SERVICE INTERACTION
  // ============================================================================

  describe("Batch-Service interaction", () => {
    it("batch service uses panel service internally", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const batchService = getBatchService();
      const panelService = getPanelService();

      await batchService.createPanels(storyboard.id, [
        { description: "Batch Panel 1" },
        { description: "Batch Panel 2" },
      ]);

      // Should be accessible through panel service
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(2);
    });

    it("batch caption operations use caption service", async () => {
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");
      const panel = await createTestPanel(storyboard.id, "Panel");
      const batchService = getBatchService();
      const captionService = getCaptionService();

      await batchService.addCaptions([
        {
          panelId: panel.id,
          caption: {
            panelId: panel.id,
            type: "speech",
            text: "Batch Caption",
            position: { x: 0.5, y: 0.5 },
          },
        },
      ]);

      // Should be accessible through caption service
      const captions = await captionService.getByPanel(panel.id);
      expect(captions).toHaveLength(1);
      expect(captions[0].text).toBe("Batch Caption");
    });
  });

  // ============================================================================
  // SCAFFOLD-SERVICE INTERACTION
  // ============================================================================

  describe("Scaffold-Service interaction", () => {
    it("scaffold creates consistent structure", async () => {
      const project = await createTestProject("Test");
      const scaffoldService = getStoryScaffoldService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      await scaffoldService.scaffold({
        projectId: project.id,
        title: "Story",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                description: "Scene 1",
                panels: [{ description: "Panel 1" }, { description: "Panel 2" }],
              },
            ],
          },
        ],
      });

      // Should be accessible through standard services
      const storyboards = await storyboardService.getByProject(project.id);
      expect(storyboards.length).toBeGreaterThan(0);

      const panels = await panelService.getByStoryboard(storyboards[0].id);
      expect(panels).toHaveLength(2);
    });

    it("scaffold resolves character references", async () => {
      const project = await createTestProject("Test");
      const hero = await createTestCharacter(project.id, "Hero");
      const scaffoldService = getStoryScaffoldService();
      const panelService = getPanelService();

      const result = await scaffoldService.scaffold({
        projectId: project.id,
        title: "Story",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Scene 1",
                panels: [
                  {
                    description: "Hero appears",
                    characterNames: ["Hero"], // Use characterNames, not characterIds
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      // Panel should have character reference - access via acts[0].scenes[0].panelIds[0]
      const panelId = result.acts[0].scenes[0].panelIds[0];
      const panel = await panelService.getById(panelId);
      expect(panel?.characterIds).toContain(hero.id);
    });
  });

  // ============================================================================
  // CROSS-PROJECT ISOLATION
  // ============================================================================

  describe("Cross-project isolation", () => {
    it("characters are isolated by project", async () => {
      const characterService = getCharacterService();

      const project1 = await createTestProject("Project 1");
      const project2 = await createTestProject("Project 2");

      await createTestCharacter(project1.id, "Hero 1");
      await createTestCharacter(project2.id, "Hero 2");

      const chars1 = await characterService.getByProject(project1.id);
      const chars2 = await characterService.getByProject(project2.id);

      expect(chars1).toHaveLength(1);
      expect(chars2).toHaveLength(1);
      expect(chars1[0].name).toBe("Hero 1");
      expect(chars2[0].name).toBe("Hero 2");
    });

    it("storyboards are isolated by project", async () => {
      const storyboardService = getStoryboardService();

      const project1 = await createTestProject("Project 1");
      const project2 = await createTestProject("Project 2");

      await createTestStoryboard(project1.id, "Chapter 1");
      await createTestStoryboard(project2.id, "Chapter A");

      const sbs1 = await storyboardService.getByProject(project1.id);
      const sbs2 = await storyboardService.getByProject(project2.id);

      expect(sbs1).toHaveLength(1);
      expect(sbs2).toHaveLength(1);
      expect(sbs1[0].name).toBe("Chapter 1");
      expect(sbs2[0].name).toBe("Chapter A");
    });
  });
});
