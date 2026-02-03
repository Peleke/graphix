/**
 * Beat Selector Component
 *
 * Allows selecting a story beat to use as a source for generating panel prompts.
 * Displays beat visual description, emotional tone, and camera angle.
 *
 * Automatically finds beats by looking up premises→stories→beats from projectId.
 */

import { useState, useMemo } from "react";
import { usePremises, useStories, useBeats } from "../../api/hooks/useStories";
import { useGeneratePromptFromBeat, type BeatPromptInput } from "../../api/hooks/useTextGeneration";
import type { Beat, CameraAngle, BeatType } from "../story-editor/beats/types";

interface BeatSelectorProps {
  /** Project ID to find beats from (looks up premises→stories→beats) */
  projectId: string | null;
  /** Optional direct story ID (skips premise lookup) */
  storyId?: string | null;
  /** Characters to include in prompt generation */
  characters?: Array<{
    name: string;
    description?: string;
    species?: string;
  }>;
  /** Model family for prompt optimization */
  modelFamily?: "pony" | "illustrious" | "flux" | "sdxl" | "sd15" | "realistic";
  /** Called when a prompt is generated from a beat */
  onPromptGenerated?: (positive: string, negative: string) => void;
  /** Called when beat selection changes */
  onBeatSelected?: (beat: Beat | null) => void;
}

const BEAT_TYPE_COLORS: Record<BeatType, string> = {
  setup: "#3b82f6",
  inciting: "#f59e0b",
  rising: "#10b981",
  midpoint: "#8b5cf6",
  complication: "#ef4444",
  crisis: "#dc2626",
  climax: "#c026d3",
  resolution: "#22c55e",
  denouement: "#6b7280",
};

const BEAT_TYPE_LABELS: Record<BeatType, string> = {
  setup: "Setup",
  inciting: "Inciting",
  rising: "Rising",
  midpoint: "Midpoint",
  complication: "Complication",
  crisis: "Crisis",
  climax: "Climax",
  resolution: "Resolution",
  denouement: "Denouement",
};

export function BeatSelector({
  projectId,
  storyId: directStoryId,
  characters,
  modelFamily = "pony",
  onPromptGenerated,
  onBeatSelected,
}: BeatSelectorProps) {
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Chain lookup: projectId → premises → stories → beats
  const { data: premises, isLoading: loadingPremises } = usePremises(directStoryId ? null : projectId);
  const firstPremiseId = useMemo(() => {
    if (directStoryId) return null;
    return premises && premises.length > 0 ? (premises[0] as { id: string }).id : null;
  }, [premises, directStoryId]);

  const { data: stories, isLoading: loadingStories } = useStories(directStoryId ? null : firstPremiseId);
  const firstStoryId = useMemo(() => {
    if (directStoryId) return directStoryId;
    return stories && stories.length > 0 ? (stories[0] as { id: string }).id : null;
  }, [stories, directStoryId]);

  const { data: beats, isLoading: loadingBeats } = useBeats(firstStoryId);
  const isLoading = loadingPremises || loadingStories || loadingBeats;
  const generatePrompt = useGeneratePromptFromBeat();

  const selectedBeat = beats?.find((b: Beat) => b.id === selectedBeatId);

  const handleSelectBeat = (beat: Beat) => {
    const newSelection = selectedBeatId === beat.id ? null : beat.id;
    setSelectedBeatId(newSelection);
    onBeatSelected?.(newSelection ? beat : null);
  };

  const handleGeneratePrompt = async () => {
    if (!selectedBeat) return;

    const input: BeatPromptInput = {
      visualDescription: selectedBeat.visualDescription,
      emotionalTone: selectedBeat.emotionalTone || undefined,
      cameraAngle: selectedBeat.cameraAngle as CameraAngle | undefined,
      characters,
      modelFamily,
    };

    try {
      const result = await generatePrompt.mutateAsync(input);
      onPromptGenerated?.(result.positive, result.negative);
    } catch (error) {
      console.error("Failed to generate prompt from beat:", error);
    }
  };

  if (!projectId && !directStoryId) {
    return (
      <div className="beat-selector-empty">
        <p>No project linked.</p>
        <p className="hint">Create a story with beats to generate prompts from narrative structure.</p>
      </div>
    );
  }

  return (
    <div className="beat-selector">
      <style>{`
        .beat-selector {
          border: 1px solid #3f3f46;
          border-radius: 8px;
          background: #1e1e22;
          overflow: hidden;
        }

        .beat-selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #27272a;
          cursor: pointer;
          user-select: none;
        }

        .beat-selector-header:hover {
          background: #303034;
        }

        .beat-selector-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #fafafa;
        }

        .beat-selector-badge {
          padding: 0.125rem 0.5rem;
          background: #8b5cf6;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .beat-selector-chevron {
          color: #71717a;
          transition: transform 0.2s ease;
        }

        .beat-selector-chevron.expanded {
          transform: rotate(180deg);
        }

        .beat-selector-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.2s ease;
        }

        .beat-selector-content.expanded {
          max-height: 400px;
          overflow-y: auto;
        }

        .beat-selector-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
        }

        .beat-selector-empty {
          padding: 1rem;
          text-align: center;
          color: #71717a;
          font-size: 0.875rem;
        }

        .beat-selector-empty .hint {
          font-size: 0.75rem;
          margin-top: 0.5rem;
          color: #52525b;
        }

        .beat-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #27272a;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-item:hover {
          background: #303034;
        }

        .beat-item.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        .beat-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .beat-type-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .beat-position {
          font-size: 0.7rem;
          color: #71717a;
        }

        .beat-description {
          font-size: 0.8rem;
          color: #d4d4d8;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .beat-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .beat-meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: #71717a;
        }

        .beat-selector-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid #3f3f46;
          background: #27272a;
        }

        .generate-btn {
          flex: 1;
          padding: 0.5rem 1rem;
          background: #8b5cf6;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .generate-btn:hover:not(:disabled) {
          background: #7c3aed;
        }

        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generate-btn .spinner {
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

        .loading-placeholder {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
        }

        .loading-item {
          height: 60px;
          background: linear-gradient(90deg, #27272a 0%, #3f3f46 50%, #27272a 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        className="beat-selector-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="beat-selector-title">
          <span>Generate from Beat</span>
          {beats && beats.length > 0 && (
            <span className="beat-selector-badge">{beats.length}</span>
          )}
        </div>
        <svg
          className={`beat-selector-chevron ${isExpanded ? "expanded" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={`beat-selector-content ${isExpanded ? "expanded" : ""}`}>
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="loading-item" />
            <div className="loading-item" />
            <div className="loading-item" />
          </div>
        ) : beats && beats.length > 0 ? (
          <>
            <div className="beat-selector-list">
              {(beats as Beat[]).map((beat) => (
                <div
                  key={beat.id}
                  className={`beat-item ${selectedBeatId === beat.id ? "selected" : ""}`}
                  onClick={() => handleSelectBeat(beat)}
                >
                  <div className="beat-item-header">
                    {beat.beatType && (
                      <span
                        className="beat-type-badge"
                        style={{
                          background: BEAT_TYPE_COLORS[beat.beatType] || "#6b7280",
                          color: "white",
                        }}
                      >
                        {BEAT_TYPE_LABELS[beat.beatType] || beat.beatType}
                      </span>
                    )}
                    <span className="beat-position">#{beat.position + 1}</span>
                  </div>

                  <div className="beat-description">{beat.visualDescription}</div>

                  <div className="beat-meta">
                    {beat.emotionalTone && (
                      <span className="beat-meta-item">
                        <span>🎭</span>
                        <span>{beat.emotionalTone}</span>
                      </span>
                    )}
                    {beat.cameraAngle && (
                      <span className="beat-meta-item">
                        <span>📷</span>
                        <span>{beat.cameraAngle}</span>
                      </span>
                    )}
                    {beat.narration && (
                      <span className="beat-meta-item">
                        <span>💬</span>
                        <span>Has narration</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="beat-selector-actions">
              <button
                className="generate-btn"
                onClick={handleGeneratePrompt}
                disabled={!selectedBeatId || generatePrompt.isPending}
              >
                {generatePrompt.isPending ? (
                  <>
                    <span className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate Prompt from Beat
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="beat-selector-empty">
            <p>No beats found in this story.</p>
            <p className="hint">Add beats in the Story Editor to generate prompts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
