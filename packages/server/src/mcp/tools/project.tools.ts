/**
 * Project MCP Tools
 *
 * Tools for project management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getProjectService } from "@graphix/core";

export const projectTools: Record<string, Tool> = {
  project_create: {
    name: "project_create",
    description: "Create a new project for a graphic novel or animated short",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        defaultModel: {
          type: "string",
          description: "Default model file (e.g., 'yiffInHell_yihXXXTended.safetensors')",
        },
        width: {
          type: "number",
          description: "Default image width (256-4096)",
        },
        height: {
          type: "number",
          description: "Default image height (256-4096)",
        },
      },
      required: ["name"],
    },
  },

  project_get: {
    name: "project_get",
    description: "Get a project by ID",
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

  project_list: {
    name: "project_list",
    description: "List all projects",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of projects to return",
        },
        offset: {
          type: "number",
          description: "Number of projects to skip",
        },
      },
    },
  },

  project_update: {
    name: "project_update",
    description: "Update a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "New project name",
        },
        description: {
          type: "string",
          description: "New project description",
        },
      },
      required: ["projectId"],
    },
  },

  project_delete: {
    name: "project_delete",
    description: "Delete a project and all its contents",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to delete",
        },
      },
      required: ["projectId"],
    },
  },
};

export async function handleProjectTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getProjectService();

  switch (name) {
    case "project_create": {
      // Validate required parameters
      if (!args.name) {
        return { success: false, error: "name is required" };
      }

      const project = await service.create({
        name: args.name as string,
        description: args.description as string | undefined,
        settings: {
          defaultModel: args.defaultModel as string | undefined,
          resolution:
            args.width || args.height
              ? {
                  width: (args.width as number) || 768,
                  height: (args.height as number) || 1024,
                }
              : undefined,
        } as any,
      });
      return { success: true, project };
    }

    case "project_get": {
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      const project = await service.getById(args.projectId as string);
      if (!project) {
        return { success: false, error: "Project not found" };
      }
      return { success: true, project };
    }

    case "project_list": {
      const projects = await service.list({
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
      return { success: true, projects, count: projects.length };
    }

    case "project_update": {
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      const project = await service.update(args.projectId as string, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, project };
    }

    case "project_delete": {
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      await service.delete(args.projectId as string);
      return { success: true, message: "Project deleted" };
    }

    default:
      throw new Error(`Unknown project tool: ${name}`);
  }
}
