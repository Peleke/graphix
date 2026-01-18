/**
 * Chat Schema Tests
 *
 * Tests for chat_threads and chat_messages tables.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, type DatabaseConnection } from "../../db/client.js";
import { chatThreads, chatMessages, projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";

describe("Chat Schema", () => {
  let connection: DatabaseConnection;

  beforeEach(async () => {
    connection = createTestDatabase();
    
    // Create tables manually for in-memory DB
    await connection.client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        settings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_threads (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        title TEXT,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        working_memory TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_activity_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_call_id TEXT,
        tool_name TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  });

  afterEach(() => {
    connection.close();
  });

  describe("chat_threads", () => {
    it("creates a thread with required fields", async () => {
      const now = new Date();
      
      await connection.db.insert(chatThreads).values({
        id: "thread-1",
        resourceId: "user-123",
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const [thread] = await connection.db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.id, "thread-1"));

      expect(thread).toBeDefined();
      expect(thread.resourceId).toBe("user-123");
      expect(thread.status).toBe("active");
    });

    it("stores working memory as JSON", async () => {
      const now = new Date();
      const workingMemory = {
        phase: "characters" as const,
        gathered: {
          concept: "A story about otters",
          characters: [{ name: "Oliver", description: "Friendly otter" }],
        },
        skipped: [],
      };

      await connection.db.insert(chatThreads).values({
        id: "thread-2",
        resourceId: "user-123",
        workingMemory,
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const [thread] = await connection.db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.id, "thread-2"));

      expect(thread.workingMemory).toEqual(workingMemory);
      expect(thread.workingMemory?.phase).toBe("characters");
      expect(thread.workingMemory?.gathered?.concept).toBe("A story about otters");
    });

    it("links thread to project", async () => {
      const now = new Date();

      // Create project first
      await connection.db.insert(projects).values({
        id: "proj-1",
        name: "Test Project",
        createdAt: now,
        updatedAt: now,
      });

      // Create thread linked to project
      await connection.db.insert(chatThreads).values({
        id: "thread-3",
        resourceId: "user-123",
        projectId: "proj-1",
        status: "completed",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const [thread] = await connection.db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.id, "thread-3"));

      expect(thread.projectId).toBe("proj-1");
      expect(thread.status).toBe("completed");
    });
  });

  describe("chat_messages", () => {
    const now = new Date();

    beforeEach(async () => {
      // Create a thread for messages
      await connection.db.insert(chatThreads).values({
        id: "thread-msg",
        resourceId: "user-123",
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    it("creates user and assistant messages", async () => {
      await connection.db.insert(chatMessages).values([
        {
          id: "msg-1",
          threadId: "thread-msg",
          role: "user",
          content: "I want to create a story about otters",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "msg-2",
          threadId: "thread-msg",
          role: "assistant",
          content: "That sounds fun! Tell me more about the otters.",
          metadata: {
            suggestions: ["They live by a river", "They are siblings"],
          },
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const messages = await connection.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, "thread-msg"));

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].metadata?.suggestions).toHaveLength(2);
    });

    it("stores tool call messages", async () => {
      await connection.db.insert(chatMessages).values({
        id: "msg-tool",
        threadId: "thread-msg",
        role: "tool_call",
        content: JSON.stringify({ query: "otter characters" }),
        toolCallId: "call-123",
        toolName: "matchCharacters",
        createdAt: now,
        updatedAt: now,
      });

      const [message] = await connection.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, "msg-tool"));

      expect(message.role).toBe("tool_call");
      expect(message.toolName).toBe("matchCharacters");
      expect(message.toolCallId).toBe("call-123");
    });

    it("cascades delete when thread is deleted", async () => {
      await connection.db.insert(chatMessages).values({
        id: "msg-cascade",
        threadId: "thread-msg",
        role: "user",
        content: "Test message",
        createdAt: now,
        updatedAt: now,
      });

      // Delete the thread
      await connection.db
        .delete(chatThreads)
        .where(eq(chatThreads.id, "thread-msg"));

      // Messages should be deleted
      const messages = await connection.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, "thread-msg"));

      expect(messages).toHaveLength(0);
    });
  });

  describe("thread statuses", () => {
    it("supports all status values", async () => {
      const now = new Date();
      const statuses = ["active", "completed", "abandoned"] as const;

      for (const status of statuses) {
        await connection.db.insert(chatThreads).values({
          id: `thread-${status}`,
          resourceId: "user-123",
          status,
          lastActivityAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      const threads = await connection.db.select().from(chatThreads);
      expect(threads).toHaveLength(3);
      
      const statusValues = threads.map((t) => t.status);
      expect(statusValues).toContain("active");
      expect(statusValues).toContain("completed");
      expect(statusValues).toContain("abandoned");
    });
  });
});
