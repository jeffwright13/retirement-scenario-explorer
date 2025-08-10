/**
 * Main Application Controller - Enhanced with Storyteller Mode
 * Shows how to integrate StoryManager and StorytellerUI without breaking existing functionality
 * Maintains clean separation of concerns
 */

import { renderChart, renderCsv } from './render.js';
import { UIManager } from './ui.js';
import { ScenarioManager } from './scenarios.js';
import { simulateScenarioAdvanced } from './timeaware-engine.js';
import { StoryManager } from './story-manager.js';        // NEW IMPORT
import { StorytellerUI } from './storyteller-ui.js';      // NEW IMPORT

class RetirementScenarioApp {
  constructor() {
    this.ui = new UIManager();
    this.scenarios = new ScenarioManager();
    this.stories = new StoryManager();                     // NEW: Story management
    this.storytellerUI = new StorytellerUI(this.ui);      // NEW: Story UI
    this.currentDiscussion = null;
    
    this.initialize();
  }

  // ENHANCED: Initialize with storyteller support
  async initialize() {
    console.log('🚀 Initializing Retirement Scenario Explorer with Storyteller Mode...');
    
    // Setup existing event handlers
    this.setupEventHandlers();
    
    // NEW: Setup storyteller event handlers  
    this.setupStorytellerHandlers();
    
    // Load scenarios and stories in parallel
    await Promise.all([
      this.loadScenarios(),
      this.loadStories()                                   // NEW: Parallel story loading
    ]);
    
    console.log('✅ Application initialized with storyteller support');
  }

  // EXISTING: Event handlers (unchanged - but story-mode aware)
  setupEventHandlers() {
    this.ui.onScenarioChange(async (e) => {
      // Only handle if not in story mode
      if (!this.stories.isInStoryMode()) {
        await this.handleScenarioSelection(e.target.value);
      }
    });

    this.ui.onRunSimulation(() => {
      this.handleSimulationExecution();
    });
  }

  // NEW: Storyteller-specific event handlers
  setupStorytellerHandlers() {
    // Story mode toggle
    this.storytellerUI.onStoryModeToggle(() => {
      this.toggleStoryMode();
    });

    // Story selection
    this.storytellerUI.onStorySelection((e) => {
      this.handleStorySelection(e.target.value);
    });

    // Set story navigation callbacks
    this.storytellerUI.setStoryCallbacks({
      onStoryStart: () => this.handleStoryStart(),
      onStoryNext: () => this.handleStoryNext(),
      onStoryPrevious: () => this.handleStoryPrevious(),
      onStoryExit: () => this.handleStoryExit()
    });
  }

  // NEW: Load available stories
  async loadStories() {
    try {
      const discoveredStories = await this.stories.discoverStories();
      const storyList = this.stories.getStoryList();
      this.storytellerUI.populateStorySelector(storyList);
      console.log(`✅ Loaded ${Object.keys(discoveredStories).length} stories`);
    } catch (error) {
      console.error('Failed to load stories:', error);
      // Don't break the app if stories fail to load - storyteller is optional
    }
  }

  // EXISTING: Scenario loading (unchanged)
  async loadScenarios() {
    try {
      const discoveredScenarios = await this.scenarios.discoverScenarios();
      const groupedScenarios = this.scenarios.groupScenariosByTag(discoveredScenarios);
      this.ui.populateScenarioDropdown(groupedScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      this.ui.showError('Failed to load scenarios. Please check your data files.');
    }
  }

  // NEW: Toggle between normal and story mode
  toggleStoryMode() {
    if (this.stories.isInStoryMode()) {
      this.exitStoryMode();
    } else {
      this.enterStoryMode();
    }
  }

  // NEW: Enter story mode
  enterStoryMode() {
    console.log('🎭 Entering story mode');
    this.storytellerUI.enterStoryMode();
  }

  // NEW: Exit story mode
  exitStoryMode() {
    console.log('🎭 Exiting story mode');
    this.stories.exitStory();
    this.storytellerUI.exitStoryMode();
  }

  // NEW: Handle story selection
  async handleStorySelection(storyKey) {
    if (!storyKey) return;

    try {
      console.log(`📚 Starting story: ${storyKey}`);
      const chapter = this.stories.startStory(storyKey);
      
      if (chapter) {
        this.storytellerUI.updateChapterDisplay(chapter);
        await this.loadStoryChapterScenario(chapter);
      }
    } catch (error) {
      console.error('Failed to start story:', error);
      this.ui.showError(`Failed to start story: ${error.message}`);
    }
  }

  // NEW: Load scenario for current story chapter
  async loadStoryChapterScenario(chapter) {
    console.log(`📖 Loading chapter scenario: ${chapter.scenario_key}`);
    
    // Load the scenario normally
    await this.handleScenarioSelection(chapter.scenario_key);
    
    // Update UI to reflect story context
    this.storytellerUI.updateChapterDisplay(chapter);
  }

  // NEW: Advance to next story chapter
  async handleStoryNext() {
    const nextChapter = this.stories.nextChapter();
    
    if (nextChapter) {
      this.storytellerUI.updateChapterDisplay(nextChapter);
      await this.loadStoryChapterScenario(nextChapter);
    } else {
      // Story completed
      this.handleStoryComplete();
    }
  }

  // NEW: Go to previous story chapter  
  async handleStoryPrevious() {
    const prevChapter = this.stories.previousChapter();
    
    if (prevChapter) {
      this.storytellerUI.updateChapterDisplay(prevChapter);
      await this.loadStoryChapterScenario(prevChapter);
    }
  }

  // NEW: Handle story completion
  handleStoryComplete() {
    console.log('📚 Story completed!');
    
    // Could show completion screen, suggest new stories, etc.
    const shouldExit = confirm('Story completed! Exit story mode?');
    if (shouldExit) {
      this.exitStoryMode();
    }
  }

  // NEW: Handle story exit
  handleStoryExit() {
    const shouldExit = confirm('Are you sure you want to exit the story?');
    if (shouldExit) {
      this.exitStoryMode();
    }
  }

  // ENHANCED: Scenario selection with story mode awareness (replaces your existing method)
  async handleScenarioSelection(scenarioKey) {
    if (!scenarioKey) {
      // Clear selection
      this.ui.hideScenarioPreview();
      this.ui.clearJsonEditor();
      this.ui.hideSimulationResults();
      this.currentDiscussion = null;
      return;
    }

    const scenario = this.scenarios.getScenario(scenarioKey);
    if (!scenario) {
      this.ui.showError(`Scenario "${scenarioKey}" not found`);
      return;
    }

    try {
      console.log(`Loading scenario: ${scenarioKey}`);
      console.log('Raw scenario data:', scenario);
      
      // Hide previous simulation results
      this.ui.hideSimulationResults();
      
      // Get simulation data with error checking
      const simulationData = this.scenarios.getSimulationData(scenarioKey);
      console.log('Simulation data:', simulationData);
      
      if (!simulationData) {
        throw new Error('Failed to extract simulation data from scenario');
      }
      
      // Validate that we have the essential parts
      if (!simulationData.plan) {
        throw new Error('Scenario missing plan section');
      }
      
      // Show scenario preview ONLY in normal mode (not story mode)
      if (!this.stories.isInStoryMode()) {
        this.ui.showScenarioPreview(scenario.metadata, simulationData);
      }
      
      // Load JSON into editor
      const jsonText = JSON.stringify(simulationData, null, 2);
      this.ui.loadJsonIntoEditor(jsonText);
      
      // Load discussion content for normal mode only
      if (!this.stories.isInStoryMode()) {
        this.currentDiscussion = await this.scenarios.loadDiscussion(scenario);
      }
      
      console.log(`✅ Successfully loaded scenario: ${scenarioKey}`);
      
    } catch (error) {
      console.error(`❌ Error loading scenario ${scenarioKey}:`, error);
      console.error('Error stack:', error.stack);
      this.ui.showError(`Failed to load scenario: ${error.message}`);
    }
  }

  // EXISTING: Simulation execution (unchanged)
  handleSimulationExecution() {
    this.ui.setRunButtonLoading(true);

    // Small delay to show loading state
    setTimeout(() => {
      try {
        this.executeSimulation();
      } finally {
        this.ui.setRunButtonLoading(false);
      }
    }, 100);
  }

  // ENHANCED: Simulation execution with story mode support
  executeSimulation() {
    try {
      // Get scenario data from JSON editor
      const jsonText = this.ui.getJsonFromEditor();
      if (!jsonText.trim()) {
        this.ui.showError('No scenario data to simulate. Please select a scenario or enter JSON data.');
        return;
      }

      // Parse and validate JSON
      let scenarioData;
      try {
        scenarioData = JSON.parse(jsonText);
      } catch (error) {
        this.ui.showError(`Invalid JSON: ${error.message}`);
        return;
      }

      // Convert legacy format if needed
      scenarioData = this.scenarios.convertLegacyScenario(scenarioData);

      // Validate scenario
      const validation = this.scenarios.validateScenario(scenarioData);
      if (!validation.isValid) {
        this.ui.showError(`Invalid scenario:\n${validation.errors.join('\n')}`);
        return;
      }

      // Run simulation
      console.log('Running simulation with scenario:', scenarioData);
      const simulationResult = simulateScenarioAdvanced(scenarioData);
      console.log('Simulation result:', simulationResult);

      // Store result for debugging
      window._scenarioResult = simulationResult;

      // Render results
      const { results, balanceHistory, csvText, windfallUsedAtMonth } = simulationResult;
      
      // FIXED: Calculate story metrics AFTER destructuring results
      window._storyMetrics = this.calculateStoryMetrics(results, scenarioData, simulationResult);
      
      renderCsv(csvText);
      renderChart(
        results, 
        balanceHistory, 
        scenarioData.title || "Retirement Simulation", 
        { windfallUsedAtMonth }
      );

      // ENHANCED: Handle post-simulation with story mode awareness
      if (this.stories.isInStoryMode()) {
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

  // NEW: Handle simulation completion in story mode
  handleStorySimulationComplete(scenarioData, results) {
    // Hide story narrative during results view
    this.storytellerUI.hideStoryElements();
    
    // Show chart area
    this.ui.showChartArea();
    
    // Use story-driven insights instead of hardcoded ones
    const storyInsights = this.stories.getStoryInsights(results, scenarioData);
    this.storytellerUI.showStoryInsights(storyInsights, this.stories.getCurrentChapter());
    
    // Show story-driven next action
    const nextAction = this.stories.getStoryNextAction();
    this.storytellerUI.showStoryNextAction(nextAction);
    
    // Show story elements again after a brief delay
    setTimeout(() => {
      this.storytellerUI.showStoryElements();
    }, 1000);
    
    // Scroll to results
    this.ui.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
  }

  // NEW: Calculate story metrics (PROPER place for calculations)
  calculateStoryMetrics(results, scenarioData, simulationResult) {
    const metrics = {};
    
    // Calculate when money runs out (for retirement scenarios)
    if (results && results.length > 0) {
      let moneyRunsOutYear = null;
      for (let i = 0; i < results.length; i++) {
        if (results[i].shortfall > 0) {
          moneyRunsOutYear = Math.round((i + 1) / 12);
          break;
        }
      }
      
      // If no shortfall found, money lasts the full duration
      if (moneyRunsOutYear === null) {
        moneyRunsOutYear = Math.round(results.length / 12);
      }
      
      metrics.duration_years = moneyRunsOutYear;
      metrics.money_runs_out_year = moneyRunsOutYear;
    }
    
    // Calculate monthly expenses
    if (scenarioData.plan?.monthly_expenses) {
      metrics.monthly_expenses = scenarioData.plan.monthly_expenses.toLocaleString();
    }
    
    // Calculate withdrawal rate (for retirement scenarios)
    if (scenarioData.plan?.monthly_expenses && simulationResult?.balanceHistory) {
      const monthlyExpenses = scenarioData.plan.monthly_expenses;
      const initialBalance = Object.values(simulationResult.balanceHistory).reduce((total, balances) => {
        return total + (balances[0] || 0);
      }, 0);
      
      if (initialBalance > 0) {
        const annualWithdrawal = monthlyExpenses * 12;
        const withdrawalRate = (annualWithdrawal / initialBalance * 100).toFixed(1);
        metrics.withdrawal_rate = withdrawalRate;
      }
    }
    
    // Calculate compound interest metrics (for accumulation scenarios)
    if (simulationResult?.balanceHistory && scenarioData.deposits) {
      const balanceHistory = simulationResult.balanceHistory;
      
      // Get final balance from the investment portfolio
      const investmentBalances = balanceHistory['Investment Portfolio'] || [];
      const finalBalance = investmentBalances[investmentBalances.length - 1] || 0;
      
      // Calculate total deposits
      let totalDeposits = 0;
      scenarioData.deposits.forEach(deposit => {
        const months = (deposit.stop_month || results.length) - (deposit.start_month - 1);
        totalDeposits += deposit.amount * months;
      });
      
      if (finalBalance > 0 && totalDeposits > 0) {
        const profit = finalBalance - totalDeposits;
        const multiplier = finalBalance / totalDeposits;
        
        metrics.final_balance_formatted = `${Math.round(finalBalance).toLocaleString()}`;
        metrics.profit_formatted = `${Math.round(profit).toLocaleString()}`;
        metrics.multiplier_formatted = multiplier.toFixed(1);
        metrics.total_invested_formatted = `${totalDeposits.toLocaleString()}`;
      }
    }
    
    return metrics;
  }

  // EXISTING: Public API - Enhanced with story support
  getScenarios() {
    return this.scenarios.getDiscoveredScenarios();
  }

  // NEW: Story support in public API
  getStories() {
    return this.stories.getDiscoveredStories();
  }

  getCurrentStoryProgress() {
    return this.stories.getStoryProgress();
  }

  isInStoryMode() {
    return this.stories.isInStoryMode();
  }

  getCurrentDiscussion() {
    return this.currentDiscussion;
  }

  async refreshScenarios() {
    return await this.loadScenarios();
  }

  async refreshStories() {
    return await this.loadStories();
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.retirementApp = new RetirementScenarioApp();
});