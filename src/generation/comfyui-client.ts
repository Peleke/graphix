/**
 * ComfyUI MCP Client
 *
 * HTTP client for calling comfyui-mcp's REST API.
 * Handles authentication, request signing, and response parsing.
 */

import { createHmac } from "crypto";
import { config } from "../config.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Image generation request (maps to POST /image)
 */
export interface ImageGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  scheduler?: string;
  model?: string;
  seed?: number;
  loras?: Array<{ name: string; strength_model?: number; strength_clip?: number }>;
  output_path?: string;
  upload_to_cloud?: boolean;
}

/**
 * High-level imagine request (maps to POST /imagine)
 */
export interface ImagineRequest {
  description: string;
  style?: string;
  quality?: "draft" | "standard" | "high" | "ultra";
  width?: number;
  height?: number;
  seed?: number;
  model?: string;
  output_path?: string;
  upload_to_cloud?: boolean;
}

/**
 * Portrait generation request (maps to POST /portrait)
 */
export interface PortraitRequest {
  description: string;
  style?: "realistic" | "artistic" | "anime" | "furry";
  gender?: "male" | "female" | "androgynous";
  expression?: "neutral" | "slight_smile" | "serious" | "friendly";
  model?: string;
  output_path?: string;
  upload_to_cloud?: boolean;
}

/**
 * TTS generation request (maps to POST /tts)
 */
export interface TTSRequest {
  text: string;
  voice_reference: string;
  voice_reference_text?: string;
  speed?: number;
  output_path?: string;
  upload_to_cloud?: boolean;
}

/**
 * Lipsync generation request (maps to POST /lipsync)
 */
export interface LipsyncRequest {
  portrait_image: string;
  audio: string;
  fps?: number;
  duration?: number;
  output_path?: string;
  upload_to_cloud?: boolean;
}

/**
 * Generation result from comfyui-mcp
 */
export interface GenerationResult {
  success: boolean;
  localPath?: string;
  signedUrl?: string;
  seed?: number;
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  modelFamily?: string;
  error?: string;
}

/**
 * Health check result
 */
export interface HealthResult {
  status: "healthy" | "unhealthy";
  latency_ms?: number;
  gpu?: {
    name: string;
    vram_total: number;
    vram_free: number;
  };
  error?: string;
}

// ============================================================================
// Auth Helpers
// ============================================================================

/**
 * Generate HMAC-SHA256 auth headers for comfyui-mcp
 */
function generateAuthHeaders(
  body: unknown,
  apiKey: string,
  apiSecret: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const bodyString = typeof body === "string" ? body : JSON.stringify(body);

  const signature = createHmac("sha256", apiSecret)
    .update(`${timestamp}:${bodyString}`)
    .digest("hex");

  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };
}

// ============================================================================
// Client Class
// ============================================================================

/**
 * ComfyUI MCP HTTP Client
 *
 * Communicates with comfyui-mcp's REST API for image/video generation.
 */
export class ComfyUIClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private timeout: number;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    timeout?: number;
  }) {
    this.baseUrl = options?.baseUrl ?? config.comfyui.baseUrl;
    this.apiKey = options?.apiKey ?? config.comfyui.apiKey;
    this.apiSecret = options?.apiSecret ?? config.comfyui.apiSecret;
    this.timeout = options?.timeout ?? config.comfyui.timeout;
  }

  // ==========================================================================
  // Health & Discovery
  // ==========================================================================

  /**
   * Check health of comfyui-mcp server
   */
  async health(): Promise<HealthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { status: "unhealthy", error: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Quick connectivity check
   */
  async ping(): Promise<{ reachable: boolean; latency_ms?: number }> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/ping`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { reachable: false };
      }

      const result = await response.json();
      return {
        reachable: result.reachable ?? true,
        latency_ms: result.latency_ms ?? Date.now() - start,
      };
    } catch {
      return { reachable: false };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.models ?? [];
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Image Generation
  // ==========================================================================

  /**
   * Generate image using direct prompt (POST /image)
   *
   * Use this when you've built your own prompt with PromptBuilder.
   */
  async generateImage(request: ImageGenerateRequest): Promise<GenerationResult> {
    return this.post("/image", request);
  }

  /**
   * High-level image generation with auto prompt crafting (POST /imagine)
   *
   * Use this for simple descriptions; comfyui-mcp will craft the prompt.
   */
  async imagine(request: ImagineRequest): Promise<GenerationResult> {
    return this.post("/imagine", request);
  }

  /**
   * Generate portrait optimized for lipsync (POST /portrait)
   */
  async generatePortrait(request: PortraitRequest): Promise<GenerationResult> {
    return this.post("/portrait", request);
  }

  // ==========================================================================
  // Audio/Video Generation
  // ==========================================================================

  /**
   * Text-to-speech with voice cloning (POST /tts)
   */
  async tts(request: TTSRequest): Promise<GenerationResult> {
    return this.post("/tts", request);
  }

  /**
   * Generate lipsync video (POST /lipsync)
   */
  async lipsync(request: LipsyncRequest): Promise<GenerationResult> {
    return this.post("/lipsync", request);
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Make authenticated POST request to comfyui-mcp
   */
  private async post(endpoint: string, body: unknown): Promise<GenerationResult> {
    try {
      const bodyString = JSON.stringify(body);
      const headers = this.apiKey && this.apiSecret
        ? generateAuthHeaders(body, this.apiKey, this.apiSecret)
        : { "Content-Type": "application/json" };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: bodyString,
        signal: AbortSignal.timeout(this.timeout),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error ?? `HTTP ${response.status}`,
        };
      }

      return {
        success: result.success ?? true,
        localPath: result.localPath,
        signedUrl: result.signedUrl,
        seed: result.seed,
        prompt: result.prompt,
        negativePrompt: result.negativePrompt,
        model: result.model,
        modelFamily: result.modelFamily,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let clientInstance: ComfyUIClient | null = null;

/**
 * Get the ComfyUI client singleton
 */
export function getComfyUIClient(): ComfyUIClient {
  if (!clientInstance) {
    clientInstance = new ComfyUIClient();
  }
  return clientInstance;
}

/**
 * Reset the client singleton (for testing)
 */
export function resetComfyUIClient(): void {
  clientInstance = null;
}
