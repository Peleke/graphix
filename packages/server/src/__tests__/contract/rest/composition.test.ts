/**
 * Contract Tests: REST API - Composition
 *
 * Tests the /api/composition endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

describe("REST /api/composition", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("GET /api/composition/templates", () => {
    it("returns 200 with templates list", async () => {
      const res = await app.request("/api/composition/templates");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("templates");
      expect(body).toHaveProperty("count");
    });
  });

  // TODO: Add full contract tests for all composition endpoints
});
