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
  createTestProject,
  createTestStoryboard,
  createTestPanel,
} from "@graphix/core/testing";
import { getCaptionService } from "@graphix/core";

describe("REST /api/captions", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/captions/:id
  // ============================================================================

  describe("GET /api/captions/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/captions/invalid-id");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 404 for non-existent caption", async () => {
      const res = await app.request("/api/captions/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 200 with caption data when caption exists", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "dialogue",
        text: "Hello, world!",
        position: { x: 50, y: 50 },
      });

      const res = await app.request(`/api/captions/${caption.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", caption.id);
      expect(body).toHaveProperty("panelId", panel.id);
      expect(body).toHaveProperty("type", "dialogue");
      expect(body).toHaveProperty("text", "Hello, world!");
    });
  });

  // ============================================================================
  // GET /api/captions/panel/:panelId
  // ============================================================================

  describe("GET /api/captions/panel/:panelId", () => {
    it("returns 400 for invalid panel ID format", async () => {
      const res = await app.request("/api/captions/panel/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 200 with empty array when panel has no captions", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request(`/api/captions/panel/${panel.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("captions");
      expect(body.captions).toBeArrayOfSize(0);
    });

    it("returns 200 with captions array when panel has captions", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getCaptionService();
      await service.create({
        panelId: panel.id,
        type: "dialogue",
        text: "Test caption",
        position: { x: 50, y: 50 },
      });

      const res = await app.request(`/api/captions/panel/${panel.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("captions");
      expect(body.captions.length).toBeGreaterThan(0);
      expect(body.captions[0]).toHaveProperty("id");
      expect(body.captions[0]).toHaveProperty("panelId", panel.id);
    });
  });

  // ============================================================================
  // POST /api/captions
  // ============================================================================

  describe("POST /api/captions", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 201 with caption data when creation succeeds", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: panel.id,
          type: "dialogue",
          text: "New caption",
          position: { x: 50, y: 50 },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("panelId", panel.id);
      expect(body).toHaveProperty("type", "dialogue");
      expect(body).toHaveProperty("text", "New caption");
    });
  });

  // ============================================================================
  // PATCH /api/captions/:id
  // ============================================================================

  describe("PATCH /api/captions/:id", () => {
    it("returns 404 for non-existent caption", async () => {
      const res = await app.request("/api/captions/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated" }),
      });

      expect(res.status).toBe(404);
    });

    it("updates caption and returns 200", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "dialogue",
        text: "Original text",
        position: { x: 50, y: 50 },
      });

      const res = await app.request(`/api/captions/${caption.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated text" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("text", "Updated text");
    });
  });

  // ============================================================================
  // DELETE /api/captions/:id
  // ============================================================================

  describe("DELETE /api/captions/:id", () => {
    it("returns 404 for non-existent caption", async () => {
      const res = await app.request("/api/captions/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });

    it("deletes caption and returns 204", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getCaptionService();
      const caption = await service.create({
        panelId: panel.id,
        type: "dialogue",
        text: "To be deleted",
        position: { x: 50, y: 50 },
      });

      const res = await app.request(`/api/captions/${caption.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const getRes = await app.request(`/api/captions/${caption.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
