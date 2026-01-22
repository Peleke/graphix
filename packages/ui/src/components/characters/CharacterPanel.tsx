/**
 * CharacterPanel Component
 *
 * Collapsible side panel displaying character list with search,
 * filtering, and quick actions.
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
import {
  useCharacterSearch,
  useCharacterKeyboardNavigation,
  useFetchCharacters,
  useDeleteCharacter,
} from './hooks';
import { CharacterCard } from './CharacterCard';
import { CharacterEditor } from './CharacterEditor';
import { Dialog } from '../ui';
import type { CharacterPanelProps, Character, CharacterAction } from './types';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e2e',
    borderRight: '1px solid #313244',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  } as React.CSSProperties,

  containerExpanded: {
    width: '340px',
    minWidth: '300px',
  } as React.CSSProperties,

  containerCollapsed: {
    width: '48px',
    minWidth: '48px',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid #313244',
    background: 'linear-gradient(180deg, #262637 0%, #1e1e2e 100%)',
  } as React.CSSProperties,

  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#cdd6f4',
    letterSpacing: '0.02em',
  } as React.CSSProperties,

  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    color: '#6c7086',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  toggleButtonHover: {
    backgroundColor: '#313244',
    borderColor: '#45475a',
    color: '#cdd6f4',
  } as React.CSSProperties,

  searchContainer: {
    padding: '14px 18px',
    borderBottom: '1px solid #313244',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '13px',
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    borderRadius: '8px',
    color: '#cdd6f4',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  } as React.CSSProperties,

  searchInputFocus: {
    borderColor: '#8b5cf6',
  } as React.CSSProperties,

  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
  } as React.CSSProperties,

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
    color: '#a6adc8',
    border: '2px dashed #313244',
    borderRadius: '12px',
    backgroundColor: '#1e1e2e',
    margin: '8px 0',
  } as React.CSSProperties,

  emptyIcon: {
    marginBottom: '16px',
    color: '#6c7086',
  } as React.CSSProperties,

  emptyText: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '6px',
    color: '#cdd6f4',
    margin: 0,
  } as React.CSSProperties,

  emptySubtext: {
    fontSize: '13px',
    color: '#6c7086',
    marginBottom: '20px',
    margin: '6px 0 20px 0',
  } as React.CSSProperties,

  emptyCreateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
  } as React.CSSProperties,

  emptyCreateButtonHover: {
    backgroundColor: '#9333ea',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderTop: '1px solid #313244',
    backgroundColor: '#262637',
  } as React.CSSProperties,

  countBadge: {
    fontSize: '13px',
    color: '#a6adc8',
    fontWeight: 500,
  } as React.CSSProperties,

  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid #45475a',
    borderRadius: '8px',
    color: '#cdd6f4',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  addButtonHover: {
    backgroundColor: '#313244',
    borderColor: '#8b5cf6',
    color: '#fff',
  } as React.CSSProperties,

  deleteModal: {
    backgroundColor: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '420px',
    color: '#cdd6f4',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  } as React.CSSProperties,

  deleteTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#cdd6f4',
  } as React.CSSProperties,

  deleteDescription: {
    margin: '0 0 20px 0',
    color: '#6c7086',
    fontSize: '14px',
    lineHeight: 1.5,
  } as React.CSSProperties,

  deleteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  } as React.CSSProperties,

  cancelButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #45475a',
    backgroundColor: 'transparent',
    color: '#cdd6f4',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  confirmButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f38ba8',
    color: '#1e1e2e',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
};

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.646 3.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L9.293 8 5.646 4.354a.5.5 0 0 1 0-.708z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
  </svg>
);

const UserIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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
  const { deleteCharacter } = useDeleteCharacter();
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const [toggleHovered, setToggleHovered] = useState(false);
  const [addHovered, setAddHovered] = useState(false);
  const [createHovered, setCreateHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Fetch characters on mount
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const isExpanded = panelState === 'expanded';

  // Handle character selection
  const handleSelectCharacter = useCallback(
    (character: Character) => {
      actions.selectCharacter(character.id);
      onCharacterSelect?.(character);
    },
    [actions, onCharacterSelect]
  );

  // Handle character actions
  const handleCharacterAction = useCallback(
    (action: CharacterAction) => {
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
    },
    [actions, onCharacterAction]
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    actions.removeCharacter(pendingDelete.id);
    await deleteCharacter(pendingDelete.id);
    await fetchCharacters();
    const current = useCharacterStore.getState().characters;
    const remaining = Array.from(current.values()).filter(
      (char) => char.id !== pendingDelete.id
    );
    actions.setCharacters(remaining);
    setPendingDelete(null);
  }, [deleteCharacter, pendingDelete, actions, fetchCharacters]);

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
    return characters.findIndex((c) => c.id === selectedCharacter.id);
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
      <div
        style={{ ...styles.container, ...styles.containerCollapsed }}
        className={className}
      >
        <div style={styles.header}>
          <button
            style={{
              ...styles.toggleButton,
              ...(toggleHovered ? styles.toggleButtonHover : {}),
            }}
            onClick={() => actions.togglePanel()}
            onMouseEnter={() => setToggleHovered(true)}
            onMouseLeave={() => setToggleHovered(false)}
            aria-label="Expand panel"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ ...styles.container, ...styles.containerExpanded }}
      className={className}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Characters</span>
        <button
          style={{
            ...styles.toggleButton,
            ...(toggleHovered ? styles.toggleButtonHover : {}),
          }}
          onClick={() => actions.togglePanel()}
          onMouseEnter={() => setToggleHovered(true)}
          onMouseLeave={() => setToggleHovered(false)}
          aria-label="Collapse panel"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchContainer} data-testid="character-search-container">
        <input
          type="text"
          placeholder="Search characters..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            ...styles.searchInput,
            ...(searchFocused ? styles.searchInputFocus : {}),
          }}
          data-testid="character-search-input"
        />
      </div>

      {/* Character List */}
      <div style={styles.listContainer} data-testid="character-list">
        {characters.length === 0 ? (
          <div style={styles.emptyState} data-testid="character-empty-state">
            <div style={styles.emptyIcon}>
              <UserIcon />
            </div>
            <p style={styles.emptyText}>
              {hasValue ? 'No characters found' : 'No characters yet'}
            </p>
            <p style={styles.emptySubtext}>
              {hasValue ? 'Try a different search' : 'Create one to get started'}
            </p>
            {!hasValue && (
              <button
                style={{
                  ...styles.emptyCreateButton,
                  ...(createHovered ? styles.emptyCreateButtonHover : {}),
                }}
                onClick={handleCreateCharacter}
                onMouseEnter={() => setCreateHovered(true)}
                onMouseLeave={() => setCreateHovered(false)}
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
      <div style={styles.footer}>
        <span style={styles.countBadge} data-testid="character-count">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </span>
        {(characters.length > 0 || hasValue) && (
          <button
            style={{
              ...styles.addButton,
              ...(addHovered ? styles.addButtonHover : {}),
            }}
            onClick={handleCreateCharacter}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
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
        <div style={styles.deleteModal}>
          <h3 id="delete-character-title" style={styles.deleteTitle}>
            Delete character?
          </h3>
          <p id="delete-character-description" style={styles.deleteDescription}>
            This will permanently remove "{pendingDelete?.name}" from the project.
            This action cannot be undone.
          </p>
          <div style={styles.deleteActions}>
            <button style={styles.cancelButton} onClick={cancelDelete}>
              Cancel
            </button>
            <button style={styles.confirmButton} onClick={confirmDelete}>
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
