/**
 * Chat MCP Tools
 *
 * Tools for chat session management and project bootstrap via MCP.
 * Enables AI-guided story creation through conversational interface.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getChatAgentService, getProjectBootstrapService } from "@graphix/core";

export const chatTools: Record<string, Tool> = {
  chat_create_session: {
    name: "chat_create_session",
    description: "Create a new chat session for AI-guided story creation",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "User/resource ID (defaults to 'anonymous')",
        },
        threadId: {
          type: "string",
          description: "Optional existing thread ID to resume",
        },
      },
    },
  },

  chat_get_session: {
    name: "chat_get_session",
    description: "Get a chat session with its full message history and state",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID to retrieve",
        },
      },
      required: ["sessionId"],
    },
  },

  chat_list_sessions: {
    name: "chat_list_sessions",
    description: "List all chat sessions for a user/resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "Resource ID (defaults to 'anonymous')",
        },
      },
    },
  },

  chat_send_message: {
    name: "chat_send_message",
    description: "Send a message to a chat session and get the AI response (non-streaming)",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Chat session ID",
        },
        content: {
          type: "string",
          description: "Message content to send",
        },
      },
      required: ["sessionId", "content"],
    },
  },

  chat_delete_session: {
    name: "chat_delete_session",
    description: "Delete a chat session",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID to delete",
        },
      },
      required: ["sessionId"],
    },
  },

  chat_extract_story: {
    name: "chat_extract_story",
    description: "Extract structured story data (characters, setting, beats) from a chat conversation",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Chat session ID to extract from",
        },
      },
      required: ["sessionId"],
    },
  },

  chat_can_bootstrap: {
    name: "chat_can_bootstrap",
    description: "Check if a chat session has enough data to bootstrap a project",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID to check",
        },
      },
      required: ["sessionId"],
    },
  },

  chat_bootstrap_project: {
    name: "chat_bootstrap_project",
    description: "Create a complete project from a chat session's gathered story data",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Chat session ID to bootstrap from",
        },
      },
      required: ["sessionId"],
    },
  },

  chat_bootstrap_from_extraction: {
    name: "chat_bootstrap_from_extraction",
    description: "Create a complete project from extracted story data (one-shot bootstrap without chat session)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        characters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string", enum: ["protagonist", "antagonist", "supporting", "minor"] },
              species: { type: "string" },
              visualDescription: { type: "string" },
              personality: { type: "array", items: { type: "string" } },
              motivation: { type: "string" },
            },
            required: ["name", "visualDescription"],
          },
          description: "Character definitions",
        },
        setting: {
          type: "object",
          properties: {
            location: { type: "string" },
            timeperiod: { type: "string" },
            atmosphere: { type: "string" },
            visualDetails: { type: "array", items: { type: "string" } },
          },
          description: "Story setting/world",
        },
        arc: {
          type: "object",
          properties: {
            premise: {
              type: "object",
              properties: {
                logline: { type: "string" },
                genre: { type: "string" },
                tone: { type: "string" },
                themes: { type: "array", items: { type: "string" } },
              },
            },
            structure: { type: "string", enum: ["three-act", "five-act", "hero-journey"] },
            acts: { type: "array", items: { type: "string" } },
            beats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  actIndex: { type: "number" },
                  summary: { type: "string" },
                  visualDescription: { type: "string" },
                  emotionalTone: { type: "string" },
                  involvedCharacters: { type: "array", items: { type: "string" } },
                  cameraAngle: { type: "string" },
                  narration: { type: "string" },
                  sfx: { type: "string" },
                },
              },
            },
          },
          description: "Story arc with beats",
        },
        style: {
          type: "string",
          description: "Art style",
        },
        pageCount: {
          type: "number",
          description: "Target page count",
        },
      },
      required: ["name", "characters", "arc"],
    },
  },

  // ---------------------------------------------------------------------------
  // Direct Project Bootstrap (No Chat Session Required)
  // ---------------------------------------------------------------------------

  project_bootstrap: {
    name: "project_bootstrap",
    description: "Create a basic project with characters and optional storyboard (simpler than chat_bootstrap_from_extraction)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        characters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Character name" },
              description: { type: "string", description: "Character description" },
              visualTraits: {
                type: "object",
                properties: {
                  species: { type: "string" },
                  gender: { type: "string" },
                  age: { type: "string" },
                  hairColor: { type: "string" },
                  eyeColor: { type: "string" },
                  bodyType: { type: "string" },
                  clothing: { type: "string" },
                  accessories: { type: "array", items: { type: "string" } },
                },
                description: "Visual characteristics for generation",
              },
            },
            required: ["name"],
          },
          description: "Characters to create",
        },
        setting: {
          type: "string",
          description: "Story setting/world description",
        },
        storyboardName: {
          type: "string",
          description: "Name for the initial storyboard (if omitted, no storyboard created)",
        },
        style: {
          type: "string",
          description: "Art style preference",
        },
        pageCount: {
          type: "number",
          description: "Target page count",
        },
      },
      required: ["name", "characters"],
    },
  },
};

export async function handleChatTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const chatService = getChatAgentService();
  const bootstrapService = getProjectBootstrapService();

  switch (name) {
    case "chat_create_session": {
      const session = await chatService.createSession(
        (args.resourceId as string) || "anonymous",
        args.threadId as string | undefined
      );
      return {
        success: true,
        session: {
          id: session.id,
          threadId: session.threadId,
          status: session.status,
          workingMemory: session.workingMemory,
          createdAt: session.createdAt,
        },
      };
    }

    case "chat_get_session": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }

      const session = await chatService.getSession(args.sessionId as string);
      if (!session) {
        return { success: false, error: "Session not found" };
      }
      return { success: true, session };
    }

    case "chat_list_sessions": {
      const sessions = await chatService.listSessions(
        (args.resourceId as string) || "anonymous"
      );
      return {
        success: true,
        sessions: sessions.map((s: { id: string; title?: string; status: string; messages?: unknown[]; updatedAt: string }) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          messageCount: s.messages?.length || 0,
          lastActivity: s.updatedAt,
        })),
        count: sessions.length,
      };
    }

    case "chat_send_message": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }
      if (!args.content) {
        return { success: false, error: "content is required" };
      }

      const result = await chatService.sendMessage(
        args.sessionId as string,
        args.content as string
      );
      return {
        success: true,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
        sessionState: result.sessionState,
        suggestions: result.suggestions,
      };
    }

    case "chat_delete_session": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }

      await chatService.deleteSession(args.sessionId as string);
      return { success: true, message: "Session deleted" };
    }

    case "chat_extract_story": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }

      const session = await chatService.getSession(args.sessionId as string);
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      // Get conversation text from messages
      const conversationText = session.messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n\n");

      // Extract story data
      const extraction = await chatService.extractFromConversation(conversationText);
      return {
        success: true,
        extraction,
      };
    }

    case "chat_can_bootstrap": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }

      const result = await bootstrapService.canBootstrap(args.sessionId as string);
      return { success: true, ...result };
    }

    case "chat_bootstrap_project": {
      if (!args.sessionId) {
        return { success: false, error: "sessionId is required" };
      }

      try {
        const result = await bootstrapService.bootstrapFromSession(
          args.sessionId as string
        );
        return {
          success: true,
          project: result.project,
          premise: result.premise,
          story: result.story,
          storyboards: result.storyboards,
          beats: result.beats,
          panels: result.panels,
          characters: result.characters,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Bootstrap failed",
        };
      }
    }

    case "chat_bootstrap_from_extraction": {
      if (!args.name) {
        return { success: false, error: "name is required" };
      }
      if (!args.characters || !Array.isArray(args.characters)) {
        return { success: false, error: "characters array is required" };
      }
      if (!args.arc) {
        return { success: false, error: "arc is required" };
      }

      try {
        const result = await bootstrapService.bootstrapFromExtraction({
          name: args.name as string,
          description: args.description as string | undefined,
          characters: args.characters as any[],
          setting: args.setting as any,
          arc: args.arc as any,
          style: args.style as string | undefined,
          pageCount: args.pageCount as number | undefined,
        });
        return {
          success: true,
          project: result.project,
          premise: result.premise,
          story: result.story,
          storyboards: result.storyboards,
          beats: result.beats,
          panels: result.panels,
          characters: result.characters,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Bootstrap failed",
        };
      }
    }

    case "project_bootstrap": {
      if (!args.name) {
        return { success: false, error: "name is required" };
      }
      if (!args.characters || !Array.isArray(args.characters)) {
        return { success: false, error: "characters array is required" };
      }

      try {
        const result = await bootstrapService.bootstrap({
          name: args.name as string,
          description: args.description as string | undefined,
          characters: (args.characters as any[]).map((c) => ({
            name: c.name,
            description: c.description,
            visualTraits: c.visualTraits,
          })),
          setting: args.setting as string | undefined,
          storyboardName: args.storyboardName as string | undefined,
          style: args.style as string | undefined,
          pageCount: args.pageCount as number | undefined,
        });
        return {
          success: true,
          projectId: result.projectId,
          projectName: result.projectName,
          characterIds: result.characterIds,
          storyboardId: result.storyboardId,
          message: result.message,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Bootstrap failed",
        };
      }
    }

    default:
      throw new Error(`Unknown chat tool: ${name}`);
  }
}
