/**
 * Caption List Modal Component
 *
 * Modal for viewing, editing, and managing all captions for a panel.
 * Includes quick edit, reorder, and generation controls.
 */

import { useState, useCallback } from "react";
import {
  useCaptionsByPanel,
  useCreateCaption,
  useUpdateCaption,
  useDeleteCaption,
  useGenerateCaptions,
  useSuggestCaptions,
  type SuggestedCaption,
} from "../../api/hooks/useCaptions";
import { CaptionEditor, type Caption, type Character } from "./CaptionEditor";
import type { TipTapContent, CaptionType } from "../rich-text/types";

interface CaptionListModalProps {
  /** Panel ID to show captions for */
  panelId: string;
  /** Panel image URL for preview */
  panelImageUrl?: string | null;
  /** Available characters */
  characters?: Character[];
  /** Whether panel has a linked beat */
  hasBeat?: boolean;
  /** Panel description (for AI suggestions) */
  panelDescription?: string;
  /** Called when modal should close */
  onClose: () => void;
}

interface GenerationOptions {
  includeDialogue: boolean;
  includeNarration: boolean;
  includeSfx: boolean;
}

export function CaptionListModal({
  panelId,
  panelImageUrl,
  characters = [],
  hasBeat = false,
  panelDescription = "",
  onClose,
}: CaptionListModalProps) {
  const [editingCaption, setEditingCaption] = useState<Caption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showGenerateOptions, setShowGenerateOptions] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    includeDialogue: true,
    includeNarration: true,
    includeSfx: true,
  });
  const [suggestions, setSuggestions] = useState<SuggestedCaption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: captions = [], isLoading, refetch } = useCaptionsByPanel(panelId);
  const createCaption = useCreateCaption();
  const updateCaption = useUpdateCaption();
  const deleteCaption = useDeleteCaption();
  const generateCaptions = useGenerateCaptions();
  const suggestCaptions = useSuggestCaptions();

  const handleCreate = useCallback(
    async (data: {
      type: CaptionType;
      text: string;
      richText?: TipTapContent;
      characterId?: string | null;
      position: { x: number; y: number };
      tailDirection?: { x: number; y: number } | null;
      style?: Record<string, unknown>;
    }) => {
      try {
        await createCaption.mutateAsync({
          panelId,
          type: data.type,
          text: data.text,
          x: data.position.x,
          y: data.position.y,
          tailX: data.tailDirection?.x,
          tailY: data.tailDirection?.y,
          characterId: data.characterId || undefined,
          style: data.style,
        });
        setIsCreating(false);
        refetch();
      } catch (error) {
        console.error("Failed to create caption:", error);
      }
    },
    [panelId, createCaption, refetch]
  );

  const handleUpdate = useCallback(
    async (data: {
      type: CaptionType;
      text: string;
      richText?: TipTapContent;
      characterId?: string | null;
      position: { x: number; y: number };
      tailDirection?: { x: number; y: number } | null;
      style?: Record<string, unknown>;
    }) => {
      if (!editingCaption) return;

      try {
        await updateCaption.mutateAsync({
          id: editingCaption.id,
          text: data.text,
          x: data.position.x,
          y: data.position.y,
          tailX: data.tailDirection?.x,
          tailY: data.tailDirection?.y,
          style: data.style,
        });
        setEditingCaption(null);
        refetch();
      } catch (error) {
        console.error("Failed to update caption:", error);
      }
    },
    [editingCaption, updateCaption, refetch]
  );

  const handleDelete = useCallback(
    async (captionId: string) => {
      if (!confirm("Delete this caption?")) return;

      try {
        await deleteCaption.mutateAsync({ id: captionId, panelId });
        refetch();
      } catch (error) {
        console.error("Failed to delete caption:", error);
      }
    },
    [panelId, deleteCaption, refetch]
  );

  const handleGenerate = useCallback(async () => {
    try {
      await generateCaptions.mutateAsync({
        panelId,
        includeDialogue: generationOptions.includeDialogue,
        includeNarration: generationOptions.includeNarration,
        includeSfx: generationOptions.includeSfx,
      });
      setShowGenerateOptions(false);
      refetch();
    } catch (error) {
      console.error("Failed to generate captions:", error);
    }
  }, [panelId, generateCaptions, generationOptions, refetch]);

  const handleSuggest = useCallback(async () => {
    if (!panelDescription) return;

    try {
      const result = await suggestCaptions.mutateAsync({
        visualDescription: panelDescription,
      });
      setSuggestions(result.captions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Failed to suggest captions:", error);
    }
  }, [panelDescription, suggestCaptions]);

  const handleAcceptSuggestion = useCallback(
    async (suggestion: SuggestedCaption) => {
      try {
        await createCaption.mutateAsync({
          panelId,
          type: suggestion.type,
          text: suggestion.text,
          x: 50, // Default center position
          y: suggestion.type === "narration" ? 10 : 50,
        });
        // Remove accepted suggestion
        setSuggestions((prev) => prev.filter((s) => s !== suggestion));
        refetch();
      } catch (error) {
        console.error("Failed to accept suggestion:", error);
      }
    },
    [panelId, createCaption, refetch]
  );

  const handleRejectSuggestion = useCallback((suggestion: SuggestedCaption) => {
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  }, []);

  const handleAcceptAllSuggestions = useCallback(async () => {
    for (const suggestion of suggestions) {
      await handleAcceptSuggestion(suggestion);
    }
    setShowSuggestions(false);
  }, [suggestions, handleAcceptSuggestion]);

  const handleRejectAllSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const getCaptionTypeColor = (type: CaptionType) => {
    switch (type) {
      case "speech":
        return "#3b82f6";
      case "thought":
        return "#8b5cf6";
      case "narration":
        return "#eab308";
      case "sfx":
        return "#ef4444";
      case "whisper":
        return "#71717a";
      default:
        return "#71717a";
    }
  };

  const getCharacterName = (charId: string | null | undefined) => {
    if (!charId) return null;
    const char = characters.find((c) => c.id === charId);
    return char?.name || null;
  };

  // Show editor if creating or editing
  if (isCreating || editingCaption) {
    return (
      <div className="caption-list-modal" data-testid="caption-list-modal">
        <style>{modalStyles}</style>
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {isCreating ? "Add Caption" : "Edit Caption"}
              </h2>
              <button
                className="modal-close"
                onClick={() => {
                  setIsCreating(false);
                  setEditingCaption(null);
                }}
                data-testid="modal-close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <CaptionEditor
                caption={editingCaption}
                panelId={panelId}
                characters={characters}
                onSave={isCreating ? handleCreate : handleUpdate}
                onCancel={() => {
                  setIsCreating(false);
                  setEditingCaption(null);
                }}
                isLoading={createCaption.isPending || updateCaption.isPending}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="caption-list-modal" data-testid="caption-list-modal">
      <style>{modalStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Panel Captions</h2>
            <button className="modal-close" onClick={onClose} data-testid="modal-close">
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="caption-layout">
              {/* Preview Panel */}
              <div className="preview-panel">
                <div className="preview-image">
                  {panelImageUrl ? (
                    <img src={panelImageUrl} alt="Panel" />
                  ) : (
                    <div className="no-image">No image</div>
                  )}
                  {/* Caption overlay preview */}
                  {(captions as Caption[]).map((caption) => (
                    <div
                      key={caption.id}
                      className="caption-preview"
                      style={{
                        left: `${caption.position.x}%`,
                        top: `${caption.position.y}%`,
                        borderColor: getCaptionTypeColor(caption.type),
                      }}
                      data-testid={`caption-preview-${caption.id}`}
                    >
                      {caption.text.substring(0, 30)}
                      {caption.text.length > 30 && "..."}
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption List */}
              <div className="caption-list">
                <div className="list-header">
                  <span className="list-title">
                    {(captions as Caption[]).length} Caption
                    {(captions as Caption[]).length !== 1 && "s"}
                  </span>
                  <div className="list-actions">
                    {panelDescription && (
                      <button
                        className="btn-suggest"
                        onClick={handleSuggest}
                        disabled={suggestCaptions.isPending}
                        data-testid="ai-suggest"
                      >
                        {suggestCaptions.isPending ? (
                          <>
                            <span className="spinner" /> Suggesting...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                            AI Suggest
                          </>
                        )}
                      </button>
                    )}
                    {hasBeat && (
                      <button
                        className="btn-generate"
                        onClick={() => setShowGenerateOptions(true)}
                        disabled={generateCaptions.isPending}
                        data-testid="generate-from-beat"
                      >
                        {generateCaptions.isPending ? "Generating..." : "From Beat"}
                      </button>
                    )}
                    <button
                      className="btn-add"
                      onClick={() => setIsCreating(true)}
                      data-testid="add-caption"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="loading-state">Loading captions...</div>
                ) : (captions as Caption[]).length === 0 ? (
                  <div className="empty-state">
                    <p>No captions yet</p>
                    <p className="hint">
                      {hasBeat
                        ? 'Click "Generate from Beat" or add captions manually.'
                        : "Click \"Add Caption\" to create your first caption."}
                    </p>
                  </div>
                ) : (
                  <div className="caption-items">
                    {(captions as Caption[]).map((caption, index) => (
                      <div
                        key={caption.id}
                        className="caption-item"
                        data-testid={`caption-item-${caption.id}`}
                      >
                        <div className="caption-order">{index + 1}</div>
                        <div
                          className="caption-type-badge"
                          style={{ backgroundColor: getCaptionTypeColor(caption.type) }}
                        >
                          {caption.type}
                        </div>
                        <div className="caption-content">
                          <div className="caption-text">{caption.text}</div>
                          {caption.characterId && (
                            <div className="caption-character">
                              {getCharacterName(caption.characterId)}
                            </div>
                          )}
                        </div>
                        <div className="caption-actions">
                          <button
                            className="action-btn edit"
                            onClick={() => setEditingCaption(caption)}
                            title="Edit caption"
                            data-testid={`edit-caption-${caption.id}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(caption.id)}
                            title="Delete caption"
                            data-testid={`delete-caption-${caption.id}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions Panel */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-panel" data-testid="suggestions-panel">
                <div className="suggestions-header">
                  <span className="suggestions-title">
                    AI Suggestions ({suggestions.length})
                  </span>
                  <div className="suggestions-actions">
                    <button
                      className="btn-accept-all"
                      onClick={handleAcceptAllSuggestions}
                      data-testid="accept-all-suggestions"
                    >
                      Accept All
                    </button>
                    <button
                      className="btn-reject-all"
                      onClick={handleRejectAllSuggestions}
                      data-testid="reject-all-suggestions"
                    >
                      Reject All
                    </button>
                  </div>
                </div>
                <div className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      data-testid={`suggestion-${index}`}
                    >
                      <div
                        className="suggestion-type-badge"
                        style={{ backgroundColor: getCaptionTypeColor(suggestion.type) }}
                      >
                        {suggestion.type}
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-text">{suggestion.text}</div>
                        {suggestion.speakerDescription && (
                          <div className="suggestion-speaker">
                            {suggestion.speakerDescription}
                          </div>
                        )}
                        <div className="suggestion-confidence">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </div>
                      </div>
                      <div className="suggestion-actions">
                        <button
                          className="action-btn accept"
                          onClick={() => handleAcceptSuggestion(suggestion)}
                          title="Accept"
                          data-testid={`accept-suggestion-${index}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleRejectSuggestion(suggestion)}
                          title="Reject"
                          data-testid={`reject-suggestion-${index}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generation Options Modal */}
      {showGenerateOptions && (
        <div className="options-overlay" onClick={() => setShowGenerateOptions(false)} data-testid="generate-options-modal">
          <div className="options-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="options-title">Generate Captions</h3>
            <p className="options-desc">Select what to include from the linked beat:</p>

            <div className="options-list">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={generationOptions.includeDialogue}
                  onChange={(e) =>
                    setGenerationOptions((prev) => ({
                      ...prev,
                      includeDialogue: e.target.checked,
                    }))
                  }
                  data-testid="option-dialogue"
                />
                <span className="option-label">Dialogue (speech bubbles)</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={generationOptions.includeNarration}
                  onChange={(e) =>
                    setGenerationOptions((prev) => ({
                      ...prev,
                      includeNarration: e.target.checked,
                    }))
                  }
                  data-testid="option-narration"
                />
                <span className="option-label">Narration (caption boxes)</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={generationOptions.includeSfx}
                  onChange={(e) =>
                    setGenerationOptions((prev) => ({
                      ...prev,
                      includeSfx: e.target.checked,
                    }))
                  }
                  data-testid="option-sfx"
                />
                <span className="option-label">Sound Effects (SFX)</span>
              </label>
            </div>

            <div className="options-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowGenerateOptions(false)}
              >
                Cancel
              </button>
              <button
                className="btn-generate-confirm"
                onClick={handleGenerate}
                disabled={
                  generateCaptions.isPending ||
                  (!generationOptions.includeDialogue &&
                    !generationOptions.includeNarration &&
                    !generationOptions.includeSfx)
                }
                data-testid="confirm-generate"
              >
                {generateCaptions.isPending ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = `
  .caption-list-modal .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .caption-list-modal .modal-content {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  }

  .caption-list-modal .modal-content.large {
    max-width: 900px;
  }

  .caption-list-modal .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #27272a;
    background: #0f0f10;
  }

  .caption-list-modal .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fafafa;
    margin: 0;
  }

  .caption-list-modal .modal-close {
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    color: #71717a;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .caption-list-modal .modal-close:hover {
    background: #27272a;
    color: #fafafa;
  }

  .caption-list-modal .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .caption-layout {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1rem;
    min-height: 400px;
  }

  @media (max-width: 768px) {
    .caption-layout {
      grid-template-columns: 1fr;
    }
  }

  .preview-panel {
    background: #0f0f10;
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-image {
    position: relative;
    aspect-ratio: 3/4;
    background: #27272a;
  }

  .preview-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-image .no-image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #52525b;
    font-size: 0.875rem;
  }

  .caption-preview {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.75);
    border: 2px solid;
    border-radius: 4px;
    font-size: 0.625rem;
    color: white;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  .caption-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .list-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #a1a1aa;
  }

  .list-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add,
  .btn-generate {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-add {
    background: #8b5cf6;
    border: none;
    color: white;
  }

  .btn-add:hover {
    background: #7c3aed;
  }

  .btn-generate {
    background: transparent;
    border: 1px solid #3f3f46;
    color: #a1a1aa;
  }

  .btn-generate:hover:not(:disabled) {
    background: #27272a;
    color: #fafafa;
  }

  .btn-generate:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #71717a;
    text-align: center;
  }

  .empty-state .hint {
    font-size: 0.8125rem;
    margin-top: 0.5rem;
    color: #52525b;
  }

  .caption-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .caption-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #27272a;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .caption-item:hover {
    background: #3f3f46;
  }

  .caption-order {
    width: 24px;
    height: 24px;
    background: #3f3f46;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #a1a1aa;
    flex-shrink: 0;
  }

  .caption-type-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: white;
    flex-shrink: 0;
  }

  .caption-content {
    flex: 1;
    min-width: 0;
  }

  .caption-text {
    font-size: 0.875rem;
    color: #fafafa;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .caption-character {
    font-size: 0.75rem;
    color: #71717a;
    margin-top: 0.25rem;
  }

  .caption-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    color: #71717a;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #3f3f46;
    color: #fafafa;
  }

  .action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .action-btn.accept:hover {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .action-btn.reject:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  /* AI Suggest Button */
  .btn-suggest {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-suggest:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .btn-suggest:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Spinner */
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Suggestions Panel */
  .suggestions-panel {
    margin-top: 1rem;
    padding: 1rem;
    background: #1e1b4b;
    border: 1px solid #6366f1;
    border-radius: 8px;
  }

  .suggestions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .suggestions-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #a5b4fc;
  }

  .suggestions-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-accept-all,
  .btn-reject-all {
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-accept-all {
    background: #22c55e;
    border: none;
    color: white;
  }

  .btn-accept-all:hover {
    background: #16a34a;
  }

  .btn-reject-all {
    background: transparent;
    border: 1px solid #4b5563;
    color: #9ca3af;
  }

  .btn-reject-all:hover {
    background: #374151;
    color: #fafafa;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suggestion-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 6px;
    transition: all 0.15s;
  }

  .suggestion-item:hover {
    background: rgba(99, 102, 241, 0.2);
  }

  .suggestion-type-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: white;
    flex-shrink: 0;
  }

  .suggestion-content {
    flex: 1;
    min-width: 0;
  }

  .suggestion-text {
    font-size: 0.875rem;
    color: #fafafa;
    line-height: 1.4;
    margin-bottom: 0.25rem;
  }

  .suggestion-speaker {
    font-size: 0.75rem;
    color: #a5b4fc;
  }

  .suggestion-confidence {
    font-size: 0.625rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .suggestion-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  /* Generation Options Modal */
  .options-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .options-modal {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 1.5rem;
    width: 100%;
    max-width: 320px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .options-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fafafa;
    margin: 0 0 0.5rem;
  }

  .options-desc {
    font-size: 0.8125rem;
    color: #71717a;
    margin: 0 0 1rem;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .option-item:hover {
    background: #27272a;
  }

  .option-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
  }

  .option-label {
    font-size: 0.875rem;
    color: #fafafa;
  }

  .options-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    color: #a1a1aa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #27272a;
    color: #fafafa;
  }

  .btn-generate-confirm {
    padding: 0.5rem 1rem;
    background: #8b5cf6;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-generate-confirm:hover:not(:disabled) {
    background: #7c3aed;
  }

  .btn-generate-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
