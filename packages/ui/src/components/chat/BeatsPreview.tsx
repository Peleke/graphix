/**
 * BeatsPreview Component
 *
 * Displays extracted story beats organized by act before project creation.
 * Shows visual descriptions, characters involved, and emotional tones.
 */

import { useMemo } from 'react';
import type { ExtractedBeat, ExtractedCharacter, ExtractedStoryArc } from '../../api/hooks/useChat';

// =============================================================================
// Types
// =============================================================================

interface BeatsPreviewProps {
  arc: ExtractedStoryArc;
  characters: ExtractedCharacter[];
  name: string;
  onConfirm: () => void;
  onEdit?: () => void;
  isCreating?: boolean;
}

interface BeatCardProps {
  beat: ExtractedBeat;
  index: number;
  characters: ExtractedCharacter[];
}

// =============================================================================
// Beat Card Component
// =============================================================================

function BeatCard({ beat, index, characters }: BeatCardProps) {
  // Find character details for involved characters
  const involvedCharacterDetails = useMemo(() => {
    return beat.involvedCharacters.map(name =>
      characters.find(c => c.name === name) || { name, role: 'supporting' as const }
    );
  }, [beat.involvedCharacters, characters]);

  const typeColors: Record<string, string> = {
    setup: '#22c55e',
    inciting_incident: '#f97316',
    rising_action: '#3b82f6',
    midpoint: '#8b5cf6',
    complication: '#ef4444',
    crisis: '#dc2626',
    climax: '#fbbf24',
    resolution: '#10b981',
    denouement: '#6366f1',
  };

  const typeColor = typeColors[beat.type] || '#71717a';

  return (
    <div className="beat-card" data-testid={`beat-card-${index}`}>
      <style>{`
        .beat-card {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .beat-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .beat-number {
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
        }

        .beat-type {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
        }

        .beat-tone {
          margin-left: auto;
          font-size: 0.75rem;
          color: #71717a;
        }

        .beat-summary {
          font-size: 0.875rem;
          font-weight: 500;
          color: #fafafa;
          line-height: 1.4;
        }

        .beat-visual {
          font-size: 0.8125rem;
          color: #a1a1aa;
          line-height: 1.5;
          border-left: 2px solid #3f3f46;
          padding-left: 0.75rem;
          font-style: italic;
        }

        .beat-characters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .beat-character {
          font-size: 0.6875rem;
          padding: 0.125rem 0.5rem;
          background: #3f3f46;
          border-radius: 9999px;
          color: #d4d4d8;
        }

        .beat-character.protagonist {
          background: rgba(139, 92, 246, 0.3);
          color: #a78bfa;
        }

        .beat-character.antagonist {
          background: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .beat-camera {
          font-size: 0.6875rem;
          color: #52525b;
        }
      `}</style>

      <div className="beat-header">
        <div className="beat-number">{index + 1}</div>
        <div className="beat-type" style={{ color: typeColor }}>
          {beat.type.replace(/_/g, ' ')}
        </div>
        <div className="beat-tone">{beat.emotionalTone}</div>
      </div>

      <div className="beat-summary">{beat.summary}</div>

      <div className="beat-visual">{beat.visualDescription}</div>

      <div className="beat-characters">
        {involvedCharacterDetails.map((char, i) => (
          <span
            key={i}
            className={`beat-character ${char.role}`}
          >
            {char.name}
          </span>
        ))}
      </div>

      {beat.cameraAngle && (
        <div className="beat-camera">Camera: {beat.cameraAngle}</div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BeatsPreview({
  arc,
  characters,
  name,
  onConfirm,
  onEdit,
  isCreating = false,
}: BeatsPreviewProps) {
  // Group beats by act
  const beatsByAct = useMemo(() => {
    const groups: Record<number, ExtractedBeat[]> = {};
    arc.beats.forEach(beat => {
      const actIndex = beat.actIndex;
      if (!groups[actIndex]) {
        groups[actIndex] = [];
      }
      groups[actIndex].push(beat);
    });
    return groups;
  }, [arc.beats]);

  return (
    <div className="beats-preview" data-testid="beats-preview">
      <style>{`
        .beats-preview {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .beats-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .beats-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
        }

        .beats-subtitle {
          font-size: 0.875rem;
          color: #71717a;
          margin: 0;
        }

        .beats-premise {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 1rem;
        }

        .premise-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #8b5cf6;
          margin-bottom: 0.5rem;
        }

        .premise-logline {
          font-size: 0.9375rem;
          color: #fafafa;
          line-height: 1.5;
          margin: 0;
        }

        .premise-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }

        .premise-tag {
          font-size: 0.75rem;
          color: #a1a1aa;
        }

        .premise-tag span {
          color: #d4d4d8;
          font-weight: 500;
        }

        .beats-structure {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #71717a;
          font-size: 0.8125rem;
        }

        .structure-badge {
          padding: 0.25rem 0.625rem;
          background: #3f3f46;
          border-radius: 4px;
          font-weight: 500;
          color: #d4d4d8;
        }

        .act-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .act-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #d4d4d8;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #27272a;
        }

        .act-beats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .beats-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 0.5rem;
        }

        .beats-action-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .beats-action-btn.primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: none;
          color: white;
        }

        .beats-action-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .beats-action-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .beats-action-btn.secondary {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .beats-action-btn.secondary:hover {
          border-color: #52525b;
          color: #fafafa;
        }

        .creating-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="beats-header">
        <h3 className="beats-title">{name}</h3>
        <p className="beats-subtitle">
          {arc.beats.length} beats across {arc.acts.length} acts
        </p>
      </div>

      <div className="beats-premise">
        <div className="premise-label">Premise</div>
        <p className="premise-logline">{arc.premise.logline}</p>
        <div className="premise-meta">
          <span className="premise-tag">Genre: <span>{arc.premise.genre}</span></span>
          <span className="premise-tag">Tone: <span>{arc.premise.tone}</span></span>
          {arc.premise.themes.length > 0 && (
            <span className="premise-tag">Themes: <span>{arc.premise.themes.join(', ')}</span></span>
          )}
        </div>
      </div>

      <div className="beats-structure">
        Structure: <span className="structure-badge">{arc.structure.replace('-', ' ')}</span>
      </div>

      {arc.acts.map((actName, actIndex) => (
        <div key={actIndex} className="act-section" data-testid={`act-section-${actIndex}`}>
          <div className="act-title">{actName}</div>
          <div className="act-beats">
            {(beatsByAct[actIndex] || []).map((beat, i) => (
              <BeatCard
                key={i}
                beat={beat}
                index={arc.beats.findIndex(b => b === beat)}
                characters={characters}
              />
            ))}
            {(!beatsByAct[actIndex] || beatsByAct[actIndex].length === 0) && (
              <div style={{ color: '#52525b', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                No beats in this act
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="beats-actions">
        {onEdit && (
          <button
            className="beats-action-btn secondary"
            onClick={onEdit}
            disabled={isCreating}
            type="button"
          >
            Edit Story
          </button>
        )}
        <button
          className="beats-action-btn primary"
          onClick={onConfirm}
          disabled={isCreating}
          type="button"
          data-testid="create-project-button"
        >
          {isCreating ? (
            <span className="creating-indicator">
              <span className="spinner" />
              Creating...
            </span>
          ) : (
            'Create Project'
          )}
        </button>
      </div>
    </div>
  );
}
