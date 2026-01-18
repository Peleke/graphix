/**
 * OpenAI Embedding Provider
 *
 * Cloud-based embedding generation using OpenAI API.
 * Default model: text-embedding-3-small with dimension reduction to 1024.
 *
 * Models and dimensions:
 * - text-embedding-3-small: up to 1536 dims (supports reduction)
 * - text-embedding-3-large: up to 3072 dims (supports reduction)
 * - text-embedding-ada-002: 1536 dims (legacy, no reduction)
 *
 * Dimension reduction:
 * OpenAI v3 models support native dimension reduction via the `dimensions`
 * parameter. The reduced embeddings maintain quality for similarity search.
 *
 * @example
 * ```ts
 * const provider = new OpenAIEmbeddingProvider({ dimension: 1024 });
 * const result = await provider.embed("A friendly otter");
 * console.log(result.embedding.length); // 1024
 * ```
 */

import type {
  EmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingProviderStatus,
} from "../embedding.interface.js";
import { NORMALIZED_DIMENSION } from "../embedding.interface.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default model.
 */
const DEFAULT_MODEL = "text-embedding-3-small";

/**
 * OpenAI API base URL.
 */
const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

/**
 * Maximum texts per batch request.
 */
const MAX_BATCH_SIZE = 2048;

// =============================================================================
// Types
// =============================================================================

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIConfig {
  model?: string;
  dimension?: number;
  apiKey?: string;
}

// =============================================================================
// Implementation
// =============================================================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "openai" as const;
  readonly model: string;
  readonly dimension: number;
  private readonly apiKey: string;

  constructor(config?: OpenAIConfig) {
    this.model = config?.model ?? DEFAULT_MODEL;
    this.dimension = config?.dimension ?? NORMALIZED_DIMENSION;
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? "";

    if (!this.apiKey) {
      console.warn("OpenAI API key not set. OpenAI embedding provider will fail.");
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimension,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as OpenAIEmbeddingResponse;

    return {
      embedding: data.data[0].embedding,
      originalDimension: data.data[0].embedding.length,
      provider: this.provider,
      model: this.model,
    };
  }

  async embedMany(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        originalDimension: this.dimension,
        provider: this.provider,
        model: this.model,
        totalTokens: 0,
      };
    }

    // OpenAI supports batch embedding natively
    // Split into chunks if exceeding max batch size
    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
          dimensions: this.dimension,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
      }

      const data = (await response.json()) as OpenAIEmbeddingResponse;

      // OpenAI returns embeddings in order, but let's be safe
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);
      embeddings.push(...sortedData.map((d) => d.embedding));
      totalTokens += data.usage.total_tokens;
    }

    return {
      embeddings,
      originalDimension: embeddings[0]?.length ?? this.dimension,
      provider: this.provider,
      model: this.model,
      totalTokens,
    };
  }

  async getStatus(): Promise<EmbeddingProviderStatus> {
    if (!this.apiKey) {
      return {
        available: false,
        provider: this.provider,
        model: this.model,
        dimension: this.dimension,
        error: "OPENAI_API_KEY not set",
      };
    }

    try {
      // Test with a simple embedding
      await this.embed("test");

      return {
        available: true,
        provider: this.provider,
        model: this.model,
        dimension: this.dimension,
      };
    } catch (error) {
      return {
        available: false,
        provider: this.provider,
        model: this.model,
        dimension: this.dimension,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
