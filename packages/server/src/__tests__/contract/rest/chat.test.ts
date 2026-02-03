/**
 * Contract Tests: REST API - Chat & Enhanced Bootstrap
 *
 * Tests the /api/chat endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@graphix/core/testing";

// ============================================================================
// Test Data
// ============================================================================

const validBootstrapInput = {
  name: "Test Story",
  description: "A test story description",
  characters: [
    {
      name: "Luna",
      role: "protagonist",
      species: "wolf",
      visualDescription: "A silver-furred wolf with blue eyes",
      personality: ["brave", "kind"],
      motivation: "To find her pack",
    },
    {
      name: "Max",
      role: "supporting",
      visualDescription: "An orange fox with a bushy tail",
      personality: ["clever", "loyal"],
    },
  ],
  setting: {
    location: "Snowy forest",
    atmosphere: "Mysterious and enchanting",
    visualDetails: ["tall pines", "falling snow", "moonlight"],
  },
  arc: {
    premise: {
      logline: "A lone wolf discovers friendship in the coldest winter",
      genre: "adventure",
      tone: "hopeful",
      themes: ["friendship", "courage"],
      setting: "Winter forest",
    },
    structure: "three-act",
    acts: ["Setup", "Confrontation", "Resolution"],
    beats: [
      {
        type: "setup",
        actIndex: 0,
        summary: "Luna alone in the forest",
        visualDescription: "A silver wolf sits alone on a snowy hilltop",
        emotionalTone: "lonely",
        involvedCharacters: ["Luna"],
        cameraAngle: "wide",
      },
      {
        type: "inciting_incident",
        actIndex: 0,
        summary: "Luna meets Max",
        visualDescription: "Luna encounters Max in a clearing",
        emotionalTone: "curious",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "medium",
      },
      {
        type: "climax",
        actIndex: 2,
        summary: "They face danger together",
        visualDescription: "Luna and Max stand side by side against a storm",
        emotionalTone: "tense",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "low-angle",
      },
      {
        type: "resolution",
        actIndex: 2,
        summary: "Friendship formed",
        visualDescription: "Luna and Max walk together into the sunrise",
        emotionalTone: "hopeful",
        involvedCharacters: ["Luna", "Max"],
        cameraAngle: "wide",
      },
    ],
  },
  style: "Manga",
  pageCount: 8,
};

// ============================================================================
// Tests
// ============================================================================

describe("REST /api/chat", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ==========================================================================
  // POST /api/chat/bootstrap/enhanced
  // ==========================================================================

  describe("POST /api/chat/bootstrap/enhanced", () => {
    it("returns 400 when name is missing", async () => {
      const input = { ...validBootstrapInput };
      delete (input as any).name;

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when arc is missing", async () => {
      const input = { ...validBootstrapInput };
      delete (input as any).arc;

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when arc.premise is missing", async () => {
      const input = {
        ...validBootstrapInput,
        arc: { ...validBootstrapInput.arc, premise: undefined },
      };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when characters array is empty", async () => {
      const input = { ...validBootstrapInput, characters: [] };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid structure type", async () => {
      const input = {
        ...validBootstrapInput,
        arc: { ...validBootstrapInput.arc, structure: "invalid-structure" },
      };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });

    it("returns 201 with complete structure on valid request", async () => {
      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBootstrapInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      // Verify project
      expect(body).toHaveProperty("project");
      expect(body.project).toHaveProperty("id");
      expect(body.project).toHaveProperty("name", "Test Story");

      // Verify premise
      expect(body).toHaveProperty("premise");
      expect(body.premise).toHaveProperty("id");
      expect(body.premise).toHaveProperty("logline");

      // Verify story
      expect(body).toHaveProperty("story");
      expect(body.story).toHaveProperty("id");
      expect(body.story).toHaveProperty("structure", "three-act");

      // Verify storyboards (one per act)
      expect(body).toHaveProperty("storyboards");
      expect(body.storyboards.length).toBe(3);
      expect(body.storyboards[0]).toHaveProperty("actIndex", 0);
      expect(body.storyboards[1]).toHaveProperty("actIndex", 1);
      expect(body.storyboards[2]).toHaveProperty("actIndex", 2);

      // Verify beats
      expect(body).toHaveProperty("beats");
      expect(body.beats.length).toBe(4);
      body.beats.forEach((beat: any) => {
        expect(beat).toHaveProperty("id");
        expect(beat).toHaveProperty("type");
      });

      // Verify panels (should match beats)
      expect(body).toHaveProperty("panels");
      expect(body.panels.length).toBe(4);
      body.panels.forEach((panel: any) => {
        expect(panel).toHaveProperty("id");
        expect(panel).toHaveProperty("beatId");
        expect(panel).toHaveProperty("storyboardId");
      });

      // Verify characters
      expect(body).toHaveProperty("characters");
      expect(body.characters.length).toBe(2);
      expect(body.characters.map((c: any) => c.name)).toContain("Luna");
      expect(body.characters.map((c: any) => c.name)).toContain("Max");
    });

    it("creates beat-panel associations correctly", async () => {
      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBootstrapInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      // Each beat should have a corresponding panel
      const beatIds = body.beats.map((b: any) => b.id);
      const panelBeatIds = body.panels.map((p: any) => p.beatId);

      // All beat IDs should be in panel beatIds
      beatIds.forEach((beatId: string) => {
        expect(panelBeatIds).toContain(beatId);
      });

      // Beats should have panelId set
      body.beats.forEach((beat: any) => {
        if (beat.panelId) {
          const panel = body.panels.find((p: any) => p.id === beat.panelId);
          expect(panel).toBeDefined();
          expect(panel.beatId).toBe(beat.id);
        }
      });
    });

    it("assigns panels to correct storyboards by act", async () => {
      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBootstrapInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      // Build storyboard lookup by act
      const storyboardByAct: Record<number, string> = {};
      body.storyboards.forEach((sb: any) => {
        storyboardByAct[sb.actIndex] = sb.id;
      });

      // Check that panels are in the right storyboards
      // Setup beat (actIndex: 0) should be in first storyboard
      const setupBeat = body.beats.find((b: any) => b.type === "setup");
      if (setupBeat?.panelId) {
        const setupPanel = body.panels.find((p: any) => p.id === setupBeat.panelId);
        expect(setupPanel?.storyboardId).toBe(storyboardByAct[0]);
      }

      // Resolution beat (actIndex: 2) should be in third storyboard
      const resolutionBeat = body.beats.find((b: any) => b.type === "resolution");
      if (resolutionBeat?.panelId) {
        const resolutionPanel = body.panels.find((p: any) => p.id === resolutionBeat.panelId);
        expect(resolutionPanel?.storyboardId).toBe(storyboardByAct[2]);
      }
    });

    it("handles five-act structure correctly", async () => {
      const fiveActInput = {
        ...validBootstrapInput,
        arc: {
          ...validBootstrapInput.arc,
          structure: "five-act",
          acts: ["Exposition", "Rising Action", "Climax", "Falling Action", "Denouement"],
        },
      };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fiveActInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.story.structure).toBe("five-act");
      expect(body.storyboards.length).toBe(5);
    });

    it("handles hero-journey structure correctly", async () => {
      const heroJourneyInput = {
        ...validBootstrapInput,
        arc: {
          ...validBootstrapInput.arc,
          structure: "hero-journey",
          acts: ["Departure", "Initiation", "Return"],
        },
      };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroJourneyInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.story.structure).toBe("hero-journey");
      expect(body.storyboards.length).toBe(3);
    });

    it("handles null setting gracefully", async () => {
      const input = { ...validBootstrapInput, setting: null };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("project");
    });

    it("handles optional fields correctly", async () => {
      const minimalInput = {
        name: "Minimal Story",
        characters: [
          {
            name: "Hero",
            role: "protagonist",
            visualDescription: "A brave hero",
            personality: ["brave"],
          },
        ],
        arc: {
          premise: {
            logline: "A hero's journey",
            genre: "adventure",
            tone: "epic",
            themes: ["heroism"],
            setting: "Fantasy land",
          },
          structure: "three-act",
          acts: ["Beginning", "Middle", "End"],
          beats: [
            {
              type: "setup",
              actIndex: 0,
              summary: "Hero starts journey",
              visualDescription: "Hero standing at crossroads",
              emotionalTone: "determined",
              involvedCharacters: ["Hero"],
            },
          ],
        },
      };

      const res = await app.request("/api/chat/bootstrap/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minimalInput),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.project.name).toBe("Minimal Story");
    });
  });

  // ==========================================================================
  // POST /api/chat/sessions/:id/extract
  // ==========================================================================

  describe("POST /api/chat/sessions/:id/extract", () => {
    it("returns error for non-existent session", async () => {
      const res = await app.request("/api/chat/sessions/non-existent-id/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Returns 404 if session not found, 500 if other error
      expect([404, 500]).toContain(res.status);
    });
  });

  // ==========================================================================
  // GET /api/chat/status
  // ==========================================================================

  describe("GET /api/chat/status", () => {
    it("returns 200 with availability info", async () => {
      const res = await app.request("/api/chat/status");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("available");
      expect(typeof body.available).toBe("boolean");
    });
  });
});
