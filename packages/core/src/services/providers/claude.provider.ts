/**
 * Claude Text Generation Provider
 *
 * Uses the Anthropic SDK for text generation via Claude models.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  TextGenerationProvider,
  TextProvider,
  GenerateOptions,
  GenerateResult,
} from "../text-generation.types.js";
import { DEFAULT_TEXT_CONFIG } from "../text-generation.types.js";

export class ClaudeProvider implements TextGenerationProvider {
  readonly name: TextProvider = "claude";
  private readonly apiKey: string;
  private readonly model: string;
  private client: Anthropic | null = null;

  constructor(
    apiKey?: string,
    model: string = DEFAULT_TEXT_CONFIG.claudeModel
  ) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = model;

    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  /**
   * Check if Claude is available (API key is configured).
   */
  async isAvailable(): Promise<boolean> {
    return this.client !== null;
  }

  /**
   * Generate text using Claude's messages API.
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error("Claude API key is required for text generation");
    }

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    const requestOptions: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: options?.maxTokens ?? DEFAULT_TEXT_CONFIG.maxTokens,
      temperature: options?.temperature ?? DEFAULT_TEXT_CONFIG.temperature,
      messages,
    };

    // Add system prompt if provided
    if (options?.systemPrompt) {
      requestOptions.system = options.systemPrompt;
    }

    // Add stop sequences if provided
    if (options?.stopSequences && options.stopSequences.length > 0) {
      requestOptions.stop_sequences = options.stopSequences;
    }

    // Create abort controller for timeout
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TEXT_CONFIG.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.client.messages.create(requestOptions, {
        signal: controller.signal,
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      return {
        text: content.text,
        model: response.model,
        provider: "claude",
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Claude request timed out after ${timeoutMs / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get the current model name.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Check if API key is configured.
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }
}
