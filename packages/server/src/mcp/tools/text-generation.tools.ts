/**
 * Text Generation MCP Tools
 *
 * Tools for provider-agnostic text generation:
 * - Provider status and switching
 * - Raw text generation
 * - High-level convenience tools (panel descriptions, dialogue, captions)
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  getTextGenerationService,
  type TextProvider,
  type PanelDescriptionContext,
  type DialogueContext,
  type RefineTextContext,
} from "@graphix/core";

// ============================================================================
// Tool Definitions
// ============================================================================

export const textGenerationTools: Record<string, Tool> = {
  text_status: {
    name: "text_status",
    description:
      "Check whether the active LLM text generation provider is reachable and return its current configuration. " +
      "Call before any text_generate/text_dialogue/text_panel_description call when you are unsure if the provider is online. " +
      "Unlike text_list_providers (which enumerates all providers), this checks only the currently active one. " +
      "Returns { provider, available: boolean, model, config: { temperature, maxTokens } }. Response ~0.3 KB. No parameters required.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  text_list_providers: {
    name: "text_list_providers",
    description:
      "Enumerate all configured LLM providers (ollama, claude, openai) with their availability status and which one is currently active. " +
      "Call when the user asks which text backends are available or before switching providers with text_set_provider. " +
      "Unlike text_status (single active provider health check), this returns info on every provider. " +
      "Returns { current: string, providers: [{ name, available, model }] }. Response ~0.5 KB. No parameters required.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  text_set_provider: {
    name: "text_set_provider",
    description:
      "Switch the active LLM text generation backend to a different provider. " +
      "Call when the user explicitly requests a provider change, or when the current provider is unavailable (check with text_status first). " +
      "Valid values: 'ollama', 'claude', 'openai'. All subsequent text_generate/text_dialogue/text_panel_description calls will use the new provider. " +
      "Returns { message, provider, available, model }. Response ~0.3 KB.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["ollama", "claude", "openai"],
          description: "The provider to switch to",
        },
      },
      required: ["provider"],
    },
  },

  text_generate: {
    name: "text_generate",
    description:
      "Send a free-form prompt to the active LLM provider and return the raw generated text. " +
      "Call for general-purpose text generation that does not fit the specialized tools (text_panel_description, text_dialogue, text_suggest_captions, text_refine, prompt_spice). " +
      "Supports systemPrompt, temperature (0-2), maxTokens (up to 100k), and timeoutMs. " +
      "Returns { text: string, provider, tokensUsed }. Response size depends on maxTokens (default 4096).",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to generate text from",
        },
        systemPrompt: {
          type: "string",
          description: "Optional system prompt to set context",
        },
        temperature: {
          type: "number",
          description: "Generation temperature (0-1, default: 0.7)",
        },
        maxTokens: {
          type: "number",
          description: "Maximum tokens to generate (default: 4096)",
        },
        timeoutMs: {
          type: "number",
          description: "Request timeout in milliseconds (default: 60000)",
        },
      },
      required: ["prompt"],
    },
  },

  text_panel_description: {
    name: "text_panel_description",
    description:
      "Generate an image-generation-ready visual description for a single comic panel from scene context (setting, characters, action, mood, camera angle). " +
      "Call when you have narrative context and need a detailed prompt suitable for feeding into panels_generate_batch or the image generation pipeline. " +
      "Unlike text_dialogue (generates spoken lines) or text_suggest_captions (generates overlay text), this produces visual scene descriptions. " +
      "Returns { description: string, provider }. Response ~0.5-1 KB.",
    inputSchema: {
      type: "object",
      properties: {
        setting: {
          type: "string",
          description: "The scene setting or location",
        },
        characters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name"],
          },
          description: "Characters in the panel",
        },
        action: {
          type: "string",
          description: "The action or event happening",
        },
        mood: {
          type: "string",
          description: "The emotional tone of the panel",
        },
        cameraAngle: {
          type: "string",
          description: "Camera angle or perspective (e.g., 'close-up', 'wide shot')",
        },
        previousPanel: {
          type: "string",
          description: "Description of the previous panel for continuity",
        },
      },
      required: [],
    },
  },

  text_dialogue: {
    name: "text_dialogue",
    description:
      "Generate in-character dialogue (speech, thought, whisper, or narration) for a named character given their personality, speaking style, emotional state, and scene situation. " +
      "Call when writing dialogue for a specific panel and you want text that sounds like the character. " +
      "Unlike text_suggest_captions (infers all caption types from a visual description) or text_panel_description (visual scene prompt), this focuses on one character's voice. " +
      "Returns { dialogue: string, provider }. Response ~0.3-0.5 KB.",
    inputSchema: {
      type: "object",
      properties: {
        characterName: {
          type: "string",
          description: "Name of the character speaking",
        },
        personality: {
          type: "string",
          description: "Character's personality traits",
        },
        speakingStyle: {
          type: "string",
          description: "How the character speaks (formal, casual, etc.)",
        },
        situation: {
          type: "string",
          description: "The current situation or scene context",
        },
        emotion: {
          type: "string",
          description: "Character's emotional state",
        },
        previousDialogue: {
          type: "array",
          items: { type: "string" },
          description: "Previous lines of dialogue for continuity",
        },
        type: {
          type: "string",
          enum: ["speech", "thought", "whisper", "narration"],
          description: "Type of dialogue to generate",
        },
      },
      required: ["characterName", "situation"],
    },
  },

  text_suggest_captions: {
    name: "text_suggest_captions",
    description:
      "Given a visual description of a panel, suggest a set of captions (dialogue, thought bubbles, narration boxes, SFX) that would accompany the image. " +
      "Call after generating or describing a panel image when you need to populate it with text overlays. " +
      "Unlike text_dialogue (one character's lines given personality context) this infers ALL caption types from the visual scene. " +
      "Returns { captions: [{ type, text, characterName? }], count, provider }. Response ~0.5-1 KB.",
    inputSchema: {
      type: "object",
      properties: {
        visualDescription: {
          type: "string",
          description:
            "Description of what's happening visually in the panel. Include character actions, expressions, and any implied sounds.",
        },
      },
      required: ["visualDescription"],
    },
  },

  text_refine: {
    name: "text_refine",
    description:
      "Rewrite existing text (dialogue, description, caption, or narration) according to specific feedback instructions. " +
      "Call when the user says 'make it shorter', 'more dramatic', 'change tone', etc. on text that was already generated. " +
      "Unlike text_generate (free-form, from scratch) or prompt_spice (image prompt enhancement), this takes original text + feedback and returns a refined version. " +
      "Returns { originalText, refinedText, provider }. Response ~0.5-1 KB.",
    inputSchema: {
      type: "object",
      properties: {
        originalText: {
          type: "string",
          description: "The text to refine",
        },
        feedback: {
          type: "string",
          description: "Feedback or instructions for how to refine the text",
        },
        contentType: {
          type: "string",
          enum: ["dialogue", "description", "caption", "narration"],
          description: "Type of content being refined (affects style)",
        },
      },
      required: ["originalText", "feedback"],
    },
  },

  prompt_spice: {
    name: "prompt_spice",
    description:
      "Enhance an image generation prompt with artistic, stylistic, and explicit NSFW details and tags. " +
      "Call when the user wants to amplify a plain prompt for more vivid or explicit image generation output. Target 'positive' adds content tags; 'negative' adds quality-negative tags. " +
      "Unlike text_refine (rewrites arbitrary text from feedback) or text_panel_description (generates scene descriptions from context), this specifically transforms image generation prompts. " +
      "Returns { originalPrompt, spicedPrompt, target, provider }. Response ~0.5 KB.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The original image generation prompt to spice up",
        },
        target: {
          type: "string",
          enum: ["positive", "negative"],
          description: "Whether to spice the positive prompt (add explicit content) or negative prompt (add NSFW quality negatives)",
          default: "positive",
        },
      },
      required: ["prompt"],
    },
  },
};

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * Execute a text generation tool.
 */
export async function handleTextGenerationTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  /**
   * Sanitize error messages to prevent information leakage.
   */
  function sanitizeError(error: unknown): string {
    const message = error instanceof Error ? error.message : "An error occurred";
    // Remove sensitive paths/stack traces
    if (message.includes("/") && message.includes(".")) {
      return "An internal error occurred";
    }
    if (message.includes("SQLITE_") || message.includes("ECONNREFUSED")) {
      return "Service temporarily unavailable";
    }
    return message;
  }

  try {
    const service = getTextGenerationService();

    switch (name) {
      // -------------------------------------------------------------------------
      // Provider Management
      // -------------------------------------------------------------------------

      case "text_status": {
        try {
          const status = await service.getStatus();
          return {
            ...status,
            config: service.getConfig(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "text_list_providers": {
        try {
          const providers = await service.listProviders();
          return {
            current: service.getProvider(),
            providers,
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "text_set_provider": {
        const provider = args.provider as TextProvider;

        if (!provider) {
          return { error: "provider is required" };
        }

        const validProviders: TextProvider[] = ["ollama", "claude", "openai"];
        if (!validProviders.includes(provider)) {
          return {
            error: `Invalid provider. Valid options: ${validProviders.join(", ")}`,
          };
        }

        try {
          service.setProvider(provider);
          const status = await service.getStatus();
          return {
            message: `Switched to ${provider} provider`,
            ...status,
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      // -------------------------------------------------------------------------
      // Text Generation
      // -------------------------------------------------------------------------

      case "text_generate": {
        const prompt = args.prompt as string;
        if (!prompt) {
          return { error: "prompt is required" };
        }

        // Validate numeric bounds
        const temperature = args.temperature as number | undefined;
        if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
          return { error: "temperature must be between 0 and 2" };
        }

        const maxTokens = args.maxTokens as number | undefined;
        if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 100000)) {
          return { error: "maxTokens must be between 1 and 100000" };
        }

        const timeoutMs = args.timeoutMs as number | undefined;
        if (timeoutMs !== undefined && (timeoutMs < 1000 || timeoutMs > 300000)) {
          return { error: "timeoutMs must be between 1000 and 300000" };
        }

        try {
          const result = await service.generate(prompt, {
            systemPrompt: args.systemPrompt as string | undefined,
            temperature,
            maxTokens,
            timeoutMs,
          });

          return result;
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      // -------------------------------------------------------------------------
      // High-Level Convenience Tools
      // -------------------------------------------------------------------------

      case "text_panel_description": {
        const context: PanelDescriptionContext = {
          setting: args.setting as string | undefined,
          characters: args.characters as Array<{ name: string; description?: string }> | undefined,
          action: args.action as string | undefined,
          mood: args.mood as string | undefined,
          cameraAngle: args.cameraAngle as string | undefined,
          previousPanel: args.previousPanel as string | undefined,
        };

        try {
          const description = await service.generatePanelDescription(context);
          return {
            description,
            provider: service.getProvider(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "text_dialogue": {
        const characterName = args.characterName as string;
        const situation = args.situation as string;

        if (!characterName) {
          return { error: "characterName is required" };
        }
        if (!situation) {
          return { error: "situation is required" };
        }

        const context: DialogueContext = {
          character: {
            name: characterName,
            personality: args.personality as string | undefined,
            speakingStyle: args.speakingStyle as string | undefined,
          },
          situation,
          emotion: args.emotion as string | undefined,
          previousDialogue: args.previousDialogue as string[] | undefined,
          type: args.type as "speech" | "thought" | "whisper" | "narration" | undefined,
        };

        try {
          const dialogue = await service.generateDialogue(context);
          return {
            dialogue,
            provider: service.getProvider(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "text_suggest_captions": {
        const visualDescription = args.visualDescription as string;

        if (!visualDescription) {
          return { error: "visualDescription is required" };
        }

        try {
          const captions = await service.suggestCaptions(visualDescription);
          return {
            captions,
            count: captions.length,
            provider: service.getProvider(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "text_refine": {
        const originalText = args.originalText as string;
        const feedback = args.feedback as string;

        if (!originalText) {
          return { error: "originalText is required" };
        }
        if (!feedback) {
          return { error: "feedback is required" };
        }

        const context: RefineTextContext = {
          originalText,
          feedback,
          contentType: args.contentType as
            | "dialogue"
            | "description"
            | "caption"
            | "narration"
            | undefined,
        };

        try {
          const refinedText = await service.refineText(context);
          return {
            originalText,
            refinedText,
            provider: service.getProvider(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      case "prompt_spice": {
        const prompt = args.prompt as string;
        const target = (args.target as "positive" | "negative") ?? "positive";

        if (!prompt) {
          return { error: "prompt is required" };
        }

        try {
          const spicedPrompt = await service.spicePrompt(prompt, target);
          return {
            originalPrompt: prompt,
            spicedPrompt,
            target,
            provider: service.getProvider(),
          };
        } catch (error) {
          return {
            error: sanitizeError(error),
          };
        }
      }

      default:
        return { error: `Unknown text generation tool: ${name}` };
    }
  } catch (error) {
    // Outer catch for any unhandled errors (e.g., service initialization failure)
    return {
      error: error instanceof Error ? "Service temporarily unavailable" : "An error occurred",
    };
  }
}
