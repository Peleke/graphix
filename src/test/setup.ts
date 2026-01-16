/**
 * EXHAUSTIVE Test Infrastructure Setup
 *
 * This file configures the test environment for ALL test types:
 * - Unit tests
 * - Integration tests
 * - E2E tests
 * - Contract tests
 * - Snapshot tests
 * - Property-based tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";

// Test database (in-memory SQLite for speed)
let testDb: ReturnType<typeof drizzle>;
let testClient: ReturnType<typeof createClient>;

/**
 * Initialize test database before all tests
 */
export async function setupTestDb() {
  testClient = createClient({
    url: ":memory:",
  });

  testDb = drizzle(testClient, { schema });

  // Run migrations (schema push)
  // TODO: Apply schema when schema.ts is created

  return testDb;
}

/**
 * Clean up test database after all tests
 */
export async function teardownTestDb() {
  if (testClient) {
    testClient.close();
  }
}

/**
 * Reset database state between tests
 */
export async function resetTestDb() {
  // Truncate all tables in reverse dependency order
  // TODO: Implement when schema exists
}

/**
 * Get test database instance
 */
export function getTestDb() {
  if (!testDb) {
    throw new Error("Test database not initialized. Call setupTestDb() first.");
  }
  return testDb;
}

// Global test hooks
beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

/**
 * Test data factories
 */
export const factories = {
  project: (overrides = {}) => ({
    name: `Test Project ${Date.now()}`,
    description: "A test project",
    settings: {
      defaultModel: "yiffInHell_yihXXXTended.safetensors",
      defaultLoras: [],
      defaultNegative: "bad quality, blurry",
      resolution: { width: 768, height: 1024 },
    },
    ...overrides,
  }),

  character: (projectId: string, overrides: Record<string, unknown> = {}) => ({
    projectId,
    name: `Test Character ${Date.now()}`,
    profile: {
      species: "anthro wolf",
      bodyType: "athletic",
      features: ["gray fur", "amber eyes"],
      clothing: ["casual"],
      ageDescriptors: ["adult", "mature"],
      distinguishing: ["scar on left ear"],
    },
    promptFragments: {
      positive: "anthro wolf, gray fur, amber eyes, athletic build",
      negative: "human, realistic",
      triggers: [] as string[],
    },
    ...overrides,
  }),

  storyboard: (projectId: string, overrides = {}) => ({
    projectId,
    name: `Test Storyboard ${Date.now()}`,
    description: "A test storyboard",
    ...overrides,
  }),

  panel: (storyboardId: string, position: number, overrides: Record<string, unknown> = {}) => ({
    storyboardId,
    position,
    description: `Panel ${position} description`,
    characterIds: [] as string[],
    direction: {
      cameraAngle: "eye level",
      mood: "neutral",
      lighting: "natural",
    },
    ...overrides,
  }),

  generatedImage: (panelId: string, overrides = {}) => ({
    panelId,
    path: `/output/test_${Date.now()}.png`,
    seed: Math.floor(Math.random() * 1000000),
    prompt: "test prompt",
    negativePrompt: "bad quality",
    model: "test_model.safetensors",
    loras: [],
    settings: {
      steps: 28,
      cfg: 7,
      sampler: "euler_ancestral",
      scheduler: "normal",
    },
    metadata: {
      width: 768,
      height: 1024,
      steps: 28,
      cfg: 7,
      sampler: "euler_ancestral",
    },
    ...overrides,
  }),
};

/**
 * Mock ComfyUI client for testing
 */
export function createMockComfyUIClient() {
  return {
    imagine: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_${Date.now()}.png`,
      seed: params.seed || Math.floor(Math.random() * 1000000),
      prompt: params.prompt,
      model: params.model,
      metadata: {
        width: params.width || 768,
        height: params.height || 1024,
        steps: params.steps || 28,
        cfg: params.cfg_scale || 7,
        sampler: params.sampler || "euler_ancestral",
      },
    }),

    generateImage: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_${Date.now()}.png`,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),

    img2img: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_i2i_${Date.now()}.png`,
    }),

    upscale: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_upscale_${Date.now()}.png`,
    }),

    generateWithControlNet: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_cn_${Date.now()}.png`,
    }),

    generateWithIPAdapter: async (params: any) => ({
      success: true,
      imagePath: `/output/mock_ip_${Date.now()}.png`,
    }),

    listModels: async () => [
      "yiffInHell_yihXXXTended.safetensors",
      "novaFurryXL_ilV130.safetensors",
    ],

    listLoras: async () => [
      "Eleptors_Anthro_Furry_Lora_Illustrious_V2.safetensors",
      "colorful_line_art_illustriousXL.safetensors",
    ],
  };
}

/**
 * Assert helpers for common test patterns
 */
export const assertHelpers = {
  isValidId: (id: string) => {
    if (!id || typeof id !== "string" || id.length < 10) {
      throw new Error(`Invalid ID: ${id}`);
    }
  },

  hasTimestamps: (obj: any) => {
    if (!obj.createdAt || !obj.updatedAt) {
      throw new Error("Object missing timestamps");
    }
  },

  matchesSchema: (obj: any, schema: Record<string, string>) => {
    for (const [key, type] of Object.entries(schema)) {
      if (typeof obj[key] !== type) {
        throw new Error(
          `Schema mismatch: ${key} should be ${type}, got ${typeof obj[key]}`
        );
      }
    }
  },
};

/**
 * Snapshot testing helpers
 */
export const snapshotHelpers = {
  /**
   * Normalize dynamic values for snapshot comparison
   */
  normalize: (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(snapshotHelpers.normalize);
    }
    if (obj && typeof obj === "object") {
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === "id" || key.endsWith("Id")) {
          normalized[key] = "[ID]";
        } else if (key === "createdAt" || key === "updatedAt") {
          normalized[key] = "[TIMESTAMP]";
        } else if (key === "seed") {
          normalized[key] = "[SEED]";
        } else if (key === "path" && typeof value === "string") {
          normalized[key] = value.replace(/\d+/g, "[NUM]");
        } else {
          normalized[key] = snapshotHelpers.normalize(value);
        }
      }
      return normalized;
    }
    return obj;
  },
};
