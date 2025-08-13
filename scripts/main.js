/**
 * Retirement Scenario Explorer - Refactored Main Application
 * Clean, modular architecture with event-driven communication
 */

import { EventBus } from './core/EventBus.js';
import { ContentService } from './services/ContentService.js';
import { SimulationService } from './services/SimulationService.js';
import { ValidationService } from './services/ValidationService.js';
import { StoryController } from './controllers/StoryController.js';
import { ScenarioController } from './controllers/ScenarioController.js';
import { UIController } from './controllers/UIController.js';

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
  }

  /**
   * Initialize all controllers
   */
  initializeControllers() {
    this.storyController = new StoryController(
      this.contentService, 
      this.simulationService, 
      this.eventBus
    );
    
    this.scenarioController = new ScenarioController(
      this.contentService, 
      this.simulationService, 
      this.validationService, 
      this.eventBus
    );
    
    this.uiController = new UIController(this.eventBus);
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('🚀 Initializing Retirement Scenario Explorer...');
    
    try {
      // Setup global error handling
      this.setupErrorHandling();
      
      // Initialize UI first
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
