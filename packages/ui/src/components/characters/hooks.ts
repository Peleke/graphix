/**
 * Character Manager Hooks
 * 
 * Custom React hooks for the Character Manager.
 * Handles API integration, derived state, and side effects.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  useCharacterStore, 
  useCharacterActions,
  useSelectedCharacter,
  useCharacterFilters,
} from './store';
import type { 
  Character, 
  ReferenceImage, 
  CharacterLoRA, 
  LoRAEntry,
  LoRACategory,
  ModelFamily,
  ReferenceImageType,
} from './types';
import { LORA_CATEGORIES, MODEL_FAMILIES } from './types';

// ============================================================================
// API Base URL
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// Character CRUD Hooks
// ============================================================================

function normalizeReferenceImages(referenceImages: unknown): ReferenceImage[] {
  if (!Array.isArray(referenceImages)) return [];
  if (referenceImages.length === 0) return [];
  if (typeof referenceImages[0] === 'string') {
    return (referenceImages as string[]).map((path, index) => ({
      id: `${index}-${path}`,
      imagePath: path,
      thumbnailPath: undefined,
      type: 'full_body',
      createdAt: new Date(),
    }));
  }
  return referenceImages as ReferenceImage[];
}

function normalizePromptFragments(promptFragments: unknown): string[] {
  if (Array.isArray(promptFragments)) return promptFragments as string[];
  if (promptFragments && typeof promptFragments === 'object') {
    const triggers = (promptFragments as { triggers?: string[] }).triggers;
    return Array.isArray(triggers) ? triggers : [];
  }
  return [];
}

function normalizeCharacter(character: Character): Character {
  return {
    ...character,
    referenceImages: normalizeReferenceImages(character.referenceImages),
    promptFragments: normalizePromptFragments(character.promptFragments),
  };
}

/**
 * Hook for fetching characters for a project
 */
export function useFetchCharacters(projectId: string) {
  const actions = useCharacterActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    actions.setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/characters/project/${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch characters: ${response.statusText}`);
      }
      
      const data = await response.json();
      const normalized = (data.characters || []).map((char: Character) => normalizeCharacter(char));
      actions.setCharacters(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch characters';
      setError(message);
      actions.setError(message);
    } finally {
      setIsLoading(false);
      actions.setLoading(false);
    }
  }, [projectId, actions]);

  return { fetchCharacters, isLoading, error };
}

/**
 * Hook for creating a character
 */
export function useCreateCharacter() {
  const actions = useCharacterActions();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCharacter = useCallback(async (
    data: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'referenceImages' | 'colorPalette'>
  ): Promise<Character | null> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create character: ${response.statusText}`);
      }
      
      const character = normalizeCharacter(await response.json());
      actions.addCharacter(character);
      return character;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create character';
      setError(message);
      actions.setError(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [actions]);

  return { createCharacter, isCreating, error };
}

/**
 * Hook for updating a character
 */
export function useUpdateCharacter() {
  const actions = useCharacterActions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCharacter = useCallback(async (
    id: string,
    updates: Partial<Character>
  ): Promise<Character | null> => {
    setIsUpdating(true);
    setError(null);
    actions.setCharacterLoading(id, true);
    
    try {
      const response = await fetch(`${API_BASE}/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update character: ${response.statusText}`);
      }
      
      const character = normalizeCharacter(await response.json());
      actions.updateCharacter(id, character);
      return character;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update character';
      setError(message);
      actions.setError(message);
      return null;
    } finally {
      setIsUpdating(false);
      actions.setCharacterLoading(id, false);
    }
  }, [actions]);

  return { updateCharacter, isUpdating, error };
}

/**
 * Hook for deleting a character
 */
export function useDeleteCharacter() {
  const actions = useCharacterActions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);
    actions.setCharacterLoading(id, true);
    
    try {
      const response = await fetch(`${API_BASE}/api/characters/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete character: ${response.statusText}`);
      }
      
      actions.removeCharacter(id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete character';
      setError(message);
      actions.setError(message);
      return false;
    } finally {
      setIsDeleting(false);
      actions.setCharacterLoading(id, false);
    }
  }, [actions]);

  return { deleteCharacter, isDeleting, error };
}

// ============================================================================
// Reference Image Hooks
// ============================================================================

/**
 * Hook for uploading reference images
 */
export function useUploadReference() {
  const actions = useCharacterActions();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadReference = useCallback(async (
    characterId: string,
    file: File,
    type: ReferenceImageType = 'full_body'
  ): Promise<ReferenceImage | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(
        `${API_BASE}/api/characters/${characterId}/references/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to upload reference: ${response.statusText}`);
      }
      
      const uploadResult = await response.json();
      
      const reference: ReferenceImage = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        imagePath: uploadResult.originalPath,
        thumbnailPath: uploadResult.thumbnailPath,
        type,
        dimensions: uploadResult.dimensions,
        createdAt: new Date(),
      };
      
      actions.addReference(characterId, reference);
      setProgress(100);
      return reference;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload reference';
      setError(message);
      actions.setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [actions]);

  return { uploadReference, isUploading, progress, error };
}

/**
 * Hook for managing reference images
 */
export function useReferenceManager(characterId: string | null) {
  const actions = useCharacterActions();
  const character = useCharacterStore((state) => 
    characterId ? state.characters.get(characterId) : null
  );

  const references = character?.referenceImages ?? [];

  const removeReference = useCallback((referenceId: string) => {
    if (characterId) {
      actions.removeReference(characterId, referenceId);
    }
  }, [characterId, actions]);

  const updateType = useCallback((referenceId: string, type: ReferenceImageType) => {
    if (characterId) {
      actions.updateReferenceType(characterId, referenceId, type);
    }
  }, [characterId, actions]);

  const extractColors = useCallback((referenceId: string) => {
    if (characterId) {
      actions.extractColorsFromReference(characterId, referenceId);
    }
  }, [characterId, actions]);

  return {
    references,
    removeReference,
    updateType,
    extractColors,
  };
}

// ============================================================================
// LoRA Hooks
// ============================================================================

/**
 * Hook for browsing and filtering LoRAs
 */
export function useLoRABrowser() {
  const lorasCatalog = useCharacterStore((state) => state.lorasCatalog);
  const actions = useCharacterActions();
  
  const [categoryFilter, setCategoryFilter] = useState<LoRACategory | null>(null);
  const [familyFilter, setFamilyFilter] = useState<ModelFamily | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoras = useMemo(() => {
    let result = lorasCatalog;
    
    if (categoryFilter) {
      result = result.filter(lora => lora.category === categoryFilter);
    }
    
    if (familyFilter) {
      result = result.filter(lora => lora.compatibleFamilies.includes(familyFilter));
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lora => 
        lora.name.toLowerCase().includes(query) ||
        lora.filename.toLowerCase().includes(query) ||
        lora.trigger?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [lorasCatalog, categoryFilter, familyFilter, searchQuery]);

  const categories = LORA_CATEGORIES;
  const families = MODEL_FAMILIES;

  const clearFilters = useCallback(() => {
    setCategoryFilter(null);
    setFamilyFilter(null);
    setSearchQuery('');
  }, []);

  return {
    loras: filteredLoras,
    allLoras: lorasCatalog,
    categoryFilter,
    setCategoryFilter,
    familyFilter,
    setFamilyFilter,
    searchQuery,
    setSearchQuery,
    clearFilters,
    categories,
    families,
  };
}

/**
 * Hook for managing a character's LoRA
 */
export function useCharacterLoRA(characterId: string | null) {
  const actions = useCharacterActions();
  const character = useCharacterStore((state) => 
    characterId ? state.characters.get(characterId) : null
  );

  const lora = character?.lora ?? null;

  const setLora = useCallback((loraEntry: LoRAEntry, strength?: number) => {
    if (!characterId) return;
    
    const loraConfig: CharacterLoRA = {
      path: loraEntry.filename,
      strength: strength ?? loraEntry.strength.recommended,
      triggerWords: loraEntry.trigger ? [loraEntry.trigger] : [],
    };
    
    actions.setCharacterLora(characterId, loraConfig);
  }, [characterId, actions]);

  const setStrength = useCallback((strength: number) => {
    if (characterId) {
      actions.setLoraStrength(characterId, strength);
    }
  }, [characterId, actions]);

  const clearLora = useCallback(() => {
    if (characterId) {
      actions.clearCharacterLora(characterId);
    }
  }, [characterId, actions]);

  return {
    lora,
    setLora,
    setStrength,
    clearLora,
    hasLora: !!lora,
  };
}

// ============================================================================
// Color Palette Hooks
// ============================================================================

/**
 * Hook for managing a character's color palette
 */
export function useColorPalette(characterId: string | null) {
  const actions = useCharacterActions();
  const character = useCharacterStore((state) => 
    characterId ? state.characters.get(characterId) : null
  );

  const colors = character?.colorPalette ?? [];

  const setColors = useCallback((newColors: string[]) => {
    if (characterId) {
      actions.updateColorPalette(characterId, newColors);
    }
  }, [characterId, actions]);

  const addColor = useCallback((color: string) => {
    if (characterId && !colors.includes(color)) {
      actions.updateColorPalette(characterId, [...colors, color]);
    }
  }, [characterId, colors, actions]);

  const removeColor = useCallback((color: string) => {
    if (characterId) {
      actions.updateColorPalette(characterId, colors.filter(c => c !== color));
    }
  }, [characterId, colors, actions]);

  return {
    colors,
    setColors,
    addColor,
    removeColor,
  };
}

// ============================================================================
// Prompt Fragment Hooks
// ============================================================================

/**
 * Hook for managing prompt fragments
 */
export function usePromptFragments(characterId: string | null) {
  const actions = useCharacterActions();
  const character = useCharacterStore((state) => 
    characterId ? state.characters.get(characterId) : null
  );

  const fragments = character?.promptFragments ?? [];

  const regenerate = useCallback(() => {
    if (characterId) {
      return actions.generatePromptFragments(characterId);
    }
    return [];
  }, [characterId, actions]);

  const copyToClipboard = useCallback(async () => {
    const text = fragments.join(', ');
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [fragments]);

  return {
    fragments,
    regenerate,
    copyToClipboard,
    asString: fragments.join(', '),
  };
}

// ============================================================================
// Search Hooks
// ============================================================================

/**
 * Hook for character search with debouncing
 */
export function useCharacterSearch(debounceMs: number = 300) {
  const actions = useCharacterActions();
  const filters = useCharacterFilters();
  const [inputValue, setInputValue] = useState(filters.search || '');
  const [debouncedValue, setDebouncedValue] = useState(filters.search || '');

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  // Update store when debounced value changes
  // NOTE: Only update if value actually changed to prevent infinite loops
  useEffect(() => {
    if (filters.search !== debouncedValue) {
      actions.setFilters({ search: debouncedValue });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const clear = useCallback(() => {
    setInputValue('');
    setDebouncedValue('');
    actions.setFilters({ search: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    value: inputValue,
    setValue: setInputValue,
    debouncedValue,
    clear,
    hasValue: inputValue.length > 0,
  };
}

// ============================================================================
// Keyboard Navigation Hooks
// ============================================================================

interface KeyboardNavigationOptions {
  onSelectNext?: () => void;
  onSelectPrevious?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation in character list
 */
export function useCharacterKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onSelectNext,
    onSelectPrevious,
    onOpen,
    onClose,
    onDelete,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'j':
          event.preventDefault();
          onSelectNext?.();
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          onSelectPrevious?.();
          break;
        case 'Enter':
        case 'o':
          event.preventDefault();
          onOpen?.();
          break;
        case 'Escape':
          event.preventDefault();
          onClose?.();
          break;
        case 'Delete':
        case 'Backspace':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            onDelete?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSelectNext, onSelectPrevious, onOpen, onClose, onDelete]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for character count statistics
 */
export function useCharacterStats(projectId: string) {
  // Use a stable selector that returns a memoized result
  const stats = useCharacterStore((state) => {
    const chars = Array.from(state.characters.values()).filter(c => c.projectId === projectId);
    return {
      total: chars.length,
      withLora: chars.filter(c => !!c.lora).length,
      withReferences: chars.filter(c => c.referenceImages.length > 0).length,
      totalReferences: chars.reduce((sum, c) => sum + c.referenceImages.length, 0),
    };
  });

  return stats;
}
