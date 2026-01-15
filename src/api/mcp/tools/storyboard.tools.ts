/**
 * Storyboard MCP Tools
 *
 * Tools for storyboard management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getStoryboardService } from "../../../services/index.js";

export const storyboardTools: Record<string, Tool> = {
  storyboard_create: {
    name: "storyboard_create",
    description: "Create a new storyboard in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to add storyboard to",
        },
        name: {
          type: "string",
          description: "Storyboard name",
        },
        description: {
          type: "string",
          description: "Storyboard description/synopsis",
        },
      },
      required: ["projectId", "name"],
    },
  },

  storyboard_get: {
    name: "storyboard_get",
    description: "Get a storyboard by ID with all its panels",
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

  storyboard_list: {
    name: "storyboard_list",
    description: "List all storyboards in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
      },
      required: ["projectId"],
    },
  },

  storyboard_update: {
    name: "storyboard_update",
    description: "Update a storyboard's metadata",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID",
        },
        name: {
          type: "string",
          description: "New storyboard name",
        },
        description: {
          type: "string",
          description: "New storyboard description",
        },
      },
      required: ["storyboardId"],
    },
  },

  storyboard_duplicate: {
    name: "storyboard_duplicate",
    description: "Create a copy of a storyboard with all its panels",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID to duplicate",
        },
        newName: {
          type: "string",
          description: "Name for the new storyboard (optional, defaults to 'Copy of [original]')",
        },
      },
      required: ["storyboardId"],
    },
  },

  storyboard_delete: {
    name: "storyboard_delete",
    description: "Delete a storyboard and all its panels",
    inputSchema: {
      type: "object",
      properties: {
        storyboardId: {
          type: "string",
          description: "Storyboard ID to delete",
        },
      },
      required: ["storyboardId"],
    },
  },
};

export async function handleStoryboardTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getStoryboardService();

  switch (name) {
    case "storyboard_create": {
      const storyboard = await service.create({
        projectId: args.projectId as string,
        name: args.name as string,
        description: args.description as string | undefined,
      });
      return { success: true, storyboard };
    }

    case "storyboard_get": {
      const storyboard = await service.getById(args.storyboardId as string);
      if (!storyboard) {
        return { success: false, error: "Storyboard not found" };
      }
      return { success: true, storyboard };
    }

    case "storyboard_list": {
      const storyboards = await service.listByProject(args.projectId as string);
      return { success: true, storyboards, count: storyboards.length };
    }

    case "storyboard_update": {
      const storyboard = await service.update(args.storyboardId as string, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, storyboard };
    }

    case "storyboard_duplicate": {
      const storyboard = await service.duplicate(
        args.storyboardId as string,
        args.newName as string | undefined
      );
      return { success: true, storyboard };
    }

    case "storyboard_delete": {
      await service.delete(args.storyboardId as string);
      return { success: true, message: "Storyboard deleted" };
    }

    default:
      throw new Error(`Unknown storyboard tool: ${name}`);
  }
}
