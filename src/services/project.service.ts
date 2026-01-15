/**
 * Project Service
 *
 * CRUD operations for projects with validation.
 */

import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client.js";
import { projects, type Project, type NewProject, type ProjectSettings } from "../db/schema.js";

// Default project settings
const DEFAULT_SETTINGS: ProjectSettings = {
  defaultModel: "yiffInHell_yihXXXTended.safetensors",
  defaultLoras: [],
  defaultNegative: "bad quality, blurry, low resolution, watermark, human",
  resolution: { width: 768, height: 1024 },
};

export class ProjectService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Create a new project
   */
  async create(data: {
    name: string;
    description?: string;
    settings?: Partial<ProjectSettings>;
  }): Promise<Project> {
    // Validation
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Project name is required");
    }
    if (name.length > 255) {
      throw new Error("Project name must be 255 characters or less");
    }

    const description = data.description?.trim() ?? "";
    if (description.length > 10000) {
      throw new Error("Project description must be 10000 characters or less");
    }

    // Merge settings with defaults
    const settings: ProjectSettings = {
      ...DEFAULT_SETTINGS,
      ...data.settings,
      resolution: {
        ...DEFAULT_SETTINGS.resolution,
        ...data.settings?.resolution,
      },
    };

    // Validate settings
    this.validateSettings(settings);

    const now = new Date();
    const [project] = await this.db
      .insert(projects)
      .values({
        name,
        description,
        settings,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return project;
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    if (!id) return null;

    const result = await this.db.select().from(projects).where(eq(projects.id, id));

    return result[0] ?? null;
  }

  /**
   * List all projects
   */
  async list(options?: { limit?: number; offset?: number }): Promise<Project[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return await this.db
      .select()
      .from(projects)
      .limit(limit)
      .offset(offset)
      .orderBy(projects.createdAt);
  }

  /**
   * Update project
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      settings?: Partial<ProjectSettings>;
    }
  ): Promise<Project> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updates: Partial<NewProject> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new Error("Project name is required");
      }
      if (name.length > 255) {
        throw new Error("Project name must be 255 characters or less");
      }
      updates.name = name;
    }

    if (data.description !== undefined) {
      const description = data.description.trim();
      if (description.length > 10000) {
        throw new Error("Project description must be 10000 characters or less");
      }
      updates.description = description;
    }

    if (data.settings !== undefined) {
      const mergedSettings: ProjectSettings = {
        ...existing.settings,
        ...data.settings,
        resolution: {
          ...existing.settings?.resolution,
          ...data.settings?.resolution,
        },
      } as ProjectSettings;

      this.validateSettings(mergedSettings);
      updates.settings = mergedSettings;
    }

    const [updated] = await this.db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete project (cascades to characters, storyboards, etc.)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    await this.db.delete(projects).where(eq(projects.id, id));
  }

  /**
   * Validate project settings
   */
  private validateSettings(settings: ProjectSettings): void {
    // Validate model file extension
    if (settings.defaultModel) {
      if (!settings.defaultModel.match(/\.(safetensors|ckpt)$/i)) {
        throw new Error("Model must be a .safetensors or .ckpt file");
      }
    }

    // Validate resolution
    if (settings.resolution) {
      const { width, height } = settings.resolution;

      if (width < 256 || width > 4096) {
        throw new Error("Width must be between 256 and 4096");
      }
      if (height < 256 || height > 4096) {
        throw new Error("Height must be between 256 and 4096");
      }
    }

    // Validate LoRAs
    if (settings.defaultLoras) {
      for (const lora of settings.defaultLoras) {
        if (!lora.name) {
          throw new Error("LoRA name is required");
        }
        if (lora.strength < 0 || lora.strength > 2) {
          throw new Error("LoRA strength must be between 0 and 2");
        }
      }
    }
  }
}

// Singleton instance
let instance: ProjectService | null = null;

export function getProjectService(): ProjectService {
  if (!instance) {
    instance = new ProjectService();
  }
  return instance;
}
