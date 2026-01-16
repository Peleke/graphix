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
    description: "Add a caption (speech bubble, thought bubble, narration, SFX, or whisper) to a panel",
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
    description: "Get a caption by ID",
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
    description: "List all captions for a panel",
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
    description: "Update a caption's text, position, or style",
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
    description: "Delete a caption",
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
    description: "Reorder captions within a panel (change z-index layering)",
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
    description: "Render a panel image with its captions overlaid and save to a file",
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
    description: "Get the default style settings for each caption type",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  caption_suggest_position: {
    name: "caption_suggest_position",
    description: "Analyze a panel image and suggest optimal positions for captions. Uses edge detection to find calm regions that won't obscure important visual content.",
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
    description: "Suggest non-overlapping positions for multiple caption types in a single panel",
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
    description: "Get a quick position suggestion based on comic conventions (no image analysis, pure heuristics)",
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
