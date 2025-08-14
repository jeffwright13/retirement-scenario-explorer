// Jest setup file - runs before all tests
require('@testing-library/jest-dom');

// Mock browser APIs that might not be available in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Chart.js if you're using it (common in financial apps)
global.Chart = class Chart {
  constructor() {}
  destroy() {}
  update() {}
  render() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: vi => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
