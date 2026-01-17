/**
 * Contract Tests: REST API - Story Scaffold
 *
 * Tests the /api/story endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
} from "@graphix/core/testing";

describe("REST /api/story", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // POST /api/story/scaffold
  // ============================================================================

  describe("POST /api/story/scaffold", () => {
    it("scaffolds story structure and returns 201 with result", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/story/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: "Test Story",
          description: "A test story for scaffolding",
          characterNames: ["Hero", "Villain"],
          acts: [
            {
              name: "Act 1",
              description: "The beginning",
              scenes: [
                {
                  name: "Scene 1",
                  description: "Opening scene",
                  panels: [
                    { description: "Hero enters" },
                    { description: "Hero looks around" },
                  ],
                },
              ],
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("acts");
      expect(body).toHaveProperty("totalStoryboards");
      expect(body).toHaveProperty("totalPanels");
      expect(body.acts).toBeArray();
    });

    it("returns 400 for invalid scaffold input", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/story/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: "Incomplete Story",
          // Missing required 'acts' array
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("tracks missing characters in response when they do not exist", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/story/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: "Character Story",
          characterNames: ["Alpha", "Beta", "Gamma"],
          acts: [
            {
              name: "Act 1",
              scenes: [
                {
                  name: "Scene 1",
                  panels: [
                    { description: "Panel 1", characterNames: ["Alpha", "Beta"] },
                  ],
                },
              ],
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("missingCharacters");
      expect(body.missingCharacters).toBeArray();
      // Characters aren't created automatically - they're tracked as missing
      expect(body.missingCharacters).toContain("Alpha");
      expect(body.missingCharacters).toContain("Beta");
    });
  });

  // ============================================================================
  // POST /api/story/from-outline
  // ============================================================================

  describe("POST /api/story/from-outline", () => {
    it("parses outline and creates story structure", async () => {
      const project = await createTestProject();

      const outline = `
# My Story

## Characters
- Wolf: The main character
- Fox: The sidekick

## Act 1: Beginning

### Scene 1: Introduction
- Wolf enters the forest
- Fox greets Wolf

### Scene 2: Discovery
- They find a mysterious object
      `.trim();

      const res = await app.request("/api/story/from-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          outline,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("acts");
      expect(body).toHaveProperty("totalStoryboards");
      expect(body).toHaveProperty("missingCharacters");
    });

    it("returns 400 when projectId is missing", async () => {
      const res = await app.request("/api/story/from-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: "# Story\n## Act 1\n### Scene 1\n- Panel",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      // Error message may be "Required" or Zod validation message
      expect(body.error.message).toMatch(/Required|Invalid input|expected/);
    });

    it("returns 400 when outline is missing", async () => {
      const project = await createTestProject();

      const res = await app.request("/api/story/from-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error.message).toContain("outline");
    });
  });

  // ============================================================================
  // POST /api/story/parse-outline
  // ============================================================================

  describe("POST /api/story/parse-outline", () => {
    it("parses outline and returns preview without creating", async () => {
      const outline = `
# Story Title

## Characters
- Character A
- Character B

## Act 1: First Act

### Scene 1: Opening
- Panel description 1
- Panel description 2

### Scene 2: Middle
- Panel description 3
      `.trim();

      const res = await app.request("/api/story/parse-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("parsed", true);
      expect(body).toHaveProperty("title");
      expect(body).toHaveProperty("acts");
      expect(body).toHaveProperty("characterNames");
      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("actCount");
      expect(body.summary).toHaveProperty("sceneCount");
      expect(body.summary).toHaveProperty("panelCount");
      expect(body.summary).toHaveProperty("characterCount");
    });

    it("returns 400 when outline is missing", async () => {
      const res = await app.request("/api/story/parse-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error.message).toContain("outline");
    });

    it("returns correct summary counts", async () => {
      const outline = `
# Test

## Act 1
### Scene 1
- Panel 1
- Panel 2
### Scene 2
- Panel 3

## Act 2
### Scene 3
- Panel 4
- Panel 5
- Panel 6
      `.trim();

      const res = await app.request("/api/story/parse-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.actCount).toBe(2);
      expect(body.summary.sceneCount).toBe(3);
      expect(body.summary.panelCount).toBe(6);
    });
  });
});
