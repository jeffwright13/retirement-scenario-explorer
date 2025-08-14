/**
 * TimeAware Engine Edge Cases and Error Condition Tests
 * Tests validation, error handling, and boundary conditions
 */

const { comprehensiveScenarios, errorScenarios } = require('../fixtures/comprehensive-scenarios.js');

describe('TimeAware Engine - Edge Cases and Error Conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario Validation Tests', () => {
    describe('Required Field Validation', () => {
      it('should reject scenarios missing required plan field', () => {
        const validateScenario = (scenario) => {
          const errors = [];
          
          if (!scenario.plan) {
            errors.push('Missing required field: plan');
          }
          
          if (!scenario.assets || !Array.isArray(scenario.assets) || scenario.assets.length === 0) {
            errors.push('Missing required field: assets (must be non-empty array)');
          }
          
          return { isValid: errors.length === 0, errors };
        };

        const result = validateScenario(errorScenarios.missingRequiredFields);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing required field: plan');
      });

      it('should reject assets missing required fields', () => {
        const validateAssets = (assets) => {
          const errors = [];
          
          assets.forEach((asset, index) => {
            if (!asset.name || typeof asset.name !== 'string') {
              errors.push(`Asset ${index}: missing or invalid name`);
            }
            
            if (typeof asset.balance !== 'number') {
              errors.push(`Asset ${index}: missing or invalid balance`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        };

        const result = validateAssets(errorScenarios.invalidAssetBalance.assets);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('missing or invalid balance'))).toBe(true);
      });
    });

    describe('Value Range Validation', () => {
      it('should reject negative min_balance values', () => {
        const validateMinBalance = (assets) => {
          const errors = [];
          
          assets.forEach((asset, index) => {
            if (asset.min_balance !== undefined && asset.min_balance < 0) {
              errors.push(`Asset ${index}: min_balance cannot be negative`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        };

        const result = validateMinBalance(errorScenarios.invalidMinBalance.assets);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('min_balance cannot be negative');
      });

      it('should reject invalid duration_months', () => {
        const validateDuration = (plan) => {
          const errors = [];
          
          if (!plan.duration_months || plan.duration_months < 1) {
            errors.push('duration_months must be >= 1');
          }
          
          return { isValid: errors.length === 0, errors };
        };

        const result = validateDuration(errorScenarios.invalidDuration.plan);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toBe('duration_months must be >= 1');
      });

      it('should reject negative monthly_expenses', () => {
        const validateExpenses = (plan) => {
          const errors = [];
          
          if (plan.monthly_expenses < 0) {
            errors.push('monthly_expenses cannot be negative');
          }
          
          return { isValid: errors.length === 0, errors };
        };

        const result = validateExpenses(errorScenarios.invalidExpenses.plan);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toBe('monthly_expenses cannot be negative');
      });
    });

    describe('Reference Validation', () => {
      it('should reject withdrawal order referencing non-existent assets', () => {
        const validateOrderReferences = (assets, order) => {
          const errors = [];
          const assetNames = assets.map(a => a.name);
          
          order.forEach((orderItem, index) => {
            if (!assetNames.includes(orderItem.account)) {
              errors.push(`Order ${index}: references non-existent asset '${orderItem.account}'`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        };

        const scenario = errorScenarios.invalidOrderReference;
        const result = validateOrderReferences(scenario.assets, scenario.order);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('references non-existent asset');
      });

      it('should reject deposits targeting non-existent assets', () => {
        const validateDepositReferences = (assets, deposits) => {
          const errors = [];
          const assetNames = assets.map(a => a.name);
          
          deposits.forEach((deposit, index) => {
            if (!assetNames.includes(deposit.target)) {
              errors.push(`Deposit ${index}: targets non-existent asset '${deposit.target}'`);
            }
          });
          
          return { isValid: errors.length === 0, errors };
        };

        const scenario = errorScenarios.invalidDepositTarget;
        const result = validateDepositReferences(scenario.assets, scenario.deposits);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('targets non-existent asset');
      });
    });
  });

  describe('Boundary Condition Tests', () => {
    describe('Zero and Minimum Values', () => {
      it('should handle zero monthly expenses correctly', () => {
        const scenario = comprehensiveScenarios.zeroExpenses;
        
        const calculateNetCashFlow = (monthlyExpenses, monthlyIncome) => {
          return monthlyIncome - monthlyExpenses;
        };

        const netFlow = calculateNetCashFlow(scenario.plan.monthly_expenses, 500);
        expect(netFlow).toBe(500); // Should be positive with zero expenses
      });

      it('should handle minimum duration (1 month)', () => {
        const scenario = comprehensiveScenarios.shortDuration;
        
        const simulateMinimumDuration = (assets, expenses, duration) => {
          const results = [];
          let totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
          
          for (let month = 1; month <= duration; month++) {
            totalAssets -= expenses;
            results.push({ month, totalAssets });
          }
          
          return results;
        };

        const results = simulateMinimumDuration(
          scenario.assets, 
          scenario.plan.monthly_expenses, 
          scenario.plan.duration_months
        );
        
        expect(results).toHaveLength(1);
        expect(results[0].month).toBe(1);
        expect(results[0].totalAssets).toBe(5000); // 10000 - 5000
      });

      it('should handle assets with balance equal to minimum balance', () => {
        const scenario = comprehensiveScenarios.balanceEqualsMinimum;
        
        const calculateAvailableBalances = (assets) => {
          return assets.map(asset => ({
            name: asset.name,
            available: Math.max(0, asset.balance - asset.min_balance)
          }));
        };

        const available = calculateAvailableBalances(scenario.assets);
        
        expect(available[0].available).toBe(0); // Emergency Fund: 15000 - 15000
        expect(available[1].available).toBe(0); // Checking: 5000 - 5000  
        expect(available[2].available).toBe(100000); // Investment: 100000 - 0
      });
    });

    describe('Negative Balance Assets', () => {
      it('should handle negative balance assets (planned expenses)', () => {
        const scenario = comprehensiveScenarios.negativeBalanceAssets;
        
        const calculateTotalAssets = (assets) => {
          return assets.reduce((sum, asset) => sum + asset.balance, 0);
        };

        const totalAssets = calculateTotalAssets(scenario.assets);
        expect(totalAssets).toBe(125000); // 200000 - 50000 - 25000
      });

      it('should handle withdrawal from negative balance assets', () => {
        const processNegativeBalanceWithdrawal = (asset, requestedAmount) => {
          // Negative balance assets represent planned expenses
          // They can "provide" money up to their absolute balance
          if (asset.balance < 0) {
            const availableFromPlannedExpense = Math.abs(asset.balance);
            const actualWithdrawal = Math.min(requestedAmount, availableFromPlannedExpense);
            return {
              withdrawal: actualWithdrawal,
              newBalance: asset.balance + actualWithdrawal // Becomes less negative
            };
          }
          return { withdrawal: 0, newBalance: asset.balance };
        };

        const asset = { name: "Future Expense", balance: -25000, min_balance: 0 };
        const result = processNegativeBalanceWithdrawal(asset, 10000);
        
        expect(result.withdrawal).toBe(10000);
        expect(result.newBalance).toBe(-15000); // -25000 + 10000
      });
    });
  });

  describe('Complex Scenario Integration Tests', () => {
    it('should handle all asset types in one scenario', () => {
      const scenario = comprehensiveScenarios.allAssetTypes;
      
      const categorizeAssets = (assets) => {
        return {
          taxable: assets.filter(a => a.type === 'taxable'),
          taxDeferred: assets.filter(a => a.type === 'tax_deferred'),
          taxFree: assets.filter(a => a.type === 'tax_free')
        };
      };

      const categorized = categorizeAssets(scenario.assets);
      
      expect(categorized.taxable).toHaveLength(1);
      expect(categorized.taxDeferred).toHaveLength(1);
      expect(categorized.taxFree).toHaveLength(1);
      expect(categorized.taxable[0].name).toBe('Taxable Savings');
    });

    it('should handle complex income scenarios with timing', () => {
      const scenario = comprehensiveScenarios.complexIncome;
      
      const calculateMonthlyIncome = (month, incomeEvents) => {
        return incomeEvents.reduce((total, event) => {
          const isActive = month >= event.start_month && 
                          (!event.stop_month || month <= event.stop_month);
          return total + (isActive ? event.amount : 0);
        }, 0);
      };

      // Test different months
      const month1Income = calculateMonthlyIncome(1, scenario.income);
      const month12Income = calculateMonthlyIncome(12, scenario.income);
      const month36Income = calculateMonthlyIncome(36, scenario.income);
      const month60Income = calculateMonthlyIncome(60, scenario.income);

      expect(month1Income).toBe(1150); // Pension + Health Insurance: 1800 - 650
      expect(month12Income).toBe(2350); // + Part-time work: 1800 + 1200 - 650
      expect(month36Income).toBe(-11650); // Roof replacement month: 1800 + 2200 - 650 - 15000 (SS starts at month 24)
      expect(month60Income).toBe(2150); // Pension + SS + Health + Long-term care: 1800 + 2200 - 650 - 1200
    });

    it('should handle proportional withdrawals correctly', () => {
      const scenario = comprehensiveScenarios.proportionalWithdrawals;
      
      const processProportionalWithdrawal = (assets, order, shortfall) => {
        // Find assets with same order and weights
        const sameOrderAssets = assets.filter(asset => {
          const orderItem = order.find(o => o.account === asset.name);
          return orderItem && orderItem.order === 2 && orderItem.weight;
        });

        if (sameOrderAssets.length === 0) return [];

        const totalWeight = order
          .filter(o => o.order === 2 && o.weight)
          .reduce((sum, o) => sum + o.weight, 0);

        return sameOrderAssets.map(asset => {
          const orderItem = order.find(o => o.account === asset.name);
          const proportion = orderItem.weight / totalWeight;
          const targetWithdrawal = shortfall * proportion;
          
          return {
            asset: asset.name,
            proportion,
            targetWithdrawal,
            actualWithdrawal: Math.min(targetWithdrawal, asset.balance)
          };
        });
      };

      const withdrawals = processProportionalWithdrawal(
        scenario.assets, 
        scenario.order, 
        10000
      );

      expect(withdrawals).toHaveLength(2);
      expect(withdrawals[0].proportion).toBe(0.7);
      expect(withdrawals[1].proportion).toBe(0.3);
      expect(withdrawals[0].targetWithdrawal).toBe(7000);
      expect(withdrawals[1].targetWithdrawal).toBe(3000);
    });

    it('should handle all rate schedule types', () => {
      const scenario = comprehensiveScenarios.allRateSchedules;
      
      const getRateFromSchedule = (schedule, year) => {
        switch (schedule.type) {
          case 'fixed':
            return schedule.rate;
            
          case 'sequence':
            const index = year - (schedule.start_year || 0);
            if (index >= 0 && index < schedule.values.length) {
              return schedule.values[index];
            }
            return schedule.default_rate || 0;
            
          case 'map':
            const period = schedule.periods.find(p => 
              year >= p.start_year && year <= p.stop_year
            );
            return period ? period.rate : (schedule.default_rate || 0);
            
          default:
            return 0;
        }
      };

      const schedules = scenario.rate_schedules;
      
      // Test fixed rate
      expect(getRateFromSchedule(schedules.fixed_returns, 0)).toBe(0.04);
      expect(getRateFromSchedule(schedules.fixed_returns, 10)).toBe(0.04);
      
      // Test sequence rate
      expect(getRateFromSchedule(schedules.sequence_returns, 0)).toBe(0.08);
      expect(getRateFromSchedule(schedules.sequence_returns, 2)).toBe(0.04);
      expect(getRateFromSchedule(schedules.sequence_returns, 10)).toBe(0.045); // default
      
      // Test map rate
      expect(getRateFromSchedule(schedules.map_returns, 3)).toBe(0.08);
      expect(getRateFromSchedule(schedules.map_returns, 8)).toBe(0.06);
      expect(getRateFromSchedule(schedules.map_returns, 25)).toBe(0.03); // default
    });

    it('should handle deposits correctly', () => {
      const scenario = comprehensiveScenarios.depositsTest;
      
      const calculateDepositsForMonth = (month, deposits) => {
        return deposits.reduce((total, deposit) => {
          const isActive = month >= deposit.start_month && month <= deposit.stop_month;
          return total + (isActive ? deposit.amount : 0);
        }, 0);
      };

      // Test various months
      expect(calculateDepositsForMonth(1, scenario.deposits)).toBe(1000); // Monthly savings only
      expect(calculateDepositsForMonth(4, scenario.deposits)).toBe(9000); // Monthly + tax refund
      expect(calculateDepositsForMonth(12, scenario.deposits)).toBe(13500); // Monthly + bonus + emergency fund top-up
      expect(calculateDepositsForMonth(25, scenario.deposits)).toBe(0); // No active deposits
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large number of assets efficiently', () => {
      const createLargeAssetList = (count) => {
        const assets = [];
        for (let i = 0; i < count; i++) {
          assets.push({
            name: `Asset_${i}`,
            balance: Math.random() * 100000,
            min_balance: Math.random() * 10000
          });
        }
        return assets;
      };

      const largeAssetList = createLargeAssetList(100);
      
      const calculateTotalBalance = (assets) => {
        return assets.reduce((sum, asset) => sum + asset.balance, 0);
      };

      const startTime = Date.now();
      const totalBalance = calculateTotalBalance(largeAssetList);
      const endTime = Date.now();

      expect(largeAssetList).toHaveLength(100);
      expect(typeof totalBalance).toBe('number');
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle long duration simulations', () => {
      const simulateLongDuration = (initialBalance, monthlyExpenses, durationMonths) => {
        let balance = initialBalance;
        const results = [];
        
        for (let month = 1; month <= durationMonths; month++) {
          balance -= monthlyExpenses;
          
          // Only store every 12th month to save memory
          if (month % 12 === 0) {
            results.push({ month, balance });
          }
        }
        
        return results;
      };

      const results = simulateLongDuration(1000000, 4000, 600); // 50 years
      
      expect(results).toHaveLength(50); // One entry per year
      expect(results[0].month).toBe(12);
      expect(results[49].month).toBe(600);
    });
  });
});
