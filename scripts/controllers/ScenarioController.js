/**
 * Scenario Controller - Manages scenario operations and simulation orchestration
 * Handles scenario selection, validation, simulation execution, and results processing
 */
export class ScenarioController {
  constructor(contentService, simulationService, validationService, eventBus) {
    this.contentService = contentService;
    this.simulationService = simulationService;
    this.validationService = validationService;
    this.eventBus = eventBus;
    
    this.currentScenario = null;
    this.lastSimulationResult = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Scenario events
    this.eventBus.on('scenario:select', (scenarioKey) => this.selectScenario(scenarioKey));
    this.eventBus.on('scenario:run-simulation', (data) => this.runSimulation(data));
    this.eventBus.on('scenario:validate', (scenarioData) => this.validateScenario(scenarioData));
    this.eventBus.on('scenario:load-custom', (scenarioData) => this.loadCustomScenario(scenarioData));
    
    // Content events
    this.eventBus.on('scenarios:loaded', (scenarios) => this.handleScenariosLoaded(scenarios));
    this.eventBus.on('scenario:loaded', (data) => this.handleScenarioLoaded(data));
  }

  /**
   * Select a scenario by key
   * @param {string} scenarioKey - Scenario identifier
   */
  async selectScenario(scenarioKey) {
    if (!scenarioKey) {
      this.currentScenario = null;
      this.eventBus.emit('scenario:cleared');
      return;
    }

    try {
      console.log(`📊 Selecting scenario: ${scenarioKey}`);
      
      const scenario = await this.contentService.getScenario(scenarioKey);
      this.currentScenario = scenario;
      
      // Validate the scenario
      const validation = this.validationService.validateScenario(scenario);
      
      this.eventBus.emit('scenario:selected', {
        scenario,
        validation,
        key: scenarioKey
      });
      
      // Show preview/summary
      this.generateScenarioPreview(scenario);
      
    } catch (error) {
      console.error('Failed to select scenario:', error);
      this.eventBus.emit('error', `Failed to load scenario: ${error.message}`);
    }
  }

  /**
   * Load a custom scenario (from JSON input)
   * @param {Object} scenarioData - Custom scenario data
   */
  async loadCustomScenario(scenarioData) {
    try {
      console.log('📊 Loading custom scenario');
      
      // Validate the custom scenario
      const validation = this.validationService.validateScenario(scenarioData);
      
      if (!validation.isValid) {
        this.eventBus.emit('scenario:validation-failed', {
          scenarioData,
          validation
        });
        return;
      }
      
      this.currentScenario = {
        ...scenarioData,
        key: 'custom',
        title: scenarioData.title || 'Custom Scenario',
        isCustom: true
      };
      
      this.eventBus.emit('scenario:custom-loaded', {
        scenario: this.currentScenario,
        validation
      });
      
      this.generateScenarioPreview(this.currentScenario);
      
    } catch (error) {
      console.error('Failed to load custom scenario:', error);
      this.eventBus.emit('error', `Failed to load custom scenario: ${error.message}`);
    }
  }

  /**
   * Run simulation for current or provided scenario
   * @param {Object} data - Simulation data (scenario, context)
   */
  async runSimulation(data = {}) {
    const scenarioData = data.scenario || this.currentScenario;
    const context = data.context || {};
    
    if (!scenarioData) {
      this.eventBus.emit('error', 'No scenario selected for simulation');
      return;
    }

    try {
      console.log('🚀 Running simulation...');
      
      // Validate before simulation
      const validation = this.validationService.validateScenario(scenarioData);
      if (!validation.isValid) {
        this.eventBus.emit('simulation:validation-failed', {
          scenarioData,
          validation
        });
        return;
      }
      
      // Run the simulation
      const result = await this.simulationService.runSimulation(scenarioData, context);
      this.lastSimulationResult = result;
      
      // Process results based on context
      if (context.isStoryMode) {
        this.handleStorySimulationComplete(result);
      } else {
        this.handleRegularSimulationComplete(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('Simulation failed:', error);
      this.eventBus.emit('simulation:failed', {
        error,
        scenarioData,
        context
      });
      throw error;
    }
  }

  /**
   * Validate a scenario
   * @param {Object} scenarioData - Scenario to validate
   * @returns {Object} Validation result
   */
  validateScenario(scenarioData) {
    const validation = this.validationService.validateScenario(scenarioData);
    
    this.eventBus.emit('scenario:validated', {
      scenarioData,
      validation
    });
    
    return validation;
  }

  /**
   * Generate scenario preview/summary
   * @param {Object} scenario - Scenario data
   */
  generateScenarioPreview(scenario) {
    const preview = {
      title: scenario.title || 'Untitled Scenario',
      description: scenario.description || 'No description available',
      keyMetrics: this.extractKeyMetrics(scenario),
      assumptions: this.extractKeyAssumptions(scenario),
      assetSummary: this.generateAssetSummary(scenario.assets || [])
    };
    
    this.eventBus.emit('scenario:preview-generated', {
      scenario,
      preview
    });
  }

  /**
   * Extract key metrics from scenario
   * @param {Object} scenario - Scenario data
   * @returns {Object} Key metrics
   */
  extractKeyMetrics(scenario) {
    const metrics = {};
    
    if (scenario.plan) {
      metrics.monthlyExpenses = scenario.plan.monthly_expenses || 0;
      metrics.annualExpenses = metrics.monthlyExpenses * 12;
      metrics.retirementAge = scenario.plan.retirement_age;
      metrics.lifeExpectancy = scenario.plan.life_expectancy;
    }
    
    if (scenario.assets) {
      metrics.totalAssets = scenario.assets.reduce((sum, asset) => 
        sum + (asset.initial_value || 0), 0
      );
      metrics.assetCount = scenario.assets.length;
    }
    
    // Calculate rough sustainability
    if (metrics.totalAssets && metrics.annualExpenses) {
      metrics.yearsOfExpenses = metrics.totalAssets / metrics.annualExpenses;
    }
    
    return metrics;
  }

  /**
   * Extract key assumptions from scenario
   * @param {Object} scenario - Scenario data
   * @returns {Array} Key assumptions
   */
  extractKeyAssumptions(scenario) {
    const assumptions = [];
    
    if (scenario.plan?.monthly_expenses) {
      assumptions.push(`Monthly expenses: $${scenario.plan.monthly_expenses.toLocaleString()}`);
    }
    
    if (scenario.plan?.retirement_age) {
      assumptions.push(`Retirement age: ${scenario.plan.retirement_age}`);
    }
    
    if (scenario.plan?.life_expectancy) {
      assumptions.push(`Life expectancy: ${scenario.plan.life_expectancy}`);
    }
    
    // Asset-specific assumptions
    if (scenario.assets) {
      const avgGrowthRate = scenario.assets
        .filter(asset => asset.annual_growth_rate)
        .reduce((sum, asset, _, arr) => sum + asset.annual_growth_rate / arr.length, 0);
      
      if (avgGrowthRate > 0) {
        assumptions.push(`Average growth rate: ${(avgGrowthRate * 100).toFixed(1)}%`);
      }
    }
    
    return assumptions;
  }

  /**
   * Generate asset summary
   * @param {Array} assets - Assets array
   * @returns {Object} Asset summary
   */
  generateAssetSummary(assets) {
    const summary = {
      total: assets.length,
      totalValue: assets.reduce((sum, asset) => sum + (asset.initial_value || 0), 0),
      byType: {}
    };
    
    // Group by type
    assets.forEach(asset => {
      const type = asset.type || 'unknown';
      if (!summary.byType[type]) {
        summary.byType[type] = {
          count: 0,
          totalValue: 0,
          assets: []
        };
      }
      
      summary.byType[type].count++;
      summary.byType[type].totalValue += asset.initial_value || 0;
      summary.byType[type].assets.push(asset);
    });
    
    return summary;
  }

  /**
   * Handle regular (non-story) simulation completion
   * @param {Object} result - Simulation result
   */
  handleRegularSimulationComplete(result) {
    this.eventBus.emit('simulation:regular-completed', result);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(result);
    this.eventBus.emit('scenario:recommendations-generated', {
      result,
      recommendations
    });
  }

  /**
   * Handle story mode simulation completion
   * @param {Object} result - Simulation result
   */
  handleStorySimulationComplete(result) {
    this.eventBus.emit('simulation:story-completed', result);
    
    // Story-specific processing is handled by StoryController
    // This just ensures the simulation data is available
  }

  /**
   * Generate recommendations based on simulation results
   * @param {Object} result - Simulation result
   * @returns {Array} Recommendations
   */
  generateRecommendations(result) {
    const recommendations = [];
    const { metrics, insights } = result;
    
    // Check for critical issues
    const criticalInsights = insights.filter(insight => insight.type === 'critical');
    if (criticalInsights.length > 0) {
      recommendations.push({
        type: 'urgent',
        title: 'Immediate Action Required',
        description: 'Your current plan may not provide sufficient funds for retirement.',
        actions: [
          'Increase monthly savings',
          'Delay retirement by a few years',
          'Reduce planned expenses',
          'Consider higher-growth investments'
        ]
      });
    }
    
    // Asset diversification recommendations
    if (this.currentScenario?.assets) {
      const assetTypes = new Set(this.currentScenario.assets.map(a => a.type));
      if (assetTypes.size < 3) {
        recommendations.push({
          type: 'suggestion',
          title: 'Consider Diversification',
          description: 'Your portfolio could benefit from more asset types.',
          actions: [
            'Add different asset classes',
            'Consider international investments',
            'Balance growth and income assets'
          ]
        });
      }
    }
    
    // Expense optimization
    if (metrics.monthlyExpenses > 0) {
      const expenseRatio = metrics.totalInitialAssets / (metrics.monthlyExpenses * 12);
      if (expenseRatio < 25) {
        recommendations.push({
          type: 'suggestion',
          title: 'Expense Review',
          description: 'Consider reviewing your planned retirement expenses.',
          actions: [
            'Identify areas to reduce costs',
            'Plan for healthcare expenses',
            'Consider geographic arbitrage'
          ]
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Handle scenarios loaded event
   * @param {Array} scenarios - Available scenarios
   */
  handleScenariosLoaded(scenarios) {
    console.log(`📊 ${scenarios.length} scenarios available`);
    this.eventBus.emit('scenario:scenarios-available', scenarios);
  }

  /**
   * Handle scenario loaded event
   * @param {Object} data - Scenario load data
   */
  handleScenarioLoaded(data) {
    const { scenario, context } = data;
    
    // If this is from story mode, handle differently
    if (context?.isStoryMode) {
      this.currentScenario = scenario;
      this.eventBus.emit('scenario:story-scenario-loaded', data);
    }
  }

  /**
   * Get current scenario
   * @returns {Object|null} Current scenario
   */
  getCurrentScenario() {
    return this.currentScenario;
  }

  /**
   * Get last simulation result
   * @returns {Object|null} Last simulation result
   */
  getLastSimulationResult() {
    return this.lastSimulationResult;
  }

  /**
   * Get available scenarios
   * @returns {Array} Available scenarios
   */
  getAvailableScenarios() {
    return this.contentService.getAllScenarios();
  }

  /**
   * Get scenario recommendations based on current scenario
   * @returns {Array} Recommended scenarios
   */
  getScenarioRecommendations() {
    if (!this.currentScenario) return [];
    
    return this.contentService.getRecommendedScenarios(this.currentScenario.key);
  }
}
