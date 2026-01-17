/**
 * Text Generation Routes
 *
 * REST API endpoints for provider-agnostic text generation:
 * - Provider status and switching
 * - Raw text generation
 * - High-level convenience endpoints (panel descriptions, dialogue, captions)
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  getTextGenerationService,
  type TextProvider,
  type PanelDescriptionContext,
  type DialogueContext,
  type RefineTextContext,
} from "@graphix/core";
import { errors } from "../errors/index.js";
import {
  validateBody,
  textProviderSchema,
} from "../validation/index.js";

// ============================================================================
// Validation Schemas
// ============================================================================

/** Maximum length for prompts (100KB) */
const MAX_PROMPT_LENGTH = 100000;

/** Maximum length for visual descriptions (20KB) */
const MAX_DESCRIPTION_LENGTH = 20000;

/** Maximum length for feedback (10KB) */
const MAX_FEEDBACK_LENGTH = 10000;

/** Generate text request schema */
const generateTextSchema = z.object({
  prompt: z.string().min(1, "prompt is required").max(MAX_PROMPT_LENGTH, `prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`),
  systemPrompt: z.string().max(MAX_PROMPT_LENGTH, `systemPrompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  stopSequences: z.array(z.string()).optional(),
});

/** Panel description request schema */
const panelDescriptionSchema = z.object({
  setting: z.string().max(MAX_DESCRIPTION_LENGTH, `setting exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`).optional(),
  action: z.string().max(MAX_DESCRIPTION_LENGTH, `action exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`).optional(),
  previousPanel: z.string().max(MAX_DESCRIPTION_LENGTH, `previousPanel exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`).optional(),
  characters: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
  })).optional(),
  mood: z.string().optional(),
  cameraAngle: z.string().optional(),
  lighting: z.string().optional(),
});

/** Dialogue request schema */
const dialogueSchema = z.object({
  character: z.object({
    name: z.string().min(1, "character.name is required"),
    description: z.string().optional(),
    personality: z.string().optional(),
  }),
  situation: z.string().min(1, "situation is required").max(MAX_DESCRIPTION_LENGTH, `situation exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`),
  emotion: z.string().optional(),
  previousDialogue: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
  })).optional(),
  dialogueType: z.enum(["speech", "thought", "whisper", "narration"]).optional(),
});

/** Suggest captions request schema */
const suggestCaptionsSchema = z.object({
  visualDescription: z.string().min(1, "visualDescription is required").max(MAX_DESCRIPTION_LENGTH, `visualDescription exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`),
});

/** Refine text request schema */
const refineTextSchema = z.object({
  originalText: z.string().min(1, "originalText is required").max(MAX_PROMPT_LENGTH, `originalText exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`),
  feedback: z.string().min(1, "feedback is required").max(MAX_FEEDBACK_LENGTH, `feedback exceeds maximum length of ${MAX_FEEDBACK_LENGTH} characters`),
  context: z.string().optional(),
});

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
    return errors.internal(
      c,
      error instanceof Error ? error.message : "Failed to get status"
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
    return errors.internal(
      c,
      error instanceof Error ? error.message : "Failed to list providers"
    );
  }
});

/**
 * POST /provider
 *
 * Switch to a different provider.
 */
textGenerationRoutes.post(
  "/provider",
  validateBody(textProviderSchema),
  async (c) => {
    const { provider } = c.req.valid("json");

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
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to switch provider"
      );
    }
  }
);

// ----------------------------------------------------------------------------
// Text Generation
// ----------------------------------------------------------------------------

/**
 * POST /generate
 *
 * Generate text from a prompt.
 */
textGenerationRoutes.post(
  "/generate",
  validateBody(generateTextSchema),
  async (c) => {
    const { prompt, systemPrompt, temperature, maxTokens, timeoutMs, stopSequences } =
      c.req.valid("json");

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
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to generate text"
      );
    }
  }
);

// ----------------------------------------------------------------------------
// High-Level Convenience Endpoints
// ----------------------------------------------------------------------------

/**
 * POST /panel-description
 *
 * Generate a panel description for a comic/storyboard.
 */
textGenerationRoutes.post(
  "/panel-description",
  validateBody(panelDescriptionSchema),
  async (c) => {
    const context = c.req.valid("json") as PanelDescriptionContext;

    try {
      const service = getTextGenerationService();
      const description = await service.generatePanelDescription(context);

      return c.json({
        description,
        provider: service.getProvider(),
      });
    } catch (error) {
      console.error("Error generating panel description:", error);
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to generate panel description"
      );
    }
  }
);

/**
 * POST /dialogue
 *
 * Generate dialogue for a character.
 */
textGenerationRoutes.post(
  "/dialogue",
  validateBody(dialogueSchema),
  async (c) => {
    const context = c.req.valid("json") as unknown as DialogueContext;

    try {
      const service = getTextGenerationService();
      const dialogue = await service.generateDialogue(context);

      return c.json({
        dialogue,
        provider: service.getProvider(),
      });
    } catch (error) {
      console.error("Error generating dialogue:", error);
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to generate dialogue"
      );
    }
  }
);

/**
 * POST /suggest-captions
 *
 * Suggest captions from a visual description.
 */
textGenerationRoutes.post(
  "/suggest-captions",
  validateBody(suggestCaptionsSchema),
  async (c) => {
    const { visualDescription } = c.req.valid("json");

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
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to suggest captions"
      );
    }
  }
);

/**
 * POST /refine
 *
 * Refine text based on feedback.
 */
textGenerationRoutes.post(
  "/refine",
  validateBody(refineTextSchema),
  async (c) => {
    const context = c.req.valid("json") as unknown as RefineTextContext;

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
      return errors.internal(
        c,
        error instanceof Error ? error.message : "Failed to refine text"
      );
    }
  }
);
