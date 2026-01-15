/**
 * Generated Image Service
 *
 * CRUD operations for generated images with metadata tracking.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb, type Database } from "../db/client.js";
import {
  generatedImages,
  panels,
  type GeneratedImage,
  type NewGeneratedImage,
} from "../db/schema.js";

export class GeneratedImageService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Record a new generation
   */
  async create(data: {
    panelId: string;
    localPath: string;
    cloudUrl?: string;
    thumbnailPath?: string;
    seed: number;
    prompt: string;
    negativePrompt?: string;
    model: string;
    loras?: Array<{ name: string; strength: number; strengthClip?: number }>;
    steps: number;
    cfg: number;
    sampler: string;
    scheduler?: string;
    width: number;
    height: number;
    variantStrategy?: string;
    variantIndex?: number;
    usedIPAdapter?: boolean;
    ipAdapterImages?: string[];
    usedControlNet?: boolean;
    controlNetType?: string;
    controlNetImage?: string;
  }): Promise<GeneratedImage> {
    // Validate panel exists
    const [panel] = await this.db.select().from(panels).where(eq(panels.id, data.panelId));
    if (!panel) {
      throw new Error(`Panel not found: ${data.panelId}`);
    }

    // Validate required fields
    if (!data.localPath) {
      throw new Error("Local path is required");
    }
    if (!data.prompt) {
      throw new Error("Prompt is required");
    }
    if (!data.model) {
      throw new Error("Model is required");
    }
    if (data.seed === undefined || data.seed < 0) {
      throw new Error("Valid seed is required");
    }
    if (!data.steps || data.steps < 1) {
      throw new Error("Valid steps is required");
    }
    if (!data.cfg || data.cfg < 1) {
      throw new Error("Valid CFG is required");
    }
    if (!data.width || data.width < 256) {
      throw new Error("Valid width is required");
    }
    if (!data.height || data.height < 256) {
      throw new Error("Valid height is required");
    }

    const now = new Date();
    const [image] = await this.db
      .insert(generatedImages)
      .values({
        panelId: data.panelId,
        localPath: data.localPath,
        cloudUrl: data.cloudUrl ?? null,
        thumbnailPath: data.thumbnailPath ?? null,
        seed: data.seed,
        prompt: data.prompt,
        negativePrompt: data.negativePrompt ?? "",
        model: data.model,
        loras: data.loras ?? [],
        steps: data.steps,
        cfg: data.cfg,
        sampler: data.sampler,
        scheduler: data.scheduler ?? "normal",
        width: data.width,
        height: data.height,
        variantStrategy: data.variantStrategy ?? null,
        variantIndex: data.variantIndex ?? null,
        usedIPAdapter: data.usedIPAdapter ?? false,
        ipAdapterImages: data.ipAdapterImages ?? null,
        usedControlNet: data.usedControlNet ?? false,
        controlNetType: data.controlNetType ?? null,
        controlNetImage: data.controlNetImage ?? null,
        isSelected: false,
        isFavorite: false,
        rating: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return image;
  }

  /**
   * Get generation by ID
   */
  async getById(id: string): Promise<GeneratedImage | null> {
    if (!id) return null;

    const result = await this.db.select().from(generatedImages).where(eq(generatedImages.id, id));

    return result[0] ?? null;
  }

  /**
   * Get all generations for a panel
   */
  async getByPanel(panelId: string): Promise<GeneratedImage[]> {
    return await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.panelId, panelId))
      .orderBy(desc(generatedImages.createdAt));
  }

  /**
   * Get selected generation for a panel
   */
  async getSelected(panelId: string): Promise<GeneratedImage | null> {
    const result = await this.db
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.panelId, panelId), eq(generatedImages.isSelected, true)));

    return result[0] ?? null;
  }

  /**
   * Get favorite generations for a panel
   */
  async getFavorites(panelId: string): Promise<GeneratedImage[]> {
    return await this.db
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.panelId, panelId), eq(generatedImages.isFavorite, true)))
      .orderBy(desc(generatedImages.createdAt));
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<GeneratedImage> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generation not found: ${id}`);
    }

    const [updated] = await this.db
      .update(generatedImages)
      .set({
        isFavorite: !existing.isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(generatedImages.id, id))
      .returning();

    return updated;
  }

  /**
   * Set rating (1-5)
   */
  async setRating(id: string, rating: number | null): Promise<GeneratedImage> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generation not found: ${id}`);
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const [updated] = await this.db
      .update(generatedImages)
      .set({
        rating,
        updatedAt: new Date(),
      })
      .where(eq(generatedImages.id, id))
      .returning();

    return updated;
  }

  /**
   * Update cloud URL (after upload)
   */
  async setCloudUrl(id: string, cloudUrl: string): Promise<GeneratedImage> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generation not found: ${id}`);
    }

    const [updated] = await this.db
      .update(generatedImages)
      .set({
        cloudUrl,
        updatedAt: new Date(),
      })
      .where(eq(generatedImages.id, id))
      .returning();

    return updated;
  }

  /**
   * Update thumbnail path
   */
  async setThumbnail(id: string, thumbnailPath: string): Promise<GeneratedImage> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generation not found: ${id}`);
    }

    const [updated] = await this.db
      .update(generatedImages)
      .set({
        thumbnailPath,
        updatedAt: new Date(),
      })
      .where(eq(generatedImages.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete generation
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Generation not found: ${id}`);
    }

    // If this was selected, clear the panel's selection
    if (existing.isSelected) {
      await this.db
        .update(panels)
        .set({ selectedOutputId: null })
        .where(eq(panels.id, existing.panelId));
    }

    await this.db.delete(generatedImages).where(eq(generatedImages.id, id));
  }

  /**
   * Delete all generations for a panel
   */
  async deleteByPanel(panelId: string): Promise<number> {
    // Clear panel selection first
    await this.db.update(panels).set({ selectedOutputId: null }).where(eq(panels.id, panelId));

    const result = await this.db
      .delete(generatedImages)
      .where(eq(generatedImages.panelId, panelId));

    return result.rowsAffected;
  }

  /**
   * Get generation count for a panel
   */
  async countByPanel(panelId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.panelId, panelId));

    return result.length;
  }

  /**
   * Find generations by seed
   */
  async findBySeed(seed: number): Promise<GeneratedImage[]> {
    return await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.seed, seed))
      .orderBy(desc(generatedImages.createdAt));
  }
}

// Singleton instance
let instance: GeneratedImageService | null = null;

export function getGeneratedImageService(): GeneratedImageService {
  if (!instance) {
    instance = new GeneratedImageService();
  }
  return instance;
}
