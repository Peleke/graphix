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
    description: "Start a new brainstorming chat session for conversational story development. Call at the beginning of a new project ideation flow, before any chat_send_message calls. Returns a lightweight JSON object (~200 tokens) with session id, threadId, status, empty workingMemory, and createdAt. Does NOT create any project or narrative entities -- use chat_bootstrap_project after the conversation is complete. Optionally resumes an existing thread by passing threadId.",
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
    description: "Retrieve a single chat session by ID, including its full message history, working memory, and current status. Call when you need to inspect conversation progress or review what was discussed before extracting story data. Returns a potentially large JSON object (scales with message count -- expect 500-5000+ tokens for long conversations). Unlike chat_list_sessions, this returns the complete message array, not just metadata summaries.",
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
    description: "List all chat sessions for a given user/resource as lightweight summaries. Call when the user wants to pick up a previous brainstorming conversation or see how many sessions exist. Returns a compact JSON array (~100 tokens per session) with each session's id, title, status, messageCount, and lastActivity timestamp. Does NOT include message contents -- use chat_get_session to load the full conversation for a specific session.",
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
    description: "Send a user message to an active brainstorming chat session and receive the AI assistant's reply (non-streaming, blocks until complete). Call each time the user provides new story ideas, answers prompts, or refines details during the conversational creation flow. Returns JSON (~300-800 tokens) with userMessage, assistantMessage, updated sessionState, and follow-up suggestions. Requires a sessionId from chat_create_session. This is the iterative step -- repeat until enough story material is gathered, then call chat_extract_story.",
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
    description: "Permanently delete a chat session and all its messages. Call when the user explicitly wants to discard a brainstorming conversation, or to clean up after a successful bootstrap. Returns a minimal JSON confirmation (~30 tokens) with success and message fields. This is destructive and irreversible -- the session cannot be recovered after deletion.",
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
    description: "Parse a completed brainstorming chat session into structured story elements: characters (with roles, species, visual descriptions), setting (location, time period, atmosphere), and story arc (premise, structure, beats). Call after the conversational brainstorming phase is done and before checking bootstrap readiness with chat_can_bootstrap. Returns a rich extraction JSON (~500-2000 tokens) containing the parsed narrative data. Uses LLM analysis internally, so expect moderate latency. Unlike chat_bootstrap_from_extraction, this only extracts -- it does NOT create any project entities.",
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
    description: "Check whether a chat session has gathered sufficient story material (characters, setting, arc) to bootstrap a full graphic novel project. Call after chat_extract_story to gate the bootstrap step -- only proceed to chat_bootstrap_project if this returns ready: true. Returns a small JSON (~100 tokens) with a boolean ready flag and, if not ready, a list of missing elements. Does NOT modify any data or create entities.",
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
    description: "Generate a complete graphic novel project from a chat session's accumulated story data, creating the project, premise, story, storyboards, beats, panels, and characters in one operation. Call after chat_can_bootstrap confirms readiness. Returns a large JSON (~1000-3000 tokens) containing all created entity objects: project, premise, story, storyboards[], beats[], panels[], and characters[]. This is a heavy write operation with significant latency. Unlike chat_bootstrap_from_extraction, this takes a sessionId and internally performs extraction. Unlike project_bootstrap, this creates the full narrative hierarchy (premise, story, beats, panels), not just a project shell with characters.",
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
    description: "Generate a complete graphic novel project from pre-structured story data you already have (characters, setting, arc with beats), bypassing the chat session entirely. Call when story elements are available from an external source or were manually assembled -- no sessionId needed. Requires name, characters[], and arc as inputs. Returns a large JSON (~1000-3000 tokens) with project, premise, story, storyboards[], beats[], panels[], and characters[]. Unlike chat_bootstrap_project, this accepts raw extraction data directly instead of reading from a session. Unlike project_bootstrap, this creates the full narrative hierarchy including beats and panels.",
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
    description: "Create a minimal project scaffold with characters and an optional empty storyboard -- no chat session, no narrative hierarchy. Call when you need a lightweight project shell to start building manually, without auto-generating premise, story, beats, or panels. Requires only name and characters[]. Returns a compact JSON (~200 tokens) with projectId, projectName, characterIds[], optional storyboardId, and a confirmation message. Unlike chat_bootstrap_project and chat_bootstrap_from_extraction, this does NOT create any narrative entities (premise, story, beats, panels) -- just the project container and character records.",
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
