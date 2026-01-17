/**
 * LoRABrowser Component Tests
 * 
 * Testing the LoRA browser and selection.
 * ARRR! Choose yer style wisely! 🎭🏴‍☠️
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoRABrowser, LoRACard } from '../LoRABrowser';
import { LoraConfig } from '../types';

// Mock Panda CSS
vi.mock('../../../../styled-system/css', () => ({
  css: vi.fn((styles) => JSON.stringify(styles)),
}));

// Mock LoRA catalog
vi.mock('@graphix/core/src/generation/models/lora-catalog', () => ({
  LORA_CATALOG: {
    'anime_v3': {
      id: 'anime_v3',
      name: 'Anime Style V3',
      category: 'style',
      description: 'Classic anime style',
      defaultStrength: 0.8,
      triggerWords: ['anime style'],
    },
    'watercolor': {
      id: 'watercolor',
      name: 'Watercolor',
      category: 'style',
      description: 'Watercolor painting style',
      defaultStrength: 0.7,
    },
    'cyberpunk_char': {
      id: 'cyberpunk_char',
      name: 'Cyberpunk Character',
      category: 'character',
      description: 'Cyberpunk character style',
      defaultStrength: 0.85,
      triggerWords: ['cyberpunk', 'neon'],
    },
    'fantasy_effect': {
      id: 'fantasy_effect',
      name: 'Fantasy Effects',
      category: 'effect',
      description: 'Magical effects',
      defaultStrength: 0.6,
    },
  },
  getLora: vi.fn((id: string) => {
    const catalog: Record<string, any> = {
      'anime_v3': {
        id: 'anime_v3',
        name: 'Anime Style V3',
        category: 'style',
        description: 'Classic anime style',
        defaultStrength: 0.8,
        triggerWords: ['anime style'],
      },
      'watercolor': {
        id: 'watercolor',
        name: 'Watercolor',
        category: 'style',
        description: 'Watercolor painting style',
        defaultStrength: 0.7,
      },
    };
    return catalog[id];
  }),
  listLorasByCategory: vi.fn(),
  listLorasByFamily: vi.fn(),
}));

// ============================================================================
// LoRACard Tests
// ============================================================================

describe('LoRACard', () => {
  const mockLora = {
    id: 'test_lora',
    name: 'Test LoRA',
    category: 'style',
    description: 'A test LoRA',
    defaultStrength: 0.8,
  };

  it('should render LoRA name', () => {
    render(<LoRACard lora={mockLora} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByText('Test LoRA')).toBeInTheDocument();
  });

  it('should render category badge', () => {
    render(<LoRACard lora={mockLora} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByTestId('lora-category-badge')).toHaveTextContent('style');
  });

  it('should render description', () => {
    render(<LoRACard lora={mockLora} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByText('A test LoRA')).toBeInTheDocument();
  });

  it('should show default strength', () => {
    render(<LoRACard lora={mockLora} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByText(/Default: 80%/)).toBeInTheDocument();
  });

  it('should have data-lora-id attribute', () => {
    render(<LoRACard lora={mockLora} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByTestId('lora-card')).toHaveAttribute('data-lora-id', 'test_lora');
  });

  it('should indicate selection with aria-pressed', () => {
    render(<LoRACard lora={mockLora} isSelected={true} onClick={() => {}} />);
    
    expect(screen.getByTestId('lora-card')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<LoRACard lora={mockLora} isSelected={false} onClick={onClick} />);
    
    await user.click(screen.getByTestId('lora-card'));
    
    expect(onClick).toHaveBeenCalled();
  });

  it('should render preview image when available', () => {
    const loraWithPreview = { ...mockLora, previewUrl: 'https://example.com/preview.png' };
    render(<LoRACard lora={loraWithPreview} isSelected={false} onClick={() => {}} />);
    
    expect(screen.getByAltText('Test LoRA preview')).toBeInTheDocument();
  });
});

// ============================================================================
// LoRABrowser Tests
// ============================================================================

describe('LoRABrowser', () => {
  const defaultProps = {
    selectedLora: null as LoraConfig | null,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onStrengthChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getByTestId('lora-search-input')).toBeInTheDocument();
    });

    it('should filter LoRAs by name', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.type(screen.getByTestId('lora-search-input'), 'Anime');
      
      expect(screen.getByText('Anime Style V3')).toBeInTheDocument();
      expect(screen.queryByText('Watercolor')).not.toBeInTheDocument();
    });

    it('should filter LoRAs by description', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.type(screen.getByTestId('lora-search-input'), 'painting');
      
      expect(screen.getByText('Watercolor')).toBeInTheDocument();
      expect(screen.queryByText('Anime Style V3')).not.toBeInTheDocument();
    });

    it('should show empty state when no matches', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.type(screen.getByTestId('lora-search-input'), 'nonexistent');
      
      expect(screen.getByTestId('no-loras-found')).toBeInTheDocument();
    });

    it('should have accessible search input', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getByTestId('lora-search-input')).toHaveAttribute('aria-label', 'Search LoRAs');
    });
  });

  describe('Category Filtering', () => {
    it('should render category filter buttons', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getByTestId('category-filter-all')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-style')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-character')).toBeInTheDocument();
    });

    it('should filter by category when clicked', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.click(screen.getByTestId('category-filter-style'));
      
      expect(screen.getByText('Anime Style V3')).toBeInTheDocument();
      expect(screen.getByText('Watercolor')).toBeInTheDocument();
      expect(screen.queryByText('Cyberpunk Character')).not.toBeInTheDocument();
    });

    it('should indicate selected category', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.click(screen.getByTestId('category-filter-style'));
      
      expect(screen.getByTestId('category-filter-style')).toHaveAttribute('aria-selected', 'true');
    });

    it('should show all when "all" is selected', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      // First filter by style
      await user.click(screen.getByTestId('category-filter-style'));
      // Then click all
      await user.click(screen.getByTestId('category-filter-all'));
      
      // Should show all categories
      expect(screen.getByText('Anime Style V3')).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk Character')).toBeInTheDocument();
    });
  });

  describe('LoRA Selection', () => {
    it('should call onSelect when LoRA card clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<LoRABrowser {...defaultProps} onSelect={onSelect} />);
      
      const card = screen.getByText('Anime Style V3').closest('[data-testid="lora-card"]');
      await user.click(card!);
      
      expect(onSelect).toHaveBeenCalledWith('anime_v3', 0.8);
    });

    it('should show selected LoRA display', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByTestId('selected-lora-display')).toBeInTheDocument();
    });

    it('should show selected LoRA name', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByText('Anime Style V3')).toBeInTheDocument();
    });

    it('should indicate selection on LoRA card', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      const selectedCard = screen.getAllByTestId('lora-card').find(
        card => card.getAttribute('data-lora-id') === 'anime_v3'
      );
      expect(selectedCard).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('LoRA Removal', () => {
    it('should show remove button when LoRA selected', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByTestId('remove-lora-button')).toBeInTheDocument();
    });

    it('should call onRemove when remove clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
          onRemove={onRemove}
        />
      );
      
      await user.click(screen.getByTestId('remove-lora-button'));
      
      expect(onRemove).toHaveBeenCalled();
    });
  });

  describe('Strength Slider', () => {
    it('should show strength slider when LoRA selected', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByTestId('lora-strength-slider')).toBeInTheDocument();
    });

    it('should show current strength percentage', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.75 }}
        />
      );
      
      expect(screen.getByText(/Strength: 75%/)).toBeInTheDocument();
    });

    it('should have correct slider value', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.65 }}
        />
      );
      
      expect(screen.getByTestId('lora-strength-slider')).toHaveValue('0.65');
    });

    it('should call onStrengthChange when slider released', async () => {
      const onStrengthChange = vi.fn();
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
          onStrengthChange={onStrengthChange}
        />
      );
      
      const slider = screen.getByTestId('lora-strength-slider');
      fireEvent.change(slider, { target: { value: '0.5' } });
      fireEvent.mouseUp(slider);
      
      expect(onStrengthChange).toHaveBeenCalledWith(0.5);
    });
  });

  describe('Trigger Words', () => {
    it('should show trigger words when available', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByText('anime style')).toBeInTheDocument();
    });

    it('should show trigger words label', () => {
      render(
        <LoRABrowser
          {...defaultProps}
          selectedLora={{ id: 'anime_v3', strength: 0.8 }}
        />
      );
      
      expect(screen.getByText(/trigger words:/i)).toBeInTheDocument();
    });
  });

  describe('Category Grouping', () => {
    it('should group LoRAs by category when showing all', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      // Should have category headings
      expect(screen.getByTestId('lora-category-style')).toBeInTheDocument();
      expect(screen.getByTestId('lora-category-character')).toBeInTheDocument();
    });

    it('should show count in category heading', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      // Style category should show count
      expect(screen.getByText(/style \(2\)/i)).toBeInTheDocument();
    });

    it('should not show category headings when filtered', async () => {
      const user = userEvent.setup();
      render(<LoRABrowser {...defaultProps} />);
      
      await user.click(screen.getByTestId('category-filter-style'));
      
      // Should not have multiple category headings
      expect(screen.queryByText(/character \(/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have tablist role on category filters', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab role on category filter buttons', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getByTestId('category-filter-all')).toHaveAttribute('role', 'tab');
    });

    it('should have list role on LoRA grid', () => {
      render(<LoRABrowser {...defaultProps} />);
      
      expect(screen.getAllByRole('list')).toBeTruthy();
    });
  });
});
