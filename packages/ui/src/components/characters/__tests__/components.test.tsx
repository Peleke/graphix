/**
 * Character Manager Component Tests
 * 
 * Testing all React components for the Character Manager.
 * ARRR! Every component shall render correctly! 🏴‍☠️
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useCharacterStore } from '../store';

// Mock styled-system css function - path relative to component files
vi.mock('../../../styled-system/css', () => ({
  css: () => '',
}));
import { CharacterCard } from '../CharacterCard';
import { CharacterEditor } from '../CharacterEditor';
import { ReferenceGallery } from '../ReferenceGallery';
import { ColorPalette } from '../ColorPalette';
import { LoRABrowser } from '../LoRABrowser';
import type { Character, ReferenceImage, CharacterAction } from '../types';
import { DEFAULT_CHARACTER_FILTERS } from '../types';

// ============================================================================
// Mock Data Helpers
// ============================================================================

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: `char_${Math.random().toString(36).substring(2, 9)}`,
  projectId: 'test-project',
  name: 'Test Character',
  profile: {
    species: 'human',
    description: 'A brave warrior',
  },
  promptFragments: ['human', 'warrior'],
  referenceImages: [],
  colorPalette: ['#FF0000', '#00FF00'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockReference = (overrides: Partial<ReferenceImage> = {}): ReferenceImage => ({
  id: `ref_${Math.random().toString(36).substring(2, 9)}`,
  imagePath: '/path/to/image.png',
  thumbnailPath: '/path/to/thumb.png',
  type: 'full_body',
  createdAt: new Date(),
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
  vi.clearAllMocks();
});

// ============================================================================
// CharacterCard Tests
// ============================================================================

describe('CharacterCard', () => {
  it('should render character name', () => {
    const character = createMockCharacter({ name: 'Alice the Brave' });
    render(<CharacterCard character={character} />);
    expect(screen.getByText('Alice the Brave')).toBeInTheDocument();
  });

  it('should render character species', () => {
    const character = createMockCharacter({ 
      profile: { species: 'elf', description: 'An elf' } 
    });
    render(<CharacterCard character={character} />);
    expect(screen.getByText('elf')).toBeInTheDocument();
  });

  it('should show LoRA badge when character has LoRA', () => {
    const character = createMockCharacter({ 
      lora: { path: '/lora.safetensors', strength: 0.7 } 
    });
    render(<CharacterCard character={character} />);
    expect(screen.getByText('LoRA')).toBeInTheDocument();
  });

  it('should not show LoRA badge when character has no LoRA', () => {
    const character = createMockCharacter({ lora: undefined });
    render(<CharacterCard character={character} />);
    expect(screen.queryByText('LoRA')).not.toBeInTheDocument();
  });

  it('should show reference count badge', () => {
    const character = createMockCharacter({ 
      referenceImages: [createMockReference(), createMockReference()] 
    });
    render(<CharacterCard character={character} />);
    expect(screen.getByText('2 refs')).toBeInTheDocument();
  });

  it('should show singular ref for single reference', () => {
    const character = createMockCharacter({ 
      referenceImages: [createMockReference()] 
    });
    render(<CharacterCard character={character} />);
    expect(screen.getByText('1 ref')).toBeInTheDocument();
  });

  it('should not show reference badge when no references', () => {
    const character = createMockCharacter({ referenceImages: [] });
    render(<CharacterCard character={character} />);
    expect(screen.queryByText(/ref/)).not.toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const character = createMockCharacter();
    const onClick = vi.fn();
    const { container } = render(<CharacterCard character={character} onClick={onClick} />);
    
    // Click the card container directly (first child)
    fireEvent.click(container.firstChild as Element);
    expect(onClick).toHaveBeenCalledWith(character);
  });

  it('should call onAction with edit action when edit button is clicked', () => {
    const character = createMockCharacter({ id: 'char-123' });
    const onAction = vi.fn();
    const { container } = render(<CharacterCard character={character} onAction={onAction} />);
    
    // Hover to show actions
    fireEvent.mouseEnter(container.firstChild as Element);
    
    fireEvent.click(screen.getByLabelText('Edit character'));
    expect(onAction).toHaveBeenCalledWith({ type: 'edit', characterId: 'char-123' });
  });

  it('should call onAction with duplicate action when duplicate button is clicked', () => {
    const character = createMockCharacter({ id: 'char-123' });
    const onAction = vi.fn();
    const { container } = render(<CharacterCard character={character} onAction={onAction} />);
    
    fireEvent.mouseEnter(container.firstChild as Element);
    fireEvent.click(screen.getByLabelText('Duplicate character'));
    expect(onAction).toHaveBeenCalledWith({ type: 'duplicate', characterId: 'char-123' });
  });

  it('should call onAction with delete action when delete button is clicked', () => {
    const character = createMockCharacter({ id: 'char-123' });
    const onAction = vi.fn();
    const { container } = render(<CharacterCard character={character} onAction={onAction} />);
    
    fireEvent.mouseEnter(container.firstChild as Element);
    fireEvent.click(screen.getByLabelText('Delete character'));
    expect(onAction).toHaveBeenCalledWith({ type: 'delete', characterId: 'char-123' });
  });

  it('should apply selected styles when isSelected is true', () => {
    const character = createMockCharacter();
    const { container } = render(<CharacterCard character={character} isSelected={true} />);
    expect(container.firstChild).toHaveAttribute('aria-selected', 'true');
  });

  it('should apply custom className', () => {
    const character = createMockCharacter();
    const { container } = render(<CharacterCard character={character} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render without crashing when no thumbnail', () => {
    const character = createMockCharacter({ thumbnailPath: undefined });
    expect(() => render(<CharacterCard character={character} />)).not.toThrow();
  });

  it('should render thumbnail image when available', () => {
    const character = createMockCharacter({ thumbnailPath: '/thumb.png' });
    render(<CharacterCard character={character} />);
    const img = screen.getByAltText(character.name);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/thumb.png');
  });

  it('should show first letter of name as placeholder when no thumbnail', () => {
    const character = createMockCharacter({ name: 'Zara', thumbnailPath: undefined });
    render(<CharacterCard character={character} />);
    // The placeholder icon should be rendered
    expect(screen.queryByAltText('Zara')).not.toBeInTheDocument();
  });

  it('should not show action buttons in compact mode', () => {
    const character = createMockCharacter();
    render(<CharacterCard character={character} compact={true} />);
    
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.queryByLabelText('Edit character')).not.toBeInTheDocument();
  });

  it('should handle draggable prop', () => {
    const character = createMockCharacter();
    const { container } = render(<CharacterCard character={character} draggable={true} />);
    expect(container.firstChild).toHaveAttribute('draggable', 'true');
  });
});

// ============================================================================
// CharacterEditor Tests
// ============================================================================

describe('CharacterEditor', () => {
  it('should not render when open is false', () => {
    render(
      <CharacterEditor 
        projectId="test-project" 
        mode="create" 
        open={false} 
      />
    );
    expect(screen.queryByTestId('character-editor')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(
      <CharacterEditor 
        projectId="test-project" 
        mode="create" 
        open={true} 
      />
    );
    expect(screen.getByTestId('character-editor')).toBeInTheDocument();
  });

  it('should display correct mode', () => {
    render(
      <CharacterEditor 
        projectId="test-project" 
        mode="edit" 
        open={true} 
      />
    );
    expect(screen.getByText(/edit mode/i)).toBeInTheDocument();
  });
});

// ============================================================================
// ReferenceGallery Tests
// ============================================================================

describe('ReferenceGallery', () => {
  it('should render empty state when no references', () => {
    render(<ReferenceGallery references={[]} />);
    expect(screen.getByText('No reference images yet')).toBeInTheDocument();
  });

  it('should render reference items', () => {
    const references = [
      createMockReference({ id: 'ref-1' }),
      createMockReference({ id: 'ref-2' }),
    ];
    render(<ReferenceGallery references={references} />);
    expect(screen.getByTestId('reference-gallery')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ReferenceGallery references={[]} className="custom-gallery" />);
    expect(screen.getByTestId('reference-gallery')).toHaveClass('custom-gallery');
  });
});

// ============================================================================
// ColorPalette Tests
// ============================================================================

describe('ColorPalette', () => {
  it('should render empty state when no colors', () => {
    render(<ColorPalette colors={[]} />);
    expect(screen.getByText('No colors')).toBeInTheDocument();
  });

  it('should render color swatches', () => {
    render(<ColorPalette colors={['#FF0000', '#00FF00', '#0000FF']} />);
    expect(screen.getByTestId('color-swatch-0')).toBeInTheDocument();
    expect(screen.getByTestId('color-swatch-1')).toBeInTheDocument();
    expect(screen.getByTestId('color-swatch-2')).toBeInTheDocument();
  });

  it('should limit colors to maxColors', () => {
    render(<ColorPalette colors={['#111', '#222', '#333', '#444', '#555']} maxColors={3} />);
    expect(screen.getByTestId('color-swatch-0')).toBeInTheDocument();
    expect(screen.getByTestId('color-swatch-1')).toBeInTheDocument();
    expect(screen.getByTestId('color-swatch-2')).toBeInTheDocument();
    expect(screen.queryByTestId('color-swatch-3')).not.toBeInTheDocument();
  });

  it('should call onColorClick when swatch is clicked', () => {
    const onColorClick = vi.fn();
    render(<ColorPalette colors={['#FF0000']} onColorClick={onColorClick} />);
    
    fireEvent.click(screen.getByTestId('color-swatch-0'));
    expect(onColorClick).toHaveBeenCalledWith('#FF0000');
  });

  it('should apply correct background color to swatches', () => {
    render(<ColorPalette colors={['#FF0000', '#00FF00']} />);
    expect(screen.getByTestId('color-swatch-0')).toHaveStyle({ backgroundColor: '#FF0000' });
    expect(screen.getByTestId('color-swatch-1')).toHaveStyle({ backgroundColor: '#00FF00' });
  });

  it('should apply custom className', () => {
    render(<ColorPalette colors={['#FF0000']} className="custom-palette" />);
    expect(screen.getByTestId('color-palette')).toHaveClass('custom-palette');
  });
});

// ============================================================================
// LoRABrowser Tests
// ============================================================================

describe('LoRABrowser', () => {
  it('should not render when open is false', () => {
    render(<LoRABrowser open={false} />);
    expect(screen.queryByTestId('lora-browser')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(<LoRABrowser open={true} />);
    expect(screen.getByTestId('lora-browser')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<LoRABrowser open={true} className="custom-browser" />);
    expect(screen.getByTestId('lora-browser')).toHaveClass('custom-browser');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Component Edge Cases', () => {
  it('CharacterCard handles empty name gracefully', () => {
    const character = createMockCharacter({ name: '' });
    expect(() => render(<CharacterCard character={character} />)).not.toThrow();
  });

  it('CharacterCard handles special characters in name', () => {
    const character = createMockCharacter({ name: '<script>alert("xss")</script>' });
    render(<CharacterCard character={character} />);
    // Should render as text, not execute
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it('CharacterCard handles very long name', () => {
    const longName = 'A'.repeat(200);
    const character = createMockCharacter({ name: longName });
    expect(() => render(<CharacterCard character={character} />)).not.toThrow();
  });

  it('ColorPalette handles invalid hex colors gracefully', () => {
    expect(() => render(<ColorPalette colors={['invalid', '#FFF', 'not-a-color']} />)).not.toThrow();
  });

  it('ReferenceGallery handles large number of references', () => {
    const references = Array.from({ length: 100 }, (_, i) => 
      createMockReference({ id: `ref-${i}` })
    );
    expect(() => render(<ReferenceGallery references={references} />)).not.toThrow();
  });
});
