/**
 * Monte Carlo UI Integration - Handles UI events and interactions
 * Connects DOM elements to the Monte Carlo controller via event bus
 */
export class MonteCarloUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    
    // UI elements will be initialized when DOM is ready
    this.runButton = null;
    this.cancelButton = null;
    this.exportButton = null;
    this.monteCarloSection = null;
    this.iterationsInput = null;
    this.seedInput = null;
    this.targetYearsInput = null;
    this.successRateInput = null;
    this.returnModelSelect = null;
    this.showConfigCheckbox = null;
    this.progressBar = null;
    this.progressText = null;
  }

  /**
   * Initialize the Monte Carlo UI component
   */
  initialize() {
    console.log('🎲 Initializing Monte Carlo UI');
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeUI();
      });
    } else {
      this.initializeUI();
    }
  }

  /**
   * Initialize UI elements and event handlers
   */
  initializeUI() {
    if (this.isInitialized) return;
    
    console.log('🎲 MonteCarloUI: Initializing UI elements');
    
    // Get UI elements
    this.runButton = document.getElementById('run-monte-carlo-btn');
    this.cancelButton = document.getElementById('cancel-monte-carlo');
    this.exportButton = document.getElementById('export-monte-carlo');
    this.monteCarloSection = document.getElementById('monte-carlo-section');
    this.iterationsInput = document.getElementById('monte-carlo-iterations');
    this.seedInput = document.getElementById('monte-carlo-seed');
    this.targetYearsInput = document.getElementById('monte-carlo-target-years');
    this.successRateInput = document.getElementById('monte-carlo-success-rate');
    this.returnModelSelect = document.getElementById('monte-carlo-return-model');
    this.configToggle = document.getElementById('show-monte-carlo-config');
    
    // Set up the prominent run button
    if (this.runButton) {
      this.runButton.addEventListener('click', () => {
        this.handleRunAnalysis();
      });
    }
    
    if (this.cancelButton) {
      this.cancelButton.addEventListener('click', () => {
        this.handleCancelAnalysis();
      });
    }
    
    if (this.exportButton) {
      this.exportButton.addEventListener('click', () => {
        this.handleExportResults();
      });
    }
    
    // Set up configuration toggle
    if (this.configToggle) {
      this.configToggle.addEventListener('change', () => {
        this.handleConfigToggle();
      });
    }
    
    // Listen for Monte Carlo events to update UI visibility
    this.eventBus.on('montecarlo:started', () => {
      this.showMonteCarloSection();
    });
    
    // Don't show config section on completion - let UIController handle results display
    this.eventBus.on('montecarlo:error', () => {
      this.showMonteCarloSection();
    });
    
    this.isInitialized = true;
    console.log('✅ MonteCarloUI: UI initialized successfully');
  }

  /**
   * Handle start analysis button click
   */
  handleStartAnalysis() {
    console.log('🎲 MonteCarloUI: Start analysis clicked');
    
    // Show the Monte Carlo section first so user can configure
    this.showMonteCarloSection();
    
    // Don't start analysis immediately - let user configure first
    // The actual analysis will be triggered by a separate "Run Analysis" button
    console.log('🎲 MonteCarloUI: Monte Carlo section shown, waiting for user configuration');
  }

  /**
   * Handle run analysis button click (the actual analysis trigger)
   */
  handleRunAnalysis() {
    console.log('🎲 MonteCarloUI: Run analysis clicked');
    
    // Get configuration from UI
    const config = this.getConfigurationFromUI();
    console.log('🎲 MonteCarloUI: Configuration:', config);
    
    // Emit start event via event bus (following the architectural pattern)
    this.eventBus.emit('ui:monte-carlo-start-requested', config);
  }

  /**
   * Handle cancel analysis button click
   */
  handleCancelAnalysis() {
    console.log('🎲 MonteCarloUI: Cancel analysis clicked');
    this.eventBus.emit('ui:monte-carlo-cancel-requested');
  }

  /**
   * Handle export results button click
   */
  handleExportResults() {
    console.log('🎲 MonteCarloUI: Export results clicked');
    this.eventBus.emit('ui:monte-carlo-export-requested', { format: 'csv' });
  }

  /**
   * Get configuration from UI elements
   */
  getConfigurationFromUI() {
    const config = {};
    
    // Get iterations
    if (this.iterationsInput && this.iterationsInput.value) {
      config.iterations = parseInt(this.iterationsInput.value) || 1000;
    }
    
    // Get random seed
    if (this.seedInput && this.seedInput.value) {
      config.randomSeed = parseInt(this.seedInput.value);
    }
    
    // Get target survival time in years (convert to months)
    if (this.targetYearsInput && this.targetYearsInput.value) {
      const targetYears = parseFloat(this.targetYearsInput.value);
      if (targetYears && targetYears > 0) {
        config.targetSurvivalMonths = Math.round(targetYears * 12);
        console.log(`🎲 MonteCarloUI: Target years from input: ${targetYears}, converted to months: ${config.targetSurvivalMonths}`);
      } else {
        config.targetSurvivalMonths = 300; // Default 25 years
        console.log('🎲 MonteCarloUI: Invalid target years input, using default: 300 months (25 years)');
      }
    } else {
      config.targetSurvivalMonths = 300; // Default 25 years
      console.log('🎲 MonteCarloUI: No target years input, using default: 300 months (25 years)');
    }
    console.log(`🎲 MonteCarloUI: FINAL CONFIG - Using target months: ${config.targetSurvivalMonths} (${(config.targetSurvivalMonths/12).toFixed(1)} years)`);
    console.log(`🎲 MonteCarloUI: FULL CONFIG OBJECT:`, JSON.stringify(config, null, 2));
    
    
    // Get target success rate
    if (this.successRateInput && this.successRateInput.value) {
      config.targetSuccessRate = parseFloat(this.successRateInput.value) / 100; // Convert percentage to decimal
      console.log(`🎲 MonteCarloUI: Target success rate: ${config.targetSuccessRate * 100}%`);
    } else {
      config.targetSuccessRate = 0.80; // Default: 80% success rate
    }
    
    // Get return model selection
    if (this.returnModelSelect && this.returnModelSelect.value) {
      config.returnModel = this.returnModelSelect.value;
      console.log(`🎲 MonteCarloUI: Return model: ${config.returnModel}`);
    } else {
      config.returnModel = 'simple-random'; // Default model
    }
    
    // Add default variable ranges (can be extended with advanced UI)
    config.variableRanges = this.getDefaultVariableRanges();
    
    return config;
  }

  /**
   * Handle configuration toggle
   */
  handleConfigToggle() {
    if (!this.configToggle || !this.monteCarloSection) return;
    
    const isExpanded = this.configToggle.checked;
    
    console.log(`🎲 MonteCarloUI: Config toggle - isExpanded: ${isExpanded}`);
    
    // Force remove both classes first to reset state
    this.monteCarloSection.classList.remove('monte-carlo-config-collapsed', 'monte-carlo-config-expanded');
    
    // Add the appropriate class based on toggle state
    if (isExpanded) {
      this.monteCarloSection.classList.add('monte-carlo-config-expanded');
      console.log('🎲 MonteCarloUI: Configuration expanded');
    } else {
      this.monteCarloSection.classList.add('monte-carlo-config-collapsed');
      console.log('🎲 MonteCarloUI: Configuration collapsed');
    }
  }

  /**
   * Get default variable ranges for UI - FIXED for realistic retirement returns
   */
  getDefaultVariableRanges() {
    return {
      // Individual asset return variations (realistic retirement planning ranges)
      // Match actual scenario rate schedule names from jeffs-learning-journey-scenarios.json
      
      // Savings account: Conservative returns (1-5% annually)
      'rate_schedules.savings_growth.rate': {
        type: 'normal',
        mean: 0.037, // 3.7% baseline (current scenario value)
        stdDev: 0.015 // 1.5% volatility (realistic savings variation)
      },
      
      // Investment account: Moderate portfolio returns (3-10% annually)
      'rate_schedules.investment_growth.rate': {
        type: 'normal',
        mean: 0.065, // 6.5% baseline (current scenario value)
        stdDev: 0.025 // 2.5% volatility (realistic market variation)
      },
      
      // Traditional IRA: Retirement-focused returns (3-9% annually)
      'rate_schedules.ira_growth.rate': {
        type: 'normal',
        mean: 0.0625, // 6.25% baseline (current scenario value)
        stdDev: 0.02 // 2% volatility (conservative retirement allocation)
      },
      
      // Roth IRA: Growth-focused returns (4-10% annually)
      'rate_schedules.roth_growth.rate': {
        type: 'normal',
        mean: 0.07, // 7% baseline (current scenario value)
        stdDev: 0.025 // 2.5% volatility (growth allocation)
      },
      
      // NOTE: Fixed paths to match actual scenario structure
      // Reduced volatility from unrealistic 15% to realistic 2-2.5%
      // This prevents 20%+ return outliers that cause hockey stick curves
    };
  }

  /**
   * Show Monte Carlo section
   */
  showMonteCarloSection() {
    if (this.monteCarloSection) {
      // Remove old CSS class AND clear any inline style that might hide it
      this.monteCarloSection.classList.remove('monte-carlo-section--collapsed');
      this.monteCarloSection.style.display = 'block';
      
      // IMPORTANT: Don't interfere with collapsible config toggle state
      // Only ensure the section itself is visible, but preserve config collapse state
      
      console.log('🎲 MonteCarloUI: Monte Carlo section shown');
      
      // Scroll to section
      this.monteCarloSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  /**
   * Hide Monte Carlo section
   */
  hideMonteCarloSection() {
    if (this.monteCarloSection) {
      this.monteCarloSection.classList.add('monte-carlo-section--collapsed');
    }
  }

  /**
   * Update UI state based on analysis status
   */
  updateUIState(isRunning, hasResults = false) {
    if (this.startButton) {
      this.startButton.disabled = isRunning;
      this.startButton.textContent = '🎲 Monte Carlo Analysis';
    }
    
    if (this.runButton) {
      this.runButton.disabled = isRunning;
      this.runButton.textContent = isRunning ? 'Running Analysis...' : '🚀 Run Analysis';
    }
    
    if (this.cancelButton) {
      this.cancelButton.style.display = isRunning ? 'inline-block' : 'none';
    }
    
    if (this.exportButton) {
      this.exportButton.disabled = !hasResults;
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Validate configuration before starting analysis
   */
  validateConfiguration(config) {
    const errors = [];
    
    if (config.iterations < 100 || config.iterations > 10000) {
      errors.push('Iterations must be between 100 and 10,000');
    }
    
    if (config.randomSeed !== undefined && (config.randomSeed < 0 || config.randomSeed > 2147483647)) {
      errors.push('Random seed must be between 0 and 2,147,483,647');
    }
    
    return errors;
  }

  /**
   * Get current UI state for debugging
   */
  getUIState() {
    return {
      isInitialized: this.isInitialized,
      elements: {
        startButton: !!this.startButton,
        cancelButton: !!this.cancelButton,
        exportButton: !!this.exportButton,
        monteCarloSection: !!this.monteCarloSection,
        iterationsInput: !!this.iterationsInput,
        seedInput: !!this.seedInput
      },
      configuration: this.getConfigurationFromUI()
    };
  }
}
