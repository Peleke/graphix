/**
 * Storyboard MCP Tools
 *
 * Tools for storyboard management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getStoryboardService } from "@graphix/core";

export const storyboardTools: Record<string, Tool> = {
  storyboard_create: {
    name: "storyboard_create",
    description: "Create a new storyboard in a project with name and optional description/synopsis. Returns JSON {success, storyboard} with the new storyboard object including generated ID (~200 tokens). Call after creating a project and characters, when ready to lay out scenes. Unlike storyboard_duplicate, this creates an empty storyboard with no panels; add panels afterward to build the scene sequence.",
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
    description: "Fetch a single storyboard by ID with all its panels. Returns JSON {success, storyboard} with full storyboard details including name, description, and nested panels array with prompt/image data (~300-2000 tokens depending on panel count). Call to inspect panel sequence before generating images or to review progress on a scene. Unlike storyboard_list, this returns one storyboard with all nested panel data.",
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
    description: "List all storyboards belonging to a project by projectId. Returns JSON {success, storyboards, count} where storyboards is an array of storyboard summaries (~100-500 tokens depending on count). Call to see available scenes/chapters in a project or to find a storyboard ID by name. Unlike storyboard_get, this returns all storyboards without nested panel details.",
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
    description: "Update a storyboard's name or description by storyboardId. Returns JSON {success, storyboard} with the updated storyboard object (~200 tokens). Call when renaming a scene or revising its synopsis. Does NOT modify child panels -- use panel tools for that. Unlike storyboard_duplicate, this modifies the existing storyboard in place.",
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
    description: "Deep-copy an existing storyboard and all its panels into a new storyboard, optionally with a new name. Returns JSON {success, storyboard} with the duplicated storyboard including all cloned panels and a new ID (~300-2000 tokens depending on panel count). Call when branching a scene to try alternate compositions or styles without losing the original. Unlike storyboard_create, this starts with a full copy of panels rather than an empty storyboard.",
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
    description: "Permanently delete a storyboard and all its child panels (cascading). Returns JSON {success, message} (~50 tokens). DESTRUCTIVE -- cannot be undone. Call only when the user explicitly confirms they want to remove an entire scene and all its panels. Unlike storyboard_update, this destroys the record rather than modifying metadata.",
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
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }
      if (!args.name) {
        return { success: false, error: "name is required" };
      }

      const storyboard = await service.create({
        projectId: args.projectId as string,
        name: args.name as string,
        description: args.description as string | undefined,
      });
      return { success: true, storyboard };
    }

    case "storyboard_get": {
      // Validate required parameters
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const storyboard = await service.getById(args.storyboardId as string);
      if (!storyboard) {
        return { success: false, error: "Storyboard not found" };
      }
      return { success: true, storyboard };
    }

    case "storyboard_list": {
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      const storyboards = await service.getByProject(args.projectId as string);
      return { success: true, storyboards, count: storyboards.length };
    }

    case "storyboard_update": {
      // Validate required parameters
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const storyboard = await service.update(args.storyboardId as string, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, storyboard };
    }

    case "storyboard_duplicate": {
      // Validate required parameters
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const storyboard = await service.duplicate(
        args.storyboardId as string,
        args.newName as string | undefined
      );
      return { success: true, storyboard };
    }

    case "storyboard_delete": {
      // Validate required parameters
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      await service.delete(args.storyboardId as string);
      return { success: true, message: "Storyboard deleted" };
    }

    default:
      throw new Error(`Unknown storyboard tool: ${name}`);
  }
}
