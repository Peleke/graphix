/**
 * Consistency MCP Tools
 *
 * Tools for maintaining visual consistency across panels via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getConsistencyService,
  type ExtractIdentityOptions,
  type ApplyIdentityOptions,
  type ChainOptions,
  type ReferenceSheetOptions,
} from "../../../services/consistency.service.js";
import { getIPAdapter, type IPAdapterModel } from "../../../generation/ip-adapter.js";
import { getControlNetStack, CONTROL_STACK_PRESETS } from "../../../generation/controlnet-stack.js";
import type { QualityPresetId } from "../../../generation/config/types.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const consistencyTools: Record<string, Tool> = {
  consistency_extract_identity: {
    name: "consistency_extract_identity",
    description:
      "Extract character identity from reference image(s) or panel(s) for reuse in future generations. Creates a stored identity that maintains character consistency.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for this identity (e.g., 'Main Character', 'Villain')",
        },
        description: {
          type: "string",
          description: "Optional description of the character",
        },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs or image file paths to extract identity from",
        },
        sourcesArePanelIds: {
          type: "boolean",
          description: "Whether sources are panel IDs (true) or file paths (false). Default true.",
        },
        adapterModel: {
          type: "string",
          enum: [
            "ip-adapter-plus",
            "ip-adapter-plus-face",
            "ip-adapter-full-face",
            "ip-adapter-faceid",
            "ip-adapter-faceid-plus",
            "ip-adapter-style",
            "ip-adapter-composition",
          ],
          description: "IP-Adapter model variant. Default: ip-adapter-plus-face for character work.",
        },
      },
      required: ["name", "sources"],
    },
  },

  consistency_apply_identity: {
    name: "consistency_apply_identity",
    description:
      "Apply a stored identity to a panel, generating an image that maintains character consistency with the reference.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to generate for",
        },
        identityId: {
          type: "string",
          description: "Identity ID to apply (from extract_identity)",
        },
        strength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Identity preservation strength (0-1, default from identity)",
        },
        prompt: {
          type: "string",
          description: "Additional prompt to merge with panel description",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset (default: standard)",
        },
        seed: {
          type: "number",
          description: "Seed for reproducibility",
        },
      },
      required: ["panelId", "identityId"],
    },
  },

  consistency_chain_panels: {
    name: "consistency_chain_panels",
    description:
      "Chain generation from a previous panel, maintaining continuity in pose, composition, identity, or style.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to generate for",
        },
        previousPanelId: {
          type: "string",
          description: "Previous panel ID to chain from",
        },
        maintain: {
          type: "object",
          properties: {
            identity: {
              type: "boolean",
              description: "Maintain character identity (face, features)",
            },
            pose: {
              type: "boolean",
              description: "Maintain character pose/position",
            },
            composition: {
              type: "boolean",
              description: "Maintain scene composition/layout",
            },
            style: {
              type: "boolean",
              description: "Maintain visual style",
            },
          },
          description: "What aspects to maintain from previous panel",
        },
        continuityStrength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Overall continuity strength (0-1, default 0.7)",
        },
        prompt: {
          type: "string",
          description: "Additional prompt modifications",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset (default: standard)",
        },
      },
      required: ["panelId", "previousPanelId"],
    },
  },

  consistency_list_identities: {
    name: "consistency_list_identities",
    description: "List all stored character identities",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  consistency_get_identity: {
    name: "consistency_get_identity",
    description: "Get details of a stored identity",
    inputSchema: {
      type: "object",
      properties: {
        identityId: {
          type: "string",
          description: "Identity ID",
        },
      },
      required: ["identityId"],
    },
  },

  consistency_delete_identity: {
    name: "consistency_delete_identity",
    description: "Delete a stored identity",
    inputSchema: {
      type: "object",
      properties: {
        identityId: {
          type: "string",
          description: "Identity ID to delete",
        },
      },
      required: ["identityId"],
    },
  },

  consistency_create_reference_sheet: {
    name: "consistency_create_reference_sheet",
    description:
      "Generate a reference sheet for a character identity with multiple poses and optionally expressions.",
    inputSchema: {
      type: "object",
      properties: {
        identityId: {
          type: "string",
          description: "Identity ID to create sheet for",
        },
        poseCount: {
          type: "number",
          minimum: 1,
          maximum: 8,
          description: "Number of poses to generate (default: 4)",
        },
        poses: {
          type: "array",
          items: { type: "string" },
          description: "Specific poses to include (e.g., 'front view', 'side view')",
        },
        includeExpressions: {
          type: "boolean",
          description: "Include expression variants (default: false)",
        },
        outputDir: {
          type: "string",
          description: "Output directory for reference sheet images",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset (default: high for reference sheets)",
        },
      },
      required: ["identityId", "outputDir"],
    },
  },

  consistency_chain_sequence: {
    name: "consistency_chain_sequence",
    description:
      "Chain an entire sequence of panels, maintaining continuity from one panel to the next.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs in sequence order (first panel is reference, rest will be generated)",
        },
        maintain: {
          type: "object",
          properties: {
            identity: { type: "boolean" },
            pose: { type: "boolean" },
            composition: { type: "boolean" },
            style: { type: "boolean" },
          },
          description: "What aspects to maintain between panels",
        },
        continuityStrength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Overall continuity strength",
        },
        qualityPreset: {
          type: "string",
          enum: ["draft", "standard", "high", "ultra"],
          description: "Quality preset",
        },
      },
      required: ["panelIds"],
    },
  },

  consistency_list_adapter_models: {
    name: "consistency_list_adapter_models",
    description: "List available IP-Adapter models with their recommended settings",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  consistency_list_control_presets: {
    name: "consistency_list_control_presets",
    description: "List available ControlNet stack presets for different continuity scenarios",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleConsistencyTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const consistency = getConsistencyService();
  const ipAdapter = getIPAdapter();
  const controlStack = getControlNetStack();

  switch (toolName) {
    case "consistency_extract_identity": {
      const result = await consistency.extractIdentity({
        name: args.name as string,
        description: args.description as string | undefined,
        sources: args.sources as string[],
        sourcesArePanelIds: (args.sourcesArePanelIds as boolean) ?? true,
        adapterModel: args.adapterModel as IPAdapterModel | undefined,
      });

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  identityId: result.identityId,
                  message: `Identity "${args.name}" created successfully`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: false, error: result.error }, null, 2) },
        ],
      };
    }

    case "consistency_apply_identity": {
      const result = await consistency.applyIdentity({
        panelId: args.panelId as string,
        identityId: args.identityId as string,
        strength: args.strength as number | undefined,
        prompt: args.prompt as string | undefined,
        qualityPreset: args.qualityPreset as QualityPresetId | undefined,
        seed: args.seed as number | undefined,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: result.success,
                panelId: result.panelId,
                generatedPath: result.generationResult?.localPath,
                seed: result.generationResult?.seed,
                error: result.error,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_chain_panels": {
      const maintain = (args.maintain as ChainOptions["maintain"]) ?? {
        identity: true,
        pose: false,
        composition: false,
        style: false,
      };

      const result = await consistency.chainFromPrevious({
        panelId: args.panelId as string,
        previousPanelId: args.previousPanelId as string,
        maintain,
        continuityStrength: args.continuityStrength as number | undefined,
        prompt: args.prompt as string | undefined,
        qualityPreset: args.qualityPreset as QualityPresetId | undefined,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: result.success,
                panelId: result.panelId,
                generatedPath: result.generationResult?.localPath,
                seed: result.generationResult?.seed,
                error: result.error,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_list_identities": {
      const identities = consistency.listIdentities();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: identities.length,
                identities: identities.map((id) => ({
                  id: id.id,
                  name: id.name,
                  description: id.description,
                  adapterModel: id.embedding.adapterModel,
                  referenceCount: id.referenceImages.length,
                  usageCount: id.usageCount,
                  createdAt: id.createdAt,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_get_identity": {
      const identity = consistency.getIdentity(args.identityId as string);
      if (!identity) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: "Identity not found" }, null, 2),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                identity: {
                  id: identity.id,
                  name: identity.name,
                  description: identity.description,
                  adapterModel: identity.embedding.adapterModel,
                  defaultStrength: identity.defaultStrength,
                  referenceImages: identity.referenceImages,
                  usageCount: identity.usageCount,
                  createdAt: identity.createdAt,
                  lastUsedAt: identity.lastUsedAt,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_delete_identity": {
      const deleted = consistency.deleteIdentity(args.identityId as string);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: deleted,
                message: deleted
                  ? "Identity deleted"
                  : "Identity not found or already deleted",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_create_reference_sheet": {
      const result = await consistency.generateReferenceSheet({
        identityId: args.identityId as string,
        poseCount: args.poseCount as number | undefined,
        poses: args.poses as string[] | undefined,
        includeExpressions: (args.includeExpressions as boolean) ?? false,
        outputDir: args.outputDir as string,
        qualityPreset: (args.qualityPreset as QualityPresetId) ?? "high",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: result.success,
                imageCount: result.images.length,
                images: result.images,
                error: result.error,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_chain_sequence": {
      const maintain = (args.maintain as ChainOptions["maintain"]) ?? {
        identity: true,
        pose: false,
      };

      const result = await consistency.chainSequence(args.panelIds as string[], {
        maintain,
        continuityStrength: args.continuityStrength as number | undefined,
        qualityPreset: args.qualityPreset as QualityPresetId | undefined,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: result.successCount === result.results.length,
                totalPanels: result.results.length,
                successCount: result.successCount,
                results: result.results.map((r) => ({
                  panelId: r.panelId,
                  success: r.success,
                  error: r.error,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_list_adapter_models": {
      const models = ipAdapter.listAdapterModels();
      const modelInfo = models.map((model) => ({
        model,
        ...ipAdapter.getRecommendedSettings(model),
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: models.length,
                models: modelInfo,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "consistency_list_control_presets": {
      const presets = controlStack.listPresets();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: presets.length,
                presets: presets.map((p) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  controls: p.controls,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: `Unknown tool: ${toolName}` }, null, 2) },
        ],
      };
  }
}
