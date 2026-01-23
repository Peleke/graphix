/**
 * Caption Editor Component
 *
 * Full-featured editor for creating and editing panel captions.
 * Supports rich text, position controls, style presets, and character assignment.
 */

import { useState, useEffect } from "react";
import { RichTextEditor } from "../rich-text/RichTextEditor";
import type { TipTapContent, CaptionType, CaptionStylePreset } from "../rich-text/types";
import { CAPTION_STYLE_PRESETS } from "../rich-text/types";

export interface CaptionPosition {
  x: number;
  y: number;
}

export interface CaptionStyle {
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  padding?: number;
  maxWidth?: number;
}

export interface Caption {
  id: string;
  panelId: string;
  type: CaptionType;
  text: string;
  richText?: TipTapContent | null;
  characterId?: string | null;
  position: CaptionPosition;
  tailDirection?: CaptionPosition | null;
  style?: Partial<CaptionStyle>;
  zIndex: number;
  enabled: boolean;
  orderIndex: number;
  beatId?: string | null;
  generatedFromBeat: boolean;
  manuallyEdited: boolean;
}

export interface Character {
  id: string;
  name: string;
}

interface CaptionEditorProps {
  /** Caption to edit (null for new caption) */
  caption?: Caption | null;
  /** Panel ID for new captions */
  panelId: string;
  /** Available characters for assignment */
  characters?: Character[];
  /** Called when save is clicked */
  onSave: (data: {
    type: CaptionType;
    text: string;
    richText?: TipTapContent;
    characterId?: string | null;
    position: CaptionPosition;
    tailDirection?: CaptionPosition | null;
    style?: Partial<CaptionStyle>;
  }) => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
  /** Show loading state */
  isLoading?: boolean;
}

const CAPTION_TYPES: { value: CaptionType; label: string; description: string }[] = [
  { value: "speech", label: "Speech", description: "Character dialogue in speech bubble" },
  { value: "thought", label: "Thought", description: "Internal thoughts with cloud bubble" },
  { value: "narration", label: "Narration", description: "Story narration in caption box" },
  { value: "sfx", label: "SFX", description: "Sound effects text" },
  { value: "whisper", label: "Whisper", description: "Quiet speech with dashed border" },
];

export function CaptionEditor({
  caption,
  panelId,
  characters = [],
  onSave,
  onCancel,
  isLoading = false,
}: CaptionEditorProps) {
  const [type, setType] = useState<CaptionType>(caption?.type || "speech");
  const [text, setText] = useState(caption?.text || "");
  const [richText, setRichText] = useState<TipTapContent | undefined>(
    caption?.richText || undefined
  );
  const [characterId, setCharacterId] = useState<string | null>(
    caption?.characterId || null
  );
  const [position, setPosition] = useState<CaptionPosition>(
    caption?.position || { x: 50, y: 20 }
  );
  const [tailDirection, setTailDirection] = useState<CaptionPosition | null>(
    caption?.tailDirection || null
  );
  const [style, setStyle] = useState<Partial<CaptionStyle>>(
    caption?.style || {}
  );

  const isNew = !caption;
  const showTailControls = type === "speech" || type === "thought";

  // Update style when type changes
  useEffect(() => {
    const preset = CAPTION_STYLE_PRESETS[type];
    setStyle((current) => ({
      ...preset,
      ...current,
    }));
  }, [type]);

  const handleRichTextChange = (content: TipTapContent, plainText: string) => {
    setRichText(content);
    setText(plainText);
  };

  const handleSave = () => {
    if (!text.trim()) return;

    onSave({
      type,
      text: text.trim(),
      richText,
      characterId,
      position,
      tailDirection: showTailControls ? tailDirection : null,
      style,
    });
  };

  const applyPreset = (presetType: CaptionType) => {
    setType(presetType);
    const preset = CAPTION_STYLE_PRESETS[presetType];
    setStyle(preset);
  };

  return (
    <div className="caption-editor" data-testid="caption-editor">
      <style>{`
        .caption-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: #18181b;
          border-radius: 8px;
        }

        .editor-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
        }

        .type-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .type-btn {
          padding: 0.5rem 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .type-btn:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .type-btn.active {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: white;
        }

        .type-btn.speech.active { background: #3b82f6; border-color: #3b82f6; }
        .type-btn.thought.active { background: #8b5cf6; border-color: #8b5cf6; }
        .type-btn.narration.active { background: #eab308; border-color: #eab308; color: #18181b; }
        .type-btn.sfx.active { background: #ef4444; border-color: #ef4444; }
        .type-btn.whisper.active { background: #71717a; border-color: #71717a; }

        .select-field {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #fafafa;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .select-field:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .position-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .position-control {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .position-label {
          font-size: 0.75rem;
          color: #a1a1aa;
        }

        .position-slider {
          width: 100%;
          height: 6px;
          background: #3f3f46;
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
        }

        .position-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: grab;
        }

        .position-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
        }

        .position-value {
          font-size: 0.75rem;
          color: #71717a;
          text-align: right;
        }

        .editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #27272a;
        }

        .btn-secondary {
          padding: 0.625rem 1.25rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.875rem;
          font-weight: 500;
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
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #7c3aed;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tail-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #27272a;
          border-radius: 6px;
        }

        .tail-toggle input {
          width: 16px;
          height: 16px;
          accent-color: #8b5cf6;
        }

        .tail-toggle label {
          font-size: 0.8125rem;
          color: #a1a1aa;
        }
      `}</style>

      {/* Caption Type */}
      <div className="editor-section">
        <span className="section-label">Caption Type</span>
        <div className="type-selector">
          {CAPTION_TYPES.map((t) => (
            <button
              key={t.value}
              className={`type-btn ${t.value} ${type === t.value ? "active" : ""}`}
              onClick={() => applyPreset(t.value)}
              title={t.description}
              data-testid={`caption-type-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Character Assignment (for speech/thought/whisper) */}
      {(type === "speech" || type === "thought" || type === "whisper") && characters.length > 0 && (
        <div className="editor-section">
          <span className="section-label">Character</span>
          <select
            className="select-field"
            value={characterId || ""}
            onChange={(e) => setCharacterId(e.target.value || null)}
            data-testid="caption-character-select"
          >
            <option value="">No character assigned</option>
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rich Text Content */}
      <div className="editor-section">
        <span className="section-label">Text Content</span>
        <RichTextEditor
          content={richText}
          plainText={text}
          onChange={handleRichTextChange}
          placeholder={`Enter ${type} text...`}
          minHeight={80}
          maxHeight={200}
          showCharCount
          maxChars={500}
          autoFocus={isNew}
        />
      </div>

      {/* Position Controls */}
      <div className="editor-section">
        <span className="section-label">Position</span>
        <div className="position-controls">
          <div className="position-control">
            <span className="position-label">X Position</span>
            <input
              type="range"
              className="position-slider"
              min={0}
              max={100}
              value={position.x}
              onChange={(e) => setPosition({ ...position, x: Number(e.target.value) })}
              data-testid="caption-position-x"
            />
            <span className="position-value">{position.x}%</span>
          </div>
          <div className="position-control">
            <span className="position-label">Y Position</span>
            <input
              type="range"
              className="position-slider"
              min={0}
              max={100}
              value={position.y}
              onChange={(e) => setPosition({ ...position, y: Number(e.target.value) })}
              data-testid="caption-position-y"
            />
            <span className="position-value">{position.y}%</span>
          </div>
        </div>
      </div>

      {/* Tail Direction (for speech/thought bubbles) */}
      {showTailControls && (
        <div className="editor-section">
          <div className="tail-toggle">
            <input
              type="checkbox"
              id="show-tail"
              checked={tailDirection !== null}
              onChange={(e) =>
                setTailDirection(e.target.checked ? { x: 50, y: 100 } : null)
              }
              data-testid="caption-tail-toggle"
            />
            <label htmlFor="show-tail">Show bubble tail</label>
          </div>
          {tailDirection && (
            <div className="position-controls" style={{ marginTop: "0.5rem" }}>
              <div className="position-control">
                <span className="position-label">Tail X</span>
                <input
                  type="range"
                  className="position-slider"
                  min={0}
                  max={100}
                  value={tailDirection.x}
                  onChange={(e) =>
                    setTailDirection({ ...tailDirection, x: Number(e.target.value) })
                  }
                  data-testid="caption-tail-x"
                />
                <span className="position-value">{tailDirection.x}%</span>
              </div>
              <div className="position-control">
                <span className="position-label">Tail Y</span>
                <input
                  type="range"
                  className="position-slider"
                  min={0}
                  max={100}
                  value={tailDirection.y}
                  onChange={(e) =>
                    setTailDirection({ ...tailDirection, y: Number(e.target.value) })
                  }
                  data-testid="caption-tail-y"
                />
                <span className="position-value">{tailDirection.y}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="editor-actions">
        <button
          className="btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="caption-cancel"
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!text.trim() || isLoading}
          data-testid="caption-save"
        >
          {isLoading ? "Saving..." : isNew ? "Create Caption" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
