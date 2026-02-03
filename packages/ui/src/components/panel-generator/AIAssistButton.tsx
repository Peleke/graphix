/**
 * AI Assist Button
 *
 * A sparkle icon button that triggers AI-powered prompt generation.
 * Uses a portal to render dropdown outside of clipping containers.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface AIAssistButtonProps {
  /** Called when AI generation should start */
  onGenerate: () => Promise<string>;
  /** Called when user accepts a suggestion */
  onAccept: (text: string) => void;
  /** Whether generation is currently in progress */
  isGenerating?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Tooltip text */
  title?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional class name */
  className?: string;
}

export function AIAssistButton({
  onGenerate,
  onAccept,
  isGenerating: externalIsGenerating,
  disabled = false,
  title = "Generate with AI",
  size = "sm",
  className = "",
}: AIAssistButtonProps) {
  const [internalIsGenerating, setInternalIsGenerating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isGenerating = externalIsGenerating ?? internalIsGenerating;

  // Calculate dropdown position from button rect
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 320;
    const dropdownHeight = 280;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;

    let left = Math.max(16, rect.right - dropdownWidth);
    if (left + dropdownWidth > viewportWidth - 16) {
      left = viewportWidth - dropdownWidth - 16;
    }

    setDropdownPosition({
      top: showBelow ? rect.bottom + 8 : rect.top - dropdownHeight - 8,
      left,
    });
  }, []);

  // Position dropdown relative to button, and reposition on scroll/resize
  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();

    const handleScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", handleScrollOrResize, true); // capture phase for inner scrollables
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [showDropdown, updateDropdownPosition]);

  // Close on click outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setSuggestion(null);
        setError(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleClick = useCallback(async () => {
    if (isGenerating || disabled) return;

    setInternalIsGenerating(true);
    setError(null);
    setSuggestion(null);
    setShowDropdown(true);

    try {
      const result = await onGenerate();
      if (!result || (typeof result === "string" && result.trim() === "")) {
        setError("Generation returned empty result");
      } else {
        setSuggestion(result);
      }
    } catch (err) {
      console.error("AI generation failed:", err);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setInternalIsGenerating(false);
    }
  }, [onGenerate, isGenerating, disabled]);

  const handleAccept = useCallback(() => {
    if (suggestion) {
      onAccept(suggestion);
      setShowDropdown(false);
      setSuggestion(null);
    }
  }, [suggestion, onAccept]);

  const handleRegenerate = useCallback(async () => {
    setError(null);
    setSuggestion(null);
    setInternalIsGenerating(true);

    try {
      const result = await onGenerate();
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setInternalIsGenerating(false);
    }
  }, [onGenerate]);

  const handleClose = useCallback(() => {
    setShowDropdown(false);
    setSuggestion(null);
    setError(null);
  }, []);

  const sizeClasses = size === "sm" ? "ai-assist-btn-sm" : "ai-assist-btn-md";

  const dropdown = showDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          className="ai-assist-dropdown"
          style={{
            position: "fixed",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
          data-testid="ai-assist-dropdown"
        >
          <div className="ai-assist-header">
            <span className="ai-assist-title">
              <span>✨</span>
              AI Suggestion
            </span>
            <button
              className="ai-assist-close"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="ai-assist-content">
            {isGenerating ? (
              <div className="ai-assist-loading">
                <div className="ai-assist-loading-spinner" />
                <span className="ai-assist-loading-text">Generating...</span>
              </div>
            ) : error ? (
              <>
                <div className="ai-assist-error">{error}</div>
                <div className="ai-assist-actions">
                  <button
                    className="ai-assist-action-btn secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="ai-assist-action-btn primary"
                    onClick={handleRegenerate}
                  >
                    Try Again
                  </button>
                </div>
              </>
            ) : suggestion ? (
              <>
                <div className="ai-assist-suggestion">{suggestion}</div>
                <div className="ai-assist-actions">
                  <button
                    className="ai-assist-action-btn secondary"
                    onClick={handleRegenerate}
                  >
                    Regenerate
                  </button>
                  <button
                    className="ai-assist-action-btn primary"
                    onClick={handleAccept}
                    data-testid="ai-assist-use-button"
                  >
                    Use This
                  </button>
                </div>
              </>
            ) : (
              <div className="ai-assist-loading">
                <span className="ai-assist-loading-text">Waiting for response...</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <style>{`
        .ai-assist-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .ai-assist-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .ai-assist-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .ai-assist-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-assist-btn-sm {
          width: 28px;
          height: 28px;
          font-size: 0.875rem;
        }

        .ai-assist-btn-md {
          width: 36px;
          height: 36px;
          font-size: 1rem;
        }

        .ai-assist-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: ai-spin 0.7s linear infinite;
        }

        @keyframes ai-spin {
          to { transform: rotate(360deg); }
        }

        .ai-assist-sparkle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-assist-dropdown {
          width: 320px;
          max-width: calc(100vw - 32px);
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          z-index: 99999;
          overflow: hidden;
        }

        .ai-assist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #1f1f23;
          border-bottom: 1px solid #3f3f46;
        }

        .ai-assist-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #fafafa;
        }

        .ai-assist-close {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          font-size: 1.25rem;
          line-height: 1;
        }

        .ai-assist-close:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .ai-assist-content {
          padding: 1rem;
        }

        .ai-assist-suggestion {
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          padding: 0.875rem;
          font-size: 0.8125rem;
          color: #e4e4e7;
          line-height: 1.5;
          max-height: 180px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .ai-assist-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 0.875rem;
          font-size: 0.8125rem;
          color: #fca5a5;
        }

        .ai-assist-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          gap: 0.75rem;
        }

        .ai-assist-loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: ai-spin 0.7s linear infinite;
        }

        .ai-assist-loading-text {
          font-size: 0.8125rem;
          color: #71717a;
        }

        .ai-assist-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .ai-assist-action-btn {
          flex: 1;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .ai-assist-action-btn.primary {
          background: #8b5cf6;
          border: none;
          color: white;
        }

        .ai-assist-action-btn.primary:hover {
          background: #7c3aed;
        }

        .ai-assist-action-btn.secondary {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .ai-assist-action-btn.secondary:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .ai-assist-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <button
        ref={buttonRef}
        type="button"
        className={`ai-assist-btn ${sizeClasses} ${className}`}
        onClick={handleClick}
        disabled={disabled || isGenerating}
        title={title}
        data-testid="ai-assist-button"
      >
        {isGenerating ? (
          <div className="ai-assist-spinner" />
        ) : (
          <span className="ai-assist-sparkle">✨</span>
        )}
      </button>

      {dropdown}
    </>
  );
}

export default AIAssistButton;

// --- Inline AI suggestion pattern (used in PanelGenerator) ---

export interface UseAIAssistReturn {
  isGenerating: boolean;
  suggestion: string | null;
  error: string | null;
  generate: () => Promise<void>;
  clear: () => void;
}

export function useAIAssist(onGenerate: () => Promise<string>): UseAIAssistReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await onGenerate();
      if (!result || (typeof result === "string" && result.trim() === "")) {
        setError("Generation returned empty result");
      } else {
        setSuggestion(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate]);

  const clear = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return { isGenerating, suggestion, error, generate, clear };
}

export interface AIAssistSuggestionProps {
  suggestion: string | null;
  error: string | null;
  isGenerating: boolean;
  onAccept: (text: string) => void;
  onRegenerate: () => void;
  onDismiss: () => void;
}

export function AIAssistSuggestion({
  suggestion,
  error,
  isGenerating,
  onAccept,
  onRegenerate,
  onDismiss,
}: AIAssistSuggestionProps) {
  if (!isGenerating && !suggestion && !error) return null;

  return (
    <>
      <style>{`
        .ai-assist-inline {
          margin-top: 0.5rem;
          background: #1f1f23;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          animation: ai-slide-in 0.15s ease-out;
        }

        @keyframes ai-slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-assist-inline-content {
          padding: 0.75rem;
        }

        .ai-assist-inline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #3f3f46;
        }

        .ai-assist-inline-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #a1a1aa;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .ai-assist-inline-close {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 0.125rem 0.25rem;
          border-radius: 4px;
          font-size: 1rem;
          line-height: 1;
        }

        .ai-assist-inline-close:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .ai-assist-inline-suggestion {
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          padding: 0.75rem;
          font-size: 0.8125rem;
          color: #e4e4e7;
          line-height: 1.5;
          max-height: 150px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .ai-assist-inline-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          padding: 0.75rem;
          font-size: 0.8125rem;
          color: #fca5a5;
        }

        .ai-assist-inline-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          gap: 0.5rem;
        }

        .ai-assist-inline-loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: ai-spin 0.7s linear infinite;
        }

        .ai-assist-inline-loading-text {
          font-size: 0.8125rem;
          color: #71717a;
        }

        .ai-assist-inline-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.625rem;
        }
      `}</style>
      <div className="ai-assist-inline" data-testid="ai-assist-inline">
        <div className="ai-assist-inline-header">
          <span className="ai-assist-inline-title">
            <span>✨</span> AI Suggestion
          </span>
          <button
            className="ai-assist-inline-close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="ai-assist-inline-content">
          {isGenerating ? (
            <div className="ai-assist-inline-loading">
              <div className="ai-assist-inline-loading-spinner" />
              <span className="ai-assist-inline-loading-text">Generating...</span>
            </div>
          ) : error ? (
            <>
              <div className="ai-assist-inline-error">{error}</div>
              <div className="ai-assist-inline-actions">
                <button
                  className="ai-assist-action-btn secondary"
                  onClick={onDismiss}
                >
                  Cancel
                </button>
                <button
                  className="ai-assist-action-btn primary"
                  onClick={onRegenerate}
                >
                  Try Again
                </button>
              </div>
            </>
          ) : suggestion ? (
            <>
              <div className="ai-assist-inline-suggestion">{suggestion}</div>
              <div className="ai-assist-inline-actions">
                <button
                  className="ai-assist-action-btn secondary"
                  onClick={onRegenerate}
                >
                  Regenerate
                </button>
                <button
                  className="ai-assist-action-btn primary"
                  onClick={() => onAccept(suggestion)}
                  data-testid="ai-assist-inline-use-button"
                >
                  Use This
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
