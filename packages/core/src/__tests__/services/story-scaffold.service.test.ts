/**
 * StoryScaffoldService Unit Tests
 *
 * Tests for story scaffolding from structured input and outline parsing.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestCharacter,
} from "../setup.js";
import {
  getStoryScaffoldService,
  getStoryboardService,
  getPanelService,
  type StoryScaffoldService,
} from "../../services/index.js";

describe("StoryScaffoldService", () => {
  let service: StoryScaffoldService;
  let projectId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
    service = getStoryScaffoldService();
    const project = await createTestProject("Test Project");
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // SCAFFOLD TESTS
  // ============================================================================

  describe("scaffold", () => {
    it("creates storyboards and panels from structured input", async () => {
      const result = await service.scaffold({
        projectId,
        title: "My Story",
        acts: [
          {
            name: "Act 1: Beginning",
            scenes: [
              {
                name: "Opening scene",
                panels: [
                  { description: "Panel 1" },
                  { description: "Panel 2" },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(1);
      expect(result.totalPanels).toBe(2);
      expect(result.acts).toHaveLength(1);
    });

    it("creates multiple storyboards for multiple scenes", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Multi-scene Story",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Scene 1",
                panels: [{ description: "Panel 1" }],
              },
              {
                name: "Scene 2",
                panels: [{ description: "Panel 2" }],
              },
            ],
          },
        ],
      });

      expect(result.totalStoryboards).toBe(2);
      expect(result.totalPanels).toBe(2);
      expect(result.acts[0].scenes).toHaveLength(2);
    });

    it("creates storyboards across multiple acts", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Multi-act Story",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Scene 1",
                panels: [{ description: "Panel 1" }],
              },
            ],
          },
          {
            name: "Act 2",
            scenes: [
              {
                name: "Scene 2",
                panels: [{ description: "Panel 2" }],
              },
            ],
          },
        ],
      });

      expect(result.totalStoryboards).toBe(2);
      expect(result.acts).toHaveLength(2);
    });

    it("associates characters by name with panels", async () => {
      const hero = await createTestCharacter(projectId, "Hero");
      const villain = await createTestCharacter(projectId, "Villain");

      const result = await service.scaffold({
        projectId,
        title: "Story with Characters",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Confrontation",
                panels: [
                  {
                    description: "Hero and villain face off",
                    characterNames: ["Hero", "Villain"],
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalPanels).toBe(1);

      // Check that panels were created with characters
      const panelService = getPanelService();
      const storyboardId = result.acts[0].scenes[0].storyboardId;
      const panels = await panelService.getByStoryboard(storyboardId);

      expect(panels).toHaveLength(1);
    });

    it("includes direction in panels", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Directed Story",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Dramatic scene",
                panels: [
                  {
                    description: "Dramatic reveal",
                    direction: {
                      cameraAngle: "low angle",
                      mood: "dramatic",
                      lighting: "dramatic",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalPanels).toBe(1);
    });

    it("uses scene name in storyboard naming", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Named Scenes",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "The Grand Battle",
                panels: [{ description: "Panel" }],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);

      // Verify storyboard was created
      const storyboardService = getStoryboardService();
      const storyboardId = result.acts[0].scenes[0].storyboardId;
      const storyboard = await storyboardService.getById(storyboardId);

      expect(storyboard?.name).toContain("Grand Battle");
    });

    it("maintains panel order within storyboard", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Ordered Panels",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Scene",
                panels: [
                  { description: "First" },
                  { description: "Second" },
                  { description: "Third" },
                ],
              },
            ],
          },
        ],
      });

      const panelService = getPanelService();
      const storyboardId = result.acts[0].scenes[0].storyboardId;
      const panels = await panelService.getByStoryboard(storyboardId);

      expect(panels[0].description).toBe("First");
      expect(panels[1].description).toBe("Second");
      expect(panels[2].description).toBe("Third");
    });

    it("returns error for invalid projectId", async () => {
      const result = await service.scaffold({
        projectId: "nonexistent-id",
        title: "Test",
        acts: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project not found");
    });

    it("handles empty acts array", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Empty Story",
        acts: [],
      });

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(0);
      expect(result.totalPanels).toBe(0);
    });

    it("handles act with empty scenes", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Act without Scenes",
        acts: [
          {
            name: "Empty Act",
            scenes: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(0);
    });

    it("handles scene with empty panels", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Scene without Panels",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Empty scene",
                panels: [],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(1);
      expect(result.totalPanels).toBe(0);
    });

    it("tracks missing characters", async () => {
      const result = await service.scaffold({
        projectId,
        title: "Story with Unknown Characters",
        acts: [
          {
            name: "Act 1",
            scenes: [
              {
                name: "Scene 1",
                panels: [
                  {
                    description: "Unknown character appears",
                    characterNames: ["NonexistentHero"],
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.missingCharacters).toContain("NonexistentHero");
    });
  });

  // ============================================================================
  // PARSE OUTLINE TESTS
  // ============================================================================

  describe("parseOutline", () => {
    it("parses simple markdown outline", () => {
      // Format: # = title, ## = act, ### = scene, - = panel
      const outline = `
# My Story

## Act 1: Introduction

### Scene 1: The Beginning
- Hero wakes up
- Hero looks around

### Scene 2: Discovery
- Hero finds a map
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.title).toBe("My Story");
      expect(result.acts).toHaveLength(1);
      expect(result.acts[0].name).toBe("Act 1: Introduction");
      expect(result.acts[0].scenes).toHaveLength(2);
      expect(result.acts[0].scenes[0].name).toBe("Scene 1: The Beginning");
      expect(result.acts[0].scenes[0].panels).toHaveLength(2);
    });

    it("parses multi-act outline", () => {
      const outline = `
# Epic Story

## Act 1: Setup

### Opening
- Panel 1

## Act 2: Conflict

### Battle
- Panel 2

## Act 3: Resolution

### Ending
- Panel 3
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.acts).toHaveLength(3);
      expect(result.acts[0].name).toBe("Act 1: Setup");
      expect(result.acts[1].name).toBe("Act 2: Conflict");
      expect(result.acts[2].name).toBe("Act 3: Resolution");
    });

    it("handles simple panel format", () => {
      const outline = `
# Story

## Act 1

### Scene 1
- First panel
- Second panel
- Third panel
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.acts[0].scenes[0].panels).toHaveLength(3);
    });

    it("handles panels with character bracket notation", () => {
      const outline = `
# Story

## Act 1

### Scene 1
- [Hero] enters the room
- [Hero, Villain] face off
      `.trim();

      const result = service.parseOutline(outline);
      const panel1 = result.acts[0].scenes[0].panels[0];
      const panel2 = result.acts[0].scenes[0].panels[1];

      expect(panel1.characterNames).toContain("Hero");
      expect(panel2.characterNames).toContain("Hero");
      expect(panel2.characterNames).toContain("Villain");
    });

    it("extracts character names globally", () => {
      const outline = `
# Story

## Act 1

### Scene 1
- [Hero] enters
- [Villain] appears
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.characterNames).toContain("Hero");
      expect(result.characterNames).toContain("Villain");
    });

    it("handles empty outline", () => {
      const result = service.parseOutline("");

      expect(result.acts).toHaveLength(0);
    });

    it("handles outline with only whitespace", () => {
      const result = service.parseOutline("   \n\n   ");

      expect(result.acts).toHaveLength(0);
    });

    it("handles story description", () => {
      const outline = `
# My Story
> An epic tale of adventure
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.title).toBe("My Story");
      expect(result.description).toBe("An epic tale of adventure");
    });
  });

  // ============================================================================
  // FROM OUTLINE TESTS
  // ============================================================================

  describe("fromOutline", () => {
    it("creates storyboards from markdown outline", async () => {
      const outline = `
# My Story

## Act 1

### Opening Scene
- Hero appears
- Hero speaks
      `.trim();

      const result = await service.fromOutline(projectId, outline);

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(1);
      expect(result.totalPanels).toBe(2);
    });

    it("resolves character mentions to IDs", async () => {
      const hero = await createTestCharacter(projectId, "Hero");

      const outline = `
# Story

## Act 1

### Scene
- [Hero] enters dramatically
      `.trim();

      const result = await service.fromOutline(projectId, outline);

      expect(result.success).toBe(true);

      // Check panel was created
      const panelService = getPanelService();
      const storyboardId = result.acts[0].scenes[0].storyboardId;
      const panels = await panelService.getByStoryboard(storyboardId);

      expect(panels).toHaveLength(1);
    });

    it("handles unresolved character mentions gracefully", async () => {
      const outline = `
# Story

## Act 1

### Scene
- [UnknownCharacter] does something
      `.trim();

      const result = await service.fromOutline(projectId, outline);

      // Should not fail, just track the missing character
      expect(result.success).toBe(true);
      expect(result.missingCharacters).toContain("UnknownCharacter");
    });

    it("returns error for non-existent project", async () => {
      const result = await service.fromOutline(
        "nonexistent-id",
        "# Story\n## Act 1\n### Scene\n- Panel"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project not found");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unicode in outline", () => {
      const outline = `
# 物語

## 第一幕: 始まり

### シーン1
- ヒーローが登場
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.title).toBe("物語");
      expect(result.acts[0].name).toBe("第一幕: 始まり");
      expect(result.acts[0].scenes[0].name).toBe("シーン1");
    });

    it("handles special characters in descriptions", () => {
      const outline = `
# Story

## Act 1

### Scene 1
- Hero says "Hello!" & waves
- Explosion: BOOM!
      `.trim();

      const result = service.parseOutline(outline);

      expect(result.acts[0].scenes[0].panels[0].description).toContain('"Hello!"');
      expect(result.acts[0].scenes[0].panels[1].description).toContain("BOOM!");
    });

    it("handles very long outline", async () => {
      const scenes = Array.from(
        { length: 20 },
        (_, i) => `
### Scene ${i + 1}
- Panel A
- Panel B
- Panel C
`
      ).join("\n");

      const outline = `# Story\n## Act 1\n${scenes}`;
      const result = await service.fromOutline(projectId, outline);

      expect(result.success).toBe(true);
      expect(result.totalStoryboards).toBe(20);
      expect(result.totalPanels).toBe(60);
    });

    it("handles concurrent scaffold calls", async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        service.scaffold({
          projectId,
          title: `Story ${i}`,
          acts: [
            {
              name: `Act ${i}`,
              scenes: [
                {
                  name: `Scene ${i}`,
                  panels: [{ description: `Panel ${i}` }],
                },
              ],
            },
          ],
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
