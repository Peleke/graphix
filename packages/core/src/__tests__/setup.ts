/**
 * Test Setup for @graphix/core
 *
 * Provides utilities for setting up isolated test environments.
 */

import {
  createDatabase,
  setDefaultDatabase,
  getDefaultDatabase,
  migrateDatabase,
  type DatabaseConnection,
} from "../db/index.js";

// Service reset imports
import { resetProjectService } from "../services/project.service.js";
import { resetCharacterService } from "../services/character.service.js";
import { resetStoryboardService } from "../services/storyboard.service.js";
import { resetPanelService } from "../services/panel.service.js";
import { resetCaptionService } from "../services/caption.service.js";
import { resetGeneratedImageService } from "../services/generated-image.service.js";
import { resetConsistencyService } from "../services/consistency.service.js";
import { resetStyleService } from "../services/style.service.js";
import { resetPoseLibraryService } from "../services/pose-library.service.js";
import { resetInpaintingService } from "../services/inpainting.service.js";
import { resetLightingService } from "../services/lighting.service.js";
import { resetPromptAnalyticsService } from "../services/prompt-analytics.service.js";
import { resetInterpolationService } from "../services/interpolation.service.js";
import { resetInteractionPoseService } from "../services/interaction-pose.service.js";
import { resetCustomAssetService } from "../services/custom-asset.service.js";
import { resetStoryScaffoldService } from "../services/story-scaffold.service.js";
import { resetBatchService } from "../services/batch.service.js";
import { resetNarrativeService } from "../services/narrative.service.js";
import { resetLLMService } from "../services/llm.service.js";

// Generation reset imports
import { resetComfyUIClient } from "../generation/comfyui-client.js";
import { resetPanelGenerator } from "../generation/panel-generator.js";
import { resetControlNetStack } from "../generation/controlnet-stack.js";
import { resetIPAdapter } from "../generation/ip-adapter.js";

// Composition reset imports
import { resetCompositionService } from "../composition/service.js";

// Mock exports
export {
  mockComfyUIServer,
  createMockComfyUIClient,
  type MockComfyUIServer,
} from "./__mocks__/comfyui-mock.js";

// Generation test helpers
import {
  mockComfyUIServer as mockServer,
  createMockComfyUIClient as createMock,
} from "./__mocks__/comfyui-mock.js";
import {
  setPanelGenerator,
  createPanelGenerator,
  type ComfyUIClient,
} from "../generation/index.js";

let testConnection: DatabaseConnection | null = null;
let mockComfyUIEnabled = false;

/**
 * Set up an in-memory test database with schema
 */
export async function setupTestDatabase(): Promise<DatabaseConnection> {
  const connection = createDatabase({ mode: "memory" });
  setDefaultDatabase(connection);
  testConnection = connection;

  // Run migrations - must await since executeMultiple is async
  await connection.client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      settings TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      profile TEXT NOT NULL,
      prompt_fragments TEXT NOT NULL,
      reference_images TEXT NOT NULL DEFAULT '[]',
      lora TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS storyboards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      lighting_config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS panels (
      id TEXT PRIMARY KEY,
      storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      description TEXT DEFAULT '',
      direction TEXT,
      character_ids TEXT NOT NULL DEFAULT '[]',
      selected_output_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS panel_captions (
      id TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      position TEXT NOT NULL,
      tail_direction TEXT,
      style TEXT,
      z_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
      local_path TEXT NOT NULL,
      cloud_url TEXT,
      thumbnail_path TEXT,
      seed INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      negative_prompt TEXT DEFAULT '',
      model TEXT NOT NULL,
      loras TEXT NOT NULL DEFAULT '[]',
      steps INTEGER NOT NULL,
      cfg REAL NOT NULL,
      sampler TEXT NOT NULL,
      scheduler TEXT DEFAULT 'normal',
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      variant_strategy TEXT,
      variant_index INTEGER,
      used_ip_adapter INTEGER DEFAULT 0,
      ip_adapter_images TEXT,
      used_controlnet INTEGER DEFAULT 0,
      controlnet_type TEXT,
      controlnet_image TEXT,
      is_selected INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      rating INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS page_layouts (
      id TEXT PRIMARY KEY,
      storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      layout_config TEXT NOT NULL,
      panel_placements TEXT NOT NULL,
      rendered_path TEXT,
      rendered_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pose_library (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      skeleton_path TEXT NOT NULL,
      source_generation_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
      pose_data TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expression_library (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      reference_path TEXT NOT NULL,
      source_generation_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
      expression_data TEXT,
      prompt_fragment TEXT NOT NULL,
      intensity INTEGER DEFAULT 5,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS interaction_poses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      character_count INTEGER NOT NULL DEFAULT 2,
      pose_definitions TEXT NOT NULL,
      reference_images TEXT NOT NULL DEFAULT '[]',
      gligen_boxes TEXT,
      prompt_fragment TEXT NOT NULL,
      negative_fragment TEXT DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      rating TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      trigger_word TEXT NOT NULL,
      trigger_aliases TEXT NOT NULL DEFAULT '[]',
      default_strength REAL NOT NULL DEFAULT 1.0,
      default_clip_strength REAL DEFAULT 1.0,
      trained_at INTEGER,
      base_model TEXT,
      training_steps INTEGER,
      source_images TEXT,
      metadata TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS premises (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      logline TEXT NOT NULL,
      genre TEXT,
      tone TEXT,
      themes TEXT NOT NULL DEFAULT '[]',
      character_ids TEXT NOT NULL DEFAULT '[]',
      setting TEXT,
      world_rules TEXT,
      generated_by TEXT,
      generation_prompt TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      premise_id TEXT NOT NULL REFERENCES premises(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      synopsis TEXT,
      target_length INTEGER,
      actual_length INTEGER,
      structure TEXT NOT NULL DEFAULT 'three-act',
      structure_notes TEXT,
      character_arcs TEXT,
      generated_by TEXT,
      generation_prompt TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS beats (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      act_number INTEGER,
      beat_type TEXT,
      visual_description TEXT NOT NULL,
      narrative_context TEXT,
      emotional_tone TEXT,
      character_ids TEXT NOT NULL DEFAULT '[]',
      character_actions TEXT,
      camera_angle TEXT,
      composition TEXT,
      dialogue TEXT,
      narration TEXT,
      sfx TEXT,
      panel_id TEXT REFERENCES panels(id) ON DELETE SET NULL,
      generated_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return connection;
}

/**
 * Get the current test database
 */
export function getTestDatabase() {
  if (!testConnection) {
    throw new Error("Test database not initialized. Call setupTestDatabase() first.");
  }
  return testConnection.db;
}

/**
 * Reset all singleton services
 */
export function resetAllServices(): void {
  // Core Services
  resetProjectService();
  resetCharacterService();
  resetStoryboardService();
  resetPanelService();
  resetCaptionService();
  resetGeneratedImageService();

  // Extended Services
  resetConsistencyService();
  resetStyleService();
  resetPoseLibraryService();
  resetInpaintingService();
  resetLightingService();
  resetPromptAnalyticsService();
  resetInterpolationService();
  resetInteractionPoseService();
  resetCustomAssetService();
  resetStoryScaffoldService();
  resetBatchService();
  resetNarrativeService();
  resetLLMService();

  // Generation
  resetComfyUIClient();
  resetPanelGenerator();
  resetControlNetStack();
  resetIPAdapter();

  // Composition
  resetCompositionService();
}

/**
 * Clean up test environment
 */
export function teardownTestDatabase(): void {
  resetAllServices();
  testConnection = null;
  mockComfyUIEnabled = false;
}

/**
 * Helper to create a test project
 */
export async function createTestProject(name = "Test Project") {
  const { getProjectService } = await import("../services/project.service.js");
  return getProjectService().create({ name });
}

/**
 * Helper to create a test character
 */
export async function createTestCharacter(projectId: string, name = "Test Character") {
  const { getCharacterService } = await import("../services/character.service.js");
  return getCharacterService().create({
    projectId,
    name,
    profile: { species: "fox" },
  });
}

/**
 * Helper to create a test storyboard
 */
export async function createTestStoryboard(projectId: string, name = "Test Storyboard") {
  const { getStoryboardService } = await import("../services/storyboard.service.js");
  return getStoryboardService().create({
    projectId,
    name,
  });
}

/**
 * Helper to create a test panel
 */
export async function createTestPanel(storyboardId: string, description = "Test panel") {
  const { getPanelService } = await import("../services/panel.service.js");
  return getPanelService().create({
    storyboardId,
    description,
  });
}

/**
 * Helper to set up a full test scenario
 */
export async function setupTestScenario() {
  const project = await createTestProject();
  const character = await createTestCharacter(project.id);
  const storyboard = await createTestStoryboard(project.id);
  const panel = await createTestPanel(storyboard.id);

  return { project, character, storyboard, panel };
}

/**
 * Helper to create a test premise
 */
export async function createTestPremise(projectId: string, logline = "Two friends go on an adventure") {
  const { getNarrativeService } = await import("../services/narrative.service.js");
  return getNarrativeService().createPremise({
    projectId,
    logline,
    genre: "comedy",
    tone: "lighthearted",
    themes: ["friendship", "adventure"],
    setting: "A sunny beach",
  });
}

/**
 * Helper to create a test story
 */
export async function createTestStory(premiseId: string, title = "The Great Adventure") {
  const { getNarrativeService } = await import("../services/narrative.service.js");
  return getNarrativeService().createStory({
    premiseId,
    title,
    synopsis: "Two friends discover something amazing",
    targetLength: 6,
    structure: "three-act",
  });
}

/**
 * Helper to create a test beat
 */
export async function createTestBeat(
  storyId: string,
  position: number,
  visualDescription = "A dramatic scene unfolds"
) {
  const { getNarrativeService } = await import("../services/narrative.service.js");
  return getNarrativeService().createBeat({
    storyId,
    position,
    visualDescription,
    actNumber: 1,
    beatType: "setup",
    emotionalTone: "cheerful",
    cameraAngle: "wide",
  });
}

/**
 * Helper to set up a full narrative test scenario
 */
export async function setupNarrativeTestScenario() {
  const project = await createTestProject();
  const character = await createTestCharacter(project.id);
  const premise = await createTestPremise(project.id);
  const story = await createTestStory(premise.id);
  const beat = await createTestBeat(story.id, 0);
  const storyboard = await createTestStoryboard(project.id);

  return { project, character, premise, story, beat, storyboard };
}

/**
 * Set up mock ComfyUI client for generation tests
 *
 * Call this in beforeEach() for tests that need image generation
 * without a real ComfyUI server.
 *
 * @example
 * ```ts
 * import { setupTestDatabase, teardownTestDatabase, setupMockComfyUI, mockComfyUIServer } from "@graphix/core/testing";
 *
 * beforeEach(async () => {
 *   await setupTestDatabase();
 *   setupMockComfyUI();
 *   mockComfyUIServer.reset(); // Reset state between tests
 * });
 *
 * it("generates an image", async () => {
 *   const generator = getPanelGenerator();
 *   const result = await generator.generate(panelId);
 *   expect(result.success).toBe(true);
 * });
 * ```
 */
export function setupMockComfyUI(): void {
  mockServer.reset();
  const mockClient = createMock() as unknown as ComfyUIClient;
  const generator = createPanelGenerator(mockClient);
  setPanelGenerator(generator);
  mockComfyUIEnabled = true;
}

/**
 * Check if mock ComfyUI is enabled
 */
export function isMockComfyUIEnabled(): boolean {
  return mockComfyUIEnabled;
}
