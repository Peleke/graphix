/**
 * ColorPalette Component Tests
 * 
 * Testing the color palette display and management.
 * ARRR! Every pirate needs their colors tested! 🎨🏴‍☠️
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPaletteDisplay, ColorSwatch } from '../ColorPalette';

// Mock Panda CSS
vi.mock('../../../../styled-system/css', () => ({
  css: vi.fn((styles) => JSON.stringify(styles)),
}));

// ============================================================================
// ColorSwatch Tests
// ============================================================================

describe('ColorSwatch', () => {
  it('should render with correct color', () => {
    render(<ColorSwatch color="#FF0000" />);
    
    const swatch = screen.getByTestId('color-swatch');
    expect(swatch).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('should have correct aria-label', () => {
    render(<ColorSwatch color="#00FF00" />);
    
    const swatch = screen.getByTestId('color-swatch');
    expect(swatch).toHaveAttribute('aria-label', 'Color #00FF00');
  });

  it('should indicate selected state in aria-label', () => {
    render(<ColorSwatch color="#0000FF" isSelected />);
    
    const swatch = screen.getByTestId('color-swatch');
    expect(swatch).toHaveAttribute('aria-label', 'Color #0000FF (selected)');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ColorSwatch color="#FF0000" onClick={onClick} />);
    
    await user.click(screen.getByTestId('color-swatch'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should show remove button when showRemove is true', () => {
    const onRemove = vi.fn();
    render(<ColorSwatch color="#FF0000" onRemove={onRemove} showRemove />);
    
    expect(screen.getByTestId('remove-color-button')).toBeInTheDocument();
  });

  it('should not show remove button when showRemove is false', () => {
    render(<ColorSwatch color="#FF0000" showRemove={false} />);
    
    expect(screen.queryByTestId('remove-color-button')).not.toBeInTheDocument();
  });

  it('should call onRemove when remove button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<ColorSwatch color="#FF0000" onRemove={onRemove} showRemove />);
    
    await user.click(screen.getByTestId('remove-color-button'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('should stop propagation when remove is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(<ColorSwatch color="#FF0000" onClick={onClick} onRemove={onRemove} showRemove />);
    
    await user.click(screen.getByTestId('remove-color-button'));
    expect(onRemove).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should have data-color attribute', () => {
    render(<ColorSwatch color="#AABBCC" />);
    
    const swatch = screen.getByTestId('color-swatch');
    expect(swatch).toHaveAttribute('data-color', '#AABBCC');
  });

  it('should render small size', () => {
    render(<ColorSwatch color="#FF0000" size="sm" />);
    expect(screen.getByTestId('color-swatch')).toBeInTheDocument();
  });

  it('should render large size', () => {
    render(<ColorSwatch color="#FF0000" size="lg" />);
    expect(screen.getByTestId('color-swatch')).toBeInTheDocument();
  });
});

// ============================================================================
// ColorPaletteDisplay Tests
// ============================================================================

describe('ColorPaletteDisplay', () => {
  describe('Rendering', () => {
    it('should render empty state when no colors', () => {
      render(<ColorPaletteDisplay colors={[]} />);
      
      expect(screen.getByTestId('empty-palette-message')).toBeInTheDocument();
    });

    it('should render color swatches for each color', () => {
      render(<ColorPaletteDisplay colors={['#FF0000', '#00FF00', '#0000FF']} />);
      
      const swatches = screen.getAllByTestId('color-swatch');
      expect(swatches).toHaveLength(3);
    });

    it('should have accessible list role', () => {
      render(<ColorPaletteDisplay colors={['#FF0000']} />);
      
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should show add button when under max colors', () => {
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#FF0000']}
          onAddColor={onAddColor}
          maxColors={5}
        />
      );
      
      expect(screen.getByTestId('add-color-button')).toBeInTheDocument();
    });

    it('should not show add button when at max colors', () => {
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#111111', '#222222', '#333333', '#444444', '#555555']}
          onAddColor={onAddColor}
          maxColors={5}
        />
      );
      
      expect(screen.queryByTestId('add-color-button')).not.toBeInTheDocument();
    });

    it('should show limit warning when at max colors', () => {
      render(
        <ColorPaletteDisplay
          colors={['#111111', '#222222', '#333333', '#444444', '#555555']}
          maxColors={5}
        />
      );
      
      expect(screen.getByTestId('palette-limit-warning')).toBeInTheDocument();
    });

    it('should not show add button in readOnly mode', () => {
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#FF0000']}
          onAddColor={onAddColor}
          readOnly
        />
      );
      
      expect(screen.queryByTestId('add-color-button')).not.toBeInTheDocument();
    });

    it('should not show remove buttons in readOnly mode', () => {
      const onRemoveColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#FF0000', '#00FF00']}
          onRemoveColor={onRemoveColor}
          readOnly
        />
      );
      
      expect(screen.queryByTestId('remove-color-button')).not.toBeInTheDocument();
    });
  });

  describe('Adding Colors', () => {
    it('should open color picker when add button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={() => {}}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
    });

    it('should show color input and hex input in picker', async () => {
      const user = userEvent.setup();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={() => {}}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      
      expect(screen.getByTestId('color-picker-input')).toBeInTheDocument();
      expect(screen.getByTestId('color-hex-input')).toBeInTheDocument();
    });

    it('should call onAddColor when add is confirmed', async () => {
      const user = userEvent.setup();
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={onAddColor}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      await user.click(screen.getByTestId('confirm-add-color-button'));
      
      expect(onAddColor).toHaveBeenCalled();
    });

    it('should close picker when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={() => {}}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('cancel-add-color-button'));
      expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
    });

    it('should close picker on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={() => {}}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
    });

    it('should add color on Enter key in hex input', async () => {
      const user = userEvent.setup();
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={onAddColor}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      const hexInput = screen.getByTestId('color-hex-input');
      await user.clear(hexInput);
      await user.type(hexInput, '#ABCDEF{Enter}');
      
      expect(onAddColor).toHaveBeenCalledWith('#ABCDEF');
    });

    it('should not add invalid hex color', async () => {
      const user = userEvent.setup();
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={onAddColor}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      const hexInput = screen.getByTestId('color-hex-input');
      await user.clear(hexInput);
      await user.type(hexInput, 'invalid{Enter}');
      
      expect(onAddColor).not.toHaveBeenCalled();
    });

    it('should not add duplicate color', async () => {
      const user = userEvent.setup();
      const onAddColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#FF0000']}
          onAddColor={onAddColor}
        />
      );
      
      await user.click(screen.getByTestId('add-color-button'));
      const hexInput = screen.getByTestId('color-hex-input');
      await user.clear(hexInput);
      await user.type(hexInput, '#FF0000{Enter}');
      
      expect(onAddColor).not.toHaveBeenCalled();
    });
  });

  describe('Removing Colors', () => {
    it('should call onRemoveColor when remove button clicked', async () => {
      const user = userEvent.setup();
      const onRemoveColor = vi.fn();
      render(
        <ColorPaletteDisplay
          colors={['#FF0000', '#00FF00']}
          onRemoveColor={onRemoveColor}
        />
      );
      
      const removeButtons = screen.getAllByTestId('remove-color-button');
      await user.click(removeButtons[0]);
      
      expect(onRemoveColor).toHaveBeenCalledWith('#FF0000');
    });

    it('should show remove buttons when onRemoveColor provided', () => {
      render(
        <ColorPaletteDisplay
          colors={['#FF0000', '#00FF00']}
          onRemoveColor={() => {}}
        />
      );
      
      expect(screen.getAllByTestId('remove-color-button')).toHaveLength(2);
    });

    it('should not show remove buttons when onRemoveColor not provided', () => {
      render(
        <ColorPaletteDisplay
          colors={['#FF0000', '#00FF00']}
        />
      );
      
      expect(screen.queryByTestId('remove-color-button')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible empty state message', () => {
      render(<ColorPaletteDisplay colors={[]} />);
      
      expect(screen.getByTestId('empty-palette-message')).toHaveTextContent('No colors');
    });

    it('should have accessible add button', () => {
      render(
        <ColorPaletteDisplay
          colors={[]}
          onAddColor={() => {}}
        />
      );
      
      expect(screen.getByTestId('add-color-button')).toHaveAttribute('aria-label', 'Add color');
    });

    it('should have alert role on limit warning', () => {
      render(
        <ColorPaletteDisplay
          colors={['#111111', '#222222', '#333333', '#444444', '#555555']}
          maxColors={5}
        />
      );
      
      expect(screen.getByTestId('palette-limit-warning')).toHaveAttribute('role', 'alert');
    });
  });
});
