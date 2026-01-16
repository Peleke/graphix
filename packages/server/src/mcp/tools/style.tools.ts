/**
 * Style MCP Tools
 *
 * Tools for managing LoRA-based style unification across panel sequences.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getStyleService,
  type ApplyStyleOptions,
  type BatchStyleOptions,
  type LoraStackOptions,
} from "@graphix/core";
import {
  LORA_CATALOG,
  getLora,
  listLorasByCategory,
  getRecommendedStack,
} from "@graphix/core";
import { getModelResolver } from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const styleTools: Record<string, Tool> = {
  style_list_loras: {
    name: "style_list_loras",
    description:
      "List available LoRAs, optionally filtered by checkpoint compatibility or category.",
    inputSchema: {
      type: "object",
      properties: {
        checkpoint: {
          type: "string",
          description:
            "Filter by compatible checkpoint (e.g., 'novaFurryXL_ilV130.safetensors')",
        },
        category: {
          type: "string",
          enum: ["style", "character", "quality", "pose", "concept"],
          description: "Filter by LoRA category",
        },
      },
    },
  },

  style_apply: {
    name: "style_apply",
    description:
      "Apply a style LoRA to a panel's image via img2img, creating a styled version.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to apply style to",
        },
        styleLora: {
          type: "string",
          description: "LoRA filename or name (will search catalog)",
        },
        strength: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "LoRA strength (default: recommended from catalog)",
        },
        denoise: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Denoise amount for img2img (default: 0.35)",
        },
        preserveIdentity: {
          type: "boolean",
          description: "Lower denoise to preserve more of original (sets denoise to 0.25)",
        },
        outputPath: {
          type: "string",
          description: "Output path for styled image (default: original_styled.png)",
        },
      },
      required: ["panelId", "styleLora"],
    },
  },

  style_apply_batch: {
    name: "style_apply_batch",
    description:
      "Apply a style LoRA to all panels in a storyboard for unified visual appearance.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID to apply style to",
        },
        styleLora: {
          type: "string",
          description: "LoRA filename or name",
        },
        strength: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "LoRA strength",
        },
        denoise: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Denoise amount",
        },
        preserveIdentity: {
          type: "boolean",
          description: "Lower denoise to preserve identity",
        },
        outputDir: {
          type: "string",
          description: "Output directory for styled images",
        },
      },
      required: ["storyboardId", "styleLora"],
    },
  },

  lora_info: {
    name: "lora_info",
    description:
      "Get detailed information about a LoRA including trigger words, strength recommendations, and compatibility.",
    inputSchema: {
      type: "object",
      properties: {
        loraName: {
          type: "string",
          description: "LoRA filename or name to look up",
        },
      },
      required: ["loraName"],
    },
  },

  lora_suggest: {
    name: "lora_suggest",
    description:
      "Get recommended LoRA stack for a checkpoint based on intended use case.",
    inputSchema: {
      type: "object",
      properties: {
        checkpoint: {
          type: "string",
          description: "Checkpoint model to get suggestions for",
        },
        useCase: {
          type: "string",
          enum: ["comic", "realistic", "anime", "general"],
          description: "Intended use case for generation",
        },
      },
      required: ["checkpoint"],
    },
  },

  lora_build_stack: {
    name: "lora_build_stack",
    description:
      "Build a properly ordered LoRA stack with trigger words for generation.",
    inputSchema: {
      type: "object",
      properties: {
        checkpoint: {
          type: "string",
          description: "Checkpoint model being used",
        },
        characterLoras: {
          type: "array",
          items: { type: "string" },
          description: "Character identity LoRAs (applied first)",
        },
        styleLora: {
          type: "string",
          description: "Style LoRA (applied middle)",
        },
        qualityLora: {
          type: "string",
          description: "Quality enhancer LoRA (applied last)",
        },
      },
      required: ["checkpoint"],
    },
  },

  lora_validate: {
    name: "lora_validate",
    description:
      "Validate that a LoRA is compatible with a checkpoint model.",
    inputSchema: {
      type: "object",
      properties: {
        checkpoint: {
          type: "string",
          description: "Checkpoint model to validate against",
        },
        loraName: {
          type: "string",
          description: "LoRA filename or name to validate",
        },
      },
      required: ["checkpoint", "loraName"],
    },
  },
};

// ============================================================================
// Tool Handler
// ============================================================================

export async function handleStyleTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getStyleService();
  const resolver = getModelResolver();

  switch (name) {
    case "style_list_loras": {
      const checkpoint = args.checkpoint as string | undefined;
      const category = args.category as
        | "style"
        | "character"
        | "quality"
        | "pose"
        | "concept"
        | undefined;

      if (category) {
        const loras = listLorasByCategory(category);
        if (checkpoint) {
          // Filter by checkpoint compatibility
          const family = resolver.getFamily(checkpoint);
          if (family) {
            return loras.filter((l) => l.compatibleFamilies.includes(family));
          }
        }
        return loras.map((l) => ({
          filename: l.filename,
          name: l.name,
          trigger: l.trigger,
          category: l.category,
          strength: l.strength,
          notes: l.notes,
        }));
      }

      if (checkpoint) {
        return service.listAvailableLoras(checkpoint).map((l) => ({
          filename: l.filename,
          name: l.name,
          trigger: l.trigger,
          category: l.category,
          strength: l.strength,
          notes: l.notes,
        }));
      }

      // Return all LoRAs
      return Object.values(LORA_CATALOG).map((l) => ({
        filename: l.filename,
        name: l.name,
        trigger: l.trigger,
        category: l.category,
        compatibleFamilies: l.compatibleFamilies,
        strength: l.strength,
        notes: l.notes,
      }));
    }

    case "style_apply": {
      const options: ApplyStyleOptions = {
        styleLora: args.styleLora as string,
        strength: args.strength as number | undefined,
        denoise: args.denoise as number | undefined,
        preserveIdentity: args.preserveIdentity as boolean | undefined,
        outputPath: args.outputPath as string | undefined,
      };
      return service.applyStyle(args.panelId as string, options);
    }

    case "style_apply_batch": {
      const options: BatchStyleOptions = {
        styleLora: args.styleLora as string,
        strength: args.strength as number | undefined,
        denoise: args.denoise as number | undefined,
        preserveIdentity: args.preserveIdentity as boolean | undefined,
        outputDir: args.outputDir as string | undefined,
      };
      return service.applyStyleToStoryboard(args.storyboardId as string, options);
    }

    case "lora_info": {
      const info = service.getLoraInfo(args.loraName as string);
      if (!info) {
        return { error: `LoRA not found: ${args.loraName}` };
      }
      return {
        filename: info.filename,
        name: info.name,
        trigger: info.trigger,
        category: info.category,
        compatibleFamilies: info.compatibleFamilies,
        strength: info.strength,
        stackPosition: info.stackPosition,
        notes: info.notes,
      };
    }

    case "lora_suggest": {
      const useCase = (args.useCase as string) || "general";
      const stack = service.getRecommendedStack(
        args.checkpoint as string,
        useCase as "comic" | "realistic" | "anime" | "general"
      );
      return {
        checkpoint: args.checkpoint,
        useCase,
        recommendedStack: stack.map((l) => ({
          filename: l.filename,
          name: l.name,
          trigger: l.trigger,
          strength: l.strength.recommended,
          category: l.category,
        })),
      };
    }

    case "lora_build_stack": {
      const options: LoraStackOptions = {
        checkpoint: args.checkpoint as string,
        characterLoras: args.characterLoras as string[] | undefined,
        styleLora: args.styleLora as string | undefined,
        qualityLora: args.qualityLora as string | undefined,
      };
      return service.buildLoraStack(options);
    }

    case "lora_validate": {
      return service.validateLora(
        args.checkpoint as string,
        args.loraName as string
      );
    }

    default:
      throw new Error(`Unknown style tool: ${name}`);
  }
}
