/**
 * Model Adapter Tests
 *
 * Tests for the Mastra model adapter that wraps TextGenerationService.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TextGenerationModelAdapter,
  createModelAdapter,
  getModelAdapter,
  resetModelAdapter,
} from "../../agents/model-adapter.js";

// Mock the text generation service
vi.mock("../../services/text-generation.service.js", () => ({
  getTextGenerationService: vi.fn(() => ({
    getProvider: vi.fn().mockReturnValue("ollama"),
    getConfig: vi.fn().mockReturnValue({
      provider: "ollama",
      ollamaModel: "llama3.2",
    }),
    generate: vi.fn().mockResolvedValue({
      text: "Generated response",
      model: "llama3.2",
      provider: "ollama",
      tokensUsed: 100,
      inputTokens: 20,
    }),
  })),
}));

describe("TextGenerationModelAdapter", () => {
  let adapter: TextGenerationModelAdapter;

  beforeEach(() => {
    resetModelAdapter();
    adapter = new TextGenerationModelAdapter();
  });

  describe("properties", () => {
    it("returns provider name", () => {
      expect(adapter.provider).toBe("ollama");
    });

    it("returns model ID", () => {
      expect(adapter.modelId).toBe("llama3.2");
    });
  });

  describe("doGenerate", () => {
    it("generates response from messages", async () => {
      const result = await adapter.doGenerate({
        messages: [
          { role: "user", content: "Hello" },
        ],
      });

      expect(result.text).toBe("Generated response");
    });

    it("handles system messages", async () => {
      const result = await adapter.doGenerate({
        messages: [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hello" },
        ],
      });

      expect(result.text).toBe("Generated response");
    });

    it("formats conversation correctly", async () => {
      const result = await adapter.doGenerate({
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
          { role: "user", content: "Second message" },
        ],
      });

      expect(result.text).toBe("Generated response");
    });

    it("includes usage info when available", async () => {
      const result = await adapter.doGenerate({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.usage).toEqual({
        promptTokens: 20,
        completionTokens: 80,
        totalTokens: 100,
      });
    });
  });

  describe("doStream", () => {
    it("yields generated response", async () => {
      const chunks: string[] = [];

      for await (const chunk of adapter.doStream({
        messages: [{ role: "user", content: "Hello" }],
      })) {
        chunks.push(chunk.text);
      }

      expect(chunks).toEqual(["Generated response"]);
    });
  });
});

describe("Factory functions", () => {
  beforeEach(() => {
    resetModelAdapter();
  });

  it("getModelAdapter returns singleton", () => {
    const adapter1 = getModelAdapter();
    const adapter2 = getModelAdapter();
    expect(adapter1).toBe(adapter2);
  });

  it("createModelAdapter returns new instance", () => {
    const adapter1 = createModelAdapter();
    const adapter2 = createModelAdapter();
    expect(adapter1).not.toBe(adapter2);
  });

  it("resetModelAdapter clears singleton", () => {
    const adapter1 = getModelAdapter();
    resetModelAdapter();
    const adapter2 = getModelAdapter();
    expect(adapter1).not.toBe(adapter2);
  });
});
