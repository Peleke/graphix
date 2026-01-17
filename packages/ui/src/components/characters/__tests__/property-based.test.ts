/**
 * Character Manager - Property-Based Tests
 * 
 * Using property-based testing patterns to find edge cases
 * that example-based tests might miss. These tests verify
 * invariants that should hold for ANY valid input.
 * 
 * ARRR! Testing with the fury of a thousand storms! 🏴‍☠️
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../store';
import type { 
  Character, 
  CharacterProfile, 
  ReferenceImage, 
  CharacterLoRA,
} from '../types';
import { 
  DEFAULT_CHARACTER_FILTERS, 
  MAX_COLOR_PALETTE_SIZE,
} from '../types';

// ============================================================================
// Property-Based Test Utilities
// ============================================================================

/**
 * Generate a random integer in range [min, max]
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random string of given length
 */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

/**
 * Generate a random hex color
 */
function randomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Generate random character profile
 */
function randomProfile(): CharacterProfile {
  const species = ['human', 'elf', 'orc', 'dwarf', 'dragon', ''][randomInt(0, 5)];
  return {
    species,
    description: randomString(randomInt(0, 200)),
    age: ['young', 'adult', 'old', ''][randomInt(0, 3)],
    gender: ['male', 'female', 'nonbinary', ''][randomInt(0, 3)],
    features: Array.from({ length: randomInt(0, 5) }, () => randomString(randomInt(3, 15))),
    personality: Array.from({ length: randomInt(0, 3) }, () => randomString(randomInt(3, 10))),
    backstory: Math.random() > 0.5 ? randomString(randomInt(10, 100)) : '',
  };
}

/**
 * Generate random reference image
 */
function randomReference(): ReferenceImage {
  const types = ['face', 'full_body', 'expression', 'pose', 'detail', 'other'] as const;
  return {
    id: `ref_${randomString(8)}`,
    imagePath: `/path/${randomString(10)}.png`,
    thumbnailPath: Math.random() > 0.3 ? `/thumb/${randomString(10)}.png` : undefined,
    type: types[randomInt(0, types.length - 1)],
    label: Math.random() > 0.5 ? randomString(randomInt(5, 20)) : undefined,
    colorPalette: Math.random() > 0.3 
      ? Array.from({ length: randomInt(1, 5) }, () => randomColor())
      : undefined,
    dimensions: Math.random() > 0.5 
      ? { width: randomInt(256, 2048), height: randomInt(256, 2048) }
      : undefined,
    createdAt: new Date(Date.now() - randomInt(0, 86400000 * 30)),
  };
}

/**
 * Generate random character
 */
function randomCharacter(): Character {
  const id = `char_${randomString(8)}`;
  return {
    id,
    projectId: `proj_${randomString(6)}`,
    name: randomString(randomInt(3, 30)),
    profile: randomProfile(),
    promptFragments: Array.from({ length: randomInt(0, 5) }, () => randomString(randomInt(3, 15))),
    referenceImages: [],
    colorPalette: Array.from({ length: randomInt(0, MAX_COLOR_PALETTE_SIZE) }, () => randomColor()),
    thumbnailPath: Math.random() > 0.5 ? `/thumb/${randomString(10)}.png` : undefined,
    lora: Math.random() > 0.7 ? {
      path: `/lora/${randomString(10)}.safetensors`,
      strength: Math.random() * 2,
      strengthClip: Math.random() > 0.5 ? Math.random() : undefined,
      triggerWords: Array.from({ length: randomInt(0, 3) }, () => randomString(randomInt(3, 10))),
    } : undefined,
    createdAt: new Date(Date.now() - randomInt(0, 86400000 * 30)),
    updatedAt: new Date(Date.now() - randomInt(0, 86400000 * 7)),
  };
}

/**
 * Run a property test multiple times with random inputs
 */
function forAll<T>(
  generator: () => T,
  property: (value: T) => void,
  iterations: number = 50
): void {
  for (let i = 0; i < iterations; i++) {
    const value = generator();
    property(value);
  }
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
// Property: Character Count Invariants
// ============================================================================

describe('Property: Character Count Invariants', () => {
  it('adding N characters results in exactly N characters', () => {
    forAll(
      () => randomInt(1, 30),
      (count) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        for (let i = 0; i < count; i++) {
          actions.addCharacter({
            ...randomCharacter(),
            projectId,
          });
        }
        
        const chars = actions.getCharactersByProject(projectId);
        expect(chars.length).toBe(count);
        
        // Cleanup
        chars.forEach(c => actions.removeCharacter(c.id));
      },
      20
    );
  });

  it('removing a character decreases count by 1', () => {
    forAll(
      () => randomInt(2, 20),
      (count) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        const ids: string[] = [];
        
        for (let i = 0; i < count; i++) {
          const char = { ...randomCharacter(), projectId };
          ids.push(char.id);
          actions.addCharacter(char);
        }
        
        expect(actions.getCharactersByProject(projectId).length).toBe(count);
        
        // Remove one
        actions.removeCharacter(ids[randomInt(0, ids.length - 1)]);
        
        expect(actions.getCharactersByProject(projectId).length).toBe(count - 1);
        
        // Cleanup
        ids.forEach(id => actions.removeCharacter(id));
      },
      15
    );
  });

  it('setCharacters replaces all characters', () => {
    forAll(
      () => ({ initial: randomInt(5, 15), replacement: randomInt(1, 10) }),
      ({ initial, replacement }) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        // Add initial characters
        for (let i = 0; i < initial; i++) {
          actions.addCharacter({ ...randomCharacter(), projectId });
        }
        
        // Replace with new set
        const newChars = Array.from({ length: replacement }, () => ({
          ...randomCharacter(),
          projectId,
        }));
        actions.setCharacters(newChars);
        
        expect(useCharacterStore.getState().characters.size).toBe(replacement);
      },
      10
    );
  });
});

// ============================================================================
// Property: Reference Count Invariants
// ============================================================================

describe('Property: Reference Count Invariants', () => {
  it('adding N references results in character having N references', () => {
    forAll(
      () => randomInt(1, 10),
      (refCount) => {
        const { actions } = useCharacterStore.getState();
        const char = randomCharacter();
        actions.addCharacter(char);
        
        for (let i = 0; i < refCount; i++) {
          actions.addReference(char.id, randomReference());
        }
        
        expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(refCount);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      20
    );
  });

  it('removing a reference decreases count by 1', () => {
    forAll(
      () => randomInt(2, 8),
      (refCount) => {
        const { actions } = useCharacterStore.getState();
        const char = randomCharacter();
        actions.addCharacter(char);
        
        const refIds: string[] = [];
        for (let i = 0; i < refCount; i++) {
          const ref = randomReference();
          refIds.push(ref.id);
          actions.addReference(char.id, ref);
        }
        
        const removeIndex = randomInt(0, refIds.length - 1);
        actions.removeReference(char.id, refIds[removeIndex]);
        
        expect(actions.getCharacter(char.id)?.referenceImages.length).toBe(refCount - 1);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      15
    );
  });
});

// ============================================================================
// Property: Color Palette Invariants
// ============================================================================

describe('Property: Color Palette Invariants', () => {
  it('color palette never exceeds MAX_COLOR_PALETTE_SIZE', () => {
    forAll(
      () => Array.from({ length: randomInt(1, 20) }, () => randomColor()),
      (colors) => {
        const { actions } = useCharacterStore.getState();
        const char = randomCharacter();
        actions.addCharacter(char);
        
        actions.updateColorPalette(char.id, colors);
        
        const palette = actions.getCharacter(char.id)?.colorPalette;
        expect(palette?.length).toBeLessThanOrEqual(MAX_COLOR_PALETTE_SIZE);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      20
    );
  });

  it('merged color palettes never exceed MAX_COLOR_PALETTE_SIZE', () => {
    forAll(
      () => ({
        initial: Array.from({ length: randomInt(1, 8) }, () => randomColor()),
        refColors: Array.from({ length: randomInt(1, 8) }, () => randomColor()),
      }),
      ({ initial, refColors }) => {
        const { actions } = useCharacterStore.getState();
        const char = { ...randomCharacter(), colorPalette: initial };
        actions.addCharacter(char);
        
        const ref = { ...randomReference(), colorPalette: refColors };
        actions.addReference(char.id, ref);
        
        const palette = actions.getCharacter(char.id)?.colorPalette;
        expect(palette?.length).toBeLessThanOrEqual(MAX_COLOR_PALETTE_SIZE);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      20
    );
  });
});

// ============================================================================
// Property: LoRA Strength Invariants
// ============================================================================

describe('Property: LoRA Strength Invariants', () => {
  it('LoRA strength is always clamped to [0, 2]', () => {
    forAll(
      () => (Math.random() - 0.5) * 10, // Random between -5 and 5
      (strength) => {
        const { actions } = useCharacterStore.getState();
        const char = randomCharacter();
        actions.addCharacter(char);
        actions.setCharacterLora(char.id, { path: '/test.safetensors', strength: 0.5 });
        
        actions.setLoraStrength(char.id, strength);
        
        const loraStrength = actions.getCharacter(char.id)?.lora?.strength;
        expect(loraStrength).toBeGreaterThanOrEqual(0);
        expect(loraStrength).toBeLessThanOrEqual(2);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      30
    );
  });
});

// ============================================================================
// Property: ID Uniqueness
// ============================================================================

describe('Property: ID Uniqueness', () => {
  it('all character IDs are unique', () => {
    const { actions } = useCharacterStore.getState();
    const ids = new Set<string>();
    const projectId = randomString(8);
    
    forAll(
      () => ({ ...randomCharacter(), projectId }),
      (char) => {
        // ID should not already exist
        expect(ids.has(char.id)).toBe(false);
        ids.add(char.id);
        actions.addCharacter(char);
      },
      50
    );
    
    expect(ids.size).toBe(50);
  });

  it('duplicate character IDs are unique from originals', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        
        const duplicate = actions.duplicateCharacter(char.id);
        
        expect(duplicate).not.toBeNull();
        expect(duplicate?.id).not.toBe(char.id);
        
        // Cleanup
        actions.removeCharacter(char.id);
        if (duplicate) actions.removeCharacter(duplicate.id);
      },
      20
    );
  });

  it('duplicated reference IDs are unique from originals', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        
        // Add some references
        const refs = Array.from({ length: 3 }, () => randomReference());
        refs.forEach(ref => actions.addReference(char.id, ref));
        
        const duplicate = actions.duplicateCharacter(char.id);
        
        if (duplicate) {
          const originalRefIds = new Set(actions.getCharacter(char.id)?.referenceImages.map(r => r.id));
          const duplicateRefIds = duplicate.referenceImages.map(r => r.id);
          
          // None of the duplicate ref IDs should exist in original
          duplicateRefIds.forEach(id => {
            expect(originalRefIds.has(id)).toBe(false);
          });
        }
        
        // Cleanup
        actions.removeCharacter(char.id);
        if (duplicate) actions.removeCharacter(duplicate.id);
      },
      15
    );
  });
});

// ============================================================================
// Property: Selection Invariants
// ============================================================================

describe('Property: Selection Invariants', () => {
  it('at most one character is selected at a time', () => {
    forAll(
      () => randomInt(3, 15),
      (charCount) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        const ids: string[] = [];
        
        for (let i = 0; i < charCount; i++) {
          const char = { ...randomCharacter(), projectId };
          ids.push(char.id);
          actions.addCharacter(char);
        }
        
        // Select random characters multiple times
        for (let i = 0; i < 10; i++) {
          actions.selectCharacter(ids[randomInt(0, ids.length - 1)]);
        }
        
        // Should have exactly one selected
        const selectedId = useCharacterStore.getState().selectedCharacterId;
        expect(ids).toContain(selectedId);
        
        // Cleanup
        ids.forEach(id => actions.removeCharacter(id));
      },
      10
    );
  });

  it('selected character ID matches what was passed to selectCharacter', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        actions.selectCharacter(char.id);
        
        expect(useCharacterStore.getState().selectedCharacterId).toBe(char.id);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      20
    );
  });
});

// ============================================================================
// Property: Filter Invariants
// ============================================================================

describe('Property: Filter Invariants', () => {
  it('filtered characters is subset of all characters', () => {
    forAll(
      () => randomInt(5, 20),
      (charCount) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        for (let i = 0; i < charCount; i++) {
          actions.addCharacter({ ...randomCharacter(), projectId });
        }
        
        // Apply random filter
        actions.setFilters({ search: randomString(randomInt(1, 5)) });
        
        const allChars = actions.getCharactersByProject(projectId);
        const filteredChars = actions.getFilteredCharacters(projectId);
        
        expect(filteredChars.length).toBeLessThanOrEqual(allChars.length);
        
        // Every filtered character should be in all characters
        filteredChars.forEach(fc => {
          expect(allChars.some(c => c.id === fc.id)).toBe(true);
        });
        
        // Cleanup
        allChars.forEach(c => actions.removeCharacter(c.id));
      },
      15
    );
  });

  it('clearing filters returns all characters for project', () => {
    forAll(
      () => randomInt(5, 15),
      (charCount) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        for (let i = 0; i < charCount; i++) {
          actions.addCharacter({ ...randomCharacter(), projectId });
        }
        
        // Apply and then clear filter
        actions.setFilters({ search: randomString(10), hasLora: true });
        actions.clearFilters();
        
        const allChars = actions.getCharactersByProject(projectId);
        const filteredChars = actions.getFilteredCharacters(projectId);
        
        expect(filteredChars.length).toBe(allChars.length);
        
        // Cleanup
        allChars.forEach(c => actions.removeCharacter(c.id));
      },
      10
    );
  });
});

// ============================================================================
// Property: Sort Invariants
// ============================================================================

describe('Property: Sort Invariants', () => {
  it('sorted list has same length as unsorted', () => {
    forAll(
      () => randomInt(5, 20),
      (charCount) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        for (let i = 0; i < charCount; i++) {
          actions.addCharacter({ ...randomCharacter(), projectId });
        }
        
        // Apply random sort
        const sortOptions = ['name', 'createdAt', 'updatedAt'] as const;
        actions.setSortBy(sortOptions[randomInt(0, 2)]);
        actions.setSortDirection(Math.random() > 0.5 ? 'asc' : 'desc');
        
        const allChars = actions.getCharactersByProject(projectId);
        const sortedChars = actions.getFilteredCharacters(projectId);
        
        expect(sortedChars.length).toBe(allChars.length);
        
        // Cleanup
        allChars.forEach(c => actions.removeCharacter(c.id));
      },
      15
    );
  });

  it('sorted list contains same elements as unsorted', () => {
    forAll(
      () => randomInt(3, 10),
      (charCount) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        for (let i = 0; i < charCount; i++) {
          actions.addCharacter({ ...randomCharacter(), projectId });
        }
        
        actions.setSortBy('name');
        actions.setSortDirection('desc');
        
        const allChars = actions.getCharactersByProject(projectId);
        const sortedChars = actions.getFilteredCharacters(projectId);
        
        const allIds = new Set(allChars.map(c => c.id));
        const sortedIds = new Set(sortedChars.map(c => c.id));
        
        expect(allIds.size).toBe(sortedIds.size);
        allIds.forEach(id => expect(sortedIds.has(id)).toBe(true));
        
        // Cleanup
        allChars.forEach(c => actions.removeCharacter(c.id));
      },
      10
    );
  });

  it('name sort is alphabetical', () => {
    forAll(
      () => Array.from({ length: randomInt(3, 10) }, () => randomString(randomInt(5, 15))),
      (names) => {
        const { actions } = useCharacterStore.getState();
        const projectId = randomString(8);
        
        names.forEach(name => {
          actions.addCharacter({ ...randomCharacter(), projectId, name });
        });
        
        actions.setSortBy('name');
        actions.setSortDirection('asc');
        
        const sorted = actions.getFilteredCharacters(projectId);
        
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].name.localeCompare(sorted[i - 1].name)).toBeGreaterThanOrEqual(0);
        }
        
        // Cleanup
        sorted.forEach(c => actions.removeCharacter(c.id));
      },
      15
    );
  });
});

// ============================================================================
// Property: Data Integrity
// ============================================================================

describe('Property: Data Integrity', () => {
  it('update preserves all unmodified fields', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        
        const newName = randomString(20);
        actions.updateCharacter(char.id, { name: newName });
        
        const updated = actions.getCharacter(char.id);
        expect(updated?.name).toBe(newName);
        expect(updated?.projectId).toBe(char.projectId);
        expect(updated?.profile.species).toBe(char.profile.species);
        expect(updated?.colorPalette).toEqual(char.colorPalette);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      20
    );
  });

  it('duplicate preserves all fields except id, name, and timestamps', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        
        const duplicate = actions.duplicateCharacter(char.id);
        
        if (duplicate) {
          expect(duplicate.projectId).toBe(char.projectId);
          expect(duplicate.profile).toEqual(char.profile);
          expect(duplicate.colorPalette).toEqual(char.colorPalette);
          expect(duplicate.promptFragments).toEqual(char.promptFragments);
        }
        
        // Cleanup
        actions.removeCharacter(char.id);
        if (duplicate) actions.removeCharacter(duplicate.id);
      },
      15
    );
  });
});

// ============================================================================
// Property: Idempotency
// ============================================================================

describe('Property: Idempotency', () => {
  it('selecting same character multiple times has same result', () => {
    forAll(
      () => randomCharacter(),
      (char) => {
        const { actions } = useCharacterStore.getState();
        actions.addCharacter(char);
        
        // Select multiple times
        for (let i = 0; i < 5; i++) {
          actions.selectCharacter(char.id);
        }
        
        expect(useCharacterStore.getState().selectedCharacterId).toBe(char.id);
        
        // Cleanup
        actions.removeCharacter(char.id);
      },
      10
    );
  });

  it('setting same filters multiple times has same result', () => {
    const filter = { search: randomString(10) };
    const { actions } = useCharacterStore.getState();
    
    for (let i = 0; i < 5; i++) {
      actions.setFilters(filter);
    }
    
    expect(useCharacterStore.getState().filters.search).toBe(filter.search);
  });

  it('toggling panel twice returns to original state', () => {
    forAll(
      () => Math.random() > 0.5,
      (startExpanded) => {
        const { actions } = useCharacterStore.getState();
        actions.setPanelState(startExpanded ? 'expanded' : 'collapsed');
        
        const original = useCharacterStore.getState().panelState;
        
        actions.togglePanel();
        actions.togglePanel();
        
        expect(useCharacterStore.getState().panelState).toBe(original);
      },
      10
    );
  });
});
