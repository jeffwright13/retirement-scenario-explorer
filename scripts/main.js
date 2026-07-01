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
import { ScenarioBuilderService } from './services/ScenarioBuilderService.js';
import { UIController } from './controllers/UIController.js';
import { ScenarioController } from './controllers/ScenarioController.js';
import { StoryController } from './controllers/StoryController.js';
import { ModeController } from './controllers/ModeController.js';
import { WorkflowController } from './controllers/WorkflowController.js';
import { MonteCarloController } from './controllers/MonteCarloController.js';
import { InsightsController } from './controllers/InsightsController.js';
import { ExportController } from './controllers/ExportController.js';
import { ScenarioBuilderController } from './controllers/ScenarioBuilderController.js';
import { MonteCarloChart } from './components/MonteCarloChart.js';
import { MonteCarloUI } from './ui/MonteCarloUI.js';
import { StoryUI } from './ui/StoryUI.js';
import { ScenarioBuilderUI } from './ui/ScenarioBuilderUI.js';

class RetirementScenarioApp {
  constructor() {
    // Initialize event bus for loose coupling
    this.eventBus = new EventBus();
    
    // Initialize services (business logic)
    this.initializeServices();
    
    // Initialize controllers (orchestration)
    this.initializeControllers();

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
    this.scenarioBuilderService = new ScenarioBuilderService(this.eventBus);
  }

  /**
   * Initialize all controllers
   */
  initializeControllers() {
    // Core UI and workflow controllers
    this.uiController = new UIController(this.eventBus);
    this.scenarioController = new ScenarioController(
      this.contentService, 
      this.simulationService, 
      this.validationService, 
      this.eventBus
    );
    this.workflowController = new WorkflowController(this.eventBus);
    
    // UI components (must be created before controllers that use them)
    this.monteCarloChart = new MonteCarloChart(this.eventBus);
    this.monteCarloUI = new MonteCarloUI(this.eventBus);
    this.storyUI = new StoryUI(this.eventBus);
    this.scenarioBuilderUI = new ScenarioBuilderUI(this.eventBus);
    
    // Feature controllers
    this.monteCarloController = new MonteCarloController(
      this.eventBus,
      this.monteCarloService,
      this.monteCarloChart,
      this.monteCarloUI
    );
    this.insightsController = new InsightsController(this.eventBus);
    this.exportController = new ExportController(this.eventBus);
    this.scenarioBuilderController = new ScenarioBuilderController(
      this.eventBus,
      this.scenarioBuilderService,
      this.scenarioBuilderUI
    );
    
    // Story mode controllers (if enabled)
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
    
    this.modeController = new ModeController(this.eventBus);
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
    this.modeController.initialize();
    this.workflowController.initialize();
    this.monteCarloController.initialize();
    this.insightsController.initialize();
    this.monteCarloChart.initialize();
    this.monteCarloUI.initialize();
    this.storyUI.initialize();
    this.scenarioBuilderController.initialize();
    this.scenarioBuilderUI.initialize();
    
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
      ui: this.uiController,
      scenarioBuilder: this.scenarioBuilderController
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
      validation: this.validationService,
      scenarioBuilder: this.scenarioBuilderService
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
