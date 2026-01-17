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
  createTestProject,
  createTestStoryboard,
} from "@graphix/core/testing";

describe("REST /api/composition", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/composition/templates
  // ============================================================================

  describe("GET /api/composition/templates", () => {
    it("returns 200 with templates list", async () => {
      const res = await app.request("/api/composition/templates");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("templates");
      expect(body).toHaveProperty("count");
      expect(Array.isArray(body.templates)).toBe(true);
      expect(typeof body.count).toBe("number");
    });
  });

  // ============================================================================
  // GET /api/composition/templates/:id
  // ============================================================================

  describe("GET /api/composition/templates/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/composition/templates/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent template", async () => {
      const res = await app.request("/api/composition/templates/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/composition/page-sizes
  // ============================================================================

  describe("GET /api/composition/page-sizes", () => {
    it("returns 200 with page sizes list", async () => {
      const res = await app.request("/api/composition/page-sizes");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("pageSizes");
      // pageSizes might be an object or array depending on implementation
      expect(typeof body.pageSizes === "object").toBe(true);
    });
  });

  // ============================================================================
  // POST /api/composition/compose
  // ============================================================================

  describe("POST /api/composition/compose", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for invalid storyboard ID", async () => {
      const res = await app.request("/api/composition/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
          templateId: "single-panel",
          panelIds: ["00000000-0000-0000-0000-000000000000"],
          outputName: "test-page",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/compose-storyboard
  // ============================================================================

  describe("POST /api/composition/compose-storyboard", () => {
    it("returns 400 when storyboardId is missing", async () => {
      const res = await app.request("/api/composition/compose-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid storyboard ID format", async () => {
      const res = await app.request("/api/composition/compose-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/contact-sheet
  // ============================================================================

  describe("POST /api/composition/contact-sheet", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/contact-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid storyboard ID format", async () => {
      const res = await app.request("/api/composition/contact-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
          outputPath: "/test/output.png",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/export
  // ============================================================================

  describe("POST /api/composition/export", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid format", async () => {
      const res = await app.request("/api/composition/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPath: "/test/input.png",
          outputPath: "/test/output.png",
          format: "invalid-format",
        }),
      });

      expect(res.status).toBe(400);
    });
  });
});
