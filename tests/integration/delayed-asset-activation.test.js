/**
 * Integration test for delayed asset activation
 * Tests that assets with start_month appear in balance history at the correct time
 */

import { simulateScenarioAdvanced } from '../../scripts/timeaware-engine.js';

describe('Delayed Asset Activation', () => {
  
  test('should activate delayed asset at specified month and show in balance history', () => {
    const scenario = {
      plan: {
        monthly_expenses: 1000,
        duration_months: 60,
        stop_on_shortfall: false, // Ensure simulation runs full duration
        inflation_rate: 0.0
      },
      assets: [
        {
          name: "Primary",
          type: "taxable",
          balance: 100000,
          interest_rate: 0.04
        },
        {
          name: "DelayedAsset",
          type: "tax_free",
          balance: 50000,
          interest_rate: 0.04,
          start_month: 12 // Should activate at month 12
        }
      ],
      order: [
        { account: "Primary", order: 1 },
        { account: "DelayedAsset", order: 2 }
      ],
      income: [],
      rate_schedules: {}
    };

    const result = simulateScenarioAdvanced(scenario);
    
    expect(result).toBeDefined();
    expect(result.balanceHistory).toBeDefined();
    expect(result.balanceHistory.DelayedAsset).toBeDefined();

    const delayedBalances = result.balanceHistory.DelayedAsset;
    
    
    // Should run for full 60 months
    expect(delayedBalances.length).toBe(60);
    
    // Before month 12 (indices 0-10), should be 0
    for (let i = 0; i < 11; i++) {
      expect(delayedBalances[i]).toBe(0);
    }
    
    // At month 12 (index 11) and after, should be > 0 (50000 + growth)
    expect(delayedBalances[11]).toBeGreaterThan(49000);
    expect(delayedBalances[12]).toBeLessThan(51000); // Allow for one month of growth
    
    // Should continue to have balance in subsequent months
    expect(delayedBalances[13]).toBeGreaterThan(0);
    expect(delayedBalances[20]).toBeGreaterThan(0);
  });

  test('should show delayed asset in total assets calculation when activated', () => {
    const scenario = {
      plan: {
        monthly_expenses: 500, // Low expenses to avoid depletion
        duration_months: 30,
        stop_on_shortfall: false,
        inflation_rate: 0.0
      },
      assets: [
        {
          name: "Primary",
          type: "taxable",
          balance: 50000,
          interest_rate: 0.04
        },
        {
          name: "DelayedAsset",
          type: "tax_free",
          balance: 30000,
          interest_rate: 0.04,
          start_month: 15
        }
      ],
      order: [
        { account: "Primary", order: 1 },
        { account: "DelayedAsset", order: 2 }
      ],
      income: [],
      rate_schedules: {}
    };

    const result = simulateScenarioAdvanced(scenario);
    
    // Calculate total assets for each month
    const totalAssets = [];
    for (let month = 0; month < result.results.length; month++) {
      let total = 0;
      Object.keys(result.balanceHistory).forEach(assetName => {
        total += result.balanceHistory[assetName][month] || 0;
      });
      totalAssets.push(total);
    }
    
    // Total assets should jump when DelayedAsset activates at month 15 (index 14)
    const totalBeforeActivation = totalAssets[13]; // Month 14
    const totalAfterActivation = totalAssets[14];  // Month 15
    
    
    // Should see a jump of approximately 30000 (DelayedAsset balance)
    const jump = totalAfterActivation - totalBeforeActivation;
    expect(jump).toBeGreaterThan(25000); // Allow for some growth/withdrawals
    expect(jump).toBeLessThan(35000);
  });

  test('should handle delayed asset activation with auto-stop enabled', () => {
    const scenario = {
      plan: {
        monthly_expenses: 5000, // High expenses to trigger auto-stop
        duration_months: 60,
        stop_on_shortfall: true,
        inflation_rate: 0.0
      },
      assets: [
        {
          name: "Primary",
          type: "taxable",
          balance: 30000,
          interest_rate: 0.04
        },
        {
          name: "DelayedAsset",
          type: "tax_free",
          balance: 50000,
          interest_rate: 0.04,
          start_month: 10 // Should activate before auto-stop
        }
      ],
      order: [
        { account: "Primary", order: 1 },
        { account: "DelayedAsset", order: 2 }
      ],
      income: [],
      rate_schedules: {}
    };

    const result = simulateScenarioAdvanced(scenario);
    
    // Should auto-stop before full duration
    expect(result.results.length).toBeLessThan(60);
    
    // If simulation runs past month 10, DelayedAsset should activate
    if (result.results.length > 10) {
      const delayedBalances = result.balanceHistory.DelayedAsset;
      expect(delayedBalances[10]).toBeGreaterThan(0);
    }
  });
});
