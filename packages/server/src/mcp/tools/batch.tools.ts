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
      "Insert multiple empty panel records into a single storyboard in one call. " +
      "Call after scaffolding a storyboard when you need to add panels that were not part of the original outline, or when building a storyboard incrementally. " +
      "This only creates panel metadata (description, position, characters) -- no image generation happens. Use panels_generate_batch to generate images afterward. " +
      "Returns { created: [{ id, position }], errors: [], summary: { requested, created, failed } }. Response ~0.5-2 KB.",
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
    description:
      "Permanently delete multiple panels by ID in a single call. " +
      "Call when removing scenes or restructuring a storyboard. Deletes panel records, their outputs, and captions. " +
      "Returns { deleted: [panelId], errors: [], summary: { requested, deleted, failed } }. Response ~0.5 KB. " +
      "Irreversible -- unlike captions_clear_batch (which only removes caption overlays), this destroys the panels themselves.",
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
      "Attach caption records (dialogue bubbles, thought bubbles, narration boxes, SFX) to multiple panels in one call. " +
      "Call after panels have generated images and you want to add text overlays. Each caption specifies panelId, type, text, and x/y position (0-100 coordinate space). " +
      "This writes caption metadata only -- use panels_render_captions_batch to composite them onto images. " +
      "Returns { created: [{ id, panelId }], errors: [], summary: { requested, created, failed } }. Response ~1-3 KB.",
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
    description:
      "Remove all caption records from multiple panels in one call. " +
      "Call when re-doing dialogue/narration or before re-adding captions with captions_add_batch. " +
      "Only deletes caption metadata -- panel images and outputs are untouched. Unlike panels_delete_batch (which destroys entire panels), this only strips text overlays. " +
      "Returns { cleared: number, summary: { panels, captionsCleared } }. Response ~0.3 KB.",
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
      "Trigger image generation (GPU) for multiple panels sequentially. " +
      "Call after panels exist (via panels_create_batch or story_scaffold) and you want to produce one image per panel. " +
      "EXPENSIVE: runs ComfyUI inference per panel, 5-60s each depending on quality preset. For multiple variants per panel, use panels_generate_variants_batch instead. " +
      "Returns { results: [{ panelId, outputId, success }], summary: { requested, generated, failed } }. Response ~1-3 KB. " +
      "Set continueOnError: true (default) to skip failures without aborting the batch.",
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
    description:
      "Generate N image variants (default 3) for each of multiple panels using varied seeds. " +
      "Call when the user wants to pick the best image from several options per panel. Unlike panels_generate_batch (one image per panel), this produces variantCount images per panel. " +
      "EXPENSIVE: runs ComfyUI inference (variantCount x panelCount) times, 5-60s each. " +
      "Returns { results: [{ panelId, outputs: [{ outputId }] }], summary: { panels, variantsPerPanel, totalGenerated, totalFailed } }. Response ~2-5 KB.",
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
      "Composite caption overlays (speech bubbles, narration boxes, SFX) onto each panel's selected output image and write final files to disk. " +
      "Call after captions_add_batch and after selecting outputs (panels_select_outputs_batch or panels_auto_select_batch). Requires an outputDir path. " +
      "Unlike captions_add_batch (metadata only), this produces actual rendered image files in png/jpeg/webp. " +
      "Returns { results: [{ panelId, outputPath }], summary: { requested, rendered, failed, outputDir } }. Response ~1-2 KB.",
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
    description:
      "Manually set which generated output image is the 'selected' one for each of multiple panels, using explicit panelId-to-outputId mappings. " +
      "Call when the user has reviewed variants and picked favorites. Unlike panels_auto_select_batch (which picks first/latest automatically), this requires explicit outputId choices. " +
      "Returns { selected: number, errors: [], summary: { requested, selected, failed } }. Response ~0.5 KB.",
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
      "Automatically select an output image for each of multiple panels using a simple heuristic ('first' or 'latest' generated). " +
      "Call to quickly finalize panels without manual review -- useful after panels_generate_batch when only one output exists per panel, or to fast-forward past variant selection. " +
      "Unlike panels_select_outputs_batch (requires explicit outputId per panel), this selects automatically. " +
      "Returns { selected, skipped, errors: [], summary: { panels, selected, skipped, failed } }. Response ~0.5 KB.",
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
    description:
      "Return all panel IDs for a storyboard, sorted by position. " +
      "Call before any batch operation (panels_generate_batch, captions_add_batch, etc.) when you have a storyboardId but need the individual panelIds. " +
      "This is a lightweight read-only query -- no mutations. " +
      "Returns { storyboardId, panelIds: string[], count: number }. Response ~0.2-1 KB depending on panel count.",
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
