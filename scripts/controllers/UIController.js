/**
 * UI Controller - Pure event-driven UI management
 * No legacy dependencies - implements UI functionality directly
 */

export class UIController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentScenario = null;
    
    console.log('🎨 UIController created');
  }

  /**
   * Initialize the UI Controller (called by main.js)
   */
  initialize() {
    console.log('🎨 Initializing UI Controller');
    
    // Initialize UI elements and event listeners
    this.initializeUIElements();
    this.setupEventListeners();
    
    console.log('✅ UI Controller initialized');
  }

  /**
   * Initialize UI element references
   */
  initializeUIElements() {
    // Scenario elements
    this.scenarioDropdown = document.getElementById('scenario-dropdown');
    this.storyDropdown = document.getElementById('story-dropdown');
    this.runButton = document.getElementById('run-btn-primary');
    // Note: jsonPreview is no longer used - we have enhanced config synopsis instead
    this.jsonPreview = null; // Deprecated - using enhanced config synopsis
    
    // Results elements
    this.resultsSection = document.getElementById('main-content'); // Main results container
    this.chartArea = document.getElementById('chart-area');
    this.insightsSection = document.getElementById('simulation-insights');
    
    // Story mode elements (managed by ModeController)
    this.storyPanel = document.getElementById('story-panel');
    
    // Debug: Log which elements were found
    console.log('🎨 UI elements initialized:', {
      scenarioDropdown: !!this.scenarioDropdown,
      runButton: !!this.runButton,
      jsonPreview: !!this.jsonPreview,
      resultsSection: !!this.resultsSection,
      chartArea: !!this.chartArea,
      insightsSection: !!this.insightsSection
    });
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    this.setupUIEventListeners();
    this.setupContentEventListeners();
    this.setupSimulationEventListeners();
    this.setupStoryEventListeners();
  }

  /**
   * Set up UI interaction event listeners
   */
  setupUIEventListeners() {
    // Scenario dropdown change
    if (this.scenarioDropdown) {
      this.scenarioDropdown.addEventListener('change', (e) => {
        const scenarioKey = e.target.value;
        if (scenarioKey) {
          this.eventBus.emit('scenario:select', scenarioKey);
        }
      });
    }

    // Run simulation button
    if (this.runButton) {
      this.runButton.addEventListener('click', () => {
        console.log('🚀 Main Run Simulation button clicked!', {
          hasCurrentScenario: !!this.currentScenario,
          scenarioTitle: this.currentScenario?.metadata?.title,
          monthlyExpenses: this.currentScenario?.plan?.monthly_expenses,
          annualExpenses: (this.currentScenario?.plan?.monthly_expenses || 0) * 12
        });
        
        if (this.currentScenario) {
          console.log('🔥 UIController: About to emit simulation:run with current scenario data:', {
            monthlyExpenses: this.currentScenario.plan?.monthly_expenses,
            annualExpenses: (this.currentScenario.plan?.monthly_expenses || 0) * 12,
            scenarioTitle: this.currentScenario.metadata?.title
          });
          this.eventBus.emit('simulation:run', this.currentScenario);
          console.log('📡 UIController: simulation:run event emitted successfully');
        } else {
          this.showError('Please select a scenario before running simulation');
        }
      });
    } else {
      console.warn('❌ Run button not found during event listener setup');
    }

    // Story mode toggle now handled by ModeController

    // Enhanced Input Tab buttons
    const toggleJsonBtn = document.getElementById('toggle-json-btn');
    if (toggleJsonBtn) {
      toggleJsonBtn.addEventListener('click', () => {
        this.toggleJsonEditor();
      });
    }

    // JSON Editor buttons
    const saveJsonBtn = document.getElementById('save-json-btn');
    if (saveJsonBtn) {
      saveJsonBtn.addEventListener('click', () => {
        this.saveJsonChanges();
      });
    }

    const cancelJsonBtn = document.getElementById('cancel-json-btn');
    if (cancelJsonBtn) {
      cancelJsonBtn.addEventListener('click', () => {
        this.cancelJsonChanges();
      });
    }

    const validateJsonBtn = document.getElementById('validate-json-btn');
    if (validateJsonBtn) {
      validateJsonBtn.addEventListener('click', () => {
        this.validateJson();
      });
    }

    // New JSON Editor buttons
    const highlightAllJsonBtn = document.getElementById('highlight-all-json-btn');
    if (highlightAllJsonBtn) {
      highlightAllJsonBtn.addEventListener('click', () => {
        this.highlightAllJson();
      });
    }

    // Export functionality moved to centralized ExportController
    // Old export button handlers removed

    const toggleCsvBtn = document.getElementById('toggle-csv-btn');
    if (toggleCsvBtn) {
      toggleCsvBtn.addEventListener('click', () => {
        this.toggleCsvExport();
      });
    }

    // Advanced Run Button removed - was causing duplicate simulation runs
    // All advanced functionality has been moved elsewhere in the UX

    console.log('🔧 UI event listeners setup complete');
  }

  /**
   * Set up content-related event listeners
   */
  setupContentEventListeners() {
    this.eventBus.on('scenarios:loaded', (scenarios) => this.handleScenariosLoaded(scenarios));
    this.eventBus.on('stories:loaded', (stories) => this.handleStoriesLoaded(stories));
    this.eventBus.on('scenario:selected', (data) => this.handleScenarioSelectedData(data));
    this.eventBus.on('scenario:data-changed', (data) => this.handleScenarioDataChanged(data));
    this.eventBus.on('content:errors', (errors) => this.handleContentErrors(errors));
    this.eventBus.on('simulation:regular-completed', () => {
      this.showExportCsvButton();
      this.showExportSingleResultsButton();
    });
    this.eventBus.on('simulation:started', (data) => {
      // Only hide for regular simulations, not Monte Carlo
      if (!data?.context?.isMonteCarlo) {
        this.hideExportCsvButton();
        this.hideExportSingleResultsButton();
      }
    });
  }

  /**
   * Set up simulation-related event listeners
   * FIXED: Only handle regular simulations, not Monte Carlo iterations
   */
  setupSimulationEventListeners() {
    // Only handle regular (non-Monte Carlo) simulation events
    this.eventBus.on('simulation:started', (data) => {
      // Don't disable main button for Monte Carlo simulations
      if (!data?.context?.isMonteCarlo) {
        this.handleSimulationStarted(data);
      }
    });
    
    this.eventBus.on('simulation:completed', (data) => {
      // Only handle regular simulation completion
      if (!data?.context?.isMonteCarlo) {
        this.handleSimulationCompleted(data);
      }
    });
    
    this.eventBus.on('simulation:failed', (data) => {
      // Only handle regular simulation failures
      if (!data?.context?.isMonteCarlo) {
        this.handleSimulationFailed(data);
      }
    });
    
    // Monte Carlo section visibility events
    this.eventBus.on('montecarlo:analysis-started', () => {
      this.showMonteCarloSection();
      this.showMonteCarloFeedback('running');
      // Don't hide config during analysis - preserve user's toggle state
    });
    
    this.eventBus.on('montecarlo:analysis-completed', () => {
      // Section already visible, just ensure it stays visible
      this.showMonteCarloSection();
      this.showMonteCarloFeedback('completed');
      // Don't hide config - let user toggle it manually for reconfiguration
    });
    
    this.eventBus.on('montecarlo:analysis-cancelled', () => {
      this.hideMonteCarloSection();
      this.hideAllFeedback();
      this.showMonteCarloConfig();
    });
  }

  /**
   * Set up story-related event listeners
   */
  setupStoryEventListeners() {
    // Mode switching now handled by ModeController
    // Keep story-specific UI events
  }

  // === EVENT HANDLERS ===

  /**
   * Handle scenarios loaded
   */
  handleScenariosLoaded(scenarios) {
    console.log(`📊 ${scenarios.length} scenarios loaded`);
    this.populateScenarioDropdown(scenarios);
  }

  /**
   * Handle stories loaded
   */
  handleStoriesLoaded(stories) {
    console.log(`📚 ${stories.length} stories loaded`);
    this.populateStoryDropdown(stories);
  }

  /**
   * Handle scenario selection data from ScenarioController
   */
  handleScenarioSelectedData(data) {
    try {
      this.currentScenario = data.scenario;
      this.updateJsonPreview(data.scenario);
      this.showSuccess(`Scenario loaded: ${data.scenario.metadata?.title || data.key}`);
      
      // Listen for scenario synopsis from ScenarioController (proper event bus flow)
      this.eventBus.once('scenario:loaded', (synopsisData) => {
        if (synopsisData.scenarioSynopsis) {
          this.updateScenarioDetails(synopsisData.scenario, synopsisData.scenarioSynopsis);
        }
      });
      
    } catch (error) {
      this.showError(`Failed to handle scenario data: ${error.message}`);
    }
  }

  /**
   * Handle scenario data changes from event bus (e.g., after JSON editing, scenario selection)
   * CLEAN ARCHITECTURE: UIController only handles Key Assumptions, not Key Insights
   */
  handleScenarioDataChanged(data) {
    console.log('🔄 UIController received scenario:data-changed event:', data);
    
    if (data.scenarioData) {
      this.currentScenario = data.scenarioData;
      
      // UIController responsibility: Update Key Assumptions section only
      const synopsis = this.extractKeyAssumptions(data.scenarioData);
      this.updateScenarioDetails(data.scenarioData, synopsis);
      
      console.log('✅ UIController updated Key Assumptions from scenario:data-changed event', {
        trigger: data.trigger,
        monthlyExpenses: data.scenarioData?.plan?.monthly_expenses
      });
      
      // Key Insights are now handled by dedicated InsightsController
    }
  }

  // Key Insights methods removed - now handled by dedicated InsightsController

  /**
   * Handle scenario selection (legacy method - keeping for compatibility)
   */
  async handleScenarioSelected(scenarioKey) {
    try {
      // Request scenario data from ContentService via EventBus
      this.eventBus.emit('content:get-scenario', scenarioKey);
      
      // Listen for the scenario data response (using proper EventBus once method)
      this.eventBus.once('content:scenario-data', (data) => {
        this.currentScenario = data.scenario;
        this.updateJsonPreview(data.scenario);
        this.showSuccess(`Scenario loaded: ${data.scenario.metadata?.title || scenarioKey}`);
      });

      // Listen for potential errors
      this.eventBus.once('content:scenario-error', (data) => {
        this.showError(`Failed to load scenario: ${data.error}`);
      });
      
    } catch (error) {
      this.showError(`Failed to load scenario: ${error.message}`);
    }
  }

  /**
   * Handle content errors
   */
  handleContentErrors(errors) {
    this.showWarning(`Content issues: ${errors.length} errors found`);
  }

  /**
   * Handle simulation started
   */
  handleSimulationStarted(data) {
    this.setRunButtonLoading(true);
    // Don't automatically hide Monte Carlo section - let user manage both charts independently
    this.showSimulationFeedback('running');
    this.showSuccess('Simulation started...');
  }

  /**
   * Handle simulation completed
   */
  handleSimulationCompleted(data) {
    console.log('🎯 handleSimulationCompleted called with data:', data);
    console.log('🔍 Data structure:', {
      hasResults: !!data.results,
      resultsType: typeof data.results,
      resultsIsArray: Array.isArray(data.results),
      hasNestedResults: !!(data.results && data.results.results),
      nestedResultsIsArray: Array.isArray(data.results?.results)
    });
    
    // Store results for export
    this.currentSimulationResults = data;
    
    this.setRunButtonLoading(false);
    this.showSingleScenarioSection();
    this.displaySimulationResults(data);
    this.showSimulationFeedback('completed');
    this.showSuccess('Simulation completed successfully');
  }

  /**
   * Handle simulation failed
   */
  handleSimulationFailed(data) {
    this.setRunButtonLoading(false);
    this.showError(`Simulation failed: ${data.error?.message || 'Unknown error'}`);
  }

  // Story mode display now handled by ModeController CSS classes

  // === UI METHODS ===

  /**
   * Populate scenario dropdown
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
   * Populate story dropdown
   */
  populateStoryDropdown(stories) {
    if (!this.storyDropdown) return;

    this.storyDropdown.innerHTML = '<option value="">Select a story...</option>';
    
    stories.forEach(story => {
      const option = document.createElement('option');
      option.value = story.key;
      option.textContent = story.title || story.key;
      this.storyDropdown.appendChild(option);
    });

    console.log(`🎨 UI: Populated ${stories.length} stories`);
  }

  /**
   * Update scenario display (replaces old JSON preview functionality)
   */
  updateScenarioDisplay(scenario) {
    console.log('🔍 updateScenarioDisplay called:', {
      scenarioKeys: Object.keys(scenario || {}),
      hasMetadata: !!(scenario && scenario.metadata)
    });
    
    // Show the scenario preview section
    const scenarioPreview = document.getElementById('scenario-preview');
    if (scenarioPreview) {
      scenarioPreview.classList.remove('hidden');
      console.log('✅ Scenario preview section made visible');
    } else {
      console.error('❌ scenario-preview element not found!');
      return;
    }
    
    // Update scenario details and enhanced configuration synopsis
    this.updateScenarioDetails(scenario);
    
    console.log('✅ Scenario display updated and made visible');
  }
  
  /**
   * Legacy method - redirects to new updateScenarioDisplay
   * @deprecated Use updateScenarioDisplay instead
   */
  updateJsonPreview(scenario) {
    console.log('⚠️ updateJsonPreview is deprecated, using updateScenarioDisplay');
    this.updateScenarioDisplay(scenario);
  }

  /**
   * Update scenario details in the preview section
   */
  updateScenarioDetails(scenario, scenarioSynopsis = null) {
    // Update scenario description
    const descriptionElement = document.getElementById('scenario-description');
    if (descriptionElement && scenario.metadata) {
      descriptionElement.textContent = scenario.metadata.description || 'No description available';
    }
    
    // Update key assumptions with comprehensive synopsis
    const assumptionsList = document.getElementById('key-assumptions-list');
    if (assumptionsList && scenarioSynopsis) {
      assumptionsList.innerHTML = '';
      
      const synopsis = scenarioSynopsis;
      
      // Plan Configuration
      if (synopsis.plan && synopsis.plan.length > 0) {
        const planHeader = document.createElement('li');
        planHeader.innerHTML = '<strong>📋 Plan:</strong>';
        assumptionsList.appendChild(planHeader);
        synopsis.plan.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `&nbsp;&nbsp;• ${item}`;
          li.style.fontSize = '0.9em';
          assumptionsList.appendChild(li);
        });
      }
      
      // Assets
      if (synopsis.assets && synopsis.assets.length > 0) {
        const assetsHeader = document.createElement('li');
        assetsHeader.innerHTML = '<strong>💰 Assets:</strong>';
        assumptionsList.appendChild(assetsHeader);
        synopsis.assets.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `&nbsp;&nbsp;• ${item}`;
          li.style.fontSize = '0.9em';
          assumptionsList.appendChild(li);
        });
      }
      
      // Income Sources
      if (synopsis.income && synopsis.income.length > 0) {
        const incomeHeader = document.createElement('li');
        incomeHeader.innerHTML = '<strong>💵 Income:</strong>';
        assumptionsList.appendChild(incomeHeader);
        synopsis.income.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `&nbsp;&nbsp;• ${item}`;
          li.style.fontSize = '0.9em';
          assumptionsList.appendChild(li);
        });
      }
      
      // Rate Schedules
      if (synopsis.schedules && synopsis.schedules.length > 0) {
        const schedulesHeader = document.createElement('li');
        schedulesHeader.innerHTML = '<strong>📈 Rate Schedules:</strong>';
        assumptionsList.appendChild(schedulesHeader);
        synopsis.schedules.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `&nbsp;&nbsp;• ${item}`;
          li.style.fontSize = '0.9em';
          assumptionsList.appendChild(li);
        });
      }
      
      // Drawdown Order
      if (synopsis.drawdownOrder && synopsis.drawdownOrder.length > 0) {
        const drawdownHeader = document.createElement('li');
        drawdownHeader.innerHTML = '<strong>🔄 Drawdown Order:</strong>';
        assumptionsList.appendChild(drawdownHeader);
        synopsis.drawdownOrder.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `&nbsp;&nbsp;• ${item}`;
          li.style.fontSize = '0.9em';
          assumptionsList.appendChild(li);
        });
      }
    }
    
    // Update enhanced configuration synopsis
    this.updateConfigurationSynopsis(scenario, scenarioSynopsis);
  }
  
  /**
   * Update the enhanced configuration synopsis with detailed breakdown
   */
  updateConfigurationSynopsis(scenario, scenarioSynopsis = null) {
    if (!scenario) return;
    
    // Update financial overview
    this.updateFinancialOverview(scenario);
    
    // Update asset breakdown
    this.updateAssetBreakdown(scenario);
    
    // Update income breakdown
    this.updateIncomeBreakdown(scenario);
  }
  
  /**
   * Update financial overview section
   */
  updateFinancialOverview(scenario) {
    // Calculate total assets
    let totalAssets = 0;
    if (scenario.assets && Array.isArray(scenario.assets)) {
      totalAssets = scenario.assets.reduce((sum, asset) => {
        return sum + (asset.balance || 0);
      }, 0);
    }
    
    // Get monthly expenses
    const monthlyExpenses = scenario.plan?.monthly_expenses || 0;
    
    // Count income sources
    const incomeCount = scenario.income ? scenario.income.length : 0;
    
    // Get simulation duration
    const duration = scenario.plan?.duration_months || 0;
    const durationYears = Math.round(duration / 12);
    
    // Update DOM elements
    this.updateConfigValue('config-total-assets', this.formatCurrency(totalAssets));
    this.updateConfigValue('config-monthly-expenses', this.formatCurrency(monthlyExpenses));
    this.updateConfigValue('config-income-count', `${incomeCount} source${incomeCount !== 1 ? 's' : ''}`);
    this.updateConfigValue('config-duration', `${durationYears} years (${duration} months)`);
  }
  
  /**
   * Update asset breakdown section
   */
  updateAssetBreakdown(scenario) {
    const container = document.getElementById('config-assets-breakdown');
    if (!container || !scenario.assets) return;
    
    container.innerHTML = '';
    
    scenario.assets.forEach(asset => {
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      
      const label = document.createElement('span');
      label.className = 'breakdown-label';
      label.textContent = asset.name || 'Unnamed Asset';
      
      const value = document.createElement('span');
      value.className = 'breakdown-value';
      value.textContent = this.formatCurrency(asset.balance || 0);
      
      item.appendChild(label);
      item.appendChild(value);
      container.appendChild(item);
    });
  }
  
  /**
   * Update income breakdown section
   */
  updateIncomeBreakdown(scenario) {
    const container = document.getElementById('config-income-breakdown');
    if (!container || !scenario.income) return;
    
    container.innerHTML = '';
    
    scenario.income.forEach(income => {
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      
      const label = document.createElement('span');
      label.className = 'breakdown-label';
      label.textContent = income.name || 'Unnamed Income';
      
      const value = document.createElement('span');
      value.className = 'breakdown-value';
      const monthlyAmount = income.amount || 0;
      const startMonth = income.start_month || 1;
      value.textContent = `${this.formatCurrency(monthlyAmount)}/mo (starts month ${startMonth})`;
      
      item.appendChild(label);
      item.appendChild(value);
      container.appendChild(item);
    });
  }
  
  /**
   * Helper method to update config values
   */
  updateConfigValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }
  
  /**
   * Helper method to format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Toggle JSON editor visibility
   */
  toggleJsonEditor() {
    const jsonEditorSection = document.getElementById('json-editor-section');
    const configSynopsis = document.getElementById('scenario-config-synopsis');
    
    if (jsonEditorSection && configSynopsis) {
      const isHidden = jsonEditorSection.style.display === 'none';
      
      if (isHidden) {
        // Show JSON editor, hide config synopsis
        jsonEditorSection.style.display = 'block';
        configSynopsis.style.display = 'none';
        
        // Populate JSON editor with current scenario
        if (this.currentScenario) {
          const jsonEditor = document.getElementById('json-editor');
          if (jsonEditor) {
            jsonEditor.value = JSON.stringify(this.currentScenario, null, 2);
          }
        }
        
        console.log('🔧 JSON editor shown');
      } else {
        // Hide JSON editor, show config synopsis
        jsonEditorSection.style.display = 'none';
        configSynopsis.style.display = 'block';
        
        console.log('🔧 JSON editor hidden');
      }
    } else {
      console.warn('❌ JSON editor section or config synopsis not found');
    }
  }
  
  /**
   * Extract comprehensive scenario synopsis for one-glance overview
   * (Same logic as ScenarioController.extractKeyAssumptions)
   */
  extractKeyAssumptions(scenario) {
    const synopsis = {
      plan: [],
      assets: [],
      income: [],
      schedules: [],
      drawdownOrder: []
    };
    
    // Plan Configuration
    if (scenario.plan?.monthly_expenses) {
      synopsis.plan.push(`Monthly expenses: $${scenario.plan.monthly_expenses.toLocaleString()}`);
    }
    if (scenario.plan?.retirement_age) {
      synopsis.plan.push(`Retirement age: ${scenario.plan.retirement_age}`);
    }
    if (scenario.plan?.life_expectancy) {
      synopsis.plan.push(`Life expectancy: ${scenario.plan.life_expectancy}`);
    }
    
    // Assets Overview
    if (scenario.assets && scenario.assets.length > 0) {
      const totalAssets = scenario.assets.reduce((sum, asset) => sum + (asset.balance || 0), 0);
      synopsis.assets.push(`Total assets: $${totalAssets.toLocaleString()}`);
      
      scenario.assets.forEach(asset => {
        const details = [];
        details.push(`$${(asset.balance || 0).toLocaleString()}`);
        if (asset.type) details.push(asset.type);
        if (asset.return_schedule) details.push(`${asset.return_schedule} returns`);
        if (asset.min_balance) details.push(`min: $${asset.min_balance.toLocaleString()}`);
        synopsis.assets.push(`${asset.name}: ${details.join(', ')}`);
      });
    }
    
    // Income Sources
    if (scenario.income && scenario.income.length > 0) {
      scenario.income.forEach(income => {
        const details = [];
        details.push(`$${(income.amount || 0).toLocaleString()}/month`);
        if (income.start_month) details.push(`starts month ${income.start_month}`);
        if (income.end_month) details.push(`ends month ${income.end_month}`);
        if (income.inflation_schedule) details.push(`${income.inflation_schedule} inflation`);
        synopsis.income.push(`${income.name}: ${details.join(', ')}`);
      });
    }
    
    // Rate Schedules
    if (scenario.rate_schedules) {
      Object.entries(scenario.rate_schedules).forEach(([name, schedule]) => {
        if (schedule.type === 'fixed') {
          synopsis.schedules.push(`${name}: ${(schedule.rate * 100).toFixed(1)}% fixed`);
        } else if (schedule.type === 'variable') {
          synopsis.schedules.push(`${name}: variable (${schedule.rates?.length || 0} periods)`);
        } else {
          synopsis.schedules.push(`${name}: ${schedule.type}`);
        }
      });
    }
    
    // Drawdown Order
    if (scenario.order && scenario.order.length > 0) {
      synopsis.drawdownOrder = scenario.order
        .sort((a, b) => a.order - b.order)
        .map(item => `${item.order}. ${item.account}`);
    }
    
    return synopsis;
  }

  /**
   * Save JSON editor changes
   */
  saveJsonChanges() {
    const jsonEditor = document.getElementById('json-editor');
    const feedback = document.getElementById('json-validation-feedback');
    
    if (!jsonEditor || !feedback) return;
    
    try {
      const jsonText = jsonEditor.value;
      const parsedScenario = JSON.parse(jsonText);
      
      // Basic validation
      if (!parsedScenario.metadata || !parsedScenario.plan) {
        throw new Error('Invalid scenario structure: missing metadata or plan');
      }
      
      // Update current scenario
      this.currentScenario = parsedScenario;
      
      // CLEAN ARCHITECTURE: Emit single, clear event for scenario data changes
      const eventData = {
        scenarioData: parsedScenario,
        trigger: 'json-edit',
        timestamp: Date.now()
      };
      
      console.log('🔥 UIController: About to emit scenario:data-changed event!', {
        monthlyExpenses: parsedScenario?.plan?.monthly_expenses,
        annualExpenses: (parsedScenario?.plan?.monthly_expenses || 0) * 12,
        trigger: eventData.trigger
      });
      
      this.eventBus.emit('scenario:data-changed', eventData);
      
      console.log('📡 UIController: scenario:data-changed event emitted successfully');
      
      // Show success feedback
      feedback.className = 'validation-feedback success';
      feedback.textContent = '✅ Scenario updated successfully!';
      
      // Hide JSON editor after successful save
      setTimeout(() => {
        this.toggleJsonEditor();
        feedback.style.display = 'none';
      }, 2000);
      
      console.log('💾 JSON changes saved successfully - all UI elements updated');
      
    } catch (error) {
      // Show error feedback
      feedback.className = 'validation-feedback error';
      feedback.textContent = `❌ Error: ${error.message}`;
      console.error('❌ JSON save error:', error);
    }
  }
  
  /**
   * Cancel JSON editor changes
   */
  cancelJsonChanges() {
    const feedback = document.getElementById('json-validation-feedback');
    if (feedback) {
      feedback.style.display = 'none';
    }
    this.toggleJsonEditor();
    console.log('❌ JSON changes cancelled');
  }
  
  /**
   * Validate JSON without saving
   */
  validateJson() {
    const jsonEditor = document.getElementById('json-editor');
    const feedback = document.getElementById('json-validation-feedback');
    
    if (!jsonEditor || !feedback) return;
    
    try {
      const jsonText = jsonEditor.value;
      const parsedScenario = JSON.parse(jsonText);
      
      // Basic validation
      if (!parsedScenario.metadata) {
        throw new Error('Missing metadata section');
      }
      if (!parsedScenario.plan) {
        throw new Error('Missing plan section');
      }
      if (!parsedScenario.assets || !Array.isArray(parsedScenario.assets)) {
        throw new Error('Missing or invalid assets array');
      }
      
      // Show success feedback
      feedback.className = 'validation-feedback success';
      feedback.textContent = '✅ JSON is valid and ready to save!';
      
      console.log('✅ JSON validation passed');
      
    } catch (error) {
      // Show error feedback
      feedback.className = 'validation-feedback error';
      feedback.textContent = `❌ Validation Error: ${error.message}`;
      console.error('❌ JSON validation error:', error);
    }
  }
  
  // refreshConfigSynopsis method removed - synopsis now updates automatically via event bus

  /**
   * Toggle CSV export visibility
   */
  toggleCsvExport() {
    const csvSection = document.getElementById('csv-section');
    if (csvSection) {
      const isCollapsed = csvSection.classList.contains('csv-section--collapsed');
      
      if (isCollapsed) {
        csvSection.classList.remove('csv-section--collapsed');
        csvSection.style.display = 'block';
      } else {
        csvSection.classList.add('csv-section--collapsed');
        csvSection.style.display = 'none';
      }
      
      const toggleBtn = document.getElementById('toggle-csv-btn');
      if (toggleBtn) {
        toggleBtn.textContent = isCollapsed ? 'Hide CSV Export' : 'Export CSV Data';
      }
      
      console.log(`🔧 CSV export ${isCollapsed ? 'shown' : 'hidden'}`);
    } else {
      console.warn('❌ CSV section not found');
    }
  }

  // runAdvancedSimulation method removed - was obsolete holdover causing duplicate simulation runs
  // All advanced functionality has been moved elsewhere in the UX

  /**
   * Show single scenario results section
   */
  showSingleScenarioSection() {
    const singleScenarioSection = document.getElementById('single-scenario-section');
    if (singleScenarioSection) {
      singleScenarioSection.style.display = 'block';
      console.log('📊 Single scenario section shown');
    }
    
    if (this.chartArea) {
      this.chartArea.style.display = 'block';
      this.chartArea.classList.add('has-results');
      console.log('📊 Chart area shown');
    }
  }

  /**
   * Show Monte Carlo results section
   */
  showMonteCarloSection() {
    const monteCarloSection = document.getElementById('monte-carlo-section-results');
    if (monteCarloSection) {
      monteCarloSection.style.setProperty('display', 'block', 'important');
      monteCarloSection.style.visibility = 'visible';
      monteCarloSection.style.opacity = '1';
      console.log('🎲 Monte Carlo results section shown');
    }
  }

  /**
   * Hide Monte Carlo results section
   */
  hideMonteCarloSection() {
    const monteCarloSection = document.getElementById('monte-carlo-section-results');
    if (monteCarloSection) {
      monteCarloSection.style.display = 'none';
      console.log('🎲 Monte Carlo results section hidden');
    }
  }

  /**
   * Show simulation feedback on Simulation tab
   */
  showSimulationFeedback(status) {
    this.hideAllFeedback();
    
    const feedbackId = status === 'running' ? 'simulation-status-feedback' : 'simulation-success-feedback';
    const feedbackElement = document.getElementById(feedbackId);
    
    if (feedbackElement) {
      feedbackElement.style.display = 'flex';
      console.log(`💬 Simulation feedback shown: ${status}`);
      
      // Auto-hide success feedback after 5 seconds
      if (status === 'completed') {
        setTimeout(() => {
          feedbackElement.style.display = 'none';
        }, 5000);
      }
    }
  }

  /**
   * Show Monte Carlo feedback on Simulation tab
   */
  showMonteCarloFeedback(status) {
    this.hideAllFeedback();
    
    const feedbackId = status === 'running' ? 'monte-carlo-status-feedback' : 'monte-carlo-success-feedback';
    const feedbackElement = document.getElementById(feedbackId);
    
    if (feedbackElement) {
      feedbackElement.style.display = 'flex';
      console.log(`💬 Monte Carlo feedback shown: ${status}`);
      
      // Auto-hide success feedback after 5 seconds
      if (status === 'completed') {
        setTimeout(() => {
          feedbackElement.style.display = 'none';
        }, 5000);
      }
    }
  }

  /**
   * Hide all feedback items
   */
  hideAllFeedback() {
    const feedbackItems = [
      'simulation-status-feedback',
      'simulation-success-feedback', 
      'monte-carlo-status-feedback',
      'monte-carlo-success-feedback'
    ];
    
    feedbackItems.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * Hide Monte Carlo configuration area
   */
  hideMonteCarloConfig() {
    const monteCarloSection = document.getElementById('monte-carlo-section');
    if (monteCarloSection) {
      monteCarloSection.style.display = 'none';
      console.log('🎲 Monte Carlo config area hidden');
    }
  }

  /**
   * Show Monte Carlo configuration area
   */
  showMonteCarloConfig() {
    const monteCarloSection = document.getElementById('monte-carlo-section');
    if (monteCarloSection) {
      monteCarloSection.style.display = 'block';
      console.log('🎲 Monte Carlo config area shown');
    }
  }

  /**
   * Display simulation results (chart, insights, CSV)
   */
  displaySimulationResults(data) {
    try {
      console.log('📊 Displaying simulation results:', data);
      
      // Store scenario data in controller state for use by any method
      this.currentScenarioData = data.scenarioData;
      
      // Extract the actual results array - handle nested structure
      let resultsArray = data.results;
      if (data.results && data.results.results && Array.isArray(data.results.results)) {
        resultsArray = data.results.results;
        console.log('📊 Using nested results array with', resultsArray.length, 'items');
      } else if (Array.isArray(data.results)) {
        console.log('📊 Using direct results array with', resultsArray.length, 'items');
      } else {
        console.warn('❌ No valid results array found');
        return;
      }
      
      console.log('📊 About to render chart with', resultsArray.length, 'data points');
      
      // Display chart
      this.renderChart(resultsArray, data.results.balanceHistory);
      
      console.log('📊 About to display insights:', data.insights?.length || 0, 'insights');
      
      // Request insights generation through event bus (proper architecture)
      if (this.currentScenarioData && resultsArray && resultsArray.length > 0) {
        this.eventBus.emit('insights:generate-request', {
          scenarioData: this.currentScenarioData,
          simulationResults: resultsArray,
          trigger: 'simulation-completed',
          requestId: `insights-${Date.now()}`
        });
      }
      
      console.log('📊 About to populate CSV export');
      
      // Populate CSV export - use CSV text if available, otherwise convert results
      if (data.results && data.results.csvText) {
        this.populateCSVFromText(data.results.csvText);
      } else {
        this.populateCSVExport(resultsArray);
      }
      
      console.log('✅ displaySimulationResults completed successfully');
      
    } catch (error) {
      console.error('❌ Error in displaySimulationResults:', error);
      console.error('❌ Error stack:', error.stack);
      this.showError('Failed to display simulation results: ' + error.message);
    }
  }

  /**
   * Render chart with simulation results
   */
  renderChart(results, balanceHistory = {}) {
    if (!this.chartArea || typeof Plotly === 'undefined') {
      console.warn('❌ Chart area or Plotly not available');
      return;
    }

    try {
      // Create chart data from simulation results and balance history
      const chartData = this.prepareChartData(results, balanceHistory, this.currentScenarioData);
      
      console.log('📊 Plotly chart data:', chartData);
      console.log('📊 Chart data sample:', {
        dataLength: chartData.length,
        firstTrace: chartData[0],
        xLength: chartData[0]?.x?.length,
        yLength: chartData[0]?.y?.length,
        firstX: chartData[0]?.x?.slice(0, 3),
        firstY: chartData[0]?.y?.slice(0, 3)
      });
      
      // Smart tick filtering based on simulation length
      let tickInterval;
      if (results.length <= 24) {
        tickInterval = 3; // Every 3 months for short simulations
      } else if (results.length <= 60) {
        tickInterval = 6; // Every 6 months for medium simulations
      } else if (results.length <= 120) {
        tickInterval = 12; // Every year for longer simulations
      } else {
        tickInterval = 24; // Every 2 years for very long simulations
      }

      // Get the x-axis labels (MM-YY dates) from the first trace
      const xLabels = chartData[0]?.x || [];
      const filteredTicks = xLabels.filter((_, i) => i % tickInterval === 0);

      // Always include the last tick to show the end
      if (xLabels.length > 0 && !filteredTicks.includes(xLabels[xLabels.length - 1])) {
        filteredTicks.push(xLabels[xLabels.length - 1]);
      }

      const layout = {
        // title: {
        //   text: '💰 Assets & Income Events Over Time',
        //   font: { size: 16, color: '#333' },
        //   x: 0.5,
        //   xanchor: 'center'
        // },
        xaxis: { 
          title: 'Timeline (MM-YY)',
          tickvals: filteredTicks,
          ticktext: filteredTicks,
          tickangle: -45
        },
        yaxis: { 
          title: 'Balance & Income ($)',
          tickformat: '$,.0f'
        },
        hovermode: 'x unified',
        legend: {
          groupclick: 'toggleitem',
          tracegroupgap: 10
        },
        margin: { t: 60, b: 80, l: 80, r: 40 },
        autosize: true,
        responsive: true
      };

      const config = {
        responsive: true,
        displayModeBar: true
      };

      // Clear any existing plot first
      Plotly.purge(this.chartArea);
      
      // Create the plot with forced resize for full width
      Plotly.newPlot(this.chartArea, chartData, layout, config).then(() => {
        // Force resize to ensure full width after initial render
        setTimeout(() => {
          Plotly.Plots.resize(this.chartArea);
        }, 100);
      });
      
      console.log('✅ Chart rendered successfully');
      
    } catch (error) {
      console.error('❌ Error rendering chart:', error);
      this.showError('Failed to render chart: ' + error.message);
    }
  }

  /**
   * Convert hex color to RGB values
   * @param {string} hex - Hex color string (e.g., '#ff0000')
   * @returns {string} RGB values as comma-separated string (e.g., '255, 0, 0')
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '107, 114, 128'; // Default gray
  }

  /**
   * Prepare chart data from simulation results and balance history
   */
  prepareChartData(results, balanceHistory = {}, scenario = null) {
    if (!results || !Array.isArray(results)) {
      console.warn('❌ Invalid results data for chart');
      return [];
    }

    console.log('🔍 Sample result data:', results[0]);
    console.log('🔍 Balance history keys:', Object.keys(balanceHistory));
    console.log('🔍 Balance history structure:', balanceHistory);

    // Create MM-YY formatted dates starting from current date
    const startDate = new Date();
    const months = results.map((_, index) => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + index);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${month}-${year}`;
    });
    
    const traces = [];
    
    // Extract scenario data for income events
    const incomeEvents = scenario?.income || [];
    console.log('🔍 Scenario passed to chart:', !!scenario);
    console.log('🔍 Income events from scenario:', incomeEvents);
    
    if (balanceHistory && Object.keys(balanceHistory).length > 0) {
      // Use balance history data to create individual asset traces
      const assetNames = Object.keys(balanceHistory);
      console.log('🔍 Asset names found:', assetNames);
      console.log('🔍 Income events found:', incomeEvents.length);
      
      // Define colors for each asset type
      const assetColors = {
        'Savings': '#10b981',           // Green
        'Investment': '#3b82f6',        // Blue  
        'Traditional IRA': '#f59e0b',   // Amber
        'Roth IRA': '#8b5cf6'          // Purple
      };
      
      // Define colors for income events
      const incomeColors = {
        'Social Security': '#059669',    // Dark green
        'Healthcare Cost Shock': '#dc2626', // Red
        'Future Market Crash': '#991b1b',   // Dark red
        'Market Crash': '#991b1b',          // Dark red
        'SSDI': '#059669',                  // Dark green
        'Pension': '#0369a1'                // Dark blue
      };
      
      let totalBalance = [];
      
      // Create individual traces for each asset
      assetNames.forEach(assetName => {
        const balances = balanceHistory[assetName];
        if (balances && Array.isArray(balances)) {
          const assetBalances = balances.map(balance => parseFloat(balance) || 0);
          
          // Find the corresponding asset in the scenario to get min_balance
          const scenarioAsset = scenario?.assets?.find(asset => asset.name === assetName);
          const minBalance = scenarioAsset?.min_balance || 0;
          
          // Create main asset trace (total balance)
          traces.push({
            x: months,
            y: assetBalances,
            type: 'scatter',
            mode: 'lines',
            name: assetName,
            line: { color: assetColors[assetName] || '#6b7280', width: 2 },
            opacity: 0.8,
            hovertemplate: `${assetName}<br>%{y:$,.0f}<br>Month: %{x}<extra></extra>`
          });
          
          // If asset has min_balance, add emergency fund visualization
          if (minBalance > 0) {
            // Create emergency fund baseline trace
            const emergencyFundLine = assetBalances.map(balance => 
              balance > 0 ? Math.min(balance, minBalance) : 0
            );
            
            traces.push({
              x: months,
              y: emergencyFundLine,
              type: 'scatter',
              mode: 'lines',
              name: `${assetName} (Emergency Fund)`,
              line: { 
                color: assetColors[assetName] || '#6b7280', 
                width: 1,
                dash: 'dash'
              },
              opacity: 0.4,
              fill: 'tozeroy',
              fillcolor: `rgba(${this.hexToRgb(assetColors[assetName] || '#6b7280')}, 0.1)`,
              showlegend: false, // Don't clutter legend
              hovertemplate: `${assetName} Emergency Fund<br>%{y:$,.0f}<extra></extra>`
            });
          }
          
          if (assetName === 'Savings' && assetBalances.length > 2) {
            console.log(`🔍 ${assetName} first 3 months:`, assetBalances.slice(0, 3));
            if (minBalance > 0) {
              console.log(`🔍 ${assetName} emergency fund: $${minBalance.toLocaleString()}`);
            }
          }
        }
      });
      
      // Add income event traces to show when events occur
      incomeEvents.forEach(incomeEvent => {
        if (incomeEvent.start_month && incomeEvent.amount !== 0) {
          // Create income event trace showing when the event occurs
          const incomeTrace = months.map((_, index) => {
            const currentMonth = index + 1;
            const startMonth = incomeEvent.start_month;
            const stopMonth = incomeEvent.stop_month;
            
            // Show income amount during active period, 0 otherwise
            if (currentMonth >= startMonth) {
              // If no stop_month, continue to end (ongoing income like Social Security)
              if (!stopMonth || currentMonth <= stopMonth) {
                return incomeEvent.amount;
              }
            }
            return 0;
          });
          
          // Only add trace if it has non-zero values
          if (incomeTrace.some(value => value !== 0)) {
            const eventColor = incomeColors[incomeEvent.name] || '#6b7280';
            const isNegative = incomeEvent.amount < 0;
            
            traces.push({
              x: months,
              y: incomeTrace,
              type: 'scatter',
              mode: 'lines',
              name: `${incomeEvent.name} (Income)`,
              line: { 
                color: eventColor, 
                width: 2
              },
              opacity: 0.7,
              hovertemplate: `${incomeEvent.name}<br>%{y:$,.0f}<br>Month: %{x}<extra></extra>`
            });
          }
        }
      });
      
      // Calculate total balance for the total trace
      totalBalance = results.map((_, index) => {
        let total = 0;
        assetNames.forEach(assetName => {
          const balances = balanceHistory[assetName];
          if (balances && balances[index] !== undefined) {
            total += parseFloat(balances[index]) || 0;
          }
        });
        return total;
      });
      
      // Add total trace (more prominent, floating/unobtrusive)
      traces.push({
        x: months,
        y: totalBalance,
        type: 'scatter',
        mode: 'lines',
        name: 'Total Assets',
        line: { 
          color: '#1f2937', 
          width: 2,
          dash: 'dash'
        },
        opacity: 0.9
      });
      
    } else {
      console.log('🔍 No balance history, using fallback method');
      // Fallback: create single total trace
      const totalBalance = results.map((result, index) => {
        if (result.withdrawals && Array.isArray(result.withdrawals)) {
          return result.withdrawals.reduce((sum, withdrawal) => {
            return sum + (parseFloat(withdrawal.remainingBalance) || 0);
          }, 0);
        }
        const savings = parseFloat(result.savings) || 0;
        const investment = parseFloat(result.investment) || 0;
        const traditionalIRA = parseFloat(result.traditionalIRA) || 0;
        const rothIRA = parseFloat(result.rothIRA) || 0;
        return savings + investment + traditionalIRA + rothIRA;
      });
      
      traces.push({
        x: months,
        y: totalBalance,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Total Assets',
        line: { color: '#2563eb', width: 3 }
      });
    }

    console.log('📊 Chart data prepared:', {
      months: months.length,
      firstMonth: months[0],
      lastMonth: months[months.length - 1],
      tracesCount: traces.length,
      traceNames: traces.map(t => t.name)
    });

    return traces;
  }

  /**
   * Display insights in the insights section
   */
  displayInsights(insights) {
    if (!this.insightsSection || !insights) {
      console.warn('❌ Insights section or insights data not available');
      return;
    }

    const insightsList = this.insightsSection.querySelector('#insights-list');
    if (!insightsList) {
      console.warn('❌ Insights list element not found');
      return;
    }

    insightsList.innerHTML = '';
    
    // Add each insight as a list item
    insights.forEach(insight => {
      const li = document.createElement('li');
      // Handle both string insights and object insights
      if (typeof insight === 'string') {
        li.textContent = insight;
      } else if (insight && typeof insight === 'object') {
        // If insight is an object, try to extract meaningful text
        if (insight.text) {
          li.textContent = insight.text;
        } else if (insight.message) {
          li.textContent = insight.message;
        } else if (insight.description) {
          li.textContent = insight.description;
        } else {
          // Fallback: stringify the object in a readable way
          li.textContent = JSON.stringify(insight, null, 2);
        }
      } else {
        li.textContent = String(insight);
      }
      insightsList.appendChild(li);
    });

    this.insightsSection.style.display = 'block';
    console.log('💡 Insights displayed');
  }

  /**
   * Populate CSV export with pre-generated CSV text
   */
  populateCSVFromText(csvText) {
    const csvContainer = document.getElementById('csv-container');
    if (!csvContainer || !csvText) {
      console.warn('❌ CSV container or CSV text not available');
      return;
    }

    try {
      csvContainer.textContent = csvText;
      // Remove collapsed class and add show class to make CSV visible
      csvContainer.classList.remove('csv-container--collapsed');
      csvContainer.classList.add('show');
      console.log('📊 CSV export populated from pre-generated text');
    } catch (error) {
      console.error('❌ CSV text population failed:', error);
    }
  }

  /**
   * Populate CSV export with simulation results
   */
  populateCSVExport(results) {
    const csvContainer = document.getElementById('csv-container');
    if (!csvContainer || !results) {
      console.warn('❌ CSV container or results not available');
      return;
    }

    try {
      // Convert results to CSV format
      const csvData = this.convertResultsToCSV(results);
      csvContainer.textContent = csvData;
      console.log('📊 CSV export populated from results conversion');
    } catch (error) {
      console.error('❌ CSV export failed:', error);
    }
  }

  /**
   * Convert simulation results to CSV format
   */
  convertResultsToCSV(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return 'No data available';
    }

    // Create CSV header
    const headers = ['Month', 'Total Assets', 'Monthly Expenses', 'Net Change'];
    let csv = headers.join(',') + '\n';

    // Add data rows
    results.forEach((month, index) => {
      const totalAssets = month.assets ? 
        month.assets.reduce((sum, asset) => sum + (asset.balance || 0), 0) : 0;
      const expenses = month.expenses || 0;
      const netChange = index > 0 ? 
        totalAssets - (results[index - 1].assets ? 
          results[index - 1].assets.reduce((sum, asset) => sum + (asset.balance || 0), 0) : 0) : 0;

      csv += `${index},${totalAssets.toFixed(2)},${expenses.toFixed(2)},${netChange.toFixed(2)}\n`;
    });

    return csv;
  }

  /**
   * Set run button loading state
   */
  setRunButtonLoading(isLoading) {
    if (!this.runButton) return;
    
    this.runButton.disabled = isLoading;
    this.runButton.textContent = isLoading ? 'Running...' : '🚀 Run Single Scenario';
  }

  /**
   * Show chart area
   */
  showChartArea() {
    if (this.chartArea) {
      this.chartArea.classList.add('has-results');
      this.chartArea.style.display = 'block';
    }
  }



  /**
   * Show error message
   */
  showError(message) {
    console.error('❌', message);
    // Could implement toast notifications here
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    console.log('✅', message);
    // Could implement toast notifications here
  }

  // Store current simulation results for export
  currentSimulationResults = null;

  /**
   * Show warning message
   */
  showWarning(message) {
    console.warn('⚠️', message);
    // Could implement toast notifications here
  }

  /**
   * Show Export CSV button after single scenario simulation completes
   */
  showExportCsvButton() {
    const csvButton = document.getElementById('toggle-csv-btn');
    if (csvButton) {
      csvButton.style.display = 'inline-block';
    }
  }

  /**
   * Hide Export CSV button when simulation starts
   */
  hideExportCsvButton() {
    const csvButton = document.getElementById('toggle-csv-btn');
    if (csvButton) {
      csvButton.style.display = 'none';
    }
  }

  /**
   * Export functionality moved to centralized ExportController
   * These methods are deprecated and no longer used
   */

  /**
   * Highlight all text in JSON editor
   */
  highlightAllJson() {
    const jsonEditor = document.getElementById('json-editor');
    if (jsonEditor) {
      jsonEditor.select();
      jsonEditor.setSelectionRange(0, jsonEditor.value.length);
      console.log('🔍 JSON editor text highlighted');
    }
  }

  /**
   * Export current scenario configuration as JSON file
   */
  exportConfig() {
    if (!this.currentScenario) {
      this.showError('No scenario selected to export');
      return;
    }

    try {
      const jsonData = JSON.stringify(this.currentScenario, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const scenarioName = this.currentScenario.metadata?.title || 'scenario';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      a.download = `${scenarioName.toLowerCase().replace(/\s+/g, '-')}-config-${timestamp}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('Configuration exported successfully');
      console.log('📄 Configuration exported as JSON file');
    } catch (error) {
      this.showError(`Failed to export configuration: ${error.message}`);
    }
  }

  /**
   * Export single scenario results
   */
  exportSingleResults() {
    // Request export from the system via event bus
    this.eventBus.emit('ui:single-scenario-export-requested', { format: 'csv' });
    console.log('📊 Single scenario export requested');
  }
}
