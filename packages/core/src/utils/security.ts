/**
 * Security Utilities
 *
 * Functions for input sanitization, path validation, and security checks.
 */

import { resolve, normalize, relative, isAbsolute } from "path";

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

  // Pass through fontFamily (but sanitize)
  if (style.fontFamily !== undefined) {
    sanitizedStyle.fontFamily = sanitizeText(String(style.fontFamily));
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedStyle,
  };
}
