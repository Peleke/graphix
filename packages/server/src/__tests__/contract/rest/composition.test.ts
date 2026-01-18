/**
 * Contract Tests: REST API - Composition
 *
 * Tests the /api/composition endpoints for correct HTTP status codes,
 * response body structure, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { app } from "../../../rest/app.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestProject,
  createTestStoryboard,
  createTestPanel,
} from "@graphix/core/testing";
import { getConfig } from "@graphix/core";

describe("REST /api/composition", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  // ============================================================================
  // GET /api/composition/templates
  // ============================================================================

  describe("GET /api/composition/templates", () => {
    it("returns 200 with templates list", async () => {
      const res = await app.request("/api/composition/templates");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("templates");
      expect(body).toHaveProperty("count");
      expect(Array.isArray(body.templates)).toBe(true);
      expect(typeof body.count).toBe("number");
    });
  });

  // ============================================================================
  // GET /api/composition/templates/:id
  // ============================================================================

  describe("GET /api/composition/templates/:id", () => {
    it("returns 400 for invalid ID format", async () => {
      const res = await app.request("/api/composition/templates/invalid-id");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent template", async () => {
      const res = await app.request("/api/composition/templates/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/composition/page-sizes
  // ============================================================================

  describe("GET /api/composition/page-sizes", () => {
    it("returns 200 with page sizes list", async () => {
      const res = await app.request("/api/composition/page-sizes");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("pageSizes");
      // pageSizes might be an object or array depending on implementation
      expect(typeof body.pageSizes === "object").toBe(true);
    });
  });

  // ============================================================================
  // POST /api/composition/compose
  // ============================================================================

  describe("POST /api/composition/compose", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for invalid storyboard ID", async () => {
      const res = await app.request("/api/composition/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
          templateId: "single-panel",
          panelIds: ["00000000-0000-0000-0000-000000000000"],
          outputName: "test-page",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/compose-storyboard
  // ============================================================================

  describe("POST /api/composition/compose-storyboard", () => {
    it("returns 400 when storyboardId is missing", async () => {
      const res = await app.request("/api/composition/compose-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid storyboard ID format", async () => {
      const res = await app.request("/api/composition/compose-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/contact-sheet
  // ============================================================================

  describe("POST /api/composition/contact-sheet", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/contact-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid storyboard ID format", async () => {
      const res = await app.request("/api/composition/contact-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboardId: "invalid-id",
          outputPath: "/test/output.png",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/export
  // ============================================================================

  describe("POST /api/composition/export", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid format", async () => {
      const res = await app.request("/api/composition/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPath: "/test/input.png",
          outputPath: "/test/output.png",
          format: "invalid-format",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for path traversal attempts", async () => {
      const res = await app.request("/api/composition/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPath: "../etc/passwd",
          outputPath: "../tmp/out.pdf",
          format: "pdf",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/composition/download
  // ============================================================================

  describe("GET /api/composition/download", () => {
    it("returns file with correct headers", async () => {
      const config = getConfig();
      const outputRoot = resolve(config.storage.outputDir);
      await mkdir(outputRoot, { recursive: true });
      const outputPath = resolve(outputRoot, "download-test.png");
      await writeFile(outputPath, new Uint8Array([137, 80, 78, 71]));

      const res = await app.request(
        `/api/composition/download?path=${encodeURIComponent(outputPath)}`
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="export.png"');
    });

    it("returns 400 for invalid path", async () => {
      const res = await app.request("/api/composition/download?path=../etc/passwd");
      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/composition/export-storyboard
  // ============================================================================

  describe("POST /api/composition/export-storyboard", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/api/composition/export-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET/PUT /api/composition/layouts/:storyboardId
  // ============================================================================

  describe("GET/PUT /api/composition/layouts/:storyboardId", () => {
    it("saves and fetches a page layout", async () => {
      const project = await createTestProject("Layout Project");
      const storyboard = await createTestStoryboard(project.id, "Layout Storyboard");
      const panel = await createTestPanel(storyboard.id, "Layout Panel");

      const saveRes = await app.request(`/api/composition/layouts/${storyboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Page 1",
          pageNumber: 1,
          templateId: "six-grid",
          pageSize: "comic_standard",
          slotAssignments: {
            "row1-left": panel.id,
          },
        }),
      });

      expect(saveRes.status).toBe(200);
      const saveBody = await saveRes.json();
      expect(saveBody).toHaveProperty("layout");

      const getRes = await app.request(
        `/api/composition/layouts/${storyboard.id}?pageNumber=1`
      );
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.layout).toBeTruthy();
      expect(getBody.layout.layoutConfig?.template).toBe("six-grid");
    });

    it("rejects panels outside the storyboard", async () => {
      const project = await createTestProject("Layout Project");
      const storyboard = await createTestStoryboard(project.id, "Layout Storyboard");
      const otherStoryboard = await createTestStoryboard(project.id, "Other Storyboard");
      const foreignPanel = await createTestPanel(otherStoryboard.id, "Foreign Panel");

      const res = await app.request(`/api/composition/layouts/${storyboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Page 1",
          pageNumber: 1,
          templateId: "six-grid",
          pageSize: "comic_standard",
          slotAssignments: {
            "row1-left": foreignPanel.id,
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects slot IDs that are not in the template", async () => {
      const project = await createTestProject("Layout Project");
      const storyboard = await createTestStoryboard(project.id, "Layout Storyboard");
      const panel = await createTestPanel(storyboard.id, "Layout Panel");

      const res = await app.request(`/api/composition/layouts/${storyboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Page 1",
          pageNumber: 1,
          templateId: "six-grid",
          pageSize: "comic_standard",
          slotAssignments: {
            "invalid-slot": panel.id,
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects oversized layout payloads", async () => {
      const project = await createTestProject("Layout Project");
      const storyboard = await createTestStoryboard(project.id, "Layout Storyboard");
      const panel = await createTestPanel(storyboard.id, "Layout Panel");
      const assignments: Record<string, string> = {};
      for (let i = 0; i < 80; i += 1) {
        assignments[`slot-${i}`] = panel.id;
      }

      const res = await app.request(`/api/composition/layouts/${storyboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Page 1",
          pageNumber: 1,
          templateId: "six-grid",
          pageSize: "comic_standard",
          slotAssignments: assignments,
        }),
      });

      expect(res.status).toBe(400);
    });
  });
});
