/**
 * Retirement Scenario Explorer - Refactored Main Application
 * Clean, modular architecture with event-driven communication
 */

import { EventBus } from './core/EventBus.js';
import { ContentService } from './services/ContentService.js';
import { SimulationService } from './services/SimulationService.js';
import { ValidationService } from './services/ValidationService.js';
import { MonteCarloService } from './services/MonteCarloService.js';
import { ReturnModelService } from './services/ReturnModelService.js';
import { StoryEngineService } from './services/StoryEngineService.js';
import { ExamplesService } from './services/ExamplesService.js';
import { UIController } from './controllers/UIController.js';
import { ScenarioController } from './controllers/ScenarioController.js';
import { StoryController } from './controllers/StoryController.js';
import { TabController } from './controllers/TabController.js';
import { ModeController } from './controllers/ModeController.js';
import { WorkflowController } from './controllers/WorkflowController.js';
import { MonteCarloController } from './controllers/MonteCarloController.js';
import { InsightsController } from './controllers/InsightsController.js';
import { ExportController } from './controllers/ExportController.js';
import { MonteCarloChart } from './components/MonteCarloChart.js';
import { MonteCarloUI } from './ui/MonteCarloUI.js';
import { StoryUI } from './ui/StoryUI.js';

class RetirementScenarioApp {
  constructor() {
    // Initialize event bus for loose coupling
    this.eventBus = new EventBus();
    
    // Initialize services (business logic)
    this.initializeServices();
    
    // Initialize controllers (orchestration)
    this.initializeControllers();
    
    // Set up export handlers
    this.setupExportHandlers();
    
    // Start the application
    this.initialize();
  }

  /**
   * Initialize all business services
   */
  initializeServices() {
    this.contentService = new ContentService(this.eventBus);
    this.simulationService = new SimulationService(this.eventBus);
    this.validationService = new ValidationService(this.eventBus);
    this.returnModelService = new ReturnModelService(this.eventBus);
    this.monteCarloService = new MonteCarloService(this.eventBus);
    this.storyEngineService = new StoryEngineService(this.eventBus);
    this.examplesService = new ExamplesService(this.eventBus);
  }

  /**
   * Initialize all controllers
   */
  initializeControllers() {
    // Initialize mode controller first to handle mode switching
    this.modeController = new ModeController(this.eventBus);
    
    // Initialize workflow controller for guided user experience
    this.workflowController = new WorkflowController(this.eventBus);
    
    // Initialize tab controller for Scenario Mode tabbed interface
    this.tabController = new TabController(this.eventBus);
    
    // Story Mode is temporarily disabled
    console.warn('⚠️ Story Mode is currently disabled for maintenance');
    
    // Initialize Story UI in a disabled state
    this.storyUI = new StoryUI(this.eventBus);
    
    // Create but don't initialize StoryController
    this.storyController = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'isInStoryMode') return () => false;
        if (prop === 'toggleStoryMode') return () => console.warn('Story Mode is currently disabled');
        return () => console.warn(`Story Mode is currently disabled (attempted to call ${prop})`);
      }
    });
    
    // Prevent Story Mode from being activated
    this.eventBus.on('mode:switch-to-story', () => {
      console.warn('Story Mode is currently disabled');
      this.eventBus.emit('mode:switch-to-scenario');
    });
    
    this.scenarioController = new ScenarioController(
      this.contentService, 
      this.simulationService, 
      this.validationService, 
      this.eventBus
    );
    
    this.uiController = new UIController(this.eventBus);
    this.exportController = new ExportController(this.eventBus);
    this.monteCarloController = new MonteCarloController(
      this.eventBus,
      this.monteCarloService,
      this.monteCarloChart,
      this.monteCarloUI
    );
    this.monteCarloChart = new MonteCarloChart(this.eventBus);
    this.monteCarloUI = new MonteCarloUI(this.eventBus);
    this.insightsController = new InsightsController(this.eventBus);
  }

  /**
   * Set up export handlers for single scenario results
   */
  setupExportHandlers() {
    this.eventBus.on('ui:single-scenario-export-requested', (data) => {
      this.handleSingleScenarioExport(data);
    });
  }

  /**
   * Handle single scenario export request
   */
  handleSingleScenarioExport(data) {
    const format = data.format || 'csv';
    
    // Get current simulation results from UIController
    const simulationResults = this.uiController.currentSimulationResults;
    
    if (!simulationResults || !simulationResults.results) {
      console.warn('⚠️ No simulation results available for export');
      return;
    }

    try {
      if (format === 'csv') {
        this.exportSingleScenarioCSV(simulationResults);
      } else if (format === 'json') {
        this.exportSingleScenarioJSON(simulationResults);
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  }

  /**
   * Export single scenario results as CSV
   */
  exportSingleScenarioCSV(simulationResults) {
    const results = simulationResults.results.results || simulationResults.results;
    const scenario = simulationResults.scenario || this.uiController.currentScenario;
    
    if (!Array.isArray(results)) {
      console.error('❌ Results data is not in expected array format');
      return;
    }

    // Generate CSV content
    const headers = ['Month', 'Total_Assets', 'Monthly_Expenses', 'Net_Income', 'Withdrawal_Amount', 'Asset_Growth'];
    let csvContent = headers.join(',') + '\n';
    
    results.forEach((monthData, index) => {
      const month = index + 1;
      const totalAssets = monthData.total_assets || 0;
      const monthlyExpenses = monthData.monthly_expenses || 0;
      const netIncome = monthData.net_income || 0;
      const withdrawalAmount = monthData.withdrawal_amount || 0;
      const assetGrowth = monthData.asset_growth || 0;
      
      csvContent += `${month},${totalAssets},${monthlyExpenses},${netIncome},${withdrawalAmount},${assetGrowth}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const scenarioName = scenario?.metadata?.title || 'single-scenario';
    const timestamp = Date.now();
    a.download = `${scenarioName.toLowerCase().replace(/\s+/g, '-')}-results-${timestamp}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📊 Single scenario results exported as CSV');
  }

  /**
   * Export single scenario results as JSON
   */
  exportSingleScenarioJSON(simulationResults) {
    const exportData = {
      metadata: {
        exportType: 'single-scenario-results',
        timestamp: new Date().toISOString(),
        scenario: simulationResults.scenario?.metadata || {}
      },
      scenario: simulationResults.scenario,
      results: simulationResults.results
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const scenarioName = simulationResults.scenario?.metadata?.title || 'single-scenario';
    const timestamp = Date.now();
    a.download = `${scenarioName.toLowerCase().replace(/\s+/g, '-')}-results-${timestamp}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📊 Single scenario results exported as JSON');
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('🚀 Retirement Scenario Explorer starting...');
    
    // Initialize all controllers
    this.uiController.initialize();
    this.exportController.initialize();
    this.scenarioController.initialize();
    this.storyController.initialize();
    this.tabController.initialize();
    this.modeController.initialize();
    this.workflowController.initialize();
    this.monteCarloController.initialize();
    this.insightsController.initialize();
    this.monteCarloChart.initialize();
    this.monteCarloUI.initialize();
    this.storyUI.initialize();
    
    // Load initial content and examples
    await this.contentService.loadAllContent();
    await this.examplesService.loadCatalog();
    
    console.log('✅ Application initialized successfully');
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    this.eventBus.on('system:error', (data) => {
      console.error('System error:', data);
      // Could send to error reporting service here
    });
    
    this.eventBus.on('app:initialization-failed', (error) => {
      console.error('App failed to initialize:', error);
      // Show user-friendly error message
    });
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.eventBus.emit('system:error', {
        type: 'uncaught_error',
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.eventBus.emit('system:error', {
        type: 'unhandled_rejection',
        reason: event.reason
      });
    });
  }

  // ---- PUBLIC API ----

  /**
   * Get content summary
   * @returns {Object} Content summary
   */
  getContentSummary() {
    return this.contentService.getContentSummary();
  }

  /**
   * Get current story progress
   * @returns {Object|null} Story progress
   */
  getCurrentStoryProgress() {
    return this.storyController.getProgress();
  }

  /**
   * Get available scenarios
   * @returns {Array} Available scenarios
   */
  getScenarios() {
    return this.contentService.getAllScenarios();
  }

  /**
   * Get available stories
   * @returns {Array} Available stories
   */
  getStories() {
    return this.contentService.getAllStories();
  }

  /**
   * Get examples catalog
   * @returns {Array} Examples catalog
   */
  getExamplesCatalog() {
    return this.examplesService.getCatalog();
  }

  /**
   * Load example by ID
   * @param {string} id - Example ID
   * @returns {Promise<Object>} Example scenario
   */
  async loadExample(id) {
    return await this.examplesService.loadExampleById(id);
  }

  /**
   * Refresh all content
   * @returns {Promise<Object>} Updated content registry
   */
  async refreshContent() {
    return await this.contentService.refreshContent();
  }

  /**
   * Run simulation for current scenario
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Simulation result
   */
  async runSimulation(options = {}) {
    return await this.scenarioController.runSimulation(options);
  }

  /**
   * Enable debug mode for event bus
   * @param {boolean} enabled - Debug mode state
   */
  setDebugMode(enabled) {
    this.eventBus.setDebugMode(enabled);
  }

  // ---- DEBUG HELPERS ----

  /**
   * Debug content information
   */
  debugContent() {
    console.log('📊 Content Debug Info:');
    console.log('Scenarios:', this.contentService.getAllScenarios());
    console.log('Stories:', this.contentService.getAllStories());
    console.log('Summary:', this.contentService.getContentSummary());
    console.log('Errors:', this.contentService.getErrors());
  }

  /**
   * Debug event bus information
   */
  debugEvents() {
    console.log('📡 Event Bus Debug Info:');
    console.log('Registered events:', this.eventBus.getEvents());
  }

  /**
   * Get all controllers (for debugging)
   * @returns {Object} Controllers object
   */
  getControllers() {
    return {
      story: this.storyController,
      scenario: this.scenarioController,
      ui: this.uiController
    };
  }

  /**
   * Get all services (for debugging)
   * @returns {Object} Services object
   */
  getServices() {
    return {
      content: this.contentService,
      simulation: this.simulationService,
      validation: this.validationService
    };
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.retirementApp = new RetirementScenarioApp();
  
  // Debug helper function
  window.debugContent = () => {
    if (window.retirementApp) {
      window.retirementApp.debugContent();
    }
  };
  
  // Debug events helper
  window.debugEvents = () => {
    if (window.retirementApp) {
      window.retirementApp.debugEvents();
    }
  };
});
