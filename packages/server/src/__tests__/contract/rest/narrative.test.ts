/**
 * Contract Tests: REST API - Narrative
 *
 * Tests the /api/narrative endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestPremise,
} from "@graphix/core/testing";

describe("REST /api/narrative", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/narrative/premises/:id
  // ============================================================================

  describe("GET /api/narrative/premises/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/narrative/premises/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent premise", async () => {
      const res = await app.request("/api/narrative/premises/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });

    it("returns 200 with premise data when premise exists", async () => {
      const project = await createTestProject();
      const premise = await createTestPremise(project.id);

      const res = await app.request(`/api/narrative/premises/${premise.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", premise.id);
      expect(body).toHaveProperty("projectId", project.id);
      expect(body).toHaveProperty("logline");
    });
  });

  // ============================================================================
  // POST /api/narrative/premises
  // ============================================================================

  describe("POST /api/narrative/premises", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/narrative/premises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 201 with premise data when creation succeeds", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/narrative/premises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          logline: "A test logline",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("projectId", project.id);
      expect(body).toHaveProperty("logline", "A test logline");
    });
  });

  // ============================================================================
  // GET /api/narrative/stories/:id
  // ============================================================================

  describe("GET /api/narrative/stories/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/narrative/stories/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent story", async () => {
      const res = await app.request("/api/narrative/stories/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/narrative/stories
  // ============================================================================

  describe("POST /api/narrative/stories", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/narrative/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/narrative/beats/:id
  // ============================================================================

  describe("GET /api/narrative/beats/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/narrative/beats/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent beat", async () => {
      const res = await app.request("/api/narrative/beats/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/narrative/beats
  // ============================================================================

  describe("POST /api/narrative/beats", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/narrative/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });
});
