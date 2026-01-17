/**
 * Contract Tests: REST API - Review
 *
 * Tests the /api/review endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("REST /api/review", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/review/images/:imageId
  // ============================================================================

  describe("GET /api/review/images/:imageId", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/images/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent review", async () => {
      const res = await app.request("/api/review/images/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/review/images/:imageId
  // ============================================================================

  describe("POST /api/review/images/:imageId", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/images/invalid-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent image", async () => {
      const res = await app.request("/api/review/images/00000000-0000-0000-0000-000000000000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/review/images/:imageId/history
  // ============================================================================

  describe("GET /api/review/images/:imageId/history", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/images/invalid-id/history");
      expect(res.status).toBe(400);
    });

    it("returns 200 with history array even for non-existent image", async () => {
      const res = await app.request("/api/review/images/00000000-0000-0000-0000-000000000000/history");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("imageId");
      expect(body).toHaveProperty("reviews");
      expect(body).toHaveProperty("count");
      expect(Array.isArray(body.reviews)).toBe(true);
    });
  });

  // ============================================================================
  // POST /api/review/panels/:panelId
  // ============================================================================

  describe("POST /api/review/panels/:panelId", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/panels/invalid-id", {
        method: "POST",
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent panel", async () => {
      const res = await app.request("/api/review/panels/00000000-0000-0000-0000-000000000000", {
        method: "POST",
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/review/panels/:panelId/history
  // ============================================================================

  describe("GET /api/review/panels/:panelId/history", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/panels/invalid-id/history");
      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/review/queue
  // ============================================================================

  describe("GET /api/review/queue", () => {
    it("returns 200 with queue array", async () => {
      const res = await app.request("/api/review/queue");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("queue");
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("pagination");
      expect(Array.isArray(body.queue)).toBe(true);
    });

    it("respects limit query parameter", async () => {
      const res = await app.request("/api/review/queue?limit=10");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination).toHaveProperty("limit", 10);
    });
  });

  // ============================================================================
  // POST /api/review/queue/:imageId/approve
  // ============================================================================

  describe("POST /api/review/queue/:imageId/approve", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/queue/invalid-id/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent image", async () => {
      const res = await app.request("/api/review/queue/00000000-0000-0000-0000-000000000000/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/review/queue/:imageId/reject
  // ============================================================================

  describe("POST /api/review/queue/:imageId/reject", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/review/queue/invalid-id/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: "Test feedback" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when feedback is missing", async () => {
      const res = await app.request("/api/review/queue/00000000-0000-0000-0000-000000000000/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/review/config
  // ============================================================================

  describe("GET /api/review/config", () => {
    it("returns 200 with config object", async () => {
      const res = await app.request("/api/review/config");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body).toBe("object");
    });
  });
});
