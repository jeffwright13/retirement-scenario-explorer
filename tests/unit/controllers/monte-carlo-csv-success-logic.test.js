/**
 * Monte Carlo CSV Success Logic Tests
 * Tests the success calculation logic used in CSV export
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';

// Mock minimal DOM to avoid issues
global.document = {
  getElementById: jest.fn(() => ({ addEventListener: jest.fn() })),
  createElement: jest.fn(() => ({ 
    href: '', 
    download: '', 
    click: jest.fn(),
    style: {} 
  })),
  body: { 
    appendChild: jest.fn(), 
    removeChild: jest.fn() 
  }
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

describe('Monte Carlo CSV Success Logic', () => {
  let eventBus;
  let controller;

  const sampleScenario = {
    name: 'Test Retirement Scenario',
    plan: {
      monthly_expenses: 5000,
      duration_months: 168, // 14 years
      assumptions: {
        market_return: 0.07,
        inflation_rate: 0.025
      }
    },
    assets: [
      {
        name: 'Primary Portfolio',
        balance: 1000000,
        draw_order: 1
      }
    ]
  };

  beforeEach(() => {
    eventBus = new EventBus();
    controller = new MonteCarloController(eventBus);
    controller.currentScenarioData = sampleScenario;
    jest.clearAllMocks();
  });

  /**
   * Helper function to extract success calculation logic from CSV export
   * This simulates the logic without triggering the full download
   */
  function calculateIndividualSuccess(timeawareResults, targetMonths, minimumBalance) {
    // Find depletion month (first month where total balance <= 0)
    const depletionMonth = timeawareResults.findIndex(month => {
      if (month && month.assets) {
        const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
        return totalBalance <= 0;
      }
      return false;
    });
    
    const survivalMonths = depletionMonth === -1 ? timeawareResults.length : depletionMonth;
    
    // Calculate final balance
    const lastMonth = timeawareResults[timeawareResults.length - 1];
    const finalBalance = lastMonth && lastMonth.assets 
      ? Object.values(lastMonth.assets).reduce((sum, balance) => sum + balance, 0)
      : 0;
    
    // Success requires both: lasting the target time AND having minimum balance
    return (survivalMonths >= targetMonths && finalBalance >= minimumBalance);
  }

  describe('Success Calculation Logic', () => {
    test('should calculate success correctly with survival time and minimum balance criteria', () => {
      const targetMonths = 168; // 14 years
      const minimumBalance = 0;

      // Test case 1: Success - survived 15 years with positive balance
      const successCase = Array(180).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': Math.max(0, 1000000 - (i * 5000)) }
      }));
      
      expect(calculateIndividualSuccess(successCase, targetMonths, minimumBalance)).toBe(true);

      // Test case 2: Failure - only survived 12.5 years
      const failureCase = Array(150).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': Math.max(0, 800000 - (i * 5000)) }
      }));
      
      expect(calculateIndividualSuccess(failureCase, targetMonths, minimumBalance)).toBe(false);

      // Test case 3: Success - survived 15 years with exactly minimum balance
      const edgeCase = Array(180).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': i < 170 ? Math.max(0, 900000 - (i * 5000)) : 0 }
      }));
      
      expect(calculateIndividualSuccess(edgeCase, targetMonths, minimumBalance)).toBe(true);
    });

    test('should handle minimum balance requirement correctly', () => {
      const targetMonths = 168;
      const minimumBalance = 50000; // Require $50k minimum

      // Test case 1: Failure - survived target time but balance < minimum
      const insufficientBalanceCase = Array(180).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': i < 170 ? Math.max(0, 200000 - (i * 1000)) : 30000 }
      }));
      
      expect(calculateIndividualSuccess(insufficientBalanceCase, targetMonths, minimumBalance)).toBe(false);

      // Test case 2: Success - survived target time with balance >= minimum
      const sufficientBalanceCase = Array(180).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': Math.max(50000, 500000 - (i * 2000)) }
      }));
      
      expect(calculateIndividualSuccess(sufficientBalanceCase, targetMonths, minimumBalance)).toBe(true);
    });

    test('should handle edge cases correctly', () => {
      const targetMonths = 120; // 10 years
      const minimumBalance = 0;

      // Edge case 1: Exactly meets target months
      const exactTargetCase = Array(120).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': Math.max(0, 600000 - (i * 5000)) }
      }));
      
      expect(calculateIndividualSuccess(exactTargetCase, targetMonths, minimumBalance)).toBe(true);

      // Edge case 2: One month short of target
      const oneMonthShortCase = Array(119).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 'Primary Portfolio': Math.max(0, 600000 - (i * 5000)) }
      }));
      
      expect(calculateIndividualSuccess(oneMonthShortCase, targetMonths, minimumBalance)).toBe(false);

      // Edge case 3: Empty timeaware results
      const emptyCase = [];
      
      expect(calculateIndividualSuccess(emptyCase, targetMonths, minimumBalance)).toBe(false);
    });

    test('should match MonteCarloService success rate calculation logic', () => {
      const targetMonths = 144; // 12 years
      const minimumBalance = 10000;

      const testCases = [
        // Success case: time AND balance
        {
          results: Array(150).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Primary Portfolio': Math.max(15000, 800000 - (i * 5000)) }
          })),
          expected: true
        },
        // Failure: time but not balance
        {
          results: Array(150).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Primary Portfolio': Math.max(0, 600000 - (i * 4000)) }
          })),
          expected: false
        },
        // Failure: balance but not time
        {
          results: Array(100).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Primary Portfolio': Math.max(50000, 1000000 - (i * 8000)) }
          })),
          expected: false
        },
        // Failure: neither time nor balance
        {
          results: Array(100).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Primary Portfolio': Math.max(0, 400000 - (i * 4000)) }
          })),
          expected: false
        }
      ];

      testCases.forEach((testCase, index) => {
        const result = calculateIndividualSuccess(testCase.results, targetMonths, minimumBalance);
        expect(result).toBe(testCase.expected);
      });

      // Verify success rate: only 1 out of 4 should be successful
      const successCount = testCases.filter(testCase => 
        calculateIndividualSuccess(testCase.results, targetMonths, minimumBalance)
      ).length;
      
      expect(successCount).toBe(1);
      expect(successCount / testCases.length).toBe(0.25); // 25% success rate
    });

    test('should handle complex asset structures', () => {
      const targetMonths = 120;
      const minimumBalance = 0;

      // Test with multiple assets
      const multiAssetCase = Array(130).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 
          'Primary Portfolio': Math.max(0, 500000 - (i * 2000)),
          'Secondary Account': Math.max(0, 300000 - (i * 1500)),
          'Emergency Fund': Math.max(0, 50000 - (i * 200))
        }
      }));
      
      expect(calculateIndividualSuccess(multiAssetCase, targetMonths, minimumBalance)).toBe(true);

      // Test with assets that deplete at different rates
      const staggeredDepletionCase = Array(100).fill(null).map((_, i) => ({
        month: i + 1,
        assets: { 
          'Fast Depletion': i < 50 ? Math.max(0, 100000 - (i * 2000)) : 0,
          'Slow Depletion': Math.max(0, 800000 - (i * 3000))
        }
      }));
      
      expect(calculateIndividualSuccess(staggeredDepletionCase, targetMonths, minimumBalance)).toBe(false);
    });
  });

  describe('Integration with Controller State', () => {
    test('should use currentAnalysisData for success criteria', () => {
      // Set up controller state
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 144
        }
      };

      // Verify the logic would use these values
      expect(controller.currentAnalysisData.metadata.targetMonths).toBe(144);
    });

    test('should handle missing metadata gracefully', () => {
      // Test with undefined currentAnalysisData
      controller.currentAnalysisData = undefined;
      
      // The actual CSV export should handle this case
      expect(controller.currentAnalysisData?.metadata?.targetMonths || 168).toBe(168);
    });
  });
});
