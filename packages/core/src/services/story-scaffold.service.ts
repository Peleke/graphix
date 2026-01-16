/**
 * Story Scaffold Service
 *
 * Creates complete story structures from high-level outlines.
 * Generates storyboards, panels, and panel placeholders based on narrative structure.
 */

import { getDefaultDatabase, type Database } from "../db/index.js";
import { getProjectService } from "./project.service.js";
import { getCharacterService } from "./character.service.js";
import { getStoryboardService } from "./storyboard.service.js";
import { getPanelService } from "./panel.service.js";
import type { Project, Character, Storyboard, Panel, PanelDirection } from "../db/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Panel definition in scaffold input
 */
export interface ScaffoldPanel {
  /** Panel description/prompt */
  description: string;
  /** Characters appearing in this panel (by name) */
  characterNames?: string[];
  /** Direction hints for generation */
  direction?: Partial<PanelDirection>;
}

/**
 * Scene definition in scaffold input
 */
export interface ScaffoldScene {
  /** Scene name/title */
  name: string;
  /** Scene description */
  description?: string;
  /** Panels in this scene */
  panels: ScaffoldPanel[];
}

/**
 * Act definition in scaffold input
 */
export interface ScaffoldAct {
  /** Act name/title */
  name: string;
  /** Act description */
  description?: string;
  /** Scenes in this act */
  scenes: ScaffoldScene[];
}

/**
 * Complete story scaffold input
 */
export interface StoryScaffoldInput {
  /** Project ID to scaffold into */
  projectId: string;
  /** Story title (used for storyboard naming) */
  title: string;
  /** Overall story description */
  description?: string;
  /** Characters referenced in the story (by name) */
  characterNames?: string[];
  /** Story structure organized by acts */
  acts: ScaffoldAct[];
}

/**
 * Result of scaffolding a single scene
 */
export interface ScaffoldedScene {
  name: string;
  storyboardId: string;
  panelCount: number;
  panelIds: string[];
}

/**
 * Result of scaffolding a single act
 */
export interface ScaffoldedAct {
  name: string;
  scenes: ScaffoldedScene[];
}

/**
 * Result of the scaffold operation
 */
export interface StoryScaffoldResult {
  success: boolean;
  projectId: string;
  title: string;
  acts: ScaffoldedAct[];
  totalStoryboards: number;
  totalPanels: number;
  /** Characters that were referenced but not found */
  missingCharacters: string[];
  error?: string;
}

/**
 * Text outline parsing result
 */
export interface ParsedOutline {
  title: string;
  description?: string;
  acts: ScaffoldAct[];
  characterNames: string[];
}

// ============================================================================
// Service
// ============================================================================

/**
 * Story Scaffold Service
 *
 * Provides high-level story creation from structured or text outlines.
 */
export class StoryScaffoldService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Scaffold a complete story structure
   *
   * Creates storyboards and panels based on the input structure.
   * Each scene becomes a storyboard, and panels are created within.
   */
  async scaffold(input: StoryScaffoldInput): Promise<StoryScaffoldResult> {
    const projectService = getProjectService();
    const characterService = getCharacterService();
    const storyboardService = getStoryboardService();
    const panelService = getPanelService();

    try {
      // Verify project exists
      const project = await projectService.getById(input.projectId);
      if (!project) {
        return {
          success: false,
          projectId: input.projectId,
          title: input.title,
          acts: [],
          totalStoryboards: 0,
          totalPanels: 0,
          missingCharacters: [],
          error: `Project not found: ${input.projectId}`,
        };
      }

      // Build character lookup map
      const allCharacters = await characterService.getByProject(input.projectId);
      const characterMap = new Map<string, Character>();
      for (const char of allCharacters) {
        characterMap.set(char.name.toLowerCase(), char);
      }

      // Track missing characters
      const missingCharacters: string[] = [];

      // Process each act
      const scaffoldedActs: ScaffoldedAct[] = [];
      let totalStoryboards = 0;
      let totalPanels = 0;

      for (let actIndex = 0; actIndex < input.acts.length; actIndex++) {
        const act = input.acts[actIndex];
        const scaffoldedScenes: ScaffoldedScene[] = [];

        for (let sceneIndex = 0; sceneIndex < act.scenes.length; sceneIndex++) {
          const scene = act.scenes[sceneIndex];

          // Create storyboard for this scene
          const storyboardName = `${input.title} - ${act.name} - ${scene.name}`;
          const storyboard = await storyboardService.create({
            projectId: input.projectId,
            name: storyboardName,
            description: scene.description || `${act.name}: ${scene.name}`,
          });

          totalStoryboards++;

          // Create panels for this scene
          const panelIds: string[] = [];

          for (let panelIndex = 0; panelIndex < scene.panels.length; panelIndex++) {
            const panelDef = scene.panels[panelIndex];

            // Resolve character IDs
            const characterIds: string[] = [];
            if (panelDef.characterNames) {
              for (const name of panelDef.characterNames) {
                const char = characterMap.get(name.toLowerCase());
                if (char) {
                  characterIds.push(char.id);
                } else if (!missingCharacters.includes(name)) {
                  missingCharacters.push(name);
                }
              }
            }

            // Create panel
            const panel = await panelService.create({
              storyboardId: storyboard.id,
              position: panelIndex + 1,
              description: panelDef.description,
              characterIds,
              direction: panelDef.direction as PanelDirection | undefined,
            });

            panelIds.push(panel.id);
            totalPanels++;
          }

          scaffoldedScenes.push({
            name: scene.name,
            storyboardId: storyboard.id,
            panelCount: panelIds.length,
            panelIds,
          });
        }

        scaffoldedActs.push({
          name: act.name,
          scenes: scaffoldedScenes,
        });
      }

      return {
        success: true,
        projectId: input.projectId,
        title: input.title,
        acts: scaffoldedActs,
        totalStoryboards,
        totalPanels,
        missingCharacters,
      };
    } catch (error) {
      return {
        success: false,
        projectId: input.projectId,
        title: input.title,
        acts: [],
        totalStoryboards: 0,
        totalPanels: 0,
        missingCharacters: [],
        error: error instanceof Error ? error.message : "Scaffold failed",
      };
    }
  }

  /**
   * Parse a text outline into a structured scaffold input
   *
   * Supports markdown-style format:
   * ```
   * # Story Title
   *
   * ## Act 1: Setup
   *
   * ### Scene 1: Introduction
   *
   * - Panel: [ALICE, BOB] Wide shot of the city at dawn
   * - Panel: [ALICE] Close-up of Alice looking worried
   *
   * ### Scene 2: Conflict
   *
   * - Panel: Bob enters dramatically
   * ```
   */
  parseOutline(outline: string): ParsedOutline {
    const lines = outline.split("\n").map((l) => l.trim()).filter((l) => l);

    let title = "Untitled Story";
    let description: string | undefined;
    const acts: ScaffoldAct[] = [];
    const characterNames = new Set<string>();

    let currentAct: ScaffoldAct | null = null;
    let currentScene: ScaffoldScene | null = null;

    for (const line of lines) {
      // Story title (# Title)
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      // Story description (> Description)
      if (line.startsWith("> ")) {
        description = line.slice(2).trim();
        continue;
      }

      // Act (## Act Name)
      if (line.startsWith("## ")) {
        if (currentScene && currentAct) {
          currentAct.scenes.push(currentScene);
        }
        if (currentAct) {
          acts.push(currentAct);
        }

        const actName = line.slice(3).trim();
        currentAct = {
          name: actName,
          scenes: [],
        };
        currentScene = null;
        continue;
      }

      // Scene (### Scene Name)
      if (line.startsWith("### ")) {
        if (currentScene && currentAct) {
          currentAct.scenes.push(currentScene);
        }

        const sceneName = line.slice(4).trim();
        currentScene = {
          name: sceneName,
          panels: [],
        };
        continue;
      }

      // Panel (- Panel: [CHARS] Description)
      if (line.startsWith("- Panel:") || line.startsWith("- ")) {
        const panelText = line.startsWith("- Panel:")
          ? line.slice(8).trim()
          : line.slice(2).trim();

        // Parse character names in brackets [NAME1, NAME2]
        const charMatch = panelText.match(/^\[([^\]]+)\]/);
        const panelCharNames: string[] = [];

        if (charMatch) {
          const names = charMatch[1].split(",").map((n) => n.trim());
          for (const name of names) {
            panelCharNames.push(name);
            characterNames.add(name);
          }
        }

        // Get description (everything after the bracket)
        const description = charMatch
          ? panelText.slice(charMatch[0].length).trim()
          : panelText;

        if (currentScene) {
          currentScene.panels.push({
            description,
            characterNames: panelCharNames.length > 0 ? panelCharNames : undefined,
          });
        }
        continue;
      }
    }

    // Push final scene and act
    if (currentScene && currentAct) {
      currentAct.scenes.push(currentScene);
    }
    if (currentAct) {
      acts.push(currentAct);
    }

    return {
      title,
      description,
      acts,
      characterNames: Array.from(characterNames),
    };
  }

  /**
   * Scaffold from a text outline
   *
   * Parses the outline and creates the full story structure.
   */
  async fromOutline(
    projectId: string,
    outline: string
  ): Promise<StoryScaffoldResult> {
    const parsed = this.parseOutline(outline);

    return this.scaffold({
      projectId,
      title: parsed.title,
      description: parsed.description,
      characterNames: parsed.characterNames,
      acts: parsed.acts,
    });
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: StoryScaffoldService | null = null;

/**
 * Create a new StoryScaffoldService with explicit database injection
 */
export function createStoryScaffoldService(db: Database): StoryScaffoldService {
  return new StoryScaffoldService(db);
}

/**
 * Get the singleton StoryScaffoldService (uses default database)
 */
export function getStoryScaffoldService(): StoryScaffoldService {
  if (!instance) {
    instance = new StoryScaffoldService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetStoryScaffoldService(): void {
  instance = null;
}
