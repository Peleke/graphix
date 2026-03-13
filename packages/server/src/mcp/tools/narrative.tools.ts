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
    description: "Create a new story premise -- the top-level narrative concept (logline, genre, tone, themes, setting, world rules) that contains one or more stories. Call when starting a new narrative arc within an existing project. Requires projectId and logline. Returns a JSON object (~200-400 tokens) with the full premise record including generated id, status ('draft'), and all supplied fields. This is a CRUD create for the premise entity only -- it does NOT auto-generate stories or beats underneath. Use narrative_story_create to add stories to the premise afterward.",
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
    description: "Retrieve a single story premise by its ID, returning the premise record only (logline, genre, tone, themes, setting, worldRules, status). Call when you need to inspect or display a specific premise without its child stories. Returns a JSON object (~200-400 tokens). Unlike story_premise_get_with_stories, this does NOT include the associated stories array -- use that variant when you need the full premise-to-stories tree.",
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
    description: "Retrieve a story premise together with all its child stories in a single call. Call when you need the full narrative outline -- the premise plus every story (chapter/episode) beneath it. Returns a JSON object (~400-2000 tokens, scales with story count) containing the premise fields and a stories[] array with each story's title, synopsis, structure, and status. Unlike story_premise_get, this eagerly loads the stories relationship. Does NOT include beats within each story -- use narrative_story_get_with_beats for that.",
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
    description: "List all story premises belonging to a project as an array of premise summaries. Call when you need to see every narrative concept defined in a project, for example to let the user pick which premise to expand. Returns a JSON object (~100-300 tokens per premise) with a premises[] array and a count field. Each entry includes the premise's id, logline, genre, tone, and status. Does NOT include child stories -- use story_premise_get_with_stories on a specific premise for that.",
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
    description: "Update one or more fields on an existing story premise (logline, genre, tone, themes, characterIds, setting, worldRules, or status). Call when the user refines the narrative concept -- e.g., changing the genre, advancing status from 'draft' to 'approved', or adding new themes. Only supplied fields are overwritten; omitted fields remain unchanged. Returns the full updated premise object (~200-400 tokens). Does NOT cascade changes to child stories or beats.",
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
    description: "Permanently delete a story premise and cascade-delete all its child stories and their beats. Call when the user wants to discard an entire narrative concept and everything beneath it. Returns a minimal JSON confirmation (~30 tokens) with success and message. This is destructive and irreversible. If you only need to remove a single story, use narrative_story_delete instead to preserve the premise and sibling stories.",
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
    description: "Create a new story (chapter/episode) under an existing premise in the narrative hierarchy. Call when adding the next installment or chapter to a premise's story collection. Requires premiseId and title; optionally accepts synopsis, targetLength (panel count), structure (three-act, five-act, hero-journey, save-the-cat, freytag), and structureNotes. Returns the full story record (~200-400 tokens) with generated id and status 'draft'. This is CRUD for the story entity only -- it does NOT auto-generate beats. Use beat tools in beat.tools.ts to populate story beats afterward. Different from story scaffold tools in story.tools.ts, which parse/generate stories from text.",
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
    description: "Retrieve a single narrative story by its ID, returning the story metadata only (title, synopsis, structure, targetLength, status). Call when you need to inspect a specific chapter/episode without loading its beats. Returns a JSON object (~200 tokens). Unlike narrative_story_get_with_beats, this does NOT include the beats array -- use that variant when you need the full story-to-beats breakdown.",
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
    description: "Retrieve a narrative story together with all its child beats in a single call. Call when you need the full scene-by-scene breakdown of a chapter -- e.g., to review pacing, plan panel layouts, or verify beat completeness. Returns a JSON object (~400-3000 tokens, scales with beat count) containing the story fields and a beats[] array with each beat's type, summary, visual description, emotional tone, and involved characters. Unlike narrative_story_get, this eagerly loads the beats relationship. For beats CRUD, use tools in beat.tools.ts.",
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
    description: "List all stories (chapters/episodes) belonging to a specific premise. Call when you need to see every story under a narrative concept, for example to let the user pick which chapter to work on or to check story count. Returns a JSON object (~100-300 tokens per story) with a stories[] array and a count field. Each entry includes the story's id, title, synopsis, structure, and status. Does NOT include beats within each story -- use narrative_story_get_with_beats for that.",
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
    description: "Update one or more fields on an existing narrative story (title, synopsis, targetLength, structure, structureNotes, or status). Call when the user revises a chapter outline -- e.g., changing the synopsis, switching from three-act to hero-journey structure, or advancing status from 'draft' to 'beats_created'. Only supplied fields are overwritten; omitted fields remain unchanged. Returns the full updated story object (~200-400 tokens). Does NOT cascade changes to child beats.",
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
    description: "Permanently delete a narrative story and cascade-delete all its child beats. Call when the user wants to discard a specific chapter/episode while keeping the parent premise and sibling stories intact. Returns a minimal JSON confirmation (~30 tokens) with success and message. This is destructive and irreversible. If you want to remove the entire premise and all its stories, use story_premise_delete instead.",
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
