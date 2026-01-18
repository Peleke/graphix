/**
 * Project Bootstrap Service Tests
 *
 * Tests for the project creation from chat sessions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Set env before any imports
process.env.ALLOW_LOCAL_OLLAMA = "true";

import {
  ProjectBootstrapService,
  createProjectBootstrapService,
  resetProjectBootstrapService,
  type BootstrapInput,
} from "../../services/project-bootstrap.service.js";
import { resetChatAgentService } from "../../services/chat-agent.service.js";
import type { ChatWorkingMemory } from "../../db/schema.js";

// Mock text generation service
vi.mock("../../services/text-generation.service.js", () => ({
  getTextGenerationService: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "Mock response",
      model: "mock",
      provider: "mock",
    }),
    getStatus: vi.fn().mockResolvedValue({ available: true }),
    listProviders: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock database
vi.mock("../../db/client.js", () => ({
  getDefaultDatabase: vi.fn(() => null),
  hasDefaultDatabase: vi.fn(() => false),
}));

// Mock project service
vi.mock("../../services/project.service.js", () => ({
  ProjectService: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ id: "proj-123", name: "Test Project" }),
  })),
}));

// Mock character service
vi.mock("../../services/character.service.js", () => ({
  CharacterService: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockImplementation(async (data: { name: string }) => ({
      id: `char-${data.name.toLowerCase()}`,
      name: data.name,
    })),
  })),
}));

// Mock storyboard service
vi.mock("../../services/storyboard.service.js", () => ({
  StoryboardService: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ id: "sb-123", name: "Main Story" }),
  })),
}));

describe("ProjectBootstrapService", () => {
  let service: ProjectBootstrapService;

  beforeEach(() => {
    resetProjectBootstrapService();
    resetChatAgentService();
    service = createProjectBootstrapService();
  });

  describe("bootstrap", () => {
    it("creates project with required data", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [{ name: "Oliver" }],
      };

      const result = await service.bootstrap(input);

      expect(result.projectId).toBe("proj-123");
      expect(result.projectName).toBe("My Comic");
      expect(result.characterIds).toHaveLength(1);
    });

    it("creates multiple characters", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [
          { name: "Oliver" },
          { name: "Olivia" },
          { name: "Oscar" },
        ],
      };

      const result = await service.bootstrap(input);

      expect(result.characterIds).toHaveLength(3);
    });

    it("creates storyboard when setting provided", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [{ name: "Oliver" }],
        setting: "A riverside village",
      };

      const result = await service.bootstrap(input);

      expect(result.storyboardId).toBe("sb-123");
    });

    it("creates storyboard with custom name", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [{ name: "Oliver" }],
        storyboardName: "Chapter 1",
      };

      const result = await service.bootstrap(input);

      expect(result.storyboardId).toBe("sb-123");
    });

    it("throws without project name", async () => {
      const input: BootstrapInput = {
        name: "",
        characters: [{ name: "Oliver" }],
      };

      await expect(service.bootstrap(input)).rejects.toThrow("name is required");
    });

    it("throws without characters", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [],
      };

      await expect(service.bootstrap(input)).rejects.toThrow("character is required");
    });

    it("includes description and style", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        description: "A heartwarming tale",
        characters: [{ name: "Oliver" }],
        style: "anime",
        pageCount: 12,
      };

      const result = await service.bootstrap(input);

      expect(result.projectId).toBeTruthy();
      expect(result.message).toContain("My Comic");
    });
  });

  describe("validateWorkingMemory", () => {
    it("returns valid for complete memory", () => {
      const memory: ChatWorkingMemory = {
        phase: "confirmation",
        gathered: {
          concept: "A story about otters",
          characters: [{ name: "Oliver" }],
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.input).toBeDefined();
    });

    it("extracts project name from concept", () => {
      const memory: ChatWorkingMemory = {
        phase: "confirmation",
        gathered: {
          concept: 'A story called "Otter Adventures"',
          characters: [{ name: "Oliver" }],
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.input?.name).toBe("Otter Adventures");
    });

    it("uses first words when no title found", () => {
      const memory: ChatWorkingMemory = {
        phase: "confirmation",
        gathered: {
          concept: "Two otters go on an adventure",
          characters: [{ name: "Oliver" }],
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.input?.name).toContain("Two");
    });

    it("returns invalid without characters", () => {
      const memory: ChatWorkingMemory = {
        phase: "greeting",
        gathered: {
          concept: "A story",
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one character is required");
    });

    it("returns invalid for duplicate character names", () => {
      const memory: ChatWorkingMemory = {
        phase: "confirmation",
        gathered: {
          characters: [
            { name: "Oliver" },
            { name: "oliver" }, // Same name, different case
          ],
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    it("includes setting in input", () => {
      const memory: ChatWorkingMemory = {
        phase: "confirmation",
        gathered: {
          concept: "A story",
          characters: [{ name: "Oliver" }],
          setting: "A forest",
        },
        skipped: [],
      };

      const result = service.validateWorkingMemory(memory);

      expect(result.input?.setting).toBe("A forest");
      expect(result.input?.storyboardName).toBe("Main Story");
    });
  });

  describe("canBootstrap", () => {
    it("returns true for valid session", async () => {
      // Create a session first
      const chatService = await import("../../services/chat-agent.service.js");
      const session = await chatService.getChatAgentService().createSession("user-123");

      // Manually update memory (in tests, we work with in-memory storage)
      // This is a bit hacky but necessary since we're mocking the DB
      const internalSession = await chatService.getChatAgentService().getSession(session.id);
      if (internalSession) {
        internalSession.workingMemory = {
          phase: "confirmation",
          gathered: {
            concept: "A story",
            characters: [{ name: "Oliver" }],
          },
          skipped: [],
        };
      }

      const result = await service.canBootstrap(session.id);

      expect(result.canBootstrap).toBe(true);
    });

    it("returns false for non-existent session", async () => {
      const result = await service.canBootstrap("non-existent");

      expect(result.canBootstrap).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("buildPromptFragments", () => {
    it("includes trigger from name", async () => {
      const input: BootstrapInput = {
        name: "My Comic",
        characters: [{ name: "Oliver Otter" }],
      };

      // Access private method via any
      const fragments = (service as unknown as {
        buildPromptFragments: (char: { name: string }) => { triggers: string[] };
      }).buildPromptFragments({ name: "Oliver Otter" });

      expect(fragments.triggers).toContain("oliver_otter");
    });

    it("includes visual traits", async () => {
      const fragments = (service as unknown as {
        buildPromptFragments: (char: {
          name: string;
          visualTraits?: { species?: string; primaryColor?: string };
        }) => { positive: string };
      }).buildPromptFragments({
        name: "Oliver",
        visualTraits: { species: "otter", primaryColor: "brown" },
      });

      expect(fragments.positive).toContain("otter");
      expect(fragments.positive).toContain("brown");
    });

    it("has default negative prompts", async () => {
      const fragments = (service as unknown as {
        buildPromptFragments: (char: { name: string }) => { negative: string };
      }).buildPromptFragments({ name: "Oliver" });

      expect(fragments.negative).toContain("bad anatomy");
    });
  });
});
