/**
 * LLM Service
 *
 * AI integration for narrative generation using Anthropic Claude.
 * Supports generating premises, stories, and beats from high-level concepts.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Premise,
  Story,
  CharacterArc,
  BeatType,
  BeatDialogue,
  StoryStructure,
  Character,
} from "../db/index.js";
import { getCharacterService } from "./character.service.js";

// ============================================================================
// Types
// ============================================================================

export type LLMProvider = "anthropic";

export type LLMModel =
  | "claude-sonnet-4-20250514"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-haiku-20240307";

export type LLMConfig = {
  provider: LLMProvider;
  model: LLMModel;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
};

// Input types for generation
export type PremisePrompt = {
  logline: string;
  genre?: string;
  tone?: string;
  themes?: string[];
  characterIds?: string[];
  setting?: string;
};

export type StoryOptions = {
  structure?: StoryStructure;
  targetLength?: number;
  includeCharacterArcs?: boolean;
};

export type BeatOptions = {
  includeDialogue?: boolean;
  includeNarration?: boolean;
  includeSfx?: boolean;
  detailLevel?: "minimal" | "standard" | "detailed";
};

// Output types from generation
export type GeneratedPremise = {
  logline: string;
  genre: string;
  tone: string;
  themes: string[];
  setting: string;
  worldRules: string[];
};

export type GeneratedStory = {
  title: string;
  synopsis: string;
  structure: StoryStructure;
  structureNotes: Record<string, string>;
  characterArcs: CharacterArc[];
  targetLength: number;
};

export type GeneratedBeat = {
  position: number;
  actNumber: number;
  beatType: BeatType;
  visualDescription: string;
  narrativeContext: string;
  emotionalTone: string;
  characterIds: string[];
  characterActions: Record<string, string>;
  cameraAngle: string;
  composition: string;
  dialogue: BeatDialogue[];
  narration: string;
  sfx: string;
};

export type FullStoryGeneration = {
  premise: GeneratedPremise;
  story: GeneratedStory;
  beats: GeneratedBeat[];
};

// ============================================================================
// LLM Service
// ============================================================================

export class LLMService {
  private client: Anthropic | null = null;
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      provider: config?.provider ?? "anthropic",
      model: config?.model ?? "claude-sonnet-4-20250514",
      apiKey: config?.apiKey ?? process.env.ANTHROPIC_API_KEY,
      maxTokens: config?.maxTokens ?? 4096,
      temperature: config?.temperature ?? 0.7,
    };

    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.config.provider === "anthropic") {
      if (!this.config.apiKey) {
        console.warn("LLMService: No API key provided. Generation methods will throw errors.");
        return;
      }
      this.client = new Anthropic({ apiKey: this.config.apiKey });
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set the LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.config.provider = provider;
    this.initializeClient();
  }

  /**
   * Set the model to use
   */
  setModel(model: LLMModel): void {
    this.config.model = model;
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.initializeClient();
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Check if the service is ready to make requests
   */
  isReady(): boolean {
    return this.client !== null;
  }

  // ==========================================================================
  // Generation Methods
  // ==========================================================================

  /**
   * Generate a premise from a logline
   */
  async generatePremise(input: PremisePrompt): Promise<GeneratedPremise> {
    this.ensureReady();

    // Get character details if provided
    let characterContext = "";
    if (input.characterIds && input.characterIds.length > 0) {
      const characterService = getCharacterService();
      const characters: Character[] = [];
      for (const id of input.characterIds) {
        const char = await characterService.getById(id);
        if (char) characters.push(char);
      }
      if (characters.length > 0) {
        characterContext = `\n\nAvailable characters:\n${characters.map((c) => `- ${c.name}: ${c.profile.species}, ${c.profile.bodyType}`).join("\n")}`;
      }
    }

    const prompt = `You are a creative writing assistant specializing in comic and visual storytelling. Generate a fully fleshed-out story premise based on the following logline.

Logline: "${input.logline}"
${input.genre ? `Genre hint: ${input.genre}` : ""}
${input.tone ? `Tone hint: ${input.tone}` : ""}
${input.themes?.length ? `Theme hints: ${input.themes.join(", ")}` : ""}
${input.setting ? `Setting hint: ${input.setting}` : ""}
${characterContext}

Respond with a JSON object containing:
{
  "logline": "A refined, compelling version of the logline (1-2 sentences)",
  "genre": "The primary genre (e.g., comedy, drama, action, romance, horror, sci-fi, fantasy)",
  "tone": "The overall tone (e.g., lighthearted, dark, satirical, heartwarming, tense)",
  "themes": ["theme1", "theme2", "theme3"],
  "setting": "A vivid description of the primary setting",
  "worldRules": ["rule1", "rule2"] // Any constraints or rules that apply to this story world
}

Only output the JSON, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens!,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return JSON.parse(content.text) as GeneratedPremise;
  }

  /**
   * Expand a premise into a full story structure
   */
  async expandPremiseToStory(premise: Premise, options?: StoryOptions): Promise<GeneratedStory> {
    this.ensureReady();

    const structure = options?.structure ?? "three-act";
    const targetLength = options?.targetLength ?? 12;

    // Get character details
    let characterContext = "";
    if (premise.characterIds && premise.characterIds.length > 0) {
      const characterService = getCharacterService();
      const characters: Character[] = [];
      for (const id of premise.characterIds) {
        const char = await characterService.getById(id);
        if (char) characters.push(char);
      }
      if (characters.length > 0) {
        characterContext = `\n\nCharacters involved:\n${characters
          .map((c) => `- ${c.name} (${c.id}): ${c.profile.species}, ${c.profile.bodyType}. Features: ${c.profile.features.join(", ")}`)
          .join("\n")}`;
      }
    }

    const structureGuide = this.getStructureGuide(structure, targetLength);

    const prompt = `You are a story architect for visual comics. Expand this premise into a complete story structure.

PREMISE:
- Logline: ${premise.logline}
- Genre: ${premise.genre || "not specified"}
- Tone: ${premise.tone || "not specified"}
- Themes: ${premise.themes?.join(", ") || "not specified"}
- Setting: ${premise.setting || "not specified"}
- World Rules: ${premise.worldRules?.join("; ") || "none specified"}
${characterContext}

TARGET STRUCTURE: ${structure}
TARGET LENGTH: ${targetLength} panels/beats

${structureGuide}

Respond with a JSON object:
{
  "title": "A compelling title for the story",
  "synopsis": "A 2-3 paragraph summary of the complete story",
  "structure": "${structure}",
  "structureNotes": {
    "act1": "What happens in Act 1",
    "act2": "What happens in Act 2",
    "act3": "What happens in Act 3"
  },
  "characterArcs": [
    {
      "characterId": "character-id-here",
      "startState": "How the character starts emotionally/mentally",
      "endState": "How the character ends up",
      "keyMoments": ["Turning point 1", "Turning point 2"]
    }
  ],
  "targetLength": ${targetLength}
}

Only output the JSON, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens!,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return JSON.parse(content.text) as GeneratedStory;
  }

  /**
   * Generate beats for a story
   */
  async generateBeats(story: Story, premise: Premise, options?: BeatOptions): Promise<GeneratedBeat[]> {
    this.ensureReady();

    const detailLevel = options?.detailLevel ?? "standard";
    const includeDialogue = options?.includeDialogue ?? true;
    const includeNarration = options?.includeNarration ?? true;
    const includeSfx = options?.includeSfx ?? true;

    // Get character details
    let characterContext = "";
    if (premise.characterIds && premise.characterIds.length > 0) {
      const characterService = getCharacterService();
      const characters: Character[] = [];
      for (const id of premise.characterIds) {
        const char = await characterService.getById(id);
        if (char) characters.push(char);
      }
      if (characters.length > 0) {
        characterContext = `\n\nCharacters (use these IDs in characterIds arrays):\n${characters
          .map(
            (c) =>
              `- ID: "${c.id}" - ${c.name}: ${c.profile.species}, ${c.profile.bodyType}. Features: ${c.profile.features.join(", ")}`
          )
          .join("\n")}`;
      }
    }

    const prompt = `You are a comic storyboard artist. Generate individual beats (panels) for this story.

STORY:
- Title: ${story.title}
- Synopsis: ${story.synopsis || "Not provided"}
- Structure: ${story.structure}
- Structure Notes: ${JSON.stringify(story.structureNotes || {})}
- Target Length: ${story.targetLength || 12} beats
- Character Arcs: ${JSON.stringify(story.characterArcs || [])}

PREMISE CONTEXT:
- Logline: ${premise.logline}
- Genre: ${premise.genre}
- Tone: ${premise.tone}
- Setting: ${premise.setting}
${characterContext}

Generate ${story.targetLength || 12} beats. Each beat should be a single panel.

BEAT TYPES TO USE: setup, inciting, rising, midpoint, complication, crisis, climax, resolution, denouement

CAMERA ANGLES TO USE: wide, medium, close-up, extreme-close-up, bird-eye, worm-eye, over-shoulder, two-shot

COMPOSITION OPTIONS: rule-of-thirds, centered, diagonal, framed, symmetrical, asymmetrical

Respond with a JSON array:
[
  {
    "position": 0,
    "actNumber": 1,
    "beatType": "setup",
    "visualDescription": "Detailed visual description of what the reader sees in this panel. Be specific about character poses, expressions, and environment details.",
    "narrativeContext": "What's happening in the story at this moment",
    "emotionalTone": "The emotional feel of this panel (e.g., cheerful, tense, melancholic)",
    "characterIds": ["character-id-1", "character-id-2"],
    "characterActions": { "character-id-1": "doing something", "character-id-2": "doing something else" },
    "cameraAngle": "wide",
    "composition": "rule-of-thirds",
    "dialogue": [${includeDialogue ? '{ "characterId": "character-id", "text": "What they say", "type": "speech" }' : ""}],
    "narration": "${includeNarration ? "Narrator text if needed" : ""}",
    "sfx": "${includeSfx ? "Sound effect if applicable" : ""}"
  }
]

Detail level: ${detailLevel}
${detailLevel === "minimal" ? "Keep descriptions brief (1 sentence)." : ""}
${detailLevel === "standard" ? "Use moderate detail (2-3 sentences)." : ""}
${detailLevel === "detailed" ? "Be very descriptive (3-5 sentences per visual description)." : ""}

Only output the JSON array, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: 8192, // Beats can be long
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return JSON.parse(content.text) as GeneratedBeat[];
  }

  /**
   * Refine a beat based on feedback
   */
  async refineBeat(beat: GeneratedBeat, feedback: string): Promise<GeneratedBeat> {
    this.ensureReady();

    const prompt = `You are a comic storyboard artist refining a panel beat based on feedback.

CURRENT BEAT:
${JSON.stringify(beat, null, 2)}

FEEDBACK:
${feedback}

Revise the beat to address the feedback. Keep the same position and act number unless the feedback specifically asks to change them.

Respond with the complete revised beat as a JSON object (same structure as the input).

Only output the JSON, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens!,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return JSON.parse(content.text) as GeneratedBeat;
  }

  /**
   * Generate a complete story from just a logline (premise → story → beats)
   */
  async generateFullStory(
    logline: string,
    characterIds: string[],
    options?: {
      genre?: string;
      tone?: string;
      targetLength?: number;
      structure?: StoryStructure;
    }
  ): Promise<FullStoryGeneration> {
    // Step 1: Generate premise
    const premise = await this.generatePremise({
      logline,
      characterIds,
      genre: options?.genre,
      tone: options?.tone,
    });

    // Create a mock Premise object for the next step
    const premiseObj: Premise = {
      id: "temp",
      projectId: "temp",
      logline: premise.logline,
      genre: premise.genre,
      tone: premise.tone,
      themes: premise.themes,
      characterIds,
      setting: premise.setting,
      worldRules: premise.worldRules,
      generatedBy: this.config.model,
      generationPrompt: null,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Step 2: Generate story
    const story = await this.expandPremiseToStory(premiseObj, {
      structure: options?.structure,
      targetLength: options?.targetLength,
    });

    // Create a mock Story object for the next step
    const storyObj: Story = {
      id: "temp",
      premiseId: "temp",
      title: story.title,
      synopsis: story.synopsis,
      targetLength: story.targetLength,
      actualLength: null,
      structure: story.structure,
      structureNotes: story.structureNotes,
      characterArcs: story.characterArcs,
      generatedBy: this.config.model,
      generationPrompt: null,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Step 3: Generate beats
    const beats = await this.generateBeats(storyObj, premiseObj);

    return { premise, story, beats };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private ensureReady(): void {
    if (!this.client) {
      throw new Error(
        "LLMService is not ready. Please set an API key using setApiKey() or ANTHROPIC_API_KEY environment variable."
      );
    }
  }

  private getStructureGuide(structure: StoryStructure, targetLength: number): string {
    const guides: Record<StoryStructure, string> = {
      "three-act": `THREE-ACT STRUCTURE:
Act 1 (Setup, ~25%): Introduce characters, setting, and the inciting incident
Act 2 (Confrontation, ~50%): Rising action, complications, midpoint reversal, crisis
Act 3 (Resolution, ~25%): Climax and resolution

For ${targetLength} beats:
- Act 1: ~${Math.round(targetLength * 0.25)} beats
- Act 2: ~${Math.round(targetLength * 0.5)} beats
- Act 3: ~${Math.round(targetLength * 0.25)} beats`,

      "five-act": `FIVE-ACT STRUCTURE:
Act 1 (Exposition): Introduction and inciting incident
Act 2 (Rising Action): Complications develop
Act 3 (Climax): The turning point
Act 4 (Falling Action): Consequences unfold
Act 5 (Denouement): Resolution

For ${targetLength} beats: ~${Math.round(targetLength / 5)} beats per act`,

      "hero-journey": `HERO'S JOURNEY STRUCTURE:
1. Ordinary World
2. Call to Adventure
3. Refusal of the Call
4. Meeting the Mentor
5. Crossing the Threshold
6. Tests, Allies, Enemies
7. Approach to the Inmost Cave
8. Ordeal
9. Reward
10. The Road Back
11. Resurrection
12. Return with the Elixir

Adapt to ${targetLength} beats by combining or expanding stages.`,

      custom: `CUSTOM STRUCTURE: Organize the story in whatever way best serves the narrative. Aim for ${targetLength} beats with clear progression.`,
    };

    return guides[structure];
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: LLMService | null = null;

/**
 * Create a new LLMService with explicit configuration
 */
export function createLLMService(config?: Partial<LLMConfig>): LLMService {
  return new LLMService(config);
}

/**
 * Get the singleton LLMService
 */
export function getLLMService(): LLMService {
  if (!instance) {
    instance = new LLMService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetLLMService(): void {
  instance = null;
}
