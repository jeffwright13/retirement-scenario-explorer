/**
 * UI Controller - Coordinates UI updates and user interactions
 * Acts as a bridge between business logic and UI components
 */
import { UIManager } from '../ui.js';
import { StorytellerUI } from '../storyteller-ui.js';

export class UIController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.ui = new UIManager();
    this.storytellerUI = new StorytellerUI(this.ui);
    this.currentScenario = null; // Store current scenario for simulation
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Content events
    this.eventBus.on('scenarios:loaded', (scenarios) => this.handleScenariosLoaded(scenarios));
    this.eventBus.on('stories:loaded', (stories) => this.handleStoriesLoaded(stories));
    this.eventBus.on('content:loading-started', () => this.showContentLoading());
    this.eventBus.on('content:loaded', () => this.hideContentLoading());
    this.eventBus.on('content:errors', (errors) => this.showContentErrors(errors));

    // Scenario events
    this.eventBus.on('scenario:selected', (data) => this.handleScenarioSelected(data));
    this.eventBus.on('scenario:preview-generated', (data) => this.showScenarioPreview(data));
    this.eventBus.on('scenario:validation-failed', (data) => this.showValidationErrors(data));
    this.eventBus.on('scenario:custom-loaded', (data) => this.handleCustomScenarioLoaded(data));

    // Story events - handled by StoryController, UI gets stories via 'stories:loaded'
    this.eventBus.on('story:mode-entered', () => this.enterStoryMode());
    this.eventBus.on('story:mode-exited', () => this.exitStoryMode());
    this.eventBus.on('story:selected', (data) => this.handleStorySelected(data));
    this.eventBus.on('story:chapter-changed', (data) => this.handleChapterChanged(data));
    this.eventBus.on('story:completed', (data) => this.handleStoryCompleted(data));

    // Simulation events
    this.eventBus.on('simulation:started', (data) => this.showSimulationLoading(data));
    this.eventBus.on('simulation:completed', (data) => this.handleSimulationCompleted(data));
    this.eventBus.on('simulation:error', (data) => this.showSimulationError(data));

    // Error events
    this.eventBus.on('error', (message) => this.showError(message));
    this.eventBus.on('warning', (message) => this.showWarning(message));
    this.eventBus.on('success', (message) => this.showSuccess(message));

    // Note: UI interaction listeners are set up in initialize() after DOM is ready
  }

  /**
   * Setup listeners for UI interactions
   */
  setupUIInteractionListeners() {
    // Scenario selection - using existing UI method
    this.ui.onScenarioChange((e) => {
      const scenarioKey = e.target.value;
      console.log('🎯 Scenario selected:', scenarioKey);
      if (scenarioKey) {
        this.eventBus.emit('scenario:select', scenarioKey);
      }
    });

    // Simulation run - using existing UI method
    console.log('🔧 Setting up run simulation handler, button element:', this.ui.elements.runBtn);
    this.ui.onRunSimulation(() => {
      console.log('🚀 Run simulation clicked, current scenario:', this.currentScenario);
      if (this.currentScenario) {
        this.eventBus.emit('scenario:run-simulation', { scenario: this.currentScenario });
      } else {
        // Try to get scenario from JSON input as fallback
        const jsonText = this.ui.elements.jsonInput?.value;
        if (jsonText) {
          try {
            const scenario = JSON.parse(jsonText);
            this.eventBus.emit('scenario:run-simulation', { scenario });
          } catch (error) {
            console.error('Failed to parse JSON for simulation:', error);
            this.ui.showError('Please select a valid scenario before running simulation');
          }
        } else {
          this.ui.showError('Please select a scenario before running simulation');
        }
      }
    });

    // Custom JSON scenario loading
    this.setupJsonScenarioHandling();
  }

  /**
   * Setup JSON scenario handling
   */
  setupJsonScenarioHandling() {
    // Monitor for JSON input changes and validate
    const jsonInput = this.ui.elements.jsonInput;
    if (jsonInput) {
      jsonInput.addEventListener('input', () => {
        this.handleJsonInputChange();
      });
    }

    // Run button for JSON scenarios
    const runBtn = this.ui.elements.runBtn;
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this.handleRunButtonClick();
      });
    }
  }

  /**
   * Handle JSON input changes
   */
  handleJsonInputChange() {
    try {
      const jsonText = this.ui.getJsonFromEditor();
      if (jsonText.trim()) {
        const scenarioData = JSON.parse(jsonText);
        // Emit custom scenario load event
        this.eventBus.emit('scenario:load-custom', scenarioData);
      }
    } catch (error) {
      // Invalid JSON - don't emit event
      console.log('Invalid JSON input:', error.message);
    }
  }

  /**
   * Handle run button click
   */
  handleRunButtonClick() {
    // Check if we have a custom JSON scenario
    const jsonText = this.ui.getJsonFromEditor();
    if (jsonText.trim()) {
      try {
        const scenarioData = JSON.parse(jsonText);
        this.eventBus.emit('scenario:run-simulation', { scenario: scenarioData });
        return;
      } catch (error) {
        this.showError('Invalid JSON format');
        return;
      }
    }
    
    // Otherwise run simulation for selected scenario
    this.eventBus.emit('scenario:run-simulation');
  }

  /**
   * Initialize UI components
   */
  initialize() {
    console.log('🎨 Initializing UI Controller');
    
    // Setup storyteller callbacks
    this.storytellerUI.setStoryCallbacks({
      onStoryStart: () => this.eventBus.emit('story:start'),
      onStoryNext: () => this.eventBus.emit('story:next'),
      onStoryPrevious: () => this.eventBus.emit('story:previous'),
      onStoryExit: () => this.eventBus.emit('story:exit')
    });

    this.storytellerUI.onStoryModeToggle(() => {
      this.eventBus.emit('story:toggle-mode');
    });

    this.storytellerUI.onStorySelection((e) => {
      this.eventBus.emit('story:select', e.target.value);
    });
    
    // Setup UI interaction listeners now that DOM is ready
    console.log('🔧 About to setup UI interaction listeners...');
    this.setupUIInteractionListeners();
    console.log('🔧 UI interaction listeners setup complete');
    
    console.log('✅ UI Controller initialized');
  }

  /**
   * Handle scenarios loaded
   * @param {Array} scenarios - Available scenarios
   */
  handleScenariosLoaded(scenarios) {
    // Group scenarios for the dropdown
    const groupedScenarios = this.groupScenarios(scenarios);
    this.ui.populateScenarioDropdown(groupedScenarios);
    console.log(`🎨 UI: Populated ${scenarios.length} scenarios`);
  }

  /**
   * Group scenarios by tags for dropdown
   * @param {Array} scenarios - Scenarios to group
   * @returns {Object} Grouped scenarios in UI format
   */
  groupScenarios(scenarios) {
    if (!Array.isArray(scenarios)) {
      console.warn('groupScenarios received non-array:', scenarios);
      return {};
    }
    
    const grouped = {};
    scenarios.forEach(scenario => {
      const category = scenario.tags?.[0] || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      // UI expects [key, scenario] tuples
      grouped[category].push([scenario.key, scenario]);
    });
    return grouped;
  }

  /**
   * Handle stories loaded
   * @param {Array} stories - Available stories
   */
  handleStoriesLoaded(stories) {
    // Convert array back to object format for storyteller UI
    const storiesObject = {};
    stories.forEach(story => {
      if (story.key) {
        storiesObject[story.key] = story;
      }
    });
    
    this.storytellerUI.populateStorySelector(storiesObject);
    console.log(`🎨 UI: Populated ${stories.length} stories`);
  }

  /**
   * Show content loading state
   */
  showContentLoading() {
    this.ui.setRunButtonLoading(true);
  }

  /**
   * Hide content loading state
   */
  hideContentLoading() {
    this.ui.setRunButtonLoading(false);
  }

  /**
   * Show content errors
   * @param {Array} errors - Content errors
   */
  showContentErrors(errors) {
    if (errors.length > 0) {
      this.ui.showWarning(`Some content had issues: ${errors.length} errors found`);
    }
  }

  /**
   * Show simulation loading state
   * @param {Object} data - Simulation start data
   */
  showSimulationLoading(data) {
    console.log('🔄 Simulation started, showing loading state');
    this.ui.setRunButtonLoading(true);
  }

  /**
   * Handle simulation completed
   * @param {Object} data - Simulation results
   */
  async handleSimulationCompleted(data) {
    console.log('✅ Simulation completed, showing results');
    console.log('🔍 DEBUG: Simulation data structure:', data);
    this.ui.setRunButtonLoading(false);
    
    try {
      // Import render functions
      const { renderChart, renderCsv } = await import('../render.js');
      
      // Extract results from the simulation data
      const { results, insights, metrics } = data;
      console.log('🔍 DEBUG: Extracted results:', results);
      console.log('🔍 DEBUG: Extracted insights:', insights);
      
      // Render the chart - this is the key missing piece!
      if (results && results.results) {
        console.log('📊 Rendering chart with simulation results');
        console.log('🔍 DEBUG: results.results length:', results.results.length);
        console.log('🔍 DEBUG: results.balanceHistory:', results.balanceHistory);
        
        // Show the chart area by adding the has-results class
        const chartArea = document.getElementById('chart-area');
        if (chartArea) {
          chartArea.classList.add('has-results');
          
          // Force explicit dimensions to ensure visibility
          chartArea.style.width = '100%';
          chartArea.style.height = '500px';
          chartArea.style.minHeight = '500px';
          chartArea.style.display = 'block';
          chartArea.style.visibility = 'visible';
          
          console.log('✅ Chart area made visible with has-results class');
          console.log('🔍 Chart area dimensions:', {
            width: chartArea.offsetWidth,
            height: chartArea.offsetHeight,
            display: getComputedStyle(chartArea).display,
            visibility: getComputedStyle(chartArea).visibility
          });
        }
        
        renderChart(results.results, results.balanceHistory, 'Retirement Simulation', {});
        
        // Also render CSV if available
        if (results.csvText) {
          console.log('📄 Rendering CSV data');
          renderCsv(results.csvText);
        }
      } else {
        console.warn('⚠️ No results.results found for chart rendering');
        console.log('🔍 DEBUG: Available data keys:', Object.keys(data));
        
        // Try alternative data structure
        if (data.results && Array.isArray(data.results)) {
          console.log('📊 Trying alternative: rendering chart with data.results directly');
          renderChart(data.results, data.balanceHistory, 'Retirement Simulation', {});
        }
      }
      
      // Display insights if available
      if (insights && insights.length > 0) {
        this.displayInsights(insights);
      } else {
        console.warn('⚠️ No insights to display');
      }
      
      console.log('✅ Chart and results displayed successfully');
      
    } catch (error) {
      console.error('❌ Error displaying simulation results:', error);
      this.ui.showError('Failed to display simulation results');
    }
  }

  /**
   * Show simulation error
   * @param {Object} data - Error data
   */
  showSimulationError(data) {
    console.log('❌ Simulation error:', data);
    this.ui.setRunButtonLoading(false);
    this.ui.showError(`Simulation failed: ${data.error?.message || 'Unknown error'}`);
  }

  /**
   * Display simulation insights in the UI
   * @param {Array} insights - Array of insight objects
   */
  displayInsights(insights) {
    const insightsList = document.getElementById('insights-list');
    if (!insightsList) {
      console.warn('Insights list element not found');
      return;
    }

    // Clear existing insights
    insightsList.innerHTML = '';

    // Add each insight as a list item
    insights.forEach(insight => {
      const li = document.createElement('li');
      li.className = `insight insight--${insight.type}`;
      
      // Add icon based on insight type
      const icon = insight.type === 'warning' ? '⚠️' : 
                   insight.type === 'error' ? '❌' : 
                   insight.type === 'success' ? '✅' : '💡';
      
      li.innerHTML = `${icon} ${insight.message}`;
      insightsList.appendChild(li);
    });

    // Show the insights section
    const insightsSection = document.getElementById('simulation-insights');
    if (insightsSection) {
      insightsSection.style.display = 'block';
    }

    console.log(`✅ Displayed ${insights.length} insights`);
  }

  /**
   * Handle scenario selected
   * @param {Object} data - Scenario selection data
   */
  handleScenarioSelected(data) {
    const { scenario, validation, key } = data;
    
    console.log('🎯 UIController: Handling scenario selection', { key, scenario });
    
    // Store current scenario for simulation
    this.currentScenario = scenario;
    
    // Update UI with scenario JSON data
    if (this.ui.elements.jsonInput) {
      console.log('🎯 Setting JSON input with scenario:', scenario);
      this.ui.elements.jsonInput.value = JSON.stringify(scenario, null, 2);
      // Trigger the JSON monitoring to update preview with a small delay
      setTimeout(() => {
        console.log('🔄 Triggering QuickPeek update...');
        this.ui.updateQuickPeekFromJsonInput();
      }, 10);
    }
    
    // Show validation issues if any
    if (validation.warnings.length > 0) {
      this.ui.showWarning(`Scenario warnings: ${validation.warnings.join(', ')}`);
    }
    
    if (validation.errors.length > 0) {
      this.ui.showError(`Scenario errors: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Show scenario preview
   * @param {Object} data - Preview data
   */
  showScenarioPreview(data) {
    const { preview } = data;
    this.ui.showScenarioPreview(preview.keyMetrics, preview);
  }

  /**
   * Update scenario preview with generated data
   * @param {Object} preview - Preview data
   */
  updateScenarioPreview(preview) {
    this.ui.showScenarioPreview(preview.keyMetrics, preview);
  }

  /**
   * Show validation errors
   * @param {Object} data - Validation data
   */
  showValidationErrors(data) {
    const { validation } = data;
    this.ui.showError(`Validation failed: ${validation.errors.join(', ')}`);
  }

  /**
   * Handle custom scenario loaded
   * @param {Object} data - Custom scenario data
   */
  handleCustomScenarioLoaded(data) {
    const { scenario, validation } = data;
    this.ui.showSuccess('Custom scenario loaded successfully');
    this.showScenarioPreview({ preview: this.generatePreviewFromScenario(scenario) });
  }

  /**
   * Show simulation loading
   * @param {Object} data - Simulation data
   */
  showSimulationLoading(data) {
    this.ui.setRunButtonLoading(true);
  }



  /**
   * Show regular simulation results
   * @param {Object} result - Simulation result
   */
  async showRegularResults(result) {
    this.ui.showChartArea();
    
    // Render chart and CSV
    const { renderChart, renderCsv } = await import('../render.js');
    renderChart(result.results, result.scenarioData);
    renderCsv(result.results, result.scenarioData);
    
    // Show insights
    this.ui.showSimulationInsights(result.results, result.scenarioData);
    
    // Scroll to results
    this.ui.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Hide/show regular controls for story mode
   */
  hideRegularControls() {
    // Hide getting started panel when in story mode
    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'none';
    }
  }

  showRegularControls() {
    // Show getting started panel when exiting story mode
    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'block';
    }
  }

  /**
   * Scroll to chart area
   */
  scrollToChart() {
    if (this.ui.elements.chartArea) {
      this.ui.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Show story simulation results
   * @param {Object} result - Simulation result
   */
  async showStoryResults(result) {
    // Hide story elements temporarily
    this.storytellerUI.hideStoryElements();
    
    // Show chart
    this.ui.showChartArea();
    const { renderChart } = await import('../render.js');
    renderChart(result.results, result.scenarioData);
    
    // Show story-specific insights
    const storyInsights = result.insights.filter(insight => insight.type === 'story');
    if (storyInsights.length > 0) {
      this.storytellerUI.showStoryInsights(storyInsights, result.context.chapter);
    }
    
    // Show regular insights
    const regularInsights = result.insights.filter(insight => insight.type !== 'story');
    this.ui.showInsights(regularInsights);
    
    // Show story elements again after delay
    setTimeout(() => {
      this.storytellerUI.showStoryElements();
    }, 1000);
    
    this.ui.scrollToChart();
  }

  /**
   * Show simulation error
   * @param {Object} data - Error data
   */
  showSimulationError(data) {
    this.ui.setRunButtonLoading(false);
    this.ui.showError(`Simulation failed: ${data.error.message}`);
  }

  /**
   * Enter story mode
   */
  enterStoryMode() {
    this.storytellerUI.enterStoryMode();
    this.hideRegularControls();
  }

  /**
   * Exit story mode
   */
  exitStoryMode() {
    this.storytellerUI.exitStoryMode();
    this.ui.showRegularControls();
  }

  /**
   * Handle story started
   * @param {Object} data - Story start data
   */
  handleStoryStarted(data) {
    const { story, introduction } = data;
    
    if (introduction) {
      this.storytellerUI.showStoryIntroduction(introduction);
    }
    
    console.log(`🎨 UI: Started story "${story.metadata?.title}"`);
  }

  /**
   * Show chapter
   * @param {Object} chapter - Chapter data
   */
  showChapter(chapter) {
    this.storytellerUI.updateChapterDisplay(chapter);
    console.log(`🎨 UI: Showing chapter ${chapter.chapterNumber}: ${chapter.title}`);
  }

  /**
   * Handle story simulation completed
   * @param {Object} data - Story simulation data
   */
  handleStorySimulationCompleted(data) {
    const { result, chapter, nextAction } = data;
    
    // Show next action
    if (nextAction) {
      this.storytellerUI.showStoryNextAction(nextAction);
    }
  }

  /**
   * Show error message
   * @param {string|Error} error - Error to display
   */
  showError(error) {
    const message = typeof error === 'string' ? error : error.message;
    this.ui.showError(message);
  }

  /**
   * Handle system errors
   * @param {Object} data - System error data
   */
  handleSystemError(data) {
    console.error('System error:', data);
    this.ui.showError('A system error occurred. Please check the console for details.');
  }

  /**
   * Generate preview from scenario (helper)
   * @param {Object} scenario - Scenario data
   * @returns {Object} Preview object
   */
  generatePreviewFromScenario(scenario) {
    return {
      title: scenario.title || 'Custom Scenario',
      description: scenario.description || 'Custom scenario loaded from JSON',
      keyMetrics: {
        monthlyExpenses: scenario.plan?.monthly_expenses || 0,
        totalAssets: scenario.assets?.reduce((sum, asset) => sum + (asset.initial_value || 0), 0) || 0
      },
      assumptions: [
        `Monthly expenses: $${(scenario.plan?.monthly_expenses || 0).toLocaleString()}`,
        `Assets: ${scenario.assets?.length || 0} items`
      ]
    };
  }

  /**
   * Get UI manager instance
   * @returns {UIManager} UI manager
   */
  getUIManager() {
    return this.ui;
  }

  /**
   * Get storyteller UI instance
   * @returns {StorytellerUI} Storyteller UI
   */
  getStorytellerUI() {
    return this.storytellerUI;
  }
}
