/**
 * ReferenceGallery Component Tests
 * 
 * Testing reference image management.
 * ARRR! Test them reference images! 📸🏴‍☠️
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferenceGallery, ReferenceCard } from '../ReferenceGallery';
import { useCharacterStore } from '../store';
import { ReferenceImage, Character } from '../types';

// Mock Panda CSS
vi.mock('../../../../styled-system/css', () => ({
  css: vi.fn((styles) => JSON.stringify(styles)),
}));

// Mock constants
vi.mock('../../../../constants', () => ({
  MAX_REFERENCE_IMAGES: 10,
  MAX_FILE_SIZE_MB: 10,
}));

// ============================================================================
// Helpers
// ============================================================================

function createMockReference(overrides: Partial<ReferenceImage> = {}): ReferenceImage {
  return {
    id: 'ref_test_1',
    characterId: 'char_test_1',
    type: 'face',
    url: 'https://example.com/image.png',
    thumbnailUrl: 'https://example.com/thumb.png',
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockCharacter(refs: ReferenceImage[] = []): Character {
  return {
    id: 'char_test_1',
    projectId: 'proj_test',
    name: 'Test Character',
    species: 'human',
    description: '',
    colorPalette: [],
    promptFragments: [],
    referenceImages: refs,
    lora: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
// ReferenceCard Tests
// ============================================================================

describe('ReferenceCard', () => {
  it('should render reference image', () => {
    const ref = createMockReference();
    render(<ReferenceCard reference={ref} />);
    
    expect(screen.getByTestId('reference-image')).toBeInTheDocument();
  });

  it('should show type badge', () => {
    const ref = createMockReference({ type: 'full_body' });
    render(<ReferenceCard reference={ref} />);
    
    expect(screen.getByTestId('reference-type-badge')).toHaveTextContent('full body');
  });

  it('should show type selector when not readOnly', () => {
    const ref = createMockReference();
    const onTypeChange = vi.fn();
    render(<ReferenceCard reference={ref} onTypeChange={onTypeChange} />);
    
    // Hover to show overlay
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    
    expect(screen.getByTestId('reference-type-select')).toBeInTheDocument();
  });

  it('should not show type selector in readOnly mode', () => {
    const ref = createMockReference();
    render(<ReferenceCard reference={ref} readOnly />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    
    expect(screen.queryByTestId('reference-type-select')).not.toBeInTheDocument();
  });

  it('should call onTypeChange when type is changed', async () => {
    const user = userEvent.setup();
    const ref = createMockReference({ type: 'face' });
    const onTypeChange = vi.fn();
    render(<ReferenceCard reference={ref} onTypeChange={onTypeChange} />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    
    const select = screen.getByTestId('reference-type-select');
    await user.selectOptions(select, 'full_body');
    
    expect(onTypeChange).toHaveBeenCalledWith('full_body');
  });

  it('should show delete button when onDelete provided', () => {
    const ref = createMockReference();
    const onDelete = vi.fn();
    render(<ReferenceCard reference={ref} onDelete={onDelete} />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    
    expect(screen.getByTestId('delete-reference-button')).toBeInTheDocument();
  });

  it('should call onDelete when delete clicked', async () => {
    const user = userEvent.setup();
    const ref = createMockReference();
    const onDelete = vi.fn();
    render(<ReferenceCard reference={ref} onDelete={onDelete} />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    await user.click(screen.getByTestId('delete-reference-button'));
    
    expect(onDelete).toHaveBeenCalled();
  });

  it('should show extract colors button when onExtractColors provided', () => {
    const ref = createMockReference();
    const onExtractColors = vi.fn();
    render(<ReferenceCard reference={ref} onExtractColors={onExtractColors} />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    
    expect(screen.getByTestId('extract-colors-button')).toBeInTheDocument();
  });

  it('should call onExtractColors when button clicked', async () => {
    const user = userEvent.setup();
    const ref = createMockReference();
    const onExtractColors = vi.fn();
    render(<ReferenceCard reference={ref} onExtractColors={onExtractColors} />);
    
    fireEvent.mouseEnter(screen.getByTestId('reference-card'));
    await user.click(screen.getByTestId('extract-colors-button'));
    
    expect(onExtractColors).toHaveBeenCalled();
  });

  it('should handle image load error', () => {
    const ref = createMockReference({ url: 'invalid-url' });
    render(<ReferenceCard reference={ref} />);
    
    const img = screen.getByTestId('reference-image');
    fireEvent.error(img);
    
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should use thumbnailUrl when available', () => {
    const ref = createMockReference({
      url: 'https://example.com/full.png',
      thumbnailUrl: 'https://example.com/thumb.png',
    });
    render(<ReferenceCard reference={ref} />);
    
    const img = screen.getByTestId('reference-image');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.png');
  });

  it('should fall back to url when no thumbnailUrl', () => {
    const ref = createMockReference({
      url: 'https://example.com/full.png',
      thumbnailUrl: undefined,
    });
    render(<ReferenceCard reference={ref} />);
    
    const img = screen.getByTestId('reference-image');
    expect(img).toHaveAttribute('src', 'https://example.com/full.png');
  });
});

// ============================================================================
// ReferenceGallery Tests
// ============================================================================

describe('ReferenceGallery', () => {
  describe('Empty State', () => {
    it('should show empty state when no references', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('empty-gallery')).toBeInTheDocument();
    });

    it('should show upload prompt in empty state', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByText(/upload some/i)).toBeInTheDocument();
    });
  });

  describe('Reference Grid', () => {
    it('should render reference grid when references exist', () => {
      const refs = [createMockReference({ id: 'ref_1' }), createMockReference({ id: 'ref_2' })];
      const character = createMockCharacter(refs);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('reference-grid')).toBeInTheDocument();
      expect(screen.getAllByTestId('reference-card')).toHaveLength(2);
    });

    it('should have accessible list role', () => {
      const refs = [createMockReference()];
      const character = createMockCharacter(refs);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('Upload Zone', () => {
    it('should show upload zone when under limit', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
    });

    it('should not show upload zone in readOnly mode', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} readOnly />);
      
      expect(screen.queryByTestId('upload-zone')).not.toBeInTheDocument();
    });

    it('should have accessible upload button', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('upload-zone')).toHaveAttribute('aria-label', 'Upload reference images');
    });

    it('should show file input', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
    });

    it('should accept correct file types', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('accept', expect.stringContaining('image/jpeg'));
      expect(input).toHaveAttribute('accept', expect.stringContaining('image/png'));
    });

    it('should allow multiple file selection', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('multiple');
    });

    it('should show reference count in upload zone', () => {
      const refs = [createMockReference(), createMockReference({ id: 'ref_2' })];
      const character = createMockCharacter(refs);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByText(/2\/10 references/)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      const uploadZone = screen.getByTestId('upload-zone');
      fireEvent.dragEnter(uploadZone);
      
      expect(screen.getByText(/drop images here/i)).toBeInTheDocument();
    });

    it('should handle drag leave', () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      const uploadZone = screen.getByTestId('upload-zone');
      fireEvent.dragEnter(uploadZone);
      fireEvent.dragLeave(uploadZone);
      
      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });
  });

  describe('Limit Warning', () => {
    it('should show limit warning when at max references', () => {
      const refs = Array.from({ length: 10 }, (_, i) => createMockReference({ id: `ref_${i}` }));
      const character = createMockCharacter(refs);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.getByTestId('reference-limit-warning')).toBeInTheDocument();
    });

    it('should not show upload zone when at limit', () => {
      const refs = Array.from({ length: 10 }, (_, i) => createMockReference({ id: `ref_${i}` }));
      const character = createMockCharacter(refs);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      expect(screen.queryByTestId('upload-zone')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when upload fails', async () => {
      const character = createMockCharacter([]);
      useCharacterStore.setState({
        characters: new Map([[character.id, character]]),
      });

      render(<ReferenceGallery characterId={character.id} />);
      
      // Simulate invalid file upload
      const input = screen.getByTestId('file-input');
      const invalidFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(input, 'files', { value: [invalidFile] });
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toBeInTheDocument();
      });
    });
  });
});
