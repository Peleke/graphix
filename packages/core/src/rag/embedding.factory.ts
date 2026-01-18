/**
 * Embedding Factory
 *
 * Factory for creating embedding providers with automatic fallback.
 * Primary: Ollama (local, free)
 * Fallback: OpenAI (cloud, paid)
 *
 * Normalization:
 * All embeddings are normalized to NORMALIZED_DIMENSION (1024) to ensure
 * vector store compatibility when switching providers.
 *
 * @example
 * ```ts
 * // Single text with fallback
 * const embedding = await embedWithFallback("A friendly otter");
 *
 * // Batch with fallback
 * const embeddings = await embedManyWithFallback(["otter", "cat", "dog"]);
 * ```
 */

import type { EmbeddingProvider } from "./embedding.interface.js";
import { NORMALIZED_DIMENSION, type EmbeddingProviderType } from "./embedding.interface.js";
import { OllamaEmbeddingProvider } from "./providers/ollama-embedding.provider.js";
import { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider.js";

// =============================================================================
// Singleton State
// =============================================================================

let primaryProvider: EmbeddingProvider | null = null;
let fallbackProvider: EmbeddingProvider | null = null;

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an embedding provider by type.
 */
export function createEmbeddingProvider(type: EmbeddingProviderType): EmbeddingProvider {
  switch (type) {
    case "ollama":
      return new OllamaEmbeddingProvider();
    case "openai":
      return new OpenAIEmbeddingProvider({ dimension: NORMALIZED_DIMENSION });
    default:
      throw new Error(`Unknown embedding provider: ${type}`);
  }
}

/**
 * Get the primary embedding provider (singleton).
 * Uses EMBEDDING_PROVIDER env var, defaults to "ollama".
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (!primaryProvider) {
    const providerType = (process.env.EMBEDDING_PROVIDER ?? "ollama") as EmbeddingProviderType;
    primaryProvider = createEmbeddingProvider(providerType);

    // Set up OpenAI as fallback if API key is available and not already using OpenAI
    if (providerType !== "openai" && process.env.OPENAI_API_KEY) {
      fallbackProvider = new OpenAIEmbeddingProvider({ dimension: NORMALIZED_DIMENSION });
    }
  }
  return primaryProvider;
}

/**
 * Get the fallback provider (if configured).
 */
export function getFallbackProvider(): EmbeddingProvider | null {
  // Ensure primary is initialized (which also sets up fallback)
  getEmbeddingProvider();
  return fallbackProvider;
}

/**
 * Reset providers (for testing).
 */
export function resetEmbeddingProviders(): void {
  primaryProvider = null;
  fallbackProvider = null;
}

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalize embedding to NORMALIZED_DIMENSION.
 *
 * Strategies:
 * - If dimension matches: return as-is
 * - If dimension is larger: truncate (works for OpenAI v3 models)
 * - If dimension is smaller: pad with zeros (not ideal, logged as warning)
 *
 * @param embedding The raw embedding vector
 * @param dimension The original dimension
 * @returns Normalized embedding of length NORMALIZED_DIMENSION
 */
export function normalizeEmbedding(embedding: number[], dimension: number): number[] {
  if (dimension === NORMALIZED_DIMENSION) {
    return embedding;
  }

  if (dimension > NORMALIZED_DIMENSION) {
    // Truncate - OpenAI v3 embeddings are designed for this
    return embedding.slice(0, NORMALIZED_DIMENSION);
  }

  // Pad with zeros - not ideal but maintains compatibility
  // This should be rare in practice
  console.warn(
    `Padding embedding from ${dimension} to ${NORMALIZED_DIMENSION}. ` +
      `Consider using a model with native ${NORMALIZED_DIMENSION} dimension.`
  );
  const padded = new Array(NORMALIZED_DIMENSION).fill(0) as number[];
  embedding.forEach((v, i) => {
    padded[i] = v;
  });
  return padded;
}

// =============================================================================
// Embedding with Fallback
// =============================================================================

/**
 * Embed a single text with automatic fallback.
 *
 * 1. Try primary provider (Ollama by default)
 * 2. If fails and fallback available (OpenAI), try fallback
 * 3. Normalize to NORMALIZED_DIMENSION
 *
 * @param text Text to embed
 * @returns Normalized embedding vector
 * @throws Error if both providers fail
 */
export async function embedWithFallback(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  try {
    const result = await provider.embed(text);
    return normalizeEmbedding(result.embedding, result.originalDimension);
  } catch (primaryError) {
    if (fallbackProvider) {
      console.warn(
        `Primary embedding provider (${provider.provider}) failed, ` +
          `falling back to ${fallbackProvider.provider}:`,
        primaryError instanceof Error ? primaryError.message : primaryError
      );

      try {
        const result = await fallbackProvider.embed(text);
        return normalizeEmbedding(result.embedding, result.originalDimension);
      } catch (fallbackError) {
        throw new Error(
          `Both embedding providers failed. ` +
            `Primary (${provider.provider}): ${primaryError instanceof Error ? primaryError.message : primaryError}. ` +
            `Fallback (${fallbackProvider.provider}): ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`
        );
      }
    }

    throw primaryError;
  }
}

/**
 * Embed multiple texts with automatic fallback.
 *
 * @param texts Texts to embed
 * @returns Array of normalized embedding vectors
 * @throws Error if both providers fail
 */
export async function embedManyWithFallback(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const provider = getEmbeddingProvider();

  try {
    const result = await provider.embedMany(texts);
    return result.embeddings.map((e) =>
      normalizeEmbedding(e, result.originalDimension)
    );
  } catch (primaryError) {
    if (fallbackProvider) {
      console.warn(
        `Primary embedding provider (${provider.provider}) failed, ` +
          `falling back to ${fallbackProvider.provider}:`,
        primaryError instanceof Error ? primaryError.message : primaryError
      );

      try {
        const result = await fallbackProvider.embedMany(texts);
        return result.embeddings.map((e) =>
          normalizeEmbedding(e, result.originalDimension)
        );
      } catch (fallbackError) {
        throw new Error(
          `Both embedding providers failed. ` +
            `Primary (${provider.provider}): ${primaryError instanceof Error ? primaryError.message : primaryError}. ` +
            `Fallback (${fallbackProvider.provider}): ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`
        );
      }
    }

    throw primaryError;
  }
}

// =============================================================================
// Status Check
// =============================================================================

/**
 * Check status of all configured embedding providers.
 */
export async function getEmbeddingStatus(): Promise<{
  primary: { provider: string; available: boolean; error?: string };
  fallback: { provider: string; available: boolean; error?: string } | null;
}> {
  const primary = getEmbeddingProvider();
  const primaryStatus = await primary.getStatus();

  let fallbackStatus = null;
  if (fallbackProvider) {
    const status = await fallbackProvider.getStatus();
    fallbackStatus = {
      provider: status.provider,
      available: status.available,
      error: status.error,
    };
  }

  return {
    primary: {
      provider: primaryStatus.provider,
      available: primaryStatus.available,
      error: primaryStatus.error,
    },
    fallback: fallbackStatus,
  };
}
