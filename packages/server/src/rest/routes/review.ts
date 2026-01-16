/**
 * Review Routes
 *
 * REST API endpoints for the image review and regeneration system:
 * - Single image review
 * - Panel-level review
 * - Autonomous review+regenerate loop
 * - Human-in-the-loop queue management
 * - Batch storyboard review
 */

import { Hono } from "hono";
import {
  getReviewService,
  type ReviewConfig,
  type HumanDecision,
  type BatchReviewOptions,
} from "@graphix/core";

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_MODES: readonly string[] = ["unattended", "hitl"];

/** Maximum length for feedback text (10KB should be more than enough) */
const MAX_FEEDBACK_LENGTH = 10000;

/** Maximum length for regeneration hints (5KB) */
const MAX_HINTS_LENGTH = 5000;

/** Maximum length for prompt overrides (20KB) */
const MAX_PROMPT_LENGTH = 20000;

/**
 * Safely parse a number from a string with validation.
 */
function safeParseNumber(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

/**
 * Safely parse an integer from a string.
 */
function safeParseInt(
  value: string | undefined,
  defaultValue: number,
  min = 0,
  max = 10000
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

/**
 * Create a consistent error response.
 */
function errorResponse(message: string, code: string = "BAD_REQUEST") {
  return { error: message, code };
}

/**
 * Result of parsing a JSON body - either success with data or error with response.
 */
type BodyParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

/**
 * Safely parse JSON body from request.
 * Returns a structured result instead of silently swallowing errors.
 * If allowEmpty is true, returns empty object on parse failure (for optional bodies).
 */
async function safeParseBody<T extends Record<string, unknown>>(
  c: { req: { json: () => Promise<T> } },
  allowEmpty = false
): Promise<BodyParseResult<T>> {
  try {
    const body = await c.req.json();
    return { success: true, data: body };
  } catch {
    if (allowEmpty) {
      return { success: true, data: {} as T };
    }
    return {
      success: false,
      error: { message: "Invalid JSON in request body", code: "INVALID_JSON" },
    };
  }
}

/**
 * Validate string length and return sanitized value or null if invalid.
 */
function validateStringLength(
  value: unknown,
  maxLength: number,
  fieldName: string
): { valid: true; value: string | undefined } | { valid: false; error: string } {
  if (value === undefined || value === null) {
    return { valid: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength} characters` };
  }
  return { valid: true, value };
}

/**
 * Parse review config from request body.
 */
function parseReviewConfig(body: Record<string, unknown>): Partial<ReviewConfig> {
  const config: Partial<ReviewConfig> = {};

  if (body.mode && VALID_MODES.includes(body.mode as string)) {
    config.mode = body.mode as "unattended" | "hitl";
  }
  if (typeof body.maxIterations === "number") {
    config.maxIterations = Math.max(1, Math.min(10, body.maxIterations));
  }
  if (typeof body.minAcceptanceScore === "number") {
    config.minAcceptanceScore = Math.max(0, Math.min(1, body.minAcceptanceScore));
  }
  if (typeof body.autoApproveAbove === "number") {
    config.autoApproveAbove = Math.max(0, Math.min(1, body.autoApproveAbove));
  }
  if (typeof body.pauseForHumanBelow === "number") {
    config.pauseForHumanBelow = Math.max(0, Math.min(1, body.pauseForHumanBelow));
  }

  return config;
}

const reviewRoutes = new Hono();

// ============================================================================
// SINGLE IMAGE REVIEW ROUTES
// ============================================================================

/**
 * POST /api/review/images/:imageId
 * Review a single generated image for prompt adherence.
 */
reviewRoutes.post("/images/:imageId", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  // Parse body - allow empty since all fields are optional
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  // Validate prompt length if provided
  const promptValidation = validateStringLength(body.prompt, MAX_PROMPT_LENGTH, "prompt");
  if (!promptValidation.valid) {
    return c.json(errorResponse(promptValidation.error, "VALIDATION_ERROR"), 400);
  }

  try {
    const result = await service.reviewImage(
      imageId,
      promptValidation.value, // Optional prompt override
      body.context // Optional panel context
    );

    return c.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

/**
 * GET /api/review/images/:imageId
 * Get the latest review result for an image.
 */
reviewRoutes.get("/images/:imageId", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  const review = await service.getLatestReview(imageId);

  if (!review) {
    return c.json(errorResponse("No review found for this image", "NOT_FOUND"), 404);
  }

  return c.json(review);
});

/**
 * GET /api/review/images/:imageId/history
 * Get the full review history for an image.
 */
reviewRoutes.get("/images/:imageId/history", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  const history = await service.getImageReviewHistory(imageId);

  return c.json({
    imageId,
    reviews: history,
    count: history.length,
  });
});

// ============================================================================
// PANEL-LEVEL REVIEW ROUTES
// ============================================================================

/**
 * POST /api/review/panels/:panelId
 * Review the current/selected image for a panel.
 */
reviewRoutes.post("/panels/:panelId", async (c) => {
  const service = getReviewService();
  const panelId = c.req.param("panelId");

  try {
    const result = await service.reviewPanel(panelId);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    if (error instanceof Error && error.message.includes("No images")) {
      return c.json(errorResponse(error.message, "NO_IMAGES"), 400);
    }
    throw error;
  }
});

/**
 * POST /api/review/panels/:panelId/auto
 * Run the autonomous review+regenerate loop for a panel.
 */
reviewRoutes.post("/panels/:panelId/auto", async (c) => {
  const service = getReviewService();
  const panelId = c.req.param("panelId");

  // Parse body - allow empty since all fields are optional config
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  // Parse config from body
  const config = parseReviewConfig(body);

  try {
    const result = await service.reviewAndRegenerateUntilAccepted(panelId, config);

    return c.json({
      panelId,
      ...result,
      iterationSummary: result.iterations.map((i) => ({
        iteration: i.iteration,
        score: i.score,
        status: i.status,
        recommendation: i.recommendation,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    if (error instanceof Error && error.message.includes("No images")) {
      return c.json(errorResponse(error.message, "NO_IMAGES"), 400);
    }
    throw error;
  }
});

/**
 * GET /api/review/panels/:panelId/history
 * Get all review iterations for a panel.
 */
reviewRoutes.get("/panels/:panelId/history", async (c) => {
  const service = getReviewService();
  const panelId = c.req.param("panelId");

  const history = await service.getPanelReviewHistory(panelId);

  return c.json({
    panelId,
    reviews: history,
    count: history.length,
    latestIteration: history.length > 0 ? history[0].iteration : 0,
  });
});

// ============================================================================
// BATCH OPERATIONS (STORYBOARD-LEVEL)
// ============================================================================

/**
 * POST /api/review/storyboards/:id
 * Review all panels in a storyboard (non-autonomous mode).
 */
reviewRoutes.post("/storyboards/:id", async (c) => {
  const service = getReviewService();
  const storyboardId = c.req.param("id");

  // Parse body - allow empty since all fields are optional config
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  const options: BatchReviewOptions = {
    config: {
      ...parseReviewConfig(body),
      mode: "hitl", // Force non-autonomous for this endpoint
    },
    onlyPending: body.onlyPending === true,
    limit: body.limit ? safeParseInt(String(body.limit), 100, 1, 1000) : undefined,
    parallel: body.parallel === true,
    concurrency: body.concurrency ? safeParseInt(String(body.concurrency), 3, 1, 10) : 3,
  };

  try {
    const result = await service.reviewStoryboard(storyboardId, options);

    // Convert Map to array for JSON serialization
    const resultsArray = Array.from(result.results.entries()).map(([panelId, review]) => ({
      panelId,
      score: review.score,
      status: review.status,
      recommendation: review.recommendation,
      issueCount: review.issues.length,
    }));

    return c.json({
      storyboardId,
      summary: {
        total: result.total,
        approved: result.approved,
        needsWork: result.needsWork,
        rejected: result.rejected,
        pendingHuman: result.pendingHuman,
      },
      results: resultsArray,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

/**
 * POST /api/review/storyboards/:id/auto
 * Run autonomous review on all panels in a storyboard.
 */
reviewRoutes.post("/storyboards/:id/auto", async (c) => {
  const service = getReviewService();
  const storyboardId = c.req.param("id");

  // Parse body - allow empty since all fields are optional config
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  const options: BatchReviewOptions = {
    config: {
      ...parseReviewConfig(body),
      mode: "unattended", // Force autonomous for this endpoint
    },
    onlyPending: body.onlyPending === true,
    limit: body.limit ? safeParseInt(String(body.limit), 100, 1, 1000) : undefined,
    parallel: body.parallel === true,
    concurrency: body.concurrency ? safeParseInt(String(body.concurrency), 3, 1, 10) : 3,
  };

  try {
    const result = await service.reviewStoryboard(storyboardId, options);

    // Convert Map to array for JSON serialization
    const resultsArray = Array.from(result.results.entries()).map(([panelId, review]) => ({
      panelId,
      score: review.score,
      status: review.status,
      recommendation: review.recommendation,
      issueCount: review.issues.length,
    }));

    return c.json({
      storyboardId,
      mode: "unattended",
      summary: {
        total: result.total,
        approved: result.approved,
        needsWork: result.needsWork,
        rejected: result.rejected,
        pendingHuman: result.pendingHuman,
      },
      results: resultsArray,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

// ============================================================================
// HUMAN-IN-THE-LOOP (HITL) ROUTES
// ============================================================================

/**
 * GET /api/review/queue
 * Get images pending human review.
 */
reviewRoutes.get("/queue", async (c) => {
  const service = getReviewService();
  const limit = safeParseInt(c.req.query("limit"), 50, 1, 200);
  const offset = safeParseInt(c.req.query("offset"), 0, 0);

  const queue = await service.getHumanReviewQueue(limit, offset);

  return c.json({
    queue,
    count: queue.length,
    pagination: { limit, offset },
  });
});

/**
 * POST /api/review/queue/:imageId/approve
 * Human approves an image in the review queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Optional approval feedback
 */
reviewRoutes.post("/queue/:imageId/approve", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  // Parse body - allow empty since feedback is optional
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  // Validate feedback length if provided
  const feedbackValidation = validateStringLength(body.feedback, MAX_FEEDBACK_LENGTH, "feedback");
  if (!feedbackValidation.valid) {
    return c.json(errorResponse(feedbackValidation.error, "VALIDATION_ERROR"), 400);
  }

  try {
    const decision: HumanDecision = {
      action: "approve",
      feedback: feedbackValidation.value,
    };

    const result = await service.recordHumanDecision(imageId, decision);

    return c.json({
      ...result,
      message: "Image approved",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

/**
 * POST /api/review/queue/:imageId/reject
 * Human rejects an image in the review queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Required rejection feedback explaining why
 */
reviewRoutes.post("/queue/:imageId/reject", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  // Parse body - required for reject (need feedback)
  const bodyResult = await safeParseBody(c, false);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  // Validate feedback - required for rejection
  const feedbackValidation = validateStringLength(body.feedback, MAX_FEEDBACK_LENGTH, "feedback");
  if (!feedbackValidation.valid) {
    return c.json(errorResponse(feedbackValidation.error, "VALIDATION_ERROR"), 400);
  }
  if (!feedbackValidation.value) {
    return c.json(
      errorResponse("Feedback is required when rejecting an image", "MISSING_FEEDBACK"),
      400
    );
  }

  try {
    const decision: HumanDecision = {
      action: "reject",
      feedback: feedbackValidation.value,
    };

    const result = await service.recordHumanDecision(imageId, decision);

    return c.json({
      ...result,
      message: "Image rejected",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

/**
 * POST /api/review/queue/:imageId/regenerate
 * Human requests regeneration for an image in the queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Optional feedback about why regeneration is needed
 * @body hints - Optional hints for the regeneration (e.g., "more dramatic lighting")
 */
reviewRoutes.post("/queue/:imageId/regenerate", async (c) => {
  const service = getReviewService();
  const imageId = c.req.param("imageId");

  // Parse body - allow empty since all fields are optional
  const bodyResult = await safeParseBody(c, true);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  // Validate feedback length if provided
  const feedbackValidation = validateStringLength(body.feedback, MAX_FEEDBACK_LENGTH, "feedback");
  if (!feedbackValidation.valid) {
    return c.json(errorResponse(feedbackValidation.error, "VALIDATION_ERROR"), 400);
  }

  // Validate hints length if provided
  const hintsValidation = validateStringLength(body.hints, MAX_HINTS_LENGTH, "hints");
  if (!hintsValidation.valid) {
    return c.json(errorResponse(hintsValidation.error, "VALIDATION_ERROR"), 400);
  }

  try {
    const decision: HumanDecision = {
      action: "regenerate",
      feedback: feedbackValidation.value,
      regenerationHints: hintsValidation.value,
    };

    const result = await service.recordHumanDecision(imageId, decision);

    return c.json({
      ...result,
      message: "Regeneration requested",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json(errorResponse(error.message, "NOT_FOUND"), 404);
    }
    throw error;
  }
});

// ============================================================================
// CONFIGURATION & STATUS
// ============================================================================

/**
 * GET /api/review/config
 * Get the current review service configuration.
 */
reviewRoutes.get("/config", async (c) => {
  const service = getReviewService();
  const config = service.getConfig();

  return c.json(config);
});

/**
 * PUT /api/review/config
 * Update the review service configuration.
 */
reviewRoutes.put("/config", async (c) => {
  const service = getReviewService();

  // Parse body - required for config update
  const bodyResult = await safeParseBody(c, false);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }
  const body = bodyResult.data;

  const config = parseReviewConfig(body);
  service.setConfig(config);

  return c.json({
    message: "Configuration updated",
    config: service.getConfig(),
  });
});

export { reviewRoutes };
