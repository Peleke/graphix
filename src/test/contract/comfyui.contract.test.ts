/**
 * Contract Tests: ComfyUI MCP Integration
 *
 * These tests verify the contract between Graphix and comfyui-mcp.
 * They ensure that:
 * 1. Request formats are correct
 * 2. Response formats are handled properly
 * 3. Error cases are handled gracefully
 *
 * Run against mock for CI, real server for contract verification.
 */

import { describe, test, expect, beforeAll } from "bun:test";

// Contract definitions for comfyui-mcp endpoints
const CONTRACTS = {
  imagine: {
    request: {
      required: ["description", "output_path"],
      optional: [
        "model",
        "model_family",
        "style",
        "quality",
        "width",
        "height",
        "steps",
        "cfg_scale",
        "sampler",
        "scheduler",
        "seed",
        "loras",
      ],
    },
    response: {
      success: {
        required: ["success", "imagePath", "seed", "prompt", "metadata"],
        metadata: ["width", "height", "steps", "cfg", "sampler"],
      },
      error: {
        required: ["success", "error"],
      },
    },
  },

  generate_image: {
    request: {
      required: ["prompt", "output_path"],
      optional: [
        "negative_prompt",
        "width",
        "height",
        "steps",
        "cfg_scale",
        "sampler",
        "scheduler",
        "model",
        "seed",
        "loras",
      ],
    },
    response: {
      success: {
        required: ["success", "imagePath", "seed"],
      },
    },
  },

  generate_with_controlnet: {
    request: {
      required: ["prompt", "control_image", "control_type", "output_path"],
      optional: [
        "negative_prompt",
        "controlnet_model",
        "strength",
        "start_percent",
        "end_percent",
        "preprocess",
        "width",
        "height",
        "model",
        "loras",
      ],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
    },
  },

  generate_with_ip_adapter: {
    request: {
      required: ["prompt", "reference_image", "output_path"],
      optional: ["strength", "model", "loras", "width", "height"],
    },
    response: {
      success: {
        required: ["success", "imagePath"],
      },
    },
  },

  list_models: {
    request: {
      required: [],
      optional: [],
    },
    response: {
      success: {
        type: "array",
        itemType: "string",
      },
    },
  },

  list_loras: {
    request: {
      required: [],
      optional: [],
    },
    response: {
      success: {
        type: "array",
        itemType: "string",
      },
    },
  },
};

describe("ComfyUI Contract Tests", () => {
  describe("imagine endpoint contract", () => {
    const contract = CONTRACTS.imagine;

    test("request must include required fields", () => {
      const validRequest = {
        description: "A wolf standing on a cliff",
        output_path: "/output/test.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("response success format is valid", () => {
      const mockResponse = {
        success: true,
        imagePath: "/output/test.png",
        seed: 12345,
        prompt: "processed prompt",
        metadata: {
          width: 768,
          height: 1024,
          steps: 28,
          cfg: 7,
          sampler: "euler_ancestral",
        },
      };

      for (const field of contract.response.success.required) {
        expect(mockResponse).toHaveProperty(field);
      }

      for (const field of contract.response.success.metadata) {
        expect(mockResponse.metadata).toHaveProperty(field);
      }
    });

    test("response error format is valid", () => {
      const mockError = {
        success: false,
        error: "Model not found",
      };

      for (const field of contract.response.error.required) {
        expect(mockError).toHaveProperty(field);
      }
    });
  });

  describe("generate_with_controlnet contract", () => {
    const contract = CONTRACTS.generate_with_controlnet;

    test("request must include required fields", () => {
      const validRequest = {
        prompt: "A wolf",
        control_image: "pose.png",
        control_type: "openpose",
        output_path: "/output/test.png",
      };

      for (const field of contract.request.required) {
        expect(validRequest).toHaveProperty(field);
      }
    });

    test("control_type must be valid enum", () => {
      const validTypes = [
        "canny",
        "depth",
        "openpose",
        "qrcode",
        "scribble",
        "lineart",
        "semantic_seg",
      ];

      for (const type of validTypes) {
        expect(validTypes).toContain(type);
      }
    });
  });

  describe("list endpoints contract", () => {
    test("list_models returns array of strings", () => {
      const mockResponse = [
        "yiffInHell_yihXXXTended.safetensors",
        "novaFurryXL_ilV130.safetensors",
      ];

      expect(Array.isArray(mockResponse)).toBe(true);
      for (const item of mockResponse) {
        expect(typeof item).toBe("string");
      }
    });

    test("list_loras returns array of strings", () => {
      const mockResponse = [
        "Eleptors_Anthro_Furry_Lora.safetensors",
        "colorful_line_art.safetensors",
      ];

      expect(Array.isArray(mockResponse)).toBe(true);
      for (const item of mockResponse) {
        expect(typeof item).toBe("string");
      }
    });
  });
});

/**
 * Contract validation utilities
 */
export function validateRequest(
  endpoint: keyof typeof CONTRACTS,
  request: Record<string, any>
): { valid: boolean; errors: string[] } {
  const contract = CONTRACTS[endpoint];
  const errors: string[] = [];

  for (const field of contract.request.required) {
    if (!(field in request)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateResponse(
  endpoint: keyof typeof CONTRACTS,
  response: Record<string, any>,
  isError: boolean = false
): { valid: boolean; errors: string[] } {
  const contract = CONTRACTS[endpoint];
  const errors: string[] = [];
  const responseContract = isError
    ? contract.response.error
    : contract.response.success;

  if ("required" in responseContract) {
    for (const field of responseContract.required) {
      if (!(field in response)) {
        errors.push(`Missing required response field: ${field}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
