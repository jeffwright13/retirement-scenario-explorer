/**
 * Unit tests for ScenarioBuilderService investment type functionality
 * Tests that investment type is properly handled in form-to-JSON conversion
 */

import { ScenarioBuilderService } from '../../../scripts/services/ScenarioBuilderService.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('ScenarioBuilderService Investment Type', () => {
  let scenarioBuilderService;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    scenarioBuilderService = new ScenarioBuilderService(eventBus);
  });

  describe('getMarketDependency with investment types', () => {
    test('should return false for stable investment types', () => {
      const savingsAsset = { investmentType: 'savings' };
      expect(scenarioBuilderService.getMarketDependency(savingsAsset)).toBe(false);

      const cdAsset = { investmentType: 'cd' };
      expect(scenarioBuilderService.getMarketDependency(cdAsset)).toBe(false);

      const moneyMarketAsset = { investmentType: 'money_market' };
      expect(scenarioBuilderService.getMarketDependency(moneyMarketAsset)).toBe(false);
    });

    test('should return true for market-dependent investment types', () => {
      const stocksAsset = { investmentType: 'stocks' };
      expect(scenarioBuilderService.getMarketDependency(stocksAsset)).toBe(true);

      const bondsAsset = { investmentType: 'bonds' };
      expect(scenarioBuilderService.getMarketDependency(bondsAsset)).toBe(true);

      const mixedAsset = { investmentType: 'mixed' };
      expect(scenarioBuilderService.getMarketDependency(mixedAsset)).toBe(true);

      const realEstateAsset = { investmentType: 'real_estate' };
      expect(scenarioBuilderService.getMarketDependency(realEstateAsset)).toBe(true);
    });

    test('should prioritize explicit marketDependent over investment type', () => {
      const asset = { 
        investmentType: 'stocks', 
        marketDependent: false 
      };
      expect(scenarioBuilderService.getMarketDependency(asset)).toBe(false);
    });

    test('should fallback to keyword matching when no investment type', () => {
      const stockAsset = { name: 'Stock Portfolio' };
      expect(scenarioBuilderService.getMarketDependency(stockAsset)).toBe(true);

      const savingsAsset = { name: 'Savings Account' };
      expect(scenarioBuilderService.getMarketDependency(savingsAsset)).toBe(false);
    });
  });

  describe('convertFormToJson with investment types', () => {
    test('should include investment_type in generated JSON', () => {
      const formData = {
        name: 'Test Scenario',
        monthlyExpenses: 5000,
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'taxable',
            investmentType: 'stocks',
            balance: 100000,
            returnRate: 8,
            order: 1,
            marketDependent: true
          },
          {
            name: 'Savings Account',
            type: 'taxable',
            investmentType: 'savings',
            balance: 25000,
            returnRate: 2,
            order: 2,
            marketDependent: false
          }
        ],
        income: []
      };

      const scenario = scenarioBuilderService.convertFormToJson(formData);

      expect(scenario.assets).toHaveLength(2);
      expect(scenario.assets[0].investment_type).toBe('stocks');
      expect(scenario.assets[0].market_dependent).toBe(true);
      expect(scenario.assets[1].investment_type).toBe('savings');
      expect(scenario.assets[1].market_dependent).toBe(false);
    });

    test('should default to mixed investment type when not specified', () => {
      const formData = {
        name: 'Test Scenario',
        monthlyExpenses: 5000,
        assets: [
          {
            name: 'Portfolio',
            type: 'taxable',
            balance: 100000,
            returnRate: 7,
            order: 1
            // No investmentType specified
          }
        ],
        income: []
      };

      const scenario = scenarioBuilderService.convertFormToJson(formData);

      expect(scenario.assets[0].investment_type).toBe('mixed');
    });

    test('should use investment type for market dependency when checkbox not set', () => {
      const formData = {
        name: 'Test Scenario',
        monthlyExpenses: 5000,
        assets: [
          {
            name: 'Stock Portfolio',
            type: 'taxable',
            investmentType: 'stocks',
            balance: 100000,
            returnRate: 8,
            order: 1
            // marketDependent not explicitly set
          },
          {
            name: 'Savings Account',
            type: 'taxable',
            investmentType: 'savings',
            balance: 25000,
            returnRate: 2,
            order: 2
            // marketDependent not explicitly set
          }
        ],
        income: []
      };

      const scenario = scenarioBuilderService.convertFormToJson(formData);

      // Should use investment type to determine market dependency
      expect(scenario.assets[0].market_dependent).toBe(true); // stocks
      expect(scenario.assets[1].market_dependent).toBe(false); // savings
    });
  });
});
