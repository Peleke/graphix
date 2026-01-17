/**
 * Character Store Tests
 * 
 * Exhaustive tests for the Zustand store managing character state.
 * ARRR! We be testin' every barnacle on this here ship! 🏴‍☠️
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../store';
import type { 
  Character, 
  CharacterProfile, 
  ReferenceImage, 
  CharacterLoRA,
  LoRAEntry,
} from '../types';
import { DEFAULT_CHARACTER_FILTERS } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    species: 'human',
    description: 'A test character with blue eyes and brown hair',
    age: '25',
    gender: 'female',
    features: ['blue eyes', 'brown hair'],
    personality: ['brave', 'kind'],
    backstory: 'Test backstory',
    ...overrides,
  };
}

function createMockReference(overrides: Partial<ReferenceImage> = {}): ReferenceImage {
  return {
    id: `ref_${Math.random().toString(36).substring(2, 9)}`,
    imagePath: '/path/to/image.png',
    thumbnailPath: '/path/to/thumb.png',
    type: 'full_body',
    label: 'Test Reference',
    colorPalette: ['#FF0000', '#00FF00', '#0000FF'],
    dimensions: { width: 512, height: 512 },
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: `char_${Math.random().toString(36).substring(2, 9)}`,
    projectId: 'test-project',
    name: 'Test Character',
    profile: createMockProfile(),
    promptFragments: ['human', 'female', '25', 'blue eyes', 'brown hair'],
    referenceImages: [],
    colorPalette: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockLora(overrides: Partial<CharacterLoRA> = {}): CharacterLoRA {
  return {
    path: '/path/to/lora.safetensors',
    strength: 0.7,
    strengthClip: 0.7,
    triggerWords: ['test_char'],
    ...overrides,
  };
}

function createMockLoraEntry(overrides: Partial<LoRAEntry> = {}): LoRAEntry {
  return {
    filename: 'test_lora.safetensors',
    name: 'Test LoRA',
    trigger: 'test trigger',
    compatibleFamilies: ['sdxl', 'illustrious'],
    category: 'character',
    strength: { min: 0.5, recommended: 0.7, max: 1.0 },
    stackPosition: 'first',
    notes: 'Test LoRA for testing',
    ...overrides,
  };
}

// ============================================================================
// Store Reset
// ============================================================================

beforeEach(() => {
  useCharacterStore.setState({
    characters: new Map(),
    lorasCatalog: [],
    panelState: 'expanded',
    selectedCharacterId: null,
    editingCharacterId: null,
    editorMode: 'view',
    editorOpen: false,
    loraBrowserOpen: false,
    filters: { ...DEFAULT_CHARACTER_FILTERS },
    sortBy: 'name',
    sortDirection: 'asc',
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isUploadingReference: false,
    loadingCharacterIds: new Set(),
    error: null,
  });
});

// ============================================================================
// Panel State Tests
// ============================================================================

describe('Character Store - Panel State', () => {
  it('should start with expanded panel', () => {
    const { panelState } = useCharacterStore.getState();
    expect(panelState).toBe('expanded');
  });

  it('should set panel state to collapsed', () => {
    const { actions } = useCharacterStore.getState();
    actions.setPanelState('collapsed');
    expect(useCharacterStore.getState().panelState).toBe('collapsed');
  });

  it('should set panel state to expanded', () => {
    const { actions } = useCharacterStore.getState();
    actions.setPanelState('collapsed');
    actions.setPanelState('expanded');
    expect(useCharacterStore.getState().panelState).toBe('expanded');
  });

  it('should toggle panel from expanded to collapsed', () => {
    const { actions } = useCharacterStore.getState();
    expect(useCharacterStore.getState().panelState).toBe('expanded');
    actions.togglePanel();
    expect(useCharacterStore.getState().panelState).toBe('collapsed');
  });

  it('should toggle panel from collapsed to expanded', () => {
    const { actions } = useCharacterStore.getState();
    actions.setPanelState('collapsed');
    actions.togglePanel();
    expect(useCharacterStore.getState().panelState).toBe('expanded');
  });

  it('should toggle panel multiple times correctly', () => {
    const { actions } = useCharacterStore.getState();
    actions.togglePanel(); // collapsed
    actions.togglePanel(); // expanded
    actions.togglePanel(); // collapsed
    expect(useCharacterStore.getState().panelState).toBe('collapsed');
  });
});

// ============================================================================
// Selection Tests
// ============================================================================

describe('Character Store - Selection', () => {
  it('should start with no character selected', () => {
    const { selectedCharacterId } = useCharacterStore.getState();
    expect(selectedCharacterId).toBeNull();
  });

  it('should select a character by ID', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.selectCharacter(char.id);
    expect(useCharacterStore.getState().selectedCharacterId).toBe(char.id);
  });

  it('should deselect character when selecting null', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.selectCharacter(char.id);
    actions.selectCharacter(null);
    expect(useCharacterStore.getState().selectedCharacterId).toBeNull();
  });

  it('should change selection to different character', () => {
    const { actions } = useCharacterStore.getState();
    const char1 = createMockCharacter({ id: 'char-1' });
    const char2 = createMockCharacter({ id: 'char-2' });
    actions.addCharacter(char1);
    actions.addCharacter(char2);
    actions.selectCharacter(char1.id);
    actions.selectCharacter(char2.id);
    expect(useCharacterStore.getState().selectedCharacterId).toBe(char2.id);
  });
});

// ============================================================================
// Editor State Tests
// ============================================================================

describe('Character Store - Editor State', () => {
  it('should start with editor closed', () => {
    const { editorOpen, editorMode } = useCharacterStore.getState();
    expect(editorOpen).toBe(false);
    expect(editorMode).toBe('view');
  });

  it('should open editor in create mode', () => {
    const { actions } = useCharacterStore.getState();
    actions.openEditor('create');
    const state = useCharacterStore.getState();
    expect(state.editorOpen).toBe(true);
    expect(state.editorMode).toBe('create');
    expect(state.editingCharacterId).toBeNull();
  });

  it('should open editor in edit mode with character ID', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.openEditor('edit', char.id);
    const state = useCharacterStore.getState();
    expect(state.editorOpen).toBe(true);
    expect(state.editorMode).toBe('edit');
    expect(state.editingCharacterId).toBe(char.id);
  });

  it('should open editor in view mode', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.openEditor('view', char.id);
    const state = useCharacterStore.getState();
    expect(state.editorOpen).toBe(true);
    expect(state.editorMode).toBe('view');
  });

  it('should close editor and clear editing ID', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.openEditor('edit', char.id);
    actions.closeEditor();
    const state = useCharacterStore.getState();
    expect(state.editorOpen).toBe(false);
    expect(state.editingCharacterId).toBeNull();
  });
});

// ============================================================================
// LoRA Browser State Tests
// ============================================================================

describe('Character Store - LoRA Browser State', () => {
  it('should start with LoRA browser closed', () => {
    expect(useCharacterStore.getState().loraBrowserOpen).toBe(false);
  });

  it('should open LoRA browser', () => {
    const { actions } = useCharacterStore.getState();
    actions.openLoraBrowser();
    expect(useCharacterStore.getState().loraBrowserOpen).toBe(true);
  });

  it('should close LoRA browser', () => {
    const { actions } = useCharacterStore.getState();
    actions.openLoraBrowser();
    actions.closeLoraBrowser();
    expect(useCharacterStore.getState().loraBrowserOpen).toBe(false);
  });
});

// ============================================================================
// Character CRUD Tests
// ============================================================================

describe('Character Store - CRUD Operations', () => {
  describe('setCharacters', () => {
    it('should set multiple characters', () => {
      const { actions } = useCharacterStore.getState();
      const chars = [
        createMockCharacter({ id: 'char-1', name: 'Alice' }),
        createMockCharacter({ id: 'char-2', name: 'Bob' }),
        createMockCharacter({ id: 'char-3', name: 'Charlie' }),
      ];
      actions.setCharacters(chars);
      expect(useCharacterStore.getState().characters.size).toBe(3);
    });

    it('should replace existing characters', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'old-char' }));
      const newChars = [createMockCharacter({ id: 'new-char' })];
      actions.setCharacters(newChars);
      expect(useCharacterStore.getState().characters.size).toBe(1);
      expect(useCharacterStore.getState().characters.has('old-char')).toBe(false);
      expect(useCharacterStore.getState().characters.has('new-char')).toBe(true);
    });

    it('should handle empty array', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter());
      actions.setCharacters([]);
      expect(useCharacterStore.getState().characters.size).toBe(0);
    });
  });

  describe('addCharacter', () => {
    it('should add a character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      expect(actions.getCharacter(char.id)).toEqual(char);
    });

    it('should add multiple characters', () => {
      const { actions } = useCharacterStore.getState();
      const char1 = createMockCharacter({ id: 'char-1' });
      const char2 = createMockCharacter({ id: 'char-2' });
      actions.addCharacter(char1);
      actions.addCharacter(char2);
      expect(useCharacterStore.getState().characters.size).toBe(2);
    });

    it('should overwrite character with same ID', () => {
      const { actions } = useCharacterStore.getState();
      const char1 = createMockCharacter({ id: 'same-id', name: 'Original' });
      const char2 = createMockCharacter({ id: 'same-id', name: 'Updated' });
      actions.addCharacter(char1);
      actions.addCharacter(char2);
      expect(actions.getCharacter('same-id')?.name).toBe('Updated');
    });
  });

  describe('updateCharacter', () => {
    it('should update character name', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({ id: 'char-1', name: 'Original' });
      actions.addCharacter(char);
      actions.updateCharacter('char-1', { name: 'Updated' });
      expect(actions.getCharacter('char-1')?.name).toBe('Updated');
    });

    it('should update character profile', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.updateCharacter(char.id, { 
        profile: createMockProfile({ species: 'elf' }) 
      });
      expect(actions.getCharacter(char.id)?.profile.species).toBe('elf');
    });

    it('should update updatedAt timestamp', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const originalDate = char.updatedAt;
      actions.addCharacter(char);
      
      // Wait a tiny bit to ensure time difference
      actions.updateCharacter(char.id, { name: 'New Name' });
      
      const updated = actions.getCharacter(char.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalDate.getTime());
    });

    it('should not update non-existent character', () => {
      const { actions } = useCharacterStore.getState();
      actions.updateCharacter('non-existent', { name: 'Test' });
      expect(useCharacterStore.getState().characters.size).toBe(0);
    });

    it('should preserve unmodified fields', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({
        id: 'char-1',
        name: 'Original',
        profile: createMockProfile({ species: 'human' }),
      });
      actions.addCharacter(char);
      actions.updateCharacter('char-1', { name: 'Updated' });
      expect(actions.getCharacter('char-1')?.profile.species).toBe('human');
    });
  });

  describe('removeCharacter', () => {
    it('should remove a character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.removeCharacter(char.id);
      expect(actions.getCharacter(char.id)).toBeUndefined();
    });

    it('should clear selection when removing selected character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.selectCharacter(char.id);
      actions.removeCharacter(char.id);
      expect(useCharacterStore.getState().selectedCharacterId).toBeNull();
    });

    it('should close editor when removing editing character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.openEditor('edit', char.id);
      actions.removeCharacter(char.id);
      expect(useCharacterStore.getState().editorOpen).toBe(false);
      expect(useCharacterStore.getState().editingCharacterId).toBeNull();
    });

    it('should not affect other characters', () => {
      const { actions } = useCharacterStore.getState();
      const char1 = createMockCharacter({ id: 'char-1' });
      const char2 = createMockCharacter({ id: 'char-2' });
      actions.addCharacter(char1);
      actions.addCharacter(char2);
      actions.removeCharacter(char1.id);
      expect(actions.getCharacter(char2.id)).toBeDefined();
    });

    it('should handle removing non-existent character gracefully', () => {
      const { actions } = useCharacterStore.getState();
      expect(() => actions.removeCharacter('non-existent')).not.toThrow();
    });
  });
});

// ============================================================================
// Reference Image Tests
// ============================================================================

describe('Character Store - Reference Images', () => {
  describe('addReference', () => {
    it('should add reference to character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const ref = createMockReference();
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(1);
    });

    it('should set thumbnail when adding first reference', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const ref = createMockReference({ thumbnailPath: '/thumb.png' });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      expect(actions.getCharacter(char.id)?.thumbnailPath).toBe('/thumb.png');
    });

    it('should merge color palettes', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({ colorPalette: ['#111111'] });
      const ref = createMockReference({ colorPalette: ['#222222', '#333333'] });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      expect(actions.getCharacter(char.id)?.colorPalette).toContain('#111111');
      expect(actions.getCharacter(char.id)?.colorPalette).toContain('#222222');
    });

    it('should add multiple references', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.addReference(char.id, createMockReference({ id: 'ref-1' }));
      actions.addReference(char.id, createMockReference({ id: 'ref-2' }));
      actions.addReference(char.id, createMockReference({ id: 'ref-3' }));
      expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(3);
    });

    it('should not add to non-existent character', () => {
      const { actions } = useCharacterStore.getState();
      actions.addReference('non-existent', createMockReference());
      // Should not throw, just do nothing
      expect(useCharacterStore.getState().characters.size).toBe(0);
    });
  });

  describe('removeReference', () => {
    it('should remove reference from character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const ref = createMockReference({ id: 'ref-1' });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      actions.removeReference(char.id, 'ref-1');
      expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(0);
    });

    it('should not affect other references', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.addReference(char.id, createMockReference({ id: 'ref-1' }));
      actions.addReference(char.id, createMockReference({ id: 'ref-2' }));
      actions.removeReference(char.id, 'ref-1');
      expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(1);
      expect(actions.getCharacter(char.id)?.referenceImages[0].id).toBe('ref-2');
    });

    it('should handle removing non-existent reference', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      expect(() => actions.removeReference(char.id, 'non-existent')).not.toThrow();
    });
  });

  describe('updateReferenceType', () => {
    it('should update reference type', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const ref = createMockReference({ id: 'ref-1', type: 'full_body' });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      actions.updateReferenceType(char.id, 'ref-1', 'face');
      expect(actions.getCharacter(char.id)?.referenceImages[0].type).toBe('face');
    });

    it('should not affect other properties', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const ref = createMockReference({ 
        id: 'ref-1', 
        type: 'full_body',
        label: 'Original Label',
      });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      actions.updateReferenceType(char.id, 'ref-1', 'face');
      expect(actions.getCharacter(char.id)?.referenceImages[0].label).toBe('Original Label');
    });
  });
});

// ============================================================================
// LoRA Operations Tests
// ============================================================================

describe('Character Store - LoRA Operations', () => {
  describe('setCharacterLora', () => {
    it('should set LoRA for character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const lora = createMockLora();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, lora);
      expect(actions.getCharacter(char.id)?.lora).toEqual(lora);
    });

    it('should replace existing LoRA', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createMockLora({ strength: 0.5 }));
      actions.setCharacterLora(char.id, createMockLora({ strength: 0.9 }));
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0.9);
    });
  });

  describe('clearCharacterLora', () => {
    it('should clear LoRA from character', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createMockLora());
      actions.clearCharacterLora(char.id);
      expect(actions.getCharacter(char.id)?.lora).toBeUndefined();
    });

    it('should handle clearing when no LoRA exists', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      expect(() => actions.clearCharacterLora(char.id)).not.toThrow();
    });
  });

  describe('setLoraStrength', () => {
    it('should set LoRA strength', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createMockLora({ strength: 0.5 }));
      actions.setLoraStrength(char.id, 0.8);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0.8);
    });

    it('should clamp strength to minimum 0', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createMockLora());
      actions.setLoraStrength(char.id, -0.5);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0);
    });

    it('should clamp strength to maximum 2', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createMockLora());
      actions.setLoraStrength(char.id, 3);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(2);
    });

    it('should not throw when no LoRA exists', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      expect(() => actions.setLoraStrength(char.id, 0.5)).not.toThrow();
    });
  });
});

// ============================================================================
// Color Palette Tests
// ============================================================================

describe('Character Store - Color Palette', () => {
  describe('updateColorPalette', () => {
    it('should update color palette', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      actions.addCharacter(char);
      actions.updateColorPalette(char.id, ['#FF0000', '#00FF00']);
      expect(actions.getCharacter(char.id)?.colorPalette).toEqual(['#FF0000', '#00FF00']);
    });

    it('should limit palette to max size', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter();
      const colors = Array.from({ length: 20 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
      actions.addCharacter(char);
      actions.updateColorPalette(char.id, colors);
      expect(actions.getCharacter(char.id)?.colorPalette.length).toBeLessThanOrEqual(8);
    });
  });

  describe('extractColorsFromReference', () => {
    it('should extract and merge colors from reference', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({ colorPalette: ['#111111'] });
      const ref = createMockReference({ 
        id: 'ref-1', 
        colorPalette: ['#222222', '#333333'] 
      });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      actions.extractColorsFromReference(char.id, 'ref-1');
      const palette = actions.getCharacter(char.id)?.colorPalette;
      expect(palette).toContain('#111111');
      expect(palette).toContain('#222222');
    });
  });
});

// ============================================================================
// LoRA Catalog Tests
// ============================================================================

describe('Character Store - LoRA Catalog', () => {
  it('should set LoRA catalog', () => {
    const { actions } = useCharacterStore.getState();
    const loras = [
      createMockLoraEntry({ filename: 'lora1.safetensors' }),
      createMockLoraEntry({ filename: 'lora2.safetensors' }),
    ];
    actions.setLorasCatalog(loras);
    expect(useCharacterStore.getState().lorasCatalog.length).toBe(2);
  });

  it('should filter LoRAs by category', () => {
    const { actions } = useCharacterStore.getState();
    const loras = [
      createMockLoraEntry({ filename: 'style.safetensors', category: 'style' }),
      createMockLoraEntry({ filename: 'char.safetensors', category: 'character' }),
      createMockLoraEntry({ filename: 'style2.safetensors', category: 'style' }),
    ];
    actions.setLorasCatalog(loras);
    const styleLoras = actions.filterLorasByCategory('style');
    expect(styleLoras.length).toBe(2);
  });

  it('should filter LoRAs by model family', () => {
    const { actions } = useCharacterStore.getState();
    const loras = [
      createMockLoraEntry({ filename: 'sdxl.safetensors', compatibleFamilies: ['sdxl'] }),
      createMockLoraEntry({ filename: 'flux.safetensors', compatibleFamilies: ['flux'] }),
      createMockLoraEntry({ filename: 'both.safetensors', compatibleFamilies: ['sdxl', 'flux'] }),
    ];
    actions.setLorasCatalog(loras);
    const sdxlLoras = actions.filterLorasByFamily('sdxl');
    expect(sdxlLoras.length).toBe(2);
  });
});

// ============================================================================
// Filtering & Sorting Tests
// ============================================================================

describe('Character Store - Filtering & Sorting', () => {
  describe('setFilters', () => {
    it('should set search filter', () => {
      const { actions } = useCharacterStore.getState();
      actions.setFilters({ search: 'test' });
      expect(useCharacterStore.getState().filters.search).toBe('test');
    });

    it('should set multiple filters', () => {
      const { actions } = useCharacterStore.getState();
      actions.setFilters({ search: 'test', hasLora: true });
      const filters = useCharacterStore.getState().filters;
      expect(filters.search).toBe('test');
      expect(filters.hasLora).toBe(true);
    });

    it('should preserve existing filters', () => {
      const { actions } = useCharacterStore.getState();
      actions.setFilters({ search: 'test' });
      actions.setFilters({ hasLora: true });
      const filters = useCharacterStore.getState().filters;
      expect(filters.search).toBe('test');
      expect(filters.hasLora).toBe(true);
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters to defaults', () => {
      const { actions } = useCharacterStore.getState();
      actions.setFilters({ search: 'test', hasLora: true, hasReferences: false });
      actions.clearFilters();
      expect(useCharacterStore.getState().filters).toEqual(DEFAULT_CHARACTER_FILTERS);
    });
  });

  describe('setSortBy', () => {
    it('should set sort by name', () => {
      const { actions } = useCharacterStore.getState();
      actions.setSortBy('name');
      expect(useCharacterStore.getState().sortBy).toBe('name');
    });

    it('should set sort by createdAt', () => {
      const { actions } = useCharacterStore.getState();
      actions.setSortBy('createdAt');
      expect(useCharacterStore.getState().sortBy).toBe('createdAt');
    });

    it('should set sort by updatedAt', () => {
      const { actions } = useCharacterStore.getState();
      actions.setSortBy('updatedAt');
      expect(useCharacterStore.getState().sortBy).toBe('updatedAt');
    });
  });

  describe('setSortDirection', () => {
    it('should set ascending direction', () => {
      const { actions } = useCharacterStore.getState();
      actions.setSortDirection('asc');
      expect(useCharacterStore.getState().sortDirection).toBe('asc');
    });

    it('should set descending direction', () => {
      const { actions } = useCharacterStore.getState();
      actions.setSortDirection('desc');
      expect(useCharacterStore.getState().sortDirection).toBe('desc');
    });
  });

  describe('getFilteredCharacters', () => {
    it('should filter by search term', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', name: 'Alice', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', name: 'Bob', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c3', name: 'Alicia', projectId: 'proj-1' }));
      actions.setFilters({ search: 'Ali' });
      const filtered = actions.getFilteredCharacters('proj-1');
      expect(filtered.length).toBe(2);
    });

    it('should filter by hasLora', () => {
      const { actions } = useCharacterStore.getState();
      const charWithLora = createMockCharacter({ id: 'c1', projectId: 'proj-1' });
      const charWithoutLora = createMockCharacter({ id: 'c2', projectId: 'proj-1' });
      actions.addCharacter(charWithLora);
      actions.addCharacter(charWithoutLora);
      actions.setCharacterLora('c1', createMockLora());
      actions.setFilters({ hasLora: true });
      const filtered = actions.getFilteredCharacters('proj-1');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('c1');
    });

    it('should filter by hasReferences', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', projectId: 'proj-1' }));
      actions.addReference('c1', createMockReference());
      actions.setFilters({ hasReferences: true });
      const filtered = actions.getFilteredCharacters('proj-1');
      expect(filtered.length).toBe(1);
    });

    it('should sort by name ascending', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', name: 'Zebra', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', name: 'Apple', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c3', name: 'Mango', projectId: 'proj-1' }));
      actions.setSortBy('name');
      actions.setSortDirection('asc');
      const sorted = actions.getFilteredCharacters('proj-1');
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Mango');
      expect(sorted[2].name).toBe('Zebra');
    });

    it('should sort by name descending', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', name: 'Zebra', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', name: 'Apple', projectId: 'proj-1' }));
      actions.setSortBy('name');
      actions.setSortDirection('desc');
      const sorted = actions.getFilteredCharacters('proj-1');
      expect(sorted[0].name).toBe('Zebra');
    });

    it('should only return characters for specified project', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', projectId: 'proj-2' }));
      const filtered = actions.getFilteredCharacters('proj-1');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('c1');
    });
  });
});

// ============================================================================
// Loading State Tests
// ============================================================================

describe('Character Store - Loading States', () => {
  it('should set global loading state', () => {
    const { actions } = useCharacterStore.getState();
    actions.setLoading(true);
    expect(useCharacterStore.getState().isLoading).toBe(true);
    actions.setLoading(false);
    expect(useCharacterStore.getState().isLoading).toBe(false);
  });

  it('should set character loading state', () => {
    const { actions } = useCharacterStore.getState();
    actions.setCharacterLoading('char-1', true);
    expect(useCharacterStore.getState().loadingCharacterIds.has('char-1')).toBe(true);
  });

  it('should clear character loading state', () => {
    const { actions } = useCharacterStore.getState();
    actions.setCharacterLoading('char-1', true);
    actions.setCharacterLoading('char-1', false);
    expect(useCharacterStore.getState().loadingCharacterIds.has('char-1')).toBe(false);
  });

  it('should track multiple character loading states', () => {
    const { actions } = useCharacterStore.getState();
    actions.setCharacterLoading('char-1', true);
    actions.setCharacterLoading('char-2', true);
    actions.setCharacterLoading('char-1', false);
    const loadingIds = useCharacterStore.getState().loadingCharacterIds;
    expect(loadingIds.has('char-1')).toBe(false);
    expect(loadingIds.has('char-2')).toBe(true);
  });
});

// ============================================================================
// Error State Tests
// ============================================================================

describe('Character Store - Error States', () => {
  it('should set error message', () => {
    const { actions } = useCharacterStore.getState();
    actions.setError('Something went wrong');
    expect(useCharacterStore.getState().error).toBe('Something went wrong');
  });

  it('should clear error message', () => {
    const { actions } = useCharacterStore.getState();
    actions.setError('Error');
    actions.setError(null);
    expect(useCharacterStore.getState().error).toBeNull();
  });
});

// ============================================================================
// Dispatch Action Tests
// ============================================================================

describe('Character Store - Dispatch Action', () => {
  it('should handle edit action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.dispatchAction({ type: 'edit', characterId: char.id });
    const state = useCharacterStore.getState();
    expect(state.editorOpen).toBe(true);
    expect(state.editorMode).toBe('edit');
  });

  it('should handle duplicate action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter({ name: 'Original' });
    actions.addCharacter(char);
    actions.dispatchAction({ type: 'duplicate', characterId: char.id });
    expect(useCharacterStore.getState().characters.size).toBe(2);
  });

  it('should handle delete action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.dispatchAction({ type: 'delete', characterId: char.id });
    expect(actions.getCharacter(char.id)).toBeUndefined();
  });

  it('should handle setLora action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    const lora = createMockLora();
    actions.addCharacter(char);
    actions.dispatchAction({ type: 'setLora', characterId: char.id, lora });
    expect(actions.getCharacter(char.id)?.lora).toEqual(lora);
  });

  it('should handle clearLora action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    actions.addCharacter(char);
    actions.setCharacterLora(char.id, createMockLora());
    actions.dispatchAction({ type: 'clearLora', characterId: char.id });
    expect(actions.getCharacter(char.id)?.lora).toBeUndefined();
  });

  it('should handle removeReference action', () => {
    const { actions } = useCharacterStore.getState();
    const char = createMockCharacter();
    const ref = createMockReference({ id: 'ref-1' });
    actions.addCharacter(char);
    actions.addReference(char.id, ref);
    actions.dispatchAction({ type: 'removeReference', characterId: char.id, referenceId: 'ref-1' });
    expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(0);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Character Store - Utilities', () => {
  describe('getCharacter', () => {
    it('should return character by ID', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({ id: 'test-id' });
      actions.addCharacter(char);
      expect(actions.getCharacter('test-id')).toEqual(char);
    });

    it('should return undefined for non-existent ID', () => {
      const { actions } = useCharacterStore.getState();
      expect(actions.getCharacter('non-existent')).toBeUndefined();
    });
  });

  describe('getCharactersByProject', () => {
    it('should return characters for specific project', () => {
      const { actions } = useCharacterStore.getState();
      actions.addCharacter(createMockCharacter({ id: 'c1', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c2', projectId: 'proj-1' }));
      actions.addCharacter(createMockCharacter({ id: 'c3', projectId: 'proj-2' }));
      const chars = actions.getCharactersByProject('proj-1');
      expect(chars.length).toBe(2);
    });

    it('should return empty array for project with no characters', () => {
      const { actions } = useCharacterStore.getState();
      const chars = actions.getCharactersByProject('empty-project');
      expect(chars).toEqual([]);
    });
  });

  describe('duplicateCharacter', () => {
    it('should create duplicate with new ID', () => {
      const { actions } = useCharacterStore.getState();
      const original = createMockCharacter({ id: 'original', name: 'Original' });
      actions.addCharacter(original);
      const duplicate = actions.duplicateCharacter('original');
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).not.toBe('original');
    });

    it('should append (Copy) to name', () => {
      const { actions } = useCharacterStore.getState();
      const original = createMockCharacter({ name: 'My Character' });
      actions.addCharacter(original);
      const duplicate = actions.duplicateCharacter(original.id);
      expect(duplicate?.name).toBe('My Character (Copy)');
    });

    it('should copy all properties', () => {
      const { actions } = useCharacterStore.getState();
      const original = createMockCharacter({
        profile: createMockProfile({ species: 'elf' }),
        colorPalette: ['#FF0000'],
        promptFragments: ['elf', 'wizard'],
      });
      actions.addCharacter(original);
      const duplicate = actions.duplicateCharacter(original.id);
      expect(duplicate?.profile.species).toBe('elf');
      expect(duplicate?.colorPalette).toEqual(['#FF0000']);
    });

    it('should copy reference images with new IDs', () => {
      const { actions } = useCharacterStore.getState();
      const original = createMockCharacter();
      actions.addCharacter(original);
      actions.addReference(original.id, createMockReference({ id: 'ref-1' }));
      const duplicate = actions.duplicateCharacter(original.id);
      expect(duplicate?.referenceImages.length).toBe(1);
      expect(duplicate?.referenceImages[0].id).not.toBe('ref-1');
    });

    it('should return null for non-existent character', () => {
      const { actions } = useCharacterStore.getState();
      const duplicate = actions.duplicateCharacter('non-existent');
      expect(duplicate).toBeNull();
    });

    it('should copy LoRA configuration', () => {
      const { actions } = useCharacterStore.getState();
      const original = createMockCharacter();
      actions.addCharacter(original);
      actions.setCharacterLora(original.id, createMockLora({ strength: 0.8 }));
      const duplicate = actions.duplicateCharacter(original.id);
      expect(duplicate?.lora?.strength).toBe(0.8);
    });
  });

  describe('generatePromptFragments', () => {
    it('should generate fragments from profile', () => {
      const { actions } = useCharacterStore.getState();
      const char = createMockCharacter({
        profile: createMockProfile({
          species: 'elf',
          gender: 'female',
          age: '200',
          features: ['pointed ears', 'silver hair'],
        }),
      });
      actions.addCharacter(char);
      const fragments = actions.generatePromptFragments(char.id);
      expect(fragments).toContain('elf');
      expect(fragments).toContain('female');
      expect(fragments).toContain('200');
    });

    it('should return empty array for non-existent character', () => {
      const { actions } = useCharacterStore.getState();
      const fragments = actions.generatePromptFragments('non-existent');
      expect(fragments).toEqual([]);
    });
  });
});
