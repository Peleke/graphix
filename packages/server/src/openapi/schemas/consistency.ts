/**
 * Consistency OpenAPI Schemas
 *
 * Schemas for visual consistency-related API endpoints.
 */

import { z } from "zod";
import { IdSchema } from "./common.js";

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Extract identity request body
 */
export const ExtractIdentitySchema = z
  .object({
    name: z.string().min(1).describe("Identity name"),
    description: z.string().optional().describe("Identity description"),
    sources: z.array(z.string()).min(1).describe("Array of source image paths or panel IDs"),
    sourcesArePanelIds: z.boolean().optional().describe("Whether sources are panel IDs"),
    adapterModel: z.string().optional().describe("IP-Adapter model to use"),
  })
  .describe("Extract identity request");

/**
 * Apply identity request body
 */
export const ApplyIdentitySchema = z
  .object({
    panelId: z.string().min(1).describe("Panel ID"),
    identityId: z.string().min(1).describe("Identity ID"),
    strength: z.number().min(0).max(2).optional().describe("Identity strength (0-2)"),
    prompt: z.string().optional().describe("Override prompt"),
    qualityPreset: z.string().optional().describe("Quality preset"),
    seed: z.number().int().optional().describe("Random seed"),
  })
  .describe("Apply identity request");

/**
 * Chain from previous panel request body
 */
export const ChainSchema = z
  .object({
    panelId: z.string().min(1).describe("Panel ID to generate"),
    previousPanelId: z.string().min(1).describe("Previous panel ID to chain from"),
    maintain: z
      .object({
        identity: z.boolean().optional().describe("Maintain identity"),
      })
      .optional()
      .describe("What to maintain"),
    continuityStrength: z.number().min(0).max(1).optional().describe("Continuity strength (0-1)"),
    prompt: z.string().optional().describe("Override prompt"),
    qualityPreset: z.string().optional().describe("Quality preset"),
  })
  .describe("Chain from previous panel request");

/**
 * Chain sequence request body
 */
export const ChainSequenceSchema = z
  .object({
    panelIds: z.array(z.string()).min(2).describe("Array of panel IDs in sequence"),
    maintain: z
      .object({
        identity: z.boolean().optional().describe("Maintain identity"),
      })
      .optional()
      .describe("What to maintain"),
    continuityStrength: z.number().min(0).max(1).optional().describe("Continuity strength"),
    qualityPreset: z.string().optional().describe("Quality preset"),
  })
  .describe("Chain sequence request");

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Extract identity response
 */
export const ExtractIdentityResponseSchema = z
  .object({
    identityId: z.string().describe("Generated identity ID"),
    adapterPath: z.string().describe("Path to IP-Adapter file"),
  })
  .describe("Extract identity response");

/**
 * Chain operation response
 */
export const ChainOperationResponseSchema = z
  .object({
    generationId: z.string().describe("Generated image ID"),
    usedIdentity: z.boolean().optional().describe("Whether identity was used"),
    usedControlNet: z.boolean().optional().describe("Whether ControlNet was used"),
  })
  .describe("Chain operation response");

// ============================================================================
// Type Exports
// ============================================================================

export type ExtractIdentity = z.infer<typeof ExtractIdentitySchema>;
export type ApplyIdentity = z.infer<typeof ApplyIdentitySchema>;
export type Chain = z.infer<typeof ChainSchema>;
