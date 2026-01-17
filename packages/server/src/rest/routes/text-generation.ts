/**
 * Text Generation Routes
 *
 * REST API endpoints for provider-agnostic text generation:
 * - Provider status and switching
 * - Raw text generation
 * - High-level convenience endpoints (panel descriptions, dialogue, captions)
 */

import { Hono } from "hono";
import {
  getTextGenerationService,
  type TextProvider,
  type PanelDescriptionContext,
  type DialogueContext,
  type RefineTextContext,
} from "@graphix/core";

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_PROVIDERS: readonly TextProvider[] = ["ollama", "claude", "openai"];
const VALID_CAPTION_TYPES: readonly string[] = ["speech", "thought", "narration", "sfx", "whisper"];
const VALID_DIALOGUE_TYPES: readonly string[] = ["speech", "thought", "whisper", "narration"];

/** Maximum length for prompts (100KB) */
const MAX_PROMPT_LENGTH = 100000;

/** Maximum length for visual descriptions (20KB) */
const MAX_DESCRIPTION_LENGTH = 20000;

/** Maximum length for feedback (10KB) */
const MAX_FEEDBACK_LENGTH = 10000;

/**
 * Create a consistent error response.
 */
function errorResponse(message: string, code: string = "BAD_REQUEST") {
  return { error: message, code };
}

/**
 * Result of parsing a JSON body.
 */
type BodyParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

/**
 * Safely parse JSON body from request.
 */
async function safeParseBody<T extends Record<string, unknown>>(
  c: { req: { json: () => Promise<T> } },
  allowEmpty = false
): Promise<BodyParseResult<T>> {
  try {
    const body = await c.req.json();
    return { success: true, data: body };
  } catch {
    if (allowEmpty) {
      return { success: true, data: {} as T };
    }
    return {
      success: false,
      error: { message: "Invalid JSON body", code: "INVALID_JSON" },
    };
  }
}

/**
 * Validate string length.
 */
function validateLength(
  value: string | undefined,
  maxLength: number,
  fieldName: string
): string | null {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }
  return null;
}

// ============================================================================
// Routes
// ============================================================================

export const textGenerationRoutes = new Hono();

// ----------------------------------------------------------------------------
// Provider Status & Configuration
// ----------------------------------------------------------------------------

/**
 * GET /status
 *
 * Get current provider status.
 */
textGenerationRoutes.get("/status", async (c) => {
  try {
    const service = getTextGenerationService();
    const status = await service.getStatus();

    return c.json({
      ...status,
      config: service.getConfig(),
    });
  } catch (error) {
    console.error("Error getting text generation status:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to get status",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * GET /providers
 *
 * List all available providers with their status.
 */
textGenerationRoutes.get("/providers", async (c) => {
  try {
    const service = getTextGenerationService();
    const providers = await service.listProviders();

    return c.json({
      current: service.getProvider(),
      providers,
    });
  } catch (error) {
    console.error("Error listing providers:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to list providers",
        "INTERNAL_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /provider
 *
 * Switch to a different provider.
 */
textGenerationRoutes.post("/provider", async (c) => {
  const bodyResult = await safeParseBody<{ provider: string }>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { provider } = bodyResult.data;

  if (!provider) {
    return c.json(errorResponse("provider is required"), 400);
  }

  if (!VALID_PROVIDERS.includes(provider as TextProvider)) {
    return c.json(
      errorResponse(
        `Invalid provider. Valid options: ${VALID_PROVIDERS.join(", ")}`,
        "INVALID_PROVIDER"
      ),
      400
    );
  }

  try {
    const service = getTextGenerationService();
    service.setProvider(provider as TextProvider);

    const status = await service.getStatus();

    return c.json({
      message: `Switched to ${provider} provider`,
      ...status,
    });
  } catch (error) {
    console.error("Error switching provider:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to switch provider",
        "PROVIDER_ERROR"
      ),
      500
    );
  }
});

// ----------------------------------------------------------------------------
// Text Generation
// ----------------------------------------------------------------------------

/**
 * POST /generate
 *
 * Generate text from a prompt.
 */
textGenerationRoutes.post("/generate", async (c) => {
  const bodyResult = await safeParseBody<{
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    stopSequences?: string[];
  }>(c);

  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { prompt, systemPrompt, temperature, maxTokens, timeoutMs, stopSequences } =
    bodyResult.data;

  if (!prompt) {
    return c.json(errorResponse("prompt is required"), 400);
  }

  const lengthError = validateLength(prompt, MAX_PROMPT_LENGTH, "prompt");
  if (lengthError) {
    return c.json(errorResponse(lengthError), 400);
  }

  if (systemPrompt) {
    const sysLengthError = validateLength(systemPrompt, MAX_PROMPT_LENGTH, "systemPrompt");
    if (sysLengthError) {
      return c.json(errorResponse(sysLengthError), 400);
    }
  }

  try {
    const service = getTextGenerationService();
    const result = await service.generate(prompt, {
      systemPrompt,
      temperature,
      maxTokens,
      timeoutMs,
      stopSequences,
    });

    return c.json(result);
  } catch (error) {
    console.error("Error generating text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to generate text",
        "GENERATION_ERROR"
      ),
      500
    );
  }
});

// ----------------------------------------------------------------------------
// High-Level Convenience Endpoints
// ----------------------------------------------------------------------------

/**
 * POST /panel-description
 *
 * Generate a panel description for a comic/storyboard.
 */
textGenerationRoutes.post("/panel-description", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const context = bodyResult.data as PanelDescriptionContext;

  // Validate lengths
  if (context.setting) {
    const err = validateLength(context.setting, MAX_DESCRIPTION_LENGTH, "setting");
    if (err) return c.json(errorResponse(err), 400);
  }
  if (context.action) {
    const err = validateLength(context.action, MAX_DESCRIPTION_LENGTH, "action");
    if (err) return c.json(errorResponse(err), 400);
  }
  if (context.previousPanel) {
    const err = validateLength(context.previousPanel, MAX_DESCRIPTION_LENGTH, "previousPanel");
    if (err) return c.json(errorResponse(err), 400);
  }

  try {
    const service = getTextGenerationService();
    const description = await service.generatePanelDescription(context);

    return c.json({
      description,
      provider: service.getProvider(),
    });
  } catch (error) {
    console.error("Error generating panel description:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to generate panel description",
        "GENERATION_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /dialogue
 *
 * Generate dialogue for a character.
 */
textGenerationRoutes.post("/dialogue", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const context = bodyResult.data as unknown as DialogueContext;

  if (!context.character?.name) {
    return c.json(errorResponse("character.name is required"), 400);
  }
  if (!context.situation) {
    return c.json(errorResponse("situation is required"), 400);
  }

  const situationErr = validateLength(context.situation, MAX_DESCRIPTION_LENGTH, "situation");
  if (situationErr) return c.json(errorResponse(situationErr), 400);

  try {
    const service = getTextGenerationService();
    const dialogue = await service.generateDialogue(context);

    return c.json({
      dialogue,
      provider: service.getProvider(),
    });
  } catch (error) {
    console.error("Error generating dialogue:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to generate dialogue",
        "GENERATION_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /suggest-captions
 *
 * Suggest captions from a visual description.
 */
textGenerationRoutes.post("/suggest-captions", async (c) => {
  const bodyResult = await safeParseBody<{ visualDescription: string }>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const { visualDescription } = bodyResult.data;

  if (!visualDescription) {
    return c.json(errorResponse("visualDescription is required"), 400);
  }

  const lengthErr = validateLength(visualDescription, MAX_DESCRIPTION_LENGTH, "visualDescription");
  if (lengthErr) return c.json(errorResponse(lengthErr), 400);

  try {
    const service = getTextGenerationService();
    const captions = await service.suggestCaptions(visualDescription);

    return c.json({
      captions,
      count: captions.length,
      provider: service.getProvider(),
    });
  } catch (error) {
    console.error("Error suggesting captions:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to suggest captions",
        "GENERATION_ERROR"
      ),
      500
    );
  }
});

/**
 * POST /refine
 *
 * Refine text based on feedback.
 */
textGenerationRoutes.post("/refine", async (c) => {
  const bodyResult = await safeParseBody<Record<string, unknown>>(c);
  if (!bodyResult.success) {
    return c.json(errorResponse(bodyResult.error.message, bodyResult.error.code), 400);
  }

  const context = bodyResult.data as unknown as RefineTextContext;

  if (!context.originalText) {
    return c.json(errorResponse("originalText is required"), 400);
  }
  if (!context.feedback) {
    return c.json(errorResponse("feedback is required"), 400);
  }

  const textErr = validateLength(context.originalText, MAX_PROMPT_LENGTH, "originalText");
  if (textErr) return c.json(errorResponse(textErr), 400);

  const feedbackErr = validateLength(context.feedback, MAX_FEEDBACK_LENGTH, "feedback");
  if (feedbackErr) return c.json(errorResponse(feedbackErr), 400);

  try {
    const service = getTextGenerationService();
    const refinedText = await service.refineText(context);

    return c.json({
      originalText: context.originalText,
      refinedText,
      provider: service.getProvider(),
    });
  } catch (error) {
    console.error("Error refining text:", error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to refine text",
        "GENERATION_ERROR"
      ),
      500
    );
  }
});
