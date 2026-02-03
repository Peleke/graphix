/**
 * Text Generation Types
 *
 * Provider-agnostic text generation system types.
 * Supports Ollama (local/remote), Claude, and future providers.
 */

// =============================================================================
// Provider Types
// =============================================================================

/** Supported text generation providers */
export type TextProvider = "ollama" | "claude" | "openai";

/** Provider status */
export interface ProviderStatus {
  provider: TextProvider;
  available: boolean;
  model: string;
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

/** Unified configuration for all text generation providers */
export interface TextGenerationConfig {
  /** Primary provider to use */
  provider: TextProvider;

  // Ollama settings (local or remote)
  /** Ollama base URL (default: http://localhost:11434) */
  ollamaUrl?: string;
  /** Ollama model (default: llama3.2) */
  ollamaModel?: string;

  // Claude settings
  /** Claude/Anthropic API key */
  claudeApiKey?: string;
  /** Claude model (default: claude-sonnet-4-20250514) */
  claudeModel?: string;

  // OpenAI settings (future)
  /** OpenAI API key */
  openaiApiKey?: string;
  /** OpenAI model (default: gpt-4) */
  openaiModel?: string;

  // Common settings
  /** Generation temperature (0-1, default: 0.7) */
  temperature?: number;
  /** Maximum tokens to generate (default: 4096) */
  maxTokens?: number;
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
}

/** Default configuration values */
export const DEFAULT_TEXT_CONFIG: Required<
  Pick<TextGenerationConfig, "ollamaUrl" | "ollamaModel" | "claudeModel" | "temperature" | "maxTokens" | "timeoutMs">
> = {
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  claudeModel: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 4096,
  timeoutMs: 60000,
};

// =============================================================================
// Generation Options & Results
// =============================================================================

/** Options for text generation */
export interface GenerateOptions {
  /** Override temperature for this request */
  temperature?: number;
  /** Override max tokens for this request */
  maxTokens?: number;
  /** Override timeout for this request */
  timeoutMs?: number;
  /** System prompt to prepend */
  systemPrompt?: string;
  /** Stop sequences to halt generation */
  stopSequences?: string[];
}

/** Result from text generation */
export interface GenerateResult {
  /** Generated text */
  text: string;
  /** Model used for generation */
  model: string;
  /** Provider that generated the text */
  provider: TextProvider;
  /** Tokens used (if available) */
  tokensUsed?: number;
  /** Input tokens (if available) */
  inputTokens?: number;
  /** Output tokens (if available) */
  outputTokens?: number;
}

// =============================================================================
// Provider Interface
// =============================================================================

/** Interface that all text generation providers must implement */
export interface TextGenerationProvider {
  /** Provider name for identification */
  readonly name: TextProvider;

  /**
   * Check if the provider is available and ready.
   * For Ollama: checks if server is reachable
   * For Claude: checks if API key is configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate text from a prompt.
   * @param prompt The input prompt
   * @param options Generation options
   * @returns Generated text with metadata
   */
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
}

// =============================================================================
// High-Level Feature Types (for convenience methods)
// =============================================================================

/** Context for panel description generation */
export interface PanelDescriptionContext {
  /** Scene setting or location */
  setting?: string;
  /** Characters in the panel */
  characters?: Array<{
    name: string;
    description?: string;
  }>;
  /** Action or event happening */
  action?: string;
  /** Emotional tone */
  mood?: string;
  /** Camera angle or perspective */
  cameraAngle?: string;
  /** Previous panel description for continuity */
  previousPanel?: string;
}

/** Context for dialogue generation */
export interface DialogueContext {
  /** Character speaking */
  character: {
    name: string;
    personality?: string;
    speakingStyle?: string;
  };
  /** Situation or scene context */
  situation: string;
  /** Previous dialogue lines for continuity */
  previousDialogue?: string[];
  /** Emotional state */
  emotion?: string;
  /** Desired dialogue type */
  type?: "speech" | "thought" | "whisper" | "narration";
}

/** Generated dialogue result */
export interface GeneratedDialogue {
  /** The dialogue text */
  text: string;
  /** Type of dialogue */
  type: "speech" | "thought" | "whisper" | "narration";
  /** Character name (if applicable) */
  character?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/** Inferred caption from visual description */
export interface InferredCaption {
  /** Caption text */
  text: string;
  /** Caption type */
  type: "speech" | "thought" | "narration" | "sfx" | "whisper";
  /** Character speaking (if applicable) */
  character?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested position hint */
  positionHint?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
}

/** Context for text refinement */
export interface RefineTextContext {
  /** Original text to refine */
  originalText: string;
  /** Feedback or instructions for refinement */
  feedback: string;
  /** Type of content being refined */
  contentType?: "dialogue" | "description" | "caption" | "narration";
}

// =============================================================================
// Beat-to-Prompt Types
// =============================================================================

/** Camera angles that can be used in beat descriptions */
export type CameraAngle =
  | "wide"
  | "medium"
  | "close-up"
  | "extreme close-up"
  | "over-the-shoulder"
  | "bird's eye"
  | "low angle"
  | "dutch angle";

/** Context for generating SD prompt from beat */
export interface BeatPromptContext {
  /** Visual description of the beat/scene */
  visualDescription: string;
  /** Emotional tone of the scene */
  emotionalTone?: string;
  /** Camera angle/framing */
  cameraAngle?: CameraAngle;
  /** Characters in the scene */
  characters?: Array<{
    name: string;
    description?: string;
    species?: string;
    /** Character's base prompt fragment for consistent appearance */
    basePrompt?: string;
    /** Visual features like hair color, eye color, etc. */
    features?: string[];
    /** Current clothing/outfit */
    clothing?: string[];
  }>;
  /** Model family for prompt optimization */
  modelFamily?: "pony" | "illustrious" | "flux" | "sdxl" | "sd15" | "realistic";
  /** Style hints (e.g., "comic", "manga", "realistic") */
  style?: string;
  /** Narrative context - what's happening in the story */
  narrativeContext?: string;
  /** Composition hints (e.g., "rule-of-thirds", "centered") */
  composition?: string;
  /** What each character is doing: { characterId: "action description" } */
  characterActions?: Record<string, string>;
  /** Beat type for narrative pacing hints */
  beatType?: string;
  /** Dialogue in this beat */
  dialogue?: Array<{ characterId: string; text: string; type: "speech" | "thought" | "whisper" }>;
  /** Narration text */
  narration?: string;
  /** Sound effects */
  sfx?: string;
}

/** Generated prompt result from beat */
export interface BeatPromptResult {
  /** Positive prompt optimized for SD */
  positive: string;
  /** Negative prompt optimized for SD */
  negative: string;
  /** Suggested quality tags based on model family */
  qualityTags?: string[];
  /** Character-related tags extracted */
  characterTags?: string[];
}
