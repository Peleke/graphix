/**
 * Contract Tests: REST API - Generations
 *
 * Tests the /api/generations endpoints for correct HTTP status codes,
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
import { getGeneratedImageService } from "@graphix/core";

describe("REST /api/generations", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/generations/:id
  // ============================================================================

  describe("GET /api/generations/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/generations/invalid-id");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 404 for non-existent generation", async () => {
      const res = await app.request("/api/generations/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 200 with generation data when generation exists", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getGeneratedImageService();
      const generation = await service.create({
        panelId: panel.id,
        localPath: "/test/path.png",
        seed: 12345,
        prompt: "Test prompt",
        model: "test-model",
        steps: 20,
        cfg: 7.0,
        sampler: "euler",
        width: 512,
        height: 512,
      });

      const res = await app.request(`/api/generations/${generation.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", generation.id);
      expect(body).toHaveProperty("panelId", panel.id);
      expect(body).toHaveProperty("prompt");
      expect(body).toHaveProperty("seed");
    });
  });

  // ============================================================================
  // GET /api/generations/panel/:panelId
  // ============================================================================

  describe("GET /api/generations/panel/:panelId", () => {
    it("returns 400 for invalid panel ID format", async () => {
      const res = await app.request("/api/generations/panel/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 200 with empty array when panel has no generations", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request(`/api/generations/panel/${panel.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("generations");
      expect(body.generations).toBeArrayOfSize(0);
    });

    it("returns 200 with generations array when panel has generations", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getGeneratedImageService();
      await service.create({
        panelId: panel.id,
        localPath: "/test/path1.png",
        seed: 12345,
        prompt: "Test prompt 1",
        model: "test-model",
        steps: 20,
        cfg: 7.0,
        sampler: "euler",
        width: 512,
        height: 512,
      });

      const res = await app.request(`/api/generations/panel/${panel.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("generations");
      expect(body.generations.length).toBeGreaterThan(0);
      expect(body.generations[0]).toHaveProperty("id");
      expect(body.generations[0]).toHaveProperty("panelId", panel.id);
    });
  });

  // ============================================================================
  // POST /api/generations
  // ============================================================================

  describe("POST /api/generations", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 201 with generation data when creation succeeds", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const res = await app.request("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: panel.id,
          localPath: "/test/path.png",
          seed: 12345,
          prompt: "Test prompt",
          model: "test-model",
          steps: 20,
          cfg: 7.0,
          sampler: "euler",
          width: 512,
          height: 512,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("panelId", panel.id);
      expect(body).toHaveProperty("prompt", "Test prompt");
      expect(body).toHaveProperty("seed", 12345);
    });
  });

  // ============================================================================
  // POST /api/generations/:id/favorite
  // ============================================================================

  describe("POST /api/generations/:id/favorite", () => {
    it("returns 404 for non-existent generation", async () => {
      const res = await app.request("/api/generations/00000000-0000-0000-0000-000000000000/favorite", {
        method: "POST",
      });

      expect(res.status).toBe(404);
    });

    it("toggles favorite status and returns 200", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getGeneratedImageService();
      const generation = await service.create({
        panelId: panel.id,
        localPath: "/test/path.png",
        seed: 12345,
        prompt: "Test prompt",
        model: "test-model",
        steps: 20,
        cfg: 7.0,
        sampler: "euler",
        width: 512,
        height: 512,
      });

      const res = await app.request(`/api/generations/${generation.id}/favorite`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("isFavorite");
    });
  });

  // ============================================================================
  // DELETE /api/generations/:id
  // ============================================================================

  describe("DELETE /api/generations/:id", () => {
    it("returns 404 for non-existent generation", async () => {
      const res = await app.request("/api/generations/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });

    it("deletes generation and returns 204", async () => {
      const project = await createTestProject();
      const storyboard = await createTestStoryboard(project.id);
      const panel = await createTestPanel(storyboard.id);

      const service = getGeneratedImageService();
      const generation = await service.create({
        panelId: panel.id,
        localPath: "/test/path.png",
        seed: 12345,
        prompt: "Test prompt",
        model: "test-model",
        steps: 20,
        cfg: 7.0,
        sampler: "euler",
        width: 512,
        height: 512,
      });

      const res = await app.request(`/api/generations/${generation.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);

      // Verify deletion
      const getRes = await app.request(`/api/generations/${generation.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
