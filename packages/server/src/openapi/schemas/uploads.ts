/**
 * Upload OpenAPI Schemas
 *
 * Schemas for upload endpoints.
 */

import { z } from "zod";

/**
 * Upload image request (multipart)
 */
export const UploadImageRequestSchema = z
  .object({
    file: z.string().describe("Binary image file"),
  })
  .describe("Upload image request");

/**
 * Upload image response
 */
export const UploadImageResponseSchema = z
  .object({
    success: z.boolean(),
    filename: z.string(),
    mimeType: z.string(),
    path: z.string(),
  })
  .describe("Upload image response");

export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>;
export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>;
