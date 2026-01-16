/**
 * Batch Operations MCP Tools
 *
 * Tools for efficient batch operations on panels, captions, and generation.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getBatchService,
  type BatchPanelInput,
  type CreateCaptionInput,
  type CaptionType,
  type CaptionPosition,
  type CaptionStyle,
  type PanelDirection,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const batchTools: Record<string, Tool> = {
  panels_create_batch: {
    name: "panels_create_batch",
    description:
      "Create multiple panels in a storyboard at once. " +
      "Panels are created in order. Positions auto-increment if not specified.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard to add panels to",
        },
        panels: {
          type: "array",
          description: "Panel definitions",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Panel description/prompt",
              },
              position: {
                type: "number",
                description: "Position in storyboard (auto if not set)",
              },
              characterIds: {
                type: "array",
                items: { type: "string" },
                description: "Character IDs to include",
              },
              direction: {
                type: "object",
                description: "Direction hints",
                properties: {
                  cameraAngle: { type: "string" },
                  lighting: { type: "string" },
                  mood: { type: "string" },
                  shotType: { type: "string" },
                },
              },
            },
          },
        },
      },
      required: ["storyboardId", "panels"],
    },
  },

  panels_delete_batch: {
    name: "panels_delete_batch",
    description: "Delete multiple panels at once.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to delete",
        },
      },
      required: ["panelIds"],
    },
  },

  captions_add_batch: {
    name: "captions_add_batch",
    description:
      "Add captions to multiple panels at once. " +
      "Each input specifies which panel to add the caption to.",
    inputSchema: {
      type: "object",
      properties: {
        captions: {
          type: "array",
          description: "Caption inputs",
          items: {
            type: "object",
            properties: {
              panelId: {
                type: "string",
                description: "Panel to add caption to",
              },
              type: {
                type: "string",
                enum: ["dialogue", "thought", "narration", "sfx", "caption", "whisper", "yell"],
                description: "Caption type",
              },
              text: {
                type: "string",
                description: "Caption text",
              },
              characterId: {
                type: "string",
                description: "Character ID (for dialogue/thought)",
              },
              position: {
                type: "object",
                description: "Position { x: 0-100, y: 0-100, anchor }",
                properties: {
                  x: { type: "number", minimum: 0, maximum: 100 },
                  y: { type: "number", minimum: 0, maximum: 100 },
                  anchor: {
                    type: "string",
                    enum: [
                      "top-left",
                      "top-center",
                      "top-right",
                      "middle-left",
                      "middle-center",
                      "middle-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ],
                  },
                },
                required: ["x", "y"],
              },
              tailDirection: {
                type: "object",
                description: "Tail direction for speech bubbles",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
              },
              style: {
                type: "object",
                description: "Style overrides",
              },
              zIndex: {
                type: "number",
                description: "Z-index for layering",
              },
            },
            required: ["panelId", "type", "text", "position"],
          },
        },
      },
      required: ["captions"],
    },
  },

  captions_clear_batch: {
    name: "captions_clear_batch",
    description: "Clear all captions from multiple panels.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to clear captions from",
        },
      },
      required: ["panelIds"],
    },
  },

  panels_generate_batch: {
    name: "panels_generate_batch",
    description:
      "Generate images for multiple panels. " +
      "Processes sequentially to avoid overwhelming the generation server. " +
      "Returns results for each panel including success/failure status.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to generate",
        },
        options: {
          type: "object",
          description: "Generation options applied to all panels",
          properties: {
            sizePreset: {
              type: "string",
              description: "Size preset name",
            },
            qualityPreset: {
              type: "string",
              enum: ["draft", "standard", "production", "ultra"],
              description: "Quality preset",
            },
            model: {
              type: "string",
              description: "Model override",
            },
            seed: {
              type: "number",
              description: "Base seed (incremented for each panel)",
            },
            uploadToCloud: {
              type: "boolean",
              description: "Upload to cloud storage (default: true)",
            },
          },
        },
        continueOnError: {
          type: "boolean",
          description: "Continue if a panel fails (default: true)",
        },
      },
      required: ["panelIds"],
    },
  },

  panels_generate_variants_batch: {
    name: "panels_generate_variants_batch",
    description: "Generate multiple variants for each of multiple panels.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to generate variants for",
        },
        variantCount: {
          type: "number",
          description: "Number of variants per panel (default: 3)",
        },
        options: {
          type: "object",
          description: "Generation options",
          properties: {
            sizePreset: { type: "string" },
            qualityPreset: { type: "string" },
            model: { type: "string" },
            uploadToCloud: { type: "boolean" },
          },
        },
        continueOnError: {
          type: "boolean",
          description: "Continue if generation fails (default: true)",
        },
      },
      required: ["panelIds"],
    },
  },

  panels_render_captions_batch: {
    name: "panels_render_captions_batch",
    description:
      "Render captions onto generated images for multiple panels. " +
      "Each panel's selected output image is composited with its captions.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to render",
        },
        outputDir: {
          type: "string",
          description: "Output directory for rendered images",
        },
        format: {
          type: "string",
          enum: ["png", "jpeg", "webp"],
          description: "Output format (default: png)",
        },
        continueOnError: {
          type: "boolean",
          description: "Continue if a panel fails (default: true)",
        },
      },
      required: ["panelIds", "outputDir"],
    },
  },

  panels_select_outputs_batch: {
    name: "panels_select_outputs_batch",
    description: "Select outputs for multiple panels at once.",
    inputSchema: {
      type: "object",
      properties: {
        selections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              panelId: { type: "string" },
              outputId: { type: "string" },
            },
            required: ["panelId", "outputId"],
          },
          description: "Panel-output mappings",
        },
      },
      required: ["selections"],
    },
  },

  panels_auto_select_batch: {
    name: "panels_auto_select_batch",
    description:
      "Auto-select the first or latest generated image for multiple panels.",
    inputSchema: {
      type: "object",
      properties: {
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs to auto-select for",
        },
        mode: {
          type: "string",
          enum: ["first", "latest"],
          description: "Selection mode (default: latest)",
        },
      },
      required: ["panelIds"],
    },
  },

  storyboard_get_panel_ids: {
    name: "storyboard_get_panel_ids",
    description: "Get all panel IDs from a storyboard in position order.",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID",
        },
      },
      required: ["storyboardId"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleBatchTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getBatchService();

  switch (name) {
    case "panels_create_batch": {
      const { storyboardId, panels } = args as {
        storyboardId: string;
        panels: BatchPanelInput[];
      };

      // Validate required parameters
      if (!storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }
      if (!panels || !Array.isArray(panels)) {
        return { success: false, error: "panels array is required" };
      }

      const result = await service.createPanels(storyboardId, panels);

      return {
        ...result,
        summary: {
          requested: panels.length,
          created: result.created.length,
          failed: result.errors.length,
        },
      };
    }

    case "panels_delete_batch": {
      const { panelIds } = args as { panelIds: string[] };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }

      const result = await service.deletePanels(panelIds);

      return {
        ...result,
        summary: {
          requested: panelIds.length,
          deleted: result.deleted.length,
          failed: result.errors.length,
        },
      };
    }

    case "captions_add_batch": {
      const { captions } = args as {
        captions: Array<{
          panelId: string;
          type: CaptionType;
          text: string;
          characterId?: string;
          position: CaptionPosition;
          tailDirection?: CaptionPosition;
          style?: Partial<CaptionStyle>;
          zIndex?: number;
        }>;
      };

      // Validate required parameters
      if (!captions || !Array.isArray(captions)) {
        return { success: false, error: "captions array is required" };
      }

      // Transform to BatchCaptionInput format
      const inputs = captions.map((c) => ({
        panelId: c.panelId,
        caption: {
          panelId: c.panelId,
          type: c.type,
          text: c.text,
          characterId: c.characterId,
          position: c.position,
          tailDirection: c.tailDirection,
          style: c.style,
          zIndex: c.zIndex,
        } as CreateCaptionInput,
      }));

      const result = await service.addCaptions(inputs);

      return {
        ...result,
        summary: {
          requested: captions.length,
          created: result.created.length,
          failed: result.errors.length,
        },
      };
    }

    case "captions_clear_batch": {
      const { panelIds } = args as { panelIds: string[] };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }

      const result = await service.clearCaptions(panelIds);

      return {
        ...result,
        summary: {
          panels: panelIds.length,
          captionsCleared: result.cleared,
        },
      };
    }

    case "panels_generate_batch": {
      const { panelIds, options, continueOnError } = args as {
        panelIds: string[];
        options?: Record<string, unknown>;
        continueOnError?: boolean;
      };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }

      const result = await service.generatePanels(panelIds, {
        ...options,
        continueOnError,
      });

      return {
        ...result,
        summary: {
          requested: panelIds.length,
          generated: result.totalGenerated,
          failed: result.totalFailed,
        },
      };
    }

    case "panels_generate_variants_batch": {
      const { panelIds, variantCount, options, continueOnError } = args as {
        panelIds: string[];
        variantCount?: number;
        options?: Record<string, unknown>;
        continueOnError?: boolean;
      };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }

      const result = await service.generateVariants(panelIds, variantCount, {
        ...options,
        continueOnError,
      });

      return {
        ...result,
        summary: {
          panels: panelIds.length,
          variantsPerPanel: variantCount ?? 3,
          totalGenerated: result.totalGenerated,
          totalFailed: result.totalFailed,
        },
      };
    }

    case "panels_render_captions_batch": {
      const { panelIds, outputDir, format, continueOnError } = args as {
        panelIds: string[];
        outputDir: string;
        format?: "png" | "jpeg" | "webp";
        continueOnError?: boolean;
      };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }
      if (!outputDir) {
        return { success: false, error: "outputDir is required" };
      }

      const result = await service.renderCaptions(panelIds, {
        outputDir,
        format,
        continueOnError,
      });

      return {
        ...result,
        summary: {
          requested: panelIds.length,
          rendered: result.totalRendered,
          failed: result.totalFailed,
          outputDir,
        },
      };
    }

    case "panels_select_outputs_batch": {
      const { selections } = args as {
        selections: Array<{ panelId: string; outputId: string }>;
      };

      // Validate required parameters
      if (!selections || !Array.isArray(selections)) {
        return { success: false, error: "selections array is required" };
      }

      const result = await service.selectOutputs(selections);

      return {
        ...result,
        summary: {
          requested: selections.length,
          selected: result.selected,
          failed: result.errors.length,
        },
      };
    }

    case "panels_auto_select_batch": {
      const { panelIds, mode } = args as {
        panelIds: string[];
        mode?: "first" | "latest";
      };

      // Validate required parameters
      if (!panelIds || !Array.isArray(panelIds)) {
        return { success: false, error: "panelIds array is required" };
      }

      const result = await service.autoSelectOutputs(panelIds, mode);

      return {
        ...result,
        summary: {
          panels: panelIds.length,
          selected: result.selected,
          skipped: result.skipped,
          failed: result.errors.length,
        },
      };
    }

    case "storyboard_get_panel_ids": {
      const { storyboardId } = args as { storyboardId: string };

      // Validate required parameters
      if (!storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const panelIds = await service.getPanelIds(storyboardId);

      return {
        storyboardId,
        panelIds,
        count: panelIds.length,
      };
    }

    default:
      throw new Error(`Unknown batch tool: ${name}`);
  }
}
