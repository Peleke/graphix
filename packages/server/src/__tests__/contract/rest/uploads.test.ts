/**
 * Contract Tests: REST API - Uploads
 */

import { describe, it, expect } from "bun:test";
import { app } from "../../../rest/app.js";

describe("REST /api/uploads", () => {
  describe("POST /api/uploads/image", () => {
    it("returns 400 when file is missing", async () => {
      const res = await app.request("/api/uploads/image", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
      });
      expect(res.status).toBe(400);
    });
  });
});
