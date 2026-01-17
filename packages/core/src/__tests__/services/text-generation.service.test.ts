/**
 * TextGenerationService Unit Tests
 *
 * Tests for the provider-agnostic text generation system.
 * Includes tests for both OllamaProvider and ClaudeProvider with mocked responses.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  TextGenerationService,
  getTextGenerationService,
  createTextGenerationService,
  resetTextGenerationService,
} from "../../services/text-generation.service.js";
import { OllamaProvider } from "../../services/providers/ollama.provider.js";
import { ClaudeProvider } from "../../services/providers/claude.provider.js";
import type {
  TextGenerationConfig,
  GenerateResult,
  InferredCaption,
  GeneratedDialogue,
} from "../../services/text-generation.types.js";

describe("TextGenerationService", () => {
  beforeEach(() => {
    // Allow localhost URLs for testing (SSRF protection requires opt-in)
    process.env.ALLOW_LOCAL_OLLAMA = "true";
    resetTextGenerationService();
  });

  afterEach(() => {
    resetTextGenerationService();
    delete process.env.ALLOW_LOCAL_OLLAMA;
  });

  // ============================================================================
  // SINGLETON MANAGEMENT TESTS
  // ============================================================================

  describe("Singleton Management", () => {
    it("returns the same instance when called without config", () => {
      const service1 = getTextGenerationService();
      const service2 = getTextGenerationService();
      expect(service1).toBe(service2);
    });

    it("returns same instance when called with config after initialization (security fix)", () => {
      // Config is only applied on first creation to prevent race conditions
      const service1 = getTextGenerationService();
      const service2 = getTextGenerationService({ provider: "claude" });
      // Should be the same instance (config ignored, warning logged)
      expect(service1).toBe(service2);
    });

    it("createTextGenerationService always creates a new instance", () => {
      const service1 = createTextGenerationService();
      const service2 = createTextGenerationService();
      expect(service1).not.toBe(service2);
    });

    it("resetTextGenerationService clears the singleton", () => {
      const service1 = getTextGenerationService();
      resetTextGenerationService();
      const service2 = getTextGenerationService();
      expect(service1).not.toBe(service2);
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe("Configuration", () => {
    it("defaults to ollama provider", () => {
      const service = createTextGenerationService();
      expect(service.getProvider()).toBe("ollama");
    });

    it("uses explicit provider config", () => {
      const service = createTextGenerationService({ provider: "claude" });
      expect(service.getProvider()).toBe("claude");
    });

    it("uses default Ollama URL when not specified", () => {
      const service = createTextGenerationService({ provider: "ollama" });
      const config = service.getConfig();
      expect(config.ollamaUrl).toBe("http://localhost:11434");
    });

    it("uses default Ollama model when not specified", () => {
      const service = createTextGenerationService({ provider: "ollama" });
      const config = service.getConfig();
      expect(config.ollamaModel).toBe("llama3.2");
    });

    it("uses default Claude model when not specified", () => {
      const service = createTextGenerationService({ provider: "claude" });
      const config = service.getConfig();
      expect(config.claudeModel).toBe("claude-sonnet-4-20250514");
    });

    it("uses custom Ollama URL when specified", () => {
      const service = createTextGenerationService({
        provider: "ollama",
        ollamaUrl: "http://runpod.io:11434",
      });
      const config = service.getConfig();
      expect(config.ollamaUrl).toBe("http://runpod.io:11434");
    });

    it("uses custom model when specified", () => {
      const service = createTextGenerationService({
        provider: "ollama",
        ollamaModel: "mistral",
      });
      const config = service.getConfig();
      expect(config.ollamaModel).toBe("mistral");
    });

    it("redacts sensitive keys in getConfig", () => {
      const service = createTextGenerationService({
        claudeApiKey: "sk-secret-key",
        openaiApiKey: "sk-openai-key",
      });
      const config = service.getConfig();

      // Sensitive keys should not be present
      expect((config as Record<string, unknown>).claudeApiKey).toBeUndefined();
      expect((config as Record<string, unknown>).openaiApiKey).toBeUndefined();

      // But hasKey flags should be present
      expect(config.hasClaudeKey).toBe(true);
      expect(config.hasOpenaiKey).toBe(true);
    });

    it("uses default temperature and maxTokens", () => {
      const service = createTextGenerationService();
      const config = service.getConfig();
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
    });

    it("uses custom temperature and maxTokens", () => {
      const service = createTextGenerationService({
        temperature: 0.5,
        maxTokens: 2048,
      });
      const config = service.getConfig();
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(2048);
    });
  });

  // ============================================================================
  // PROVIDER SWITCHING TESTS
  // ============================================================================

  describe("Provider Switching", () => {
    it("can switch providers at runtime", () => {
      const service = createTextGenerationService({ provider: "ollama" });
      expect(service.getProvider()).toBe("ollama");

      service.setProvider("claude");
      expect(service.getProvider()).toBe("claude");
    });

    it("throws on unsupported provider", () => {
      const service = createTextGenerationService();
      expect(() => {
        service.setProvider("unsupported" as any);
      }).toThrow("Unknown provider");
    });

    it("throws on OpenAI provider (not implemented)", () => {
      expect(() => {
        createTextGenerationService({ provider: "openai" });
      }).toThrow("OpenAI provider not yet implemented");
    });
  });

  // ============================================================================
  // PROVIDER STATUS TESTS
  // ============================================================================

  describe("Provider Status", () => {
    it("getStatus returns provider info", async () => {
      const service = createTextGenerationService({ provider: "ollama" });
      const status = await service.getStatus();

      expect(status.provider).toBe("ollama");
      expect(status.model).toBe("llama3.2");
      expect(typeof status.available).toBe("boolean");
    });

    it("listProviders returns all providers", async () => {
      const service = createTextGenerationService();
      const providers = await service.listProviders();

      expect(providers.length).toBe(3);
      expect(providers.map((p) => p.provider)).toContain("ollama");
      expect(providers.map((p) => p.provider)).toContain("claude");
      expect(providers.map((p) => p.provider)).toContain("openai");
    });

    it("listProviders includes availability info", async () => {
      const service = createTextGenerationService();
      const providers = await service.listProviders();

      for (const provider of providers) {
        expect(typeof provider.available).toBe("boolean");
        expect(typeof provider.model).toBe("string");
        if (!provider.available) {
          expect(typeof provider.error).toBe("string");
        }
      }
    });
  });
});

// ==============================================================================
// OLLAMA PROVIDER TESTS
// ==============================================================================

describe("OllamaProvider", () => {
  describe("Configuration", () => {
    it("uses default URL when not specified", () => {
      const provider = new OllamaProvider();
      expect(provider.getBaseUrl()).toBe("http://localhost:11434");
    });

    it("uses custom URL when specified", () => {
      const provider = new OllamaProvider("http://custom:8080");
      expect(provider.getBaseUrl()).toBe("http://custom:8080");
    });

    it("removes trailing slash from URL", () => {
      const provider = new OllamaProvider("http://custom:8080/");
      expect(provider.getBaseUrl()).toBe("http://custom:8080");
    });

    it("uses default model when not specified", () => {
      const provider = new OllamaProvider();
      expect(provider.getModel()).toBe("llama3.2");
    });

    it("uses custom model when specified", () => {
      const provider = new OllamaProvider(undefined, "mistral");
      expect(provider.getModel()).toBe("mistral");
    });

    it("has name property set to ollama", () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe("ollama");
    });
  });

  describe("isAvailable", () => {
    it("returns false when server is unreachable", async () => {
      const provider = new OllamaProvider("http://localhost:59999");
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe("generate (mocked)", () => {
    it("constructs correct request body", async () => {
      const provider = new OllamaProvider();
      let capturedBody: any = null;

      // Mock fetch
      const originalFetch = global.fetch;
      global.fetch = mock(async (url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            response: "Test response",
            model: "llama3.2",
            eval_count: 10,
            prompt_eval_count: 5,
          }),
          { status: 200 }
        );
      });

      try {
        await provider.generate("Test prompt");

        expect(capturedBody.model).toBe("llama3.2");
        expect(capturedBody.prompt).toBe("Test prompt");
        expect(capturedBody.stream).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("includes system prompt when provided", async () => {
      const provider = new OllamaProvider();
      let capturedBody: any = null;

      const originalFetch = global.fetch;
      global.fetch = mock(async (url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({ response: "Test", model: "llama3.2" }),
          { status: 200 }
        );
      });

      try {
        await provider.generate("User prompt", {
          systemPrompt: "You are a helpful assistant",
        });

        expect(capturedBody.prompt).toContain("You are a helpful assistant");
        expect(capturedBody.prompt).toContain("User prompt");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("includes stop sequences when provided", async () => {
      const provider = new OllamaProvider();
      let capturedBody: any = null;

      const originalFetch = global.fetch;
      global.fetch = mock(async (url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({ response: "Test", model: "llama3.2" }),
          { status: 200 }
        );
      });

      try {
        await provider.generate("Test", {
          stopSequences: ["STOP", "END"],
        });

        expect(capturedBody.options.stop).toEqual(["STOP", "END"]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("returns correct result structure", async () => {
      const provider = new OllamaProvider();

      const originalFetch = global.fetch;
      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            response: "Generated text",
            model: "llama3.2",
            eval_count: 15,
            prompt_eval_count: 10,
          }),
          { status: 200 }
        );
      });

      try {
        const result = await provider.generate("Test");

        expect(result.text).toBe("Generated text");
        expect(result.model).toBe("llama3.2");
        expect(result.provider).toBe("ollama");
        expect(result.tokensUsed).toBe(25);
        expect(result.inputTokens).toBe(10);
        expect(result.outputTokens).toBe(15);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("throws on API error", async () => {
      const provider = new OllamaProvider();

      const originalFetch = global.fetch;
      global.fetch = mock(async () => {
        return new Response("Model not found", { status: 404 });
      });

      try {
        await expect(provider.generate("Test")).rejects.toThrow(
          "Ollama API error: 404"
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

// ==============================================================================
// CLAUDE PROVIDER TESTS
// ==============================================================================

describe("ClaudeProvider", () => {
  describe("Configuration", () => {
    it("uses default model when not specified", () => {
      const provider = new ClaudeProvider("test-key");
      expect(provider.getModel()).toBe("claude-sonnet-4-20250514");
    });

    it("uses custom model when specified", () => {
      const provider = new ClaudeProvider("test-key", "claude-3-opus-20240229");
      expect(provider.getModel()).toBe("claude-3-opus-20240229");
    });

    it("has name property set to claude", () => {
      const provider = new ClaudeProvider("test-key");
      expect(provider.name).toBe("claude");
    });
  });

  describe("isAvailable", () => {
    it("returns true when API key is provided", async () => {
      const provider = new ClaudeProvider("test-key");
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it("returns false when API key is not provided", async () => {
      // Save and clear env var
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const provider = new ClaudeProvider();
        const available = await provider.isAvailable();
        expect(available).toBe(false);
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it("hasApiKey returns correct status", () => {
      const withKey = new ClaudeProvider("test-key");
      expect(withKey.hasApiKey()).toBe(true);

      // Save and clear env var
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const withoutKey = new ClaudeProvider();
        expect(withoutKey.hasApiKey()).toBe(false);
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });

  describe("generate", () => {
    it("throws when API key is not configured", async () => {
      // Save and clear env var
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const provider = new ClaudeProvider();
        await expect(provider.generate("Test")).rejects.toThrow(
          "Claude API key is required"
        );
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });
});

// ==============================================================================
// HIGH-LEVEL METHOD TESTS (MOCKED)
// ==============================================================================

describe("TextGenerationService High-Level Methods", () => {
  let service: TextGenerationService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = createTextGenerationService({ provider: "ollama" });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetTextGenerationService();
  });

  function mockOllamaResponse(response: string) {
    global.fetch = mock(async (url: string) => {
      if (url.includes("/api/tags")) {
        return new Response(
          JSON.stringify({ models: [{ name: "llama3.2:latest" }] }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          response,
          model: "llama3.2",
          eval_count: 10,
          prompt_eval_count: 5,
        }),
        { status: 200 }
      );
    });
  }

  describe("generate", () => {
    it("passes through to provider", async () => {
      mockOllamaResponse("Hello, world!");

      const result = await service.generate("Say hello");
      expect(result.text).toBe("Hello, world!");
      expect(result.provider).toBe("ollama");
    });

    it("throws when provider is unavailable", async () => {
      // Mock unavailable Ollama
      global.fetch = mock(async () => {
        throw new Error("Connection refused");
      });

      await expect(service.generate("Test")).rejects.toThrow(
        "ollama provider is not available"
      );
    });
  });

  describe("suggestCaptions", () => {
    it("returns parsed captions from LLM response", async () => {
      const mockCaptions: InferredCaption[] = [
        {
          text: "Wow!",
          type: "speech",
          character: "Hero",
          confidence: 0.9,
          positionHint: "top-left",
        },
        {
          text: "CRASH!",
          type: "sfx",
          confidence: 0.85,
          positionHint: "center",
        },
      ];

      mockOllamaResponse(JSON.stringify(mockCaptions));

      const result = await service.suggestCaptions(
        "A hero stands in shock as a building collapses behind them"
      );

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("Wow!");
      expect(result[0].type).toBe("speech");
      expect(result[1].text).toBe("CRASH!");
      expect(result[1].type).toBe("sfx");
    });

    it("handles empty caption suggestions", async () => {
      mockOllamaResponse("[]");

      const result = await service.suggestCaptions(
        "An empty landscape with no characters"
      );

      expect(result).toHaveLength(0);
    });

    it("handles JSON extraction from messy response", async () => {
      const response = `Here are the suggested captions:
[{"text": "Hello!", "type": "speech", "confidence": 0.8}]
Hope this helps!`;

      mockOllamaResponse(response);

      const result = await service.suggestCaptions("A character waving");

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello!");
    });
  });

  describe("generateDialogue", () => {
    it("returns parsed dialogue from LLM response", async () => {
      const mockDialogue: GeneratedDialogue[] = [
        {
          text: "I can't believe this is happening!",
          type: "speech",
          character: "Alice",
          confidence: 0.9,
        },
      ];

      mockOllamaResponse(JSON.stringify(mockDialogue));

      const result = await service.generateDialogue({
        character: {
          name: "Alice",
          personality: "anxious",
        },
        situation: "Alice discovers her house is on fire",
      });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("I can't believe this is happening!");
      expect(result[0].character).toBe("Alice");
    });
  });

  describe("generatePanelDescription", () => {
    it("generates a panel description", async () => {
      mockOllamaResponse(
        "A lone figure stands at the edge of a cliff, silhouetted against the setting sun."
      );

      const result = await service.generatePanelDescription({
        setting: "clifftop at sunset",
        action: "character contemplating",
        mood: "melancholic",
      });

      expect(result).toContain("cliff");
      expect(result).toContain("sun");
    });
  });

  describe("refineText", () => {
    it("refines text based on feedback", async () => {
      mockOllamaResponse("I'm absolutely thrilled to see you!");

      const result = await service.refineText({
        originalText: "I'm happy to see you.",
        feedback: "Make it more enthusiastic",
        contentType: "dialogue",
      });

      expect(result).toContain("thrilled");
    });
  });
});

// ==============================================================================
// INTEGRATION TEST (SKIPPED BY DEFAULT)
// ==============================================================================

describe.skip("Integration: Live Ollama", () => {
  it("connects to local Ollama and generates text", async () => {
    const service = createTextGenerationService({ provider: "ollama" });
    const status = await service.getStatus();

    if (!status.available) {
      console.log("Skipping: Ollama not available");
      return;
    }

    const result = await service.generate("Say 'hello' and nothing else.", {
      maxTokens: 50,
    });

    expect(result.text.toLowerCase()).toContain("hello");
    expect(result.provider).toBe("ollama");
  });

  it("suggests captions from visual description", async () => {
    const service = createTextGenerationService({ provider: "ollama" });
    const status = await service.getStatus();

    if (!status.available) {
      console.log("Skipping: Ollama not available");
      return;
    }

    const result = await service.suggestCaptions(
      "A surprised otter drops its fish and exclaims in shock"
    );

    expect(Array.isArray(result)).toBe(true);
    // At least one caption should be suggested
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("text");
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("confidence");
    }
  });
});
