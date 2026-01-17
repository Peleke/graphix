/**
 * Hono REST API Application
 *
 * Main app setup with middleware and routes.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import {
  ApiError,
  createErrorResponse,
  inferApiError,
  ErrorCodes,
} from "./errors/index.js";
import { projectRoutes } from "./routes/projects.js";
import { characterRoutes } from "./routes/characters.js";
import { storyboardRoutes } from "./routes/storyboards.js";
import { panelRoutes } from "./routes/panels.js";
import { generationRoutes } from "./routes/generations.js";
import { compositionRoutes } from "./routes/composition.js";
import { consistencyRoutes } from "./routes/consistency.js";
import { captionRoutes } from "./routes/captions.js";
import { storyRoutes } from "./routes/story.js";
import { batchRoutes } from "./routes/batch.js";
import { narrativeRoutes } from "./routes/narrative.js";
import { reviewRoutes } from "./routes/review.js";
import { textGenerationRoutes } from "./routes/text-generation.js";
import { generatedTextRoutes } from "./routes/generated-texts.js";
import { openapi } from "../openapi/index.js";
import { getDefaultConnection, checkDatabaseHealth, getConfig } from "@graphix/core";

type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Request ID middleware
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
});

// Health check
app.get("/health", async (c) => {
  const { client } = getDefaultConnection();
  const config = getConfig();
  const dbHealth = await checkDatabaseHealth(client, config.storage.database.mode);

  return c.json({
    status: dbHealth.connected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// API version prefix
const api = new Hono();

// Mount routes
api.route("/projects", projectRoutes);
api.route("/characters", characterRoutes);
api.route("/storyboards", storyboardRoutes);
api.route("/panels", panelRoutes);
api.route("/generations", generationRoutes);
api.route("/composition", compositionRoutes);
api.route("/consistency", consistencyRoutes);
api.route("/story", storyRoutes);
api.route("/batch", batchRoutes);
api.route("/narrative", narrativeRoutes);
api.route("/review", reviewRoutes);
api.route("/text", textGenerationRoutes);
api.route("/generated-texts", generatedTextRoutes);

// Caption routes (mounted at /captions for direct caption CRUD, panels routes are nested)
api.route("/captions", captionRoutes);

// OpenAPI documentation (Swagger UI at /api/docs, spec at /api/docs/spec.json)
api.route("/docs", openapi);

// Mount API under /api prefix
app.route("/api", api);

// Global error handling with standardized responses
app.onError((err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const apiError = new ApiError(
      err.message,
      err.status === 401
        ? ErrorCodes.UNAUTHORIZED
        : err.status === 403
          ? ErrorCodes.FORBIDDEN
          : err.status === 404
            ? ErrorCodes.NOT_FOUND
            : ErrorCodes.INTERNAL_ERROR
    );
    const response = createErrorResponse(c, apiError, requestId);
    return c.json(response, err.status);
  }

  // Handle our custom ApiError
  if (err instanceof ApiError) {
    const response = createErrorResponse(c, err, requestId);
    return c.json(response, err.statusCode as any);
  }

  // Infer error type from message patterns for legacy errors
  const inferredError = inferApiError(err);
  const response = createErrorResponse(c, inferredError, requestId);

  // Log unexpected/internal errors
  if (inferredError.code === ErrorCodes.INTERNAL_ERROR) {
    console.error(`[${requestId}] Unexpected error:`, err);
    // In development, include stack trace in response
    if (process.env.NODE_ENV === "development" && err.stack) {
      (response.error as any).stack = err.stack;
    }
  }

  return c.json(response, inferredError.statusCode as any);
});

// 404 handler with standardized response
app.notFound((c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const apiError = new ApiError(
    `Route '${c.req.path}' not found`,
    ErrorCodes.NOT_FOUND,
    { path: c.req.path, method: c.req.method }
  );
  const response = createErrorResponse(c, apiError, requestId);
  return c.json(response, 404);
});

export { app };
