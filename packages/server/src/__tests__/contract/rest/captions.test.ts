/**
 * Contract Tests: REST API - Captions
 *
 * Tests the /api/captions endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("REST /api/captions", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("GET /api/captions/{id}", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/captions/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent caption", async () => {
      const res = await app.request("/api/captions/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // TODO: Add full contract tests for all caption endpoints
});
