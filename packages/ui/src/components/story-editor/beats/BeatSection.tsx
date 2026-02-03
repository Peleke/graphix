/**
 * BeatSection Component
 *
 * Container for beat list with add/edit/delete functionality.
 */

import { useState, useCallback } from "react";
import { BeatCard } from "./BeatCard";
import { BeatEditor } from "./BeatEditor";
import type { Beat, CreateBeatInput, UpdateBeatInput } from "./types";
import { useCreateBeat, useUpdateBeat, useDeleteBeat } from "../../../api/hooks/useBeats";

interface BeatSectionProps {
  storyId: string;
  beats: Beat[];
  isLoading?: boolean;
}

export function BeatSection({ storyId, beats, isLoading = false }: BeatSectionProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [deletingBeatId, setDeletingBeatId] = useState<string | null>(null);

  const createBeat = useCreateBeat();
  const updateBeat = useUpdateBeat();
  const deleteBeat = useDeleteBeat();

  const handleAddBeat = useCallback(() => {
    setEditingBeat(null);
    setShowEditor(true);
  }, []);

  const handleEditBeat = useCallback((beat: Beat) => {
    setEditingBeat(beat);
    setShowEditor(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setEditingBeat(null);
  }, []);

  const handleSubmitBeat = useCallback(
    async (data: CreateBeatInput | UpdateBeatInput) => {
      try {
        if ("id" in data) {
          await updateBeat.mutateAsync({ ...data, storyId });
        } else {
          // Calculate position for new beat (next available position)
          const maxPosition = beats.length > 0
            ? Math.max(...beats.map((b) => b.position))
            : 0;
          await createBeat.mutateAsync({
            ...data,
            position: maxPosition + 1,
          });
        }
        handleCloseEditor();
      } catch (err) {
        console.error("Failed to save beat:", err);
      }
    },
    [storyId, beats, createBeat, updateBeat, handleCloseEditor]
  );

  const handleDeleteBeat = useCallback(
    async (beatId: string) => {
      try {
        await deleteBeat.mutateAsync({ id: beatId, storyId });
        setDeletingBeatId(null);
      } catch (err) {
        console.error("Failed to delete beat:", err);
      }
    },
    [storyId, deleteBeat]
  );

  const sortedBeats = [...beats].sort((a, b) => a.position - b.position);

  return (
    <div className="beat-section">
      <style>{`
        .beat-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #3f3f46;
        }

        .beat-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .beat-section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .beat-count {
          padding: 0.125rem 0.375rem;
          background: #3f3f46;
          border-radius: 4px;
          font-size: 0.625rem;
        }

        .beat-add-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-add-btn:hover {
          background: #27272a;
          color: #fafafa;
          border-color: #8b5cf6;
        }

        .beat-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .beat-empty {
          padding: 1.5rem;
          text-align: center;
          color: #71717a;
          font-size: 0.875rem;
        }

        .beat-loading {
          padding: 1rem;
          text-align: center;
          color: #71717a;
          font-size: 0.875rem;
        }

        .beat-delete-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .beat-delete-modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 1.5rem;
          width: 100%;
          max-width: 400px;
        }

        .beat-delete-title {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #fafafa;
        }

        .beat-delete-message {
          color: #a1a1aa;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .beat-delete-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .beat-delete-btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-delete-cancel {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .beat-delete-cancel:hover {
          background: #27272a;
          color: #fafafa;
        }

        .beat-delete-confirm {
          background: #dc2626;
          border: none;
          color: white;
        }

        .beat-delete-confirm:hover:not(:disabled) {
          background: #b91c1c;
        }

        .beat-delete-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="beat-section-header" data-testid="beat-section-header">
        <div className="beat-section-title">
          <span>BEATS</span>
          <span className="beat-count" data-testid="beat-count">{beats.length}</span>
        </div>
        <button className="beat-add-btn" onClick={handleAddBeat} data-testid="add-beat-btn">
          + Add Beat
        </button>
      </div>

      {isLoading ? (
        <div className="beat-loading" data-testid="beat-loading">Loading beats...</div>
      ) : sortedBeats.length > 0 ? (
        <div className="beat-list" data-testid="beat-list">
          {sortedBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              onEdit={() => handleEditBeat(beat)}
              onDelete={() => setDeletingBeatId(beat.id)}
            />
          ))}
        </div>
      ) : (
        <div className="beat-empty" data-testid="beat-empty-state">
          No beats yet. Click "+ Add Beat" to create your first story beat.
        </div>
      )}

      {/* Create/Edit Modal */}
      <BeatEditor
        isOpen={showEditor}
        onClose={handleCloseEditor}
        onSubmit={handleSubmitBeat}
        storyId={storyId}
        beat={editingBeat}
        isPending={createBeat.isPending || updateBeat.isPending}
      />

      {/* Delete Confirmation Modal */}
      {deletingBeatId && (
        <div
          className="beat-delete-overlay"
          onClick={(e) => e.target === e.currentTarget && setDeletingBeatId(null)}
          data-testid="beat-delete-modal"
        >
          <div className="beat-delete-modal">
            <h3 className="beat-delete-title">Delete Beat</h3>
            <p className="beat-delete-message">
              Are you sure you want to delete this beat? This action cannot be undone.
            </p>
            <div className="beat-delete-actions">
              <button
                className="beat-delete-btn beat-delete-cancel"
                onClick={() => setDeletingBeatId(null)}
                data-testid="beat-delete-cancel"
              >
                Cancel
              </button>
              <button
                className="beat-delete-btn beat-delete-confirm"
                onClick={() => handleDeleteBeat(deletingBeatId)}
                disabled={deleteBeat.isPending}
                data-testid="beat-delete-confirm"
              >
                {deleteBeat.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
