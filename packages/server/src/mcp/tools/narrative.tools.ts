/**
 * Narrative MCP Tools
 *
 * Tools for managing the narrative pipeline: Premise → Story CRUD.
 * Beats are in beat.tools.ts. This completes the narrative layer.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getNarrativeService } from "@graphix/core";

// ============================================================================
// Premise Tools
// ============================================================================

export const narrativeTools: Record<string, Tool> = {
  // ---------------------------------------------------------------------------
  // Premise CRUD
  // ---------------------------------------------------------------------------

  story_premise_create: {
    name: "story_premise_create",
    description: "Create a new story premise (the foundational concept for a story)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID of the project this premise belongs to",
        },
        logline: {
          type: "string",
          description: "One-sentence summary of the story concept",
        },
        genre: {
          type: "string",
          description: "Story genre (e.g., 'action', 'romance', 'horror', 'comedy')",
        },
        tone: {
          type: "string",
          description: "Overall tone (e.g., 'dark', 'lighthearted', 'dramatic', 'whimsical')",
        },
        themes: {
          type: "array",
          items: { type: "string" },
          description: "Central themes explored in the story",
        },
        characterIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of main characters involved in this premise",
        },
        setting: {
          type: "string",
          description: "Story setting description (time, place, world)",
        },
        worldRules: {
          type: "array",
          items: { type: "string" },
          description: "Special rules or constraints of the story world",
        },
      },
      required: ["projectId", "logline"],
    },
  },

  story_premise_get: {
    name: "story_premise_get",
    description: "Get a specific premise by ID",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "Premise ID to retrieve",
        },
      },
      required: ["premiseId"],
    },
  },

  story_premise_get_with_stories: {
    name: "story_premise_get_with_stories",
    description: "Get a premise with all its associated stories",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "Premise ID to retrieve",
        },
      },
      required: ["premiseId"],
    },
  },

  story_premise_list: {
    name: "story_premise_list",
    description: "List all premises for a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to list premises for",
        },
      },
      required: ["projectId"],
    },
  },

  story_premise_update: {
    name: "story_premise_update",
    description: "Update an existing premise",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "Premise ID to update",
        },
        logline: {
          type: "string",
          description: "Updated logline",
        },
        genre: {
          type: "string",
          description: "Updated genre",
        },
        tone: {
          type: "string",
          description: "Updated tone",
        },
        themes: {
          type: "array",
          items: { type: "string" },
          description: "Updated themes",
        },
        characterIds: {
          type: "array",
          items: { type: "string" },
          description: "Updated character IDs",
        },
        setting: {
          type: "string",
          description: "Updated setting",
        },
        worldRules: {
          type: "array",
          items: { type: "string" },
          description: "Updated world rules",
        },
        status: {
          type: "string",
          enum: ["draft", "approved", "in_progress", "complete"],
          description: "Premise workflow status",
        },
      },
      required: ["premiseId"],
    },
  },

  story_premise_delete: {
    name: "story_premise_delete",
    description: "Delete a premise (and all associated stories and beats)",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "Premise ID to delete",
        },
      },
      required: ["premiseId"],
    },
  },

  // ---------------------------------------------------------------------------
  // Story CRUD (Narrative Stories, not Scaffold)
  // ---------------------------------------------------------------------------

  narrative_story_create: {
    name: "narrative_story_create",
    description: "Create a new story under a premise",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "ID of the premise this story belongs to",
        },
        title: {
          type: "string",
          description: "Story title (e.g., 'Chapter 1: The Beginning')",
        },
        synopsis: {
          type: "string",
          description: "Brief synopsis of this story/chapter",
        },
        targetLength: {
          type: "number",
          description: "Target number of panels/beats for this story",
        },
        structure: {
          type: "string",
          enum: ["three-act", "five-act", "hero-journey", "save-the-cat", "freytag"],
          description: "Narrative structure to follow",
        },
        structureNotes: {
          type: "object",
          description: "Notes for each structural element (e.g., { 'act1': 'Setup notes' })",
        },
      },
      required: ["premiseId", "title"],
    },
  },

  narrative_story_get: {
    name: "narrative_story_get",
    description: "Get a specific story by ID",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID to retrieve",
        },
      },
      required: ["storyId"],
    },
  },

  narrative_story_get_with_beats: {
    name: "narrative_story_get_with_beats",
    description: "Get a story with all its beats",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID to retrieve",
        },
      },
      required: ["storyId"],
    },
  },

  narrative_story_list: {
    name: "narrative_story_list",
    description: "List all stories for a premise",
    inputSchema: {
      type: "object",
      properties: {
        premiseId: {
          type: "string",
          description: "Premise ID to list stories for",
        },
      },
      required: ["premiseId"],
    },
  },

  narrative_story_update: {
    name: "narrative_story_update",
    description: "Update an existing story",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID to update",
        },
        title: {
          type: "string",
          description: "Updated title",
        },
        synopsis: {
          type: "string",
          description: "Updated synopsis",
        },
        targetLength: {
          type: "number",
          description: "Updated target length",
        },
        structure: {
          type: "string",
          enum: ["three-act", "five-act", "hero-journey", "save-the-cat", "freytag"],
          description: "Updated structure",
        },
        structureNotes: {
          type: "object",
          description: "Updated structure notes",
        },
        status: {
          type: "string",
          enum: ["draft", "outlining", "beats_created", "panels_created", "complete"],
          description: "Story workflow status",
        },
      },
      required: ["storyId"],
    },
  },

  narrative_story_delete: {
    name: "narrative_story_delete",
    description: "Delete a story (and all associated beats)",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID to delete",
        },
      },
      required: ["storyId"],
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

export async function handleNarrativeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getNarrativeService();

  switch (name) {
    // -------------------------------------------------------------------------
    // Premise handlers
    // -------------------------------------------------------------------------

    case "story_premise_create": {
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }
      if (!args.logline) {
        return { success: false, error: "logline is required" };
      }

      const premise = await service.createPremise({
        projectId: args.projectId as string,
        logline: args.logline as string,
        genre: args.genre as string | undefined,
        tone: args.tone as string | undefined,
        themes: args.themes as string[] | undefined,
        characterIds: args.characterIds as string[] | undefined,
        setting: args.setting as string | undefined,
        worldRules: args.worldRules as string[] | undefined,
      });
      return { success: true, premise };
    }

    case "story_premise_get": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }

      const premise = await service.getPremise(args.premiseId as string);
      if (!premise) {
        return { success: false, error: "Premise not found" };
      }
      return { success: true, premise };
    }

    case "story_premise_get_with_stories": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }

      const result = await service.getPremiseWithStories(args.premiseId as string);
      if (!result) {
        return { success: false, error: "Premise not found" };
      }
      return { success: true, premise: result, stories: result.stories };
    }

    case "story_premise_list": {
      if (!args.projectId) {
        return { success: false, error: "projectId is required" };
      }

      const premises = await service.getPremises(args.projectId as string);
      return { success: true, premises, count: premises.length };
    }

    case "story_premise_update": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }

      const premise = await service.updatePremise(args.premiseId as string, {
        logline: args.logline as string | undefined,
        genre: args.genre as string | undefined,
        tone: args.tone as string | undefined,
        themes: args.themes as string[] | undefined,
        characterIds: args.characterIds as string[] | undefined,
        setting: args.setting as string | undefined,
        worldRules: args.worldRules as string[] | undefined,
        status: args.status as any,
      });
      return { success: true, premise };
    }

    case "story_premise_delete": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }

      await service.deletePremise(args.premiseId as string);
      return { success: true, message: "Premise deleted" };
    }

    // -------------------------------------------------------------------------
    // Story handlers
    // -------------------------------------------------------------------------

    case "narrative_story_create": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }
      if (!args.title) {
        return { success: false, error: "title is required" };
      }

      const story = await service.createStory({
        premiseId: args.premiseId as string,
        title: args.title as string,
        synopsis: args.synopsis as string | undefined,
        targetLength: args.targetLength as number | undefined,
        structure: args.structure as any,
        structureNotes: args.structureNotes as Record<string, string> | undefined,
      });
      return { success: true, story };
    }

    case "narrative_story_get": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }

      const story = await service.getStory(args.storyId as string);
      if (!story) {
        return { success: false, error: "Story not found" };
      }
      return { success: true, story };
    }

    case "narrative_story_get_with_beats": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }

      const result = await service.getStoryWithBeats(args.storyId as string);
      if (!result) {
        return { success: false, error: "Story not found" };
      }
      return { success: true, story: result, beats: result.beats };
    }

    case "narrative_story_list": {
      if (!args.premiseId) {
        return { success: false, error: "premiseId is required" };
      }

      const stories = await service.getStories(args.premiseId as string);
      return { success: true, stories, count: stories.length };
    }

    case "narrative_story_update": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }

      const story = await service.updateStory(args.storyId as string, {
        title: args.title as string | undefined,
        synopsis: args.synopsis as string | undefined,
        targetLength: args.targetLength as number | undefined,
        structure: args.structure as any,
        structureNotes: args.structureNotes as Record<string, string> | undefined,
        status: args.status as any,
      });
      return { success: true, story };
    }

    case "narrative_story_delete": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }

      await service.deleteStory(args.storyId as string);
      return { success: true, message: "Story deleted" };
    }

    default:
      throw new Error(`Unknown narrative tool: ${name}`);
  }
}
