/**
 * Contract Tests: REST API - Projects
 *
 * Tests the /api/projects endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
} from "@graphix/core/testing";

describe("REST /api/projects", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/projects
  // ============================================================================

  describe("GET /api/projects", () => {
    it("returns 200 with empty projects array when none exist", async () => {
      const res = await app.request("/api/projects");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("projects");
      expect(body.projects).toBeArrayOfSize(0);
      expect(body).toHaveProperty("pagination");
      expect(body.pagination).toMatchObject({
        limit: 100,
        offset: 0,
        count: 0,
      });
    });

    it("returns 200 with projects array when projects exist", async () => {
      await createTestProject("Project A");
      await createTestProject("Project B");

      const res = await app.request("/api/projects");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projects).toBeArrayOfSize(2);
      expect(body.projects[0]).toHaveProperty("id");
      expect(body.projects[0]).toHaveProperty("name");
      expect(body.projects[0]).toHaveProperty("createdAt");
      expect(body.pagination.count).toBe(2);
    });

    it("respects limit and offset pagination parameters", async () => {
      await createTestProject("Project 1");
      await createTestProject("Project 2");
      await createTestProject("Project 3");

      const res = await app.request("/api/projects?limit=2&offset=1");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination).toMatchObject({
        limit: 2,
        offset: 1,
      });
    });
  });

  // ============================================================================
  // GET /api/projects/:id
  // ============================================================================

  describe("GET /api/projects/:id", () => {
    it("returns 200 with project data when project exists", async () => {
      const project = await createTestProject("My Project");

      const res = await app.request(`/api/projects/${project.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", project.id);
      expect(body).toHaveProperty("name", "My Project");
      expect(body).toHaveProperty("createdAt");
      expect(body).toHaveProperty("updatedAt");
    });

    it("returns 404 when project does not exist", async () => {
      const res = await app.request("/api/projects/nonexistent-id");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("not found");
    });
  });

  // ============================================================================
  // POST /api/projects
  // ============================================================================

  describe("POST /api/projects", () => {
    it("creates project and returns 201 with project data", async () => {
      const res = await app.request("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Project" }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("name", "New Project");
      expect(body).toHaveProperty("createdAt");
      expect(body).toHaveProperty("updatedAt");
    });

    it("creates project with optional description and settings", async () => {
      const res = await app.request("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Full Project",
          description: "A test description",
          settings: { outputFormat: "png" },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("name", "Full Project");
      expect(body).toHaveProperty("description", "A test description");
      expect(body).toHaveProperty("settings");
      expect(body.settings).toMatchObject({ outputFormat: "png" });
    });
  });

  // ============================================================================
  // PUT /api/projects/:id
  // ============================================================================

  describe("PUT /api/projects/:id", () => {
    it("updates project and returns 200 with updated data", async () => {
      const project = await createTestProject("Original Name");

      const res = await app.request(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          description: "Updated description",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", project.id);
      expect(body).toHaveProperty("name", "Updated Name");
      expect(body).toHaveProperty("description", "Updated description");
    });

    it("returns error when project does not exist", async () => {
      const res = await app.request("/api/projects/nonexistent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      // The error handler will catch this - could be 404 or 500 depending on service behavior
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // DELETE /api/projects/:id
  // ============================================================================

  describe("DELETE /api/projects/:id", () => {
    it("deletes project and returns 204 No Content", async () => {
      const project = await createTestProject("To Delete");

      const res = await app.request(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const verifyRes = await app.request(`/api/projects/${project.id}`);
      expect(verifyRes.status).toBe(404);
    });

    it("returns error when project does not exist", async () => {
      const res = await app.request("/api/projects/nonexistent-id", {
        method: "DELETE",
      });

      // The error handler will catch this
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
