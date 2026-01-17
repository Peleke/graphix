/**
 * Contract Tests: REST API - Consistency
 *
 * Tests the /api/consistency endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("REST /api/consistency", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/consistency/identities
  // ============================================================================

  describe("GET /api/consistency/identities", () => {
    it("returns 200 with identities list", async () => {
      const res = await app.request("/api/consistency/identities");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("identities");
      expect(Array.isArray(body.identities)).toBe(true);
      expect(typeof body.count).toBe("number");
    });
  });

  // ============================================================================
  // GET /api/consistency/identity/:id
  // ============================================================================

  describe("GET /api/consistency/identity/:id", () => {
    it("returns 404 for non-existent identity", async () => {
      const res = await app.request("/api/consistency/identity/non-existent-id");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // POST /api/consistency/identity/extract
  // ============================================================================

  describe("POST /api/consistency/identity/extract", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/consistency/identity/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when sources array is empty", async () => {
      const res = await app.request("/api/consistency/identity/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Identity",
          sources: [],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/consistency/identity/apply
  // ============================================================================

  describe("POST /api/consistency/identity/apply", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/consistency/identity/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/consistency/chain
  // ============================================================================

  describe("POST /api/consistency/chain", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/consistency/chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/consistency/chain/sequence
  // ============================================================================

  describe("POST /api/consistency/chain/sequence", () => {
    it("returns 400 when panelIds array is missing", async () => {
      const res = await app.request("/api/consistency/chain/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when panelIds array has less than 2 items", async () => {
      const res = await app.request("/api/consistency/chain/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: ["single-id"],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/consistency/adapter-models
  // ============================================================================

  describe("GET /api/consistency/adapter-models", () => {
    it("returns 200 with adapter models list", async () => {
      const res = await app.request("/api/consistency/adapter-models");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("models");
      expect(Array.isArray(body.models)).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/consistency/control-presets
  // ============================================================================

  describe("GET /api/consistency/control-presets", () => {
    it("returns 200 with control presets list", async () => {
      const res = await app.request("/api/consistency/control-presets");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("presets");
      expect(Array.isArray(body.presets)).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/consistency/control-types
  // ============================================================================

  describe("GET /api/consistency/control-types", () => {
    it("returns 200 with control types list", async () => {
      const res = await app.request("/api/consistency/control-types");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("types");
      expect(Array.isArray(body.types)).toBe(true);
    });
  });
});
