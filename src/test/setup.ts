import '@testing-library/jest-dom/vitest';

// jsdom implements neither of these, and both are used by the UI.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// navigator.clipboard is deliberately NOT stubbed here: @testing-library/user-event
// installs its own clipboard stub per `setup()` and throws if one already exists.
