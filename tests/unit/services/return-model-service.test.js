/**
 * Tests for ReturnModelService and return models
 */

import { ReturnModelService, BaseReturnModel, SimpleRandomModel, HistoricalBootstrapModel, HistoricalSequenceModel } from '../../../scripts/services/ReturnModelService.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('ReturnModelService', () => {
  let eventBus;
  let returnModelService;

  beforeEach(() => {
    eventBus = new EventBus();
    returnModelService = new ReturnModelService(eventBus);
  });

  afterEach(() => {
    // Clear any lingering event listeners
    eventBus.removeAllListeners();
  });

  describe('Service Initialization', () => {
    test('should initialize with default models registered', () => {
      const models = returnModelService.getAvailableModels();
      
      expect(models).toHaveLength(3);
      expect(models.map(m => m.name)).toContain('simple-random');
      expect(models.map(m => m.name)).toContain('historical-bootstrap');
      expect(models.map(m => m.name)).toContain('historical-sequence');
    });

    test('should set simple-random as default model', () => {
      expect(returnModelService.currentModel).toBeInstanceOf(SimpleRandomModel);
    });

    test('should setup event listeners', () => {
      // Test that event listeners are registered by emitting events
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:available-models', mockHandler);
      
      eventBus.emit('returnmodel:get-available-models');
      
      expect(mockHandler).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('Model Management', () => {
    test('should register new models', () => {
      class TestModel extends BaseReturnModel {
        getDisplayName() { return 'Test Model'; }
        getDescription() { return 'Test Description'; }
      }
      
      returnModelService.registerModel('test-model', TestModel);
      const models = returnModelService.getAvailableModels();
      
      expect(models.map(m => m.name)).toContain('test-model');
    });

    test('should set active model', () => {
      returnModelService.setModel('historical-bootstrap', { test: 'config' });
      
      expect(returnModelService.currentModel).toBeInstanceOf(HistoricalBootstrapModel);
      expect(returnModelService.currentModel.config).toEqual({ test: 'config' });
    });

    test('should throw error for unknown model', () => {
      expect(() => {
        returnModelService.setModel('unknown-model');
      }).toThrow('Unknown return model: unknown-model');
    });

    test('should emit model-changed event when setting model', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:model-changed', mockHandler);
      
      returnModelService.setModel('historical-bootstrap', { test: 'config' });
      
      expect(mockHandler).toHaveBeenCalledWith({
        modelType: 'historical-bootstrap',
        config: { test: 'config' },
        capabilities: expect.any(Object)
      });
    });
  });

  describe('Return Generation', () => {
    test('should generate returns and store history', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:returns-generated', mockHandler);
      
      const requestData = {
        simulationId: 'test-sim-123',
        assetTypes: ['stock', 'bond'],
        duration: 5,
        seed: 12345,
        config: { stock_mean: 0.08 }
      };
      
      returnModelService.generateReturns(requestData);
      
      expect(mockHandler).toHaveBeenCalledWith({
        simulationId: 'test-sim-123',
        returns: expect.any(Object),
        modelType: 'SimpleRandomModel'
      });
      
      // Check that history was stored
      expect(returnModelService.returnHistory.has('test-sim-123')).toBe(true);
    });

    test('should handle generation errors', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:generation-error', mockHandler);
      
      // Force error by setting null model
      returnModelService.currentModel = null;
      
      // This should not throw, but emit an error event
      expect(() => {
        returnModelService.generateReturns({
          simulationId: 'test-sim-error',
          assetTypes: ['stock'],
          duration: 5
        });
      }).not.toThrow();
      
      expect(mockHandler).toHaveBeenCalledWith({
        simulationId: 'test-sim-error',
        error: 'No return model set'
      });
    });
  });

  describe('Export Functionality', () => {
    test('should export return history', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:export-ready', mockHandler);
      
      // First generate some returns
      returnModelService.generateReturns({
        simulationId: 'export-test-123',
        assetTypes: ['stock'],
        duration: 3,
        seed: 12345
      });
      
      // Then export
      returnModelService.exportReturnHistory('export-test-123');
      
      expect(mockHandler).toHaveBeenCalledWith({
        simulationId: 'export-test-123',
        data: expect.objectContaining({
          simulationId: 'export-test-123',
          modelType: 'SimpleRandomModel',
          returns: expect.any(Object),
          timestamp: expect.any(Number),
          exportTimestamp: expect.any(Number)
        }),
        filename: expect.stringMatching(/^returns-export-test-123-\d+\.json$/)
      });
    });

    test('should handle export errors for missing simulation', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:export-error', mockHandler);
      
      returnModelService.exportReturnHistory('non-existent-sim');
      
      expect(mockHandler).toHaveBeenCalledWith({
        simulationId: 'non-existent-sim',
        error: 'No return history found for simulation'
      });
    });
  });

  describe('Event Bus Integration', () => {
    test('should respond to returnmodel:set-model event', () => {
      eventBus.emit('returnmodel:set-model', {
        modelType: 'historical-bootstrap',
        config: { test: 'value' }
      });
      
      expect(returnModelService.currentModel).toBeInstanceOf(HistoricalBootstrapModel);
      expect(returnModelService.currentModel.config.test).toBe('value');
    });

    test('should respond to returnmodel:generate-returns event', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:returns-generated', mockHandler);
      
      eventBus.emit('returnmodel:generate-returns', {
        simulationId: 'event-test-123',
        assetTypes: ['stock'],
        duration: 2,
        seed: 54321
      });
      
      expect(mockHandler).toHaveBeenCalled();
    });

    test('should respond to returnmodel:export-history event', () => {
      const mockHandler = jest.fn();
      eventBus.on('returnmodel:export-ready', mockHandler);
      
      // Generate returns first
      returnModelService.generateReturns({
        simulationId: 'event-export-123',
        assetTypes: ['stock'],
        duration: 2
      });
      
      // Then request export via event
      eventBus.emit('returnmodel:export-history', {
        simulationId: 'event-export-123'
      });
      
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});

describe('SimpleRandomModel', () => {
  let model;

  beforeEach(() => {
    model = new SimpleRandomModel();
  });

  test('should generate returns with normal distribution', () => {
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: 100,
      seed: 12345,
      config: { stock_mean: 0.08, stock_stddev: 0.15 }
    });
    
    expect(returns.stock).toHaveLength(100);
    
    // Check statistical properties (with some tolerance)
    const mean = returns.stock.reduce((sum, ret) => sum + ret, 0) / returns.stock.length;
    expect(mean).toBeCloseTo(0.08, 1); // Within 0.1 of expected mean
  });

  test('should use default parameters when not specified', () => {
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: 10,
      seed: 12345,
      config: {}
    });
    
    expect(returns.stock).toHaveLength(10);
    expect(returns.stock.every(ret => typeof ret === 'number')).toBe(true);
  });

  test('should generate different returns for different asset types', () => {
    const returns = model.generateReturns({
      assetTypes: ['stock', 'bond'],
      duration: 5,
      seed: 12345,
      config: {
        stock_mean: 0.08,
        bond_mean: 0.04
      }
    });
    
    expect(returns.stock).toHaveLength(5);
    expect(returns.bond).toHaveLength(5);
    expect(returns.stock).not.toEqual(returns.bond);
  });

  test('should be reproducible with same seed', () => {
    const returns1 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345
    });
    
    const returns2 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345
    });
    
    expect(returns1.stock).toEqual(returns2.stock);
  });

  test('should have correct capabilities', () => {
    const capabilities = model.getCapabilities();
    
    expect(capabilities).toEqual({
      supportsMultipleAssets: true,
      supportsCorrelation: false,
      supportsRegimes: false,
      supportsSequenceRisk: false
    });
  });
});

describe('HistoricalBootstrapModel', () => {
  let model;

  beforeEach(() => {
    model = new HistoricalBootstrapModel();
  });

  test('should generate returns from historical data', () => {
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: 10,
      seed: 12345
    });
    
    expect(returns.stock).toHaveLength(10);
    
    // All returns should be from historical data
    const historicalReturns = model.historicalData.stock;
    returns.stock.forEach(ret => {
      expect(historicalReturns).toContain(ret);
    });
  });

  test('should map asset types correctly', () => {
    const stockMapping = model.mapAssetTypeToHistoricalData('investment');
    const bondMapping = model.mapAssetTypeToHistoricalData('bond');
    const defaultMapping = model.mapAssetTypeToHistoricalData('unknown');
    
    expect(stockMapping).toBe('stock');
    expect(bondMapping).toBe('bond');
    expect(defaultMapping).toBe('stock');
  });

  test('should apply adjustments from config', () => {
    const adjustment = 0.02;
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345,
      config: { stock_adjustment: adjustment }
    });
    
    // Check that adjustments were applied
    const historicalReturns = model.historicalData.stock;
    returns.stock.forEach(ret => {
      const originalReturn = ret - adjustment;
      // Use toBeCloseTo for floating point comparison
      const found = historicalReturns.some(histRet => 
        Math.abs(histRet - originalReturn) < 0.0001
      );
      expect(found).toBe(true);
    });
  });

  test('should be reproducible with same seed', () => {
    const returns1 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345
    });
    
    const returns2 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345
    });
    
    expect(returns1.stock).toEqual(returns2.stock);
  });

  test('should have correct capabilities', () => {
    const capabilities = model.getCapabilities();
    
    expect(capabilities).toEqual({
      supportsMultipleAssets: true,
      supportsCorrelation: true,
      supportsRegimes: false,
      supportsSequenceRisk: false
    });
  });
});

describe('HistoricalSequenceModel', () => {
  let model;

  beforeEach(() => {
    model = new HistoricalSequenceModel();
  });

  test('should generate sequential returns from historical data', () => {
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: 5,
      seed: 12345
    });
    
    expect(returns.stock).toHaveLength(5);
    
    // Returns should be sequential (though we can't easily test the exact sequence without knowing the seed behavior)
    expect(returns.stock.every(ret => typeof ret === 'number')).toBe(true);
  });

  test('should handle duration longer than historical data', () => {
    const longDuration = model.historicalData.stock.length + 10;
    
    const returns = model.generateReturns({
      assetTypes: ['stock'],
      duration: longDuration,
      seed: 12345
    });
    
    expect(returns.stock).toHaveLength(longDuration);
  });

  test('should preserve sequence risk characteristics', () => {
    // Test that consecutive returns can be correlated (unlike bootstrap)
    const returns1 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 20,
      seed: 12345
    });
    
    const returns2 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 20,
      seed: 54321
    });
    
    // Different seeds should produce different sequences
    expect(returns1.stock).not.toEqual(returns2.stock);
  });

  test('should be reproducible with same seed', () => {
    const returns1 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 10,
      seed: 12345
    });
    
    const returns2 = model.generateReturns({
      assetTypes: ['stock'],
      duration: 10,
      seed: 12345
    });
    
    expect(returns1.stock).toEqual(returns2.stock);
  });

  test('should have correct capabilities', () => {
    const capabilities = model.getCapabilities();
    
    expect(capabilities).toEqual({
      supportsMultipleAssets: true,
      supportsCorrelation: true,
      supportsRegimes: true,
      supportsSequenceRisk: true
    });
  });
});

describe('BaseReturnModel', () => {
  test('should throw error when generateReturns not implemented', () => {
    const baseModel = new BaseReturnModel();
    
    expect(() => {
      baseModel.generateReturns({});
    }).toThrow('generateReturns must be implemented by subclass');
  });

  test('should create seeded RNG', () => {
    const baseModel = new BaseReturnModel();
    const rng = baseModel.createRNG(12345);
    
    const value1 = rng();
    const value2 = rng();
    
    expect(typeof value1).toBe('number');
    expect(typeof value2).toBe('number');
    expect(value1).toBeGreaterThanOrEqual(0);
    expect(value1).toBeLessThan(1);
    expect(value2).toBeGreaterThanOrEqual(0);
    expect(value2).toBeLessThan(1);
    expect(value1).not.toBe(value2);
  });

  test('should create unseeded RNG', () => {
    const baseModel = new BaseReturnModel();
    const rng = baseModel.createRNG(null);
    
    expect(rng).toBe(Math.random);
  });
});
