/**
 * Character Service
 *
 * CRUD operations for characters with profile and prompt fragment management.
 */

import { eq, and } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import {
  characters,
  projects,
  panels,
  type Character,
  type NewCharacter,
  type CharacterProfile,
  type PromptFragments,
  type CharacterLora,
  type Panel,
} from "../db/index.js";

// Default profile structure
const DEFAULT_PROFILE: CharacterProfile = {
  species: "",
  bodyType: "average",
  features: [],
  ageDescriptors: [],
  clothing: [],
  distinguishing: [],
};

// Default prompt fragments
const DEFAULT_FRAGMENTS: PromptFragments = {
  positive: "",
  negative: "",
  triggers: [],
};

// Valid body types
const VALID_BODY_TYPES = ["athletic", "slim", "muscular", "shortstack", "tall", "average"];

export class CharacterService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Create a new character
   */
  async create(data: {
    projectId: string;
    name: string;
    profile?: Partial<CharacterProfile>;
    promptFragments?: Partial<PromptFragments>;
    referenceImages?: string[];
  }): Promise<Character> {
    // Validate project exists
    const [project] = await this.db.select().from(projects).where(eq(projects.id, data.projectId));
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    // Validate name
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Character name is required");
    }
    if (name.length > 100) {
      throw new Error("Character name must be 100 characters or less");
    }

    // Build profile
    const profile: CharacterProfile = {
      ...DEFAULT_PROFILE,
      ...data.profile,
    };
    this.validateProfile(profile);

    // Build prompt fragments
    const promptFragments: PromptFragments = {
      ...DEFAULT_FRAGMENTS,
      ...data.promptFragments,
    };

    // Auto-generate positive prompt if empty
    if (!promptFragments.positive) {
      promptFragments.positive = this.generatePromptFromProfile(profile);
    }

    const now = new Date();
    const [character] = await this.db
      .insert(characters)
      .values({
        projectId: data.projectId,
        name,
        profile,
        promptFragments,
        referenceImages: data.referenceImages ?? [],
        lora: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return character;
  }

  /**
   * Get character by ID
   */
  async getById(id: string): Promise<Character | null> {
    if (!id) return null;

    const result = await this.db.select().from(characters).where(eq(characters.id, id));

    return result[0] ?? null;
  }

  /**
   * Get all characters for a project
   */
  async getByProject(projectId: string): Promise<Character[]> {
    return await this.db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(characters.name);
  }

  /**
   * Update character
   */
  async update(
    id: string,
    data: {
      name?: string;
      profile?: Partial<CharacterProfile>;
      promptFragments?: Partial<PromptFragments>;
    }
  ): Promise<Character> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    const updates: Partial<NewCharacter> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new Error("Character name is required");
      }
      if (name.length > 100) {
        throw new Error("Character name must be 100 characters or less");
      }
      updates.name = name;
    }

    if (data.profile !== undefined) {
      const profile: CharacterProfile = {
        ...existing.profile,
        ...data.profile,
      };
      this.validateProfile(profile);
      updates.profile = profile;
    }

    if (data.promptFragments !== undefined) {
      updates.promptFragments = {
        ...existing.promptFragments,
        ...data.promptFragments,
      };
    }

    const [updated] = await this.db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();

    return updated;
  }

  /**
   * Add reference image
   */
  async addReference(id: string, imagePath: string): Promise<Character> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    if (existing.referenceImages.length >= 10) {
      throw new Error("Maximum 10 reference images allowed");
    }

    if (existing.referenceImages.includes(imagePath)) {
      return existing; // Already exists, no-op
    }

    const [updated] = await this.db
      .update(characters)
      .set({
        referenceImages: [...existing.referenceImages, imagePath],
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    return updated;
  }

  /**
   * Remove reference image
   */
  async removeReference(id: string, imagePath: string): Promise<Character> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    const [updated] = await this.db
      .update(characters)
      .set({
        referenceImages: existing.referenceImages.filter((p) => p !== imagePath),
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    return updated;
  }

  /**
   * Set character LoRA
   */
  async setLora(
    id: string,
    loraData: {
      path: string;
      strength?: number;
      strengthClip?: number;
      trainingImages: number;
    }
  ): Promise<Character> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    const lora: CharacterLora = {
      path: loraData.path,
      strength: loraData.strength ?? 0.7,
      strengthClip: loraData.strengthClip,
      trainedAt: new Date().toISOString(),
      trainingImages: loraData.trainingImages,
    };

    const [updated] = await this.db
      .update(characters)
      .set({
        lora,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    return updated;
  }

  /**
   * Clear character LoRA
   */
  async clearLora(id: string): Promise<Character> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    const [updated] = await this.db
      .update(characters)
      .set({
        lora: null,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete character
   * Also removes character ID from all panels that reference it (cascade)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }

    // Cascade: Remove character ID from all panels that reference it
    // Find all panels that contain this character ID and update them
    const allPanels = await this.db.select().from(panels);
    for (const panel of allPanels) {
      if (panel.characterIds.includes(id)) {
        await this.db
          .update(panels)
          .set({
            characterIds: panel.characterIds.filter((c) => c !== id),
            updatedAt: new Date(),
          })
          .where(eq(panels.id, panel.id));
      }
    }

    await this.db.delete(characters).where(eq(characters.id, id));
  }

  /**
   * Generate prompt from profile
   */
  generatePromptFromProfile(profile: CharacterProfile): string {
    const parts: string[] = [];

    if (profile.species) {
      parts.push(profile.species);
    }

    if (profile.bodyType && profile.bodyType !== "average") {
      parts.push(`${profile.bodyType} build`);
    }

    if (profile.features.length > 0) {
      parts.push(...profile.features);
    }

    if (profile.ageDescriptors.length > 0) {
      parts.push(...profile.ageDescriptors);
    }

    if (profile.clothing.length > 0) {
      parts.push(...profile.clothing);
    }

    if (profile.distinguishing.length > 0) {
      parts.push(...profile.distinguishing);
    }

    return parts.join(", ");
  }

  /**
   * Validate character profile
   */
  private validateProfile(profile: CharacterProfile): void {
    if (!profile.species) {
      throw new Error("Species is required");
    }

    if (profile.bodyType && !VALID_BODY_TYPES.includes(profile.bodyType)) {
      throw new Error(`Invalid body type. Must be one of: ${VALID_BODY_TYPES.join(", ")}`);
    }

    if (profile.features.length > 50) {
      throw new Error("Maximum 50 features allowed");
    }
  }
}

// Singleton instance
let instance: CharacterService | null = null;

export function getCharacterService(): CharacterService {
  if (!instance) {
    instance = new CharacterService();
  }
  return instance;
}

export function resetCharacterService(): void {
  instance = null;
}
