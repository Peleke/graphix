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
import { type ChatMessage as ChatMessageType, type ElicitationState } from './types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

// Generate unique IDs
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Mock responses for Phase 1 (will be replaced with real AI)
const MOCK_RESPONSES: Record<string, { content: string; suggestions?: string[] }> = {
  greeting: {
    content: "Hi! I'm here to help you create a new project. Tell me about your story idea - it can be as simple as a single sentence or as detailed as you'd like.",
    suggestions: ["A romance between two otters", "A space adventure comic", "A slice of life story"]
  },
  characters: {
    content: "That sounds interesting! Who are the main characters in your story? Tell me about them - their names, what they look like, their personalities.",
    suggestions: ["Use existing characters", "Create new ones", "Skip for now"]
  },
  setting: {
    content: "Great characters! Now, where and when does your story take place? Describe the world, the environment, the mood.",
    suggestions: ["Modern day", "Fantasy world", "Skip for now"]
  },
  style: {
    content: "What's the visual style you're going for? Think about art style, color palette, mood.",
    suggestions: ["Warm and romantic", "Dark and gritty", "Bright and colorful", "Skip for now"]
  },
  scope: {
    content: "Almost done! How long do you want this to be? A short one-shot, a longer story?",
    suggestions: ["4 pages", "8 pages", "12+ pages"]
  },
  ready: {
    content: "I've got everything I need! Ready to create your project with the details we discussed. Click 'Create Project' when you're ready, or keep chatting to add more details.",
    suggestions: ["Create Project", "Add more details", "Start over"]
  }
};

export function ChatPanel({ isOpen, onClose, onProjectCreated }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [elicitationPhase, setElicitationPhase] = useState<string>('greeting');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: ChatMessageType = {
        id: generateId(),
        role: 'assistant',
        content: MOCK_RESPONSES.greeting.content,
        timestamp: new Date(),
        metadata: { suggestions: MOCK_RESPONSES.greeting.suggestions }
      };
      setMessages([greeting]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate streaming response (Phase 1 mock)
  const simulateResponse = useCallback(async (userMessage: string) => {
    setIsStreaming(true);

    // Add empty assistant message for streaming effect
    const assistantId = generateId();
    const responseData = MOCK_RESPONSES[elicitationPhase] || MOCK_RESPONSES.ready;
    
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    // Simulate streaming by adding characters
    const fullContent = responseData.content;
    for (let i = 0; i <= fullContent.length; i++) {
      await new Promise(r => setTimeout(r, 15));
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: fullContent.slice(0, i) }
          : m
      ));
    }

    // Finalize message with suggestions
    setMessages(prev => prev.map(m => 
      m.id === assistantId 
        ? { 
            ...m, 
            isStreaming: false, 
            metadata: { suggestions: responseData.suggestions }
          }
        : m
    ));

    // Advance phase
    const phases = ['greeting', 'characters', 'setting', 'style', 'scope', 'ready'];
    const currentIdx = phases.indexOf(elicitationPhase);
    if (currentIdx < phases.length - 1) {
      setElicitationPhase(phases[currentIdx + 1]);
    }

    setIsStreaming(false);
  }, [elicitationPhase]);

  const handleSend = useCallback((content: string) => {
    // Handle special commands
    if (content === 'Create Project') {
      // TODO: Trigger bootstrap flow
      onProjectCreated?.('mock-project-id');
      onClose();
      return;
    }

    if (content === 'Start over') {
      setMessages([]);
      setElicitationPhase('greeting');
      return;
    }

    // Add user message
    const userMessage: ChatMessageType = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    simulateResponse(content);
  }, [simulateResponse, onProjectCreated, onClose]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  if (!isOpen) return null;

  return (
    <div className="chat-panel-overlay">
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
      `}</style>

      <div className="chat-panel" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-title">
            <div className="chat-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2>Create with AI</h2>
              <p>Describe your story idea</p>
            </div>
          </div>

          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          autoFocus
        />
      </div>
    </div>
  );
}
