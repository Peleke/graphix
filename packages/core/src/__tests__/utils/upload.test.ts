/**
 * Upload Utility Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { rm, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  processUpload,
  validateFileType,
  validateFileSize,
  validateMagicBytes,
  validateCharacterId,
  validateImageDimensions,
  sanitizeFilename,
  deleteUpload,
  getCharacterUploadDir,
  UploadError,
} from "../../utils/upload.js";
import { getDefaultTempDir } from "../../utils/security.js";

// Use allowed temp directory for tests
const TEST_UPLOAD_DIR = join(getDefaultTempDir(), "graphix-upload-test");

describe("Upload Utilities", () => {
  beforeEach(async () => {
    // Clean up test directory
    if (existsSync(TEST_UPLOAD_DIR)) {
      await rm(TEST_UPLOAD_DIR, { recursive: true });
    }
    await mkdir(TEST_UPLOAD_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(TEST_UPLOAD_DIR)) {
      await rm(TEST_UPLOAD_DIR, { recursive: true });
    }
  });

  // ============================================================================
  // validateFileType
  // ============================================================================

  describe("validateFileType", () => {
    it("accepts valid image types", () => {
      expect(() => validateFileType("image/jpeg", "test.jpg")).not.toThrow();
      expect(() => validateFileType("image/png", "test.png")).not.toThrow();
      expect(() => validateFileType("image/webp", "test.webp")).not.toThrow();
    });

    it("rejects invalid MIME types", () => {
      expect(() => validateFileType("application/pdf", "test.pdf")).toThrow(
        UploadError
      );
      expect(() => validateFileType("text/plain", "test.txt")).toThrow(
        UploadError
      );
    });

    it("detects MIME/extension mismatch", () => {
      expect(() => validateFileType("image/png", "test.jpg")).toThrow(
        UploadError
      );
    });

    it("accepts custom allowed types", () => {
      expect(() =>
        validateFileType("application/pdf", "test.pdf", ["application/pdf"])
      ).not.toThrow();
    });
  });

  // ============================================================================
  // validateFileSize
  // ============================================================================

  describe("validateFileSize", () => {
    it("accepts files within size limit", () => {
      expect(() => validateFileSize(1024)).not.toThrow(); // 1KB
      expect(() => validateFileSize(50 * 1024 * 1024)).not.toThrow(); // 50MB (limit)
    });

    it("rejects files exceeding size limit", () => {
      expect(() => validateFileSize(51 * 1024 * 1024)).toThrow(UploadError);
    });

    it("rejects empty files", () => {
      expect(() => validateFileSize(0)).toThrow(UploadError);
    });

    it("uses custom size limit", () => {
      expect(() => validateFileSize(1024, 512)).toThrow(UploadError);
      expect(() => validateFileSize(512, 1024)).not.toThrow();
    });
  });

  // ============================================================================
  // validateMagicBytes (P0 Security)
  // ============================================================================

  describe("validateMagicBytes", () => {
    it("accepts valid PNG magic bytes", () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x00, // padding
      ]);
      expect(() => validateMagicBytes(pngBuffer, "image/png")).not.toThrow();
    });

    it("accepts valid JPEG magic bytes", () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG signature
        0x00, 0x00, 0x00, 0x00, // padding
      ]);
      expect(() => validateMagicBytes(jpegBuffer, "image/jpeg")).not.toThrow();
    });

    it("accepts valid WebP magic bytes", () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      expect(() => validateMagicBytes(webpBuffer, "image/webp")).not.toThrow();
    });

    it("rejects mismatched magic bytes", () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG signature
        0x00, 0x00, 0x00, 0x00, // padding
      ]);
      expect(() => validateMagicBytes(jpegBuffer, "image/png")).toThrow(UploadError);
    });

    it("rejects files too small for magic bytes", () => {
      const tinyBuffer = Buffer.from([0x89, 0x50]); // Only 2 bytes
      expect(() => validateMagicBytes(tinyBuffer, "image/png")).toThrow(UploadError);
    });

    it("rejects invalid WebP (missing WEBP signature)", () => {
      const badWebp = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x00, 0x00, 0x00, 0x00, // NOT WEBP
      ]);
      expect(() => validateMagicBytes(badWebp, "image/webp")).toThrow(UploadError);
    });

    it("skips validation for unknown MIME types", () => {
      const buffer = Buffer.from("any content");
      // Should not throw for types we don't have magic bytes for
      expect(() => validateMagicBytes(buffer, "application/octet-stream")).not.toThrow();
    });
  });

  // ============================================================================
  // validateCharacterId (P1 Security)
  // ============================================================================

  describe("validateCharacterId", () => {
    it("accepts valid character IDs", () => {
      expect(() => validateCharacterId("char-123")).not.toThrow();
      expect(() => validateCharacterId("my_character")).not.toThrow();
      expect(() => validateCharacterId("abc123")).not.toThrow();
      expect(() => validateCharacterId("UUID-like-123-abc")).not.toThrow();
    });

    it("rejects path traversal attempts", () => {
      expect(() => validateCharacterId("../../../etc")).toThrow(UploadError);
      expect(() => validateCharacterId("char/../admin")).toThrow(UploadError);
    });

    it("rejects directory separators", () => {
      expect(() => validateCharacterId("char/nested")).toThrow(UploadError);
      expect(() => validateCharacterId("char\\nested")).toThrow(UploadError);
    });

    it("rejects special characters", () => {
      expect(() => validateCharacterId("char<script>")).toThrow(UploadError);
      expect(() => validateCharacterId("char;rm -rf")).toThrow(UploadError);
    });

    it("rejects empty or null IDs", () => {
      expect(() => validateCharacterId("")).toThrow(UploadError);
      expect(() => validateCharacterId(null as any)).toThrow(UploadError);
    });
  });

  // ============================================================================
  // validateImageDimensions (P1 Security)
  // ============================================================================

  describe("validateImageDimensions", () => {
    it("accepts normal image dimensions", () => {
      expect(() => validateImageDimensions(1920, 1080)).not.toThrow();
      expect(() => validateImageDimensions(4096, 4096)).not.toThrow();
    });

    it("accepts images at the limit", () => {
      expect(() => validateImageDimensions(16384, 16384)).not.toThrow();
    });

    it("rejects oversized width", () => {
      expect(() => validateImageDimensions(20000, 1080)).toThrow(UploadError);
    });

    it("rejects oversized height", () => {
      expect(() => validateImageDimensions(1920, 20000)).toThrow(UploadError);
    });

    it("uses custom max dimension", () => {
      expect(() => validateImageDimensions(2000, 2000, 1000)).toThrow(UploadError);
      expect(() => validateImageDimensions(500, 500, 1000)).not.toThrow();
    });
  });

  // ============================================================================
  // sanitizeFilename
  // ============================================================================

  describe("sanitizeFilename", () => {
    it("removes path components", () => {
      expect(sanitizeFilename("/etc/passwd")).toBe("passwd");
      expect(sanitizeFilename("../../../etc/passwd")).toBe("passwd");
    });

    it("removes dangerous characters", () => {
      expect(sanitizeFilename("test<script>.jpg")).toBe("test_script_.jpg");
      expect(sanitizeFilename("test file.jpg")).toBe("test_file.jpg");
    });

    it("prevents hidden files", () => {
      expect(sanitizeFilename(".htaccess")).toBe("_htaccess");
    });

    it("handles empty/invalid input", () => {
      expect(sanitizeFilename("")).toBe("upload");
      expect(sanitizeFilename("!!!")).toBe("upload");
    });
  });

  // ============================================================================
  // processUpload
  // ============================================================================

  describe("processUpload", () => {
    // Create a minimal valid PNG (1x1 red pixel)
    const createTestPng = (): Buffer => {
      // Minimal PNG: 1x1 red pixel
      return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde,
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
        0x01, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
        0xae, 0x42, 0x60, 0x82,
      ]);
    };

    it("processes valid image upload", async () => {
      const buffer = createTestPng();
      const result = await processUpload(buffer, "test.png", "image/png", {
        destDir: TEST_UPLOAD_DIR,
        generateThumbnail: false, // Skip thumbnail for minimal test
      });

      expect(result.originalPath).toContain(TEST_UPLOAD_DIR);
      expect(result.mimeType).toBe("image/png");
      expect(result.size).toBe(buffer.length);
      expect(existsSync(result.originalPath)).toBe(true);
    });

    it("rejects invalid file type", async () => {
      const buffer = Buffer.from("not an image");

      await expect(
        processUpload(buffer, "test.txt", "text/plain", {
          destDir: TEST_UPLOAD_DIR,
        })
      ).rejects.toThrow(UploadError);
    });

    it("rejects oversized files", async () => {
      const buffer = Buffer.alloc(51 * 1024 * 1024); // 51MB

      await expect(
        processUpload(buffer, "large.png", "image/png", {
          destDir: TEST_UPLOAD_DIR,
        })
      ).rejects.toThrow(UploadError);
    });

    it("creates destination directory if missing", async () => {
      const newDir = join(TEST_UPLOAD_DIR, "subdir", "nested");
      const buffer = createTestPng();

      const result = await processUpload(buffer, "test.png", "image/png", {
        destDir: newDir,
        generateThumbnail: false,
      });

      expect(existsSync(newDir)).toBe(true);
      expect(existsSync(result.originalPath)).toBe(true);
    });

    it("rejects files with invalid magic bytes (P0 Security)", async () => {
      // Create a buffer that claims to be PNG but has JPEG magic bytes
      const fakeBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG signature, not PNG
        0x00, 0x00, 0x00, 0x00,
      ]);

      await expect(
        processUpload(fakeBuffer, "fake.png", "image/png", {
          destDir: TEST_UPLOAD_DIR,
          generateThumbnail: false,
        })
      ).rejects.toThrow(UploadError);
    });
  });

  // ============================================================================
  // deleteUpload
  // ============================================================================

  describe("deleteUpload", () => {
    it("deletes uploaded files", async () => {
      // Create a test file
      const testPath = join(TEST_UPLOAD_DIR, "to-delete.txt");
      const { writeFile } = await import("node:fs/promises");
      await writeFile(testPath, "test");

      expect(existsSync(testPath)).toBe(true);

      await deleteUpload(testPath);

      expect(existsSync(testPath)).toBe(false);
    });

    it("handles non-existent files gracefully", async () => {
      const fakePath = join(TEST_UPLOAD_DIR, "nonexistent.txt");

      // Should not throw
      await expect(deleteUpload(fakePath)).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // getCharacterUploadDir
  // ============================================================================

  describe("getCharacterUploadDir", () => {
    it("returns correct path for character", () => {
      const dir = getCharacterUploadDir("char-123");
      expect(dir).toContain("characters");
      expect(dir).toContain("char-123");
    });

    it("uses GRAPHIX_UPLOAD_DIR env var", () => {
      const original = process.env.GRAPHIX_UPLOAD_DIR;
      process.env.GRAPHIX_UPLOAD_DIR = "/custom/uploads";

      const dir = getCharacterUploadDir("char-123");
      expect(dir).toContain("/custom/uploads");

      // Restore
      if (original) {
        process.env.GRAPHIX_UPLOAD_DIR = original;
      } else {
        delete process.env.GRAPHIX_UPLOAD_DIR;
      }
    });

    it("rejects path traversal attempts (P1 Security)", () => {
      expect(() => getCharacterUploadDir("../../../etc")).toThrow(UploadError);
      expect(() => getCharacterUploadDir("char/../admin")).toThrow(UploadError);
    });

    it("rejects invalid character IDs (P1 Security)", () => {
      expect(() => getCharacterUploadDir("char<script>")).toThrow(UploadError);
      expect(() => getCharacterUploadDir("")).toThrow(UploadError);
    });
  });
});
