/**
 * Beat MCP Tools
 *
 * Tools for story beat management via MCP.
 * Beats are the atomic narrative units of a story - individual panels/scenes.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getNarrativeService } from "@graphix/core";

export const beatTools: Record<string, Tool> = {
  story_beat_create: {
    name: "story_beat_create",
    description: "Add a single plot-point beat (setup, inciting, climax, etc.) to an existing story's ordered sequence. Call after story_create/story_scaffold when building out the narrative beat-by-beat. Returns the created Beat record {id, storyId, position, visualDescription, beatType, actNumber, emotionalTone, cameraAngle, ...} (~1 KB). To add many beats at once, use story_beat_create_batch. Different from story_scaffold, which generates an entire story structure.",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "ID of the story this beat belongs to",
        },
        position: {
          type: "number",
          description: "Position/order in the beat sequence (0-indexed)",
        },
        visualDescription: {
          type: "string",
          description: "Visual description of the beat - what happens, characters, setting",
        },
        beatType: {
          type: "string",
          enum: ["setup", "inciting", "rising", "midpoint", "complication", "crisis", "climax", "resolution", "denouement"],
          description: "Type of story beat for narrative structure",
        },
        actNumber: {
          type: "number",
          description: "Which act this beat belongs to (1-indexed)",
        },
        emotionalTone: {
          type: "string",
          description: "Emotional tone (e.g., 'tense', 'joyful', 'mysterious')",
        },
        narrativeContext: {
          type: "string",
          description: "Additional narrative context or backstory",
        },
        cameraAngle: {
          type: "string",
          description: "Suggested camera angle (e.g., 'wide shot', 'close-up', 'bird's eye')",
        },
        composition: {
          type: "string",
          description: "Composition notes (e.g., 'rule of thirds', 'centered')",
        },
        narration: {
          type: "string",
          description: "Narration or voice-over text for this beat",
        },
        sfx: {
          type: "string",
          description: "Sound effects description",
        },
        characterIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of characters appearing in this beat",
        },
      },
      required: ["storyId", "visualDescription"],
    },
  },

  story_beat_create_batch: {
    name: "story_beat_create_batch",
    description: "Insert multiple plot-point beats into a story in one call, each with its own position, visualDescription, beatType, and narrative metadata. Call when populating an entire act or story arc at once (e.g., after outlining). Returns {success, beats: Beat[], count}. Response scales linearly (~1 KB per beat). For adding a single beat, use story_beat_create. Positions auto-increment from array index if omitted.",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "ID of the story these beats belong to",
        },
        beats: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "number" },
              visualDescription: { type: "string" },
              beatType: { type: "string" },
              actNumber: { type: "number" },
              emotionalTone: { type: "string" },
              narrativeContext: { type: "string" },
              cameraAngle: { type: "string" },
              narration: { type: "string" },
              sfx: { type: "string" },
            },
            required: ["visualDescription"],
          },
          description: "Array of beat definitions to create",
        },
      },
      required: ["storyId", "beats"],
    },
  },

  story_beat_get: {
    name: "story_beat_get",
    description: "Fetch a single story beat record by its UUID, including all narrative fields (visualDescription, beatType, actNumber, emotionalTone, cameraAngle, composition, narration, sfx, characterIds, panelId). Call when you have a specific beat ID and need its full details. Returns {success, beat: Beat} (~1 KB). To list all beats in a story by sequence order, use story_beat_list instead.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to retrieve",
        },
      },
      required: ["beatId"],
    },
  },

  story_beat_list: {
    name: "story_beat_list",
    description: "Fetch all beats for a story, returned in position order (the narrative sequence). Call when you need the full beat sheet for a story -- e.g., before converting beats to panels, reordering, or reviewing structure. Returns {success, beats: Beat[], count}. Response scales with story length (~1 KB per beat, typically 5-30 beats). For a single beat by ID use story_beat_get.",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID to list beats for",
        },
      },
      required: ["storyId"],
    },
  },

  story_beat_update: {
    name: "story_beat_update",
    description: "Modify fields on an existing story beat (visualDescription, beatType, actNumber, emotionalTone, cameraAngle, composition, narration, sfx, characterIds). Call when revising a beat's narrative content or visual direction after review. Returns the updated Beat record (~1 KB). To change a beat's sequence position relative to others, use story_beat_reorder instead.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to update",
        },
        position: {
          type: "number",
          description: "New position in sequence",
        },
        visualDescription: {
          type: "string",
          description: "Updated visual description",
        },
        beatType: {
          type: "string",
          enum: ["setup", "inciting", "rising", "midpoint", "complication", "crisis", "climax", "resolution", "denouement"],
          description: "Updated beat type",
        },
        actNumber: {
          type: "number",
          description: "Updated act number",
        },
        emotionalTone: {
          type: "string",
          description: "Updated emotional tone",
        },
        narrativeContext: {
          type: "string",
          description: "Updated narrative context",
        },
        cameraAngle: {
          type: "string",
          description: "Updated camera angle",
        },
        composition: {
          type: "string",
          description: "Updated composition notes",
        },
        narration: {
          type: "string",
          description: "Updated narration",
        },
        sfx: {
          type: "string",
          description: "Updated SFX",
        },
        characterIds: {
          type: "array",
          items: { type: "string" },
          description: "Updated character IDs",
        },
      },
      required: ["beatId"],
    },
  },

  story_beat_reorder: {
    name: "story_beat_reorder",
    description: "Rearrange the narrative sequence of beats in a story by providing the complete ordered list of beat IDs. Call when the user restructures the plot (e.g., moving the climax earlier, swapping scenes). All beat IDs for the story must be included. Returns the beats in their new order. ~1 KB per beat. Different from story_beat_update, which edits a beat's content but not its sequence position.",
    inputSchema: {
      type: "object",
      properties: {
        storyId: {
          type: "string",
          description: "Story ID",
        },
        beatIds: {
          type: "array",
          items: { type: "string" },
          description: "Ordered list of beat IDs representing the new order",
        },
      },
      required: ["storyId", "beatIds"],
    },
  },

  story_beat_delete: {
    name: "story_beat_delete",
    description: "Permanently remove a single story beat from its story. Call when a plot point is being cut from the narrative. Returns {success, message} (~0.5 KB). Irreversible. If the beat is linked to a panel, the panel remains but loses its beat association. Remaining beats' positions are not auto-compacted -- use story_beat_reorder afterward if needed.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to delete",
        },
      },
      required: ["beatId"],
    },
  },

  story_beat_to_panel: {
    name: "story_beat_to_panel",
    description: "Create a new storyboard panel from a beat, pre-filling the panel with the beat's visualDescription, cameraAngle, composition, and character data. Call when transitioning from narrative planning to visual production. Returns {success, beat, panelId} (~1 KB). The beat becomes linked to the new panel. Prerequisite for story_beat_generate_captions. Different from story_beat_to_prompt, which outputs a text prompt without creating a panel.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to convert",
        },
        storyboardId: {
          type: "string",
          description: "Storyboard ID where panel will be created",
        },
      },
      required: ["beatId", "storyboardId"],
    },
  },

  story_beat_to_prompt: {
    name: "story_beat_to_prompt",
    description: "Transform a beat's narrative data into positive/negative image-generation prompt strings, applying an optional art style. Call when you need a ComfyUI-ready prompt from a beat but do NOT want to create a panel yet. Returns {success, prompt: {positive, negative}} (~1 KB). Text-only output -- no panel is created. Different from story_beat_to_panel, which creates an actual panel entity. Feed the output to imagine/generate_image.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to convert to prompt",
        },
        style: {
          type: "string",
          description: "Art style to apply (e.g., 'anime', 'realistic', 'watercolor')",
        },
        includeCharacters: {
          type: "boolean",
          description: "Include character descriptions in prompt (default: true)",
        },
        includeComposition: {
          type: "boolean",
          description: "Include composition/camera angle in prompt (default: true)",
        },
      },
      required: ["beatId"],
    },
  },

  // ---------------------------------------------------------------------------
  // Beat → Caption Tools
  // ---------------------------------------------------------------------------

  story_beat_generate_captions: {
    name: "story_beat_generate_captions",
    description: "Generate dialogue, narration, and SFX caption records for a beat's linked panel. The beat MUST already be linked to a panel via story_beat_to_panel -- call that first if panelId is null. Returns {success, captions: Caption[], count, panelId}. Response ~1 KB per caption (typically 1-5 captions). Optionally uses AI to infer captions from visualDescription. To read existing captions, use story_beat_get_captions.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to generate captions from",
        },
        includeDialogue: {
          type: "boolean",
          description: "Include dialogue captions (default: true)",
        },
        includeNarration: {
          type: "boolean",
          description: "Include narration captions (default: true)",
        },
        includeSfx: {
          type: "boolean",
          description: "Include sound effect captions (default: true)",
        },
        inferFromVisual: {
          type: "boolean",
          description: "Use AI to infer captions from visual description if explicit ones not provided (default: true)",
        },
      },
      required: ["beatId"],
    },
  },

  story_beat_get_captions: {
    name: "story_beat_get_captions",
    description: "Fetch existing caption records from a beat's linked panel, with optional filtering by type (dialogue, narration, sfx, thought) and enabled status. Call after story_beat_generate_captions to review what was created, or to check current captions before regenerating. Returns {success, captions: Caption[], count} (~1 KB per caption). Beat must be linked to a panel or returns an error.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to get captions for",
        },
        enabledOnly: {
          type: "boolean",
          description: "Only return enabled captions (default: false)",
        },
        types: {
          type: "array",
          items: {
            type: "string",
            enum: ["dialogue", "narration", "sfx", "thought"],
          },
          description: "Filter by caption types",
        },
      },
      required: ["beatId"],
    },
  },

  story_beat_delete_captions: {
    name: "story_beat_delete_captions",
    description: "Permanently delete ALL caption records linked to a beat's panel. Call when clearing captions before regenerating, or when removing a beat's text layer entirely. Returns {success, deletedCount, message} (~0.5 KB). Irreversible. To selectively review captions before deleting, use story_beat_get_captions first. To regenerate fresh captions afterward, use story_beat_generate_captions.",
    inputSchema: {
      type: "object",
      properties: {
        beatId: {
          type: "string",
          description: "Beat ID to delete captions for",
        },
      },
      required: ["beatId"],
    },
  },
};

export async function handleBeatTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const service = getNarrativeService();

  switch (name) {
    case "story_beat_create": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }
      if (!args.visualDescription) {
        return { success: false, error: "visualDescription is required" };
      }

      const beat = await service.createBeat({
        storyId: args.storyId as string,
        position: (args.position as number) ?? 0,
        visualDescription: args.visualDescription as string,
        beatType: args.beatType as string | undefined,
        actNumber: args.actNumber as number | undefined,
        emotionalTone: args.emotionalTone as string | undefined,
        narrativeContext: args.narrativeContext as string | undefined,
        cameraAngle: args.cameraAngle as string | undefined,
        composition: args.composition as string | undefined,
        narration: args.narration as string | undefined,
        sfx: args.sfx as string | undefined,
        characterIds: args.characterIds as string[] | undefined,
      });
      return { success: true, beat };
    }

    case "story_beat_create_batch": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }
      if (!args.beats || !Array.isArray(args.beats)) {
        return { success: false, error: "beats array is required" };
      }

      const beats = await service.createBeats(
        args.storyId as string,
        (args.beats as any[]).map((b, i) => ({
          position: b.position ?? i,
          visualDescription: b.visualDescription,
          beatType: b.beatType,
          actNumber: b.actNumber,
          emotionalTone: b.emotionalTone,
          narrativeContext: b.narrativeContext,
          cameraAngle: b.cameraAngle,
          narration: b.narration,
          sfx: b.sfx,
        }))
      );
      return { success: true, beats, count: beats.length };
    }

    case "story_beat_get": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      const beat = await service.getBeat(args.beatId as string);
      if (!beat) {
        return { success: false, error: "Beat not found" };
      }
      return { success: true, beat };
    }

    case "story_beat_list": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }

      const beats = await service.getBeats(args.storyId as string);
      return { success: true, beats, count: beats.length };
    }

    case "story_beat_update": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      const beat = await service.updateBeat(args.beatId as string, {
        position: args.position as number | undefined,
        visualDescription: args.visualDescription as string | undefined,
        beatType: args.beatType as string | undefined,
        actNumber: args.actNumber as number | undefined,
        emotionalTone: args.emotionalTone as string | undefined,
        narrativeContext: args.narrativeContext as string | undefined,
        cameraAngle: args.cameraAngle as string | undefined,
        composition: args.composition as string | undefined,
        narration: args.narration as string | undefined,
        sfx: args.sfx as string | undefined,
        characterIds: args.characterIds as string[] | undefined,
      });
      return { success: true, beat };
    }

    case "story_beat_reorder": {
      if (!args.storyId) {
        return { success: false, error: "storyId is required" };
      }
      if (!args.beatIds || !Array.isArray(args.beatIds)) {
        return { success: false, error: "beatIds array is required" };
      }

      const beats = await service.reorderBeats(
        args.storyId as string,
        args.beatIds as string[]
      );
      return { success: true, beats };
    }

    case "story_beat_delete": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      await service.deleteBeat(args.beatId as string);
      return { success: true, message: "Beat deleted" };
    }

    case "story_beat_to_panel": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }
      if (!args.storyboardId) {
        return { success: false, error: "storyboardId is required" };
      }

      const result = await service.linkBeatToPanel(
        args.beatId as string,
        args.storyboardId as string
      );
      return { success: true, beat: result.beat, panelId: result.panelId };
    }

    case "story_beat_to_prompt": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      const prompt = await service.generatePromptFromBeat(
        args.beatId as string,
        {
          style: args.style as string | undefined,
          includeCharacters: (args.includeCharacters as boolean) ?? true,
          includeComposition: (args.includeComposition as boolean) ?? true,
        }
      );
      return { success: true, prompt };
    }

    // -------------------------------------------------------------------------
    // Beat → Caption handlers
    // -------------------------------------------------------------------------

    case "story_beat_generate_captions": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      try {
        const result = await service.generateCaptionsFromBeat(
          args.beatId as string,
          {
            includeDialogue: (args.includeDialogue as boolean) ?? true,
            includeNarration: (args.includeNarration as boolean) ?? true,
            includeSfx: (args.includeSfx as boolean) ?? true,
            inferFromVisual: (args.inferFromVisual as boolean) ?? true,
          }
        );
        return {
          success: true,
          captions: result.captions,
          count: result.captions.length,
          panelId: result.panelId,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate captions",
        };
      }
    }

    case "story_beat_get_captions": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      // First get the beat to find its panelId
      const beat = await service.getBeat(args.beatId as string);
      if (!beat) {
        return { success: false, error: "Beat not found" };
      }
      if (!beat.panelId) {
        return { success: false, error: "Beat is not linked to a panel" };
      }

      const captions = await service.getCaptionsForPanel(beat.panelId, {
        enabledOnly: (args.enabledOnly as boolean) ?? false,
        types: args.types as any[] | undefined,
      });
      return { success: true, captions, count: captions.length };
    }

    case "story_beat_delete_captions": {
      if (!args.beatId) {
        return { success: false, error: "beatId is required" };
      }

      try {
        const deletedCount = await service.deleteCaptionsForPanel(args.beatId as string);
        return { success: true, deletedCount, message: `Deleted ${deletedCount} captions` };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete captions",
        };
      }
    }

    default:
      throw new Error(`Unknown beat tool: ${name}`);
  }
}
