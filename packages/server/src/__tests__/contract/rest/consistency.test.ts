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

  describe("GET /api/consistency/identities", () => {
    it("returns 200 with identities list", async () => {
      const res = await app.request("/api/consistency/identities");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("identities");
    });
  });

  // TODO: Add full contract tests for all consistency endpoints
});
