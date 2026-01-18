/**
 * Contract Tests: REST API - Uploads
 */

import { describe, it, expect } from "bun:test";
import { app } from "../../../rest/app.js";

describe("REST /api/uploads", () => {
  describe("POST /api/uploads/image", () => {
    it("returns 200 with upload response", async () => {
      const formData = new FormData();
      const file = new File(["controlnet"], "ref.png", { type: "image/png" });
      formData.append("file", file);

      const res = await app.request("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("path");
    });

    it("returns 400 when file is missing", async () => {
      const res = await app.request("/api/uploads/image", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
      });
      expect(res.status).toBe(400);
    });
  });
});
