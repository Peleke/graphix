/**
 * Contract Tests: REST API - Characters
 *
 * Tests the /api/characters endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestCharacter,
} from "@graphix/core/testing";

describe("REST /api/characters", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/characters/project/:projectId
  // ============================================================================

  describe("GET /api/characters/project/:projectId", () => {
    it("returns 200 with empty characters array when none exist", async () => {
      const project = await createTestProject();

      const res = await app.request(`/api/characters/project/${project.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("characters");
      expect(body.characters).toBeArrayOfSize(0);
    });

    it("returns 200 with characters array for project", async () => {
      const project = await createTestProject();
      await createTestCharacter(project.id, "Character A");
      await createTestCharacter(project.id, "Character B");

      const res = await app.request(`/api/characters/project/${project.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.characters).toBeArrayOfSize(2);
      expect(body.characters[0]).toHaveProperty("id");
      expect(body.characters[0]).toHaveProperty("name");
      expect(body.characters[0]).toHaveProperty("projectId", project.id);
    });

    it("returns empty array for non-existent project", async () => {
      const res = await app.request("/api/characters/project/nonexistent-id");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.characters).toBeArrayOfSize(0);
    });
  });

  // ============================================================================
  // GET /api/characters/:id
  // ============================================================================

  describe("GET /api/characters/:id", () => {
    it("returns 200 with character data when character exists", async () => {
      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "Test Character");

      const res = await app.request(`/api/characters/${character.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", character.id);
      expect(body).toHaveProperty("name", "Test Character");
      expect(body).toHaveProperty("projectId", project.id);
      expect(body).toHaveProperty("createdAt");
    });

    it("returns 404 when character does not exist", async () => {
      const res = await app.request("/api/characters/nonexistent-id");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("not found");
    });
  });

  // ============================================================================
  // POST /api/characters
  // ============================================================================

  describe("POST /api/characters", () => {
    it("creates character and returns 201 with character data", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "New Character",
          profile: { species: "otter" },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("name", "New Character");
      expect(body).toHaveProperty("projectId", project.id);
    });

    it("creates character with optional profile and prompt fragments", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Detailed Character",
          profile: {
            species: "wolf",
            colors: { primary: "gray", secondary: "white" },
          },
          promptFragments: {
            appearance: "gray wolf with white markings",
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("profile");
      expect(body).toHaveProperty("promptFragments");
    });
  });

  // ============================================================================
  // PUT /api/characters/:id
  // ============================================================================

  describe("PUT /api/characters/:id", () => {
    it("updates character and returns 200 with updated data", async () => {
      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "Original Name");

      const res = await app.request(`/api/characters/${character.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          profile: { species: "fox" },
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", character.id);
      expect(body).toHaveProperty("name", "Updated Name");
    });

    it("returns error when character does not exist", async () => {
      const res = await app.request("/api/characters/nonexistent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // POST /api/characters/:id/references
  // ============================================================================

  describe("POST /api/characters/:id/references", () => {
    it("adds reference image and returns 200 with updated character", async () => {
      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "Test Character");

      const res = await app.request(`/api/characters/${character.id}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: "/path/to/reference.png",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", character.id);
      expect(body).toHaveProperty("referenceImages");
      expect(body.referenceImages).toContain("/path/to/reference.png");
    });

    it("returns error when character does not exist", async () => {
      const res = await app.request("/api/characters/nonexistent-id/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: "/path/to/image.png" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // DELETE /api/characters/:id
  // ============================================================================

  describe("DELETE /api/characters/:id", () => {
    it("deletes character and returns 204 No Content", async () => {
      const project = await createTestProject();
      const character = await createTestCharacter(project.id, "To Delete");

      const res = await app.request(`/api/characters/${character.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const verifyRes = await app.request(`/api/characters/${character.id}`);
      expect(verifyRes.status).toBe(404);
    });

    it("returns error when character does not exist", async () => {
      const res = await app.request("/api/characters/nonexistent-id", {
        method: "DELETE",
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
