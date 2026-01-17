/**
 * Character Manager Types
 * 
 * Data structures for the Character Manager - CRUD interface for managing
 * characters, their references, and LoRA associations.
 */

// ============================================================================
// Core Character Types
// ============================================================================

/**
 * Reference image type indicating what part of the character it shows
 */
export type ReferenceImageType = 
  | 'face'        // Close-up face reference
  | 'full_body'   // Full body reference
  | 'expression'  // Expression sheet
  | 'pose'        // Specific pose reference
  | 'detail'      // Detail/accessory reference
  | 'other';      // Other reference type

/**
 * A reference image for a character
 */
export interface ReferenceImage {
  /** Unique identifier */
  id: string;
  
  /** Path to the image file */
  imagePath: string;
  
  /** Thumbnail path for quick display */
  thumbnailPath?: string;
  
  /** Type of reference */
  type: ReferenceImageType;
  
  /** Optional label */
  label?: string;
  
  /** Extracted color palette (hex colors) */
  colorPalette?: string[];
  
  /** Image dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  
  /** When this reference was added */
  createdAt: Date;
}

/**
 * Character profile with physical/personality details
 */
export interface CharacterProfile {
  /** Species (human, anthro, etc.) */
  species?: string;
  
  /** Physical description */
  description?: string;
  
  /** Age or age range */
  age?: string;
  
  /** Gender/presentation */
  gender?: string;
  
  /** Notable features */
  features?: string[];
  
  /** Personality traits */
  personality?: string[];
  
  /** Background/backstory */
  backstory?: string;
}

/**
 * LoRA configuration for a character
 */
export interface CharacterLoRA {
  /** LoRA file path or identifier */
  path: string;
  
  /** LoRA strength (0-2, typically 0.5-1.0) */
  strength: number;
  
  /** CLIP strength (optional, for some LoRAs) */
  strengthClip?: number;
  
  /** Training images used (for reference) */
  trainingImages?: string[];
  
  /** Trigger words for this LoRA */
  triggerWords?: string[];
}

/**
 * A character in the system
 */
export interface Character {
  /** Unique identifier */
  id: string;
  
  /** Project this character belongs to */
  projectId: string;
  
  /** Character name */
  name: string;
  
  /** Character profile */
  profile: CharacterProfile;
  
  /** Auto-generated prompt fragments from description */
  promptFragments: string[];
  
  /** Reference images */
  referenceImages: ReferenceImage[];
  
  /** Combined color palette from all references */
  colorPalette: string[];
  
  /** Associated LoRA configuration */
  lora?: CharacterLoRA;
  
  /** Thumbnail for display (first reference or generated) */
  thumbnailPath?: string;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LoRA Catalog Types (mirroring core package)
// ============================================================================

/**
 * LoRA category
 */
export type LoRACategory = 
  | 'style'
  | 'character'
  | 'quality'
  | 'pose'
  | 'concept';

/**
 * Model family compatibility
 */
export type ModelFamily = 
  | 'sd15'
  | 'sdxl'
  | 'pony'
  | 'illustrious'
  | 'flux';

/**
 * LoRA entry from catalog
 */
export interface LoRAEntry {
  /** Filename */
  filename: string;
  
  /** Display name */
  name: string;
  
  /** Trigger words */
  trigger?: string;
  
  /** Compatible model families */
  compatibleFamilies: ModelFamily[];
  
  /** Category */
  category: LoRACategory;
  
  /** Strength range */
  strength: {
    min: number;
    recommended: number;
    max: number;
  };
  
  /** Position in LoRA stack */
  stackPosition: 'first' | 'middle' | 'last';
  
  /** Usage notes */
  notes?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Panel collapse state
 */
export type PanelState = 'expanded' | 'collapsed';

/**
 * Editor mode
 */
export type EditorMode = 'create' | 'edit' | 'view';

/**
 * Sort options for character list
 */
export type CharacterSortBy = 
  | 'name'
  | 'createdAt'
  | 'updatedAt';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Filter options for character list
 */
export interface CharacterFilters {
  /** Search by name */
  search?: string;
  
  /** Filter by species */
  species?: string[];
  
  /** Filter by has LoRA */
  hasLora?: boolean;
  
  /** Filter by has references */
  hasReferences?: boolean;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Actions that can be performed on a character
 */
export type CharacterAction =
  | { type: 'edit'; characterId: string }
  | { type: 'duplicate'; characterId: string }
  | { type: 'delete'; characterId: string }
  | { type: 'addReference'; characterId: string }
  | { type: 'removeReference'; characterId: string; referenceId: string }
  | { type: 'setLora'; characterId: string; lora: CharacterLoRA }
  | { type: 'clearLora'; characterId: string }
  | { type: 'generateReference'; characterId: string };

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * CharacterPanel props
 */
export interface CharacterPanelProps {
  /** Project ID to show characters for */
  projectId: string;
  
  /** Initial panel state */
  initialState?: PanelState;
  
  /** Callback when character is selected */
  onCharacterSelect?: (character: Character) => void;
  
  /** Callback when character action is triggered */
  onCharacterAction?: (action: CharacterAction) => void;
  
  /** Custom class name */
  className?: string;
}

/**
 * CharacterCard props
 */
export interface CharacterCardProps {
  /** The character to display */
  character: Character;
  
  /** Whether this card is selected */
  isSelected?: boolean;
  
  /** Whether card is in compact mode */
  compact?: boolean;
  
  /** Callback when card is clicked */
  onClick?: (character: Character) => void;
  
  /** Callback for quick actions */
  onAction?: (action: CharacterAction) => void;
  
  /** Whether card is draggable */
  draggable?: boolean;
  
  /** Custom class name */
  className?: string;
}

/**
 * CharacterEditor props
 */
export interface CharacterEditorProps {
  /** Character to edit (null for create) */
  character?: Character | null;
  
  /** Project ID for new characters */
  projectId: string;
  
  /** Editor mode */
  mode: EditorMode;
  
  /** Callback when save is clicked */
  onSave?: (character: Partial<Character>) => void;
  
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  
  /** Whether editor is open */
  open?: boolean;
  
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * ReferenceGallery props
 */
export interface ReferenceGalleryProps {
  /** Reference images to display */
  references: ReferenceImage[];
  
  /** Character ID for upload */
  characterId?: string;
  
  /** Whether uploads are allowed */
  allowUpload?: boolean;
  
  /** Whether AI generation is allowed */
  allowGenerate?: boolean;
  
  /** Callback when reference is clicked */
  onReferenceClick?: (reference: ReferenceImage) => void;
  
  /** Callback when reference is deleted */
  onReferenceDelete?: (referenceId: string) => void;
  
  /** Callback when reference type changes */
  onReferenceTypeChange?: (referenceId: string, type: ReferenceImageType) => void;
  
  /** Callback when new reference is uploaded */
  onUpload?: (file: File) => void;
  
  /** Custom class name */
  className?: string;
}

/**
 * ColorPalette props
 */
export interface ColorPaletteProps {
  /** Colors to display (hex format) */
  colors: string[];
  
  /** Maximum colors to show */
  maxColors?: number;
  
  /** Size of color swatches */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether palette is editable */
  editable?: boolean;
  
  /** Callback when color is clicked */
  onColorClick?: (color: string) => void;
  
  /** Callback when colors change (if editable) */
  onColorsChange?: (colors: string[]) => void;
  
  /** Custom class name */
  className?: string;
}

/**
 * LoRABrowser props
 */
export interface LoRABrowserProps {
  /** Currently selected LoRA */
  selectedLora?: CharacterLoRA | null;
  
  /** Filter by category */
  categoryFilter?: LoRACategory[];
  
  /** Filter by model family */
  familyFilter?: ModelFamily[];
  
  /** Callback when LoRA is selected */
  onLoraSelect?: (lora: LoRAEntry) => void;
  
  /** Callback when strength changes */
  onStrengthChange?: (strength: number) => void;
  
  /** Whether browser is open */
  open?: boolean;
  
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  
  /** Custom class name */
  className?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Character list response
 */
export interface CharacterListResponse {
  characters: Character[];
}

/**
 * Upload response
 */
export interface UploadResponse {
  originalPath: string;
  thumbnailPath?: string;
  filename: string;
  originalFilename: string;
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = Object.freeze({
  species: '',
  description: '',
  age: '',
  gender: '',
  features: [],
  personality: [],
  backstory: '',
});

export const DEFAULT_LORA_STRENGTH = 0.7;

export const DEFAULT_CHARACTER_FILTERS: CharacterFilters = Object.freeze({
  search: '',
  species: [],
  hasLora: undefined,
  hasReferences: undefined,
});

export const MAX_COLOR_PALETTE_SIZE = 8;

export const MAX_REFERENCE_IMAGES = 10;

export const REFERENCE_IMAGE_TYPES: ReferenceImageType[] = [
  'face',
  'full_body',
  'expression',
  'pose',
  'detail',
  'other',
];

export const LORA_CATEGORIES: LoRACategory[] = [
  'style',
  'character',
  'quality',
  'pose',
  'concept',
];

export const MODEL_FAMILIES: ModelFamily[] = [
  'sd15',
  'sdxl',
  'pony',
  'illustrious',
  'flux',
];
