/**
 * ControlNet Catalog
 *
 * Registry of known ControlNet models with their family and control type compatibility.
 * The Union model is recommended for SDXL-based workflows.
 */

import type { ControlNetCatalog, ControlNetEntry } from "./types.js";
import type { ControlType } from "../controlnet-stack.js";

// ============================================================================
// ControlNet Registry
// ============================================================================

export const CONTROLNET_CATALOG: ControlNetCatalog = {
  // ==========================================================================
  // SDXL Union Model (Recommended)
  // ==========================================================================

  "union-sdxl/diffusion_pytorch_model.safetensors": {
    filename: "union-sdxl/diffusion_pytorch_model.safetensors",
    name: "ControlNet Union SDXL",
    compatibleFamilies: ["sdxl", "illustrious", "pony"],
    controlTypes: [
      "canny",
      "depth",
      "openpose",
      "scribble",
      "lineart",
      "softedge",
      "tile",
    ],
    isUnion: true,
    notes: "Single model that handles all control types for SDXL. Recommended.",
  },

  // ==========================================================================
  // SD 1.5 Legacy Models
  // ==========================================================================

  "control_v11p_sd15_openpose_fp16.safetensors": {
    filename: "control_v11p_sd15_openpose_fp16.safetensors",
    name: "OpenPose SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["openpose"],
    isUnion: false,
    preprocessor: "openpose",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11p_sd15_canny_fp16.safetensors": {
    filename: "control_v11p_sd15_canny_fp16.safetensors",
    name: "Canny SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["canny"],
    isUnion: false,
    preprocessor: "canny",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11f1p_sd15_depth_fp16.safetensors": {
    filename: "control_v11f1p_sd15_depth_fp16.safetensors",
    name: "Depth SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["depth"],
    isUnion: false,
    preprocessor: "depth_midas",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11p_sd15_lineart_fp16.safetensors": {
    filename: "control_v11p_sd15_lineart_fp16.safetensors",
    name: "Lineart SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["lineart"],
    isUnion: false,
    preprocessor: "lineart",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11p_sd15_scribble_fp16.safetensors": {
    filename: "control_v11p_sd15_scribble_fp16.safetensors",
    name: "Scribble SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["scribble"],
    isUnion: false,
    preprocessor: "scribble",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11p_sd15_seg_fp16.safetensors": {
    filename: "control_v11p_sd15_seg_fp16.safetensors",
    name: "Segmentation SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["semantic_seg"],
    isUnion: false,
    preprocessor: "semantic_seg",
    notes: "SD1.5 only. Use Union for SDXL models.",
  },

  "control_v11p_sd15_normalbae_fp16.safetensors": {
    filename: "control_v11p_sd15_normalbae_fp16.safetensors",
    name: "Normal BAE SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["normalbae"],
    isUnion: false,
    preprocessor: "normalbae",
    notes: "SD1.5 only. Normal map control.",
  },

  "control_v11e_sd15_ip2p_fp16.safetensors": {
    filename: "control_v11e_sd15_ip2p_fp16.safetensors",
    name: "InstructPix2Pix SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["ip2p"],
    isUnion: false,
    notes: "SD1.5 only. Instruction-based editing.",
  },

  // ==========================================================================
  // QR Code (Special)
  // ==========================================================================

  "control_v1p_sd15_qrcode_monster.safetensors": {
    filename: "control_v1p_sd15_qrcode_monster.safetensors",
    name: "QR Code Monster SD1.5",
    compatibleFamilies: ["sd15"],
    controlTypes: ["qrcode"],
    isUnion: false,
    notes: "QR code generation for SD1.5.",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get ControlNet entry by filename
 */
export function getControlNet(filename: string): ControlNetEntry | undefined {
  return CONTROLNET_CATALOG[filename];
}

/**
 * List all ControlNets compatible with a model family
 */
export function listControlNetsByFamily(family: string): ControlNetEntry[] {
  return Object.values(CONTROLNET_CATALOG).filter((cn) =>
    cn.compatibleFamilies.includes(family as any)
  );
}

/**
 * List all ControlNets that support a specific control type
 */
export function listControlNetsByType(
  controlType: ControlType
): ControlNetEntry[] {
  return Object.values(CONTROLNET_CATALOG).filter((cn) =>
    cn.controlTypes.includes(controlType)
  );
}

/**
 * Find the best ControlNet for a given family and control type
 * Prefers Union models when available
 */
export function findBestControlNet(
  family: string,
  controlType: ControlType
): ControlNetEntry | undefined {
  const compatible = Object.values(CONTROLNET_CATALOG).filter(
    (cn) =>
      cn.compatibleFamilies.includes(family as any) &&
      cn.controlTypes.includes(controlType)
  );

  // Prefer Union models
  const union = compatible.find((cn) => cn.isUnion);
  if (union) return union;

  // Fall back to dedicated model
  return compatible[0];
}

/**
 * Get the Union model for SDXL-compatible families
 */
export function getSDXLUnion(): ControlNetEntry | undefined {
  return CONTROLNET_CATALOG["union-sdxl/diffusion_pytorch_model.safetensors"];
}

/**
 * Control mode mapping for Union model
 * Maps our control types to Union's expected mode values
 */
export const UNION_CONTROL_MODES: Record<ControlType, number> = {
  canny: 0,
  tile: 1,
  depth: 2,
  blur: 3,
  openpose: 4,
  scribble: 5,
  lineart: 6,
  softedge: 6, // Same as lineart in Union
  normalbae: 7,
  semantic_seg: 8,
  // These may not be directly supported by Union
  qrcode: -1,
  ip2p: -1,
  inpaint: -1,
  mlsd: -1,
  shuffle: -1,
  reference: -1,
};

/**
 * Get the Union control mode for a control type
 */
export function getUnionControlMode(controlType: ControlType): number {
  return UNION_CONTROL_MODES[controlType] ?? -1;
}
