/**
 * Bootstrap Project Tool
 *
 * Mastra tool for creating a new project from chat context.
 * This is called when the user confirms they want to create
 * the project after the elicitation conversation.
 *
 * Uses existing service layer for proper validation and type handling.
 *
 * @example
 * ```ts
 * const result = await bootstrapProjectTool.execute({
 *   name: "Otter Adventure",
 *   description: "A story about two otter siblings...",
 *   characters: [
 *     { name: "Oliver", description: "Friendly young otter" },
 *     { name: "Olivia", description: "Oliver's adventurous sister" },
 *   ],
 *   setting: "A riverside village",
 *   initialStoryboard: "The siblings discover a mysterious cave...",
 * });
 * ```
 */

import { createTool } from "@mastra/core";
import { z } from "zod";
import { ProjectService } from "../../services/project.service.js";
import { CharacterService } from "../../services/character.service.js";
import { StoryboardService } from "../../services/storyboard.service.js";

// =============================================================================
// Types
// =============================================================================

export interface CharacterInput {
  name: string;
  description?: string;
  existingId?: string; // If matching an existing character
  visualTraits?: {
    species?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accessories?: string[];
  };
}

export interface BootstrapResult {
  projectId: string;
  projectName: string;
  characterIds: string[];
  storyboardId?: string;
}

// =============================================================================
// Tool Definition
// =============================================================================

export const bootstrapProjectTool = createTool({
  id: "bootstrap-project",
  description: "Create a new project with initial characters and storyboard based on chat conversation.",
  inputSchema: z.object({
    name: z.string().min(1).max(200).describe("Project name"),
    description: z.string().max(2000).optional().describe("Project description"),
    characters: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          existingId: z.string().optional(),
          visualTraits: z
            .object({
              species: z.string().optional(),
              primaryColor: z.string().optional(),
              secondaryColor: z.string().optional(),
              accessories: z.array(z.string()).optional(),
            })
            .optional(),
        })
      )
      .min(1)
      .max(20)
      .describe("Characters for the project"),
    setting: z.string().max(500).optional().describe("Story setting"),
    storyboardName: z.string().max(200).optional().describe("Name for the initial storyboard"),
    style: z.string().max(200).optional().describe("Visual style preference"),
    pageCount: z.number().min(1).max(100).optional().describe("Target page count"),
  }),
  outputSchema: z.object({
    projectId: z.string(),
    projectName: z.string(),
    characterIds: z.array(z.string()),
    storyboardId: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    // Use existing services
    const projectService = new ProjectService();
    const characterService = new CharacterService();
    const storyboardService = new StoryboardService();

    // Create project
    const project = await projectService.create({
      name: context.name,
      description: context.description,
    });

    // Create characters
    const characterIds: string[] = [];

    for (const char of context.characters) {
      if (char.existingId) {
        // Link existing character (future: implement character copying/linking)
        characterIds.push(char.existingId);
        continue;
      }

      // Build character profile (arrays for all descriptor fields)
      const profile = {
        species: char.visualTraits?.species ?? "unknown",
        bodyType: "standard",
        features: char.description ? [char.description] : [],
        ageDescriptors: [],
        clothing: [],
        distinguishing: char.visualTraits?.accessories ?? [],
      };

      // Build prompt fragments (strings for positive/negative)
      const promptFragments = buildPromptFragments(char);

      const character = await characterService.create({
        projectId: project.id,
        name: char.name,
        profile,
        promptFragments,
      });

      characterIds.push(character.id);
    }

    // Create initial storyboard if requested
    let storyboardId: string | undefined;
    if (context.storyboardName || context.setting) {
      const storyboard = await storyboardService.create({
        projectId: project.id,
        name: context.storyboardName ?? "Main Story",
        description: context.setting ?? "",
      });
      storyboardId = storyboard.id;
    }

    return {
      projectId: project.id,
      projectName: context.name,
      characterIds,
      storyboardId,
      message: `Created project "${context.name}" with ${characterIds.length} character(s)${storyboardId ? " and initial storyboard" : ""}.`,
    };
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build prompt fragments for character image generation.
 * Returns strings for positive/negative (comma-separated) and array for triggers.
 */
function buildPromptFragments(char: CharacterInput): {
  positive: string;
  negative: string;
  triggers: string[];
} {
  const positiveParts: string[] = [];
  const triggers: string[] = [];

  // Add name as trigger
  triggers.push(char.name.toLowerCase().replace(/\s+/g, "_"));

  // Add visual traits
  if (char.visualTraits) {
    if (char.visualTraits.species) {
      positiveParts.push(char.visualTraits.species);
    }
    if (char.visualTraits.primaryColor) {
      positiveParts.push(`${char.visualTraits.primaryColor} fur`);
    }
    if (char.visualTraits.secondaryColor) {
      positiveParts.push(`${char.visualTraits.secondaryColor} accents`);
    }
    if (char.visualTraits.accessories) {
      positiveParts.push(...char.visualTraits.accessories);
    }
  }

  // Add description keywords
  if (char.description) {
    // Extract key descriptors
    const descriptors = char.description
      .toLowerCase()
      .split(/[,.]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 50);
    positiveParts.push(...descriptors.slice(0, 5));
  }

  // Default negative prompts for characters
  const negative = "bad anatomy, blurry, low quality, distorted face, extra limbs";

  return {
    positive: positiveParts.join(", "),
    negative,
    triggers,
  };
}
