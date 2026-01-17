/**
 * File Upload Utilities
 *
 * Handles file uploads with validation, thumbnail generation, and secure storage.
 */

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { lstatSync } from "node:fs";
import { join, dirname, extname, basename, resolve } from "node:path";
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

/** Magic bytes (file signatures) for image validation - P0 SECURITY */
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/jpg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP also has WEBP at offset 8)
};

/** Maximum image dimension to prevent DoS via decompression bomb - P1 SECURITY */
const MAX_IMAGE_DIMENSION = 16384; // 16K pixels

/** Character ID validation pattern (UUID or alphanumeric) - P1 SECURITY */
const VALID_CHARACTER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

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
 * Validate file content matches claimed MIME type via magic bytes.
 * P0 SECURITY: Prevents MIME type spoofing attacks.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): void {
  const expectedBytes = MAGIC_BYTES[mimeType.toLowerCase()];
  if (!expectedBytes) {
    // No magic bytes defined for this type - skip validation
    return;
  }

  if (buffer.length < expectedBytes.length) {
    throw new UploadError(
      "File is too small to be a valid image",
      "INVALID_MAGIC_BYTES"
    );
  }

  // Check magic bytes match
  for (let i = 0; i < expectedBytes.length; i++) {
    if (buffer[i] !== expectedBytes[i]) {
      throw new UploadError(
        "File content does not match declared MIME type",
        "INVALID_MAGIC_BYTES"
      );
    }
  }

  // Additional check for WebP: verify WEBP signature at offset 8
  if (mimeType.toLowerCase() === "image/webp") {
    if (buffer.length < 12) {
      throw new UploadError(
        "File is too small to be a valid WebP image",
        "INVALID_MAGIC_BYTES"
      );
    }
    const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
    for (let i = 0; i < webpSignature.length; i++) {
      if (buffer[8 + i] !== webpSignature[i]) {
        throw new UploadError(
          "File content does not match declared MIME type",
          "INVALID_MAGIC_BYTES"
        );
      }
    }
  }
}

/**
 * Validate character ID to prevent path injection.
 * P1 SECURITY: Prevents path traversal via malicious character IDs.
 */
export function validateCharacterId(characterId: string): void {
  if (!characterId || typeof characterId !== "string") {
    throw new UploadError("Character ID is required", "INVALID_CHARACTER_ID");
  }

  if (!VALID_CHARACTER_ID_PATTERN.test(characterId)) {
    throw new UploadError(
      "Character ID contains invalid characters",
      "INVALID_CHARACTER_ID"
    );
  }

  // Prevent path traversal attempts
  if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
    throw new UploadError(
      "Character ID contains invalid path characters",
      "INVALID_CHARACTER_ID"
    );
  }
}

/**
 * Validate image dimensions to prevent decompression bomb DoS.
 * P1 SECURITY: Prevents memory exhaustion via oversized images.
 */
export function validateImageDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION
): void {
  if (width > maxDimension || height > maxDimension) {
    throw new UploadError(
      `Image dimensions (${width}x${height}) exceed maximum allowed (${maxDimension}x${maxDimension})`,
      "IMAGE_TOO_LARGE"
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

  // Validate file type, size, and magic bytes (P0 SECURITY)
  validateFileType(mimeType, originalFilename, allowedTypes);
  validateFileSize(buffer.length, maxSize);
  validateMagicBytes(buffer, mimeType);

  // Generate filename
  const sanitizedOriginal = sanitizeFilename(originalFilename);
  const ext = MIME_TO_EXTENSION[mimeType.toLowerCase()] || extname(originalFilename);
  const savedFilename = filename
    ? `${sanitizeFilename(filename)}${ext}`
    : `${randomUUID()}${ext}`;

  // Construct paths - resolve to absolute to prevent symlink shenanigans
  const resolvedDestDir = resolve(destDir);
  const originalPath = join(resolvedDestDir, savedFilename);
  const thumbnailFilename = `thumb_${savedFilename}`;
  const thumbnailPath = join(resolvedDestDir, thumbnailFilename);

  // Validate destination is within allowed directories
  validateFilePathWithinAllowedDirs(originalPath, "write");

  // P1 SECURITY: Check if destDir exists and is a symlink (symlink attack prevention)
  try {
    const stats = lstatSync(resolvedDestDir);
    if (stats.isSymbolicLink()) {
      throw new UploadError(
        "Destination directory cannot be a symbolic link",
        "SYMLINK_NOT_ALLOWED"
      );
    }
  } catch (err) {
    // Directory doesn't exist yet - that's fine, we'll create it
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  // P1 SECURITY: Atomic directory creation (fixes TOCTOU race condition)
  // mkdir with recursive:true is atomic and won't fail if dir exists
  await mkdir(resolvedDestDir, { recursive: true });

  // After creation, verify it's not a symlink (race condition protection)
  const postCreateStats = lstatSync(resolvedDestDir);
  if (postCreateStats.isSymbolicLink()) {
    throw new UploadError(
      "Destination directory cannot be a symbolic link",
      "SYMLINK_NOT_ALLOWED"
    );
  }

  // Get image metadata using sharp
  let dimensions: { width: number; height: number } | undefined;
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());

  if (isImage) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        // P1 SECURITY: Validate image dimensions to prevent decompression bomb
        validateImageDimensions(metadata.width, metadata.height);
        dimensions = { width: metadata.width, height: metadata.height };
      }
    } catch (err) {
      // Check if it's our dimension error
      if (err instanceof UploadError) {
        throw err;
      }
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
 * P1 SECURITY: Validates character ID to prevent path injection.
 */
export function getCharacterUploadDir(characterId: string): string {
  // P1 SECURITY: Validate character ID before using in path
  validateCharacterId(characterId);

  const baseDir = process.env.GRAPHIX_UPLOAD_DIR || "./uploads";
  return join(baseDir, "characters", characterId);
}
