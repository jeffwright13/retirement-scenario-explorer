/**
 * TabController - Manages tabbed interface for Scenario Mode
 * Handles tab switching, state management, and workflow progression
 */
class TabController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentTab = 'configure';
    this.isInitialized = false;
    
    this.setupEventListeners();
  }

  /**
   * Initialize the tab controller
   */
  initialize() {
    console.log('📋 Initializing Tab Controller');
    this.initializeAfterDOM();
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
    // Listen for simulation completion - stay in same tab since results are inline
    this.eventBus.on('simulation:regular-completed', () => {
      // Results display in same Single Scenario tab - no tab switch needed
      console.log('📑 Single scenario completed - results shown in same tab');
    });
    
    this.eventBus.on('simulation:monte-carlo-completed', () => {
      // Results display in same Monte Carlo tab - no tab switch needed
      console.log('📑 Monte Carlo completed - results shown in same tab');
    });
    
    // Listen for scenario selection - enable analysis tabs when scenario is selected
    this.eventBus.on('scenario:selected', () => {
      this.enableAnalysisTabs();
      console.log('📑 Scenario selected - analysis tabs enabled');
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
    
    // Smooth scroll to tab area for better UX
    this.scrollToTabArea();
    
    // Emit tab change event
    this.eventBus.emit('tab:changed', {
      previousTab,
      currentTab: tabId
    });
    
    // Handle tab-specific logic
    this.handleTabSwitch(tabId);
  }

  /**
   * Smooth scroll to tab area for better UX
   */
  scrollToTabArea() {
    const tabContainer = document.querySelector('.scenario-tabs');
    if (tabContainer) {
      tabContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      console.log('📑 Smooth scrolled to tab area');
    }
  }

  /**
   * Handle tab-specific logic when switching
   * @param {string} tabId - Tab identifier
   */
  handleTabSwitch(tabId) {
    switch (tabId) {
      case 'configure':
        // Focus on scenario selection if no scenario is selected
        this.focusScenarioSelection();
        break;
      case 'single-analysis':
        // Check if scenario is selected for single analysis
        this.validateSingleAnalysisReadiness();
        break;
      case 'monte-carlo':
        // Check if scenario is selected for Monte Carlo
        this.validateMonteCarloReadiness();
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
   * Validate single analysis readiness
   */
  validateSingleAnalysisReadiness() {
    const scenarioDropdown = document.getElementById('scenario-dropdown');
    const statusDiv = document.getElementById('single-analysis-status');
    const runButton = document.getElementById('run-btn-primary');
    
    if (!scenarioDropdown || !scenarioDropdown.value) {
      if (statusDiv) statusDiv.innerHTML = '<p>Select a scenario in the Configure tab to enable analysis.</p>';
      if (runButton) {
        runButton.disabled = true;
        runButton.textContent = '🚀 Select Scenario First';
      }
    } else {
      if (statusDiv) statusDiv.style.display = 'none';
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = '🚀 Run Single Scenario';
      }
    }
  }

  /**
   * Validate Monte Carlo readiness
   */
  validateMonteCarloReadiness() {
    const scenarioDropdown = document.getElementById('scenario-dropdown');
    const statusDiv = document.getElementById('monte-carlo-analysis-status');
    const runButton = document.getElementById('run-monte-carlo-btn');
    
    if (!scenarioDropdown || !scenarioDropdown.value) {
      if (statusDiv) statusDiv.innerHTML = '<p>Select a scenario in the Configure tab to enable Monte Carlo analysis.</p>';
      if (runButton) {
        runButton.disabled = true;
        runButton.textContent = '🎲 Select Scenario First';
      }
      return false;
    }

    if (statusDiv) statusDiv.style.display = 'none';
    if (runButton) {
      runButton.disabled = false;
      runButton.textContent = '🎲 Run Monte Carlo Analysis';
    }
    return true;
  }

  /**
   * Enable analysis tabs when scenario is selected
   */
  enableAnalysisTabs() {
    this.validateSingleAnalysisReadiness();
    this.validateMonteCarloReadiness();
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
    // Reset to Configure tab when entering Scenario Mode
    this.switchToTab('configure');
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
