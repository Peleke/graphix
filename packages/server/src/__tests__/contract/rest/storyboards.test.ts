/**
 * Contract Tests: REST API - Storyboards
 *
 * Tests the /api/storyboards endpoints for correct HTTP status codes,
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

describe("REST /api/storyboards", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/storyboards/project/:projectId
  // ============================================================================

  describe("GET /api/storyboards/project/:projectId", () => {
    it("returns 200 with empty storyboards array when none exist", async () => {
      const project = await createTestProject();

      const res = await app.request(`/api/storyboards/project/${project.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("storyboards");
      expect(body.storyboards).toBeArrayOfSize(0);
    });

    it("returns 200 with storyboards array for project", async () => {
      const project = await createTestProject();
      await createTestStoryboard(project.id, "Storyboard A");
      await createTestStoryboard(project.id, "Storyboard B");

      const res = await app.request(`/api/storyboards/project/${project.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.storyboards).toBeArrayOfSize(2);
      expect(body.storyboards[0]).toHaveProperty("id");
      expect(body.storyboards[0]).toHaveProperty("name");
      expect(body.storyboards[0]).toHaveProperty("projectId", project.id);
    });
  });

  // ============================================================================
  // GET /api/storyboards/:id
  // ============================================================================

  describe("GET /api/storyboards/:id", () => {
    it("returns 200 with storyboard data when storyboard exists", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id, "Test Storyboard");

      const res = await app.request(`/api/storyboards/${storyboard.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", storyboard.id);
      expect(body).toHaveProperty("name", "Test Storyboard");
      expect(body).toHaveProperty("projectId", project.id);
      expect(body).toHaveProperty("createdAt");
    });

    it("returns 404 when storyboard does not exist", async () => {
      const res = await app.request("/api/storyboards/nonexistent-id");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("not found");
    });
  });

  // ============================================================================
  // POST /api/storyboards
  // ============================================================================

  describe("POST /api/storyboards", () => {
    it("creates storyboard and returns 201 with storyboard data", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "New Storyboard",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("name", "New Storyboard");
      expect(body).toHaveProperty("projectId", project.id);
    });

    it("creates storyboard with optional description and panel count", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Full Storyboard",
          description: "A detailed storyboard",
          panelCount: 6,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("description", "A detailed storyboard");
    });
  });

  // ============================================================================
  // PUT /api/storyboards/:id
  // ============================================================================

  describe("PUT /api/storyboards/:id", () => {
    it("updates storyboard and returns 200 with updated data", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id, "Original Name");

      const res = await app.request(`/api/storyboards/${storyboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          description: "Updated description",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", storyboard.id);
      expect(body).toHaveProperty("name", "Updated Name");
      expect(body).toHaveProperty("description", "Updated description");
    });

    it("returns error when storyboard does not exist", async () => {
      const res = await app.request("/api/storyboards/nonexistent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // POST /api/storyboards/:id/duplicate
  // ============================================================================

  describe("POST /api/storyboards/:id/duplicate", () => {
    it("duplicates storyboard and returns 201 with new storyboard", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id, "Original");

      const res = await app.request(`/api/storyboards/${storyboard.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicated Storyboard",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body.id).not.toBe(storyboard.id);
      expect(body).toHaveProperty("name", "Duplicated Storyboard");
      expect(body).toHaveProperty("projectId", project.id);
    });

    it("returns error when storyboard does not exist", async () => {
      const res = await app.request("/api/storyboards/nonexistent-id/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Copy" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // DELETE /api/storyboards/:id
  // ============================================================================

  describe("DELETE /api/storyboards/:id", () => {
    it("deletes storyboard and returns 204 No Content", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id, "To Delete");

      const res = await app.request(`/api/storyboards/${storyboard.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const verifyRes = await app.request(`/api/storyboards/${storyboard.id}`);
      expect(verifyRes.status).toBe(404);
    });

    it("returns error when storyboard does not exist", async () => {
      const res = await app.request("/api/storyboards/nonexistent-id", {
        method: "DELETE",
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
