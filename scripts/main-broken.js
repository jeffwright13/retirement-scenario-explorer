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

  // Storyteller event handlers with introduction support
  setupStorytellerHandlers() {
    this.storytellerUI.onStoryModeToggle(() => {
      this.toggleStoryMode();
    });

    this.storytellerUI.onStorySelection((e) => {
      this.handleStorySelection(e.target.value);
    });

    this.storytellerUI.setStoryCallbacks({
      onStoryStart: () => this.handleStoryStart(),
      onStoryNext: () => this.handleStoryNext(),
      onStoryPrevious: () => this.handleStoryPrevious(),
      onStoryExit: () => this.handleStoryExit()
    });
  }

  // Story mode management
  toggleStoryMode() {
    if (this.isInStoryMode()) {
      this.exitStoryMode();
    } else {
      this.enterStoryMode();
    }
  }

  enterStoryMode() {
    console.log('🎭 Entering story mode');
    this.storytellerUI.enterStoryMode();
  }

  exitStoryMode() {
    console.log('🎭 Exiting story mode');
    this.currentStory = null;
    this.currentChapter = null;
    this.storytellerUI.exitStoryMode();
  }

  isInStoryMode() {
    return this.currentStory !== null;
  }

  // Enhanced story selection with introduction support
  async handleStorySelection(storyKey) {
    if (!storyKey) return;

    try {
      console.log(`📚 Starting story: ${storyKey}`);

      const story = this.content.getStory(storyKey);
      if (!story) {
        throw new Error(`Story "${storyKey}" not found`);
      }

      this.currentStory = story;
      this.currentChapter = 0;

      // NEW: Show introduction if available
      if (story.metadata?.introduction) {
        this.storytellerUI.showStoryIntroduction(story.metadata.introduction);
      }

      // Load first chapter
      await this.loadCurrentChapter();

    } catch (error) {
      console.error('Failed to start story:', error);
      this.ui.showError(`Failed to start story: ${error.message}`);
    }
  }

  // Load current chapter with flexible scenario matching
  async loadCurrentChapter() {
    if (!this.currentStory || this.currentChapter >= this.currentStory.chapters.length) {
      return;
    }

    const chapter = this.currentStory.chapters[this.currentChapter];
    console.log(`📖 Loading chapter ${this.currentChapter + 1}: ${chapter.title}`);

    // Enhanced chapter data
    const chapterData = {
      ...chapter,
      chapterNumber: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      isFirstChapter: this.currentChapter === 0,
      isLastChapter: this.currentChapter === this.currentStory.chapters.length - 1
    };

    // Update UI with chapter info
    this.storytellerUI.updateChapterDisplay(chapterData);

    // Try to load the scenario (with error recovery)
    try {
      await this.loadChapterScenario(chapter.scenario_key);
    } catch (error) {
      console.warn(`⚠️ Chapter scenario issue: ${error.message}`);
      this.storytellerUI.showScenarioError(error.message);
    }
  }

  // Load scenario for chapter with flexible matching
  async loadChapterScenario(scenarioKey) {
    // Try to find the scenario with flexible matching
    const actualKey = this.findScenarioMatch(scenarioKey);

    if (!actualKey) {
      throw new Error(`No scenario found matching "${scenarioKey}"`);
    }

    if (actualKey !== scenarioKey) {
      console.log(`🔍 Flexible match: "${scenarioKey}" → "${actualKey}"`);
    }

    // Load the scenario normally
    await this.handleScenarioSelection(actualKey);

    // Show scenario details in story mode
    const scenario = this.content.getScenario(actualKey);
    if (scenario) {
      this.storytellerUI.showStoryScenarioDetails(
        this.content.getSimulationData(actualKey),
        scenario.metadata
      );
    }
  }

  // Flexible scenario matching
  findScenarioMatch(requestedKey) {
    // Exact match first
    if (this.content.getScenario(requestedKey)) {
      return requestedKey;
    }

    // Use content manager's flexible matching
    const allScenarios = this.content.getAllScenarios();

    // Partial match - find scenarios that contain the key
    for (const scenarioKey of Object.keys(allScenarios)) {
      if (scenarioKey.includes(requestedKey) || requestedKey.includes(scenarioKey)) {
        return scenarioKey;
      }
    }

    // Tag-based matching
    for (const [scenarioKey, scenario] of Object.entries(allScenarios)) {
      const tags = scenario.metadata?.tags || [];
      if (tags.includes(requestedKey)) {
        return scenarioKey;
      }
    }

    return null;
  }

  // Story navigation
  async handleStoryNext() {
    if (!this.currentStory) return;

    if (this.currentChapter < this.currentStory.chapters.length - 1) {
      this.currentChapter++;
      await this.loadCurrentChapter();
    } else {
      // Story completed
      this.handleStoryComplete();
    }
  }

  async handleStoryPrevious() {
    if (!this.currentStory || this.currentChapter === 0) return;

    this.currentChapter--;
    await this.loadCurrentChapter();
  }

  handleStoryComplete() {
    console.log('📚 Story completed!');

    const shouldExit = confirm('Story completed! Exit story mode?');
    if (shouldExit) {
      this.exitStoryMode();
    }
  }

  handleStoryExit() {
    const shouldExit = confirm('Are you sure you want to exit the story?');
    if (shouldExit) {
      this.exitStoryMode();
    }
  }

  // Enhanced scenario selection (simplified with ContentManager)
  async handleScenarioSelection(scenarioKey) {
    if (!scenarioKey) {
      this.ui.hideScenarioPreview();
      this.ui.clearJsonEditor();
      this.ui.hideSimulationResults();
      return;
    }

    try {
      console.log(`Loading scenario: ${scenarioKey}`);

      const scenario = this.content.getScenario(scenarioKey);
      if (!scenario) {
        throw new Error(`Scenario "${scenarioKey}" not found`);
      }

      // Hide previous simulation results
      this.ui.hideSimulationResults();

      // Get simulation data (ContentManager handles all the complexity)
      const simulationData = this.content.getSimulationData(scenarioKey);
      if (!simulationData) {
        throw new Error('Failed to extract simulation data');
      }

      // Show scenario preview (only in normal mode)
      if (!this.isInStoryMode()) {
        this.ui.showScenarioPreview(scenario.metadata, simulationData);
      }

      // Load JSON into editor
      const jsonText = JSON.stringify(simulationData, null, 2);
      this.ui.loadJsonIntoEditor(jsonText);

      console.log(`✅ Successfully loaded scenario: ${scenarioKey}`);

    } catch (error) {
      console.error(`❌ Error loading scenario ${scenarioKey}:`, error);
      this.ui.showError(`Failed to load scenario: ${error.message}`);
    }
  }

  // Simulation execution (unchanged)
  handleSimulationExecution() {
    this.ui.setRunButtonLoading(true);

    setTimeout(() => {
      try {
        this.executeSimulation();
      } finally {
        this.ui.setRunButtonLoading(false);
      }
    }, 100);
  }

  executeSimulation() {
    try {
      // Get scenario data from JSON editor
      const jsonText = this.ui.getJsonFromEditor();
      if (!jsonText.trim()) {
        this.ui.showError('No scenario data to simulate. Please select a scenario or enter JSON data.');
        return;
      }

      // Parse JSON
      let scenarioData;
      try {
        scenarioData = JSON.parse(jsonText);
      } catch (error) {
        this.ui.showError(`Invalid JSON: ${error.message}`);
        return;
      }

      // Enhanced validation using ContentManager
      if (!this.validateScenarioData(scenarioData)) {
        return;
      }

      // Run simulation
      console.log('Running simulation with scenario:', scenarioData);
      const simulationResult = simulateScenarioAdvanced(scenarioData);
      console.log('Simulation result:', simulationResult);

      // Store result for debugging and story insights
      window._scenarioResult = simulationResult;
      window._storyMetrics = this.calculateStoryMetrics(simulationResult.results, scenarioData, simulationResult);

      // Render results
      const { results, balanceHistory, csvText, windfallUsedAtMonth } = simulationResult;

      renderCsv(csvText);
      renderChart(
        results,
        balanceHistory,
        scenarioData.title || "Retirement Simulation",
        { windfallUsedAtMonth }
      );

      // Handle post-simulation based on mode
      if (this.isInStoryMode()) {
        this.handleStorySimulationComplete(scenarioData, results);
      } else {
        this.ui.handleSimulationComplete(scenarioData, results);
      }

      console.log('✅ Simulation completed successfully');

    } catch (error) {
      console.error('Simulation error:', error);
      this.ui.showError(`Simulation failed: ${error.message}`);
    }
  }

  // Enhanced validation
  validateScenarioData(scenarioData) {
    if (!scenarioData.plan) {
      this.ui.showError('Scenario missing "plan" section');
      return false;
    }

    if (!scenarioData.assets || !Array.isArray(scenarioData.assets)) {
      this.ui.showError('Scenario missing "assets" array');
      return false;
    }

    if (typeof scenarioData.plan.monthly_expenses !== 'number') {
      this.ui.showError('Plan must have numeric "monthly_expenses"');
      return false;
    }

    return true;
  }

  // Story simulation completion with enhanced insights
  handleStorySimulationComplete(scenarioData, results) {
    this.storytellerUI.hideStoryElements();
    this.ui.showChartArea();

    // Use story-driven insights
    const storyInsights = this.generateStoryInsights(results, scenarioData);
    this.storytellerUI.showStoryInsights(storyInsights, this.getCurrentChapterData());

    // Show story-driven next action
    const nextAction = this.getStoryNextAction();
    this.storytellerUI.showStoryNextAction(nextAction);

    setTimeout(() => {
      this.storytellerUI.showStoryElements();
    }, 1000);

    this.ui.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
  }

  // Enhanced story insights generation
  generateStoryInsights(results, scenarioData) {
    const chapter = this.getCurrentChapterData();
    if (!chapter?.narrative?.insights) {
      return [];
    }

    // Process dynamic insights with simulation data
    return chapter.narrative.insights.map(template => {
      return this.processInsightTemplate(template, results, scenarioData);
    });
  }

  // Process insight templates with story metrics
  processInsightTemplate(template, results, scenarioData) {
    let processed = template;
    const metrics = window._storyMetrics || {};

    // Replace common placeholders
    for (const [key, value] of Object.entries(metrics)) {
      const placeholder = `{{${key}}}`;
      if (processed.includes(placeholder)) {
        processed = processed.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    return processed;
  }

  // Calculate story metrics
  calculateStoryMetrics(results, scenarioData, simulationResult) {
    const metrics = {};

    // Calculate when money runs out
    if (results && results.length > 0) {
      let moneyRunsOutYear = null;
      for (let i = 0; i < results.length; i++) {
        if (results[i].shortfall > 0) {
          moneyRunsOutYear = Math.round((i + 1) / 12);
          break;
        }
      }

      if (moneyRunsOutYear === null) {
        moneyRunsOutYear = Math.round(results.length / 12);
      }

      metrics.duration_years = moneyRunsOutYear;
      metrics.money_runs_out_year = moneyRunsOutYear;
    }

    // Other metrics
    if (scenarioData.plan?.monthly_expenses) {
      metrics.monthly_expenses = scenarioData.plan.monthly_expenses.toLocaleString();
    }

    return metrics;
  }

  // Helper methods
  getCurrentChapterData() {
    if (!this.currentStory || this.currentChapter >= this.currentStory.chapters.length) {
      return null;
    }

    const chapter = this.currentStory.chapters[this.currentChapter];
    return {
      ...chapter,
      chapterNumber: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      isFirstChapter: this.currentChapter === 0,
      isLastChapter: this.currentChapter === this.currentStory.chapters.length - 1
    };
  }

  getStoryNextAction() {
    const chapter = this.getCurrentChapterData();
    if (!chapter) return null;

    if (chapter.isLastChapter) {
      return {
        type: 'story_complete',
        title: 'Story Complete!',
        description: 'You\'ve completed this story.',
        action: 'Exit Story Mode'
      };
    }

    const nextChapter = this.currentStory.chapters[this.currentChapter + 1];
    return {
      type: 'next_chapter',
      title: `Next: ${nextChapter.title}`,
      description: nextChapter.narrative?.introduction || '',
      action: `Continue to Chapter ${this.currentChapter + 2}`
    };
  }

  // Public API (enhanced)
  getScenarios() {
    return this.content.getAllScenarios();
  }

  getStories() {
    return this.content.getAllStories();
  }

  getContentSummary() {
    return this.content.getContentSummary();
  }

  getCurrentStoryProgress() {
    if (!this.isInStoryMode()) return null;

    return {
      storyTitle: this.currentStory.metadata?.title || 'Unknown',
      currentChapter: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      progress: ((this.currentChapter + 1) / this.currentStory.chapters.length) * 100
    };
  }

  async refreshContent() {
    return await this.loadAllContent();
  }

  // Debug helpers
  debugContent() {
    console.log('📊 Content Debug Info:');
    console.log('Scenarios:', this.content.getAllScenarios());
    console.log('Stories:', this.content.getAllStories());
    console.log('Summary:', this.content.getContentSummary());
    console.log('Errors:', this.content.registry.errors);
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.retirementApp = new RetirementScenarioApp();

  // Debug helper
  window.debugContent = () => window.retirementApp.debugContent();
});
