/**
 * Chat Agent Service
 *
 * Service layer for AI-guided project creation using the Mastra agent.
 * Handles session management, message generation, and state transitions.
 *
 * Usage:
 * ```ts
 * const service = new ChatAgentService();
 * const session = await service.createSession("user-123");
 * const response = await service.sendMessage(session.id, "I want to create a story about otters");
 * ```
 */

import { getDefaultDatabase, hasDefaultDatabase, type Database } from "../db/client.js";
import {
  chatThreads,
  chatMessages,
  type ChatThread,
  type ChatMessage,
  type ChatWorkingMemory,
  type ElicitationPhase,
} from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  getInitialWorkingMemory,
  buildSystemPrompt,
  getNextPhase,
  updateWorkingMemory,
  getSuggestionsForPhase,
  canCreateProject,
} from "../agents/project-creation.agent.js";
import { getTextGenerationService } from "./text-generation.service.js";

// =============================================================================
// Types
// =============================================================================

export interface ChatSession {
  id: string;
  resourceId: string;
  title?: string;
  projectId?: string;
  workingMemory: ChatWorkingMemory;
  status: "active" | "completed" | "abandoned";
  messages: ChatMessageData[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    suggestions?: string[];
    phaseTransition?: { from: string; to: string };
    characterMatches?: Array<{ id: string; name: string; score: number }>;
  };
  createdAt: Date;
}

export interface SendMessageResult {
  response: string;
  metadata: {
    suggestions: string[];
    phaseTransition?: { from: string; to: string };
    canCreate: boolean;
  };
  newState: ChatWorkingMemory;
}

export interface StreamChunk {
  type: "text" | "metadata" | "error" | "complete";
  content?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class ChatAgentService {
  private db: Database | null = null;
  private inMemorySessions = new Map<string, ChatSession>();

  constructor(db?: Database) {
    this.db = db ?? (hasDefaultDatabase() ? getDefaultDatabase() : null);
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Create a new chat session.
   */
  async createSession(resourceId: string, existingThreadId?: string): Promise<ChatSession> {
    const now = new Date();
    const workingMemory = getInitialWorkingMemory();

    // Generate initial greeting
    const greetingMessage: ChatMessageData = {
      id: nanoid(),
      role: "assistant",
      content:
        "Hi! I'm here to help you create a new project. Tell me about your story idea - " +
        "it can be as simple as a single sentence or as detailed as you'd like.",
      metadata: {
        suggestions: getSuggestionsForPhase("greeting", workingMemory),
      },
      createdAt: now,
    };

    if (this.db) {
      // Create in database
      const [thread] = await this.db
        .insert(chatThreads)
        .values({
          resourceId,
          workingMemory,
          status: "active",
          lastActivityAt: now,
        })
        .returning();

      // Store greeting message
      await this.db.insert(chatMessages).values({
        threadId: thread.id,
        role: "assistant",
        content: greetingMessage.content,
        metadata: greetingMessage.metadata,
      });

      return {
        id: thread.id,
        resourceId,
        workingMemory,
        status: "active",
        messages: [greetingMessage],
        createdAt: thread.createdAt,
        lastActivityAt: now,
      };
    } else {
      // In-memory fallback
      const session: ChatSession = {
        id: existingThreadId ?? nanoid(),
        resourceId,
        workingMemory,
        status: "active",
        messages: [greetingMessage],
        createdAt: now,
        lastActivityAt: now,
      };

      this.inMemorySessions.set(session.id, session);
      return session;
    }
  }

  /**
   * Get a session by ID.
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    if (this.db) {
      const [thread] = await this.db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.id, sessionId))
        .limit(1);

      if (!thread) return null;

      const messages = await this.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, sessionId))
        .orderBy(chatMessages.createdAt);

      return {
        id: thread.id,
        resourceId: thread.resourceId,
        title: thread.title ?? undefined,
        projectId: thread.projectId ?? undefined,
        workingMemory: thread.workingMemory ?? getInitialWorkingMemory(),
        status: thread.status,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          metadata: m.metadata as ChatMessageData["metadata"],
          createdAt: m.createdAt,
        })),
        createdAt: thread.createdAt,
        lastActivityAt: thread.lastActivityAt,
      };
    } else {
      return this.inMemorySessions.get(sessionId) ?? null;
    }
  }

  /**
   * List sessions for a resource.
   */
  async listSessions(resourceId: string): Promise<ChatSession[]> {
    if (this.db) {
      const threads = await this.db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.resourceId, resourceId))
        .orderBy(desc(chatThreads.lastActivityAt))
        .limit(50);

      // Get messages for each thread
      const sessionsWithMessages: ChatSession[] = [];
      for (const thread of threads) {
        const messages = await this.db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.threadId, thread.id))
          .orderBy(chatMessages.createdAt);

        sessionsWithMessages.push({
          id: thread.id,
          resourceId: thread.resourceId,
          title: thread.title ?? undefined,
          projectId: thread.projectId ?? undefined,
          workingMemory: thread.workingMemory ?? getInitialWorkingMemory(),
          status: thread.status,
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            metadata: m.metadata as ChatMessageData["metadata"],
            createdAt: m.createdAt,
          })),
          createdAt: thread.createdAt,
          lastActivityAt: thread.lastActivityAt,
        });
      }

      return sessionsWithMessages;
    } else {
      return Array.from(this.inMemorySessions.values())
        .filter((s) => s.resourceId === resourceId)
        .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
    }
  }

  /**
   * Delete a session.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (this.db) {
      await this.db.delete(chatThreads).where(eq(chatThreads.id, sessionId));
      return true;
    } else {
      return this.inMemorySessions.delete(sessionId);
    }
  }

  // ---------------------------------------------------------------------------
  // Message Handling
  // ---------------------------------------------------------------------------

  /**
   * Send a message and get a response (non-streaming).
   */
  async sendMessage(sessionId: string, content: string): Promise<SendMessageResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const now = new Date();
    const currentPhase = session.workingMemory.phase;

    // Store user message
    const userMessage: ChatMessageData = {
      id: nanoid(),
      role: "user",
      content,
      createdAt: now,
    };

    // Update state based on user input
    const updatedMemory = this.parseAndUpdateMemory(session.workingMemory, content);

    // Determine next phase
    const nextPhase = getNextPhase(updatedMemory);
    updatedMemory.phase = nextPhase;

    // Generate response
    let responseText: string;
    let usedFallback = false;
    try {
      responseText = await this.generateResponse(updatedMemory, content);
    } catch (error) {
      console.error("LLM generation failed, using fallback:", error);
      usedFallback = true;
      // Provide a more helpful fallback that indicates the AI isn't working
      const fallbackBase = this.getFallbackResponse(nextPhase);
      responseText = `${fallbackBase}\n\n_(AI assistant is temporarily unavailable. Using guided mode.)_`;
    }

    // Build metadata
    const metadata = {
      suggestions: getSuggestionsForPhase(nextPhase, updatedMemory),
      phaseTransition:
        currentPhase !== nextPhase
          ? { from: currentPhase, to: nextPhase }
          : undefined,
      canCreate: canCreateProject(updatedMemory),
    };

    // Store assistant message
    const assistantMessage: ChatMessageData = {
      id: nanoid(),
      role: "assistant",
      content: responseText,
      metadata,
      createdAt: now,
    };

    // Persist
    if (this.db) {
      await this.db.insert(chatMessages).values([
        {
          threadId: sessionId,
          role: "user",
          content,
        },
        {
          threadId: sessionId,
          role: "assistant",
          content: responseText,
          metadata,
        },
      ]);

      await this.db
        .update(chatThreads)
        .set({
          workingMemory: updatedMemory,
          lastActivityAt: now,
        })
        .where(eq(chatThreads.id, sessionId));
    } else {
      session.messages.push(userMessage, assistantMessage);
      session.workingMemory = updatedMemory;
      session.lastActivityAt = now;
    }

    return {
      response: responseText,
      metadata,
      newState: updatedMemory,
    };
  }

  /**
   * Send a message with streaming response.
   */
  async *sendMessageStreaming(
    sessionId: string,
    content: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const session = await this.getSession(sessionId);
    if (!session) {
      yield { type: "error", error: `Session not found: ${sessionId}` };
      return;
    }

    const now = new Date();
    const currentPhase = session.workingMemory.phase;

    // Update state based on user input
    const updatedMemory = this.parseAndUpdateMemory(session.workingMemory, content);

    // Determine next phase
    const nextPhase = getNextPhase(updatedMemory);
    updatedMemory.phase = nextPhase;

    // Generate response (for now, non-streaming then yield)
    // TODO: Implement true streaming when model adapter supports it
    let responseText: string;
    let usedFallback = false;
    try {
      responseText = await this.generateResponse(updatedMemory, content);
    } catch (error) {
      console.error("LLM generation failed, using fallback:", error);
      usedFallback = true;
      // Provide a more helpful fallback that indicates the AI isn't working
      const fallbackBase = this.getFallbackResponse(nextPhase);
      responseText = `${fallbackBase}\n\n_(AI assistant is temporarily unavailable. Using guided mode.)_`;
    }

    // Stream the response character by character (simulated)
    for (const char of responseText) {
      yield { type: "text", content: char };
    }

    // Build and yield metadata
    const metadata = {
      suggestions: getSuggestionsForPhase(nextPhase, updatedMemory),
      phaseTransition:
        currentPhase !== nextPhase
          ? { from: currentPhase, to: nextPhase }
          : undefined,
      canCreate: canCreateProject(updatedMemory),
    };

    yield { type: "metadata", metadata };

    // Persist
    if (this.db) {
      await this.db.insert(chatMessages).values([
        { threadId: sessionId, role: "user", content },
        { threadId: sessionId, role: "assistant", content: responseText, metadata },
      ]);

      await this.db
        .update(chatThreads)
        .set({ workingMemory: updatedMemory, lastActivityAt: now })
        .where(eq(chatThreads.id, sessionId));
    } else {
      session.messages.push(
        { id: nanoid(), role: "user", content, createdAt: now },
        { id: nanoid(), role: "assistant", content: responseText, metadata, createdAt: now }
      );
      session.workingMemory = updatedMemory;
      session.lastActivityAt = now;
    }

    yield {
      type: "complete",
      metadata: { state: updatedMemory },
    };
  }

  // ---------------------------------------------------------------------------
  // AI Generation
  // ---------------------------------------------------------------------------

  /**
   * Generate a response using the LLM.
   */
  private async generateResponse(
    memory: ChatWorkingMemory,
    userMessage: string
  ): Promise<string> {
    const service = getTextGenerationService();
    const systemPrompt = buildSystemPrompt(memory);

    // Log provider info for debugging
    const status = await service.getStatus();
    console.log(`[ChatAgent] Using provider: ${status.provider}, model: ${status.model}, available: ${status.available}`);
    if (!status.available) {
      console.error(`[ChatAgent] Provider not available: ${status.error}`);
      throw new Error(`Text generation provider not available: ${status.error}`);
    }

    const result = await service.generate(userMessage, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    return result.text.trim();
  }

  /**
   * Fallback response when LLM is unavailable.
   */
  private getFallbackResponse(phase: ElicitationPhase): string {
    const responses: Record<ElicitationPhase, string> = {
      greeting:
        "Tell me about your story idea - who are the main characters?",
      characters:
        "Great! Now, where and when does your story take place?",
      setting:
        "What's the main story arc? What conflict or journey will the characters go through?",
      arc:
        "What visual style are you going for? Think about art style, mood, colors.",
      style:
        "Almost done! How many pages do you want this to be?",
      scope:
        "I've got everything I need! Ready to create your project when you are.",
      confirmation:
        "Your project has been created! Redirecting you now...",
      complete:
        "Your project is ready. Let's start creating!",
    };

    return responses[phase];
  }

  // ---------------------------------------------------------------------------
  // State Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse user message and update working memory.
   */
  private parseAndUpdateMemory(
    memory: ChatWorkingMemory,
    userMessage: string
  ): ChatWorkingMemory {
    const updates: Partial<ChatWorkingMemory["gathered"]> = {};
    const lower = userMessage.toLowerCase();

    // Simple heuristic parsing based on current phase
    switch (memory.phase) {
      case "greeting":
        // Store the concept
        updates.concept = userMessage;
        break;

      case "characters":
        // Try to extract character names
        const names = userMessage.match(/([A-Z][a-z]+)/g);
        if (names && names.length > 0) {
          updates.characters = names.map((name) => ({ name }));
        }
        break;

      case "setting":
        if (!lower.includes("skip")) {
          updates.setting = userMessage;
        }
        break;

      case "arc":
        if (!lower.includes("skip")) {
          updates.arc = userMessage;
        }
        break;

      case "style":
        if (!lower.includes("skip")) {
          updates.style = userMessage;
        }
        break;

      case "scope":
        // Try to extract page count
        const pageMatch = lower.match(/(\d+)\s*page/);
        if (pageMatch) {
          updates.pageCount = parseInt(pageMatch[1], 10);
        }
        break;
    }

    // Check for skip commands
    if (lower.includes("skip")) {
      return {
        ...memory,
        skipped: [...memory.skipped, memory.phase],
      };
    }

    return updateWorkingMemory(memory, updates);
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  /**
   * Check if the AI is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const service = getTextGenerationService();
      const status = await service.getStatus();
      return status.available;
    } catch {
      return false;
    }
  }

  /**
   * List available providers.
   */
  async listProviders(): Promise<Array<{ provider: string; available: boolean; model: string }>> {
    try {
      const service = getTextGenerationService();
      return await service.listProviders();
    } catch {
      return [];
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

let instance: ChatAgentService | null = null;

/**
 * Get or create the ChatAgentService singleton.
 */
export function getChatAgentService(): ChatAgentService {
  if (!instance) {
    instance = new ChatAgentService();
  }
  return instance;
}

/**
 * Create a new ChatAgentService instance (non-singleton).
 */
export function createChatAgentService(db?: Database): ChatAgentService {
  return new ChatAgentService(db);
}

/**
 * Reset the singleton (for testing).
 */
export function resetChatAgentService(): void {
  instance = null;
}
