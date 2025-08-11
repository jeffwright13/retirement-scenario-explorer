/**
 * Enhanced Main Application Controller - Now using ContentManager
 * Simplified content management with automatic discovery and flexible relationships
 */

import { renderChart, renderCsv } from './render.js';
import { UIManager } from './ui.js';
import { ContentManager } from './content-manager.js';        // NEW: Unified content management
import { simulateScenarioAdvanced } from './timeaware-engine.js';
import { StorytellerUI } from './storyteller-ui.js';

class RetirementScenarioApp {
  constructor() {
    this.ui = new UIManager();
    this.content = new ContentManager();                      // NEW: Single content manager
    this.storytellerUI = new StorytellerUI(this.ui);
    this.currentStory = null;
    this.currentChapter = null;

    this.initialize();
  }

  // Enhanced initialization with automatic content discovery
  async initialize() {
    console.log('🚀 Initializing Enhanced Retirement Scenario Explorer...');

    // Setup event handlers
    this.setupEventHandlers();
    this.setupStorytellerHandlers();

    // Automatic content discovery - no more manual configuration!
    await this.loadAllContent();

    console.log('✅ Application initialized with enhanced content management');
    console.log('📊 Content summary:', this.content.getContentSummary());

    // Show any content errors (but don't break the app)
    if (this.content.hasErrors()) {
      console.warn('⚠️ Some content had issues:', this.content.registry.errors);
    }
  }

  // Load all content automatically
  async loadAllContent() {
    try {
      console.log('🔍 Starting automatic content discovery...');

      // Single call discovers everything
      const registry = await this.content.discoverContent();

      // Update UI with discovered content
      this.updateUIWithContent(registry);

      console.log(`✅ Loaded ${registry.scenarios.length} scenarios and ${registry.stories.length} stories`);

    } catch (error) {
      console.error('❌ Content discovery failed:', error);
      this.ui.showError('Failed to load content. Some features may not work correctly.');
    }
  }

  // Update UI with discovered content
  updateUIWithContent(registry) {
    // Update scenario dropdown with grouped scenarios
    const groupedScenarios = this.content.groupScenariosByTag();
    this.ui.populateScenarioDropdown(groupedScenarios);

    // Update story selector with discovered stories
    const storyList = this.content.getStoryList();
    this.storytellerUI.populateStorySelector(storyList);

    console.log('✅ UI updated with discovered content');
  }

  // Event handlers
  setupEventHandlers() {
    this.ui.onScenarioChange(async (e) => {
      if (!this.isInStoryMode()) {
        await this.handleScenarioSelection(e.target.value);
      }
    });

    this.ui.onRunSimulation(() => {
      this.handleSimulationExecution();
    });

    // ADD these new event handlers after the existing ones:
    // Primary run button (in getting started panel)
    document.getElementById('run-btn-primary')?.addEventListener('click', () => {
      this.handleSimulationExecution();
    });

    // Advanced run button (in advanced options)
    document.getElementById('run-btn-advanced')?.addEventListener('click', () => {
      this.handleSimulationExecution();
    });
  }

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
