/**
 * LoRABrowser Component
 * 
 * Browse and filter LoRA catalog for character association.
 * Stub implementation for future development.
 */

import React from 'react';
import type { LoRABrowserProps } from './types';
import { useLoRABrowser } from './hooks';
import { css } from '../../../styled-system/css';

const styles = {
  container: css({
    display: 'none', // Hidden by default
  }),
};

export const LoRABrowser: React.FC<LoRABrowserProps> = ({
  selectedLora,
  categoryFilter,
  familyFilter,
  onLoraSelect,
  onStrengthChange,
  open = false,
  onOpenChange,
  className,
}) => {
  const browser = useLoRABrowser();
  
  if (!open) return null;
  
  return (
    <div className={`${styles.container} ${className || ''}`} data-testid="lora-browser">
      {/* Full implementation coming soon */}
      <span>LoRA Browser - {browser.loras.length} loras available</span>
    </div>
  );
};
