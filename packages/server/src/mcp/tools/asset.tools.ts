/**
 * Custom Asset MCP Tools
 *
 * Tools for managing project-specific LoRAs and textual inversion embeddings.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getCustomAssetService,
  type AssetType,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const assetTools: Record<string, Tool> = {
  asset_register: {
    name: "asset_register",
    description:
      "Call when the user adds a new custom LoRA or textual-inversion embedding to a project. The .safetensors " +
      "file must already exist in the ComfyUI models directory. Unlike built-in style/lora tools that work with " +
      "pre-configured models, this registers user-provided resources with trigger words and strength defaults. " +
      "Returns the created asset object with generated ID (~300 tokens). Name must be unique within the project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to register the asset for",
        },
        characterId: {
          type: "string",
          description: "Optional: Associate with a specific character",
        },
        name: {
          type: "string",
          description: "Unique identifier for the asset (lowercase, underscores)",
        },
        displayName: {
          type: "string",
          description: "Human-readable display name",
        },
        description: {
          type: "string",
          description: "Description of what the asset does",
        },
        type: {
          type: "string",
          enum: ["lora", "embedding"],
          description: "Type of asset",
        },
        filePath: {
          type: "string",
          description:
            "Path to the asset file relative to ComfyUI models directory (e.g., 'loras/my_character.safetensors')",
        },
        triggerWord: {
          type: "string",
          description: "Primary trigger word to activate the asset in prompts",
        },
        triggerAliases: {
          type: "array",
          items: { type: "string" },
          description: "Alternative trigger words",
        },
        defaultStrength: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "Default model strength (0.0-2.0, default: 1.0)",
        },
        defaultClipStrength: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "Default CLIP strength for LoRAs (0.0-2.0, default: 1.0)",
        },
        baseModel: {
          type: "string",
          description: "Base model the asset was trained for (e.g., 'sdxl', 'sd15', 'pony')",
        },
        trainingSteps: {
          type: "number",
          description: "Number of training steps (for reference)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for organization and search",
        },
      },
      required: ["projectId", "name", "displayName", "type", "filePath", "triggerWord"],
    },
  },

  asset_get: {
    name: "asset_get",
    description:
      "Call to retrieve full metadata for a single user-registered custom asset (LoRA or embedding). " +
      "Look up by asset ID or by projectId + name. Returns the complete asset record including trigger words, " +
      "strengths, base model, tags, and usage count (~250 tokens). Use asset_list to browse if the ID is unknown.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID (use either id or projectId + name)",
        },
        projectId: {
          type: "string",
          description: "Project ID (required if using name)",
        },
        name: {
          type: "string",
          description: "Asset name (required if not using id)",
        },
      },
    },
  },

  asset_list: {
    name: "asset_list",
    description:
      "Call to browse user-registered custom assets (LoRAs and embeddings) with optional filters for project, " +
      "character, type (lora|embedding), base model, tags, or name search. Returns {count, assets: [{id, name, " +
      "displayName, type, triggerWord, defaultStrength, baseModel, usageCount, isActive, characterId}]} " +
      "(~100-500 tokens). Unlike list_loras which shows built-in models, this shows user-registered resources.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Filter by project",
        },
        characterId: {
          type: "string",
          description: "Filter by character",
        },
        type: {
          type: "string",
          enum: ["lora", "embedding"],
          description: "Filter by asset type",
        },
        baseModel: {
          type: "string",
          description: "Filter by base model",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (matches any)",
        },
        search: {
          type: "string",
          description: "Search by name",
        },
        activeOnly: {
          type: "boolean",
          description: "Only return active assets (default: true)",
        },
        limit: {
          type: "number",
          description: "Maximum results",
        },
      },
    },
  },

  asset_update: {
    name: "asset_update",
    description:
      "Call to modify a user-registered custom asset's display name, trigger words, strength defaults, " +
      "character association, tags, base model, or active status. Returns the full updated asset object " +
      "(~250 tokens). Requires the asset ID from asset_list or asset_get.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID to update",
        },
        displayName: { type: "string" },
        description: { type: "string" },
        characterId: {
          type: ["string", "null"],
          description: "Associate with character or set null to remove",
        },
        triggerWord: { type: "string" },
        triggerAliases: { type: "array", items: { type: "string" } },
        defaultStrength: { type: "number" },
        defaultClipStrength: { type: "number" },
        baseModel: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        isActive: { type: "boolean" },
      },
      required: ["id"],
    },
  },

  asset_delete: {
    name: "asset_delete",
    description:
      "Call to permanently remove a custom asset registration from the project database. Does NOT delete the " +
      "underlying .safetensors file on disk. Returns {success, id} (~30 tokens). Use asset_deactivate instead " +
      "if the user may want to re-enable the asset later.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID to delete",
        },
      },
      required: ["id"],
    },
  },

  asset_apply: {
    name: "asset_apply",
    description:
      "Call when building a generation prompt that should include a specific custom asset. Returns the trigger " +
      "word to inject into the prompt and LoRA stack config (filePath, strength, clipStrength) ready for " +
      "the generation pipeline: {assetId, assetName, type, triggerToInject, loraConfig} (~100 tokens). " +
      "Records usage for analytics. Unlike asset_apply_character which bundles all character assets at once, " +
      "this applies a single asset by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID to apply",
        },
        strengthOverride: {
          type: "number",
          description: "Override the default model strength",
        },
        clipStrengthOverride: {
          type: "number",
          description: "Override the default CLIP strength (LoRAs only)",
        },
      },
      required: ["id"],
    },
  },

  asset_apply_character: {
    name: "asset_apply_character",
    description:
      "Call when generating a panel featuring a specific character to auto-include all their associated custom " +
      "assets. Returns {characterId, triggers: string[], loraStack: [{filePath, strength, clipStrength}], " +
      "promptSuffix} (~150 tokens). Unlike asset_apply which handles one asset, this bundles every active " +
      "custom asset linked to a character into a single response ready for prompt injection.",
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

  asset_popular: {
    name: "asset_popular",
    description:
      "Call to surface the most-used custom assets in a project when suggesting assets for a new panel. " +
      "Returns [{id, name, displayName, type, usageCount}] ranked by frequency (~100-200 tokens). " +
      "Unlike asset_list which supports rich filtering, this is a quick popularity-ranked shortlist.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        limit: {
          type: "number",
          description: "Number of assets to return (default: 10)",
        },
      },
      required: ["projectId"],
    },
  },

  asset_deactivate: {
    name: "asset_deactivate",
    description:
      "Call to temporarily hide a custom asset from listings and prevent it from being applied, without " +
      "permanently deleting the registration. Returns {success, id, status: 'deactivated'|'not_found'} " +
      "(~30 tokens). Use asset_activate to restore it later. Prefer this over asset_delete when the user " +
      "may want the asset back.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID to deactivate",
        },
      },
      required: ["id"],
    },
  },

  asset_activate: {
    name: "asset_activate",
    description:
      "Call to restore a previously deactivated custom asset so it appears in listings and can be applied " +
      "to generations again. Returns {success, id, status: 'activated'|'not_found'} (~30 tokens). " +
      "Only needed after asset_deactivate was used; newly registered assets are active by default.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset ID to activate",
        },
      },
      required: ["id"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleAssetTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getCustomAssetService();

  switch (name) {
    case "asset_register": {
      const {
        projectId,
        characterId,
        name: assetName,
        displayName,
        description,
        type,
        filePath,
        triggerWord,
        triggerAliases,
        defaultStrength,
        defaultClipStrength,
        baseModel,
        trainingSteps,
        tags,
      } = args as {
        projectId: string;
        characterId?: string;
        name: string;
        displayName: string;
        description?: string;
        type: AssetType;
        filePath: string;
        triggerWord: string;
        triggerAliases?: string[];
        defaultStrength?: number;
        defaultClipStrength?: number;
        baseModel?: string;
        trainingSteps?: number;
        tags?: string[];
      };

      // Check name availability
      const available = await service.isNameAvailable(projectId, assetName);
      if (!available) {
        return { error: `Asset name already exists in project: ${assetName}` };
      }

      try {
        const asset = await service.register({
          projectId,
          characterId,
          name: assetName,
          displayName,
          description,
          type,
          filePath,
          triggerWord,
          triggerAliases,
          defaultStrength,
          defaultClipStrength,
          baseModel,
          trainingSteps,
          tags,
        });

        return asset;
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Registration failed" };
      }
    }

    case "asset_get": {
      const { id, projectId, name: assetName } = args as {
        id?: string;
        projectId?: string;
        name?: string;
      };

      let asset;
      if (id) {
        asset = await service.getById(id);
      } else if (projectId && assetName) {
        asset = await service.getByName(projectId, assetName);
      } else {
        return { error: "Either id or (projectId + name) is required" };
      }

      if (!asset) {
        return { error: `Asset not found: ${id ?? assetName}` };
      }

      return asset;
    }

    case "asset_list": {
      const { projectId, characterId, type, baseModel, tags, search, activeOnly, limit } =
        args as {
          projectId?: string;
          characterId?: string;
          type?: AssetType;
          baseModel?: string;
          tags?: string[];
          search?: string;
          activeOnly?: boolean;
          limit?: number;
        };

      const assets = await service.list({
        projectId,
        characterId,
        type,
        baseModel,
        tags,
        search,
        activeOnly,
        limit,
      });

      return {
        count: assets.length,
        assets: assets.map((a) => ({
          id: a.id,
          name: a.name,
          displayName: a.displayName,
          type: a.type,
          triggerWord: a.triggerWord,
          defaultStrength: a.defaultStrength,
          baseModel: a.baseModel,
          usageCount: a.usageCount,
          isActive: a.isActive,
          characterId: a.characterId,
        })),
      };
    }

    case "asset_update": {
      const { id, ...updates } = args as { id: string } & Record<string, unknown>;

      const asset = await service.getById(id);
      if (!asset) {
        return { error: `Asset not found: ${id}` };
      }

      const updated = await service.update(
        id,
        updates as Parameters<typeof service.update>[1]
      );
      return updated;
    }

    case "asset_delete": {
      const { id } = args as { id: string };

      const deleted = await service.delete(id);
      return { success: deleted, id };
    }

    case "asset_apply": {
      const { id, strengthOverride, clipStrengthOverride } = args as {
        id: string;
        strengthOverride?: number;
        clipStrengthOverride?: number;
      };

      const result = await service.apply(id, strengthOverride, clipStrengthOverride);

      if (!result) {
        return { error: `Asset not found or inactive: ${id}` };
      }

      return {
        assetId: result.asset.id,
        assetName: result.asset.name,
        type: result.asset.type,
        triggerToInject: result.triggerToInject,
        loraConfig: result.loraConfig ?? null,
      };
    }

    case "asset_apply_character": {
      const { characterId } = args as { characterId: string };

      const triggers = await service.getCharacterTriggers(characterId);
      const loraStack = await service.getCharacterLoraStack(characterId);

      return {
        characterId,
        triggers,
        loraStack,
        promptSuffix: triggers.join(", "),
      };
    }

    case "asset_popular": {
      const { projectId, limit = 10 } = args as {
        projectId: string;
        limit?: number;
      };

      const assets = await service.getPopular(projectId, limit);

      return {
        assets: assets.map((a) => ({
          id: a.id,
          name: a.name,
          displayName: a.displayName,
          type: a.type,
          usageCount: a.usageCount,
        })),
      };
    }

    case "asset_deactivate": {
      const { id } = args as { id: string };

      const success = await service.deactivate(id);
      return { success, id, status: success ? "deactivated" : "not_found" };
    }

    case "asset_activate": {
      const { id } = args as { id: string };

      const success = await service.activate(id);
      return { success, id, status: success ? "activated" : "not_found" };
    }

    default:
      throw new Error(`Unknown asset tool: ${name}`);
  }
}
