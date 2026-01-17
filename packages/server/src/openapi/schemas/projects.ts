/**
 * Project OpenAPI Schemas
 *
 * Schemas for project-related API endpoints.
 */

import { z } from "zod";
import {
  IdSchema,
  TimestampsSchema,
  createPaginatedSchema,
} from "./common.js";

// ============================================================================
// Project Schemas
// ============================================================================

/**
 * Project settings object
 */
export const ProjectSettingsSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Project-specific settings");

/**
 * Project entity
 */
export const ProjectSchema = z
  .object({
    id: IdSchema,
    name: z.string().describe("Project name"),
    description: z.string().nullable().describe("Optional project description"),
    settings: ProjectSettingsSchema,
  })
  .merge(TimestampsSchema)
  .describe("Project");

/**
 * Create project request body
 */
export const CreateProjectSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name must be 255 characters or less")
      .describe("Project name (required)"),
    description: z
      .string()
      .optional()
      .describe("Optional project description"),
    settings: ProjectSettingsSchema,
  })
  .describe("Create project request");

/**
 * Update project request body
 */
export const UpdateProjectSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe("New project name"),
    description: z
      .string()
      .optional()
      .describe("New project description"),
    settings: ProjectSettingsSchema,
  })
  .describe("Update project request");

/**
 * Paginated projects response
 */
export const PaginatedProjectsSchema = createPaginatedSchema(
  ProjectSchema,
  "Projects"
);

// ============================================================================
// Type Exports
// ============================================================================

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
