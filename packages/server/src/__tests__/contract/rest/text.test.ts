/**
 * Contract Tests: REST API - Text Generation & Generated Texts
 *
 * Tests the /api/text and /api/generated-texts endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("REST /api/text", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/text/status
  // ============================================================================

  describe("GET /api/text/status", () => {
    it("returns 200 with provider status", async () => {
      const res = await app.request("/api/text/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("config");
      expect(typeof body.config).toBe("object");
    });
  });

  // ============================================================================
  // GET /api/text/providers
  // ============================================================================

  describe("GET /api/text/providers", () => {
    it("returns 200 with providers list", async () => {
      const res = await app.request("/api/text/providers");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("current");
      expect(body).toHaveProperty("providers");
      expect(Array.isArray(body.providers)).toBe(true);
    });
  });

  // ============================================================================
  // POST /api/text/generate
  // ============================================================================

  describe("POST /api/text/generate", () => {
    it("returns 400 when prompt is missing", async () => {
      const res = await app.request("/api/text/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when prompt is empty", async () => {
      const res = await app.request("/api/text/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "" }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/generated-texts/:id
  // ============================================================================

  describe("GET /api/generated-texts/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/generated-texts/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent text", async () => {
      const res = await app.request("/api/generated-texts/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/generated-texts
  // ============================================================================

  describe("POST /api/generated-texts", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/generated-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when text is empty", async () => {
      const res = await app.request("/api/generated-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "",
          textType: "raw",
          provider: "test-provider",
          model: "test-model",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // PATCH /api/generated-texts/:id
  // ============================================================================

  describe("PATCH /api/generated-texts/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/generated-texts/invalid-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent text", async () => {
      const res = await app.request("/api/generated-texts/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated" }),
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // DELETE /api/generated-texts/:id
  // ============================================================================

  describe("DELETE /api/generated-texts/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/generated-texts/invalid-id", {
        method: "DELETE",
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent text", async () => {
      const res = await app.request("/api/generated-texts/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/generated-texts/panels/:panelId
  // ============================================================================

  describe("GET /api/generated-texts/panels/:panelId", () => {
    it("returns 400 for invalid panel ID format", async () => {
      const res = await app.request("/api/generated-texts/panels/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 200 with empty array when panel has no texts", async () => {
      const res = await app.request("/api/generated-texts/panels/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("texts");
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("panelId");
      expect(Array.isArray(body.texts)).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/generated-texts/stats
  // ============================================================================

  describe("GET /api/generated-texts/stats", () => {
    it("returns 200 with stats object", async () => {
      const res = await app.request("/api/generated-texts/stats");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body).toBe("object");
    });
  });
});
