/**
 * File Upload Utilities
 *
 * Handles file uploads with validation, thumbnail generation, and secure storage.
 */

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { validateFilePathWithinAllowedDirs } from "./security.js";

// ============================================================================
// Types
// ============================================================================

export interface UploadOptions {
  /** Destination directory for the upload */
  destDir: string;
  /** Allowed MIME types (default: image types) */
  allowedTypes?: string[];
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Generate thumbnail (default: true for images) */
  generateThumbnail?: boolean;
  /** Thumbnail dimensions (default: 256x256) */
  thumbnailSize?: { width: number; height: number };
  /** Custom filename (default: random UUID) */
  filename?: string;
}

export interface UploadResult {
  /** Path to the original uploaded file */
  originalPath: string;
  /** Path to the generated thumbnail (if applicable) */
  thumbnailPath?: string;
  /** Original filename from upload */
  originalFilename: string;
  /** Saved filename */
  savedFilename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Image dimensions (if applicable) */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// Constants
// ============================================================================

/** Default maximum file size: 50MB */
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

/** Default thumbnail dimensions */
const DEFAULT_THUMBNAIL_SIZE = { width: 256, height: 256 };

/** Allowed image MIME types */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/** File extension to MIME type mapping */
const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** MIME type to file extension mapping */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate file type against allowed types.
 */
export function validateFileType(
  mimeType: string,
  filename: string,
  allowedTypes: string[] = ALLOWED_IMAGE_TYPES
): void {
  const normalizedMime = mimeType.toLowerCase();

  // Check MIME type
  if (!allowedTypes.includes(normalizedMime)) {
    throw new UploadError(
      `File type '${mimeType}' is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      "INVALID_FILE_TYPE"
    );
  }

  // Verify extension matches MIME type (prevent extension spoofing)
  const ext = extname(filename).toLowerCase();
  const expectedMime = EXTENSION_TO_MIME[ext];

  if (expectedMime && expectedMime !== normalizedMime) {
    throw new UploadError(
      `File extension '${ext}' does not match MIME type '${mimeType}'`,
      "MIME_EXTENSION_MISMATCH"
    );
  }
}

/**
 * Validate file size against maximum.
 */
export function validateFileSize(
  size: number,
  maxSize: number = DEFAULT_MAX_SIZE
): void {
  if (size <= 0) {
    throw new UploadError("File is empty", "EMPTY_FILE");
  }

  if (size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    const fileMB = Math.round(size / 1024 / 1024 * 100) / 100;
    throw new UploadError(
      `File size (${fileMB}MB) exceeds maximum allowed size (${maxMB}MB)`,
      "FILE_TOO_LARGE"
    );
  }
}

/**
 * Sanitize filename to prevent path traversal and special characters.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const base = basename(filename);

  // Remove dangerous characters, keep alphanumeric, dash, underscore, dot
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prevent hidden files
  if (sanitized.startsWith(".")) {
    return "_" + sanitized.slice(1);
  }

  // Ensure we have something valid (not just underscores)
  const trimmed = sanitized.replace(/^_+|_+$/g, "");
  if (!trimmed || /^_+$/.test(sanitized)) {
    return "upload";
  }

  return sanitized;
}

// ============================================================================
// Upload Error
// ============================================================================

export class UploadError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

// ============================================================================
// Core Upload Function
// ============================================================================

/**
 * Process and save an uploaded file with optional thumbnail generation.
 *
 * @param file - The uploaded file (File, Blob, or Buffer with metadata)
 * @param originalFilename - Original filename from the upload
 * @param mimeType - MIME type of the file
 * @param options - Upload options
 * @returns Upload result with paths and metadata
 */
export async function processUpload(
  fileData: Buffer | ArrayBuffer,
  originalFilename: string,
  mimeType: string,
  options: UploadOptions
): Promise<UploadResult> {
  const {
    destDir,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    maxSize = DEFAULT_MAX_SIZE,
    generateThumbnail = true,
    thumbnailSize = DEFAULT_THUMBNAIL_SIZE,
    filename,
  } = options;

  // Convert to Buffer if needed
  const buffer = Buffer.isBuffer(fileData)
    ? fileData
    : Buffer.from(fileData);

  // Validate
  validateFileType(mimeType, originalFilename, allowedTypes);
  validateFileSize(buffer.length, maxSize);

  // Generate filename
  const sanitizedOriginal = sanitizeFilename(originalFilename);
  const ext = MIME_TO_EXTENSION[mimeType.toLowerCase()] || extname(originalFilename);
  const savedFilename = filename
    ? `${sanitizeFilename(filename)}${ext}`
    : `${randomUUID()}${ext}`;

  // Construct paths
  const originalPath = join(destDir, savedFilename);
  const thumbnailFilename = `thumb_${savedFilename}`;
  const thumbnailPath = join(destDir, thumbnailFilename);

  // Validate destination is within allowed directories
  validateFilePathWithinAllowedDirs(originalPath, "write");

  // Create destination directory if it doesn't exist
  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }

  // Get image metadata using sharp
  let dimensions: { width: number; height: number } | undefined;
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());

  if (isImage) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        dimensions = { width: metadata.width, height: metadata.height };
      }
    } catch {
      // Not a valid image despite MIME type
      throw new UploadError(
        "File appears to be corrupted or not a valid image",
        "INVALID_IMAGE"
      );
    }
  }

  // Save original file
  await writeFile(originalPath, buffer);

  // Generate thumbnail for images
  let finalThumbnailPath: string | undefined;

  if (isImage && generateThumbnail) {
    try {
      await sharp(buffer)
        .resize(thumbnailSize.width, thumbnailSize.height, {
          fit: "cover",
          position: "center",
        })
        .toFile(thumbnailPath);

      finalThumbnailPath = thumbnailPath;
    } catch (err) {
      // Clean up original if thumbnail fails
      await unlink(originalPath).catch(() => {});
      throw new UploadError(
        `Failed to generate thumbnail: ${err instanceof Error ? err.message : "Unknown error"}`,
        "THUMBNAIL_FAILED"
      );
    }
  }

  return {
    originalPath,
    thumbnailPath: finalThumbnailPath,
    originalFilename: sanitizedOriginal,
    savedFilename,
    size: buffer.length,
    mimeType,
    dimensions,
  };
}

/**
 * Delete an uploaded file and its thumbnail.
 */
export async function deleteUpload(
  originalPath: string,
  thumbnailPath?: string
): Promise<void> {
  // Validate paths before deletion
  validateFilePathWithinAllowedDirs(originalPath, "write");

  await unlink(originalPath).catch(() => {});

  if (thumbnailPath) {
    validateFilePathWithinAllowedDirs(thumbnailPath, "write");
    await unlink(thumbnailPath).catch(() => {});
  }
}

/**
 * Get the default upload directory for character references.
 */
export function getCharacterUploadDir(characterId: string): string {
  const baseDir = process.env.GRAPHIX_UPLOAD_DIR || "./uploads";
  return join(baseDir, "characters", characterId);
}
