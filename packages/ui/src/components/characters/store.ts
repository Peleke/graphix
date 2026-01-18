/**
 * Character Store
 * 
 * Zustand store for managing character state.
 * Handles CRUD operations, UI state, and API integration.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// Import setup module for side effect (enables Map/Set in immer)
// This isolates the side effect to a single import point
import './setup-immer';

// Import injectable ID generator (pure functions ftw!)
import { generateCharacterId, generateReferenceId } from './id-generator';

import type {
  Character,
  CharacterProfile,
  CharacterLoRA,
  ReferenceImage,
  ReferenceImageType,
  CharacterAction,
  CharacterFilters,
  CharacterSortBy,
  SortDirection,
  PanelState,
  EditorMode,
  LoRAEntry,
  LoRACategory,
  ModelFamily,
} from './types';

import {
  DEFAULT_CHARACTER_FILTERS,
  DEFAULT_LORA_STRENGTH,
  MAX_COLOR_PALETTE_SIZE,
} from './types';

// ============================================================================
// API Base URL
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ============================================================================
// Store State
// ============================================================================

interface CharacterState {
  // Data
  characters: Map<string, Character>;
  lorasCatalog: LoRAEntry[];
  
  // UI State
  panelState: PanelState;
  selectedCharacterId: string | null;
  editingCharacterId: string | null;
  editorMode: EditorMode;
  editorOpen: boolean;
  loraBrowserOpen: boolean;
  
  // Filtering & Sorting
  filters: CharacterFilters;
  sortBy: CharacterSortBy;
  sortDirection: SortDirection;
  
  // Loading States
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isUploadingReference: boolean;
  loadingCharacterIds: Set<string>;
  
  // Error States
  error: string | null;
  
  // Actions
  actions: CharacterActions;
}

interface CharacterActions {
  // Panel State
  setPanelState: (state: PanelState) => void;
  togglePanel: () => void;
  
  // Selection
  selectCharacter: (id: string | null) => void;
  
  // Editor State
  openEditor: (mode: EditorMode, characterId?: string) => void;
  closeEditor: () => void;
  
  // LoRA Browser State
  openLoraBrowser: () => void;
  closeLoraBrowser: () => void;
  
  // CRUD Operations (Local)
  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  
  // Reference Operations
  addReference: (characterId: string, reference: ReferenceImage) => void;
  removeReference: (characterId: string, referenceId: string) => void;
  updateReferenceType: (characterId: string, referenceId: string, type: ReferenceImageType) => void;
  
  // LoRA Operations
  setCharacterLora: (characterId: string, lora: CharacterLoRA) => void;
  clearCharacterLora: (characterId: string) => void;
  setLoraStrength: (characterId: string, strength: number) => void;
  
  // Color Palette
  updateColorPalette: (characterId: string, colors: string[]) => void;
  extractColorsFromReference: (characterId: string, referenceId: string) => void;
  
  // Prompt Fragments
  generatePromptFragments: (characterId: string) => string[];
  
  // LoRA Catalog
  setLorasCatalog: (loras: LoRAEntry[]) => void;
  filterLorasByCategory: (category: LoRACategory) => LoRAEntry[];
  filterLorasByFamily: (family: ModelFamily) => LoRAEntry[];
  
  // Filtering & Sorting
  setFilters: (filters: Partial<CharacterFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: CharacterSortBy) => void;
  setSortDirection: (direction: SortDirection) => void;
  
  // Loading States
  setLoading: (loading: boolean) => void;
  setCharacterLoading: (characterId: string, loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Dispatch Action
  dispatchAction: (action: CharacterAction) => void;
  
  // Utilities
  getCharacter: (id: string) => Character | undefined;
  getCharactersByProject: (projectId: string) => Character[];
  getFilteredCharacters: (projectId: string) => Character[];
  getSortedCharacters: (characters: Character[]) => Character[];
  duplicateCharacter: (id: string) => Character | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

// ID generation is now handled by id-generator.ts (injectable for testing)
// generateCharacterId() and generateReferenceId() imported at top

/**
 * Extract prompt fragments from character profile
 */
function extractPromptFragments(profile: CharacterProfile): string[] {
  const fragments: string[] = [];
  
  if (profile.species) {
    fragments.push(profile.species);
  }
  
  if (profile.gender) {
    fragments.push(profile.gender);
  }
  
  if (profile.age) {
    fragments.push(profile.age);
  }
  
  if (profile.description) {
    // Extract key descriptive phrases
    const desc = profile.description.toLowerCase();
    
    // Common physical descriptors
    const hairMatch = desc.match(/([\w\s]+ hair)/);
    if (hairMatch) fragments.push(hairMatch[1]);
    
    const eyeMatch = desc.match(/([\w\s]+ eyes?)/);
    if (eyeMatch) fragments.push(eyeMatch[1]);
  }
  
  // Only add features up to a max of 5, and only if we have room
  if (profile.features && profile.features.length > 0) {
    const maxFeatures = 5;
    const featuresToAdd = profile.features.slice(0, maxFeatures);
    fragments.push(...featuresToAdd);
  }
  
  return fragments.filter(f => f.trim().length > 0);
}

/**
 * Merge color palettes, removing duplicates and limiting size
 */
function mergeColorPalettes(palettes: string[][], maxSize: number = MAX_COLOR_PALETTE_SIZE): string[] {
  const uniqueColors = new Set<string>();
  
  for (const palette of palettes) {
    for (const color of palette) {
      uniqueColors.add(color.toUpperCase());
      if (uniqueColors.size >= maxSize) break;
    }
    if (uniqueColors.size >= maxSize) break;
  }
  
  return Array.from(uniqueColors);
}

/**
 * Sort characters by the given field and direction
 */
function sortCharacters(
  characters: Character[],
  sortBy: CharacterSortBy,
  direction: SortDirection
): Character[] {
  const sorted = [...characters].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Filter characters based on filter options
 */
function filterCharacters(
  characters: Character[],
  filters: CharacterFilters
): Character[] {
  return characters.filter(char => {
    // Search filter
    if (filters.search && filters.search.trim()) {
      const search = filters.search.toLowerCase();
      const nameMatch = char.name.toLowerCase().includes(search);
      const speciesMatch = char.profile.species?.toLowerCase().includes(search);
      const descMatch = char.profile.description?.toLowerCase().includes(search);
      
      if (!nameMatch && !speciesMatch && !descMatch) {
        return false;
      }
    }
    
    // Species filter
    if (filters.species && filters.species.length > 0) {
      if (!char.profile.species || !filters.species.includes(char.profile.species)) {
        return false;
      }
    }
    
    // Has LoRA filter
    if (filters.hasLora !== undefined) {
      const hasLora = !!char.lora;
      if (filters.hasLora !== hasLora) {
        return false;
      }
    }
    
    // Has references filter
    if (filters.hasReferences !== undefined) {
      const hasRefs = char.referenceImages.length > 0;
      if (filters.hasReferences !== hasRefs) {
        return false;
      }
    }
    
    return true;
  });
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useCharacterStore = create<CharacterState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial State
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
      
      actions: {
        // ====================================================================
        // Panel State
        // ====================================================================
        
        setPanelState: (state: PanelState) => {
          set((draft) => {
            draft.panelState = state;
          });
        },
        
        togglePanel: () => {
          set((draft) => {
            draft.panelState = draft.panelState === 'expanded' ? 'collapsed' : 'expanded';
          });
        },
        
        // ====================================================================
        // Selection
        // ====================================================================
        
        selectCharacter: (id: string | null) => {
          set((draft) => {
            draft.selectedCharacterId = id;
          });
        },
        
        // ====================================================================
        // Editor State
        // ====================================================================
        
        openEditor: (mode: EditorMode, characterId?: string) => {
          set((draft) => {
            draft.editorMode = mode;
            draft.editingCharacterId = characterId ?? null;
            draft.editorOpen = true;
          });
        },
        
        closeEditor: () => {
          set((draft) => {
            draft.editorOpen = false;
            draft.editingCharacterId = null;
          });
        },
        
        // ====================================================================
        // LoRA Browser State
        // ====================================================================
        
        openLoraBrowser: () => {
          set((draft) => {
            draft.loraBrowserOpen = true;
          });
        },
        
        closeLoraBrowser: () => {
          set((draft) => {
            draft.loraBrowserOpen = false;
          });
        },
        
        // ====================================================================
        // CRUD Operations (Local)
        // ====================================================================
        
        setCharacters: (characters: Character[]) => {
          set((draft) => {
            draft.characters.clear();
            for (const char of characters) {
              draft.characters.set(char.id, char);
            }
          });
        },
        
        addCharacter: (character: Character) => {
          set((draft) => {
            draft.characters.set(character.id, character);
          });
        },
        
        updateCharacter: (id: string, updates: Partial<Character>) => {
          set((draft) => {
            const char = draft.characters.get(id);
            if (char) {
              Object.assign(char, updates, { updatedAt: new Date() });
            }
          });
        },
        
        removeCharacter: (id: string) => {
          set((draft) => {
            draft.characters.delete(id);
            if (draft.selectedCharacterId === id) {
              draft.selectedCharacterId = null;
            }
            if (draft.editingCharacterId === id) {
              draft.editingCharacterId = null;
              draft.editorOpen = false;
            }
          });
        },
        
        // ====================================================================
        // Reference Operations
        // ====================================================================
        
        addReference: (characterId: string, reference: ReferenceImage) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              char.referenceImages.push(reference);
              char.updatedAt = new Date();
              
              // Update thumbnail if this is the first reference
              if (char.referenceImages.length === 1) {
                char.thumbnailPath = reference.thumbnailPath || reference.imagePath;
              }
              
              // Update color palette
              if (reference.colorPalette && reference.colorPalette.length > 0) {
                char.colorPalette = mergeColorPalettes([
                  char.colorPalette,
                  reference.colorPalette,
                ]);
              }
            }
          });
        },
        
        removeReference: (characterId: string, referenceId: string) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              const index = char.referenceImages.findIndex(ref => ref.id === referenceId);
              if (index !== -1) {
                char.referenceImages.splice(index, 1);
                char.updatedAt = new Date();
                
                // Update thumbnail if we removed the current thumbnail source
                if (char.referenceImages.length > 0 && !char.thumbnailPath) {
                  const firstRef = char.referenceImages[0];
                  char.thumbnailPath = firstRef.thumbnailPath || firstRef.imagePath;
                } else if (char.referenceImages.length === 0) {
                  char.thumbnailPath = undefined;
                }
              }
            }
          });
        },
        
        updateReferenceType: (characterId: string, referenceId: string, type: ReferenceImageType) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              const ref = char.referenceImages.find(r => r.id === referenceId);
              if (ref) {
                ref.type = type;
                char.updatedAt = new Date();
              }
            }
          });
        },
        
        // ====================================================================
        // LoRA Operations
        // ====================================================================
        
        setCharacterLora: (characterId: string, lora: CharacterLoRA) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              char.lora = lora;
              char.updatedAt = new Date();
            }
          });
        },
        
        clearCharacterLora: (characterId: string) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              char.lora = undefined;
              char.updatedAt = new Date();
            }
          });
        },
        
        setLoraStrength: (characterId: string, strength: number) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char && char.lora) {
              char.lora.strength = Math.max(0, Math.min(2, strength));
              char.updatedAt = new Date();
            }
          });
        },
        
        // ====================================================================
        // Color Palette
        // ====================================================================
        
        updateColorPalette: (characterId: string, colors: string[]) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              char.colorPalette = colors.slice(0, MAX_COLOR_PALETTE_SIZE);
              char.updatedAt = new Date();
            }
          });
        },
        
        extractColorsFromReference: (characterId: string, referenceId: string) => {
          set((draft) => {
            const char = draft.characters.get(characterId);
            if (char) {
              const ref = char.referenceImages.find(r => r.id === referenceId);
              if (ref && ref.colorPalette) {
                char.colorPalette = mergeColorPalettes([
                  char.colorPalette,
                  ref.colorPalette,
                ]);
                char.updatedAt = new Date();
              }
            }
          });
        },
        
        // ====================================================================
        // Prompt Fragments
        // ====================================================================
        
        generatePromptFragments: (characterId: string): string[] => {
          const char = get().characters.get(characterId);
          if (!char) return [];
          
          const fragments = extractPromptFragments(char.profile);
          
          set((draft) => {
            const c = draft.characters.get(characterId);
            if (c) {
              c.promptFragments = fragments;
              c.updatedAt = new Date();
            }
          });
          
          return fragments;
        },
        
        // ====================================================================
        // LoRA Catalog
        // ====================================================================
        
        setLorasCatalog: (loras: LoRAEntry[]) => {
          set((draft) => {
            draft.lorasCatalog = loras;
          });
        },
        
        filterLorasByCategory: (category: LoRACategory): LoRAEntry[] => {
          return get().lorasCatalog.filter(lora => lora.category === category);
        },
        
        filterLorasByFamily: (family: ModelFamily): LoRAEntry[] => {
          return get().lorasCatalog.filter(lora => 
            lora.compatibleFamilies.includes(family)
          );
        },
        
        // ====================================================================
        // Filtering & Sorting
        // ====================================================================
        
        setFilters: (filters: Partial<CharacterFilters>) => {
          set((draft) => {
            Object.assign(draft.filters, filters);
          });
        },
        
        clearFilters: () => {
          set((draft) => {
            draft.filters = { ...DEFAULT_CHARACTER_FILTERS };
          });
        },
        
        setSortBy: (sortBy: CharacterSortBy) => {
          set((draft) => {
            draft.sortBy = sortBy;
          });
        },
        
        setSortDirection: (direction: SortDirection) => {
          set((draft) => {
            draft.sortDirection = direction;
          });
        },
        
        // ====================================================================
        // Loading States
        // ====================================================================
        
        setLoading: (loading: boolean) => {
          set((draft) => {
            draft.isLoading = loading;
          });
        },
        
        setCharacterLoading: (characterId: string, loading: boolean) => {
          set((draft) => {
            if (loading) {
              draft.loadingCharacterIds.add(characterId);
            } else {
              draft.loadingCharacterIds.delete(characterId);
            }
          });
        },
        
        setError: (error: string | null) => {
          set((draft) => {
            draft.error = error;
          });
        },
        
        // ====================================================================
        // Dispatch Action
        // ====================================================================
        
        dispatchAction: (action: CharacterAction) => {
          const { actions } = get();
          
          switch (action.type) {
            case 'edit':
              actions.openEditor('edit', action.characterId);
              break;
            case 'duplicate':
              actions.duplicateCharacter(action.characterId);
              break;
            case 'delete':
              actions.removeCharacter(action.characterId);
              break;
            case 'addReference':
              // This would trigger file upload UI
              actions.selectCharacter(action.characterId);
              break;
            case 'removeReference':
              actions.removeReference(action.characterId, action.referenceId);
              break;
            case 'setLora':
              actions.setCharacterLora(action.characterId, action.lora);
              break;
            case 'clearLora':
              actions.clearCharacterLora(action.characterId);
              break;
            case 'generateReference':
              // This would trigger AI generation
              actions.selectCharacter(action.characterId);
              break;
          }
        },
        
        // ====================================================================
        // Utilities
        // ====================================================================
        
        getCharacter: (id: string): Character | undefined => {
          return get().characters.get(id);
        },
        
        getCharactersByProject: (projectId: string): Character[] => {
          const { characters } = get();
          return Array.from(characters.values()).filter(
            char => char.projectId === projectId
          );
        },
        
        getFilteredCharacters: (projectId: string): Character[] => {
          const { characters, filters, sortBy, sortDirection } = get();
          
          // Get characters for project
          const projectChars = Array.from(characters.values()).filter(
            char => char.projectId === projectId
          );
          
          // Apply filters
          const filtered = filterCharacters(projectChars, filters);
          
          // Apply sorting
          return sortCharacters(filtered, sortBy, sortDirection);
        },
        
        getSortedCharacters: (characters: Character[]): Character[] => {
          const { sortBy, sortDirection } = get();
          return sortCharacters(characters, sortBy, sortDirection);
        },
        
        duplicateCharacter: (id: string): Character | null => {
          const original = get().characters.get(id);
          if (!original) return null;
          
          const duplicate: Character = {
            ...original,
            id: generateCharacterId(),
            name: `${original.name} (Copy)`,
            referenceImages: original.referenceImages.map(ref => ({
              ...ref,
              id: generateReferenceId(),
            })),
            colorPalette: [...original.colorPalette],
            promptFragments: [...original.promptFragments],
            lora: original.lora ? { ...original.lora } : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          set((draft) => {
            draft.characters.set(duplicate.id, duplicate);
          });
          
          return duplicate;
        },
      },
    }))
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCharacters = () => {
  return useCharacterStore((state) => state.characters);
};

export const useCharacterActions = () => {
  return useCharacterStore((state) => state.actions);
};

export const useSelectedCharacter = () => {
  return useCharacterStore((state) => {
    if (!state.selectedCharacterId) return null;
    return state.characters.get(state.selectedCharacterId) ?? null;
  });
};

export const useEditingCharacter = () => {
  return useCharacterStore((state) => {
    if (!state.editingCharacterId) return null;
    return state.characters.get(state.editingCharacterId) ?? null;
  });
};

export const usePanelState = () => {
  return useCharacterStore((state) => state.panelState);
};

export const useEditorState = () => {
  return useCharacterStore(
    useShallow((state) => ({
      mode: state.editorMode,
      open: state.editorOpen,
      characterId: state.editingCharacterId,
    }))
  );
};

export const useLoraBrowserState = () => {
  return useCharacterStore((state) => state.loraBrowserOpen);
};

export const useCharacterFilters = () => {
  return useCharacterStore((state) => state.filters);
};

export const useCharacterSort = () => {
  return useCharacterStore(
    useShallow((state) => ({
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
    }))
  );
};

export const useCharacterLoading = () => {
  return useCharacterStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      isCreating: state.isCreating,
      isUpdating: state.isUpdating,
      isDeleting: state.isDeleting,
      isUploadingReference: state.isUploadingReference,
    }))
  );
};

export const useIsCharacterLoading = (characterId: string) => {
  return useCharacterStore((state) => state.loadingCharacterIds.has(characterId));
};

export const useCharacterError = () => {
  return useCharacterStore((state) => state.error);
};

export const useLorasCatalog = () => {
  return useCharacterStore((state) => state.lorasCatalog);
};

// ============================================================================
// Derived Hooks
// ============================================================================

export const useFilteredCharacters = (projectId: string) => {
  return useCharacterStore(
    useShallow((state) => state.actions.getFilteredCharacters(projectId))
  );
};

export const useCharactersByProject = (projectId: string) => {
  return useCharacterStore(
    useShallow((state) => state.actions.getCharactersByProject(projectId))
  );
};
