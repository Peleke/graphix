/**
 * ComfyUI Mock Server
 *
 * Provides a mock implementation of the comfyui-mcp HTTP API for testing.
 *
 * This mock is based on the actual ComfyUI API as documented in:
 * - ComfyUI server.py: https://github.com/comfyanonymous/ComfyUI/blob/master/server.py
 * - ComfyUI Routes Reference: https://docs.comfy.org/development/comfyui-server/comms_routes
 *
 * Core ComfyUI Endpoints (from server.py @routes decorators):
 * - POST /prompt - Submits workflow for execution
 * - GET /history/{prompt_id} - Retrieves execution history
 * - GET /queue - Returns queue status (queue_running, queue_pending)
 * - GET /system_stats - Returns OS, RAM, VRAM, PyTorch info
 * - GET /object_info - Returns node class library metadata
 * - GET /embeddings - Returns available embeddings
 * - GET /models/{folder} - Returns models in folder
 * - POST /upload/image - Uploads image, returns {name, subfolder, type}
 * - GET /view - Retrieves generated images
 * - POST /interrupt - Interrupts execution
 * - POST /free - Frees GPU memory
 *
 * The comfyui-mcp layer provides higher-level abstractions that internally
 * construct ComfyUI workflows and submit them via POST /prompt.
 *
 * @see https://github.com/comfyanonymous/ComfyUI/blob/master/server.py
 */

import type {
  ImageGenerateRequest,
  ImagineRequest,
  ControlNetRequest,
  PreprocessRequest,
  PortraitRequest,
  TTSRequest,
  LipsyncRequest,
  InpaintRequest,
  Img2ImgRequest,
  GenerationResult,
  HealthResult,
} from "../../generation/comfyui-client.js";

// ============================================================================
// Mock State
// ============================================================================

interface MockState {
  isHealthy: boolean;
  models: string[];
  loras: string[];
  samplers: string[];
  schedulers: string[];
  queueRunning: string[];
  queuePending: string[];
  history: Map<string, MockHistoryEntry>;
  nextSeed: number;
  latencyMs: number;
  generateCallCount: number;
  lastRequest: unknown;
}

interface MockHistoryEntry {
  promptId: string;
  outputs: Record<string, { images: Array<{ filename: string; type: string }> }>;
  status: { completed: boolean };
}

const defaultState: MockState = {
  isHealthy: true,
  models: [
    "novaFurry11.safetensors",
    "yiffInHell_yihXXXTended.safetensors",
    "perfectDeliberate_v6.safetensors",
    "illustriousXL_v01.safetensors",
  ],
  loras: [
    "character_alice.safetensors",
    "character_bob.safetensors",
    "style_anime.safetensors",
    "style_realistic.safetensors",
  ],
  samplers: [
    // From ComfyUI's comfy/samplers.py - SAMPLER_NAMES list
    "euler",
    "euler_ancestral",
    "heun",
    "heunpp2",
    "dpm_2",
    "dpm_2_ancestral",
    "lms",
    "dpm_fast",
    "dpm_adaptive",
    "dpmpp_2s_ancestral",
    "dpmpp_sde",
    "dpmpp_sde_gpu",
    "dpmpp_2m",
    "dpmpp_2m_sde",
    "dpmpp_2m_sde_gpu",
    "dpmpp_3m_sde",
    "dpmpp_3m_sde_gpu",
    "ddpm",
    "lcm",
    "ipndm",
    "ipndm_v",
    "deis",
    "ddim",
    "uni_pc",
    "uni_pc_bh2",
  ],
  schedulers: [
    // From ComfyUI's comfy/samplers.py - SCHEDULER_NAMES list
    "normal",
    "karras",
    "exponential",
    "sgm_uniform",
    "simple",
    "ddim_uniform",
    "beta",
  ],
  queueRunning: [],
  queuePending: [],
  history: new Map(),
  nextSeed: 12345,
  latencyMs: 50,
  generateCallCount: 0,
  lastRequest: null,
};

let mockState = { ...defaultState };

// ============================================================================
// Mock Response Generators
// ============================================================================

/**
 * Generate a mock prompt_id matching ComfyUI's format
 * ComfyUI uses UUID4 for prompt_id (see server.py PromptQueue.put)
 */
function generatePromptId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate mock output path matching ComfyUI's output naming convention
 * ComfyUI uses: output/{filename_prefix}_{counter:05d}.png (see nodes.py SaveImage)
 */
function generateOutputPath(prefix = "ComfyUI"): string {
  const counter = mockState.generateCallCount.toString().padStart(5, "0");
  return `/tmp/comfyui-test-output/${prefix}_${counter}_.png`;
}

/**
 * Create a successful generation result
 *
 * Based on comfyui-mcp response format which wraps ComfyUI's
 * history/{prompt_id} response with additional metadata.
 */
function createSuccessResult(
  request: unknown,
  options: Partial<GenerationResult> = {}
): GenerationResult {
  mockState.generateCallCount++;
  mockState.lastRequest = request;

  const seed = options.seed ?? mockState.nextSeed++;
  const localPath = options.localPath ?? generateOutputPath();

  return {
    success: true,
    localPath,
    signedUrl: `https://mock-storage.example.com/${localPath.split("/").pop()}`,
    seed,
    prompt: (request as any)?.prompt ?? (request as any)?.description ?? "mock prompt",
    negativePrompt: (request as any)?.negative_prompt ?? "",
    model: (request as any)?.model ?? mockState.models[0],
    modelFamily: "sdxl",
    ...options,
  };
}

/**
 * Create an error result
 */
function createErrorResult(error: string): GenerationResult {
  return {
    success: false,
    error,
  };
}

// ============================================================================
// Mock HTTP Server Implementation
// ============================================================================

export interface MockComfyUIServer {
  // State management
  reset(): void;
  setState(partial: Partial<MockState>): void;
  getState(): Readonly<MockState>;

  // Inspection
  getLastRequest(): unknown;
  getGenerateCallCount(): number;

  // Core ComfyUI API endpoints (from server.py)
  // @see https://github.com/comfyanonymous/ComfyUI/blob/master/server.py

  /**
   * GET /system_stats
   * Returns system and device statistics
   * @see server.py: @routes.get("/system_stats")
   */
  systemStats(): {
    system: {
      os: string;
      ram_total: number;
      ram_free: number;
      python_version: string;
    };
    devices: Array<{
      name: string;
      type: string;
      vram_total: number;
      vram_free: number;
      torch_vram_total: number;
      torch_vram_free: number;
    }>;
  };

  /**
   * GET /queue
   * Returns current queue status
   * @see server.py: @routes.get("/queue")
   */
  queue(): {
    queue_running: Array<[number, string, unknown, Record<string, unknown>]>;
    queue_pending: Array<[number, string, unknown, Record<string, unknown>]>;
  };

  /**
   * POST /prompt
   * Submits a workflow for execution
   * @see server.py: @routes.post("/prompt")
   */
  submitPrompt(workflow: unknown): {
    prompt_id: string;
    number: number;
    node_errors: Record<string, unknown>;
  };

  /**
   * GET /history/{prompt_id}
   * Retrieves execution history for a prompt
   * @see server.py: @routes.get("/history/{prompt_id}")
   */
  getHistory(promptId: string): MockHistoryEntry | null;

  /**
   * GET /object_info
   * Returns node class library metadata
   * @see server.py: @routes.get("/object_info")
   */
  objectInfo(): Record<string, unknown>;

  /**
   * GET /models/{folder}
   * Returns list of models in folder
   * @see server.py: @routes.get("/models/{folder}")
   */
  getModels(folder?: string): string[];

  /**
   * GET /embeddings
   * Returns list of available embeddings
   * @see server.py: @routes.get("/embeddings")
   */
  getEmbeddings(): string[];

  // High-level comfyui-mcp endpoints

  /**
   * GET /health - Health check
   */
  health(): HealthResult;

  /**
   * GET /ping - Quick connectivity check
   */
  ping(): { reachable: boolean; latency_ms: number };

  /**
   * POST /image - Direct image generation
   */
  generateImage(request: ImageGenerateRequest): Promise<GenerationResult>;

  /**
   * POST /imagine - High-level generation with auto prompt crafting
   */
  imagine(request: ImagineRequest): Promise<GenerationResult>;

  /**
   * POST /portrait - Portrait generation optimized for lipsync
   */
  generatePortrait(request: PortraitRequest): Promise<GenerationResult>;

  /**
   * POST /controlnet - ControlNet guided generation
   */
  generateWithControlNet(request: ControlNetRequest): Promise<GenerationResult>;

  /**
   * POST /preprocess - Preprocess image for ControlNet
   */
  preprocessImage(request: PreprocessRequest): Promise<GenerationResult>;

  /**
   * POST /tts - Text-to-speech with voice cloning
   */
  tts(request: TTSRequest): Promise<GenerationResult>;

  /**
   * POST /lipsync - Generate lipsync video
   */
  lipsync(request: LipsyncRequest): Promise<GenerationResult>;

  /**
   * POST /inpaint - Inpainting with mask
   */
  inpaint(request: InpaintRequest): Promise<GenerationResult>;

  /**
   * POST /img2img - Image-to-image transformation
   */
  img2img(request: Img2ImgRequest): Promise<GenerationResult>;
}

// ============================================================================
// Mock Server Implementation
// ============================================================================

export const mockComfyUIServer: MockComfyUIServer = {
  reset() {
    mockState = {
      ...defaultState,
      history: new Map(),
      generateCallCount: 0,
      lastRequest: null,
    };
  },

  setState(partial: Partial<MockState>) {
    mockState = { ...mockState, ...partial };
  },

  getState(): Readonly<MockState> {
    return mockState;
  },

  getLastRequest(): unknown {
    return mockState.lastRequest;
  },

  getGenerateCallCount(): number {
    return mockState.generateCallCount;
  },

  // =========================================================================
  // Core ComfyUI API endpoints
  // =========================================================================

  /**
   * GET /system_stats
   * @see server.py line ~420: @routes.get("/system_stats")
   */
  systemStats() {
    return {
      system: {
        os: "linux",
        ram_total: 32 * 1024 * 1024 * 1024, // 32GB
        ram_free: 16 * 1024 * 1024 * 1024, // 16GB
        python_version: "3.10.12",
      },
      devices: [
        {
          name: "NVIDIA RTX 4090 (Mock)",
          type: "cuda",
          vram_total: 24 * 1024 * 1024 * 1024, // 24GB
          vram_free: 20 * 1024 * 1024 * 1024, // 20GB
          torch_vram_total: 24 * 1024 * 1024 * 1024,
          torch_vram_free: 20 * 1024 * 1024 * 1024,
        },
      ],
    };
  },

  /**
   * GET /queue
   * @see server.py line ~350: @routes.get("/queue")
   * Returns queue_running and queue_pending arrays
   */
  queue() {
    return {
      queue_running: mockState.queueRunning.map((id, i) => [
        i,
        id,
        {},
        { client_id: "mock-client" },
      ]),
      queue_pending: mockState.queuePending.map((id, i) => [
        i,
        id,
        {},
        { client_id: "mock-client" },
      ]),
    };
  },

  /**
   * POST /prompt
   * @see server.py line ~250: @routes.post("/prompt")
   * Validates prompt and adds to execution queue
   */
  submitPrompt(workflow: unknown) {
    const promptId = generatePromptId();
    const number = mockState.queuePending.length + mockState.queueRunning.length + 1;

    // Simulate adding to history immediately (in real ComfyUI this happens after execution)
    mockState.history.set(promptId, {
      promptId,
      outputs: {
        "9": {
          images: [{ filename: generateOutputPath(), type: "output" }],
        },
      },
      status: { completed: true },
    });

    return {
      prompt_id: promptId,
      number,
      node_errors: {},
    };
  },

  /**
   * GET /history/{prompt_id}
   * @see server.py line ~380: @routes.get("/history/{prompt_id}")
   */
  getHistory(promptId: string) {
    return mockState.history.get(promptId) ?? null;
  },

  /**
   * GET /object_info
   * @see server.py line ~450: @routes.get("/object_info")
   * Returns node class library - simplified mock version
   */
  objectInfo() {
    return {
      KSampler: {
        input: {
          required: {
            model: ["MODEL"],
            seed: ["INT", { default: 0, min: 0, max: 0xffffffffffffffff }],
            steps: ["INT", { default: 20, min: 1, max: 10000 }],
            cfg: ["FLOAT", { default: 8.0, min: 0.0, max: 100.0, step: 0.1 }],
            sampler_name: [mockState.samplers],
            scheduler: [mockState.schedulers],
            positive: ["CONDITIONING"],
            negative: ["CONDITIONING"],
            latent_image: ["LATENT"],
            denoise: ["FLOAT", { default: 1.0, min: 0.0, max: 1.0, step: 0.01 }],
          },
        },
        output: ["LATENT"],
        output_name: ["LATENT"],
        name: "KSampler",
        description: "",
        category: "sampling",
      },
      CheckpointLoaderSimple: {
        input: {
          required: {
            ckpt_name: [mockState.models],
          },
        },
        output: ["MODEL", "CLIP", "VAE"],
        output_name: ["MODEL", "CLIP", "VAE"],
        name: "CheckpointLoaderSimple",
        description: "",
        category: "loaders",
      },
      LoraLoader: {
        input: {
          required: {
            model: ["MODEL"],
            clip: ["CLIP"],
            lora_name: [mockState.loras],
            strength_model: ["FLOAT", { default: 1.0, min: -100.0, max: 100.0, step: 0.01 }],
            strength_clip: ["FLOAT", { default: 1.0, min: -100.0, max: 100.0, step: 0.01 }],
          },
        },
        output: ["MODEL", "CLIP"],
        output_name: ["MODEL", "CLIP"],
        name: "LoraLoader",
        description: "",
        category: "loaders",
      },
      ControlNetLoader: {
        input: {
          required: {
            control_net_name: [["control_v11p_sd15_canny.safetensors", "control_v11f1p_sd15_depth.safetensors"]],
          },
        },
        output: ["CONTROL_NET"],
        output_name: ["CONTROL_NET"],
        name: "ControlNetLoader",
        description: "",
        category: "loaders",
      },
    };
  },

  /**
   * GET /models/{folder}
   * @see server.py line ~200: @routes.get("/models/{folder}")
   */
  getModels(folder?: string) {
    if (folder === "loras") return mockState.loras;
    if (folder === "checkpoints") return mockState.models;
    return mockState.models;
  },

  /**
   * GET /embeddings
   * @see server.py line ~180: @routes.get("/embeddings")
   */
  getEmbeddings() {
    return ["EasyNegative", "bad-hands-5", "ng_deepnegative_v1_75t"];
  },

  // =========================================================================
  // High-level comfyui-mcp endpoints
  // =========================================================================

  health(): HealthResult {
    if (!mockState.isHealthy) {
      return { status: "unhealthy", error: "Mock server unhealthy" };
    }

    const stats = this.systemStats();
    return {
      status: "healthy",
      latency_ms: mockState.latencyMs,
      gpu: {
        name: stats.devices[0].name,
        vram_total: stats.devices[0].vram_total,
        vram_free: stats.devices[0].vram_free,
      },
    };
  },

  ping() {
    return {
      reachable: mockState.isHealthy,
      latency_ms: mockState.latencyMs,
    };
  },

  async generateImage(request: ImageGenerateRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    // Simulate latency
    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    return createSuccessResult(request, {
      seed: request.seed ?? mockState.nextSeed++,
      model: request.model ?? mockState.models[0],
    });
  },

  async imagine(request: ImagineRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    // /imagine auto-crafts the prompt from description
    return createSuccessResult(request, {
      prompt: `masterpiece, best quality, ${request.description}`,
      seed: request.seed ?? mockState.nextSeed++,
      model: request.model ?? mockState.models[0],
      modelFamily: "sdxl",
    });
  },

  async generatePortrait(request: PortraitRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    return createSuccessResult(request, {
      prompt: `portrait, ${request.expression ?? "neutral"} expression, ${request.description}`,
    });
  },

  async generateWithControlNet(request: ControlNetRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.control_image) {
      return createErrorResult("control_image is required");
    }

    if (!request.control_type) {
      return createErrorResult("control_type is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    return createSuccessResult(request, {
      seed: request.seed ?? mockState.nextSeed++,
    });
  },

  async preprocessImage(request: PreprocessRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.input_image) {
      return createErrorResult("input_image is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    const outputPath = request.output_path ?? `/tmp/preprocessed_${request.control_type}.png`;
    return {
      success: true,
      localPath: outputPath,
    };
  },

  async tts(request: TTSRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.text) {
      return createErrorResult("text is required");
    }

    if (!request.voice_reference) {
      return createErrorResult("voice_reference is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    const outputPath = request.output_path ?? "/tmp/tts_output.wav";
    return {
      success: true,
      localPath: outputPath,
    };
  },

  async lipsync(request: LipsyncRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.portrait_image) {
      return createErrorResult("portrait_image is required");
    }

    if (!request.audio) {
      return createErrorResult("audio is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    const outputPath = request.output_path ?? "/tmp/lipsync_output.mp4";
    return {
      success: true,
      localPath: outputPath,
    };
  },

  async inpaint(request: InpaintRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.source_image) {
      return createErrorResult("source_image is required");
    }

    if (!request.mask_image) {
      return createErrorResult("mask_image is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    return createSuccessResult(request, {
      seed: request.seed ?? mockState.nextSeed++,
    });
  },

  async img2img(request: Img2ImgRequest): Promise<GenerationResult> {
    if (!mockState.isHealthy) {
      return createErrorResult("ComfyUI server unreachable");
    }

    if (!request.source_image) {
      return createErrorResult("source_image is required");
    }

    await new Promise((r) => setTimeout(r, mockState.latencyMs));

    return createSuccessResult(request, {
      seed: request.seed ?? mockState.nextSeed++,
    });
  },
};

// ============================================================================
// Mock ComfyUI Client Factory
// ============================================================================

/**
 * Create a mocked ComfyUIClient that uses the mock server
 *
 * Usage:
 * ```ts
 * import { createMockComfyUIClient, mockComfyUIServer } from "./__mocks__/comfyui-mock.js";
 *
 * beforeEach(() => {
 *   mockComfyUIServer.reset();
 * });
 *
 * it("generates an image", async () => {
 *   const client = createMockComfyUIClient();
 *   const result = await client.generateImage({ prompt: "test" });
 *   expect(result.success).toBe(true);
 *   expect(mockComfyUIServer.getGenerateCallCount()).toBe(1);
 * });
 * ```
 */
export function createMockComfyUIClient() {
  return {
    health: () => Promise.resolve(mockComfyUIServer.health()),
    ping: () => Promise.resolve(mockComfyUIServer.ping()),
    listModels: () => Promise.resolve(mockComfyUIServer.getModels()),
    generateImage: (req: ImageGenerateRequest) => mockComfyUIServer.generateImage(req),
    imagine: (req: ImagineRequest) => mockComfyUIServer.imagine(req),
    generatePortrait: (req: PortraitRequest) => mockComfyUIServer.generatePortrait(req),
    generateWithControlNet: (req: ControlNetRequest) => mockComfyUIServer.generateWithControlNet(req),
    preprocessImage: (req: PreprocessRequest) => mockComfyUIServer.preprocessImage(req),
    tts: (req: TTSRequest) => mockComfyUIServer.tts(req),
    lipsync: (req: LipsyncRequest) => mockComfyUIServer.lipsync(req),
    inpaint: (req: InpaintRequest) => mockComfyUIServer.inpaint(req),
    img2img: (req: Img2ImgRequest) => mockComfyUIServer.img2img(req),
  };
}

export default mockComfyUIServer;
