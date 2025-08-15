/**
 * InsightsController - Dedicated controller for Key Insights display and management
 * CLEAN ARCHITECTURE: Single responsibility for insights UI
 */
export class InsightsController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentScenarioData = null;
    
    console.log('🔥 InsightsController: Initializing with event bus');
    
    this.initializeElements();
    this.setupEventListeners();
    
    console.log('✅ InsightsController: Fully initialized and ready for events');
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.insightsSection = document.getElementById('insights-section');
    if (!this.insightsSection) {
      console.warn('⚠️ InsightsController: insights-section element not found');
    }
  }

  /**
   * Set up event listeners - CLEAN EVENT BUS PATTERN
   */
  setupEventListeners() {
    // Listen for scenario data changes (from JSON editing, scenario selection)
    this.eventBus.on('scenario:data-changed', (data) => {
      console.log('🔥 InsightsController: Scenario data changed!', {
        trigger: data.trigger,
        monthlyExpenses: data.scenarioData?.plan?.monthly_expenses,
        annualExpenses: (data.scenarioData?.plan?.monthly_expenses || 0) * 12,
        timestamp: data.timestamp
      });
      this.currentScenarioData = data.scenarioData;
      this.requestInsightsUpdate(data.scenarioData, 'scenario-change');
    });

    // Listen for simulation completion (with results)
    this.eventBus.on('simulation:results-ready', (data) => {
      console.log('📊 InsightsController: Simulation results ready, requesting insights update');
      this.currentScenarioData = data.scenarioData;
      this.requestInsightsUpdate(data.scenarioData, 'simulation-complete', data.results);
    });

    // Listen for insights ready to display
    this.eventBus.on('ui:insights-display-update', (data) => {
      console.log('🔥 InsightsController: Received insights for display!', {
        insightsCount: data.insights?.length,
        trigger: data.trigger,
        monthlyExpenses: data.scenarioData?.plan?.monthly_expenses,
        annualExpenses: (data.scenarioData?.plan?.monthly_expenses || 0) * 12
      });
      this.displayInsights(data.insights);
    });
  }

  /**
   * Request insights update from SimulationService
   * CLEAN PATTERN: Request via event bus, no direct service calls
   */
  requestInsightsUpdate(scenarioData, trigger, simulationResults = []) {
    console.log(`💡 InsightsController: Requesting insights update (trigger: ${trigger})`);
    
    this.eventBus.emit('insights:generate-request', {
      scenarioData: scenarioData,
      simulationResults: simulationResults,
      trigger: trigger,
      requestId: `insights-${Date.now()}`
    });
  }

  /**
   * Display insights in the UI
   * CLEAN RESPONSIBILITY: Only handles display, not generation
   */
  displayInsights(insights) {
    if (!this.insightsSection || !insights) {
      console.warn('❌ InsightsController: Cannot display insights - missing section or data');
      return;
    }

    const insightsList = this.insightsSection.querySelector('#insights-list');
    if (!insightsList) {
      console.warn('❌ InsightsController: insights-list element not found');
      return;
    }

    // Clear existing insights
    insightsList.innerHTML = '';
    
    // Add each insight
    insights.forEach(insight => {
      const li = document.createElement('li');
      
      // Handle different insight formats
      if (typeof insight === 'string') {
        li.textContent = insight;
      } else if (insight && typeof insight === 'object') {
        if (insight.message) {
          li.textContent = insight.message;
          // Add priority styling
          if (insight.priority) {
            li.classList.add(`insight-${insight.priority}`);
          }
          if (insight.type) {
            li.classList.add(`insight-${insight.type}`);
          }
        } else {
          li.textContent = JSON.stringify(insight);
        }
      } else {
        li.textContent = String(insight);
      }
      
      insightsList.appendChild(li);
    });

    // Show the insights section
    this.insightsSection.style.display = 'block';
    this.currentInsights = insights;
    
    console.log(`✅ InsightsController: Displayed ${insights.length} insights`);
  }

  /**
   * Clear insights display
   */
  clearInsights() {
    if (this.insightsSection) {
      const insightsList = this.insightsSection.querySelector('#insights-list');
      if (insightsList) {
        insightsList.innerHTML = '';
      }
      this.insightsSection.style.display = 'none';
    }
    this.currentInsights = [];
    console.log('🧹 InsightsController: Insights cleared');
  }

  /**
   * Get current insights (for debugging/testing)
   */
  getCurrentInsights() {
    return this.currentInsights;
  }
}
