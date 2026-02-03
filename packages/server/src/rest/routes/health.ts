/**
 * Health Check Routes
 *
 * System health and connectivity checks.
 */

import { Hono } from "hono";
import { getComfyUIClient, getStorageProvider } from "@graphix/core";

const healthRoutes = new Hono();

// Overall health check
healthRoutes.get("/", async (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ComfyUI connectivity check
healthRoutes.get("/comfyui", async (c) => {
  const client = getComfyUIClient();

  try {
    const result = await client.ping();

    if (result.reachable) {
      return c.json({
        status: "connected",
        latency_ms: result.latency_ms,
        url: process.env.COMFYUI_MCP_URL || "http://localhost:3001",
      });
    } else {
      return c.json({
        status: "unreachable",
        url: process.env.COMFYUI_MCP_URL || "http://localhost:3001",
        hint: "ComfyUI MCP server is not responding. Check if it's running.",
      }, 503);
    }
  } catch (error) {
    return c.json({
      status: "error",
      url: process.env.COMFYUI_MCP_URL || "http://localhost:3001",
      error: error instanceof Error ? error.message : "Unknown error",
      hint: "Failed to connect to ComfyUI. Verify the server is running.",
    }, 503);
  }
});

// Storage health check
healthRoutes.get("/storage", async (c) => {
  try {
    const storage = getStorageProvider();
    const result = await storage.healthCheck();

    if (result.ok) {
      return c.json({
        status: "ok",
        provider: storage.name,
        details: result.details,
      });
    } else {
      return c.json({
        status: "error",
        provider: storage.name,
        error: result.error,
      }, 503);
    }
  } catch (error) {
    return c.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, 503);
  }
});

export { healthRoutes };
