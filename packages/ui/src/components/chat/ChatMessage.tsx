/**
 * ChatMessage Component
 * 
 * Renders a single chat message bubble with role-based styling.
 * Supports streaming indicator and suggestion chips.
 */

import { type ChatMessage as ChatMessageType } from './types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatMessage({ message, onSuggestionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`chat-message ${message.role}`}>
      <style>{`
        .chat-message {
          display: flex;
          margin-bottom: 1rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-message.user {
          justify-content: flex-end;
        }

        .chat-message.assistant,
        .chat-message.system {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 80%;
          padding: 0.875rem 1rem;
          border-radius: 16px;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .chat-message.user .message-bubble {
          background: #8b5cf6;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-message.assistant .message-bubble {
          background: #27272a;
          color: #fafafa;
          border-bottom-left-radius: 4px;
        }

        .chat-message.system .message-bubble {
          background: transparent;
          color: #71717a;
          font-size: 0.875rem;
          padding: 0.5rem 0;
        }

        .message-content {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .message-content strong {
          font-weight: 600;
        }

        .streaming-indicator {
          display: inline-flex;
          gap: 4px;
          margin-left: 4px;
        }

        .streaming-dot {
          width: 6px;
          height: 6px;
          background: #8b5cf6;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .streaming-dot:nth-child(1) { animation-delay: -0.32s; }
        .streaming-dot:nth-child(2) { animation-delay: -0.16s; }
        .streaming-dot:nth-child(3) { animation-delay: 0s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .suggestion-chip {
          padding: 0.5rem 0.875rem;
          background: #3f3f46;
          border: 1px solid #52525b;
          border-radius: 20px;
          color: #e4e4e7;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .suggestion-chip:hover {
          background: #52525b;
          border-color: #8b5cf6;
        }

        .asset-matches {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .asset-match {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #3f3f46;
          border: 1px solid #52525b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .asset-match:hover {
          border-color: #8b5cf6;
        }

        .asset-thumbnail {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #52525b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
        }

        .asset-name {
          font-size: 0.875rem;
          color: #fafafa;
        }

        .asset-confidence {
          font-size: 0.75rem;
          color: #a1a1aa;
        }
      `}</style>

      <div className="message-bubble">
        <div className="message-content">
          {message.content}
          {message.isStreaming && (
            <span className="streaming-indicator">
              <span className="streaming-dot" />
              <span className="streaming-dot" />
              <span className="streaming-dot" />
            </span>
          )}
        </div>

        {/* Suggestion chips */}
        {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
          <div className="suggestions">
            {message.metadata.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Character matches */}
        {message.metadata?.assetMatches && message.metadata.assetMatches.length > 0 && (
          <div className="asset-matches">
            {message.metadata.assetMatches.map((match) => (
              <div key={match.id} className="asset-match">
                <div className="asset-thumbnail">
                  {match.thumbnail ? (
                    <img src={match.thumbnail} alt={match.name} />
                  ) : (
                    match.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="asset-name">{match.name}</div>
                  <div className="asset-confidence">
                    {Math.round(match.confidence * 100)}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
