/**
 * Editor Toolbar Component
 *
 * Formatting toolbar for the rich text editor.
 * Includes bold, italic, font family, font size, and color controls.
 */

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  FONT_FAMILIES,
  COLOR_PRESETS,
  CAPTION_STYLE_PRESETS,
  type CaptionType,
} from "./types";

interface EditorToolbarProps {
  editor: Editor;
  showCaptionPresets?: boolean;
  onPresetSelect?: (preset: CaptionType) => void;
}

export function EditorToolbar({
  editor,
  showCaptionPresets = true,
  onPresetSelect,
}: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setShowFontPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyPreset = (preset: CaptionType) => {
    const style = CAPTION_STYLE_PRESETS[preset];

    // Select all content and apply styles
    editor.chain().focus().selectAll().run();
    editor.chain().focus().setColor(style.fontColor).run();
    editor.chain().focus().setFontFamily(style.fontFamily).run();

    if (style.fontWeight === "bold") {
      if (!editor.isActive("bold")) {
        editor.chain().focus().toggleBold().run();
      }
    } else {
      if (editor.isActive("bold")) {
        editor.chain().focus().toggleBold().run();
      }
    }

    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  const currentColor = editor.getAttributes("textStyle").color || "#fafafa";
  const currentFont = editor.getAttributes("textStyle").fontFamily || "inherit";

  return (
    <div className="editor-toolbar" data-testid="editor-toolbar">
      <style>{`
        .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          background: #27272a;
          border-bottom: 1px solid #3f3f46;
        }

        .toolbar-divider {
          width: 1px;
          height: 20px;
          background: #3f3f46;
          margin: 0 0.25rem;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #a1a1aa;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toolbar-btn:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .toolbar-btn.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .toolbar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .toolbar-dropdown {
          position: relative;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 4px;
          color: #a1a1aa;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 80px;
        }

        .dropdown-trigger:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .dropdown-trigger svg {
          margin-left: auto;
          opacity: 0.5;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 150px;
          max-height: 200px;
          overflow-y: auto;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .dropdown-item {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          color: #a1a1aa;
          cursor: pointer;
          transition: background 0.1s;
        }

        .dropdown-item:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .dropdown-item.active {
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .color-picker {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          padding: 0.5rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.25rem;
        }

        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .color-swatch:hover {
          transform: scale(1.1);
        }

        .color-swatch.active {
          border-color: white;
          box-shadow: 0 0 0 2px #8b5cf6;
        }

        .color-indicator {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid #3f3f46;
        }

        .preset-buttons {
          display: flex;
          gap: 0.25rem;
          margin-left: auto;
        }

        .preset-btn {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 4px;
          color: #71717a;
          font-size: 0.625rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-btn:hover {
          background: #3f3f46;
          color: #fafafa;
          border-color: #52525b;
        }

        .preset-btn.speech { border-color: #3b82f6; color: #3b82f6; }
        .preset-btn.speech:hover { background: rgba(59, 130, 246, 0.2); }

        .preset-btn.thought { border-color: #8b5cf6; color: #8b5cf6; }
        .preset-btn.thought:hover { background: rgba(139, 92, 246, 0.2); }

        .preset-btn.narration { border-color: #eab308; color: #eab308; }
        .preset-btn.narration:hover { background: rgba(234, 179, 8, 0.2); }

        .preset-btn.sfx { border-color: #ef4444; color: #ef4444; }
        .preset-btn.sfx:hover { background: rgba(239, 68, 68, 0.2); }

        .preset-btn.whisper { border-color: #71717a; color: #71717a; }
        .preset-btn.whisper:hover { background: rgba(113, 113, 122, 0.2); }
      `}</style>

      {/* Bold */}
      <button
        className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
        data-testid="toolbar-bold"
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
        data-testid="toolbar-italic"
      >
        <em>I</em>
      </button>

      {/* Strike */}
      <button
        className={`toolbar-btn ${editor.isActive("strike") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        data-testid="toolbar-strike"
      >
        <s>S</s>
      </button>

      <div className="toolbar-divider" />

      {/* Font Family */}
      <div className="toolbar-dropdown" ref={fontPickerRef}>
        <button
          className="dropdown-trigger"
          onClick={() => setShowFontPicker(!showFontPicker)}
          title="Font Family"
          data-testid="toolbar-font"
        >
          <span style={{ fontFamily: currentFont, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis" }}>
            {FONT_FAMILIES.find((f) => f.value === currentFont)?.label || "Font"}
          </span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        {showFontPicker && (
          <div className="dropdown-menu" data-testid="font-picker">
            {FONT_FAMILIES.map((font) => (
              <div
                key={font.value}
                className={`dropdown-item ${currentFont === font.value ? "active" : ""}`}
                style={{ fontFamily: font.value }}
                onClick={() => {
                  editor.chain().focus().setFontFamily(font.value).run();
                  setShowFontPicker(false);
                }}
              >
                {font.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Color */}
      <div className="toolbar-dropdown" ref={colorPickerRef}>
        <button
          className="dropdown-trigger"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
          data-testid="toolbar-color"
        >
          <div className="color-indicator" style={{ backgroundColor: currentColor }} />
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        {showColorPicker && (
          <div className="color-picker" data-testid="color-picker">
            <div className="color-grid">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`color-swatch ${currentColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Undo/Redo */}
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
        data-testid="toolbar-undo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 1 0 3-7.5" />
        </svg>
      </button>
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
        data-testid="toolbar-redo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 7v6h-6" />
          <path d="M21 13a9 9 0 1 1 -3-7.5" />
        </svg>
      </button>

      {/* Caption Style Presets */}
      {showCaptionPresets && (
        <>
          <div className="toolbar-divider" />
          <div className="preset-buttons">
            <button
              className="preset-btn speech"
              onClick={() => applyPreset("speech")}
              title="Apply Speech style"
              data-testid="preset-speech"
            >
              Speech
            </button>
            <button
              className="preset-btn thought"
              onClick={() => applyPreset("thought")}
              title="Apply Thought style"
              data-testid="preset-thought"
            >
              Thought
            </button>
            <button
              className="preset-btn narration"
              onClick={() => applyPreset("narration")}
              title="Apply Narration style"
              data-testid="preset-narration"
            >
              Narr
            </button>
            <button
              className="preset-btn sfx"
              onClick={() => applyPreset("sfx")}
              title="Apply SFX style"
              data-testid="preset-sfx"
            >
              SFX
            </button>
            <button
              className="preset-btn whisper"
              onClick={() => applyPreset("whisper")}
              title="Apply Whisper style"
              data-testid="preset-whisper"
            >
              Whisp
            </button>
          </div>
        </>
      )}
    </div>
  );
}
