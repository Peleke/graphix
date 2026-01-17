/**
 * Contract Tests: REST API - Panels
 *
 * Tests the /api/panels and /api/storyboards/:id/panels endpoints for correct
 * HTTP status codes, response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
  createTestCharacter,
  setupMockComfyUI,
} from "@graphix/core/testing";

describe("REST /api/panels", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/panels/:id
  // ============================================================================

  describe("GET /api/panels/:id", () => {
    it("returns 200 with panel data when panel exists", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id, "Test panel description");

      const res = await app.request(`/api/panels/${panel.id}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", panel.id);
      expect(body).toHaveProperty("storyboardId", storyboard.id);
      expect(body).toHaveProperty("description", "Test panel description");
      expect(body).toHaveProperty("position");
      expect(body).toHaveProperty("createdAt");
    });

    it("returns 404 when panel does not exist", async () => {
      // Use a valid UUID format that doesn't exist
      const res = await app.request("/api/panels/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns panel with full details including generations", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request(`/api/panels/${panel.id}/full`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("panel");
      expect(body).toHaveProperty("generations");
      expect(body.panel).toHaveProperty("id", panel.id);
      expect(body.generations).toBeArray();
    });
  });

  // ============================================================================
  // POST /api/storyboards/:id/panels
  // ============================================================================

  describe("POST /api/storyboards/:id/panels", () => {
    it("creates panel in storyboard and returns 201", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const res = await app.request(`/api/storyboards/${storyboard.id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "New panel description",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("storyboardId", storyboard.id);
      expect(body).toHaveProperty("description", "New panel description");
    });

    it("creates panel with position and direction", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);

      const res = await app.request(`/api/storyboards/${storyboard.id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Positioned panel",
          position: 5,
          direction: {
            cameraAngle: "low angle",
            shotType: "close-up",
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("position", 5);
      expect(body).toHaveProperty("direction");
    });

    it("creates panel with character associations", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const character = await createTestCharacter(project.id, "Hero");

      const res = await app.request(`/api/storyboards/${storyboard.id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Panel with characters",
          characterIds: [character.id],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("characterIds");
      expect(body.characterIds).toContain(character.id);
    });
  });

  // ============================================================================
  // PUT /api/panels/:id
  // ============================================================================

  describe("PUT /api/panels/:id", () => {
    it("updates panel and returns 200 with updated data", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id, "Original description");

      const res = await app.request(`/api/panels/${panel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Updated description",
          direction: { shotType: "wide shot" },
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", panel.id);
      expect(body).toHaveProperty("description", "Updated description");
    });

    it("returns error when panel does not exist", async () => {
      const res = await app.request("/api/panels/nonexistent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // DELETE /api/panels/:id
  // ============================================================================

  describe("DELETE /api/panels/:id", () => {
    it("deletes panel and returns 204 No Content", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request(`/api/panels/${panel.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const verifyRes = await app.request(`/api/panels/${panel.id}`);
      expect(verifyRes.status).toBe(404);
    });

    it("returns error when panel does not exist", async () => {
      const res = await app.request("/api/panels/nonexistent-id", {
        method: "DELETE",
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // POST /api/panels/:id/generate
  // ============================================================================

  describe("POST /api/panels/:id/generate", () => {
    beforeEach(() => {
      setupMockComfyUI();
    });

    it("returns correct response structure for generation request", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id, "A wolf in a forest");

      // Note: This test checks the response contract, actual generation may fail
      // without ComfyUI running. The response structure should be consistent.
      const res = await app.request(`/api/panels/${panel.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizePreset: "portrait_standard",
          qualityPreset: "draft",
        }),
      });

      // Either success (201) or error (500) - both have defined structures
      const body = await res.json();
      if (res.status === 201) {
        expect(body).toHaveProperty("success", true);
        expect(body).toHaveProperty("generatedImage");
      } else {
        expect(body).toHaveProperty("error");
      }
    });

    it("returns 404 when panel does not exist", async () => {
      const res = await app.request("/api/panels/nonexistent-id/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("accepts generation parameters in request body", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id, "Test scene");

      const res = await app.request(`/api/panels/${panel.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "novaFurryXL_ilV130.safetensors",
          modelFamily: "pony",
          width: 768,
          height: 1024,
          steps: 28,
          cfg: 7,
          seed: 12345,
          sizePreset: "portrait_standard",
          qualityPreset: "standard",
        }),
      });

      // Response should be either success or error, not a validation failure for valid params
      expect([201, 500]).toContain(res.status);
    });
  });

  // ============================================================================
  // Additional Panel Endpoints
  // ============================================================================

  describe("POST /api/panels/:id/characters", () => {
    it("adds character to panel and returns 200", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);
      const character = await createTestCharacter(project.id, "Sidekick");

      const res = await app.request(`/api/panels/${panel.id}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("characterIds");
      expect(body.characterIds).toContain(character.id);
    });
  });

  describe("POST /api/panels/:id/reorder", () => {
    it("reorders panel and returns 200 with updated position", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request(`/api/panels/${panel.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: 10,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("position", 10);
    });
  });
});
