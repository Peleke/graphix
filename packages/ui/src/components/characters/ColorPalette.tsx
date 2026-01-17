/**
 * ColorPalette Component
 * 
 * Displays and manages a character's color palette.
 * Supports adding, removing, and extracting colors.
 * 
 * ARRR! Every pirate needs their colors! 🎨🏴‍☠️
 */

import React, { useCallback, useState } from 'react';
import { css } from '../../../styled-system/css';

// ============================================================================
// Types
// ============================================================================

export interface ColorPaletteDisplayProps {
  /** Array of hex color strings */
  colors: string[];
  /** Called when user wants to add a color */
  onAddColor?: (color: string) => void;
  /** Called when user wants to remove a color */
  onRemoveColor?: (color: string) => void;
  /** Maximum number of colors allowed */
  maxColors?: number;
  /** Whether the palette is read-only */
  readOnly?: boolean;
}

export interface ColorSwatchProps {
  /** Hex color value */
  color: string;
  /** Called when swatch is clicked */
  onClick?: () => void;
  /** Called when remove button is clicked */
  onRemove?: () => void;
  /** Whether this swatch is selected */
  isSelected?: boolean;
  /** Whether remove button should be shown */
  showRemove?: boolean;
  /** Size of the swatch */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// ColorSwatch Component
// ============================================================================

export function ColorSwatch({
  color,
  onClick,
  onRemove,
  isSelected = false,
  showRemove = false,
  size = 'md',
}: ColorSwatchProps) {
  const sizeMap = {
    sm: '24px',
    md: '36px',
    lg: '48px',
  };

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  }, [onRemove]);

  return (
    <div
      className={css({
        position: 'relative',
        display: 'inline-block',
      })}
      data-testid="color-swatch-container"
    >
      <button
        type="button"
        onClick={onClick}
        className={css({
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: '8px',
          border: isSelected ? '2px solid #fff' : '2px solid transparent',
          cursor: onClick ? 'pointer' : 'default',
          outline: 'none',
          boxShadow: isSelected ? '0 0 0 2px #6366f1' : 'none',
          transition: 'all 0.2s ease',
          _hover: onClick ? { transform: 'scale(1.1)' } : {},
          _focus: { boxShadow: '0 0 0 2px #6366f1' },
        })}
        style={{ backgroundColor: color }}
        aria-label={`Color ${color}${isSelected ? ' (selected)' : ''}`}
        data-testid="color-swatch"
        data-color={color}
      />
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={css({
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            _hover: { backgroundColor: '#dc2626' },
          })}
          aria-label={`Remove color ${color}`}
          data-testid="remove-color-button"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ColorPaletteDisplay Component
// ============================================================================

export function ColorPaletteDisplay({
  colors,
  onAddColor,
  onRemoveColor,
  maxColors = 5,
  readOnly = false,
}: ColorPaletteDisplayProps) {
  const [inputColor, setInputColor] = useState('#6366f1');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const canAddMore = colors.length < maxColors && !readOnly;

  const handleAddColor = useCallback(() => {
    if (!inputColor || !onAddColor) return;
    
    // Validate hex color
    const isValid = /^#[0-9A-Fa-f]{6}$/.test(inputColor);
    if (!isValid) return;

    // Check for duplicates
    if (colors.includes(inputColor.toUpperCase()) || colors.includes(inputColor.toLowerCase())) {
      return;
    }

    onAddColor(inputColor);
    setIsPickerOpen(false);
  }, [inputColor, onAddColor, colors]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputColor(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColor();
    } else if (e.key === 'Escape') {
      setIsPickerOpen(false);
    }
  }, [handleAddColor]);

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      })}
      data-testid="color-palette"
    >
      {/* Color Swatches */}
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        })}
        role="list"
        aria-label="Color palette"
      >
        {colors.map((color, index) => (
          <div key={`${color}-${index}`} role="listitem">
            <ColorSwatch
              color={color}
              onRemove={readOnly ? undefined : () => onRemoveColor?.(color)}
              showRemove={!readOnly && !!onRemoveColor}
              size="md"
            />
          </div>
        ))}

        {/* Add Color Button */}
        {canAddMore && onAddColor && (
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className={css({
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '2px dashed #444',
              backgroundColor: 'transparent',
              color: '#888',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              _hover: { borderColor: '#6366f1', color: '#6366f1' },
            })}
            aria-label="Add color"
            data-testid="add-color-button"
          >
            +
          </button>
        )}
      </div>

      {/* Color Picker */}
      {isPickerOpen && (
        <div
          className={css({
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#0f0f1a',
            borderRadius: '8px',
            border: '1px solid #333',
          })}
          data-testid="color-picker"
        >
          <input
            type="color"
            value={inputColor}
            onChange={handleColorChange}
            className={css({
              width: '40px',
              height: '40px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            })}
            aria-label="Pick a color"
            data-testid="color-picker-input"
          />
          <input
            type="text"
            value={inputColor}
            onChange={(e) => setInputColor(e.target.value)}
            onKeyDown={handleKeyDown}
            className={css({
              width: '100px',
              padding: '8px',
              backgroundColor: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              _focus: { outline: 'none', borderColor: '#6366f1' },
            })}
            placeholder="#000000"
            aria-label="Hex color value"
            data-testid="color-hex-input"
          />
          <button
            type="button"
            onClick={handleAddColor}
            className={css({
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              _hover: { backgroundColor: '#6366f1' },
            })}
            data-testid="confirm-add-color-button"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsPickerOpen(false)}
            className={css({
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              _hover: { color: '#fff' },
            })}
            data-testid="cancel-add-color-button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Limit Warning */}
      {colors.length >= maxColors && !readOnly && (
        <p
          className={css({
            color: '#f59e0b',
            fontSize: '0.75rem',
          })}
          role="alert"
          data-testid="palette-limit-warning"
        >
          Maximum of {maxColors} colors reached
        </p>
      )}

      {/* Empty State */}
      {colors.length === 0 && (
        <p
          className={css({
            color: '#666',
            fontSize: '0.875rem',
          })}
          data-testid="empty-palette-message"
        >
          No colors in palette. {canAddMore && 'Click + to add colors.'}
        </p>
      )}
    </div>
  );
}

export default ColorPaletteDisplay;
