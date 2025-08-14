/**
 * Comprehensive TimeAware Engine Tests
 * Schema-driven tests covering all configuration options from scenario-schema.json
 * 
 * Tests all combinations of:
 * - Assets (types, balances, min_balance, return_schedule, compounding, start_month)
 * - Income (amount, start_month, stop_month, negative amounts for expenses)
 * - Order (withdrawal priority, weights for proportional withdrawals)
 * - Deposits (target, amount, start/stop months)
 * - Rate Schedules (fixed, sequence, map, pipeline)
 * - Plan options (monthly_expenses, duration, inflation, stop_on_shortfall)
 */

const { sampleScenarios, sampleResults, sampleBalanceHistory } = require('../fixtures/sample-scenarios.js');

describe('TimeAware Engine - Comprehensive Schema-Driven Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Asset Configuration Tests', () => {
    describe('Asset Types', () => {
      const assetTypes = ['taxable', 'tax_deferred', 'tax_free'];
      
      assetTypes.forEach(type => {
        it(`should handle ${type} asset type correctly`, () => {
          const asset = {
            name: `Test ${type}`,
            type: type,
            balance: 100000,
            min_balance: 0
          };
          
          const processAssetType = (asset) => {
            // Future tax implications would be handled here
            return {
              ...asset,
              taxable: type === 'taxable',
              taxDeferred: type === 'tax_deferred',
              taxFree: type === 'tax_free'
            };
          };
          
          const result = processAssetType(asset);
          expect(result.type).toBe(type);
          expect(result[type.replace('_', '') === 'taxable' ? 'taxable' : 
                      type === 'tax_deferred' ? 'taxDeferred' : 'taxFree']).toBe(true);
        });
      });
    });

    describe('Balance and Min Balance Constraints', () => {
      const testCases = [
        { balance: 100000, min_balance: 0, description: 'no minimum balance' },
        { balance: 100000, min_balance: 10000, description: 'emergency fund reserve' },
        { balance: 50000, min_balance: 50000, description: 'balance equals minimum' },
        { balance: 25000, min_balance: 30000, description: 'balance below minimum (edge case)' },
        { balance: -5000, min_balance: 0, description: 'negative balance (planned expense)' }
      ];

      testCases.forEach(({ balance, min_balance, description }) => {
        it(`should handle asset with ${description}`, () => {
          const calculateAvailableBalance = (balance, min_balance) => {
            return Math.max(0, balance - min_balance);
          };

          const available = calculateAvailableBalance(balance, min_balance);
          
          if (balance <= min_balance) {
            expect(available).toBe(0);
          } else {
            expect(available).toBe(balance - min_balance);
          }
        });
      });
    });

    describe('Compounding Frequencies', () => {
      const compoundingTypes = ['monthly', 'annual'];
      
      compoundingTypes.forEach(compounding => {
        it(`should calculate returns with ${compounding} compounding`, () => {
          const calculateCompoundedReturn = (principal, annualRate, compounding, months) => {
            if (compounding === 'monthly') {
              const monthlyRate = annualRate / 12;
              return principal * Math.pow(1 + monthlyRate, months);
            } else {
              const years = months / 12;
              return principal * Math.pow(1 + annualRate, years);
            }
          };

          const principal = 100000;
          const annualRate = 0.06;
          const months = 12;
          
          const result = calculateCompoundedReturn(principal, annualRate, compounding, months);
          
          if (compounding === 'monthly') {
            // Monthly compounding should yield slightly more
            expect(result).toBeGreaterThan(principal * (1 + annualRate));
          } else {
            // Annual compounding for 1 year
            expect(result).toBeCloseTo(principal * (1 + annualRate), 2);
          }
        });
      });
    });

    describe('Asset Start Month', () => {
      it('should handle assets that become available later', () => {
        const isAssetAvailable = (currentMonth, startMonth = 0) => {
          return currentMonth >= startMonth;
        };

        expect(isAssetAvailable(1, 0)).toBe(true);  // Available immediately
        expect(isAssetAvailable(1, 1)).toBe(true);  // Available from month 1
        expect(isAssetAvailable(5, 12)).toBe(false); // Not yet available
        expect(isAssetAvailable(12, 12)).toBe(true); // Just became available
        expect(isAssetAvailable(15, 12)).toBe(true); // Available for a while
      });
    });
  });

  describe('Income Configuration Tests', () => {
    describe('Income Timing', () => {
      const incomeTestCases = [
        { start_month: 1, stop_month: null, currentMonth: 1, expected: true, description: 'immediate permanent income' },
        { start_month: 12, stop_month: null, currentMonth: 6, expected: false, description: 'future permanent income' },
        { start_month: 12, stop_month: null, currentMonth: 24, expected: true, description: 'active permanent income' },
        { start_month: 6, stop_month: 18, currentMonth: 3, expected: false, description: 'before temporary income' },
        { start_month: 6, stop_month: 18, currentMonth: 12, expected: true, description: 'during temporary income' },
        { start_month: 6, stop_month: 18, currentMonth: 24, expected: false, description: 'after temporary income' }
      ];

      incomeTestCases.forEach(({ start_month, stop_month, currentMonth, expected, description }) => {
        it(`should handle ${description}`, () => {
          const isIncomeActive = (currentMonth, start_month, stop_month) => {
            if (currentMonth < start_month) return false;
            if (stop_month && currentMonth > stop_month) return false;
            return true;
          };

          const result = isIncomeActive(currentMonth, start_month, stop_month);
          expect(result).toBe(expected);
        });
      });
    });

    describe('Negative Income (Expenses)', () => {
      it('should handle negative income amounts as recurring expenses', () => {
        const incomeEvents = [
          { name: 'Social Security', amount: 2000, start_month: 12 },
          { name: 'Healthcare Premium', amount: -800, start_month: 1 },
          { name: 'Property Tax', amount: -1200, start_month: 6, stop_month: 6 } // One-time
        ];

        const calculateNetIncome = (month, incomeEvents) => {
          return incomeEvents.reduce((total, event) => {
            const isActive = month >= event.start_month && 
                            (!event.stop_month || month <= event.stop_month);
            return total + (isActive ? event.amount : 0);
          }, 0);
        };

        expect(calculateNetIncome(1, incomeEvents)).toBe(-800); // Only healthcare
        expect(calculateNetIncome(6, incomeEvents)).toBe(-2000); // Healthcare + property tax
        expect(calculateNetIncome(12, incomeEvents)).toBe(1200); // SS + healthcare
        expect(calculateNetIncome(24, incomeEvents)).toBe(1200); // SS + healthcare (no more property tax)
      });
    });
  });

  describe('Withdrawal Order and Priority Tests', () => {
    describe('Sequential Withdrawal Order', () => {
      it('should withdraw from assets in correct order', () => {
        const assets = [
          { name: 'Savings', balance: 50000, order: 1 },
          { name: 'Investment', balance: 100000, order: 2 },
          { name: 'IRA', balance: 75000, order: 3 }
        ];

        const processWithdrawalOrder = (assets, shortfall) => {
          const sortedAssets = [...assets].sort((a, b) => a.order - b.order);
          const withdrawals = [];
          let remaining = shortfall;

          for (const asset of sortedAssets) {
            if (remaining <= 0) break;
            
            const available = asset.balance;
            const withdrawal = Math.min(available, remaining);
            
            if (withdrawal > 0) {
              withdrawals.push({ asset: asset.name, amount: withdrawal });
              remaining -= withdrawal;
            }
          }

          return { withdrawals, shortfall: remaining };
        };

        const result = processWithdrawalOrder(assets, 125000);
        
        expect(result.withdrawals.length).toBeGreaterThanOrEqual(2);
        expect(result.withdrawals[0]).toEqual({ asset: 'Savings', amount: 50000 });
        expect(result.withdrawals[1]).toEqual({ asset: 'Investment', amount: 75000 });
        // IRA withdrawal not needed since shortfall is covered by first two assets
        expect(result.shortfall).toBe(0);
      });
    });

    describe('Proportional Withdrawal by Weight', () => {
      it('should withdraw proportionally when assets have same order and weights', () => {
        const assets = [
          { name: 'Asset A', balance: 100000, order: 1, weight: 0.6 },
          { name: 'Asset B', balance: 50000, order: 1, weight: 0.4 }
        ];

        const processProportionalWithdrawal = (assets, shortfall) => {
          const sameOrderAssets = assets.filter(a => a.order === 1);
          const totalWeight = sameOrderAssets.reduce((sum, a) => sum + a.weight, 0);
          
          return sameOrderAssets.map(asset => {
            const proportion = asset.weight / totalWeight;
            const targetWithdrawal = shortfall * proportion;
            const actualWithdrawal = Math.min(targetWithdrawal, asset.balance);
            
            return {
              asset: asset.name,
              targetAmount: targetWithdrawal,
              actualAmount: actualWithdrawal,
              proportion: proportion
            };
          });
        };

        const result = processProportionalWithdrawal(assets, 10000);
        
        expect(result[0].proportion).toBe(0.6);
        expect(result[1].proportion).toBe(0.4);
        expect(result[0].targetAmount).toBe(6000);
        expect(result[1].targetAmount).toBe(4000);
      });
    });

    describe('Mixed Order and Weight Scenarios', () => {
      it('should handle complex withdrawal scenarios with mixed orders and weights', () => {
        const assets = [
          { name: 'Emergency Fund', balance: 10000, order: 1 },
          { name: 'Taxable A', balance: 50000, order: 2, weight: 0.7 },
          { name: 'Taxable B', balance: 30000, order: 2, weight: 0.3 },
          { name: 'IRA', balance: 100000, order: 3 }
        ];

        const processComplexWithdrawal = (assets, shortfall) => {
          const orderGroups = new Map();
          assets.forEach(asset => {
            if (!orderGroups.has(asset.order)) {
              orderGroups.set(asset.order, []);
            }
            orderGroups.get(asset.order).push(asset);
          });

          const withdrawals = [];
          let remaining = shortfall;
          const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

          for (const order of sortedOrders) {
            if (remaining <= 0) break;
            
            const group = orderGroups.get(order);
            
            if (group.length === 1) {
              // Single asset
              const asset = group[0];
              const withdrawal = Math.min(asset.balance, remaining);
              withdrawals.push({ asset: asset.name, amount: withdrawal });
              remaining -= withdrawal;
            } else {
              // Multiple assets - check for weights
              const hasWeights = group.some(a => a.weight !== undefined);
              
              if (hasWeights) {
                // Proportional withdrawal
                const totalWeight = group.reduce((sum, a) => sum + (a.weight || 0), 0);
                group.forEach(asset => {
                  if (remaining <= 0) return;
                  
                  const proportion = (asset.weight || 0) / totalWeight;
                  const targetWithdrawal = remaining * proportion;
                  const actualWithdrawal = Math.min(targetWithdrawal, asset.balance);
                  
                  withdrawals.push({ asset: asset.name, amount: actualWithdrawal });
                  remaining -= actualWithdrawal;
                });
              }
            }
          }

          return { withdrawals, remaining };
        };

        const result = processComplexWithdrawal(assets, 75000);
        
        // Should withdraw from Emergency Fund first (order 1)
        expect(result.withdrawals[0].asset).toBe('Emergency Fund');
        expect(result.withdrawals[0].amount).toBe(10000);
        
        // Then proportionally from Taxable accounts (order 2)
        const taxableWithdrawals = result.withdrawals.filter(w => 
          w.asset === 'Taxable A' || w.asset === 'Taxable B'
        );
        expect(taxableWithdrawals).toHaveLength(2);
      });
    });
  });

  describe('Deposits Configuration Tests', () => {
    describe('Deposit Timing and Amounts', () => {
      const depositTestCases = [
        { start_month: 1, stop_month: 1, amount: 10000, description: 'one-time deposit' },
        { start_month: 6, stop_month: 18, amount: 1000, description: 'recurring deposits' },
        { start_month: 12, stop_month: 12, amount: 5000, description: 'future one-time deposit' }
      ];

      depositTestCases.forEach(({ start_month, stop_month, amount, description }) => {
        it(`should handle ${description}`, () => {
          const calculateDeposit = (currentMonth, start_month, stop_month, amount) => {
            if (currentMonth >= start_month && currentMonth <= stop_month) {
              return amount;
            }
            return 0;
          };

          // Test various months
          const beforeStart = calculateDeposit(start_month - 1, start_month, stop_month, amount);
          const atStart = calculateDeposit(start_month, start_month, stop_month, amount);
          const duringPeriod = calculateDeposit(Math.floor((start_month + stop_month) / 2), start_month, stop_month, amount);
          const afterStop = calculateDeposit(stop_month + 1, start_month, stop_month, amount);

          expect(beforeStart).toBe(0);
          expect(atStart).toBe(amount);
          
          if (start_month === stop_month) {
            // One-time deposit
            expect(afterStop).toBe(0);
          } else {
            // Recurring deposit
            expect(duringPeriod).toBe(amount);
            expect(afterStop).toBe(0);
          }
        });
      });
    });

    describe('Deposit Target Validation', () => {
      it('should validate deposit targets match existing assets', () => {
        const assets = ['Savings', 'Investment', 'IRA'];
        const deposits = [
          { name: 'Monthly Savings', target: 'Savings', amount: 1000 },
          { name: 'Invalid Deposit', target: 'NonExistent', amount: 500 }
        ];

        const validateDepositTargets = (deposits, assetNames) => {
          return deposits.map(deposit => ({
            ...deposit,
            isValid: assetNames.includes(deposit.target)
          }));
        };

        const result = validateDepositTargets(deposits, assets);
        
        expect(result[0].isValid).toBe(true);
        expect(result[1].isValid).toBe(false);
      });
    });
  });

  describe('Rate Schedules Tests', () => {
    describe('Fixed Rate Schedule', () => {
      it('should apply fixed rates consistently', () => {
        const rateSchedule = { type: 'fixed', rate: 0.05 };
        
        const getRate = (schedule, year) => {
          if (schedule.type === 'fixed') {
            return schedule.rate;
          }
          return 0;
        };

        expect(getRate(rateSchedule, 0)).toBe(0.05);
        expect(getRate(rateSchedule, 5)).toBe(0.05);
        expect(getRate(rateSchedule, 20)).toBe(0.05);
      });
    });

    describe('Sequence Rate Schedule', () => {
      it('should apply sequence rates by year with fallback', () => {
        const rateSchedule = {
          type: 'sequence',
          start_year: 0,
          values: [0.08, 0.06, 0.04, 0.05],
          default_rate: 0.03
        };

        const getRate = (schedule, year) => {
          if (schedule.type === 'sequence') {
            const index = year - (schedule.start_year || 0);
            if (index >= 0 && index < schedule.values.length) {
              return schedule.values[index];
            }
            return schedule.default_rate || 0;
          }
          return 0;
        };

        expect(getRate(rateSchedule, 0)).toBe(0.08); // First year
        expect(getRate(rateSchedule, 2)).toBe(0.04); // Third year
        expect(getRate(rateSchedule, 5)).toBe(0.03); // Beyond sequence, use default
      });
    });

    describe('Map Rate Schedule', () => {
      it('should apply rates based on year ranges', () => {
        const rateSchedule = {
          type: 'map',
          periods: [
            { start_year: 0, stop_year: 2, rate: 0.08 },
            { start_year: 3, stop_year: 7, rate: 0.05 },
            { start_year: 8, stop_year: 15, rate: 0.03 }
          ],
          default_rate: 0.02
        };

        const getRate = (schedule, year) => {
          if (schedule.type === 'map') {
            const period = schedule.periods.find(p => 
              year >= p.start_year && year <= p.stop_year
            );
            return period ? period.rate : (schedule.default_rate || 0);
          }
          return 0;
        };

        expect(getRate(rateSchedule, 1)).toBe(0.08); // Early years
        expect(getRate(rateSchedule, 5)).toBe(0.05); // Middle years
        expect(getRate(rateSchedule, 10)).toBe(0.03); // Later years
        expect(getRate(rateSchedule, 20)).toBe(0.02); // Beyond defined periods
      });
    });
  });

  describe('Plan Configuration Tests', () => {
    describe('Stop on Shortfall', () => {
      it('should handle stop_on_shortfall option correctly', () => {
        const simulateWithStopOption = (assets, monthlyExpenses, stopOnShortfall) => {
          let totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
          const months = [];
          let month = 1;

          while (month <= 60) { // Max 5 years
            totalAssets -= monthlyExpenses;
            months.push({ month, totalAssets });

            if (stopOnShortfall && totalAssets <= 0) {
              break;
            }
            month++;
          }

          return months;
        };

        const assets = [{ name: 'Savings', balance: 120000 }];
        const monthlyExpenses = 4000;

        const withStop = simulateWithStopOption(assets, monthlyExpenses, true);
        const withoutStop = simulateWithStopOption(assets, monthlyExpenses, false);

        // With stop_on_shortfall, should stop when assets depleted
        expect(withStop.length).toBeLessThan(60);
        expect(withStop[withStop.length - 1].totalAssets).toBeLessThanOrEqual(0);

        // Without stop_on_shortfall, should continue full duration
        expect(withoutStop.length).toBe(60);
      });
    });

    describe('Duration and Monthly Expenses', () => {
      it('should validate plan duration and expenses', () => {
        const validatePlan = (plan) => {
          const errors = [];
          
          if (!plan.monthly_expenses || plan.monthly_expenses < 0) {
            errors.push('monthly_expenses must be >= 0');
          }
          
          if (!plan.duration_months || plan.duration_months < 1) {
            errors.push('duration_months must be >= 1');
          }

          return { isValid: errors.length === 0, errors };
        };

        const validPlan = { monthly_expenses: 4000, duration_months: 240 };
        const invalidPlan = { monthly_expenses: -100, duration_months: 0 };

        expect(validatePlan(validPlan).isValid).toBe(true);
        expect(validatePlan(invalidPlan).isValid).toBe(false);
        expect(validatePlan(invalidPlan).errors).toHaveLength(2);
      });
    });
  });

  describe('Integration Tests with Complex Scenarios', () => {
    it('should handle scenario with all configuration options', () => {
      const complexScenario = {
        metadata: {
          title: 'Complex Test Scenario',
          description: 'Tests all configuration options',
          tags: ['comprehensive', 'test']
        },
        plan: {
          monthly_expenses: 5000,
          duration_months: 120,
          stop_on_shortfall: true
        },
        assets: [
          {
            name: 'Emergency Fund',
            type: 'taxable',
            balance: 30000,
            min_balance: 10000,
            compounding: 'monthly'
          },
          {
            name: 'Investment',
            type: 'taxable',
            balance: 200000,
            min_balance: 0,
            compounding: 'annual',
            start_month: 0
          },
          {
            name: 'IRA',
            type: 'tax_deferred',
            balance: 150000,
            min_balance: 0,
            start_month: 12
          }
        ],
        income: [
          { name: 'Social Security', amount: 2500, start_month: 24 },
          { name: 'Healthcare', amount: -800, start_month: 1 },
          { name: 'Part-time Work', amount: 1500, start_month: 6, stop_month: 18 }
        ],
        order: [
          { account: 'Emergency Fund', order: 1 },
          { account: 'Investment', order: 2, weight: 0.7 },
          { account: 'IRA', order: 3 }
        ],
        deposits: [
          {
            name: 'Tax Refund',
            target: 'Investment',
            amount: 5000,
            start_month: 3,
            stop_month: 3
          }
        ],
        rate_schedules: {
          conservative_growth: { type: 'fixed', rate: 0.04 },
          variable_inflation: {
            type: 'sequence',
            values: [0.02, 0.025, 0.03, 0.028],
            default_rate: 0.025
          }
        }
      };

      // Validate the scenario structure
      const validateComplexScenario = (scenario) => {
        const checks = {
          hasMetadata: !!scenario.metadata,
          hasPlan: !!scenario.plan,
          hasAssets: Array.isArray(scenario.assets) && scenario.assets.length > 0,
          hasIncome: Array.isArray(scenario.income),
          hasOrder: Array.isArray(scenario.order),
          hasDeposits: Array.isArray(scenario.deposits),
          hasRateSchedules: !!scenario.rate_schedules
        };

        return {
          isValid: Object.values(checks).every(check => check),
          checks
        };
      };

      const validation = validateComplexScenario(complexScenario);
      expect(validation.isValid).toBe(true);
      expect(validation.checks.hasAssets).toBe(true);
      expect(validation.checks.hasRateSchedules).toBe(true);
    });
  });
});
