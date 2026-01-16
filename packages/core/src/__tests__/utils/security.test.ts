/**
 * Security Validation Tests
 *
 * Tests for security utilities including path validation and allowed directories.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  validateFilePathWithinAllowedDirs,
  getAllowedBaseDirs,
  getComfyUIOutputDir,
  getDefaultOutputDir,
  getDefaultInputDir,
  getDefaultTempDir,
  sanitizeText,
  validatePosition,
} from "../../utils/security.js";

describe("Security Utilities", () => {
  // ============================================================================
  // ALLOWED DIRECTORIES
  // ============================================================================

  describe("getAllowedBaseDirs", () => {
    it("includes ComfyUI output directory", () => {
      const dirs = getAllowedBaseDirs();
      const comfyUIDir = getComfyUIOutputDir();
      expect(dirs).toContain(comfyUIDir);
    });

    it("includes standard output directory", () => {
      const dirs = getAllowedBaseDirs();
      const outputDir = getDefaultOutputDir();
      expect(dirs).toContain(outputDir);
    });

    it("includes input directory", () => {
      const dirs = getAllowedBaseDirs();
      const inputDir = getDefaultInputDir();
      expect(dirs).toContain(inputDir);
    });

    it("includes temp directory", () => {
      const dirs = getAllowedBaseDirs();
      const tempDir = getDefaultTempDir();
      expect(dirs).toContain(tempDir);
    });

    it("does NOT include current working directory (security)", () => {
      const dirs = getAllowedBaseDirs();
      // cwd() was removed for security - arbitrary directory access is dangerous
      expect(dirs).not.toContain(process.cwd());
    });

    it("supports GRAPHIX_ADDITIONAL_DIRS env var", () => {
      const originalEnv = process.env.GRAPHIX_ADDITIONAL_DIRS;
      try {
        process.env.GRAPHIX_ADDITIONAL_DIRS = "/custom/dir1,/custom/dir2";
        const dirs = getAllowedBaseDirs();
        expect(dirs.some(d => d.endsWith("/custom/dir1"))).toBe(true);
        expect(dirs.some(d => d.endsWith("/custom/dir2"))).toBe(true);
      } finally {
        if (originalEnv !== undefined) {
          process.env.GRAPHIX_ADDITIONAL_DIRS = originalEnv;
        } else {
          delete process.env.GRAPHIX_ADDITIONAL_DIRS;
        }
      }
    });
  });

  describe("getComfyUIOutputDir", () => {
    const originalEnv = process.env.COMFYUI_OUTPUT_DIR;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.COMFYUI_OUTPUT_DIR = originalEnv;
      } else {
        delete process.env.COMFYUI_OUTPUT_DIR;
      }
    });

    it("returns /tmp/comfyui-output by default", () => {
      delete process.env.COMFYUI_OUTPUT_DIR;
      expect(getComfyUIOutputDir()).toBe("/tmp/comfyui-output");
    });

    it("returns COMFYUI_OUTPUT_DIR when set", () => {
      process.env.COMFYUI_OUTPUT_DIR = "/custom/comfyui";
      expect(getComfyUIOutputDir()).toBe("/custom/comfyui");
    });
  });

  // ============================================================================
  // PATH VALIDATION WITH ALLOWED DIRS
  // ============================================================================

  describe("validateFilePathWithinAllowedDirs", () => {
    const originalEnvs = {
      COMFYUI_OUTPUT_DIR: process.env.COMFYUI_OUTPUT_DIR,
      GRAPHIX_OUTPUT_DIR: process.env.GRAPHIX_OUTPUT_DIR,
    };

    beforeEach(() => {
      // Set up predictable test environment
      process.env.COMFYUI_OUTPUT_DIR = "/tmp/comfyui-output";
    });

    afterEach(() => {
      // Restore original env vars
      if (originalEnvs.COMFYUI_OUTPUT_DIR !== undefined) {
        process.env.COMFYUI_OUTPUT_DIR = originalEnvs.COMFYUI_OUTPUT_DIR;
      } else {
        delete process.env.COMFYUI_OUTPUT_DIR;
      }
      if (originalEnvs.GRAPHIX_OUTPUT_DIR !== undefined) {
        process.env.GRAPHIX_OUTPUT_DIR = originalEnvs.GRAPHIX_OUTPUT_DIR;
      } else {
        delete process.env.GRAPHIX_OUTPUT_DIR;
      }
    });

    it("allows ComfyUI output directory paths", () => {
      const result = validateFilePathWithinAllowedDirs(
        "/tmp/comfyui-output/image.png",
        "read"
      );
      expect(result).toBe("/tmp/comfyui-output/image.png");
    });

    it("allows nested paths within ComfyUI output", () => {
      const result = validateFilePathWithinAllowedDirs(
        "/tmp/comfyui-output/subdir/image.png",
        "read"
      );
      expect(result).toBe("/tmp/comfyui-output/subdir/image.png");
    });

    it("allows write operations to ComfyUI output", () => {
      const result = validateFilePathWithinAllowedDirs(
        "/tmp/comfyui-output/output.png",
        "write"
      );
      expect(result).toBe("/tmp/comfyui-output/output.png");
    });

    it("rejects paths outside allowed directories", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs("/etc/passwd", "read")
      ).toThrow("Access denied: path not allowed");
    });

    it("rejects path traversal attempts", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/../../../etc/passwd",
          "read"
        )
      ).toThrow("Path traversal is not allowed");
    });

    it("rejects paths with null bytes", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/image\0.png",
          "read"
        )
      ).toThrow("File path contains invalid characters");
    });

    it("rejects empty string paths", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs("", "read")
      ).toThrow("File path must be a non-empty string");
    });

    it("rejects null paths", () => {
      expect(() =>
        // @ts-expect-error testing invalid input
        validateFilePathWithinAllowedDirs(null, "read")
      ).toThrow("File path must be a non-empty string");
    });

    it("rejects write operations to .env files in allowed dirs", () => {
      // .env files should be blocked even in allowed directories
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/.env",
          "write"
        )
      ).toThrow("Access denied: cannot write to this location");
    });

    it("rejects write operations to .env variants", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/.env.local",
          "write"
        )
      ).toThrow("Access denied: cannot write to this location");
    });

    it("rejects read operations to .env files", () => {
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/.env",
          "read"
        )
      ).toThrow("Access denied: cannot read this file");
    });

    it("rejects read operations to ssh keys", () => {
      // If somehow in allowed dir, should still block
      expect(() =>
        validateFilePathWithinAllowedDirs(
          "/tmp/comfyui-output/.ssh/id_rsa",
          "read"
        )
      ).toThrow("Access denied: cannot read this file");
    });

    it("allows write operations to allowed directories", () => {
      const result = validateFilePathWithinAllowedDirs(
        "/tmp/comfyui-output/test.png",
        "write"
      );
      expect(result).toBe("/tmp/comfyui-output/test.png");
    });

    it("respects custom COMFYUI_OUTPUT_DIR env var", () => {
      process.env.COMFYUI_OUTPUT_DIR = "/custom/comfyui";
      const result = validateFilePathWithinAllowedDirs(
        "/custom/comfyui/test.png",
        "read"
      );
      expect(result).toBe("/custom/comfyui/test.png");
    });
  });

  // ============================================================================
  // TEXT SANITIZATION
  // ============================================================================

  describe("sanitizeText", () => {
    it("removes HTML tags", () => {
      const result = sanitizeText('<script>alert("XSS")</script>');
      expect(result).toBe('alert("XSS")');
    });

    it("removes nested HTML tags", () => {
      const result = sanitizeText("<div><p>Hello</p></div>");
      expect(result).toBe("Hello");
    });

    it("removes control characters except newlines and tabs", () => {
      const result = sanitizeText("Hello\x00\x01World");
      expect(result).toBe("HelloWorld");
    });

    it("preserves newlines and tabs", () => {
      const result = sanitizeText("Hello\nWorld\tTest");
      expect(result).toBe("Hello\nWorld\tTest");
    });

    it("returns empty string for null input", () => {
      // @ts-expect-error testing invalid input
      expect(sanitizeText(null)).toBe("");
    });

    it("returns empty string for non-string input", () => {
      // @ts-expect-error testing invalid input
      expect(sanitizeText(123)).toBe("");
    });

    it("preserves safe special characters", () => {
      const result = sanitizeText("Hello! @user #tag $100 %50 & more");
      expect(result).toBe("Hello! @user #tag $100 %50 & more");
    });
  });

  // ============================================================================
  // POSITION VALIDATION
  // ============================================================================

  describe("validatePosition", () => {
    it("accepts valid position (0-100)", () => {
      expect(() => validatePosition({ x: 0, y: 0 })).not.toThrow();
      expect(() => validatePosition({ x: 50, y: 50 })).not.toThrow();
      expect(() => validatePosition({ x: 100, y: 100 })).not.toThrow();
    });

    it("rejects x value below 0", () => {
      expect(() => validatePosition({ x: -1, y: 50 })).toThrow(
        "Position x value -1 must be between 0 and 100"
      );
    });

    it("rejects x value above 100", () => {
      expect(() => validatePosition({ x: 101, y: 50 })).toThrow(
        "Position x value 101 must be between 0 and 100"
      );
    });

    it("rejects y value below 0", () => {
      expect(() => validatePosition({ x: 50, y: -5 })).toThrow(
        "Position y value -5 must be between 0 and 100"
      );
    });

    it("rejects y value above 100", () => {
      expect(() => validatePosition({ x: 50, y: 150 })).toThrow(
        "Position y value 150 must be between 0 and 100"
      );
    });

    it("rejects non-finite values", () => {
      expect(() => validatePosition({ x: NaN, y: 50 })).toThrow(
        "Position values must be finite numbers"
      );
      expect(() => validatePosition({ x: 50, y: Infinity })).toThrow(
        "Position values must be finite numbers"
      );
    });

    it("rejects null or undefined position", () => {
      // @ts-expect-error testing invalid input
      expect(() => validatePosition(null)).toThrow(
        "Position must be an object with numeric x and y values"
      );
    });

    it("rejects position missing x or y", () => {
      // @ts-expect-error testing invalid input
      expect(() => validatePosition({ x: 50 })).toThrow(
        "Position must be an object with numeric x and y values"
      );
    });
  });
});
