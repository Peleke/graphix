/**
 * BeatCard Component
 *
 * Individual beat card displaying position, type, description, and actions.
 */

import type { Beat } from "./types";
import { BEAT_TYPE_LABELS } from "./types";
import { getBeatIcon } from "./beat-icons";

interface BeatCardProps {
  beat: Beat;
  onEdit: () => void;
  onDelete: () => void;
}

export function BeatCard({ beat, onEdit, onDelete }: BeatCardProps) {
  const truncatedDescription =
    beat.visualDescription.length > 100
      ? beat.visualDescription.slice(0, 100) + "..."
      : beat.visualDescription;

  const beatTypeLabel = beat.beatType ? BEAT_TYPE_LABELS[beat.beatType] : "General";
  const beatIcon = getBeatIcon(beat.beatType);

  return (
    <div className="beat-card" data-testid={`beat-card-${beat.id}`}>
      <style>{`
        .beat-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #18181b;
          border-radius: 8px;
          transition: background 0.15s ease;
        }

        .beat-card:hover {
          background: #1f1f23;
        }

        .beat-position {
          min-width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3f3f46;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a1a1aa;
        }

        .beat-content {
          flex: 1;
          min-width: 0;
        }

        .beat-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .beat-type-icon {
          font-size: 0.875rem;
        }

        .beat-type-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #8b5cf6;
        }

        .beat-panel-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.625rem;
          color: #22c55e;
          margin-left: auto;
        }

        .beat-panel-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
        }

        .beat-description {
          font-size: 0.875rem;
          color: #a1a1aa;
          line-height: 1.4;
        }

        .beat-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .beat-card:hover .beat-actions {
          opacity: 1;
        }

        .beat-action-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #71717a;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beat-action-btn:hover {
          background: #27272a;
          color: #fafafa;
        }

        .beat-action-btn.delete:hover {
          background: #7f1d1d;
          color: #fca5a5;
        }
      `}</style>

      <div className="beat-position">{beat.position}</div>

      <div className="beat-content">
        <div className="beat-header">
          <span className="beat-type-icon">{beatIcon}</span>
          <span className="beat-type-label">{beatTypeLabel}</span>
          {beat.panelId && (
            <span className="beat-panel-indicator">
              <span className="beat-panel-dot" />
              Linked
            </span>
          )}
        </div>
        <div className="beat-description">{truncatedDescription}</div>
      </div>

      <div className="beat-actions">
        <button
          className="beat-action-btn"
          onClick={onEdit}
          title="Edit beat"
          aria-label="Edit beat"
          data-testid={`beat-edit-${beat.id}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="beat-action-btn delete"
          onClick={onDelete}
          title="Delete beat"
          aria-label="Delete beat"
          data-testid={`beat-delete-${beat.id}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
