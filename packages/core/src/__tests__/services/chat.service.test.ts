/**
 * ChatService Unit Tests
 *
 * Comprehensive tests for the chat service including:
 * - LLM-powered extraction methods (extractCharacters, extractSetting, extractStoryArc)
 * - Beat expansion (expandBeatDescription)
 * - Enhanced extraction orchestration (runEnhancedExtraction)
 * - Fallback extraction (fallbackCharacterExtraction)
 * - State management and response generation
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  ChatService,
  createChatService,
  getChatService,
  resetChatService,
} from "../../services/chat/chat.service.js";
import {
  getNextPhase,
  shouldSkipPhase,
  getSuggestionsForPhase,
  EXTRACTION_PROMPTS,
  STRUCTURE_GUIDES,
} from "../../services/chat/prompts.js";
import type {
  ElicitationPhase,
  ElicitationState,
  ExtractedCharacter,
  ExtractedSetting,
  ExtractedStoryArc,
  StoryStructure,
} from "../../services/chat/chat.types.js";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the text generation service module
const mockGenerate = mock(async () => ({ text: "{}", model: "test", provider: "test", tokensUsed: 0 }));
const mockGetStatus = mock(async () => ({ available: true, provider: "test", model: "test" }));
const mockListProviders = mock(async () => []);

mock.module("../../services/text-generation.service.js", () => ({
  createTextGenerationService: () => ({
    generate: mockGenerate,
    getStatus: mockGetStatus,
    listProviders: mockListProviders,
  }),
  getTextGenerationService: () => ({
    generate: mockGenerate,
    getStatus: mockGetStatus,
    listProviders: mockListProviders,
  }),
}));

// =============================================================================
// CHAT SERVICE TESTS
// =============================================================================

describe("ChatService", () => {
  let service: ChatService;

  beforeEach(() => {
    resetChatService();
    mockGenerate.mockClear();
    mockGetStatus.mockClear();
    service = createChatService();
  });

  afterEach(() => {
    resetChatService();
  });

  // ===========================================================================
  // SINGLETON MANAGEMENT
  // ===========================================================================

  describe("Singleton Management", () => {
    it("getChatService returns the same instance", () => {
      const s1 = getChatService();
      const s2 = getChatService();
      expect(s1).toBe(s2);
    });

    it("createChatService creates new instances", () => {
      const s1 = createChatService();
      const s2 = createChatService();
      expect(s1).not.toBe(s2);
    });

    it("resetChatService clears the singleton", () => {
      const s1 = getChatService();
      resetChatService();
      const s2 = getChatService();
      expect(s1).not.toBe(s2);
    });
  });

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  describe("State Management", () => {
    describe("createInitialState", () => {
      it("creates state with greeting phase", () => {
        const state = service.createInitialState();
        expect(state.phase).toBe("greeting");
        expect(state.gathered).toEqual({});
        expect(state.skipped).toEqual([]);
      });
    });

    describe("updateState", () => {
      it("transitions from greeting to characters", () => {
        const state: ElicitationState = {
          phase: "greeting",
          gathered: {},
          skipped: [],
        };
        const newState = service.updateState(state, "A story about a brave knight");
        expect(newState.phase).toBe("characters");
        expect(newState.gathered.concept).toBe("A story about a brave knight");
      });

      it("extracts character names from capitalized words", () => {
        const state: ElicitationState = {
          phase: "characters",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "Luna the wolf and Max the fox");
        expect(newState.phase).toBe("setting");
        expect(newState.gathered.characters).toBeDefined();
        expect(newState.gathered.characters?.length).toBeGreaterThan(0);
        const names = newState.gathered.characters?.map(c => c.name);
        expect(names).toContain("Luna");
        expect(names).toContain("Max");
      });

      it("handles skip messages", () => {
        const state: ElicitationState = {
          phase: "characters",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "Skip for now");
        expect(newState.phase).toBe("setting");
        expect(newState.skipped).toContain("characters");
        expect(newState.gathered.characters).toBeUndefined();
      });

      it("extracts setting", () => {
        const state: ElicitationState = {
          phase: "setting",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "A snowy forest in winter");
        expect(newState.phase).toBe("arc");
        expect(newState.gathered.setting).toBe("A snowy forest in winter");
      });

      it("extracts arc", () => {
        const state: ElicitationState = {
          phase: "arc",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "A hero's journey to find courage");
        expect(newState.phase).toBe("style");
        expect(newState.gathered.arc).toBe("A hero's journey to find courage");
      });

      it("extracts style", () => {
        const state: ElicitationState = {
          phase: "style",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "Manga style with warm colors");
        expect(newState.phase).toBe("scope");
        expect(newState.gathered.style).toBe("Manga style with warm colors");
      });

      it("extracts page count from scope", () => {
        const state: ElicitationState = {
          phase: "scope",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "I want 12 pages");
        expect(newState.phase).toBe("beats_preview");
        expect(newState.gathered.pageCount).toBe(12);
      });

      it("clamps page count between 1 and 100", () => {
        const state: ElicitationState = {
          phase: "scope",
          gathered: { concept: "test" },
          skipped: [],
        };

        // Test upper bound
        let newState = service.updateState(state, "I want 500 pages");
        expect(newState.gathered.pageCount).toBe(100);

        // Test lower bound
        newState = service.updateState({ ...state, phase: "scope" }, "0 pages");
        expect(newState.gathered.pageCount).toBe(1);
      });

      it("uses default page count when no number found", () => {
        const state: ElicitationState = {
          phase: "scope",
          gathered: { concept: "test" },
          skipped: [],
        };
        const newState = service.updateState(state, "whatever seems good");
        expect(newState.gathered.pageCount).toBe(8); // Default from config
      });
    });
  });

  // ===========================================================================
  // LLM-POWERED EXTRACTION METHODS
  // ===========================================================================

  describe("extractCharacters", () => {
    it("extracts characters from LLM JSON response", async () => {
      const mockCharacters: ExtractedCharacter[] = [
        {
          name: "Luna",
          role: "protagonist",
          species: "wolf",
          visualDescription: "A silver-furred wolf with blue eyes",
          personality: ["brave", "kind", "curious"],
          motivation: "To find her pack",
          arc: "Learns to trust others",
          relationships: [{ character: "Max", relationship: "friend" }],
        },
        {
          name: "Max",
          role: "supporting",
          species: "fox",
          visualDescription: "An orange fox with a bushy tail",
          personality: ["clever", "loyal"],
        },
      ];

      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({ characters: mockCharacters }),
        model: "test",
        provider: "test",
        tokensUsed: 100,
      }));

      const result = await service.extractCharacters("Luna is a brave wolf who meets Max the fox");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Luna");
      expect(result[0].role).toBe("protagonist");
      expect(result[0].species).toBe("wolf");
      expect(result[0].personality).toContain("brave");
      expect(result[1].name).toBe("Max");
      expect(result[1].role).toBe("supporting");
    });

    it("uses low temperature for structured output", async () => {
      mockGenerate.mockImplementationOnce(async (prompt, options) => {
        expect(options?.temperature).toBe(0.3);
        return { text: '{"characters": []}', model: "test", provider: "test", tokensUsed: 0 };
      });

      await service.extractCharacters("test");
    });

    it("falls back to regex extraction on JSON parse error", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON response",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("Luna and Max went on an adventure");

      // Fallback should extract capitalized names
      expect(result.length).toBeGreaterThan(0);
      const names = result.map(c => c.name);
      expect(names).toContain("Luna");
      expect(names).toContain("Max");
    });

    it("falls back on missing characters field", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: '{"notCharacters": []}',
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("Luna goes on a journey");
      // Should return empty array from fallback since "characters" field is missing
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("extractSetting", () => {
    it("extracts setting from LLM JSON response", async () => {
      const mockSetting: ExtractedSetting = {
        location: "A mystical forest covered in snow",
        timeperiod: "Medieval fantasy",
        atmosphere: "Mysterious and enchanting",
        visualDetails: ["tall pine trees", "glowing mushrooms", "gentle snowfall"],
      };

      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({ setting: mockSetting }),
        model: "test",
        provider: "test",
        tokensUsed: 100,
      }));

      const result = await service.extractSetting("A story set in a magical winter forest");

      expect(result).not.toBeNull();
      expect(result?.location).toBe("A mystical forest covered in snow");
      expect(result?.timeperiod).toBe("Medieval fantasy");
      expect(result?.atmosphere).toBe("Mysterious and enchanting");
      expect(result?.visualDetails).toHaveLength(3);
    });

    it("returns null on JSON parse error", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Not valid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractSetting("test");
      expect(result).toBeNull();
    });

    it("returns null when setting field is missing", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: '{"notSetting": {}}',
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractSetting("test");
      expect(result).toBeNull();
    });
  });

  describe("extractStoryArc", () => {
    const mockCharacters: ExtractedCharacter[] = [
      { name: "Luna", role: "protagonist", visualDescription: "wolf", personality: [] },
    ];
    const mockSetting: ExtractedSetting = {
      location: "forest",
      atmosphere: "magical",
      visualDetails: [],
    };

    it("extracts story arc with beats", async () => {
      const mockArc = {
        premise: {
          logline: "A wolf discovers the meaning of friendship",
          genre: "adventure",
          tone: "hopeful",
          themes: ["friendship", "courage"],
          setting: "magical forest",
        },
        structure: "three-act",
        acts: ["Setup", "Confrontation", "Resolution"],
        beats: [
          {
            type: "setup",
            actIndex: 0,
            summary: "Luna alone in the forest",
            visualDescription: "A silver wolf sits alone on a snowy hill",
            emotionalTone: "lonely",
            involvedCharacters: ["Luna"],
            cameraAngle: "wide",
          },
          {
            type: "inciting_incident",
            actIndex: 0,
            summary: "Luna meets a stranger",
            visualDescription: "Luna encounters another creature",
            emotionalTone: "curious",
            involvedCharacters: ["Luna"],
            cameraAngle: "medium",
          },
        ],
      };

      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify(mockArc),
        model: "test",
        provider: "test",
        tokensUsed: 200,
      }));

      const result = await service.extractStoryArc(
        "Luna learns about friendship",
        mockCharacters,
        mockSetting,
        "three-act"
      );

      expect(result).not.toBeNull();
      expect(result?.premise.logline).toBe("A wolf discovers the meaning of friendship");
      expect(result?.premise.genre).toBe("adventure");
      expect(result?.structure).toBe("three-act");
      expect(result?.acts).toHaveLength(3);
      expect(result?.beats).toHaveLength(2);
      expect(result?.beats[0].type).toBe("setup");
    });

    it("uses moderate temperature for creative beat generation", async () => {
      mockGenerate.mockImplementationOnce(async (prompt, options) => {
        expect(options?.temperature).toBe(0.5);
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      await service.extractStoryArc("test", mockCharacters, mockSetting);
    });

    it("includes structure guide in prompt", async () => {
      mockGenerate.mockImplementationOnce(async (prompt) => {
        expect(prompt).toContain("three-act");
        expect(prompt).toContain("Three-Act Structure");
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      await service.extractStoryArc("test", mockCharacters, mockSetting, "three-act");
    });

    it("supports five-act structure", async () => {
      mockGenerate.mockImplementationOnce(async (prompt) => {
        expect(prompt).toContain("five-act");
        expect(prompt).toContain("Five-Act Structure");
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            structure: "five-act",
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      const result = await service.extractStoryArc("test", mockCharacters, mockSetting, "five-act");
      expect(result?.structure).toBe("five-act");
    });

    it("supports hero journey structure", async () => {
      mockGenerate.mockImplementationOnce(async (prompt) => {
        expect(prompt).toContain("hero-journey");
        expect(prompt).toContain("Hero's Journey");
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            structure: "hero-journey",
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      const result = await service.extractStoryArc("test", mockCharacters, mockSetting, "hero-journey");
      expect(result?.structure).toBe("hero-journey");
    });

    it("returns null on JSON parse error", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractStoryArc("test", mockCharacters, mockSetting);
      expect(result).toBeNull();
    });

    it("provides default acts when not in response", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({
          premise: { logline: "test", genre: "test", tone: "test", themes: [], setting: "test" },
          // No acts field
        }),
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractStoryArc("test", mockCharacters, mockSetting, "three-act");
      expect(result?.acts).toEqual(["Act 1: Setup", "Act 2: Confrontation", "Act 3: Resolution"]);
    });

    it("handles null setting gracefully", async () => {
      mockGenerate.mockImplementationOnce(async (prompt) => {
        expect(prompt).toContain("unspecified setting");
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      await service.extractStoryArc("test", mockCharacters, null);
    });

    it("handles empty characters gracefully", async () => {
      mockGenerate.mockImplementationOnce(async (prompt) => {
        expect(prompt).toContain("unspecified characters");
        return {
          text: JSON.stringify({
            premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
            beats: [],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        };
      });

      await service.extractStoryArc("test", [], mockSetting);
    });
  });

  describe("expandBeatDescription", () => {
    it("expands beat into detailed visual description", async () => {
      const expandedDescription =
        "Luna stands alone on a snow-covered hilltop, her silver fur glistening in the moonlight. " +
        "The camera frames her from a low angle, emphasizing her solitude against the vast starry sky. " +
        "Cool blue tones dominate the scene with hints of silver light.";

      mockGenerate.mockImplementationOnce(async () => ({
        text: expandedDescription,
        model: "test",
        provider: "test",
        tokensUsed: 50,
      }));

      const result = await service.expandBeatDescription(
        "setup",
        "Luna alone in the forest",
        ["Luna"],
        "snowy forest",
        "lonely and contemplative"
      );

      expect(result).toBe(expandedDescription);
    });

    it("uses higher temperature for creative expansion", async () => {
      mockGenerate.mockImplementationOnce(async (prompt, options) => {
        expect(options?.temperature).toBe(0.7);
        return { text: "expanded", model: "test", provider: "test", tokensUsed: 0 };
      });

      await service.expandBeatDescription("setup", "test", [], "test", "test");
    });

    it("returns original summary on error", async () => {
      mockGenerate.mockImplementationOnce(async () => {
        throw new Error("LLM error");
      });

      const result = await service.expandBeatDescription(
        "setup",
        "Original summary",
        [],
        "test",
        "test"
      );

      expect(result).toBe("Original summary");
    });

    it("trims whitespace from response", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "  Expanded description with whitespace  \n",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.expandBeatDescription("setup", "test", [], "test", "test");
      expect(result).toBe("Expanded description with whitespace");
    });
  });

  describe("runEnhancedExtraction", () => {
    it("orchestrates all extraction methods", async () => {
      // Mock character extraction
      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({
          characters: [{ name: "Luna", role: "protagonist", visualDescription: "wolf", personality: [] }],
        }),
        model: "test",
        provider: "test",
        tokensUsed: 100,
      }));

      // Mock setting extraction
      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({
          setting: { location: "forest", atmosphere: "magical", visualDetails: [] },
        }),
        model: "test",
        provider: "test",
        tokensUsed: 50,
      }));

      // Mock story arc extraction
      mockGenerate.mockImplementationOnce(async () => ({
        text: JSON.stringify({
          premise: { logline: "A wolf's journey", genre: "adventure", tone: "hopeful", themes: [], setting: "forest" },
          structure: "three-act",
          acts: ["Act 1", "Act 2", "Act 3"],
          beats: [{ type: "setup", actIndex: 0, summary: "intro", visualDescription: "desc", emotionalTone: "lonely", involvedCharacters: [] }],
        }),
        model: "test",
        provider: "test",
        tokensUsed: 200,
      }));

      const result = await service.runEnhancedExtraction("Luna the wolf goes on an adventure");

      expect(result.characters).toHaveLength(1);
      expect(result.characters[0].name).toBe("Luna");
      expect(result.setting?.location).toBe("forest");
      expect(result.arc?.premise.logline).toBe("A wolf's journey");
      expect(result.arc?.beats).toHaveLength(1);
    });

    it("passes extracted characters and setting to arc extraction", async () => {
      let arcPrompt = "";

      mockGenerate
        .mockImplementationOnce(async () => ({
          text: JSON.stringify({
            characters: [{ name: "Alice", role: "protagonist", visualDescription: "test", personality: [] }],
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        }))
        .mockImplementationOnce(async () => ({
          text: JSON.stringify({
            setting: { location: "Wonderland", atmosphere: "whimsical", visualDetails: [] },
          }),
          model: "test",
          provider: "test",
          tokensUsed: 0,
        }))
        .mockImplementationOnce(async (prompt) => {
          arcPrompt = prompt;
          return {
            text: JSON.stringify({
              premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
              beats: [],
            }),
            model: "test",
            provider: "test",
            tokensUsed: 0,
          };
        });

      await service.runEnhancedExtraction("test");

      expect(arcPrompt).toContain("Alice");
      expect(arcPrompt).toContain("Wonderland");
    });

    it("uses default three-act structure", async () => {
      mockGenerate
        .mockImplementationOnce(async () => ({ text: '{"characters": []}', model: "test", provider: "test", tokensUsed: 0 }))
        .mockImplementationOnce(async () => ({ text: '{"setting": null}', model: "test", provider: "test", tokensUsed: 0 }))
        .mockImplementationOnce(async (prompt) => {
          expect(prompt).toContain("three-act");
          return {
            text: JSON.stringify({
              premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
              beats: [],
            }),
            model: "test",
            provider: "test",
            tokensUsed: 0,
          };
        });

      await service.runEnhancedExtraction("test");
    });

    it("accepts custom structure parameter", async () => {
      mockGenerate
        .mockImplementationOnce(async () => ({ text: '{"characters": []}', model: "test", provider: "test", tokensUsed: 0 }))
        .mockImplementationOnce(async () => ({ text: '{"setting": null}', model: "test", provider: "test", tokensUsed: 0 }))
        .mockImplementationOnce(async (prompt) => {
          expect(prompt).toContain("hero-journey");
          return {
            text: JSON.stringify({
              premise: { logline: "", genre: "", tone: "", themes: [], setting: "" },
              beats: [],
            }),
            model: "test",
            provider: "test",
            tokensUsed: 0,
          };
        });

      await service.runEnhancedExtraction("test", "hero-journey");
    });
  });

  // ===========================================================================
  // FALLBACK EXTRACTION
  // ===========================================================================

  describe("Fallback Character Extraction", () => {
    it("extracts capitalized words as character names", async () => {
      // Trigger fallback by returning invalid JSON
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("Luna and Max went to the forest with Bob");

      const names = result.map(c => c.name);
      expect(names).toContain("Luna");
      expect(names).toContain("Max");
      expect(names).toContain("Bob");
    });

    it("excludes common words", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("The hero What When Where Who");

      const names = result.map(c => c.name);
      expect(names).not.toContain("The");
      expect(names).not.toContain("What");
      expect(names).not.toContain("When");
      expect(names).not.toContain("Where");
      expect(names).not.toContain("Who");
    });

    it("limits to 5 characters", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters(
        "Alice Bob Charlie David Eve Frank Grace Henry Ivy Jack"
      );

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("assigns protagonist role to first character", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("Luna and Max");

      expect(result[0].role).toBe("protagonist");
      if (result.length > 1) {
        expect(result[1].role).toBe("supporting");
      }
    });

    it("generates basic visual descriptions", async () => {
      mockGenerate.mockImplementationOnce(async () => ({
        text: "Invalid JSON",
        model: "test",
        provider: "test",
        tokensUsed: 0,
      }));

      const result = await service.extractCharacters("Luna the wolf");

      expect(result[0].visualDescription).toContain("Luna");
    });
  });

  // ===========================================================================
  // BOOTSTRAP
  // ===========================================================================

  describe("createBootstrap", () => {
    it("creates bootstrap from gathered state", () => {
      const state: ElicitationState = {
        phase: "complete",
        gathered: {
          concept: "A brave wolf's journey",
          characters: [{ name: "Luna" }],
          setting: "Snowy forest",
          arc: "Finding courage",
          style: "Manga",
          pageCount: 12,
        },
        skipped: [],
      };

      const bootstrap = service.createBootstrap(state);

      // Takes first 4 words, capitalized
      expect(bootstrap.name).toBe("A Brave Wolf's Journey");
      expect(bootstrap.description).toContain("A brave wolf's journey");
      expect(bootstrap.description).toContain("Snowy forest");
      expect(bootstrap.characters).toHaveLength(1);
      expect(bootstrap.pageCount).toBe(12);
      expect(bootstrap.style).toBe("Manga");
    });

    it("uses default name for empty concept", () => {
      const state: ElicitationState = {
        phase: "complete",
        gathered: {},
        skipped: [],
      };

      const bootstrap = service.createBootstrap(state);
      expect(bootstrap.name).toBe("Untitled Project");
    });

    it("uses default page count when not specified", () => {
      const state: ElicitationState = {
        phase: "complete",
        gathered: { concept: "test" },
        skipped: [],
      };

      const bootstrap = service.createBootstrap(state);
      expect(bootstrap.pageCount).toBe(8); // Default from config
    });
  });

  // ===========================================================================
  // PROVIDER STATUS
  // ===========================================================================

  describe("Provider Status", () => {
    it("isAvailable returns true when provider available", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it("isAvailable returns false when provider unavailable", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: false,
        provider: "test",
        model: "test",
      }));

      const available = await service.isAvailable();
      expect(available).toBe(false);
    });

    it("listProviders delegates to text service", async () => {
      const mockProviders = [{ provider: "test", available: true, model: "test" }];
      mockListProviders.mockImplementationOnce(async () => mockProviders);

      const providers = await service.listProviders();
      expect(providers).toEqual(mockProviders);
    });
  });
});

// =============================================================================
// PROMPTS MODULE TESTS
// =============================================================================

describe("Chat Prompts", () => {
  // ===========================================================================
  // PHASE TRANSITIONS
  // ===========================================================================

  describe("getNextPhase", () => {
    it("transitions through all phases in order", () => {
      const phases: ElicitationPhase[] = [
        "greeting",
        "characters",
        "setting",
        "arc",
        "style",
        "scope",
        "beats_preview",
        "confirmation",
        "complete",
      ];

      for (let i = 0; i < phases.length - 1; i++) {
        const next = getNextPhase(phases[i]);
        expect(next).toBe(phases[i + 1]);
      }
    });

    it("stays at complete phase", () => {
      expect(getNextPhase("complete")).toBe("complete");
    });

    it("skips beats_preview when skipBeatsPreview is true", () => {
      const result = getNextPhase("scope", true);
      expect(result).toBe("confirmation");
    });

    it("includes beats_preview when skipBeatsPreview is false", () => {
      const result = getNextPhase("scope", false);
      expect(result).toBe("beats_preview");
    });

    it("skipBeatsPreview only affects scope->beats_preview transition", () => {
      // Other transitions should be unaffected
      expect(getNextPhase("greeting", true)).toBe("characters");
      expect(getNextPhase("arc", true)).toBe("style");
      expect(getNextPhase("confirmation", true)).toBe("complete");
    });
  });

  // ===========================================================================
  // SKIP DETECTION
  // ===========================================================================

  describe("shouldSkipPhase", () => {
    it("detects skip messages", () => {
      expect(shouldSkipPhase("skip")).toBe(true);
      expect(shouldSkipPhase("Skip for now")).toBe(true);
      expect(shouldSkipPhase("I'll do it later")).toBe(true);
      expect(shouldSkipPhase("not sure")).toBe(true);
      expect(shouldSkipPhase("I don't know")).toBe(true);
      expect(shouldSkipPhase("dont know")).toBe(true);
      expect(shouldSkipPhase("figure it out later")).toBe(true);
      expect(shouldSkipPhase("let's move on")).toBe(true);
      expect(shouldSkipPhase("next")).toBe(true);
    });

    it("does not skip normal messages", () => {
      expect(shouldSkipPhase("Luna the wolf")).toBe(false);
      expect(shouldSkipPhase("A story about friendship")).toBe(false);
      expect(shouldSkipPhase("12 pages")).toBe(false);
      expect(shouldSkipPhase("Manga style")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(shouldSkipPhase("SKIP")).toBe(true);
      expect(shouldSkipPhase("Skip")).toBe(true);
      expect(shouldSkipPhase("LATER")).toBe(true);
    });
  });

  // ===========================================================================
  // SUGGESTIONS
  // ===========================================================================

  describe("getSuggestionsForPhase", () => {
    it("returns suggestions for greeting phase", () => {
      const suggestions = getSuggestionsForPhase("greeting");
      expect(suggestions).toContain("A romance story");
      expect(suggestions).toContain("An adventure comic");
    });

    it("returns suggestions for characters phase", () => {
      const suggestions = getSuggestionsForPhase("characters");
      expect(suggestions).toContain("Use existing characters");
      expect(suggestions).toContain("Skip for now");
    });

    it("returns suggestions for setting phase", () => {
      const suggestions = getSuggestionsForPhase("setting");
      expect(suggestions).toContain("Modern day");
      expect(suggestions).toContain("Fantasy world");
    });

    it("returns suggestions for arc phase", () => {
      const suggestions = getSuggestionsForPhase("arc");
      expect(suggestions).toContain("Coming of age");
      expect(suggestions).toContain("Epic quest");
    });

    it("returns suggestions for style phase", () => {
      const suggestions = getSuggestionsForPhase("style");
      expect(suggestions).toContain("Bright and colorful");
      expect(suggestions).toContain("Dark and moody");
    });

    it("returns suggestions for scope phase", () => {
      const suggestions = getSuggestionsForPhase("scope");
      expect(suggestions).toContain("4 pages");
      expect(suggestions).toContain("8 pages");
      expect(suggestions).toContain("12 pages");
    });

    it("returns suggestions for beats_preview phase", () => {
      const suggestions = getSuggestionsForPhase("beats_preview");
      expect(suggestions).toContain("Create Project");
      expect(suggestions).toContain("Edit beats");
      expect(suggestions).toContain("Try 5-act structure");
    });

    it("returns suggestions for confirmation phase", () => {
      const suggestions = getSuggestionsForPhase("confirmation");
      expect(suggestions).toContain("Create Project");
      expect(suggestions).toContain("Make changes");
    });

    it("returns empty array for complete phase", () => {
      const suggestions = getSuggestionsForPhase("complete");
      expect(suggestions).toEqual([]);
    });
  });

  // ===========================================================================
  // EXTRACTION PROMPTS
  // ===========================================================================

  describe("EXTRACTION_PROMPTS", () => {
    it("has characters extraction prompt with placeholder", () => {
      expect(EXTRACTION_PROMPTS.characters).toBeDefined();
      expect(EXTRACTION_PROMPTS.characters).toContain("{{conversation}}");
      expect(EXTRACTION_PROMPTS.characters).toContain("protagonist");
      expect(EXTRACTION_PROMPTS.characters).toContain("antagonist");
      expect(EXTRACTION_PROMPTS.characters).toContain("visualDescription");
      expect(EXTRACTION_PROMPTS.characters).toContain("personality");
      expect(EXTRACTION_PROMPTS.characters).toContain("relationships");
    });

    it("has setting extraction prompt with placeholder", () => {
      expect(EXTRACTION_PROMPTS.setting).toBeDefined();
      expect(EXTRACTION_PROMPTS.setting).toContain("{{conversation}}");
      expect(EXTRACTION_PROMPTS.setting).toContain("location");
      expect(EXTRACTION_PROMPTS.setting).toContain("atmosphere");
    });

    it("has storyArc extraction prompt with placeholders", () => {
      expect(EXTRACTION_PROMPTS.storyArc).toBeDefined();
      expect(EXTRACTION_PROMPTS.storyArc).toContain("{{conversation}}");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("{{structure}}");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("{{characters}}");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("{{setting}}");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("{{structureGuide}}");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("beats");
      expect(EXTRACTION_PROMPTS.storyArc).toContain("premise");
    });

    it("has beatsExpansion prompt with placeholders", () => {
      expect(EXTRACTION_PROMPTS.beatsExpansion).toBeDefined();
      expect(EXTRACTION_PROMPTS.beatsExpansion).toContain("{{beatType}}");
      expect(EXTRACTION_PROMPTS.beatsExpansion).toContain("{{summary}}");
      expect(EXTRACTION_PROMPTS.beatsExpansion).toContain("{{characters}}");
      expect(EXTRACTION_PROMPTS.beatsExpansion).toContain("{{setting}}");
      expect(EXTRACTION_PROMPTS.beatsExpansion).toContain("{{emotionalTone}}");
    });
  });

  // ===========================================================================
  // STRUCTURE GUIDES
  // ===========================================================================

  describe("STRUCTURE_GUIDES", () => {
    it("has three-act structure guide", () => {
      expect(STRUCTURE_GUIDES["three-act"]).toBeDefined();
      expect(STRUCTURE_GUIDES["three-act"]).toContain("Three-Act Structure");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("Setup");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("Confrontation");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("Resolution");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("setup");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("inciting_incident");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("midpoint");
      expect(STRUCTURE_GUIDES["three-act"]).toContain("climax");
    });

    it("has five-act structure guide", () => {
      expect(STRUCTURE_GUIDES["five-act"]).toBeDefined();
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Five-Act Structure");
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Exposition");
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Rising Action");
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Climax");
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Falling Action");
      expect(STRUCTURE_GUIDES["five-act"]).toContain("Denouement");
    });

    it("has hero-journey structure guide", () => {
      expect(STRUCTURE_GUIDES["hero-journey"]).toBeDefined();
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Hero's Journey");
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Departure");
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Initiation");
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Return");
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Call to adventure");
      expect(STRUCTURE_GUIDES["hero-journey"]).toContain("Resurrection");
    });
  });
});

// =============================================================================
// RESPONSE GENERATION TESTS
// =============================================================================

describe("ChatService Response Generation", () => {
  let service: ChatService;

  beforeEach(() => {
    resetChatService();
    mockGenerate.mockClear();
    mockGetStatus.mockClear();
    service = createChatService();
  });

  afterEach(() => {
    resetChatService();
  });

  describe("generateResponse", () => {
    it("generates response with state update", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      mockGenerate.mockImplementationOnce(async () => ({
        text: "That sounds like a great story! Tell me about the characters.",
        model: "test",
        provider: "test",
        tokensUsed: 20,
      }));

      const state = service.createInitialState();
      const result = await service.generateResponse(state, "A story about a brave knight");

      expect(result.response).toContain("great story");
      expect(result.newState.phase).toBe("characters");
      expect(result.newState.gathered.concept).toBe("A story about a brave knight");
      expect(result.metadata.suggestions).toBeDefined();
    });

    it("includes phase transition in metadata", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      mockGenerate.mockImplementationOnce(async () => ({
        text: "Response",
        model: "test",
        provider: "test",
        tokensUsed: 10,
      }));

      const state = service.createInitialState();
      const result = await service.generateResponse(state, "test");

      expect(result.metadata.phaseTransition).toEqual({
        from: "greeting",
        to: "characters",
      });
    });

    it("returns fallback response when provider unavailable", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: false,
        provider: "test",
        model: "test",
      }));

      const state = service.createInitialState();
      const result = await service.generateResponse(state, "test");

      // State updates first (greeting -> characters), then fallback is for NEW phase
      expect(result.response).toBe("Got it! Where does your story take place? What's the world like?");
      expect(result.metadata.suggestions).toBeDefined();
    });

    it("returns fallback response on generation error", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      mockGenerate.mockImplementationOnce(async () => {
        throw new Error("Generation failed");
      });

      const state = service.createInitialState();
      const result = await service.generateResponse(state, "test");

      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(0);
    });
  });

  describe("generateStreamingResponse", () => {
    it("yields text chunks and metadata", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      mockGenerate.mockImplementationOnce(async () => ({
        text: "Hello world!",
        model: "test",
        provider: "test",
        tokensUsed: 5,
      }));

      const state = service.createInitialState();
      const chunks: any[] = [];

      for await (const chunk of service.generateStreamingResponse(state, "test")) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter(c => c.type === "text");
      const metadataChunks = chunks.filter(c => c.type === "metadata");
      const completeChunks = chunks.filter(c => c.type === "complete");

      expect(textChunks.length).toBeGreaterThan(0);
      expect(metadataChunks).toHaveLength(1);
      expect(completeChunks).toHaveLength(1);

      // Text chunks should combine to full response
      const fullText = textChunks.map(c => c.content).join("");
      expect(fullText).toBe("Hello world!");
    });

    it("yields error chunk on failure", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: true,
        provider: "test",
        model: "test",
      }));

      mockGenerate.mockImplementationOnce(async () => {
        throw new Error("Generation failed");
      });

      const state = service.createInitialState();
      const chunks: any[] = [];

      for await (const chunk of service.generateStreamingResponse(state, "test")) {
        chunks.push(chunk);
      }

      const errorChunks = chunks.filter(c => c.type === "error");
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0].error).toBe("Generation failed");
    });

    it("handles unavailable provider with fallback", async () => {
      mockGetStatus.mockImplementationOnce(async () => ({
        available: false,
        provider: "test",
        model: "test",
      }));

      const state = service.createInitialState();
      const chunks: any[] = [];

      for await (const chunk of service.generateStreamingResponse(state, "test")) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter(c => c.type === "text");
      const completeChunks = chunks.filter(c => c.type === "complete");

      expect(textChunks.length).toBeGreaterThan(0);
      expect(completeChunks).toHaveLength(1);
    });
  });
});
