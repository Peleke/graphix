/**
 * Interaction Pose Service
 *
 * Manage multi-character pose presets for scenes with two or more characters.
 * Supports GLIGEN bounding boxes for precise character placement.
 */

import { eq, and, like, inArray, sql } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  interactionPoses,
  type InteractionPose,
  type NewInteractionPose,
  type InteractionPoseDefinition,
  type GligenBox,
} from "../db/index.js";

// ============================================================================
// Constants
// ============================================================================

export const INTERACTION_CATEGORIES = [
  "romantic",
  "intimate",
  "action",
  "conversation",
  "custom",
] as const;

export type InteractionCategory = (typeof INTERACTION_CATEGORIES)[number];

export const CONTENT_RATINGS = ["safe", "suggestive", "explicit"] as const;
export type ContentRating = (typeof CONTENT_RATINGS)[number];

// ============================================================================
// Types
// ============================================================================

export interface CreateInteractionPoseOptions {
  name: string;
  displayName: string;
  description?: string;
  category: InteractionCategory;
  characterCount?: number;
  poseDefinitions: InteractionPoseDefinition[];
  referenceImages?: string[];
  gligenBoxes?: GligenBox[];
  promptFragment: string;
  negativeFragment?: string;
  tags?: string[];
  rating: ContentRating;
  isBuiltin?: boolean;
}

export interface UpdateInteractionPoseOptions {
  displayName?: string;
  description?: string;
  category?: InteractionCategory;
  characterCount?: number;
  poseDefinitions?: InteractionPoseDefinition[];
  referenceImages?: string[];
  gligenBoxes?: GligenBox[];
  promptFragment?: string;
  negativeFragment?: string;
  tags?: string[];
  rating?: ContentRating;
}

export interface ListInteractionPosesOptions {
  category?: InteractionCategory;
  rating?: ContentRating;
  maxRating?: ContentRating;
  characterCount?: number;
  tags?: string[];
  search?: string;
  includeBuiltin?: boolean;
  limit?: number;
  offset?: number;
}

export interface ApplyInteractionPoseResult {
  promptFragment: string;
  negativeFragment: string;
  gligenBoxes: GligenBox[] | null;
  poseDescriptions: Map<string, string>; // characterId -> pose description
}

// ============================================================================
// Service
// ============================================================================

export class InteractionPoseService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Create a new interaction pose preset
   */
  async create(options: CreateInteractionPoseOptions): Promise<InteractionPose> {
    const now = new Date();

    const [pose] = await this.db
      .insert(interactionPoses)
      .values({
        name: options.name,
        displayName: options.displayName,
        description: options.description ?? "",
        category: options.category,
        characterCount: options.characterCount ?? 2,
        poseDefinitions: options.poseDefinitions,
        referenceImages: options.referenceImages ?? [],
        gligenBoxes: options.gligenBoxes ?? null,
        promptFragment: options.promptFragment,
        negativeFragment: options.negativeFragment ?? "",
        tags: options.tags ?? [],
        rating: options.rating,
        isBuiltin: options.isBuiltin ?? false,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return pose;
  }

  /**
   * Get an interaction pose by ID
   */
  async getById(id: string): Promise<InteractionPose | null> {
    const [pose] = await this.db
      .select()
      .from(interactionPoses)
      .where(eq(interactionPoses.id, id));

    return pose ?? null;
  }

  /**
   * Get an interaction pose by name
   */
  async getByName(name: string): Promise<InteractionPose | null> {
    const [pose] = await this.db
      .select()
      .from(interactionPoses)
      .where(eq(interactionPoses.name, name));

    return pose ?? null;
  }

  /**
   * List interaction poses with filtering
   */
  async list(options: ListInteractionPosesOptions = {}): Promise<InteractionPose[]> {
    const conditions = [];

    // Category filter
    if (options.category) {
      conditions.push(eq(interactionPoses.category, options.category));
    }

    // Exact rating filter
    if (options.rating) {
      conditions.push(eq(interactionPoses.rating, options.rating));
    }

    // Max rating filter (inclusive)
    if (options.maxRating) {
      const ratingOrder: ContentRating[] = ["safe", "suggestive", "explicit"];
      const maxIndex = ratingOrder.indexOf(options.maxRating);
      const allowedRatings = ratingOrder.slice(0, maxIndex + 1);
      conditions.push(inArray(interactionPoses.rating, allowedRatings));
    }

    // Character count filter
    if (options.characterCount !== undefined) {
      conditions.push(eq(interactionPoses.characterCount, options.characterCount));
    }

    // Text search
    if (options.search) {
      conditions.push(like(interactionPoses.name, `%${options.search}%`));
    }

    // Builtin filter
    if (options.includeBuiltin === false) {
      conditions.push(eq(interactionPoses.isBuiltin, false));
    }

    let query = this.db.select().from(interactionPoses);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Apply ordering by category then name
    query = query.orderBy(interactionPoses.category, interactionPoses.name) as typeof query;

    // Apply limit and offset
    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    const results = await query;

    // Post-filter by tags if specified (JSON array filtering)
    if (options.tags && options.tags.length > 0) {
      return results.filter((pose) =>
        options.tags!.some((tag) => pose.tags.includes(tag))
      );
    }

    return results;
  }

  /**
   * Update an interaction pose
   */
  async update(
    id: string,
    options: UpdateInteractionPoseOptions
  ): Promise<InteractionPose | null> {
    const updateData: Partial<NewInteractionPose> = {
      updatedAt: new Date(),
    };

    if (options.displayName !== undefined) updateData.displayName = options.displayName;
    if (options.description !== undefined) updateData.description = options.description;
    if (options.category !== undefined) updateData.category = options.category;
    if (options.characterCount !== undefined)
      updateData.characterCount = options.characterCount;
    if (options.poseDefinitions !== undefined)
      updateData.poseDefinitions = options.poseDefinitions;
    if (options.referenceImages !== undefined)
      updateData.referenceImages = options.referenceImages;
    if (options.gligenBoxes !== undefined) updateData.gligenBoxes = options.gligenBoxes;
    if (options.promptFragment !== undefined)
      updateData.promptFragment = options.promptFragment;
    if (options.negativeFragment !== undefined)
      updateData.negativeFragment = options.negativeFragment;
    if (options.tags !== undefined) updateData.tags = options.tags;
    if (options.rating !== undefined) updateData.rating = options.rating;

    const [updated] = await this.db
      .update(interactionPoses)
      .set(updateData)
      .where(eq(interactionPoses.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete an interaction pose
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(interactionPoses)
      .where(eq(interactionPoses.id, id))
      .returning({ id: interactionPoses.id });

    return result.length > 0;
  }

  /**
   * Apply an interaction pose to a generation
   *
   * Maps characters to positions and returns the prompt fragments + GLIGEN boxes
   */
  applyPose(
    pose: InteractionPose,
    characterMapping: Map<string, "character_a" | "character_b" | "character_c">
  ): ApplyInteractionPoseResult {
    const poseDescriptions = new Map<string, string>();

    // Build pose descriptions for each character
    for (const [characterId, position] of characterMapping) {
      const definition = pose.poseDefinitions.find((d) => d.position === position);
      if (definition) {
        poseDescriptions.set(characterId, definition.poseDescription);
      }
    }

    return {
      promptFragment: pose.promptFragment,
      negativeFragment: pose.negativeFragment ?? "",
      gligenBoxes: pose.gligenBoxes ?? null,
      poseDescriptions,
    };
  }

  /**
   * Increment usage count for a pose
   */
  async recordUsage(id: string): Promise<void> {
    await this.db
      .update(interactionPoses)
      .set({
        usageCount: sql`${interactionPoses.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(interactionPoses.id, id));
  }

  /**
   * Get popular poses by usage count
   */
  async getPopular(limit: number = 10): Promise<InteractionPose[]> {
    return this.db
      .select()
      .from(interactionPoses)
      .orderBy(sql`${interactionPoses.usageCount} DESC`)
      .limit(limit);
  }

  /**
   * Get all available categories
   */
  getCategories(): readonly InteractionCategory[] {
    return INTERACTION_CATEGORIES;
  }

  /**
   * Get all available ratings
   */
  getRatings(): readonly ContentRating[] {
    return CONTENT_RATINGS;
  }

  /**
   * Check if a pose name is available
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const existing = await this.getByName(name);
    return existing === null;
  }

  /**
   * Seed default poses (called during initialization)
   */
  async seedDefaults(presets: CreateInteractionPoseOptions[]): Promise<number> {
    let seeded = 0;

    for (const preset of presets) {
      const existing = await this.getByName(preset.name);
      if (!existing) {
        await this.create({ ...preset, isBuiltin: true });
        seeded++;
      }
    }

    return seeded;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: InteractionPoseService | null = null;

export function getInteractionPoseService(): InteractionPoseService {
  if (!instance) {
    instance = new InteractionPoseService();
  }
  return instance;
}

export function resetInteractionPoseService(): void {
  instance = null;
}
