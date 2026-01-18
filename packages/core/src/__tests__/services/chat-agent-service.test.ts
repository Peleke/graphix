/**
 * Chat Agent Service Tests
 *
 * Tests for the AI-guided project creation chat service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Set env before any imports
process.env.ALLOW_LOCAL_OLLAMA = "true";

import {
  ChatAgentService,
  createChatAgentService,
  resetChatAgentService,
} from "../../services/chat-agent.service.js";

// Mock the text generation service
vi.mock("../../services/text-generation.service.js", () => ({
  getTextGenerationService: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "Great! Tell me about the characters in your story.",
      model: "mock",
      provider: "mock",
    }),
    getStatus: vi.fn().mockResolvedValue({ available: true }),
    listProviders: vi.fn().mockResolvedValue([
      { provider: "ollama", available: true, model: "llama3.2" },
    ]),
  })),
}));

// Mock database (returns null to use in-memory)
vi.mock("../../db/client.js", () => ({
  getDefaultDatabase: vi.fn(() => null),
  hasDefaultDatabase: vi.fn(() => false),
}));

describe("ChatAgentService", () => {
  let service: ChatAgentService;

  beforeEach(() => {
    resetChatAgentService();
    service = createChatAgentService();
  });

  describe("Session Management", () => {
    it("creates a new session", async () => {
      const session = await service.createSession("user-123");

      expect(session.id).toBeTruthy();
      expect(session.resourceId).toBe("user-123");
      expect(session.status).toBe("active");
      expect(session.workingMemory.phase).toBe("greeting");
    });

    it("includes initial greeting message", async () => {
      const session = await service.createSession("user-123");

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe("assistant");
      expect(session.messages[0].content).toContain("help you create");
    });

    it("greeting has suggestions", async () => {
      const session = await service.createSession("user-123");

      expect(session.messages[0].metadata?.suggestions).toBeDefined();
      expect(session.messages[0].metadata?.suggestions?.length).toBeGreaterThan(0);
    });

    it("gets session by ID", async () => {
      const created = await service.createSession("user-123");
      const retrieved = await service.getSession(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("returns null for non-existent session", async () => {
      const session = await service.getSession("non-existent");
      expect(session).toBeNull();
    });

    it("lists sessions for a resource", async () => {
      await service.createSession("user-123");
      await service.createSession("user-123");
      await service.createSession("user-456");

      const sessions = await service.listSessions("user-123");

      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.resourceId === "user-123")).toBe(true);
    });

    it("deletes a session", async () => {
      const session = await service.createSession("user-123");
      const deleted = await service.deleteSession(session.id);

      expect(deleted).toBe(true);

      const retrieved = await service.getSession(session.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Message Handling", () => {
    it("sends a message and gets response", async () => {
      const session = await service.createSession("user-123");
      const result = await service.sendMessage(
        session.id,
        "I want to create a story about otters"
      );

      expect(result.response).toBeTruthy();
      expect(result.newState).toBeDefined();
    });

    it("response includes suggestions", async () => {
      const session = await service.createSession("user-123");
      const result = await service.sendMessage(session.id, "A romance story");

      expect(result.metadata.suggestions).toBeDefined();
      expect(result.metadata.suggestions.length).toBeGreaterThan(0);
    });

    it("tracks phase transitions", async () => {
      const session = await service.createSession("user-123");
      const result = await service.sendMessage(session.id, "A story about Oliver the otter");

      // Should transition from greeting to characters
      expect(result.metadata.phaseTransition).toBeDefined();
      expect(result.metadata.phaseTransition?.from).toBe("greeting");
    });

    it("throws for non-existent session", async () => {
      await expect(
        service.sendMessage("non-existent", "Hello")
      ).rejects.toThrow("Session not found");
    });

    it("updates working memory with user input", async () => {
      const session = await service.createSession("user-123");
      const result = await service.sendMessage(
        session.id,
        "A story about Oliver and Olivia"
      );

      // Should have extracted the concept
      expect(result.newState.gathered.concept).toBeDefined();
    });
  });

  describe("Streaming", () => {
    it("streams response chunks", async () => {
      const session = await service.createSession("user-123");
      const chunks: Array<{ type: string; content?: string }> = [];

      for await (const chunk of service.sendMessageStreaming(
        session.id,
        "Hello"
      )) {
        chunks.push(chunk);
      }

      // Should have text chunks, metadata, and complete
      const hasText = chunks.some((c) => c.type === "text");
      const hasMetadata = chunks.some((c) => c.type === "metadata");
      const hasComplete = chunks.some((c) => c.type === "complete");

      expect(hasText).toBe(true);
      expect(hasMetadata).toBe(true);
      expect(hasComplete).toBe(true);
    });

    it("yields error for non-existent session", async () => {
      const chunks: Array<{ type: string; error?: string }> = [];

      for await (const chunk of service.sendMessageStreaming(
        "non-existent",
        "Hello"
      )) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("error");
      expect(chunks[0].error).toContain("not found");
    });
  });

  describe("Skip Commands", () => {
    it("handles skip command", async () => {
      const session = await service.createSession("user-123");
      
      // Send concept to move past greeting
      await service.sendMessage(session.id, "A story idea");
      
      // Skip characters
      const result = await service.sendMessage(session.id, "Skip for now");

      // Should have added to skipped phases
      expect(result.newState.skipped).toContain("characters");
    });
  });

  describe("Status", () => {
    it("checks AI availability", async () => {
      const available = await service.isAvailable();
      expect(typeof available).toBe("boolean");
    });

    it("lists providers", async () => {
      const providers = await service.listProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });
});

describe("State Parsing", () => {
  let service: ChatAgentService;

  beforeEach(() => {
    resetChatAgentService();
    service = createChatAgentService();
  });

  it("extracts character names from message", async () => {
    const session = await service.createSession("user-123");
    
    // Move to characters phase
    await service.sendMessage(session.id, "A story");
    
    // Send character names
    const result = await service.sendMessage(
      session.id,
      "The main characters are Oliver and Olivia"
    );

    expect(result.newState.gathered.characters).toBeDefined();
  });

  it("extracts page count", async () => {
    const session = await service.createSession("user-123");
    
    // Fast forward to scope phase
    await service.sendMessage(session.id, "A story");
    await service.sendMessage(session.id, "Skip");
    await service.sendMessage(session.id, "Skip");
    await service.sendMessage(session.id, "Skip");
    await service.sendMessage(session.id, "Skip");
    
    // Send page count
    const result = await service.sendMessage(session.id, "I want 8 pages");

    expect(result.newState.gathered.pageCount).toBe(8);
  });
});
