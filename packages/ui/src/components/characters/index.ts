/**
 * Character Manager - Main Export
 * 
 * ARRR! All yer character treasures in one place! 🏴‍☠️
 */

// Types
export * from './types';

// ID Generator (injectable for testing - Ruthless Reviewer approved!)
export {
  type IdGenerator,
  defaultIdGenerator,
  createTestIdGenerator,
  createFixedIdGenerator,
  getIdGenerator,
  setIdGenerator,
  resetIdGenerator,
  generateCharacterId,
  generateReferenceId,
} from './id-generator';

// Store
export {
  useCharacterStore,
  useCharacters,
  useCharacterActions,
  useSelectedCharacter,
  useEditingCharacter,
  usePanelState,
  useEditorState,
  useLoraBrowserState,
  useCharacterFilters,
  useCharacterSort,
  useCharacterLoading,
  useIsCharacterLoading,
  useCharacterError,
  useLorasCatalog,
  useFilteredCharacters,
  useCharactersByProject,
} from './store';

// Hooks
export {
  useFetchCharacters,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useUploadReference,
  useReferenceManager,
  useLoRABrowser,
  useCharacterLoRA,
  useColorPalette,
  usePromptFragments,
  useCharacterSearch,
  useCharacterKeyboardNavigation,
  useCharacterStats,
} from './hooks';

// Components
export { CharacterPanel } from './CharacterPanel';
export { CharacterCard } from './CharacterCard';
export { CharacterEditor } from './CharacterEditor';
export { ReferenceGallery, ReferenceCard } from './ReferenceGallery';
export { ColorPaletteDisplay, ColorSwatch } from './ColorPalette';
export { LoRABrowser, LoRACard } from './LoRABrowser';
