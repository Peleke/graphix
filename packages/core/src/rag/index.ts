/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Provides vector storage and embedding generation for semantic search.
 *
 * Components:
 * - Vector Store: Pluggable storage for embeddings (LibSQL, Qdrant, Pinecone)
 * - Embedding Providers: Text-to-vector generation (Ollama, OpenAI)
 *
 * @example
 * ```ts
 * import {
 *   getVectorStore,
 *   embedWithFallback,
 *   NORMALIZED_DIMENSION,
 * } from "@graphix/core/rag";
 *
 * // Create index
 * const store = getVectorStore();
 * await store.createIndex({ indexName: "characters", dimension: NORMALIZED_DIMENSION });
 *
 * // Index a character
 * const embedding = await embedWithFallback("A friendly otter who loves fish");
 * await store.upsert({
 *   indexName: "characters",
 *   vectors: [embedding],
 *   metadata: [{ id: "char-1", name: "Oliver" }],
 * });
 *
 * // Search
 * const query = await embedWithFallback("cute sea animal");
 * const results = await store.query({
 *   indexName: "characters",
 *   queryVector: query,
 *   topK: 5,
 * });
 * ```
 */

// =============================================================================
// Vector Store
// =============================================================================

export type {
  VectorStore,
  VectorMetadata,
  VectorSearchResult,
  VectorIndexConfig,
  VectorUpsertParams,
  VectorQueryParams,
  VectorDeleteParams,
  VectorStoreProvider,
} from "./vector-store.interface.js";

export {
  getVectorStore,
  createVectorStore,
  resetVectorStore,
  getVectorStoreProvider,
} from "./vector-store.factory.js";

export { LibSQLVectorStore } from "./stores/libsql-vector.store.js";

// =============================================================================
// Embedding Providers
// =============================================================================

export type {
  EmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingProviderStatus,
  EmbeddingProviderType,
} from "./embedding.interface.js";

export { NORMALIZED_DIMENSION } from "./embedding.interface.js";

export {
  getEmbeddingProvider,
  createEmbeddingProvider,
  resetEmbeddingProviders,
  getFallbackProvider,
  embedWithFallback,
  embedManyWithFallback,
  normalizeEmbedding,
  getEmbeddingStatus,
} from "./embedding.factory.js";

export { OllamaEmbeddingProvider } from "./providers/ollama-embedding.provider.js";
export { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider.js";
