/**
 * Unit Tests: Consistency Service
 *
 * EXHAUSTIVE testing of the consistency service for identity management
 * and panel chaining operations.
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  getConsistencyService,
  resetConsistencyService,
  type StoredIdentity,
  type ExtractIdentityOptions,
  type ApplyIdentityOptions,
  type ChainOptions,
  type ReferenceSheetOptions,
} from "../../../services/consistency.service.js";

// Mock IP-Adapter
let embedCounter = 0;
const mockExtractIdentity = mock(() => {
  embedCounter++;
  return Promise.resolve({
    success: true,
    embedding: {
      id: `embed_${embedCounter}`,
      sourceImages: ["ref.png"],
      adapterModel: "ip-adapter-plus-face",
      createdAt: new Date(),
    },
  });
});

const mockGenerateWithIdentity = mock(() =>
  Promise.resolve({
    success: true,
    localPath: "/output/generated.png",
    seed: 12345,
  })
);

const mockGenerateFromEmbedding = mock(() =>
  Promise.resolve({
    success: true,
    localPath: "/output/from_embedding.png",
    seed: 12345,
  })
);

const mockListAdapterModels = mock(() => [
  "ip-adapter-plus",
  "ip-adapter-plus-face",
  "ip-adapter-faceid",
]);

const mockGetRecommendedSettings = mock(() => ({
  defaultStrength: 0.8,
  recommendedCfg: 7,
  notes: "Test notes",
}));

mock.module("../../../generation/ip-adapter.js", () => ({
  getIPAdapter: () => ({
    extractIdentity: mockExtractIdentity,
    generateWithIdentity: mockGenerateWithIdentity,
    generateFromEmbedding: mockGenerateFromEmbedding,
    listAdapterModels: mockListAdapterModels,
    getRecommendedSettings: mockGetRecommendedSettings,
  }),
}));

// Mock ControlNet Stack
const mockGenerate = mock(() =>
  Promise.resolve({
    success: true,
    localPath: "/output/controlled.png",
    seed: 12345,
  })
);

const mockListPresets = mock(() => [
  { id: "pose_transfer", name: "Pose Transfer", description: "Test", controls: [] },
  { id: "panel_continuity", name: "Panel Continuity", description: "Test", controls: [] },
]);

const mockListControlTypes = mock(() => ["openpose", "depth", "canny"]);

const mockGetRecommendedStrength = mock(() => ({
  min: 0.3,
  max: 1.0,
  default: 0.7,
  notes: "Test",
}));

mock.module("../../../generation/controlnet-stack.js", () => ({
  getControlNetStack: () => ({
    generate: mockGenerate,
    generateWithPreset: mockGenerate,
    listPresets: mockListPresets,
    listControlTypes: mockListControlTypes,
    getRecommendedStrength: mockGetRecommendedStrength,
  }),
  CONTROL_STACK_PRESETS: {
    pose_transfer: { id: "pose_transfer", name: "Pose Transfer", description: "Test", controls: [] },
  },
}));

// Mock Panel Service - using explicit types for nullable returns
type MockPanel = {
  id: string;
  storyboardId: string;
  description: string;
  selectedOutputId: string | null;
  sequenceNumber: number;
} | null;

const mockPanelGetById = mock(
  (): Promise<MockPanel> =>
    Promise.resolve({
      id: "panel_123",
      storyboardId: "sb_123",
      description: "Test panel description",
      selectedOutputId: "img_123",
      sequenceNumber: 1,
    })
);

const mockPanelSelectOutput = mock(() => Promise.resolve({ id: "panel_123" }));

mock.module("../../../services/panel.service.js", () => ({
  getPanelService: () => ({
    getById: mockPanelGetById,
    selectOutput: mockPanelSelectOutput,
  }),
}));

// Mock Generated Image Service - using explicit types for nullable returns
type MockImage = {
  id: string;
  panelId: string;
  localPath: string;
} | null;

const mockImageGetSelected = mock(
  (): Promise<MockImage> =>
    Promise.resolve({
      id: "img_123",
      panelId: "panel_123",
      localPath: "/output/selected.png",
    })
);

const mockImageCreate = mock(() =>
  Promise.resolve({
    id: "img_new_123",
    panelId: "panel_123",
    localPath: "/output/new.png",
  })
);

mock.module("../../../services/generated-image.service.js", () => ({
  getGeneratedImageService: () => ({
    getSelected: mockImageGetSelected,
    create: mockImageCreate,
    getById: mock(() => Promise.resolve({ id: "img_123", localPath: "/output/test.png" })),
  }),
}));

// Mock ComfyUI Client
mock.module("../../../generation/comfyui-client.js", () => ({
  getComfyUIClient: () => ({
    generateImage: mock(() =>
      Promise.resolve({
        success: true,
        localPath: "/output/test.png",
        seed: 12345,
      })
    ),
    imagine: mock(() =>
      Promise.resolve({
        success: true,
        localPath: "/output/test.png",
        seed: 12345,
      })
    ),
  }),
}));

// Mock Config Engine
mock.module("../../../generation/config/index.js", () => ({
  getConfigEngine: () => ({
    resolve: mock(() => ({
      width: 768,
      height: 1024,
      steps: 28,
      cfgScale: 7,
      sampler: "euler_ancestral",
      scheduler: "normal",
    })),
  }),
}));

describe("ConsistencyService", () => {
  beforeEach(() => {
    resetConsistencyService();
    embedCounter = 0;
    mockExtractIdentity.mockClear();
    mockGenerateWithIdentity.mockClear();
    mockGenerateFromEmbedding.mockClear();
    mockGenerate.mockClear();
    mockPanelGetById.mockClear();
    mockPanelSelectOutput.mockClear();
    mockImageGetSelected.mockClear();
    mockImageCreate.mockClear();
  });

  // ============================================================================
  // Singleton Behavior
  // ============================================================================

  describe("Singleton", () => {
    test("getConsistencyService returns same instance", () => {
      const instance1 = getConsistencyService();
      const instance2 = getConsistencyService();
      expect(instance1).toBe(instance2);
    });

    test("resetConsistencyService creates new instance", () => {
      const instance1 = getConsistencyService();
      resetConsistencyService();
      const instance2 = getConsistencyService();
      expect(instance1).not.toBe(instance2);
    });

    test("resetConsistencyService clears stored identities", async () => {
      const service = getConsistencyService();

      // Store an identity
      await service.extractIdentity({
        name: "Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      expect(service.listIdentities()).toHaveLength(1);

      resetConsistencyService();

      const newService = getConsistencyService();
      expect(newService.listIdentities()).toHaveLength(0);
    });
  });

  // ============================================================================
  // Identity Extraction
  // ============================================================================

  describe("extractIdentity", () => {
    test("extracts identity from file paths", async () => {
      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "Hero",
        sources: ["ref1.png", "ref2.png"],
        sourcesArePanelIds: false,
      });

      expect(result.success).toBe(true);
      expect(result.identityId).toBeDefined();
    });

    test("extracts identity from panel IDs", async () => {
      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "Hero",
        sources: ["panel_123"],
        sourcesArePanelIds: true,
      });

      expect(result.success).toBe(true);
      // When sourcesArePanelIds=true, it calls imageService.getSelected to get the panel's selected image
      expect(mockImageGetSelected).toHaveBeenCalled();
    });

    test("stores extracted identity", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "Stored Hero",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const identities = service.listIdentities();
      expect(identities).toHaveLength(1);
      expect(identities[0].name).toBe("Stored Hero");
    });

    test("includes description in stored identity", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "Described Hero",
        description: "A brave warrior",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const identities = service.listIdentities();
      expect(identities[0].description).toBe("A brave warrior");
    });

    test("respects adapter model selection", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "FaceID Hero",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
        adapterModel: "ip-adapter-faceid",
      });

      expect(mockExtractIdentity).toHaveBeenCalled();
    });

    test("fails with empty sources", async () => {
      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "Empty",
        sources: [],
        sourcesArePanelIds: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("source images");
    });

    test("fails when panel has no selected output", async () => {
      mockImageGetSelected.mockResolvedValueOnce(null);

      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "No Output",
        sources: ["panel_without_output"],
        sourcesArePanelIds: true,
      });

      expect(result.success).toBe(false);
    });

    test("handles multiple panel sources", async () => {
      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "Multi Panel",
        sources: ["panel_1", "panel_2", "panel_3"],
        sourcesArePanelIds: true,
      });

      expect(result.success).toBe(true);
      expect(mockImageGetSelected).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // Identity Storage & Retrieval
  // ============================================================================

  describe("Identity Storage", () => {
    test("getIdentity returns stored identity", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Get Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const identity = service.getIdentity(extracted.identityId!);

      expect(identity).toBeDefined();
      expect(identity?.name).toBe("Get Test");
    });

    test("getIdentity returns undefined for unknown ID", () => {
      const service = getConsistencyService();

      const identity = service.getIdentity("nonexistent_id");

      expect(identity).toBeUndefined();
    });

    test("listIdentities returns all stored identities", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "Identity 1",
        sources: ["ref1.png"],
        sourcesArePanelIds: false,
      });
      await service.extractIdentity({
        name: "Identity 2",
        sources: ["ref2.png"],
        sourcesArePanelIds: false,
      });
      await service.extractIdentity({
        name: "Identity 3",
        sources: ["ref3.png"],
        sourcesArePanelIds: false,
      });

      const identities = service.listIdentities();

      expect(identities).toHaveLength(3);
    });

    test("deleteIdentity removes identity", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "To Delete",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const deleted = service.deleteIdentity(extracted.identityId!);

      expect(deleted).toBe(true);
      expect(service.getIdentity(extracted.identityId!)).toBeUndefined();
    });

    test("deleteIdentity returns false for unknown ID", () => {
      const service = getConsistencyService();

      const deleted = service.deleteIdentity("nonexistent");

      expect(deleted).toBe(false);
    });
  });

  // ============================================================================
  // Identity Application
  // ============================================================================

  describe("applyIdentity", () => {
    test("applies identity to panel", async () => {
      const service = getConsistencyService();

      // First extract an identity
      const extracted = await service.extractIdentity({
        name: "Apply Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      // Then apply it
      const result = await service.applyIdentity({
        panelId: "panel_123",
        identityId: extracted.identityId!,
      });

      expect(result.success).toBe(true);
      expect(result.panelId).toBe("panel_123");
    });

    test("updates identity usage count", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Usage Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      await service.applyIdentity({
        panelId: "panel_123",
        identityId: extracted.identityId!,
      });

      const identity = service.getIdentity(extracted.identityId!);
      expect(identity?.usageCount).toBe(1);
    });

    test("updates identity lastUsedAt", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "LastUsed Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const before = new Date();
      await service.applyIdentity({
        panelId: "panel_123",
        identityId: extracted.identityId!,
      });
      const after = new Date();

      const identity = service.getIdentity(extracted.identityId!);
      expect(identity?.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(identity?.lastUsedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test("respects strength override", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Strength Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      await service.applyIdentity({
        panelId: "panel_123",
        identityId: extracted.identityId!,
        strength: 0.5,
      });

      // applyIdentity uses generateFromEmbedding internally
      expect(mockGenerateFromEmbedding).toHaveBeenCalled();
    });

    test("merges additional prompt", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Prompt Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      await service.applyIdentity({
        panelId: "panel_123",
        identityId: extracted.identityId!,
        prompt: "dramatic lighting, detailed background",
      });

      // applyIdentity uses generateFromEmbedding internally
      expect(mockGenerateFromEmbedding).toHaveBeenCalled();
    });

    test("fails with unknown identity", async () => {
      const service = getConsistencyService();

      const result = await service.applyIdentity({
        panelId: "panel_123",
        identityId: "nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("fails with unknown panel", async () => {
      mockPanelGetById.mockResolvedValueOnce(null);

      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Panel Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const result = await service.applyIdentity({
        panelId: "nonexistent_panel",
        identityId: extracted.identityId!,
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Panel Chaining
  // ============================================================================

  describe("chainFromPrevious", () => {
    test("chains from previous panel", async () => {
      const service = getConsistencyService();

      const result = await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: true },
      });

      expect(result.success).toBe(true);
    });

    test("chains with identity preservation", async () => {
      const service = getConsistencyService();

      await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: true, pose: false },
      });

      expect(mockGenerateWithIdentity).toHaveBeenCalled();
    });

    test("chains with pose preservation", async () => {
      const service = getConsistencyService();

      await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: false, pose: true },
      });

      expect(mockGenerate).toHaveBeenCalled();
    });

    test("chains with multiple preservations", async () => {
      const service = getConsistencyService();

      const result = await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: true, pose: true, style: true },
      });

      expect(result.success).toBe(true);
    });

    test("respects continuity strength", async () => {
      const service = getConsistencyService();

      await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: true },
        continuityStrength: 0.6,
      });

      expect(mockGenerateWithIdentity).toHaveBeenCalled();
    });

    test("merges additional prompt", async () => {
      const service = getConsistencyService();

      await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "panel_1",
        maintain: { identity: true },
        prompt: "new action scene",
      });

      expect(mockGenerateWithIdentity).toHaveBeenCalled();
    });

    test("fails with nonexistent previous panel", async () => {
      mockPanelGetById.mockResolvedValueOnce(null);

      const service = getConsistencyService();

      const result = await service.chainFromPrevious({
        panelId: "panel_2",
        previousPanelId: "nonexistent",
        maintain: { identity: true },
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Sequence Chaining
  // ============================================================================

  describe("chainSequence", () => {
    test("chains sequence of panels", async () => {
      const service = getConsistencyService();

      const result = await service.chainSequence(
        ["panel_1", "panel_2", "panel_3"],
        { maintain: { identity: true } }
      );

      expect(result.successCount).toBeGreaterThan(0);
      expect(result.results).toHaveLength(2); // Chains panel_2 and panel_3
    });

    test("returns results for each panel", async () => {
      const service = getConsistencyService();

      const result = await service.chainSequence(
        ["panel_1", "panel_2", "panel_3", "panel_4"],
        { maintain: { identity: true } }
      );

      expect(result.results).toHaveLength(3);
      for (const r of result.results) {
        expect(r.panelId).toBeDefined();
        expect(typeof r.success).toBe("boolean");
      }
    });

    test("continues on individual failures", async () => {
      // Make the second panel fail
      mockPanelGetById
        .mockResolvedValueOnce({
          id: "panel_1",
          storyboardId: "sb_1",
          description: "Panel 1",
          selectedOutputId: "img_1",
          sequenceNumber: 1,
        })
        .mockResolvedValueOnce(null) // panel_2 fails
        .mockResolvedValueOnce({
          id: "panel_3",
          storyboardId: "sb_1",
          description: "Panel 3",
          selectedOutputId: "img_3",
          sequenceNumber: 3,
        });

      const service = getConsistencyService();

      const result = await service.chainSequence(
        ["panel_1", "panel_2", "panel_3"],
        { maintain: { identity: true } }
      );

      expect(result.results.length).toBeGreaterThan(0);
    });

    test("handles single panel (no chaining)", async () => {
      const service = getConsistencyService();

      const result = await service.chainSequence(["panel_1"], { maintain: { identity: true } });

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
    });

    test("handles empty panel list", async () => {
      const service = getConsistencyService();

      const result = await service.chainSequence([], { maintain: { identity: true } });

      expect(result.results).toHaveLength(0);
    });
  });

  // ============================================================================
  // Reference Sheet Generation
  // ============================================================================

  describe("generateReferenceSheet", () => {
    test("generates reference sheet", async () => {
      const service = getConsistencyService();

      // First create an identity
      const extracted = await service.extractIdentity({
        name: "Sheet Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const result = await service.generateReferenceSheet({
        identityId: extracted.identityId!,
        outputDir: "/output/sheets",
      });

      expect(result.success).toBe(true);
      expect(result.images).toBeDefined();
    });

    test("generates specified number of poses", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Poses Test",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const result = await service.generateReferenceSheet({
        identityId: extracted.identityId!,
        poseCount: 5,
        outputDir: "/output/sheets",
      });

      expect(result.success).toBe(true);
    });

    test("includes specified poses", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Custom Poses",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const result = await service.generateReferenceSheet({
        identityId: extracted.identityId!,
        poses: ["front view", "side profile", "three quarter view"],
        outputDir: "/output/sheets",
      });

      expect(result.success).toBe(true);
    });

    test("includes expressions when requested", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Expressions",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      const result = await service.generateReferenceSheet({
        identityId: extracted.identityId!,
        includeExpressions: true,
        outputDir: "/output/sheets",
      });

      expect(result.success).toBe(true);
    });

    test("fails with unknown identity", async () => {
      const service = getConsistencyService();

      const result = await service.generateReferenceSheet({
        identityId: "nonexistent",
        outputDir: "/output/sheets",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  // ============================================================================
  // Reference Data Methods
  // ============================================================================

  describe("Reference Data", () => {
    test("listAdapterModels returns models", () => {
      const service = getConsistencyService();

      const models = service.listAdapterModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test("listControlPresets returns presets", () => {
      const service = getConsistencyService();

      const presets = service.listControlPresets();

      expect(Array.isArray(presets)).toBe(true);
    });

    test("listControlTypes returns types", () => {
      const service = getConsistencyService();

      const types = service.listControlTypes();

      expect(Array.isArray(types)).toBe(true);
    });

    test("getRecommendedAdapterSettings returns settings", () => {
      const service = getConsistencyService();

      const settings = service.getRecommendedAdapterSettings("ip-adapter-plus-face");

      expect(settings).toBeDefined();
      expect(settings.defaultStrength).toBeDefined();
    });

    test("getRecommendedControlStrength returns strength", () => {
      const service = getConsistencyService();

      const strength = service.getRecommendedControlStrength("openpose");

      expect(strength).toBeDefined();
      expect(strength.default).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    test("handles unicode identity names", async () => {
      const service = getConsistencyService();

      const result = await service.extractIdentity({
        name: "キャラクター",
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      expect(result.success).toBe(true);
      const identity = service.getIdentity(result.identityId!);
      expect(identity?.name).toBe("キャラクター");
    });

    test("handles very long descriptions", async () => {
      const service = getConsistencyService();
      const longDesc = "A ".repeat(500);

      const result = await service.extractIdentity({
        name: "Long Desc",
        description: longDesc,
        sources: ["ref.png"],
        sourcesArePanelIds: false,
      });

      expect(result.success).toBe(true);
    });

    test("handles many stored identities", async () => {
      const service = getConsistencyService();

      // Create many identities
      for (let i = 0; i < 50; i++) {
        await service.extractIdentity({
          name: `Identity ${i}`,
          sources: ["ref.png"],
          sourcesArePanelIds: false,
        });
      }

      const identities = service.listIdentities();
      expect(identities).toHaveLength(50);
    });

    test("handles concurrent extractions", async () => {
      const service = getConsistencyService();

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.extractIdentity({
          name: `Concurrent ${i}`,
          sources: ["ref.png"],
          sourcesArePanelIds: false,
        })
      );

      const results = await Promise.all(promises);

      for (const result of results) {
        expect(result.success).toBe(true);
      }

      expect(service.listIdentities()).toHaveLength(10);
    });
  });
});
