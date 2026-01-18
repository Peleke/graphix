/**
 * useChat Hook
 * 
 * React hook for managing chat sessions with streaming SSE responses.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: ChatMessageMetadata;
  createdAt: Date;
  isStreaming?: boolean;
}

export interface ChatMessageMetadata {
  suggestions?: string[];
  phaseTransition?: {
    from: string;
    to: string;
  };
  characterMatches?: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    confidence: number;
  }>;
}

export interface ChatState {
  phase: string;
  gathered: Record<string, unknown>;
  skipped: string[];
}

export interface ChatSession {
  id: string;
  threadId: string;
  state: ChatState;
  messages: ChatMessage[];
}

export interface UseChatOptions {
  /** API base URL */
  baseUrl?: string;
  /** Called when session is created */
  onSessionCreated?: (session: ChatSession) => void;
  /** Called when streaming completes */
  onMessageComplete?: (message: ChatMessage) => void;
  /** Called when project is ready to be created */
  onProjectReady?: (bootstrap: Record<string, unknown>) => void;
  /** Called on errors */
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  /** Current session */
  session: ChatSession | null;
  /** All messages */
  messages: ChatMessage[];
  /** Whether currently streaming a response */
  isStreaming: boolean;
  /** Error if any */
  error: Error | null;
  /** Create a new session */
  createSession: () => Promise<ChatSession>;
  /** Send a message (streaming) */
  sendMessage: (content: string) => Promise<void>;
  /** Reset the chat */
  reset: () => void;
  /** Create project from session */
  createProject: () => Promise<string | null>;
}

// =============================================================================
// Hook
// =============================================================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { 
    baseUrl = '/api/chat',
    onSessionCreated,
    onMessageComplete,
    onProjectReady,
    onError,
  } = options;

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Create a new chat session.
   */
  const createSession = useCallback(async (): Promise<ChatSession> => {
    try {
      setError(null);
      
      const response = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const newSession: ChatSession = {
        id: data.id,
        threadId: data.threadId,
        state: data.state,
        messages: data.messages.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })),
      };
      
      setSession(newSession);
      setMessages(newSession.messages);
      onSessionCreated?.(newSession);
      
      return newSession;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create session');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [baseUrl, onSessionCreated, onError]);

  /**
   * Send a message with streaming response.
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!session) {
      throw new Error('No active session. Call createSession first.');
    }
    
    if (isStreaming) {
      throw new Error('Already streaming a response');
    }
    
    try {
      setError(null);
      setIsStreaming(true);
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Create placeholder for assistant response
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        isStreaming: true,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`${baseUrl}/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
      
      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let metadata: ChatMessageMetadata = {};
      let currentEvent = 'text'; // Default event type
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // SSE format: "event: type\ndata: content\n\n"
        // Process complete events (ending with double newline)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          const lines = event.split('\n');
          let eventType = currentEvent;
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
              currentEvent = eventType;
            } else if (line.startsWith('data:')) {
              // SSE format is "data: content" - slice past "data:" (5 chars)
              // The content starts after the space, so slice(6) for "data: " or handle both
              const dataContent = line.slice(5);
              eventData = dataContent.startsWith(' ') ? dataContent.slice(1) : dataContent;
            }
          }
          
          // Handle the event
          switch (eventType) {
            case 'text':
              if (eventData) {
                fullContent += eventData;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId
                    ? { ...m, content: fullContent }
                    : m
                ));
              }
              break;
              
            case 'metadata':
              try {
                metadata = JSON.parse(eventData);
              } catch {
                // Ignore parse errors
              }
              break;
              
            case 'complete':
              try {
                const completeData = JSON.parse(eventData);
                if (completeData.state) {
                  setSession(prev => prev ? { ...prev, state: completeData.state } : prev);
                }
              } catch {
                // Ignore parse errors
              }
              break;
              
            case 'error':
              throw new Error(eventData);
          }
        }
      }
      
      // Finalize message
      const finalMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: fullContent,
        metadata,
        createdAt: new Date(),
        isStreaming: false,
      };
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? finalMessage : m
      ));
      
      onMessageComplete?.(finalMessage);
      
      // Check if ready for project creation
      if (metadata.phaseTransition?.to === 'confirmation') {
        onProjectReady?.(session.state.gathered);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, not an error
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      onError?.(error);
      
      // Remove streaming message on error
      setMessages(prev => prev.filter(m => !m.isStreaming));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [session, isStreaming, baseUrl, onMessageComplete, onProjectReady, onError]);

  /**
   * Reset the chat.
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setSession(null);
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  /**
   * Create project from session data.
   */
  const createProject = useCallback(async (): Promise<string | null> => {
    if (!session) {
      throw new Error('No active session');
    }
    
    try {
      setError(null);
      
      const response = await fetch(`${baseUrl}/sessions/${session.id}/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.projectId;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create project');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [session, baseUrl, onError]);

  return {
    session,
    messages,
    isStreaming,
    error,
    createSession,
    sendMessage,
    reset,
    createProject,
  };
}

// =============================================================================
// Utility: Check if chat API is available
// =============================================================================

export async function checkChatAvailability(baseUrl = '/api/chat'): Promise<{
  available: boolean;
  mode?: 'ai' | 'mock';
  error?: string;
}> {
  try {
    const response = await fetch(`${baseUrl}/status`);
    if (!response.ok) {
      return { available: false, error: response.statusText };
    }
    
    const data = await response.json();
    return {
      available: data.available,
      mode: data.mode || 'ai',
    };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
