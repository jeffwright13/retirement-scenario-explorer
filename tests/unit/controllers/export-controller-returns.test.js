/**
 * Tests for ExportController Monte Carlo returns CSV generation
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { ExportController } from '../../../scripts/controllers/ExportController.js';

describe('ExportController Monte Carlo Returns Export', () => {
  let eventBus;
  let exportController;

  beforeEach(() => {
    eventBus = new EventBus();
    exportController = new ExportController(eventBus);
    
    // Mock DOM elements
    document.getElementById = jest.fn().mockReturnValue({
      addEventListener: jest.fn(),
      style: { display: '' }
    });
    
    // Mock download functionality
    global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = jest.fn();
    document.createElement = jest.fn().mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
      style: { display: '' }
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('generateMonteCarloReturnsCSV', () => {
    test('should generate CSV from Monte Carlo results with return sequences', () => {
      const mockResults = {
        results: [
          {
            iteration: 0,
            result: {
              returnSequence: {
                stock: [0.10, -0.05, 0.15],
                bond: [0.04, 0.03, 0.05]
              }
            }
          },
          {
            iteration: 1,
            result: {
              returnSequence: {
                stock: [0.08, 0.12, -0.02],
                bond: [0.03, 0.04, 0.06]
              }
            }
          }
        ]
      };

      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);

      expect(csv).toContain('Scenario,Year,bond,stock');
      expect(csv).toContain('1,1,4.0000%,10.0000%');
      expect(csv).toContain('1,2,3.0000%,-5.0000%');
      expect(csv).toContain('2,1,3.0000%,8.0000%');
      expect(csv).toContain('2,3,6.0000%,-2.0000%');
    });

    test('should handle return sequences at top level', () => {
      const mockResults = {
        results: [
          {
            iteration: 0,
            returnSequence: {
              investment: [0.07, 0.12]
            }
          }
        ]
      };

      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);

      expect(csv).toContain('Scenario,Year,investment');
      expect(csv).toContain('1,1,7.0000%');
      expect(csv).toContain('1,2,12.0000%');
    });

    test('should return error message when no results available', () => {
      const mockResults = { results: [] };
      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);
      expect(csv).toBe('No Monte Carlo returns data available');
    });

    test('should return error message when no return sequences found', () => {
      const mockResults = {
        results: [
          { iteration: 0, result: {} },
          { iteration: 1, result: {} }
        ]
      };

      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);
      expect(csv).toBe('No Monte Carlo returns data available');
    });

    test('should handle mixed scenarios with and without return sequences', () => {
      const mockResults = {
        results: [
          {
            iteration: 0,
            result: {
              returnSequence: {
                stock: [0.10, 0.05]
              }
            }
          },
          {
            iteration: 1,
            result: {} // No return sequence
          },
          {
            iteration: 2,
            result: {
              returnSequence: {
                stock: [0.08, -0.03]
              }
            }
          }
        ]
      };

      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);

      expect(csv).toContain('1,1,10.0000%');
      expect(csv).toContain('1,2,5.0000%');
      expect(csv).toContain('3,1,8.0000%');
      expect(csv).toContain('3,2,-3.0000%');
      // Should not contain scenario 2 data
      expect(csv).not.toContain('2,1');
    });

    test('should format percentages correctly', () => {
      const mockResults = {
        results: [
          {
            iteration: 0,
            result: {
              returnSequence: {
                test: [0.123456, -0.087654, 0.000123]
              }
            }
          }
        ]
      };

      const csv = exportController.generateMonteCarloReturnsCSV(mockResults);

      expect(csv).toContain('12.3456%');
      expect(csv).toContain('-8.7654%');
      expect(csv).toContain('0.0123%');
    });
  });

  describe('exportMonteCarloReturns', () => {
    test('should export CSV when Monte Carlo results are available', () => {
      const mockResults = {
        results: [
          {
            iteration: 0,
            result: {
              returnSequence: {
                stock: [0.10, 0.05]
              }
            }
          }
        ]
      };

      exportController.monteCarloResults = mockResults;

      const eventSpy = jest.fn();
      eventBus.on('export:monte-carlo-returns', eventSpy);

      exportController.exportMonteCarloReturns();

      expect(eventSpy).toHaveBeenCalledWith({
        filename: expect.stringMatching(/monte-carlo-returns-.*\.csv/),
        size: expect.any(Number)
      });
    });

    test('should warn when no Monte Carlo results available', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      exportController.monteCarloResults = null;
      exportController.exportMonteCarloReturns();

      expect(consoleSpy).toHaveBeenCalledWith('No Monte Carlo results available for returns export');
      
      consoleSpy.mockRestore();
    });
  });
});
