/**
 * ChatPanel Component
 * 
 * Main chat interface that slides up from the dashboard.
 * Connected to real backend via useChat hook.
 */

import { useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ThreadModal } from './ThreadModal';
import { useChat } from '../../api/hooks/useChat';
import { type ChatMessage as ChatMessageType } from './types';
import { useState } from 'react';

// =============================================================================
// Constants
// =============================================================================

export const CHAT_COMMANDS = {
  CREATE_PROJECT: 'Create Project',
  START_OVER: 'Start over',
  ADD_DETAILS: 'Add more details',
  SKIP: 'Skip for now',
} as const;

export const ELICITATION_PHASES: readonly string[] = [
  'greeting', 'characters', 'setting', 'style', 'scope', 'confirmation'
] as const;

export const MAX_MESSAGE_LENGTH = 4000;

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `msg-${crypto.randomUUID()}`;
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// =============================================================================
// Props
// =============================================================================

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
  idGenerator?: () => string;
}

// =============================================================================
// Component
// =============================================================================

export function ChatPanel({ 
  isOpen, 
  onClose, 
  onProjectCreated,
}: ChatPanelProps) {
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Use the real chat hook
  const {
    session,
    messages: chatMessages,
    isStreaming,
    error: chatError,
    createSession,
    sendMessage,
    reset,
    createProject,
  } = useChat({
    onError: (err) => {
      console.error('[ChatPanel] Error:', err);
      setLocalError(err.message);
    },
  });

  // Convert hook messages to component format
  const messages: ChatMessageType[] = chatMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: m.createdAt,
    isStreaming: m.isStreaming,
    metadata: m.metadata ? {
      suggestions: m.metadata.suggestions,
    } : undefined,
  }));

  // Initialize session when panel opens
  useEffect(() => {
    if (isOpen && !session && !initializedRef.current) {
      initializedRef.current = true;
      createSession().catch((err) => {
        console.error('[ChatPanel] Failed to create session:', err);
        setLocalError('Failed to connect to AI. Please try again.');
      });
    }
  }, [isOpen, session, createSession]);

  // Reset initialization flag when panel closes
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (content: string) => {
    if (content.length > MAX_MESSAGE_LENGTH) {
      setLocalError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setLocalError(null);

    // Handle special commands
    if (content === CHAT_COMMANDS.CREATE_PROJECT) {
      try {
        const projectId = await createProject();
        if (projectId) {
          onProjectCreated?.(projectId);
          onClose();
        } else {
          setLocalError('Failed to create project. Please try again.');
        }
      } catch (err) {
        setLocalError('Failed to create project. Please try again.');
      }
      return;
    }

    if (content === CHAT_COMMANDS.START_OVER) {
      reset();
      initializedRef.current = false;
      // Create new session
      try {
        await createSession();
      } catch (err) {
        setLocalError('Failed to start new session.');
      }
      return;
    }

    // Send message to backend
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('[ChatPanel] Send error:', err);
      // Error is handled by onError callback
    }
  }, [sendMessage, createProject, createSession, reset, onProjectCreated, onClose]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSend(lastUserMessage.content);
    }
  }, [messages, handleSend]);

  const error = localError || chatError?.message;

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

        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-history-btn {
          width: 32px;
          height: 32px;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #a1a1aa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .chat-history-btn:hover {
          background: #27272a;
          border-color: #52525b;
          color: #fafafa;
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

        .chat-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #71717a;
          font-size: 0.875rem;
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

          <div className="chat-header-actions">
            <button 
              className="chat-history-btn" 
              onClick={() => setShowThreadModal(true)} 
              aria-label="View conversations"
              type="button"
              data-testid="chat-history-button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
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
        </div>

        <div className="chat-messages" role="log" aria-live="polite">
          {messages.length === 0 && !error && (
            <div className="chat-loading">Connecting to AI...</div>
          )}
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
          disabled={isStreaming || !session}
          maxLength={MAX_MESSAGE_LENGTH}
          autoFocus
        />
      </div>

      {/* Thread History Modal */}
      <ThreadModal
        isOpen={showThreadModal}
        onClose={() => setShowThreadModal(false)}
        activeThreadId={session?.id}
        onSelectThread={(threadId) => {
          // TODO: Load thread and restore messages
          console.log('Switch to thread:', threadId);
        }}
        onNewChat={() => {
          reset();
          initializedRef.current = false;
          createSession();
        }}
      />
    </div>
  );
}
