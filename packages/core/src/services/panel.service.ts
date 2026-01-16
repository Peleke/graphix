/**
 * Panel Service
 *
 * CRUD operations for panels with character assignment and generation tracking.
 */

import { eq, and, gt, lt, gte, sql } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  panels,
  storyboards,
  characters,
  generatedImages,
  type Panel,
  type NewPanel,
  type PanelDirection,
  type GeneratedImage,
} from "../db/index.js";

// Valid camera angles
const VALID_CAMERA_ANGLES = [
  "eye level",
  "low angle",
  "high angle",
  "dutch angle",
  "bird's eye",
  "worm's eye",
  "close-up",
  "medium shot",
  "wide shot",
  "extreme close-up",
];

// Valid moods
const VALID_MOODS = [
  "dramatic",
  "romantic",
  "comedic",
  "tense",
  "peaceful",
  "action",
  "mysterious",
  "melancholic",
  "joyful",
  "neutral",
];

// Valid lighting
const VALID_LIGHTING = [
  "natural",
  "golden hour",
  "dramatic",
  "soft",
  "harsh",
  "neon",
  "candlelight",
  "moonlight",
  "studio",
  "rim light",
];

export class PanelService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Create a new panel
   */
  async create(data: {
    storyboardId: string;
    position?: number;
    description?: string;
    direction?: Partial<PanelDirection>;
    characterIds?: string[];
  }): Promise<Panel> {
    // Validate storyboard exists
    const [storyboard] = await this.db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, data.storyboardId));
    if (!storyboard) {
      throw new Error(`Storyboard not found: ${data.storyboardId}`);
    }

    // Determine position
    let position = data.position;
    if (position === undefined || position === null) {
      // Get max position and add 1
      const [maxPos] = await this.db
        .select({ max: sql<number>`MAX(position)` })
        .from(panels)
        .where(eq(panels.storyboardId, data.storyboardId));
      position = (maxPos?.max ?? 0) + 1;
    } else {
      // Shift existing panels if inserting
      await this.db
        .update(panels)
        .set({ position: sql`position + 1` })
        .where(and(eq(panels.storyboardId, data.storyboardId), gte(panels.position, position)));
    }

    // Validate direction if provided
    const direction = data.direction
      ? this.validateAndBuildDirection(data.direction)
      : null;

    const description = data.description?.trim() ?? "";
    if (description.length > 5000) {
      throw new Error("Panel description must be 5000 characters or less");
    }

    const now = new Date();
    const [panel] = await this.db
      .insert(panels)
      .values({
        storyboardId: data.storyboardId,
        position,
        description,
        direction,
        characterIds: data.characterIds ?? [],
        selectedOutputId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return panel;
  }

  /**
   * Get panel by ID
   */
  async getById(id: string): Promise<Panel | null> {
    if (!id) return null;

    const result = await this.db.select().from(panels).where(eq(panels.id, id));

    return result[0] ?? null;
  }

  /**
   * Get all panels for a storyboard
   */
  async getByStoryboard(storyboardId: string): Promise<Panel[]> {
    return await this.db
      .select()
      .from(panels)
      .where(eq(panels.storyboardId, storyboardId))
      .orderBy(panels.position);
  }

  /**
   * Update panel description and direction
   */
  async describe(
    id: string,
    data: {
      description?: string;
      direction?: Partial<PanelDirection>;
    }
  ): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    const updates: Partial<NewPanel> = {
      updatedAt: new Date(),
    };

    if (data.description !== undefined) {
      const description = data.description.trim();
      if (description.length > 5000) {
        throw new Error("Panel description must be 5000 characters or less");
      }
      updates.description = description;
    }

    if (data.direction !== undefined) {
      updates.direction = this.validateAndBuildDirection({
        ...existing.direction,
        ...data.direction,
      });
    }

    const [updated] = await this.db
      .update(panels)
      .set(updates)
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Add character to panel
   */
  async addCharacter(id: string, characterId: string): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    // Validate character exists
    const [character] = await this.db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId));
    if (!character) {
      throw new Error(`Character not found: ${characterId}`);
    }

    // Check not already added
    if (existing.characterIds.includes(characterId)) {
      return existing; // No-op
    }

    const [updated] = await this.db
      .update(panels)
      .set({
        characterIds: [...existing.characterIds, characterId],
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Remove character from panel
   */
  async removeCharacter(id: string, characterId: string): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    const [updated] = await this.db
      .update(panels)
      .set({
        characterIds: existing.characterIds.filter((c) => c !== characterId),
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Set characters for panel (replace all)
   */
  async setCharacters(id: string, characterIds: string[]): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    // Validate all characters exist
    for (const charId of characterIds) {
      const [character] = await this.db
        .select()
        .from(characters)
        .where(eq(characters.id, charId));
      if (!character) {
        throw new Error(`Character not found: ${charId}`);
      }
    }

    const [updated] = await this.db
      .update(panels)
      .set({
        characterIds,
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Select output from generations
   */
  async selectOutput(id: string, outputId: string): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    // Validate generation exists and belongs to this panel
    const [generation] = await this.db
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.id, outputId), eq(generatedImages.panelId, id)));
    if (!generation) {
      throw new Error(`Generation not found: ${outputId}`);
    }

    // Clear previous selection
    await this.db
      .update(generatedImages)
      .set({ isSelected: false })
      .where(eq(generatedImages.panelId, id));

    // Set new selection
    await this.db
      .update(generatedImages)
      .set({ isSelected: true })
      .where(eq(generatedImages.id, outputId));

    // Update panel
    const [updated] = await this.db
      .update(panels)
      .set({
        selectedOutputId: outputId,
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Clear output selection
   */
  async clearSelection(id: string): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    // Clear isSelected on all generations
    await this.db
      .update(generatedImages)
      .set({ isSelected: false })
      .where(eq(generatedImages.panelId, id));

    const [updated] = await this.db
      .update(panels)
      .set({
        selectedOutputId: null,
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Get generations for panel
   */
  async getGenerations(id: string): Promise<GeneratedImage[]> {
    return await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.panelId, id))
      .orderBy(generatedImages.createdAt);
  }

  /**
   * Reorder panel to new position
   */
  async reorder(id: string, newPosition: number): Promise<Panel> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    if (newPosition < 1) {
      throw new Error("Position must be at least 1");
    }

    const oldPosition = existing.position;
    if (oldPosition === newPosition) {
      return existing; // No change
    }

    // Shift other panels
    if (newPosition > oldPosition) {
      // Moving down: shift panels between old and new up
      await this.db
        .update(panels)
        .set({ position: sql`position - 1` })
        .where(
          and(
            eq(panels.storyboardId, existing.storyboardId),
            gt(panels.position, oldPosition),
            lt(panels.position, newPosition + 1)
          )
        );
    } else {
      // Moving up: shift panels between new and old down
      await this.db
        .update(panels)
        .set({ position: sql`position + 1` })
        .where(
          and(
            eq(panels.storyboardId, existing.storyboardId),
            gte(panels.position, newPosition),
            lt(panels.position, oldPosition)
          )
        );
    }

    // Update panel position
    const [updated] = await this.db
      .update(panels)
      .set({
        position: newPosition,
        updatedAt: new Date(),
      })
      .where(eq(panels.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete panel
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Panel not found: ${id}`);
    }

    // Delete panel (cascades to generated images)
    await this.db.delete(panels).where(eq(panels.id, id));

    // Reorder remaining panels
    await this.db
      .update(panels)
      .set({ position: sql`position - 1` })
      .where(
        and(
          eq(panels.storyboardId, existing.storyboardId),
          gt(panels.position, existing.position)
        )
      );
  }

  /**
   * Validate and build direction object
   */
  private validateAndBuildDirection(data: Partial<PanelDirection>): PanelDirection {
    const direction: PanelDirection = {
      cameraAngle: data.cameraAngle ?? "eye level",
      mood: data.mood ?? "neutral",
      lighting: data.lighting ?? "natural",
    };

    if (!VALID_CAMERA_ANGLES.includes(direction.cameraAngle)) {
      throw new Error(`Invalid camera angle. Must be one of: ${VALID_CAMERA_ANGLES.join(", ")}`);
    }

    if (!VALID_MOODS.includes(direction.mood)) {
      throw new Error(`Invalid mood. Must be one of: ${VALID_MOODS.join(", ")}`);
    }

    if (!VALID_LIGHTING.includes(direction.lighting)) {
      throw new Error(`Invalid lighting. Must be one of: ${VALID_LIGHTING.join(", ")}`);
    }

    return direction;
  }
}

// Singleton instance
let instance: PanelService | null = null;

export function getPanelService(): PanelService {
  if (!instance) {
    instance = new PanelService();
  }
  return instance;
}

export function resetPanelService(): void {
  instance = null;
}
