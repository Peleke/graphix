/**
 * Character MCP Tools
 *
 * Tools for character management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCharacterService } from "../../../services/index.js";

export const characterTools: Record<string, Tool> = {
  character_create: {
    name: "character_create",
    description: "Create a new character in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to add character to",
        },
        name: {
          type: "string",
          description: "Character name",
        },
        description: {
          type: "string",
          description: "Character description",
        },
        basePrompt: {
          type: "string",
          description: "Base prompt fragment for this character (e.g., 'anthro otter, brown fur, green eyes')",
        },
        negativePrompt: {
          type: "string",
          description: "Negative prompt additions for this character",
        },
      },
      required: ["projectId", "name"],
    },
  },

  character_get: {
    name: "character_get",
    description: "Get a character by ID",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
      },
      required: ["characterId"],
    },
  },

  character_list: {
    name: "character_list",
    description: "List all characters in a project",
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

  character_update: {
    name: "character_update",
    description: "Update a character's basic info",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        name: {
          type: "string",
          description: "New character name",
        },
        description: {
          type: "string",
          description: "New character description",
        },
      },
      required: ["characterId"],
    },
  },

  character_update_prompt: {
    name: "character_update_prompt",
    description: "Update a character's prompt fragments",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        basePrompt: {
          type: "string",
          description: "New base prompt fragment",
        },
        negativePrompt: {
          type: "string",
          description: "New negative prompt additions",
        },
      },
      required: ["characterId"],
    },
  },

  character_add_reference: {
    name: "character_add_reference",
    description: "Add a reference image to a character for IP-Adapter consistency",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        imagePath: {
          type: "string",
          description: "Path to the reference image",
        },
        isPrimary: {
          type: "boolean",
          description: "Whether this is the primary reference image",
        },
      },
      required: ["characterId", "imagePath"],
    },
  },

  character_remove_reference: {
    name: "character_remove_reference",
    description: "Remove a reference image from a character",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        imagePath: {
          type: "string",
          description: "Path of the reference image to remove",
        },
      },
      required: ["characterId", "imagePath"],
    },
  },

  character_set_lora: {
    name: "character_set_lora",
    description: "Set a trained LoRA for a character",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        loraPath: {
          type: "string",
          description: "Path to the LoRA file (null to remove)",
        },
        loraWeight: {
          type: "number",
          description: "LoRA weight (0.0-1.0, default 0.8)",
        },
      },
      required: ["characterId"],
    },
  },

  character_delete: {
    name: "character_delete",
    description: "Delete a character",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID to delete",
        },
      },
      required: ["characterId"],
    },
  },
};

export async function handleCharacterTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getCharacterService();

  switch (name) {
    case "character_create": {
      const character = await service.create({
        projectId: args.projectId as string,
        name: args.name as string,
        description: args.description as string | undefined,
        profile: {
          basePrompt: args.basePrompt as string | undefined,
          negativePrompt: args.negativePrompt as string | undefined,
        },
      });
      return { success: true, character };
    }

    case "character_get": {
      const character = await service.getById(args.characterId as string);
      if (!character) {
        return { success: false, error: "Character not found" };
      }
      return { success: true, character };
    }

    case "character_list": {
      const characters = await service.listByProject(args.projectId as string);
      return { success: true, characters, count: characters.length };
    }

    case "character_update": {
      const character = await service.update(args.characterId as string, {
        name: args.name as string | undefined,
        description: args.description as string | undefined,
      });
      return { success: true, character };
    }

    case "character_update_prompt": {
      const character = await service.updatePrompt(args.characterId as string, {
        basePrompt: args.basePrompt as string | undefined,
        negativePrompt: args.negativePrompt as string | undefined,
      });
      return { success: true, character };
    }

    case "character_add_reference": {
      const character = await service.addReferenceImage(
        args.characterId as string,
        args.imagePath as string,
        args.isPrimary as boolean | undefined
      );
      return { success: true, character };
    }

    case "character_remove_reference": {
      const character = await service.removeReferenceImage(
        args.characterId as string,
        args.imagePath as string
      );
      return { success: true, character };
    }

    case "character_set_lora": {
      const character = await service.setLora(
        args.characterId as string,
        args.loraPath as string | null | undefined,
        args.loraWeight as number | undefined
      );
      return { success: true, character };
    }

    case "character_delete": {
      await service.delete(args.characterId as string);
      return { success: true, message: "Character deleted" };
    }

    default:
      throw new Error(`Unknown character tool: ${name}`);
  }
}
