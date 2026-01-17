/**
 * CharacterEditor Component Tests
 * 
 * Testing the character editor modal/drawer.
 * ARRR! Wine and dine these tests! 🍷🏴‍☠️
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterEditor } from '../CharacterEditor';
import { useCharacterStore } from '../store';
import { Character } from '../types';

// Mock Panda CSS
vi.mock('../../../../styled-system/css', () => ({
  css: vi.fn((styles) => JSON.stringify(styles)),
}));

// Mock child components
vi.mock('../ReferenceGallery', () => ({
  ReferenceGallery: ({ characterId }: { characterId: string }) => (
    <div data-testid="mock-reference-gallery">Reference Gallery: {characterId}</div>
  ),
}));

vi.mock('../ColorPalette', () => ({
  ColorPaletteDisplay: ({ colors, onAddColor, onRemoveColor }: any) => (
    <div data-testid="mock-color-palette">
      Colors: {colors?.length || 0}
      <button onClick={() => onAddColor?.('#FF0000')}>Add Color</button>
      <button onClick={() => onRemoveColor?.(colors?.[0])}>Remove Color</button>
    </div>
  ),
}));

vi.mock('../LoRABrowser', () => ({
  LoRABrowser: ({ selectedLora, onSelect, onRemove }: any) => (
    <div data-testid="mock-lora-browser">
      LoRA: {selectedLora?.id || 'none'}
      <button onClick={() => onSelect?.('test_lora', 0.8)}>Select LoRA</button>
      <button onClick={onRemove}>Remove LoRA</button>
    </div>
  ),
}));

// ============================================================================
// Helpers
// ============================================================================

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char_test_1',
    projectId: 'proj_test',
    name: 'Test Character',
    species: 'human',
    description: 'A test character',
    colorPalette: ['#FF0000', '#00FF00'],
    promptFragments: ['test fragment'],
    referenceImages: [],
    lora: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  useCharacterStore.setState({
    characters: new Map(),
    activeProjectId: 'proj_test',
    selectedCharacterId: null,
    editorState: null,
    isLoading: false,
    error: null,
    filter: { searchQuery: '', species: null, hasLora: null, hasReferences: null },
    sort: { field: 'name', direction: 'asc' },
  });
});

afterEach(() => {
  useCharacterStore.getState().reset();
  vi.clearAllMocks();
});

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('CharacterEditor - Basic Rendering', () => {
  it('should not render when isOpen is false', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={false}
      />
    );

    expect(screen.queryByTestId('character-editor')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('character-editor')).toBeInTheDocument();
  });

  it('should show "Create Character" title in create mode', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByText('Create Character')).toBeInTheDocument();
  });

  it('should show "Edit: {name}" title in edit mode', () => {
    const character = createMockCharacter({ name: 'Captain Hook' });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByText('Edit: Captain Hook')).toBeInTheDocument();
  });

  it('should have accessible dialog role', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ============================================================================
// Form Field Tests
// ============================================================================

describe('CharacterEditor - Form Fields', () => {
  it('should render name input', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('character-name-input')).toBeInTheDocument();
  });

  it('should render species input', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('character-species-input')).toBeInTheDocument();
  });

  it('should render description textarea', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('character-description-input')).toBeInTheDocument();
  });

  it('should pre-populate fields in edit mode', () => {
    const character = createMockCharacter({
      name: 'Luna',
      species: 'otter',
      description: 'A playful otter',
    });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('character-name-input')).toHaveValue('Luna');
    expect(screen.getByTestId('character-species-input')).toHaveValue('otter');
    expect(screen.getByTestId('character-description-input')).toHaveValue('A playful otter');
  });

  it('should update name field on input', async () => {
    const user = userEvent.setup();
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    const nameInput = screen.getByTestId('character-name-input');
    await user.type(nameInput, 'New Character');

    expect(nameInput).toHaveValue('New Character');
  });

  it('should show description character count', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByText(/\/1000 characters/)).toBeInTheDocument();
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('CharacterEditor - Validation', () => {
  it('should show error when name is empty on save', async () => {
    const user = userEvent.setup();
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    // Fill species but not name
    await user.type(screen.getByTestId('character-species-input'), 'cat');
    await user.click(screen.getByTestId('save-button'));

    expect(screen.getByTestId('name-error')).toHaveTextContent('Name is required');
  });

  it('should show error when species is empty on save', async () => {
    const user = userEvent.setup();
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    // Fill name but not species
    await user.type(screen.getByTestId('character-name-input'), 'Test');
    await user.click(screen.getByTestId('save-button'));

    expect(screen.getByTestId('species-error')).toHaveTextContent('Species is required');
  });

  it('should mark name input as invalid when error', async () => {
    const user = userEvent.setup();
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('save-button'));

    expect(screen.getByTestId('character-name-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should clear errors when user types', async () => {
    const user = userEvent.setup();
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    // Trigger error
    await user.click(screen.getByTestId('save-button'));
    expect(screen.getByTestId('name-error')).toBeInTheDocument();

    // Type to clear error
    await user.type(screen.getByTestId('character-name-input'), 'A');
    
    expect(screen.queryByTestId('name-error')).not.toBeInTheDocument();
  });
});

// ============================================================================
// Save/Cancel Tests
// ============================================================================

describe('CharacterEditor - Save/Cancel', () => {
  it('should call onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CharacterEditor
        characterId={null}
        onClose={onClose}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('cancel-button'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CharacterEditor
        characterId={null}
        onClose={onClose}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('close-editor-button'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should create character on save in create mode', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <CharacterEditor
        characterId={null}
        onClose={onClose}
        onSave={onSave}
        isOpen={true}
      />
    );

    await user.type(screen.getByTestId('character-name-input'), 'New Hero');
    await user.type(screen.getByTestId('character-species-input'), 'dragon');
    await user.click(screen.getByTestId('save-button'));

    // Should have created a character
    const characters = Array.from(useCharacterStore.getState().characters.values());
    expect(characters.length).toBe(1);
    expect(characters[0].name).toBe('New Hero');
    expect(characters[0].species).toBe('dragon');
  });

  it('should update character on save in edit mode', async () => {
    const user = userEvent.setup();
    const character = createMockCharacter({ name: 'Old Name' });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    const nameInput = screen.getByTestId('character-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByTestId('save-button'));

    const updated = useCharacterStore.getState().characters.get(character.id);
    expect(updated?.name).toBe('New Name');
  });

  it('should show confirmation when closing with unsaved changes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <CharacterEditor
        characterId={null}
        onClose={onClose}
        isOpen={true}
      />
    );

    // Make a change
    await user.type(screen.getByTestId('character-name-input'), 'Unsaved');
    
    // Try to cancel
    await user.click(screen.getByTestId('cancel-button'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should close without confirmation if no changes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <CharacterEditor
        characterId={null}
        onClose={onClose}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('cancel-button'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should disable save button when no changes in edit mode', () => {
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('save-button')).toBeDisabled();
  });

  it('should enable save button after making changes', async () => {
    const user = userEvent.setup();
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    await user.type(screen.getByTestId('character-name-input'), ' Updated');

    expect(screen.getByTestId('save-button')).not.toBeDisabled();
  });
});

// ============================================================================
// Tabs Tests (Edit Mode Only)
// ============================================================================

describe('CharacterEditor - Tabs', () => {
  it('should not show tabs in create mode', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.queryByTestId('tab-details')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-references')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-lora')).not.toBeInTheDocument();
  });

  it('should show tabs in edit mode', () => {
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('tab-details')).toBeInTheDocument();
    expect(screen.getByTestId('tab-references')).toBeInTheDocument();
    expect(screen.getByTestId('tab-lora')).toBeInTheDocument();
  });

  it('should show details tab by default', () => {
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('tab-details')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('panel-details')).toBeInTheDocument();
  });

  it('should switch to references tab when clicked', async () => {
    const user = userEvent.setup();
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('tab-references'));

    expect(screen.getByTestId('tab-references')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('panel-references')).toBeInTheDocument();
    expect(screen.getByTestId('mock-reference-gallery')).toBeInTheDocument();
  });

  it('should switch to lora tab when clicked', async () => {
    const user = userEvent.setup();
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    await user.click(screen.getByTestId('tab-lora'));

    expect(screen.getByTestId('tab-lora')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('panel-lora')).toBeInTheDocument();
    expect(screen.getByTestId('mock-lora-browser')).toBeInTheDocument();
  });

  it('should show reference count in tab', () => {
    const character = createMockCharacter({
      referenceImages: [
        { id: 'ref1', characterId: 'char_test_1', type: 'face', url: 'test.png', createdAt: new Date() },
        { id: 'ref2', characterId: 'char_test_1', type: 'full_body', url: 'test2.png', createdAt: new Date() },
      ],
    });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('tab-references')).toHaveTextContent('References (2)');
  });

  it('should show checkmark on lora tab when lora is set', () => {
    const character = createMockCharacter({
      lora: { id: 'anime_v3', strength: 0.8 },
    });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('tab-lora')).toHaveTextContent('✓');
  });
});

// ============================================================================
// Color Palette Tests (Edit Mode)
// ============================================================================

describe('CharacterEditor - Color Palette', () => {
  it('should render color palette in edit mode', () => {
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('mock-color-palette')).toBeInTheDocument();
  });

  it('should not render color palette in create mode', () => {
    render(
      <CharacterEditor
        characterId={null}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.queryByTestId('mock-color-palette')).not.toBeInTheDocument();
  });
});

// ============================================================================
// Prompt Fragments Tests (Edit Mode)
// ============================================================================

describe('CharacterEditor - Prompt Fragments', () => {
  it('should render prompt fragments in edit mode', () => {
    const character = createMockCharacter({
      promptFragments: ['test', 'fragment'],
    });
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getAllByTestId('prompt-fragment')).toHaveLength(2);
  });

  it('should show generate button', () => {
    const character = createMockCharacter();
    useCharacterStore.setState({
      characters: new Map([[character.id, character]]),
    });

    render(
      <CharacterEditor
        characterId={character.id}
        onClose={() => {}}
        isOpen={true}
      />
    );

    expect(screen.getByTestId('generate-fragments-button')).toBeInTheDocument();
  });
});
