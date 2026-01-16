/**
 * Security Utilities
 *
 * Functions for input sanitization, path validation, and security checks.
 */

import { resolve, normalize, relative, isAbsolute } from "path";
import { realpathSync, existsSync, lstatSync } from "fs";

/**
 * Sanitize text input by stripping HTML tags and dangerous characters.
 * This provides defense-in-depth for XSS prevention.
 *
 * @param text - Raw user input
 * @returns Sanitized text with HTML tags removed
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, "");

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Escape XML/HTML special characters for safe output.
 * Use this when rendering text in SVG/HTML contexts.
 *
 * @param text - Text to escape
 * @returns Escaped text safe for XML/HTML output
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Configuration for path validation
 */
export interface PathValidationOptions {
  /** Base directory that paths must stay within */
  baseDir: string;
  /** Whether to allow absolute paths (default: false) */
  allowAbsolute?: boolean;
  /** Whether to create the directory if it doesn't exist (default: false) */
  allowCreate?: boolean;
  /** Allowed file extensions (e.g., ['.png', '.jpg']). Empty = allow all */
  allowedExtensions?: string[];
}

/**
 * Validate that a file path is safe and within allowed boundaries.
 * Prevents path traversal attacks like "../../../etc/passwd".
 *
 * @param path - The path to validate
 * @param options - Validation options
 * @returns The normalized, resolved absolute path if valid
 * @throws Error if path is unsafe or outside allowed directory
 */
export function validateFilePath(
  path: string,
  options: PathValidationOptions
): string {
  if (!path || typeof path !== "string") {
    throw new Error("Path must be a non-empty string");
  }

  const { baseDir, allowAbsolute = false, allowedExtensions = [] } = options;

  // Reject obviously malicious patterns
  if (path.includes("\0")) {
    throw new Error("Path contains null bytes");
  }

  // Check for path traversal sequences
  if (path.includes("..")) {
    throw new Error("Path traversal sequences (..) are not allowed");
  }

  // Reject absolute paths unless explicitly allowed
  if (!allowAbsolute && isAbsolute(path)) {
    throw new Error("Absolute paths are not allowed");
  }

  // Resolve the full path
  const resolvedBase = resolve(baseDir);
  const resolvedPath = resolve(resolvedBase, path);

  // Normalize to remove any sneaky path components
  const normalizedPath = normalize(resolvedPath);

  // Ensure the resolved path is within the base directory
  const relativePath = relative(resolvedBase, normalizedPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(
      `Path "${path}" resolves outside allowed directory "${baseDir}"`
    );
  }

  // Check file extension if restrictions are specified
  if (allowedExtensions.length > 0) {
    const ext = normalizedPath.substring(normalizedPath.lastIndexOf("."));
    if (!allowedExtensions.includes(ext.toLowerCase())) {
      throw new Error(
        `File extension "${ext}" is not allowed. Allowed: ${allowedExtensions.join(", ")}`
      );
    }
  }

  return normalizedPath;
}

/**
 * Get the default output directory for generated files.
 * Uses GRAPHIX_OUTPUT_DIR env var, or falls back to ./output
 */
export function getDefaultOutputDir(): string {
  return process.env.GRAPHIX_OUTPUT_DIR || resolve(process.cwd(), "output");
}

/**
 * Get the default input directory for source files.
 * Uses GRAPHIX_INPUT_DIR env var, or falls back to ./input
 */
export function getDefaultInputDir(): string {
  return process.env.GRAPHIX_INPUT_DIR || resolve(process.cwd(), "input");
}


/**
 * Get the default ComfyUI output directory.
 * Uses COMFYUI_OUTPUT_DIR env var, or falls back to /tmp/comfyui-output
 */
export function getComfyUIOutputDir(): string {
  return process.env.COMFYUI_OUTPUT_DIR || "/tmp/comfyui-output";
}

/**
 * Get the default temporary directory.
 * Uses GRAPHIX_TEMP_DIR env var, or falls back to ./temp
 */
export function getDefaultTempDir(): string {
  return process.env.GRAPHIX_TEMP_DIR || resolve(process.cwd(), "temp");
}

/**
 * Get all allowed base directories for file operations.
 * Includes output, input, temp, and ComfyUI output directories.
 *
 * NOTE: process.cwd() is explicitly NOT included for security reasons.
 * If you need to allow additional directories, configure them via environment variables.
 */
export function getAllowedBaseDirs(): string[] {
  const dirs = [
    getDefaultOutputDir(),
    getDefaultInputDir(),
    getDefaultTempDir(),
    getComfyUIOutputDir(),
  ];

  // Allow additional directories via environment variable (comma-separated)
  const additionalDirs = process.env.GRAPHIX_ADDITIONAL_DIRS;
  if (additionalDirs) {
    const extraDirs = additionalDirs.split(",").map(d => resolve(d.trim())).filter(d => d.length > 0);
    dirs.push(...extraDirs);
  }

  return dirs;
}

/**
 * Validate that a file path is within one of the allowed base directories.
 * This is a higher-level validation that checks against all configured directories.
 *
 * @param filePath - The path to validate (can be absolute or relative)
 * @param operation - The type of operation (read or write)
 * @returns The normalized, resolved absolute path if valid
 * @throws Error if path is unsafe, outside allowed directories, or targets sensitive locations
 */
export function validateFilePathWithinAllowedDirs(
  filePath: string,
  operation: "read" | "write"
): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("File path must be a non-empty string");
  }

  // Reject null bytes
  if (filePath.includes("\0")) {
    throw new Error("File path contains invalid characters");
  }

  // Reject obvious traversal attempts
  if (filePath.includes("..")) {
    throw new Error("Path traversal is not allowed");
  }

  // Resolve the path
  const resolvedPath = resolve(filePath);

  // Check if path is within allowed directories
  const allowedDirs = getAllowedBaseDirs();

  // Helper to check if a path is within allowed dirs
  const isPathAllowed = (pathToCheck: string): boolean => {
    return allowedDirs.some((dir) => {
      const resolvedDir = resolve(dir);
      return (
        pathToCheck.startsWith(resolvedDir + "/") || pathToCheck === resolvedDir
      );
    });
  };

  if (!isPathAllowed(resolvedPath)) {
    throw new Error("Access denied: path not allowed");
  }

  // SECURITY: If the path exists, resolve symlinks and re-check
  // This prevents symlink attacks where a symlink in an allowed dir points outside it
  if (existsSync(resolvedPath)) {
    try {
      const stats = lstatSync(resolvedPath);
      if (stats.isSymbolicLink()) {
        // Follow the symlink and verify the real path is also allowed
        const realPath = realpathSync(resolvedPath);
        if (!isPathAllowed(realPath)) {
          throw new Error("Access denied: symlink target not allowed");
        }
        // Return the real path, not the symlink
        return realPath;
      }
    } catch (err) {
      // If we can't stat the file, continue with normal validation
      // The actual file operation will fail if there's a real problem
    }
  }

  // Sensitive patterns to block - different rules for read vs write
  const sensitiveWritePatterns = [
    /^\/etc\//,
    /^\/usr\//,
    /^\/bin\//,
    /^\/sbin\//,
    /^\/var\/log\//,
    /\.env(\.[a-z]+)?$/i, // .env, .env.local, .env.production, etc.
    /\.git\//,
    /node_modules\//,
  ];

  const sensitiveReadPatterns = [
    /\.env(\.[a-z]+)?$/i, // .env, .env.local, .env.production, etc.
    /\.ssh\//,
    /id_rsa/,
    /id_ed25519/,
    /\.pem$/,
    /credentials\.json$/i,
    /secrets?\.(json|ya?ml|toml)$/i,
    /\.git\/config$/,
  ];

  // For write operations, block system locations and sensitive files
  if (operation === "write") {
    for (const pattern of sensitiveWritePatterns) {
      if (pattern.test(resolvedPath)) {
        throw new Error("Access denied: cannot write to this location");
      }
    }
  }

  // For read operations, block credential files
  if (operation === "read") {
    for (const pattern of sensitiveReadPatterns) {
      if (pattern.test(resolvedPath)) {
        throw new Error("Access denied: cannot read this file");
      }
    }
  }

  return resolvedPath;
}

/**
 * Validate position coordinates are within the allowed range (0-100 percentage).
 *
 * @param position - Position object with x and y coordinates
 * @throws Error if position is invalid
 */
export function validatePosition(position: { x: number; y: number }): void {
  if (
    !position ||
    typeof position !== "object" ||
    typeof position.x !== "number" ||
    typeof position.y !== "number"
  ) {
    throw new Error("Position must be an object with numeric x and y values");
  }

  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Position values must be finite numbers");
  }

  if (position.x < 0 || position.x > 100) {
    throw new Error(
      `Position x value ${position.x} must be between 0 and 100 (percentage)`
    );
  }

  if (position.y < 0 || position.y > 100) {
    throw new Error(
      `Position y value ${position.y} must be between 0 and 100 (percentage)`
    );
  }
}

/**
 * Validate a caption type is one of the allowed values.
 */
export const VALID_CAPTION_TYPES = [
  "speech",
  "thought",
  "narration",
  "sfx",
  "whisper",
] as const;

export type CaptionTypeValid = (typeof VALID_CAPTION_TYPES)[number];

export function validateCaptionType(type: string): CaptionTypeValid {
  if (!VALID_CAPTION_TYPES.includes(type as CaptionTypeValid)) {
    throw new Error(
      `Invalid caption type: "${type}". Valid types: ${VALID_CAPTION_TYPES.join(", ")}`
    );
  }
  return type as CaptionTypeValid;
}

/**
 * Validate style properties have sensible values.
 */
export interface StyleValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedStyle: Record<string, unknown>;
}

export function validateCaptionStyle(
  style: Record<string, unknown>
): StyleValidationResult {
  const errors: string[] = [];
  const sanitizedStyle: Record<string, unknown> = {};

  if (!style || typeof style !== "object") {
    return { valid: true, errors: [], sanitizedStyle: {} };
  }

  // Validate fontSize
  if (style.fontSize !== undefined) {
    const fontSize = Number(style.fontSize);
    if (!Number.isFinite(fontSize) || fontSize <= 0 || fontSize > 500) {
      errors.push("fontSize must be a positive number between 1 and 500");
    } else {
      sanitizedStyle.fontSize = fontSize;
    }
  }

  // Validate opacity
  if (style.opacity !== undefined) {
    const opacity = Number(style.opacity);
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      errors.push("opacity must be between 0 and 1");
    } else {
      sanitizedStyle.opacity = opacity;
    }
  }

  // Validate padding
  if (style.padding !== undefined) {
    const padding = Number(style.padding);
    if (!Number.isFinite(padding) || padding < 0 || padding > 100) {
      errors.push("padding must be between 0 and 100");
    } else {
      sanitizedStyle.padding = padding;
    }
  }

  // Validate borderWidth
  if (style.borderWidth !== undefined) {
    const borderWidth = Number(style.borderWidth);
    if (!Number.isFinite(borderWidth) || borderWidth < 0 || borderWidth > 50) {
      errors.push("borderWidth must be between 0 and 50");
    } else {
      sanitizedStyle.borderWidth = borderWidth;
    }
  }

  // Validate maxWidth
  if (style.maxWidth !== undefined) {
    const maxWidth = Number(style.maxWidth);
    if (!Number.isFinite(maxWidth) || maxWidth <= 0 || maxWidth > 100) {
      errors.push("maxWidth must be between 1 and 100 (percentage)");
    } else {
      sanitizedStyle.maxWidth = maxWidth;
    }
  }

  // Validate color formats (hex colors)
  const colorPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  const colorFields = ["fontColor", "backgroundColor", "borderColor"];

  for (const field of colorFields) {
    if (style[field] !== undefined) {
      const color = String(style[field]);
      if (color !== "transparent" && !colorPattern.test(color)) {
        errors.push(
          `${field} must be a valid hex color (e.g., #FFF, #FFFFFF) or "transparent"`
        );
      } else {
        sanitizedStyle[field] = color;
      }
    }
  }

  // Validate fontWeight
  if (style.fontWeight !== undefined) {
    const fontWeight = String(style.fontWeight);
    if (!["normal", "bold"].includes(fontWeight)) {
      errors.push('fontWeight must be "normal" or "bold"');
    } else {
      sanitizedStyle.fontWeight = fontWeight;
    }
  }

  // Validate borderStyle
  if (style.borderStyle !== undefined) {
    const borderStyle = String(style.borderStyle);
    if (!["solid", "dashed", "dotted", "none"].includes(borderStyle)) {
      errors.push('borderStyle must be one of: solid, dashed, dotted, none');
    } else {
      sanitizedStyle.borderStyle = borderStyle;
    }
  }

  // Validate fontFamily against a safe pattern (only allow alphanumeric, spaces, commas, hyphens, quotes)
  if (style.fontFamily !== undefined) {
    const fontFamily = String(style.fontFamily);
    // Only allow safe characters: letters, numbers, spaces, commas, hyphens, single/double quotes
    const safeFontFamilyPattern = /^[a-zA-Z0-9 ,\-'"]+$/;
    if (!safeFontFamilyPattern.test(fontFamily)) {
      errors.push("fontFamily contains invalid characters");
    } else if (fontFamily.length > 200) {
      errors.push("fontFamily exceeds maximum length of 200 characters");
    } else {
      sanitizedStyle.fontFamily = fontFamily;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedStyle,
  };
}
