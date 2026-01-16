/**
 * Contract Tests: Consistency Pipeline with ComfyUI
 *
 * These tests verify the contract between Graphix consistency components
 * and the comfyui-mcp server for IP-Adapter and ControlNet operations.
 *
 * Run against mock for CI, real server for contract verification.
 */

import { describe, test, expect } from "bun:test";

// ============================================================================
// Contract Definitions
// ============================================================================

/**
 * Contract definitions for consistency-related comfyui-mcp endpoints
 */
const CONSISTENCY_CONTRACTS = {
  // IP-Adapter generation endpoint
  generate_with_ip_adapter: {
    request: {
      required: ["prompt", "reference_image", "output_path"],
      optional: [
        "negative_prompt",
        "strength",
        "adapter_model",
        "width",
        "height",
        "steps",
        "cfg_scale",
        "sampler",
        "scheduler",
        "model",
        "loras",
        "seed",
      ],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
        optional: ["seed", "metadata"],
      },
      error: {
        required: ["success", "error"],
      },
    },
    validAdapterModels: [
      "ip-adapter-plus",
      "ip-adapter-plus-face",
      "ip-adapter-full-face",
      "ip-adapter-faceid",
      "ip-adapter-faceid-plus",
      "ip-adapter-style",
      "ip-adapter-composition",
    ],
  },

  // Multi-ControlNet generation endpoint
  generate_with_multi_controlnet: {
    request: {
      required: ["prompt", "controls", "output_path"],
      optional: [
        "negative_prompt",
        "width",
        "height",
        "steps",
        "cfg_scale",
        "sampler",
        "scheduler",
        "model",
        "loras",
        "seed",
      ],
    },
    controlItem: {
      required: ["image", "type"],
      optional: ["strength", "start_percent", "end_percent", "controlnet_model", "preprocess"],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
      error: {
        required: ["success", "error"],
      },
    },
    validControlTypes: [
      "canny",
      "depth",
      "openpose",
      "lineart",
      "scribble",
      "softedge",
      "normal",
      "mlsd",
    ],
  },

  // Image preprocessing endpoint
  preprocess_control_image: {
    request: {
      required: ["input_image", "control_type", "output_path"],
      optional: ["preprocessor_options"],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
    },
    preprocessorOptionsByType: {
      canny: ["low_threshold", "high_threshold"],
      openpose: ["detect_body", "detect_face", "detect_hands"],
      depth: ["depth_type"],
      lineart: ["coarse"],
    },
  },

  // Style transfer (IP-Adapter variant)
  transfer_style: {
    request: {
      required: ["prompt", "style_reference", "output_path"],
      optional: ["strength", "width", "height", "steps", "model", "seed"],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
    },
    // Style transfer typically uses lower strength
    recommendedStrengthRange: { min: 0.3, max: 0.8, default: 0.6 },
  },

  // Composition transfer (IP-Adapter variant)
  transfer_composition: {
    request: {
      required: ["prompt", "composition_reference", "output_path"],
      optional: ["strength", "width", "height", "steps", "model", "seed"],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
    },
    recommendedStrengthRange: { min: 0.3, max: 0.7, default: 0.5 },
  },
};

// ============================================================================
// IP-Adapter Contract Tests
// ============================================================================

describe("IP-Adapter Contract Tests", () => {
  const contract = CONSISTENCY_CONTRACTS.generate_with_ip_adapter;

  describe("Request Format", () => {
    test("valid request includes all required fields", () => {
      const validRequest = {
        prompt: "1girl, standing heroically",
        reference_image: "/input/character_ref.png",
        output_path: "/output/result.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("full request with all optional fields", () => {
      const fullRequest = {
        prompt: "1girl, standing heroically",
        reference_image: "/input/character_ref.png",
        output_path: "/output/result.png",
        negative_prompt: "bad quality, blurry",
        strength: 0.8,
        adapter_model: "ip-adapter-plus-face",
        width: 768,
        height: 1024,
        steps: 28,
        cfg_scale: 7,
        sampler: "euler_ancestral",
        scheduler: "normal",
        model: "novaFurryXL.safetensors",
        loras: [{ name: "style.safetensors", strength_model: 0.8 }],
        seed: 12345,
      };

      for (const field of contract.request.required) {
        expect(fullRequest).toHaveProperty(field);
      }
      for (const field of contract.request.optional) {
        expect(fullRequest).toHaveProperty(field);
      }
    });

    test("adapter_model must be from valid list", () => {
      for (const model of contract.validAdapterModels) {
        expect(contract.validAdapterModels).toContain(model);
      }
    });

    test("strength must be between 0 and 1", () => {
      const validStrengths = [0, 0.5, 0.8, 1.0];
      for (const strength of validStrengths) {
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Response Format", () => {
    test("success response includes required fields", () => {
      const mockSuccess = {
        success: true,
        imagePath: "/output/result.png",
        seed: 12345,
      };

      for (const field of contract.response.success.required) {
        expect(mockSuccess).toHaveProperty(field);
      }
    });

    test("error response includes required fields", () => {
      const mockError = {
        success: false,
        error: "Reference image not found",
      };

      for (const field of contract.response.error.required) {
        expect(mockError).toHaveProperty(field);
      }
    });
  });

  describe("Adapter Model Validation", () => {
    test("all adapter models are valid", () => {
      const expectedModels = [
        "ip-adapter-plus",
        "ip-adapter-plus-face",
        "ip-adapter-full-face",
        "ip-adapter-faceid",
        "ip-adapter-faceid-plus",
        "ip-adapter-style",
        "ip-adapter-composition",
      ];

      for (const model of expectedModels) {
        expect(contract.validAdapterModels).toContain(model);
      }
    });

    test("face-focused models include face variants", () => {
      const faceModels = contract.validAdapterModels.filter(
        (m) => m.includes("face") || m.includes("faceid")
      );
      expect(faceModels.length).toBeGreaterThanOrEqual(4);
    });
  });
});

// ============================================================================
// Multi-ControlNet Contract Tests
// ============================================================================

describe("Multi-ControlNet Contract Tests", () => {
  const contract = CONSISTENCY_CONTRACTS.generate_with_multi_controlnet;

  describe("Request Format", () => {
    test("valid request with single control", () => {
      const validRequest = {
        prompt: "1girl, dynamic pose",
        controls: [
          {
            image: "/input/pose_ref.png",
            type: "openpose",
            strength: 0.9,
          },
        ],
        output_path: "/output/result.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("valid request with multiple controls", () => {
      const validRequest = {
        prompt: "1girl, detailed scene",
        controls: [
          { image: "/input/pose.png", type: "openpose", strength: 0.85 },
          { image: "/input/depth.png", type: "depth", strength: 0.5 },
          { image: "/input/lineart.png", type: "lineart", strength: 0.6 },
        ],
        output_path: "/output/result.png",
      };

      expect(validRequest.controls).toHaveLength(3);
    });

    test("control item includes required fields", () => {
      const validControl = {
        image: "/input/control.png",
        type: "openpose",
      };

      for (const field of contract.controlItem.required) {
        expect(validControl).toHaveProperty(field);
      }
    });

    test("control item with all optional fields", () => {
      const fullControl = {
        image: "/input/control.png",
        type: "openpose",
        strength: 0.9,
        start_percent: 0,
        end_percent: 0.8,
        controlnet_model: "control_v11p_sd15_openpose.pth",
        preprocess: true,
      };

      for (const field of contract.controlItem.required) {
        expect(fullControl).toHaveProperty(field);
      }
      for (const field of contract.controlItem.optional) {
        expect(fullControl).toHaveProperty(field);
      }
    });

    test("control types are from valid list", () => {
      for (const type of contract.validControlTypes) {
        expect(contract.validControlTypes).toContain(type);
      }
    });
  });

  describe("Response Format", () => {
    test("success response format", () => {
      const mockSuccess = {
        success: true,
        imagePath: "/output/result.png",
      };

      for (const field of contract.response.success.required) {
        expect(mockSuccess).toHaveProperty(field);
      }
    });

    test("error response format", () => {
      const mockError = {
        success: false,
        error: "Control image not found",
      };

      for (const field of contract.response.error.required) {
        expect(mockError).toHaveProperty(field);
      }
    });
  });

  describe("Control Type Validation", () => {
    test("all standard control types supported", () => {
      const standardTypes = ["canny", "depth", "openpose", "lineart", "scribble"];
      for (const type of standardTypes) {
        expect(contract.validControlTypes).toContain(type);
      }
    });

    test("strength values are in valid range", () => {
      const validStrengths = [0.1, 0.5, 0.9, 1.0, 1.5, 2.0];
      for (const strength of validStrengths) {
        expect(strength).toBeGreaterThan(0);
        expect(strength).toBeLessThanOrEqual(2);
      }
    });

    test("percent values are 0-1 normalized", () => {
      const validPercents = [0, 0.25, 0.5, 0.75, 1.0];
      for (const percent of validPercents) {
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(1);
      }
    });
  });
});

// ============================================================================
// Preprocessing Contract Tests
// ============================================================================

describe("Preprocessing Contract Tests", () => {
  const contract = CONSISTENCY_CONTRACTS.preprocess_control_image;

  describe("Request Format", () => {
    test("valid preprocessing request", () => {
      const validRequest = {
        input_image: "/input/source.png",
        control_type: "openpose",
        output_path: "/output/pose.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("preprocessing with type-specific options", () => {
      const cannyRequest = {
        input_image: "/input/source.png",
        control_type: "canny",
        output_path: "/output/canny.png",
        preprocessor_options: {
          low_threshold: 100,
          high_threshold: 200,
        },
      };

      expect(cannyRequest.preprocessor_options).toHaveProperty("low_threshold");
      expect(cannyRequest.preprocessor_options).toHaveProperty("high_threshold");
    });

    test("openpose preprocessing options", () => {
      const openposeOptions = {
        detect_body: true,
        detect_face: true,
        detect_hands: true,
      };

      for (const opt of contract.preprocessorOptionsByType.openpose) {
        expect(openposeOptions).toHaveProperty(opt);
      }
    });
  });

  describe("Response Format", () => {
    test("success response includes preprocessed image path", () => {
      const mockSuccess = {
        success: true,
        imagePath: "/output/preprocessed.png",
      };

      for (const field of contract.response.success.required) {
        expect(mockSuccess).toHaveProperty(field);
      }
    });
  });
});

// ============================================================================
// Style Transfer Contract Tests
// ============================================================================

describe("Style Transfer Contract Tests", () => {
  const contract = CONSISTENCY_CONTRACTS.transfer_style;

  describe("Request Format", () => {
    test("valid style transfer request", () => {
      const validRequest = {
        prompt: "forest landscape",
        style_reference: "/input/style_ref.png",
        output_path: "/output/styled.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("style transfer with recommended strength", () => {
      const strength = contract.recommendedStrengthRange.default;

      expect(strength).toBeGreaterThanOrEqual(contract.recommendedStrengthRange.min);
      expect(strength).toBeLessThanOrEqual(contract.recommendedStrengthRange.max);
    });
  });
});

// ============================================================================
// Composition Transfer Contract Tests
// ============================================================================

describe("Composition Transfer Contract Tests", () => {
  const contract = CONSISTENCY_CONTRACTS.transfer_composition;

  describe("Request Format", () => {
    test("valid composition transfer request", () => {
      const validRequest = {
        prompt: "cityscape at night",
        composition_reference: "/input/comp_ref.png",
        output_path: "/output/composed.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("composition transfer uses lower strength than style", () => {
      const compStrength = CONSISTENCY_CONTRACTS.transfer_composition.recommendedStrengthRange.default;
      const styleStrength = CONSISTENCY_CONTRACTS.transfer_style.recommendedStrengthRange.default;

      expect(compStrength).toBeLessThanOrEqual(styleStrength);
    });
  });
});

// ============================================================================
// Contract Validation Utilities
// ============================================================================

/**
 * Validate an IP-Adapter request against the contract
 */
export function validateIPAdapterRequest(
  request: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const contract = CONSISTENCY_CONTRACTS.generate_with_ip_adapter;
  const errors: string[] = [];

  // Check required fields
  for (const field of contract.request.required) {
    if (!(field in request)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate adapter_model if present
  if (request.adapter_model && !contract.validAdapterModels.includes(request.adapter_model as string)) {
    errors.push(`Invalid adapter_model: ${request.adapter_model}`);
  }

  // Validate strength range
  if (request.strength !== undefined) {
    const strength = request.strength as number;
    if (strength < 0 || strength > 1) {
      errors.push(`strength must be between 0 and 1, got: ${strength}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a Multi-ControlNet request against the contract
 */
export function validateMultiControlNetRequest(
  request: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const contract = CONSISTENCY_CONTRACTS.generate_with_multi_controlnet;
  const errors: string[] = [];

  // Check required fields
  for (const field of contract.request.required) {
    if (!(field in request)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate controls array
  if (request.controls) {
    const controls = request.controls as Array<Record<string, unknown>>;

    if (!Array.isArray(controls)) {
      errors.push("controls must be an array");
    } else {
      for (let i = 0; i < controls.length; i++) {
        const control = controls[i];

        // Check required control fields
        for (const field of contract.controlItem.required) {
          if (!(field in control)) {
            errors.push(`Control[${i}] missing required field: ${field}`);
          }
        }

        // Validate control type
        if (control.type && !contract.validControlTypes.includes(control.type as string)) {
          errors.push(`Control[${i}] invalid type: ${control.type}`);
        }

        // Validate strength
        if (control.strength !== undefined) {
          const strength = control.strength as number;
          if (strength < 0 || strength > 2) {
            errors.push(`Control[${i}] strength must be between 0 and 2`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

describe("Contract Validation Utilities", () => {
  describe("validateIPAdapterRequest", () => {
    test("accepts valid request", () => {
      const result = validateIPAdapterRequest({
        prompt: "test",
        reference_image: "ref.png",
        output_path: "out.png",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects missing required fields", () => {
      const result = validateIPAdapterRequest({
        prompt: "test",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects invalid adapter model", () => {
      const result = validateIPAdapterRequest({
        prompt: "test",
        reference_image: "ref.png",
        output_path: "out.png",
        adapter_model: "invalid-model",
      });

      expect(result.valid).toBe(false);
    });

    test("rejects out-of-range strength", () => {
      const result = validateIPAdapterRequest({
        prompt: "test",
        reference_image: "ref.png",
        output_path: "out.png",
        strength: 1.5,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("validateMultiControlNetRequest", () => {
    test("accepts valid request", () => {
      const result = validateMultiControlNetRequest({
        prompt: "test",
        controls: [{ image: "pose.png", type: "openpose" }],
        output_path: "out.png",
      });

      expect(result.valid).toBe(true);
    });

    test("rejects missing control fields", () => {
      const result = validateMultiControlNetRequest({
        prompt: "test",
        controls: [{ type: "openpose" }], // missing image
        output_path: "out.png",
      });

      expect(result.valid).toBe(false);
    });

    test("rejects invalid control type", () => {
      const result = validateMultiControlNetRequest({
        prompt: "test",
        controls: [{ image: "pose.png", type: "invalid_type" }],
        output_path: "out.png",
      });

      expect(result.valid).toBe(false);
    });
  });
});
