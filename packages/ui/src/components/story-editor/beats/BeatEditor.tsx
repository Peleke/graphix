/**
 * BeatEditor Component
 *
 * Modal for creating and editing beats.
 */

import { useState, useEffect, useCallback } from "react";
import type { Beat, BeatType, CameraAngle, CreateBeatInput, UpdateBeatInput } from "./types";
import { BEAT_TYPES, CAMERA_ANGLES, BEAT_TYPE_LABELS, CAMERA_ANGLE_LABELS } from "./types";
import { getBeatIcon } from "./beat-icons";

interface BeatEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBeatInput | UpdateBeatInput) => void;
  storyId: string;
  beat?: Beat | null;
  isPending?: boolean;
}

const MIN_DESCRIPTION_LENGTH = 10;

export function BeatEditor({
  isOpen,
  onClose,
  onSubmit,
  storyId,
  beat,
  isPending = false,
}: BeatEditorProps) {
  const isEditMode = !!beat;

  const [beatType, setBeatType] = useState<BeatType | null>(beat?.beatType ?? null);
  const [visualDescription, setVisualDescription] = useState(beat?.visualDescription ?? "");
  const [emotionalTone, setEmotionalTone] = useState(beat?.emotionalTone ?? "");
  const [narration, setNarration] = useState(beat?.narration ?? "");
  const [sfx, setSfx] = useState(beat?.sfx ?? "");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle | null>(beat?.cameraAngle ?? null);

  // Reset form when modal opens or beat changes
  useEffect(() => {
    if (isOpen) {
      setBeatType(beat?.beatType ?? null);
      setVisualDescription(beat?.visualDescription ?? "");
      setEmotionalTone(beat?.emotionalTone ?? "");
      setNarration(beat?.narration ?? "");
      setSfx(beat?.sfx ?? "");
      setCameraAngle(beat?.cameraAngle ?? null);
    }
  }, [isOpen, beat]);

  const isValid = visualDescription.trim().length >= MIN_DESCRIPTION_LENGTH;
  const isDirty = isEditMode
    ? beatType !== beat?.beatType ||
      visualDescription !== beat?.visualDescription ||
      emotionalTone !== (beat?.emotionalTone ?? "") ||
      narration !== (beat?.narration ?? "") ||
      sfx !== (beat?.sfx ?? "") ||
      cameraAngle !== beat?.cameraAngle
    : visualDescription.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    if (isEditMode && beat) {
      onSubmit({
        id: beat.id,
        beatType,
        visualDescription: visualDescription.trim(),
        emotionalTone: emotionalTone.trim() || null,
        narration: narration.trim() || null,
        sfx: sfx.trim() || null,
        cameraAngle,
      } as UpdateBeatInput);
    } else {
      onSubmit({
        storyId,
        beatType,
        visualDescription: visualDescription.trim(),
        emotionalTone: emotionalTone.trim() || null,
        narration: narration.trim() || null,
        sfx: sfx.trim() || null,
        cameraAngle,
      } as CreateBeatInput);
    }
  }, [isEditMode, beat, storyId, beatType, visualDescription, emotionalTone, narration, sfx, cameraAngle, isValid, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="beat-editor-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beat-editor-title"
      data-testid="beat-editor-modal"
    >
      <style>{`
        .beat-editor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .beat-editor-modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .beat-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #27272a;
        }

        .beat-editor-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #fafafa;
        }

        .beat-editor-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #71717a;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.15s ease;
        }

        .beat-editor-close:hover {
          background: #27272a;
          color: #fafafa;
        }

        .beat-editor-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .beat-editor-section {
          margin-bottom: 1.25rem;
        }

        .beat-editor-section:last-child {
          margin-bottom: 0;
        }

        .beat-editor-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a1a1aa;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .beat-editor-required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .beat-editor-hint {
          font-size: 0.75rem;
          color: #71717a;
          margin-top: 0.25rem;
        }

        .beat-type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .beat-type-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-type-btn:hover {
          background: #3f3f46;
          color: #fafafa;
        }

        .beat-type-btn.active {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: #fafafa;
        }

        .beat-editor-input,
        .beat-editor-textarea,
        .beat-editor-select {
          width: 100%;
          padding: 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          font-family: inherit;
          transition: border-color 0.15s ease;
        }

        .beat-editor-input:focus,
        .beat-editor-textarea:focus,
        .beat-editor-select:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .beat-editor-input::placeholder,
        .beat-editor-textarea::placeholder {
          color: #71717a;
        }

        .beat-editor-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .beat-editor-input.invalid,
        .beat-editor-textarea.invalid {
          border-color: #ef4444;
        }

        .beat-editor-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .beat-editor-footer {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #27272a;
        }

        .beat-editor-btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-editor-btn-secondary {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .beat-editor-btn-secondary:hover {
          background: #27272a;
          color: #fafafa;
        }

        .beat-editor-btn-primary {
          background: #8b5cf6;
          border: none;
          color: white;
        }

        .beat-editor-btn-primary:hover:not(:disabled) {
          background: #7c3aed;
        }

        .beat-editor-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="beat-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="beat-editor-header">
          <h2 id="beat-editor-title" className="beat-editor-title">
            {isEditMode ? "Edit Beat" : "Create Beat"}
          </h2>
          <button
            className="beat-editor-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="beat-editor-body">
          {/* Beat Type */}
          <div className="beat-editor-section">
            <label className="beat-editor-label">Beat Type</label>
            <div className="beat-type-grid">
              {BEAT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`beat-type-btn ${beatType === type ? "active" : ""}`}
                  onClick={() => setBeatType(beatType === type ? null : type)}
                >
                  <span>{getBeatIcon(type)}</span>
                  <span>{BEAT_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Description */}
          <div className="beat-editor-section">
            <label className="beat-editor-label">
              Visual Description
              <span className="beat-editor-required">*</span>
            </label>
            <textarea
              className={`beat-editor-textarea ${
                visualDescription.length > 0 && visualDescription.trim().length < MIN_DESCRIPTION_LENGTH
                  ? "invalid"
                  : ""
              }`}
              value={visualDescription}
              onChange={(e) => setVisualDescription(e.target.value)}
              placeholder="Describe what should be visually depicted in this beat..."
              autoFocus
              data-testid="beat-visual-description"
            />
            <div className="beat-editor-hint">
              Minimum {MIN_DESCRIPTION_LENGTH} characters
              {visualDescription.length > 0 && (
                <span style={{ marginLeft: "0.5rem" }}>
                  ({visualDescription.trim().length}/{MIN_DESCRIPTION_LENGTH})
                </span>
              )}
            </div>
          </div>

          {/* Emotional Tone */}
          <div className="beat-editor-section">
            <label className="beat-editor-label">Emotional Tone</label>
            <input
              type="text"
              className="beat-editor-input"
              value={emotionalTone}
              onChange={(e) => setEmotionalTone(e.target.value)}
              placeholder="e.g., tense, hopeful, melancholic..."
            />
          </div>

          {/* Narration */}
          <div className="beat-editor-section">
            <label className="beat-editor-label">Narration</label>
            <textarea
              className="beat-editor-textarea"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Optional narration text for this beat..."
              style={{ minHeight: "80px" }}
            />
          </div>

          {/* SFX and Camera Angle */}
          <div className="beat-editor-row">
            <div className="beat-editor-section">
              <label className="beat-editor-label">Sound Effects</label>
              <input
                type="text"
                className="beat-editor-input"
                value={sfx}
                onChange={(e) => setSfx(e.target.value)}
                placeholder="e.g., thunder, footsteps..."
              />
            </div>

            <div className="beat-editor-section">
              <label className="beat-editor-label">Camera Angle</label>
              <select
                className="beat-editor-select"
                value={cameraAngle ?? ""}
                onChange={(e) =>
                  setCameraAngle(e.target.value ? (e.target.value as CameraAngle) : null)
                }
              >
                <option value="">Select angle...</option>
                {CAMERA_ANGLES.map((angle) => (
                  <option key={angle} value={angle}>
                    {CAMERA_ANGLE_LABELS[angle]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="beat-editor-footer">
          <button
            type="button"
            className="beat-editor-btn beat-editor-btn-secondary"
            onClick={onClose}
            data-testid="beat-editor-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className="beat-editor-btn beat-editor-btn-primary"
            onClick={handleSubmit}
            disabled={!isValid || isPending || (isEditMode && !isDirty)}
            data-testid="beat-editor-submit"
          >
            {isPending
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
              ? "Save Changes"
              : "Create Beat"}
          </button>
        </div>
      </div>
    </div>
  );
}
