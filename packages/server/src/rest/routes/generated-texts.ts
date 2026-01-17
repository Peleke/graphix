/**
 * Generated Text Routes
 *
 * REST API endpoints for managing stored AI-generated text.
 * Supports CRUD operations, regeneration, and batch operations.
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  getGeneratedTextService,
  type GeneratedTextType,
  type GeneratedTextStatus,
} from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateQuery,
  validateId,
  validateParam,
  paginationSchema,
  createPaginatedResponse,
  uuidSchema,
} from "../validation/index.js";

// ============================================================================
// Constants
// ============================================================================

const VALID_TEXT_TYPES: readonly GeneratedTextType[] = [
  "panel_description",
  "dialogue",
  "caption",
  "narration",
  "refinement",
  "raw",
  "custom",
];

const VALID_STATUSES: readonly GeneratedTextStatus[] = [
  "active",
  "archived",
  "superseded",
];

/** Maximum text length (500KB) */
const MAX_TEXT_LENGTH = 500000;

/** Maximum prompt length (100KB) */
const MAX_PROMPT_LENGTH = 100000;

// ============================================================================
// Zod Schemas
// ============================================================================

/** Text type enum schema */
const textTypeSchema = z.enum([
  "panel_description",
  "dialogue",
  "caption",
  "narration",
  "refinement",
  "raw",
  "custom",
]);

/** Status enum schema */
const statusSchema = z.enum(["active", "archived", "superseded"]);

/** Metadata schema with prototype pollution protection */
const metadataSchema = z
  .record(z.unknown())
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    // Remove prototype pollution keys
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val)) {
      if (!["__proto__", "constructor", "prototype"].includes(key)) {
        sanitized[key] = value;
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  });

/** List query parameters schema */
const listQuerySchema = paginationSchema.extend({
  panelId: uuidSchema.optional(),
  pageLayoutId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  textType: textTypeSchema.optional(),
  status: statusSchema.optional(),
});

/** Create generated text schema */
const createGeneratedTextSchema = z.object({
  text: z
    .string()
    .min(1, "text is required")
    .max(MAX_TEXT_LENGTH, `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`),
  textType: textTypeSchema,
  provider: z.string().min(1, "provider is required"),
  model: z.string().min(1, "model is required"),
  panelId: uuidSchema.optional(),
  pageLayoutId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  tokensUsed: z.number().int().nonnegative().max(10000000).optional(),
  inputTokens: z.number().int().nonnegative().max(10000000).optional(),
  outputTokens: z.number().int().nonnegative().max(10000000).optional(),
  prompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  metadata: metadataSchema,
});

/** Update generated text schema */
const updateGeneratedTextSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH, `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`)
    .optional(),
  textType: textTypeSchema.optional(),
  status: statusSchema.optional(),
  metadata: metadataSchema,
});

/** Regenerate schema */
const regenerateSchema = z.object({
  newPrompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  keepHistory: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

/** Batch create schema */
const batchCreateSchema = z.object({
  texts: z
    .array(createGeneratedTextSchema)
    .min(1, "texts array is required and must not be empty"),
});

/** Batch IDs schema */
const batchIdsSchema = z.object({
  ids: z
    .array(uuidSchema)
    .min(1, "ids array is required and must not be empty"),
});

/** Panel ID param schema */
const panelIdParamSchema = z.object({
  panelId: uuidSchema,
});

/** Page layout ID param schema */
const pageLayoutIdParamSchema = z.object({
  pageLayoutId: uuidSchema,
});

/** Project ID param schema */
const projectIdParamSchema = z.object({
  projectId: uuidSchema,
});

/** Panel with text type param schema */
const panelTextTypeParamSchema = z.object({
  panelId: uuidSchema,
  textType: textTypeSchema,
});

// ============================================================================
// Routes
// ============================================================================

export const generatedTextRoutes = new Hono();

// ----------------------------------------------------------------------------
// CRUD Operations
// ----------------------------------------------------------------------------

/**
 * GET /
 *
 * List generated texts with optional filtering.
 */
generatedTextRoutes.get("/", validateQuery(listQuerySchema), async (c) => {
  try {
    const service = getGeneratedTextService();
    const { page, limit, panelId, pageLayoutId, projectId, textType, status } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    const texts = await service.list({
      panelId,
      pageLayoutId,
      projectId,
      textType,
      status,
      limit,
      offset,
    });

    return c.json(createPaginatedResponse(texts, page, limit));
  } catch (error) {
    console.error("Error listing generated texts:", error);
    return errors.internal(c, "Failed to list generated texts");
  }
});

/**
 * GET /:id
 *
 * Get a specific generated text by ID.
 */
generatedTextRoutes.get("/:id", validateId(), async (c) => {
  const { id } = c.req.valid("param");

  try {
    const service = getGeneratedTextService();
    const text = await service.getById(id);

    if (!text) {
      return errors.notFound(c, "Generated text", id);
    }

    return c.json(text);
  } catch (error) {
    console.error("Error getting generated text:", error);
    return errors.internal(c, "Failed to get generated text");
  }
});

/**
 * POST /
 *
 * Create a new generated text entry.
 */
generatedTextRoutes.post(
  "/",
  validateBody(createGeneratedTextSchema),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const text = await service.create({
        panelId: body.panelId,
        pageLayoutId: body.pageLayoutId,
        projectId: body.projectId,
        text: body.text,
        textType: body.textType,
        provider: body.provider,
        model: body.model,
        tokensUsed: body.tokensUsed,
        inputTokens: body.inputTokens,
        outputTokens: body.outputTokens,
        prompt: body.prompt,
        systemPrompt: body.systemPrompt,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        metadata: body.metadata,
      });

      return c.json(text, 201);
    } catch (error) {
      console.error("Error creating generated text:", error);
      return errors.internal(c, "Failed to create generated text");
    }
  }
);

/**
 * PATCH /:id
 *
 * Update a generated text entry.
 */
generatedTextRoutes.patch(
  "/:id",
  validateId(),
  validateBody(updateGeneratedTextSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const text = await service.update(id, {
        text: body.text,
        textType: body.textType,
        status: body.status,
        metadata: body.metadata,
      });

      return c.json(text);
    } catch (error) {
      console.error("Error updating generated text:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update generated text";
      if (message.includes("not found")) {
        return errors.notFound(c, "Generated text", id);
      }
      return errors.internal(c, "Failed to update generated text");
    }
  }
);

/**
 * DELETE /:id
 *
 * Delete a generated text entry.
 */
generatedTextRoutes.delete("/:id", validateId(), async (c) => {
  const { id } = c.req.valid("param");

  try {
    const service = getGeneratedTextService();
    await service.delete(id);

    return c.body(null, 204);
  } catch (error) {
    console.error("Error deleting generated text:", error);
    return errors.internal(c, "Failed to delete generated text");
  }
});

// ----------------------------------------------------------------------------
// Specialized Operations
// ----------------------------------------------------------------------------

/**
 * POST /:id/archive
 *
 * Archive a generated text (soft delete).
 */
generatedTextRoutes.post("/:id/archive", validateId(), async (c) => {
  const { id } = c.req.valid("param");

  try {
    const service = getGeneratedTextService();
    const text = await service.archive(id);

    return c.json({
      success: true,
      text,
      message: "Text archived",
    });
  } catch (error) {
    console.error("Error archiving generated text:", error);
    const message =
      error instanceof Error ? error.message : "Failed to archive generated text";
    if (message.includes("not found")) {
      return errors.notFound(c, "Generated text", id);
    }
    return errors.internal(c, "Failed to archive generated text");
  }
});

/**
 * POST /:id/regenerate
 *
 * Regenerate text for an existing entry.
 */
generatedTextRoutes.post(
  "/:id/regenerate",
  validateId(),
  validateBody(regenerateSchema.optional().default({})),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const text = await service.regenerate(id, {
        newPrompt: body.newPrompt,
        keepHistory: body.keepHistory,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        timeoutMs: body.timeoutMs,
      });

      return c.json({
        success: true,
        text,
        message: "Text regenerated",
      });
    } catch (error) {
      console.error("Error regenerating text:", error);
      const message =
        error instanceof Error ? error.message : "Failed to regenerate text";
      if (message.includes("not found")) {
        return errors.notFound(c, "Generated text", id);
      }
      return errors.internal(c, "Failed to regenerate text");
    }
  }
);

/**
 * POST /:id/revert
 *
 * Revert to original text (undo edits).
 */
generatedTextRoutes.post("/:id/revert", validateId(), async (c) => {
  const { id } = c.req.valid("param");

  try {
    const service = getGeneratedTextService();
    const text = await service.revertToOriginal(id);

    return c.json({
      success: true,
      text,
      message: "Reverted to original text",
    });
  } catch (error) {
    console.error("Error reverting text:", error);
    const message = error instanceof Error ? error.message : "Failed to revert text";
    if (message.includes("not found") || message.includes("No original")) {
      return errors.badRequest(c, message);
    }
    return errors.internal(c, "Failed to revert text");
  }
});

// ----------------------------------------------------------------------------
// Association-based Routes
// ----------------------------------------------------------------------------

/**
 * GET /panels/:panelId
 *
 * Get all generated texts for a panel.
 */
generatedTextRoutes.get(
  "/panels/:panelId",
  validateParam(panelIdParamSchema),
  async (c) => {
    const { panelId } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const texts = await service.getByPanel(panelId);

      return c.json({
        texts,
        count: texts.length,
        panelId,
      });
    } catch (error) {
      console.error("Error getting texts for panel:", error);
      return errors.internal(c, "Failed to get texts for panel");
    }
  }
);

/**
 * GET /panels/:panelId/active/:textType
 *
 * Get the active text of a specific type for a panel.
 */
generatedTextRoutes.get(
  "/panels/:panelId/active/:textType",
  validateParam(panelTextTypeParamSchema),
  async (c) => {
    const { panelId, textType } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const text = await service.getActiveTextForPanel(panelId, textType);

      if (!text) {
        return errors.notFound(c, "Active text");
      }

      return c.json(text);
    } catch (error) {
      console.error("Error getting active text:", error);
      return errors.internal(c, "Failed to get active text");
    }
  }
);

/**
 * DELETE /panels/:panelId
 *
 * Delete all generated texts for a panel.
 */
generatedTextRoutes.delete(
  "/panels/:panelId",
  validateParam(panelIdParamSchema),
  async (c) => {
    const { panelId } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const count = await service.deleteByPanel(panelId);

      return c.json({
        success: true,
        deleted: count,
        message: `Deleted ${count} text(s)`,
      });
    } catch (error) {
      console.error("Error deleting texts for panel:", error);
      return errors.internal(c, "Failed to delete texts");
    }
  }
);

/**
 * GET /pages/:pageLayoutId
 *
 * Get all generated texts for a page layout.
 */
generatedTextRoutes.get(
  "/pages/:pageLayoutId",
  validateParam(pageLayoutIdParamSchema),
  async (c) => {
    const { pageLayoutId } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const texts = await service.getByPageLayout(pageLayoutId);

      return c.json({
        texts,
        count: texts.length,
        pageLayoutId,
      });
    } catch (error) {
      console.error("Error getting texts for page:", error);
      return errors.internal(c, "Failed to get texts for page");
    }
  }
);

/**
 * DELETE /pages/:pageLayoutId
 *
 * Delete all generated texts for a page layout.
 */
generatedTextRoutes.delete(
  "/pages/:pageLayoutId",
  validateParam(pageLayoutIdParamSchema),
  async (c) => {
    const { pageLayoutId } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const count = await service.deleteByPageLayout(pageLayoutId);

      return c.json({
        success: true,
        deleted: count,
        message: `Deleted ${count} text(s)`,
      });
    } catch (error) {
      console.error("Error deleting texts for page:", error);
      return errors.internal(c, "Failed to delete texts");
    }
  }
);

/**
 * GET /projects/:projectId
 *
 * Get all generated texts for a project.
 */
generatedTextRoutes.get(
  "/projects/:projectId",
  validateParam(projectIdParamSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");

    try {
      const service = getGeneratedTextService();
      const texts = await service.getByProject(projectId);

      return c.json({
        texts,
        count: texts.length,
        projectId,
      });
    } catch (error) {
      console.error("Error getting texts for project:", error);
      return errors.internal(c, "Failed to get texts for project");
    }
  }
);

// ----------------------------------------------------------------------------
// Batch Operations
// ----------------------------------------------------------------------------

/**
 * POST /batch
 *
 * Create multiple generated text entries.
 */
generatedTextRoutes.post(
  "/batch",
  validateBody(batchCreateSchema),
  async (c) => {
    const { texts } = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const results = await service.createBatch(
        texts.map((t) => ({
          panelId: t.panelId,
          pageLayoutId: t.pageLayoutId,
          projectId: t.projectId,
          text: t.text,
          textType: t.textType,
          provider: t.provider,
          model: t.model,
          tokensUsed: t.tokensUsed,
          inputTokens: t.inputTokens,
          outputTokens: t.outputTokens,
          prompt: t.prompt,
          systemPrompt: t.systemPrompt,
          temperature: t.temperature,
          maxTokens: t.maxTokens,
          metadata: t.metadata,
        }))
      );

      return c.json(
        {
          success: true,
          texts: results,
          count: results.length,
        },
        201
      );
    } catch (error) {
      console.error("Error creating batch texts:", error);
      return errors.internal(c, "Failed to create batch texts");
    }
  }
);

/**
 * POST /batch/archive
 *
 * Archive multiple texts by IDs.
 */
generatedTextRoutes.post(
  "/batch/archive",
  validateBody(batchIdsSchema),
  async (c) => {
    const { ids } = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const count = await service.archiveBatch(ids);

      return c.json({
        success: true,
        archived: count,
        message: `Archived ${count} text(s)`,
      });
    } catch (error) {
      console.error("Error archiving batch texts:", error);
      return errors.internal(c, "Failed to archive batch texts");
    }
  }
);

/**
 * DELETE /batch
 *
 * Delete multiple texts by IDs.
 */
generatedTextRoutes.delete(
  "/batch",
  validateBody(batchIdsSchema),
  async (c) => {
    const { ids } = c.req.valid("json");

    try {
      const service = getGeneratedTextService();
      const count = await service.deleteBatch(ids);

      return c.json({
        success: true,
        deleted: count,
        message: `Deleted ${count} text(s)`,
      });
    } catch (error) {
      console.error("Error deleting batch texts:", error);
      return errors.internal(c, "Failed to delete batch texts");
    }
  }
);

// ----------------------------------------------------------------------------
// Statistics
// ----------------------------------------------------------------------------

/**
 * GET /stats
 *
 * Get statistics about generated texts.
 */
generatedTextRoutes.get("/stats", async (c) => {
  try {
    const projectId = c.req.query("projectId");
    const service = getGeneratedTextService();
    const stats = await service.getStats(projectId);

    return c.json(stats);
  } catch (error) {
    console.error("Error getting stats:", error);
    return errors.internal(c, "Failed to get stats");
  }
});
