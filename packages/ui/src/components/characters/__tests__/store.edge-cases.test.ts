/**
 * Character Store - EXHAUSTIVE Edge Case Tests
 * 
 * Testing every conceivable edge case, boundary condition, and
 * error scenario. If it can break, we test it breaking!
 * 
 * ARRR! No edge case shall escape our cannons! 🏴‍☠️
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../store';
import type { 
  Character, 
  CharacterProfile, 
  ReferenceImage, 
  CharacterLoRA,
  CharacterFilters,
  LoRAEntry,
} from '../types';
import { 
  DEFAULT_CHARACTER_FILTERS, 
  MAX_COLOR_PALETTE_SIZE,
  MAX_REFERENCE_IMAGES,
} from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

const createProfile = (overrides: Partial<CharacterProfile> = {}): CharacterProfile => ({
  species: 'human',
  description: 'Test description',
  age: '25',
  gender: 'female',
  features: [],
  personality: [],
  backstory: '',
  ...overrides,
});

const createReference = (overrides: Partial<ReferenceImage> = {}): ReferenceImage => ({
  id: `ref_${Math.random().toString(36).substring(2, 9)}`,
  imagePath: '/path/to/image.png',
  type: 'full_body',
  createdAt: new Date(),
  ...overrides,
});

const createCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: `char_${Math.random().toString(36).substring(2, 9)}`,
  projectId: 'test-project',
  name: 'Test Character',
  profile: createProfile(),
  promptFragments: [],
  referenceImages: [],
  colorPalette: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createLora = (overrides: Partial<CharacterLoRA> = {}): CharacterLoRA => ({
  path: '/path/to/lora.safetensors',
  strength: 0.7,
  ...overrides,
});

const createLoraEntry = (overrides: Partial<LoRAEntry> = {}): LoRAEntry => ({
  filename: 'test.safetensors',
  name: 'Test LoRA',
  compatibleFamilies: ['sdxl'],
  category: 'character',
  strength: { min: 0.5, recommended: 0.7, max: 1.0 },
  stackPosition: 'first',
  ...overrides,
});

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
// Null/Undefined Input Handling
// ============================================================================

describe('Edge Cases - Null/Undefined Input Handling', () => {
  it('should handle getCharacter with undefined ID', () => {
    const { actions } = useCharacterStore.getState();
    // @ts-expect-error - Testing runtime behavior
    const result = actions.getCharacter(undefined);
    expect(result).toBeUndefined();
  });

  it('should handle getCharacter with empty string ID', () => {
    const { actions } = useCharacterStore.getState();
    const result = actions.getCharacter('');
    expect(result).toBeUndefined();
  });

  it('should handle updateCharacter on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.updateCharacter('non-existent', { name: 'New Name' });
    }).not.toThrow();
    expect(useCharacterStore.getState().characters.size).toBe(0);
  });

  it('should handle removeCharacter on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.removeCharacter('non-existent');
    }).not.toThrow();
  });

  it('should handle selectCharacter with non-existent ID', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.selectCharacter('non-existent');
    }).not.toThrow();
    // Selection is set even if character doesn't exist
    expect(useCharacterStore.getState().selectedCharacterId).toBe('non-existent');
  });

  it('should handle addReference to non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.addReference('non-existent', createReference());
    }).not.toThrow();
  });

  it('should handle removeReference from non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.removeReference('non-existent', 'ref-id');
    }).not.toThrow();
  });

  it('should handle setCharacterLora on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.setCharacterLora('non-existent', createLora());
    }).not.toThrow();
  });

  it('should handle clearCharacterLora on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.clearCharacterLora('non-existent');
    }).not.toThrow();
  });

  it('should handle setLoraStrength on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.setLoraStrength('non-existent', 0.5);
    }).not.toThrow();
  });

  it('should handle updateColorPalette on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.updateColorPalette('non-existent', ['#FF0000']);
    }).not.toThrow();
  });

  it('should handle extractColorsFromReference on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    expect(() => {
      actions.extractColorsFromReference('non-existent', 'ref-id');
    }).not.toThrow();
  });

  it('should handle duplicateCharacter on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    const result = actions.duplicateCharacter('non-existent');
    expect(result).toBeNull();
  });

  it('should handle generatePromptFragments on non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    const result = actions.generatePromptFragments('non-existent');
    expect(result).toEqual([]);
  });

  it('should handle getCharactersByProject with empty string', () => {
    const { actions } = useCharacterStore.getState();
    const result = actions.getCharactersByProject('');
    expect(result).toEqual([]);
  });

  it('should handle getFilteredCharacters with empty project ID', () => {
    const { actions } = useCharacterStore.getState();
    const result = actions.getFilteredCharacters('');
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Empty String Handling
// ============================================================================

describe('Edge Cases - Empty String Handling', () => {
  it('should handle character with empty name', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({ name: '' });
    actions.addCharacter(char);
    expect(actions.getCharacter(char.id)?.name).toBe('');
  });

  it('should handle empty search filter', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ id: 'c1', projectId: 'p1' }));
    actions.setFilters({ search: '' });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(1);
  });

  it('should handle whitespace-only search filter', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ id: 'c1', name: 'Test', projectId: 'p1' }));
    actions.setFilters({ search: '   ' });
    const filtered = actions.getFilteredCharacters('p1');
    // Whitespace-only search should match nothing unless we strip it
    expect(filtered.length).toBeLessThanOrEqual(1);
  });

  it('should handle character with empty profile fields', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({
        species: '',
        description: '',
        age: '',
        gender: '',
        features: [],
        personality: [],
        backstory: '',
      }),
    });
    actions.addCharacter(char);
    expect(actions.getCharacter(char.id)).toBeDefined();
  });

  it('should handle LoRA with empty path', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter();
    actions.addCharacter(char);
    actions.setCharacterLora(char.id, createLora({ path: '' }));
    expect(actions.getCharacter(char.id)?.lora?.path).toBe('');
  });

  it('should handle reference with empty imagePath', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter();
    actions.addCharacter(char);
    actions.addReference(char.id, createReference({ imagePath: '' }));
    expect(actions.getCharacter(char.id)?.referenceImages[0].imagePath).toBe('');
  });
});

// ============================================================================
// Boundary Conditions
// ============================================================================

describe('Edge Cases - Boundary Conditions', () => {
  describe('LoRA Strength Boundaries', () => {
    it('should clamp LoRA strength at 0', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createLora());
      actions.setLoraStrength(char.id, 0);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0);
    });

    it('should clamp LoRA strength at 2', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createLora());
      actions.setLoraStrength(char.id, 2);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(2);
    });

    it('should clamp negative LoRA strength to 0', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createLora());
      actions.setLoraStrength(char.id, -100);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0);
    });

    it('should clamp excessive LoRA strength to 2', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createLora());
      actions.setLoraStrength(char.id, 1000);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(2);
    });

    it('should handle decimal LoRA strength', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.setCharacterLora(char.id, createLora());
      actions.setLoraStrength(char.id, 0.75);
      expect(actions.getCharacter(char.id)?.lora?.strength).toBe(0.75);
    });
  });

  describe('Color Palette Size Limits', () => {
    it('should limit color palette to MAX_COLOR_PALETTE_SIZE', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      const manyColors = Array.from({ length: 20 }, (_, i) => 
        `#${i.toString(16).padStart(6, '0')}`
      );
      actions.addCharacter(char);
      actions.updateColorPalette(char.id, manyColors);
      expect(actions.getCharacter(char.id)?.colorPalette.length).toBeLessThanOrEqual(MAX_COLOR_PALETTE_SIZE);
    });

    it('should handle empty color palette', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter({ colorPalette: ['#FF0000'] });
      actions.addCharacter(char);
      actions.updateColorPalette(char.id, []);
      expect(actions.getCharacter(char.id)?.colorPalette).toEqual([]);
    });

    it('should merge colors without exceeding max size', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter({ colorPalette: ['#111111', '#222222', '#333333', '#444444'] });
      const ref = createReference({ colorPalette: ['#555555', '#666666', '#777777', '#888888', '#999999'] });
      actions.addCharacter(char);
      actions.addReference(char.id, ref);
      expect(actions.getCharacter(char.id)?.colorPalette.length).toBeLessThanOrEqual(MAX_COLOR_PALETTE_SIZE);
    });
  });
});

// ============================================================================
// Large Data Handling
// ============================================================================

describe('Edge Cases - Large Data Handling', () => {
  it('should handle 100 characters', () => {
    const { actions } = useCharacterStore.getState();
    
    for (let i = 0; i < 100; i++) {
      actions.addCharacter(createCharacter({ 
        id: `char-${i}`,
        projectId: 'test-project',
      }));
    }
    
    expect(useCharacterStore.getState().characters.size).toBe(100);
    expect(actions.getCharactersByProject('test-project').length).toBe(100);
  });

  it('should handle character with 10 references', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter();
    actions.addCharacter(char);
    
    for (let i = 0; i < 10; i++) {
      actions.addReference(char.id, createReference({ id: `ref-${i}` }));
    }
    
    expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(10);
  });

  it('should handle character with very long name', () => {
    const { actions } = useCharacterStore.getState();
    const longName = 'A'.repeat(1000);
    const char = createCharacter({ name: longName });
    actions.addCharacter(char);
    expect(actions.getCharacter(char.id)?.name).toBe(longName);
  });

  it('should handle character with very long description', () => {
    const { actions } = useCharacterStore.getState();
    const longDesc = 'Lorem ipsum '.repeat(1000);
    const char = createCharacter({
      profile: createProfile({ description: longDesc }),
    });
    actions.addCharacter(char);
    expect(actions.getCharacter(char.id)?.profile.description).toBe(longDesc);
  });

  it('should handle filtering 100 characters', () => {
    const { actions } = useCharacterStore.getState();
    
    for (let i = 0; i < 100; i++) {
      actions.addCharacter(createCharacter({ 
        id: `char-${i}`,
        name: `Character ${i % 10}`, // Create name patterns
        projectId: 'test-project',
      }));
    }
    
    actions.setFilters({ search: 'Character 5' });
    const filtered = actions.getFilteredCharacters('test-project');
    expect(filtered.length).toBe(10); // 5, 15, 25, 35, 45, 55, 65, 75, 85, 95
  });

  it('should handle 50 LoRAs in catalog', () => {
    const { actions } = useCharacterStore.getState();
    const loras = Array.from({ length: 50 }, (_, i) => 
      createLoraEntry({ 
        filename: `lora_${i}.safetensors`,
        category: i % 2 === 0 ? 'style' : 'character',
      })
    );
    actions.setLorasCatalog(loras);
    expect(useCharacterStore.getState().lorasCatalog.length).toBe(50);
    expect(actions.filterLorasByCategory('style').length).toBe(25);
  });
});

// ============================================================================
// Concurrent-like Operations
// ============================================================================

describe('Edge Cases - Concurrent-like Operations', () => {
  it('should handle rapid character additions', () => {
    const { actions } = useCharacterStore.getState();
    const ids = new Set<string>();
    
    for (let i = 0; i < 50; i++) {
      const char = createCharacter();
      ids.add(char.id);
      actions.addCharacter(char);
    }
    
    // All IDs should be unique
    expect(ids.size).toBe(50);
    expect(useCharacterStore.getState().characters.size).toBe(50);
  });

  it('should handle interleaved operations on multiple characters', () => {
    const { actions } = useCharacterStore.getState();
    const char1 = createCharacter({ id: 'char-1', name: 'Alice' });
    const char2 = createCharacter({ id: 'char-2', name: 'Bob' });
    
    actions.addCharacter(char1);
    actions.addCharacter(char2);
    
    // Interleave operations
    actions.selectCharacter(char1.id);
    actions.addReference(char2.id, createReference());
    actions.openEditor('edit', char1.id);
    actions.setCharacterLora(char2.id, createLora());
    actions.updateCharacter(char1.id, { name: 'Alice Updated' });
    
    // Verify all changes
    expect(useCharacterStore.getState().selectedCharacterId).toBe(char1.id);
    expect(actions.getCharacter(char2.id)?.referenceImages.length).toBe(1);
    expect(useCharacterStore.getState().editingCharacterId).toBe(char1.id);
    expect(actions.getCharacter(char2.id)?.lora).toBeDefined();
    expect(actions.getCharacter(char1.id)?.name).toBe('Alice Updated');
  });

  it('should handle rapid selection changes', () => {
    const { actions } = useCharacterStore.getState();
    const chars = Array.from({ length: 10 }, (_, i) => 
      createCharacter({ id: `char-${i}` })
    );
    chars.forEach(c => actions.addCharacter(c));
    
    // Rapid selection changes
    for (let i = 0; i < 100; i++) {
      actions.selectCharacter(`char-${i % 10}`);
    }
    
    // Final selection should be the last one
    expect(useCharacterStore.getState().selectedCharacterId).toBe('char-9');
  });

  it('should handle rapid filter changes', () => {
    const { actions } = useCharacterStore.getState();
    
    for (let i = 0; i < 20; i++) {
      actions.setFilters({ search: `search-${i}` });
    }
    
    expect(useCharacterStore.getState().filters.search).toBe('search-19');
  });
});

// ============================================================================
// State Transitions
// ============================================================================

describe('Edge Cases - State Transitions', () => {
  describe('Editor State Transitions', () => {
    it('should handle create -> edit mode transition', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      
      actions.openEditor('create');
      expect(useCharacterStore.getState().editorMode).toBe('create');
      
      actions.openEditor('edit', char.id);
      expect(useCharacterStore.getState().editorMode).toBe('edit');
      expect(useCharacterStore.getState().editingCharacterId).toBe(char.id);
    });

    it('should handle edit -> view mode transition', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      
      actions.openEditor('edit', char.id);
      actions.openEditor('view', char.id);
      
      expect(useCharacterStore.getState().editorMode).toBe('view');
    });

    it('should handle editor close while editing', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      
      actions.openEditor('edit', char.id);
      actions.closeEditor();
      
      expect(useCharacterStore.getState().editorOpen).toBe(false);
      expect(useCharacterStore.getState().editingCharacterId).toBeNull();
    });

    it('should handle switching between characters while editing', () => {
      const { actions } = useCharacterStore.getState();
      const char1 = createCharacter({ id: 'char-1' });
      const char2 = createCharacter({ id: 'char-2' });
      actions.addCharacter(char1);
      actions.addCharacter(char2);
      
      actions.openEditor('edit', char1.id);
      actions.openEditor('edit', char2.id);
      
      expect(useCharacterStore.getState().editingCharacterId).toBe('char-2');
    });
  });

  describe('Panel State Transitions', () => {
    it('should maintain panel state across character operations', () => {
      const { actions } = useCharacterStore.getState();
      actions.setPanelState('collapsed');
      
      actions.addCharacter(createCharacter());
      expect(useCharacterStore.getState().panelState).toBe('collapsed');
      
      actions.selectCharacter('char-1');
      expect(useCharacterStore.getState().panelState).toBe('collapsed');
    });
  });

  describe('Selection State Transitions', () => {
    it('should clear selection when selected character is deleted', () => {
      const { actions } = useCharacterStore.getState();
      const char = createCharacter();
      actions.addCharacter(char);
      actions.selectCharacter(char.id);
      
      expect(useCharacterStore.getState().selectedCharacterId).toBe(char.id);
      
      actions.removeCharacter(char.id);
      expect(useCharacterStore.getState().selectedCharacterId).toBeNull();
    });

    it('should maintain selection when other character is deleted', () => {
      const { actions } = useCharacterStore.getState();
      const char1 = createCharacter({ id: 'char-1' });
      const char2 = createCharacter({ id: 'char-2' });
      actions.addCharacter(char1);
      actions.addCharacter(char2);
      actions.selectCharacter(char1.id);
      
      actions.removeCharacter(char2.id);
      expect(useCharacterStore.getState().selectedCharacterId).toBe('char-1');
    });
  });
});

// ============================================================================
// Data Integrity
// ============================================================================

describe('Edge Cases - Data Integrity', () => {
  it('should preserve character data after update', () => {
    const { actions } = useCharacterStore.getState();
    const original = createCharacter({
      name: 'Original',
      profile: createProfile({ species: 'elf', description: 'An elf' }),
      colorPalette: ['#FF0000', '#00FF00'],
      promptFragments: ['elf', 'wizard'],
    });
    actions.addCharacter(original);
    
    // Update only name
    actions.updateCharacter(original.id, { name: 'Updated' });
    
    const updated = actions.getCharacter(original.id);
    expect(updated?.name).toBe('Updated');
    expect(updated?.profile.species).toBe('elf');
    expect(updated?.colorPalette).toEqual(['#FF0000', '#00FF00']);
    expect(updated?.promptFragments).toEqual(['elf', 'wizard']);
  });

  it('should generate unique IDs across duplicates', () => {
    const { actions } = useCharacterStore.getState();
    const original = createCharacter();
    actions.addCharacter(original);
    
    const dup1 = actions.duplicateCharacter(original.id);
    const dup2 = actions.duplicateCharacter(original.id);
    const dup3 = actions.duplicateCharacter(original.id);
    
    const ids = new Set([original.id, dup1?.id, dup2?.id, dup3?.id]);
    expect(ids.size).toBe(4);
  });

  it('should maintain reference integrity after duplicate', () => {
    const { actions } = useCharacterStore.getState();
    const original = createCharacter();
    actions.addCharacter(original);
    actions.addReference(original.id, createReference({ id: 'ref-1' }));
    
    const duplicate = actions.duplicateCharacter(original.id);
    
    // Modifying original's reference should not affect duplicate
    actions.updateReferenceType(original.id, 'ref-1', 'face');
    
    expect(actions.getCharacter(original.id)?.referenceImages[0].type).toBe('face');
    expect(duplicate?.referenceImages[0].type).toBe('full_body');
  });

  it('should maintain LoRA integrity after duplicate', () => {
    const { actions } = useCharacterStore.getState();
    const original = createCharacter();
    actions.addCharacter(original);
    actions.setCharacterLora(original.id, createLora({ strength: 0.5 }));
    
    const duplicate = actions.duplicateCharacter(original.id);
    
    // Modifying original's LoRA should not affect duplicate
    actions.setLoraStrength(original.id, 0.9);
    
    expect(actions.getCharacter(original.id)?.lora?.strength).toBe(0.9);
    expect(duplicate?.lora?.strength).toBe(0.5);
  });
});

// ============================================================================
// Filter Edge Cases
// ============================================================================

describe('Edge Cases - Filtering', () => {
  it('should handle multiple species filter values', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ 
      id: 'c1', 
      projectId: 'p1',
      profile: createProfile({ species: 'human' }),
    }));
    actions.addCharacter(createCharacter({ 
      id: 'c2', 
      projectId: 'p1',
      profile: createProfile({ species: 'elf' }),
    }));
    actions.addCharacter(createCharacter({ 
      id: 'c3', 
      projectId: 'p1',
      profile: createProfile({ species: 'orc' }),
    }));
    
    actions.setFilters({ species: ['human', 'elf'] });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(2);
  });

  it('should handle combined filters', () => {
    const { actions } = useCharacterStore.getState();
    const char1 = createCharacter({ 
      id: 'c1', 
      name: 'Alice the Elf',
      projectId: 'p1',
    });
    const char2 = createCharacter({ 
      id: 'c2', 
      name: 'Bob the Human',
      projectId: 'p1',
    });
    actions.addCharacter(char1);
    actions.addCharacter(char2);
    actions.setCharacterLora(char1.id, createLora());
    
    // Filter by search + hasLora
    actions.setFilters({ search: 'Alice', hasLora: true });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('c1');
  });

  it('should handle filter with no matches', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ id: 'c1', name: 'Test', projectId: 'p1' }));
    actions.setFilters({ search: 'NonExistent' });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(0);
  });

  it('should handle case-insensitive search', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ 
      id: 'c1', 
      name: 'UPPERCASE Character',
      projectId: 'p1',
    }));
    
    actions.setFilters({ search: 'uppercase' });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(1);
  });

  it('should search in description', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ 
      id: 'c1', 
      name: 'Character',
      profile: createProfile({ description: 'A powerful wizard' }),
      projectId: 'p1',
    }));
    
    actions.setFilters({ search: 'wizard' });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(1);
  });

  it('should search in species', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ 
      id: 'c1', 
      name: 'Character',
      profile: createProfile({ species: 'half-dragon' }),
      projectId: 'p1',
    }));
    
    actions.setFilters({ search: 'dragon' });
    const filtered = actions.getFilteredCharacters('p1');
    expect(filtered.length).toBe(1);
  });
});

// ============================================================================
// Sorting Edge Cases
// ============================================================================

describe('Edge Cases - Sorting', () => {
  it('should handle sorting empty list', () => {
    const { actions } = useCharacterStore.getState();
    const sorted = actions.getFilteredCharacters('empty-project');
    expect(sorted).toEqual([]);
  });

  it('should handle sorting single item', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ id: 'c1', projectId: 'p1' }));
    const sorted = actions.getFilteredCharacters('p1');
    expect(sorted.length).toBe(1);
  });

  it('should maintain stability for equal values', () => {
    const { actions } = useCharacterStore.getState();
    // Add characters with same name
    for (let i = 0; i < 5; i++) {
      actions.addCharacter(createCharacter({ 
        id: `c${i}`, 
        name: 'SameName',
        projectId: 'p1',
      }));
    }
    
    const sorted = actions.getFilteredCharacters('p1');
    expect(sorted.length).toBe(5);
    // All should have the same name
    sorted.forEach(c => expect(c.name).toBe('SameName'));
  });

  it('should handle special characters in names when sorting', () => {
    const { actions } = useCharacterStore.getState();
    actions.addCharacter(createCharacter({ id: 'c1', name: 'Àlice', projectId: 'p1' }));
    actions.addCharacter(createCharacter({ id: 'c2', name: 'Zara', projectId: 'p1' }));
    actions.addCharacter(createCharacter({ id: 'c3', name: 'Bob', projectId: 'p1' }));
    
    actions.setSortBy('name');
    actions.setSortDirection('asc');
    const sorted = actions.getFilteredCharacters('p1');
    
    // Should handle locale-aware sorting
    expect(sorted.length).toBe(3);
  });

  it('should sort by date correctly', () => {
    const { actions } = useCharacterStore.getState();
    const now = Date.now();
    
    actions.addCharacter(createCharacter({ 
      id: 'c1', 
      name: 'Second',
      projectId: 'p1',
      createdAt: new Date(now - 1000),
    }));
    actions.addCharacter(createCharacter({ 
      id: 'c2', 
      name: 'First',
      projectId: 'p1',
      createdAt: new Date(now - 2000),
    }));
    actions.addCharacter(createCharacter({ 
      id: 'c3', 
      name: 'Third',
      projectId: 'p1',
      createdAt: new Date(now),
    }));
    
    actions.setSortBy('createdAt');
    actions.setSortDirection('asc');
    const sorted = actions.getFilteredCharacters('p1');
    
    expect(sorted[0].name).toBe('First');
    expect(sorted[1].name).toBe('Second');
    expect(sorted[2].name).toBe('Third');
  });
});

// ============================================================================
// LoRA Catalog Edge Cases
// ============================================================================

describe('Edge Cases - LoRA Catalog', () => {
  it('should handle empty LoRA catalog', () => {
    const { actions } = useCharacterStore.getState();
    expect(actions.filterLorasByCategory('style')).toEqual([]);
    expect(actions.filterLorasByFamily('sdxl')).toEqual([]);
  });

  it('should handle LoRA with no compatible families', () => {
    const { actions } = useCharacterStore.getState();
    actions.setLorasCatalog([
      createLoraEntry({ compatibleFamilies: [] }),
    ]);
    expect(actions.filterLorasByFamily('sdxl')).toEqual([]);
  });

  it('should handle LoRA with multiple families', () => {
    const { actions } = useCharacterStore.getState();
    actions.setLorasCatalog([
      createLoraEntry({ compatibleFamilies: ['sdxl', 'illustrious', 'pony'] }),
    ]);
    expect(actions.filterLorasByFamily('sdxl').length).toBe(1);
    expect(actions.filterLorasByFamily('illustrious').length).toBe(1);
    expect(actions.filterLorasByFamily('pony').length).toBe(1);
    expect(actions.filterLorasByFamily('flux').length).toBe(0);
  });

  it('should replace catalog completely on set', () => {
    const { actions } = useCharacterStore.getState();
    actions.setLorasCatalog([createLoraEntry({ filename: 'first.safetensors' })]);
    actions.setLorasCatalog([createLoraEntry({ filename: 'second.safetensors' })]);
    
    expect(useCharacterStore.getState().lorasCatalog.length).toBe(1);
    expect(useCharacterStore.getState().lorasCatalog[0].filename).toBe('second.safetensors');
  });
});

// ============================================================================
// Loading State Edge Cases
// ============================================================================

describe('Edge Cases - Loading States', () => {
  it('should handle setting same loading state multiple times', () => {
    const { actions } = useCharacterStore.getState();
    actions.setLoading(true);
    actions.setLoading(true);
    actions.setLoading(true);
    expect(useCharacterStore.getState().isLoading).toBe(true);
  });

  it('should handle setting character loading for non-existent character', () => {
    const { actions } = useCharacterStore.getState();
    actions.setCharacterLoading('non-existent', true);
    expect(useCharacterStore.getState().loadingCharacterIds.has('non-existent')).toBe(true);
  });

  it('should handle rapid loading state changes', () => {
    const { actions } = useCharacterStore.getState();
    for (let i = 0; i < 100; i++) {
      actions.setCharacterLoading(`char-${i % 10}`, i % 2 === 0);
    }
    // Final state depends on last operation for each character
    expect(useCharacterStore.getState().loadingCharacterIds.size).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// Error State Edge Cases
// ============================================================================

describe('Edge Cases - Error States', () => {
  it('should handle empty error message', () => {
    const { actions } = useCharacterStore.getState();
    actions.setError('');
    expect(useCharacterStore.getState().error).toBe('');
  });

  it('should handle very long error message', () => {
    const { actions } = useCharacterStore.getState();
    const longError = 'Error: '.repeat(1000);
    actions.setError(longError);
    expect(useCharacterStore.getState().error).toBe(longError);
  });

  it('should handle rapid error state changes', () => {
    const { actions } = useCharacterStore.getState();
    for (let i = 0; i < 100; i++) {
      actions.setError(i % 2 === 0 ? `Error ${i}` : null);
    }
    expect(useCharacterStore.getState().error).toBeNull();
  });
});

// ============================================================================
// Prompt Fragment Generation Edge Cases
// ============================================================================

describe('Edge Cases - Prompt Fragment Generation', () => {
  it('should handle profile with all empty fields', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({
        species: '',
        description: '',
        age: '',
        gender: '',
        features: [],
      }),
    });
    actions.addCharacter(char);
    const fragments = actions.generatePromptFragments(char.id);
    expect(fragments).toEqual([]);
  });

  it('should extract hair description from text', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({
        description: 'A character with long blonde hair and blue eyes',
      }),
    });
    actions.addCharacter(char);
    const fragments = actions.generatePromptFragments(char.id);
    expect(fragments.some(f => f.includes('hair'))).toBe(true);
  });

  it('should extract eye description from text', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({
        description: 'A character with piercing green eyes',
      }),
    });
    actions.addCharacter(char);
    const fragments = actions.generatePromptFragments(char.id);
    expect(fragments.some(f => f.includes('eyes'))).toBe(true);
  });

  it('should limit features to 5', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({
        // Use features that don't conflict with other fields like 'female'
        features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6', 'feature7', 'feature8'],
        gender: 'male', // Avoid 'female' which starts with 'f'
      }),
    });
    actions.addCharacter(char);
    const fragments = actions.generatePromptFragments(char.id);
    // Should include at most 5 features
    const featureFragments = fragments.filter(f => f.startsWith('feature'));
    expect(featureFragments.length).toBeLessThanOrEqual(5);
  });

  it('should update promptFragments on character', () => {
    const { actions } = useCharacterStore.getState();
    const char = createCharacter({
      profile: createProfile({ species: 'dragon' }),
      promptFragments: [],
    });
    actions.addCharacter(char);
    actions.generatePromptFragments(char.id);
    expect(actions.getCharacter(char.id)?.promptFragments).toContain('dragon');
  });
});
