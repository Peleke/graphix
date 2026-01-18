/**
 * Dialog component
 *
 * Consistent modal styling + basic UX (overlay click + Escape).
 */
import React, { useEffect } from 'react';
import { css } from '../../../styled-system/css';

interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  role?: 'dialog' | 'alertdialog';
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  overlayTestId?: string;
  contentTestId?: string;
  zIndex?: number;
  children: React.ReactNode;
}

const overlayStyle = css({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const contentStyle = css({
  backgroundColor: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: '12px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
});

export function Dialog({
  isOpen,
  onClose,
  role = 'dialog',
  ariaLabelledby,
  ariaDescribedby,
  overlayTestId,
  contentTestId,
  zIndex = 1000,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={overlayStyle}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
      }}
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      data-testid={overlayTestId}
      onClick={() => onClose?.()}
    >
      <div
        className={contentStyle}
        style={{
          backgroundColor: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
        data-testid={contentTestId}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
