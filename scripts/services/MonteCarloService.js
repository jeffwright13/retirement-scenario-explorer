import { RateScheduleManager } from '../rate-schedules.js';

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
   * @param {Array} data.marketDependentAssets - Assets to randomize, from
   *   MonteCarloController.getMarketDependentAssetConfig()
   * @param {Object} data.context - Additional context
   */
  async runAnalysis(data) {
    const { scenarioData, config = {}, marketDependentAssets = [], context = {} } = data;
    
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
      marketDependentAssets,
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
          marketDependentAssets,
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
  async runSimulationBatch(scenarioData, marketDependentAssets, startIndex, endIndex, rng, config) {
    const results = [];

    for (let i = startIndex; i < endIndex && this.isRunning; i++) {
      // Generate random scenario variation
      const { scenario: randomScenario, returnSequence } = this.generateRandomScenario(scenarioData, marketDependentAssets, rng);

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
          returnSequence, // the actual per-type monthly rates applied this trial
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

      // Include simulation ID and Monte Carlo context in the scenario data
      this.eventBus.emit('simulation:run', { 
        ...scenarioData, 
        _simulationId: simulationId,
        _context: { isMonteCarlo: true }
      });
    });
  }

  /**
   * Generate a random scenario variation for one Monte Carlo trial.
   *
   * Draws one shared per-month noise sequence per investment_type (so
   * same-type assets move together within a trial -- real correlation, not
   * independent per-asset draws). Layers that noise ADDITIVELY on top of
   * each asset's own real configured rate (evaluated per month via a
   * RateScheduleManager loaded with the scenario's ORIGINAL,
   * pre-randomization schedules, so fixed/sequence/map/pipeline schedules
   * are all honored correctly rather than needing a single baseline-mean
   * fallback). See ISSUES.md #19.
   *
   * IMPORTANT: `rate_schedules[x].values[m]` must be an ANNUAL rate, same as
   * every other schedule type -- the engine's getAssetReturns() divides
   * whatever getRate() returns by 12 unconditionally, for every schedule
   * type. So the noise is drawn at annual scale (stdDev·√12) rather than
   * monthly scale (stdDev/√12): after the engine's own /12, that produces
   * the correct effective monthly-noise stdDev of stdDev/√12, which is what
   * gives annual dispersion the correct √T·σ scaling instead of the T·σ
   * blowup a single constant-per-trial draw produced.
   *
   * @param {Object} baseScenario - Scenario to randomize
   * @param {Array} marketDependentAssets - From MonteCarloController.getMarketDependentAssetConfig()
   * @param {Function} rng - Seeded random generator
   * @returns {{scenario: Object, returnSequence: Object}} randomized scenario
   *   and its per-investment-type annual-compounded return sequence (for
   *   export/display -- reflects exactly what was simulated)
   */
  generateRandomScenario(baseScenario, marketDependentAssets, rng) {
    const randomScenario = JSON.parse(JSON.stringify(baseScenario)); // Deep clone
    const durationMonths = baseScenario.plan?.duration_months || 0;
    const returnSequence = {};

    if (!marketDependentAssets || marketDependentAssets.length === 0 || durationMonths <= 0) {
      return { scenario: randomScenario, returnSequence };
    }

    const originalRateManager = new RateScheduleManager();
    originalRateManager.loadSchedules(baseScenario.rate_schedules || {});

    const byType = new Map();
    for (const asset of marketDependentAssets) {
      if (!byType.has(asset.investmentType)) byType.set(asset.investmentType, []);
      byType.get(asset.investmentType).push(asset);
    }

    if (!randomScenario.rate_schedules) randomScenario.rate_schedules = {};

    for (const [investmentType, assetsOfType] of byType.entries()) {
      // getAssetReturns() in the engine unconditionally divides whatever
      // getRate() returns by 12 -- every schedule type (fixed/sequence/map)
      // stores an ANNUAL rate per period and relies on that /12, so this
      // schedule's `values[]` must too. The noise is therefore drawn in
      // "annual-equivalent" units (stdDev * sqrt(12)) so that AFTER the
      // engine's own /12, the effective monthly noise stdDev works out to
      // stdDev/sqrt(12) -- the actual sqrt(T) dispersion-scaling fix.
      const annualEquivalentStdDev = assetsOfType[0].stdDev * Math.sqrt(12);
      const noise = [];
      for (let m = 0; m < durationMonths; m++) {
        noise.push(this.normalRandom(0, annualEquivalentStdDev, rng));
      }

      let representativeMonthlyRates = null;

      for (const assetDescriptor of assetsOfType) {
        const values = [];
        for (let m = 0; m < durationMonths; m++) {
          const baseAnnualRate = assetDescriptor.isLegacyInterestRate
            ? assetDescriptor.baseInterestRate
            : originalRateManager.getRate(assetDescriptor.scheduleName, m);
          values.push(baseAnnualRate + noise[m]); // NOT pre-divided by 12
        }

        const scheduleName = assetDescriptor.isLegacyInterestRate
          ? `_mc_${assetDescriptor.assetName}`
          : assetDescriptor.scheduleName;
        randomScenario.rate_schedules[scheduleName] = { type: 'monthly_values', values };

        if (assetDescriptor.isLegacyInterestRate) {
          const clonedAsset = randomScenario.assets.find(a => a.name === assetDescriptor.assetName);
          if (clonedAsset) clonedAsset.return_schedule = scheduleName;
        }

        // Use the first asset in the group as representative of "what this
        // investment type actually did" for the exported return sequence --
        // the ACTUAL monthly growth rate applied (values[m]/12, matching
        // exactly what getAssetReturns() computes), not the raw annual-scale
        // values or noise-only.
        if (!representativeMonthlyRates) {
          representativeMonthlyRates = values.map(v => v / 12);
        }
      }

      returnSequence[investmentType] = this.rollUpMonthlyToAnnual(representativeMonthlyRates);
    }

    return { scenario: randomScenario, returnSequence };
  }

  /**
   * Compound a monthly rate sequence into an annual return per year, for
   * export/display purposes -- {investmentType: number[]} matching what
   * ExportController.generateMonteCarloReturnsCSV() already expects.
   */
  rollUpMonthlyToAnnual(monthlyRates) {
    const annual = [];
    for (let start = 0; start < monthlyRates.length; start += 12) {
      const yearMonths = monthlyRates.slice(start, start + 12);
      const compounded = yearMonths.reduce((acc, r) => acc * (1 + r), 1) - 1;
      annual.push(compounded);
    }
    return annual;
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
    
    // Create array of results with their indices and final balances.
    // `result` here is the runSimulationBatch() wrapper
    // ({iteration, scenario, result, success, survivalTime, finalBalance,
    // timestamp}) -- the return sequence is attached to the *inner*
    // result.result, not the wrapper itself.
    const resultsWithBalances = results.map((result, index) => ({
      index,
      result,
      finalBalance: result.finalBalance ?? finalBalances[index] ?? 0,
      returnSequence: result.returnSequence || result.result?.returnSequence
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
   * Build a total-balance-per-month series from the engine's balanceHistory
   * (keyed by asset name -> array of end-of-month balances). This is the
   * correct source for aggregate balance over time -- the engine's per-month
   * log objects have no `.assets` field. See ISSUES.md #20.
   */
  getTotalBalanceSeries(balanceHistory, monthCount) {
    const series = [];
    if (!balanceHistory) return series;
    const histories = Object.values(balanceHistory);
    for (let i = 0; i < monthCount; i++) {
      let total = 0;
      for (const history of histories) {
        if (Array.isArray(history) && typeof history[i] === 'number') {
          total += history[i];
        }
      }
      series.push(total);
    }
    return series;
  }

  /**
   * Sum gross withdrawal amounts across every month's `withdrawals[]` array
   * (the engine records one entry per withdrawal, not a precomputed total).
   */
  getTotalWithdrawals(monthlyResults) {
    if (!Array.isArray(monthlyResults)) return 0;
    return monthlyResults.reduce((sum, month) => {
      if (!month || !Array.isArray(month.withdrawals)) return sum;
      return sum + month.withdrawals.reduce((s, w) => s + (w.grossAmount || 0), 0);
    }, 0);
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
        const balanceHistory = result.results.balanceHistory;
        const monthCount = Array.isArray(timeawareResults) ? timeawareResults.length : 0;

        // Calculate total balance from all assets at the end, from balanceHistory
        const balanceSeries = this.getTotalBalanceSeries(balanceHistory, monthCount);
        const finalBalance = balanceSeries.length > 0 ? balanceSeries[balanceSeries.length - 1] : 0;

        // shortfallMonths is computed by SimulationService into the wrapper's
        // sibling `metrics` field, not onto `result.results` -- read it from there.
        const shortfallMonths = result.metrics?.shortfallMonths || 0;
        const totalWithdrawals = this.getTotalWithdrawals(timeawareResults);

        metrics.finalBalance.push(finalBalance);
        metrics.shortfallMonths.push(shortfallMonths);
        metrics.maxDrawdown.push(this.calculateMaxDrawdownFromResults(balanceHistory, monthCount));
        metrics.timeToDepletion.push(this.calculateTimeToDepletionFromResults(balanceHistory, monthCount));
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

          const series = this.getTotalBalanceSeries(result.result.results.balanceHistory, timeawareResults.length);
          return series.length > 0 ? series[series.length - 1] : 0;
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
    // Reuse the per-trial survivalTime already computed (correctly, from
    // balanceHistory) in runSimulationBatch(), rather than re-deriving it
    // from the engine's per-month log objects, which have no `.assets` field.
    const survivalTimes = results.map(r => r.survivalTime ?? 0);
    
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
    // Survival must mean solvent, not merely simulated: derive it from
    // balanceHistory (via the shared helper) rather than the raw month
    // count, which stays equal to the full duration whenever
    // stop_on_shortfall is false regardless of actual depletion.
    const survivalTime = this.calculateIndividualSurvivalTime(result);

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

    // Find when total balance (from balanceHistory) goes to zero or negative
    const series = this.getTotalBalanceSeries(result.results.balanceHistory, timeawareResults.length);
    const depletionMonth = series.findIndex(balance => balance <= 0);

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
   * Calculate maximum drawdown from an engine balanceHistory
   */
  calculateMaxDrawdownFromResults(balanceHistory, monthCount) {
    const totalBalances = this.getTotalBalanceSeries(balanceHistory, monthCount);
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
   * Calculate time to depletion from an engine balanceHistory
   */
  calculateTimeToDepletionFromResults(balanceHistory, monthCount) {
    const totalBalances = this.getTotalBalanceSeries(balanceHistory, monthCount);
    const depletionMonth = totalBalances.findIndex(balance => balance <= 0);
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

      const series = this.getTotalBalanceSeries(r.result.results.balanceHistory, simulationResults.length);
      return series.length > 0 ? series[series.length - 1] : 0;
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

      const series = this.getTotalBalanceSeries(r.result.results.balanceHistory, simulationResults.length);
      return series.length > 0 ? series[series.length - 1] : 0;
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

      return this.calculateMaxDrawdownFromResults(result.results.balanceHistory, simulationResults.length);
    });

    return this.calculateStatistics(drawdowns, [10, 25, 50, 75, 90, 95, 99]);
  }
}
