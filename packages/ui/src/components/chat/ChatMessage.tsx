/**
 * ChatMessage Component
 *
 * Renders a single chat message bubble with role-based styling.
 * Supports streaming indicator, suggestion chips, and basic markdown.
 */

import { useMemo } from 'react';
import { type ChatMessage as ChatMessageType } from './types';

/**
 * Simple markdown renderer for chat messages.
 * Converts basic markdown to HTML.
 */
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n+/g, '</p><p>')
    // Single newlines to <br>
    .replace(/\n/g, '<br />')
    // Wrap in paragraph
    .replace(/^(.+)$/, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*?<\/li>)(\s*<br \/>)*(<li>)/g, '$1$3')
    .replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*<li>)/g, '<ul>$1</ul>');
}

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatMessage({ message, onSuggestionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Render markdown for assistant messages
  const renderedContent = useMemo(() => {
    if (isUser || isSystem) return null;
    return renderMarkdown(message.content);
  }, [message.content, isUser, isSystem]);

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
          word-break: break-word;
        }

        .message-content p {
          margin: 0 0 0.75rem 0;
        }

        .message-content p:last-child {
          margin-bottom: 0;
        }

        .message-content h1, .message-content h2, .message-content h3 {
          margin: 1rem 0 0.5rem 0;
          font-weight: 600;
        }

        .message-content h1 { font-size: 1.25rem; }
        .message-content h2 { font-size: 1.125rem; }
        .message-content h3 { font-size: 1rem; }

        .message-content ul {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
        }

        .message-content li {
          margin-bottom: 0.25rem;
        }

        .message-content strong {
          font-weight: 600;
        }

        .message-content em {
          font-style: italic;
        }

        .message-content-raw {
          white-space: pre-wrap;
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
          overflow: hidden;
        }

        .asset-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
        <div className={`message-content ${isUser || isSystem ? 'message-content-raw' : ''}`}>
          {renderedContent ? (
            <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
          ) : (
            message.content
          )}
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
                    <img 
                      src={match.thumbnail} 
                      alt={match.name}
                      width={32}
                      height={32}
                      loading="lazy"
                    />
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
