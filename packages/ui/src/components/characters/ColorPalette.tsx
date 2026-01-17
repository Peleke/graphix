/**
 * ColorPalette Component
 * 
 * Display and edit color swatches.
 * Stub implementation for future development.
 */

import React from 'react';
import type { ColorPaletteProps } from './types';
import { css } from '../../../styled-system/css';

const styles = {
  container: css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  }),
  swatch: css({
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid',
    borderColor: 'slate.600',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    _hover: {
      transform: 'scale(1.1)',
    },
  }),
  swatchSm: css({
    width: '20px',
    height: '20px',
  }),
  swatchLg: css({
    width: '32px',
    height: '32px',
  }),
  emptyState: css({
    fontSize: '12px',
    color: 'slate.500',
  }),
};

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  maxColors = 8,
  size = 'md',
  editable = false,
  onColorClick,
  onColorsChange,
  className,
}) => {
  const displayColors = colors.slice(0, maxColors);
  
  const swatchClass = [
    styles.swatch,
    size === 'sm' && styles.swatchSm,
    size === 'lg' && styles.swatchLg,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`${styles.container} ${className || ''}`} data-testid="color-palette">
      {displayColors.length === 0 ? (
        <span className={styles.emptyState}>No colors</span>
      ) : (
        displayColors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            className={swatchClass}
            style={{ backgroundColor: color }}
            onClick={() => onColorClick?.(color)}
            data-testid={`color-swatch-${index}`}
          />
        ))
      )}
    </div>
  );
};
