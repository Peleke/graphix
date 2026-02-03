/**
 * Chat MCP Tools Contract Tests
 *
 * Tests for chat session management and project bootstrap via MCP.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chatTools, handleChatTool } from "../../../mcp/tools/chat.tools.js";

// Mock the services
const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockListSessions = vi.fn();
const mockSendMessage = vi.fn();
const mockDeleteSession = vi.fn();
const mockExtractFromConversation = vi.fn();

const mockCanBootstrap = vi.fn();
const mockBootstrapFromSession = vi.fn();
const mockBootstrapFromExtraction = vi.fn();
const mockBootstrap = vi.fn();

vi.mock("@graphix/core", () => ({
  getChatAgentService: () => ({
    createSession: mockCreateSession,
    getSession: mockGetSession,
    listSessions: mockListSessions,
    sendMessage: mockSendMessage,
    deleteSession: mockDeleteSession,
    extractFromConversation: mockExtractFromConversation,
  }),
  getProjectBootstrapService: () => ({
    canBootstrap: mockCanBootstrap,
    bootstrapFromSession: mockBootstrapFromSession,
    bootstrapFromExtraction: mockBootstrapFromExtraction,
    bootstrap: mockBootstrap,
  }),
}));

describe("Chat MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Tool Schema Tests
  // ==========================================================================

  describe("Tool Schemas", () => {
    it("should export all chat tools", () => {
      expect(chatTools).toHaveProperty("chat_create_session");
      expect(chatTools).toHaveProperty("chat_get_session");
      expect(chatTools).toHaveProperty("chat_list_sessions");
      expect(chatTools).toHaveProperty("chat_send_message");
      expect(chatTools).toHaveProperty("chat_delete_session");
      expect(chatTools).toHaveProperty("chat_extract_story");
      expect(chatTools).toHaveProperty("chat_can_bootstrap");
      expect(chatTools).toHaveProperty("chat_bootstrap_project");
      expect(chatTools).toHaveProperty("chat_bootstrap_from_extraction");
      expect(chatTools).toHaveProperty("project_bootstrap");
    });

    it("should have correct schema for project_bootstrap", () => {
      const tool = chatTools.project_bootstrap;
      expect(tool.name).toBe("project_bootstrap");
      expect(tool.inputSchema.required).toContain("name");
      expect(tool.inputSchema.required).toContain("characters");
      expect(tool.inputSchema.properties).toHaveProperty("description");
      expect(tool.inputSchema.properties).toHaveProperty("setting");
      expect(tool.inputSchema.properties).toHaveProperty("storyboardName");
    });

    it("should have correct schema for chat_create_session", () => {
      const tool = chatTools.chat_create_session;
      expect(tool.name).toBe("chat_create_session");
      expect(tool.inputSchema.properties).toHaveProperty("resourceId");
      expect(tool.inputSchema.properties).toHaveProperty("threadId");
    });

    it("should have correct schema for chat_send_message", () => {
      const tool = chatTools.chat_send_message;
      expect(tool.name).toBe("chat_send_message");
      expect(tool.inputSchema.required).toContain("sessionId");
      expect(tool.inputSchema.required).toContain("content");
    });

    it("should have correct schema for chat_bootstrap_from_extraction", () => {
      const tool = chatTools.chat_bootstrap_from_extraction;
      expect(tool.name).toBe("chat_bootstrap_from_extraction");
      expect(tool.inputSchema.required).toContain("name");
      expect(tool.inputSchema.required).toContain("characters");
      expect(tool.inputSchema.required).toContain("arc");
    });
  });

  // ==========================================================================
  // Handler Tests - chat_create_session
  // ==========================================================================

  describe("chat_create_session", () => {
    it("should create a new session", async () => {
      const mockSession = {
        id: "session-1",
        threadId: "thread-1",
        status: "active",
        workingMemory: { phase: "greeting" },
        createdAt: new Date().toISOString(),
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await handleChatTool("chat_create_session", {
        resourceId: "user-123",
      });

      expect(result).toEqual({
        success: true,
        session: expect.objectContaining({
          id: "session-1",
          status: "active",
        }),
      });
      expect(mockCreateSession).toHaveBeenCalledWith("user-123", undefined);
    });

    it("should create session with default resourceId", async () => {
      const mockSession = {
        id: "session-1",
        threadId: "thread-1",
        status: "active",
        workingMemory: {},
        createdAt: new Date().toISOString(),
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await handleChatTool("chat_create_session", {});

      expect(mockCreateSession).toHaveBeenCalledWith("anonymous", undefined);
      expect(result).toHaveProperty("success", true);
    });

    it("should resume existing thread", async () => {
      const mockSession = {
        id: "session-1",
        threadId: "existing-thread",
        status: "active",
        workingMemory: {},
        createdAt: new Date().toISOString(),
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await handleChatTool("chat_create_session", {
        resourceId: "user-123",
        threadId: "existing-thread",
      });

      expect(mockCreateSession).toHaveBeenCalledWith("user-123", "existing-thread");
      expect(result).toHaveProperty("success", true);
    });
  });

  // ==========================================================================
  // Handler Tests - chat_get_session
  // ==========================================================================

  describe("chat_get_session", () => {
    it("should get a session by ID", async () => {
      const mockSession = {
        id: "session-1",
        messages: [{ role: "assistant", content: "Hello!" }],
        workingMemory: {},
      };
      mockGetSession.mockResolvedValue(mockSession);

      const result = await handleChatTool("chat_get_session", {
        sessionId: "session-1",
      });

      expect(result).toEqual({ success: true, session: mockSession });
    });

    it("should return error for non-existent session", async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await handleChatTool("chat_get_session", {
        sessionId: "nonexistent",
      });

      expect(result).toEqual({ success: false, error: "Session not found" });
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_get_session", {});

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_list_sessions
  // ==========================================================================

  describe("chat_list_sessions", () => {
    it("should list sessions for a user", async () => {
      const mockSessions = [
        {
          id: "session-1",
          title: "Story about wolves",
          status: "active",
          messages: [1, 2, 3],
          updatedAt: "2024-01-01",
        },
        {
          id: "session-2",
          title: "Fantasy adventure",
          status: "complete",
          messages: [1, 2],
          updatedAt: "2024-01-02",
        },
      ];
      mockListSessions.mockResolvedValue(mockSessions);

      const result = await handleChatTool("chat_list_sessions", {
        resourceId: "user-123",
      });

      expect(result).toEqual({
        success: true,
        sessions: [
          {
            id: "session-1",
            title: "Story about wolves",
            status: "active",
            messageCount: 3,
            lastActivity: "2024-01-01",
          },
          {
            id: "session-2",
            title: "Fantasy adventure",
            status: "complete",
            messageCount: 2,
            lastActivity: "2024-01-02",
          },
        ],
        count: 2,
      });
    });

    it("should use anonymous as default resourceId", async () => {
      mockListSessions.mockResolvedValue([]);

      await handleChatTool("chat_list_sessions", {});

      expect(mockListSessions).toHaveBeenCalledWith("anonymous");
    });
  });

  // ==========================================================================
  // Handler Tests - chat_send_message
  // ==========================================================================

  describe("chat_send_message", () => {
    it("should send a message and get response", async () => {
      const mockResult = {
        userMessage: { role: "user", content: "I want a story about wolves" },
        assistantMessage: { role: "assistant", content: "Great! Tell me more..." },
        sessionState: { phase: "characters" },
        suggestions: ["Add romance", "Make it dark"],
      };
      mockSendMessage.mockResolvedValue(mockResult);

      const result = await handleChatTool("chat_send_message", {
        sessionId: "session-1",
        content: "I want a story about wolves",
      });

      expect(result).toEqual({
        success: true,
        userMessage: mockResult.userMessage,
        assistantMessage: mockResult.assistantMessage,
        sessionState: mockResult.sessionState,
        suggestions: mockResult.suggestions,
      });
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_send_message", {
        content: "Hello",
      });

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });

    it("should fail without content", async () => {
      const result = await handleChatTool("chat_send_message", {
        sessionId: "session-1",
      });

      expect(result).toEqual({ success: false, error: "content is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_delete_session
  // ==========================================================================

  describe("chat_delete_session", () => {
    it("should delete a session", async () => {
      mockDeleteSession.mockResolvedValue(undefined);

      const result = await handleChatTool("chat_delete_session", {
        sessionId: "session-1",
      });

      expect(result).toEqual({ success: true, message: "Session deleted" });
      expect(mockDeleteSession).toHaveBeenCalledWith("session-1");
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_delete_session", {});

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_extract_story
  // ==========================================================================

  describe("chat_extract_story", () => {
    it("should extract story data from session", async () => {
      const mockSession = {
        id: "session-1",
        messages: [
          { role: "user", content: "A story about two wolves" },
          { role: "assistant", content: "Tell me about the characters" },
        ],
      };
      const mockExtraction = {
        characters: [{ name: "Luna", species: "wolf" }],
        setting: { location: "forest" },
        arc: { beats: [] },
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockExtractFromConversation.mockResolvedValue(mockExtraction);

      const result = await handleChatTool("chat_extract_story", {
        sessionId: "session-1",
      });

      expect(result).toEqual({ success: true, extraction: mockExtraction });
    });

    it("should return error for non-existent session", async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await handleChatTool("chat_extract_story", {
        sessionId: "nonexistent",
      });

      expect(result).toEqual({ success: false, error: "Session not found" });
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_extract_story", {});

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_can_bootstrap
  // ==========================================================================

  describe("chat_can_bootstrap", () => {
    it("should check if session can bootstrap", async () => {
      mockCanBootstrap.mockResolvedValue({ canBootstrap: true });

      const result = await handleChatTool("chat_can_bootstrap", {
        sessionId: "session-1",
      });

      expect(result).toEqual({ success: true, canBootstrap: true });
    });

    it("should return reason when cannot bootstrap", async () => {
      mockCanBootstrap.mockResolvedValue({
        canBootstrap: false,
        reason: "No characters defined",
      });

      const result = await handleChatTool("chat_can_bootstrap", {
        sessionId: "session-1",
      });

      expect(result).toEqual({
        success: true,
        canBootstrap: false,
        reason: "No characters defined",
      });
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_can_bootstrap", {});

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_bootstrap_project
  // ==========================================================================

  describe("chat_bootstrap_project", () => {
    it("should bootstrap project from session", async () => {
      const mockResult = {
        project: { id: "project-1", name: "Wolf Story" },
        premise: { id: "premise-1" },
        story: { id: "story-1" },
        storyboards: [{ id: "storyboard-1" }],
        beats: [{ id: "beat-1" }],
        panels: [{ id: "panel-1" }],
        characters: [{ id: "char-1" }],
      };
      mockBootstrapFromSession.mockResolvedValue(mockResult);

      const result = await handleChatTool("chat_bootstrap_project", {
        sessionId: "session-1",
      });

      expect(result).toEqual({
        success: true,
        ...mockResult,
      });
    });

    it("should return error when bootstrap fails", async () => {
      mockBootstrapFromSession.mockRejectedValue(new Error("Cannot bootstrap: No characters"));

      const result = await handleChatTool("chat_bootstrap_project", {
        sessionId: "session-1",
      });

      expect(result).toEqual({
        success: false,
        error: "Cannot bootstrap: No characters",
      });
    });

    it("should fail without sessionId", async () => {
      const result = await handleChatTool("chat_bootstrap_project", {});

      expect(result).toEqual({ success: false, error: "sessionId is required" });
    });
  });

  // ==========================================================================
  // Handler Tests - chat_bootstrap_from_extraction
  // ==========================================================================

  describe("chat_bootstrap_from_extraction", () => {
    it("should bootstrap from extracted data", async () => {
      const mockResult = {
        project: { id: "project-1", name: "Wolf Story" },
        premise: { id: "premise-1" },
        story: { id: "story-1" },
        storyboards: [{ id: "storyboard-1" }],
        beats: [{ id: "beat-1" }],
        panels: [{ id: "panel-1" }],
        characters: [{ id: "char-1" }],
      };
      mockBootstrapFromExtraction.mockResolvedValue(mockResult);

      const result = await handleChatTool("chat_bootstrap_from_extraction", {
        name: "Wolf Story",
        characters: [{ name: "Luna", visualDescription: "A gray wolf" }],
        arc: {
          beats: [{ visualDescription: "Luna enters the forest" }],
        },
      });

      expect(result).toEqual({
        success: true,
        ...mockResult,
      });
    });

    it("should fail without name", async () => {
      const result = await handleChatTool("chat_bootstrap_from_extraction", {
        characters: [{ name: "Luna" }],
        arc: { beats: [] },
      });

      expect(result).toEqual({ success: false, error: "name is required" });
    });

    it("should fail without characters", async () => {
      const result = await handleChatTool("chat_bootstrap_from_extraction", {
        name: "Wolf Story",
        arc: { beats: [] },
      });

      expect(result).toEqual({ success: false, error: "characters array is required" });
    });

    it("should fail without arc", async () => {
      const result = await handleChatTool("chat_bootstrap_from_extraction", {
        name: "Wolf Story",
        characters: [{ name: "Luna" }],
      });

      expect(result).toEqual({ success: false, error: "arc is required" });
    });

    it("should return error when bootstrap fails", async () => {
      mockBootstrapFromExtraction.mockRejectedValue(new Error("Invalid story structure"));

      const result = await handleChatTool("chat_bootstrap_from_extraction", {
        name: "Wolf Story",
        characters: [{ name: "Luna", visualDescription: "A wolf" }],
        arc: { beats: [] },
      });

      expect(result).toEqual({
        success: false,
        error: "Invalid story structure",
      });
    });
  });

  // ==========================================================================
  // Handler Tests - project_bootstrap
  // ==========================================================================

  describe("project_bootstrap", () => {
    it("should bootstrap a project with characters", async () => {
      const mockResult = {
        projectId: "project-1",
        projectName: "Wolf Story",
        characterIds: ["char-1", "char-2"],
        storyboardId: "storyboard-1",
        message: "Project created successfully",
      };
      mockBootstrap.mockResolvedValue(mockResult);

      const result = await handleChatTool("project_bootstrap", {
        name: "Wolf Story",
        description: "A story about wolves",
        characters: [
          { name: "Luna", description: "A gray wolf", visualTraits: { species: "wolf" } },
          { name: "Rex", description: "A black wolf" },
        ],
        setting: "Northern forest",
        storyboardName: "Chapter 1",
        style: "watercolor",
        pageCount: 10,
      });

      expect(result).toEqual({
        success: true,
        projectId: "project-1",
        projectName: "Wolf Story",
        characterIds: ["char-1", "char-2"],
        storyboardId: "storyboard-1",
        message: "Project created successfully",
      });
      expect(mockBootstrap).toHaveBeenCalledWith({
        name: "Wolf Story",
        description: "A story about wolves",
        characters: [
          { name: "Luna", description: "A gray wolf", visualTraits: { species: "wolf" } },
          { name: "Rex", description: "A black wolf", visualTraits: undefined },
        ],
        setting: "Northern forest",
        storyboardName: "Chapter 1",
        style: "watercolor",
        pageCount: 10,
      });
    });

    it("should bootstrap a minimal project", async () => {
      const mockResult = {
        projectId: "project-1",
        projectName: "Simple Project",
        characterIds: ["char-1"],
        message: "Project created successfully",
      };
      mockBootstrap.mockResolvedValue(mockResult);

      const result = await handleChatTool("project_bootstrap", {
        name: "Simple Project",
        characters: [{ name: "Hero" }],
      });

      expect(result).toEqual({
        success: true,
        projectId: "project-1",
        projectName: "Simple Project",
        characterIds: ["char-1"],
        message: "Project created successfully",
      });
    });

    it("should fail without name", async () => {
      const result = await handleChatTool("project_bootstrap", {
        characters: [{ name: "Luna" }],
      });

      expect(result).toEqual({ success: false, error: "name is required" });
      expect(mockBootstrap).not.toHaveBeenCalled();
    });

    it("should fail without characters", async () => {
      const result = await handleChatTool("project_bootstrap", {
        name: "Wolf Story",
      });

      expect(result).toEqual({ success: false, error: "characters array is required" });
      expect(mockBootstrap).not.toHaveBeenCalled();
    });

    it("should fail with empty characters array", async () => {
      const result = await handleChatTool("project_bootstrap", {
        name: "Wolf Story",
        characters: "not an array",
      });

      expect(result).toEqual({ success: false, error: "characters array is required" });
      expect(mockBootstrap).not.toHaveBeenCalled();
    });

    it("should return error when bootstrap fails", async () => {
      mockBootstrap.mockRejectedValue(new Error("Database connection failed"));

      const result = await handleChatTool("project_bootstrap", {
        name: "Wolf Story",
        characters: [{ name: "Luna" }],
      });

      expect(result).toEqual({
        success: false,
        error: "Database connection failed",
      });
    });
  });

  // ==========================================================================
  // Unknown Tool Handler
  // ==========================================================================

  describe("Unknown tool", () => {
    it("should throw for unknown tool", async () => {
      await expect(
        handleChatTool("chat_unknown", {})
      ).rejects.toThrow("Unknown chat tool: chat_unknown");
    });
  });
});
