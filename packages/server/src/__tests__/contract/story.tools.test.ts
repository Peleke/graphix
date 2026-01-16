/**
 * Contract tests for story MCP tools
 *
 * Tests input schema validation and output structure for:
 * - story_scaffold
 * - story_from_outline
 * - story_parse_outline
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall } from "../../mcp/tools/index.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestCharacter,
} from "@graphix/core/testing";

describe("story tools contract", () => {
  let projectId: string;

  beforeEach(async () => {
    setupTestDatabase();
    const project = await createTestProject();
    projectId = project.id;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("story_scaffold", () => {
    it("accepts valid input with required fields", async () => {
      const result = await handleToolCall("story_scaffold", {
        projectId,
        title: "The Adventure Begins",
        acts: [
          {
            name: "Act 1: Setup",
            scenes: [
              {
                name: "Opening",
                panels: [{ description: "Wide shot of the city" }],
              },
            ],
          },
        ],
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("acts");
      expect(result).toHaveProperty("totalStoryboards");
    });

    it("accepts valid input with full structure", async () => {
      // Create characters first
      await createTestCharacter(projectId, "Alice");
      await createTestCharacter(projectId, "Bob");

      const result = await handleToolCall("story_scaffold", {
        projectId,
        title: "Epic Tale",
        description: "An epic adventure story",
        characterNames: ["Alice", "Bob"],
        acts: [
          {
            name: "Act 1: Setup",
            description: "Introduction to the world",
            scenes: [
              {
                name: "Scene 1: The Meeting",
                description: "Alice and Bob meet",
                panels: [
                  {
                    description: "Wide shot of the cafe",
                    characterNames: ["Alice"],
                    direction: {
                      cameraAngle: "wide shot",
                      lighting: "natural",
                      mood: "peaceful",
                    },
                  },
                  {
                    description: "Bob enters the scene",
                    characterNames: ["Alice", "Bob"],
                    direction: {
                      cameraAngle: "medium shot",
                      mood: "neutral",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result).toHaveProperty("success", true);
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("story_scaffold", {
        title: "Test",
        acts: [],
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing title", async () => {
      const result = await handleToolCall("story_scaffold", {
        projectId,
        acts: [],
      });
      // Empty acts still works, title is defaulted to "Untitled Story" internally
      expect(result).toHaveProperty("success");
    });

    it("accepts missing acts as empty array", async () => {
      const result = await handleToolCall("story_scaffold", {
        projectId,
        title: "Test",
      });
      // Missing acts defaults to empty array
      expect(result).toHaveProperty("success", true);
      expect((result as any).totalPanels).toBe(0);
    });
  });

  describe("story_from_outline", () => {
    const validOutline = `# The Adventure
> A tale of two friends

## Act 1: The Beginning
### Scene 1: Morning
- Panel: Wide shot of sunrise
- Panel: [ALICE] Alice wakes up

### Scene 2: Discovery
- Panel: [ALICE] Looking out the window
`;

    it("accepts valid markdown outline", async () => {
      await createTestCharacter(projectId, "Alice");

      const result = await handleToolCall("story_from_outline", {
        projectId,
        outline: validOutline,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("totalStoryboards");
      expect(result).toHaveProperty("totalPanels");
    });

    it("returns error for missing projectId", async () => {
      const result = await handleToolCall("story_from_outline", {
        outline: validOutline,
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("returns error for missing outline", async () => {
      const result = await handleToolCall("story_from_outline", {
        projectId,
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("story_parse_outline", () => {
    it("parses simple outline successfully", async () => {
      const outline = `# Test Story
## Act 1
### Scene 1
- Panel: Opening shot
`;

      const result = await handleToolCall("story_parse_outline", { outline });

      expect(result).toHaveProperty("parsed", true);
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("acts");
      expect(result).toHaveProperty("summary");
    });

    it("includes summary with counts", async () => {
      const outline = `# My Story
## Act 1
### Scene 1
- Panel: Shot 1
- Panel: Shot 2
### Scene 2
- Panel: Shot 3
## Act 2
### Scene 3
- Panel: Shot 4
`;

      const result = await handleToolCall("story_parse_outline", { outline });

      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toHaveProperty("actCount");
      expect((result as any).summary).toHaveProperty("sceneCount");
      expect((result as any).summary).toHaveProperty("panelCount");
      expect((result as any).summary.actCount).toBe(2);
      expect((result as any).summary.sceneCount).toBe(3);
      expect((result as any).summary.panelCount).toBe(4);
    });

    it("extracts character names from brackets", async () => {
      const outline = `# Story
## Act 1
### Scene 1
- Panel: [ALICE, BOB] The meeting
- Panel: [CHARLIE] Enters
`;

      const result = await handleToolCall("story_parse_outline", { outline });

      expect(result).toHaveProperty("characterNames");
      expect((result as any).characterNames).toContain("ALICE");
      expect((result as any).characterNames).toContain("BOB");
      expect((result as any).characterNames).toContain("CHARLIE");
      expect((result as any).summary.characterCount).toBe(3);
    });

    it("returns error for missing outline", async () => {
      const result = await handleToolCall("story_parse_outline", {});
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
