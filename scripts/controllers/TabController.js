/**
 * TabController - Manages tabbed interface for Scenario Mode
 * Handles tab switching, state management, and workflow progression
 */
class TabController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentTab = 'input';
    this.tabButtons = null;
    this.tabPanels = null;
    
    this.init();
  }

  /**
   * Initialize tab controller
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeAfterDOM());
    } else {
      this.initializeAfterDOM();
    }
  }

  /**
   * Initialize after DOM is ready
   */
  initializeAfterDOM() {
    this.setupDOMReferences();
    this.setupEventListeners();
    this.setupTabEventListeners();
    console.log('📑 TabController initialized with', this.tabButtons.length, 'tab buttons');
  }

  /**
   * Setup DOM references
   */
  setupDOMReferences() {
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabPanels = document.querySelectorAll('.tab-panel');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for simulation completion to auto-switch to Results tab
    this.eventBus.on('simulation:regular-completed', () => this.switchToTab('results'));
    this.eventBus.on('simulation:monte-carlo-completed', () => this.switchToTab('results'));
    
    // Listen for scenario selection to enable simulation tab
    this.eventBus.on('scenario:selected', () => {
      this.enableTab('simulation');
      // Stay on Input tab so user can see configuration synopsis and JSON Edit button
      console.log('📑 Scenario selected - staying on Input tab for user review');
    });
    
    // Listen for mode changes
    this.eventBus.on('mode:scenario-entered', () => this.handleModeEntered());
    this.eventBus.on('mode:story-entered', () => this.handleModeExited());
  }

  /**
   * Setup tab click event listeners
   */
  setupTabEventListeners() {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        if (tabId) {
          this.switchToTab(tabId);
        }
      });
    });
  }

  /**
   * Switch to a specific tab
   * @param {string} tabId - Tab identifier
   */
  switchToTab(tabId) {
    if (tabId === this.currentTab) return;
    
    console.log(`📑 Switching to ${tabId} tab`);
    
    // Update tab buttons
    this.tabButtons.forEach(button => {
      const buttonTabId = button.getAttribute('data-tab');
      if (buttonTabId === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Update tab panels
    this.tabPanels.forEach(panel => {
      const panelTabId = panel.id.replace('-tab', '');
      if (panelTabId === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    const previousTab = this.currentTab;
    this.currentTab = tabId;
    
    // Emit tab change event
    this.eventBus.emit('tab:changed', {
      previousTab,
      currentTab: tabId
    });
    
    // Handle tab-specific logic
    this.handleTabSwitch(tabId);
  }

  /**
   * Handle tab-specific logic when switching
   * @param {string} tabId - Tab identifier
   */
  handleTabSwitch(tabId) {
    switch (tabId) {
      case 'input':
        // Focus on scenario selection if no scenario is selected
        this.focusScenarioSelection();
        break;
      case 'simulation':
        // Ensure scenario is selected before allowing simulation
        this.validateSimulationReadiness();
        break;
      case 'results':
        // Ensure results area is properly displayed
        this.ensureResultsVisible();
        break;
      case 'compare':
        // Future enhancement - comparison functionality
        break;
    }
  }

  /**
   * Enable a specific tab
   * @param {string} tabId - Tab identifier
   */
  enableTab(tabId) {
    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.disabled = false;
      tabButton.style.opacity = '1';
    }
  }

  /**
   * Disable a specific tab
   * @param {string} tabId - Tab identifier
   */
  disableTab(tabId) {
    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.disabled = true;
      tabButton.style.opacity = '0.5';
    }
  }

  /**
   * Focus scenario selection in Input tab
   */
  focusScenarioSelection() {
    const scenarioDropdown = document.getElementById('scenario-dropdown');
    if (scenarioDropdown && !scenarioDropdown.value) {
      setTimeout(() => scenarioDropdown.focus(), 100);
    }
  }

  /**
   * Validate simulation readiness
   */
  validateSimulationReadiness() {
    const scenarioDropdown = document.getElementById('scenario-dropdown');
    if (!scenarioDropdown || !scenarioDropdown.value) {
      // Switch back to input tab if no scenario selected
      setTimeout(() => {
        this.switchToTab('input');
        this.showMessage('Please select a scenario first', 'warning');
      }, 100);
    }
  }

  /**
   * Ensure results are visible
   */
  ensureResultsVisible() {
    const chartArea = document.getElementById('chart-area');
    if (chartArea && !chartArea.classList.contains('has-results')) {
      // No results yet, suggest running simulation
      this.showMessage('Run a simulation to see results', 'info');
    }
  }

  /**
   * Show a message to the user
   * @param {string} message - Message text
   * @param {string} type - Message type (info, warning, error)
   */
  showMessage(message, type = 'info') {
    // For now, use console - could be enhanced with toast notifications
    console.log(`📑 Tab Message (${type}):`, message);
  }

  /**
   * Handle mode entered (Scenario Mode activated)
   */
  handleModeEntered() {
    // Reset to Input tab when entering Scenario Mode
    this.switchToTab('input');
  }

  /**
   * Handle mode exited (Story Mode activated)
   */
  handleModeExited() {
    // Tab controller is not active in Story Mode
  }

  /**
   * Get current tab
   * @returns {string} Current tab identifier
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Check if a tab is active
   * @param {string} tabId - Tab identifier
   * @returns {boolean} True if tab is active
   */
  isTabActive(tabId) {
    return this.currentTab === tabId;
  }
}

export { TabController };
