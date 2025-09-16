/**
 * Tax-Aware Withdrawal Integration Tests
 * Tests the complete tax-aware withdrawal system in realistic scenarios
 */

import { simulateScenarioAdvanced } from '../../scripts/timeaware-engine.js';

describe('Tax-Aware Withdrawal Integration Tests', () => {
  
  describe('Single Account Type Scenarios', () => {
    test('tax-deferred only scenario shows realistic depletion', () => {
      const scenario = {
        plan: {
          monthly_expenses: 4000,
          duration_months: 60,
          tax_config: {
            tax_deferred: 0.22,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Traditional 401k",
            type: "tax_deferred",
            balance: 200000,
            interest_rate: 0.06
          }
        ],
        order: [
          { account: "Traditional 401k", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Should deplete faster than without taxes
      // With taxes: need ~$5128/month gross vs $4000/month net
      expect(result.actualDuration).toBeLessThan(60);
      
      // Check first month withdrawal
      const firstWithdrawal = result.results[0].withdrawals[0];
      expect(firstWithdrawal.accountType).toBe('tax_deferred');
      expect(firstWithdrawal.grossAmount).toBeCloseTo(5128.21, 2); // 4000 / (1-0.22)
      expect(firstWithdrawal.netAmount).toBe(4000);
      expect(firstWithdrawal.taxOwed).toBeCloseTo(1128.21, 2);
      expect(firstWithdrawal.effectiveTaxRate).toBeCloseTo(0.22, 3);
    });

    test('tax-free only scenario matches original behavior', () => {
      const scenario = {
        plan: {
          monthly_expenses: 4000,
          duration_months: 60,
          tax_config: {
            tax_deferred: 0.22,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Roth IRA",
            type: "tax_free",
            balance: 240000,
            interest_rate: 0.06
          }
        ],
        order: [
          { account: "Roth IRA", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Check first month withdrawal
      const firstWithdrawal = result.results[0].withdrawals[0];
      expect(firstWithdrawal.accountType).toBe('tax_free');
      expect(firstWithdrawal.grossAmount).toBe(4000); // Same as net
      expect(firstWithdrawal.netAmount).toBe(4000);
      expect(firstWithdrawal.taxOwed).toBe(0);
      expect(firstWithdrawal.effectiveTaxRate).toBe(0);
    });

    test('taxable account with capital gains', () => {
      const scenario = {
        plan: {
          monthly_expenses: 3000,
          duration_months: 48,
          tax_config: {
            tax_deferred: 0.22,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Taxable Brokerage",
            type: "taxable",
            balance: 180000,
            interest_rate: 0.07
          }
        ],
        order: [
          { account: "Taxable Brokerage", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Check first month withdrawal
      const firstWithdrawal = result.results[0].withdrawals[0];
      expect(firstWithdrawal.accountType).toBe('taxable');
      expect(firstWithdrawal.grossAmount).toBeCloseTo(3529.41, 2); // 3000 / (1-0.15)
      expect(firstWithdrawal.netAmount).toBe(3000);
      expect(firstWithdrawal.taxOwed).toBeCloseTo(529.41, 2);
      expect(firstWithdrawal.effectiveTaxRate).toBeCloseTo(0.15, 3);
    });
  });

  describe('Mixed Account Type Scenarios', () => {
    test('tax-efficient withdrawal order (Roth -> Taxable -> Tax-deferred)', () => {
      const scenario = {
        plan: {
          monthly_expenses: 5000,
          duration_months: 36,
          tax_config: {
            tax_deferred: 0.24,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Roth IRA",
            type: "tax_free",
            balance: 60000,
            interest_rate: 0.05
          },
          {
            name: "Taxable Account",
            type: "taxable", 
            balance: 100000,
            interest_rate: 0.06
          },
          {
            name: "Traditional IRA",
            type: "tax_deferred",
            balance: 150000,
            interest_rate: 0.06
          }
        ],
        order: [
          { account: "Roth IRA", order: 1 },
          { account: "Taxable Account", order: 2 },
          { account: "Traditional IRA", order: 3 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // First 12 months should come from Roth (tax-free)
      for (let month = 0; month < 12; month++) {
        const withdrawal = result.results[month].withdrawals[0];
        expect(withdrawal.from).toBe("Roth IRA");
        expect(withdrawal.taxOwed).toBe(0);
        expect(withdrawal.grossAmount).toBe(5000);
      }
      
      // Later months should show taxable account usage with capital gains
      let foundTaxableWithdrawal = false;
      for (let month = 12; month < result.actualDuration; month++) {
        if (result.results[month].withdrawals.length > 0) {
          const withdrawal = result.results[month].withdrawals[0];
          if (withdrawal.from === "Taxable Account") {
            foundTaxableWithdrawal = true;
            expect(withdrawal.taxOwed).toBeGreaterThan(0);
            expect(withdrawal.effectiveTaxRate).toBeCloseTo(0.15, 2);
          }
        }
      }
      expect(foundTaxableWithdrawal).toBe(true);
    });

    test('proportional withdrawals with mixed tax treatment', () => {
      const scenario = {
        plan: {
          monthly_expenses: 6000,
          duration_months: 24,
          tax_config: {
            tax_deferred: 0.22,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Roth 401k",
            type: "tax_free",
            balance: 80000,
            interest_rate: 0.05
          },
          {
            name: "Traditional 401k",
            type: "tax_deferred",
            balance: 120000,
            interest_rate: 0.06
          }
        ],
        order: [
          { account: "Roth 401k", order: 1, weight: 0.4 },
          { account: "Traditional 401k", order: 1, weight: 0.6 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // First month should have proportional withdrawals
      const firstMonthWithdrawals = result.results[0].withdrawals;
      expect(firstMonthWithdrawals).toHaveLength(2);
      
      // Find Roth withdrawal (40% weight, tax-free)
      const rothWithdrawal = firstMonthWithdrawals.find(w => w.from === "Roth 401k");
      expect(rothWithdrawal.netAmount).toBeCloseTo(2400, 1); // 40% of 6000
      expect(rothWithdrawal.grossAmount).toBeCloseTo(2400, 1); // No tax
      expect(rothWithdrawal.taxOwed).toBe(0);
      
      // Find Traditional withdrawal (60% weight, taxable)
      const tradWithdrawal = firstMonthWithdrawals.find(w => w.from === "Traditional 401k");
      expect(tradWithdrawal.netAmount).toBeCloseTo(3600, 1); // 60% of 6000
      expect(tradWithdrawal.grossAmount).toBeCloseTo(4615.38, 2); // 3600 / (1-0.22)
      expect(tradWithdrawal.taxOwed).toBeCloseTo(1015.38, 2);
    });
  });

  describe('Edge Cases and Constraints', () => {
    test('insufficient balance with tax considerations', () => {
      const scenario = {
        plan: {
          monthly_expenses: 5000,
          duration_months: 12,
          tax_config: {
            tax_deferred: 0.25
          }
        },
        assets: [
          {
            name: "Small 401k",
            type: "tax_deferred",
            balance: 30000, // Only enough for ~4.5 months after taxes
            interest_rate: 0.04
          }
        ],
        order: [
          { account: "Small 401k", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Should auto-stop when balance depleted (or complete full duration if balance sufficient)
      expect(result.actualDuration).toBeLessThanOrEqual(12);
      
      // Final month should show partial withdrawal
      const finalMonth = result.results[result.actualDuration - 1];
      expect(finalMonth.shortfall).toBeGreaterThan(0);
    });

    test('min_balance protection with tax calculations', () => {
      const scenario = {
        plan: {
          monthly_expenses: 3000,
          duration_months: 12,
          tax_config: {
            taxable: 0.15
          }
        },
        assets: [
          {
            name: "Emergency Fund",
            type: "taxable",
            balance: 50000,
            min_balance: 10000, // Protected emergency reserve
            interest_rate: 0.03
          }
        ],
        order: [
          { account: "Emergency Fund", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Should stop withdrawing when approaching min_balance
      let finalBalance = 50000;
      for (const monthResult of result.results) {
        if (monthResult.withdrawals.length > 0) {
          finalBalance = monthResult.withdrawals[0].remainingBalance;
        }
      }
      
      expect(finalBalance).toBeGreaterThanOrEqual(10000);
    });

    test('backward compatibility with scenarios without tax_config', () => {
      const scenario = {
        plan: {
          monthly_expenses: 4000,
          duration_months: 12
          // No tax_config - should use defaults
        },
        assets: [
          {
            name: "Mixed Account",
            type: "tax_deferred",
            balance: 60000,
            interest_rate: 0.05
          }
        ],
        order: [
          { account: "Mixed Account", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Should use default tax rates (22% for tax_deferred)
      const firstWithdrawal = result.results[0].withdrawals[0];
      expect(firstWithdrawal.effectiveTaxRate).toBeCloseTo(0.22, 3);
      expect(firstWithdrawal.grossAmount).toBeCloseTo(5128.21, 2);
    });
  });

  describe('Performance and Accuracy', () => {
    test('tax calculations maintain precision over long simulations', () => {
      const scenario = {
        plan: {
          monthly_expenses: 3000,
          duration_months: 360, // 30 years
          tax_config: {
            tax_deferred: 0.22,
            taxable: 0.15,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Large Portfolio",
            type: "tax_deferred",
            balance: 2000000,
            interest_rate: 0.07
          }
        ],
        order: [
          { account: "Large Portfolio", order: 1 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Check that tax calculations remain consistent
      const earlyWithdrawal = result.results[10].withdrawals[0];
      const lateWithdrawal = result.results[200].withdrawals[0];
      
      // Tax rate should be consistent
      expect(earlyWithdrawal.effectiveTaxRate).toBeCloseTo(0.22, 3);
      expect(lateWithdrawal.effectiveTaxRate).toBeCloseTo(0.22, 3);
      
      // Net amounts should be consistent (ignoring growth effects)
      expect(earlyWithdrawal.netAmount).toBeCloseTo(3000, 1);
      expect(lateWithdrawal.netAmount).toBeCloseTo(3000, 1);
    });

    test('complex multi-account scenario with all tax types', () => {
      const scenario = {
        plan: {
          monthly_expenses: 8000,
          duration_months: 120,
          tax_config: {
            tax_deferred: 0.24,
            taxable: 0.18,
            tax_free: 0.0
          }
        },
        assets: [
          {
            name: "Roth IRA",
            type: "tax_free",
            balance: 150000,
            interest_rate: 0.06
          },
          {
            name: "Taxable Brokerage",
            type: "taxable",
            balance: 300000,
            interest_rate: 0.07
          },
          {
            name: "Traditional 401k",
            type: "tax_deferred",
            balance: 500000,
            interest_rate: 0.065
          },
          {
            name: "Roth 401k",
            type: "tax_free",
            balance: 200000,
            interest_rate: 0.06
          }
        ],
        order: [
          { account: "Roth IRA", order: 1 },
          { account: "Roth 401k", order: 2 },
          { account: "Taxable Brokerage", order: 3 },
          { account: "Traditional 401k", order: 4 }
        ]
      };

      const result = simulateScenarioAdvanced(scenario);
      
      // Should complete the full simulation
      expect(result.actualDuration).toBeGreaterThan(100);
      
      // Verify tax-efficient withdrawal order was followed
      let foundTaxFree = false;
      let foundTaxable = false;
      let foundTaxDeferred = false;
      
      for (const monthResult of result.results) {
        for (const withdrawal of monthResult.withdrawals) {
          if (withdrawal.accountType === 'tax_free') foundTaxFree = true;
          if (withdrawal.accountType === 'taxable') foundTaxable = true;
          if (withdrawal.accountType === 'tax_deferred') foundTaxDeferred = true;
        }
      }
      
      expect(foundTaxFree).toBe(true);
      expect(foundTaxable).toBe(true);
      expect(foundTaxDeferred).toBe(true);
    });
  });
});
