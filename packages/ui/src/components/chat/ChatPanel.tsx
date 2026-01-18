/**
 * ChatPanel Component
 * 
 * Main chat interface that slides up from the dashboard.
 * Handles message display, input, and mock responses for Phase 1.
 * 
 * TODO: Phase 2 - Replace mock responses with real AI via:
 * - Mastra agent (https://mastra.ai) for TypeScript-native agent logic
 * - TextGenerationService for Ollama/Claude/OpenAI provider switching
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { type ChatMessage as ChatMessageType, type ElicitationPhase } from './types';

// =============================================================================
// Constants (avoid magic strings)
// =============================================================================

export const CHAT_COMMANDS = {
  CREATE_PROJECT: 'Create Project',
  START_OVER: 'Start over',
  ADD_DETAILS: 'Add more details',
  SKIP: 'Skip for now',
} as const;

export const ELICITATION_PHASES: readonly ElicitationPhase[] = [
  'greeting', 'characters', 'setting', 'style', 'scope', 'confirmation'
] as const;

export const MAX_MESSAGE_LENGTH = 4000;

// =============================================================================
// ID Generation (uses crypto when available for better uniqueness)
// =============================================================================

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `msg-${crypto.randomUUID()}`;
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// =============================================================================
// Mock Responses (Phase 1 - will be replaced with real AI)
// =============================================================================

interface MockResponse {
  content: string;
  suggestions: string[];
}

const MOCK_RESPONSES: Record<ElicitationPhase, MockResponse> = {
  greeting: {
    content: "Hi! I'm here to help you create a new project. Tell me about your story idea - it can be as simple as a single sentence or as detailed as you'd like.",
    suggestions: ["A romance between two otters", "A space adventure comic", "A slice of life story"]
  },
  characters: {
    content: "That sounds interesting! Who are the main characters in your story? Tell me about them - their names, what they look like, their personalities.",
    suggestions: ["Use existing characters", "Create new ones", CHAT_COMMANDS.SKIP]
  },
  setting: {
    content: "Great characters! Now, where and when does your story take place? Describe the world, the environment, the mood.",
    suggestions: ["Modern day", "Fantasy world", CHAT_COMMANDS.SKIP]
  },
  arc: {
    content: "What's the main story arc? What conflict or journey will the characters go through?",
    suggestions: ["Coming of age", "Mystery to solve", CHAT_COMMANDS.SKIP]
  },
  style: {
    content: "What's the visual style you're going for? Think about art style, color palette, mood.",
    suggestions: ["Warm and romantic", "Dark and gritty", "Bright and colorful", CHAT_COMMANDS.SKIP]
  },
  scope: {
    content: "Almost done! How long do you want this to be? A short one-shot, a longer story?",
    suggestions: ["4 pages", "8 pages", "12+ pages"]
  },
  confirmation: {
    content: "I've got everything I need! Ready to create your project with the details we discussed. Click 'Create Project' when you're ready, or keep chatting to add more details.",
    suggestions: [CHAT_COMMANDS.CREATE_PROJECT, CHAT_COMMANDS.ADD_DETAILS, CHAT_COMMANDS.START_OVER]
  },
  complete: {
    content: "Your project has been created! Redirecting you now...",
    suggestions: []
  }
};

// =============================================================================
// Props
// =============================================================================

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
  /** Optional ID generator for testing */
  idGenerator?: () => string;
}

// =============================================================================
// Component
// =============================================================================

export function ChatPanel({ 
  isOpen, 
  onClose, 
  onProjectCreated,
  idGenerator = generateId 
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [elicitationPhase, setElicitationPhase] = useState<ElicitationPhase>('greeting');
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>('');
  const streamingIdRef = useRef<string>('');

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: ChatMessageType = {
        id: idGenerator(),
        role: 'assistant',
        content: MOCK_RESPONSES.greeting.content,
        timestamp: new Date(),
        metadata: { suggestions: MOCK_RESPONSES.greeting.suggestions }
      };
      setMessages([greeting]);
      setError(null);
    }
  }, [isOpen, messages.length, idGenerator]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Advance to next phase
  const advancePhase = useCallback(() => {
    const phaseOrder: ElicitationPhase[] = ['greeting', 'characters', 'setting', 'arc', 'style', 'scope', 'confirmation'];
    const currentIdx = phaseOrder.indexOf(elicitationPhase);
    if (currentIdx < phaseOrder.length - 1) {
      setElicitationPhase(phaseOrder[currentIdx + 1]);
      return phaseOrder[currentIdx + 1];
    }
    return elicitationPhase;
  }, [elicitationPhase]);

  // Simulate streaming response (Phase 1 mock)
  // Uses refs to batch updates and avoid per-character re-renders
  const simulateResponse = useCallback(async (_userMessage: string) => {
    setIsStreaming(true);
    setError(null);

    try {
      const nextPhase = advancePhase();
      const responseData = MOCK_RESPONSES[nextPhase] || MOCK_RESPONSES.confirmation;
      
      const assistantId = idGenerator();
      streamingIdRef.current = assistantId;
      streamingContentRef.current = '';
      
      // Add empty assistant message for streaming effect
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }]);

      // Simulate streaming - batch updates every N characters
      const fullContent = responseData.content;
      const BATCH_SIZE = 5; // Update every 5 characters instead of every 1
      
      for (let i = 0; i <= fullContent.length; i += BATCH_SIZE) {
        await new Promise(r => setTimeout(r, 15 * BATCH_SIZE));
        const content = fullContent.slice(0, Math.min(i + BATCH_SIZE, fullContent.length));
        streamingContentRef.current = content;
        
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, content }
            : m
        ));
      }

      // Finalize message with suggestions
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { 
              ...m, 
              content: fullContent,
              isStreaming: false, 
              metadata: { suggestions: responseData.suggestions }
            }
          : m
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = '';
      streamingContentRef.current = '';
    }
  }, [advancePhase, idGenerator]);

  const handleSend = useCallback((content: string) => {
    // Validate input length
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setError(null);

    // Handle special commands
    if (content === CHAT_COMMANDS.CREATE_PROJECT) {
      // TODO: Phase 5 - Trigger bootstrap flow with gathered data
      onProjectCreated?.('mock-project-id');
      onClose();
      return;
    }

    if (content === CHAT_COMMANDS.START_OVER) {
      setMessages([]);
      setElicitationPhase('greeting');
      return;
    }

    // Add user message
    const userMessage: ChatMessageType = {
      id: idGenerator(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    simulateResponse(content);
  }, [simulateResponse, onProjectCreated, onClose, idGenerator]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  const handleRetry = useCallback(() => {
    setError(null);
    // Retry last user message if there is one
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      simulateResponse(lastUserMessage.content);
    }
  }, [messages, simulateResponse]);

  if (!isOpen) return null;

  return (
    <div 
      className="chat-panel-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
    >
      <style>{`
        .chat-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .chat-panel {
          width: 100%;
          max-width: 700px;
          height: 70vh;
          max-height: 600px;
          background: #18181b;
          border: 1px solid #27272a;
          border-bottom: none;
          border-radius: 16px 16px 0 0;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #27272a;
        }

        .chat-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .chat-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-title h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
        }

        .chat-title p {
          font-size: 0.75rem;
          color: #71717a;
          margin: 0;
        }

        .chat-close-btn {
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #71717a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .chat-close-btn:hover {
          background: #27272a;
          color: #fafafa;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }

        .chat-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          margin: 0 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 0.875rem;
        }

        .chat-error button {
          margin-left: auto;
          padding: 0.25rem 0.75rem;
          background: transparent;
          border: 1px solid #f87171;
          border-radius: 4px;
          color: #f87171;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .chat-error button:hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>

      <div 
        className="chat-panel" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="chat-header">
          <div className="chat-title">
            <div className="chat-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 id="chat-title">Create with AI</h2>
              <p>Describe your story idea</p>
            </div>
          </div>

          <button 
            className="chat-close-btn" 
            onClick={onClose} 
            aria-label="Close chat"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="chat-messages" role="log" aria-live="polite">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="chat-error" role="alert">
            <span>{error}</span>
            <button onClick={handleRetry} type="button">Retry</button>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          maxLength={MAX_MESSAGE_LENGTH}
          autoFocus
        />
      </div>
    </div>
  );
}
