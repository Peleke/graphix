/**
 * Mastra Model Adapter
 *
 * Wraps the existing TextGenerationService to work with Mastra's
 * model interface. This allows us to use our existing LLM providers
 * (Ollama, Claude) with Mastra agents.
 *
 * @example
 * ```ts
 * import { getModelAdapter } from "./model-adapter.js";
 *
 * const agent = new Agent({
 *   name: "project-creation",
 *   model: getModelAdapter(),
 *   // ...
 * });
 * ```
 */

import { getTextGenerationService, type TextGenerationService } from "../services/text-generation.service.js";

// =============================================================================
// Types
// =============================================================================

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

/**
 * Mastra-compatible model interface.
 * This is a simplified version that matches what Mastra expects.
 */
export interface MastraModelAdapter {
  /**
   * Generate a response from messages.
   */
  doGenerate(params: {
    messages: ModelMessage[];
    config?: ModelConfig;
  }): Promise<ModelResponse>;

  /**
   * Stream a response from messages.
   */
  doStream?(params: {
    messages: ModelMessage[];
    config?: ModelConfig;
  }): AsyncGenerator<{ text: string }, void, unknown>;

  /**
   * Provider name for identification.
   */
  provider: string;

  /**
   * Model name.
   */
  modelId: string;
}

// =============================================================================
// Adapter Implementation
// =============================================================================

/**
 * Create a Mastra-compatible model adapter from TextGenerationService.
 */
export class TextGenerationModelAdapter implements MastraModelAdapter {
  private service: TextGenerationService;

  constructor(service?: TextGenerationService) {
    this.service = service ?? getTextGenerationService();
  }

  get provider(): string {
    return this.service.getProvider();
  }

  get modelId(): string {
    const config = this.service.getConfig();
    switch (config.provider) {
      case "ollama":
        return config.ollamaModel ?? "unknown";
      case "claude":
        return config.claudeModel ?? "unknown";
      default:
        return "unknown";
    }
  }

  /**
   * Convert messages array to a single prompt string.
   * Mastra sends messages in chat format, but our service uses single prompts.
   */
  private messagesToPrompt(messages: ModelMessage[]): {
    systemPrompt?: string;
    userPrompt: string;
  } {
    let systemPrompt: string | undefined;
    const conversationParts: string[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else if (msg.role === "user") {
        conversationParts.push(`User: ${msg.content}`);
      } else if (msg.role === "assistant") {
        conversationParts.push(`Assistant: ${msg.content}`);
      }
    }

    // If only one user message with no conversation, return it directly
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 1 && messages.filter((m) => m.role === "assistant").length === 0) {
      return {
        systemPrompt,
        userPrompt: userMessages[0].content,
      };
    }

    // Otherwise, format as conversation
    return {
      systemPrompt,
      userPrompt: conversationParts.join("\n\n") + "\n\nAssistant:",
    };
  }

  async doGenerate(params: {
    messages: ModelMessage[];
    config?: ModelConfig;
  }): Promise<ModelResponse> {
    const { systemPrompt, userPrompt } = this.messagesToPrompt(params.messages);

    const result = await this.service.generate(userPrompt, {
      systemPrompt,
      temperature: params.config?.temperature,
      maxTokens: params.config?.maxTokens,
      stopSequences: params.config?.stopSequences,
    });

    return {
      text: result.text,
      usage: result.tokensUsed
        ? {
            promptTokens: result.inputTokens,
            completionTokens: result.tokensUsed - (result.inputTokens ?? 0),
            totalTokens: result.tokensUsed,
          }
        : undefined,
    };
  }

  /**
   * Streaming is not yet implemented - falls back to non-streaming.
   * TODO: Implement proper streaming when TextGenerationService supports it.
   */
  async *doStream(params: {
    messages: ModelMessage[];
    config?: ModelConfig;
  }): AsyncGenerator<{ text: string }, void, unknown> {
    // For now, generate full response and yield it
    const response = await this.doGenerate(params);
    yield { text: response.text };
  }
}

// =============================================================================
// Factory
// =============================================================================

let adapterInstance: TextGenerationModelAdapter | null = null;

/**
 * Get or create the model adapter singleton.
 */
export function getModelAdapter(): MastraModelAdapter {
  if (!adapterInstance) {
    adapterInstance = new TextGenerationModelAdapter();
  }
  return adapterInstance;
}

/**
 * Create a new model adapter instance (non-singleton).
 */
export function createModelAdapter(
  service?: TextGenerationService
): MastraModelAdapter {
  return new TextGenerationModelAdapter(service);
}

/**
 * Reset the adapter singleton (for testing).
 */
export function resetModelAdapter(): void {
  adapterInstance = null;
}
