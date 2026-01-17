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
      "Get the current text generation provider status, including availability and configuration",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  text_list_providers: {
    name: "text_list_providers",
    description: "List all available text generation providers with their status",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  text_set_provider: {
    name: "text_set_provider",
    description:
      "Switch to a different text generation provider (ollama, claude, or openai)",
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
    description: "Generate text from a prompt using the current provider",
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
      "Generate a visual panel description for a comic/storyboard based on context",
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
    description: "Generate dialogue for a character based on context",
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
      "Suggest captions (speech, thought, narration, SFX) from a visual panel description",
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
    description: "Refine text based on feedback",
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
