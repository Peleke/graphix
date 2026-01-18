/**
 * Project Bootstrap Service
 *
 * Creates projects from chat session data. This is the final step
 * of the chat-to-start flow, taking gathered information and
 * creating all the necessary database records.
 *
 * Usage:
 * ```ts
 * const bootstrapService = new ProjectBootstrapService();
 * const result = await bootstrapService.bootstrapFromSession(sessionId);
 * ```
 */

import { getDefaultDatabase, hasDefaultDatabase, type Database } from "../db/client.js";
import {
  chatThreads,
  type ChatWorkingMemory,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getChatAgentService, type ChatAgentService } from "./chat-agent.service.js";
import { ProjectService } from "./project.service.js";
import { CharacterService } from "./character.service.js";
import { StoryboardService } from "./storyboard.service.js";
import { canCreateProject } from "../agents/project-creation.agent.js";

// =============================================================================
// Types
// =============================================================================

export interface BootstrapInput {
  /** Project name (required) */
  name: string;
  /** Project description */
  description?: string;
  /** Characters to create */
  characters: Array<{
    name: string;
    description?: string;
    visualTraits?: {
      species?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accessories?: string[];
    };
  }>;
  /** Story setting */
  setting?: string;
  /** Initial storyboard name */
  storyboardName?: string;
  /** Visual style */
  style?: string;
  /** Target page count */
  pageCount?: number;
}

export interface BootstrapResult {
  projectId: string;
  projectName: string;
  characterIds: string[];
  storyboardId?: string;
  message: string;
}

export interface BootstrapValidation {
  valid: boolean;
  errors: string[];
  input?: BootstrapInput;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class ProjectBootstrapService {
  private db: Database | null = null;
  private projectService: ProjectService;
  private characterService: CharacterService;
  private storyboardService: StoryboardService;
  private chatService: ChatAgentService;

  constructor(db?: Database) {
    this.db = db ?? (hasDefaultDatabase() ? getDefaultDatabase() : null);
    this.projectService = new ProjectService(this.db ?? undefined);
    this.characterService = new CharacterService(this.db ?? undefined);
    this.storyboardService = new StoryboardService(this.db ?? undefined);
    this.chatService = getChatAgentService();
  }

  // ---------------------------------------------------------------------------
  // Main Bootstrap Methods
  // ---------------------------------------------------------------------------

  /**
   * Bootstrap a project from a chat session's gathered data.
   */
  async bootstrapFromSession(sessionId: string): Promise<BootstrapResult> {
    // Get session
    const session = await this.chatService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Validate gathered data
    const validation = this.validateWorkingMemory(session.workingMemory);
    if (!validation.valid || !validation.input) {
      throw new Error(`Cannot bootstrap: ${validation.errors.join(", ")}`);
    }

    // Create the project
    const result = await this.bootstrap(validation.input);

    // Update session with project link
    if (this.db) {
      await this.db
        .update(chatThreads)
        .set({
          projectId: result.projectId,
          status: "completed",
        })
        .where(eq(chatThreads.id, sessionId));
    }

    return result;
  }

  /**
   * Bootstrap a project from explicit input data.
   */
  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    // Validate input
    if (!input.name?.trim()) {
      throw new Error("Project name is required");
    }
    if (!input.characters || input.characters.length === 0) {
      throw new Error("At least one character is required");
    }

    // Create project
    const project = await this.projectService.create({
      name: input.name.trim(),
      description: input.description?.trim(),
    });

    // Create characters
    const characterIds: string[] = [];
    for (const char of input.characters) {
      const profile = {
        species: char.visualTraits?.species ?? "unknown",
        bodyType: "standard",
        features: char.description ? [char.description] : [],
        ageDescriptors: [],
        clothing: [],
        distinguishing: char.visualTraits?.accessories ?? [],
      };

      const promptFragments = this.buildPromptFragments(char);

      const character = await this.characterService.create({
        projectId: project.id,
        name: char.name.trim(),
        profile,
        promptFragments,
      });

      characterIds.push(character.id);
    }

    // Create storyboard if requested
    let storyboardId: string | undefined;
    if (input.storyboardName || input.setting) {
      const storyboard = await this.storyboardService.create({
        projectId: project.id,
        name: input.storyboardName?.trim() ?? "Main Story",
        description: input.setting?.trim() ?? "",
      });
      storyboardId = storyboard.id;
    }

    return {
      projectId: project.id,
      projectName: input.name,
      characterIds,
      storyboardId,
      message: `Created project "${input.name}" with ${characterIds.length} character(s)${storyboardId ? " and initial storyboard" : ""}.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate that a chat session has enough data to bootstrap.
   */
  validateSession(session: { workingMemory: ChatWorkingMemory }): BootstrapValidation {
    return this.validateWorkingMemory(session.workingMemory);
  }

  /**
   * Validate working memory for bootstrap.
   */
  validateWorkingMemory(memory: ChatWorkingMemory): BootstrapValidation {
    const errors: string[] = [];
    const gathered = memory.gathered;

    // Check if we can create (has minimum requirements)
    if (!canCreateProject(memory)) {
      errors.push("Not enough information gathered");
    }

    // Extract project name from concept or use default
    let name = "New Project";
    if (gathered.concept) {
      // Try to extract a name from the concept
      name = this.extractProjectName(gathered.concept);
    }

    // Validate characters
    const characters = gathered.characters ?? [];
    if (characters.length === 0) {
      errors.push("At least one character is required");
    }

    // Check for duplicate character names
    const charNames = new Set<string>();
    for (const char of characters) {
      const lowerName = char.name.toLowerCase();
      if (charNames.has(lowerName)) {
        errors.push(`Duplicate character name: ${char.name}`);
      }
      charNames.add(lowerName);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Build valid input
    const input: BootstrapInput = {
      name,
      description: gathered.concept,
      characters: characters.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      setting: gathered.setting,
      storyboardName: gathered.setting ? "Main Story" : undefined,
      style: gathered.style,
      pageCount: gathered.pageCount,
    };

    return { valid: true, errors: [], input };
  }

  /**
   * Check if a session can be bootstrapped.
   */
  async canBootstrap(sessionId: string): Promise<{ canBootstrap: boolean; reason?: string }> {
    const session = await this.chatService.getSession(sessionId);
    if (!session) {
      return { canBootstrap: false, reason: "Session not found" };
    }

    const validation = this.validateWorkingMemory(session.workingMemory);
    if (!validation.valid) {
      return { canBootstrap: false, reason: validation.errors.join(", ") };
    }

    return { canBootstrap: true };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract a project name from a concept string.
   */
  private extractProjectName(concept: string): string {
    // Try to find a title-like phrase
    const titleMatch = concept.match(/(?:called|titled|named)\s+["']?([^"'.]+)["']?/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Use first significant words
    const words = concept.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      return words.slice(0, 3).join(" ");
    }

    return "New Project";
  }

  /**
   * Build prompt fragments for character image generation.
   */
  private buildPromptFragments(char: {
    name: string;
    description?: string;
    visualTraits?: {
      species?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accessories?: string[];
    };
  }): {
    positive: string;
    negative: string;
    triggers: string[];
  } {
    const positiveParts: string[] = [];
    const triggers: string[] = [];

    // Add name as trigger
    triggers.push(char.name.toLowerCase().replace(/\s+/g, "_"));

    // Add visual traits
    if (char.visualTraits) {
      if (char.visualTraits.species) {
        positiveParts.push(char.visualTraits.species);
      }
      if (char.visualTraits.primaryColor) {
        positiveParts.push(`${char.visualTraits.primaryColor} fur`);
      }
      if (char.visualTraits.secondaryColor) {
        positiveParts.push(`${char.visualTraits.secondaryColor} accents`);
      }
      if (char.visualTraits.accessories) {
        positiveParts.push(...char.visualTraits.accessories);
      }
    }

    // Add description keywords
    if (char.description) {
      const descriptors = char.description
        .toLowerCase()
        .split(/[,.]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && s.length < 50);
      positiveParts.push(...descriptors.slice(0, 5));
    }

    // Default negative prompts
    const negative = "bad anatomy, blurry, low quality, distorted face, extra limbs";

    return {
      positive: positiveParts.join(", "),
      negative,
      triggers,
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

let instance: ProjectBootstrapService | null = null;

/**
 * Get or create the ProjectBootstrapService singleton.
 */
export function getProjectBootstrapService(): ProjectBootstrapService {
  if (!instance) {
    instance = new ProjectBootstrapService();
  }
  return instance;
}

/**
 * Create a new ProjectBootstrapService instance (non-singleton).
 */
export function createProjectBootstrapService(db?: Database): ProjectBootstrapService {
  return new ProjectBootstrapService(db);
}

/**
 * Reset the singleton (for testing).
 */
export function resetProjectBootstrapService(): void {
  instance = null;
}
