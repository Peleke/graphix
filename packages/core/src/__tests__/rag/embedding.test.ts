/**
 * Embedding Provider Tests
 *
 * Tests for embedding providers and the fallback factory.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import {
  OllamaEmbeddingProvider,
} from "../../rag/providers/ollama-embedding.provider.js";
import {
  OpenAIEmbeddingProvider,
} from "../../rag/providers/openai-embedding.provider.js";
import {
  normalizeEmbedding,
  embedWithFallback,
  embedManyWithFallback,
  getEmbeddingStatus,
  resetEmbeddingProviders,
  NORMALIZED_DIMENSION,
} from "../../rag/index.js";

// =============================================================================
// Mock fetch
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// =============================================================================
// OllamaEmbeddingProvider Tests
// =============================================================================

describe("OllamaEmbeddingProvider", () => {
  let provider: OllamaEmbeddingProvider;

  beforeEach(() => {
    provider = new OllamaEmbeddingProvider({
      model: "mxbai-embed-large",
      baseUrl: "http://localhost:11434",
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("embed", () => {
    it("returns embedding for text", async () => {
      const embedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding }),
      });

      const result = await provider.embed("test text");

      expect(result.embedding).toEqual(embedding);
      expect(result.provider).toBe("ollama");
      expect(result.model).toBe("mxbai-embed-large");
      expect(result.originalDimension).toBe(1024);
    });

    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await provider.embed("test");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/embeddings",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "mxbai-embed-large",
            prompt: "test",
          }),
        })
      );
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(provider.embed("test")).rejects.toThrow(
        "Ollama embedding failed: 500 Internal Server Error"
      );
    });
  });

  describe("embedMany", () => {
    it("returns embeddings for multiple texts", async () => {
      const texts = ["text1", "text2", "text3"];

      texts.forEach((_, i) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [i, i + 1] }),
        });
      });

      const result = await provider.embedMany(texts);

      expect(result.embeddings).toHaveLength(3);
      expect(result.embeddings[0]).toEqual([0, 1]);
      expect(result.embeddings[1]).toEqual([1, 2]);
      expect(result.embeddings[2]).toEqual([2, 3]);
    });

    it("returns empty array for empty input", async () => {
      const result = await provider.embedMany([]);

      expect(result.embeddings).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("returns available when Ollama is running and model exists", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [{ name: "mxbai-embed-large:latest" }],
          }),
        });

      const status = await provider.getStatus();

      expect(status.available).toBe(true);
      expect(status.provider).toBe("ollama");
    });

    it("returns unavailable when model not installed", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [{ name: "other-model" }],
          }),
        });

      const status = await provider.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toContain("Model mxbai-embed-large not installed");
    });

    it("returns unavailable when Ollama not running", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const status = await provider.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBe("ECONNREFUSED");
    });
  });
});

// =============================================================================
// OpenAIEmbeddingProvider Tests
// =============================================================================

describe("OpenAIEmbeddingProvider", () => {
  let provider: OpenAIEmbeddingProvider;

  beforeEach(() => {
    provider = new OpenAIEmbeddingProvider({
      model: "text-embedding-3-small",
      dimension: 1024,
      apiKey: "test-api-key",
    });
    mockFetch.mockReset();
  });

  describe("embed", () => {
    it("returns embedding for text", async () => {
      const embedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding, index: 0 }],
          usage: { prompt_tokens: 5, total_tokens: 5 },
        }),
      });

      const result = await provider.embed("test text");

      expect(result.embedding).toEqual(embedding);
      expect(result.provider).toBe("openai");
      expect(result.model).toBe("text-embedding-3-small");
    });

    it("sends dimension parameter for v3 models", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1], index: 0 }],
          usage: { total_tokens: 1 },
        }),
      });

      await provider.embed("test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: "test",
            dimensions: 1024,
          }),
        })
      );
    });

    it("includes authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1], index: 0 }],
          usage: { total_tokens: 1 },
        }),
      });

      await provider.embed("test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });
  });

  describe("embedMany", () => {
    it("batches multiple texts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: [0.1], index: 0 },
            { embedding: [0.2], index: 1 },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const result = await provider.embedMany(["text1", "text2"]);

      expect(result.embeddings).toEqual([[0.1], [0.2]]);
      expect(result.totalTokens).toBe(10);
    });

    it("sorts results by index", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: [0.2], index: 1 },
            { embedding: [0.1], index: 0 },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const result = await provider.embedMany(["text1", "text2"]);

      // Should be sorted by index, not by order received
      expect(result.embeddings).toEqual([[0.1], [0.2]]);
    });
  });

  describe("getStatus", () => {
    it("returns unavailable when API key not set", async () => {
      const noKeyProvider = new OpenAIEmbeddingProvider({
        apiKey: "",
      });

      const status = await noKeyProvider.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBe("OPENAI_API_KEY not set");
    });

    it("returns available on successful test embed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1], index: 0 }],
          usage: { total_tokens: 1 },
        }),
      });

      const status = await provider.getStatus();

      expect(status.available).toBe(true);
    });
  });
});

// =============================================================================
// Normalization Tests
// =============================================================================

describe("normalizeEmbedding", () => {
  it("returns embedding as-is when dimension matches", () => {
    const embedding = Array.from({ length: NORMALIZED_DIMENSION }, (_, i) => i);

    const result = normalizeEmbedding(embedding, NORMALIZED_DIMENSION);

    expect(result).toEqual(embedding);
  });

  it("truncates larger embeddings", () => {
    const embedding = Array.from({ length: 1536 }, (_, i) => i);

    const result = normalizeEmbedding(embedding, 1536);

    expect(result).toHaveLength(NORMALIZED_DIMENSION);
    expect(result[0]).toBe(0);
    expect(result[NORMALIZED_DIMENSION - 1]).toBe(NORMALIZED_DIMENSION - 1);
  });

  it("pads smaller embeddings with zeros", () => {
    const embedding = [1, 2, 3, 4];
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = normalizeEmbedding(embedding, 4);

    expect(result).toHaveLength(NORMALIZED_DIMENSION);
    expect(result.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(result.slice(4).every((v) => v === 0)).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// Factory with Fallback Tests
// =============================================================================

describe("Embedding Factory with Fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEmbeddingProviders();
    mockFetch.mockReset();

    // Set up env vars for fallback
    process.env.EMBEDDING_PROVIDER = "ollama";
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    resetEmbeddingProviders();
  });

  describe("embedWithFallback", () => {
    it("uses primary provider when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: Array(1024).fill(0.1) }),
      });

      const result = await embedWithFallback("test");

      expect(result).toHaveLength(NORMALIZED_DIMENSION);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("localhost:11434"),
        expect.any(Object)
      );
    });

    it("falls back to OpenAI when primary fails", async () => {
      // Ollama fails
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      // OpenAI succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1024).fill(0.2), index: 0 }],
          usage: { total_tokens: 1 },
        }),
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await embedWithFallback("test");

      expect(result).toHaveLength(NORMALIZED_DIMENSION);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("falling back to openai"),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it("throws when both providers fail", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(embedWithFallback("test")).rejects.toThrow(
        "Both embedding providers failed"
      );
    });
  });

  describe("embedManyWithFallback", () => {
    it("returns empty array for empty input", async () => {
      const result = await embedManyWithFallback([]);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("falls back for batch operations", async () => {
      let callCount = 0;

      // Mock: Ollama fails, then OpenAI succeeds
      mockFetch.mockImplementation((url: string) => {
        callCount++;
        if (url.includes("localhost:11434")) {
          // Ollama - fail
          return Promise.reject(new Error("ECONNREFUSED"));
        } else {
          // OpenAI - succeed
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { embedding: Array(1024).fill(0.1), index: 0 },
                { embedding: Array(1024).fill(0.2), index: 1 },
              ],
              usage: { total_tokens: 10 },
            }),
          });
        }
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await embedManyWithFallback(["text1", "text2"]);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(NORMALIZED_DIMENSION);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("falling back"),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getEmbeddingStatus", () => {
    it("returns status of primary and fallback providers", async () => {
      // Primary Ollama check
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ models: [{ name: "mxbai-embed-large" }] }),
        })
        // Fallback OpenAI check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1], index: 0 }],
            usage: { total_tokens: 1 },
          }),
        });

      const status = await getEmbeddingStatus();

      expect(status.primary.provider).toBe("ollama");
      expect(status.primary.available).toBe(true);
      expect(status.fallback?.provider).toBe("openai");
      expect(status.fallback?.available).toBe(true);
    });
  });
});
