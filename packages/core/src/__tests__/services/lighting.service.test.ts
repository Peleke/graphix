/**
 * Lighting Service Unit Tests
 *
 * Tests for scene lighting configuration and prompt generation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetAllServices,
  createTestProject,
  createTestStoryboard,
} from "../setup.js";
import { getLightingService } from "../../services/index.js";
import type { SceneLightingConfig, LightSource } from "../../db/index.js";
import {
  LIGHT_TYPES,
  LIGHT_DIRECTIONS,
  TIMES_OF_DAY,
  WEATHER_CONDITIONS,
} from "../../services/lighting.service.js";

// Valid base primary source for tests
const validPrimarySource: LightSource = {
  type: "sun",
  direction: "south",
  intensity: 0.8,
};

describe("LightingService", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    resetAllServices();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // SET LIGHTING
  // ============================================================================

  describe("setLighting", () => {
    it("sets basic lighting config on storyboard", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      const config: SceneLightingConfig = {
        timeOfDay: "dusk",
        weather: "clear",
        primarySource: validPrimarySource,
      };

      const result = await service.setLighting(storyboard.id, config);

      expect(result.lightingConfig).toEqual(config);
    });

    it("sets full lighting config with light sources", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      const config: SceneLightingConfig = {
        timeOfDay: "night",
        weather: "stormy",
        primarySource: {
          type: "moon",
          direction: "above",
          intensity: 0.4,
          color: "blue",
        },
        secondarySource: {
          type: "fire",
          direction: "south",
          intensity: 0.8,
          color: "orange",
        },
        ambientColor: "purple",
      };

      const result = await service.setLighting(storyboard.id, config);

      expect(result.lightingConfig).toEqual(config);
      expect(result.lightingConfig?.primarySource?.type).toBe("moon");
      expect(result.lightingConfig?.secondarySource?.type).toBe("fire");
    });

    it("throws on non-existent storyboard", async () => {
      const service = getLightingService();

      await expect(
        service.setLighting("nonexistent-id", { timeOfDay: "noon", primarySource: validPrimarySource })
      ).rejects.toThrow("Storyboard not found");
    });

    it("updates existing lighting config", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await service.setLighting(storyboard.id, { timeOfDay: "morning", primarySource: validPrimarySource });
      const result = await service.setLighting(storyboard.id, { timeOfDay: "night", primarySource: validPrimarySource });

      expect(result.lightingConfig?.timeOfDay).toBe("night");
    });

    it("validates light type", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await expect(
        service.setLighting(storyboard.id, {
          primarySource: {
            type: "invalid" as any,
            direction: "south",
            intensity: 1,
          },
        })
      ).rejects.toThrow();
    });

    it("validates light direction", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await expect(
        service.setLighting(storyboard.id, {
          primarySource: {
            type: "sun",
            direction: "invalid" as any,
            intensity: 1,
          },
        })
      ).rejects.toThrow();
    });

    it("validates intensity range", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await expect(
        service.setLighting(storyboard.id, {
          primarySource: {
            type: "sun",
            direction: "south",
            intensity: 2.0, // Invalid: should be 0-1
          },
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // GET LIGHTING
  // ============================================================================

  describe("getLighting", () => {
    it("returns null when no lighting set", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      const result = await service.getLighting(storyboard.id);

      expect(result).toBeNull();
    });

    it("returns lighting config when set", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await service.setLighting(storyboard.id, { timeOfDay: "dusk", weather: "foggy", primarySource: validPrimarySource });

      const result = await service.getLighting(storyboard.id);

      expect(result?.timeOfDay).toBe("dusk");
      expect(result?.weather).toBe("foggy");
    });

    it("returns null for non-existent storyboard", async () => {
      const service = getLightingService();

      const result = await service.getLighting("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CLEAR LIGHTING
  // ============================================================================

  describe("clearLighting", () => {
    it("clears lighting config", async () => {
      const service = getLightingService();
      const project = await createTestProject("Test");
      const storyboard = await createTestStoryboard(project.id, "Chapter");

      await service.setLighting(storyboard.id, { timeOfDay: "noon", primarySource: validPrimarySource });
      const result = await service.clearLighting(storyboard.id);

      expect(result.lightingConfig).toBeNull();
    });

    it("throws on non-existent storyboard", async () => {
      const service = getLightingService();

      await expect(service.clearLighting("nonexistent-id")).rejects.toThrow(
        "Storyboard not found"
      );
    });
  });

  // ============================================================================
  // GENERATE PROMPT FRAGMENT
  // ============================================================================

  describe("generatePromptFragment", () => {
    it("generates fragment for time of day", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({ timeOfDay: "dawn" });

      expect(fragment).toContain("dawn");
      expect(fragment).toContain("golden hour");
    });

    it("generates fragment for weather", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({ weather: "stormy" });

      expect(fragment).toContain("stormy");
      expect(fragment).toContain("dramatic");
    });

    it("generates fragment for primary light source", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        primarySource: {
          type: "sun",
          direction: "east",
          intensity: 0.7,
        },
      });

      expect(fragment).toContain("sunlight");
      expect(fragment).toContain("side lighting");
    });

    it("includes intensity descriptors for low light", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        primarySource: {
          type: "moon",
          direction: "above",
          intensity: 0.2,
        },
      });

      expect(fragment).toContain("dim lighting");
    });

    it("includes intensity descriptors for bright light", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        primarySource: {
          type: "sun",
          direction: "south",
          intensity: 0.9,
        },
      });

      expect(fragment).toContain("bright lighting");
    });

    it("includes color tint when specified", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        primarySource: {
          type: "fire",
          direction: "south",
          intensity: 0.6,
          color: "orange",
        },
      });

      expect(fragment).toContain("orange tinted light");
    });

    it("includes secondary light source as fill", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        primarySource: { type: "sun", direction: "east", intensity: 0.8 },
        secondarySource: { type: "ambient", direction: "west", intensity: 0.3 },
      });

      expect(fragment).toContain("fill light from west");
    });

    it("includes ambient color", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        ambientColor: "cyan",
      });

      expect(fragment).toContain("cyan ambient tone");
    });

    it("combines all elements into comma-separated string", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({
        timeOfDay: "dusk",
        weather: "cloudy",
        primarySource: { type: "sun", direction: "west", intensity: 0.5 },
        ambientColor: "purple",
      });

      expect(fragment).toContain(",");
      expect(fragment.split(",").length).toBeGreaterThan(3);
    });

    it("returns empty string for empty config", () => {
      const service = getLightingService();

      const fragment = service.generatePromptFragment({});

      expect(fragment).toBe("");
    });
  });

  // ============================================================================
  // SUGGEST LIGHTING
  // ============================================================================

  describe("suggestLighting", () => {
    it("detects dawn from description", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("The heroes watch the sunrise");

      expect(suggestion.timeOfDay).toBe("dawn");
    });

    it("detects night from description", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("Under the midnight sky");

      expect(suggestion.timeOfDay).toBe("night");
    });

    it("detects stormy weather", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("Lightning strikes the tower");

      expect(suggestion.weather).toBe("stormy");
    });

    it("detects foggy weather", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("Mist covers the forest");

      expect(suggestion.weather).toBe("foggy");
    });

    it("detects fire light source", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("Around the campfire");

      expect(suggestion.primarySource?.type).toBe("fire");
    });

    it("detects window light for indoor scenes", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("Light from the window");

      expect(suggestion.primarySource?.type).toBe("window");
    });

    it("detects backlight direction", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("A silhouette against the light");

      expect(suggestion.primarySource?.direction).toBe("north");
    });

    it("defaults to key light position", () => {
      const service = getLightingService();

      const suggestion = service.suggestLighting("A simple scene");

      expect(suggestion.primarySource?.direction).toBe("southeast");
    });
  });

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  describe("constants", () => {
    it("exports all light types", () => {
      expect(LIGHT_TYPES).toContain("sun");
      expect(LIGHT_TYPES).toContain("moon");
      expect(LIGHT_TYPES).toContain("artificial");
      expect(LIGHT_TYPES).toContain("fire");
      expect(LIGHT_TYPES).toContain("window");
      expect(LIGHT_TYPES).toContain("ambient");
    });

    it("exports all light directions", () => {
      expect(LIGHT_DIRECTIONS).toContain("north");
      expect(LIGHT_DIRECTIONS).toContain("south");
      expect(LIGHT_DIRECTIONS).toContain("east");
      expect(LIGHT_DIRECTIONS).toContain("west");
      expect(LIGHT_DIRECTIONS).toContain("above");
      expect(LIGHT_DIRECTIONS).toContain("below");
    });

    it("exports all times of day", () => {
      expect(TIMES_OF_DAY).toContain("dawn");
      expect(TIMES_OF_DAY).toContain("noon");
      expect(TIMES_OF_DAY).toContain("dusk");
      expect(TIMES_OF_DAY).toContain("night");
    });

    it("exports all weather conditions", () => {
      expect(WEATHER_CONDITIONS).toContain("clear");
      expect(WEATHER_CONDITIONS).toContain("cloudy");
      expect(WEATHER_CONDITIONS).toContain("foggy");
      expect(WEATHER_CONDITIONS).toContain("rainy");
      expect(WEATHER_CONDITIONS).toContain("stormy");
    });
  });
});
