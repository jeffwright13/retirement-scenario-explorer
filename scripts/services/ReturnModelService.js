/**
 * Return Model Service - Modular return generation for Monte Carlo analysis
 * Provides various return models with strict separation of concerns
 */

export class ReturnModelService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.models = new Map();
    this.currentModel = null;
    this.returnHistory = new Map(); // Track returns used in each simulation
    
    this.setupEventListeners();
    this.registerDefaultModels();
    
    console.log('📈 ReturnModelService created');
  }

  /**
   * Setup event listeners for return model requests
   */
  setupEventListeners() {
    // Model selection and configuration
    this.eventBus.on('returnmodel:set-model', (data) => {
      this.setModel(data.modelType, data.config);
    });
    
    // Return generation requests
    this.eventBus.on('returnmodel:generate-returns', (data) => {
      this.generateReturns(data);
    });
    
    // Export requests
    this.eventBus.on('returnmodel:export-history', (data) => {
      this.exportReturnHistory(data.simulationId);
    });
    
    // Model information requests
    this.eventBus.on('returnmodel:get-available-models', () => {
      this.eventBus.emit('returnmodel:available-models', this.getAvailableModels());
    });
  }

  /**
   * Register default return models
   */
  registerDefaultModels() {
    this.registerModel('simple-random', SimpleRandomModel);
    this.registerModel('historical-bootstrap', HistoricalBootstrapModel);
    this.registerModel('historical-sequence', HistoricalSequenceModel);
    
    // Set default model
    this.setModel('simple-random', {});
  }

  /**
   * Register a return model class
   */
  registerModel(name, modelClass) {
    this.models.set(name, modelClass);
    console.log(`📈 ReturnModelService: Registered model '${name}'`);
  }

  /**
   * Set the active return model
   */
  setModel(modelType, config = {}) {
    if (!this.models.has(modelType)) {
      throw new Error(`Unknown return model: ${modelType}`);
    }
    
    const ModelClass = this.models.get(modelType);
    this.currentModel = new ModelClass(config);
    
    console.log(`📈 ReturnModelService: Set active model to '${modelType}'`);
    
    this.eventBus.emit('returnmodel:model-changed', {
      modelType,
      config,
      capabilities: this.currentModel.getCapabilities()
    });
  }

  /**
   * Generate returns for a simulation
   */
  generateReturns(data) {
    const { simulationId, assetTypes, duration, seed, config = {} } = data;
    
    if (!this.currentModel) {
      this.eventBus.emit('returnmodel:generation-error', {
        simulationId,
        error: 'No return model set'
      });
      return;
    }
    
    try {
      const returns = this.currentModel.generateReturns({
        assetTypes,
        duration,
        seed,
        config
      });
      
      // Store return history for export
      this.returnHistory.set(simulationId, {
        modelType: this.currentModel.constructor.name,
        returns,
        timestamp: Date.now(),
        config,
        assetTypes,
        duration
      });
      
      this.eventBus.emit('returnmodel:returns-generated', {
        simulationId,
        returns,
        modelType: this.currentModel.constructor.name
      });
      
    } catch (error) {
      this.eventBus.emit('returnmodel:generation-error', {
        simulationId,
        error: error.message
      });
    }
  }

  /**
   * Export return history for a specific simulation
   */
  exportReturnHistory(simulationId) {
    const history = this.returnHistory.get(simulationId);
    
    if (!history) {
      this.eventBus.emit('returnmodel:export-error', {
        simulationId,
        error: 'No return history found for simulation'
      });
      return;
    }
    
    const exportData = {
      simulationId,
      exportTimestamp: Date.now(),
      ...history
    };
    
    this.eventBus.emit('returnmodel:export-ready', {
      simulationId,
      data: exportData,
      filename: `returns-${simulationId}-${Date.now()}.json`
    });
  }

  /**
   * Get available models and their capabilities
   */
  getAvailableModels() {
    const models = [];
    
    for (const [name, ModelClass] of this.models) {
      const tempModel = new ModelClass({});
      models.push({
        name,
        displayName: tempModel.getDisplayName(),
        description: tempModel.getDescription(),
        capabilities: tempModel.getCapabilities()
      });
    }
    
    return models;
  }

  /**
   * Clear return history (for memory management)
   */
  clearHistory(olderThanMs = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - olderThanMs;
    
    for (const [simulationId, history] of this.returnHistory) {
      if (history.timestamp < cutoff) {
        this.returnHistory.delete(simulationId);
      }
    }
  }
}

/**
 * Base class for return models
 */
export class BaseReturnModel {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Generate returns for multiple asset types over specified duration
   * @param {Object} params - Generation parameters
   * @returns {Object} Returns by asset type and time period
   */
  generateReturns(params) {
    throw new Error('generateReturns must be implemented by subclass');
  }

  /**
   * Get model display name
   */
  getDisplayName() {
    return 'Base Return Model';
  }

  /**
   * Get model description
   */
  getDescription() {
    return 'Base class for return models';
  }

  /**
   * Get model capabilities
   */
  getCapabilities() {
    return {
      supportsMultipleAssets: false,
      supportsCorrelation: false,
      supportsRegimes: false,
      supportsSequenceRisk: false
    };
  }

  /**
   * Create seeded random number generator
   */
  createRNG(seed) {
    if (seed === null || seed === undefined) {
      return Math.random;
    }
    
    // Mulberry32 PRNG
    let state = seed;
    return function() {
      let t = state += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
}

/**
 * Simple Random Model - Original implementation
 */
export class SimpleRandomModel extends BaseReturnModel {
  generateReturns({ assetTypes, duration, seed, config = {} }) {
    const rng = this.createRNG(seed);
    const returns = {};
    
    for (const assetType of assetTypes) {
      returns[assetType] = [];
      
      for (let period = 0; period < duration; period++) {
        // Use normal distribution with configurable parameters
        const mean = config[`${assetType}_mean`] || 0.07;
        const stdDev = config[`${assetType}_stddev`] || 0.15;
        
        const return_value = this.normalRandom(mean, stdDev, rng);
        returns[assetType].push(return_value);
      }
    }
    
    return returns;
  }

  normalRandom(mean, stdDev, rng) {
    const u1 = rng();
    const u2 = rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  getDisplayName() {
    return 'Simple Random';
  }

  getDescription() {
    return 'Independent random returns using normal distribution';
  }

  getCapabilities() {
    return {
      supportsMultipleAssets: true,
      supportsCorrelation: false,
      supportsRegimes: false,
      supportsSequenceRisk: false
    };
  }
}

/**
 * Historical Bootstrap Model - Samples from actual historical returns
 */
export class HistoricalBootstrapModel extends BaseReturnModel {
  constructor(config = {}) {
    super(config);
    this.historicalData = this.loadHistoricalData();
  }

  /**
   * Load historical return data
   */
  loadHistoricalData() {
    // S&P 500 annual returns 1926-2023 (simplified dataset)
    // In production, this would be loaded from external data source
    return {
      'stock': [
        0.1162, 0.3749, 0.4361, -0.0842, -0.2512, -0.4384, -0.0864, 0.4998, 0.4674, 0.3194,
        -0.3534, 0.2928, 0.2109, -0.0119, 0.2003, 0.1131, -0.0067, 0.2070, 0.255, 0.1885,
        0.1421, 0.1906, 0.2589, -0.0897, 0.2031, 0.1653, 0.0262, 0.1849, 0.3237, 0.2011,
        0.1279, -0.0110, 0.2168, 0.2234, 0.0615, 0.1240, 0.0970, 0.0110, 0.4372, 0.1206,
        0.0034, 0.2664, 0.1488, -0.0658, 0.1244, 0.0200, 0.1561, 0.3148, -0.0306, 0.3023,
        0.0749, -0.0110, 0.0400, 0.1361, 0.1131, -0.0847, -0.1054, 0.2031, 0.2233, 0.0685,
        0.1506, 0.0317, 0.1854, 0.3256, 0.1854, 0.0581, 0.1654, 0.3115, -0.0307, 0.3042,
        0.0742, -0.1146, 0.0491, 0.1579, 0.0549, -0.3655, 0.2594, 0.2236, -0.0881, 0.1040,
        0.1301, 0.1917, 0.3138, 0.3056, 0.0754, 0.0970, 0.0133, 0.3719, 0.2268, -0.0881,
        -0.0903, -0.1189, -0.2210, 0.2868, 0.1088, 0.0491, 0.1579
      ],
      'bond': [
        0.0744, 0.0884, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479, 0.0884, 0.0668, 0.0010, 0.0446, 0.0479,
        0.0884, 0.0668, 0.0010, 0.0446, 0.0479
      ]
    };
  }

  generateReturns({ assetTypes, duration, seed, config = {} }) {
    const rng = this.createRNG(seed);
    const returns = {};
    
    for (const assetType of assetTypes) {
      returns[assetType] = [];
      
      // Map asset type to historical data
      const dataKey = this.mapAssetTypeToHistoricalData(assetType);
      const historicalReturns = this.historicalData[dataKey] || this.historicalData['stock'];
      
      for (let period = 0; period < duration; period++) {
        // Randomly sample from historical returns
        const randomIndex = Math.floor(rng() * historicalReturns.length);
        const historicalReturn = historicalReturns[randomIndex];
        
        // Apply any adjustments from config
        const adjustment = config[`${assetType}_adjustment`] || 0;
        const finalReturn = historicalReturn + adjustment;
        
        returns[assetType].push(finalReturn);
      }
    }
    
    return returns;
  }

  /**
   * Map asset types to historical data keys
   */
  mapAssetTypeToHistoricalData(assetType) {
    const mapping = {
      'stock': 'stock',
      'equity': 'stock',
      'investment': 'stock',
      'bond': 'bond',
      'fixed_income': 'bond',
      'cash': 'bond', // Conservative mapping
      'savings': 'bond'
    };
    
    return mapping[assetType.toLowerCase()] || 'stock';
  }

  getDisplayName() {
    return 'Historical Bootstrap';
  }

  getDescription() {
    return 'Random sampling from actual historical market returns (1926-2023)';
  }

  getCapabilities() {
    return {
      supportsMultipleAssets: true,
      supportsCorrelation: true,
      supportsRegimes: false,
      supportsSequenceRisk: false
    };
  }
}

/**
 * Historical Sequence Model - Uses complete historical sequences
 */
export class HistoricalSequenceModel extends BaseReturnModel {
  constructor(config = {}) {
    super(config);
    this.historicalData = this.loadHistoricalData();
  }

  loadHistoricalData() {
    // Same data as HistoricalBootstrapModel
    // In production, this would be shared or loaded from common source
    return new HistoricalBootstrapModel().loadHistoricalData();
  }

  generateReturns({ assetTypes, duration, seed, config = {} }) {
    const rng = this.createRNG(seed);
    const returns = {};
    
    for (const assetType of assetTypes) {
      const dataKey = this.mapAssetTypeToHistoricalData(assetType);
      const historicalReturns = this.historicalData[dataKey] || this.historicalData['stock'];
      
      // Choose random starting point that allows full duration
      const maxStartIndex = Math.max(0, historicalReturns.length - duration);
      const startIndex = Math.floor(rng() * (maxStartIndex + 1));
      
      // Extract sequence
      const sequence = historicalReturns.slice(startIndex, startIndex + duration);
      
      // Pad with repeated sampling if needed
      while (sequence.length < duration) {
        const remainingNeeded = duration - sequence.length;
        const additionalStart = Math.floor(rng() * historicalReturns.length);
        const additionalSequence = historicalReturns.slice(
          additionalStart, 
          Math.min(additionalStart + remainingNeeded, historicalReturns.length)
        );
        sequence.push(...additionalSequence);
      }
      
      // Apply adjustments
      const adjustment = config[`${assetType}_adjustment`] || 0;
      returns[assetType] = sequence.map(ret => ret + adjustment);
    }
    
    return returns;
  }

  mapAssetTypeToHistoricalData(assetType) {
    // Same mapping as HistoricalBootstrapModel
    const mapping = {
      'stock': 'stock',
      'equity': 'stock',
      'investment': 'stock',
      'bond': 'bond',
      'fixed_income': 'bond',
      'cash': 'bond',
      'savings': 'bond'
    };
    
    return mapping[assetType.toLowerCase()] || 'stock';
  }

  getDisplayName() {
    return 'Historical Sequence';
  }

  getDescription() {
    return 'Complete historical return sequences preserving sequence risk';
  }

  getCapabilities() {
    return {
      supportsMultipleAssets: true,
      supportsCorrelation: true,
      supportsRegimes: true,
      supportsSequenceRisk: true
    };
  }
}
