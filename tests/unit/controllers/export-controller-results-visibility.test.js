/**
 * Tests for ExportController's "Results" export button visibility.
 * See ISSUES.md #4/#5: the button's visibility was gated on this.currentTab,
 * which was only ever updated by clicks on a dead .tab-button class that
 * doesn't exist anywhere in index.html — so the button could never appear.
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { ExportController } from '../../../scripts/controllers/ExportController.js';

describe('ExportController Results button visibility', () => {
  let eventBus;
  let exportController;
  let elements;

  beforeEach(() => {
    eventBus = new EventBus();
    exportController = new ExportController(eventBus);

    elements = {};
    document.getElementById = jest.fn((id) => {
      if (!elements[id]) {
        elements[id] = { addEventListener: jest.fn(), style: {}, disabled: true };
      }
      return elements[id];
    });

    exportController.initialize();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
    jest.clearAllMocks();
  });

  test('should become visible after simulation:completed, with no dependency on tab state (ISSUES.md #5)', () => {
    eventBus.emit('simulation:completed', { someResult: true });

    const resultsBtn = elements['export-scenario-results'];
    expect(resultsBtn.style.display).toBe('inline-flex');
    expect(resultsBtn.disabled).toBe(false);
  });

  test('should stay hidden before any simulation has completed', () => {
    const resultsBtn = elements['export-scenario-results'];
    expect(resultsBtn.style.display).toBe('none');
    expect(resultsBtn.disabled).toBe(true);
  });
});
