/**
 * Unit Tests: Database Schema
 *
 * Tests schema definitions, types, and relations.
 */

import { describe, test, expect } from "bun:test";
import {
  projects,
  characters,
  storyboards,
  panels,
  generatedImages,
  pageLayouts,
  type Project,
  type Character,
  type Storyboard,
  type Panel,
  type GeneratedImage,
  type PageLayout,
  type ProjectSettings,
  type CharacterProfile,
  type PromptFragments,
  type PanelDirection,
  type PageLayoutConfig,
  type PanelPlacement,
} from "../../../db/schema.js";

describe("Schema: Projects", () => {
  test("has required columns", () => {
    const columns = Object.keys(projects);
    expect(columns).toContain("id");
    expect(columns).toContain("name");
    expect(columns).toContain("description");
    expect(columns).toContain("settings");
    expect(columns).toContain("createdAt");
    expect(columns).toContain("updatedAt");
  });

  test("ProjectSettings type structure", () => {
    const settings: ProjectSettings = {
      defaultModel: "model.safetensors",
      defaultLoras: [{ name: "lora.safetensors", strength: 0.7 }],
      defaultNegative: "bad quality",
      resolution: { width: 768, height: 1024 },
    };

    expect(settings.defaultModel).toBeDefined();
    expect(settings.defaultLoras).toBeInstanceOf(Array);
    expect(settings.resolution.width).toBeGreaterThan(0);
    expect(settings.resolution.height).toBeGreaterThan(0);
  });
});

describe("Schema: Characters", () => {
  test("has required columns", () => {
    const columns = Object.keys(characters);
    expect(columns).toContain("id");
    expect(columns).toContain("projectId");
    expect(columns).toContain("name");
    expect(columns).toContain("profile");
    expect(columns).toContain("promptFragments");
    expect(columns).toContain("referenceImages");
    expect(columns).toContain("lora");
  });

  test("CharacterProfile type structure", () => {
    const profile: CharacterProfile = {
      species: "anthro wolf",
      bodyType: "athletic",
      features: ["gray fur", "amber eyes"],
      ageDescriptors: ["adult"],
      clothing: ["leather jacket"],
      distinguishing: ["scar on cheek"],
    };

    expect(profile.species).toBeDefined();
    expect(profile.features).toBeInstanceOf(Array);
    expect(profile.ageDescriptors).toBeInstanceOf(Array);
  });

  test("PromptFragments type structure", () => {
    const fragments: PromptFragments = {
      positive: "anthro wolf, gray fur",
      negative: "human, realistic",
      triggers: ["wolf_char_v1"],
    };

    expect(fragments.positive).toBeDefined();
    expect(fragments.negative).toBeDefined();
    expect(fragments.triggers).toBeInstanceOf(Array);
  });
});

describe("Schema: Storyboards", () => {
  test("has required columns", () => {
    const columns = Object.keys(storyboards);
    expect(columns).toContain("id");
    expect(columns).toContain("projectId");
    expect(columns).toContain("name");
    expect(columns).toContain("description");
  });
});

describe("Schema: Panels", () => {
  test("has required columns", () => {
    const columns = Object.keys(panels);
    expect(columns).toContain("id");
    expect(columns).toContain("storyboardId");
    expect(columns).toContain("position");
    expect(columns).toContain("description");
    expect(columns).toContain("direction");
    expect(columns).toContain("characterIds");
    expect(columns).toContain("selectedOutputId");
  });

  test("PanelDirection type structure", () => {
    const direction: PanelDirection = {
      cameraAngle: "low angle",
      mood: "dramatic",
      lighting: "golden hour",
    };

    expect(direction.cameraAngle).toBeDefined();
    expect(direction.mood).toBeDefined();
    expect(direction.lighting).toBeDefined();
  });
});

describe("Schema: GeneratedImages", () => {
  test("has required columns", () => {
    const columns = Object.keys(generatedImages);
    expect(columns).toContain("id");
    expect(columns).toContain("panelId");
    expect(columns).toContain("localPath");
    expect(columns).toContain("seed");
    expect(columns).toContain("prompt");
    expect(columns).toContain("model");
    expect(columns).toContain("steps");
    expect(columns).toContain("cfg");
    expect(columns).toContain("sampler");
    expect(columns).toContain("width");
    expect(columns).toContain("height");
  });

  test("has consistency tracking columns", () => {
    const columns = Object.keys(generatedImages);
    expect(columns).toContain("usedIPAdapter");
    expect(columns).toContain("ipAdapterImages");
    expect(columns).toContain("usedControlNet");
    expect(columns).toContain("controlNetType");
    expect(columns).toContain("controlNetImage");
  });

  test("has variant tracking columns", () => {
    const columns = Object.keys(generatedImages);
    expect(columns).toContain("variantStrategy");
    expect(columns).toContain("variantIndex");
  });

  test("has selection/rating columns", () => {
    const columns = Object.keys(generatedImages);
    expect(columns).toContain("isSelected");
    expect(columns).toContain("isFavorite");
    expect(columns).toContain("rating");
  });
});

describe("Schema: PageLayouts", () => {
  test("has required columns", () => {
    const columns = Object.keys(pageLayouts);
    expect(columns).toContain("id");
    expect(columns).toContain("storyboardId");
    expect(columns).toContain("name");
    expect(columns).toContain("pageNumber");
    expect(columns).toContain("layoutConfig");
    expect(columns).toContain("panelPlacements");
    expect(columns).toContain("renderedPath");
    expect(columns).toContain("renderedAt");
  });

  test("PageLayoutConfig type structure", () => {
    const config: PageLayoutConfig = {
      template: "4-panel-grid",
      width: 2480,
      height: 3508,
      dpi: 300,
      margin: 40,
      gutter: 20,
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: "#000000",
      borderRadius: 0,
    };

    expect(config.template).toBeDefined();
    expect(config.width).toBeGreaterThan(0);
    expect(config.height).toBeGreaterThan(0);
    expect(config.dpi).toBeGreaterThan(0);
  });

  test("PanelPlacement type structure", () => {
    const placement: PanelPlacement = {
      panelId: "panel_123",
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 1,
    };

    expect(placement.panelId).toBeDefined();
    expect(placement.row).toBeGreaterThanOrEqual(0);
    expect(placement.col).toBeGreaterThanOrEqual(0);
    expect(placement.rowSpan).toBeGreaterThan(0);
    expect(placement.colSpan).toBeGreaterThan(0);
  });
});

describe("Schema: Type Inference", () => {
  test("Project type is correctly inferred", () => {
    // This tests TypeScript inference, will fail to compile if types are wrong
    const project: Project = {
      id: "proj_123",
      name: "Test",
      description: "Test project",
      settings: {
        defaultModel: "model.safetensors",
        defaultLoras: [],
        defaultNegative: "bad quality",
        resolution: { width: 768, height: 1024 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(project.id).toBeDefined();
  });

  test("Character type is correctly inferred", () => {
    const character: Character = {
      id: "char_123",
      projectId: "proj_123",
      name: "Test Character",
      profile: {
        species: "anthro wolf",
        bodyType: "athletic",
        features: [],
        ageDescriptors: [],
        clothing: [],
        distinguishing: [],
      },
      promptFragments: {
        positive: "",
        negative: "",
        triggers: [],
      },
      referenceImages: [],
      lora: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(character.id).toBeDefined();
  });

  test("GeneratedImage type is correctly inferred", () => {
    const image: GeneratedImage = {
      id: "gen_123",
      panelId: "panel_123",
      localPath: "/output/test.png",
      cloudUrl: null,
      thumbnailPath: null,
      seed: 12345,
      prompt: "test prompt",
      negativePrompt: "bad quality",
      model: "model.safetensors",
      loras: [],
      steps: 28,
      cfg: 7,
      sampler: "euler_ancestral",
      scheduler: "normal",
      width: 768,
      height: 1024,
      variantStrategy: "seed",
      variantIndex: 0,
      usedIPAdapter: false,
      ipAdapterImages: null,
      usedControlNet: false,
      controlNetType: null,
      controlNetImage: null,
      isSelected: false,
      isFavorite: false,
      rating: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(image.id).toBeDefined();
  });
});
