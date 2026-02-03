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
  type BeatType,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getChatAgentService, type ChatAgentService } from "./chat-agent.service.js";
import { ProjectService } from "./project.service.js";
import { CharacterService } from "./character.service.js";
import { StoryboardService } from "./storyboard.service.js";
import { getNarrativeService, type NarrativeService } from "./narrative.service.js";
import { canCreateProject } from "../agents/project-creation.agent.js";
import type {
  ExtractedCharacter,
  ExtractedSetting,
  ExtractedStoryArc,
  StoryStructure,
  BootstrapResult as ChatBootstrapResult,
} from "./chat/chat.types.js";

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
// Enhanced Bootstrap Types (Phase 1 Extraction-based)
// =============================================================================

export interface EnhancedBootstrapInput {
  /** Project name (required) */
  name: string;
  /** Project description */
  description?: string;
  /** Extracted characters from chat */
  characters: ExtractedCharacter[];
  /** Extracted setting */
  setting?: ExtractedSetting | null;
  /** Extracted story arc with beats */
  arc: ExtractedStoryArc;
  /** Visual style */
  style?: string;
  /** Target page count */
  pageCount?: number;
}

export interface EnhancedBootstrapResult {
  project: { id: string; name: string };
  premise: { id: string; logline: string };
  story: { id: string; structure: StoryStructure };
  storyboards: Array<{ id: string; name: string; actIndex: number }>;
  beats: Array<{ id: string; type: BeatType; panelId: string | null }>;
  panels: Array<{ id: string; beatId: string; storyboardId: string }>;
  characters: Array<{ id: string; name: string }>;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class ProjectBootstrapService {
  private db: Database | null = null;
  private projectService: ProjectService;
  private characterService: CharacterService;
  private storyboardService: StoryboardService;
  private narrativeService: NarrativeService;
  private chatService: ChatAgentService;

  constructor(db?: Database) {
    this.db = db ?? (hasDefaultDatabase() ? getDefaultDatabase() : null);
    this.projectService = new ProjectService(this.db ?? undefined);
    this.characterService = new CharacterService(this.db ?? undefined);
    this.storyboardService = new StoryboardService(this.db ?? undefined);
    this.narrativeService = getNarrativeService();
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

    // Debug: log working memory
    console.log("[Bootstrap] Working memory:", JSON.stringify(session.workingMemory, null, 2));

    // Validate gathered data
    const validation = this.validateWorkingMemory(session.workingMemory);
    console.log("[Bootstrap] Validation result:", JSON.stringify(validation, null, 2));

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
        bodyType: "average",
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
  // Enhanced Bootstrap (Phase 1 Extraction-based)
  // ---------------------------------------------------------------------------

  /**
   * Bootstrap a complete project from enhanced extraction data.
   * Creates: Project → Characters → Premise → Story → Storyboards (per act) → Beats → Panels
   */
  async bootstrapFromExtraction(input: EnhancedBootstrapInput): Promise<EnhancedBootstrapResult> {
    // Validate required fields
    if (!input.name?.trim()) {
      throw new Error("Project name is required");
    }
    if (!input.arc?.premise?.logline) {
      throw new Error("Story arc with premise is required");
    }

    // 1. Create project
    const project = await this.projectService.create({
      name: input.name.trim(),
      description: input.description?.trim() || input.arc.premise.logline,
    });

    // 2. Create characters with enhanced visual traits
    const createdCharacters: Array<{ id: string; name: string }> = [];
    const characterIdMap = new Map<string, string>(); // name -> id

    for (const char of input.characters) {
      const profile = {
        species: char.species ?? "human",
        bodyType: "average",
        features: [char.visualDescription],
        ageDescriptors: [],
        clothing: [],
        distinguishing: [],
      };

      const promptFragments = {
        positive: char.visualDescription,
        negative: "bad anatomy, blurry, low quality, distorted face, extra limbs",
        triggers: [char.name.toLowerCase().replace(/\s+/g, "_")],
      };

      const character = await this.characterService.create({
        projectId: project.id,
        name: char.name.trim(),
        profile,
        promptFragments,
      });

      createdCharacters.push({ id: character.id, name: character.name });
      characterIdMap.set(char.name.toLowerCase(), character.id);
    }

    // 3. Create premise from extracted arc
    const premise = await this.narrativeService.createPremise({
      projectId: project.id,
      logline: input.arc.premise.logline,
      genre: input.arc.premise.genre,
      tone: input.arc.premise.tone,
      themes: input.arc.premise.themes,
      setting: input.setting?.location || input.arc.premise.setting,
      characterIds: createdCharacters.map(c => c.id),
      generatedBy: "chat-extraction",
      status: "approved",
    });

    // 4. Create story linked to premise
    const story = await this.narrativeService.createStory({
      premiseId: premise.id,
      title: input.name.trim(),
      synopsis: input.arc.premise.logline,
      targetLength: input.pageCount ?? input.arc.beats.length,
      structure: input.arc.structure,
      generatedBy: "chat-extraction",
      status: "draft",
    });

    // 5. Create storyboards (one per act)
    const createdStoryboards: Array<{ id: string; name: string; actIndex: number }> = [];
    const storyboardByAct = new Map<number, string>(); // actIndex -> storyboardId

    for (let i = 0; i < input.arc.acts.length; i++) {
      const actName = input.arc.acts[i];
      const storyboard = await this.storyboardService.create({
        projectId: project.id,
        name: actName,
        description: `Act ${i + 1}: ${actName}`,
      });
      createdStoryboards.push({ id: storyboard.id, name: actName, actIndex: i });
      storyboardByAct.set(i, storyboard.id);
    }

    // Ensure at least one storyboard exists
    if (createdStoryboards.length === 0) {
      const defaultStoryboard = await this.storyboardService.create({
        projectId: project.id,
        name: "Main Story",
        description: input.arc.premise.logline,
      });
      createdStoryboards.push({ id: defaultStoryboard.id, name: "Main Story", actIndex: 0 });
      storyboardByAct.set(0, defaultStoryboard.id);
    }

    // 6. Create beats from extracted arc beats
    const beatInputs = input.arc.beats.map((beat, index) => ({
      position: index,
      actNumber: beat.actIndex + 1, // 1-indexed
      beatType: beat.type as BeatType,
      visualDescription: beat.visualDescription,
      narrativeContext: beat.summary,
      emotionalTone: beat.emotionalTone,
      characterIds: beat.involvedCharacters
        .map(name => characterIdMap.get(name.toLowerCase()))
        .filter((id): id is string => id !== undefined),
      cameraAngle: beat.cameraAngle,
      narration: beat.narration,
      sfx: beat.sfx,
      generatedBy: "chat-extraction",
    }));

    const createdBeats = await this.narrativeService.createBeats(story.id, beatInputs);

    // 7. Convert beats to panels (link to appropriate storyboard by act)
    const createdPanels: Array<{ id: string; beatId: string; storyboardId: string }> = [];
    const beatResults: Array<{ id: string; type: BeatType; panelId: string | null }> = [];

    for (const beat of createdBeats) {
      const actIndex = (beat.actNumber ?? 1) - 1; // Convert back to 0-indexed
      const storyboardId = storyboardByAct.get(actIndex) ?? storyboardByAct.get(0)!;

      try {
        const { panelId } = await this.narrativeService.convertBeatToPanel(beat.id, storyboardId);
        createdPanels.push({ id: panelId, beatId: beat.id, storyboardId });
        beatResults.push({ id: beat.id, type: beat.beatType as BeatType, panelId });
      } catch (error) {
        // Log but continue - some beats may fail to convert
        console.warn(`Failed to convert beat ${beat.id} to panel:`, error);
        beatResults.push({ id: beat.id, type: beat.beatType as BeatType, panelId: null });
      }
    }

    return {
      project: { id: project.id, name: project.name },
      premise: { id: premise.id, logline: premise.logline },
      story: { id: story.id, structure: input.arc.structure },
      storyboards: createdStoryboards,
      beats: beatResults,
      panels: createdPanels,
      characters: createdCharacters,
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

    // Extract project name from concept or use default
    let name = "New Project";
    if (gathered.concept) {
      // Try to extract a name from the concept
      name = this.extractProjectName(gathered.concept);
    }

    // Validate characters - auto-create default if skipped
    let characters = gathered.characters ?? [];
    if (characters.length === 0) {
      // Try to extract character names from concept/arc if user skipped character phase
      const extractedNames = this.extractCharacterNamesFromText(
        [gathered.concept, gathered.arc, gathered.setting].filter(Boolean).join(" ")
      );
      if (extractedNames.length > 0) {
        characters = extractedNames.map(name => ({ name }));
      } else {
        // Create default character so project creation can proceed
        characters = [{ name: "Main Character" }];
      }
    }

    // Dedupe characters by name (case-insensitive)
    const seenNames = new Set<string>();
    characters = characters.filter(char => {
      const lowerName = char.name.toLowerCase();
      if (seenNames.has(lowerName)) {
        return false;
      }
      seenNames.add(lowerName);
      return true;
    });

    // Need at least a concept to proceed
    if (!gathered.concept) {
      errors.push("A story concept is required");
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
   * Extract character names from text (concept, arc, setting).
   * Looks for capitalized words that look like names.
   */
  private extractCharacterNamesFromText(text: string): string[] {
    if (!text) return [];

    // Common words to skip - includes sentence starters, conjunctions, articles, pronouns
    const skipWords = new Set([
      // Articles and determiners
      'the', 'this', 'that', 'these', 'those', 'some', 'any', 'each', 'every',
      // Conjunctions and connectors
      'and', 'but', 'for', 'nor', 'yet', 'both', 'either', 'neither',
      'also', 'however', 'therefore', 'moreover', 'furthermore', 'meanwhile',
      'although', 'though', 'because', 'since', 'while', 'whereas',
      // Common sentence starters
      'seriously', 'actually', 'basically', 'honestly', 'obviously', 'clearly',
      'certainly', 'definitely', 'probably', 'perhaps', 'maybe', 'unfortunately',
      'fortunately', 'eventually', 'finally', 'suddenly', 'typically', 'usually',
      'sometimes', 'often', 'always', 'never', 'once', 'then', 'now', 'here',
      // Pronouns
      'their', 'they', 'them', 'there', 'your', 'you', 'our', 'ours', 'his', 'her',
      // Verbs and auxiliaries
      'have', 'has', 'had', 'will', 'would', 'could', 'should', 'might', 'must',
      'can', 'does', 'did', 'was', 'were', 'been', 'being', 'are', 'let', 'get',
      // Question words
      'where', 'when', 'what', 'who', 'whom', 'which', 'why', 'how',
      // Negatives and affirmatives
      'not', 'yes', 'okay', 'sure', 'right', 'well',
      // Domain-specific words
      'main', 'character', 'characters', 'story', 'stories', 'comic', 'comics',
      'page', 'pages', 'panel', 'panels', 'style', 'visual', 'anime', 'manga',
      'setting', 'scene', 'chapter', 'art', 'artist',
      // Numbers
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'first', 'second', 'third', 'fourth', 'fifth',
      // Misc common words
      'skip', 'about', 'with', 'from', 'into', 'onto', 'over', 'under',
      'after', 'before', 'between', 'through', 'during', 'within',
      'like', 'just', 'only', 'very', 'really', 'quite', 'rather',
      'something', 'anything', 'everything', 'nothing', 'someone', 'anyone',
    ]);

    // Find capitalized words that look like names
    const namePattern = /\b([A-Z][a-z]{2,})\b/g;
    const matches = text.match(namePattern) || [];

    // Filter and dedupe
    const names = [...new Set(matches)]
      .filter(name => !skipWords.has(name.toLowerCase()))
      .slice(0, 5); // Max 5 characters

    return names;
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
