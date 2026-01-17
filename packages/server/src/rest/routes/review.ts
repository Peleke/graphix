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
import { z } from "zod";
import {
  getReviewService,
  type ReviewConfig,
  type HumanDecision,
  type BatchReviewOptions,
} from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  validateParam,
  validateQuery,
  paginationSchema,
  idParamSchema,
  imageIdParamSchema,
  panelIdParamSchema,
} from "../validation/index.js";

// ============================================================================
// Validation Constants
// ============================================================================

/** Maximum length for feedback text (10KB should be more than enough) */
const MAX_FEEDBACK_LENGTH = 10000;

/** Maximum length for regeneration hints (5KB) */
const MAX_HINTS_LENGTH = 5000;

/** Maximum length for prompt overrides (20KB) */
const MAX_PROMPT_LENGTH = 20000;

// ============================================================================
// Zod Schemas for Review Routes
// ============================================================================

/** Schema for single image review request */
const reviewImageSchema = z.object({
  prompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  context: z.record(z.unknown()).optional(),
});

/** Schema for review config in request bodies */
const reviewConfigSchema = z.object({
  mode: z.enum(["unattended", "hitl"]).optional(),
  maxIterations: z.number().int().min(1).max(10).optional(),
  minAcceptanceScore: z.number().min(0).max(1).optional(),
  autoApproveAbove: z.number().min(0).max(1).optional(),
  pauseForHumanBelow: z.number().min(0).max(1).optional(),
});

/** Schema for batch review options */
const batchReviewSchema = reviewConfigSchema.extend({
  onlyPending: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  parallel: z.boolean().optional(),
  concurrency: z.number().int().min(1).max(10).optional(),
});

/** Schema for queue pagination */
const queueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Schema for approval request */
const approveSchema = z.object({
  feedback: z.string().max(MAX_FEEDBACK_LENGTH).optional(),
});

/** Schema for rejection request (feedback required) */
const rejectSchema = z.object({
  feedback: z.string().min(1, "Feedback is required when rejecting an image").max(MAX_FEEDBACK_LENGTH),
});

/** Schema for regeneration request */
const regenerateSchema = z.object({
  feedback: z.string().max(MAX_FEEDBACK_LENGTH).optional(),
  hints: z.string().max(MAX_HINTS_LENGTH).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse review config from validated body.
 */
function parseReviewConfig(body: z.infer<typeof reviewConfigSchema>): Partial<ReviewConfig> {
  const config: Partial<ReviewConfig> = {};

  if (body.mode) {
    config.mode = body.mode;
  }
  if (body.maxIterations !== undefined) {
    config.maxIterations = body.maxIterations;
  }
  if (body.minAcceptanceScore !== undefined) {
    config.minAcceptanceScore = body.minAcceptanceScore;
  }
  if (body.autoApproveAbove !== undefined) {
    config.autoApproveAbove = body.autoApproveAbove;
  }
  if (body.pauseForHumanBelow !== undefined) {
    config.pauseForHumanBelow = body.pauseForHumanBelow;
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
reviewRoutes.post(
  "/images/:imageId",
  validateParam(imageIdParamSchema),
  validateBody(reviewImageSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const result = await service.reviewImage(
        imageId,
        body.prompt, // Optional prompt override
        body.context // Optional panel context
      );

      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return errors.notFound(c, "Image", imageId);
      }
      throw error;
    }
  }
);

/**
 * GET /api/review/images/:imageId
 * Get the latest review result for an image.
 */
reviewRoutes.get(
  "/images/:imageId",
  validateParam(imageIdParamSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");

    const review = await service.getLatestReview(imageId);

    if (!review) {
      return errors.notFound(c, "Review for image", imageId);
    }

    return c.json(review);
  }
);

/**
 * GET /api/review/images/:imageId/history
 * Get the full review history for an image.
 */
reviewRoutes.get(
  "/images/:imageId/history",
  validateParam(imageIdParamSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");

    const history = await service.getImageReviewHistory(imageId);

    return c.json({
      imageId,
      reviews: history,
      count: history.length,
    });
  }
);

// ============================================================================
// PANEL-LEVEL REVIEW ROUTES
// ============================================================================

/**
 * POST /api/review/panels/:panelId
 * Review the current/selected image for a panel.
 */
reviewRoutes.post(
  "/panels/:panelId",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getReviewService();
    const { panelId } = c.req.valid("param");

    try {
      const result = await service.reviewPanel(panelId);
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return errors.notFound(c, "Panel", panelId);
      }
      if (error instanceof Error && error.message.includes("No images")) {
        return errors.badRequest(c, error.message);
      }
      throw error;
    }
  }
);

/**
 * POST /api/review/panels/:panelId/auto
 * Run the autonomous review+regenerate loop for a panel.
 */
reviewRoutes.post(
  "/panels/:panelId/auto",
  validateParam(panelIdParamSchema),
  validateBody(reviewConfigSchema),
  async (c) => {
    const service = getReviewService();
    const { panelId } = c.req.valid("param");
    const body = c.req.valid("json");

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
        return errors.notFound(c, "Panel", panelId);
      }
      if (error instanceof Error && error.message.includes("No images")) {
        return errors.badRequest(c, error.message);
      }
      throw error;
    }
  }
);

/**
 * GET /api/review/panels/:panelId/history
 * Get all review iterations for a panel.
 */
reviewRoutes.get(
  "/panels/:panelId/history",
  validateParam(panelIdParamSchema),
  async (c) => {
    const service = getReviewService();
    const { panelId } = c.req.valid("param");

    const history = await service.getPanelReviewHistory(panelId);

    return c.json({
      panelId,
      reviews: history,
      count: history.length,
      latestIteration: history.length > 0 ? history[0].iteration : 0,
    });
  }
);

// ============================================================================
// BATCH OPERATIONS (STORYBOARD-LEVEL)
// ============================================================================

/**
 * POST /api/review/storyboards/:id
 * Review all panels in a storyboard (non-autonomous mode).
 */
reviewRoutes.post(
  "/storyboards/:id",
  validateParam(idParamSchema),
  validateBody(batchReviewSchema),
  async (c) => {
    const service = getReviewService();
    const { id: storyboardId } = c.req.valid("param");
    const body = c.req.valid("json");

    const options: BatchReviewOptions = {
      config: {
        ...parseReviewConfig(body),
        mode: "hitl", // Force non-autonomous for this endpoint
      },
      onlyPending: body.onlyPending === true,
      limit: body.limit,
      parallel: body.parallel === true,
      concurrency: body.concurrency ?? 3,
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
        return errors.notFound(c, "Storyboard", storyboardId);
      }
      throw error;
    }
  }
);

/**
 * POST /api/review/storyboards/:id/auto
 * Run autonomous review on all panels in a storyboard.
 */
reviewRoutes.post(
  "/storyboards/:id/auto",
  validateParam(idParamSchema),
  validateBody(batchReviewSchema),
  async (c) => {
    const service = getReviewService();
    const { id: storyboardId } = c.req.valid("param");
    const body = c.req.valid("json");

    const options: BatchReviewOptions = {
      config: {
        ...parseReviewConfig(body),
        mode: "unattended", // Force autonomous for this endpoint
      },
      onlyPending: body.onlyPending === true,
      limit: body.limit,
      parallel: body.parallel === true,
      concurrency: body.concurrency ?? 3,
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
        return errors.notFound(c, "Storyboard", storyboardId);
      }
      throw error;
    }
  }
);

// ============================================================================
// HUMAN-IN-THE-LOOP (HITL) ROUTES
// ============================================================================

/**
 * GET /api/review/queue
 * Get images pending human review.
 */
reviewRoutes.get(
  "/queue",
  validateQuery(queueQuerySchema),
  async (c) => {
    const service = getReviewService();
    const { limit, offset } = c.req.valid("query");

    const queue = await service.getHumanReviewQueue(limit, offset);

    return c.json({
      queue,
      count: queue.length,
      pagination: { limit, offset },
    });
  }
);

/**
 * POST /api/review/queue/:imageId/approve
 * Human approves an image in the review queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Optional approval feedback
 */
reviewRoutes.post(
  "/queue/:imageId/approve",
  validateParam(imageIdParamSchema),
  validateBody(approveSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const decision: HumanDecision = {
        action: "approve",
        feedback: body.feedback,
      };

      const result = await service.recordHumanDecision(imageId, decision);

      return c.json({
        ...result,
        message: "Image approved",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return errors.notFound(c, "Image", imageId);
      }
      throw error;
    }
  }
);

/**
 * POST /api/review/queue/:imageId/reject
 * Human rejects an image in the review queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Required rejection feedback explaining why
 */
reviewRoutes.post(
  "/queue/:imageId/reject",
  validateParam(imageIdParamSchema),
  validateBody(rejectSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const decision: HumanDecision = {
        action: "reject",
        feedback: body.feedback,
      };

      const result = await service.recordHumanDecision(imageId, decision);

      return c.json({
        ...result,
        message: "Image rejected",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return errors.notFound(c, "Image", imageId);
      }
      throw error;
    }
  }
);

/**
 * POST /api/review/queue/:imageId/regenerate
 * Human requests regeneration for an image in the queue.
 *
 * @param imageId - The generated image ID (not the review ID)
 * @body feedback - Optional feedback about why regeneration is needed
 * @body hints - Optional hints for the regeneration (e.g., "more dramatic lighting")
 */
reviewRoutes.post(
  "/queue/:imageId/regenerate",
  validateParam(imageIdParamSchema),
  validateBody(regenerateSchema),
  async (c) => {
    const service = getReviewService();
    const { imageId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const decision: HumanDecision = {
        action: "regenerate",
        feedback: body.feedback,
        regenerationHints: body.hints,
      };

      const result = await service.recordHumanDecision(imageId, decision);

      return c.json({
        ...result,
        message: "Regeneration requested",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return errors.notFound(c, "Image", imageId);
      }
      throw error;
    }
  }
);

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
reviewRoutes.put(
  "/config",
  validateBody(reviewConfigSchema),
  async (c) => {
    const service = getReviewService();
    const body = c.req.valid("json");

    const config = parseReviewConfig(body);
    service.setConfig(config);

    return c.json({
      message: "Configuration updated",
      config: service.getConfig(),
    });
  }
);

export { reviewRoutes };
