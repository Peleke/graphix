/**
 * CharacterCard Component
 *
 * Compact card displaying character thumbnail, name, species,
 * and quick action buttons.
 */

import React, { useCallback } from 'react';
import type { CharacterCardProps, CharacterAction } from './types';

// ============================================================================
// Icons
// ============================================================================

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6z"/>
    <path d="M2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

// ============================================================================
// Styles (inline to avoid broken Panda CSS)
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 14px',
    marginBottom: '8px',
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  containerHover: {
    backgroundColor: '#262637',
    borderColor: '#8b5cf6',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
  } as React.CSSProperties,

  containerSelected: {
    backgroundColor: '#2d2b55',
    borderColor: '#8b5cf6',
    boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3)',
  } as React.CSSProperties,

  thumbnail: {
    flexShrink: 0,
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: '2px solid #45475a',
  } as React.CSSProperties,

  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '8px',
  } as React.CSSProperties,

  content: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#cdd6f4',
    marginBottom: '3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#a6adc8',
  } as React.CSSProperties,

  species: {
    textTransform: 'capitalize',
    backgroundColor: '#313244',
    padding: '2px 8px',
    borderRadius: '4px',
  } as React.CSSProperties,

  speciesHint: {
    color: '#6c7086',
    fontStyle: 'italic',
  } as React.CSSProperties,

  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,

  badge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 600,
    borderRadius: '4px',
    backgroundColor: '#313244',
    color: '#a6adc8',
  } as React.CSSProperties,

  badgeLora: {
    backgroundColor: 'rgba(250, 179, 135, 0.15)',
    color: '#fab387',
  } as React.CSSProperties,

  badgeRefs: {
    backgroundColor: 'rgba(137, 180, 250, 0.15)',
    color: '#89b4fa',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,

  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    backgroundColor: '#313244',
    border: 'none',
    color: '#a6adc8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  actionButtonHover: {
    backgroundColor: '#45475a',
    color: '#cdd6f4',
    transform: 'scale(1.05)',
  } as React.CSSProperties,

  actionButtonDangerHover: {
    backgroundColor: 'rgba(243, 139, 168, 0.2)',
    color: '#f38ba8',
  } as React.CSSProperties,
};

// ============================================================================
// Component
// ============================================================================

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected = false,
  compact = false,
  onClick,
  onAction,
  draggable = false,
  className,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  // Handle click - open editor directly for better UX
  const handleClick = useCallback(() => {
    onClick?.(character);
    // Also trigger edit on single click for easier access
    onAction?.({ type: 'edit', characterId: character.id });
  }, [character, onClick, onAction]);

  // Handle action button clicks
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.({ type: 'edit', characterId: character.id });
  }, [character.id, onAction]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.({ type: 'duplicate', characterId: character.id });
  }, [character.id, onAction]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.({ type: 'delete', characterId: character.id });
  }, [character.id, onAction]);

  // Compute container style
  const containerStyle: React.CSSProperties = {
    ...styles.container,
    ...(isHovered && !isSelected ? styles.containerHover : {}),
    ...(isSelected ? styles.containerSelected : {}),
    ...(compact ? { padding: '8px 10px', gap: '10px' } : {}),
  };

  // Compute thumbnail style
  const thumbnailStyle: React.CSSProperties = {
    ...styles.thumbnail,
    ...(compact ? { width: '36px', height: '36px', fontSize: '14px' } : {}),
  };

  const hasValidSpecies = character.profile.species && character.profile.species !== 'unknown';

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${character.name} character`}
      data-testid={`character-card-${character.id}`}
    >
      {/* Thumbnail */}
      <div style={thumbnailStyle}>
        {character.thumbnailPath ? (
          <img
            src={character.thumbnailPath}
            alt={character.name}
            style={styles.thumbnailImage}
          />
        ) : (
          character.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.name}>{character.name}</div>
        <div style={styles.meta}>
          {hasValidSpecies ? (
            <span style={styles.species}>{character.profile.species}</span>
          ) : (
            <span style={{ ...styles.species, ...styles.speciesHint }}>
              Click to edit
            </span>
          )}
          <div style={styles.badges}>
            {character.lora && (
              <span style={{ ...styles.badge, ...styles.badgeLora }}>
                LoRA
              </span>
            )}
            {character.referenceImages.length > 0 && (
              <span style={{ ...styles.badge, ...styles.badgeRefs }}>
                {character.referenceImages.length} ref{character.referenceImages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!compact && (
        <div style={styles.actions}>
          <button
            style={{
              ...styles.actionButton,
              ...(hoveredButton === 'edit' ? styles.actionButtonHover : {}),
            }}
            onClick={handleEdit}
            onMouseEnter={() => setHoveredButton('edit')}
            onMouseLeave={() => setHoveredButton(null)}
            aria-label="Edit character"
            title="Edit"
            data-testid="character-edit-button"
          >
            <EditIcon />
          </button>
          <button
            style={{
              ...styles.actionButton,
              ...(hoveredButton === 'duplicate' ? styles.actionButtonHover : {}),
            }}
            onClick={handleDuplicate}
            onMouseEnter={() => setHoveredButton('duplicate')}
            onMouseLeave={() => setHoveredButton(null)}
            aria-label="Duplicate character"
            title="Duplicate"
            data-testid="character-duplicate-button"
          >
            <CopyIcon />
          </button>
          <button
            style={{
              ...styles.actionButton,
              ...(hoveredButton === 'delete' ? styles.actionButtonDangerHover : {}),
            }}
            onClick={handleDelete}
            onMouseEnter={() => setHoveredButton('delete')}
            onMouseLeave={() => setHoveredButton(null)}
            aria-label="Delete character"
            title="Delete"
            data-testid="character-delete-button"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
};
