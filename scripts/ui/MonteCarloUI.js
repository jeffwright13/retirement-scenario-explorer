/**
 * Monte Carlo UI Integration - Handles UI events and interactions
 * Connects DOM elements to the Monte Carlo controller via event bus
 */
export class MonteCarloUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    
    this.setupEventListeners();
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
    this.startButton = document.getElementById('start-monte-carlo');
    this.runButton = document.getElementById('run-monte-carlo-analysis');
    this.cancelButton = document.getElementById('cancel-monte-carlo');
    this.exportButton = document.getElementById('export-monte-carlo');
    this.monteCarloSection = document.getElementById('monte-carlo-section');
    this.iterationsInput = document.getElementById('monte-carlo-iterations');
    this.seedInput = document.getElementById('monte-carlo-seed');
    
    // Set up click handlers
    if (this.startButton) {
      this.startButton.addEventListener('click', () => {
        this.handleStartAnalysis();
      });
    }
    
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
    
    // Listen for Monte Carlo events to update UI visibility
    this.eventBus.on('montecarlo:started', () => {
      this.showMonteCarloSection();
    });
    
    this.eventBus.on('montecarlo:completed', () => {
      this.showMonteCarloSection();
    });
    
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
    this.eventBus.emit('ui:monte-carlo-export-requested', { format: 'json' });
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
    
    // Add default variable ranges (can be extended with advanced UI)
    config.variableRanges = this.getDefaultVariableRanges();
    
    return config;
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
      this.monteCarloSection.classList.remove('monte-carlo-section--collapsed');
      
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
