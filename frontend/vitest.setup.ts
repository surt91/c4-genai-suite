import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import React from 'react';

// Node >= 25 ships its own (file-backed, here unconfigured) Web Storage globals that shadow jsdom's
// implementation. Always use jsdom's storage so tests behave the same on every Node version.
for (const storage of ['localStorage', 'sessionStorage'] as const) {
  const jsdomStorage = (globalThis as { jsdom?: { window: Window } }).jsdom?.window[storage];
  if (jsdomStorage) {
    Object.defineProperty(globalThis, storage, { value: jsdomStorage, configurable: true, writable: true });
  }
}

// Mock react-syntax-highlighter to avoid ES module issues
vi.mock('react-syntax-highlighter', () => ({
  Prism: (props: { children: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...other } = props;
    return React.createElement('code', { 'data-testid': 'syntax-highlighted-code', ...other }, children);
  },
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}));

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn());
  window.URL.createObjectURL = (file: File) => file.name;

  // Mantine needed mocks
  // see: https://mantine.dev/guides/vitest/
  const { getComputedStyle } = window;
  window.getComputedStyle = (elt) => getComputedStyle(elt);
  window.HTMLElement.prototype.scrollIntoView = () => {};

  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserver;
});

afterEach(() => {
  cleanup();
});
