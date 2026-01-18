/**
 * LibSQL Vector Store
 *
 * SQLite-based vector storage using JSON columns for vectors.
 * Uses linear scan with in-memory cosine similarity calculation.
 *
 * Trade-offs:
 * - Pro: No additional infrastructure, same DB as app data
 * - Pro: ACID transactions, familiar SQL queries
 * - Con: Linear scan for similarity (O(n)), no HNSW index
 * - Con: All vectors loaded into memory for each query
 *
 * Recommended for:
 * - Development and testing
 * - Small datasets (<10k vectors)
 * - MVP and prototyping
 *
 * Migration path:
 * When you exceed ~10k vectors or need sub-10ms queries,
 * swap to QdrantVectorStore or PineconeVectorStore via
 * VECTOR_STORE_PROVIDER env variable.
 */

import { getClient } from "../../db/client.js";
import type { Client } from "@libsql/client";
import type {
  VectorStore,
  VectorIndexConfig,
  VectorUpsertParams,
  VectorQueryParams,
  VectorDeleteParams,
  VectorSearchResult,
  VectorMetadata,
} from "../vector-store.interface.js";

// =============================================================================
// Cosine Similarity
// =============================================================================

/**
 * Calculate cosine similarity between two vectors.
 * Returns value between -1 and 1 (higher = more similar).
 *
 * @throws Error if vectors have different dimensions
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// =============================================================================
// LibSQL Vector Store Implementation
// =============================================================================

export class LibSQLVectorStore implements VectorStore {
  readonly provider = "libsql" as const;
  private client: Client | null = null;

  /**
   * Get the libsql client, lazily initialized.
   */
  private getClient(): Client {
    if (!this.client) {
      this.client = getClient();
    }
    return this.client;
  }

  /**
   * Get table name for an index.
   * Prefixed with "vector_" to avoid conflicts.
   */
  private tableName(indexName: string): string {
    // Sanitize to prevent SQL injection
    const sanitized = indexName.replace(/[^a-zA-Z0-9_]/g, "_");
    return `vector_${sanitized}`;
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    const client = this.getClient();
    const table = this.tableName(config.indexName);

    // Create table for vectors
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Create index metadata table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS vector_indexes (
        name TEXT PRIMARY KEY,
        dimension INTEGER NOT NULL,
        metric TEXT DEFAULT 'cosine',
        count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Store index metadata
    await client.execute({
      sql: `
        INSERT OR REPLACE INTO vector_indexes (name, dimension, metric, created_at, updated_at)
        VALUES (?, ?, ?, unixepoch(), unixepoch())
      `,
      args: [config.indexName, config.dimension, config.metric ?? "cosine"],
    });
  }

  async upsert(params: VectorUpsertParams): Promise<void> {
    const client = this.getClient();
    const table = this.tableName(params.indexName);

    if (params.vectors.length !== params.metadata.length) {
      throw new Error(
        `Vectors and metadata length mismatch: ${params.vectors.length} vs ${params.metadata.length}`
      );
    }

    // Batch upsert using INSERT OR REPLACE
    for (let i = 0; i < params.vectors.length; i++) {
      const id = params.ids?.[i] ?? params.metadata[i].id;
      const vector = JSON.stringify(params.vectors[i]);
      const metadata = JSON.stringify(params.metadata[i]);

      await client.execute({
        sql: `
          INSERT OR REPLACE INTO ${table} (id, vector, metadata, created_at)
          VALUES (?, ?, ?, unixepoch())
        `,
        args: [id, vector, metadata],
      });
    }

    // Update count
    await this.updateCount(params.indexName);
  }

  async query(params: VectorQueryParams): Promise<VectorSearchResult[]> {
    const client = this.getClient();
    const table = this.tableName(params.indexName);

    // Fetch all vectors (linear scan)
    const result = await client.execute(`SELECT id, vector, metadata FROM ${table}`);

    // Calculate similarity for each vector
    const results: VectorSearchResult[] = [];

    for (const row of result.rows) {
      const id = row.id as string;
      const vector = JSON.parse(row.vector as string) as number[];
      const metadata = JSON.parse(row.metadata as string) as VectorMetadata;
      const score = cosineSimilarity(params.queryVector, vector);

      // Apply minimum score filter
      if (params.minScore !== undefined && score < params.minScore) {
        continue;
      }

      // Apply metadata filter
      if (params.filter) {
        const matches = Object.entries(params.filter).every(
          ([key, value]) => metadata[key] === value
        );
        if (!matches) continue;
      }

      results.push({
        id,
        score,
        metadata,
      });
    }

    // Sort by score descending and limit to topK
    return results.sort((a, b) => b.score - a.score).slice(0, params.topK);
  }

  async delete(params: VectorDeleteParams): Promise<void> {
    const client = this.getClient();
    const table = this.tableName(params.indexName);

    if (params.ids.length === 0) return;

    // Build placeholders for IN clause
    const placeholders = params.ids.map(() => "?").join(", ");

    await client.execute({
      sql: `DELETE FROM ${table} WHERE id IN (${placeholders})`,
      args: params.ids,
    });

    // Update count
    await this.updateCount(params.indexName);
  }

  async indexExists(indexName: string): Promise<boolean> {
    const client = this.getClient();

    const result = await client.execute({
      sql: `SELECT COUNT(*) as count FROM vector_indexes WHERE name = ?`,
      args: [indexName],
    });

    const count = result.rows[0]?.count as number | undefined;
    return (count ?? 0) > 0;
  }

  async count(indexName: string): Promise<number> {
    const client = this.getClient();
    const table = this.tableName(indexName);

    try {
      const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      return (result.rows[0]?.count as number) ?? 0;
    } catch {
      // Table doesn't exist
      return 0;
    }
  }

  /**
   * Update the count in the metadata table.
   */
  private async updateCount(indexName: string): Promise<void> {
    const client = this.getClient();
    const currentCount = await this.count(indexName);

    await client.execute({
      sql: `
        UPDATE vector_indexes
        SET count = ?, updated_at = unixepoch()
        WHERE name = ?
      `,
      args: [currentCount, indexName],
    });
  }
}
