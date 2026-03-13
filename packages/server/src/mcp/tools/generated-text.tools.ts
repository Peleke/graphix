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
    description: "Persist an LLM-generated text output (dialogue, caption, narration, etc.) to the version store. Call after text_generate/text_dialogue produces content you want to keep. Returns a single GeneratedText record {id, text, textType, version, status, provider, model, createdAt}. Lightweight DB write (~1 KB response). Not for generating text -- use text_generate/text_dialogue for that; this tool only stores the result.",
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
    description: "Fetch a single stored generated-text record by its UUID. Call when you have a specific text ID and need the full record including version history and metadata. Returns {success, generatedText: {id, text, textType, version, status, provider, model, prompt, tokensUsed, metadata, createdAt, updatedAt}}. Small response (~1 KB). Use generated_text_by_panel/page/project to query by scope instead of by ID.",
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
    description: "Query stored generated-text records with multi-field filtering (panel, page, project, textType, status). Call when you need to search across scopes or combine filters that the single-scope shortcuts (generated_text_by_panel/page/project) cannot express. Returns {success, texts: GeneratedText[], count}. Response can be large -- use the limit param (max 1000) to cap results. For single-scope queries prefer the dedicated by_panel/by_page/by_project tools.",
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
    description: "Mutate fields on an existing generated-text record (text content, textType, status, metadata). Call when a user manually edits stored text or you need to reclassify its type/status. Marks the record as edited (not a new version). Returns the updated GeneratedText record (~1 KB). To create a new version instead, use generated_text_regenerate. To soft-delete, use generated_text_archive.",
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
    description: "Permanently destroy a single generated-text record by UUID. Call only when the user explicitly wants irreversible deletion. Returns {success, message}. ~0.5 KB response. For reversible removal, use generated_text_archive instead. To wipe all texts for a panel at once, use generated_text_delete_by_panel.",
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
    description: "Soft-delete a single generated-text record by setting its status to 'archived'. Call when the user wants to hide/discard text without permanent loss. The record remains in the DB and can be restored via generated_text_update(status='active'). Returns the updated GeneratedText record (~1 KB). For permanent deletion use generated_text_delete. To archive many at once, use generated_text_batch_archive.",
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
    description: "Create a new version of an existing generated-text record by re-running generation. Call when the user wants a fresh LLM pass on the same (or tweaked) prompt. Optionally preserves the previous version via keepHistory. Returns the new GeneratedText record with incremented version number (~1 KB). Different from generated_text_update, which edits in-place without re-generating. Different from generated_text_revert, which rolls back to the original.",
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
    description: "Roll back a generated-text record to its original content, undoing all manual edits and version changes. Call when the user wants to discard all modifications and restore the first-generation output. Returns the reverted GeneratedText record (~1 KB). Different from generated_text_regenerate, which creates a new LLM-generated version forward.",
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
    description: "Fetch the single current-version active text for a panel, filtered by textType (dialogue, caption, narration, etc.). Call when you need the 'live' text a panel is using right now -- not the full version history. Returns one GeneratedText record or an error if none is active (~1 KB). Different from generated_text_by_panel, which returns all texts (all types, all statuses) for that panel.",
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
    description: "Fetch every generated-text record linked to a single panel (all types, all statuses, all versions). Call when reviewing or auditing all text outputs for one panel. Returns {success, texts: GeneratedText[], count, panelId}. Response scales with panel history -- could be 5-50+ records. For just the current active text of one type, use generated_text_get_active. For multi-field filtering, use generated_text_list.",
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
    description: "Fetch every generated-text record linked to a single page layout (all panels on that page, all types/statuses). Call when reviewing all text outputs across an entire page. Returns {success, texts: GeneratedText[], count, pageLayoutId}. Response can be large for text-heavy pages (10-100+ records). For panel-level queries use generated_text_by_panel; for project-wide use generated_text_by_project.",
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
    description: "Fetch every generated-text record across an entire project (all pages, all panels, all types/statuses). Call when auditing total text output or exporting a project's generated content. Returns {success, texts: GeneratedText[], count, projectId}. WARNING: potentially very large response for active projects (hundreds of records). For narrower queries use generated_text_by_page or generated_text_by_panel.",
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
    description: "Return aggregate counts and distribution of generated-text records, broken down by textType, status, and provider. Call when the user asks 'how much text has been generated?' or before deciding on cleanup/archival. Returns {success, stats: {totalCount, byType: {}, byStatus: {}, byProvider: {}}} (~1 KB). Optionally scoped to a projectId. Read-only summary -- does not return actual text content.",
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
    description: "Permanently destroy ALL generated-text records linked to a single panel (every type, every version). Call when a panel is being removed or the user wants a clean slate for that panel's text. Returns {success, deleted: number, message}. Irreversible bulk operation. For single-record deletion use generated_text_delete; for soft-removal use generated_text_archive or generated_text_batch_archive.",
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
    description: "Soft-delete multiple generated-text records in one call by setting their status to 'archived'. Call when cleaning up old versions or bulk-dismissing text across panels. Accepts up to 1000 UUIDs. Returns {success, archived: number, message} (~0.5 KB). Records remain in DB and can be restored. For single-record archival use generated_text_archive; for permanent bulk deletion use generated_text_delete_by_panel.",
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
