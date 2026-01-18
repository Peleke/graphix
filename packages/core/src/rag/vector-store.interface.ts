/**
 * Vector Store Interface
 *
 * Pluggable interface for vector storage backends.
 * Implementations: LibSQL (dev), Qdrant (prod), Pinecone (alt)
 *
 * @example
 * ```ts
 * const store = getVectorStore(); // Uses VECTOR_STORE_PROVIDER env
 * await store.createIndex({ indexName: "characters", dimension: 1024 });
 * await store.upsert({ indexName: "characters", vectors: [...], metadata: [...] });
 * const results = await store.query({ indexName: "characters", queryVector: [...], topK: 5 });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Metadata attached to each vector.
 * Must include `id` for upsert/delete operations.
 */
export interface VectorMetadata {
  id: string;
  [key: string]: unknown;
}

/**
 * Result from a vector similarity search.
 */
export interface VectorSearchResult {
  /** Vector ID */
  id: string;
  /** Cosine similarity score (0-1, higher = more similar) */
  score: number;
  /** Original metadata */
  metadata: VectorMetadata;
}

/**
 * Configuration for creating a vector index.
 */
export interface VectorIndexConfig {
  /** Unique name for this index */
  indexName: string;
  /** Vector dimension (must match embedding model output) */
  dimension: number;
  /** Optional: distance metric (default: cosine) */
  metric?: "cosine" | "euclidean" | "dot";
}

/**
 * Parameters for upserting vectors.
 */
export interface VectorUpsertParams {
  /** Index to upsert into */
  indexName: string;
  /** Array of vectors (each vector is number[]) */
  vectors: number[][];
  /** Metadata for each vector (must match vectors length) */
  metadata: VectorMetadata[];
  /** Optional: explicit IDs (defaults to metadata.id) */
  ids?: string[];
}

/**
 * Parameters for querying vectors.
 */
export interface VectorQueryParams {
  /** Index to query */
  indexName: string;
  /** Query vector */
  queryVector: number[];
  /** Number of results to return */
  topK: number;
  /** Optional: metadata filter */
  filter?: Record<string, unknown>;
  /** Optional: minimum score threshold */
  minScore?: number;
}

/**
 * Parameters for deleting vectors.
 */
export interface VectorDeleteParams {
  /** Index to delete from */
  indexName: string;
  /** IDs to delete */
  ids: string[];
}

// =============================================================================
// Interface
// =============================================================================

/**
 * Abstract interface for vector storage.
 *
 * Implementations should handle:
 * - Index creation (idempotent)
 * - Vector upsert (insert or update)
 * - Similarity search with optional filtering
 * - Vector deletion
 */
export interface VectorStore {
  /**
   * Provider name for logging/debugging.
   */
  readonly provider: string;

  /**
   * Create an index if it doesn't exist.
   * Should be idempotent (safe to call multiple times).
   */
  createIndex(config: VectorIndexConfig): Promise<void>;

  /**
   * Upsert vectors with metadata.
   * Updates existing vectors if ID matches, inserts otherwise.
   */
  upsert(params: VectorUpsertParams): Promise<void>;

  /**
   * Query for similar vectors.
   * Returns results sorted by score descending.
   */
  query(params: VectorQueryParams): Promise<VectorSearchResult[]>;

  /**
   * Delete vectors by ID.
   * Should be idempotent (no error if ID doesn't exist).
   */
  delete(params: VectorDeleteParams): Promise<void>;

  /**
   * Check if index exists.
   */
  indexExists(indexName: string): Promise<boolean>;

  /**
   * Get count of vectors in index.
   */
  count(indexName: string): Promise<number>;
}

// =============================================================================
// Provider Type
// =============================================================================

export type VectorStoreProvider = "libsql" | "qdrant" | "pinecone";
