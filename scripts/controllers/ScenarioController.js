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

  /**
   * Initialize the scenario controller
   */
  initialize() {
    console.log('📊 Initializing Scenario Controller');
    // Controller is already set up via constructor
  }

  setupEventListeners() {
    // Scenario events
    this.eventBus.on('scenario:select', (scenarioKey) => this.selectScenario(scenarioKey));
    this.eventBus.on('scenario:run-simulation', (data) => this.runSimulation(data));
    // REMOVED: simulation:run listener - was causing duplicate simulations with stale data
    // SimulationService is the correct handler for simulation:run events
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
      
      // CLEAN ARCHITECTURE: Also emit scenario data change event for UI updates
      this.eventBus.emit('scenario:data-changed', {
        scenarioData: scenario,
        trigger: 'scenario-selection',
        timestamp: Date.now()
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
    // Extract context from either data.context or data._context (for Monte Carlo)
    const context = data.context || data._context || {};
    
    console.log('🎯 ScenarioController: runSimulation called with context:', {
      hasContext: !!context,
      isMonteCarlo: context.isMonteCarlo,
      contextKeys: Object.keys(context)
    });
    
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
    
    this.eventBus.emit('scenario:loaded', {
      scenarioKey: scenario.key,
      scenario: scenario,
      scenarioSynopsis: this.extractKeyAssumptions(scenario)
    });
    
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
   * Extract comprehensive scenario synopsis for one-glance overview
   * @param {Object} scenario - Scenario data
   * @returns {Object} Organized scenario synopsis
   */
  extractKeyAssumptions(scenario) {
    const synopsis = {
      plan: [],
      assets: [],
      income: [],
      schedules: [],
      order: []
    };
    
    // Plan Configuration
    if (scenario.plan?.monthly_expenses) {
      synopsis.plan.push(`Monthly expenses: $${scenario.plan.monthly_expenses.toLocaleString()}`);
    }
    if (scenario.plan?.retirement_age) {
      synopsis.plan.push(`Retirement age: ${scenario.plan.retirement_age}`);
    }
    if (scenario.plan?.life_expectancy) {
      synopsis.plan.push(`Life expectancy: ${scenario.plan.life_expectancy}`);
    }
    
    // Assets Overview
    if (scenario.assets && scenario.assets.length > 0) {
      const totalAssets = scenario.assets.reduce((sum, asset) => sum + (asset.balance || 0), 0);
      synopsis.assets.push(`Total assets: $${totalAssets.toLocaleString()}`);
      
      scenario.assets.forEach(asset => {
        const details = [];
        details.push(`$${(asset.balance || 0).toLocaleString()}`);
        if (asset.type) details.push(asset.type);
        if (asset.return_schedule) details.push(`${asset.return_schedule} returns`);
        if (asset.min_balance) details.push(`min: $${asset.min_balance.toLocaleString()}`);
        synopsis.assets.push(`${asset.name}: ${details.join(', ')}`);
      });
    }
    
    // Income Sources
    if (scenario.income && scenario.income.length > 0) {
      scenario.income.forEach(income => {
        const details = [];
        details.push(`$${(income.amount || 0).toLocaleString()}/month`);
        if (income.start_month) details.push(`starts month ${income.start_month}`);
        if (income.end_month) details.push(`ends month ${income.end_month}`);
        if (income.inflation_schedule) details.push(`${income.inflation_schedule} inflation`);
        synopsis.income.push(`${income.name}: ${details.join(', ')}`);
      });
    }
    
    // Rate Schedules
    if (scenario.rate_schedules) {
      Object.entries(scenario.rate_schedules).forEach(([name, schedule]) => {
        if (schedule.type === 'fixed') {
          synopsis.schedules.push(`${name}: ${(schedule.rate * 100).toFixed(1)}% fixed`);
        } else if (schedule.type === 'variable') {
          synopsis.schedules.push(`${name}: variable (${schedule.rates?.length || 0} periods)`);
        } else {
          synopsis.schedules.push(`${name}: ${schedule.type}`);
        }
      });
    }
    
    // Drawdown Order
    if (scenario.order && scenario.order.length > 0) {
      synopsis.order = scenario.order
        .sort((a, b) => a.order - b.order)
        .map(item => `${item.order}. ${item.account}`);
    }
    
    return synopsis;
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
