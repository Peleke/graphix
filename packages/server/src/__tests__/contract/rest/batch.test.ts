/**
 * Contract Tests: REST API - Batch Operations
 *
 * Tests the /api/batch endpoints for correct HTTP status codes,
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
  setupMockComfyUI,
} from "@graphix/core/testing";

describe("REST /api/batch", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // POST /api/batch/panels
  // ============================================================================

  describe("POST /api/batch/panels", () => {
    it("creates multiple panels and returns 201 with results", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const res = await app.request("/api/batch/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: storyboard.id,
          panels: [
            { description: "Panel 1" },
            { description: "Panel 2" },
            { description: "Panel 3" },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("created");
      expect(body.created).toBeArrayOfSize(3);
      expect(body).toHaveProperty("summary");
      expect(body.summary).toMatchObject({
        requested: 3,
        created: 3,
        failed: 0,
      });
    });

    it("returns 400 when storyboardId is missing", async () => {
      const res = await app.request("/api/batch/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panels: [{ description: "Panel 1" }],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when panels array is missing", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const res = await app.request("/api/batch/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: storyboard.id,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // DELETE /api/batch/panels
  // ============================================================================

  describe("DELETE /api/batch/panels", () => {
    it("deletes multiple panels and returns result summary", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel1 = await createTestPanel(storyboard.id, "Panel 1");
      const panel2 = await createTestPanel(storyboard.id, "Panel 2");

      const res = await app.request("/api/batch/panels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: [panel1.id, panel2.id],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("deleted");
      expect(body.deleted).toBeArrayOfSize(2);
      expect(body).toHaveProperty("summary");
      expect(body.summary).toMatchObject({
        requested: 2,
        deleted: 2,
        failed: 0,
      });
    });

    it("returns 400 when panelIds is missing", async () => {
      const res = await app.request("/api/batch/panels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // POST /api/batch/captions
  // ============================================================================

  describe("POST /api/batch/captions", () => {
    it("creates captions for multiple panels and returns result", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel1 = await createTestPanel(storyboard.id);
      const panel2 = await createTestPanel(storyboard.id);

      const res = await app.request("/api/batch/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captions: [
            {
              panelId: panel1.id,
              type: "speech",
              text: "Hello!",
              position: { x: 0.5, y: 0.2 },
            },
            {
              panelId: panel2.id,
              type: "narration",
              text: "Meanwhile...",
              position: { x: 0.5, y: 0.1 },
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("created");
      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("requested", 2);
      expect(body.summary).toHaveProperty("created");
      expect(body.summary).toHaveProperty("failed");
    });

    it("returns 400 when captions array is missing", async () => {
      const res = await app.request("/api/batch/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // POST /api/batch/generate
  // ============================================================================

  describe("POST /api/batch/generate", () => {
    beforeEach(() => {
      setupMockComfyUI();
    });

    it("accepts batch generation request with correct structure", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id, "A scene to generate");

      const res = await app.request("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: [panel.id],
          options: {
            sizePreset: "portrait_standard",
            qualityPreset: "draft",
          },
          continueOnError: true,
        }),
      });

      // Response structure should be consistent regardless of generation success
      const body = await res.json();
      expect(body).toHaveProperty("results");
      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("requested", 1);
      expect(body.summary).toHaveProperty("generated");
      expect(body.summary).toHaveProperty("failed");
    });

    it("returns 400 when panelIds is missing", async () => {
      const res = await app.request("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: { sizePreset: "portrait_standard" },
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when panelIds is not an array", async () => {
      const res = await app.request("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: "not-an-array",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // POST /api/batch/select/auto
  // ============================================================================

  describe("POST /api/batch/select/auto", () => {
    it("auto-selects outputs for panels with correct structure", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request("/api/batch/select/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: [panel.id],
          mode: "latest",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("selected");
      expect(body).toHaveProperty("skipped");
      expect(body).toHaveProperty("errors");
      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("panels", 1);
      expect(body.summary).toHaveProperty("selected");
      expect(body.summary).toHaveProperty("skipped");
      expect(body.summary).toHaveProperty("failed");
    });

    it("returns 400 when panelIds is missing", async () => {
      const res = await app.request("/api/batch/select/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "latest",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("accepts mode parameter for selection strategy", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request("/api/batch/select/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: [panel.id],
          mode: "first",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("summary");
    });
  });

  // ============================================================================
  // Additional Batch Endpoints
  // ============================================================================

  describe("GET /api/batch/storyboard/:storyboardId/panel-ids", () => {
    it("returns panel IDs for storyboard", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      await createTestPanel(storyboard.id, "Panel 1");
      await createTestPanel(storyboard.id, "Panel 2");

      const res = await app.request(`/api/batch/storyboard/${storyboard.id}/panel-ids`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("storyboardId", storyboard.id);
      expect(body).toHaveProperty("panelIds");
      expect(body.panelIds).toBeArrayOfSize(2);
      expect(body).toHaveProperty("count", 2);
    });

    it("returns empty array for storyboard with no panels", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const res = await app.request(`/api/batch/storyboard/${storyboard.id}/panel-ids`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.panelIds).toBeArrayOfSize(0);
      expect(body.count).toBe(0);
    });
  });
});
