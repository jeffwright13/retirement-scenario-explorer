/**
 * Simulation Service - Pure business logic for running financial simulations
 * Handles simulation execution, insights generation, and metrics calculation
 */
export class SimulationService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for simulation requests
   */
  setupEventListeners() {
    // Listen for simulation run requests
    this.eventBus.on('simulation:run', async (scenarioData) => {
      console.log('🎯 SimulationService: Received simulation:run event');
      
      // Extract Monte Carlo context if present (from MonteCarloService)
      const context = scenarioData._context || {};
      console.log('🔍 SimulationService: Extracted context:', {
        hasContext: !!context,
        isMonteCarlo: context.isMonteCarlo,
        contextKeys: Object.keys(context)
      });
      
      try {
        await this.runSimulation(scenarioData, context);
      } catch (error) {
        console.error('❌ SimulationService: Simulation failed:', error);
        this.eventBus.emit('simulation:error', { error: error.message, scenarioData, context });
      }
    });
  
    // CLEAN ARCHITECTURE: Listen for insights generation requests
    this.eventBus.on('insights:generate-request', (data) => {
      console.log('🔥 SimulationService: Received insights:generate-request event!');
      console.log('🔍 Request details:', {
        trigger: data.trigger,
        hasScenarioData: !!data.scenarioData,
        hasSimulationResults: !!data.simulationResults,
        monthlyExpenses: data.scenarioData?.plan?.monthly_expenses,
        annualExpenses: (data.scenarioData?.plan?.monthly_expenses || 0) * 12,
        requestId: data.requestId
      });
      
      try {
        // Generate insights based on scenario data and optional simulation results
        const insights = this.generateInsights(
          data.simulationResults || [], 
          data.scenarioData, 
          { trigger: data.trigger }
        );
        
        // CLEAN EVENT: Emit UI update event, not generic 'insights:generated'
        this.eventBus.emit('ui:insights-display-update', {
          insights: insights,
          requestId: data.requestId,
          trigger: data.trigger,
          scenarioData: data.scenarioData
        });
        
        console.log('✅ SimulationService: Insights generated and UI update event emitted', {
          insightsCount: insights.length,
          trigger: data.trigger,
          monthlyExpenses: data.scenarioData?.plan?.monthly_expenses,
          annualExpenses: (data.scenarioData?.plan?.monthly_expenses || 0) * 12
        });
      } catch (error) {
        console.error('❌ SimulationService: Failed to generate insights:', error);
        this.eventBus.emit('insights:error', { 
          error: error.message, 
          requestId: data.requestId,
          trigger: data.trigger
        });
      }
    });
  
    // Old insights:generate-static listener removed - now using insights:generate-request
  }

  /**
   * Run a complete simulation with insights and metrics
   * @param {Object} scenarioData - Scenario configuration
   * @param {Object} context - Additional context (story mode, etc.)
   * @returns {Promise<Object>} Complete simulation result
   */
  async runSimulation(scenarioData, context = {}) {
    try {
      console.log('🔄 SimulationService: Starting simulation...');
      
      // Extract simulation ID if present
      const simulationId = scenarioData._simulationId;
      
      this.eventBus.emit('simulation:started', { scenarioData, context });
      
      // Generate return sequences for Monte Carlo simulations
      if (context.isMonteCarlo && simulationId) {
        console.log('📈 SimulationService: Generating return sequences for Monte Carlo simulation');
        await this.generateReturnSequences(scenarioData, simulationId);
      }
      
      // Execute the core simulation
      console.log('🔄 SimulationService: Executing core simulation...');
      const results = await this.executeSimulation(scenarioData);
      console.log('✅ SimulationService: Core simulation completed, results:', results);
      
      // Generate business insights
      console.log('🔄 SimulationService: Generating insights...');
      const insights = this.generateInsights(results, scenarioData, context);
      console.log('✅ SimulationService: Insights generated:', insights);
      
      // Calculate key metrics
      console.log('🔄 SimulationService: Calculating metrics...');
      const metrics = this.calculateMetrics(results, scenarioData);
      console.log('✅ SimulationService: Metrics calculated:', metrics);
      
      const simulationResult = {
        results,
        insights,
        metrics,
        scenarioData,
        context,
        timestamp: new Date().toISOString()
      };
      
      // Emit to unique event if simulation ID exists, otherwise use generic
      if (simulationId) {
        console.log(`🎉 SimulationService: Emitting simulation:completed:${simulationId} event`);
        this.eventBus.emit(`simulation:completed:${simulationId}`, simulationResult);
      } else {
        console.log('🎉 SimulationService: Emitting simulation:completed event');
        this.eventBus.emit('simulation:completed', simulationResult);
      }
      
      console.log('✅ SimulationService: Simulation completed successfully');
      return simulationResult;
      
    } catch (error) {
      console.error('❌ SimulationService: Simulation failed:', error);
      
      // Handle errors with unique events too
      const simulationId = scenarioData._simulationId;
      if (simulationId) {
        this.eventBus.emit(`simulation:error:${simulationId}`, { error, scenarioData, context });
      } else {
        this.eventBus.emit('simulation:failed', { error, scenarioData, context });
      }
      throw error;
    }
  }

  /**
   * Generate return sequences for Monte Carlo simulations
   * @param {Object} scenarioData - Scenario configuration
   * @param {string} simulationId - Unique simulation identifier
   */
  async generateReturnSequences(scenarioData, simulationId) {
    // Extract asset types from scenario
    const assetTypes = scenarioData.assets ? scenarioData.assets.map(asset => asset.type || 'investment') : ['investment'];
    
    // Calculate simulation duration in years (timeaware-engine uses months)
    const durationMonths = scenarioData.plan?.duration_months || 300;
    const durationYears = Math.ceil(durationMonths / 12);
    
    console.log(`📈 SimulationService: Requesting return sequences for ${assetTypes.join(', ')} over ${durationYears} years`);
    
    // Request return generation from ReturnModelService
    this.eventBus.emit('returnmodel:generate-returns', {
      simulationId,
      assetTypes,
      duration: durationYears,
      seed: Math.floor(Math.random() * 1000000), // Random seed per simulation
      config: {} // Use default return model configuration
    });
    
    // Wait briefly for return generation to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Execute the core simulation using the time-aware engine
   * @param {Object} scenarioData - Scenario configuration
   * @returns {Promise<Array>} Raw simulation results
   */
  async executeSimulation(scenarioData) {
    // Dynamic import to avoid circular dependencies
    const { simulateScenarioAdvanced } = await import('../timeaware-engine.js');
    return await simulateScenarioAdvanced(scenarioData);
  }

  /**
   * Generate business insights from simulation results
   * @param {Array} results - Raw simulation results
   * @param {Object} scenarioData - Original scenario data
   * @param {Object} context - Additional context
   * @returns {Array} Array of insight objects
   */
  generateInsights(results, scenarioData, context = {}) {
    const insights = [];

    // Ensure results is an array
    if (!Array.isArray(results)) {
      console.warn('SimulationService: Results is not an array, attempting to extract data:', results);
      // If results has a results property that's an array, use that
      if (results && Array.isArray(results.results)) {
        results = results.results;
      } else {
        console.error('SimulationService: Cannot process results - not an array and no results property');
        return insights;
      }
    }

    if (!results || results.length === 0) {
      insights.push({
        type: 'error',
        message: 'No simulation results to analyze'
      });
      return insights;
    }

    // Calculate key metrics for insights
    const totalMonths = results.length;
    const totalYears = Math.round(totalMonths / 12);
    const shortfallResults = results.filter(r => r.shortfall > 0);
    const shortfallMonths = shortfallResults.length;

    // Money duration insights
    if (shortfallMonths > 0) {
      const monthsUntilShortfall = totalMonths - shortfallMonths;
      const yearsUntilShortfall = Math.round(monthsUntilShortfall / 12);
      
      if (yearsUntilShortfall < 5) {
        insights.push({
          type: 'critical',
          message: `⚠️ Critical: Funds may run low in just ${yearsUntilShortfall} years`,
          priority: 'high'
        });
      } else if (yearsUntilShortfall < 15) {
        insights.push({
          type: 'warning',
          message: `⚠️ Warning: Funds may run low after ${yearsUntilShortfall} years`,
          priority: 'medium'
        });
      } else {
        insights.push({
          type: 'caution',
          message: `💡 Plan works for ${yearsUntilShortfall} years, but consider extending`,
          priority: 'low'
        });
      }
    } else {
      insights.push({
        type: 'success',
        message: `✅ Excellent: Your plan looks sustainable for the full ${totalYears}-year period`,
        priority: 'info'
      });
    }

    // Monthly expenses insights
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    if (monthlyExpenses > 0) {
      const annualExpenses = monthlyExpenses * 12;
      insights.push({
        type: 'info',
        message: `📊 Annual expenses: $${annualExpenses.toLocaleString()}`,
        priority: 'info'
      });
    }

    // Enhanced Asset and Cash Flow Analysis
    if (scenarioData.assets && scenarioData.assets.length > 0) {
      const totalAssets = scenarioData.assets.reduce((sum, asset) => sum + (asset.balance || asset.initial_value || 0), 0);
      insights.push({
        type: 'info',
        message: `💰 Starting with $${totalAssets.toLocaleString()} in assets`,
        priority: 'info'
      });
      
      // Asset depletion analysis
      const depletedAssets = this.analyzeAssetDepletion(results, scenarioData);
      if (depletedAssets.length > 0) {
        insights.push({
          type: 'warning',
          message: `⚠️ Asset Alert: ${depletedAssets.length} asset(s) may be fully depleted: ${depletedAssets.join(', ')}`,
          priority: 'high'
        });
      }
      
      // Withdrawal rate analysis
      const withdrawalRate = this.calculateWithdrawalRate(monthlyExpenses, totalAssets);
      if (withdrawalRate > 4.5) {
        insights.push({
          type: 'critical',
          message: `🚨 High Risk: ${withdrawalRate.toFixed(1)}% withdrawal rate exceeds safe 4% rule`,
          priority: 'high'
        });
      } else if (withdrawalRate > 3.5) {
        insights.push({
          type: 'warning',
          message: `⚠️ Moderate Risk: ${withdrawalRate.toFixed(1)}% withdrawal rate approaching 4% limit`,
          priority: 'medium'
        });
      } else {
        insights.push({
          type: 'success',
          message: `✅ Conservative: ${withdrawalRate.toFixed(1)}% withdrawal rate within safe range`,
          priority: 'info'
        });
      }
    }

    // Income adequacy analysis
    const incomeInsights = this.analyzeIncomeAdequacy(results, scenarioData);
    insights.push(...incomeInsights);
    
    // Cash flow timing analysis
    const cashFlowInsights = this.analyzeCashFlowTiming(results, scenarioData);
    insights.push(...cashFlowInsights);
    
    // Risk and diversification analysis
    const riskInsights = this.analyzeRiskFactors(results, scenarioData);
    insights.push(...riskInsights);

    // Story-specific insights
    if (context.isStoryMode && context.chapter) {
      const storyInsights = this.generateStoryInsights(results, scenarioData, context);
      insights.push(...storyInsights);
    }

    return insights;
  }

  /**
   * Analyze asset depletion patterns
   */
  analyzeAssetDepletion(results, scenarioData) {
    const depletedAssets = [];
    
    if (!scenarioData.assets || !Array.isArray(results)) return depletedAssets;
    
    // Check final balances for each asset type
    const finalResult = results[results.length - 1];
    if (finalResult && finalResult.balances) {
      scenarioData.assets.forEach(asset => {
        const finalBalance = finalResult.balances[asset.name] || 0;
        const initialBalance = asset.balance || asset.initial_value || 0;
        
        // Consider asset depleted if less than 5% of original value
        if (finalBalance < (initialBalance * 0.05)) {
          depletedAssets.push(asset.name);
        }
      });
    }
    
    return depletedAssets;
  }

  /**
   * Calculate annual withdrawal rate
   */
  calculateWithdrawalRate(monthlyExpenses, totalAssets) {
    if (!monthlyExpenses || !totalAssets || totalAssets === 0) return 0;
    const annualExpenses = monthlyExpenses * 12;
    return (annualExpenses / totalAssets) * 100;
  }

  /**
   * Analyze income adequacy throughout simulation
   */
  analyzeIncomeAdequacy(results, scenarioData) {
    const insights = [];
    
    if (!scenarioData.income || !Array.isArray(results)) return insights;
    
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    const totalMonthlyIncome = scenarioData.income.reduce((sum, income) => {
      return sum + (income.amount || 0);
    }, 0);
    
    const incomeRatio = totalMonthlyIncome / monthlyExpenses;
    
    if (incomeRatio >= 1.0) {
      insights.push({
        type: 'success',
        message: `💰 Income covers ${(incomeRatio * 100).toFixed(0)}% of expenses - excellent coverage`,
        priority: 'info'
      });
    } else if (incomeRatio >= 0.7) {
      insights.push({
        type: 'info',
        message: `💵 Income covers ${(incomeRatio * 100).toFixed(0)}% of expenses - asset drawdown needed`,
        priority: 'info'
      });
    } else {
      insights.push({
        type: 'warning',
        message: `⚠️ Income covers ${(incomeRatio * 100).toFixed(0)}% of expenses - heavy asset reliance`,
        priority: 'medium'
      });
    }
    
    // Analyze income timing
    const delayedIncome = scenarioData.income.filter(income => (income.start_month || 1) > 1);
    if (delayedIncome.length > 0) {
      insights.push({
        type: 'info',
        message: `⏰ ${delayedIncome.length} income source(s) start later - early years rely more on assets`,
        priority: 'info'
      });
    }
    
    return insights;
  }

  /**
   * Analyze cash flow timing and patterns
   */
  analyzeCashFlowTiming(results, scenarioData) {
    const insights = [];
    
    if (!Array.isArray(results) || results.length === 0) return insights;
    
    // Find periods of negative cash flow
    const negativeMonths = results.filter(r => r.shortfall > 0).length;
    const totalMonths = results.length;
    
    if (negativeMonths > 0) {
      const negativePercentage = (negativeMonths / totalMonths) * 100;
      
      if (negativePercentage > 50) {
        insights.push({
          type: 'critical',
          message: `🚨 Cash Flow Crisis: ${negativePercentage.toFixed(0)}% of months show shortfalls`,
          priority: 'high'
        });
      } else if (negativePercentage > 25) {
        insights.push({
          type: 'warning',
          message: `⚠️ Cash Flow Concern: ${negativePercentage.toFixed(0)}% of months show shortfalls`,
          priority: 'medium'
        });
      }
    }
    
    // Analyze early vs late period performance
    const earlyResults = results.slice(0, Math.min(60, Math.floor(results.length / 3))); // First 5 years or 1/3
    const lateResults = results.slice(-Math.min(60, Math.floor(results.length / 3))); // Last 5 years or 1/3
    
    const earlyShortfalls = earlyResults.filter(r => r.shortfall > 0).length;
    const lateShortfalls = lateResults.filter(r => r.shortfall > 0).length;
    
    if (earlyShortfalls > 0 && lateShortfalls === 0) {
      insights.push({
        type: 'info',
        message: `📈 Cash flow improves over time - early years tighter than later years`,
        priority: 'info'
      });
    } else if (earlyShortfalls === 0 && lateShortfalls > 0) {
      insights.push({
        type: 'warning',
        message: `📉 Cash flow deteriorates over time - later years become problematic`,
        priority: 'medium'
      });
    }
    
    return insights;
  }

  /**
   * Analyze risk factors and diversification
   */
  analyzeRiskFactors(results, scenarioData) {
    const insights = [];
    
    if (!scenarioData.assets) return insights;
    
    // Asset concentration analysis
    const totalAssets = scenarioData.assets.reduce((sum, asset) => sum + (asset.balance || 0), 0);
    const largestAsset = Math.max(...scenarioData.assets.map(asset => asset.balance || 0));
    const concentrationRatio = largestAsset / totalAssets;
    
    if (concentrationRatio > 0.7) {
      insights.push({
        type: 'warning',
        message: `⚠️ High Concentration: ${(concentrationRatio * 100).toFixed(0)}% in single asset - consider diversification`,
        priority: 'medium'
      });
    } else if (concentrationRatio > 0.5) {
      insights.push({
        type: 'info',
        message: `💡 Moderate Concentration: ${(concentrationRatio * 100).toFixed(0)}% in largest asset`,
        priority: 'info'
      });
    }
    
    // Liquidity analysis
    const liquidAssets = scenarioData.assets.filter(asset => 
      asset.name && (asset.name.toLowerCase().includes('cash') || 
                    asset.name.toLowerCase().includes('savings') ||
                    asset.name.toLowerCase().includes('checking'))
    );
    
    const liquidTotal = liquidAssets.reduce((sum, asset) => sum + (asset.balance || 0), 0);
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    const emergencyMonths = monthlyExpenses > 0 ? liquidTotal / monthlyExpenses : 0;
    
    if (emergencyMonths < 3) {
      insights.push({
        type: 'warning',
        message: `⚠️ Low Liquidity: Only ${emergencyMonths.toFixed(1)} months of expenses in liquid assets`,
        priority: 'medium'
      });
    } else if (emergencyMonths >= 6) {
      insights.push({
        type: 'success',
        message: `✅ Good Liquidity: ${emergencyMonths.toFixed(1)} months of expenses in liquid assets`,
        priority: 'info'
      });
    }
    
    return insights;
  }

  /**
   * Generate story-specific insights using templates
   * @param {Array} results - Simulation results
   * @param {Object} scenarioData - Scenario data
   * @param {Object} context - Story context
   * @returns {Array} Story-specific insights
   */
  generateStoryInsights(results, scenarioData, context) {
    const insights = [];
    const chapter = context.chapter;
    
    if (!chapter?.narrative?.insights) {
      return insights;
    }

    // Calculate story metrics for template processing
    const metrics = this.calculateStoryMetrics(results, scenarioData);
    
    // Process each insight template
    chapter.narrative.insights.forEach(template => {
      const processedInsight = this.processInsightTemplate(template, metrics);
      insights.push({
        type: 'story',
        message: processedInsight,
        priority: 'story'
      });
    });

    return insights;
  }

  /**
   * Process insight templates with dynamic values
   * @param {string} template - Template string with placeholders
   * @param {Object} metrics - Calculated metrics
   * @returns {string} Processed insight text
   */
  processInsightTemplate(template, metrics) {
    let processed = template;
    
    // Replace all metric placeholders
    for (const [key, value] of Object.entries(metrics)) {
      const placeholder = `{{${key}}}`;
      if (processed.includes(placeholder)) {
        processed = processed.replace(new RegExp(placeholder, 'g'), value);
      }
    }
    
    return processed;
  }

  /**
   * Calculate comprehensive metrics from simulation results
   * @param {Array} results - Simulation results
   * @param {Object} scenarioData - Scenario data
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(results, scenarioData) {
    // Ensure results is an array (same fix as generateInsights)
    if (!Array.isArray(results)) {
      if (results && Array.isArray(results.results)) {
        results = results.results;
      } else {
        console.error('SimulationService: Cannot calculate metrics - results not an array');
        return { error: 'Invalid results format' };
      }
    }

    const metrics = {
      totalMonths: results.length,
      totalYears: Math.round(results.length / 12),
      shortfallMonths: results.filter(r => r.shortfall > 0).length,
      monthlyExpenses: scenarioData.plan?.monthly_expenses || 0,
      annualExpenses: (scenarioData.plan?.monthly_expenses || 0) * 12
    };

    // Calculate when money runs out
    let moneyRunsOutMonth = null;
    for (let i = 0; i < results.length; i++) {
      if (results[i].shortfall > 0) {
        moneyRunsOutMonth = i + 1;
        break;
      }
    }

    if (moneyRunsOutMonth) {
      metrics.moneyRunsOutMonth = moneyRunsOutMonth;
      metrics.moneyRunsOutYear = Math.round(moneyRunsOutMonth / 12);
      metrics.durationYears = metrics.moneyRunsOutYear;
    } else {
      metrics.durationYears = metrics.totalYears;
      metrics.moneyRunsOutYear = null;
    }

    // Asset metrics
    if (scenarioData.assets) {
      metrics.totalInitialAssets = scenarioData.assets.reduce((sum, asset) => 
        sum + (asset.initial_value || 0), 0
      );
      metrics.assetCount = scenarioData.assets.length;
    }

    // Format for display
    metrics.monthlyExpensesFormatted = metrics.monthlyExpenses.toLocaleString();
    metrics.annualExpensesFormatted = metrics.annualExpenses.toLocaleString();
    if (metrics.totalInitialAssets) {
      metrics.totalInitialAssetsFormatted = metrics.totalInitialAssets.toLocaleString();
    }

    return metrics;
  }

  /**
   * Calculate story-specific metrics for template processing
   * @param {Array} results - Simulation results
   * @param {Object} scenarioData - Scenario data
   * @returns {Object} Story metrics
   */
  calculateStoryMetrics(results, scenarioData) {
    const baseMetrics = this.calculateMetrics(results, scenarioData);
    
    // Add story-specific metrics
    const storyMetrics = {
      ...baseMetrics,
      // Legacy compatibility
      duration_years: baseMetrics.durationYears,
      money_runs_out_year: baseMetrics.moneyRunsOutYear,
      monthly_expenses: baseMetrics.monthlyExpensesFormatted
    };

    // Store globally for template access (legacy support)
    if (typeof window !== 'undefined') {
      window._storyMetrics = storyMetrics;
    }

    return storyMetrics;
  }

  /**
   * Validate scenario data before simulation
   * @param {Object} scenarioData - Scenario to validate
   * @returns {Object} Validation result
   */
  validateScenario(scenarioData) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!scenarioData.plan) {
      errors.push('Scenario missing "plan" section');
    } else {
      if (typeof scenarioData.plan.monthly_expenses !== 'number') {
        errors.push('Plan must have numeric "monthly_expenses"');
      }
      if (scenarioData.plan.monthly_expenses <= 0) {
        warnings.push('Monthly expenses should be greater than 0');
      }
    }

    if (!scenarioData.assets || !Array.isArray(scenarioData.assets)) {
      errors.push('Scenario missing "assets" array');
    } else if (scenarioData.assets.length === 0) {
      warnings.push('No assets defined - simulation may not be meaningful');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
