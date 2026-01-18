/**
 * Embedding Provider Interface
 *
 * Pluggable interface for text embedding generation.
 * Implementations: Ollama (local), OpenAI (cloud fallback)
 *
 * All embeddings are normalized to NORMALIZED_DIMENSION (1024) to ensure
 * compatibility across providers when switching.
 *
 * @example
 * ```ts
 * const provider = getEmbeddingProvider(); // Uses EMBEDDING_PROVIDER env
 * const result = await provider.embed("A friendly otter character");
 * console.log(result.embedding.length); // 1024
 * ```
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Normalized embedding dimension used across all providers.
 *
 * Why 1024?
 * - Ollama mxbai-embed-large: 1024 natively
 * - OpenAI text-embedding-3-small: supports 1024 reduction
 * - Good balance of quality vs storage/compute
 *
 * All embeddings are normalized to this dimension for vector store compatibility.
 */
export const NORMALIZED_DIMENSION = 1024;

// =============================================================================
// Types
// =============================================================================

/**
 * Result from embedding a single text.
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Original dimension from provider (before normalization) */
  originalDimension: number;
  /** Provider name */
  provider: string;
  /** Model used */
  model: string;
}

/**
 * Result from batch embedding.
 */
export interface BatchEmbeddingResult {
  /** Array of embeddings (same order as input texts) */
  embeddings: number[][];
  /** Original dimension from provider */
  originalDimension: number;
  /** Provider name */
  provider: string;
  /** Model used */
  model: string;
  /** Total tokens used (if available) */
  totalTokens?: number;
}

/**
 * Status of an embedding provider.
 */
export interface EmbeddingProviderStatus {
  /** Whether provider is available */
  available: boolean;
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Output dimension */
  dimension: number;
  /** Error message if unavailable */
  error?: string;
}

// =============================================================================
// Interface
// =============================================================================

/**
 * Abstract interface for embedding providers.
 *
 * Implementations should:
 * - Return embeddings with consistent dimensions
 * - Handle rate limiting gracefully
 * - Provide status checks for health monitoring
 */
export interface EmbeddingProvider {
  /**
   * Provider name for logging/debugging.
   */
  readonly provider: string;

  /**
   * Model name.
   */
  readonly model: string;

  /**
   * Native output dimension for this provider/model.
   * May differ from NORMALIZED_DIMENSION.
   */
  readonly dimension: number;

  /**
   * Embed a single text.
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Embed multiple texts in a batch.
   * More efficient than calling embed() multiple times.
   */
  embedMany(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Check if provider is available/healthy.
   */
  getStatus(): Promise<EmbeddingProviderStatus>;
}

// =============================================================================
// Provider Type
// =============================================================================

export type EmbeddingProviderType = "ollama" | "openai";
