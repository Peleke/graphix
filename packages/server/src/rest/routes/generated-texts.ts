/**
 * Generated Text Routes
 *
 * REST API endpoints for managing stored AI-generated text.
 * Supports CRUD operations, regeneration, and batch operations.
 */

import { Hono } from "hono";
import {
  getGeneratedTextService,
  type GeneratedTextType,
  type GeneratedTextStatus,
} from "@graphix/core";

// ============================================================================
// Validation Helpers
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

/** Pagination bounds */
const MAX_LIMIT = 1000;
const MAX_OFFSET = 1000000;
const DEFAULT_LIMIT = 100;

/** Numeric parameter bounds */
const NUMERIC_BOUNDS = {
  temperature: { min: 0, max: 2 },
  maxTokens: { min: 1, max: 100000 },
  tokensUsed: { min: 0, max: 10000000 },
  inputTokens: { min: 0, max: 10000000 },
  outputTokens: { min: 0, max: 10000000 },
} as const;

/**
 * Create a consistent error response.
 * Sanitizes error messages to avoid leaking internal details.
 */
function errorResponse(message: string, code: string = "BAD_REQUEST") {
  // Sanitize error messages to prevent information leakage
  const sanitizedMessage = sanitizeErrorMessage(message);
  return { error: sanitizedMessage, code };
}

/**
 * Sanitize error messages to prevent information leakage.
 */
function sanitizeErrorMessage(message: string): string {
  // Map internal error patterns to user-friendly messages
  if (message.includes("UNIQUE constraint failed")) {
    return "This resource already exists";
  }
  if (message.includes("FOREIGN KEY constraint failed")) {
    return "Referenced resource does not exist";
  }
  if (message.includes("no such table")) {
    return "Service temporarily unavailable";
  }
  if (message.includes("SQLITE_")) {
    return "Database operation failed";
  }
  // Don't leak file paths
  if (message.includes("/") && message.includes(".")) {
    return "An internal error occurred";
  }
  return message;
}

/**
 * Dangerous keys that can cause prototype pollution.
 */
const PROTOTYPE_POLLUTION_KEYS = ["__proto__", "constructor", "prototype"];

/**
 * Sanitize metadata object to prevent prototype pollution attacks.
 * Removes dangerous keys like __proto__, constructor, prototype.
 */
function sanitizeMetadata(
  metadata: unknown
): Record<string, unknown> | undefined {
  if (metadata === null || metadata === undefined) {
    return undefined;
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    // Skip prototype pollution keys
    if (PROTOTYPE_POLLUTION_KEYS.includes(key)) {
      continue;
    }
    // Recursively sanitize nested objects
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Validate numeric value is within bounds.
 */
function validateNumericBounds(
  value: unknown,
  fieldName: keyof typeof NUMERIC_BOUNDS
): { valid: true; value: number } | { valid: false; error: string } {
  if (value === undefined || value === null) {
    return { valid: true, value: 0 };
  }

  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  const bounds = NUMERIC_BOUNDS[fieldName];
  if (num < bounds.min || num > bounds.max) {
    return {
      valid: false,
      error: `${fieldName} must be between ${bounds.min} and ${bounds.max}`,
    };
  }

  return { valid: true, value: num };
}

/**
 * Validate pagination parameters.
 */
function validatePagination(
  limitStr: string | undefined,
  offsetStr: string | undefined
): { valid: true; limit?: number; offset?: number } | { valid: false; error: string } {
  let limit: number | undefined;
  let offset: number | undefined;

  if (limitStr !== undefined) {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      return { valid: false, error: `limit must be between 1 and ${MAX_LIMIT}` };
    }
  }

  if (offsetStr !== undefined) {
    offset = parseInt(offsetStr, 10);
    if (isNaN(offset) || offset < 0 || offset > MAX_OFFSET) {
      return { valid: false, error: `offset must be between 0 and ${MAX_OFFSET}` };
    }
  }

  return { valid: true, limit, offset };
}

/**
 * Type guard for string values.
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard for valid text type.
 */
function isValidTextType(value: unknown): value is GeneratedTextType {
  return isString(value) && VALID_TEXT_TYPES.includes(value as GeneratedTextType);
}

/**
 * Type guard for valid status.
 */
function isValidStatus(value: unknown): value is GeneratedTextStatus {
  return isString(value) && VALID_STATUSES.includes(value as GeneratedTextStatus);
}

/**
 * Safely parse JSON body from request.
 */
async function safeParseBody<T extends Record<string, unknown>>(
  c: { req: { json: () => Promise<T> } },
  allowEmpty = false
): Promise<{ success: true; data: T } | { success: false; error: { message: string; code: string } }> {
  try {
    const body = await c.req.json();
    return { success: true, data: body };
  } catch {
    if (allowEmpty) {
      return { success: true, data: {} as T };
    }
    return {
      success: false,
      error: { message: "Invalid JSON body", code: "INVALID_JSON" },
    };
  }
}

/**
 * Validate string length.
 */
function validateLength(
  value: string | undefined,
  maxLength: number,
  fieldName: string
): string | null {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }
  return null;
}

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
generatedTextRoutes.get("/", async (c) => {
  try {
    const service = getGeneratedTextService();

    // Parse and validate query parameters
    const panelId = c.req.query("panelId");
    const pageLayoutId = c.req.query("pageLayoutId");
    const projectId = c.req.query("projectId");
    const textTypeParam = c.req.query("textType");
    const statusParam = c.req.query("status");

    // Validate pagination with bounds
    const pagination = validatePagination(
      c.req.query("limit"),
      c.req.query("offset")
    );
    if (!pagination.valid) {
      return c.json(errorResponse(pagination.error, "INVALID_PAGINATION"), 400);
    }

    // Validate textType with type guard
    let textType: GeneratedTextType | undefined;
    if (textTypeParam !== undefined) {
      if (!isValidTextType(textTypeParam)) {
        return c.json(
          errorResponse(`Invalid textType. Valid options: ${VALID_TEXT_TYPES.join(", ")}`, "INVALID_TYPE"),
          400
        );
      }
      textType = textTypeParam;
    }

    // Validate status with type guard
    let status: GeneratedTextStatus | undefined;
    if (statusParam !== undefined) {
      if (!isValidStatus(statusParam)) {
        return c.json(
          errorResponse(`Invalid status. Valid options: ${VALID_STATUSES.join(", ")}`, "INVALID_STATUS"),
          400
        );
      }
      status = statusParam;
    }

    const texts = await service.list({
      panelId,
      pageLayoutId,
      projectId,
      textType,
      status,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return c.json({
      texts,
      count: texts.length,
    });
  } catch (error) {
    console.error("Error listing generated texts:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to list generated texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * GET /:id
 *
 * Get a specific generated text by ID.
 */
generatedTextRoutes.get("/:id", async (c) => {
  try {
    const service = getGeneratedTextService();
    const text = await service.getById(c.req.param("id"));

    if (!text) {
      return c.json(errorResponse("Generated text not found", "NOT_FOUND"), 404);
    }

    return c.json(text);
  } catch (error) {
    console.error("Error getting generated text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get generated text",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /
 *
 * Create a new generated text entry.
 */
generatedTextRoutes.post("/", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const body = bodyResult.data;

  // Validate required fields
  if (!body.text || typeof body.text !== "string") {
    return c.json(errorResponse("text is required"), 400);
  }
  if (!body.textType || typeof body.textType !== "string") {
    return c.json(errorResponse("textType is required"), 400);
  }
  if (!body.provider || typeof body.provider !== "string") {
    return c.json(errorResponse("provider is required"), 400);
  }
  if (!body.model || typeof body.model !== "string") {
    return c.json(errorResponse("model is required"), 400);
  }

  // Validate textType
  if (!VALID_TEXT_TYPES.includes(body.textType as GeneratedTextType)) {
    return c.json(
      errorResponse(`Invalid textType. Valid options: ${VALID_TEXT_TYPES.join(", ")}`, "INVALID_TYPE"),
      400
    );
  }

  // Validate lengths
  const textError = validateLength(body.text as string, MAX_TEXT_LENGTH, "text");
  if (textError) return c.json(errorResponse(textError), 400);

  if (body.prompt) {
    const promptError = validateLength(body.prompt as string, MAX_PROMPT_LENGTH, "prompt");
    if (promptError) return c.json(errorResponse(promptError), 400);
  }

  try {
    const service = getGeneratedTextService();
    const text = await service.create({
      panelId: body.panelId as string | undefined,
      pageLayoutId: body.pageLayoutId as string | undefined,
      projectId: body.projectId as string | undefined,
      text: body.text as string,
      textType: body.textType as GeneratedTextType,
      provider: body.provider as string,
      model: body.model as string,
      tokensUsed: body.tokensUsed as number | undefined,
      inputTokens: body.inputTokens as number | undefined,
      outputTokens: body.outputTokens as number | undefined,
      prompt: body.prompt as string | undefined,
      systemPrompt: body.systemPrompt as string | undefined,
      temperature: body.temperature as number | undefined,
      maxTokens: body.maxTokens as number | undefined,
      metadata: sanitizeMetadata(body.metadata),
    });

    return c.json(text, 201);
  } catch (error) {
    console.error("Error creating generated text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to create generated text",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * PATCH /:id
 *
 * Update a generated text entry.
 */
generatedTextRoutes.patch("/:id", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const body = bodyResult.data;
  const id = c.req.param("id");

  // Validate text length if provided
  if (body.text) {
    const textError = validateLength(body.text as string, MAX_TEXT_LENGTH, "text");
    if (textError) return c.json(errorResponse(textError), 400);
  }

  // Validate textType if provided
  if (body.textType && !VALID_TEXT_TYPES.includes(body.textType as GeneratedTextType)) {
    return c.json(
      errorResponse(`Invalid textType. Valid options: ${VALID_TEXT_TYPES.join(", ")}`, "INVALID_TYPE"),
      400
    );
  }

  // Validate status if provided
  if (body.status && !VALID_STATUSES.includes(body.status as GeneratedTextStatus)) {
    return c.json(
      errorResponse(`Invalid status. Valid options: ${VALID_STATUSES.join(", ")}`, "INVALID_STATUS"),
      400
    );
  }

  try {
    const service = getGeneratedTextService();
    const text = await service.update(id, {
      text: body.text as string | undefined,
      textType: body.textType as GeneratedTextType | undefined,
      status: body.status as GeneratedTextStatus | undefined,
      metadata: sanitizeMetadata(body.metadata),
    });

    return c.json(text);
  } catch (error) {
    console.error("Error updating generated text:", error);
    const message = error instanceof Error ? error.message : "Failed to update generated text";
    const status = message.includes("not found") ? 404 : 500;
    return c.json(errorResponse(message, status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"), status);
  }
});

/**
 * DELETE /:id
 *
 * Delete a generated text entry.
 */
generatedTextRoutes.delete("/:id", async (c) => {
  try {
    const service = getGeneratedTextService();
    await service.delete(c.req.param("id"));

    return c.body(null, 204);
  } catch (error) {
    console.error("Error deleting generated text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to delete generated text",
        "INTERNAL_ERROR"
      ),
      500
    );
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
generatedTextRoutes.post("/:id/archive", async (c) => {
  try {
    const service = getGeneratedTextService();
    const text = await service.archive(c.req.param("id"));

    return c.json({
      success: true,
      text,
      message: "Text archived",
    });
  } catch (error) {
    console.error("Error archiving generated text:", error);
    const message = error instanceof Error ? error.message : "Failed to archive generated text";
    const status = message.includes("not found") ? 404 : 500;
    return c.json(errorResponse(message, status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"), status);
  }
});

/**
 * POST /:id/regenerate
 *
 * Regenerate text for an existing entry.
 */
generatedTextRoutes.post("/:id/regenerate", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const body = bodyResult.data;

  // Validate newPrompt length if provided
  if (body.newPrompt) {
    const promptError = validateLength(body.newPrompt as string, MAX_PROMPT_LENGTH, "newPrompt");
    if (promptError) return c.json(errorResponse(promptError), 400);
  }

  try {
    const service = getGeneratedTextService();
    const text = await service.regenerate(c.req.param("id"), {
      newPrompt: body.newPrompt as string | undefined,
      keepHistory: body.keepHistory as boolean | undefined,
      temperature: body.temperature as number | undefined,
      maxTokens: body.maxTokens as number | undefined,
      timeoutMs: body.timeoutMs as number | undefined,
    });

    return c.json({
      success: true,
      text,
      message: "Text regenerated",
    });
  } catch (error) {
    console.error("Error regenerating text:", error);
    const message = error instanceof Error ? error.message : "Failed to regenerate text";
    const status = message.includes("not found") ? 404 : 500;
    return c.json(errorResponse(message, status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"), status);
  }
});

/**
 * POST /:id/revert
 *
 * Revert to original text (undo edits).
 */
generatedTextRoutes.post("/:id/revert", async (c) => {
  try {
    const service = getGeneratedTextService();
    const text = await service.revertToOriginal(c.req.param("id"));

    return c.json({
      success: true,
      text,
      message: "Reverted to original text",
    });
  } catch (error) {
    console.error("Error reverting text:", error);
    const message = error instanceof Error ? error.message : "Failed to revert text";
    const status = message.includes("not found") || message.includes("No original") ? 400 : 500;
    return c.json(errorResponse(message, status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR"), status);
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
generatedTextRoutes.get("/panels/:panelId", async (c) => {
  try {
    const service = getGeneratedTextService();
    const texts = await service.getByPanel(c.req.param("panelId"));

    return c.json({
      texts,
      count: texts.length,
      panelId: c.req.param("panelId"),
    });
  } catch (error) {
    console.error("Error getting texts for panel:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get texts for panel",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * GET /panels/:panelId/active/:textType
 *
 * Get the active text of a specific type for a panel.
 */
generatedTextRoutes.get("/panels/:panelId/active/:textType", async (c) => {
  const textType = c.req.param("textType") as GeneratedTextType;

  if (!VALID_TEXT_TYPES.includes(textType)) {
    return c.json(
      errorResponse(`Invalid textType. Valid options: ${VALID_TEXT_TYPES.join(", ")}`, "INVALID_TYPE"),
      400
    );
  }

  try {
    const service = getGeneratedTextService();
    const text = await service.getActiveTextForPanel(c.req.param("panelId"), textType);

    if (!text) {
      return c.json(errorResponse("No active text found", "NOT_FOUND"), 404);
    }

    return c.json(text);
  } catch (error) {
    console.error("Error getting active text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get active text",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * DELETE /panels/:panelId
 *
 * Delete all generated texts for a panel.
 */
generatedTextRoutes.delete("/panels/:panelId", async (c) => {
  try {
    const service = getGeneratedTextService();
    const count = await service.deleteByPanel(c.req.param("panelId"));

    return c.json({
      success: true,
      deleted: count,
      message: `Deleted ${count} text(s)`,
    });
  } catch (error) {
    console.error("Error deleting texts for panel:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to delete texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * GET /pages/:pageLayoutId
 *
 * Get all generated texts for a page layout.
 */
generatedTextRoutes.get("/pages/:pageLayoutId", async (c) => {
  try {
    const service = getGeneratedTextService();
    const texts = await service.getByPageLayout(c.req.param("pageLayoutId"));

    return c.json({
      texts,
      count: texts.length,
      pageLayoutId: c.req.param("pageLayoutId"),
    });
  } catch (error) {
    console.error("Error getting texts for page:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get texts for page",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * DELETE /pages/:pageLayoutId
 *
 * Delete all generated texts for a page layout.
 */
generatedTextRoutes.delete("/pages/:pageLayoutId", async (c) => {
  try {
    const service = getGeneratedTextService();
    const count = await service.deleteByPageLayout(c.req.param("pageLayoutId"));

    return c.json({
      success: true,
      deleted: count,
      message: `Deleted ${count} text(s)`,
    });
  } catch (error) {
    console.error("Error deleting texts for page:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to delete texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * GET /projects/:projectId
 *
 * Get all generated texts for a project.
 */
generatedTextRoutes.get("/projects/:projectId", async (c) => {
  try {
    const service = getGeneratedTextService();
    const texts = await service.getByProject(c.req.param("projectId"));

    return c.json({
      texts,
      count: texts.length,
      projectId: c.req.param("projectId"),
    });
  } catch (error) {
    console.error("Error getting texts for project:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get texts for project",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

// ----------------------------------------------------------------------------
// Batch Operations
// ----------------------------------------------------------------------------

/**
 * POST /batch
 *
 * Create multiple generated text entries.
 */
generatedTextRoutes.post("/batch", async (c) => {
  const bodyResult = await safeParseBody<{ texts: Array<Record<string, unknown>> }>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { texts } = bodyResult.data;

  if (!Array.isArray(texts) || texts.length === 0) {
    return c.json(errorResponse("texts array is required and must not be empty"), 400);
  }

  // Validate each text entry
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (!t.text || !t.textType || !t.provider || !t.model) {
      return c.json(
        errorResponse(`texts[${i}]: text, textType, provider, and model are required`),
        400
      );
    }
    if (!VALID_TEXT_TYPES.includes(t.textType as GeneratedTextType)) {
      return c.json(
        errorResponse(`texts[${i}]: Invalid textType. Valid options: ${VALID_TEXT_TYPES.join(", ")}`),
        400
      );
    }
    const textError = validateLength(t.text as string, MAX_TEXT_LENGTH, `texts[${i}].text`);
    if (textError) return c.json(errorResponse(textError), 400);
  }

  try {
    const service = getGeneratedTextService();
    const results = await service.createBatch(
      texts.map((t) => ({
        panelId: t.panelId as string | undefined,
        pageLayoutId: t.pageLayoutId as string | undefined,
        projectId: t.projectId as string | undefined,
        text: t.text as string,
        textType: t.textType as GeneratedTextType,
        provider: t.provider as string,
        model: t.model as string,
        tokensUsed: t.tokensUsed as number | undefined,
        inputTokens: t.inputTokens as number | undefined,
        outputTokens: t.outputTokens as number | undefined,
        prompt: t.prompt as string | undefined,
        systemPrompt: t.systemPrompt as string | undefined,
        temperature: t.temperature as number | undefined,
        maxTokens: t.maxTokens as number | undefined,
        metadata: sanitizeMetadata(t.metadata),
      }))
    );

    return c.json({
      success: true,
      texts: results,
      count: results.length,
    }, 201);
  } catch (error) {
    console.error("Error creating batch texts:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to create batch texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /batch/archive
 *
 * Archive multiple texts by IDs.
 */
generatedTextRoutes.post("/batch/archive", async (c) => {
  const bodyResult = await safeParseBody<{ ids: string[] }>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { ids } = bodyResult.data;

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json(errorResponse("ids array is required and must not be empty"), 400);
  }

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
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to archive batch texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * DELETE /batch
 *
 * Delete multiple texts by IDs.
 */
generatedTextRoutes.delete("/batch", async (c) => {
  const bodyResult = await safeParseBody<{ ids: string[] }>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { ids } = bodyResult.data;

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json(errorResponse("ids array is required and must not be empty"), 400);
  }

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
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to delete batch texts",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

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
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get stats",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});
