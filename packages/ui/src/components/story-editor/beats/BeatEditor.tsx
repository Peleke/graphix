/**
 * BeatEditor Component
 *
 * Modal for creating and editing beats.
 * Includes AI augmentation buttons for improving text fields.
 */

import { useState, useEffect, useCallback } from "react";
import type { Beat, BeatType, CameraAngle, CreateBeatInput, UpdateBeatInput } from "./types";
import { BEAT_TYPES, CAMERA_ANGLES, BEAT_TYPE_LABELS, CAMERA_ANGLE_LABELS } from "./types";
import { getBeatIcon } from "./beat-icons";
import { useRefineText } from "../../../api/hooks/useTextGeneration";

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

  // AI augmentation hooks
  const refineText = useRefineText();
  const [aiTarget, setAiTarget] = useState<"visual" | "tone" | "narration" | null>(null);
  const [spiceTarget, setSpiceTarget] = useState<"visual" | "tone" | "narration" | null>(null);

  const handleSpice = async (
    target: "visual" | "tone" | "narration",
    currentValue: string
  ) => {
    if (!currentValue.trim()) return;
    setSpiceTarget(target);
    try {
      const instruction = target === "visual"
        ? "Make this visual description more dramatic, intense, and emotionally charged. Add tension, conflict, or heightened stakes. Use vivid, evocative language."
        : target === "tone"
        ? "Make this emotional tone more intense and dramatic. Amplify the feeling - if it's sad make it devastating, if it's happy make it euphoric, if it's tense make it unbearable."
        : "Make this narration more gripping, intense, and emotionally raw. Add urgency, drama, and visceral impact. Make it hit harder.";

      const result = await refineText.mutateAsync({
        text: currentValue,
        instruction,
        style: "dramatic",
      });

      switch (target) {
        case "visual":
          setVisualDescription(result.refined);
          break;
        case "tone":
          setEmotionalTone(result.refined);
          break;
        case "narration":
          setNarration(result.refined);
          break;
      }
    } catch (error) {
      console.error("Spice failed:", error);
    } finally {
      setSpiceTarget(null);
    }
  };

  const handleAiAugment = async (
    target: "visual" | "tone" | "narration",
    currentValue: string,
    instruction: string
  ) => {
    setAiTarget(target);
    try {
      const result = await refineText.mutateAsync({
        text: currentValue || `[Empty ${target} field for a ${beatType || "story"} beat]`,
        instruction,
      });

      switch (target) {
        case "visual":
          setVisualDescription(result.refined);
          break;
        case "tone":
          setEmotionalTone(result.refined);
          break;
        case "narration":
          setNarration(result.refined);
          break;
      }
    } catch (error) {
      console.error("AI augmentation failed:", error);
    } finally {
      setAiTarget(null);
    }
  };

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

        .ai-augment-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3f3f46;
          border: none;
          border-radius: 6px;
          color: #d4d4d8;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 0.875rem;
        }

        .ai-augment-btn:hover:not(:disabled) {
          background: #8b5cf6;
          color: white;
        }

        .ai-augment-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-augment-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .field-with-ai {
          position: relative;
        }

        .field-with-ai .beat-editor-textarea,
        .field-with-ai .beat-editor-input {
          padding-right: 80px;
        }

        .field-buttons {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
        }

        .spice-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 0.875rem;
        }

        .spice-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
        }

        .spice-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spice-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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
            <div className="field-with-ai">
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
              <div className="field-buttons">
                <button
                  type="button"
                  className="spice-btn"
                  onClick={() => handleSpice("visual", visualDescription)}
                  disabled={spiceTarget === "visual" || !visualDescription.trim()}
                  title="Make it nastier"
                  data-testid="spice-visual-btn"
                >
                  {spiceTarget === "visual" ? (
                    <span className="spice-spinner" />
                  ) : (
                    "🌶️"
                  )}
                </button>
                <button
                  type="button"
                  className="ai-augment-btn"
                  onClick={() => handleAiAugment(
                    "visual",
                    visualDescription,
                    `Enhance this visual description for a ${beatType || "story"} beat. Make it more vivid, specific, and suitable for comic panel visualization. Keep it concise but descriptive.`
                  )}
                  disabled={aiTarget === "visual"}
                  title="Enhance with AI"
                >
                  {aiTarget === "visual" ? (
                    <span className="ai-augment-spinner" />
                  ) : (
                    "✨"
                  )}
                </button>
              </div>
            </div>
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
            <div className="field-with-ai">
              <input
                type="text"
                className="beat-editor-input"
                value={emotionalTone}
                onChange={(e) => setEmotionalTone(e.target.value)}
                placeholder="e.g., tense, hopeful, melancholic..."
              />
              <div className="field-buttons">
                <button
                  type="button"
                  className="spice-btn"
                  onClick={() => handleSpice("tone", emotionalTone)}
                  disabled={spiceTarget === "tone" || !emotionalTone.trim()}
                  title="Make it nastier"
                  data-testid="spice-tone-btn"
                >
                  {spiceTarget === "tone" ? (
                    <span className="spice-spinner" />
                  ) : (
                    "🌶️"
                  )}
                </button>
                <button
                  type="button"
                  className="ai-augment-btn"
                  onClick={() => handleAiAugment(
                    "tone",
                    emotionalTone || visualDescription,
                    `Based on this visual description: "${visualDescription}", suggest a single emotional tone word or short phrase that captures the mood. Output only the emotional tone, nothing else.`
                  )}
                  disabled={aiTarget === "tone" || !visualDescription.trim()}
                  title="Suggest emotional tone with AI"
                >
                  {aiTarget === "tone" ? (
                    <span className="ai-augment-spinner" />
                  ) : (
                    "✨"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Narration */}
          <div className="beat-editor-section">
            <label className="beat-editor-label">Narration</label>
            <div className="field-with-ai">
              <textarea
                className="beat-editor-textarea"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional narration text for this beat..."
                style={{ minHeight: "80px" }}
              />
              <div className="field-buttons">
                <button
                  type="button"
                  className="spice-btn"
                  onClick={() => handleSpice("narration", narration)}
                  disabled={spiceTarget === "narration" || !narration.trim()}
                  title="Make it nastier"
                  data-testid="spice-narration-btn"
                >
                  {spiceTarget === "narration" ? (
                    <span className="spice-spinner" />
                  ) : (
                    "🌶️"
                  )}
                </button>
                <button
                  type="button"
                  className="ai-augment-btn"
                  onClick={() => handleAiAugment(
                    "narration",
                    narration,
                    `Write a brief, evocative narration for a comic panel based on this scene: "${visualDescription}". Emotional tone: ${emotionalTone || "neutral"}. Keep it concise (1-2 sentences) and suitable for a caption box.`
                  )}
                  disabled={aiTarget === "narration" || !visualDescription.trim()}
                  title="Generate narration with AI"
                >
                  {aiTarget === "narration" ? (
                    <span className="ai-augment-spinner" />
                  ) : (
                    "✨"
                  )}
                </button>
              </div>
            </div>
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
