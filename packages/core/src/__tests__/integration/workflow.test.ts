/**
 * Workflow Integration Tests
 *
 * End-to-end workflow tests that verify the complete pipeline from
 * project creation through generation and composition.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
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
import { getCompositionService } from "../../composition/index.js";

describe("Workflow Integration", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // PROJECT → STORYBOARD → PANEL WORKFLOW
  // ============================================================================

  describe("Project → Storyboard → Panel flow", () => {
    it("creates complete project structure", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      // Create project
      const project = await projectService.create({
        name: "My Comic",
        description: "A test comic project",
      });
      expect(project.id).toBeDefined();

      // Create storyboard in project
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });
      expect(storyboard.projectId).toBe(project.id);

      // Create panels in storyboard
      const panel1 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Opening scene",
      });
      const panel2 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Hero introduction",
      });

      // Verify structure
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(2);
      expect(panels[0].position).toBeLessThan(panels[1].position);
    });

    it("deleting project cascades to storyboards", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();

      const project = await projectService.create({ name: "To Delete" });
      await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });
      await storyboardService.create({
        projectId: project.id,
        name: "Chapter 2",
      });

      // Delete project
      await projectService.delete(project.id);

      // Storyboards should be gone
      const storyboards = await storyboardService.getByProject(project.id);
      expect(storyboards).toHaveLength(0);
    });

    it("deleting storyboard cascades to panels", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "To Delete",
      });
      const panel = await panelService.create({ storyboardId: storyboard.id });

      // Delete storyboard
      await storyboardService.delete(storyboard.id);

      // Panel should be gone
      const found = await panelService.getById(panel.id);
      expect(found).toBeNull();
    });
  });

  // ============================================================================
  // CHARACTER → PANEL ASSOCIATION WORKFLOW
  // ============================================================================

  describe("Character → Panel association flow", () => {
    it("associates characters with panels", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await projectService.create({ name: "Test" });

      // Create characters
      const hero = await characterService.create({
        projectId: project.id,
        name: "Hero",
        profile: { species: "fox" },
      });
      const villain = await characterService.create({
        projectId: project.id,
        name: "Villain",
        profile: { species: "fox" },
      });

      // Create storyboard and panel
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });
      const panel = await panelService.create({
        storyboardId: storyboard.id,
        description: "Confrontation",
      });

      // Associate characters with panel
      await panelService.addCharacter(panel.id, hero.id);
      await panelService.addCharacter(panel.id, villain.id);

      // Verify association
      const updated = await panelService.getById(panel.id);
      expect(updated?.characterIds).toContain(hero.id);
      expect(updated?.characterIds).toContain(villain.id);
    });

    it("removes character from all panels when deleted", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await projectService.create({ name: "Test" });
      const character = await characterService.create({
        projectId: project.id,
        name: "Hero",
        profile: { species: "fox" },
      });

      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });

      // Create multiple panels with the character
      const panel1 = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [character.id],
      });
      const panel2 = await panelService.create({
        storyboardId: storyboard.id,
        characterIds: [character.id],
      });

      // Delete character
      await characterService.delete(character.id);

      // Panels should have character removed
      const p1 = await panelService.getById(panel1.id);
      const p2 = await panelService.getById(panel2.id);

      expect(p1?.characterIds).not.toContain(character.id);
      expect(p2?.characterIds).not.toContain(character.id);
    });
  });

  // ============================================================================
  // CAPTION WORKFLOW
  // ============================================================================

  describe("Caption workflow", () => {
    it("adds and renders captions on panel", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const captionService = getCaptionService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });
      const panel = await panelService.create({
        storyboardId: storyboard.id,
        description: "Dialogue scene",
      });

      // Add speech bubble
      const caption1 = await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Hello there!",
        position: { x: 0.3, y: 0.2 },
      });

      // Add thought bubble
      const caption2 = await captionService.create({
        panelId: panel.id,
        type: "thought",
        text: "What does he want...",
        position: { x: 0.7, y: 0.4 },
      });

      // Verify captions
      const captions = await captionService.getByPanel(panel.id);
      expect(captions).toHaveLength(2);
    });

    it("clears all captions from panel", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const captionService = getCaptionService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });
      const panel = await panelService.create({ storyboardId: storyboard.id });

      // Add multiple captions
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Caption 1",
        position: { x: 0.3, y: 0.2 },
      });
      await captionService.create({
        panelId: panel.id,
        type: "speech",
        text: "Caption 2",
        position: { x: 0.7, y: 0.3 },
      });

      // Clear captions
      await captionService.deleteByPanel(panel.id);

      // Verify cleared
      const captions = await captionService.getByPanel(panel.id);
      expect(captions).toHaveLength(0);
    });
  });

  // ============================================================================
  // BATCH OPERATIONS WORKFLOW
  // ============================================================================

  describe("Batch operations workflow", () => {
    it("creates multiple panels at once", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const batchService = getBatchService();
      const panelService = getPanelService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });

      // Batch create panels
      const result = await batchService.createPanels(storyboard.id, [
        { description: "Panel 1" },
        { description: "Panel 2" },
        { description: "Panel 3" },
        { description: "Panel 4" },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(4);

      // Verify in database
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(4);
    });

    it("adds captions to multiple panels", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const batchService = getBatchService();
      const captionService = getCaptionService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });

      const panel1 = await panelService.create({ storyboardId: storyboard.id });
      const panel2 = await panelService.create({ storyboardId: storyboard.id });

      // Batch add captions
      const result = await batchService.addCaptions([
        {
          panelId: panel1.id,
          caption: {
            panelId: panel1.id,
            type: "speech",
            text: "Hello!",
            position: { x: 0.5, y: 0.2 },
          },
        },
        {
          panelId: panel2.id,
          caption: {
            panelId: panel2.id,
            type: "speech",
            text: "Hi there!",
            position: { x: 0.5, y: 0.2 },
          },
        },
      ]);

      expect(result.success).toBe(true);

      // Verify captions
      const captions1 = await captionService.getByPanel(panel1.id);
      const captions2 = await captionService.getByPanel(panel2.id);
      expect(captions1).toHaveLength(1);
      expect(captions2).toHaveLength(1);
    });

    it("deletes multiple panels at once", async () => {
      const projectService = getProjectService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const batchService = getBatchService();

      const project = await projectService.create({ name: "Test" });
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1",
      });

      const panel1 = await panelService.create({ storyboardId: storyboard.id });
      const panel2 = await panelService.create({ storyboardId: storyboard.id });
      const panel3 = await panelService.create({ storyboardId: storyboard.id });

      // Batch delete
      const result = await batchService.deletePanels([panel1.id, panel2.id]);

      expect(result.success).toBe(true);
      expect(result.deleted).toHaveLength(2);

      // Verify only panel3 remains
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(1);
      expect(panels[0].id).toBe(panel3.id);
    });
  });

  // ============================================================================
  // STORY SCAFFOLDING WORKFLOW
  // ============================================================================

  describe("Story scaffolding workflow", () => {
    it("scaffolds complete story structure", async () => {
      const projectService = getProjectService();
      const storyScaffoldService = getStoryScaffoldService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();

      const project = await projectService.create({ name: "My Story" });

      // Scaffold story
      const result = await storyScaffoldService.scaffold({
        projectId: project.id,
        title: "The Adventure",
        acts: [
          {
            name: "Act 1: Setup",
            scenes: [
              {
                name: "Opening",
                panels: [
                  { description: "Hero in village" },
                  { description: "Call to adventure" },
                ],
              },
            ],
          },
          {
            name: "Act 2: Conflict",
            scenes: [
              {
                name: "Journey",
                panels: [
                  { description: "Leaving home" },
                  { description: "Meeting mentor" },
                ],
              },
              {
                name: "Trials",
                panels: [
                  { description: "First challenge" },
                  { description: "Victory" },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBeGreaterThanOrEqual(3);
      expect(result.totalPanels).toBe(6);

      // Verify structure in database
      const storyboards = await storyboardService.getByProject(project.id);
      expect(storyboards.length).toBeGreaterThanOrEqual(3);

      let totalPanels = 0;
      for (const sb of storyboards) {
        const panels = await panelService.getByStoryboard(sb.id);
        totalPanels += panels.length;
      }
      expect(totalPanels).toBe(6);
    });

    it("scaffolds from text outline", async () => {
      const projectService = getProjectService();
      const storyScaffoldService = getStoryScaffoldService();

      const project = await projectService.create({ name: "Outlined Story" });

      const outline = `
# The Adventure

## Act 1

### Opening Scene
- Hero wakes up in village
- Strange noise outside

### Discovery
- Hero finds artifact
- Vision of destiny
      `.trim();

      const result = await storyScaffoldService.fromOutline(project.id, outline);

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(2);
      expect(result.totalPanels).toBe(4);
    });
  });

  // ============================================================================
  // FULL WORKFLOW TEST
  // ============================================================================

  describe("Full production workflow", () => {
    it("completes full comic creation workflow", async () => {
      const projectService = getProjectService();
      const characterService = getCharacterService();
      const storyboardService = getStoryboardService();
      const panelService = getPanelService();
      const captionService = getCaptionService();
      const compositionService = getCompositionService();

      // 1. Create project with settings
      const project = await projectService.create({
        name: "Golden Hour Comic",
        description: "A romance comic set at sunset",
        settings: {
          defaultModel: "illustrious-xl.safetensors",
          resolution: { width: 768, height: 1024 },
        },
      });

      // 2. Create characters
      const maya = await characterService.create({
        projectId: project.id,
        name: "Maya",
        profile: {
          species: "fox",
          bodyType: "average",
          features: ["warm eyes", "gentle smile"],
          ageDescriptors: ["young adult"],
          clothing: ["casual summer dress"],
          distinguishing: [],
        },
        promptFragments: {
          positive: "warm eyes, gentle smile, casual summer dress",
          negative: "",
          triggers: [],
        },
      });

      const james = await characterService.create({
        projectId: project.id,
        name: "James",
        profile: {
          species: "fox",
          bodyType: "average",
          features: ["kind eyes", "relaxed posture"],
          ageDescriptors: ["young adult"],
          clothing: ["simple shirt", "jeans"],
          distinguishing: [],
        },
        promptFragments: {
          positive: "kind eyes, relaxed posture, simple shirt and jeans",
          negative: "",
          triggers: [],
        },
      });

      // 3. Create storyboard
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: "Chapter 1: The Meeting",
        description: "Maya and James meet at the pier during golden hour",
      });

      // 4. Create panels with direction
      const panel1 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Establishing shot of the pier at sunset",
        direction: {
          cameraAngle: "wide shot",
          lighting: "golden hour",
          mood: "romantic",
        },
      });

      const panel2 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Maya leaning on railing, looking at sunset",
        characterIds: [maya.id],
        direction: {
          cameraAngle: "medium shot",
          lighting: "rim light",
          mood: "peaceful",
        },
      });

      const panel3 = await panelService.create({
        storyboardId: storyboard.id,
        description: "James approaches, Maya turns",
        characterIds: [maya.id, james.id],
        direction: {
          cameraAngle: "medium shot",
          lighting: "golden hour",
          mood: "mysterious",
        },
      });

      const panel4 = await panelService.create({
        storyboardId: storyboard.id,
        description: "Close-up of their eyes meeting",
        characterIds: [maya.id, james.id],
        direction: {
          cameraAngle: "close-up",
          lighting: "soft",
          mood: "romantic",
        },
      });

      // 5. Add captions
      await captionService.create({
        panelId: panel2.id,
        type: "thought",
        text: "Another beautiful sunset...",
        position: { x: 0.7, y: 0.2 },
        characterId: maya.id,
      });

      await captionService.create({
        panelId: panel3.id,
        type: "speech",
        text: "Excuse me, is this spot taken?",
        position: { x: 0.6, y: 0.15 },
        characterId: james.id,
        tailDirection: { x: 0.7, y: 0.4 },
      });

      await captionService.create({
        panelId: panel3.id,
        type: "speech",
        text: "Oh! No, go ahead.",
        position: { x: 0.25, y: 0.35 },
        characterId: maya.id,
        tailDirection: { x: 0.3, y: 0.5 },
      });

      await captionService.create({
        panelId: panel4.id,
        type: "narration",
        text: "In that moment, everything changed.",
        position: { x: 0.5, y: 0.9 },
      });

      // 6. Verify complete structure
      const panels = await panelService.getByStoryboard(storyboard.id);
      expect(panels).toHaveLength(4);

      for (const panel of panels) {
        const captions = await captionService.getByPanel(panel.id);
        // Verify each panel can have its captions retrieved
        expect(Array.isArray(captions)).toBe(true);
      }

      // 7. Verify character associations
      const p2 = await panelService.getById(panel2.id);
      expect(p2?.characterIds).toContain(maya.id);

      const p3 = await panelService.getById(panel3.id);
      expect(p3?.characterIds).toContain(maya.id);
      expect(p3?.characterIds).toContain(james.id);

      // 8. Verify project can be retrieved with all data
      const retrievedProject = await projectService.getById(project.id);
      expect(retrievedProject?.name).toBe("Golden Hour Comic");

      const characters = await characterService.getByProject(project.id);
      expect(characters).toHaveLength(2);

      const storyboards = await storyboardService.getByProject(project.id);
      expect(storyboards).toHaveLength(1);
    });
  });
});
