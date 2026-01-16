/**
 * PromptBuilder Unit Tests
 *
 * Comprehensive tests for the PromptBuilder class and related functions.
 * Tests prompt building for different model families, character placement,
 * direction hints, LoRA integration, and variant seed generation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import {
  PromptBuilder,
  buildPanelPrompt,
  generateVariantSeeds,
  detectModelFamily,
  type CharacterPlacement,
  type PromptDirection,
  type ModelFamily,
} from "../../generation/prompt-builder.js";
import type { Character, Panel } from "../../db/schema.js";

describe("PromptBuilder", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ==========================================================================
  // detectModelFamily
  // ==========================================================================
  describe("detectModelFamily", () => {
    it("detects illustrious from model name", () => {
      expect(detectModelFamily("illustriousXL_v10.safetensors")).toBe("illustrious");
    });

    it("detects illustrious from noob variant", () => {
      expect(detectModelFamily("noobaiXL_latest.safetensors")).toBe("illustrious");
    });

    it("detects pony from model name", () => {
      expect(detectModelFamily("ponyDiffusionV6XL.safetensors")).toBe("pony");
    });

    it("detects pony from yiff variant", () => {
      expect(detectModelFamily("yiffInHell_yihXXXTended.safetensors")).toBe("pony");
    });

    it("detects flux from model name", () => {
      expect(detectModelFamily("flux_dev_v1.safetensors")).toBe("flux");
    });

    it("detects flux with different casing", () => {
      expect(detectModelFamily("FLUX_SCHNELL.safetensors")).toBe("flux");
    });

    it("detects realistic from model name", () => {
      expect(detectModelFamily("realisticVision_v5.safetensors")).toBe("realistic");
    });

    it("detects realistic from photon variant", () => {
      expect(detectModelFamily("photonLCM_v1.safetensors")).toBe("realistic");
    });

    it("detects sdxl from model name", () => {
      expect(detectModelFamily("sdxl_base_1.0.safetensors")).toBe("sdxl");
    });

    it("detects sdxl from xl suffix", () => {
      expect(detectModelFamily("someModel_xl.safetensors")).toBe("sdxl");
    });

    it("falls back to sd15 for unknown models", () => {
      expect(detectModelFamily("unknownModel_v1.safetensors")).toBe("sd15");
    });

    it("handles empty string", () => {
      expect(detectModelFamily("")).toBe("sd15");
    });

    it("handles case-insensitive matching", () => {
      expect(detectModelFamily("ILLUSTRIOUS_XL")).toBe("illustrious");
      expect(detectModelFamily("Pony_Diffusion")).toBe("pony");
    });
  });

  // ==========================================================================
  // PromptBuilder - Model Family Settings
  // ==========================================================================
  describe("setModelFamily", () => {
    it("sets model family correctly", () => {
      const builder = new PromptBuilder("illustrious");
      const result = builder.build();

      expect(result.positive).toContain("masterpiece");
      expect(result.positive).toContain("best quality");
    });

    it("chains setModelFamily correctly", () => {
      const builder = new PromptBuilder();
      const chained = builder.setModelFamily("pony");

      expect(chained).toBe(builder);
    });

    it("detectFromModel updates model family", () => {
      const builder = new PromptBuilder("sd15");
      builder.detectFromModel("illustriousXL.safetensors");
      const result = builder.build();

      expect(result.positive).toContain("masterpiece");
      expect(result.positive).toContain("very aesthetic");
    });
  });

  // ==========================================================================
  // PromptBuilder - buildPanelPrompt for Different Model Families
  // ==========================================================================
  describe("buildPanelPrompt - Model Families", () => {
    const mockCharacter = (overrides: Partial<Character> = {}): Character => ({
      id: "char-1",
      projectId: "proj-1",
      name: "Test Character",
      basePrompt: "1girl, blue hair, red eyes",
      profile: {
        basePrompt: "1girl, blue hair, red eyes",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    const mockPanel = (overrides: Partial<Panel> = {}): Panel => ({
      id: "panel-1",
      storyboardId: "sb-1",
      sequenceIndex: 0,
      description: "Test panel",
      status: "draft",
      direction: null,
      characterIds: [],
      generationParams: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it("builds prompt for illustrious model family", () => {
      const result = buildPanelPrompt(mockPanel(), [], "illustrious");

      expect(result.positive).toContain("masterpiece");
      expect(result.positive).toContain("best quality");
      expect(result.positive).toContain("very aesthetic");
      expect(result.positive).toContain("absurdres");
      expect(result.negative).toContain("worst quality");
      expect(result.negative).toContain("bad hands");
    });

    it("builds prompt for pony model family", () => {
      const result = buildPanelPrompt(mockPanel(), [], "pony");

      expect(result.positive).toContain("score_9");
      expect(result.positive).toContain("score_8_up");
      expect(result.positive).toContain("source_anime");
      expect(result.negative).toContain("score_4");
      expect(result.negative).toContain("score_1");
    });

    it("builds prompt for sdxl model family", () => {
      const result = buildPanelPrompt(mockPanel(), [], "sdxl");

      expect(result.positive).toContain("high quality");
      expect(result.positive).toContain("detailed");
      expect(result.positive).toContain("8k uhd");
      expect(result.negative).toContain("blurry");
      expect(result.negative).toContain("deformed");
    });

    it("builds prompt for flux model family with minimal tags", () => {
      const result = buildPanelPrompt(mockPanel(), [], "flux");

      // Flux uses natural language, fewer tags
      expect(result.negative).toBe("");
    });

    it("builds prompt for sd15 model family", () => {
      const result = buildPanelPrompt(mockPanel(), [], "sd15");

      expect(result.positive).toContain("masterpiece");
      expect(result.positive).toContain("highly detailed");
      expect(result.negative).toContain("worst quality");
    });

    it("builds prompt for realistic model family", () => {
      const result = buildPanelPrompt(mockPanel(), [], "realistic");

      expect(result.positive).toContain("RAW photo");
      expect(result.positive).toContain("DSLR");
      expect(result.negative).toContain("cartoon");
      expect(result.negative).toContain("anime");
    });
  });

  // ==========================================================================
  // PromptBuilder - Character Placement
  // ==========================================================================
  describe("Character Placement", () => {
    const createMockCharacter = (profile: Record<string, unknown> = {}): Character => ({
      id: "char-1",
      projectId: "proj-1",
      name: "Test Character",
      basePrompt: "1girl, silver hair",
      profile: {
        basePrompt: "1girl, silver hair, golden eyes",
        ...profile,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("adds character base prompt to positive prompt", () => {
      const builder = new PromptBuilder("illustrious");
      const character = createMockCharacter();

      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.positive).toContain("1girl, silver hair, golden eyes");
    });

    it("includes position modifier with parentheses", () => {
      const builder = new PromptBuilder("illustrious");
      const character = createMockCharacter();

      builder.addCharacter({
        character,
        position: "on the left",
      });
      const result = builder.build();

      expect(result.positive).toContain("(on the left)");
    });

    it("includes action modifier", () => {
      const builder = new PromptBuilder("illustrious");
      const character = createMockCharacter();

      builder.addCharacter({
        character,
        action: "running",
      });
      const result = builder.build();

      expect(result.positive).toContain("running");
    });

    it("includes expression modifier with suffix", () => {
      const builder = new PromptBuilder("illustrious");
      const character = createMockCharacter();

      builder.addCharacter({
        character,
        expression: "happy",
      });
      const result = builder.build();

      expect(result.positive).toContain("happy expression");
    });

    it("combines all character modifiers correctly", () => {
      const builder = new PromptBuilder("illustrious");
      const character = createMockCharacter();

      builder.addCharacter({
        character,
        position: "center",
        action: "standing",
        expression: "serious",
      });
      const result = builder.build();

      expect(result.positive).toContain("(center)");
      expect(result.positive).toContain("standing");
      expect(result.positive).toContain("serious expression");
    });

    it("handles multiple characters", () => {
      const builder = new PromptBuilder("illustrious");

      const char1: Character = {
        ...createMockCharacter(),
        id: "char-1",
        name: "Character 1",
        profile: { basePrompt: "1girl, red hair" },
      };
      const char2: Character = {
        ...createMockCharacter(),
        id: "char-2",
        name: "Character 2",
        profile: { basePrompt: "1boy, blue hair" },
      };

      builder.addCharacter({ character: char1 });
      builder.addCharacter({ character: char2 });
      const result = builder.build();

      expect(result.positive).toContain("1girl, red hair");
      expect(result.positive).toContain("1boy, blue hair");
    });

    it("uses setCharacters to replace all characters", () => {
      const builder = new PromptBuilder("illustrious");
      const char1 = createMockCharacter();
      const char2: Character = {
        ...createMockCharacter(),
        profile: { basePrompt: "different character" },
      };

      builder.addCharacter({ character: char1 });
      builder.setCharacters([{ character: char2 }]);
      const result = builder.build();

      expect(result.positive).not.toContain("1girl, silver hair");
      expect(result.positive).toContain("different character");
    });

    it("handles character without profile", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Minimal Character",
        basePrompt: "",
        profile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      const result = builder.build();

      // Should not throw and should still include quality tags
      expect(result.positive).toContain("masterpiece");
    });
  });

  // ==========================================================================
  // PromptBuilder - LoRA Integration
  // ==========================================================================
  describe("LoRA Integration", () => {
    it("extracts LoRA from character profile", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "LoRA Character",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          lora: {
            path: "character_lora_v1.safetensors",
            weight: 0.85,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.characterLoras).toHaveLength(1);
      expect(result.characterLoras[0].name).toBe("character_lora_v1.safetensors");
      expect(result.characterLoras[0].weight).toBe(0.85);
    });

    it("uses default weight when not specified", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "LoRA Character",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          lora: {
            path: "my_lora.safetensors",
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.characterLoras[0].weight).toBe(0.8);
    });

    it("collects LoRAs from multiple characters", () => {
      const builder = new PromptBuilder("illustrious");

      const char1: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Character 1",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          lora: { path: "lora1.safetensors", weight: 0.7 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const char2: Character = {
        id: "char-2",
        projectId: "proj-1",
        name: "Character 2",
        basePrompt: "1boy",
        profile: {
          basePrompt: "1boy",
          lora: { path: "lora2.safetensors", weight: 0.9 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character: char1 });
      builder.addCharacter({ character: char2 });
      const result = builder.build();

      expect(result.characterLoras).toHaveLength(2);
    });

    it("extracts reference images from character profile", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Character",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          referenceImages: [
            { path: "/refs/char_front.png", isPrimary: true },
            { path: "/refs/char_side.png", isPrimary: false },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.referenceImages).toHaveLength(2);
      expect(result.referenceImages).toContain("/refs/char_front.png");
      expect(result.referenceImages).toContain("/refs/char_side.png");
    });
  });

  // ==========================================================================
  // PromptBuilder - Direction Hints (Camera Angles)
  // ==========================================================================
  describe("Direction Hints - Camera Angles", () => {
    it("applies close-up camera angle", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "close-up" });
      const result = builder.build();

      expect(result.positive).toContain("close-up shot");
      expect(result.positive).toContain("face focus");
    });

    it("applies wide shot camera angle", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "wide shot" });
      const result = builder.build();

      expect(result.positive).toContain("wide shot");
      expect(result.positive).toContain("full scene");
    });

    it("applies bird's eye view", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "bird's eye" });
      const result = builder.build();

      expect(result.positive).toContain("bird's eye view");
      expect(result.positive).toContain("from above");
    });

    it("applies low angle shot", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "low angle" });
      const result = builder.build();

      expect(result.positive).toContain("low angle shot");
      expect(result.positive).toContain("from below");
    });

    it("applies dutch angle", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "dutch angle" });
      const result = builder.build();

      expect(result.positive).toContain("dutch angle");
      expect(result.positive).toContain("tilted");
    });

    it("passes through unknown camera angles verbatim", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "custom extreme angle" });
      const result = builder.build();

      expect(result.positive).toContain("custom extreme angle");
    });

    it("handles case-insensitive camera angle matching", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ cameraAngle: "CLOSE-UP" });
      const result = builder.build();

      expect(result.positive).toContain("close-up shot");
    });
  });

  // ==========================================================================
  // PromptBuilder - Direction Hints (Lighting)
  // ==========================================================================
  describe("Direction Hints - Lighting", () => {
    it("applies dramatic lighting", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "dramatic" });
      const result = builder.build();

      expect(result.positive).toContain("dramatic lighting");
      expect(result.positive).toContain("high contrast");
    });

    it("applies golden hour lighting", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "golden hour" });
      const result = builder.build();

      expect(result.positive).toContain("golden hour lighting");
      expect(result.positive).toContain("warm tones");
    });

    it("applies neon lighting", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "neon" });
      const result = builder.build();

      expect(result.positive).toContain("neon lighting");
      expect(result.positive).toContain("cyberpunk");
    });

    it("applies moonlight lighting", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "moonlight" });
      const result = builder.build();

      expect(result.positive).toContain("moonlight");
      expect(result.positive).toContain("night scene");
    });

    it("applies backlit lighting", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "backlit" });
      const result = builder.build();

      expect(result.positive).toContain("backlit");
      expect(result.positive).toContain("rim lighting");
    });

    it("passes through custom lighting verbatim", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ lighting: "bioluminescent glow" });
      const result = builder.build();

      expect(result.positive).toContain("bioluminescent glow");
    });
  });

  // ==========================================================================
  // PromptBuilder - Direction Hints (Mood)
  // ==========================================================================
  describe("Direction Hints - Mood", () => {
    it("applies tense mood", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "tense" });
      const result = builder.build();

      expect(result.positive).toContain("tense atmosphere");
      expect(result.positive).toContain("suspenseful");
    });

    it("applies romantic mood", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "romantic" });
      const result = builder.build();

      expect(result.positive).toContain("romantic atmosphere");
      expect(result.positive).toContain("intimate");
    });

    it("applies mysterious mood", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "mysterious" });
      const result = builder.build();

      expect(result.positive).toContain("mysterious atmosphere");
      expect(result.positive).toContain("enigmatic");
    });

    it("applies energetic mood", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "energetic" });
      const result = builder.build();

      expect(result.positive).toContain("dynamic");
      expect(result.positive).toContain("action");
    });

    it("applies nostalgic mood", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "nostalgic" });
      const result = builder.build();

      expect(result.positive).toContain("nostalgic");
      expect(result.positive).toContain("vintage feel");
    });

    it("passes through custom mood verbatim", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ mood: "dreamlike surreal" });
      const result = builder.build();

      expect(result.positive).toContain("dreamlike surreal");
    });
  });

  // ==========================================================================
  // PromptBuilder - Negative Prompts
  // ==========================================================================
  describe("Negative Prompts", () => {
    it("includes model-family specific negative prompts", () => {
      const builder = new PromptBuilder("illustrious");
      const result = builder.build();

      expect(result.negative).toContain("worst quality");
      expect(result.negative).toContain("bad anatomy");
      expect(result.negative).toContain("missing fingers");
    });

    it("adds direction negative prompt", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ negativePrompt: "blurry background" });
      const result = builder.build();

      expect(result.negative).toContain("blurry background");
    });

    it("adds custom negative elements", () => {
      const builder = new PromptBuilder("illustrious");
      builder.addNegative("watermark", "text");
      const result = builder.build();

      expect(result.negative).toContain("watermark");
      expect(result.negative).toContain("text");
    });

    it("includes character-specific negative prompts", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Character",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          negativePrompt: "wrong hair color",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.negative).toContain("wrong hair color");
    });

    it("combines all negative prompt sources", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Character",
        basePrompt: "1girl",
        profile: {
          basePrompt: "1girl",
          negativePrompt: "character-specific negative",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.setDirection({ negativePrompt: "direction negative" });
      builder.addNegative("custom negative");
      builder.addCharacter({ character });
      const result = builder.build();

      expect(result.negative).toContain("worst quality"); // Model family
      expect(result.negative).toContain("direction negative");
      expect(result.negative).toContain("custom negative");
      expect(result.negative).toContain("character-specific negative");
    });
  });

  // ==========================================================================
  // PromptBuilder - Custom Positive Elements
  // ==========================================================================
  describe("Custom Positive Elements", () => {
    it("adds single custom positive element", () => {
      const builder = new PromptBuilder("illustrious");
      builder.addPositive("detailed background");
      const result = builder.build();

      expect(result.positive).toContain("detailed background");
    });

    it("adds multiple custom positive elements", () => {
      const builder = new PromptBuilder("illustrious");
      builder.addPositive("intricate details", "vibrant colors", "sharp focus");
      const result = builder.build();

      expect(result.positive).toContain("intricate details");
      expect(result.positive).toContain("vibrant colors");
      expect(result.positive).toContain("sharp focus");
    });

    it("chains addPositive calls", () => {
      const builder = new PromptBuilder("illustrious");
      builder.addPositive("element1").addPositive("element2");
      const result = builder.build();

      expect(result.positive).toContain("element1");
      expect(result.positive).toContain("element2");
    });
  });

  // ==========================================================================
  // PromptBuilder - Scene Description
  // ==========================================================================
  describe("Scene Description", () => {
    it("includes scene description in prompt", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ sceneDescription: "forest clearing at sunset" });
      const result = builder.build();

      expect(result.positive).toContain("forest clearing at sunset");
    });

    it("includes additional prompt", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({ additionalPrompt: "holding sword, armor" });
      const result = builder.build();

      expect(result.positive).toContain("holding sword, armor");
    });

    it("combines scene description with additional prompt", () => {
      const builder = new PromptBuilder("illustrious");
      builder.setDirection({
        sceneDescription: "castle interior",
        additionalPrompt: "candlelit, medieval",
      });
      const result = builder.build();

      expect(result.positive).toContain("castle interior");
      expect(result.positive).toContain("candlelit, medieval");
    });
  });

  // ==========================================================================
  // PromptBuilder - Reset
  // ==========================================================================
  describe("reset", () => {
    it("clears all accumulated state", () => {
      const builder = new PromptBuilder("illustrious");
      const character: Character = {
        id: "char-1",
        projectId: "proj-1",
        name: "Character",
        basePrompt: "1girl",
        profile: { basePrompt: "1girl, test character" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      builder.addCharacter({ character });
      builder.setDirection({ sceneDescription: "forest" });
      builder.addPositive("custom");
      builder.addNegative("bad");

      builder.reset();
      const result = builder.build();

      // Should only have quality tags after reset
      expect(result.positive).not.toContain("1girl, test character");
      expect(result.positive).not.toContain("forest");
      expect(result.positive).not.toContain("custom");
      expect(result.positive).toContain("masterpiece");
    });

    it("allows reuse after reset", () => {
      const builder = new PromptBuilder("illustrious");

      builder.setDirection({ sceneDescription: "scene1" });
      builder.build();

      builder.reset();
      builder.setDirection({ sceneDescription: "scene2" });
      const result = builder.build();

      expect(result.positive).not.toContain("scene1");
      expect(result.positive).toContain("scene2");
    });

    it("returns this for chaining", () => {
      const builder = new PromptBuilder("illustrious");
      const returned = builder.reset();
      expect(returned).toBe(builder);
    });
  });

  // ==========================================================================
  // generateVariantSeeds
  // ==========================================================================
  describe("generateVariantSeeds", () => {
    it("generates correct number of seeds", () => {
      const seeds = generateVariantSeeds({ seedBase: 12345, count: 5 });
      expect(seeds).toHaveLength(5);
    });

    it("starts with the base seed", () => {
      const seeds = generateVariantSeeds({ seedBase: 12345, count: 3 });
      expect(seeds[0]).toBe(12345);
    });

    it("generates deterministic seeds", () => {
      const seeds1 = generateVariantSeeds({ seedBase: 12345, count: 5 });
      const seeds2 = generateVariantSeeds({ seedBase: 12345, count: 5 });
      expect(seeds1).toEqual(seeds2);
    });

    it("generates spread out seeds", () => {
      const seeds = generateVariantSeeds({ seedBase: 0, count: 3 });

      expect(seeds[0]).toBe(0);
      expect(seeds[1]).toBe(12345);
      expect(seeds[2]).toBe(24690);
    });

    it("handles single seed request", () => {
      const seeds = generateVariantSeeds({ seedBase: 999, count: 1 });
      expect(seeds).toEqual([999]);
    });

    it("handles zero count", () => {
      const seeds = generateVariantSeeds({ seedBase: 12345, count: 0 });
      expect(seeds).toHaveLength(0);
    });

    it("handles large seed base", () => {
      const seeds = generateVariantSeeds({ seedBase: 2147483647, count: 2 });
      expect(seeds).toHaveLength(2);
      expect(seeds[0]).toBe(2147483647);
    });
  });

  // ==========================================================================
  // buildPanelPrompt - Integration
  // ==========================================================================
  describe("buildPanelPrompt - Integration", () => {
    const mockPanel = (overrides: Partial<Panel> = {}): Panel => ({
      id: "panel-1",
      storyboardId: "sb-1",
      sequenceIndex: 0,
      description: "Test panel",
      status: "draft",
      direction: null,
      characterIds: [],
      generationParams: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    const mockCharacter = (id: string, profile: Record<string, unknown>): Character => ({
      id,
      projectId: "proj-1",
      name: `Character ${id}`,
      basePrompt: "",
      profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("builds prompt from panel with direction", () => {
      const panel = mockPanel({
        direction: {
          sceneDescription: "beach at sunset",
          cameraAngle: "wide shot",
          lighting: "golden hour",
          mood: "peaceful",
        },
      });

      const result = buildPanelPrompt(panel, [], "illustrious");

      expect(result.positive).toContain("beach at sunset");
      expect(result.positive).toContain("wide shot");
      expect(result.positive).toContain("golden hour");
      expect(result.positive).toContain("peaceful");
    });

    it("includes characters from characterIds", () => {
      const panel = mockPanel({
        characterIds: ["char-1", "char-2"],
      });

      const characters: Character[] = [
        mockCharacter("char-1", { basePrompt: "first character" }),
        mockCharacter("char-2", { basePrompt: "second character" }),
        mockCharacter("char-3", { basePrompt: "not included" }),
      ];

      const result = buildPanelPrompt(panel, characters, "illustrious");

      expect(result.positive).toContain("first character");
      expect(result.positive).toContain("second character");
      expect(result.positive).not.toContain("not included");
    });

    it("handles panel with no direction", () => {
      const panel = mockPanel({ direction: null });
      const result = buildPanelPrompt(panel, [], "illustrious");

      // Should still have quality tags
      expect(result.positive).toContain("masterpiece");
    });

    it("handles empty characterIds array", () => {
      const panel = mockPanel({ characterIds: [] });
      const result = buildPanelPrompt(panel, [], "illustrious");

      expect(result.positive).toContain("masterpiece");
    });

    it("skips missing characters gracefully", () => {
      const panel = mockPanel({
        characterIds: ["char-1", "char-missing"],
      });

      const characters: Character[] = [
        mockCharacter("char-1", { basePrompt: "existing character" }),
      ];

      const result = buildPanelPrompt(panel, characters, "illustrious");

      expect(result.positive).toContain("existing character");
    });

    it("defaults to illustrious model family", () => {
      const panel = mockPanel();
      const result = buildPanelPrompt(panel, []);

      expect(result.positive).toContain("very aesthetic"); // Illustrious-specific
    });
  });
});
