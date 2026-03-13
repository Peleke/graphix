/**
 * Caption MCP Tools
 *
 * Tools for managing panel captions (speech bubbles, thought bubbles,
 * narration boxes, SFX text, and whispers).
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCaptionService, DEFAULT_CAPTION_STYLES } from "@graphix/core";
import {
  compositeCaptions,
  suggestPlacement,
  suggestMultiplePlacements,
  getQuickPlacement,
  type RenderableCaption,
} from "@graphix/core";
import type { CaptionType, CaptionPosition, CaptionStyle } from "@graphix/core";

export const captionTools: Record<string, Tool> = {
  caption_add: {
    name: "caption_add",
    description:
      "Call when the user wants to place dialogue, narration, or sound effects text on a panel. Creates a new " +
      "caption of type speech (round bubble), thought (cloud bubble), narration (rectangular box), sfx (bold " +
      "stylized text), or whisper (dashed bubble) at a specific x/y position. Returns {success, caption} " +
      "with the created record (~150 tokens). Use caption_suggest_position first if optimal placement is unknown.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to add caption to",
        },
        type: {
          type: "string",
          enum: ["speech", "thought", "narration", "sfx", "whisper"],
          description: "Type of caption: speech (dialogue bubble), thought (cloud bubble), narration (rectangular box), sfx (sound effects), whisper (dashed bubble)",
        },
        text: {
          type: "string",
          description: "The caption text content",
        },
        characterId: {
          type: "string",
          description: "Optional character ID for dialogue attribution",
        },
        x: {
          type: "number",
          description: "X position as percentage (0-100) from left edge of panel",
        },
        y: {
          type: "number",
          description: "Y position as percentage (0-100) from top edge of panel",
        },
        tailX: {
          type: "number",
          description: "X position (0-100) where speech/thought bubble tail points to (speaker location)",
        },
        tailY: {
          type: "number",
          description: "Y position (0-100) where speech/thought bubble tail points to",
        },
        fontSize: {
          type: "number",
          description: "Font size in pixels (default varies by type)",
        },
        fontColor: {
          type: "string",
          description: "Font color as hex (e.g., '#000000')",
        },
        backgroundColor: {
          type: "string",
          description: "Bubble background color as hex (e.g., '#FFFFFF')",
        },
        borderColor: {
          type: "string",
          description: "Border color as hex",
        },
        zIndex: {
          type: "number",
          description: "Layer order (higher = on top)",
        },
      },
      required: ["panelId", "type", "text", "x", "y"],
    },
  },

  caption_get: {
    name: "caption_get",
    description:
      "Call to retrieve full details of a single caption (text, type, position, tail direction, style overrides, " +
      "z-index) by its ID. Returns {success, caption} (~100 tokens). Use caption_list to find IDs for a panel.",
    inputSchema: {
      type: "object",
      properties: {
        captionId: {
          type: "string",
          description: "Caption ID",
        },
      },
      required: ["captionId"],
    },
  },

  caption_list: {
    name: "caption_list",
    description:
      "Call to enumerate every caption (speech bubbles, narration boxes, SFX, etc.) attached to a panel. " +
      "Returns {success, captions: [...], count} (~50-300 tokens depending on caption count). " +
      "Use this before caption_reorder or to find caption IDs for caption_update/caption_delete.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to list captions for",
        },
      },
      required: ["panelId"],
    },
  },

  caption_update: {
    name: "caption_update",
    description:
      "Call to modify an existing caption's text, type, position (x/y), tail direction, font size, colors, " +
      "or z-index. Only fields provided are changed; omitted fields are preserved. " +
      "Returns {success, caption} with the updated record (~150 tokens). Requires the caption ID " +
      "from caption_list or caption_add.",
    inputSchema: {
      type: "object",
      properties: {
        captionId: {
          type: "string",
          description: "Caption ID to update",
        },
        type: {
          type: "string",
          enum: ["speech", "thought", "narration", "sfx", "whisper"],
          description: "New caption type",
        },
        text: {
          type: "string",
          description: "New text content",
        },
        characterId: {
          type: "string",
          description: "New character ID (or null to remove)",
        },
        x: {
          type: "number",
          description: "New X position (0-100)",
        },
        y: {
          type: "number",
          description: "New Y position (0-100)",
        },
        tailX: {
          type: "number",
          description: "New tail X position",
        },
        tailY: {
          type: "number",
          description: "New tail Y position",
        },
        fontSize: {
          type: "number",
          description: "New font size",
        },
        fontColor: {
          type: "string",
          description: "New font color",
        },
        backgroundColor: {
          type: "string",
          description: "New background color",
        },
        zIndex: {
          type: "number",
          description: "New layer order",
        },
      },
      required: ["captionId"],
    },
  },

  caption_delete: {
    name: "caption_delete",
    description:
      "Call to permanently remove a caption from a panel. Returns {success, message} (~20 tokens). " +
      "This is irreversible -- use caption_update to hide or restyle instead if the user might want the text back.",
    inputSchema: {
      type: "object",
      properties: {
        captionId: {
          type: "string",
          description: "Caption ID to delete",
        },
      },
      required: ["captionId"],
    },
  },

  caption_reorder: {
    name: "caption_reorder",
    description:
      "Call when captions on a panel overlap and the user wants to change which appears on top. " +
      "Accepts an ordered array of caption IDs (first = bottom layer, last = top layer) and reassigns z-index " +
      "values accordingly. Returns {success, captions} with updated z-indices (~100-300 tokens). " +
      "Use caption_list first to get current caption IDs and order.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        captionIds: {
          type: "array",
          items: { type: "string" },
          description: "Caption IDs in desired order (first = bottom, last = top)",
        },
      },
      required: ["panelId", "captionIds"],
    },
  },

  caption_preview: {
    name: "caption_preview",
    description:
      "Call to generate a visual preview image showing all captions composited onto the panel artwork. " +
      "Reads the panel's captions from the database, renders bubbles/boxes/SFX text on top of the source " +
      "image, and writes the result to outputPath. Returns {success, outputPath, captionCount} (~50 tokens). " +
      "Unlike caption_list which returns data, this produces an actual rendered image file.",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID to render",
        },
        imagePath: {
          type: "string",
          description: "Path to the panel image to overlay captions on",
        },
        outputPath: {
          type: "string",
          description: "Path to save the rendered preview",
        },
      },
      required: ["panelId", "imagePath", "outputPath"],
    },
  },

  caption_defaults: {
    name: "caption_defaults",
    description:
      "Call to retrieve the default font size, font color, background color, border style, and other styling " +
      "for each caption type (speech, thought, narration, sfx, whisper). Returns {success, defaults, types} " +
      "(~200 tokens). No parameters needed. Use this when the user asks about current styling or before " +
      "creating captions with custom overrides.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  caption_suggest_position: {
    name: "caption_suggest_position",
    description:
      "Call before caption_add when the user wants smart placement for a single caption. Analyzes the panel " +
      "image using edge detection to find visually calm regions that won't obscure important content. " +
      "Returns ranked suggestions: {success, suggestions: [{x, y, score}], bestSuggestion} (~100 tokens). " +
      "For placing multiple captions at once without overlap, use caption_suggest_multiple instead.",
    inputSchema: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description: "Path to the panel image to analyze",
        },
        captionType: {
          type: "string",
          enum: ["speech", "thought", "narration", "sfx", "whisper"],
          description: "Type of caption to place (affects default positioning heuristics)",
        },
        preferredRegion: {
          type: "string",
          enum: ["top", "bottom", "left", "right", "center", "any"],
          description: "Preferred region of the panel for placement (optional)",
        },
      },
      required: ["imagePath", "captionType"],
    },
  },

  caption_suggest_multiple: {
    name: "caption_suggest_multiple",
    description:
      "Call when placing 2+ captions on a panel at once to get non-overlapping positions for all of them. " +
      "Analyzes the panel image and returns a map of caption type to suggested position, ensuring no two " +
      "captions collide: {success, suggestions: {speech: {x,y}, narration: {x,y}, ...}} (~100-200 tokens). " +
      "Unlike caption_suggest_position which handles one caption, this coordinates placement across all provided types.",
    inputSchema: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description: "Path to the panel image to analyze",
        },
        captionTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["speech", "thought", "narration", "sfx", "whisper"],
          },
          description: "List of caption types to find positions for",
        },
      },
      required: ["imagePath", "captionTypes"],
    },
  },

  caption_quick_position: {
    name: "caption_quick_position",
    description:
      "Call for instant caption placement using comic-convention heuristics (e.g., speech at top-center, " +
      "narration at top-left, SFX at center) without analyzing the actual panel image. Returns {success, " +
      "suggestion: {position: {x, y}}} (~30 tokens). Faster than caption_suggest_position but less precise -- " +
      "use this when speed matters more than avoiding content occlusion.",
    inputSchema: {
      type: "object",
      properties: {
        captionType: {
          type: "string",
          enum: ["speech", "thought", "narration", "sfx", "whisper"],
          description: "Type of caption",
        },
      },
      required: ["captionType"],
    },
  },
};

export async function executeCaptionTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getCaptionService();

  switch (name) {
    case "caption_add": {
      const position: CaptionPosition = {
        x: args.x as number,
        y: args.y as number,
      };

      const tailDirection: CaptionPosition | undefined =
        args.tailX !== undefined && args.tailY !== undefined
          ? { x: args.tailX as number, y: args.tailY as number }
          : undefined;

      const style: Partial<CaptionStyle> = {};
      if (args.fontSize) style.fontSize = args.fontSize as number;
      if (args.fontColor) style.fontColor = args.fontColor as string;
      if (args.backgroundColor) style.backgroundColor = args.backgroundColor as string;
      if (args.borderColor) style.borderColor = args.borderColor as string;

      const caption = await service.create({
        panelId: args.panelId as string,
        type: args.type as CaptionType,
        text: args.text as string,
        characterId: args.characterId as string | undefined,
        position,
        tailDirection,
        style: Object.keys(style).length > 0 ? style : undefined,
        zIndex: args.zIndex as number | undefined,
      });

      return {
        success: true,
        caption,
        message: `Added ${caption.type} caption to panel`,
      };
    }

    case "caption_get": {
      const caption = await service.getById(args.captionId as string);
      if (!caption) {
        return { success: false, error: "Caption not found" };
      }
      return { success: true, caption };
    }

    case "caption_list": {
      const captions = await service.getByPanel(args.panelId as string);
      return {
        success: true,
        captions,
        count: captions.length,
      };
    }

    case "caption_update": {
      const updateData: Record<string, unknown> = {};

      if (args.type !== undefined) updateData.type = args.type;
      if (args.text !== undefined) updateData.text = args.text;
      if (args.characterId !== undefined) updateData.characterId = args.characterId;
      if (args.x !== undefined && args.y !== undefined) {
        updateData.position = { x: args.x, y: args.y };
      }
      if (args.tailX !== undefined && args.tailY !== undefined) {
        updateData.tailDirection = { x: args.tailX, y: args.tailY };
      }
      if (args.zIndex !== undefined) updateData.zIndex = args.zIndex;

      const style: Partial<CaptionStyle> = {};
      if (args.fontSize) style.fontSize = args.fontSize as number;
      if (args.fontColor) style.fontColor = args.fontColor as string;
      if (args.backgroundColor) style.backgroundColor = args.backgroundColor as string;
      if (Object.keys(style).length > 0) {
        updateData.style = style;
      }

      const caption = await service.update(
        args.captionId as string,
        updateData as Parameters<typeof service.update>[1]
      );

      return {
        success: true,
        caption,
        message: "Caption updated",
      };
    }

    case "caption_delete": {
      await service.delete(args.captionId as string);
      return {
        success: true,
        message: "Caption deleted",
      };
    }

    case "caption_reorder": {
      const captions = await service.reorder(
        args.panelId as string,
        args.captionIds as string[]
      );
      return {
        success: true,
        captions,
        message: "Captions reordered",
      };
    }

    case "caption_preview": {
      const captions = await service.getByPanel(args.panelId as string);

      const renderableCaptions: RenderableCaption[] = captions.map((c) => ({
        id: c.id,
        type: c.type as CaptionType,
        text: c.text,
        characterId: c.characterId ?? undefined,
        position: c.position as CaptionPosition,
        tailDirection: c.tailDirection as CaptionPosition | undefined,
        style: c.style as Partial<CaptionStyle> | undefined,
        zIndex: c.zIndex,
      }));

      await compositeCaptions(
        args.imagePath as string,
        renderableCaptions,
        args.outputPath as string
      );

      return {
        success: true,
        outputPath: args.outputPath,
        captionCount: captions.length,
        message: `Rendered panel with ${captions.length} caption(s)`,
      };
    }

    case "caption_defaults": {
      return {
        success: true,
        defaults: DEFAULT_CAPTION_STYLES,
        types: ["speech", "thought", "narration", "sfx", "whisper"],
      };
    }

    case "caption_suggest_position": {
      const suggestions = await suggestPlacement(args.imagePath as string, {
        captionType: args.captionType as CaptionType,
        preferredRegion: args.preferredRegion as "top" | "bottom" | "left" | "right" | "center" | "any" | undefined,
      });

      return {
        success: true,
        suggestions,
        bestSuggestion: suggestions[0] ?? null,
        message: `Found ${suggestions.length} placement suggestion(s) for ${args.captionType}`,
      };
    }

    case "caption_suggest_multiple": {
      const placements = await suggestMultiplePlacements(
        args.imagePath as string,
        args.captionTypes as CaptionType[]
      );

      // Convert Map to object for JSON serialization
      const suggestions: Record<string, unknown> = {};
      for (const [type, suggestion] of placements) {
        suggestions[type] = suggestion;
      }

      return {
        success: true,
        suggestions,
        message: `Found positions for ${placements.size} caption type(s)`,
      };
    }

    case "caption_quick_position": {
      const suggestion = getQuickPlacement(args.captionType as CaptionType);

      return {
        success: true,
        suggestion,
        message: `Quick position for ${args.captionType}: (${suggestion.position.x}%, ${suggestion.position.y}%)`,
      };
    }

    default:
      throw new Error(`Unknown caption tool: ${name}`);
  }
}
