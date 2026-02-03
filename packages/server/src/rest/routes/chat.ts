/**
 * Chat Routes
 * 
 * REST API endpoints for AI-guided project creation:
 * - Session management
 * - Streaming message responses (SSE)
 * - Project bootstrapping
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { errors } from "../errors/index.js";
import { validateBody } from "../validation/index.js";


// =============================================================================
// Validation Schemas
// =============================================================================

const createSessionSchema = z.object({
  threadId: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, "content is required").max(4000, "content too long"),
});

const enhancedBootstrapSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  description: z.string().optional(),
  characters: z.array(z.object({
    name: z.string(),
    role: z.enum(["protagonist", "antagonist", "supporting", "minor"]),
    species: z.string().optional(),
    visualDescription: z.string(),
    personality: z.array(z.string()),
    motivation: z.string().optional(),
    arc: z.string().optional(),
    relationships: z.array(z.object({
      character: z.string(),
      relationship: z.string(),
    })).optional(),
  })).min(1, "At least one character is required"),
  setting: z.object({
    location: z.string(),
    timeperiod: z.string().optional(),
    atmosphere: z.string(),
    visualDetails: z.array(z.string()),
  }).nullable().optional(),
  arc: z.object({
    premise: z.object({
      logline: z.string(),
      genre: z.string(),
      tone: z.string(),
      themes: z.array(z.string()),
      setting: z.string(),
    }),
    structure: z.enum(["three-act", "five-act", "hero-journey"]),
    acts: z.array(z.string()),
    beats: z.array(z.object({
      type: z.string(),
      actIndex: z.number(),
      summary: z.string(),
      visualDescription: z.string(),
      emotionalTone: z.string(),
      involvedCharacters: z.array(z.string()),
      cameraAngle: z.string().optional(),
      narration: z.string().optional(),
      sfx: z.string().optional(),
    })),
  }),
  style: z.string().optional(),
  pageCount: z.number().optional(),
});

// =============================================================================
// Chat Service Import
// =============================================================================

import { getChatAgentService, getProjectBootstrapService } from "@graphix/core";

function getChatService() {
  return getChatAgentService();
}

// =============================================================================
// Routes
// =============================================================================

export const chatRoutes = new Hono();

// -----------------------------------------------------------------------------
// Session Management
// -----------------------------------------------------------------------------

/**
 * POST /sessions
 * 
 * Create a new chat session.
 */
chatRoutes.post(
  "/sessions",
  validateBody(createSessionSchema),
  async (c) => {
    const { threadId } = c.req.valid("json");
    const chatService = getChatService();
    
    const session = await chatService.createSession(
      "anonymous", // resourceId - could use auth user ID later
      threadId
    );
    
    return c.json({
      id: session.id,
      threadId: session.id,
      state: session.workingMemory,
      messages: session.messages,
    }, 201);
  }
);

/**
 * GET /sessions
 * 
 * List all chat sessions (threads) for thread management UI.
 */
chatRoutes.get("/sessions", async (c) => {
  const chatService = getChatService();
  const resourceId = c.req.query("resourceId") || "anonymous";
  
  const sessions = await chatService.listSessions(resourceId);
  
  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title || getSessionTitle(s),
      projectId: s.projectId,
      status: s.status,
      phase: s.workingMemory.phase,
      messageCount: s.messages.length,
      lastActivityAt: s.lastActivityAt,
      createdAt: s.createdAt,
    })),
  });
});

/**
 * Get a title for a session based on its content.
 */
function getSessionTitle(session: { workingMemory: { gathered: { concept?: string } }; messages: { content: string }[] }): string {
  // Use concept if available
  if (session.workingMemory.gathered.concept) {
    const concept = session.workingMemory.gathered.concept;
    return concept.length > 50 ? concept.slice(0, 47) + "..." : concept;
  }
  
  // Use first user message
  const firstUserMessage = session.messages.find((m) => m.content && m.content.length > 10);
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    return content.length > 50 ? content.slice(0, 47) + "..." : content;
  }
  
  return "New conversation";
}

/**
 * GET /sessions/:id
 * 
 * Get a chat session with messages.
 */
chatRoutes.get("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const chatService = getChatService();
  const session = await chatService.getSession(sessionId);
  
  if (!session) {
    return errors.notFound(c, "Session not found");
  }
  
  return c.json({
    id: session.id,
    threadId: session.id,
    state: session.workingMemory,
    messages: session.messages,
  });
});

/**
 * DELETE /sessions/:id
 * 
 * Delete a chat session.
 */
chatRoutes.delete("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const chatService = getChatService();
  
  const session = await chatService.getSession(sessionId);
  if (!session) {
    return errors.notFound(c, "Session not found");
  }
  
  await chatService.deleteSession(sessionId);
  
  return c.json({ deleted: true });
});

// -----------------------------------------------------------------------------
// Messaging (Streaming)
// -----------------------------------------------------------------------------

/**
 * POST /sessions/:id/messages
 * 
 * Send a message and receive streaming response via SSE.
 */
chatRoutes.post(
  "/sessions/:id/messages",
  validateBody(sendMessageSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const { content } = c.req.valid("json");
    const chatService = getChatService();
    
    const session = await chatService.getSession(sessionId);
    if (!session) {
      return errors.notFound(c, "Session not found");
    }
    
    // Stream the response using SSE
    return streamSSE(c, async (stream) => {
      let fullContent = '';
      let metadata: Record<string, unknown> = {};
      
      try {
        for await (const chunk of chatService.sendMessageStreaming(sessionId, content)) {
          if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content;
            await stream.writeSSE({
              event: 'text',
              data: chunk.content,
            });
          } else if (chunk.type === 'metadata' && chunk.metadata) {
            metadata = chunk.metadata;
            await stream.writeSSE({
              event: 'metadata',
              data: JSON.stringify(chunk.metadata),
            });
          } else if (chunk.type === 'error') {
            await stream.writeSSE({
              event: 'error',
              data: chunk.error || 'Unknown error',
            });
          } else if (chunk.type === 'complete') {
            await stream.writeSSE({
              event: 'complete',
              data: JSON.stringify({
                state: chunk.metadata?.state,
              }),
            });
          }
        }
      } catch (error) {
        console.error('Chat streaming error:', error);
        await stream.writeSSE({
          event: 'error',
          data: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }
);

/**
 * POST /sessions/:id/messages/sync
 * 
 * Send a message and receive non-streaming response (for testing).
 */
chatRoutes.post(
  "/sessions/:id/messages/sync",
  validateBody(sendMessageSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const { content } = c.req.valid("json");
    const chatService = getChatService();
    
    const session = await chatService.getSession(sessionId);
    if (!session) {
      return errors.notFound(c, "Session not found");
    }
    
    const result = await chatService.sendMessage(sessionId, content);
    
    return c.json({
      userMessage: { content, role: 'user' },
      assistantMessage: {
        content: result.response,
        role: 'assistant',
        metadata: result.metadata,
      },
      state: result.newState,
    });
  }
);

// -----------------------------------------------------------------------------
// Bootstrap
// -----------------------------------------------------------------------------

/**
 * POST /sessions/:id/bootstrap
 * 
 * Create a project from the session's gathered data.
 */
chatRoutes.post("/sessions/:id/bootstrap", async (c) => {
  const sessionId = c.req.param("id");
  const bootstrapService = getProjectBootstrapService();

  try {
    const result = await bootstrapService.bootstrapFromSession(sessionId);

    return c.json({
      projectId: result.projectId,
      projectName: result.projectName,
      characterIds: result.characterIds,
      storyboardId: result.storyboardId,
      message: result.message,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errors.notFound(c, "Session not found");
    }
    if (error instanceof Error && error.message.includes("Cannot bootstrap")) {
      return errors.badRequest(c, error.message);
    }
    throw error;
  }
});

/**
 * POST /bootstrap/enhanced
 *
 * Create a full project structure from enhanced extraction data.
 * Creates: Project → Characters → Premise → Story → Storyboards (per act) → Beats → Panels
 *
 * This is the main endpoint for Phase 1 chat-driven story creation.
 */
chatRoutes.post(
  "/bootstrap/enhanced",
  validateBody(enhancedBootstrapSchema),
  async (c) => {
    const input = c.req.valid("json");
    const bootstrapService = getProjectBootstrapService();

    try {
      const result = await bootstrapService.bootstrapFromExtraction(input);

      return c.json({
        project: result.project,
        premise: result.premise,
        story: result.story,
        storyboards: result.storyboards,
        beats: result.beats,
        panels: result.panels,
        characters: result.characters,
      }, 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("required")) {
          return errors.badRequest(c, error.message);
        }
      }
      throw error;
    }
  }
);

// -----------------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------------

/**
 * GET /status
 * 
 * Check if chat/AI is available.
 */
chatRoutes.get("/status", async (c) => {
  const chatService = getChatService();
  const available = await chatService.isAvailable();
  const providers = await chatService.listProviders();
  
  return c.json({ available, providers });
});

