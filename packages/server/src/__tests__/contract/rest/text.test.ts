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

  describe("GET /api/text/status", () => {
    it("returns 200 with provider status", async () => {
      const res = await app.request("/api/text/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("config");
    });
  });

  describe("GET /api/generated-texts/{id}", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/generated-texts/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent text", async () => {
      const res = await app.request("/api/generated-texts/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // TODO: Add full contract tests for all text endpoints
});
