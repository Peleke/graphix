/**
 * ControlNet Stacking
 *
 * Combines multiple ControlNet conditions for precise control over generation.
 * Supports automatic preprocessing and weighted blending.
 */

import { getComfyUIClient, type GenerationResult } from "./comfyui-client.js";
import { getModelResolver } from "./models/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Control type for ControlNet preprocessing
 */
export type ControlType =
  | "canny" // Edge detection
  | "depth" // Depth map
  | "openpose" // Pose skeleton
  | "lineart" // Line art extraction
  | "scribble" // Simple scribble/sketch
  | "softedge" // Soft edge detection
  | "normalbae" // Normal map (BAE)
  | "mlsd" // Line segment detection
  | "shuffle" // Content shuffle
  | "tile" // Tile/detail enhancement
  | "blur" // Blur control
  | "inpaint" // Inpainting mask
  | "ip2p" // InstructPix2Pix style editing
  | "semantic_seg" // Semantic segmentation
  | "qrcode" // QR code generation
  | "reference"; // Reference-only (no preprocessing)

/**
 * Single control condition in a stack
 */
export interface ControlCondition {
  /** Type of control to apply */
  type: ControlType;
  /** Source image for this control (or path to preprocessed control image) */
  image: string;
  /** Control strength (0.0-2.0, default 1.0) */
  strength?: number;
  /** When to start applying this control (0.0-1.0) */
  startPercent?: number;
  /** When to stop applying this control (0.0-1.0) */
  endPercent?: number;
  /** Whether to preprocess the image (default true) */
  preprocess?: boolean;
  /** Type-specific preprocessor options */
  preprocessorOptions?: PreprocessorOptions;
  /** Specific ControlNet model to use (auto-selected if not specified) */
  controlnetModel?: string;
}

/**
 * Preprocessor options for different control types
 */
export interface PreprocessorOptions {
  // Canny
  lowThreshold?: number;
  highThreshold?: number;
  // OpenPose
  detectBody?: boolean;
  detectFace?: boolean;
  detectHands?: boolean;
  // Depth
  depthType?: "midas" | "zoe" | "leres";
  // Lineart
  coarse?: boolean;
  // MLSD
  valueThreshold?: number;
  distanceThreshold?: number;
}

/**
 * Multi-ControlNet generation request
 */
export interface ControlNetStackRequest {
  /** Positive prompt */
  prompt: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Stack of control conditions (1-5 recommended) */
  controls: ControlCondition[];
  /** Generation dimensions */
  width?: number;
  height?: number;
  /** Quality settings */
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  /** Base model */
  model?: string;
  /** LoRAs to apply */
  loras?: Array<{ name: string; strengthModel?: number; strengthClip?: number }>;
  /** Seed */
  seed?: number;
  /** Output path */
  outputPath: string;
}

/**
 * Preset control stack for common use cases
 */
export interface ControlStackPreset {
  id: string;
  name: string;
  description: string;
  controls: Array<{ type: ControlType; defaultStrength: number }>;
}

// ============================================================================
// Control Stack Presets
// ============================================================================

/**
 * Pre-configured control stacks for common comic panel scenarios
 */
export const CONTROL_STACK_PRESETS: Record<string, ControlStackPreset> = {
  pose_transfer: {
    id: "pose_transfer",
    name: "Pose Transfer",
    description: "Transfer character pose from reference while changing content",
    controls: [{ type: "openpose", defaultStrength: 0.9 }],
  },

  pose_depth: {
    id: "pose_depth",
    name: "Pose + Depth",
    description: "Maintain pose and spatial relationships",
    controls: [
      { type: "openpose", defaultStrength: 0.85 },
      { type: "depth", defaultStrength: 0.5 },
    ],
  },

  character_consistency: {
    id: "character_consistency",
    name: "Character Consistency",
    description: "Maintain character pose and linework for panel sequences",
    controls: [
      { type: "openpose", defaultStrength: 0.8 },
      { type: "lineart", defaultStrength: 0.6 },
    ],
  },

  lineart_color: {
    id: "lineart_color",
    name: "Lineart to Color",
    description: "Colorize line art while preserving details",
    controls: [{ type: "lineart", defaultStrength: 1.0 }],
  },

  scene_reconstruction: {
    id: "scene_reconstruction",
    name: "Scene Reconstruction",
    description: "Reconstruct scene with different style from reference",
    controls: [
      { type: "depth", defaultStrength: 0.7 },
      { type: "canny", defaultStrength: 0.5 },
    ],
  },

  detailed_pose: {
    id: "detailed_pose",
    name: "Detailed Pose",
    description: "Full pose with hands and face for detailed character work",
    controls: [
      {
        type: "openpose",
        defaultStrength: 0.9,
      },
    ],
  },

  sketch_to_render: {
    id: "sketch_to_render",
    name: "Sketch to Render",
    description: "Transform rough sketches into finished artwork",
    controls: [
      { type: "scribble", defaultStrength: 0.8 },
      { type: "depth", defaultStrength: 0.4 },
    ],
  },

  panel_continuity: {
    id: "panel_continuity",
    name: "Panel Continuity",
    description: "Maintain visual continuity between comic panels",
    controls: [
      { type: "openpose", defaultStrength: 0.75 },
      { type: "depth", defaultStrength: 0.4 },
      { type: "softedge", defaultStrength: 0.3 },
    ],
  },
};

// ============================================================================
// ControlNet Stack Client
// ============================================================================

/**
 * ControlNet Stack Client
 *
 * Manages multiple ControlNet conditions for complex generation scenarios.
 *
 * Usage:
 * ```typescript
 * const stack = getControlNetStack();
 *
 * // Simple single control
 * const result = await stack.generate({
 *   prompt: "1girl, standing",
 *   controls: [{ type: "openpose", image: "pose_ref.png", strength: 0.9 }],
 *   outputPath: "output.png"
 * });
 *
 * // Multiple controls
 * const result = await stack.generate({
 *   prompt: "1girl, detailed background",
 *   controls: [
 *     { type: "openpose", image: "pose.png", strength: 0.85 },
 *     { type: "depth", image: "depth.png", strength: 0.5 },
 *   ],
 *   outputPath: "output.png"
 * });
 *
 * // Use preset
 * const result = await stack.generateWithPreset(
 *   "character_consistency",
 *   "ref.png",
 *   "1girl, forest background",
 *   { outputPath: "output.png" }
 * );
 * ```
 */
export class ControlNetStackClient {
  private comfyClient = getComfyUIClient();

  // ==========================================================================
  // Generation
  // ==========================================================================

  /**
   * Generate with multiple ControlNet conditions
   */
  async generate(request: ControlNetStackRequest): Promise<GenerationResult> {
    const {
      prompt,
      negativePrompt,
      controls,
      width = 768,
      height = 1024,
      steps = 28,
      cfgScale = 7,
      sampler = "euler_ancestral",
      scheduler = "normal",
      model,
      loras,
      seed,
      outputPath,
    } = request;

    if (controls.length === 0) {
      return { success: false, error: "At least one control condition is required" };
    }

    if (controls.length > 5) {
      return {
        success: false,
        error: "Maximum 5 control conditions supported. More may cause quality degradation.",
      };
    }

    // Use model resolver to validate and resolve ControlNet compatibility
    const resolver = getModelResolver();
    const warnings: string[] = [];

    if (model) {
      for (const ctrl of controls) {
        const resolution = resolver.resolveControlNet(model, ctrl.type);
        if (!resolution.compatible) {
          return {
            success: false,
            error: resolution.error ?? `ControlNet ${ctrl.type} not compatible with model ${model}`,
          };
        }
        // Collect warnings
        warnings.push(...resolution.warnings);

        // Auto-set controlnet model if not specified
        if (!ctrl.controlnetModel && resolution.controlnet) {
          ctrl.controlnetModel = resolution.controlnet;
        }
      }
    }

    if (warnings.length > 0) {
      console.warn("ControlNet warnings:", warnings);
    }

    // For single control, use the simpler ControlNet endpoint
    if (controls.length === 1) {
      const ctrl = controls[0];
      return this.comfyClient.generateWithControlNet({
        prompt,
        negative_prompt: negativePrompt,
        control_image: ctrl.image,
        control_type: this.mapControlType(ctrl.type),
        strength: ctrl.strength ?? 1.0,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        sampler,
        model,
        loras: loras?.map((l) => ({
          name: l.name,
          strength_model: l.strengthModel,
          strength_clip: l.strengthClip,
        })),
        seed,
        output_path: outputPath,
      });
    }

    // For multiple controls, we need to call the multi-controlnet endpoint
    // This would typically call comfyui-mcp's /multi-controlnet endpoint
    //
    // Since the current comfyui-client doesn't have this method yet,
    // we'll fall back to sequential application or the primary control
    //
    // TODO: Add multi-controlnet endpoint to comfyui-client
    console.warn(
      "Multi-ControlNet not yet supported via HTTP API. Using primary control only."
    );

    const primaryControl = controls[0];
    return this.comfyClient.generateWithControlNet({
      prompt: this.buildMultiControlPrompt(prompt, controls),
      negative_prompt: negativePrompt,
      control_image: primaryControl.image,
      control_type: this.mapControlType(primaryControl.type),
      strength: primaryControl.strength ?? 1.0,
      width,
      height,
      steps,
      cfg_scale: cfgScale,
      sampler,
      model,
      loras: loras?.map((l) => ({
        name: l.name,
        strength_model: l.strengthModel,
        strength_clip: l.strengthClip,
      })),
      seed,
      output_path: outputPath,
    });
  }

  /**
   * Generate using a preset control stack
   */
  async generateWithPreset(
    presetId: string,
    referenceImage: string,
    prompt: string,
    options: Omit<ControlNetStackRequest, "prompt" | "controls" | "outputPath"> & {
      outputPath: string;
      negativePrompt?: string;
    }
  ): Promise<GenerationResult> {
    const preset = CONTROL_STACK_PRESETS[presetId];
    if (!preset) {
      return { success: false, error: `Unknown preset: ${presetId}` };
    }

    const controls: ControlCondition[] = preset.controls.map((ctrl) => ({
      type: ctrl.type,
      image: referenceImage,
      strength: ctrl.defaultStrength,
    }));

    return this.generate({
      prompt,
      controls,
      ...options,
    });
  }

  // ==========================================================================
  // Preprocessing
  // ==========================================================================

  /**
   * Preprocess image for a specific control type
   *
   * Returns the preprocessed control image that can be used in generation.
   */
  async preprocess(
    inputImage: string,
    controlType: ControlType,
    outputPath: string,
    options?: PreprocessorOptions
  ): Promise<GenerationResult> {
    return this.comfyClient.preprocessImage({
      input_image: inputImage,
      control_type: this.mapControlType(controlType),
      output_path: outputPath,
    });
  }

  /**
   * Preprocess image for all controls in a stack
   *
   * Returns map of control type to preprocessed image path.
   */
  async preprocessForStack(
    inputImage: string,
    controlTypes: ControlType[],
    outputDir: string
  ): Promise<Map<ControlType, string>> {
    const results = new Map<ControlType, string>();

    for (const type of controlTypes) {
      const outputPath = `${outputDir}/${type}_${Date.now()}.png`;
      const result = await this.preprocess(inputImage, type, outputPath);

      if (result.success && result.localPath) {
        results.set(type, result.localPath);
      }
    }

    return results;
  }

  // ==========================================================================
  // Preset Management
  // ==========================================================================

  /**
   * List available control stack presets
   */
  listPresets(): ControlStackPreset[] {
    return Object.values(CONTROL_STACK_PRESETS);
  }

  /**
   * Get a specific preset by ID
   */
  getPreset(presetId: string): ControlStackPreset | undefined {
    return CONTROL_STACK_PRESETS[presetId];
  }

  /**
   * Get recommended presets for a use case
   */
  getPresetsForUseCase(
    useCase: "pose" | "style" | "sketch" | "continuity" | "detail"
  ): ControlStackPreset[] {
    switch (useCase) {
      case "pose":
        return [
          CONTROL_STACK_PRESETS.pose_transfer,
          CONTROL_STACK_PRESETS.pose_depth,
          CONTROL_STACK_PRESETS.detailed_pose,
        ];
      case "style":
        return [
          CONTROL_STACK_PRESETS.lineart_color,
          CONTROL_STACK_PRESETS.scene_reconstruction,
        ];
      case "sketch":
        return [
          CONTROL_STACK_PRESETS.sketch_to_render,
          CONTROL_STACK_PRESETS.lineart_color,
        ];
      case "continuity":
        return [
          CONTROL_STACK_PRESETS.panel_continuity,
          CONTROL_STACK_PRESETS.character_consistency,
        ];
      case "detail":
        return [
          CONTROL_STACK_PRESETS.detailed_pose,
          CONTROL_STACK_PRESETS.scene_reconstruction,
        ];
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * List supported control types
   */
  listControlTypes(): ControlType[] {
    return [
      "canny",
      "depth",
      "openpose",
      "lineart",
      "scribble",
      "softedge",
      "normalbae",
      "mlsd",
      "shuffle",
      "tile",
      "blur",
      "inpaint",
      "ip2p",
      "semantic_seg",
      "qrcode",
      "reference",
    ];
  }

  /**
   * List control types available for a specific model
   */
  listControlTypesForModel(model: string): ControlType[] {
    const resolver = getModelResolver();
    return resolver.listAvailableControlTypes(model);
  }

  /**
   * Get recommended strength for a control type
   */
  getRecommendedStrength(controlType: ControlType): {
    min: number;
    max: number;
    default: number;
    notes: string;
  } {
    switch (controlType) {
      case "canny":
        return {
          min: 0.3,
          max: 1.2,
          default: 0.7,
          notes: "Lower for creative freedom, higher for exact edge following",
        };
      case "depth":
        return {
          min: 0.3,
          max: 1.0,
          default: 0.5,
          notes: "Best combined with other controls for spatial guidance",
        };
      case "openpose":
        return {
          min: 0.5,
          max: 1.0,
          default: 0.85,
          notes: "High strength for accurate pose, lower for flexible interpretation",
        };
      case "lineart":
        return {
          min: 0.5,
          max: 1.2,
          default: 0.8,
          notes: "Higher values preserve line detail better",
        };
      case "scribble":
        return {
          min: 0.4,
          max: 1.0,
          default: 0.7,
          notes: "Works well with rough sketches",
        };
      case "softedge":
        return {
          min: 0.3,
          max: 0.9,
          default: 0.5,
          notes: "Subtle guidance, good for backgrounds",
        };
      default:
        return {
          min: 0.3,
          max: 1.0,
          default: 0.7,
          notes: "Adjust based on desired influence level",
        };
    }
  }

  /**
   * Calculate total control influence
   *
   * High total influence (>1.5) may cause artifacts.
   */
  calculateTotalInfluence(controls: ControlCondition[]): {
    total: number;
    warning: string | null;
  } {
    const total = controls.reduce((sum, ctrl) => sum + (ctrl.strength ?? 1.0), 0);

    let warning: string | null = null;
    if (total > 2.0) {
      warning =
        "Very high total influence. Consider reducing individual strengths to avoid artifacts.";
    } else if (total > 1.5) {
      warning = "High total influence. Some controls may fight each other.";
    }

    return { total, warning };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Map internal control type to comfyui-client control type
   * ComfyUI MCP only supports a subset of control types
   */
  private mapControlType(
    type: ControlType
  ): "canny" | "depth" | "openpose" | "lineart" | "scribble" {
    // Map to supported types in comfyui-client
    switch (type) {
      case "canny":
        return "canny";
      case "depth":
        return "depth";
      case "openpose":
        return "openpose";
      case "lineart":
      case "softedge":
        return "lineart";
      case "scribble":
      case "normalbae":
      case "mlsd":
      case "shuffle":
      case "tile":
      case "blur":
      case "inpaint":
      case "ip2p":
      case "semantic_seg":
      case "qrcode":
      case "reference":
        // Map to closest supported alternative
        return "scribble";
    }
  }

  /**
   * Build prompt that hints at multiple control usage
   */
  private buildMultiControlPrompt(
    basePrompt: string,
    controls: ControlCondition[]
  ): string {
    // Add hints based on control types being used
    const hints: string[] = [];

    if (controls.some((c) => c.type === "openpose")) {
      hints.push("accurate pose");
    }
    if (controls.some((c) => c.type === "depth")) {
      hints.push("proper depth");
    }
    if (controls.some((c) => c.type === "lineart")) {
      hints.push("clean lines");
    }

    if (hints.length > 0) {
      return `${basePrompt}, ${hints.join(", ")}`;
    }

    return basePrompt;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let stackInstance: ControlNetStackClient | null = null;

/**
 * Get the ControlNet stack client singleton
 */
export function getControlNetStack(): ControlNetStackClient {
  if (!stackInstance) {
    stackInstance = new ControlNetStackClient();
  }
  return stackInstance;
}

/**
 * Reset the ControlNet stack singleton (for testing)
 */
export function resetControlNetStack(): void {
  stackInstance = null;
}
