/**
 * Simulation Service - Pure business logic for running financial simulations
 * Handles simulation execution, insights generation, and metrics calculation
 */
export class SimulationService {
  constructor(eventBus) {
    this.eventBus = eventBus;
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
      this.eventBus.emit('simulation:started', { scenarioData, context });
      
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
      
      console.log('🎉 SimulationService: Emitting simulation:completed event');
      this.eventBus.emit('simulation:completed', simulationResult);
      console.log('✅ SimulationService: Simulation completed successfully');
      return simulationResult;
      
    } catch (error) {
      console.error('❌ SimulationService: Simulation failed:', error);
      this.eventBus.emit('simulation:failed', { error, scenarioData, context });
      throw error;
    }
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

    // Asset allocation insights
    if (scenarioData.assets && scenarioData.assets.length > 0) {
      const totalAssets = scenarioData.assets.reduce((sum, asset) => sum + (asset.balance || asset.initial_value || 0), 0);
      insights.push({
        type: 'info',
        message: `💰 Starting with $${totalAssets.toLocaleString()} in assets`,
        priority: 'info'
      });
    }

    // Story-specific insights
    if (context.isStoryMode && context.chapter) {
      const storyInsights = this.generateStoryInsights(results, scenarioData, context);
      insights.push(...storyInsights);
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
