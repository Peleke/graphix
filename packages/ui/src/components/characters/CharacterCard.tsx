/**
 * CharacterCard Component
 * 
 * Compact card displaying character thumbnail, name, species,
 * and quick action buttons. ARRR! 🏴‍☠️
 */

import React, { useCallback } from 'react';
import type { CharacterCardProps, CharacterAction } from './types';
import { css } from '../../../styled-system/css';

// ============================================================================
// Styles
// ============================================================================

const cardStyles = {
  container: css({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    marginBottom: '4px',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
      backgroundColor: 'slate.800',
      borderColor: 'slate.700',
    },
  }),
  
  containerSelected: css({
    backgroundColor: 'violet.950/50',
    borderColor: 'violet.600/50',
    _hover: {
      backgroundColor: 'violet.950/60',
      borderColor: 'violet.500/60',
    },
  }),
  
  containerCompact: css({
    padding: '6px 10px',
    gap: '8px',
  }),
  
  thumbnail: css({
    flexShrink: 0,
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    backgroundColor: 'slate.700',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '1px solid',
    borderColor: 'slate.600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'slate.500',
    fontSize: '16px',
    overflow: 'hidden',
  }),
  
  thumbnailCompact: css({
    width: '32px',
    height: '32px',
    borderRadius: '6px',
  }),
  
  thumbnailImage: css({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }),
  
  content: css({
    flex: 1,
    minWidth: 0,
  }),
  
  name: css({
    fontSize: '13px',
    fontWeight: '500',
    color: 'slate.100',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  
  meta: css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'slate.500',
  }),
  
  species: css({
    textTransform: 'capitalize',
  }),
  
  badges: css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),
  
  badge: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 4px',
    fontSize: '10px',
    fontWeight: '500',
    borderRadius: '4px',
    backgroundColor: 'slate.700',
    color: 'slate.400',
  }),
  
  badgeLora: css({
    backgroundColor: 'amber.900/50',
    color: 'amber.400',
  }),
  
  badgeRefs: css({
    backgroundColor: 'sky.900/50',
    color: 'sky.400',
  }),
  
  actions: css({
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    opacity: 1,
    transition: 'opacity 0.15s ease',
    visibility: 'visible',
    pointerEvents: 'auto',
  }),
  
  actionsVisible: css({
    opacity: 1,
  }),
  
  actionButton: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'slate.500',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    _hover: {
      backgroundColor: 'slate.700',
      color: 'slate.300',
    },
  }),
  
  actionButtonDanger: css({
    _hover: {
      backgroundColor: 'red.900/50',
      color: 'red.400',
    },
  }),
};

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

const UserPlaceholderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

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
  // Handle click
  const handleClick = useCallback(() => {
    onClick?.(character);
  }, [character, onClick]);
  
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

  const handleDoubleClick = useCallback(() => {
    onAction?.({ type: 'edit', characterId: character.id });
  }, [character.id, onAction]);
  
  // Get thumbnail initial
  const getInitial = () => {
    return character.name.charAt(0).toUpperCase();
  };
  
  // Build container classes
  const containerClasses = [
    cardStyles.container,
    isSelected && cardStyles.containerSelected,
    compact && cardStyles.containerCompact,
    className,
  ].filter(Boolean).join(' ');
  
  const thumbnailClasses = [
    cardStyles.thumbnail,
    compact && cardStyles.thumbnailCompact,
  ].filter(Boolean).join(' ');
  
  const actionsClasses = [
    cardStyles.actions,
    (isSelected || !compact) && cardStyles.actionsVisible,
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={containerClasses}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      draggable={draggable}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${character.name} character`}
      data-testid={`character-card-${character.id}`}
    >
      {/* Thumbnail */}
      <div className={thumbnailClasses}>
        {character.thumbnailPath ? (
          <img 
            src={character.thumbnailPath} 
            alt={character.name}
            className={cardStyles.thumbnailImage}
          />
        ) : (
          <UserPlaceholderIcon />
        )}
      </div>
      
      {/* Content */}
      <div className={cardStyles.content}>
        <div className={cardStyles.name}>{character.name}</div>
        <div className={cardStyles.meta}>
          {character.profile.species && (
            <span className={cardStyles.species}>{character.profile.species}</span>
          )}
          <div className={cardStyles.badges}>
            {character.lora && (
              <span className={`${cardStyles.badge} ${cardStyles.badgeLora}`}>
                LoRA
              </span>
            )}
            {character.referenceImages.length > 0 && (
              <span className={`${cardStyles.badge} ${cardStyles.badgeRefs}`}>
                {character.referenceImages.length} ref{character.referenceImages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      {!compact && (
        <div
          className={actionsClasses}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            opacity: 1,
            visibility: 'visible',
            pointerEvents: 'auto',
          }}
        >
          <button
            className={cardStyles.actionButton}
            onClick={handleEdit}
            aria-label="Edit character"
            title="Edit"
            data-testid="character-edit-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EditIcon />
          </button>
          <button
            className={cardStyles.actionButton}
            onClick={handleDuplicate}
            aria-label="Duplicate character"
            title="Duplicate"
            data-testid="character-duplicate-button"
          >
            <CopyIcon />
          </button>
          <button
            className={`${cardStyles.actionButton} ${cardStyles.actionButtonDanger}`}
            onClick={handleDelete}
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
