/**
 * Upload Routes
 *
 * REST endpoints for uploading reference images.
 */

import { Hono } from "hono";
import { errors } from "../errors/index.js";
import { getConfig } from "@graphix/core";
import { join, extname } from "path";
import { mkdir, writeFile } from "fs/promises";

export const uploadRoutes = new Hono();

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function extensionForType(type: string): string {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return extname(type);
  }
}

/**
 * POST /uploads/image
 * Upload reference image for ControlNet
 */
uploadRoutes.post("/image", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return errors.badRequest(c, "file is required");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return errors.badRequest(c, "Unsupported file type");
  }

  const config = getConfig();
  const outputDir = join(config.storage.outputDir, "uploads");
  await mkdir(outputDir, { recursive: true });

  const ext = extensionForType(file.type);
  const filename = `${crypto.randomUUID()}${ext}`;
  const outputPath = join(outputDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(outputPath, buffer);

  return c.json({
    success: true,
    filename,
    mimeType: file.type,
    path: outputPath,
  });
});
