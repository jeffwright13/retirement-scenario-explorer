/**
 * UI Controller - Coordinates UI updates and user interactions
 * Pure event-driven UI management without legacy dependencies
 */
import { StorytellerUI } from '../storyteller-ui.js';

export class UIController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.storytellerUI = new StorytellerUI();
    this.currentScenario = null; // Store current scenario for simulation
    
    // Initialize UI elements
    this.initializeUIElements();
    this.setupEventListeners();
  }

  /**
   * Initialize UI element references
   */
  initializeUIElements() {
    // Scenario elements
    this.scenarioDropdown = document.getElementById('scenario-dropdown');
    this.storyDropdown = document.getElementById('story-dropdown');
    this.runButton = document.getElementById('run-btn-primary');
    this.jsonPreview = document.getElementById('json-preview');
    
    // Results elements
    this.resultsSection = document.getElementById('results-section');
    this.chartArea = document.getElementById('chart-area');
    this.insightsSection = document.getElementById('insights-section');
    
    // Story mode elements
    this.storyModeToggle = document.getElementById('story-mode-toggle');
    this.storyPanel = document.getElementById('story-panel');
    
    console.log('🎨 UI elements initialized');
  }

  /**
   * Set up UI event listeners for user interactions
   */
  setupUIEventListeners() {
    // Scenario dropdown change
    if (this.scenarioDropdown) {
      this.scenarioDropdown.addEventListener('change', (e) => {
        const scenarioKey = e.target.value;
        if (scenarioKey) {
          this.eventBus.emit('scenario:selected', scenarioKey);
        }
      });
    }

    // Run simulation button
    if (this.runButton) {
      this.runButton.addEventListener('click', () => {
        if (this.currentScenario) {
          this.eventBus.emit('simulation:run', this.currentScenario);
        } else {
          this.showError('Please select a scenario before running simulation');
        }
      });
    }

    // Story mode toggle
    if (this.storyModeToggle) {
      this.storyModeToggle.addEventListener('click', () => {
        this.eventBus.emit('story:mode-toggle');
      });
    }

    console.log('🔧 UI event listeners setup complete');
  }

  /**
   * Populate scenario dropdown with scenarios
   */
  populateScenarioDropdown(scenarios) {
    if (!this.scenarioDropdown) return;

    this.scenarioDropdown.innerHTML = '<option value="">Select a scenario...</option>';
    
    scenarios.forEach(scenario => {
      const option = document.createElement('option');
      option.value = scenario.key;
      option.textContent = scenario.title || scenario.key;
      this.scenarioDropdown.appendChild(option);
    });

    console.log(`🎨 UI: Populated ${scenarios.length} scenarios`);
  }

  /**
   * Show error message to user
   */
  showError(message) {
    console.error('❌', message);
    // You could implement a toast notification or error display here
  }

  /**
   * Show success message to user
   */
  showSuccess(message) {
    console.log('✅', message);
    // You could implement a toast notification or success display here
  }

  /**
   * Show warning message to user
   */
  showWarning(message) {
    console.warn('⚠️', message);
    // You could implement a toast notification or warning display here
  }

  /**
   * Set run button loading state
   */
  setRunButtonLoading(isLoading) {
    if (!this.runButton) return;
    
    this.runButton.disabled = isLoading;
    this.runButton.textContent = isLoading ? 'Running...' : 'Run Simulation';
  }

  /**
   * Show chart area with results
   */
  showChartArea() {
    if (this.chartArea) {
      this.chartArea.classList.add('has-results');
      this.chartArea.style.display = 'block';
    }
  }

  /**
   * Update JSON preview with scenario data
   */
  updateJsonPreview(scenario) {
    if (this.jsonPreview) {
      this.jsonPreview.textContent = JSON.stringify(scenario, null, 2);
    }
  }

  setupEventListeners() {
    // Set up UI event listeners
    this.setupUIEventListeners();
    
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
      // UI event listeners are now handled in setupUIEventListeners()  
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
      
      // Display insights
      if (insights && insights.length > 0) {
        console.log('💡 Displaying insights');
        this.displayInsights(insights);
      }
      
      // Show story progression if available
      if (this.currentScenario && this.currentScenario.progression) {
        this.displayStoryProgression(this.currentScenario);
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
    const { scenario, validation } = data;
    console.log('🎯 UI: Scenario selected:', scenario.metadata?.title);
    
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
    
    // Display story context if available
    if (scenario.story_context) {
      this.displayStoryContext(scenario);
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
   * Display story context for narrative-enhanced scenarios
   * @param {Object} scenario - Scenario with story context
   */
  displayStoryContext(scenario) {
    const { story_context, progression } = scenario;
    
    // Create or update story context display area
    let storyArea = document.getElementById('story-context-area');
    if (!storyArea) {
      storyArea = document.createElement('div');
      storyArea.id = 'story-context-area';
      storyArea.className = 'story-context-area';
      storyArea.style.cssText = `
        margin: 1.5rem 0;
        padding: 1.5rem;
        background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid #60a5fa;
      `;
      
      // Insert after quickpeek or before chart area
      const quickPeek = document.querySelector('.quickpeek-section');
      const chartArea = document.getElementById('chart-area');
      const insertPoint = quickPeek || chartArea;
      if (insertPoint) {
        insertPoint.insertAdjacentElement('beforebegin', storyArea);
      }
    }
    
    // Build story content
    let storyHTML = `<div class="story-header" style="margin-bottom: 1rem;">
      <h3 style="margin: 0; color: #fbbf24;">📖 ${scenario.metadata.title}</h3>
      <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-style: italic;">${story_context.emotional_hook}</p>
    </div>`;
    
    if (story_context.narrative) {
      storyHTML += `<div class="story-narrative" style="margin-bottom: 1rem;">
        <div style="line-height: 1.7; white-space: pre-line;">${story_context.narrative}</div>
      </div>`;
    }
    
    if (story_context.learning_moment) {
      storyHTML += `<div class="learning-moment" style="margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px; border-left: 3px solid #10b981;">
        <h4 style="margin: 0 0 0.5rem 0; color: #34d399;">💡 Key Learning</h4>
        <p style="margin: 0; line-height: 1.6;">${story_context.learning_moment}</p>
      </div>`;
    }
    
    if (progression && progression.connection) {
      storyHTML += `<div class="story-progression" style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #f59e0b;">
        <h4 style="margin: 0 0 0.5rem 0; color: #fbbf24;">🎬 What's Next?</h4>
        <p style="margin: 0; line-height: 1.6; font-style: italic;">${progression.connection}</p>
        ${progression.next_scenario ? `<button id="next-scenario-btn" data-scenario="${progression.next_scenario}" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Continue to Next Chapter →</button>` : ''}
      </div>`;
    }
    
    storyArea.innerHTML = storyHTML;
    
    // Add event listener for next scenario button
    const nextBtn = storyArea.querySelector('#next-scenario-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        const nextScenario = nextBtn.dataset.scenario;
        console.log('🎬 Loading next scenario:', nextScenario);
        this.eventBus.emit('scenario:select', nextScenario);
      };
    }
    
    console.log('📖 Story context displayed for:', scenario.metadata.title);
  }

  /**
   * Display story progression after simulation results
   * @param {Object} scenario - Scenario with progression info
   */
  displayStoryProgression(scenario) {
    const { progression } = scenario;
    if (!progression) return;
    
    // Create or update progression area after insights
    let progressionArea = document.getElementById('story-progression-results');
    if (!progressionArea) {
      progressionArea = document.createElement('div');
      progressionArea.id = 'story-progression-results';
      progressionArea.className = 'story-progression-results';
      progressionArea.style.cssText = `
        margin: 2rem 0;
        padding: 1.5rem;
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid #34d399;
      `;
      
      // Insert after insights section
      const insightsSection = document.getElementById('simulation-insights');
      if (insightsSection) {
        insightsSection.insertAdjacentElement('afterend', progressionArea);
      }
    }
    
    let progressionHTML = `
      <div class="progression-header" style="margin-bottom: 1rem;">
        <h3 style="margin: 0; color: #fbbf24;">🎬 What's Next in Your Learning Journey?</h3>
        <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-style: italic;">${progression.learning_arc}</p>
      </div>
      
      <div class="progression-content" style="margin-bottom: 1rem;">
        <p style="line-height: 1.7; margin: 0;">${progression.connection}</p>
      </div>
    `;
    
    if (progression.next_scenario) {
      progressionHTML += `
        <div class="progression-action" style="margin-top: 1rem;">
          <button id="continue-journey-btn" data-scenario="${progression.next_scenario}" 
                  style="padding: 0.75rem 1.5rem; background: #fbbf24; color: #1f2937; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.2s;">
            Continue Your Journey →
          </button>
        </div>
      `;
    }
    
    progressionArea.innerHTML = progressionHTML;
    
    // Add event listener for continue button
    const continueBtn = progressionArea.querySelector('#continue-journey-btn');
    if (continueBtn) {
      continueBtn.onmouseover = () => continueBtn.style.background = '#f59e0b';
      continueBtn.onmouseout = () => continueBtn.style.background = '#fbbf24';
      continueBtn.onclick = () => {
        const nextScenario = continueBtn.dataset.scenario;
        console.log('🎬 Continuing journey to:', nextScenario);
        
        // Scroll to top and load next scenario
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          this.eventBus.emit('scenario:select', nextScenario);
        }, 500);
      };
    }
    
    console.log('🎬 Story progression displayed for next scenario:', progression.next_scenario);
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
    console.log('🎭 Exiting story mode in UIController');
    this.storytellerUI.exitStoryMode();
    this.ui.showRegularControls();
    console.log('🎭 Story mode exit complete - UI restored');
  }

  /**
   * Handle story selected
   * @param {Object} data - Story selection data
   */
  handleStorySelected(data) {
    const { story } = data;
    console.log('🎨 UI: Story selected:', story.metadata?.title);
    
    // Display story metadata (description, introduction, etc.)
    if (story.metadata) {
      this.storytellerUI.displayStoryMetadata(story.metadata);
    }
    
    // Show story introduction if available
    if (story.metadata?.introduction) {
      this.storytellerUI.showStoryIntroduction(story.metadata.introduction);
    }
  }

  /**
   * Handle chapter changed
   * @param {Object} data - Chapter change data
   */
  handleChapterChanged(data) {
    const { chapter, story } = data;
    console.log(`🎨 UI: Chapter changed to "${chapter.title}"`);
    
    // Display chapter content (introduction, setup, insights, etc.)
    if (chapter.narrative) {
      this.storytellerUI.displayChapterContent(chapter);
    }
    
    // Update chapter progress
    this.storytellerUI.updateChapterProgress(chapter, story);
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
