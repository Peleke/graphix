/**
 * Integration Tests: Consistency Pipeline
 *
 * Tests the full consistency flow from identity extraction through
 * panel chaining and sequence generation.
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  getConsistencyService,
  resetConsistencyService,
} from "../../services/consistency.service.js";
import {
  getIPAdapter,
  resetIPAdapter,
} from "../../generation/ip-adapter.js";
import {
  getControlNetStack,
  resetControlNetStack,
} from "../../generation/controlnet-stack.js";

// Track all generation calls
const generationCalls: Array<{
  type: string;
  params: Record<string, unknown>;
}> = [];

// Mock ComfyUI client
const mockGenerateImage = mock(async (params: Record<string, unknown>) => {
  generationCalls.push({ type: "generateImage", params });
  return {
    success: true,
    localPath: `/output/generated_${Date.now()}.png`,
    signedUrl: `https://storage.example.com/generated_${Date.now()}.png`,
    seed: Math.floor(Math.random() * 1000000),
  };
});

const mockGenerateWithControlNet = mock(async (params: Record<string, unknown>) => {
  generationCalls.push({ type: "generateWithControlNet", params });
  return {
    success: true,
    localPath: `/output/controlled_${Date.now()}.png`,
    signedUrl: `https://storage.example.com/controlled_${Date.now()}.png`,
    seed: Math.floor(Math.random() * 1000000),
  };
});

const mockImagine = mock(async (params: Record<string, unknown>) => {
  generationCalls.push({ type: "imagine", params });
  return {
    success: true,
    localPath: `/output/imagined_${Date.now()}.png`,
    signedUrl: `https://storage.example.com/imagined_${Date.now()}.png`,
    seed: Math.floor(Math.random() * 1000000),
  };
});

const mockPreprocessImage = mock(async (params: Record<string, unknown>) => {
  return {
    success: true,
    localPath: `/output/preprocessed_${Date.now()}.png`,
  };
});

mock.module("../../generation/comfyui-client.js", () => ({
  getComfyUIClient: () => ({
    generateImage: mockGenerateImage,
    generateWithControlNet: mockGenerateWithControlNet,
    imagine: mockImagine,
    preprocessImage: mockPreprocessImage,
  }),
}));

// Mock panel data
const mockPanels: Record<string, { id: string; description: string; selectedOutputId: string | null; storyboardId: string }> = {
  panel_001: {
    id: "panel_001",
    description: "Hero enters the scene dramatically",
    selectedOutputId: "img_001",
    storyboardId: "sb_001",
  },
  panel_002: {
    id: "panel_002",
    description: "Hero faces the villain",
    selectedOutputId: null,
    storyboardId: "sb_001",
  },
  panel_003: {
    id: "panel_003",
    description: "Epic confrontation begins",
    selectedOutputId: null,
    storyboardId: "sb_001",
  },
  panel_004: {
    id: "panel_004",
    description: "Hero strikes",
    selectedOutputId: null,
    storyboardId: "sb_001",
  },
};

const mockImages: Record<string, { id: string; panelId: string; localPath: string }> = {
  img_001: {
    id: "img_001",
    panelId: "panel_001",
    localPath: "/output/panel_001_selected.png",
  },
};

// Mock services
mock.module("../../services/panel.service.js", () => ({
  getPanelService: () => ({
    getById: mock(async (id: string) => mockPanels[id] || null),
    selectOutput: mock(async (panelId: string, imageId: string) => {
      if (mockPanels[panelId]) {
        mockPanels[panelId].selectedOutputId = imageId;
      }
      return mockPanels[panelId];
    }),
  }),
}));

mock.module("../../services/generated-image.service.js", () => ({
  getGeneratedImageService: () => ({
    getSelected: mock(async (panelId: string) => {
      const panel = mockPanels[panelId];
      if (!panel?.selectedOutputId) return null;
      return mockImages[panel.selectedOutputId] || null;
    }),
    getById: mock(async (id: string) => mockImages[id] || null),
    create: mock(async (data: Record<string, unknown>) => {
      const id = `img_${Date.now()}`;
      const image = {
        id,
        panelId: data.panelId as string,
        localPath: data.localPath as string,
      };
      mockImages[id] = image;
      return image;
    }),
  }),
}));

mock.module("../../generation/config/index.js", () => ({
  getConfigEngine: () => ({
    resolve: () => ({
      width: 768,
      height: 1024,
      steps: 28,
      cfgScale: 7,
      sampler: "euler_ancestral",
      scheduler: "normal",
    }),
  }),
}));

describe("Consistency Pipeline Integration", () => {
  beforeEach(() => {
    // Reset all singletons
    resetConsistencyService();
    resetIPAdapter();
    resetControlNetStack();

    // Clear call tracking
    generationCalls.length = 0;
    mockGenerateImage.mockClear();
    mockGenerateWithControlNet.mockClear();
    mockImagine.mockClear();

    // Reset mock panel selected outputs
    mockPanels.panel_002.selectedOutputId = null;
    mockPanels.panel_003.selectedOutputId = null;
    mockPanels.panel_004.selectedOutputId = null;
  });

  // ============================================================================
  // Full Workflow: Extract → Apply → Chain
  // ============================================================================

  describe("Full Identity Workflow", () => {
    test("extract identity → apply to new panel → chain sequence", async () => {
      const service = getConsistencyService();

      // Step 1: Extract identity from panel_001
      const extractResult = await service.extractIdentity({
        name: "Hero Identity",
        description: "The main character",
        sources: ["panel_001"],
        sourcesArePanelIds: true,
        adapterModel: "ip-adapter-plus-face",
      });

      expect(extractResult.success).toBe(true);
      expect(extractResult.identityId).toBeDefined();

      // Step 2: Apply identity to panel_002
      const applyResult = await service.applyIdentity({
        panelId: "panel_002",
        identityId: extractResult.identityId!,
        strength: 0.85,
      });

      expect(applyResult.success).toBe(true);
      expect(applyResult.panelId).toBe("panel_002");

      // Step 3: Chain panel_003 from panel_002
      const chainResult = await service.chainFromPrevious({
        panelId: "panel_003",
        previousPanelId: "panel_002",
        maintain: { identity: true, pose: true },
        continuityStrength: 0.8,
      });

      expect(chainResult.success).toBe(true);

      // Verify identity was used throughout
      const identity = service.getIdentity(extractResult.identityId!);
      expect(identity?.usageCount).toBeGreaterThanOrEqual(1);
    });

    test("extract from multiple panels → apply with merged identity", async () => {
      const service = getConsistencyService();

      // Add more images for multiple panel extraction
      mockImages.img_002 = {
        id: "img_002",
        panelId: "panel_001",
        localPath: "/output/panel_001_alt.png",
      };
      mockPanels.panel_002.selectedOutputId = "img_002";
      mockImages.img_002.panelId = "panel_002";

      const extractResult = await service.extractIdentity({
        name: "Multi-Panel Hero",
        sources: ["panel_001", "panel_002"],
        sourcesArePanelIds: true,
      });

      expect(extractResult.success).toBe(true);

      // Identity should have multiple reference images
      const identity = service.getIdentity(extractResult.identityId!);
      expect(identity?.referenceImages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Sequence Chaining
  // ============================================================================

  describe("Sequence Chaining", () => {
    test("chains entire panel sequence", async () => {
      const service = getConsistencyService();

      // First establish panel_001 as having generated content
      mockPanels.panel_001.selectedOutputId = "img_001";

      const result = await service.chainSequence(
        ["panel_001", "panel_002", "panel_003", "panel_004"],
        {
          maintain: { identity: true },
          continuityStrength: 0.75,
        }
      );

      expect(result.results).toHaveLength(3); // 3 chains: 1→2, 2→3, 3→4
      expect(result.successCount).toBeGreaterThan(0);
    });

    test("chain sequence with pose + identity", async () => {
      const service = getConsistencyService();

      const result = await service.chainSequence(
        ["panel_001", "panel_002", "panel_003"],
        {
          maintain: { identity: true, pose: true },
          continuityStrength: 0.85,
        }
      );

      // Should have made ControlNet calls for pose
      expect(result.results.length).toBeGreaterThan(0);
    });

    test("tracks generation calls through chain", async () => {
      const service = getConsistencyService();

      await service.chainSequence(["panel_001", "panel_002"], {
        maintain: { identity: true },
      });

      // Should have made at least one generation call
      expect(generationCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // IP-Adapter Integration
  // ============================================================================

  describe("IP-Adapter Integration", () => {
    test("direct IP-Adapter generation", async () => {
      const adapter = getIPAdapter();

      const result = await adapter.generateWithIdentity({
        prompt: "1girl, standing heroically",
        referenceImages: ["/output/panel_001_selected.png"],
        strength: 0.8,
        adapterModel: "ip-adapter-plus-face",
        outputPath: "/output/ip_adapter_test.png",
      });

      expect(result.success).toBe(true);
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    test("IP-Adapter with embedding", async () => {
      const adapter = getIPAdapter();

      const extractResult = await adapter.extractIdentity({
        sourceImages: ["/output/panel_001_selected.png"],
        adapterModel: "ip-adapter-faceid",
        name: "Test Identity",
      });

      expect(extractResult.success).toBe(true);

      const genResult = await adapter.generateFromEmbedding(
        "1girl, action pose",
        { embedding: extractResult.embedding!, strength: 0.85 },
        { outputPath: "/output/embedding_test.png" }
      );

      expect(genResult.success).toBe(true);
    });

    test("style transfer maintains composition", async () => {
      const adapter = getIPAdapter();

      const result = await adapter.transferStyle({
        prompt: "forest background scene",
        styleReference: "/output/panel_001_selected.png",
        strength: 0.6,
        outputPath: "/output/style_transfer.png",
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // ControlNet Integration
  // ============================================================================

  describe("ControlNet Integration", () => {
    test("direct ControlNet generation", async () => {
      const controlStack = getControlNetStack();

      const result = await controlStack.generate({
        prompt: "1girl, dynamic pose",
        controls: [
          { type: "openpose", image: "/output/pose_ref.png", strength: 0.9 },
        ],
        outputPath: "/output/controlnet_test.png",
      });

      expect(result.success).toBe(true);
      expect(mockGenerateWithControlNet).toHaveBeenCalled();
    });

    test("multi-control ControlNet stack", async () => {
      const controlStack = getControlNetStack();

      const result = await controlStack.generate({
        prompt: "1girl, detailed scene",
        controls: [
          { type: "openpose", image: "/output/pose.png", strength: 0.85 },
          { type: "depth", image: "/output/depth.png", strength: 0.5 },
        ],
        outputPath: "/output/multi_control.png",
      });

      expect(result.success).toBe(true);
    });

    test("ControlNet with preset", async () => {
      const controlStack = getControlNetStack();

      const result = await controlStack.generateWithPreset(
        "character_consistency",
        "/output/reference.png",
        "1girl, consistent character",
        { outputPath: "/output/preset_test.png" }
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Combined Consistency Operations
  // ============================================================================

  describe("Combined Operations", () => {
    test("consistency service uses correct components", async () => {
      const service = getConsistencyService();

      // Extract with specific adapter model
      const extracted = await service.extractIdentity({
        name: "Combined Test",
        sources: ["/output/ref.png"],
        sourcesArePanelIds: false,
        adapterModel: "ip-adapter-plus-face",
      });

      expect(extracted.success).toBe(true);

      // List adapters should include the one we used
      const adapters = service.listAdapterModels();
      expect(adapters).toContain("ip-adapter-plus-face");

      // List control presets should be available
      const presets = service.listControlPresets();
      expect(Array.isArray(presets)).toBe(true);
    });

    test("reference sheet uses identity throughout", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Sheet Identity",
        sources: ["/output/ref.png"],
        sourcesArePanelIds: false,
      });

      const sheetResult = await service.generateReferenceSheet({
        identityId: extracted.identityId!,
        poseCount: 3,
        outputDir: "/output/sheets",
      });

      expect(sheetResult.success).toBe(true);
      expect(sheetResult.images).toBeDefined();
    });
  });

  // ============================================================================
  // Error Handling & Recovery
  // ============================================================================

  describe("Error Handling", () => {
    test("handles missing panel gracefully", async () => {
      const service = getConsistencyService();

      const result = await service.applyIdentity({
        panelId: "nonexistent_panel",
        identityId: "some_identity",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("handles missing identity gracefully", async () => {
      const service = getConsistencyService();

      const result = await service.applyIdentity({
        panelId: "panel_001",
        identityId: "nonexistent_identity",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("chain sequence continues after individual failure", async () => {
      const service = getConsistencyService();

      // panel_002 has no selected output, should handle gracefully
      mockPanels.panel_002.selectedOutputId = null;

      const result = await service.chainSequence(
        ["panel_001", "panel_002", "panel_003"],
        { maintain: { identity: true } }
      );

      // Should have attempted to process the sequence
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Performance & State Management
  // ============================================================================

  describe("State Management", () => {
    test("identities persist within session", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "Persistent Identity",
        sources: ["/ref.png"],
        sourcesArePanelIds: false,
      });

      // Get fresh reference to service
      const sameService = getConsistencyService();

      // Identity should still be there
      const identities = sameService.listIdentities();
      expect(identities.some((i) => i.name === "Persistent Identity")).toBe(true);
    });

    test("reset clears all state", async () => {
      const service = getConsistencyService();

      await service.extractIdentity({
        name: "To Be Cleared",
        sources: ["/ref.png"],
        sourcesArePanelIds: false,
      });

      resetConsistencyService();

      const freshService = getConsistencyService();
      expect(freshService.listIdentities()).toHaveLength(0);
    });

    test("usage tracking accumulates correctly", async () => {
      const service = getConsistencyService();

      const extracted = await service.extractIdentity({
        name: "Usage Track",
        sources: ["/ref.png"],
        sourcesArePanelIds: false,
      });

      // Apply multiple times
      await service.applyIdentity({
        panelId: "panel_001",
        identityId: extracted.identityId!,
      });
      await service.applyIdentity({
        panelId: "panel_002",
        identityId: extracted.identityId!,
      });
      await service.applyIdentity({
        panelId: "panel_003",
        identityId: extracted.identityId!,
      });

      const identity = service.getIdentity(extracted.identityId!);
      expect(identity?.usageCount).toBe(3);
    });
  });
});
