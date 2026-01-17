/**
 * Generated Text MCP Tools
 *
 * Tools for managing stored AI-generated text content.
 * Supports CRUD operations, regeneration, and batch operations.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getGeneratedTextService,
  type GeneratedTextType,
  type GeneratedTextStatus,
  type GeneratedTextMetadata,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const generatedTextTools: Record<string, Tool> = {
  generated_text_create: {
    name: "generated_text_create",
    description: "Store a new generated text entry. Can be associated with a panel, page layout, or project.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The generated text content",
        },
        textType: {
          type: "string",
          enum: ["panel_description", "dialogue", "caption", "narration", "refinement", "raw", "custom"],
          description: "Type of generated text",
        },
        provider: {
          type: "string",
          description: "Provider that generated the text (e.g., 'ollama', 'claude')",
        },
        model: {
          type: "string",
          description: "Model that generated the text (e.g., 'llama3.2', 'claude-sonnet-4-20250514')",
        },
        panelId: {
          type: "string",
          description: "Optional panel ID to associate with",
        },
        pageLayoutId: {
          type: "string",
          description: "Optional page layout ID to associate with",
        },
        projectId: {
          type: "string",
          description: "Optional project ID to associate with",
        },
        prompt: {
          type: "string",
          description: "The prompt used for generation",
        },
        tokensUsed: {
          type: "number",
          description: "Total tokens used in generation",
        },
        metadata: {
          type: "object",
          description: "Additional metadata (context, tags, etc.)",
        },
      },
      required: ["text", "textType", "provider", "model"],
    },
  },

  generated_text_get: {
    name: "generated_text_get",
    description: "Get a generated text entry by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID",
        },
      },
      required: ["id"],
    },
  },

  generated_text_list: {
    name: "generated_text_list",
    description: "List generated texts with optional filtering by panel, page, project, type, or status",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Filter by panel ID",
        },
        pageLayoutId: {
          type: "string",
          description: "Filter by page layout ID",
        },
        projectId: {
          type: "string",
          description: "Filter by project ID",
        },
        textType: {
          type: "string",
          enum: ["panel_description", "dialogue", "caption", "narration", "refinement", "raw", "custom"],
          description: "Filter by text type",
        },
        status: {
          type: "string",
          enum: ["active", "archived", "superseded"],
          description: "Filter by status",
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
        },
      },
    },
  },

  generated_text_update: {
    name: "generated_text_update",
    description: "Update a generated text entry (edit text, change type or status)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID to update",
        },
        text: {
          type: "string",
          description: "New text content (will mark as edited)",
        },
        textType: {
          type: "string",
          enum: ["panel_description", "dialogue", "caption", "narration", "refinement", "raw", "custom"],
          description: "New text type",
        },
        status: {
          type: "string",
          enum: ["active", "archived", "superseded"],
          description: "New status",
        },
        metadata: {
          type: "object",
          description: "Updated metadata",
        },
      },
      required: ["id"],
    },
  },

  generated_text_delete: {
    name: "generated_text_delete",
    description: "Permanently delete a generated text entry",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID to delete",
        },
      },
      required: ["id"],
    },
  },

  generated_text_archive: {
    name: "generated_text_archive",
    description: "Archive a generated text (soft delete - can be restored)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID to archive",
        },
      },
      required: ["id"],
    },
  },

  generated_text_regenerate: {
    name: "generated_text_regenerate",
    description: "Regenerate text for an existing entry. Creates a new version and optionally keeps history.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID to regenerate",
        },
        newPrompt: {
          type: "string",
          description: "Optional new prompt (uses original if not provided)",
        },
        keepHistory: {
          type: "boolean",
          description: "Whether to keep the old version (default: false)",
        },
        temperature: {
          type: "number",
          description: "Override temperature for regeneration",
        },
        maxTokens: {
          type: "number",
          description: "Override max tokens for regeneration",
        },
      },
      required: ["id"],
    },
  },

  generated_text_revert: {
    name: "generated_text_revert",
    description: "Revert text to its original content (undo all edits)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Generated text ID to revert",
        },
      },
      required: ["id"],
    },
  },

  generated_text_get_active: {
    name: "generated_text_get_active",
    description: "Get the most recent active text of a specific type for a panel",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
        textType: {
          type: "string",
          enum: ["panel_description", "dialogue", "caption", "narration", "refinement", "raw", "custom"],
          description: "Type of text to retrieve",
        },
      },
      required: ["panelId", "textType"],
    },
  },

  generated_text_by_panel: {
    name: "generated_text_by_panel",
    description: "Get all generated texts for a panel",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
      },
      required: ["panelId"],
    },
  },

  generated_text_by_page: {
    name: "generated_text_by_page",
    description: "Get all generated texts for a page layout",
    inputSchema: {
      type: "object",
      properties: {
        pageLayoutId: {
          type: "string",
          description: "Page layout ID",
        },
      },
      required: ["pageLayoutId"],
    },
  },

  generated_text_by_project: {
    name: "generated_text_by_project",
    description: "Get all generated texts for a project",
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

  generated_text_stats: {
    name: "generated_text_stats",
    description: "Get statistics about generated texts (counts by type, status, provider, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID to filter stats",
        },
      },
    },
  },

  generated_text_delete_by_panel: {
    name: "generated_text_delete_by_panel",
    description: "Delete all generated texts for a panel",
    inputSchema: {
      type: "object",
      properties: {
        panelId: {
          type: "string",
          description: "Panel ID",
        },
      },
      required: ["panelId"],
    },
  },

  generated_text_batch_archive: {
    name: "generated_text_batch_archive",
    description: "Archive multiple generated texts by IDs",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of generated text IDs to archive",
        },
      },
      required: ["ids"],
    },
  },
};

// ============================================================================
// Tool Handler
// ============================================================================

export async function handleGeneratedTextTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  /**
   * Sanitize error messages to prevent information leakage.
   */
  function sanitizeError(error: unknown): string {
    const message = error instanceof Error ? error.message : "An error occurred";
    // Preserve safe user-facing errors
    if (message.includes("not found") || message.includes("required")) {
      return message;
    }
    // Remove sensitive paths/stack traces
    if (message.includes("/") && message.includes(".")) {
      return "An internal error occurred";
    }
    if (message.includes("SQLITE_") || message.includes("UNIQUE constraint")) {
      return "Database operation failed";
    }
    return message;
  }

  /**
   * Validate UUID format.
   */
  function isValidUUID(id: unknown): id is string {
    if (typeof id !== "string") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Validate numeric bounds.
   */
  function validateNumericBounds(
    value: unknown,
    name: string,
    min: number,
    max: number
  ): { valid: true } | { valid: false; error: string } {
    if (value === undefined || value === null) return { valid: true };
    if (typeof value !== "number" || isNaN(value)) {
      return { valid: false, error: `${name} must be a number` };
    }
    if (value < min || value > max) {
      return { valid: false, error: `${name} must be between ${min} and ${max}` };
    }
    return { valid: true };
  }

  try {
    const service = getGeneratedTextService();

    switch (name) {
      case "generated_text_create": {
        // Required field validation
        if (!args.text || typeof args.text !== "string") {
          return { success: false, error: "text is required" };
        }
        if (!args.textType || typeof args.textType !== "string") {
          return { success: false, error: "textType is required" };
        }
        if (!args.provider || typeof args.provider !== "string") {
          return { success: false, error: "provider is required" };
        }
        if (!args.model || typeof args.model !== "string") {
          return { success: false, error: "model is required" };
        }

        // Numeric bounds validation
        const tempCheck = validateNumericBounds(args.temperature, "temperature", 0, 2);
        if (!tempCheck.valid) return { success: false, error: tempCheck.error };

        const maxTokensCheck = validateNumericBounds(args.maxTokens, "maxTokens", 1, 100000);
        if (!maxTokensCheck.valid) return { success: false, error: maxTokensCheck.error };

        try {
          const result = await service.create({
            text: args.text as string,
            textType: args.textType as GeneratedTextType,
            provider: args.provider as string,
            model: args.model as string,
            panelId: args.panelId as string | undefined,
            pageLayoutId: args.pageLayoutId as string | undefined,
            projectId: args.projectId as string | undefined,
            prompt: args.prompt as string | undefined,
            tokensUsed: args.tokensUsed as number | undefined,
            inputTokens: args.inputTokens as number | undefined,
            outputTokens: args.outputTokens as number | undefined,
            temperature: args.temperature as number | undefined,
            maxTokens: args.maxTokens as number | undefined,
            metadata: args.metadata as GeneratedTextMetadata | undefined,
          });

          return {
            success: true,
            generatedText: result,
            message: `Created ${result.textType} text`,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_get": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        try {
          const text = await service.getById(args.id);
          if (!text) {
            return { success: false, error: "Generated text not found" };
          }
          return { success: true, generatedText: text };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_list": {
        // Validate pagination bounds
        const limitCheck = validateNumericBounds(args.limit, "limit", 1, 1000);
        if (!limitCheck.valid) return { success: false, error: limitCheck.error };

        try {
          const texts = await service.list({
            panelId: args.panelId as string | undefined,
            pageLayoutId: args.pageLayoutId as string | undefined,
            projectId: args.projectId as string | undefined,
            textType: args.textType as GeneratedTextType | undefined,
            status: args.status as GeneratedTextStatus | undefined,
            limit: args.limit as number | undefined,
          });

          return {
            success: true,
            texts,
            count: texts.length,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_update": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        try {
          const result = await service.update(args.id, {
            text: args.text as string | undefined,
            textType: args.textType as GeneratedTextType | undefined,
            status: args.status as GeneratedTextStatus | undefined,
            metadata: args.metadata as GeneratedTextMetadata | undefined,
          });

          return {
            success: true,
            generatedText: result,
            message: "Text updated",
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_delete": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        try {
          await service.delete(args.id);
          return {
            success: true,
            message: "Text deleted permanently",
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_archive": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        try {
          const result = await service.archive(args.id);
          return {
            success: true,
            generatedText: result,
            message: "Text archived",
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_regenerate": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        // Validate numeric bounds
        const tempCheck = validateNumericBounds(args.temperature, "temperature", 0, 2);
        if (!tempCheck.valid) return { success: false, error: tempCheck.error };

        const maxTokensCheck = validateNumericBounds(args.maxTokens, "maxTokens", 1, 100000);
        if (!maxTokensCheck.valid) return { success: false, error: maxTokensCheck.error };

        try {
          const result = await service.regenerate(args.id, {
            newPrompt: args.newPrompt as string | undefined,
            keepHistory: args.keepHistory as boolean | undefined,
            temperature: args.temperature as number | undefined,
            maxTokens: args.maxTokens as number | undefined,
          });

          return {
            success: true,
            generatedText: result,
            message: "Text regenerated",
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_revert": {
        if (!isValidUUID(args.id)) {
          return { success: false, error: "Valid id is required" };
        }

        try {
          const result = await service.revertToOriginal(args.id);
          return {
            success: true,
            generatedText: result,
            message: "Reverted to original text",
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_get_active": {
        if (!isValidUUID(args.panelId)) {
          return { success: false, error: "Valid panelId is required" };
        }
        if (!args.textType || typeof args.textType !== "string") {
          return { success: false, error: "textType is required" };
        }

        try {
          const text = await service.getActiveTextForPanel(
            args.panelId,
            args.textType as GeneratedTextType
          );

          if (!text) {
            return { success: false, error: "No active text found for panel" };
          }

          return { success: true, generatedText: text };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_by_panel": {
        if (!isValidUUID(args.panelId)) {
          return { success: false, error: "Valid panelId is required" };
        }

        try {
          const texts = await service.getByPanel(args.panelId);
          return {
            success: true,
            texts,
            count: texts.length,
            panelId: args.panelId,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_by_page": {
        if (!isValidUUID(args.pageLayoutId)) {
          return { success: false, error: "Valid pageLayoutId is required" };
        }

        try {
          const texts = await service.getByPageLayout(args.pageLayoutId);
          return {
            success: true,
            texts,
            count: texts.length,
            pageLayoutId: args.pageLayoutId,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_by_project": {
        if (!isValidUUID(args.projectId)) {
          return { success: false, error: "Valid projectId is required" };
        }

        try {
          const texts = await service.getByProject(args.projectId);
          return {
            success: true,
            texts,
            count: texts.length,
            projectId: args.projectId,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_stats": {
        try {
          const stats = await service.getStats(args.projectId as string | undefined);
          return {
            success: true,
            stats,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_delete_by_panel": {
        if (!isValidUUID(args.panelId)) {
          return { success: false, error: "Valid panelId is required" };
        }

        try {
          const count = await service.deleteByPanel(args.panelId);
          return {
            success: true,
            deleted: count,
            message: `Deleted ${count} text(s) for panel`,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      case "generated_text_batch_archive": {
        if (!Array.isArray(args.ids)) {
          return { success: false, error: "ids must be an array" };
        }
        if (args.ids.length === 0) {
          return { success: false, error: "ids array cannot be empty" };
        }
        if (args.ids.length > 1000) {
          return { success: false, error: "Batch size exceeds maximum of 1000" };
        }
        if (!args.ids.every(isValidUUID)) {
          return { success: false, error: "All ids must be valid UUIDs" };
        }

        try {
          const count = await service.archiveBatch(args.ids);
          return {
            success: true,
            archived: count,
            message: `Archived ${count} text(s)`,
          };
        } catch (error) {
          return { success: false, error: sanitizeError(error) };
        }
      }

      default:
        return { success: false, error: `Unknown generated text tool: ${name}` };
    }
  } catch (error) {
    // Outer catch for any unhandled errors (e.g., service initialization failure)
    return {
      success: false,
      error: "Service temporarily unavailable",
    };
  }
}
