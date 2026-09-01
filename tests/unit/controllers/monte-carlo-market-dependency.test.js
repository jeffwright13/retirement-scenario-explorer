/**
 * Unit tests for Monte Carlo market dependency functionality
 * Tests that market_dependent flags correctly control variability
 */

import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('MonteCarloController Market Dependency', () => {
  let monteCarloController;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    monteCarloController = new MonteCarloController(eventBus);
  });

  describe('getMarketDependentAssetConfig with market_dependent flags', () => {
    test('should vary assets with market_dependent: true', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'investment',
            return_schedule: 'stocks_growth',
            market_dependent: true,
            investment_type: 'stocks'
          },
          {
            name: 'Savings Account',
            type: 'savings',
            return_schedule: 'savings_growth',
            market_dependent: false,
            investment_type: 'savings'
          }
        ],
        rate_schedules: {
          stocks_growth: { type: 'fixed', rate: 0.07 },
          savings_growth: { type: 'fixed', rate: 0.02 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Should vary the stock portfolio
      const stockEntry = config.find(c => c.scheduleName === 'stocks_growth');
      expect(stockEntry).toBeDefined();
      expect(stockEntry.stdDev).toBeGreaterThan(0);

      // Should NOT vary the savings account
      expect(config.find(c => c.scheduleName === 'savings_growth')).toBeUndefined();
    });

    test('should not vary any assets when all have market_dependent: false', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Savings Account',
            type: 'savings',
            return_schedule: 'savings_growth',
            market_dependent: false,
            investment_type: 'savings'
          },
          {
            name: 'CD Account',
            type: 'cd',
            return_schedule: 'cd_growth',
            market_dependent: false,
            investment_type: 'cd'
          }
        ],
        rate_schedules: {
          savings_growth: { type: 'fixed', rate: 0.02 },
          cd_growth: { type: 'fixed', rate: 0.03 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      expect(config).toHaveLength(0);
    });

    test('should vary all assets when all have market_dependent: true', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'stock',
            return_schedule: 'stocks_growth',
            market_dependent: true
          },
          {
            name: 'Bond Portfolio',
            type: 'bond',
            return_schedule: 'bonds_growth',
            market_dependent: true
          }
        ],
        rate_schedules: {
          stocks_growth: { type: 'fixed', rate: 0.08 },
          bonds_growth: { type: 'fixed', rate: 0.04 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      expect(config).toHaveLength(2);
      expect(config.find(c => c.scheduleName === 'stocks_growth')).toBeDefined();
      expect(config.find(c => c.scheduleName === 'bonds_growth')).toBeDefined();
    });
  });

  describe('getVolatilityForAsset', () => {
    test('should return higher volatility for stock assets', () => {
      const stockAsset = { name: 'Stock Portfolio', type: 'stock' };
      const volatility = monteCarloController.getVolatilityForAsset(stockAsset);
      
      expect(volatility).toBe(0.18); // 18% for stocks
    });

    test('should return medium volatility for bond assets', () => {
      const bondAsset = { name: 'Bond Fund', type: 'bond' };
      const volatility = monteCarloController.getVolatilityForAsset(bondAsset);
      
      expect(volatility).toBe(0.08); // 8% for bonds
    });

    test('should return low volatility for conservative assets', () => {
      const conservativeAsset = { name: 'Conservative Fund', type: 'investment' };
      const volatility = monteCarloController.getVolatilityForAsset(conservativeAsset);
      
      expect(volatility).toBe(0.05); // 5% for conservative
    });

    test('should return medium volatility for general investments', () => {
      const generalAsset = { name: 'Mixed Portfolio', type: 'investment' };
      const volatility = monteCarloController.getVolatilityForAsset(generalAsset);
      
      expect(volatility).toBe(0.08); // 8% for investment type
    });
  });

  describe('explicit market_dependent flags', () => {
    test('should vary multiple market-dependent assets', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'investment',
            return_schedule: 'stocks_growth',
            market_dependent: true,
            investment_type: 'stocks'
          },
          {
            name: 'Bond Fund',
            type: 'investment',
            return_schedule: 'bonds_growth',
            market_dependent: true,
            investment_type: 'bonds'
          },
          {
            name: 'Savings',
            type: 'savings',
            return_schedule: 'savings_growth',
            market_dependent: false,
            investment_type: 'savings'
          }
        ],
        rate_schedules: {
          stocks_growth: { type: 'fixed', rate: 0.08 },
          bonds_growth: { type: 'fixed', rate: 0.04 },
          savings_growth: { type: 'fixed', rate: 0.02 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Should vary assets with market_dependent: true
      expect(config.find(c => c.scheduleName === 'stocks_growth')).toBeDefined();
      expect(config.find(c => c.scheduleName === 'bonds_growth')).toBeDefined();

      // Should NOT vary assets with market_dependent: false
      expect(config.find(c => c.scheduleName === 'savings_growth')).toBeUndefined();
    });

    test('should not vary assets without explicit market_dependent: true', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Investment',
            type: 'taxable',
            return_schedule: 'investment_growth'
            // No market_dependent flag - should not vary
          }
        ],
        rate_schedules: {
          investment_growth: { type: 'fixed', rate: 0.065 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Should not vary assets without explicit market_dependent: true
      expect(config).toHaveLength(0);
    });

    test('should not vary assets with explicit market_dependent: false', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Conservative Investment',
            type: 'taxable',
            return_schedule: 'investment_growth',
            market_dependent: false
          }
        ],
        rate_schedules: {
          investment_growth: { type: 'fixed', rate: 0.065 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Should not vary assets with explicit market_dependent: false
      expect(config).toHaveLength(0);
    });
  });

  describe('market dependency edge cases', () => {
    test('should handle assets without return_schedule or interest_rate', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Invalid Asset',
            type: 'investment',
            market_dependent: true
            // Missing both return_schedule and interest_rate
          }
        ],
        rate_schedules: {}
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      expect(config).toHaveLength(0);
    });

    test('should include interest_rate-only assets (no return_schedule needed)', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Legacy Rate Asset',
            type: 'investment',
            interest_rate: 0.05,
            market_dependent: true
          }
        ]
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Previously skipped entirely -- interest_rate-only assets are now
      // included, since MonteCarloService synthesizes a schedule for them.
      expect(config).toHaveLength(1);
      expect(config[0].isLegacyInterestRate).toBe(true);
      expect(config[0].baseInterestRate).toBe(0.05);
    });

    test('should still describe an asset whose return_schedule is not (yet) registered', () => {
      // The old hardcoded-0.07-baseline-mean fallback for a missing
      // rate_schedules section is gone -- the controller no longer computes
      // a mean at all. Resolving the schedule's real rate happens later, in
      // MonteCarloService, against the scenario's actual rate_schedules.
      const scenarioData = {
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'stock',
            return_schedule: 'stocks_growth',
            market_dependent: true
          }
        ]
        // Missing rate_schedules
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      expect(config).toHaveLength(1);
      expect(config[0].scheduleName).toBe('stocks_growth');
    });

    test('should not vary assets with undefined market_dependent', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Legacy Asset',
            type: 'investment',
            return_schedule: 'legacy_growth',
            investment_type: 'mixed'
            // No market_dependent flag
          }
        ],
        rate_schedules: {
          legacy_growth: { type: 'fixed', rate: 0.05 }
        }
      };

      monteCarloController.currentScenarioData = scenarioData;
      const config = monteCarloController.getMarketDependentAssetConfig();

      // Should not vary assets without explicit market_dependent: true
      expect(config).toHaveLength(0);
    });
  });
});
