/**
 * CharacterPanel Component
 * 
 * Collapsible side panel displaying character list with search,
 * filtering, and quick actions. ARRR! 🏴‍☠️
 */

import React, { useCallback, useMemo } from 'react';
import {
  useCharacterStore,
  useCharacterActions,
  useFilteredCharacters,
  usePanelState,
  useSelectedCharacter,
} from './store';
import { useCharacterSearch, useCharacterKeyboardNavigation } from './hooks';
import { CharacterCard } from './CharacterCard';
import type { CharacterPanelProps, Character, CharacterAction } from './types';
import { css } from '../../../styled-system/css';

// ============================================================================
// Styles
// ============================================================================

const panelStyles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'slate.900',
    borderRight: '1px solid',
    borderColor: 'slate.700',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  }),
  
  containerExpanded: css({
    width: '320px',
    minWidth: '280px',
  }),
  
  containerCollapsed: css({
    width: '48px',
    minWidth: '48px',
  }),
  
  header: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid',
    borderColor: 'slate.700',
    backgroundColor: 'slate.800',
  }),
  
  title: css({
    fontSize: '14px',
    fontWeight: '600',
    color: 'slate.100',
    letterSpacing: '0.02em',
  }),
  
  toggleButton: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'slate.400',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
      backgroundColor: 'slate.700',
      color: 'slate.200',
    },
  }),
  
  searchContainer: css({
    padding: '12px 16px',
    borderBottom: '1px solid',
    borderColor: 'slate.800',
  }),
  
  searchInput: css({
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    backgroundColor: 'slate.800',
    border: '1px solid',
    borderColor: 'slate.600',
    borderRadius: '6px',
    color: 'slate.100',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    _placeholder: {
      color: 'slate.500',
    },
    _focus: {
      borderColor: 'violet.500',
    },
  }),
  
  listContainer: css({
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'slate.600 transparent',
  }),
  
  emptyState: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    color: 'slate.500',
  }),
  
  emptyIcon: css({
    fontSize: '48px',
    marginBottom: '16px',
  }),
  
  emptyText: css({
    fontSize: '13px',
    marginBottom: '4px',
  }),
  
  emptySubtext: css({
    fontSize: '12px',
    color: 'slate.600',
  }),
  
  footer: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px solid',
    borderColor: 'slate.700',
    backgroundColor: 'slate.800',
  }),
  
  addButton: css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '500',
    backgroundColor: 'violet.600',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
      backgroundColor: 'violet.500',
    },
    _active: {
      transform: 'scale(0.98)',
    },
  }),
  
  countBadge: css({
    fontSize: '12px',
    color: 'slate.500',
  }),
};

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.646 3.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L9.293 8 5.646 4.354a.5.5 0 0 1 0-.708z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  projectId,
  initialState = 'expanded',
  onCharacterSelect,
  onCharacterAction,
  className,
}) => {
  const actions = useCharacterActions();
  const panelState = usePanelState();
  const selectedCharacter = useSelectedCharacter();
  const characters = useFilteredCharacters(projectId);
  const { value: searchValue, setValue: setSearchValue, hasValue } = useCharacterSearch();
  
  const isExpanded = panelState === 'expanded';
  
  // Handle character selection
  const handleSelectCharacter = useCallback((character: Character) => {
    actions.selectCharacter(character.id);
    onCharacterSelect?.(character);
  }, [actions, onCharacterSelect]);
  
  // Handle character actions
  const handleCharacterAction = useCallback((action: CharacterAction) => {
    actions.dispatchAction(action);
    onCharacterAction?.(action);
  }, [actions, onCharacterAction]);
  
  // Handle create new character
  const handleCreateCharacter = useCallback(() => {
    actions.openEditor('create');
  }, [actions]);
  
  // Navigate through characters list
  const selectedIndex = useMemo(() => {
    if (!selectedCharacter) return -1;
    return characters.findIndex(c => c.id === selectedCharacter.id);
  }, [characters, selectedCharacter]);
  
  const selectNextCharacter = useCallback(() => {
    if (characters.length === 0) return;
    const nextIndex = selectedIndex < characters.length - 1 ? selectedIndex + 1 : 0;
    handleSelectCharacter(characters[nextIndex]);
  }, [characters, selectedIndex, handleSelectCharacter]);
  
  const selectPreviousCharacter = useCallback(() => {
    if (characters.length === 0) return;
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : characters.length - 1;
    handleSelectCharacter(characters[prevIndex]);
  }, [characters, selectedIndex, handleSelectCharacter]);
  
  const openSelectedCharacter = useCallback(() => {
    if (selectedCharacter) {
      handleCharacterAction({ type: 'edit', characterId: selectedCharacter.id });
    }
  }, [selectedCharacter, handleCharacterAction]);
  
  const deleteSelectedCharacter = useCallback(() => {
    if (selectedCharacter) {
      handleCharacterAction({ type: 'delete', characterId: selectedCharacter.id });
    }
  }, [selectedCharacter, handleCharacterAction]);
  
  // Keyboard navigation
  useCharacterKeyboardNavigation({
    onSelectNext: selectNextCharacter,
    onSelectPrevious: selectPreviousCharacter,
    onOpen: openSelectedCharacter,
    onClose: () => actions.selectCharacter(null),
    onDelete: deleteSelectedCharacter,
    enabled: isExpanded,
  });
  
  // Render collapsed state
  if (!isExpanded) {
    return (
      <div className={`${panelStyles.container} ${panelStyles.containerCollapsed} ${className || ''}`}>
        <div className={panelStyles.header}>
          <button 
            className={panelStyles.toggleButton}
            onClick={() => actions.togglePanel()}
            aria-label="Expand panel"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${panelStyles.container} ${panelStyles.containerExpanded} ${className || ''}`}>
      {/* Header */}
      <div className={panelStyles.header}>
        <span className={panelStyles.title}>Characters</span>
        <button 
          className={panelStyles.toggleButton}
          onClick={() => actions.togglePanel()}
          aria-label="Collapse panel"
        >
          <ChevronLeftIcon />
        </button>
      </div>
      
      {/* Search */}
      <div className={panelStyles.searchContainer}>
        <input
          type="text"
          placeholder="Search characters..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className={panelStyles.searchInput}
        />
      </div>
      
      {/* Character List */}
      <div className={panelStyles.listContainer}>
        {characters.length === 0 ? (
          <div className={panelStyles.emptyState}>
            <div className={panelStyles.emptyIcon}>
              <UserIcon />
            </div>
            <p className={panelStyles.emptyText}>
              {hasValue ? 'No characters found' : 'No characters yet'}
            </p>
            <p className={panelStyles.emptySubtext}>
              {hasValue ? 'Try a different search' : 'Create one to get started'}
            </p>
          </div>
        ) : (
          characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isSelected={selectedCharacter?.id === character.id}
              onClick={handleSelectCharacter}
              onAction={handleCharacterAction}
            />
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className={panelStyles.footer}>
        <span className={panelStyles.countBadge}>
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </span>
        <button 
          className={panelStyles.addButton}
          onClick={handleCreateCharacter}
        >
          <PlusIcon />
          Add Character
        </button>
      </div>
    </div>
  );
};
