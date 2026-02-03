/**
 * Text Generation MCP Tools Contract Tests
 *
 * Tests for text generation tools via MCP, including the prompt_spice tool.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  textGenerationTools,
  handleTextGenerationTool,
} from "../../../mcp/tools/text-generation.tools.js";

// Mock the text generation service
const mockGetStatus = vi.fn();
const mockGetConfig = vi.fn();
const mockListProviders = vi.fn();
const mockGetProvider = vi.fn();
const mockSetProvider = vi.fn();
const mockGenerate = vi.fn();
const mockGeneratePanelDescription = vi.fn();
const mockGenerateDialogue = vi.fn();
const mockSuggestCaptions = vi.fn();
const mockRefineText = vi.fn();
const mockSpicePrompt = vi.fn();

vi.mock("@graphix/core", () => ({
  getTextGenerationService: () => ({
    getStatus: mockGetStatus,
    getConfig: mockGetConfig,
    listProviders: mockListProviders,
    getProvider: mockGetProvider,
    setProvider: mockSetProvider,
    generate: mockGenerate,
    generatePanelDescription: mockGeneratePanelDescription,
    generateDialogue: mockGenerateDialogue,
    suggestCaptions: mockSuggestCaptions,
    refineText: mockRefineText,
    spicePrompt: mockSpicePrompt,
  }),
}));

describe("Text Generation MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProvider.mockReturnValue("ollama");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Tool Schema Tests
  // ==========================================================================

  describe("Tool Schemas", () => {
    it("should export all text generation tools", () => {
      expect(textGenerationTools).toHaveProperty("text_status");
      expect(textGenerationTools).toHaveProperty("text_list_providers");
      expect(textGenerationTools).toHaveProperty("text_set_provider");
      expect(textGenerationTools).toHaveProperty("text_generate");
      expect(textGenerationTools).toHaveProperty("text_panel_description");
      expect(textGenerationTools).toHaveProperty("text_dialogue");
      expect(textGenerationTools).toHaveProperty("text_suggest_captions");
      expect(textGenerationTools).toHaveProperty("text_refine");
      expect(textGenerationTools).toHaveProperty("prompt_spice");
    });

    it("should have correct schema for prompt_spice", () => {
      const tool = textGenerationTools.prompt_spice;
      expect(tool.name).toBe("prompt_spice");
      expect(tool.inputSchema.required).toContain("prompt");
      expect(tool.inputSchema.properties).toHaveProperty("prompt");
      expect(tool.inputSchema.properties).toHaveProperty("target");
      const targetProp = tool.inputSchema.properties?.target as { enum?: string[] };
      expect(targetProp?.enum).toEqual(["positive", "negative"]);
    });

    it("should have correct schema for text_generate", () => {
      const tool = textGenerationTools.text_generate;
      expect(tool.name).toBe("text_generate");
      expect(tool.inputSchema.required).toContain("prompt");
      expect(tool.inputSchema.properties).toHaveProperty("systemPrompt");
      expect(tool.inputSchema.properties).toHaveProperty("temperature");
      expect(tool.inputSchema.properties).toHaveProperty("maxTokens");
    });

    it("should have correct schema for text_dialogue", () => {
      const tool = textGenerationTools.text_dialogue;
      expect(tool.name).toBe("text_dialogue");
      expect(tool.inputSchema.required).toContain("characterName");
      expect(tool.inputSchema.required).toContain("situation");
    });
  });

  // ==========================================================================
  // Handler Tests - text_status
  // ==========================================================================

  describe("text_status", () => {
    it("should return provider status", async () => {
      mockGetStatus.mockResolvedValue({
        provider: "ollama",
        available: true,
        model: "llama3.2",
      });
      mockGetConfig.mockReturnValue({ baseUrl: "http://localhost:11434" });

      const result = await handleTextGenerationTool("text_status", {});

      expect(result).toEqual({
        provider: "ollama",
        available: true,
        model: "llama3.2",
        config: { baseUrl: "http://localhost:11434" },
      });
    });

    it("should return error when status check fails", async () => {
      mockGetStatus.mockRejectedValue(new Error("Connection refused"));

      const result = await handleTextGenerationTool("text_status", {});

      expect(result).toHaveProperty("error");
    });
  });

  // ==========================================================================
  // Handler Tests - text_list_providers
  // ==========================================================================

  describe("text_list_providers", () => {
    it("should list available providers", async () => {
      mockListProviders.mockResolvedValue([
        { name: "ollama", available: true },
        { name: "claude", available: true },
        { name: "openai", available: false },
      ]);

      const result = await handleTextGenerationTool("text_list_providers", {});

      expect(result).toEqual({
        current: "ollama",
        providers: [
          { name: "ollama", available: true },
          { name: "claude", available: true },
          { name: "openai", available: false },
        ],
      });
    });
  });

  // ==========================================================================
  // Handler Tests - text_set_provider
  // ==========================================================================

  describe("text_set_provider", () => {
    it("should switch provider", async () => {
      mockGetStatus.mockResolvedValue({ provider: "claude", available: true });

      const result = await handleTextGenerationTool("text_set_provider", {
        provider: "claude",
      });

      expect(mockSetProvider).toHaveBeenCalledWith("claude");
      expect(result).toHaveProperty("message", "Switched to claude provider");
    });

    it("should fail without provider", async () => {
      const result = await handleTextGenerationTool("text_set_provider", {});

      expect(result).toEqual({ error: "provider is required" });
    });

    it("should fail with invalid provider", async () => {
      const result = await handleTextGenerationTool("text_set_provider", {
        provider: "invalid",
      });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("Invalid provider");
    });
  });

  // ==========================================================================
  // Handler Tests - text_generate
  // ==========================================================================

  describe("text_generate", () => {
    it("should generate text", async () => {
      mockGenerate.mockResolvedValue({ text: "Generated text content" });

      const result = await handleTextGenerationTool("text_generate", {
        prompt: "Write a short story",
      });

      expect(result).toEqual({ text: "Generated text content" });
      expect(mockGenerate).toHaveBeenCalledWith("Write a short story", {
        systemPrompt: undefined,
        temperature: undefined,
        maxTokens: undefined,
        timeoutMs: undefined,
      });
    });

    it("should pass options correctly", async () => {
      mockGenerate.mockResolvedValue({ text: "Result" });

      await handleTextGenerationTool("text_generate", {
        prompt: "Test prompt",
        systemPrompt: "You are helpful",
        temperature: 0.8,
        maxTokens: 1000,
        timeoutMs: 30000,
      });

      expect(mockGenerate).toHaveBeenCalledWith("Test prompt", {
        systemPrompt: "You are helpful",
        temperature: 0.8,
        maxTokens: 1000,
        timeoutMs: 30000,
      });
    });

    it("should fail without prompt", async () => {
      const result = await handleTextGenerationTool("text_generate", {});

      expect(result).toEqual({ error: "prompt is required" });
    });

    it("should validate temperature bounds", async () => {
      const result = await handleTextGenerationTool("text_generate", {
        prompt: "Test",
        temperature: 5,
      });

      expect(result).toEqual({ error: "temperature must be between 0 and 2" });
    });

    it("should validate maxTokens bounds", async () => {
      const result = await handleTextGenerationTool("text_generate", {
        prompt: "Test",
        maxTokens: 0,
      });

      expect(result).toEqual({ error: "maxTokens must be between 1 and 100000" });
    });

    it("should validate timeoutMs bounds", async () => {
      const result = await handleTextGenerationTool("text_generate", {
        prompt: "Test",
        timeoutMs: 500,
      });

      expect(result).toEqual({ error: "timeoutMs must be between 1000 and 300000" });
    });
  });

  // ==========================================================================
  // Handler Tests - text_panel_description
  // ==========================================================================

  describe("text_panel_description", () => {
    it("should generate panel description", async () => {
      mockGeneratePanelDescription.mockResolvedValue(
        "A wolf stands in a moonlit forest clearing"
      );

      const result = await handleTextGenerationTool("text_panel_description", {
        setting: "Forest at night",
        action: "Wolf howling",
        mood: "mysterious",
      });

      expect(result).toEqual({
        description: "A wolf stands in a moonlit forest clearing",
        provider: "ollama",
      });
    });

    it("should work with minimal context", async () => {
      mockGeneratePanelDescription.mockResolvedValue("A scene unfolds");

      const result = await handleTextGenerationTool("text_panel_description", {});

      expect(result).toHaveProperty("description");
    });
  });

  // ==========================================================================
  // Handler Tests - text_dialogue
  // ==========================================================================

  describe("text_dialogue", () => {
    it("should generate dialogue", async () => {
      mockGenerateDialogue.mockResolvedValue("I never thought I'd see you again.");

      const result = await handleTextGenerationTool("text_dialogue", {
        characterName: "Luna",
        situation: "Reuniting with an old friend",
        emotion: "surprised",
      });

      expect(result).toEqual({
        dialogue: "I never thought I'd see you again.",
        provider: "ollama",
      });
    });

    it("should fail without characterName", async () => {
      const result = await handleTextGenerationTool("text_dialogue", {
        situation: "A scene",
      });

      expect(result).toEqual({ error: "characterName is required" });
    });

    it("should fail without situation", async () => {
      const result = await handleTextGenerationTool("text_dialogue", {
        characterName: "Luna",
      });

      expect(result).toEqual({ error: "situation is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - text_suggest_captions
  // ==========================================================================

  describe("text_suggest_captions", () => {
    it("should suggest captions", async () => {
      const mockCaptions = [
        { type: "speech", text: "Hello!", character: "Luna" },
        { type: "sfx", text: "WHOOSH" },
      ];
      mockSuggestCaptions.mockResolvedValue(mockCaptions);

      const result = await handleTextGenerationTool("text_suggest_captions", {
        visualDescription: "Luna waves her hand as wind blows",
      });

      expect(result).toEqual({
        captions: mockCaptions,
        count: 2,
        provider: "ollama",
      });
    });

    it("should fail without visualDescription", async () => {
      const result = await handleTextGenerationTool("text_suggest_captions", {});

      expect(result).toEqual({ error: "visualDescription is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - text_refine
  // ==========================================================================

  describe("text_refine", () => {
    it("should refine text", async () => {
      mockRefineText.mockResolvedValue("The refined and improved text");

      const result = await handleTextGenerationTool("text_refine", {
        originalText: "The original text",
        feedback: "Make it more dramatic",
      });

      expect(result).toEqual({
        originalText: "The original text",
        refinedText: "The refined and improved text",
        provider: "ollama",
      });
    });

    it("should pass contentType", async () => {
      mockRefineText.mockResolvedValue("Refined dialogue");

      await handleTextGenerationTool("text_refine", {
        originalText: "Hello",
        feedback: "More emotional",
        contentType: "dialogue",
      });

      expect(mockRefineText).toHaveBeenCalledWith({
        originalText: "Hello",
        feedback: "More emotional",
        contentType: "dialogue",
      });
    });

    it("should fail without originalText", async () => {
      const result = await handleTextGenerationTool("text_refine", {
        feedback: "Make it better",
      });

      expect(result).toEqual({ error: "originalText is required" });
    });

    it("should fail without feedback", async () => {
      const result = await handleTextGenerationTool("text_refine", {
        originalText: "Some text",
      });

      expect(result).toEqual({ error: "feedback is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - prompt_spice
  // ==========================================================================

  describe("prompt_spice", () => {
    it("should spice a positive prompt", async () => {
      mockSpicePrompt.mockResolvedValue(
        "score_9, explicit, nude wolf and rabbit, passionate embrace, bedroom, romantic lighting"
      );

      const result = await handleTextGenerationTool("prompt_spice", {
        prompt: "wolf and rabbit hugging in bedroom",
      });

      expect(result).toEqual({
        originalPrompt: "wolf and rabbit hugging in bedroom",
        spicedPrompt:
          "score_9, explicit, nude wolf and rabbit, passionate embrace, bedroom, romantic lighting",
        target: "positive",
        provider: "ollama",
      });
      expect(mockSpicePrompt).toHaveBeenCalledWith(
        "wolf and rabbit hugging in bedroom",
        "positive"
      );
    });

    it("should spice a negative prompt", async () => {
      mockSpicePrompt.mockResolvedValue(
        "ugly genitals, bad anatomy, censorship, mosaic, pixelated"
      );

      const result = await handleTextGenerationTool("prompt_spice", {
        prompt: "bad quality, blurry",
        target: "negative",
      });

      expect(result).toEqual({
        originalPrompt: "bad quality, blurry",
        spicedPrompt: "ugly genitals, bad anatomy, censorship, mosaic, pixelated",
        target: "negative",
        provider: "ollama",
      });
      expect(mockSpicePrompt).toHaveBeenCalledWith("bad quality, blurry", "negative");
    });

    it("should default to positive target", async () => {
      mockSpicePrompt.mockResolvedValue("spiced content");

      await handleTextGenerationTool("prompt_spice", {
        prompt: "some prompt",
      });

      expect(mockSpicePrompt).toHaveBeenCalledWith("some prompt", "positive");
    });

    it("should fail without prompt", async () => {
      const result = await handleTextGenerationTool("prompt_spice", {});

      expect(result).toEqual({ error: "prompt is required" });
      expect(mockSpicePrompt).not.toHaveBeenCalled();
    });

    it("should fail with empty prompt", async () => {
      const result = await handleTextGenerationTool("prompt_spice", {
        prompt: "",
      });

      expect(result).toEqual({ error: "prompt is required" });
      expect(mockSpicePrompt).not.toHaveBeenCalled();
    });

    it("should return error when spicing fails", async () => {
      mockSpicePrompt.mockRejectedValue(new Error("Provider unavailable"));

      const result = await handleTextGenerationTool("prompt_spice", {
        prompt: "test prompt",
      });

      expect(result).toHaveProperty("error");
    });
  });

  // ==========================================================================
  // Unknown Tool Handler
  // ==========================================================================

  describe("Unknown tool", () => {
    it("should return error for unknown tool", async () => {
      const result = await handleTextGenerationTool("text_unknown", {});

      expect(result).toEqual({ error: "Unknown text generation tool: text_unknown" });
    });
  });
});
