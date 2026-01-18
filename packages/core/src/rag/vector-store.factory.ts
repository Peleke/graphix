/**
 * Vector Store Factory
 *
 * Factory for creating vector store instances.
 * Supports pluggable backends via VECTOR_STORE_PROVIDER env var.
 *
 * Current implementations:
 * - libsql: SQLite-based, good for dev/testing (<10k vectors)
 *
 * Future implementations:
 * - qdrant: Production-grade, HNSW index, sub-10ms queries
 * - pinecone: Managed cloud service
 *
 * @example
 * ```ts
 * const store = getVectorStore(); // Uses VECTOR_STORE_PROVIDER env
 * await store.createIndex({ indexName: "characters", dimension: 1024 });
 * ```
 */

import type { VectorStore, VectorStoreProvider } from "./vector-store.interface.js";
import { LibSQLVectorStore } from "./stores/libsql-vector.store.js";

// =============================================================================
// Singleton State
// =============================================================================

let instance: VectorStore | null = null;

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a vector store by provider type.
 *
 * @param provider The provider type
 * @returns VectorStore instance
 * @throws Error if provider is not implemented
 */
export function createVectorStore(provider: VectorStoreProvider): VectorStore {
  switch (provider) {
    case "libsql":
      return new LibSQLVectorStore();

    case "qdrant":
      // Lazy import to avoid requiring qdrant client when not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      throw new Error(
        "Qdrant vector store not yet implemented. " +
          "Install @qdrant/js-client-rest and implement QdrantVectorStore."
      );

    case "pinecone":
      throw new Error(
        "Pinecone vector store not yet implemented. " +
          "Install @pinecone-database/pinecone and implement PineconeVectorStore."
      );

    default:
      throw new Error(`Unknown vector store provider: ${provider}`);
  }
}

/**
 * Get the vector store singleton.
 * Uses VECTOR_STORE_PROVIDER env var, defaults to "libsql".
 */
export function getVectorStore(): VectorStore {
  if (!instance) {
    const provider = (process.env.VECTOR_STORE_PROVIDER ?? "libsql") as VectorStoreProvider;
    instance = createVectorStore(provider);
  }
  return instance;
}

/**
 * Reset the vector store singleton (for testing).
 */
export function resetVectorStore(): void {
  instance = null;
}

/**
 * Get the current provider type.
 */
export function getVectorStoreProvider(): VectorStoreProvider {
  return (process.env.VECTOR_STORE_PROVIDER ?? "libsql") as VectorStoreProvider;
}
