/**
 * E2E Test: Otter Stress Relief Scenario
 *
 * Demonstrates all Phase 3.5 features in a realistic NSFW workflow.
 * This test runs against a real database but mocks ComfyUI generation.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getDb, closeDb } from "../../db/client.js";
import { getProjectService } from "../../services/project.service.js";
import { getCharacterService } from "../../services/character.service.js";
import { getStoryboardService } from "../../services/storyboard.service.js";
import { getPanelService } from "../../services/panel.service.js";
import { getGeneratedImageService } from "../../services/generated-image.service.js";
import {
  getLightingService,
  LIGHT_TYPES,
  LIGHT_DIRECTIONS,
  TIMES_OF_DAY,
  WEATHER_CONDITIONS,
} from "../../services/lighting.service.js";
import { getInteractionPoseService } from "../../services/interaction-pose.service.js";
import { getCustomAssetService } from "../../services/custom-asset.service.js";
import { getPoseLibraryService } from "../../services/pose-library.service.js";
import { getPromptAnalyticsService } from "../../services/prompt-analytics.service.js";
import { getInterpolationService } from "../../services/interpolation.service.js";
import { DEFAULT_INTERACTION_POSES } from "../../services/interaction-pose.seed.js";
import {
  projects,
  characters,
  storyboards,
  panels,
  generatedImages,
} from "../../db/schema.js";

describe("Otter Stress Relief Scenario - Phase 3.5 UAT", () => {
  // Services
  const projectService = getProjectService();
  const characterService = getCharacterService();
  const storyboardService = getStoryboardService();
  const panelService = getPanelService();
  const generatedImageService = getGeneratedImageService();
  const lightingService = getLightingService();
  const interactionPoseService = getInteractionPoseService();
  const customAssetService = getCustomAssetService();
  const poseLibraryService = getPoseLibraryService();
  const analyticsService = getPromptAnalyticsService();
  const interpolationService = getInterpolationService();

  // Test data IDs
  let projectId: string;
  let characterId: string;
  let storyboardId: string;
  const panelIds: string[] = [];
  const generationIds: string[] = [];

  beforeAll(async () => {
    console.log("\n🦦 Starting Otter Stress Relief Scenario...\n");
  });

  afterAll(async () => {
    console.log("\n✅ Scenario complete!\n");
  });

  // =========================================================================
  // SETUP
  // =========================================================================

  describe("Setup: Project, Character, Storyboard", () => {
    it("should create project", async () => {
      const project = await projectService.create({
        name: "Stress Relief One-Shot",
        description: "Solo NSFW scene - exhausted otter after work",
      });

      expect(project).toBeDefined();
      expect(project.name).toBe("Stress Relief One-Shot");
      projectId = project.id;

      console.log(`  📁 Project created: ${project.name} (${projectId})`);
    });

    it("should create character: Mira the Otter", async () => {
      const character = await characterService.create({
        projectId,
        name: "Mira",
        profile: {
          species: "otter",
          bodyType: "average",
          features: ["brown fur", "cream underbelly", "amber eyes"],
          ageDescriptors: ["adult"],
          clothing: [],
          distinguishing: ["small scar on left ear", "always looks exhausted"],
        },
        promptFragments: {
          positive: "female otter, anthro otter, brown fur, cream underbelly, amber eyes, curvy",
        },
      });

      expect(character).toBeDefined();
      expect(character.name).toBe("Mira");
      characterId = character.id;

      console.log(`  🦦 Character created: ${character.name} (${characterId})`);
    });

    it("should create storyboard", async () => {
      const storyboard = await storyboardService.create({
        projectId,
        name: "After Work Release",
        description: "Mira comes home exhausted, drinks, masturbates, passes out",
      });

      expect(storyboard).toBeDefined();
      expect(storyboard.name).toBe("After Work Release");
      storyboardId = storyboard.id;

      console.log(`  📖 Storyboard created: ${storyboard.name} (${storyboardId})`);
    });
  });

  // =========================================================================
  // 3.5.8 CUSTOM ASSETS
  // =========================================================================

  describe("3.5.8: Register Custom LoRA", () => {
    it("should register Mira character LoRA", async () => {
      const asset = await customAssetService.register({
        projectId,
        characterId,
        name: "mira_otter_v1",
        displayName: "Mira Otter Character LoRA",
        type: "lora",
        filePath: "loras/mira_otter_v1.safetensors",
        triggerWord: "mira_otter",
        triggerAliases: ["mira", "tired_otter"],
        defaultStrength: 0.85,
        defaultClipStrength: 1.0,
        baseModel: "pony",
        tags: ["character", "otter", "female", "mira"],
      });

      expect(asset).toBeDefined();
      expect(asset.type).toBe("lora");
      expect(asset.triggerWord).toBe("mira_otter");

      console.log(`  🎨 LoRA registered: ${asset.displayName}`);
      console.log(`     Trigger: "${asset.triggerWord}"`);
      console.log(`     Strength: ${asset.defaultStrength}`);
    });

    it("should get character assets for prompt injection", async () => {
      const triggers = await customAssetService.getCharacterTriggers(characterId);
      const loraStack = await customAssetService.getCharacterLoraStack(characterId);

      expect(triggers).toContain("mira_otter");
      expect(loraStack.length).toBe(1);

      console.log(`  💉 Auto-inject triggers: ${triggers.join(", ")}`);
      console.log(`  📚 LoRA stack: ${loraStack.map((l) => l.name).join(", ")}`);
    });
  });

  // =========================================================================
  // 3.5.6 SCENE LIGHTING
  // =========================================================================

  describe("3.5.6: Set Scene Lighting", () => {
    it("should suggest lighting for scene", () => {
      const suggestion = lightingService.suggestLighting(
        "apartment at night, single lamp, tired lonely mood, intimate"
      );

      expect(suggestion).toBeDefined();
      expect(suggestion.timeOfDay).toBe("night");

      console.log(`  💡 AI suggested lighting:`);
      console.log(`     Time: ${suggestion.timeOfDay}`);
      console.log(`     Primary: ${suggestion.primarySource.type} (${suggestion.primarySource.direction})`);
      if (suggestion.weather) console.log(`     Weather: ${suggestion.weather}`);
    });

    it("should set storyboard lighting", async () => {
      const updated = await lightingService.setLighting(storyboardId, {
        primarySource: {
          type: "artificial",
          direction: "west",
          intensity: 0.3,
          color: "#FFE4B5",
        },
        ambientColor: "#1a1a2e",
        timeOfDay: "night",
      });

      expect(updated.lightingConfig).toBeDefined();

      console.log(`  🔦 Lighting applied to storyboard`);
    });

    it("should preview lighting prompt fragment", () => {
      const fragment = lightingService.generatePromptFragment({
        primarySource: {
          type: "artificial",
          direction: "west",
          intensity: 0.3,
          color: "#FFE4B5",
        },
        timeOfDay: "night",
      });

      expect(fragment).toContain("night");

      console.log(`  📝 Prompt fragment: "${fragment}"`);
    });

    it("should list all lighting options", () => {
      console.log(`  🔦 Available lighting options:`);
      console.log(`     Types: ${LIGHT_TYPES.join(", ")}`);
      console.log(`     Directions: ${LIGHT_DIRECTIONS.join(", ")}`);
      console.log(`     Times: ${TIMES_OF_DAY.join(", ")}`);
      console.log(`     Weather: ${WEATHER_CONDITIONS.join(", ")}`);

      expect(LIGHT_TYPES.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3.5.7 INTERACTION POSES
  // =========================================================================

  describe("3.5.7: Seed Interaction Poses", () => {
    it("should seed default poses", async () => {
      const seeded = await interactionPoseService.seedDefaults(DEFAULT_INTERACTION_POSES);

      console.log(`  🎭 Seeded ${seeded} interaction poses`);

      // List what we got
      const romantic = await interactionPoseService.list({ category: "romantic" });
      const intimate = await interactionPoseService.list({ category: "intimate" });
      const action = await interactionPoseService.list({ category: "action" });

      console.log(`     Romantic: ${romantic.map((p) => p.name).join(", ")}`);
      console.log(`     Intimate: ${intimate.map((p) => p.name).join(", ")}`);
      console.log(`     Action: ${action.map((p) => p.name).join(", ")}`);

      expect(romantic.length).toBeGreaterThan(0);
      expect(intimate.length).toBeGreaterThan(0);
    });

    it("should get cowgirl pose by name", async () => {
      const pose = await interactionPoseService.getByName("cowgirl");

      expect(pose).toBeDefined();
      expect(pose!.rating).toBe("explicit");
      expect(pose!.poseDefinitions.length).toBe(2);

      console.log(`  🐴 Cowgirl pose loaded:`);
      console.log(`     Prompt: "${pose!.promptFragment}"`);
      console.log(`     GLIGEN boxes: ${pose!.gligenBoxes?.length ?? 0}`);
    });

    it("should apply pose with character mapping", async () => {
      const pose = await interactionPoseService.getByName("missionary");
      expect(pose).toBeDefined();

      const mapping = new Map<string, "character_a" | "character_b">([
        ["char-top", "character_a"],
        ["char-bottom", "character_b"],
      ]);

      const result = interactionPoseService.applyPose(pose!, mapping);

      expect(result.promptFragment).toContain("missionary");
      expect(result.poseDescriptions.size).toBe(2);

      console.log(`  🎯 Applied missionary pose:`);
      console.log(`     Prompt: "${result.promptFragment}"`);
      console.log(`     Positions mapped: ${result.poseDescriptions.size}`);
    });

    it("should filter poses by rating", async () => {
      const safeOnly = await interactionPoseService.list({ maxRating: "safe" });
      const upToSuggestive = await interactionPoseService.list({ maxRating: "suggestive" });
      const all = await interactionPoseService.list({});

      console.log(`  🔞 Pose filtering by rating:`);
      console.log(`     Safe only: ${safeOnly.length} poses`);
      console.log(`     Up to suggestive: ${upToSuggestive.length} poses`);
      console.log(`     All (including explicit): ${all.length} poses`);

      expect(safeOnly.length).toBeLessThan(all.length);
    });
  });

  // =========================================================================
  // CREATE PANELS & MOCK GENERATIONS
  // =========================================================================

  describe("Create Panels with Mock Generations", () => {
    const panelData = [
      {
        position: 1,
        description: "Mira stumbles through apartment door, exhausted",
        prompt: "female otter, exhausted, coming home, apartment doorway",
      },
      {
        position: 2,
        description: "Mira pouring whiskey in kitchen",
        prompt: "female otter, pouring whiskey, kitchen, unbuttoned shirt",
      },
      {
        position: 3,
        description: "Sprawled on couch, getting comfortable",
        prompt: "female otter, sprawled on couch, tipsy, suggestive",
      },
      {
        position: 4,
        description: "Starting to touch herself",
        prompt: "female otter, masturbating, touching through panties, nsfw",
      },
      {
        position: 5,
        description: "Climax - squirting",
        prompt: "female otter, orgasm, squirting, ahegao, explicit",
      },
      {
        position: 6,
        description: "Passed out afterglow",
        prompt: "female otter, passed out, satisfied, messy, afterglow",
      },
    ];

    it("should create all 6 panels with mock generations", async () => {
      const db = getDb();

      for (const data of panelData) {
        // Create panel
        const panel = await panelService.create({
          storyboardId,
          position: data.position,
          description: data.description,
        });
        panelIds.push(panel.id);

        // Add character to panel
        await panelService.addCharacter(panel.id, characterId);

        // Create mock generations (4 variants per panel)
        for (let i = 0; i < 4; i++) {
          const now = new Date();
          const [gen] = await db
            .insert(generatedImages)
            .values({
              panelId: panel.id,
              localPath: `/mock/output/panel${data.position}_variant${i + 1}.png`,
              seed: 12345 + i + data.position * 10,
              prompt: data.prompt,
              negativePrompt: "bad quality, deformed",
              model: "ponyDiffusion_v6.safetensors",
              loras: [{ name: "mira_otter_v1.safetensors", strength: 0.85 }],
              steps: 28,
              cfg: 7,
              sampler: "euler_ancestral",
              scheduler: "normal",
              width: 768,
              height: 1024,
              isSelected: false,
              isFavorite: false,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          generationIds.push(gen.id);
        }

        console.log(`  🖼️  Panel ${data.position}: ${data.description} (4 variants)`);
      }

      expect(panelIds.length).toBe(6);
      expect(generationIds.length).toBe(24);
    });
  });

  // =========================================================================
  // 3.5.4 CURATION
  // =========================================================================

  describe("3.5.4: Curate Variants", () => {
    it("should compare variants for Panel 5 (climax)", async () => {
      const panelId = panelIds[4]; // Panel 5
      const result = await generatedImageService.getForComparison(panelId);

      expect(result.images.length).toBe(4);

      console.log(`  🔍 Comparing ${result.images.length} variants for climax panel`);
      console.log(`     Seeds: ${result.images.map((i) => i.seed).join(", ")}`);
    });

    it("should batch rate Panel 5 variants", async () => {
      // Get the 4 generations for panel 5 (index 4, so generations 16-19)
      const panel5Gens = generationIds.slice(16, 20);

      const result = await generatedImageService.batchRate([
        { imageId: panel5Gens[0], rating: 3 },
        { imageId: panel5Gens[1], rating: 5 },
        { imageId: panel5Gens[2], rating: 4 },
        { imageId: panel5Gens[3], rating: 5 },
      ]);

      expect(result.updated.length).toBe(4);
      expect(result.failed.length).toBe(0);

      console.log(`  ⭐ Batch rated ${result.updated.length} variants`);
      console.log(`     Ratings: 3, 5, 4, 5`);
    });

    it("should quick select highest rated", async () => {
      const panelId = panelIds[4];
      const selected = await generatedImageService.quickSelect(panelId, "highest_rating");

      expect(selected).toBeDefined();
      expect(selected!.rating).toBe(5);

      console.log(`  ✅ Quick selected: rating ${selected!.rating}, seed ${selected!.seed}`);
    });

    it("should get comparison stats", async () => {
      const panel5Gens = generationIds.slice(16, 20);
      const stats = await generatedImageService.getComparisonStats(panel5Gens);

      expect(stats).toBeDefined();

      console.log(`  📊 Stats for climax variants:`);
      console.log(`     Top rated: ${stats.topRated.length}`);
      console.log(`     Recommendations: ${stats.recommendations.length}`);
    });
  });

  // =========================================================================
  // 3.5.1 POSE & EXPRESSION LIBRARIES
  // =========================================================================

  describe("3.5.1: Save Poses & Expressions", () => {
    it("should save exhausted expression from Panel 1", async () => {
      const sourceGenId = generationIds[0]; // First gen from panel 1

      const expression = await poseLibraryService.saveExpression({
        characterId,
        sourceGenerationId: sourceGenId,
        name: "exhausted",
        description: "Dead tired after work, droopy eyelids",
        referencePath: "/test/expressions/exhausted.png",
        promptFragment: "exhausted, tired expression, droopy eyelids, heavy eyelids",
        intensity: 7,
      });

      expect(expression).toBeDefined();
      expect(expression.name).toBe("exhausted");

      console.log(`  😫 Saved expression: "${expression.name}"`);
    });

    it("should save orgasm expression from Panel 5", async () => {
      const sourceGenId = generationIds[17]; // Second rated 5 from panel 5

      const expression = await poseLibraryService.saveExpression({
        characterId,
        sourceGenerationId: sourceGenId,
        name: "orgasm_ahegao",
        description: "Full ahegao orgasm face",
        referencePath: "/test/expressions/orgasm_ahegao.png",
        promptFragment: "ahegao, rolling eyes, tongue out, orgasm face, blushing",
        intensity: 10,
      });

      expect(expression).toBeDefined();
      expect(expression.intensity).toBe(10);

      console.log(`  🤤 Saved expression: "${expression.name}" (intensity: ${expression.intensity})`);
    });

    it("should save climax pose from Panel 5", async () => {
      const sourceGenId = generationIds[17];

      const pose = await poseLibraryService.savePose({
        projectId,
        sourceGenerationId: sourceGenId,
        name: "climax_arched_back",
        category: "lying",
        skeletonPath: "/test/poses/climax_arched_back.png",
        tags: ["orgasm", "climax", "arched_back", "spread_legs", "solo", "nsfw"],
        description: "Back arched climax pose - solo squirt scene",
      });

      expect(pose).toBeDefined();
      expect(pose.category).toBe("lying");

      console.log(`  🎭 Saved pose: "${pose.name}" (category: ${pose.category})`);
      console.log(`     Tags: ${pose.tags.join(", ")}`);
    });

    it("should list expressions for Mira", async () => {
      const expressions = await poseLibraryService.listExpressions(characterId);

      expect(expressions.length).toBe(2);

      console.log(`  📋 Mira's expression library:`);
      expressions.forEach((e) => {
        console.log(`     - ${e.name} (intensity: ${e.intensity ?? "n/a"})`);
      });
    });
  });

  // =========================================================================
  // 3.5.5 PROMPT ARCHAEOLOGY
  // =========================================================================

  describe("3.5.5: Analyze What Worked", () => {
    it("should suggest params for new generation", async () => {
      const suggestion = await analyticsService.suggestParams({
        projectId,
        prompt: "female otter squirting orgasm",
      });

      expect(suggestion).toBeDefined();

      console.log(`  💡 Suggested params for "squirting orgasm":`);
      console.log(`     Model: ${suggestion.model ?? "default"}`);
      console.log(`     CFG: ${suggestion.cfg ?? "default"}`);
      console.log(`     Sampler: ${suggestion.sampler ?? "default"}`);
    });
  });

  // =========================================================================
  // 3.5.3 INTERPOLATION
  // =========================================================================

  describe("3.5.3: Interpolation Suggestion", () => {
    it("should suggest frame count for animation", () => {
      const suggestion = interpolationService.suggestCount({
        panelAPosition: 4, // Starting to touch
        panelBPosition: 5, // Climax
        framesPerSecond: 8,
        durationSeconds: 1.5,
      });

      expect(suggestion).toBeGreaterThan(0);

      console.log(`  🎬 Animation suggestion:`);
      console.log(`     Panel 4 → Panel 5 (touch to climax)`);
      console.log(`     FPS: 8, Duration: 1.5s`);
      console.log(`     Suggested frames: ${suggestion}`);
    });

    it("should suggest different counts for different durations", () => {
      const short = interpolationService.suggestCount({
        panelAPosition: 1,
        panelBPosition: 2,
        framesPerSecond: 12,
        durationSeconds: 0.5,
      });

      const long = interpolationService.suggestCount({
        panelAPosition: 1,
        panelBPosition: 2,
        framesPerSecond: 24,
        durationSeconds: 2,
      });

      console.log(`  🎥 Duration comparison:`);
      console.log(`     0.5s @ 12fps: ${short} frames`);
      console.log(`     2.0s @ 24fps: ${long} frames`);

      expect(long).toBeGreaterThan(short);
    });
  });

  // =========================================================================
  // 3.5.8 ASSET USAGE TRACKING
  // =========================================================================

  describe("3.5.8: Track Asset Usage", () => {
    it("should apply asset and track usage", async () => {
      const assets = await customAssetService.list({ projectId });
      const miraAsset = assets[0];

      const applied = await customAssetService.apply(miraAsset.id);

      expect(applied).toBeDefined();
      expect(applied!.triggerToInject).toBe("mira_otter");

      // Check usage incremented
      const updated = await customAssetService.getById(miraAsset.id);
      expect(updated!.usageCount).toBe(1);

      console.log(`  📈 Asset applied:`);
      console.log(`     Trigger: ${applied!.triggerToInject}`);
      console.log(`     Usage count: ${updated!.usageCount}`);
    });

    it("should apply with strength override", async () => {
      const assets = await customAssetService.list({ projectId });
      const miraAsset = assets[0];

      const applied = await customAssetService.apply(miraAsset.id, 0.5, 0.7);

      expect(applied!.loraConfig!.strengthModel).toBe(0.5);
      expect(applied!.loraConfig!.strengthClip).toBe(0.7);

      console.log(`  🎚️  Applied with override:`);
      console.log(`     Model strength: ${applied!.loraConfig!.strengthModel}`);
      console.log(`     CLIP strength: ${applied!.loraConfig!.strengthClip}`);
    });
  });

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================

  describe("Final Summary", () => {
    it("should summarize all created content", async () => {
      const db = getDb();

      // Count everything
      const projectCount = await db.select().from(projects);
      const characterCount = await db.select().from(characters);
      const storyboardCount = await db.select().from(storyboards);
      const panelCount = await db.select().from(panels);
      const generationCount = await db.select().from(generatedImages);
      const expressions = await poseLibraryService.listExpressions(characterId);
      const assets = await customAssetService.list({ projectId });
      const interactionPoses = await interactionPoseService.list({});

      console.log(`\n  📊 SCENARIO SUMMARY`);
      console.log(`  ${"=".repeat(50)}`);
      console.log(`  Projects:           ${projectCount.length}`);
      console.log(`  Characters:         ${characterCount.length}`);
      console.log(`  Storyboards:        ${storyboardCount.length}`);
      console.log(`  Panels:             ${panelCount.length}`);
      console.log(`  Generations:        ${generationCount.length}`);
      console.log(`  Custom Assets:      ${assets.length}`);
      console.log(`  Saved Expressions:  ${expressions.length}`);
      console.log(`  Interaction Poses:  ${interactionPoses.length}`);
      console.log(`  ${"=".repeat(50)}`);
      console.log(`\n  ✨ All Phase 3.5 features demonstrated!\n`);

      expect(panelCount.length).toBe(6);
      expect(generationCount.length).toBe(24);
    });
  });
});
