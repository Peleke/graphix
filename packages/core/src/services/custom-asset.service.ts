/**
 * Custom Asset Service
 *
 * Manage project-specific LoRAs and textual inversion embeddings.
 * Provides registration, lookup, and prompt integration for custom assets.
 */

import { eq, and, like, inArray, sql } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  customAssets,
  projects,
  characters,
  type CustomAsset,
  type NewCustomAsset,
} from "../db/index.js";

// ============================================================================
// Types
// ============================================================================

export type AssetType = "lora" | "embedding";

export interface RegisterAssetOptions {
  projectId: string;
  characterId?: string;
  name: string;
  displayName: string;
  description?: string;
  type: AssetType;
  filePath: string;
  triggerWord: string;
  triggerAliases?: string[];
  defaultStrength?: number;
  defaultClipStrength?: number;
  trainedAt?: Date;
  baseModel?: string;
  trainingSteps?: number;
  sourceImages?: string[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateAssetOptions {
  displayName?: string;
  description?: string;
  characterId?: string | null;
  triggerWord?: string;
  triggerAliases?: string[];
  defaultStrength?: number;
  defaultClipStrength?: number;
  baseModel?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  isActive?: boolean;
}

export interface ListAssetsOptions {
  projectId?: string;
  characterId?: string;
  type?: AssetType;
  baseModel?: string;
  tags?: string[];
  search?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface AppliedAsset {
  asset: CustomAsset;
  triggerToInject: string;
  loraConfig?: {
    name: string;
    strengthModel: number;
    strengthClip: number;
  };
}

// ============================================================================
// Service
// ============================================================================

export class CustomAssetService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Register a new custom asset (LoRA or embedding)
   */
  async register(options: RegisterAssetOptions): Promise<CustomAsset> {
    // Validate project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, options.projectId));

    if (!project) {
      throw new Error(`Project not found: ${options.projectId}`);
    }

    // Validate character if provided
    if (options.characterId) {
      const [character] = await this.db
        .select()
        .from(characters)
        .where(eq(characters.id, options.characterId));

      if (!character) {
        throw new Error(`Character not found: ${options.characterId}`);
      }
    }

    const now = new Date();

    const [asset] = await this.db
      .insert(customAssets)
      .values({
        projectId: options.projectId,
        characterId: options.characterId ?? null,
        name: options.name,
        displayName: options.displayName,
        description: options.description ?? "",
        type: options.type,
        filePath: options.filePath,
        triggerWord: options.triggerWord,
        triggerAliases: options.triggerAliases ?? [],
        defaultStrength: options.defaultStrength ?? 1.0,
        defaultClipStrength: options.defaultClipStrength ?? 1.0,
        trainedAt: options.trainedAt ?? null,
        baseModel: options.baseModel ?? null,
        trainingSteps: options.trainingSteps ?? null,
        sourceImages: options.sourceImages ?? null,
        metadata: options.metadata ?? null,
        tags: options.tags ?? [],
        usageCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return asset;
  }

  /**
   * Get an asset by ID
   */
  async getById(id: string): Promise<CustomAsset | null> {
    const [asset] = await this.db
      .select()
      .from(customAssets)
      .where(eq(customAssets.id, id));

    return asset ?? null;
  }

  /**
   * Get an asset by name within a project
   */
  async getByName(projectId: string, name: string): Promise<CustomAsset | null> {
    const [asset] = await this.db
      .select()
      .from(customAssets)
      .where(and(eq(customAssets.projectId, projectId), eq(customAssets.name, name)));

    return asset ?? null;
  }

  /**
   * List assets with filtering
   */
  async list(options: ListAssetsOptions = {}): Promise<CustomAsset[]> {
    const conditions = [];

    if (options.projectId) {
      conditions.push(eq(customAssets.projectId, options.projectId));
    }

    if (options.characterId) {
      conditions.push(eq(customAssets.characterId, options.characterId));
    }

    if (options.type) {
      conditions.push(eq(customAssets.type, options.type));
    }

    if (options.baseModel) {
      conditions.push(eq(customAssets.baseModel, options.baseModel));
    }

    if (options.search) {
      conditions.push(like(customAssets.name, `%${options.search}%`));
    }

    if (options.activeOnly !== false) {
      conditions.push(eq(customAssets.isActive, true));
    }

    let query = this.db.select().from(customAssets);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(customAssets.type, customAssets.name) as typeof query;

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    const results = await query;

    // Post-filter by tags if needed
    if (options.tags && options.tags.length > 0) {
      return results.filter((asset) =>
        options.tags!.some((tag) => asset.tags.includes(tag))
      );
    }

    return results;
  }

  /**
   * Update an asset
   */
  async update(id: string, options: UpdateAssetOptions): Promise<CustomAsset | null> {
    const updateData: Partial<NewCustomAsset> = {
      updatedAt: new Date(),
    };

    if (options.displayName !== undefined) updateData.displayName = options.displayName;
    if (options.description !== undefined) updateData.description = options.description;
    if (options.characterId !== undefined) updateData.characterId = options.characterId;
    if (options.triggerWord !== undefined) updateData.triggerWord = options.triggerWord;
    if (options.triggerAliases !== undefined)
      updateData.triggerAliases = options.triggerAliases;
    if (options.defaultStrength !== undefined)
      updateData.defaultStrength = options.defaultStrength;
    if (options.defaultClipStrength !== undefined)
      updateData.defaultClipStrength = options.defaultClipStrength;
    if (options.baseModel !== undefined) updateData.baseModel = options.baseModel;
    if (options.metadata !== undefined) updateData.metadata = options.metadata;
    if (options.tags !== undefined) updateData.tags = options.tags;
    if (options.isActive !== undefined) updateData.isActive = options.isActive;

    const [updated] = await this.db
      .update(customAssets)
      .set(updateData)
      .where(eq(customAssets.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete an asset
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(customAssets)
      .where(eq(customAssets.id, id))
      .returning({ id: customAssets.id });

    return result.length > 0;
  }

  /**
   * Get assets for a specific character
   */
  async getForCharacter(characterId: string): Promise<CustomAsset[]> {
    return this.db
      .select()
      .from(customAssets)
      .where(
        and(eq(customAssets.characterId, characterId), eq(customAssets.isActive, true))
      )
      .orderBy(customAssets.type);
  }

  /**
   * Apply an asset to a generation
   *
   * Returns the trigger word to inject and LoRA config if applicable.
   * Also records usage.
   */
  async apply(
    assetId: string,
    strengthOverride?: number,
    clipStrengthOverride?: number
  ): Promise<AppliedAsset | null> {
    const asset = await this.getById(assetId);
    if (!asset || !asset.isActive) {
      return null;
    }

    // Record usage
    await this.db
      .update(customAssets)
      .set({
        usageCount: sql`${customAssets.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customAssets.id, assetId));

    const result: AppliedAsset = {
      asset,
      triggerToInject: asset.triggerWord,
    };

    // For LoRAs, also return the configuration
    if (asset.type === "lora") {
      result.loraConfig = {
        name: asset.filePath,
        strengthModel: strengthOverride ?? asset.defaultStrength,
        strengthClip: clipStrengthOverride ?? asset.defaultClipStrength ?? 1.0,
      };
    }

    return result;
  }

  /**
   * Apply multiple assets at once
   */
  async applyMultiple(
    assetIds: string[],
    strengthOverrides?: Map<string, { model?: number; clip?: number }>
  ): Promise<AppliedAsset[]> {
    const results: AppliedAsset[] = [];

    for (const id of assetIds) {
      const overrides = strengthOverrides?.get(id);
      const applied = await this.apply(id, overrides?.model, overrides?.clip);
      if (applied) {
        results.push(applied);
      }
    }

    return results;
  }

  /**
   * Get all triggers that should be injected for a character's assets
   */
  async getCharacterTriggers(characterId: string): Promise<string[]> {
    const assets = await this.getForCharacter(characterId);
    return assets.map((a) => a.triggerWord);
  }

  /**
   * Get LoRA configurations for a character
   */
  async getCharacterLoraStack(
    characterId: string
  ): Promise<Array<{ name: string; strengthModel: number; strengthClip: number }>> {
    const assets = await this.getForCharacter(characterId);
    return assets
      .filter((a) => a.type === "lora")
      .map((a) => ({
        name: a.filePath,
        strengthModel: a.defaultStrength,
        strengthClip: a.defaultClipStrength ?? 1.0,
      }));
  }

  /**
   * Find assets by trigger word (useful for prompt parsing)
   */
  async findByTrigger(
    projectId: string,
    trigger: string
  ): Promise<CustomAsset | null> {
    // First try exact match on triggerWord
    const [exactMatch] = await this.db
      .select()
      .from(customAssets)
      .where(
        and(
          eq(customAssets.projectId, projectId),
          eq(customAssets.triggerWord, trigger),
          eq(customAssets.isActive, true)
        )
      );

    if (exactMatch) {
      return exactMatch;
    }

    // Then check aliases (requires fetching all and filtering)
    const allAssets = await this.db
      .select()
      .from(customAssets)
      .where(
        and(eq(customAssets.projectId, projectId), eq(customAssets.isActive, true))
      );

    return (
      allAssets.find((a) => a.triggerAliases.includes(trigger)) ?? null
    );
  }

  /**
   * Get popular assets by usage
   */
  async getPopular(projectId: string, limit: number = 10): Promise<CustomAsset[]> {
    return this.db
      .select()
      .from(customAssets)
      .where(
        and(eq(customAssets.projectId, projectId), eq(customAssets.isActive, true))
      )
      .orderBy(sql`${customAssets.usageCount} DESC`)
      .limit(limit);
  }

  /**
   * Deactivate an asset instead of deleting it
   */
  async deactivate(id: string): Promise<boolean> {
    const updated = await this.update(id, { isActive: false });
    return updated !== null;
  }

  /**
   * Reactivate a deactivated asset
   */
  async activate(id: string): Promise<boolean> {
    const updated = await this.update(id, { isActive: true });
    return updated !== null;
  }

  /**
   * Check if a name is available within a project
   */
  async isNameAvailable(projectId: string, name: string): Promise<boolean> {
    const existing = await this.getByName(projectId, name);
    return existing === null;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: CustomAssetService | null = null;

export function getCustomAssetService(): CustomAssetService {
  if (!instance) {
    instance = new CustomAssetService();
  }
  return instance;
}

export function resetCustomAssetService(): void {
  instance = null;
}
