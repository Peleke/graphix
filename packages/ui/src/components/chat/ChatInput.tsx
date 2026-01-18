/**
 * ChatInput Component
 * 
 * Text input with send button for chat messages.
 * Supports Enter to send, Shift+Enter for newline.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

export const DEFAULT_MAX_LENGTH = 4000;

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Describe your story idea...",
  autoFocus = false,
  maxLength = DEFAULT_MAX_LENGTH
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce maxLength
    if (newValue.length <= maxLength) {
      setValue(newValue);
    }
  }, [maxLength]);

  const isOverLimit = value.length >= maxLength;
  const isNearLimit = value.length >= maxLength * 0.9;

  return (
    <div className="chat-input-container">
      <style>{`
        .chat-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem;
          background: #18181b;
          border-top: 1px solid #27272a;
        }

        .chat-input-row {
          display: flex;
          gap: 0.75rem;
        }

        .chat-textarea {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 12px;
          color: #fafafa;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: none;
          min-height: 44px;
          max-height: 200px;
          line-height: 1.5;
          transition: border-color 0.15s ease;
        }

        .chat-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .chat-textarea::placeholder {
          color: #71717a;
        }

        .chat-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-textarea.near-limit {
          border-color: #f59e0b;
        }

        .chat-textarea.at-limit {
          border-color: #ef4444;
        }

        .chat-send-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: #8b5cf6;
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          align-self: flex-end;
        }

        .chat-send-button:hover:not(:disabled) {
          background: #7c3aed;
          transform: scale(1.05);
        }

        .chat-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .chat-send-button svg {
          width: 20px;
          height: 20px;
        }

        .chat-input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #52525b;
          padding: 0 0.25rem;
        }

        .char-count {
          color: #52525b;
        }

        .char-count.near-limit {
          color: #f59e0b;
        }

        .char-count.at-limit {
          color: #ef4444;
        }

        .input-hint {
          color: #52525b;
        }
      `}</style>

      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className={`chat-textarea ${isOverLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={maxLength}
          aria-label="Chat message input"
          aria-describedby="char-count input-hint"
        />

        <button
          className="chat-send-button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="chat-input-footer">
        <span id="input-hint" className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </span>
        <span 
          id="char-count" 
          className={`char-count ${isOverLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}
          aria-live="polite"
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
