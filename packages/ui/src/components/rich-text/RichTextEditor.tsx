/**
 * Rich Text Editor Component
 *
 * TipTap-based rich text editor with dark theme styling.
 * Supports comic-style presets for speech, thought, narration, sfx, and whisper.
 */

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { EditorToolbar } from "./EditorToolbar";
import type { TipTapContent } from "./types";

export interface RichTextEditorProps {
  /** Initial content in TipTap JSON format */
  content?: TipTapContent | null;
  /** Plain text fallback (used if content is null) */
  plainText?: string;
  /** Called when content changes */
  onChange?: (content: TipTapContent, plainText: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels (scrolls if exceeded) */
  maxHeight?: number;
  /** Show character count */
  showCharCount?: boolean;
  /** Maximum character count (soft limit, shows warning) */
  maxChars?: number;
  /** Disable editing */
  disabled?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** CSS class for container */
  className?: string;
}

export function RichTextEditor({
  content,
  plainText = "",
  onChange,
  placeholder = "Enter text...",
  minHeight = 100,
  maxHeight = 300,
  showCharCount = false,
  maxChars,
  disabled = false,
  showToolbar = true,
  autoFocus = false,
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history for better performance in modals
        history: {
          depth: 50,
        },
      }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: content || createContentFromPlainText(plainText),
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON() as TipTapContent;
        const text = editor.getText();
        onChange(json, text);
      }
    },
    editorProps: {
      attributes: {
        class: "rich-text-editor-content",
        "data-placeholder": placeholder,
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (!editor) return;

    const currentJson = JSON.stringify(editor.getJSON());
    const newJson = JSON.stringify(content || createContentFromPlainText(plainText));

    if (currentJson !== newJson) {
      editor.commands.setContent(content || createContentFromPlainText(plainText));
    }
  }, [editor, content, plainText]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const charCount = editor?.getText().length || 0;
  const isOverLimit = maxChars ? charCount > maxChars : false;

  return (
    <div className={`rich-text-editor ${className} ${disabled ? "disabled" : ""}`}>
      <style>{`
        .rich-text-editor {
          display: flex;
          flex-direction: column;
          background: #1f1f23;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
        }

        .rich-text-editor.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .rich-text-editor:focus-within {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }

        .rich-text-editor-content {
          padding: 0.75rem 1rem;
          color: #fafafa;
          font-size: 0.9375rem;
          line-height: 1.6;
          overflow-y: auto;
        }

        .rich-text-editor-content:focus {
          outline: none;
        }

        .rich-text-editor-content p {
          margin: 0 0 0.5em;
        }

        .rich-text-editor-content p:last-child {
          margin-bottom: 0;
        }

        .rich-text-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }

        .rich-text-editor-content strong {
          font-weight: 700;
        }

        .rich-text-editor-content em {
          font-style: italic;
        }

        .rich-text-editor-content u {
          text-decoration: underline;
        }

        .rich-text-editor-content s {
          text-decoration: line-through;
        }

        .rich-text-editor-content ul,
        .rich-text-editor-content ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .rich-text-editor-content blockquote {
          border-left: 3px solid #8b5cf6;
          padding-left: 1rem;
          margin: 0.5em 0;
          color: #a1a1aa;
          font-style: italic;
        }

        .rich-text-editor-footer {
          display: flex;
          justify-content: flex-end;
          padding: 0.5rem 1rem;
          border-top: 1px solid #27272a;
          font-size: 0.75rem;
          color: #71717a;
        }

        .rich-text-editor-footer.over-limit {
          color: #ef4444;
        }

        /* ProseMirror specific */
        .ProseMirror {
          outline: none;
        }

        .ProseMirror > * + * {
          margin-top: 0.75em;
        }
      `}</style>

      {showToolbar && editor && <EditorToolbar editor={editor} />}

      <div
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          overflow: "auto",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {showCharCount && (
        <div className={`rich-text-editor-footer ${isOverLimit ? "over-limit" : ""}`}>
          {charCount}
          {maxChars && ` / ${maxChars}`}
          {isOverLimit && " (over limit)"}
        </div>
      )}
    </div>
  );
}

/**
 * Create TipTap content from plain text
 */
function createContentFromPlainText(text: string): TipTapContent {
  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  // Split by newlines and create paragraphs
  const paragraphs = text.split("\n").map((line) => ({
    type: "paragraph" as const,
    content: line ? [{ type: "text" as const, text: line }] : [],
  }));

  return {
    type: "doc",
    content: paragraphs,
  };
}

/**
 * Extract plain text from TipTap content
 */
export function extractPlainText(content: TipTapContent | null | undefined): string {
  if (!content || !content.content) return "";

  const extractText = (nodes: TipTapContent["content"]): string => {
    return nodes
      .map((node) => {
        if (node.text) return node.text;
        if (node.content) return extractText(node.content);
        if (node.type === "paragraph") return "\n";
        return "";
      })
      .join("")
      .trim();
  };

  return extractText(content.content);
}

/**
 * Hook for using the editor imperatively
 */
export function useRichTextEditor(
  initialContent?: TipTapContent | null,
  onChange?: (content: TipTapContent, plainText: string) => void
) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
    ],
    content: initialContent || { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON() as TipTapContent;
        const text = editor.getText();
        onChange(json, text);
      }
    },
  });

  const setContent = useCallback(
    (content: TipTapContent | string) => {
      if (!editor) return;
      if (typeof content === "string") {
        editor.commands.setContent(createContentFromPlainText(content));
      } else {
        editor.commands.setContent(content);
      }
    },
    [editor]
  );

  const getContent = useCallback((): TipTapContent | null => {
    if (!editor) return null;
    return editor.getJSON() as TipTapContent;
  }, [editor]);

  const getText = useCallback((): string => {
    if (!editor) return "";
    return editor.getText();
  }, [editor]);

  return { editor, setContent, getContent, getText };
}

export type { Editor };
