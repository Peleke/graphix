/**
 * Text Generation API Hooks
 *
 * TanStack Query hooks for AI text generation endpoints.
 * Supports panel descriptions, dialogue, caption suggestions, and text refinement.
 *
 * Note: These endpoints use direct fetch calls since they're not yet part of
 * the typed OpenAPI schema.
 */

import { useMutation } from "@tanstack/react-query";

// ============================================================================
// Query Keys
// ============================================================================

export const textGenerationKeys = {
  all: ["text"] as const,
  panelDescription: (panelId: string) =>
    [...textGenerationKeys.all, "panel-description", panelId] as const,
  dialogue: (panelId: string) =>
    [...textGenerationKeys.all, "dialogue", panelId] as const,
  captions: (panelId: string) =>
    [...textGenerationKeys.all, "captions", panelId] as const,
  refine: () => [...textGenerationKeys.all, "refine"] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface GeneratePanelDescriptionInput {
  panelId: string;
  storyboardId?: string;
  characterIds?: string[];
  style?: "concise" | "detailed" | "cinematic";
}

export interface GeneratePanelDescriptionResponse {
  text: string;
  confidence: number;
  provider: string;
  model: string;
}

export interface GenerateDialogueInput {
  panelId: string;
  characterIds: string[];
  context?: string;
  tone?: "dramatic" | "comedic" | "neutral" | "tense";
}

export interface DialogueLine {
  characterId: string;
  characterName?: string;
  line: string;
}

export interface GenerateDialogueResponse {
  dialogue: DialogueLine[];
  provider: string;
  model: string;
}

export interface SuggestCaptionsInput {
  panelId: string;
  type: "speech" | "thought" | "narration" | "all";
  visualDescription?: string;
}

export interface SuggestedCaption {
  type: "speech" | "thought" | "narration" | "sfx" | "whisper";
  text: string;
  speakerDescription?: string;
  confidence: number;
}

export interface SuggestCaptionsResponse {
  suggestions: SuggestedCaption[];
  count: number;
  provider: string;
}

export interface RefineTextInput {
  text: string;
  instruction: string;
  style?: "formal" | "casual" | "dramatic" | "poetic";
}

export interface RefineTextResponse {
  refinedText: string;
  originalText: string;
  provider: string;
}

// ============================================================================
// API Helper
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function postTextGeneration<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/text/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Generate a panel description/prompt based on panel context.
 * Returns a suggested prompt for image generation.
 */
export function useGeneratePanelDescription() {
  return useMutation({
    mutationFn: async (
      input: GeneratePanelDescriptionInput
    ): Promise<GeneratePanelDescriptionResponse> => {
      const response = await postTextGeneration<GeneratePanelDescriptionResponse & { description?: string }>(
        "panel-description",
        input
      );
      // Handle both old API (description) and new API (text) formats
      return {
        ...response,
        text: response.text || (response as any).description || "",
        confidence: response.confidence || 0.85,
        provider: response.provider || "unknown",
        model: response.model || "text-generation",
      };
    },
  });
}

/**
 * Generate dialogue for characters in a scene.
 * Returns dialogue lines for each character.
 */
export function useGenerateDialogue() {
  return useMutation({
    mutationFn: async (
      input: GenerateDialogueInput
    ): Promise<GenerateDialogueResponse> => {
      return postTextGeneration<GenerateDialogueResponse>("dialogue", input);
    },
  });
}

/**
 * Suggest captions for a panel based on visual description.
 * Returns multiple caption suggestions with confidence scores.
 */
export function useSuggestCaptionsAI() {
  return useMutation({
    mutationFn: async (
      input: SuggestCaptionsInput
    ): Promise<SuggestCaptionsResponse> => {
      return postTextGeneration<SuggestCaptionsResponse>("suggest-captions", input);
    },
  });
}

/**
 * Refine or improve existing text with an instruction.
 * Useful for editing prompts, dialogue, or descriptions.
 */
export function useRefineText() {
  return useMutation({
    mutationFn: async (input: RefineTextInput): Promise<RefineTextResponse & { refined: string }> => {
      // Transform frontend input to backend format
      const backendInput = {
        originalText: input.text,
        feedback: input.instruction,
        context: input.style,
      };
      const result = await postTextGeneration<RefineTextResponse>("refine", backendInput);
      // Add `refined` alias for backwards compatibility
      return {
        ...result,
        refined: result.refinedText,
      };
    },
  });
}

// ============================================================================
// Beat-to-Prompt Types and Hook
// ============================================================================

export type CameraAngle =
  | "wide"
  | "medium"
  | "close-up"
  | "extreme close-up"
  | "over-the-shoulder"
  | "bird's eye"
  | "low angle"
  | "dutch angle";

export type ModelFamily = "pony" | "illustrious" | "flux" | "sdxl" | "sd15" | "realistic";

export interface BeatPromptInput {
  visualDescription: string;
  emotionalTone?: string;
  cameraAngle?: CameraAngle;
  characters?: Array<{
    name: string;
    description?: string;
    species?: string;
  }>;
  modelFamily?: ModelFamily;
  style?: string;
}

export interface BeatPromptResponse {
  positive: string;
  negative: string;
  qualityTags?: string[];
  characterTags?: string[];
  provider: string;
}

/**
 * Generate Stable Diffusion prompt from a story beat.
 * Converts beat fields (visual description, emotional tone, camera angle)
 * into optimized positive/negative prompts.
 */
export function useGeneratePromptFromBeat() {
  return useMutation({
    mutationFn: async (input: BeatPromptInput): Promise<BeatPromptResponse> => {
      return postTextGeneration<BeatPromptResponse>("beat-to-prompt", input);
    },
  });
}

// ============================================================================
// Streaming Support (for real-time text generation)
// ============================================================================

export interface StreamingTextOptions {
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Stream panel description generation for real-time UI updates.
 * Uses EventSource for server-sent events.
 */
export function streamPanelDescription(
  input: GeneratePanelDescriptionInput,
  options: StreamingTextOptions
): () => void {
  const params = new URLSearchParams({
    panelId: input.panelId,
    ...(input.storyboardId && { storyboardId: input.storyboardId }),
    ...(input.style && { style: input.style }),
    ...(input.characterIds && { characterIds: input.characterIds.join(",") }),
  });

  const eventSource = new EventSource(
    `${API_BASE}/text/panel-description/stream?${params}`
  );

  let fullText = "";

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.chunk) {
        fullText += data.chunk;
        options.onChunk(data.chunk);
      }
      if (data.done) {
        options.onComplete(fullText);
        eventSource.close();
      }
    } catch {
      // Plain text chunk
      fullText += event.data;
      options.onChunk(event.data);
    }
  };

  eventSource.onerror = () => {
    options.onError(new Error("Stream connection failed"));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// ============================================================================
// Spice Prompt Hook
// ============================================================================

export interface SpicePromptInput {
  prompt: string;
  target: "positive" | "negative";
}

export interface SpicePromptResponse {
  originalPrompt: string;
  spicedPrompt: string;
  target: "positive" | "negative";
  provider: string;
}

/**
 * Spice up an image generation prompt - transform it into explicit NSFW content.
 * Uses dedicated backend endpoint with proper NSFW instructions.
 */
export function useSpicePrompt() {
  return useMutation({
    mutationFn: async (input: SpicePromptInput): Promise<SpicePromptResponse> => {
      return postTextGeneration<SpicePromptResponse>("spice", input);
    },
  });
}

/**
 * Stream text refinement for real-time updates.
 */
export function streamRefineText(
  input: RefineTextInput,
  options: StreamingTextOptions
): () => void {
  const abortController = new AbortController();

  fetch(`${API_BASE}/text/refine/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Stream request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        options.onChunk(chunk);
      }

      options.onComplete(fullText);
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        options.onError(error);
      }
    });

  return () => {
    abortController.abort();
  };
}
