/**
 * LLM Service
 *
 * AI integration for narrative generation using Anthropic Claude.
 * Supports generating premises, stories, and beats from high-level concepts.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  Premise,
  Story,
  CharacterArc,
  BeatType,
  BeatDialogue,
  StoryStructure,
  Character,
  ReviewIssue,
} from "../db/index.js";
import { getCharacterService } from "./character.service.js";
import {
  DEFAULT_VISION_CONFIG,
  type ImageAnalysis,
  type PanelContext,
  type VisionProviderConfig,
} from "./review.types.js";

// ============================================================================
// Constants
// ============================================================================

const MAX_LOGLINE_LENGTH = 2000;
const MAX_FEEDBACK_LENGTH = 5000;
const MAX_SETTING_LENGTH = 2000;
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds

// Security limits for image analysis
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB max
const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

/**
 * Validate that an image path is safe and the file exists.
 * Prevents path traversal attacks (including encoded characters) and ensures file is within bounds.
 */
async function validateImagePath(imagePath: string): Promise<void> {
  // Decode URL-encoded characters first to catch bypass attempts like %2F, %2E%2E
  const decodedPath = decodeURIComponent(imagePath);

  // Check for path traversal attempts in the decoded path
  // This catches: "..", "/..", "../", encoded variants, etc.
  if (decodedPath.includes("..")) {
    throw new Error("Invalid image path: path traversal not allowed");
  }

  // Resolve to absolute path
  const resolvedPath = path.resolve(decodedPath);

  // Double-check: after resolution, ensure no ".." segments remain
  // (handles edge cases like symlinks)
  if (resolvedPath.includes("..")) {
    throw new Error("Invalid image path: path traversal not allowed");
  }

  // On Windows, also check for backslash-based traversal
  if (process.platform === "win32" && decodedPath.includes("..\\")) {
    throw new Error("Invalid image path: path traversal not allowed");
  }

  // Verify extension
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid image type: ${ext}. Allowed types: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`
    );
  }

  // Check file exists and get stats
  try {
    const stats = await fs.stat(resolvedPath);

    if (!stats.isFile()) {
      throw new Error("Invalid image path: not a file");
    }

    if (stats.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image file too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }
    throw error;
  }
}

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


/**
 * Caption inferred from visual description by LLM
 */
export type InferredCaption = {
  type: "speech" | "thought" | "whisper" | "narration" | "sfx";
  text: string;
  characterName?: string;
  confidence: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize user input for use in LLM prompts to prevent prompt injection.
 * This is a defense-in-depth measure - it escapes special characters that
 * could be used to manipulate prompt structure.
 */
function sanitizeForPrompt(input: string): string {
  if (!input) return "";
  // Remove or escape characters that could be used for prompt manipulation
  return input
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"')   // Escape quotes
    .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
    .trim();
}

/**
 * Safely parse JSON from LLM response with error handling.
 * LLMs sometimes include extra text before/after JSON, so we try to extract it.
 */
function safeJsonParse<T>(text: string, context: string): T {
  try {
    // First, try direct parsing
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON from response (LLM might have added extra text)
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        throw new Error(
          `Failed to parse LLM response as JSON (${context}). ` +
          `Response started with: ${text.slice(0, 100)}...`
        );
      }
    }
    throw new Error(
      `LLM response is not valid JSON (${context}). ` +
      `Response started with: ${text.slice(0, 100)}...`
    );
  }
}

/**
 * Validate input length with descriptive error messages.
 */
function validateLength(value: string | undefined, maxLength: number, fieldName: string): void {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters (got ${value.length})`);
  }
}

/**
 * Fetch multiple characters in parallel instead of sequentially.
 */
async function fetchCharacters(characterIds: string[]): Promise<Character[]> {
  if (!characterIds || characterIds.length === 0) return [];

  const characterService = getCharacterService();
  const results = await Promise.all(
    characterIds.map((id) => characterService.getById(id))
  );

  // Filter out nulls and warn about missing characters
  const characters: Character[] = [];
  const missingIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i]) {
      characters.push(results[i]!);
    } else {
      missingIds.push(characterIds[i]);
    }
  }

  if (missingIds.length > 0) {
    console.warn(`LLMService: Characters not found: ${missingIds.join(", ")}`);
  }

  return characters;
}

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
   * Get current configuration (API key is redacted for security)
   */
  getConfig(): Omit<LLMConfig, "apiKey"> & { hasApiKey: boolean } {
    const { apiKey, ...rest } = this.config;
    return { ...rest, hasApiKey: !!apiKey };
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

    // Validate input lengths
    validateLength(input.logline, MAX_LOGLINE_LENGTH, "Logline");
    validateLength(input.setting, MAX_SETTING_LENGTH, "Setting");

    // Sanitize inputs for prompt injection prevention
    const safeLogline = sanitizeForPrompt(input.logline);
    const safeGenre = sanitizeForPrompt(input.genre ?? "");
    const safeTone = sanitizeForPrompt(input.tone ?? "");
    const safeSetting = sanitizeForPrompt(input.setting ?? "");
    const safeThemes = input.themes?.map(sanitizeForPrompt) ?? [];

    // Get character details in parallel
    const characters = await fetchCharacters(input.characterIds ?? []);
    const characterContext = characters.length > 0
      ? `\n\nAvailable characters:\n${characters.map((c) => `- ${c.name}: ${c.profile.species}, ${c.profile.bodyType}`).join("\n")}`
      : "";

    const prompt = `You are a creative writing assistant specializing in comic and visual storytelling. Generate a fully fleshed-out story premise based on the following logline.

Logline: "${safeLogline}"
${safeGenre ? `Genre hint: ${safeGenre}` : ""}
${safeTone ? `Tone hint: ${safeTone}` : ""}
${safeThemes.length ? `Theme hints: ${safeThemes.join(", ")}` : ""}
${safeSetting ? `Setting hint: ${safeSetting}` : ""}
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
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return safeJsonParse<GeneratedPremise>(content.text, "generatePremise");
  }

  /**
   * Expand a premise into a full story structure
   */
  async expandPremiseToStory(premise: Premise, options?: StoryOptions): Promise<GeneratedStory> {
    this.ensureReady();

    const structure = options?.structure ?? "three-act";
    const targetLength = options?.targetLength ?? 12;

    // Sanitize premise data
    const safeLogline = sanitizeForPrompt(premise.logline);
    const safeGenre = sanitizeForPrompt(premise.genre ?? "");
    const safeTone = sanitizeForPrompt(premise.tone ?? "");
    const safeSetting = sanitizeForPrompt(premise.setting ?? "");
    const safeThemes = premise.themes?.map(sanitizeForPrompt) ?? [];
    const safeWorldRules = premise.worldRules?.map(sanitizeForPrompt) ?? [];

    // Get character details in parallel
    const characters = await fetchCharacters(premise.characterIds ?? []);
    const characterContext = characters.length > 0
      ? `\n\nCharacters involved:\n${characters
          .map((c) => `- ${c.name} (${c.id}): ${c.profile.species}, ${c.profile.bodyType}. Features: ${c.profile.features.join(", ")}`)
          .join("\n")}`
      : "";

    const structureGuide = this.getStructureGuide(structure, targetLength);

    const prompt = `You are a story architect for visual comics. Expand this premise into a complete story structure.

PREMISE:
- Logline: ${safeLogline}
- Genre: ${safeGenre || "not specified"}
- Tone: ${safeTone || "not specified"}
- Themes: ${safeThemes.join(", ") || "not specified"}
- Setting: ${safeSetting || "not specified"}
- World Rules: ${safeWorldRules.join("; ") || "none specified"}
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
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return safeJsonParse<GeneratedStory>(content.text, "expandPremiseToStory");
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

    // Sanitize story and premise data
    const safeTitle = sanitizeForPrompt(story.title);
    const safeSynopsis = sanitizeForPrompt(story.synopsis ?? "");
    const safeLogline = sanitizeForPrompt(premise.logline);
    const safeGenre = sanitizeForPrompt(premise.genre ?? "");
    const safeTone = sanitizeForPrompt(premise.tone ?? "");
    const safeSetting = sanitizeForPrompt(premise.setting ?? "");

    // Get character details in parallel
    const characters = await fetchCharacters(premise.characterIds ?? []);
    const characterContext = characters.length > 0
      ? `\n\nCharacters (use these IDs in characterIds arrays):\n${characters
          .map(
            (c) =>
              `- ID: "${c.id}" - ${c.name}: ${c.profile.species}, ${c.profile.bodyType}. Features: ${c.profile.features.join(", ")}`
          )
          .join("\n")}`
      : "";

    // Calculate dynamic max tokens based on target length
    const targetBeats = story.targetLength ?? 12;
    const maxTokens = Math.min(16384, Math.max(4096, targetBeats * 500));

    const prompt = `You are a comic storyboard artist. Generate individual beats (panels) for this story.

STORY:
- Title: ${safeTitle}
- Synopsis: ${safeSynopsis || "Not provided"}
- Structure: ${story.structure}
- Structure Notes: ${JSON.stringify(story.structureNotes || {})}
- Target Length: ${targetBeats} beats
- Character Arcs: ${JSON.stringify(story.characterArcs || [])}

PREMISE CONTEXT:
- Logline: ${safeLogline}
- Genre: ${safeGenre}
- Tone: ${safeTone}
- Setting: ${safeSetting}
${characterContext}

Generate ${targetBeats} beats. Each beat should be a single panel.

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
      max_tokens: maxTokens,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return safeJsonParse<GeneratedBeat[]>(content.text, "generateBeats");
  }

  /**
   * Refine a beat based on feedback
   */
  async refineBeat(beat: GeneratedBeat, feedback: string): Promise<GeneratedBeat> {
    this.ensureReady();

    // Validate feedback length
    validateLength(feedback, MAX_FEEDBACK_LENGTH, "Feedback");

    // Sanitize feedback for prompt injection prevention
    const safeFeedback = sanitizeForPrompt(feedback);

    const prompt = `You are a comic storyboard artist refining a panel beat based on feedback.

CURRENT BEAT:
${JSON.stringify(beat, null, 2)}

FEEDBACK:
${safeFeedback}

Revise the beat to address the feedback. Keep the same position and act number unless the feedback specifically asks to change them.

Respond with the complete revised beat as a JSON object (same structure as the input).

Only output the JSON, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    return safeJsonParse<GeneratedBeat>(content.text, "refineBeat");
  }


  /**
   * Infer captions from a visual description using LLM.
   * Extracts potential dialogue, narration, and sound effects from prose descriptions.
   *
   * @param visualDescription - The visual description text to analyze
   * @returns Array of inferred captions with type, text, and optional characterId
   */
  async inferCaptionsFromVisualDescription(
    visualDescription: string
  ): Promise<InferredCaption[]> {
    this.ensureReady();

    if (!visualDescription || visualDescription.trim().length === 0) {
      return [];
    }

    // Sanitize input
    const safeDescription = sanitizeForPrompt(visualDescription);

    const prompt = `You are a comic panel caption extractor. Analyze this visual description and extract any implied dialogue, narration, or sound effects that should be displayed as captions on the comic panel.

VISUAL DESCRIPTION:
"${safeDescription}"

TASK:
1. Look for quoted speech or dialogue (things characters are saying)
2. Look for described sounds that should be shown as SFX
3. Identify any narrative text that should appear as caption boxes
4. Extract character identifiers when mentioned with dialogue

Respond with a JSON array of captions. If no captions can be inferred, return an empty array [].

{
  "captions": [
    {
      "type": "speech" | "thought" | "whisper" | "narration" | "sfx",
      "text": "The actual caption text",
      "characterName": "Optional: name of character if dialogue",
      "confidence": 0.0-1.0
    }
  ]
}

RULES:
- Only extract text that is explicitly or clearly implied in the description
- For speech, look for quoted text, "she says", "he whispers", etc.
- For thoughts, look for "she thinks", "he wonders", internal monologue hints
- For SFX, look for onomatopoeia or described sounds (crash, bang, whoosh, etc.)
- For narration, look for scene-setting prose that should be in caption boxes
- Set confidence based on how clearly the caption is implied (0.9+ for quoted text, lower for inferred)
- Do NOT make up dialogue or SFX that isn't implied by the description

Only output the JSON, no other text.`;

    const response = await this.client!.messages.create({
      model: this.config.model,
      max_tokens: 1024,
      temperature: 0.3, // Lower temperature for more consistent extraction
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    try {
      const result = safeJsonParse<{ captions: InferredCaption[] }>(
        content.text,
        "inferCaptionsFromVisualDescription"
      );
      return result.captions || [];
    } catch {
      // If parsing fails, return empty array rather than throwing
      console.warn("Failed to parse inferred captions, returning empty array");
      return [];
    }
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
  // Image Analysis Methods
  // ==========================================================================

  /**
   * Analyze an image for prompt adherence.
   * Uses Ollama vision models first, falls back to Claude Vision.
   *
   * @param imagePath - Path to the image file to analyze
   * @param prompt - The original generation prompt
   * @param context - Optional panel context for richer analysis
   * @param visionConfig - Optional vision provider configuration
   * @returns Analysis result with score, issues, and element detection
   */
  async analyzeImagePromptAdherence(
    imagePath: string,
    prompt: string,
    context?: PanelContext,
    visionConfig?: Partial<VisionProviderConfig>
  ): Promise<ImageAnalysis> {
    // Security: Validate image path before any file operations
    await validateImagePath(imagePath);

    const config: VisionProviderConfig = {
      ...DEFAULT_VISION_CONFIG,
      ...visionConfig,
      // Use ANTHROPIC_API_KEY for Claude fallback if available
      claudeApiKey: visionConfig?.claudeApiKey ?? this.config.apiKey,
    };

    // Build the analysis prompt
    const analysisPrompt = this.buildImageAnalysisPrompt(prompt, context);

    // Try Ollama first
    if (config.provider === "ollama") {
      try {
        return await this.analyzeWithOllama(imagePath, analysisPrompt, config);
      } catch (error) {
        // Fall back to Claude if Ollama fails and we have an API key
        if (config.claudeApiKey) {
          console.warn(
            `Ollama vision failed: ${error instanceof Error ? error.message : "Unknown error"}. Falling back to Claude Vision.`
          );
          return await this.analyzeWithClaude(imagePath, analysisPrompt, config);
        }
        throw new Error(
          `Vision analysis failed: Ollama unavailable and Claude not configured. Original error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Use Claude directly if configured as primary
    if (!config.claudeApiKey) {
      throw new Error("Claude Vision requires an API key");
    }
    return await this.analyzeWithClaude(imagePath, analysisPrompt, config);
  }

  /**
   * Build the prompt for image analysis
   */
  private buildImageAnalysisPrompt(prompt: string, context?: PanelContext): string {
    const contextSection = context
      ? `
PANEL CONTEXT:
- Description: ${context.description || "Not specified"}
- Characters: ${context.characterNames?.join(", ") || "Not specified"}
- Mood: ${context.mood || "Not specified"}
- Camera Angle: ${context.cameraAngle || "Not specified"}
- Narrative Context: ${context.narrativeContext || "Not specified"}
`
      : "";

    return `You are an expert image reviewer for AI-generated comic panels. Analyze this image against its generation prompt.

GENERATION PROMPT:
"${prompt}"
${contextSection}
TASK:
1. Identify which elements from the prompt are PRESENT in the image
2. Identify which elements from the prompt are MISSING or incorrectly rendered
3. Assess overall prompt adherence on a scale of 0-1
4. Note any quality issues (artifacts, anatomical errors, etc.)

Respond with a JSON object:
{
  "adherenceScore": 0.0-1.0,
  "foundElements": ["element1 from prompt that is present", "element2 that is present"],
  "missingElements": ["element from prompt that is missing", "element that is wrong"],
  "issues": [
    {
      "type": "missing_element" | "wrong_composition" | "wrong_character" | "wrong_action" | "quality" | "other",
      "description": "Clear description of the issue",
      "severity": "critical" | "major" | "minor",
      "suggestedFix": "Optional suggestion for fixing this in regeneration"
    }
  ],
  "qualityNotes": "Optional notes about overall image quality"
}

SCORING GUIDE:
- 0.9-1.0: All key elements present, excellent adherence
- 0.7-0.89: Most elements present, minor issues
- 0.5-0.69: Some elements missing or wrong, needs improvement
- 0.3-0.49: Significant issues, major regeneration needed
- 0.0-0.29: Does not match prompt at all

Be strict but fair. Focus on the key visual elements mentioned in the prompt.
Only output the JSON, no other text.`;
  }

  /**
   * Analyze image using Ollama vision model (llava, etc.)
   */
  private async analyzeWithOllama(
    imagePath: string,
    analysisPrompt: string,
    config: VisionProviderConfig
  ): Promise<ImageAnalysis> {
    const baseUrl = config.ollamaBaseUrl || "http://localhost:11434";
    const model = config.ollamaModel || "llava";
    const timeoutMs = DEFAULT_TIMEOUT_MS; // 60 seconds

    // Read image and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: analysisPrompt,
          images: [imageBase64],
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent analysis
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const rawResponse = result.response || "";

      return this.parseAnalysisResponse(rawResponse);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama request timed out after ${timeoutMs / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Analyze image using Claude Vision
   */
  private async analyzeWithClaude(
    imagePath: string,
    analysisPrompt: string,
    config: VisionProviderConfig
  ): Promise<ImageAnalysis> {
    if (!config.claudeApiKey) {
      throw new Error("Claude API key is required for vision analysis");
    }

    // Read image and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    // Determine media type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    const mediaType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".webp"
              ? "image/webp"
              : "image/png";

    // Use the existing client or create a temporary one
    const client = this.client || new Anthropic({ apiKey: config.claudeApiKey });

    const response = await client.messages.create({
      model: config.claudeModel || "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: analysisPrompt,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude Vision");
    }

    return this.parseAnalysisResponse(content.text);
  }

  /**
   * Parse the analysis response from either vision provider
   */
  private parseAnalysisResponse(rawResponse: string): ImageAnalysis {
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = rawResponse;
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // Try to find JSON object in the response
        const jsonObjMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and normalize the response
      const analysis: ImageAnalysis = {
        adherenceScore: Math.max(0, Math.min(1, Number(parsed.adherenceScore) || 0)),
        foundElements: Array.isArray(parsed.foundElements) ? parsed.foundElements : [],
        missingElements: Array.isArray(parsed.missingElements) ? parsed.missingElements : [],
        issues: this.normalizeIssues(parsed.issues),
        qualityNotes: parsed.qualityNotes || undefined,
        rawResponse,
      };

      return analysis;
    } catch (error) {
      // Don't swallow parsing errors - throw so caller knows analysis failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to parse vision analysis response:", errorMessage);
      console.error("Raw response was:", rawResponse.slice(0, 500));
      throw new Error(
        `Failed to parse vision analysis response: ${errorMessage}. ` +
          "The AI may have returned an invalid format. Consider retrying."
      );
    }
  }

  /**
   * Normalize and validate issues array
   */
  private normalizeIssues(issues: unknown): ReviewIssue[] {
    if (!Array.isArray(issues)) return [];

    const validTypes = [
      "missing_element",
      "wrong_composition",
      "wrong_character",
      "wrong_action",
      "quality",
      "other",
    ] as const;
    const validSeverities = ["critical", "major", "minor"] as const;

    return issues
      .filter((issue): issue is Record<string, unknown> => typeof issue === "object" && issue !== null)
      .map((issue) => ({
        type: validTypes.includes(issue.type as (typeof validTypes)[number])
          ? (issue.type as ReviewIssue["type"])
          : "other",
        description: String(issue.description || "Unknown issue"),
        severity: validSeverities.includes(issue.severity as (typeof validSeverities)[number])
          ? (issue.severity as ReviewIssue["severity"])
          : "major",
        suggestedFix: issue.suggestedFix ? String(issue.suggestedFix) : undefined,
      }));
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
