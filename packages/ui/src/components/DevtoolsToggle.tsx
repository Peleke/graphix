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
  bottom: '8px',
  left: '8px',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  backgroundColor: 'gray.900',
  border: '1px solid',
  borderColor: 'gray.700',
  borderRadius: '6px',
  color: 'gray.400',
  fontSize: '11px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  transition: 'all 0.15s',
  opacity: 0.7,
  _hover: {
    opacity: 1,
    borderColor: 'gray.600',
    color: 'gray.200',
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
