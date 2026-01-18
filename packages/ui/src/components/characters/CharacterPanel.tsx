/**
 * CharacterPanel Component
 * 
 * Collapsible side panel displaying character list with search,
 * filtering, and quick actions. ARRR! 🏴‍☠️
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  useCharacterStore,
  useCharacterActions,
  useFilteredCharacters,
  usePanelState,
  useSelectedCharacter,
  useEditorState,
} from './store';
import { useCharacterSearch, useCharacterKeyboardNavigation, useFetchCharacters } from './hooks';
import { CharacterCard } from './CharacterCard';
import { CharacterEditor } from './CharacterEditor';
import { Dialog } from '../ui';
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
    padding: '32px 24px',
    textAlign: 'center',
    color: 'slate.300',
    border: '1px dashed',
    borderColor: 'slate.700',
    borderRadius: '12px',
    backgroundColor: 'slate.900',
  }),
  
  emptyIcon: css({
    fontSize: '44px',
    marginBottom: '12px',
    color: 'slate.400',
  }),
  
  emptyText: css({
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'slate.200',
  }),
  
  emptySubtext: css({
    fontSize: '12px',
    color: 'slate.500',
    marginBottom: '18px',
  }),
  
  emptyCreateButton: css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    backgroundColor: 'violet.600',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
      backgroundColor: 'violet.500',
    },
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
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderColor: 'slate.600',
    borderRadius: '6px',
    color: 'slate.200',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
      backgroundColor: 'slate.700',
    },
    _active: {
      transform: 'scale(0.98)',
    },
  }),
  
  countBadge: css({
    fontSize: '12px',
    color: 'slate.400',
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
  const editorState = useEditorState();
  const { fetchCharacters, isLoading } = useFetchCharacters(projectId);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  
  // Fetch characters on mount
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);
  
  const isExpanded = panelState === 'expanded';
  
  // Handle character selection
  const handleSelectCharacter = useCallback((character: Character) => {
    actions.selectCharacter(character.id);
    onCharacterSelect?.(character);
  }, [actions, onCharacterSelect]);
  
  // Handle character actions
  const handleCharacterAction = useCallback((action: CharacterAction) => {
    if (action.type === 'edit') {
      actions.openEditor('edit', action.characterId);
      onCharacterAction?.(action);
      return;
    }

    if (action.type === 'delete') {
      const target = actions.getCharacter(action.characterId);
      if (target) {
        setPendingDelete(target);
        onCharacterAction?.(action);
        return;
      }
    }

    actions.dispatchAction(action);
    onCharacterAction?.(action);
  }, [actions, onCharacterAction]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    actions.removeCharacter(pendingDelete.id);
    setPendingDelete(null);
  }, [actions, pendingDelete]);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);
  
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
      <div
        className={panelStyles.searchContainer}
        style={{
          padding: '16px',
          backgroundColor: '#0f172a',
        }}
        data-testid="character-search-container"
      >
        <input
          type="text"
          placeholder="Search characters..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className={panelStyles.searchInput}
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '13px',
            backgroundColor: '#0b1020',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            color: '#e2e8f0',
          }}
          data-testid="character-search-input"
        />
      </div>
      
      {/* Character List */}
      <div
        className={panelStyles.listContainer}
        style={{
          margin: '12px 16px',
          padding: '12px',
          backgroundColor: '#0b1020',
          border: '1px solid #1f2937',
          borderRadius: '12px',
        }}
        data-testid="character-list"
      >
        {characters.length === 0 ? (
          <div
            className={panelStyles.emptyState}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textAlign: 'center',
              color: '#cbd5e1',
              border: '1px dashed #334155',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              maxWidth: '720px',
              margin: '12px auto',
            }}
            data-testid="character-empty-state"
          >
            <div className={panelStyles.emptyIcon}>
              <UserIcon />
            </div>
            <p className={panelStyles.emptyText}>
              {hasValue ? 'No characters found' : 'No characters yet'}
            </p>
            <p className={panelStyles.emptySubtext}>
              {hasValue ? 'Try a different search' : 'Create one to get started'}
            </p>
            {!hasValue && (
              <button
                className={panelStyles.emptyCreateButton}
                onClick={handleCreateCharacter}
                data-testid="character-empty-create-button"
              >
                <PlusIcon />
                Create Character
              </button>
            )}
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
        <span className={panelStyles.countBadge} data-testid="character-count">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </span>
        {(characters.length > 0 || hasValue) && (
          <button 
            className={panelStyles.addButton}
            onClick={handleCreateCharacter}
            data-testid="character-add-button"
          >
            <PlusIcon />
            Add Character
          </button>
        )}
      </div>
      
      {/* Character Editor Modal */}
      <CharacterEditor
        characterId={editorState.characterId}
        projectId={projectId}
        isOpen={editorState.open}
        onClose={() => actions.closeEditor()}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={!!pendingDelete}
        onClose={cancelDelete}
        role="alertdialog"
        ariaLabelledby="delete-character-title"
        ariaDescribedby="delete-character-description"
        overlayTestId="delete-character-modal"
        zIndex={1001}
      >
        <div
          className={css({
            backgroundColor: 'slate.900',
            border: '1px solid',
            borderColor: 'slate.700',
            borderRadius: '12px',
            padding: '20px',
            width: '90%',
            maxWidth: '420px',
            color: 'slate.100',
          })}
        >
            <h3
              id="delete-character-title"
              className={css({ margin: '0 0 8px 0', fontSize: '1rem' })}
            >
              Delete character?
            </h3>
            <p
              id="delete-character-description"
              className={css({ margin: '0 0 16px 0', color: 'slate.400', fontSize: '0.875rem' })}
            >
              This will remove "{pendingDelete?.name}" from the project.
            </p>
            <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px' })}>
              <button
                className={css({
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: 'slate.600',
                  backgroundColor: 'transparent',
                  color: 'slate.200',
                  cursor: 'pointer',
                })}
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className={css({
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'red.600',
                  color: 'white',
                  cursor: 'pointer',
                })}
                onClick={confirmDelete}
              >
                Confirm
              </button>
            </div>
        </div>
      </Dialog>
    </div>
  );
};
