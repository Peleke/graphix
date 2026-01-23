/**
 * Text Panel Editor Component
 *
 * Full-width editor for text-only panels (narration, chapter titles, credits).
 * Uses TipTap for rich text editing with style presets.
 */

import { useState, useCallback } from "react";
import { RichTextEditor } from "../rich-text/RichTextEditor";
import type { TipTapContent } from "../rich-text/types";

// Text panel style presets
export type TextPanelPreset = "narration" | "chapter_title" | "credits" | "custom";

interface TextPanelPresetConfig {
  label: string;
  description: string;
  defaultContent: TipTapContent;
  style: {
    fontSize: number;
    fontFamily: string;
    textAlign: "left" | "center" | "right";
    backgroundColor: string;
  };
}

const TEXT_PANEL_PRESETS: Record<TextPanelPreset, TextPanelPresetConfig> = {
  narration: {
    label: "Narration",
    description: "Story narration or description",
    defaultContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Enter narration text..." }],
        },
      ],
    },
    style: {
      fontSize: 16,
      fontFamily: "Georgia, serif",
      textAlign: "left",
      backgroundColor: "#18181b",
    },
  },
  chapter_title: {
    label: "Chapter Title",
    description: "Chapter heading or title card",
    defaultContent: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Chapter Title" }],
        },
      ],
    },
    style: {
      fontSize: 32,
      fontFamily: "Impact, sans-serif",
      textAlign: "center",
      backgroundColor: "#0f0f10",
    },
  },
  credits: {
    label: "Credits",
    description: "End credits or attribution",
    defaultContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [{ type: "text", text: "Written by..." }],
        },
      ],
    },
    style: {
      fontSize: 14,
      fontFamily: "Inter, sans-serif",
      textAlign: "center",
      backgroundColor: "#09090b",
    },
  },
  custom: {
    label: "Custom",
    description: "Custom formatted text",
    defaultContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    },
    style: {
      fontSize: 16,
      fontFamily: "Inter, sans-serif",
      textAlign: "left",
      backgroundColor: "#18181b",
    },
  },
};

interface TextPanelEditorProps {
  /** Initial text content (TipTap JSON) */
  content?: TipTapContent | null;
  /** Callback when content changes */
  onChange: (content: TipTapContent, plainText: string) => void;
  /** Callback when save is requested */
  onSave?: () => void;
  /** Callback when cancel is requested */
  onCancel?: () => void;
  /** Initial preset */
  preset?: TextPanelPreset;
  /** Whether the editor is in a modal */
  isModal?: boolean;
  /** Custom min height */
  minHeight?: string;
  /** Whether to show the preset selector */
  showPresetSelector?: boolean;
  /** Whether to auto-focus */
  autoFocus?: boolean;
}

export function TextPanelEditor({
  content,
  onChange,
  onSave,
  onCancel,
  preset: initialPreset = "narration",
  isModal = false,
  minHeight = "200px",
  showPresetSelector = true,
  autoFocus = true,
}: TextPanelEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<TextPanelPreset>(initialPreset);
  const [currentContent, setCurrentContent] = useState<TipTapContent | null>(
    content ?? TEXT_PANEL_PRESETS[initialPreset].defaultContent
  );
  const [plainText, setPlainText] = useState("");

  const handlePresetChange = useCallback(
    (preset: TextPanelPreset) => {
      setSelectedPreset(preset);
      // Only apply default content if no content exists
      if (!currentContent || isEmptyContent(currentContent)) {
        const defaultContent = TEXT_PANEL_PRESETS[preset].defaultContent;
        setCurrentContent(defaultContent);
        onChange(defaultContent, extractPlainText(defaultContent));
      }
    },
    [currentContent, onChange]
  );

  const handleContentChange = useCallback(
    (newContent: TipTapContent | null, newPlainText: string) => {
      setCurrentContent(newContent);
      setPlainText(newPlainText);
      if (newContent) {
        onChange(newContent, newPlainText);
      }
    },
    [onChange]
  );

  const presetConfig = TEXT_PANEL_PRESETS[selectedPreset];

  return (
    <div className="text-panel-editor" data-testid="text-panel-editor">
      <style>{`
        .text-panel-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #18181b;
          color: #fafafa;
          ${isModal ? "padding: 1.5rem;" : ""}
          border-radius: ${isModal ? "12px" : "0"};
        }

        .preset-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .preset-btn {
          padding: 0.5rem 1rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-btn:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .preset-btn.selected {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: white;
        }

        .preset-description {
          font-size: 0.75rem;
          color: #71717a;
          margin-top: 0.25rem;
        }

        .editor-container {
          border: 1px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          background: ${presetConfig.style.backgroundColor};
        }

        .text-panel-editor .tiptap-editor {
          min-height: ${minHeight};
          font-family: ${presetConfig.style.fontFamily};
          font-size: ${presetConfig.style.fontSize}px;
          text-align: ${presetConfig.style.textAlign};
        }

        .editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-secondary {
          padding: 0.625rem 1.25rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          background: #27272a;
          color: #fafafa;
        }

        .btn-primary {
          padding: 0.625rem 1.25rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-primary:hover {
          background: #7c3aed;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .char-count {
          font-size: 0.75rem;
          color: #71717a;
          text-align: right;
          margin-top: 0.5rem;
        }
      `}</style>

      {showPresetSelector && (
        <div className="preset-section">
          <div className="preset-selector" data-testid="preset-selector">
            {(Object.keys(TEXT_PANEL_PRESETS) as TextPanelPreset[]).map((presetKey) => (
              <button
                key={presetKey}
                className={`preset-btn ${selectedPreset === presetKey ? "selected" : ""}`}
                onClick={() => handlePresetChange(presetKey)}
                data-testid={`preset-btn-${presetKey}`}
              >
                {TEXT_PANEL_PRESETS[presetKey].label}
              </button>
            ))}
          </div>
          <div className="preset-description">{presetConfig.description}</div>
        </div>
      )}

      <div className="editor-container" data-testid="editor-container">
        <RichTextEditor
          content={currentContent}
          onChange={handleContentChange}
          placeholder="Enter text..."
          minHeight={minHeight}
          showToolbar={true}
          autoFocus={autoFocus}
          showCharCount
        />
      </div>

      {(onSave || onCancel) && (
        <div className="editor-actions">
          {onCancel && (
            <button
              className="btn-secondary"
              onClick={onCancel}
              data-testid="text-panel-cancel"
            >
              Cancel
            </button>
          )}
          {onSave && (
            <button
              className="btn-primary"
              onClick={onSave}
              disabled={!plainText.trim()}
              data-testid="text-panel-save"
            >
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Text Panel Editor Modal
 *
 * Wraps TextPanelEditor in a modal for creating/editing text panels.
 */
interface TextPanelModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Initial content */
  content?: TipTapContent | null;
  /** Callback when save is requested */
  onSave: (content: TipTapContent, plainText: string) => void;
  /** Modal title */
  title?: string;
}

export function TextPanelModal({
  isOpen,
  onClose,
  content,
  onSave,
  title = "Edit Text Panel",
}: TextPanelModalProps) {
  const [currentContent, setCurrentContent] = useState<TipTapContent | null>(content ?? null);
  const [currentPlainText, setCurrentPlainText] = useState("");

  const handleChange = useCallback((newContent: TipTapContent, plainText: string) => {
    setCurrentContent(newContent);
    setCurrentPlainText(plainText);
  }, []);

  const handleSave = useCallback(() => {
    if (currentContent) {
      onSave(currentContent, currentPlainText);
      onClose();
    }
  }, [currentContent, currentPlainText, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="text-panel-modal-overlay" onClick={onClose} data-testid="text-panel-modal">
      <style>{`
        .text-panel-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .text-panel-modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .text-panel-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }

        .text-panel-modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
        }

        .text-panel-modal-close {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .text-panel-modal-close:hover {
          background: #27272a;
          color: #fafafa;
        }

        .text-panel-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
      `}</style>

      <div className="text-panel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="text-panel-modal-header">
          <h2 className="text-panel-modal-title">{title}</h2>
          <button
            className="text-panel-modal-close"
            onClick={onClose}
            data-testid="text-panel-modal-close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="text-panel-modal-body">
          <TextPanelEditor
            content={content}
            onChange={handleChange}
            onSave={handleSave}
            onCancel={onClose}
            minHeight="300px"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

// Helper functions
function isEmptyContent(content: TipTapContent): boolean {
  if (!content.content || content.content.length === 0) return true;
  if (content.content.length === 1) {
    const node = content.content[0];
    if (node.type === "paragraph" && (!node.content || node.content.length === 0)) {
      return true;
    }
  }
  return false;
}

function extractPlainText(content: TipTapContent): string {
  if (!content.content) return "";

  const extract = (nodes: TipTapContent["content"]): string => {
    return nodes
      .map((node) => {
        if (node.text) return node.text;
        if (node.content) return extract(node.content);
        return "";
      })
      .join("");
  };

  return extract(content.content);
}

export { TEXT_PANEL_PRESETS, type TextPanelPresetConfig };
