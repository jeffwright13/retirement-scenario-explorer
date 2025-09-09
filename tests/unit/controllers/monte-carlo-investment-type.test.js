/**
 * Unit tests for Monte Carlo investment type functionality
 * Tests that investment_type field correctly controls volatility assignment
 */

import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('MonteCarloController Investment Type', () => {
  let monteCarloController;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    monteCarloController = new MonteCarloController(eventBus);
  });

  describe('getVolatilityForAsset with investment_type', () => {
    test('should return 18% volatility for stocks', () => {
      const asset = { 
        name: 'Stock Portfolio', 
        investment_type: 'stocks' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.18);
    });

    test('should return 8% volatility for bonds', () => {
      const asset = { 
        name: 'Bond Fund', 
        investment_type: 'bonds' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.08);
    });

    test('should return 12% volatility for mixed portfolios', () => {
      const asset = { 
        name: 'Balanced Fund', 
        investment_type: 'mixed' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.12);
    });

    test('should return 15% volatility for real estate', () => {
      const asset = { 
        name: 'REIT Fund', 
        investment_type: 'real_estate' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.15);
    });

    test('should return 2% volatility for savings', () => {
      const asset = { 
        name: 'Savings Account', 
        investment_type: 'savings' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.02);
    });

    test('should return 2% volatility for CDs', () => {
      const asset = { 
        name: 'Certificate of Deposit', 
        investment_type: 'cd' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.02);
    });

    test('should return 2% volatility for money market', () => {
      const asset = { 
        name: 'Money Market Account', 
        investment_type: 'money_market' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.02);
    });

    test('should return 12% default volatility for unknown investment type', () => {
      const asset = { 
        name: 'Unknown Fund', 
        investment_type: 'unknown_type' 
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.12);
    });

    test('should fallback to legacy keyword matching when no investment_type', () => {
      const asset = { 
        name: 'Stock Portfolio', 
        type: 'investment'
        // No investment_type field
      };
      const volatility = monteCarloController.getVolatilityForAsset(asset);
      expect(volatility).toBe(0.18); // Should detect "stock" in name
    });
  });

  describe('Market dependency with investment types', () => {
    test('should vary market-dependent assets with different investment types', () => {
      const scenarioData = {
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'taxable',
            return_schedule: 'stocks_growth',
            market_dependent: true,
            investment_type: 'stocks'
          },
          {
            name: 'Bond Fund',
            type: 'tax_deferred',
            return_schedule: 'bonds_growth',
            market_dependent: true,
            investment_type: 'bonds'
          },
          {
            name: 'Savings Account',
            type: 'taxable',
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
      const variableRanges = monteCarloController.getDefaultVariableRanges();

      // Should vary market-dependent assets with appropriate volatility
      expect(variableRanges['rate_schedules.stocks_growth.rate']).toBeDefined();
      expect(variableRanges['rate_schedules.stocks_growth.rate'].stdDev).toBe(0.18); // 18% volatility for stocks

      expect(variableRanges['rate_schedules.bonds_growth.rate']).toBeDefined();
      expect(variableRanges['rate_schedules.bonds_growth.rate'].stdDev).toBe(0.08); // 8% volatility for bonds

      // Should not vary stable assets
      expect(variableRanges['rate_schedules.savings_growth.rate']).toBeUndefined();
    });
  });
});
