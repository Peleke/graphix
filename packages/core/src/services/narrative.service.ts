/**
 * Narrative Service
 *
 * CRUD operations for the narrative engine: premises, stories, and beats.
 * Supports the Premise → Story → Beat pipeline for generating comic stories.
 */

import { eq, and, asc } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  premises,
  stories,
  beats,
  panels,
  type Premise,
  type NewPremise,
  type PremiseStatus,
  type Story,
  type NewStory,
  type StoryStructure,
  type StoryStatus,
  type CharacterArc,
  type Beat,
  type NewBeat,
  type BeatType,
  type BeatDialogue,
  type NewPanel,
} from "../db/index.js";
import { getPanelService } from "./panel.service.js";

// ============================================================================
// Input Types (for UI-friendly API)
// ============================================================================

export type CreatePremiseInput = {
  projectId: string;
  logline: string;
  genre?: string;
  tone?: string;
  themes?: string[];
  characterIds?: string[];
  setting?: string;
  worldRules?: string[];
  generatedBy?: string;
  generationPrompt?: string;
  status?: PremiseStatus;
};

export type UpdatePremiseInput = Partial<Omit<CreatePremiseInput, "projectId">>;

export type CreateStoryInput = {
  premiseId: string;
  title: string;
  synopsis?: string;
  targetLength?: number;
  structure?: StoryStructure;
  structureNotes?: Record<string, string>;
  characterArcs?: CharacterArc[];
  generatedBy?: string;
  generationPrompt?: string;
  status?: StoryStatus;
};

export type UpdateStoryInput = Partial<Omit<CreateStoryInput, "premiseId">>;

export type CreateBeatInput = {
  storyId: string;
  position: number;
  actNumber?: number;
  beatType?: BeatType;
  visualDescription: string;
  narrativeContext?: string;
  emotionalTone?: string;
  characterIds?: string[];
  characterActions?: Record<string, string>;
  cameraAngle?: string;
  composition?: string;
  dialogue?: BeatDialogue[];
  narration?: string;
  sfx?: string;
  generatedBy?: string;
};

export type UpdateBeatInput = Partial<Omit<CreateBeatInput, "storyId">>;

// ============================================================================
// Narrative Service
// ============================================================================

export class NarrativeService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  // ==========================================================================
  // PREMISE CRUD
  // ==========================================================================

  /**
   * Create a new premise
   */
  async createPremise(input: CreatePremiseInput): Promise<Premise> {
    const logline = input.logline?.trim();
    if (!logline) {
      throw new Error("Premise logline is required");
    }
    if (logline.length > 1000) {
      throw new Error("Premise logline must be 1000 characters or less");
    }

    const now = new Date();
    const [premise] = await this.db
      .insert(premises)
      .values({
        projectId: input.projectId,
        logline,
        genre: input.genre?.trim() || null,
        tone: input.tone?.trim() || null,
        themes: input.themes ?? [],
        characterIds: input.characterIds ?? [],
        setting: input.setting?.trim() || null,
        worldRules: input.worldRules || null,
        generatedBy: input.generatedBy || null,
        generationPrompt: input.generationPrompt || null,
        status: input.status ?? "draft",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return premise;
  }

  /**
   * Get premise by ID
   */
  async getPremise(id: string): Promise<Premise | null> {
    if (!id) return null;

    const result = await this.db.select().from(premises).where(eq(premises.id, id));

    return result[0] ?? null;
  }

  /**
   * Get premise with its stories
   */
  async getPremiseWithStories(id: string): Promise<(Premise & { stories: Story[] }) | null> {
    const premise = await this.getPremise(id);
    if (!premise) return null;

    const storyList = await this.listStoriesByPremise(id);
    return { ...premise, stories: storyList };
  }

  /**
   * List premises for a project
   */
  async listPremises(
    projectId: string,
    options?: { status?: PremiseStatus; limit?: number; offset?: number }
  ): Promise<Premise[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    let query = this.db
      .select()
      .from(premises)
      .where(
        options?.status
          ? and(eq(premises.projectId, projectId), eq(premises.status, options.status))
          : eq(premises.projectId, projectId)
      )
      .limit(limit)
      .offset(offset)
      .orderBy(premises.createdAt);

    return await query;
  }

  /**
   * Update premise
   */
  async updatePremise(id: string, input: UpdatePremiseInput): Promise<Premise> {
    const existing = await this.getPremise(id);
    if (!existing) {
      throw new Error(`Premise not found: ${id}`);
    }

    const updates: Partial<NewPremise> = {
      updatedAt: new Date(),
    };

    if (input.logline !== undefined) {
      const logline = input.logline.trim();
      if (!logline) {
        throw new Error("Premise logline is required");
      }
      if (logline.length > 1000) {
        throw new Error("Premise logline must be 1000 characters or less");
      }
      updates.logline = logline;
    }

    if (input.genre !== undefined) updates.genre = input.genre?.trim() || null;
    if (input.tone !== undefined) updates.tone = input.tone?.trim() || null;
    if (input.themes !== undefined) updates.themes = input.themes;
    if (input.characterIds !== undefined) updates.characterIds = input.characterIds;
    if (input.setting !== undefined) updates.setting = input.setting?.trim() || null;
    if (input.worldRules !== undefined) updates.worldRules = input.worldRules;
    if (input.generatedBy !== undefined) updates.generatedBy = input.generatedBy;
    if (input.generationPrompt !== undefined) updates.generationPrompt = input.generationPrompt;
    if (input.status !== undefined) updates.status = input.status;

    const [updated] = await this.db
      .update(premises)
      .set(updates)
      .where(eq(premises.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete premise (cascades to stories and beats)
   */
  async deletePremise(id: string): Promise<void> {
    const existing = await this.getPremise(id);
    if (!existing) {
      throw new Error(`Premise not found: ${id}`);
    }

    await this.db.delete(premises).where(eq(premises.id, id));
  }

  // ==========================================================================
  // STORY CRUD
  // ==========================================================================

  /**
   * Create a new story from a premise
   */
  async createStory(input: CreateStoryInput): Promise<Story> {
    const title = input.title?.trim();
    if (!title) {
      throw new Error("Story title is required");
    }
    if (title.length > 255) {
      throw new Error("Story title must be 255 characters or less");
    }

    // Verify premise exists
    const premise = await this.getPremise(input.premiseId);
    if (!premise) {
      throw new Error(`Premise not found: ${input.premiseId}`);
    }

    const now = new Date();
    const [story] = await this.db
      .insert(stories)
      .values({
        premiseId: input.premiseId,
        title,
        synopsis: input.synopsis?.trim() || null,
        targetLength: input.targetLength || null,
        actualLength: null,
        structure: input.structure ?? "three-act",
        structureNotes: input.structureNotes || null,
        characterArcs: input.characterArcs || null,
        generatedBy: input.generatedBy || null,
        generationPrompt: input.generationPrompt || null,
        status: input.status ?? "draft",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return story;
  }

  /**
   * Get story by ID
   */
  async getStory(id: string): Promise<Story | null> {
    if (!id) return null;

    const result = await this.db.select().from(stories).where(eq(stories.id, id));

    return result[0] ?? null;
  }

  /**
   * Get story with its beats
   */
  async getStoryWithBeats(id: string): Promise<(Story & { beats: Beat[] }) | null> {
    const story = await this.getStory(id);
    if (!story) return null;

    const beatList = await this.getBeats(id);
    return { ...story, beats: beatList };
  }

  /**
   * List stories for a premise
   */
  async listStoriesByPremise(
    premiseId: string,
    options?: { status?: StoryStatus; limit?: number; offset?: number }
  ): Promise<Story[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return await this.db
      .select()
      .from(stories)
      .where(
        options?.status
          ? and(eq(stories.premiseId, premiseId), eq(stories.status, options.status))
          : eq(stories.premiseId, premiseId)
      )
      .limit(limit)
      .offset(offset)
      .orderBy(stories.createdAt);
  }

  /**
   * Update story
   */
  async updateStory(id: string, input: UpdateStoryInput): Promise<Story> {
    const existing = await this.getStory(id);
    if (!existing) {
      throw new Error(`Story not found: ${id}`);
    }

    const updates: Partial<NewStory> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Story title is required");
      }
      if (title.length > 255) {
        throw new Error("Story title must be 255 characters or less");
      }
      updates.title = title;
    }

    if (input.synopsis !== undefined) updates.synopsis = input.synopsis?.trim() || null;
    if (input.targetLength !== undefined) updates.targetLength = input.targetLength;
    if (input.structure !== undefined) updates.structure = input.structure;
    if (input.structureNotes !== undefined) updates.structureNotes = input.structureNotes;
    if (input.characterArcs !== undefined) updates.characterArcs = input.characterArcs;
    if (input.generatedBy !== undefined) updates.generatedBy = input.generatedBy;
    if (input.generationPrompt !== undefined) updates.generationPrompt = input.generationPrompt;
    if (input.status !== undefined) updates.status = input.status;

    const [updated] = await this.db
      .update(stories)
      .set(updates)
      .where(eq(stories.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete story (cascades to beats)
   */
  async deleteStory(id: string): Promise<void> {
    const existing = await this.getStory(id);
    if (!existing) {
      throw new Error(`Story not found: ${id}`);
    }

    await this.db.delete(stories).where(eq(stories.id, id));
  }

  // ==========================================================================
  // BEAT CRUD
  // ==========================================================================

  /**
   * Create a new beat
   */
  async createBeat(input: CreateBeatInput): Promise<Beat> {
    const visualDescription = input.visualDescription?.trim();
    if (!visualDescription) {
      throw new Error("Beat visual description is required");
    }

    // Verify story exists
    const story = await this.getStory(input.storyId);
    if (!story) {
      throw new Error(`Story not found: ${input.storyId}`);
    }

    const now = new Date();
    const [beat] = await this.db
      .insert(beats)
      .values({
        storyId: input.storyId,
        position: input.position,
        actNumber: input.actNumber || null,
        beatType: input.beatType || null,
        visualDescription,
        narrativeContext: input.narrativeContext?.trim() || null,
        emotionalTone: input.emotionalTone?.trim() || null,
        characterIds: input.characterIds ?? [],
        characterActions: input.characterActions || null,
        cameraAngle: input.cameraAngle?.trim() || null,
        composition: input.composition?.trim() || null,
        dialogue: input.dialogue || null,
        narration: input.narration?.trim() || null,
        sfx: input.sfx?.trim() || null,
        panelId: null,
        generatedBy: input.generatedBy || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update story's actual length
    const beatCount = await this.getBeatCount(input.storyId);
    await this.db
      .update(stories)
      .set({ actualLength: beatCount, updatedAt: new Date() })
      .where(eq(stories.id, input.storyId));

    return beat;
  }

  /**
   * Create multiple beats at once
   */
  async createBeats(storyId: string, beatInputs: Omit<CreateBeatInput, "storyId">[]): Promise<Beat[]> {
    // Verify story exists
    const story = await this.getStory(storyId);
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    const now = new Date();
    const values = beatInputs.map((input) => ({
      storyId,
      position: input.position,
      actNumber: input.actNumber || null,
      beatType: input.beatType || null,
      visualDescription: input.visualDescription?.trim() || "",
      narrativeContext: input.narrativeContext?.trim() || null,
      emotionalTone: input.emotionalTone?.trim() || null,
      characterIds: input.characterIds ?? [],
      characterActions: input.characterActions || null,
      cameraAngle: input.cameraAngle?.trim() || null,
      composition: input.composition?.trim() || null,
      dialogue: input.dialogue || null,
      narration: input.narration?.trim() || null,
      sfx: input.sfx?.trim() || null,
      panelId: null,
      generatedBy: input.generatedBy || null,
      createdAt: now,
      updatedAt: now,
    }));

    const createdBeats = await this.db.insert(beats).values(values).returning();

    // Update story's actual length
    const beatCount = await this.getBeatCount(storyId);
    await this.db
      .update(stories)
      .set({ actualLength: beatCount, updatedAt: new Date() })
      .where(eq(stories.id, storyId));

    return createdBeats;
  }

  /**
   * Get beat by ID
   */
  async getBeat(id: string): Promise<Beat | null> {
    if (!id) return null;

    const result = await this.db.select().from(beats).where(eq(beats.id, id));

    return result[0] ?? null;
  }

  /**
   * Get all beats for a story (ordered by position)
   */
  async getBeats(storyId: string): Promise<Beat[]> {
    return await this.db
      .select()
      .from(beats)
      .where(eq(beats.storyId, storyId))
      .orderBy(asc(beats.position));
  }

  /**
   * Get beat count for a story
   */
  async getBeatCount(storyId: string): Promise<number> {
    const result = await this.db.select().from(beats).where(eq(beats.storyId, storyId));
    return result.length;
  }

  /**
   * Update beat
   */
  async updateBeat(id: string, input: UpdateBeatInput): Promise<Beat> {
    const existing = await this.getBeat(id);
    if (!existing) {
      throw new Error(`Beat not found: ${id}`);
    }

    const updates: Partial<NewBeat> = {
      updatedAt: new Date(),
    };

    if (input.position !== undefined) updates.position = input.position;
    if (input.actNumber !== undefined) updates.actNumber = input.actNumber;
    if (input.beatType !== undefined) updates.beatType = input.beatType;
    if (input.visualDescription !== undefined) {
      const visualDescription = input.visualDescription.trim();
      if (!visualDescription) {
        throw new Error("Beat visual description is required");
      }
      updates.visualDescription = visualDescription;
    }
    if (input.narrativeContext !== undefined)
      updates.narrativeContext = input.narrativeContext?.trim() || null;
    if (input.emotionalTone !== undefined) updates.emotionalTone = input.emotionalTone?.trim() || null;
    if (input.characterIds !== undefined) updates.characterIds = input.characterIds;
    if (input.characterActions !== undefined) updates.characterActions = input.characterActions;
    if (input.cameraAngle !== undefined) updates.cameraAngle = input.cameraAngle?.trim() || null;
    if (input.composition !== undefined) updates.composition = input.composition?.trim() || null;
    if (input.dialogue !== undefined) updates.dialogue = input.dialogue;
    if (input.narration !== undefined) updates.narration = input.narration?.trim() || null;
    if (input.sfx !== undefined) updates.sfx = input.sfx?.trim() || null;
    if (input.generatedBy !== undefined) updates.generatedBy = input.generatedBy;

    const [updated] = await this.db.update(beats).set(updates).where(eq(beats.id, id)).returning();

    return updated;
  }

  /**
   * Reorder beats in a story
   */
  async reorderBeats(storyId: string, beatIds: string[]): Promise<Beat[]> {
    // Verify story exists
    const story = await this.getStory(storyId);
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    // Update each beat's position
    for (let i = 0; i < beatIds.length; i++) {
      await this.db
        .update(beats)
        .set({ position: i, updatedAt: new Date() })
        .where(and(eq(beats.id, beatIds[i]), eq(beats.storyId, storyId)));
    }

    return await this.getBeats(storyId);
  }

  /**
   * Delete beat
   */
  async deleteBeat(id: string): Promise<void> {
    const existing = await this.getBeat(id);
    if (!existing) {
      throw new Error(`Beat not found: ${id}`);
    }

    const storyId = existing.storyId;
    await this.db.delete(beats).where(eq(beats.id, id));

    // Update story's actual length
    const beatCount = await this.getBeatCount(storyId);
    await this.db
      .update(stories)
      .set({ actualLength: beatCount, updatedAt: new Date() })
      .where(eq(stories.id, storyId));
  }

  // ==========================================================================
  // CONVERSION: Beat → Panel
  // ==========================================================================

  /**
   * Convert a beat to a panel in a storyboard
   */
  async convertBeatToPanel(
    beatId: string,
    storyboardId: string
  ): Promise<{ beat: Beat; panelId: string }> {
    const beat = await this.getBeat(beatId);
    if (!beat) {
      throw new Error(`Beat not found: ${beatId}`);
    }

    if (beat.panelId) {
      throw new Error(`Beat already converted to panel: ${beat.panelId}`);
    }

    const panelService = getPanelService();

    // Get the next position in the storyboard
    const existingPanels = await panelService.getByStoryboard(storyboardId);
    const nextPosition = existingPanels.length;

    // Create the panel from beat data
    const panel = await panelService.create({
      storyboardId,
      position: nextPosition,
      description: beat.visualDescription,
      direction: {
        cameraAngle: beat.cameraAngle ?? "medium",
        mood: beat.emotionalTone ?? "neutral",
        lighting: "natural",
      },
      characterIds: beat.characterIds,
    });

    // Link the beat to the panel
    await this.db
      .update(beats)
      .set({ panelId: panel.id, updatedAt: new Date() })
      .where(eq(beats.id, beatId));

    const updatedBeat = await this.getBeat(beatId);
    return { beat: updatedBeat!, panelId: panel.id };
  }

  /**
   * Convert all beats in a story to panels in a storyboard
   */
  async convertStoryToStoryboard(
    storyId: string,
    storyboardId: string
  ): Promise<{ beats: Beat[]; panelIds: string[] }> {
    const story = await this.getStory(storyId);
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    const storyBeats = await this.getBeats(storyId);
    if (storyBeats.length === 0) {
      throw new Error(`Story has no beats: ${storyId}`);
    }

    const panelIds: string[] = [];
    const updatedBeats: Beat[] = [];

    for (const beat of storyBeats) {
      if (beat.panelId) {
        // Already converted
        panelIds.push(beat.panelId);
        updatedBeats.push(beat);
        continue;
      }

      const { beat: updatedBeat, panelId } = await this.convertBeatToPanel(beat.id, storyboardId);
      panelIds.push(panelId);
      updatedBeats.push(updatedBeat);
    }

    // Update story status
    await this.updateStory(storyId, { status: "panels_created" });

    return { beats: updatedBeats, panelIds };
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: NarrativeService | null = null;

/**
 * Create a new NarrativeService with explicit database injection
 */
export function createNarrativeService(db: Database): NarrativeService {
  return new NarrativeService(db);
}

/**
 * Get the singleton NarrativeService (uses default database)
 */
export function getNarrativeService(): NarrativeService {
  if (!instance) {
    instance = new NarrativeService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetNarrativeService(): void {
  instance = null;
}
