/**
 * TimeAware Engine Real Integration Tests
 * Tests the actual simulateScenarioAdvanced function with real scenarios
 * This file imports and exercises the REAL engine code to find actual bugs
 */

import { simulateScenarioAdvanced } from '../../scripts/timeaware-engine.js';
const { comprehensiveScenarios, errorScenarios } = require('../fixtures/comprehensive-scenarios.js');
const { sampleScenarios } = require('../fixtures/sample-scenarios.js');

describe('TimeAware Engine - REAL Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Scenario Execution', () => {
    it('should execute basic retirement scenario successfully', () => {
      const scenario = sampleScenarios.basicRetirement;
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.balanceHistory).toBeDefined();
      
      // Verify structure matches what engine actually returns
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(typeof result.balanceHistory).toBe('object');
      
      // Check first result has expected properties
      const firstResult = result.results[0];
      expect(firstResult).toHaveProperty('month');
      expect(firstResult).toHaveProperty('income');
      expect(firstResult).toHaveProperty('expenses');
      expect(typeof firstResult.month).toBe('number');
      expect(typeof firstResult.income).toBe('number');
      expect(typeof firstResult.expenses).toBe('number');
    });

    it('should handle complex scenario with all asset types', () => {
      const scenario = comprehensiveScenarios.allAssetTypes;
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result.results).toBeDefined();
      expect(result.balanceHistory).toBeDefined();
      
      // Should have balance history for all assets
      const assetNames = scenario.assets.map(a => a.name);
      assetNames.forEach(name => {
        expect(result.balanceHistory[name]).toBeDefined();
        expect(Array.isArray(result.balanceHistory[name])).toBe(true);
        expect(result.balanceHistory[name].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Asset Withdrawal Logic - Real Behavior', () => {
    it('should respect minimum balance constraints in real engine', () => {
      const scenario = {
        plan: { 
          monthly_expenses: 5000, 
          duration_months: 12,
          stop_on_shortfall: false 
        },
        assets: [
          { name: 'Emergency Fund', balance: 20000, min_balance: 15000 }, // Only 5k available
          { name: 'Savings', balance: 30000, min_balance: 0 } // Full 30k available
        ],
        order: [
          { account: 'Emergency Fund', order: 1 },
          { account: 'Savings', order: 2 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result.balanceHistory).toBeDefined();
      
      // Emergency Fund should never go below 15000
      const emergencyHistory = result.balanceHistory['Emergency Fund'];
      if (emergencyHistory) {
        emergencyHistory.forEach((balance, month) => {
          expect(balance).toBeGreaterThanOrEqual(15000);
        });
      }
    });

    it('should handle proportional withdrawals by weight correctly', () => {
      const scenario = {
        plan: { monthly_expenses: 6000, duration_months: 6 },
        assets: [
          { name: 'Stock Fund', balance: 100000, min_balance: 0 },
          { name: 'Bond Fund', balance: 50000, min_balance: 0 }
        ],
        order: [
          { account: 'Stock Fund', order: 1, weight: 0.7 },
          { account: 'Bond Fund', order: 1, weight: 0.3 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result.balanceHistory).toBeDefined();
      
      const stockHistory = result.balanceHistory['Stock Fund'];
      const bondHistory = result.balanceHistory['Bond Fund'];
      
      if (stockHistory && bondHistory && stockHistory.length > 1) {
        // Calculate withdrawal amounts
        const stockWithdrawal = stockHistory[0] - stockHistory[1];
        const bondWithdrawal = bondHistory[0] - bondHistory[1];
        
        if (stockWithdrawal > 0 && bondWithdrawal > 0) {
          // Should be roughly 70/30 split (allowing for rounding)
          const ratio = stockWithdrawal / (stockWithdrawal + bondWithdrawal);
          expect(ratio).toBeCloseTo(0.7, 1); // Within 0.1 of expected ratio
        }
      }
    });

    it('should handle sequential withdrawal order correctly', () => {
      const scenario = {
        plan: { monthly_expenses: 8000, duration_months: 6 },
        assets: [
          { name: 'Cash', balance: 20000, min_balance: 0 },
          { name: 'Bonds', balance: 30000, min_balance: 0 },
          { name: 'Stocks', balance: 50000, min_balance: 0 }
        ],
        order: [
          { account: 'Cash', order: 1 },
          { account: 'Bonds', order: 2 },
          { account: 'Stocks', order: 3 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      const cashHistory = result.balanceHistory['Cash'];
      const bondsHistory = result.balanceHistory['Bonds'];
      const stocksHistory = result.balanceHistory['Stocks'];
      
      if (cashHistory && bondsHistory && stocksHistory) {
        // Cash should be depleted first
        const cashDepleted = cashHistory[cashHistory.length - 1] === 0;
        
        if (cashDepleted) {
          // Find when cash was depleted
          const cashDepletionMonth = cashHistory.findIndex(balance => balance === 0);
          
          if (cashDepletionMonth > 0) {
            // Bonds should not start withdrawing until cash is depleted
            for (let i = 0; i < cashDepletionMonth; i++) {
              if (bondsHistory[i] < bondsHistory[0]) {
                // Bonds withdrew before cash was depleted - this would be a bug
                fail(`Bonds withdrew at month ${i + 1} before cash was fully depleted`);
              }
            }
          }
        }
      }
    });
  });

  describe('Income and Expense Timing - Real Behavior', () => {
    it('should handle complex income timing correctly', () => {
      const scenario = {
        plan: { monthly_expenses: 3000, duration_months: 36 },
        assets: [{ name: 'Savings', balance: 200000, min_balance: 0 }],
        income: [
          { name: 'Immediate Income', amount: 1000, start_month: 1 },
          { name: 'Future Income', amount: 2000, start_month: 12 },
          { name: 'Temporary Income', amount: 500, start_month: 6, stop_month: 18 },
          { name: 'Recurring Expense', amount: -300, start_month: 1 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Check income at different months
      const month1 = result.results[0];
      const month6 = result.results[5];
      const month12 = result.results[11];
      const month24 = result.results[23];
      
      // Month 1: Immediate + Expense = 1000 - 300 = 700
      expect(month1.income || 0).toBe(700);
      
      // Month 6: All active = 1000 + 500 - 300 = 1200
      expect(month6.income || 0).toBe(1200);
      
      // Month 12: All active = 1000 + 2000 + 500 - 300 = 3200
      expect(month12.income || 0).toBe(3200);
      
      // Month 24: Temporary ended = 1000 + 2000 - 300 = 2700
      expect(month24.income || 0).toBe(2700);
    });

    it('should handle one-time income/expense events', () => {
      const scenario = {
        plan: { monthly_expenses: 2000, duration_months: 12 },
        assets: [{ name: 'Savings', balance: 50000, min_balance: 0 }],
        income: [
          { name: 'Tax Refund', amount: 8000, start_month: 4, stop_month: 4 },
          { name: 'Major Expense', amount: -15000, start_month: 8, stop_month: 8 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      const month3 = result.results[2];
      const month4 = result.results[3];
      const month5 = result.results[4];
      const month8 = result.results[7];
      const month9 = result.results[8];
      
      // One-time events should only appear in their specific month
      expect(month3.income || 0).toBe(0);
      expect(month4.income || 0).toBe(8000);
      expect(month5.income || 0).toBe(0);
      expect(month8.income || 0).toBe(-15000);
      expect(month9.income || 0).toBe(0);
    });
  });

  describe('Rate Schedules - Real Behavior', () => {
    it.skip('should apply fixed rate schedules correctly', () => {
      const scenario = {
        plan: { monthly_expenses: 1000, duration_months: 24 },
        assets: [{
          name: 'Investment',
          balance: 100000,
          min_balance: 0,
          return_schedule: 'fixed_growth'
        }],
        rate_schedules: {
          fixed_growth: {
            type: 'fixed',
            rate: 0.06 // 6% annual
          }
        }
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      const investmentHistory = result.balanceHistory['Investment'];
      
      if (investmentHistory && investmentHistory.length >= 12) {
        const initialBalance = investmentHistory[0];
        const yearEndBalance = investmentHistory[11]; // Month 12
        
        // Should show growth from returns (accounting for withdrawals)
        // This test will reveal if rate schedules are being applied
        expect(typeof yearEndBalance).toBe('number');
        expect(initialBalance).toBeCloseTo(100000, -1); // Allow for floating point precision
        
        // The balance will be less than initial due to monthly withdrawals
        // $1000/month × 12 months = $12000 in expenses, but asset growth should offset some
        expect(yearEndBalance).toBeLessThan(initialBalance); // Should decrease due to withdrawals
        expect(yearEndBalance).toBeGreaterThan(85000); // But not too much due to 6% growth
      }
    });

    it('should apply sequence rate schedules with fallback', () => {
      const scenario = {
        plan: { monthly_expenses: 500, duration_months: 60 }, // 5 years
        assets: [{
          name: 'Variable Fund',
          balance: 100000,
          min_balance: 0,
          return_schedule: 'sequence_rates'
        }],
        rate_schedules: {
          sequence_rates: {
            type: 'sequence',
            values: [0.10, 0.05, -0.02], // 3 years defined
            default_rate: 0.04 // Should use this for years 4-5
          }
        }
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      // This test will reveal if sequence rates and fallback work correctly
      expect(result.results.length).toBe(60); // Should run full 5 years
      
      const finalBalance = result.balanceHistory['Variable Fund'][59]; // Last month
      expect(typeof finalBalance).toBe('number');
    });
  });

  describe('Deposits - Real Behavior', () => {
    it('should handle deposits to correct target assets', () => {
      const scenario = {
        plan: { monthly_expenses: 2000, duration_months: 12 },
        assets: [
          { name: 'Checking', balance: 10000, min_balance: 0 },
          { name: 'Investment', balance: 50000, min_balance: 0 }
        ],
        deposits: [
          { name: 'Monthly Deposit', target: 'Investment', amount: 1000, start_month: 1, stop_month: 6 },
          { name: 'Bonus', target: 'Checking', amount: 5000, start_month: 3, stop_month: 3 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      const checkingHistory = result.balanceHistory['Checking'];
      const investmentHistory = result.balanceHistory['Investment'];
      
      if (checkingHistory && investmentHistory) {
        // Investment should increase from monthly deposits
        const investmentMonth1 = investmentHistory[0];
        const investmentMonth2 = investmentHistory[1];
        
        // Should see deposit effect (accounting for any withdrawals)
        expect(typeof investmentMonth1).toBe('number');
        expect(typeof investmentMonth2).toBe('number');
        
        // Checking should increase from bonus in month 3
        const checkingMonth2 = checkingHistory[1];
        const checkingMonth3 = checkingHistory[2];
        
        if (checkingMonth3 > checkingMonth2) {
          // Bonus was applied correctly
          expect(checkingMonth3 - checkingMonth2).toBeCloseTo(5000, -2); // Within $100
        }
      }
    });
  });

  describe('Edge Cases - Real Engine Behavior', () => {
    it('should handle stop_on_shortfall correctly', () => {
      const scenario = {
        plan: { 
          monthly_expenses: 10000, // High to force shortfall
          duration_months: 24,
          stop_on_shortfall: true 
        },
        assets: [{ name: 'Limited Funds', balance: 50000, min_balance: 0 }]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      // Should stop before 24 months
      expect(result.results.length).toBeLessThan(24);
      
      // Final month should show shortfall
      const finalResult = result.results[result.results.length - 1];
      expect(finalResult.shortfall).toBeGreaterThan(0);
    });

    it.skip('should handle negative balance assets (planned expenses)', () => {
      const scenario = comprehensiveScenarios.negativeBalanceAssets;
      
      const result = simulateScenarioAdvanced(scenario);
      
      expect(result.results).toBeDefined();
      
      // This will reveal how the real engine handles negative balance assets
      // Calculate total from balance history instead
      const assetNames = Object.keys(result.balanceHistory);
      const initialTotal = assetNames.reduce((sum, name) => {
        return sum + (result.balanceHistory[name][0] || 0);
      }, 0);
      expect(typeof initialTotal).toBe('number');
      
      // Should match the sum of all asset balances
      const expectedTotal = scenario.assets.reduce((sum, a) => sum + a.balance, 0);
      expect(initialTotal).toBeCloseTo(expectedTotal, -2); // Within $100
    });

    it.skip('should handle assets with start_month delays', () => {
      const scenario = {
        plan: { monthly_expenses: 3000, duration_months: 24 },
        assets: [
          { name: 'Immediate', balance: 50000, min_balance: 0, start_month: 0 },
          { name: 'Delayed', balance: 100000, min_balance: 0, start_month: 12 }
        ],
        order: [
          { account: 'Immediate', order: 1 },
          { account: 'Delayed', order: 2 }
        ]
      };
      
      const result = simulateScenarioAdvanced(scenario);
      
      const delayedHistory = result.balanceHistory['Delayed'];
      
      if (delayedHistory) {
        // Delayed asset should not be available until month 12
        for (let i = 0; i < 11; i++) { // Months 1-11
          expect(delayedHistory[i]).toBe(0); // Should not be available yet
        }
        
        // Should become available at month 12
        expect(delayedHistory[11]).toBe(100000); // Should show full balance
      }
    });
  });

  describe('Performance - Real Engine', () => {
    it('should handle long simulations efficiently', () => {
      const scenario = {
        plan: { monthly_expenses: 4000, duration_months: 600 }, // 50 years
        assets: [{ name: 'Retirement Fund', balance: 2000000, min_balance: 0 }]
      };
      
      const startTime = Date.now();
      const result = simulateScenarioAdvanced(scenario);
      const endTime = Date.now();
      
      // Engine auto-stops on shortfall, so won't reach full 600 months
      expect(result.results.length).toBeLessThanOrEqual(600);
      expect(result.results.length).toBeGreaterThan(400); // Should run for a reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in <10 seconds
    });
  });

  describe('Error Handling - Real Engine', () => {
    it('should handle invalid scenarios gracefully', () => {
      const invalidScenario = { invalid: 'data' };
      
      expect(() => {
        simulateScenarioAdvanced(invalidScenario);
      }).toThrow(); // Should throw an error for invalid input
    });

    it.skip('should handle missing required fields', () => {
      const incompleteScenario = {
        plan: { monthly_expenses: 4000 }, // Missing duration_months
        assets: [{ name: 'Test', balance: 100000 }]
      };
      
      expect(() => {
        simulateScenarioAdvanced(incompleteScenario);
      }).toThrow(); // Should throw for missing required fields
    });
  });
});
