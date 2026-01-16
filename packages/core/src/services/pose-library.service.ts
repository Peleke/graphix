/**
 * Pose Library Service
 *
 * Extract, store, and apply pose skeletons from generated images.
 * Uses ControlNet preprocessing to extract OpenPose skeletons.
 */

import { eq, and, like, inArray, desc, sql } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  poseLibrary,
  expressionLibrary,
  projects,
  characters,
  generatedImages,
  type PoseLibraryEntry,
  type NewPoseLibraryEntry,
  type PoseData,
  type ExpressionLibraryEntry,
  type NewExpressionLibraryEntry,
  type ExpressionData,
} from "../db/index.js";
import { getControlNetStack, type ControlType } from "../generation/controlnet-stack.js";
import type { GenerationResult } from "../generation/comfyui-client.js";
import * as path from "path";
import * as fs from "fs/promises";

// Valid pose categories
export const POSE_CATEGORIES = ["standing", "sitting", "action", "lying", "kneeling", "custom"] as const;
export type PoseCategory = (typeof POSE_CATEGORIES)[number];

// Common expression names
export const EXPRESSION_NAMES = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "disgusted",
  "fearful",
  "smirk",
  "ahegao",
  "blushing",
  "crying",
  "laughing",
  "thinking",
  "sleeping",
  "wink",
  "custom",
] as const;
export type ExpressionName = (typeof EXPRESSION_NAMES)[number];

export interface ExtractPoseOptions {
  sourceGenerationId: string;
  outputDir: string;
  detectHands?: boolean;
  detectFace?: boolean;
}

export interface ExtractExpressionOptions {
  sourceGenerationId: string;
  characterId: string;
  outputDir: string;
  cropFace?: boolean;
}

export class PoseLibraryService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  // ============================================================================
  // POSE LIBRARY METHODS
  // ============================================================================

  /**
   * Extract pose from a generated image using OpenPose
   */
  async extractPose(options: ExtractPoseOptions): Promise<{
    skeletonPath: string;
    poseData?: PoseData;
  }> {
    // Get source generation
    const [generation] = await this.db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.id, options.sourceGenerationId));

    if (!generation) {
      throw new Error(`Generation not found: ${options.sourceGenerationId}`);
    }

    // Generate output path for skeleton
    const timestamp = Date.now();
    const skeletonPath = path.join(options.outputDir, `pose_${timestamp}.png`);

    // Ensure output directory exists
    await fs.mkdir(options.outputDir, { recursive: true });

    // Use ControlNet preprocessing to extract OpenPose skeleton
    const stack = getControlNetStack();
    const result = await stack.preprocess(generation.localPath, "openpose", skeletonPath, {
      detectHands: options.detectHands ?? true,
      detectFace: options.detectFace ?? true,
    });

    if (!result.success) {
      throw new Error(`Failed to extract pose: ${result.error}`);
    }

    // TODO: Parse OpenPose JSON output if available to get keypoint data
    // For now, we just store the skeleton image path
    const poseData: PoseData = {
      keypoints: [], // Would be populated from OpenPose JSON
      boundingBox: { x: 0, y: 0, width: generation.width, height: generation.height },
      hasHands: options.detectHands ?? true,
      hasFace: options.detectFace ?? true,
      format: "openpose",
    };

    return {
      skeletonPath: result.localPath ?? skeletonPath,
      poseData,
    };
  }

  /**
   * Save extracted pose to library
   */
  async savePose(data: {
    projectId: string;
    name: string;
    description?: string;
    category: PoseCategory;
    skeletonPath: string;
    sourceGenerationId?: string;
    poseData?: PoseData;
    tags?: string[];
  }): Promise<PoseLibraryEntry> {
    // Validate project exists
    const [project] = await this.db.select().from(projects).where(eq(projects.id, data.projectId));
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    // Validate category
    if (!POSE_CATEGORIES.includes(data.category)) {
      throw new Error(`Invalid pose category. Must be one of: ${POSE_CATEGORIES.join(", ")}`);
    }

    // Validate name
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Pose name is required");
    }
    if (name.length > 100) {
      throw new Error("Pose name must be 100 characters or less");
    }

    const now = new Date();
    const [pose] = await this.db
      .insert(poseLibrary)
      .values({
        projectId: data.projectId,
        name,
        description: data.description ?? "",
        category: data.category,
        skeletonPath: data.skeletonPath,
        sourceGenerationId: data.sourceGenerationId ?? null,
        poseData: data.poseData ?? null,
        tags: data.tags ?? [],
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return pose;
  }

  /**
   * Extract and save pose in one step
   */
  async extractAndSavePose(data: {
    projectId: string;
    name: string;
    description?: string;
    category: PoseCategory;
    sourceGenerationId: string;
    outputDir: string;
    tags?: string[];
    detectHands?: boolean;
    detectFace?: boolean;
  }): Promise<PoseLibraryEntry> {
    const { skeletonPath, poseData } = await this.extractPose({
      sourceGenerationId: data.sourceGenerationId,
      outputDir: data.outputDir,
      detectHands: data.detectHands,
      detectFace: data.detectFace,
    });

    return this.savePose({
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      category: data.category,
      skeletonPath,
      sourceGenerationId: data.sourceGenerationId,
      poseData,
      tags: data.tags,
    });
  }

  /**
   * Get pose by ID
   */
  async getPoseById(id: string): Promise<PoseLibraryEntry | null> {
    if (!id) return null;
    const [pose] = await this.db.select().from(poseLibrary).where(eq(poseLibrary.id, id));
    return pose ?? null;
  }

  /**
   * List poses for a project
   */
  async listPoses(
    projectId: string,
    options?: {
      category?: PoseCategory;
      tags?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<PoseLibraryEntry[]> {
    // Build conditions
    const conditions = options?.category
      ? and(eq(poseLibrary.projectId, projectId), eq(poseLibrary.category, options.category))
      : eq(poseLibrary.projectId, projectId);

    const poses = await this.db
      .select()
      .from(poseLibrary)
      .where(conditions)
      .orderBy(desc(poseLibrary.usageCount), desc(poseLibrary.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);

    // Filter by tags if provided (post-query filter since JSON)
    if (options?.tags && options.tags.length > 0) {
      return poses.filter((p) => options.tags!.some((tag) => p.tags.includes(tag)));
    }

    return poses;
  }

  /**
   * Update pose
   */
  async updatePose(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: PoseCategory;
      tags?: string[];
    }
  ): Promise<PoseLibraryEntry> {
    const existing = await this.getPoseById(id);
    if (!existing) {
      throw new Error(`Pose not found: ${id}`);
    }

    const updates: Partial<NewPoseLibraryEntry> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error("Pose name is required");
      if (name.length > 100) throw new Error("Pose name must be 100 characters or less");
      updates.name = name;
    }

    if (data.description !== undefined) {
      updates.description = data.description;
    }

    if (data.category !== undefined) {
      if (!POSE_CATEGORIES.includes(data.category)) {
        throw new Error(`Invalid pose category. Must be one of: ${POSE_CATEGORIES.join(", ")}`);
      }
      updates.category = data.category;
    }

    if (data.tags !== undefined) {
      updates.tags = data.tags;
    }

    const [updated] = await this.db.update(poseLibrary).set(updates).where(eq(poseLibrary.id, id)).returning();

    return updated;
  }

  /**
   * Increment usage count when pose is applied
   */
  async incrementPoseUsage(id: string): Promise<void> {
    await this.db
      .update(poseLibrary)
      .set({
        usageCount: sql`${poseLibrary.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(poseLibrary.id, id));
  }

  /**
   * Delete pose
   */
  async deletePose(id: string): Promise<void> {
    const existing = await this.getPoseById(id);
    if (!existing) {
      throw new Error(`Pose not found: ${id}`);
    }

    // Optionally delete the skeleton file
    try {
      await fs.unlink(existing.skeletonPath);
    } catch {
      // File may not exist, ignore
    }

    await this.db.delete(poseLibrary).where(eq(poseLibrary.id, id));
  }

  // ============================================================================
  // EXPRESSION LIBRARY METHODS
  // ============================================================================

  /**
   * Save expression to library
   */
  async saveExpression(data: {
    characterId: string;
    name: string;
    description?: string;
    referencePath: string;
    sourceGenerationId?: string;
    expressionData?: ExpressionData;
    promptFragment: string;
    intensity?: number;
  }): Promise<ExpressionLibraryEntry> {
    // Validate character exists
    const [character] = await this.db.select().from(characters).where(eq(characters.id, data.characterId));
    if (!character) {
      throw new Error(`Character not found: ${data.characterId}`);
    }

    // Validate name
    const name = data.name?.trim().toLowerCase();
    if (!name) {
      throw new Error("Expression name is required");
    }
    if (name.length > 50) {
      throw new Error("Expression name must be 50 characters or less");
    }

    // Validate intensity
    const intensity = data.intensity ?? 5;
    if (intensity < 1 || intensity > 10) {
      throw new Error("Intensity must be between 1 and 10");
    }

    const now = new Date();
    const [expression] = await this.db
      .insert(expressionLibrary)
      .values({
        characterId: data.characterId,
        name,
        description: data.description ?? "",
        referencePath: data.referencePath,
        sourceGenerationId: data.sourceGenerationId ?? null,
        expressionData: data.expressionData ?? null,
        promptFragment: data.promptFragment,
        intensity,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return expression;
  }

  /**
   * Get expression by ID
   */
  async getExpressionById(id: string): Promise<ExpressionLibraryEntry | null> {
    if (!id) return null;
    const [expression] = await this.db.select().from(expressionLibrary).where(eq(expressionLibrary.id, id));
    return expression ?? null;
  }

  /**
   * List expressions for a character
   */
  async listExpressions(
    characterId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ExpressionLibraryEntry[]> {
    return this.db
      .select()
      .from(expressionLibrary)
      .where(eq(expressionLibrary.characterId, characterId))
      .orderBy(desc(expressionLibrary.usageCount), expressionLibrary.name)
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);
  }

  /**
   * Get expression by name for a character
   */
  async getExpressionByName(characterId: string, name: string): Promise<ExpressionLibraryEntry | null> {
    const [expression] = await this.db
      .select()
      .from(expressionLibrary)
      .where(and(eq(expressionLibrary.characterId, characterId), eq(expressionLibrary.name, name.toLowerCase())));

    return expression ?? null;
  }

  /**
   * Update expression
   */
  async updateExpression(
    id: string,
    data: {
      name?: string;
      description?: string;
      promptFragment?: string;
      intensity?: number;
    }
  ): Promise<ExpressionLibraryEntry> {
    const existing = await this.getExpressionById(id);
    if (!existing) {
      throw new Error(`Expression not found: ${id}`);
    }

    const updates: Partial<NewExpressionLibraryEntry> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim().toLowerCase();
      if (!name) throw new Error("Expression name is required");
      if (name.length > 50) throw new Error("Expression name must be 50 characters or less");
      updates.name = name;
    }

    if (data.description !== undefined) {
      updates.description = data.description;
    }

    if (data.promptFragment !== undefined) {
      updates.promptFragment = data.promptFragment;
    }

    if (data.intensity !== undefined) {
      if (data.intensity < 1 || data.intensity > 10) {
        throw new Error("Intensity must be between 1 and 10");
      }
      updates.intensity = data.intensity;
    }

    const [updated] = await this.db
      .update(expressionLibrary)
      .set(updates)
      .where(eq(expressionLibrary.id, id))
      .returning();

    return updated;
  }

  /**
   * Increment usage count when expression is applied
   */
  async incrementExpressionUsage(id: string): Promise<void> {
    await this.db
      .update(expressionLibrary)
      .set({
        usageCount: sql`${expressionLibrary.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(expressionLibrary.id, id));
  }

  /**
   * Delete expression
   */
  async deleteExpression(id: string): Promise<void> {
    const existing = await this.getExpressionById(id);
    if (!existing) {
      throw new Error(`Expression not found: ${id}`);
    }

    // Optionally delete the reference file
    try {
      await fs.unlink(existing.referencePath);
    } catch {
      // File may not exist, ignore
    }

    await this.db.delete(expressionLibrary).where(eq(expressionLibrary.id, id));
  }
}

// Singleton instance
let instance: PoseLibraryService | null = null;

export function getPoseLibraryService(): PoseLibraryService {
  if (!instance) {
    instance = new PoseLibraryService();
  }
  return instance;
}

export function resetPoseLibraryService(): void {
  instance = null;
}
