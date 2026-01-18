/**
 * DevtoolsToggle Component
 * 
 * Toggle button to show/hide TanStack devtools.
 * Remembers preference in localStorage.
 */

import { useState, useEffect } from 'react';
import { css } from '../../styled-system/css';

const STORAGE_KEY = 'graphix-devtools-visible';

const toggleStyles = css({
  position: 'fixed',
  bottom: '60px',  // Above the TanStack panels
  left: '8px',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  backgroundColor: 'gray.800',
  border: '1px solid',
  borderColor: 'gray.600',
  borderRadius: '8px',
  color: 'gray.200',
  fontSize: '12px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  transition: 'all 0.15s',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  _hover: {
    backgroundColor: 'gray.700',
    borderColor: 'gray.500',
    color: 'white',
  },
});

const dotStyles = css({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  transition: 'background-color 0.15s',
});

interface DevtoolsToggleProps {
  children: (visible: boolean) => React.ReactNode;
}

export function DevtoolsToggle({ children }: DevtoolsToggleProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(visible));
    // Dispatch custom event for same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('devtools-toggle'));
  }, [visible]);

  return (
    <>
      <button
        className={toggleStyles}
        onClick={() => setVisible(!visible)}
        title={visible ? 'Hide devtools' : 'Show devtools'}
        data-testid="devtools-toggle"
      >
        <span
          className={dotStyles}
          style={{ backgroundColor: visible ? '#22c55e' : '#71717a' }}
        />
        {visible ? 'DevTools ON' : 'DevTools OFF'}
      </button>
      {children(visible)}
    </>
  );
}
