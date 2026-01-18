/**
 * Ollama Embedding Provider
 *
 * Local embedding generation using Ollama.
 * Default model: mxbai-embed-large (1024 dimensions)
 *
 * Models and dimensions:
 * - mxbai-embed-large: 1024 dims (recommended)
 * - nomic-embed-text: 768 dims
 * - snowflake-arctic-embed: 1024 dims
 * - all-minilm: 384 dims
 *
 * @example
 * ```ts
 * const provider = new OllamaEmbeddingProvider();
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

// =============================================================================
// Constants
// =============================================================================

/**
 * Known model dimensions for Ollama embedding models.
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  "mxbai-embed-large": 1024,
  "nomic-embed-text": 768,
  "snowflake-arctic-embed": 1024,
  "all-minilm": 384,
  "bge-large": 1024,
  "bge-base": 768,
};

/**
 * Default model if none specified.
 */
const DEFAULT_MODEL = "mxbai-embed-large";

/**
 * Default Ollama base URL.
 */
const DEFAULT_BASE_URL = "http://localhost:11434";

// =============================================================================
// Types
// =============================================================================

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaConfig {
  model?: string;
  baseUrl?: string;
}

// =============================================================================
// Implementation
// =============================================================================

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "ollama" as const;
  readonly model: string;
  readonly dimension: number;
  private readonly baseUrl: string;

  constructor(config?: OllamaConfig) {
    this.model = config?.model ?? process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_MODEL;
    this.baseUrl = config?.baseUrl ?? process.env.OLLAMA_URL ?? DEFAULT_BASE_URL;
    this.dimension = MODEL_DIMENSIONS[this.model] ?? 1024;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;

    return {
      embedding: data.embedding,
      originalDimension: data.embedding.length,
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
      };
    }

    // Ollama doesn't have a batch endpoint, so we parallelize
    // with controlled concurrency to avoid overwhelming the server
    const concurrency = 5;
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((text) => this.embed(text))
      );

      batchResults.forEach((result, j) => {
        results[i + j] = result.embedding;
      });
    }

    return {
      embeddings: results,
      originalDimension: results[0]?.length ?? this.dimension,
      provider: this.provider,
      model: this.model,
    };
  }

  async getStatus(): Promise<EmbeddingProviderStatus> {
    try {
      // Check if Ollama is running by hitting the version endpoint
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          available: false,
          provider: this.provider,
          model: this.model,
          dimension: this.dimension,
          error: `Ollama returned ${response.status}`,
        };
      }

      // Check if the model is available
      const modelsResponse = await fetch(`${this.baseUrl}/api/tags`);
      if (modelsResponse.ok) {
        const modelsData = (await modelsResponse.json()) as {
          models: Array<{ name: string }>;
        };
        const modelAvailable = modelsData.models.some(
          (m) => m.name === this.model || m.name.startsWith(`${this.model}:`)
        );

        if (!modelAvailable) {
          return {
            available: false,
            provider: this.provider,
            model: this.model,
            dimension: this.dimension,
            error: `Model ${this.model} not installed. Run: ollama pull ${this.model}`,
          };
        }
      }

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
