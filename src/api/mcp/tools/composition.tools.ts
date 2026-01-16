/**
 * Composition MCP Tools
 *
 * Tools for page composition and export via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getCompositionService,
  listTemplates,
  PAGE_SIZES,
} from "../../../composition/index.js";

export const compositionTools: Record<string, Tool> = {
  composition_list_templates: {
    name: "composition_list_templates",
    description: "List all available page layout templates",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  composition_list_page_sizes: {
    name: "composition_list_page_sizes",
    description: "List all available page size presets",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  composition_compose_page: {
    name: "composition_compose_page",
    description: "Compose a single page from panels using a template",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "ID of the storyboard",
        },
        templateId: {
          type: "string",
          description: "ID of the template to use (e.g., 'six-grid', 'full-page')",
        },
        panelIds: {
          type: "array",
          items: { type: "string" },
          description: "Panel IDs in order (maps to template slots)",
        },
        outputName: {
          type: "string",
          description: "Output filename (relative to output dir, e.g., 'page1.png')",
        },
        pageSize: {
          type: "string",
          description: "Page size preset (e.g., 'comic_standard', 'manga_b6')",
        },
        backgroundColor: {
          type: "string",
          description: "Background color (hex, default: #FFFFFF)",
        },
        borderWidth: {
          type: "number",
          description: "Panel border width in pixels",
        },
        borderColor: {
          type: "string",
          description: "Panel border color (hex)",
        },
      },
      required: ["storyboardId", "templateId", "panelIds", "outputName"],
    },
  },

  composition_compose_storyboard: {
    name: "composition_compose_storyboard",
    description: "Auto-compose all panels in a storyboard into pages",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "ID of the storyboard to compose",
        },
        templateId: {
          type: "string",
          description: "Template to use (default: 'six-grid')",
        },
        pageSize: {
          type: "string",
          description: "Page size preset (default: 'comic_standard')",
        },
        outputPrefix: {
          type: "string",
          description: "Prefix for output files (default: storyboard name)",
        },
      },
      required: ["storyboardId"],
    },
  },

  composition_contact_sheet: {
    name: "composition_contact_sheet",
    description: "Create a contact sheet (thumbnail grid) from all panels in a storyboard",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "ID of the storyboard",
        },
        outputPath: {
          type: "string",
          description: "Full output path for the contact sheet",
        },
        columns: {
          type: "number",
          description: "Number of columns (default: 3)",
        },
        thumbnailSize: {
          type: "number",
          description: "Thumbnail size in pixels (default: 256)",
        },
      },
      required: ["storyboardId", "outputPath"],
    },
  },

  composition_export_page: {
    name: "composition_export_page",
    description: "Export a composed page to a specific format with optional print preparation",
    inputSchema: {
      type: "object",
      properties: {
        inputPath: {
          type: "string",
          description: "Path to the composed page image",
        },
        outputPath: {
          type: "string",
          description: "Output path for the exported file",
        },
        format: {
          type: "string",
          enum: ["png", "jpeg", "webp", "tiff", "pdf"],
          description: "Export format",
        },
        quality: {
          type: "number",
          description: "Quality for lossy formats (1-100, default: 90)",
        },
        dpi: {
          type: "number",
          description: "DPI for print exports (default: 300)",
        },
        bleed: {
          type: "number",
          description: "Bleed area in pixels for print",
        },
        trimMarks: {
          type: "boolean",
          description: "Add trim marks for print",
        },
      },
      required: ["inputPath", "outputPath", "format"],
    },
  },
};

export async function executeCompositionTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getCompositionService();

  switch (name) {
    case "composition_list_templates": {
      const templates = listTemplates();
      return {
        success: true,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          panelCount: t.panelCount,
        })),
        count: templates.length,
      };
    }

    case "composition_list_page_sizes": {
      return {
        success: true,
        pageSizes: PAGE_SIZES,
      };
    }

    case "composition_compose_page": {
      const result = await service.composePage({
        storyboardId: args.storyboardId as string,
        templateId: args.templateId as string,
        panelIds: args.panelIds as string[],
        outputName: args.outputName as string,
        pageSize: args.pageSize as string | undefined,
        backgroundColor: args.backgroundColor as string | undefined,
        panelBorder:
          args.borderWidth && args.borderColor
            ? { width: args.borderWidth as number, color: args.borderColor as string }
            : undefined,
      });
      return result;
    }

    case "composition_compose_storyboard": {
      const result = await service.composeStoryboard(args.storyboardId as string, {
        templateId: args.templateId as string | undefined,
        pageSize: args.pageSize as string | undefined,
        outputPrefix: args.outputPrefix as string | undefined,
      });
      return result;
    }

    case "composition_contact_sheet": {
      const result = await service.createContactSheet(
        args.storyboardId as string,
        args.outputPath as string,
        {
          columns: args.columns as number | undefined,
          thumbnailSize: args.thumbnailSize as number | undefined,
        }
      );
      return result;
    }

    case "composition_export_page": {
      const result = await service.exportPage({
        inputPath: args.inputPath as string,
        outputPath: args.outputPath as string,
        format: args.format as "png" | "jpeg" | "webp" | "tiff" | "pdf",
        quality: args.quality as number | undefined,
        dpi: args.dpi as number | undefined,
        bleed: args.bleed as number | undefined,
        trimMarks: args.trimMarks as boolean | undefined,
      });
      return result;
    }

    default:
      throw new Error(`Unknown composition tool: ${name}`);
  }
}
