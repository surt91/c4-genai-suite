import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Node >= 25 ships its own (file-backed, here unconfigured) Web Storage globals that shadow jsdom's
// implementation. Always use jsdom's storage so tests behave the same on every Node version.
for (const storage of ['localStorage', 'sessionStorage'] as const) {
  const jsdomStorage = (globalThis as { jsdom?: { window: Window } }).jsdom?.window[storage];
  if (jsdomStorage) {
    Object.defineProperty(globalThis, storage, { value: jsdomStorage, configurable: true, writable: true });
  }
}

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

  // used by Mantine's autosize textarea, not implemented by jsdom
  if (!document.fonts) {
    Object.defineProperty(document, 'fonts', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true,
    });
  }
});

afterEach(() => {
  cleanup();
});
