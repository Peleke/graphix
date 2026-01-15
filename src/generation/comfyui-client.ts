/**
 * ComfyUI Client
 *
 * HTTP client for calling comfyui-mcp generation endpoints.
 * Supports direct HTTP calls to ComfyUI or MCP tool invocation.
 */

import { config } from "../config.js";

/**
 * Generation request parameters
 */
export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  loras?: Array<{ name: string; strength_model?: number; strength_clip?: number }>;
  outputPath: string;
}

/**
 * Image-to-image parameters
 */
export interface Img2ImgParams extends GenerateImageParams {
  inputImage: string;
  denoise?: number;
}

/**
 * ControlNet generation parameters
 */
export interface ControlNetParams extends GenerateImageParams {
  controlImage: string;
  controlType: "canny" | "depth" | "openpose" | "qrcode" | "scribble" | "lineart";
  strength?: number;
  preprocessorOptions?: Record<string, unknown>;
}

/**
 * IP-Adapter generation parameters (for character consistency)
 */
export interface IPAdapterParams extends GenerateImageParams {
  referenceImages: string[];
  ipAdapterStrength?: number;
}

/**
 * Pipeline execution parameters
 */
export interface PipelineParams extends GenerateImageParams {
  quality?: "draft" | "standard" | "high" | "ultra";
  enableHiresFix?: boolean;
  hiresScale?: number;
  hiresDenoise?: number;
  enableUpscale?: boolean;
  upscaleModel?: string;
}

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  imagePath?: string;
  seed?: number;
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ComfyUI connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
  gpuInfo?: {
    name: string;
    vram: number;
    vramUsed: number;
  };
}

/**
 * ComfyUI Client class
 *
 * Provides methods for all generation operations via ComfyUI.
 */
export class ComfyUIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl ?? config.comfyui.serverUrl;
    this.timeout = timeout ?? config.comfyui.timeout;
  }

  /**
   * Check connection to ComfyUI server
   */
  async checkConnection(): Promise<ConnectionStatus> {
    const start = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/system_stats`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          connected: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const stats = await response.json();
      const latencyMs = Date.now() - start;

      return {
        connected: true,
        latencyMs,
        gpuInfo: stats.devices?.[0]
          ? {
              name: stats.devices[0].name,
              vram: stats.devices[0].vram_total,
              vramUsed: stats.devices[0].vram_total - stats.devices[0].vram_free,
            }
          : undefined,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue status (running and pending jobs)
   */
  async getQueueStatus(): Promise<{ running: number; pending: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/queue`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const queue = await response.json();
      return {
        running: queue.queue_running?.length ?? 0,
        pending: queue.queue_pending?.length ?? 0,
      };
    } catch {
      return { running: 0, pending: 0 };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const info = await response.json();
      return info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
    } catch {
      return [];
    }
  }

  /**
   * List available LoRAs
   */
  async listLoras(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/object_info/LoraLoader`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const info = await response.json();
      return info.LoraLoader?.input?.required?.lora_name?.[0] ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Generate image using txt2img
   *
   * Note: This method constructs a workflow and submits it to ComfyUI.
   * In production, this would call the actual ComfyUI API endpoint.
   */
  async generateImage(params: GenerateImageParams): Promise<GenerationResult> {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      // Build the workflow
      const workflow = this.buildTxt2ImgWorkflow({
        ...params,
        seed,
      });

      // Submit to ComfyUI
      const result = await this.submitWorkflow(workflow);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        imagePath: params.outputPath,
        seed,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model,
        width: params.width ?? 768,
        height: params.height ?? 1024,
        steps: params.steps ?? 28,
        cfg: params.cfg ?? 7,
        sampler: params.sampler ?? "euler_ancestral",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  /**
   * Generate image using img2img
   */
  async img2img(params: Img2ImgParams): Promise<GenerationResult> {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      const workflow = this.buildImg2ImgWorkflow({
        ...params,
        seed,
      });

      const result = await this.submitWorkflow(workflow);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        imagePath: params.outputPath,
        seed,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model,
        metadata: {
          inputImage: params.inputImage,
          denoise: params.denoise ?? 0.75,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Img2img failed",
      };
    }
  }

  /**
   * Generate with ControlNet
   */
  async generateWithControlNet(params: ControlNetParams): Promise<GenerationResult> {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      const workflow = this.buildControlNetWorkflow({
        ...params,
        seed,
      });

      const result = await this.submitWorkflow(workflow);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        imagePath: params.outputPath,
        seed,
        prompt: params.prompt,
        metadata: {
          controlType: params.controlType,
          controlImage: params.controlImage,
          strength: params.strength ?? 1.0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "ControlNet generation failed",
      };
    }
  }

  /**
   * Generate with IP-Adapter for character consistency
   */
  async generateWithIPAdapter(params: IPAdapterParams): Promise<GenerationResult> {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      const workflow = this.buildIPAdapterWorkflow({
        ...params,
        seed,
      });

      const result = await this.submitWorkflow(workflow);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        imagePath: params.outputPath,
        seed,
        prompt: params.prompt,
        metadata: {
          referenceImages: params.referenceImages,
          ipAdapterStrength: params.ipAdapterStrength ?? 0.8,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "IP-Adapter generation failed",
      };
    }
  }

  /**
   * Execute full pipeline (txt2img → hires fix → upscale)
   */
  async executePipeline(params: PipelineParams): Promise<GenerationResult> {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      // Determine pipeline stages based on quality
      const stages = this.getPipelineStages(params.quality ?? "standard");

      // Start with base generation
      const baseResult = await this.generateImage({
        ...params,
        seed,
      });

      if (!baseResult.success) {
        return baseResult;
      }

      let currentPath = params.outputPath;

      // Apply hi-res fix if enabled
      if (stages.hiresFix || params.enableHiresFix) {
        const hiresResult = await this.img2img({
          ...params,
          inputImage: currentPath,
          denoise: params.hiresDenoise ?? 0.4,
          width: Math.round((params.width ?? 768) * (params.hiresScale ?? 1.5)),
          height: Math.round((params.height ?? 1024) * (params.hiresScale ?? 1.5)),
          seed,
          outputPath: currentPath.replace(/\.[^.]+$/, "_hires$&"),
        });

        if (hiresResult.success && hiresResult.imagePath) {
          currentPath = hiresResult.imagePath;
        }
      }

      // Apply upscaling if enabled
      if (stages.upscale || params.enableUpscale) {
        const upscaleResult = await this.upscale({
          inputImage: currentPath,
          outputPath: currentPath.replace(/\.[^.]+$/, "_upscaled$&"),
          model: params.upscaleModel ?? "RealESRGAN_x4plus.pth",
        });

        if (upscaleResult.success && upscaleResult.imagePath) {
          currentPath = upscaleResult.imagePath;
        }
      }

      return {
        success: true,
        imagePath: currentPath,
        seed,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model: params.model,
        metadata: {
          quality: params.quality,
          stages: stages,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pipeline execution failed",
      };
    }
  }

  /**
   * Upscale an image
   */
  async upscale(params: {
    inputImage: string;
    outputPath: string;
    model?: string;
    targetWidth?: number;
    targetHeight?: number;
  }): Promise<GenerationResult> {
    try {
      const workflow = this.buildUpscaleWorkflow(params);
      const result = await this.submitWorkflow(workflow);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        imagePath: params.outputPath,
        metadata: {
          inputImage: params.inputImage,
          upscaleModel: params.model ?? "RealESRGAN_x4plus.pth",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upscale failed",
      };
    }
  }

  // ==================== Workflow Builders ====================

  /**
   * Build txt2img workflow
   */
  private buildTxt2ImgWorkflow(params: GenerateImageParams & { seed: number }): object {
    // This is a simplified workflow structure
    // In production, this would be a full ComfyUI workflow JSON
    return {
      type: "txt2img",
      params: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt ?? "",
        model: params.model ?? config.comfyui.defaultModel,
        width: params.width ?? 768,
        height: params.height ?? 1024,
        steps: params.steps ?? 28,
        cfg: params.cfg ?? 7,
        seed: params.seed,
        sampler: params.sampler ?? "euler_ancestral",
        scheduler: params.scheduler ?? "normal",
        loras: params.loras ?? [],
        output_path: params.outputPath,
      },
    };
  }

  /**
   * Build img2img workflow
   */
  private buildImg2ImgWorkflow(params: Img2ImgParams & { seed: number }): object {
    return {
      type: "img2img",
      params: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt ?? "",
        input_image: params.inputImage,
        denoise: params.denoise ?? 0.75,
        model: params.model ?? config.comfyui.defaultModel,
        steps: params.steps ?? 28,
        cfg: params.cfg ?? 7,
        seed: params.seed,
        sampler: params.sampler ?? "euler_ancestral",
        scheduler: params.scheduler ?? "normal",
        output_path: params.outputPath,
      },
    };
  }

  /**
   * Build ControlNet workflow
   */
  private buildControlNetWorkflow(params: ControlNetParams & { seed: number }): object {
    return {
      type: "controlnet",
      params: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt ?? "",
        control_image: params.controlImage,
        control_type: params.controlType,
        strength: params.strength ?? 1.0,
        model: params.model ?? config.comfyui.defaultModel,
        width: params.width ?? 768,
        height: params.height ?? 1024,
        steps: params.steps ?? 28,
        cfg: params.cfg ?? 7,
        seed: params.seed,
        output_path: params.outputPath,
        preprocessor_options: params.preprocessorOptions,
      },
    };
  }

  /**
   * Build IP-Adapter workflow
   */
  private buildIPAdapterWorkflow(params: IPAdapterParams & { seed: number }): object {
    return {
      type: "ip_adapter",
      params: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt ?? "",
        reference_images: params.referenceImages,
        ip_adapter_strength: params.ipAdapterStrength ?? 0.8,
        model: params.model ?? config.comfyui.defaultModel,
        width: params.width ?? 768,
        height: params.height ?? 1024,
        steps: params.steps ?? 28,
        cfg: params.cfg ?? 7,
        seed: params.seed,
        output_path: params.outputPath,
      },
    };
  }

  /**
   * Build upscale workflow
   */
  private buildUpscaleWorkflow(params: {
    inputImage: string;
    outputPath: string;
    model?: string;
    targetWidth?: number;
    targetHeight?: number;
  }): object {
    return {
      type: "upscale",
      params: {
        input_image: params.inputImage,
        upscale_model: params.model ?? "RealESRGAN_x4plus.pth",
        target_width: params.targetWidth,
        target_height: params.targetHeight,
        output_path: params.outputPath,
      },
    };
  }

  /**
   * Submit workflow to ComfyUI
   */
  private async submitWorkflow(workflow: object): Promise<GenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: workflow }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `ComfyUI error: ${error}`,
        };
      }

      const result = await response.json();

      // In production, we'd poll for completion here
      // For now, return success assuming the workflow will complete
      return {
        success: true,
        metadata: {
          promptId: result.prompt_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Workflow submission failed",
      };
    }
  }

  /**
   * Get pipeline stages based on quality preset
   */
  private getPipelineStages(quality: string): { hiresFix: boolean; upscale: boolean } {
    switch (quality) {
      case "draft":
        return { hiresFix: false, upscale: false };
      case "standard":
        return { hiresFix: false, upscale: false };
      case "high":
        return { hiresFix: true, upscale: false };
      case "ultra":
        return { hiresFix: true, upscale: true };
      default:
        return { hiresFix: false, upscale: false };
    }
  }
}

// Singleton instance
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
