/**
 * Vitest Test Setup
 */

import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock URL.createObjectURL for tests that use file previews
if (typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'function') {
  // @ts-expect-error test-only shim
  URL.createObjectURL = () => 'blob:mock';
  // @ts-expect-error test-only shim
  URL.revokeObjectURL = () => {};
}
