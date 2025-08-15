/**
 * Monte Carlo Service - Statistical analysis for retirement scenarios
 * Provides probabilistic modeling and risk analysis capabilities
 */
export class MonteCarloService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isRunning = false;
    this.currentAnalysis = null;
    this.returnSequences = new Map(); // Store return sequences by simulation ID
    
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
      const randomScenario = this.generateRandomScenario(scenarioData, variableRanges, rng, config);
      
      // Run single simulation via event bus
      const result = await this.runSingleSimulation(randomScenario, i);
      
      if (result) {
        // Calculate metrics for this individual simulation
        const success = this.calculateIndividualSuccess(result, randomScenario, config);
        const survivalTime = this.calculateIndividualSurvivalTime(result);
        const finalBalance = this.calculateIndividualFinalBalance(result);
        
        results.push({
          iteration: i,
          scenario: randomScenario,
          result: result,
          success: success,
          survivalTime: survivalTime, // in months
          finalBalance: finalBalance,
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

      // Listen for return sequences generated for this simulation
      const returnSequenceHandler = (data) => {
        if (data.simulationId === simulationId) {
          this.returnSequences.set(simulationId, data.returns);
          console.log(`📈 MonteCarloService: Captured return sequence for simulation ${iteration}`);
        }
      };
      this.eventBus.on('returnmodel:returns-generated', returnSequenceHandler);

      // Use unique event names to avoid collision
      const completeEvent = `simulation:completed:${simulationId}`;
      const errorEvent = `simulation:error:${simulationId}`;

      const handleComplete = (data) => {
        clearTimeout(timeout);
        this.eventBus.off(completeEvent, handleComplete);
        this.eventBus.off(errorEvent, handleError);
        this.eventBus.off('returnmodel:returns-generated', returnSequenceHandler);
        
        console.log(`🔍 MonteCarloService: Simulation ${iteration} completed via event bus:`, {
          hasResults: !!(data && data.results),
          resultsLength: (data && data.results) ? data.results.length : 0,
          hasReturnSequence: this.returnSequences.has(simulationId)
        });
        
        // Attach return sequence to result if available
        if (this.returnSequences.has(simulationId)) {
          data.returnSequence = this.returnSequences.get(simulationId);
        }
        
        resolve(data);
      };

      const handleError = (data) => {
        clearTimeout(timeout);
        this.eventBus.off(completeEvent, handleComplete);
        this.eventBus.off(errorEvent, handleError);
        this.eventBus.off('returnmodel:returns-generated', returnSequenceHandler);
        reject(new Error(`Simulation ${iteration} failed: ${data.error}`));
      };

      // Set up listeners for unique events
      this.eventBus.on(completeEvent, handleComplete);
      this.eventBus.on(errorEvent, handleError);

      // Include simulation ID and Monte Carlo context in the scenario data
      this.eventBus.emit('simulation:run', { 
        ...scenarioData, 
        _simulationId: simulationId,
        _context: { isMonteCarlo: true }
      });
    });
  }

  /**
   * Generate a random scenario variation based on variable ranges
   */
  generateRandomScenario(baseScenario, variableRanges, rng, config) {
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
    
    // Generate insights with target survival time
    const targetMonths = config.targetSurvivalMonths ?? 300; // Use user-specified target (default 25 years)
    const successRateData = this.calculateSuccessRate(results, targetMonths);
    const insights = this.generateInsights(statistics, results, scenarioData, config);
    
    const survivalStats = this.calculateSurvivalStatistics(results);
    
    // Identify key percentile scenarios and their return sequences
    const keyScenarios = this.identifyKeyPercentileScenarios(results, metrics);
    
    return {
      statistics,
      insights,
      rawMetrics: metrics,
      successRate: successRateData.rate,
      successRateData: successRateData, // Include full success rate info
      survivalStatistics: survivalStats,
      riskMetrics: this.calculateRiskMetrics(results),
      keyScenarios: keyScenarios, // Include key percentile scenarios with return sequences
      metadata: {
        iterations: results.length,
        timestamp: Date.now(),
        scenarioId: scenarioData.metadata?.title || 'Unknown',
        targetSurvivalMonths: targetMonths
      }
    };
  }

  /**
   * Identify key percentile scenarios and extract their return sequences
   */
  identifyKeyPercentileScenarios(results, metrics) {
    const keyScenarios = {};
    
    // Use final balance as the primary metric for percentile identification
    const finalBalances = metrics.finalBalance;
    if (!finalBalances || finalBalances.length === 0) {
      console.warn('🔍 MonteCarloService: No final balances available for percentile analysis');
      return keyScenarios;
    }
    
    // Create array of results with their indices and final balances
    const resultsWithBalances = results.map((result, index) => ({
      index,
      result,
      finalBalance: finalBalances[index] || 0,
      returnSequence: result.returnSequence
    })).filter(item => item.returnSequence); // Only include results with return sequences
    
    if (resultsWithBalances.length === 0) {
      console.warn('🔍 MonteCarloService: No results with return sequences available');
      return keyScenarios;
    }
    
    // Sort by final balance
    resultsWithBalances.sort((a, b) => a.finalBalance - b.finalBalance);
    
    // Identify key percentile scenarios
    const percentiles = {
      worst: 0,      // 0th percentile (worst case)
      p10: 10,       // 10th percentile
      p25: 25,       // 25th percentile
      median: 50,    // 50th percentile (median)
      p75: 75,       // 75th percentile
      p90: 90,       // 90th percentile
      best: 100      // 100th percentile (best case)
    };
    
    for (const [label, percentile] of Object.entries(percentiles)) {
      let index;
      if (percentile === 0) {
        index = 0; // Worst case
      } else if (percentile === 100) {
        index = resultsWithBalances.length - 1; // Best case
      } else {
        index = Math.floor((percentile / 100) * (resultsWithBalances.length - 1));
      }
      
      const scenario = resultsWithBalances[index];
      if (scenario && scenario.returnSequence) {
        keyScenarios[label] = {
          percentile,
          finalBalance: scenario.finalBalance,
          simulationIndex: scenario.index,
          returnSequence: scenario.returnSequence,
          description: this.getPercentileDescription(label, percentile)
        };
        
        console.log(`📈 MonteCarloService: Identified ${label} scenario (P${percentile}) with final balance $${scenario.finalBalance.toLocaleString()}`);
      }
    }
    
    return keyScenarios;
  }
  
  /**
   * Get description for percentile scenarios
   */
  getPercentileDescription(label, percentile) {
    const descriptions = {
      worst: 'Worst-case scenario with lowest final balance',
      p10: '10th percentile - only 10% of scenarios performed worse',
      p25: '25th percentile - only 25% of scenarios performed worse', 
      median: 'Median scenario - 50% of scenarios performed better/worse',
      p75: '75th percentile - only 25% of scenarios performed better',
      p90: '90th percentile - only 10% of scenarios performed better',
      best: 'Best-case scenario with highest final balance'
    };
    
    return descriptions[label] || `${percentile}th percentile scenario`;
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
      if (index < 3) { // Only log first 3 results to avoid console spam
        console.log(`🔍 MonteCarloService: Processing result ${index}`);
      }
      
      if (result && result.results) {
        // The SimulationService wraps timeaware engine results in result.results
        // The actual monthly array is in result.results.results (from timeaware engine)
        const timeawareResults = result.results.results; // This is the monthly array
        
        // Calculate total balance from all assets at the end
        let finalBalance = 0;
        if (timeawareResults && Array.isArray(timeawareResults)) {
          const lastMonth = timeawareResults[timeawareResults.length - 1];
          if (lastMonth && lastMonth.assets) {
            finalBalance = Object.values(lastMonth.assets).reduce((sum, balance) => sum + balance, 0);
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
  generateInsights(statistics, results, scenarioData, config) {
    const insights = [];
    
    // Survival time insights - more meaningful for retirement planning
    const survivalStats = this.calculateSurvivalStatistics(results);
    const medianYears = (survivalStats.median / 12).toFixed(1);
    const p25Years = (survivalStats.p25 / 12).toFixed(1);
    const p75Years = (survivalStats.p75 / 12).toFixed(1);
    
    insights.push({
      type: 'survival_time',
      title: 'How Long Will Your Money Last?',
      value: survivalStats.median,
      description: `Median survival: ${medianYears} years. In the worst 25% of cases, money lasts ${p25Years} years or less. In 75% of cases, money lasts ${p75Years} years or less.`,
      severity: survivalStats.median >= 300 ? 'good' : survivalStats.median >= 180 ? 'warning' : 'critical'
    });
    
    // Success rate for user-specified target
    const targetMonths = config.targetSurvivalMonths ?? 300;
    console.log(`🎲 MonteCarloService: RECEIVED CONFIG:`, JSON.stringify(config, null, 2));
    console.log(`🎲 MonteCarloService: Using target months: ${targetMonths} (${(targetMonths/12).toFixed(1)} years)`);
    const successRateData = this.calculateSuccessRate(results, targetMonths);
    insights.push({
      type: 'target_success_rate',
      title: `${successRateData.targetYears}-Year Success Rate`,
      value: successRateData.rate,
      description: `${(successRateData.rate * 100).toFixed(1)}% of scenarios lasted at least ${successRateData.targetYears} years`,
      severity: successRateData.rate > 0.8 ? 'good' : successRateData.rate > 0.6 ? 'warning' : 'critical'
    });

    // Target success rate insight - show how long money lasts at user's desired confidence level
    const targetSuccessRate = config.targetSuccessRate ?? 0.80;
    const targetPercentile = (1 - targetSuccessRate) * 100; // 80% success = 20th percentile
    const targetSurvivalTime = this.percentile(survivalStats.survivalTimes.sort((a, b) => a - b), targetPercentile);
    const targetSurvivalYears = (targetSurvivalTime / 12).toFixed(1);
    
    insights.push({
      type: 'target_percentile_survival',
      title: `${(targetSuccessRate * 100).toFixed(0)}% Confidence Level`,
      value: targetSurvivalTime,
      description: `At your ${(targetSuccessRate * 100).toFixed(0)}% confidence level, money will last at least ${targetSurvivalYears} years`,
      severity: targetSurvivalTime >= targetMonths ? 'good' : targetSurvivalTime >= (targetMonths * 0.8) ? 'warning' : 'critical'
    });
    
    // Final balance insights
    const finalBalanceStats = statistics.finalBalance;
    if (finalBalanceStats) {
      // Get final balances from all results
      const validFinalBalances = results
        .map(result => {
          if (!result || !result.result || !result.result.results) return null;
          const timeawareResults = result.result.results.results;
          if (!timeawareResults || !Array.isArray(timeawareResults) || timeawareResults.length === 0) return null;
          
          const lastMonth = timeawareResults[timeawareResults.length - 1];
          let finalBalance = 0;
          if (lastMonth && lastMonth.assets) {
            finalBalance = Object.values(lastMonth.assets).reduce((sum, balance) => sum + balance, 0);
          }
          
          return finalBalance;
        })
        .filter(balance => balance !== null);
      
      console.log(`🔍 Final Balance Filter: validFinalBalances.length=${validFinalBalances.length}, total results=${results.length}`);
      console.log(`🔍 Sample valid final balances:`, validFinalBalances.slice(0, 5));
      
      if (validFinalBalances.length > 0) {
        const validStats = this.calculateStatistics(validFinalBalances, config.confidenceIntervals);
        
        insights.push({
          type: 'final_balance',
          title: 'Final Balance Range',
          value: {
            median: validStats.median,
            range: [validStats.percentiles[10], validStats.percentiles[90]]
          },
          description: `50% of scenarios meeting minimum balance criteria end with $${(validStats.median / 1000).toFixed(0)}K, with 80% falling between $${(validStats.percentiles[10] / 1000).toFixed(0)}K and $${(validStats.percentiles[90] / 1000).toFixed(0)}K`,
          severity: validStats.percentiles[10] > 0 ? 'good' : 'warning'
        });
      }
    }
    
    return insights;
  }

  /**
   * Calculate survival time statistics for retirement planning
   */
  calculateSurvivalStatistics(results) {
    const survivalTimes = results.map(({ result }) => {
      if (!result || !result.results) return 0;
      
      const simulationResults = result.results.results || result.results;
      if (!simulationResults || !Array.isArray(simulationResults)) return 0;
      
      // Find when shortfall occurs (total balance goes to zero or negative)
      for (let monthIndex = 0; monthIndex < simulationResults.length; monthIndex++) {
        const month = simulationResults[monthIndex];
        if (month && month.assets) {
          const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
          if (totalBalance <= 0) {
            return monthIndex; // Shortfall occurred at this month
          }
        }
      }
      
      // If we made it through all months without shortfall
      return simulationResults.length;
    });
    
    // Sort survival times for percentile calculations
    const sortedTimes = [...survivalTimes].sort((a, b) => a - b);
    
    return {
      survivalTimes,
      median: this.percentile(sortedTimes, 50),
      p25: this.percentile(sortedTimes, 25),
      p75: this.percentile(sortedTimes, 75),
      p10: this.percentile(sortedTimes, 10),
      p90: this.percentile(sortedTimes, 90),
      min: Math.min(...survivalTimes),
      max: Math.max(...survivalTimes),
      mean: survivalTimes.reduce((sum, time) => sum + time, 0) / survivalTimes.length
    };
  }

  /**
   * Calculate success for an individual simulation result
   */
  calculateIndividualSuccess(result, scenarioData, config) {
    if (!result || !result.results) return false;
    
    const timeawareResults = result.results.results;
    if (!timeawareResults || !Array.isArray(timeawareResults) || timeawareResults.length === 0) return false;
    
    const targetMonths = config.targetSurvivalMonths ?? 300;
    const survivalTime = timeawareResults.length;
    
    // Check if scenario meets target survival time
    if (survivalTime < targetMonths) return false;
    
    // Get scenario data to check min_balance requirements
    if (!scenarioData || !scenarioData.assets) return true; // No min_balance requirements
    
    // Check asset-level min_balance requirements using balanceHistory (more reliable)
    if (result.results.balanceHistory) {
      for (const assetConfig of scenarioData.assets) {
        if (assetConfig.min_balance !== undefined && assetConfig.min_balance > 0) {
          const assetHistory = result.results.balanceHistory[assetConfig.name];
          if (!assetHistory || !Array.isArray(assetHistory) || assetHistory.length === 0) {
            console.log(`❌ FAILED - No balance history for ${assetConfig.name}`);
            return false;
          }
          
          const finalBalance = assetHistory[assetHistory.length - 1];
          const numBalance = typeof finalBalance === 'string' ? parseFloat(finalBalance) : finalBalance;
          const actualBalance = isNaN(numBalance) ? 0 : numBalance;
          
          console.log(`🔍 Success check - Asset: ${assetConfig.name}, Final: ${actualBalance}, Required: ${assetConfig.min_balance}, Meets: ${actualBalance >= assetConfig.min_balance}`);
          if (actualBalance < assetConfig.min_balance) {
            console.log(`❌ FAILED min_balance requirement for ${assetConfig.name}`);
            return false;
          }
        }
      }
      console.log(`✅ SUCCESS - All requirements met`);
      return true;
    }
    
    // Fallback to timeaware results (less reliable)
    const lastMonth = timeawareResults[timeawareResults.length - 1];
    if (!lastMonth || !lastMonth.assets) return false;
    
    for (const assetConfig of scenarioData.assets) {
      if (assetConfig.min_balance !== undefined && assetConfig.min_balance > 0) {
        const finalBalance = lastMonth.assets[assetConfig.name] || 0;
        console.log(`🔍 Success check - Asset: ${assetConfig.name}, Final: ${finalBalance}, Required: ${assetConfig.min_balance}, Meets: ${finalBalance >= assetConfig.min_balance}`);
        if (finalBalance < assetConfig.min_balance) {
          console.log(`❌ FAILED min_balance requirement for ${assetConfig.name}`);
          return false;
        }
      }
    }
    
    console.log(`✅ SUCCESS - All requirements met`);
    return true;
  }

  /**
   * Calculate survival time for an individual simulation result
   */
  calculateIndividualSurvivalTime(result) {
    if (!result || !result.results) return 0;
    
    const timeawareResults = result.results.results;
    if (!timeawareResults || !Array.isArray(timeawareResults)) return 0;
    
    // Find when shortfall occurs (total balance goes to zero or negative)
    const depletionMonth = timeawareResults.findIndex(month => {
      if (month && month.assets) {
        const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
        return totalBalance <= 0;
      }
      return false;
    });
    
    return depletionMonth === -1 ? timeawareResults.length : depletionMonth;
  }

  /**
   * Calculate final balance for an individual simulation result
   */
  calculateIndividualFinalBalance(result) {
    if (!result || !result.results) return 0;
    
    // Try to get final balance from balanceHistory (more reliable)
    if (result.results.balanceHistory) {
      let finalBalance = 0;
      for (const [assetName, history] of Object.entries(result.results.balanceHistory)) {
        if (Array.isArray(history) && history.length > 0) {
          const lastBalance = history[history.length - 1];
          const numBalance = typeof lastBalance === 'string' ? parseFloat(lastBalance) : lastBalance;
          finalBalance += isNaN(numBalance) ? 0 : numBalance;
        }
      }
      return finalBalance;
    }
    
    // Fallback to timeaware results (less reliable due to missing assets property)
    const timeawareResults = result.results.results;
    if (!timeawareResults || !Array.isArray(timeawareResults) || timeawareResults.length === 0) return 0;
    
    const lastMonth = timeawareResults[timeawareResults.length - 1];
    if (!lastMonth || !lastMonth.assets) return 0;
    
    return Object.values(lastMonth.assets).reduce((sum, balance) => {
      const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
      return sum + (isNaN(numBalance) ? 0 : numBalance);
    }, 0);
  }

  /**
   * Calculate success rate for a given target survival time 
   */
  calculateSuccessRate(results, targetMonths) {
    // Simply count the pre-calculated success flags
    const successfulScenarios = results.filter(result => result.success === true);
    
    return {
      rate: successfulScenarios.length / results.length,
      targetMonths: targetMonths || 300,
      targetYears: ((targetMonths || 300) / 12).toFixed(1)
    };
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
