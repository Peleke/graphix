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
      "Register a custom LoRA or textual inversion embedding for use in a project. " +
      "The asset file must already exist in the appropriate ComfyUI models directory.",
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
    description: "Get details of a custom asset by ID or by name within a project.",
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
    description: "List custom assets. Filter by project, character, type, or search.",
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
    description: "Update a custom asset's configuration.",
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
    description: "Delete a custom asset. This does not delete the underlying file.",
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
      "Apply an asset to get the trigger word and LoRA configuration for generation. " +
      "Records usage for analytics.",
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
      "Get all triggers and LoRA configurations for a character's assets. " +
      "Useful for automatically including character-specific assets in generations.",
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
    description: "Get the most frequently used assets in a project.",
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
    description: "Deactivate an asset without deleting it. Can be reactivated later.",
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
    description: "Reactivate a previously deactivated asset.",
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
