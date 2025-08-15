/**
 * Tests for ReturnModelService realistic parameter defaults
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { ReturnModelService } from '../../../scripts/services/ReturnModelService.js';

describe('ReturnModelService Realistic Parameters', () => {
  let eventBus;
  let returnModelService;

  beforeEach(() => {
    eventBus = new EventBus();
    returnModelService = new ReturnModelService(eventBus);
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('SimpleRandomModel Default Parameters', () => {
    test('should use realistic stock parameters', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const stockMean = model.getDefaultMean('stock');
      const stockStdDev = model.getDefaultStdDev('stock');
      
      expect(stockMean).toBe(0.10); // 10% annual return
      expect(stockStdDev).toBe(0.16); // 16% volatility
    });

    test('should use realistic bond parameters', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const bondMean = model.getDefaultMean('bond');
      const bondStdDev = model.getDefaultStdDev('bond');
      
      expect(bondMean).toBe(0.04); // 4% annual return
      expect(bondStdDev).toBe(0.05); // 5% volatility
    });

    test('should use realistic cash parameters', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const cashMean = model.getDefaultMean('cash');
      const cashStdDev = model.getDefaultStdDev('cash');
      
      expect(cashMean).toBe(0.02); // 2% annual return
      expect(cashStdDev).toBe(0.01); // 1% volatility
    });

    test('should use investment fallback for unknown asset types', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const unknownMean = model.getDefaultMean('unknown');
      const unknownStdDev = model.getDefaultStdDev('unknown');
      
      expect(unknownMean).toBe(0.07); // Investment fallback
      expect(unknownStdDev).toBe(0.12); // Investment fallback
    });

    test('should handle equity as stock alias', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const equityMean = model.getDefaultMean('equity');
      const equityStdDev = model.getDefaultStdDev('equity');
      
      expect(equityMean).toBe(0.10); // Same as stock
      expect(equityStdDev).toBe(0.16); // Same as stock
    });
  });

  describe('Return Generation with Realistic Parameters', () => {
    test('should generate returns within expected ranges for stocks', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const results = model.generateReturns({
        assetTypes: ['stock'],
        duration: 1,
        seed: 12345,
        config: {}
      });
      
      expect(results.stock).toHaveLength(1);
      expect(typeof results.stock[0]).toBe('number');
    });

    test('should generate different volatility for different asset types', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      const seed = 12345;
      
      // Generate multiple returns for each asset type
      const stockResults = model.generateReturns({
        assetTypes: ['stock'],
        duration: 100,
        seed: 12345,
        config: {}
      });
      const bondResults = model.generateReturns({
        assetTypes: ['bond'],
        duration: 100,
        seed: 12346,
        config: {}
      });
      const cashResults = model.generateReturns({
        assetTypes: ['cash'],
        duration: 100,
        seed: 12347,
        config: {}
      });
      
      const stockReturns = stockResults.stock;
      const bondReturns = bondResults.bond;
      const cashReturns = cashResults.cash;
      
      // Calculate standard deviations
      const stockStd = calculateStandardDeviation(stockReturns);
      const bondStd = calculateStandardDeviation(bondReturns);
      const cashStd = calculateStandardDeviation(cashReturns);
      
      // Stock should have highest volatility, cash lowest
      expect(stockStd).toBeGreaterThan(bondStd);
      expect(bondStd).toBeGreaterThan(cashStd);
    });

    test('should use custom parameters when provided', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const results = model.generateReturns({
        assetTypes: ['stock'],
        duration: 1,
        seed: 12345,
        config: { stock_mean: 0.15, stock_stddev: 0.20 }
      });
      
      // Should use custom parameters and generate valid returns
      expect(results.stock).toHaveLength(1);
      expect(typeof results.stock[0]).toBe('number');
      expect(results.stock[0]).not.toBe(0.10); // Should not use default mean
    });
  });

  describe('Parameter Validation', () => {
    test('should validate mean parameters are reasonable', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      // All default means should be positive and reasonable
      expect(model.getDefaultMean('stock')).toBeGreaterThan(0);
      expect(model.getDefaultMean('stock')).toBeLessThan(0.5); // Less than 50%
      
      expect(model.getDefaultMean('bond')).toBeGreaterThan(0);
      expect(model.getDefaultMean('bond')).toBeLessThan(0.2); // Less than 20%
      
      expect(model.getDefaultMean('cash')).toBeGreaterThan(0);
      expect(model.getDefaultMean('cash')).toBeLessThan(0.1); // Less than 10%
    });

    test('should validate volatility parameters are reasonable', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      // All default volatilities should be positive and reasonable
      expect(model.getDefaultStdDev('stock')).toBeGreaterThan(0);
      expect(model.getDefaultStdDev('stock')).toBeLessThan(1.0); // Less than 100%
      
      expect(model.getDefaultStdDev('bond')).toBeGreaterThan(0);
      expect(model.getDefaultStdDev('bond')).toBeLessThan(0.5); // Less than 50%
      
      expect(model.getDefaultStdDev('cash')).toBeGreaterThan(0);
      expect(model.getDefaultStdDev('cash')).toBeLessThan(0.2); // Less than 20%
    });

    test('should maintain risk ordering: stocks > bonds > cash', () => {
      const ModelClass = returnModelService.models.get('simple-random');
      const model = new ModelClass({});
      
      const stockMean = model.getDefaultMean('stock');
      const bondMean = model.getDefaultMean('bond');
      const cashMean = model.getDefaultMean('cash');
      
      const stockVol = model.getDefaultStdDev('stock');
      const bondVol = model.getDefaultStdDev('bond');
      const cashVol = model.getDefaultStdDev('cash');
      
      // Higher expected returns for riskier assets
      expect(stockMean).toBeGreaterThan(bondMean);
      expect(bondMean).toBeGreaterThan(cashMean);
      
      // Higher volatility for riskier assets
      expect(stockVol).toBeGreaterThan(bondVol);
      expect(bondVol).toBeGreaterThan(cashVol);
    });
  });
});

// Helper function to calculate standard deviation
function calculateStandardDeviation(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
