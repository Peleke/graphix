/**
 * Storyboard Service
 *
 * CRUD operations for storyboards with panel management.
 */

import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client.js";
import {
  storyboards,
  projects,
  panels,
  type Storyboard,
  type NewStoryboard,
} from "../db/schema.js";

export class StoryboardService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Create a new storyboard with optional initial panels
   */
  async create(data: {
    projectId: string;
    name: string;
    description?: string;
    panelCount?: number;
  }): Promise<Storyboard> {
    // Validate project exists
    const [project] = await this.db.select().from(projects).where(eq(projects.id, data.projectId));
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    // Validate name
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Storyboard name is required");
    }
    if (name.length > 255) {
      throw new Error("Storyboard name must be 255 characters or less");
    }

    const description = data.description?.trim() ?? "";
    if (description.length > 10000) {
      throw new Error("Storyboard description must be 10000 characters or less");
    }

    const now = new Date();
    const [storyboard] = await this.db
      .insert(storyboards)
      .values({
        projectId: data.projectId,
        name,
        description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create initial panels if requested
    if (data.panelCount && data.panelCount > 0) {
      const panelData = Array.from({ length: data.panelCount }, (_, i) => ({
        storyboardId: storyboard.id,
        position: i + 1,
        description: "",
        direction: null,
        characterIds: [],
        selectedOutputId: null,
        createdAt: now,
        updatedAt: now,
      }));

      await this.db.insert(panels).values(panelData);
    }

    return storyboard;
  }

  /**
   * Get storyboard by ID
   */
  async getById(id: string): Promise<Storyboard | null> {
    if (!id) return null;

    const result = await this.db.select().from(storyboards).where(eq(storyboards.id, id));

    return result[0] ?? null;
  }

  /**
   * Get storyboard with panels
   */
  async getWithPanels(id: string): Promise<{
    storyboard: Storyboard;
    panels: Array<typeof panels.$inferSelect>;
  } | null> {
    const storyboard = await this.getById(id);
    if (!storyboard) return null;

    const storyboardPanels = await this.db
      .select()
      .from(panels)
      .where(eq(panels.storyboardId, id))
      .orderBy(panels.position);

    return { storyboard, panels: storyboardPanels };
  }

  /**
   * Get all storyboards for a project
   */
  async getByProject(projectId: string): Promise<Storyboard[]> {
    return await this.db
      .select()
      .from(storyboards)
      .where(eq(storyboards.projectId, projectId))
      .orderBy(storyboards.name);
  }

  /**
   * Update storyboard
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<Storyboard> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Storyboard not found: ${id}`);
    }

    const updates: Partial<NewStoryboard> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new Error("Storyboard name is required");
      }
      if (name.length > 255) {
        throw new Error("Storyboard name must be 255 characters or less");
      }
      updates.name = name;
    }

    if (data.description !== undefined) {
      const description = data.description.trim();
      if (description.length > 10000) {
        throw new Error("Storyboard description must be 10000 characters or less");
      }
      updates.description = description;
    }

    const [updated] = await this.db
      .update(storyboards)
      .set(updates)
      .where(eq(storyboards.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete storyboard (cascades to panels, generated images)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Storyboard not found: ${id}`);
    }

    await this.db.delete(storyboards).where(eq(storyboards.id, id));
  }

  /**
   * Duplicate storyboard (creates copy with all panels)
   */
  async duplicate(id: string, newName?: string): Promise<Storyboard> {
    const existing = await this.getWithPanels(id);
    if (!existing) {
      throw new Error(`Storyboard not found: ${id}`);
    }

    const { storyboard, panels: existingPanels } = existing;
    const now = new Date();

    // Create new storyboard
    const [newStoryboard] = await this.db
      .insert(storyboards)
      .values({
        projectId: storyboard.projectId,
        name: newName ?? `${storyboard.name} (copy)`,
        description: storyboard.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Copy panels (without generated images)
    if (existingPanels.length > 0) {
      const panelData = existingPanels.map((p) => ({
        storyboardId: newStoryboard.id,
        position: p.position,
        description: p.description,
        direction: p.direction,
        characterIds: p.characterIds,
        selectedOutputId: null, // Don't copy selection
        createdAt: now,
        updatedAt: now,
      }));

      await this.db.insert(panels).values(panelData);
    }

    return newStoryboard;
  }
}

// Singleton instance
let instance: StoryboardService | null = null;

export function getStoryboardService(): StoryboardService {
  if (!instance) {
    instance = new StoryboardService();
  }
  return instance;
}
