/**
 * Contract Tests for Narrative REST API
 *
 * These tests verify that the REST API endpoints conform to their expected
 * request/response contracts. They test HTTP status codes, response shapes,
 * error handling, and validation behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import { narrativeRoutes } from "@graphix/server/rest/routes/narrative";
import { getProjectService } from "../../services/project.service.js";
import { getNarrativeService } from "../../services/narrative.service.js";

// Create test app with narrative routes and error handling (mirrors real app.ts)
const createTestApp = () => {
  const app = new Hono();
  app.route("/narrative", narrativeRoutes);

  // Error handling middleware (matches the real app)
  app.onError((err, c) => {
    // Handle validation errors
    if (err.message.includes("required") || err.message.includes("must be")) {
      return c.json({ error: err.message, code: "VALIDATION_ERROR" }, 400);
    }

    // Handle not found errors
    if (err.message.includes("not found") || err.message.includes("Not found")) {
      return c.json({ error: err.message, code: "NOT_FOUND" }, 404);
    }

    // Handle foreign key constraint errors (e.g., invalid projectId)
    if (err.message.includes("FOREIGN KEY constraint") || err.message.includes("SQLITE_CONSTRAINT_FOREIGNKEY")) {
      return c.json({ error: "Referenced entity not found", code: "NOT_FOUND" }, 404);
    }

    // Handle already converted errors
    if (err.message.includes("already converted")) {
      return c.json({ error: err.message, code: "CONFLICT" }, 400);
    }

    // Handle no beats errors
    if (err.message.includes("no beats") || err.message.includes("has no beats")) {
      return c.json({ error: err.message, code: "VALIDATION_ERROR" }, 400);
    }

    // Default: 500 internal error
    return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  });

  return app;
};

describe("Narrative API Contract Tests", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe("Premises API", () => {
    describe("POST /narrative/premises", () => {
      it("returns 201 with premise object on valid request", async () => {
        const project = await getProjectService().create({ name: "Test" });

        const res = await app.request("/narrative/premises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            logline: "Two friends discover a secret",
            genre: "comedy",
            tone: "lighthearted",
          }),
        });

        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body).toMatchObject({
          id: expect.any(String),
          projectId: project.id,
          logline: "Two friends discover a secret",
          genre: "comedy",
          tone: "lighthearted",
          status: "draft",
          themes: [],
          characterIds: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it("returns 400 when projectId is missing", async () => {
        const res = await app.request("/narrative/premises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logline: "A logline without project",
          }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty("error");
      });

      it("returns 400 when logline is missing", async () => {
        const project = await getProjectService().create({ name: "Test" });

        const res = await app.request("/narrative/premises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
          }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty("error");
      });

      it("returns 404 when projectId does not exist", async () => {
        const res = await app.request("/narrative/premises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "non-existent-id",
            logline: "A logline",
          }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toHaveProperty("error");
      });
    });

    describe("GET /narrative/premises/:id", () => {
      it("returns 200 with premise on valid request", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });

        const res = await app.request(`/narrative/premises/${premise.id}`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(premise.id);
        expect(body.logline).toBe("Test premise");
      });

      it("returns 404 when premise does not exist", async () => {
        const res = await app.request("/narrative/premises/non-existent-id");

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toHaveProperty("error");
      });
    });

    describe("GET /narrative/projects/:projectId/premises", () => {
      it("returns 200 with paginated premises", async () => {
        const project = await getProjectService().create({ name: "Test" });
        await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "First premise",
        });
        await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Second premise",
        });

        const res = await app.request(`/narrative/projects/${project.id}/premises`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("premises");
        expect(body).toHaveProperty("pagination");
        expect(Array.isArray(body.premises)).toBe(true);
        expect(body.premises).toHaveLength(2);
        expect(body.pagination).toMatchObject({
          limit: 100,
          offset: 0,
          count: 2,
        });
      });

      it("returns 200 with empty premises when none exist", async () => {
        const project = await getProjectService().create({ name: "Test" });

        const res = await app.request(`/narrative/projects/${project.id}/premises`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.premises).toEqual([]);
        expect(body.pagination.count).toBe(0);
      });
    });

    describe("PATCH /narrative/premises/:id", () => {
      it("returns 200 with updated premise", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Original logline",
        });

        const res = await app.request(`/narrative/premises/${premise.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logline: "Updated logline",
            genre: "drama",
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.logline).toBe("Updated logline");
        expect(body.genre).toBe("drama");
      });

      it("returns 404 when premise does not exist", async () => {
        const res = await app.request("/narrative/premises/non-existent-id", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logline: "New logline" }),
        });

        expect(res.status).toBe(404);
      });
    });

    describe("DELETE /narrative/premises/:id", () => {
      it("returns 204 on successful deletion", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "To be deleted",
        });

        const res = await app.request(`/narrative/premises/${premise.id}`, {
          method: "DELETE",
        });

        expect(res.status).toBe(204);

        // Verify deletion
        const deleted = await getNarrativeService().getPremise(premise.id);
        expect(deleted).toBeNull();
      });

      it("returns 404 when premise does not exist", async () => {
        const res = await app.request("/narrative/premises/non-existent-id", {
          method: "DELETE",
        });

        expect(res.status).toBe(404);
      });
    });
  });

  describe("Stories API", () => {
    describe("POST /narrative/premises/:premiseId/stories", () => {
      it("returns 201 with story object on valid request", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });

        const res = await app.request(`/narrative/premises/${premise.id}/stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "The Great Adventure",
            synopsis: "An epic tale",
            targetLength: 12,
            structure: "three-act",
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toMatchObject({
          id: expect.any(String),
          premiseId: premise.id,
          title: "The Great Adventure",
          synopsis: "An epic tale",
          targetLength: 12,
          structure: "three-act",
          status: "draft",
        });
      });

      it("returns 400 when title is missing", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });

        const res = await app.request(`/narrative/premises/${premise.id}/stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            synopsis: "No title provided",
          }),
        });

        expect(res.status).toBe(400);
      });

      it("returns 404 when premise does not exist", async () => {
        const res = await app.request("/narrative/premises/non-existent-id/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "A Story",
          }),
        });

        expect(res.status).toBe(404);
      });
    });

    describe("GET /narrative/stories/:id", () => {
      it("returns 200 with story object", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });

        const res = await app.request(`/narrative/stories/${story.id}`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(story.id);
        expect(body.title).toBe("Test Story");
      });

      it("returns 404 when story does not exist", async () => {
        const res = await app.request("/narrative/stories/non-existent-id");

        expect(res.status).toBe(404);
      });
    });

    describe("GET /narrative/stories/:id/full", () => {
      it("returns 200 with story including beats array", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "First beat",
        });

        const res = await app.request(`/narrative/stories/${story.id}/full`);

        expect(res.status).toBe(200);
        const body = await res.json();
        // Response is story object with beats embedded
        expect(body.id).toBe(story.id);
        expect(body.title).toBe("Test Story");
        expect(body.beats).toHaveLength(1);
      });
    });

    describe("PATCH /narrative/stories/:id", () => {
      it("returns 200 with updated story", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Original Title",
        });

        const res = await app.request(`/narrative/stories/${story.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Updated Title",
            status: "beats_generated",
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.title).toBe("Updated Title");
        expect(body.status).toBe("beats_generated");
      });
    });
  });

  describe("Beats API", () => {
    describe("POST /narrative/stories/:storyId/beats", () => {
      it("returns 201 with beat object on valid request", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });

        const res = await app.request(`/narrative/stories/${story.id}/beats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: 0,
            visualDescription: "A dramatic opening",
            beatType: "setup",
            emotionalTone: "mysterious",
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toMatchObject({
          id: expect.any(String),
          storyId: story.id,
          position: 0,
          visualDescription: "A dramatic opening",
          beatType: "setup",
        });
      });

      it("returns 400 when visualDescription is missing", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });

        const res = await app.request(`/narrative/stories/${story.id}/beats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: 0,
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe("POST /narrative/stories/:storyId/beats/batch", () => {
      it("returns 201 with beats object containing array", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });

        const res = await app.request(`/narrative/stories/${story.id}/beats/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beats: [
              { position: 0, visualDescription: "First beat" },
              { position: 1, visualDescription: "Second beat" },
              { position: 2, visualDescription: "Third beat" },
            ],
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toHaveProperty("beats");
        expect(body).toHaveProperty("count");
        expect(body.beats).toHaveLength(3);
        expect(body.count).toBe(3);
      });
    });

    describe("GET /narrative/stories/:storyId/beats", () => {
      it("returns 200 with ordered beats", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        await getNarrativeService().createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Second",
        });
        await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "First",
        });

        const res = await app.request(`/narrative/stories/${story.id}/beats`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("beats");
        expect(body).toHaveProperty("count");
        expect(body.beats).toHaveLength(2);
        expect(body.beats[0].position).toBe(0);
        expect(body.beats[0].visualDescription).toBe("First");
        expect(body.beats[1].position).toBe(1);
        expect(body.beats[1].visualDescription).toBe("Second");
      });
    });

    describe("PATCH /narrative/beats/:id", () => {
      it("returns 200 with updated beat", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "Original",
        });

        const res = await app.request(`/narrative/beats/${beat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visualDescription: "Updated description",
            emotionalTone: "dramatic",
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.visualDescription).toBe("Updated description");
        expect(body.emotionalTone).toBe("dramatic");
      });

      it("returns 404 when beat does not exist", async () => {
        const res = await app.request("/narrative/beats/non-existent-id", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visualDescription: "New" }),
        });

        expect(res.status).toBe(404);
      });
    });

    describe("POST /narrative/stories/:storyId/beats/reorder", () => {
      it("returns 200 with reordered beats", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat1 = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "First",
        });
        const beat2 = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 1,
          visualDescription: "Second",
        });

        const res = await app.request(`/narrative/stories/${story.id}/beats/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beatIds: [beat2.id, beat1.id], // Swap order
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("beats");
        expect(body).toHaveProperty("count");
        expect(body.beats[0].id).toBe(beat2.id);
        expect(body.beats[0].position).toBe(0);
        expect(body.beats[1].id).toBe(beat1.id);
        expect(body.beats[1].position).toBe(1);
      });
    });

    describe("DELETE /narrative/beats/:id", () => {
      it("returns 204 on successful deletion", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "To delete",
        });

        const res = await app.request(`/narrative/beats/${beat.id}`, {
          method: "DELETE",
        });

        expect(res.status).toBe(204);
      });
    });
  });

  describe("Conversion API", () => {
    describe("POST /narrative/beats/:beatId/to-panel", () => {
      it("returns 201 with converted panel info", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "A scene",
          cameraAngle: "wide",
          emotionalTone: "peaceful",
        });

        // Create a storyboard
        const { getStoryboardService } = await import("../../services/storyboard.service.js");
        const storyboard = await getStoryboardService().create({
          projectId: project.id,
          name: "Test Storyboard",
        });

        const res = await app.request(`/narrative/beats/${beat.id}/to-panel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyboardId: storyboard.id,
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.beat.id).toBe(beat.id);
        expect(body.beat.panelId).toBeDefined();
        expect(body.panelId).toBeDefined();
      });

      it("returns 400 when storyboardId is missing", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "A scene",
        });

        const res = await app.request(`/narrative/beats/${beat.id}/to-panel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
      });

      it("returns 400 when beat is already converted", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        const beat = await getNarrativeService().createBeat({
          storyId: story.id,
          position: 0,
          visualDescription: "A scene",
        });

        const { getStoryboardService } = await import("../../services/storyboard.service.js");
        const storyboard = await getStoryboardService().create({
          projectId: project.id,
          name: "Test Storyboard",
        });

        // Convert once
        await getNarrativeService().convertBeatToPanel(beat.id, storyboard.id);

        // Try to convert again
        const res = await app.request(`/narrative/beats/${beat.id}/to-panel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyboardId: storyboard.id,
          }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain("already converted");
      });
    });

    describe("POST /narrative/stories/:storyId/to-storyboard", () => {
      it("returns 201 with conversion results", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });
        await getNarrativeService().createBeats(story.id, [
          { position: 0, visualDescription: "First" },
          { position: 1, visualDescription: "Second" },
        ]);

        const { getStoryboardService } = await import("../../services/storyboard.service.js");
        const storyboard = await getStoryboardService().create({
          projectId: project.id,
          name: "Test Storyboard",
        });

        const res = await app.request(`/narrative/stories/${story.id}/to-storyboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyboardId: storyboard.id,
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.beats).toHaveLength(2);
        expect(body.panelIds).toHaveLength(2);
      });

      it("returns 400 when story has no beats", async () => {
        const project = await getProjectService().create({ name: "Test" });
        const premise = await getNarrativeService().createPremise({
          projectId: project.id,
          logline: "Test premise",
        });
        const story = await getNarrativeService().createStory({
          premiseId: premise.id,
          title: "Test Story",
        });

        const { getStoryboardService } = await import("../../services/storyboard.service.js");
        const storyboard = await getStoryboardService().create({
          projectId: project.id,
          name: "Test Storyboard",
        });

        const res = await app.request(`/narrative/stories/${story.id}/to-storyboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyboardId: storyboard.id,
          }),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain("no beats");
      });
    });
  });

  describe("Response Shape Consistency", () => {
    it("all error responses have error property", async () => {
      const endpoints = [
        { method: "GET", path: "/narrative/premises/invalid" },
        { method: "GET", path: "/narrative/stories/invalid" },
        { method: "DELETE", path: "/narrative/beats/invalid" },
      ];

      for (const { method, path } of endpoints) {
        const res = await app.request(path, { method });
        if (res.status >= 400) {
          const body = await res.json();
          expect(body).toHaveProperty("error");
        }
      }
    });

    it("all successful list responses have consistent structure", async () => {
      const project = await getProjectService().create({ name: "Test" });

      const res = await app.request(`/narrative/projects/${project.id}/premises`);
      const body = await res.json();
      // List responses use paginated structure with array in named property
      expect(body).toHaveProperty("premises");
      expect(body).toHaveProperty("pagination");
      expect(Array.isArray(body.premises)).toBe(true);
    });

    it("all created resources have id and timestamps", async () => {
      const project = await getProjectService().create({ name: "Test" });

      const res = await app.request("/narrative/premises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          logline: "Test",
        }),
      });

      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("createdAt");
      expect(body).toHaveProperty("updatedAt");
    });
  });

  describe("Content-Type Handling", () => {
    it("accepts application/json content type", async () => {
      const project = await getProjectService().create({ name: "Test" });

      const res = await app.request("/narrative/premises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          logline: "Test",
        }),
      });

      expect(res.status).toBe(201);
    });

    it("returns json content type in responses", async () => {
      const project = await getProjectService().create({ name: "Test" });
      const premise = await getNarrativeService().createPremise({
        projectId: project.id,
        logline: "Test",
      });

      const res = await app.request(`/narrative/premises/${premise.id}`);

      expect(res.headers.get("content-type")).toContain("application/json");
    });
  });
});
