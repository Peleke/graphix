/**
 * Prompt Suggestion Modal
 *
 * A modal dialog displaying AI-generated prompt suggestions with
 * context information and actions to use, edit, or regenerate.
 */

import { useState, useCallback, useEffect, useRef } from "react";

export interface PromptContext {
  panelDescription?: string;
  storyboardTheme?: string;
  characters?: Array<{
    id: string;
    name: string;
    species?: string;
    description?: string;
  }>;
  previousPrompt?: string;
}

export interface PromptSuggestionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** The AI-generated suggestion */
  suggestion: string | null;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Context used to generate the suggestion */
  context: PromptContext;
  /** Called when user accepts a suggestion */
  onAccept: (text: string) => void;
  /** Called to regenerate suggestion */
  onRegenerate: () => void;
  /** Title for the modal */
  title?: string;
  /** Prompt type being generated */
  promptType?: "positive" | "negative";
}

export function PromptSuggestionModal({
  isOpen,
  onClose,
  suggestion,
  isGenerating,
  error,
  context,
  onAccept,
  onRegenerate,
  title = "AI Prompt Suggestion",
  promptType = "positive",
}: PromptSuggestionModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset edit mode when suggestion changes
  useEffect(() => {
    if (suggestion) {
      setEditedText(suggestion);
      setEditMode(false);
    }
  }, [suggestion]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editMode && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [editMode]);

  const handleUse = useCallback(() => {
    const textToUse = editMode ? editedText : suggestion;
    if (textToUse) {
      onAccept(textToUse);
      onClose();
    }
  }, [editMode, editedText, suggestion, onAccept, onClose]);

  const handleEdit = useCallback(() => {
    setEditMode(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditedText(suggestion || "");
  }, [suggestion]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const hasContext =
    context.panelDescription ||
    context.storyboardTheme ||
    (context.characters && context.characters.length > 0);

  return (
    <div
      className="prompt-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      data-testid="prompt-suggestion-modal"
    >
      <style>{`
        .prompt-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          padding: 1.5rem;
          backdrop-filter: blur(4px);
        }

        .prompt-modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
          overflow: hidden;
        }

        .prompt-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #27272a;
          background: #0f0f10;
        }

        .prompt-modal-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 1rem;
          font-weight: 600;
          color: #fafafa;
        }

        .prompt-modal-title-icon {
          font-size: 1.125rem;
        }

        .prompt-type-badge {
          padding: 0.25rem 0.5rem;
          background: ${promptType === "positive" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"};
          color: ${promptType === "positive" ? "#34d399" : "#f87171"};
          border-radius: 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .prompt-modal-close {
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          border-radius: 8px;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .prompt-modal-close:hover {
          background: #27272a;
          color: #fafafa;
        }

        .prompt-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
        }

        .prompt-context-section {
          margin-bottom: 1.25rem;
        }

        .prompt-context-title {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }

        .prompt-context-grid {
          display: grid;
          gap: 0.5rem;
        }

        .prompt-context-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          background: #27272a;
          border-radius: 8px;
          font-size: 0.8125rem;
        }

        .prompt-context-label {
          color: #71717a;
          flex-shrink: 0;
          min-width: 80px;
        }

        .prompt-context-value {
          color: #e4e4e7;
          flex: 1;
          word-break: break-word;
        }

        .prompt-characters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .prompt-character-tag {
          padding: 0.25rem 0.5rem;
          background: #3f3f46;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #c4b5fd;
        }

        .prompt-suggestion-section {
          margin-bottom: 1rem;
        }

        .prompt-suggestion-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }

        .prompt-edit-toggle {
          background: transparent;
          border: none;
          color: #8b5cf6;
          cursor: pointer;
          font-size: 0.75rem;
          text-transform: none;
          letter-spacing: normal;
        }

        .prompt-edit-toggle:hover {
          text-decoration: underline;
        }

        .prompt-suggestion-text {
          background: #0f0f10;
          border: 1px solid #3f3f46;
          border-radius: 10px;
          padding: 1rem;
          font-size: 0.875rem;
          color: #fafafa;
          line-height: 1.6;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .prompt-suggestion-textarea {
          width: 100%;
          min-height: 150px;
          background: #0f0f10;
          border: 1px solid #8b5cf6;
          border-radius: 10px;
          padding: 1rem;
          font-size: 0.875rem;
          color: #fafafa;
          line-height: 1.6;
          resize: vertical;
          font-family: inherit;
        }

        .prompt-suggestion-textarea:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }

        .prompt-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          gap: 1rem;
        }

        .prompt-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: prompt-spin 0.8s linear infinite;
        }

        @keyframes prompt-spin {
          to { transform: rotate(360deg); }
        }

        .prompt-loading-text {
          font-size: 0.875rem;
          color: #71717a;
        }

        .prompt-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 1rem;
          font-size: 0.875rem;
          color: #fca5a5;
          text-align: center;
        }

        .prompt-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 1px solid #27272a;
          background: #0f0f10;
        }

        .prompt-modal-btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .prompt-modal-btn.secondary {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .prompt-modal-btn.secondary:hover {
          background: #27272a;
          color: #fafafa;
          border-color: #52525b;
        }

        .prompt-modal-btn.primary {
          background: #8b5cf6;
          border: none;
          color: white;
        }

        .prompt-modal-btn.primary:hover:not(:disabled) {
          background: #7c3aed;
        }

        .prompt-modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .prompt-modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .prompt-modal {
            max-width: 100%;
            max-height: 90vh;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>

      <div className="prompt-modal">
        <div className="prompt-modal-header">
          <div className="prompt-modal-title">
            <span className="prompt-modal-title-icon">&#10024;</span>
            {title}
            <span className="prompt-type-badge">{promptType}</span>
          </div>
          <button
            className="prompt-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="prompt-modal-body">
          {hasContext && (
            <div className="prompt-context-section">
              <div className="prompt-context-title">Context Used</div>
              <div className="prompt-context-grid">
                {context.panelDescription && (
                  <div className="prompt-context-item">
                    <span className="prompt-context-label">Panel:</span>
                    <span className="prompt-context-value">
                      {context.panelDescription}
                    </span>
                  </div>
                )}
                {context.storyboardTheme && (
                  <div className="prompt-context-item">
                    <span className="prompt-context-label">Theme:</span>
                    <span className="prompt-context-value">
                      {context.storyboardTheme}
                    </span>
                  </div>
                )}
                {context.characters && context.characters.length > 0 && (
                  <div className="prompt-context-item">
                    <span className="prompt-context-label">Characters:</span>
                    <div className="prompt-characters-list">
                      {context.characters.map((char) => (
                        <span key={char.id} className="prompt-character-tag">
                          {char.name}
                          {char.species ? ` (${char.species})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="prompt-suggestion-section">
            <div className="prompt-suggestion-label">
              <span>Generated Prompt</span>
              {suggestion && !editMode && (
                <button className="prompt-edit-toggle" onClick={handleEdit}>
                  Edit before using
                </button>
              )}
              {editMode && (
                <button className="prompt-edit-toggle" onClick={handleCancelEdit}>
                  Cancel edit
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="prompt-loading">
                <div className="prompt-loading-spinner" />
                <span className="prompt-loading-text">
                  Generating prompt suggestion...
                </span>
              </div>
            ) : error ? (
              <div className="prompt-error">{error}</div>
            ) : editMode ? (
              <textarea
                ref={textareaRef}
                className="prompt-suggestion-textarea"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="Edit the generated prompt..."
                data-testid="prompt-suggestion-textarea"
              />
            ) : (
              <div className="prompt-suggestion-text" data-testid="prompt-suggestion-text">
                {suggestion || "No suggestion generated"}
              </div>
            )}
          </div>
        </div>

        <div className="prompt-modal-footer">
          <button className="prompt-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="prompt-modal-btn secondary"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            Regenerate
          </button>
          <button
            className="prompt-modal-btn primary"
            onClick={handleUse}
            disabled={isGenerating || (!suggestion && !editedText)}
            data-testid="prompt-use-button"
          >
            {editMode ? "Use Edited" : "Use This"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptSuggestionModal;
