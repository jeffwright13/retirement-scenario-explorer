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
import { UIController } from './controllers/UIController.js';
import { ScenarioController } from './controllers/ScenarioController.js';
import { StoryController } from './controllers/StoryController.js';
import { TabController } from './controllers/TabController.js';
import { ModeController } from './controllers/ModeController.js';
import { MonteCarloController } from './controllers/MonteCarloController.js';
import { InsightsController } from './controllers/InsightsController.js';
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
  }

  /**
   * Initialize all controllers
   */
  initializeControllers() {
    // Initialize mode controller first to handle mode switching
    this.modeController = new ModeController(this.eventBus);
    
    // Initialize tab controller for Scenario Mode tabbed interface
    this.tabController = new TabController(this.eventBus);
    
    // Initialize UI components
    this.storyUI = new StoryUI(this.eventBus);
    
    this.storyController = new StoryController(
      this.contentService, 
      this.simulationService,
      this.storyEngineService,
      this.storyUI,
      this.eventBus
    );
    
    this.scenarioController = new ScenarioController(
      this.contentService, 
      this.simulationService, 
      this.validationService, 
      this.eventBus
    );
    
    this.uiController = new UIController(this.eventBus);
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
   * Initialize the application
   */
  async initialize() {
    console.log('🚀 Initializing Retirement Scenario Explorer...');
    
    try {
      // Setup global error handling
      this.setupErrorHandling();
      
      // Initialize mode controller first
      this.modeController.initialize();
      
      // Initialize UI
      this.uiController.initialize();
      
      // Load all content
      await this.contentService.loadAllContent();
      
      console.log('✅ Application initialized successfully');
      console.log('📊 Content summary:', this.contentService.getContentSummary());
      
      // Show any content errors (but don't break the app)
      if (this.contentService.hasErrors()) {
        console.warn('⚠️ Some content had issues:', this.contentService.getErrors());
      }
      
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      this.eventBus.emit('app:initialization-failed', error);
    }
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
