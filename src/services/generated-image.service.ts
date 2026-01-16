/**
 * Generated Image Service
 *
 * CRUD operations for generated images with metadata tracking.
 */

import { eq, and, desc, inArray, sql, asc } from "drizzle-orm";
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

  // ============================================================================
  // CURATION METHODS (Phase 3.5)
  // ============================================================================

  /**
   * Get generations for comparison UI
   *
   * Returns images with comparison-relevant metadata grouped for side-by-side display.
   */
  async getForComparison(
    panelId: string,
    imageIds?: string[]
  ): Promise<{
    images: GeneratedImage[];
    metadata: {
      totalCount: number;
      ratedCount: number;
      avgRating: number | null;
      favoriteCount: number;
      selectedId: string | null;
    };
  }> {
    // Get all or specific images
    let images: GeneratedImage[];
    if (imageIds && imageIds.length > 0) {
      images = await this.db
        .select()
        .from(generatedImages)
        .where(and(eq(generatedImages.panelId, panelId), inArray(generatedImages.id, imageIds)))
        .orderBy(desc(generatedImages.createdAt));
    } else {
      images = await this.getByPanel(panelId);
    }

    // Calculate metadata
    const totalCount = images.length;
    const ratedImages = images.filter((img) => img.rating !== null);
    const ratedCount = ratedImages.length;
    const avgRating =
      ratedCount > 0
        ? ratedImages.reduce((sum, img) => sum + (img.rating ?? 0), 0) / ratedCount
        : null;
    const favoriteCount = images.filter((img) => img.isFavorite).length;
    const selectedId = images.find((img) => img.isSelected)?.id ?? null;

    return {
      images,
      metadata: {
        totalCount,
        ratedCount,
        avgRating,
        favoriteCount,
        selectedId,
      },
    };
  }

  /**
   * Batch rate multiple images at once
   */
  async batchRate(
    ratings: Array<{ imageId: string; rating: number | null }>
  ): Promise<{
    updated: string[];
    failed: Array<{ imageId: string; error: string }>;
  }> {
    const updated: string[] = [];
    const failed: Array<{ imageId: string; error: string }> = [];

    for (const { imageId, rating } of ratings) {
      try {
        if (rating !== null && (rating < 1 || rating > 5)) {
          failed.push({ imageId, error: "Rating must be between 1 and 5" });
          continue;
        }

        await this.db
          .update(generatedImages)
          .set({ rating, updatedAt: new Date() })
          .where(eq(generatedImages.id, imageId));

        updated.push(imageId);
      } catch (error) {
        failed.push({
          imageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { updated, failed };
  }

  /**
   * Get comparison statistics for a set of images
   */
  async getComparisonStats(imageIds: string[]): Promise<{
    byRating: Record<number, number>;
    bySeed: Record<number, number>;
    byCfg: Record<number, number>;
    bySampler: Record<string, number>;
    byModel: Record<string, number>;
    topRated: GeneratedImage[];
    recommendations: string[];
  }> {
    if (imageIds.length === 0) {
      return {
        byRating: {},
        bySeed: {},
        byCfg: {},
        bySampler: {},
        byModel: {},
        topRated: [],
        recommendations: [],
      };
    }

    const images = await this.db
      .select()
      .from(generatedImages)
      .where(inArray(generatedImages.id, imageIds));

    // Count by rating
    const byRating: Record<number, number> = {};
    for (const img of images) {
      if (img.rating !== null) {
        byRating[img.rating] = (byRating[img.rating] ?? 0) + 1;
      }
    }

    // Count by seed
    const bySeed: Record<number, number> = {};
    for (const img of images) {
      bySeed[img.seed] = (bySeed[img.seed] ?? 0) + 1;
    }

    // Count by CFG
    const byCfg: Record<number, number> = {};
    for (const img of images) {
      byCfg[img.cfg] = (byCfg[img.cfg] ?? 0) + 1;
    }

    // Count by sampler
    const bySampler: Record<string, number> = {};
    for (const img of images) {
      bySampler[img.sampler] = (bySampler[img.sampler] ?? 0) + 1;
    }

    // Count by model
    const byModel: Record<string, number> = {};
    for (const img of images) {
      byModel[img.model] = (byModel[img.model] ?? 0) + 1;
    }

    // Top rated images
    const topRated = images
      .filter((img) => img.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);

    // Generate recommendations based on patterns
    const recommendations: string[] = [];

    // Find best performing CFG
    const ratedByCfg = images.filter((img) => img.rating !== null);
    if (ratedByCfg.length > 2) {
      const cfgAvgRatings = new Map<number, { sum: number; count: number }>();
      for (const img of ratedByCfg) {
        const entry = cfgAvgRatings.get(img.cfg) ?? { sum: 0, count: 0 };
        entry.sum += img.rating ?? 0;
        entry.count += 1;
        cfgAvgRatings.set(img.cfg, entry);
      }

      let bestCfg = 0;
      let bestAvg = 0;
      for (const [cfg, { sum, count }] of cfgAvgRatings) {
        const avg = sum / count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestCfg = cfg;
        }
      }

      if (bestCfg > 0) {
        recommendations.push(`CFG ${bestCfg} has the highest average rating (${bestAvg.toFixed(1)})`);
      }
    }

    // Find best performing sampler
    const samplerAvgRatings = new Map<string, { sum: number; count: number }>();
    for (const img of ratedByCfg) {
      const entry = samplerAvgRatings.get(img.sampler) ?? { sum: 0, count: 0 };
      entry.sum += img.rating ?? 0;
      entry.count += 1;
      samplerAvgRatings.set(img.sampler, entry);
    }

    let bestSampler = "";
    let bestSamplerAvg = 0;
    for (const [sampler, { sum, count }] of samplerAvgRatings) {
      const avg = sum / count;
      if (avg > bestSamplerAvg) {
        bestSamplerAvg = avg;
        bestSampler = sampler;
      }
    }

    if (bestSampler) {
      recommendations.push(
        `Sampler "${bestSampler}" has the highest average rating (${bestSamplerAvg.toFixed(1)})`
      );
    }

    return {
      byRating,
      bySeed,
      byCfg,
      bySampler,
      byModel,
      topRated,
      recommendations,
    };
  }

  /**
   * Quick select the best image based on criteria
   */
  async quickSelect(
    panelId: string,
    criteria: "highest_rating" | "most_recent" | "oldest" | "favorite"
  ): Promise<GeneratedImage | null> {
    const images = await this.getByPanel(panelId);

    if (images.length === 0) {
      return null;
    }

    let selected: GeneratedImage | undefined;

    switch (criteria) {
      case "highest_rating": {
        const rated = images.filter((img) => img.rating !== null);
        if (rated.length === 0) {
          return null; // No rated images
        }
        selected = rated.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
        break;
      }

      case "most_recent":
        // Already sorted by desc(createdAt)
        selected = images[0];
        break;

      case "oldest":
        selected = images[images.length - 1];
        break;

      case "favorite": {
        const favorites = images.filter((img) => img.isFavorite);
        if (favorites.length === 0) {
          return null; // No favorites
        }
        // Return highest rated favorite, or most recent if no ratings
        const ratedFavorites = favorites.filter((img) => img.rating !== null);
        if (ratedFavorites.length > 0) {
          selected = ratedFavorites.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
        } else {
          selected = favorites[0]; // Most recent favorite
        }
        break;
      }
    }

    if (!selected) {
      return null;
    }

    // Deselect current selection if any
    await this.db
      .update(generatedImages)
      .set({ isSelected: false, updatedAt: new Date() })
      .where(and(eq(generatedImages.panelId, panelId), eq(generatedImages.isSelected, true)));

    // Select the new one
    const [updated] = await this.db
      .update(generatedImages)
      .set({ isSelected: true, updatedAt: new Date() })
      .where(eq(generatedImages.id, selected.id))
      .returning();

    // Update panel's selectedOutputId
    await this.db.update(panels).set({ selectedOutputId: updated.id }).where(eq(panels.id, panelId));

    return updated;
  }

  /**
   * Batch toggle favorites
   */
  async batchFavorite(
    imageIds: string[],
    favorite: boolean
  ): Promise<{
    updated: string[];
    failed: Array<{ imageId: string; error: string }>;
  }> {
    const updated: string[] = [];
    const failed: Array<{ imageId: string; error: string }> = [];

    for (const imageId of imageIds) {
      try {
        await this.db
          .update(generatedImages)
          .set({ isFavorite: favorite, updatedAt: new Date() })
          .where(eq(generatedImages.id, imageId));

        updated.push(imageId);
      } catch (error) {
        failed.push({
          imageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { updated, failed };
  }

  /**
   * Get unrated images for a panel (for curation workflow)
   */
  async getUnrated(panelId: string): Promise<GeneratedImage[]> {
    return await this.db
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.panelId, panelId), sql`${generatedImages.rating} IS NULL`))
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
