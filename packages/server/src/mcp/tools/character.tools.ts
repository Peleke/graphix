/**
 * Character MCP Tools
 *
 * Tools for character management via MCP.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCharacterService } from "@graphix/core";
import type { CharacterProfile, PromptFragments } from "@graphix/core";

export const characterTools: Record<string, Tool> = {
  character_create: {
    name: "character_create",
    description: "Create a new character in a project with name, species, optional body type, features, and prompt fragments. Returns JSON {success, character} with the new character object including generated ID, profile, and promptFragments (~300 tokens). Call after project_create when defining the cast for a graphic novel. Unlike character_update, this initializes a new character record; use character_add_reference and character_set_lora afterward to attach visual assets.",
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
        species: {
          type: "string",
          description: "Species (e.g., 'otter', 'wolf', 'human')",
        },
        bodyType: {
          type: "string",
          enum: ["athletic", "slim", "muscular", "shortstack", "tall", "average"],
          description: "Body type",
        },
        features: {
          type: "array",
          items: { type: "string" },
          description: "Physical features (e.g., ['brown fur', 'green eyes'])",
        },
        positivePrompt: {
          type: "string",
          description: "Base positive prompt fragment for this character",
        },
        negativePrompt: {
          type: "string",
          description: "Negative prompt additions for this character",
        },
        triggers: {
          type: "array",
          items: { type: "string" },
          description: "LoRA trigger words",
        },
      },
      required: ["projectId", "name", "species"],
    },
  },

  character_get: {
    name: "character_get",
    description: "Fetch a single character by ID. Returns JSON {success, character} with full character details including profile (species, bodyType, features), promptFragments (positive, negative, triggers), referenceImages, and loraConfig (~400 tokens). Call to inspect a character's current prompt setup before generating panels, or to verify reference images and LoRA assignments. Unlike character_list, this returns one character with all nested data.",
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
    description: "List all characters belonging to a project by projectId. Returns JSON {success, characters, count} where characters is an array of character objects with profile and prompt data (~200-800 tokens depending on cast size). Call to see the full cast before creating storyboard panels, or to find a character ID by name. Unlike character_get, this returns all characters in a project rather than one by ID.",
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
    description: "Update a character's name, profile fields (species, bodyType, features), or prompt fragments (positivePrompt, negativePrompt) by characterId. Returns JSON {success, character} with the updated character object (~300 tokens). Call when revising a character's appearance or prompt wording between panel generations. Does NOT modify reference images or LoRA config -- use character_add_reference or character_set_lora for those.",
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
        species: {
          type: "string",
          description: "New species",
        },
        bodyType: {
          type: "string",
          enum: ["athletic", "slim", "muscular", "shortstack", "tall", "average"],
          description: "New body type",
        },
        features: {
          type: "array",
          items: { type: "string" },
          description: "New physical features",
        },
        positivePrompt: {
          type: "string",
          description: "New positive prompt fragment",
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
    description: "Attach a reference image (by file path) to a character for IP-Adapter visual consistency during generation. Returns JSON {success, character} with the updated character including the new image in referenceImages array (~300 tokens). Call after generating or selecting a good character portrait to lock in visual identity. Unlike character_set_lora, this adds an IP-Adapter reference image rather than a trained LoRA weight file.",
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
      },
      required: ["characterId", "imagePath"],
    },
  },

  character_remove_reference: {
    name: "character_remove_reference",
    description: "Remove a specific reference image (by file path) from a character's referenceImages array. Returns JSON {success, character} with the updated character object (~300 tokens). Call when a reference image is producing inconsistent results or when replacing it with a better one. Unlike character_clear_lora, this removes an IP-Adapter reference image, not a LoRA model.",
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
    description: "Assign a trained LoRA model file to a character with strength, optional CLIP strength, and training image count. Returns JSON {success, character} with updated loraConfig (~300 tokens). Call after training a character-specific LoRA to bind it for all future panel generations. Replaces any previously set LoRA. Unlike character_add_reference, this sets a fine-tuned LoRA weight rather than an IP-Adapter reference image.",
    inputSchema: {
      type: "object",
      properties: {
        characterId: {
          type: "string",
          description: "Character ID",
        },
        loraPath: {
          type: "string",
          description: "Path to the LoRA file",
        },
        strength: {
          type: "number",
          description: "LoRA strength (0.0-1.0, default 0.7)",
        },
        strengthClip: {
          type: "number",
          description: "LoRA CLIP strength (optional)",
        },
        trainingImages: {
          type: "number",
          description: "Number of images used for training",
        },
      },
      required: ["characterId", "loraPath", "trainingImages"],
    },
  },

  character_clear_lora: {
    name: "character_clear_lora",
    description: "Remove the LoRA model assignment from a character, reverting to prompt-only generation. Returns JSON {success, character} with loraConfig cleared (~250 tokens). Call when a LoRA is degrading output quality or when switching to IP-Adapter-only consistency. Unlike character_remove_reference, this clears the LoRA weight, not a reference image.",
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

  character_delete: {
    name: "character_delete",
    description: "Permanently delete a character and its reference images and LoRA config. Returns JSON {success, message} (~50 tokens). DESTRUCTIVE -- cannot be undone. Call only when the user confirms a character should be removed from the project cast. Unlike character_clear_lora or character_remove_reference, this destroys the entire character record.",
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
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }
      if (!args.name) {
        return { success: false, error: "name is required" };
      }
      if (!args.species) {
        return { success: false, error: "species is required" };
      }

      const profile: Partial<CharacterProfile> = {
        species: args.species as string,
      };
      if (args.bodyType) profile.bodyType = args.bodyType as CharacterProfile["bodyType"];
      if (args.features) profile.features = args.features as string[];

      const promptFragments: Partial<PromptFragments> = {};
      if (args.positivePrompt) promptFragments.positive = args.positivePrompt as string;
      if (args.negativePrompt) promptFragments.negative = args.negativePrompt as string;
      if (args.triggers) promptFragments.triggers = args.triggers as string[];

      const character = await service.create({
        projectId: args.projectId as string,
        name: args.name as string,
        profile,
        promptFragments,
      });
      return { success: true, character };
    }

    case "character_get": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      const character = await service.getById(args.characterId as string);
      if (!character) {
        return { success: false, error: "Character not found" };
      }
      return { success: true, character };
    }

    case "character_list": {
      // Validate required parameters
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      const characters = await service.getByProject(args.projectId as string);
      return { success: true, characters, count: characters.length };
    }

    case "character_update": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      const profile: Partial<CharacterProfile> | undefined =
        args.species || args.bodyType || args.features
          ? {
              ...(args.species ? { species: args.species as string } : {}),
              ...(args.bodyType ? { bodyType: args.bodyType as CharacterProfile["bodyType"] } : {}),
              ...(args.features ? { features: args.features as string[] } : {}),
            }
          : undefined;

      const promptFragments: Partial<PromptFragments> | undefined =
        args.positivePrompt || args.negativePrompt
          ? {
              ...(args.positivePrompt ? { positive: args.positivePrompt as string } : {}),
              ...(args.negativePrompt ? { negative: args.negativePrompt as string } : {}),
            }
          : undefined;

      const character = await service.update(args.characterId as string, {
        name: args.name as string | undefined,
        profile,
        promptFragments,
      });
      return { success: true, character };
    }

    case "character_add_reference": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }
      if (!args.imagePath) {
        return { success: false, error: "imagePath is required" };
      }

      const character = await service.addReference(
        args.characterId as string,
        args.imagePath as string
      );
      return { success: true, character };
    }

    case "character_remove_reference": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }
      if (!args.imagePath) {
        return { success: false, error: "imagePath is required" };
      }

      const character = await service.removeReference(
        args.characterId as string,
        args.imagePath as string
      );
      return { success: true, character };
    }

    case "character_set_lora": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }
      if (!args.loraPath) {
        return { success: false, error: "loraPath is required" };
      }
      if (args.trainingImages === undefined) {
        return { success: false, error: "trainingImages is required" };
      }

      const character = await service.setLora(args.characterId as string, {
        path: args.loraPath as string,
        strength: args.strength as number | undefined,
        strengthClip: args.strengthClip as number | undefined,
        trainingImages: args.trainingImages as number,
      });
      return { success: true, character };
    }

    case "character_clear_lora": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      const character = await service.clearLora(args.characterId as string);
      return { success: true, character };
    }

    case "character_delete": {
      // Validate required parameters
      if (!args.characterId) {
        return { success: false, error: "characterId is required" };
      }

      await service.delete(args.characterId as string);
      return { success: true, message: "Character deleted" };
    }

    default:
      throw new Error(`Unknown character tool: ${name}`);
  }
}
