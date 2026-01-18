/**
 * Upload Routes
 *
 * REST endpoints for uploading reference images.
 */

import { Hono } from "hono";
import { errors } from "../errors/index.js";
import { ErrorCodes } from "../errors/types.js";
import { getConfig } from "@graphix/core";
import { join, extname } from "path";
import { mkdir, writeFile } from "fs/promises";

export const uploadRoutes = new Hono();

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

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

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 8) {
    // PNG signature
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = pngSig.every((byte, idx) => buffer[idx] === byte);
    if (isPng) return "image/png";
  }

  if (buffer.length >= 3) {
    // JPEG signature FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
  }

  if (buffer.length >= 12) {
    // WEBP signature: "RIFF"...."WEBP"
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  return null;
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
    return errors.badRequest(c, "Unsupported file type", ErrorCodes.INVALID_FILE_TYPE);
  }
  
  if (file.size > MAX_UPLOAD_BYTES) {
    return errors.badRequest(c, "File too large", ErrorCodes.FILE_TOO_LARGE);
  }

  const config = getConfig();
  const outputDir = join(config.storage.outputDir, "uploads");
  await mkdir(outputDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectMimeType(buffer);
  if (!detectedType || detectedType !== file.type) {
    return errors.badRequest(c, "Invalid magic bytes", ErrorCodes.INVALID_MAGIC_BYTES);
  }

  const ext = extensionForType(detectedType);
  const filename = `${crypto.randomUUID()}${ext}`;
  const outputPath = join(outputDir, filename);

  await writeFile(outputPath, buffer);

  return c.json({
    success: true,
    filename,
    mimeType: detectedType,
    path: outputPath,
  });
});
