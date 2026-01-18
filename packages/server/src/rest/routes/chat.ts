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
// In-Memory Store (Phase 2 - will be replaced with DB in Phase 3)
// =============================================================================

interface ChatSession {
  id: string;
  threadId: string;
  state: {
    phase: string;
    gathered: Record<string, unknown>;
    skipped: string[];
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  }>;
  createdAt: Date;
}

const sessions = new Map<string, ChatSession>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const createSessionSchema = z.object({
  threadId: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, "content is required").max(4000, "content too long"),
});

// =============================================================================
// Chat Service Import (lazy to avoid circular deps)
// =============================================================================

let chatServiceModule: typeof import("@graphix/core") | null = null;

async function getChatService() {
  if (!chatServiceModule) {
    chatServiceModule = await import("@graphix/core");
  }
  // @ts-expect-error - createChatService may not be exported yet
  return chatServiceModule.createChatService ? chatServiceModule.createChatService() : null;
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
    
    const session: ChatSession = {
      id: generateId(),
      threadId: threadId || generateId(),
      state: {
        phase: 'greeting',
        gathered: {},
        skipped: [],
      },
      messages: [],
      createdAt: new Date(),
    };
    
    // Add initial greeting
    const greeting = {
      id: generateId(),
      role: 'assistant' as const,
      content: "Hi! I'm here to help you create a new project. Tell me about your story idea - it can be as simple as a single sentence or as detailed as you'd like.",
      metadata: {
        suggestions: ["A romance between two otters", "A space adventure comic", "A slice of life story"],
      },
      createdAt: new Date(),
    };
    session.messages.push(greeting);
    
    sessions.set(session.id, session);
    
    return c.json({
      id: session.id,
      threadId: session.threadId,
      state: session.state,
      messages: session.messages,
    }, 201);
  }
);

/**
 * GET /sessions/:id
 * 
 * Get a chat session with messages.
 */
chatRoutes.get("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const session = sessions.get(sessionId);
  
  if (!session) {
    return errors.notFound(c, "Session not found");
  }
  
  return c.json({
    id: session.id,
    threadId: session.threadId,
    state: session.state,
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
  
  if (!sessions.has(sessionId)) {
    return errors.notFound(c, "Session not found");
  }
  
  sessions.delete(sessionId);
  
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
    
    const session = sessions.get(sessionId);
    if (!session) {
      return errors.notFound(c, "Session not found");
    }
    
    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      content,
      createdAt: new Date(),
    };
    session.messages.push(userMessage);
    
    // Try to get real chat service
    const chatService = await getChatService();
    
    // Stream the response using SSE
    return streamSSE(c, async (stream) => {
      const assistantId = generateId();
      let fullContent = '';
      let metadata: Record<string, unknown> = {};
      
      try {
        if (chatService) {
          // Use real chat service
          const generator = chatService.generateStreamingResponse(
            session.state,
            content
          );
          
          for await (const chunk of generator) {
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
            }
          }
          
          // Update session state from metadata
          if (metadata.phaseTransition) {
            const transition = metadata.phaseTransition as { to: string };
            session.state.phase = transition.to;
          }
        } else {
          // Fallback to mock responses
          const mockResponses = getMockResponse(session.state.phase, content);
          
          // Simulate streaming
          for (const char of mockResponses.content) {
            fullContent += char;
            await stream.writeSSE({
              event: 'text',
              data: char,
            });
            await new Promise(r => setTimeout(r, 15));
          }
          
          metadata = {
            suggestions: mockResponses.suggestions,
            phaseTransition: {
              from: session.state.phase,
              to: mockResponses.nextPhase,
            },
          };
          
          session.state.phase = mockResponses.nextPhase;
          
          await stream.writeSSE({
            event: 'metadata',
            data: JSON.stringify(metadata),
          });
        }
        
        // Store assistant message
        session.messages.push({
          id: assistantId,
          role: 'assistant',
          content: fullContent,
          metadata,
          createdAt: new Date(),
        });
        
        // Send completion event
        await stream.writeSSE({
          event: 'complete',
          data: JSON.stringify({
            messageId: assistantId,
            state: session.state,
          }),
        });
        
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
    
    const session = sessions.get(sessionId);
    if (!session) {
      return errors.notFound(c, "Session not found");
    }
    
    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      content,
      createdAt: new Date(),
    };
    session.messages.push(userMessage);
    
    // Generate response
    const chatService = await getChatService();
    
    let response: { content: string; metadata: Record<string, unknown> };
    
    if (chatService) {
      const result = await chatService.generateResponse(
        session.state,
        content
      );
      response = {
        content: result.response,
        metadata: result.metadata,
      };
      // Update state
      session.state = result.newState;
    } else {
      // Fallback mock
      const mock = getMockResponse(session.state.phase, content);
      response = {
        content: mock.content,
        metadata: { suggestions: mock.suggestions },
      };
      session.state.phase = mock.nextPhase;
    }
    
    // Store assistant message
    const assistantMessage = {
      id: generateId(),
      role: 'assistant' as const,
      content: response.content,
      metadata: response.metadata,
      createdAt: new Date(),
    };
    session.messages.push(assistantMessage);
    
    return c.json({
      userMessage,
      assistantMessage,
      state: session.state,
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
  const session = sessions.get(sessionId);
  
  if (!session) {
    return errors.notFound(c, "Session not found");
  }
  
  // TODO: Phase 5 - Actually create the project using Bootstrap service
  // For now, return a mock project ID
  const projectId = `proj-${generateId()}`;
  
  return c.json({
    projectId,
    bootstrap: session.state.gathered,
    message: "Project created successfully",
  }, 201);
});

// -----------------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------------

/**
 * GET /status
 * 
 * Check if chat/AI is available.
 */
chatRoutes.get("/status", async (c) => {
  const chatService = await getChatService();
  
  if (chatService) {
    const available = await chatService.isAvailable();
    const providers = await chatService.listProviders();
    return c.json({ available, providers });
  }
  
  return c.json({
    available: true, // Mock mode always available
    mode: 'mock',
    providers: [],
  });
});

// =============================================================================
// Mock Responses (Fallback)
// =============================================================================

function getMockResponse(phase: string, _userMessage: string): {
  content: string;
  suggestions: string[];
  nextPhase: string;
} {
  const phases: Record<string, {
    content: string;
    suggestions: string[];
    nextPhase: string;
  }> = {
    greeting: {
      content: "That sounds interesting! Who are the main characters in your story? Tell me about them - their names, what they look like, their personalities.",
      suggestions: ["Use existing characters", "Create new ones", "Skip for now"],
      nextPhase: 'characters',
    },
    characters: {
      content: "Great characters! Now, where and when does your story take place? Describe the world, the environment, the mood.",
      suggestions: ["Modern day", "Fantasy world", "Skip for now"],
      nextPhase: 'setting',
    },
    setting: {
      content: "What's the main story arc? What conflict or journey will the characters go through?",
      suggestions: ["Coming of age", "Mystery to solve", "Skip for now"],
      nextPhase: 'arc',
    },
    arc: {
      content: "What's the visual style you're going for? Think about art style, color palette, mood.",
      suggestions: ["Bright and colorful", "Dark and moody", "Soft and romantic", "Skip for now"],
      nextPhase: 'style',
    },
    style: {
      content: "Almost done! How many pages do you want this to be?",
      suggestions: ["4 pages", "8 pages", "12+ pages"],
      nextPhase: 'scope',
    },
    scope: {
      content: "I've got everything I need! Ready to create your project with the details we discussed. Click 'Create Project' when you're ready.",
      suggestions: ["Create Project", "Add more details", "Start over"],
      nextPhase: 'confirmation',
    },
    confirmation: {
      content: "Your project has been created! Redirecting you now...",
      suggestions: [],
      nextPhase: 'complete',
    },
  };
  
  return phases[phase] || phases.greeting;
}
