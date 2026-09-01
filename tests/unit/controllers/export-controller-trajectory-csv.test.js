/**
 * Tests for ExportController.generateMonteCarloCSV() (ISSUES.md #30) --
 * previously hardcoded four specific asset-name columns
 * (Savings/Investment/Traditional_IRA/Roth_IRA), so any scenario with
 * differently-named assets exported those columns as 0.00.
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { ExportController } from '../../../scripts/controllers/ExportController.js';

describe('ExportController Monte Carlo trajectory CSV export', () => {
  let eventBus;
  let exportController;

  beforeEach(() => {
    eventBus = new EventBus();
    exportController = new ExportController(eventBus);
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  test('uses real asset names as dynamic columns instead of hardcoded ones', () => {
    const mockResults = {
      results: [
        {
          iteration: 0,
          result: {
            results: {
              balanceHistory: {
                'High-Yield Savings': [10000, 10100],
                'Brokerage Investment': [50000, 49500]
              }
            }
          }
        }
      ]
    };

    const csv = exportController.generateMonteCarloCSV(mockResults);
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    expect(headers).toContain('High-Yield_Savings');
    expect(headers).toContain('Brokerage_Investment');
    // The old hardcoded columns should not appear for a scenario that never used them
    expect(headers).not.toContain('Savings');
    expect(headers).not.toContain('Traditional_IRA');

    // Real balance data should appear, not zeroed-out hardcoded columns
    const investmentColumnIndex = headers.indexOf('Brokerage_Investment');
    const firstDataRow = lines[1].split(',');
    expect(parseFloat(firstDataRow[investmentColumnIndex])).toBe(50000);
  });
});
