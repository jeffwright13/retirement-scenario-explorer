/**
 * Monte Carlo Service - Statistical analysis for retirement scenarios
 * Provides probabilistic modeling and risk analysis capabilities
 */
export class MonteCarloService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isRunning = false;
    this.currentAnalysis = null;
    
    // Configuration defaults
    this.defaultConfig = {
      iterations: 100, // Reduced default for better performance
      confidenceIntervals: [10, 25, 50, 75, 90], // Percentiles to calculate
      randomSeed: null, // For reproducible results
      parallelBatches: 2, // Reduced for better performance
      progressUpdateInterval: 10, // More frequent updates
      maxIterations: 1000, // Hard limit to prevent browser overload
      simulationDelay: 10 // Delay between simulations (ms) to prevent browser freeze
    };
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Monte Carlo requests
   */
  setupEventListeners() {
    // Listen for Monte Carlo analysis requests
    this.eventBus.on('montecarlo:run', async (data) => {
      console.log('🎲 MonteCarloService: Received montecarlo:run event');
      try {
        await this.runAnalysis(data);
      } catch (error) {
        console.error('❌ MonteCarloService: Analysis failed:', error);
        this.eventBus.emit('montecarlo:error', { 
          error: error.message, 
          data 
        });
      }
    });

    // Listen for cancellation requests
    this.eventBus.on('montecarlo:cancel', () => {
      this.cancelAnalysis();
    });
  }

  /**
   * Run Monte Carlo analysis
   * @param {Object} data - Analysis configuration
   * @param {Object} data.scenarioData - Base scenario to analyze
   * @param {Object} data.config - Monte Carlo configuration
   * @param {Object} data.variableRanges - Ranges for random variables
   * @param {Object} data.context - Additional context
   */
  async runAnalysis(data) {
    const { scenarioData, config = {}, variableRanges = {}, context = {} } = data;
    
    // Merge with defaults
    const analysisConfig = { ...this.defaultConfig, ...config };
    
    // Apply performance safeguards
    if (analysisConfig.iterations > analysisConfig.maxIterations) {
      console.warn(`🎲 MonteCarloService: Iterations capped at ${analysisConfig.maxIterations} for performance`);
      analysisConfig.iterations = analysisConfig.maxIterations;
    }
    
    console.log(`🎲 MonteCarloService: Starting analysis with ${analysisConfig.iterations} iterations`);
    
    this.isRunning = true;
    this.currentAnalysis = {
      startTime: Date.now(),
      iterations: analysisConfig.iterations,
      completed: 0,
      results: []
    };

    // Emit start event
    this.eventBus.emit('montecarlo:started', {
      scenarioData,
      config: analysisConfig,
      variableRanges,
      context
    });

    try {
      // Initialize random number generator
      const rng = this.createRandomGenerator(analysisConfig.randomSeed);
      
      // Run simulations in batches for better performance and progress updates
      const batchSize = Math.ceil(analysisConfig.iterations / analysisConfig.parallelBatches);
      const results = [];
      
      for (let batch = 0; batch < analysisConfig.parallelBatches && this.isRunning; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, analysisConfig.iterations);
        
        console.log(`🎲 MonteCarloService: Processing batch ${batch + 1}/${analysisConfig.parallelBatches} (iterations ${batchStart}-${batchEnd})`);
        
        const batchResults = await this.runSimulationBatch(
          scenarioData,
          variableRanges,
          batchStart,
          batchEnd,
          rng,
          analysisConfig
        );
        
        console.log(`🔍 MonteCarloService: Batch ${batch + 1} completed with ${batchResults.length} results`);
        console.log(`🔍 MonteCarloService: Sample batch result:`, batchResults[0]);
        
        results.push(...batchResults);
        this.currentAnalysis.completed = results.length;
        
        console.log(`🔍 MonteCarloService: Total results so far: ${results.length}`);
        
        // Emit progress update
        this.eventBus.emit('montecarlo:progress', {
          completed: this.currentAnalysis.completed,
          total: analysisConfig.iterations,
          percentage: Math.round((this.currentAnalysis.completed / analysisConfig.iterations) * 100)
        });
      }

      if (!this.isRunning) {
        this.eventBus.emit('montecarlo:cancelled', {});
        return;
      }

      // Analyze results
      console.log('🎲 MonteCarloService: Analyzing results...');
      const analysis = this.analyzeResults(results, analysisConfig, scenarioData, context);
      
      // Store results
      this.currentAnalysis.results = results;
      this.currentAnalysis.analysis = analysis;
      this.currentAnalysis.endTime = Date.now();
      
      console.log('✅ MonteCarloService: Analysis completed');
      
      // Emit completion event
      this.eventBus.emit('montecarlo:completed', {
        results,
        analysis,
        scenarioData,
        config: analysisConfig,
        context,
        duration: this.currentAnalysis.endTime - this.currentAnalysis.startTime
      });
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a batch of simulations
   */
  async runSimulationBatch(scenarioData, variableRanges, startIndex, endIndex, rng, config) {
    const results = [];
    
    for (let i = startIndex; i < endIndex && this.isRunning; i++) {
      // Generate random scenario variation
      const randomScenario = this.generateRandomScenario(scenarioData, variableRanges, rng);
      
      // Run single simulation via event bus
      const result = await this.runSingleSimulation(randomScenario, i);
      
      if (result) {
        results.push({
          iteration: i,
          scenario: randomScenario,
          result: result,
          timestamp: Date.now()
        });
      }
      
      // Add delay to prevent browser freeze
      if (config.simulationDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.simulationDelay));
      }
      
      // Progress update
      if (i % config.progressUpdateInterval === 0) {
        this.eventBus.emit('montecarlo:progress', {
          completed: results.length + startIndex,
          total: config.iterations,
          percentage: Math.round(((results.length + startIndex) / config.iterations) * 100)
        });
      }
    }
    
    return results;
  }

  /**
   * Run a single simulation using the proper event bus architecture
   * MUST follow architectural rule: all data flows through event bus
   * FIXED: Uses unique simulation IDs to prevent event listener collision
   */
  async runSingleSimulation(scenarioData, iteration) {
    return new Promise((resolve, reject) => {
      // Create unique simulation ID to avoid event collision
      const simulationId = `mc-${iteration}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Monte Carlo simulation ${iteration} timed out`));
      }, 30000);

      console.log(`🔍 MonteCarloService: Running simulation ${iteration} with ID ${simulationId}`);

      // Use unique event names to avoid collision
      const completeEvent = `simulation:completed:${simulationId}`;
      const errorEvent = `simulation:error:${simulationId}`;

      const handleComplete = (data) => {
        clearTimeout(timeout);
        this.eventBus.off(completeEvent, handleComplete);
        this.eventBus.off(errorEvent, handleError);
        
        console.log(`🔍 MonteCarloService: Simulation ${iteration} completed via event bus:`, {
          hasResults: !!(data && data.results),
          resultsLength: (data && data.results) ? data.results.length : 0
        });
        
        resolve(data);
      };

      const handleError = (data) => {
        clearTimeout(timeout);
        this.eventBus.off(completeEvent, handleComplete);
        this.eventBus.off(errorEvent, handleError);
        reject(new Error(`Simulation ${iteration} failed: ${data.error}`));
      };

      // Set up listeners for unique events
      this.eventBus.on(completeEvent, handleComplete);
      this.eventBus.on(errorEvent, handleError);

      // Include simulation ID in the scenario data
      this.eventBus.emit('simulation:run', { 
        ...scenarioData, 
        _simulationId: simulationId 
      });
    });
  }

  /**
   * Generate a random scenario variation based on variable ranges
   */
  generateRandomScenario(baseScenario, variableRanges, rng) {
    const randomScenario = JSON.parse(JSON.stringify(baseScenario)); // Deep clone
    
    // Apply random variations based on variable ranges
    for (const [path, range] of Object.entries(variableRanges)) {
      const value = this.generateRandomValue(range, rng);
      this.setNestedProperty(randomScenario, path, value);
    }
    
    return randomScenario;
  }

  /**
   * Generate a random value based on distribution specification
   */
  generateRandomValue(range, rng) {
    const { type, ...params } = range;
    
    switch (type) {
      case 'normal':
        return this.normalRandom(params.mean, params.stdDev, rng);
      case 'uniform':
        return this.uniformRandom(params.min, params.max, rng);
      case 'lognormal':
        return this.lognormalRandom(params.mean, params.stdDev, rng);
      case 'triangular':
        return this.triangularRandom(params.min, params.mode, params.max, rng);
      default:
        throw new Error(`Unknown distribution type: ${type}`);
    }
  }

  /**
   * Analyze Monte Carlo results and generate statistics
   */
  analyzeResults(results, config, scenarioData, context) {
    console.log(`🎲 MonteCarloService: Analyzing ${results.length} results`);
    console.log('🔍 MonteCarloService: First result sample:', results[0]);
    
    // Extract key metrics from each result
    const metrics = this.extractMetrics(results);
    console.log('🔍 MonteCarloService: Extracted metrics:', metrics);
    
    // Calculate statistics for each metric
    const statistics = {};
    for (const [metricName, values] of Object.entries(metrics)) {
      console.log(`🔍 MonteCarloService: Calculating statistics for ${metricName}:`, values);
      statistics[metricName] = this.calculateStatistics(values, config.confidenceIntervals);
    }
    
    // Generate insights
    const insights = this.generateInsights(statistics, results, scenarioData);
    
    return {
      statistics,
      insights,
      rawMetrics: metrics,
      successRate: this.calculateSuccessRate(results),
      riskMetrics: this.calculateRiskMetrics(results),
      metadata: {
        iterations: results.length,
        scenarioName: scenarioData.name || 'Unnamed Scenario',
        analysisDate: new Date().toISOString(),
        config
      }
    };
  }

  /**
   * Extract key metrics from simulation results
   */
  extractMetrics(results) {
    console.log('🔍 MonteCarloService: Extracting metrics from', results.length, 'results');
    
    const metrics = {
      finalBalance: [],
      shortfallMonths: [],
      maxDrawdown: [],
      timeToDepletion: [],
      totalWithdrawals: []
    };
    
    results.forEach(({ result }, index) => {
      console.log(`🔍 MonteCarloService: Processing result ${index}:`, result);
      console.log(`🔍 MonteCarloService: Result structure for ${index}:`, {
        hasResult: !!result,
        hasResultResults: !!(result && result.results),
        resultKeys: result ? Object.keys(result) : 'no result',
        resultResultsKeys: (result && result.results) ? Object.keys(result.results) : 'no result.results'
      });
      
      if (result && result.results) {
        // The SimulationService wraps timeaware engine results in result.results
        // The actual monthly array is in result.results.results (from timeaware engine)
        const timeawareResults = result.results.results; // This is the monthly array
        console.log(`🔍 MonteCarloService: Timeaware results for ${index}:`, timeawareResults ? `Array of ${timeawareResults.length} items` : 'null/undefined');
        console.log(`🔍 MonteCarloService: First timeaware result sample:`, timeawareResults ? timeawareResults[0] : 'none');
        
        // Calculate total balance from all assets at the end
        let finalBalance = 0;
        if (timeawareResults && Array.isArray(timeawareResults)) {
          const lastMonth = timeawareResults[timeawareResults.length - 1];
          console.log(`🔍 MonteCarloService: Last month for ${index}:`, lastMonth);
          if (lastMonth && lastMonth.assets) {
            finalBalance = Object.values(lastMonth.assets).reduce((sum, balance) => sum + balance, 0);
            console.log(`🔍 MonteCarloService: Final balance for ${index}:`, finalBalance);
          }
        }
        
        // Extract other metrics from the simulation wrapper
        const shortfallMonths = result.results.shortfallMonths || 0;
        const totalWithdrawals = result.results.totalWithdrawals || 0;
        
        metrics.finalBalance.push(finalBalance);
        metrics.shortfallMonths.push(shortfallMonths);
        metrics.maxDrawdown.push(this.calculateMaxDrawdownFromResults(timeawareResults));
        metrics.timeToDepletion.push(this.calculateTimeToDepletionFromResults(timeawareResults));
        metrics.totalWithdrawals.push(totalWithdrawals);
      }
    });
    
    return metrics;
  }

  /**
   * Calculate statistics for a set of values
   */
  calculateStatistics(values, confidenceIntervals) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    const stats = {
      mean: mean,
      median: this.percentile(sorted, 50),
      stdDev: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n),
      min: sorted[0],
      max: sorted[n - 1],
      percentiles: {}
    };
    
    // Calculate confidence intervals
    confidenceIntervals.forEach(p => {
      stats.percentiles[p] = this.percentile(sorted, p);
    });
    
    return stats;
  }

  /**
   * Calculate percentile from sorted array
   */
  percentile(sortedArray, p) {
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Generate insights from statistical analysis
   */
  generateInsights(statistics, results, scenarioData) {
    const insights = [];
    
    // Success rate insight
    const successRate = this.calculateSuccessRate(results);
    insights.push({
      type: 'success_rate',
      title: 'Probability of Success',
      value: successRate,
      description: `${(successRate * 100).toFixed(1)}% of scenarios maintained positive balances throughout retirement`,
      severity: successRate > 0.8 ? 'good' : successRate > 0.6 ? 'warning' : 'critical'
    });
    
    // Final balance insights
    const finalBalanceStats = statistics.finalBalance;
    if (finalBalanceStats) {
      insights.push({
        type: 'final_balance',
        title: 'Final Balance Range',
        value: {
          median: finalBalanceStats.median,
          range: [finalBalanceStats.percentiles[10], finalBalanceStats.percentiles[90]]
        },
        description: `50% of scenarios end with $${(finalBalanceStats.median / 1000).toFixed(0)}K, with 80% falling between $${(finalBalanceStats.percentiles[10] / 1000).toFixed(0)}K and $${(finalBalanceStats.percentiles[90] / 1000).toFixed(0)}K`,
        severity: finalBalanceStats.percentiles[10] > 0 ? 'good' : 'warning'
      });
    }
    
    return insights;
  }

  /**
   * Calculate success rate (scenarios that never went negative)
   */
  calculateSuccessRate(results) {
    const successful = results.filter(({ result }) => {
      if (!result || !result.results) return false;
      
      const simulationResults = result.results.results || result.results;
      if (!simulationResults || !Array.isArray(simulationResults)) return false;
      
      // Check if total balance never went negative
      return simulationResults.every(month => {
        if (month && month.assets) {
          const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
          return totalBalance >= 0;
        }
        return false;
      });
    });
    
    return successful.length / results.length;
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(results) {
    // Implementation for various risk metrics
    return {
      valueAtRisk: this.calculateVaR(results),
      conditionalVaR: this.calculateCVaR(results),
      maxDrawdown: this.calculateMaxDrawdownStats(results)
    };
  }

  /**
   * Calculate maximum drawdown for a balance history
   */
  calculateMaxDrawdown(balanceHistory) {
    if (!balanceHistory || balanceHistory.length === 0) return 0;
    
    let maxBalance = balanceHistory[0].totalBalance;
    let maxDrawdown = 0;
    
    balanceHistory.forEach(month => {
      maxBalance = Math.max(maxBalance, month.totalBalance);
      const drawdown = (maxBalance - month.totalBalance) / maxBalance;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    return maxDrawdown;
  }

  /**
   * Calculate maximum drawdown from simulation results array
   */
  calculateMaxDrawdownFromResults(simulationResults) {
    if (!simulationResults || !Array.isArray(simulationResults)) return 0;
    
    // Calculate total balance for each month
    const totalBalances = simulationResults.map(month => {
      if (month && month.assets) {
        return Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
      }
      return 0;
    });
    
    if (totalBalances.length === 0) return 0;
    
    let maxBalance = totalBalances[0];
    let maxDrawdown = 0;
    
    totalBalances.forEach(balance => {
      maxBalance = Math.max(maxBalance, balance);
      const drawdown = maxBalance > 0 ? (maxBalance - balance) / maxBalance : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    return maxDrawdown;
  }

  /**
   * Calculate time to depletion
   */
  calculateTimeToDepletion(balanceHistory) {
    if (!balanceHistory || balanceHistory.length === 0) return null;
    
    const depletionMonth = balanceHistory.findIndex(month => month.totalBalance <= 0);
    return depletionMonth === -1 ? null : depletionMonth;
  }

  /**
   * Calculate time to depletion from simulation results array
   */
  calculateTimeToDepletionFromResults(simulationResults) {
    if (!simulationResults || !Array.isArray(simulationResults)) return null;
    
    const depletionMonth = simulationResults.findIndex(month => {
      if (month && month.assets) {
        const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
        return totalBalance <= 0;
      }
      return false;
    });
    
    return depletionMonth === -1 ? null : depletionMonth;
  }

  /**
   * Create a seeded random number generator for reproducible results
   */
  createRandomGenerator(seed) {
    if (seed === null || seed === undefined) {
      return Math.random;
    }
    
    // Simple seeded PRNG (Mulberry32)
    let state = seed;
    return function() {
      let t = state += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Generate normal random number using Box-Muller transform
   */
  normalRandom(mean, stdDev, rng) {
    const u1 = rng();
    const u2 = rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Generate uniform random number
   */
  uniformRandom(min, max, rng) {
    return min + (max - min) * rng();
  }

  /**
   * Generate lognormal random number
   */
  lognormalRandom(mean, stdDev, rng) {
    const normal = this.normalRandom(Math.log(mean) - 0.5 * stdDev * stdDev, stdDev, rng);
    return Math.exp(normal);
  }

  /**
   * Generate triangular random number
   */
  triangularRandom(min, mode, max, rng) {
    const u = rng();
    const c = (mode - min) / (max - min);
    
    if (u < c) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /**
   * Set nested property using dot notation path
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Cancel running analysis
   */
  cancelAnalysis() {
    if (this.isRunning) {
      console.log('🛑 MonteCarloService: Cancelling analysis...');
      this.isRunning = false;
    }
  }

  /**
   * Get current analysis status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentAnalysis: this.currentAnalysis
    };
  }

  // Additional helper methods for risk calculations
  calculateVaR(results, confidenceLevel = 0.05) {
    // Value at Risk calculation
    const finalBalances = results.map(r => {
      if (!r.result || !r.result.results) return 0;
      
      const simulationResults = r.result.results.results || r.result.results;
      if (!Array.isArray(simulationResults) || simulationResults.length === 0) return 0;
      
      // Get final month's total balance
      const finalMonth = simulationResults[simulationResults.length - 1];
      if (finalMonth && finalMonth.assets) {
        return Object.values(finalMonth.assets).reduce((sum, balance) => sum + balance, 0);
      }
      return 0;
    });
    
    const sorted = finalBalances.sort((a, b) => a - b);
    const index = Math.floor(confidenceLevel * sorted.length);
    return sorted[index];
  }

  calculateCVaR(results, confidenceLevel = 0.05) {
    // Conditional Value at Risk (Expected Shortfall)
    const finalBalances = results.map(r => {
      if (!r.result || !r.result.results) return 0;
      
      const simulationResults = r.result.results.results || r.result.results;
      if (!Array.isArray(simulationResults) || simulationResults.length === 0) return 0;
      
      // Get final month's total balance
      const finalMonth = simulationResults[simulationResults.length - 1];
      if (finalMonth && finalMonth.assets) {
        return Object.values(finalMonth.assets).reduce((sum, balance) => sum + balance, 0);
      }
      return 0;
    });
    
    const sorted = finalBalances.sort((a, b) => a - b);
    const cutoff = Math.floor(confidenceLevel * sorted.length);
    const tail = sorted.slice(0, cutoff);
    return tail.reduce((sum, val) => sum + val, 0) / tail.length;
  }

  calculateMaxDrawdownStats(results) {
    const drawdowns = results.map(({ result }) => {
      if (!result || !result.results) return 0;
      
      const simulationResults = result.results.results || result.results;
      if (!Array.isArray(simulationResults)) return 0;
      
      return this.calculateMaxDrawdownFromResults(simulationResults);
    });
    
    return this.calculateStatistics(drawdowns, [10, 25, 50, 75, 90, 95, 99]);
  }
}
