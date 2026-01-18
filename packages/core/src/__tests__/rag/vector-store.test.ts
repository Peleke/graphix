/**
 * Vector Store Tests
 *
 * Tests for the VectorStore interface and LibSQLVectorStore implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LibSQLVectorStore } from "../../rag/stores/libsql-vector.store.js";
import type {
  VectorStore,
  VectorMetadata,
  VectorSearchResult,
} from "../../rag/vector-store.interface.js";

// =============================================================================
// Mock the database client
// =============================================================================

const mockExecute = vi.fn();
const mockClient = {
  execute: mockExecute,
};

vi.mock("../../db/client.js", () => ({
  getClient: () => mockClient,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createTestVector(dimension: number, seed: number = 0): number[] {
  return Array.from({ length: dimension }, (_, i) => Math.sin(seed + i));
}

function normalizeVector(v: number[]): number[] {
  const magnitude = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return magnitude === 0 ? v : v.map((x) => x / magnitude);
}

// =============================================================================
// LibSQLVectorStore Tests
// =============================================================================

describe("LibSQLVectorStore", () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new LibSQLVectorStore();
    mockExecute.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createIndex", () => {
    it("creates vector table and metadata entry", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await store.createIndex({
        indexName: "test_index",
        dimension: 1024,
      });

      expect(mockExecute).toHaveBeenCalledTimes(3);

      // First call: create vector table
      expect(mockExecute.mock.calls[0][0]).toContain("CREATE TABLE IF NOT EXISTS vector_test_index");

      // Second call: create metadata table
      expect(mockExecute.mock.calls[1][0]).toContain("CREATE TABLE IF NOT EXISTS vector_indexes");

      // Third call: insert metadata
      expect(mockExecute.mock.calls[2]).toEqual([
        {
          sql: expect.stringContaining("INSERT OR REPLACE INTO vector_indexes"),
          args: ["test_index", 1024, "cosine"],
        },
      ]);
    });

    it("sanitizes index name to prevent SQL injection", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await store.createIndex({
        indexName: "test-index.with;special'chars",
        dimension: 512,
      });

      // Table name should be sanitized
      expect(mockExecute.mock.calls[0][0]).toContain("vector_test_index_with_special_chars");
    });

    it("uses custom metric when provided", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await store.createIndex({
        indexName: "euclidean_index",
        dimension: 256,
        metric: "euclidean",
      });

      expect(mockExecute.mock.calls[2]).toEqual([
        {
          sql: expect.any(String),
          args: ["euclidean_index", 256, "euclidean"],
        },
      ]);
    });
  });

  describe("upsert", () => {
    it("inserts vectors with metadata", async () => {
      // Mock getIndexConfig (returns dimension matching vectors)
      mockExecute.mockResolvedValueOnce({ rows: [{ dimension: 4, metric: "cosine" }] });
      // Mock 2 inserts
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // Mock count query
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 2 }] });
      // Mock updateCount
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const vectors = [
        createTestVector(4, 0),
        createTestVector(4, 1),
      ];

      const metadata: VectorMetadata[] = [
        { id: "vec-1", name: "First" },
        { id: "vec-2", name: "Second" },
      ];

      await store.upsert({
        indexName: "test_index",
        vectors,
        metadata,
      });

      // 1 getIndexConfig + 2 inserts + 1 count query + 1 count update = 5
      expect(mockExecute).toHaveBeenCalledTimes(5);

      // Check first insert (second call after getIndexConfig)
      expect(mockExecute.mock.calls[1]).toEqual([
        {
          sql: expect.stringContaining("INSERT OR REPLACE INTO vector_test_index"),
          args: ["vec-1", JSON.stringify(vectors[0]), JSON.stringify(metadata[0])],
        },
      ]);
    });

    it("uses explicit IDs when provided", async () => {
      // Mock getIndexConfig
      mockExecute.mockResolvedValueOnce({ rows: [{ dimension: 4, metric: "cosine" }] });
      // Mock insert
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // Mock count
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      // Mock updateCount
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await store.upsert({
        indexName: "test_index",
        vectors: [createTestVector(4)],
        metadata: [{ id: "meta-id", name: "Test" }],
        ids: ["explicit-id"],
      });

      // Second call (after getIndexConfig) is the insert
      expect(mockExecute.mock.calls[1][0].args[0]).toBe("explicit-id");
    });

    it("throws if vectors and metadata length mismatch", async () => {
      await expect(
        store.upsert({
          indexName: "test_index",
          vectors: [createTestVector(4), createTestVector(4)],
          metadata: [{ id: "vec-1" }],
        })
      ).rejects.toThrow("Vectors and metadata length mismatch: 2 vs 1");
    });

    it("validates vector dimension matches index configuration", async () => {
      // Mock getIndexConfig returning dimension 1024
      mockExecute.mockResolvedValueOnce({
        rows: [{ dimension: 1024, metric: "cosine" }],
      });

      await expect(
        store.upsert({
          indexName: "test_index",
          vectors: [[0.1, 0.2, 0.3]], // Only 3 dimensions, index expects 1024
          metadata: [{ id: "vec-1" }],
        })
      ).rejects.toThrow("Vector dimension mismatch at index 0: expected 1024, got 3");
    });

    it("allows upsert when dimensions match", async () => {
      // Mock getIndexConfig returning dimension 4
      mockExecute.mockResolvedValueOnce({
        rows: [{ dimension: 4, metric: "cosine" }],
      });
      // Mock upsert
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // Mock count
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      // Mock updateCount
      mockExecute.mockResolvedValueOnce({ rows: [] });

      // Should not throw - just await and check it completes
      await store.upsert({
        indexName: "test_index",
        vectors: [createTestVector(4)],
        metadata: [{ id: "vec-1", name: "Test" }],
      });

      // Verify upsert was called (second call after getIndexConfig)
      expect(mockExecute.mock.calls[1][0].sql).toContain("INSERT OR REPLACE");
    });
  });

  describe("query", () => {
    it("returns results sorted by similarity score", async () => {
      const queryVector = normalizeVector([1, 0, 0, 0]);
      const similarVector = normalizeVector([0.9, 0.1, 0, 0]);
      const dissimilarVector = normalizeVector([0, 0, 1, 0]);

      mockExecute.mockResolvedValue({
        rows: [
          {
            id: "similar",
            vector: JSON.stringify(similarVector),
            metadata: JSON.stringify({ id: "similar", name: "Similar" }),
          },
          {
            id: "dissimilar",
            vector: JSON.stringify(dissimilarVector),
            metadata: JSON.stringify({ id: "dissimilar", name: "Dissimilar" }),
          },
        ],
      });

      const results = await store.query({
        indexName: "test_index",
        queryVector,
        topK: 10,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("similar");
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it("respects topK limit", async () => {
      mockExecute.mockResolvedValue({
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: `vec-${i}`,
          vector: JSON.stringify(normalizeVector([1, 0, 0, 0])),
          metadata: JSON.stringify({ id: `vec-${i}` }),
        })),
      });

      const results = await store.query({
        indexName: "test_index",
        queryVector: [1, 0, 0, 0],
        topK: 3,
      });

      expect(results).toHaveLength(3);
    });

    it("filters by minimum score", async () => {
      const highScoreVector = normalizeVector([1, 0, 0, 0]);
      const lowScoreVector = normalizeVector([0, 1, 0, 0]);

      mockExecute.mockResolvedValue({
        rows: [
          {
            id: "high",
            vector: JSON.stringify(highScoreVector),
            metadata: JSON.stringify({ id: "high" }),
          },
          {
            id: "low",
            vector: JSON.stringify(lowScoreVector),
            metadata: JSON.stringify({ id: "low" }),
          },
        ],
      });

      const results = await store.query({
        indexName: "test_index",
        queryVector: normalizeVector([1, 0, 0, 0]),
        topK: 10,
        minScore: 0.9,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("high");
    });

    it("filters by metadata", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            id: "match",
            vector: JSON.stringify([1, 0, 0, 0]),
            metadata: JSON.stringify({ id: "match", projectId: "proj-1" }),
          },
          {
            id: "no-match",
            vector: JSON.stringify([1, 0, 0, 0]),
            metadata: JSON.stringify({ id: "no-match", projectId: "proj-2" }),
          },
        ],
      });

      const results = await store.query({
        indexName: "test_index",
        queryVector: [1, 0, 0, 0],
        topK: 10,
        filter: { projectId: "proj-1" },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("match");
    });
  });

  describe("delete", () => {
    it("deletes vectors by ID", async () => {
      mockExecute.mockResolvedValue({ rows: [{ count: 0 }] });

      await store.delete({
        indexName: "test_index",
        ids: ["vec-1", "vec-2"],
      });

      expect(mockExecute.mock.calls[0]).toEqual([
        {
          sql: expect.stringContaining("DELETE FROM vector_test_index WHERE id IN"),
          args: ["vec-1", "vec-2"],
        },
      ]);
    });

    it("handles empty ids array gracefully", async () => {
      await store.delete({
        indexName: "test_index",
        ids: [],
      });

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe("indexExists", () => {
    it("returns true when index exists", async () => {
      mockExecute.mockResolvedValue({ rows: [{ count: 1 }] });

      const exists = await store.indexExists("test_index");

      expect(exists).toBe(true);
    });

    it("returns false when index does not exist", async () => {
      mockExecute.mockResolvedValue({ rows: [{ count: 0 }] });

      const exists = await store.indexExists("nonexistent");

      expect(exists).toBe(false);
    });
  });

  describe("count", () => {
    it("returns vector count", async () => {
      mockExecute.mockResolvedValue({ rows: [{ count: 42 }] });

      const count = await store.count("test_index");

      expect(count).toBe(42);
    });

    it("returns 0 when table does not exist", async () => {
      mockExecute.mockRejectedValue(new Error("no such table"));

      const count = await store.count("nonexistent");

      expect(count).toBe(0);
    });
  });
});

// =============================================================================
// Cosine Similarity Tests
// =============================================================================

describe("Cosine Similarity (via query)", () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new LibSQLVectorStore();
    mockExecute.mockReset();
  });

  it("returns 1.0 for identical vectors", async () => {
    const vector = normalizeVector([1, 2, 3, 4]);

    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "same",
          vector: JSON.stringify(vector),
          metadata: JSON.stringify({ id: "same" }),
        },
      ],
    });

    const results = await store.query({
      indexName: "test",
      queryVector: vector,
      topK: 1,
    });

    expect(results[0].score).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", async () => {
    const query = normalizeVector([1, 0, 0, 0]);
    const orthogonal = normalizeVector([0, 1, 0, 0]);

    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "orth",
          vector: JSON.stringify(orthogonal),
          metadata: JSON.stringify({ id: "orth" }),
        },
      ],
    });

    const results = await store.query({
      indexName: "test",
      queryVector: query,
      topK: 1,
    });

    expect(results[0].score).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", async () => {
    const query = normalizeVector([1, 0, 0, 0]);
    const opposite = normalizeVector([-1, 0, 0, 0]);

    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "opp",
          vector: JSON.stringify(opposite),
          metadata: JSON.stringify({ id: "opp" }),
        },
      ],
    });

    const results = await store.query({
      indexName: "test",
      queryVector: query,
      topK: 1,
    });

    expect(results[0].score).toBeCloseTo(-1, 5);
  });
});
