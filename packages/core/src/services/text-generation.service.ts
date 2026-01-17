/**
 * Text Generation Service
 *
 * Provider-agnostic text generation orchestrator.
 * Supports Ollama (local/remote), Claude, and future providers.
 *
 * Usage:
 *   const service = getTextGenerationService();
 *   const result = await service.generate("Write a panel description");
 *   const captions = await service.suggestCaptions("A character looking surprised");
 */

import type {
  TextGenerationConfig,
  TextGenerationProvider,
  TextProvider,
  ProviderStatus,
  GenerateOptions,
  GenerateResult,
  PanelDescriptionContext,
  DialogueContext,
  GeneratedDialogue,
  InferredCaption,
  RefineTextContext,
} from "./text-generation.types.js";
import { DEFAULT_TEXT_CONFIG } from "./text-generation.types.js";
import { OllamaProvider } from "./providers/ollama.provider.js";
import { ClaudeProvider } from "./providers/claude.provider.js";

// =============================================================================
// Helper Functions
// =============================================================================

/** Maximum size for LLM responses to prevent memory exhaustion */
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

/** Maximum input size for prompts */
const MAX_PROMPT_INPUT_SIZE = 100 * 1024; // 100KB

// Array and input validation bounds
const MAX_CHARACTERS_ARRAY = 50; // Max characters in panel description
const MAX_CHARACTER_NAME_LENGTH = 200;
const MAX_CHARACTER_DESC_LENGTH = 1000;
const MAX_PREVIOUS_DIALOGUE = 50; // Max dialogue history
const MAX_DIALOGUE_LENGTH = 1000;
const MAX_STOP_SEQUENCES = 10;
const MAX_STOP_SEQUENCE_LENGTH = 100;

/**
 * Safely parse JSON from LLM response with error handling.
 * LLMs sometimes include extra text before/after JSON, so we try to extract it.
 * Includes size limits and safer regex to prevent catastrophic backtracking.
 */
function safeJsonParse<T>(text: string, context: string): T {
  // Size check to prevent memory exhaustion
  if (text.length > MAX_RESPONSE_SIZE) {
    throw new Error(
      `LLM response too large (${text.length} bytes, max ${MAX_RESPONSE_SIZE})`
    );
  }

  try {
    // First, try direct parsing
    return JSON.parse(text) as T;
  } catch {
    // Try to find JSON boundaries more safely (non-greedy, bounded)
    // Look for array or object with matching brackets
    const trimmed = text.trim();

    // Find first [ or {
    const arrayStart = trimmed.indexOf("[");
    const objectStart = trimmed.indexOf("{");

    let start = -1;
    let isArray = false;

    if (arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart)) {
      start = arrayStart;
      isArray = true;
    } else if (objectStart >= 0) {
      start = objectStart;
      isArray = false;
    }

    if (start >= 0) {
      // Find matching closing bracket
      const openChar = isArray ? "[" : "{";
      const closeChar = isArray ? "]" : "}";
      let depth = 0;
      let inString = false;
      let escape = false;

      for (let i = start; i < trimmed.length; i++) {
        const char = trimmed[i];

        if (escape) {
          escape = false;
          continue;
        }

        if (char === "\\") {
          escape = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === openChar) depth++;
          else if (char === closeChar) {
            depth--;
            if (depth === 0) {
              // Found complete JSON
              const jsonStr = trimmed.slice(start, i + 1);
              try {
                return JSON.parse(jsonStr) as T;
              } catch {
                break; // Invalid JSON structure
              }
            }
          }
        }
      }
    }

    throw new Error(
      `LLM response is not valid JSON (${context}). ` +
        `Response started with: ${text.slice(0, 100)}...`
    );
  }
}

/**
 * Sanitize user input for use in LLM prompts to prevent prompt injection.
 *
 * Defense strategy:
 * - Remove control characters that could confuse parsing
 * - Escape special characters
 * - Collapse excessive whitespace
 * - Enforce size limits
 * - Strip potential instruction markers
 */
function sanitizeForPrompt(input: string): string {
  if (!input) return "";

  // Enforce size limit
  if (input.length > MAX_PROMPT_INPUT_SIZE) {
    input = input.slice(0, MAX_PROMPT_INPUT_SIZE);
  }

  return input
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Escape backslashes first
    .replace(/\\/g, "\\\\")
    // Escape quotes
    .replace(/"/g, '\\"')
    // Collapse 2+ consecutive newlines to max 2
    .replace(/\n{2,}/g, "\n\n")
    // Collapse excessive spaces (3+ to 2)
    .replace(/ {3,}/g, "  ")
    // Strip common instruction injection patterns (but keep the content)
    .replace(/^(system|user|assistant|human|ai):\s*/gim, "")
    // Strip XML-like instruction tags that might confuse the model
    .replace(/<\/?(?:system|instruction|prompt|ignore)[^>]*>/gi, "")
    .trim();
}

/**
 * Validate and sanitize characters array for panel descriptions.
 */
function validateCharactersArray(
  characters: Array<{ name: string; description?: string }> | undefined
): Array<{ name: string; description?: string }> {
  if (!characters || !Array.isArray(characters)) {
    return [];
  }

  // Limit array size
  const limited = characters.slice(0, MAX_CHARACTERS_ARRAY);

  // Sanitize each character
  return limited.map((char) => ({
    name: sanitizeForPrompt(
      String(char.name || "").slice(0, MAX_CHARACTER_NAME_LENGTH)
    ),
    description: char.description
      ? sanitizeForPrompt(
          String(char.description).slice(0, MAX_CHARACTER_DESC_LENGTH)
        )
      : undefined,
  }));
}

/**
 * Validate and sanitize previous dialogue array.
 */
function validateDialogueHistory(
  dialogue: string[] | undefined
): string[] {
  if (!dialogue || !Array.isArray(dialogue)) {
    return [];
  }

  // Limit array size
  const limited = dialogue.slice(0, MAX_PREVIOUS_DIALOGUE);

  // Sanitize each line
  return limited.map((line) =>
    sanitizeForPrompt(String(line || "").slice(0, MAX_DIALOGUE_LENGTH))
  );
}

/**
 * Validate and sanitize stop sequences array.
 */
function validateStopSequences(
  sequences: string[] | undefined
): string[] {
  if (!sequences || !Array.isArray(sequences)) {
    return [];
  }

  // Limit array size
  const limited = sequences.slice(0, MAX_STOP_SEQUENCES);

  // Sanitize each sequence (no prompt injection needed, but length limit)
  return limited
    .map((seq) => String(seq || "").slice(0, MAX_STOP_SEQUENCE_LENGTH))
    .filter((seq) => seq.length > 0);
}

// =============================================================================
// Text Generation Service
// =============================================================================

export class TextGenerationService {
  private provider: TextGenerationProvider;
  private config: TextGenerationConfig;

  constructor(config?: Partial<TextGenerationConfig>) {
    this.config = this.resolveConfig(config);
    this.provider = this.createProvider();
  }

  /**
   * Resolve configuration from explicit config, environment variables, and defaults.
   */
  private resolveConfig(explicitConfig?: Partial<TextGenerationConfig>): TextGenerationConfig {
    // Determine provider: explicit > env > auto-detect
    let provider: TextProvider = explicitConfig?.provider ?? "ollama";

    const envProvider = process.env.TEXT_PROVIDER as TextProvider | undefined;
    if (!explicitConfig?.provider && envProvider) {
      provider = envProvider;
    }

    return {
      provider,
      // Ollama settings
      ollamaUrl:
        explicitConfig?.ollamaUrl ??
        process.env.OLLAMA_URL ??
        DEFAULT_TEXT_CONFIG.ollamaUrl,
      ollamaModel:
        explicitConfig?.ollamaModel ??
        process.env.OLLAMA_MODEL ??
        DEFAULT_TEXT_CONFIG.ollamaModel,
      // Claude settings
      claudeApiKey:
        explicitConfig?.claudeApiKey ?? process.env.ANTHROPIC_API_KEY,
      claudeModel:
        explicitConfig?.claudeModel ??
        process.env.CLAUDE_MODEL ??
        DEFAULT_TEXT_CONFIG.claudeModel,
      // OpenAI settings (future)
      openaiApiKey: explicitConfig?.openaiApiKey ?? process.env.OPENAI_API_KEY,
      openaiModel: explicitConfig?.openaiModel ?? process.env.OPENAI_MODEL,
      // Common settings
      temperature:
        explicitConfig?.temperature ?? DEFAULT_TEXT_CONFIG.temperature,
      maxTokens: explicitConfig?.maxTokens ?? DEFAULT_TEXT_CONFIG.maxTokens,
      timeoutMs:
        explicitConfig?.timeoutMs ??
        (process.env.TEXT_TIMEOUT
          ? parseInt(process.env.TEXT_TIMEOUT, 10)
          : DEFAULT_TEXT_CONFIG.timeoutMs),
    };
  }

  /**
   * Create the provider instance based on configuration.
   */
  private createProvider(): TextGenerationProvider {
    switch (this.config.provider) {
      case "ollama":
        return new OllamaProvider(
          this.config.ollamaUrl,
          this.config.ollamaModel,
          this.config.timeoutMs
        );
      case "claude":
        return new ClaudeProvider(
          this.config.claudeApiKey,
          this.config.claudeModel
        );
      case "openai":
        throw new Error("OpenAI provider not yet implemented");
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  // ===========================================================================
  // Provider Management
  // ===========================================================================

  /**
   * Get the current provider name.
   */
  getProvider(): TextProvider {
    return this.provider.name;
  }

  /**
   * Switch to a different provider at runtime.
   */
  setProvider(provider: TextProvider): void {
    // Prevent concurrent provider changes (uses module-level flag)
    if (isConfiguring) {
      throw new Error("Provider change already in progress. Please wait.");
    }

    try {
      isConfiguring = true;
      this.config.provider = provider;
      this.provider = this.createProvider();
    } finally {
      isConfiguring = false;
    }
  }

  /**
   * Get status of the current provider.
   */
  async getStatus(): Promise<ProviderStatus> {
    const available = await this.provider.isAvailable();
    const model =
      this.config.provider === "ollama"
        ? this.config.ollamaModel!
        : this.config.provider === "claude"
          ? this.config.claudeModel!
          : this.config.openaiModel ?? "unknown";

    return {
      provider: this.provider.name,
      available,
      model,
      error: available ? undefined : this.getUnavailableReason(),
    };
  }

  /**
   * Get list of available providers with their status.
   */
  async listProviders(): Promise<ProviderStatus[]> {
    const providers: ProviderStatus[] = [];

    // Check Ollama
    const ollamaProvider = new OllamaProvider(
      this.config.ollamaUrl,
      this.config.ollamaModel
    );
    const ollamaAvailable = await ollamaProvider.isAvailable();
    providers.push({
      provider: "ollama",
      available: ollamaAvailable,
      model: this.config.ollamaModel!,
      error: ollamaAvailable
        ? undefined
        : `Cannot connect to Ollama at ${this.config.ollamaUrl}`,
    });

    // Check Claude
    const claudeProvider = new ClaudeProvider(
      this.config.claudeApiKey,
      this.config.claudeModel
    );
    const claudeAvailable = await claudeProvider.isAvailable();
    providers.push({
      provider: "claude",
      available: claudeAvailable,
      model: this.config.claudeModel!,
      error: claudeAvailable ? undefined : "ANTHROPIC_API_KEY not configured",
    });

    // OpenAI (future)
    providers.push({
      provider: "openai",
      available: false,
      model: this.config.openaiModel ?? "gpt-4",
      error: "OpenAI provider not yet implemented",
    });

    return providers;
  }

  /**
   * Get the reason why the current provider is unavailable.
   */
  private getUnavailableReason(): string {
    switch (this.config.provider) {
      case "ollama":
        return `Cannot connect to Ollama at ${this.config.ollamaUrl}`;
      case "claude":
        return "ANTHROPIC_API_KEY not configured";
      case "openai":
        return "OpenAI provider not yet implemented";
      default:
        return "Unknown provider";
    }
  }

  // ===========================================================================
  // Core Generation
  // ===========================================================================

  /**
   * Generate text using the current provider.
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const available = await this.provider.isAvailable();
    if (!available) {
      throw new Error(
        `${this.provider.name} provider is not available: ${this.getUnavailableReason()}`
      );
    }

    return this.provider.generate(prompt, {
      temperature: options?.temperature ?? this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
      timeoutMs: options?.timeoutMs ?? this.config.timeoutMs,
      systemPrompt: options?.systemPrompt,
      stopSequences: validateStopSequences(options?.stopSequences),
    });
  }

  // ===========================================================================
  // High-Level Convenience Methods
  // ===========================================================================

  /**
   * Generate a panel description for a comic/storyboard panel.
   */
  async generatePanelDescription(
    context: PanelDescriptionContext
  ): Promise<string> {
    // Validate and sanitize the characters array
    const validatedCharacters = validateCharactersArray(context.characters);
    const characterList = validatedCharacters
      .map((c) => `${c.name}${c.description ? ` (${c.description})` : ""}`)
      .join(", ");

    const prompt = `You are a visual storytelling expert creating panel descriptions for a comic.

Generate a vivid, detailed panel description based on this context:

${context.setting ? `Setting: ${sanitizeForPrompt(context.setting)}` : ""}
${characterList ? `Characters: ${characterList}` : ""}
${context.action ? `Action: ${sanitizeForPrompt(context.action)}` : ""}
${context.mood ? `Mood: ${sanitizeForPrompt(context.mood)}` : ""}
${context.cameraAngle ? `Camera Angle: ${sanitizeForPrompt(context.cameraAngle)}` : ""}
${context.previousPanel ? `Previous Panel: ${sanitizeForPrompt(context.previousPanel)}` : ""}

Write a 2-3 sentence visual description that:
1. Clearly describes what the reader sees
2. Mentions character poses and expressions
3. Sets the emotional tone
4. Is specific enough for an artist to draw

Respond with ONLY the description, no additional commentary.`;

    const result = await this.generate(prompt, {
      temperature: 0.7,
      maxTokens: 500,
    });

    return result.text.trim();
  }

  /**
   * Generate dialogue for a character.
   */
  async generateDialogue(context: DialogueContext): Promise<GeneratedDialogue[]> {
    // Validate and sanitize the dialogue history
    const validatedDialogue = validateDialogueHistory(context.previousDialogue);
    const previousLines = validatedDialogue.length > 0
      ? validatedDialogue.map((d) => `- "${d}"`).join("\n")
      : "None";

    const prompt = `You are a comic dialogue writer creating authentic character dialogue.

Generate dialogue for this scenario:

Character: ${sanitizeForPrompt(context.character.name)}
${context.character.personality ? `Personality: ${sanitizeForPrompt(context.character.personality)}` : ""}
${context.character.speakingStyle ? `Speaking Style: ${sanitizeForPrompt(context.character.speakingStyle)}` : ""}
Situation: ${sanitizeForPrompt(context.situation)}
${context.emotion ? `Emotional State: ${sanitizeForPrompt(context.emotion)}` : ""}
Previous Dialogue:
${previousLines}

Generate 1-3 lines of dialogue. Each line should be short (comic bubble length).

Respond with a JSON array:
[
  {
    "text": "The dialogue text",
    "type": "speech" | "thought" | "whisper" | "narration",
    "character": "character name",
    "confidence": 0.0-1.0
  }
]

Only output the JSON array, no other text.`;

    const result = await this.generate(prompt, {
      temperature: 0.8,
      maxTokens: 500,
    });

    return safeJsonParse<GeneratedDialogue[]>(result.text, "generateDialogue");
  }

  /**
   * Suggest captions from a visual description.
   * This is the method NarrativeService will use for caption inference.
   */
  async suggestCaptions(visualDescription: string): Promise<InferredCaption[]> {
    const prompt = `You are a comic caption specialist analyzing a panel description to suggest appropriate captions.

Panel Description:
"${sanitizeForPrompt(visualDescription)}"

Based on this visual description, suggest appropriate captions. Consider:
1. Any dialogue that characters might be saying based on their actions/expressions
2. Thought bubbles if a character appears to be thinking/contemplating
3. Narration boxes if context/backstory would help the reader
4. Sound effects (SFX) for any implied sounds
5. Whispers if characters appear to be speaking quietly

Respond with a JSON array:
[
  {
    "text": "The caption text",
    "type": "speech" | "thought" | "narration" | "sfx" | "whisper",
    "character": "character name or null for narration/sfx",
    "confidence": 0.0-1.0,
    "positionHint": "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  }
]

Guidelines:
- Keep dialogue short and punchy (comic bubble style)
- SFX should be onomatopoeia (CRASH!, WHOOSH, etc.)
- Narration should be brief and add context
- Set confidence based on how clearly the description implies the caption
- Only include captions you're reasonably confident about (>0.5)
- If no captions are implied, return an empty array []

Only output the JSON array, no other text.`;

    const result = await this.generate(prompt, {
      temperature: 0.6,
      maxTokens: 1000,
    });

    return safeJsonParse<InferredCaption[]>(result.text, "suggestCaptions");
  }

  /**
   * Refine text based on feedback.
   */
  async refineText(context: RefineTextContext): Promise<string> {
    const contentTypeHint =
      context.contentType === "dialogue"
        ? "Keep it short and punchy, suitable for a speech bubble."
        : context.contentType === "description"
          ? "Keep it vivid and visual, suitable for describing a comic panel."
          : context.contentType === "caption"
            ? "Keep it concise, suitable for a caption box."
            : context.contentType === "narration"
              ? "Keep it evocative, suitable for a narration box."
              : "";

    const prompt = `You are an editor refining text based on feedback.

Original Text:
"${sanitizeForPrompt(context.originalText)}"

Feedback:
${sanitizeForPrompt(context.feedback)}

${contentTypeHint}

Provide the refined text. Respond with ONLY the refined text, no explanation or commentary.`;

    const result = await this.generate(prompt, {
      temperature: 0.5,
      maxTokens: 500,
    });

    return result.text.trim();
  }

  /**
   * Get the current configuration (sensitive keys redacted).
   */
  getConfig(): Omit<TextGenerationConfig, "claudeApiKey" | "openaiApiKey"> & {
    hasClaudeKey: boolean;
    hasOpenaiKey: boolean;
  } {
    const { claudeApiKey, openaiApiKey, ...rest } = this.config;
    return {
      ...rest,
      hasClaudeKey: !!claudeApiKey,
      hasOpenaiKey: !!openaiApiKey,
    };
  }
}

// =============================================================================
// Singleton Management
// =============================================================================

let instance: TextGenerationService | null = null;
let isConfiguring = false;

/**
 * Get or create the TextGenerationService singleton.
 *
 * NOTE: Config is only applied on first creation. Subsequent calls with
 * config will log a warning. Use setProvider() for runtime changes.
 */
export function getTextGenerationService(
  config?: Partial<TextGenerationConfig>
): TextGenerationService {
  if (!instance) {
    instance = new TextGenerationService(config);
  } else if (config) {
    console.warn(
      "TextGenerationService singleton already exists. Config ignored. " +
        "Use setProvider() for runtime provider changes, or resetTextGenerationService() in tests."
    );
  }
  return instance;
}

/**
 * Check if provider change is in progress (for testing/debugging).
 */
export function isTextGenerationServiceConfiguring(): boolean {
  return isConfiguring;
}

/**
 * Internal: Set configuring state.
 */
export function _setConfiguringState(state: boolean): void {
  isConfiguring = state;
}

/**
 * Create a new TextGenerationService instance (non-singleton).
 */
export function createTextGenerationService(
  config?: Partial<TextGenerationConfig>
): TextGenerationService {
  return new TextGenerationService(config);
}

/**
 * Reset the singleton (for testing).
 */
export function resetTextGenerationService(): void {
  instance = null;
  isConfiguring = false;
}
