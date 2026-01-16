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
import { projectRoutes } from "./routes/projects.js";
import { characterRoutes } from "./routes/characters.js";
import { storyboardRoutes } from "./routes/storyboards.js";
import { panelRoutes } from "./routes/panels.js";
import { generationRoutes } from "./routes/generations.js";
import { compositionRoutes } from "./routes/composition.js";
import { consistencyRoutes } from "./routes/consistency.js";
import { captionRoutes } from "./routes/captions.js";
import { checkDbHealth } from "@graphix/core";

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
  const dbHealth = await checkDbHealth();

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

// Caption routes (mounted at root since they have both /panels/:id/captions and /captions/:id paths)
api.route("/", captionRoutes);

// Mount API under /api prefix
app.route("/api", api);

// Error handling
app.onError((err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        code: `HTTP_${err.status}`,
        requestId,
      },
      err.status
    );
  }

  // Handle validation errors
  if (err.message.includes("required") || err.message.includes("must be")) {
    return c.json(
      {
        error: err.message,
        code: "VALIDATION_ERROR",
        requestId,
      },
      400
    );
  }

  // Handle not found errors
  if (err.message.includes("not found")) {
    return c.json(
      {
        error: err.message,
        code: "NOT_FOUND",
        requestId,
      },
      404
    );
  }

  // Log unexpected errors
  console.error(`[${requestId}] Unexpected error:`, err);

  return c.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      requestId,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      code: "NOT_FOUND",
      path: c.req.path,
    },
    404
  );
});

export { app };
