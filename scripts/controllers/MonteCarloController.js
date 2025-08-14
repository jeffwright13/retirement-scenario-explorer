/**
 * Monte Carlo Controller - Orchestrates Monte Carlo analysis operations
 * Follows event bus architecture and manages UI state for Monte Carlo features
 */
export class MonteCarloController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Controller state (populated from event bus)
    this.currentScenarioData = null;
    this.currentAnalysis = null;
    this.analysisHistory = [];
    this.isAnalysisRunning = false;
    this.analysisProgress = { completed: 0, total: 0, percentage: 0 };
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Monte Carlo events
   */
  setupEventListeners() {
    // Listen for scenario changes to update our state
    this.eventBus.on('scenario:selected', (data) => {
      this.currentScenarioData = data.scenario;
      console.log('🎲 MonteCarloController: Scenario data updated via scenario:selected:', data.scenario?.metadata?.title);
    });

    // Also listen for scenario:loaded event (from UIController)
    this.eventBus.on('scenario:loaded', (data) => {
      this.currentScenarioData = data.scenario;
      console.log('🎲 MonteCarloController: Scenario data updated via scenario:loaded:', data.scenario?.name);
    });

    // Listen for Monte Carlo analysis events
    this.eventBus.on('montecarlo:started', (data) => {
      this.isAnalysisRunning = true;
      this.currentAnalysis = {
        status: 'running',
        startTime: Date.now(),
        config: data.config,
        scenarioData: data.scenarioData
      };
      this.updateUI();
    });

    this.eventBus.on('montecarlo:progress', (data) => {
      this.analysisProgress = data;
      this.updateUI();
    });

    this.eventBus.on('montecarlo:completed', (data) => {
      this.isAnalysisRunning = false;
      this.currentAnalysis = {
        status: 'completed',
        startTime: this.currentAnalysis?.startTime || Date.now(),
        endTime: Date.now(),
        results: data.results,
        analysis: data.analysis,
        config: data.config,
        scenarioData: data.scenarioData,
        duration: data.duration
      };
      
      // Add to history
      this.analysisHistory.unshift({ ...this.currentAnalysis });
      
      // Limit history size
      if (this.analysisHistory.length > 10) {
        this.analysisHistory = this.analysisHistory.slice(0, 10);
      }
      
      this.updateUI();
      this.displayResults();
    });

    this.eventBus.on('montecarlo:error', (data) => {
      this.isAnalysisRunning = false;
      this.currentAnalysis = {
        status: 'error',
        error: data.error,
        endTime: Date.now()
      };
      this.updateUI();
      this.displayError(data.error);
    });

    this.eventBus.on('montecarlo:cancelled', () => {
      this.isAnalysisRunning = false;
      this.currentAnalysis = {
        status: 'cancelled',
        endTime: Date.now()
      };
      this.updateUI();
    });

    // Listen for UI events
    this.eventBus.on('ui:monte-carlo-start-requested', (config) => {
      this.startAnalysis(config);
    });

    this.eventBus.on('ui:monte-carlo-cancel-requested', () => {
      this.cancelAnalysis();
    });

    this.eventBus.on('ui:monte-carlo-export-requested', (options) => {
      this.exportResults(options.format);
    });
  }

  /**
   * Start Monte Carlo analysis with specified configuration
   * @param {Object} config - Analysis configuration
   */
  startAnalysis(config = {}) {
    // Try to get scenario data if we don't have it
    if (!this.currentScenarioData) {
      this.tryGetCurrentScenario();
    }

    if (!this.currentScenarioData) {
      console.error('❌ MonteCarloController: No scenario data available');
      console.log('🔍 Debug: Available scenarios:', window.retirementApp?.scenarioController?.currentScenario);
      this.displayError('Please select a scenario first before running Monte Carlo analysis.');
      return;
    }

    if (this.isAnalysisRunning) {
      console.warn('⚠️ MonteCarloController: Analysis already running');
      this.displayError('Monte Carlo analysis is already running. Please wait for it to complete or cancel it first.');
      return;
    }

    console.log('🎲 MonteCarloController: Starting analysis for scenario:', this.currentScenarioData.name);

    // Default variable ranges for retirement scenarios
    const defaultVariableRanges = this.getDefaultVariableRanges();
    
    // Merge with user-provided ranges
    const variableRanges = { ...defaultVariableRanges, ...(config.variableRanges || {}) };

    console.log('🎲 MonteCarloController: Starting Monte Carlo analysis');
    
    // Emit request via event bus
    this.eventBus.emit('montecarlo:run', {
      scenarioData: this.currentScenarioData,
      config: {
        iterations: config.iterations || 1000,
        confidenceIntervals: config.confidenceIntervals || [10, 25, 50, 75, 90],
        randomSeed: config.randomSeed || null,
        parallelBatches: config.parallelBatches || 4,
        progressUpdateInterval: config.progressUpdateInterval || 50
      },
      variableRanges,
      context: {
        analysisType: 'retirement_scenario',
        requestedBy: 'user',
        timestamp: Date.now()
      }
    });
  }

  /**
   * Cancel running analysis
   */
  cancelAnalysis() {
    if (this.isAnalysisRunning) {
      console.log('🛑 MonteCarloController: Cancelling analysis');
      this.eventBus.emit('montecarlo:cancel');
    }
  }

  /**
   * Get default variable ranges for retirement scenarios
   * Focus on varying ASSET RETURNS for market-dependent investments
   */
  getDefaultVariableRanges() {
    return {
      // Investment account returns (stocks/bonds) - high volatility
      'rate_schedules.investment_growth.rate': {
        type: 'normal',
        mean: 0.065, // 6.5% baseline from scenario
        stdDev: 0.15 // 15% annual volatility (realistic for stock/bond mix)
      },
      
      // Traditional IRA returns (market-dependent) - high volatility  
      'rate_schedules.ira_growth.rate': {
        type: 'normal',
        mean: 0.0625, // 6.25% baseline from scenario
        stdDev: 0.14 // 14% annual volatility (slightly more conservative)
      },
      
      // Roth IRA returns (market-dependent) - high volatility
      'rate_schedules.roth_growth.rate': {
        type: 'normal',
        mean: 0.07, // 7% baseline from scenario  
        stdDev: 0.16 // 16% annual volatility (potentially more aggressive allocation)
      }
      
      // NOTE: Savings account (savings_growth) intentionally NOT varied
      // as it represents stable bank savings/CDs with predictable returns
      // NOTE: Expenses and income intentionally NOT varied 
      // as they represent planned/contractual amounts
    };
  }

  /**
   * Update UI elements based on current state
   */
  updateUI() {
    // Update progress indicators
    this.updateProgressIndicators();
    
    // Update control buttons
    this.updateControlButtons();
    
    // Update status displays
    this.updateStatusDisplays();
  }

  /**
   * Update progress indicators
   */
  updateProgressIndicators() {
    const progressBar = document.getElementById('monte-carlo-progress');
    const progressText = document.getElementById('monte-carlo-progress-text');
    
    if (progressBar && progressText) {
      if (this.isAnalysisRunning) {
        progressBar.style.display = 'block';
        progressBar.value = this.analysisProgress.percentage;
        progressText.textContent = `${this.analysisProgress.completed}/${this.analysisProgress.total} (${this.analysisProgress.percentage}%)`;
      } else {
        progressBar.style.display = 'none';
        progressText.textContent = '';
      }
    }
  }

  /**
   * Update control buttons
   */
  updateControlButtons() {
    const startButton = document.getElementById('start-monte-carlo');
    const cancelButton = document.getElementById('cancel-monte-carlo');
    
    if (startButton) {
      startButton.disabled = this.isAnalysisRunning || !this.currentScenarioData;
      startButton.textContent = this.isAnalysisRunning ? 'Running...' : 'Start Monte Carlo Analysis';
    }
    
    if (cancelButton) {
      cancelButton.disabled = !this.isAnalysisRunning;
      cancelButton.style.display = this.isAnalysisRunning ? 'inline-block' : 'none';
    }
  }

  /**
   * Update status displays based on current state
   * Note: Main status element removed for cleaner UX - now uses progress text only
   */
  updateStatusDisplays() {
    const progressTextElement = document.getElementById('monte-carlo-progress-text');
    
    if (progressTextElement) {
      if (this.isAnalysisRunning) {
        // Progress text will be updated by progress handler
        progressTextElement.style.display = 'block';
      } else if (this.currentAnalysis) {
        switch (this.currentAnalysis.status) {
          case 'completed':
            progressTextElement.textContent = `✅ Analysis completed in ${this.currentAnalysis.duration}ms`;
            progressTextElement.className = 'progress-text completed';
            break;
          case 'error':
            progressTextElement.textContent = `❌ Analysis failed: ${this.currentAnalysis.error}`;
            progressTextElement.className = 'progress-text error';
            break;
          case 'cancelled':
            progressTextElement.textContent = '⏹️ Analysis cancelled';
            progressTextElement.className = 'progress-text cancelled';
            break;
          default:
            progressTextElement.textContent = '';
            progressTextElement.style.display = 'none';
        }
      } else {
        progressTextElement.textContent = '';
        progressTextElement.style.display = 'none';
      }
    }
  }

  /**
   * Display Monte Carlo results in isolation - PREVENT MAIN CHART INTERFERENCE
   */
  displayResults() {
    if (!this.currentAnalysis || this.currentAnalysis.status !== 'completed') {
      return;
    }

    console.log('📊 MonteCarloController: Displaying Monte Carlo results in isolation');
    
    // Emit SPECIFIC Monte Carlo display event (not generic display-results)
    this.eventBus.emit('montecarlo:display-monte-carlo-charts', {
      analysis: this.currentAnalysis.analysis,
      results: this.currentAnalysis.results,
      scenarioData: this.currentAnalysis.scenarioData
    });
    
    // Update summary statistics
    this.displaySummaryStatistics();
    
    // Update insights
    this.displayInsights();
  }

  /**
   * Display summary statistics
   */
  displaySummaryStatistics() {
    const analysis = this.currentAnalysis.analysis;
    const container = document.getElementById('monte-carlo-summary');
    
    if (!container || !analysis) return;
    
    const stats = analysis.statistics;
    const successRate = (analysis.successRate * 100).toFixed(1);
    
    container.innerHTML = `
      <div class="monte-carlo-summary">
        <h3>Monte Carlo Analysis Results</h3>
        
        <div class="success-rate">
          <h4>Success Rate</h4>
          <div class="metric-value ${analysis.successRate > 0.8 ? 'good' : analysis.successRate > 0.6 ? 'warning' : 'critical'}">
            ${successRate}%
          </div>
          <p>Probability of maintaining positive balance throughout retirement</p>
        </div>
        
        <div class="final-balance-stats">
          <h4>Final Balance Distribution</h4>
          <div class="percentile-grid">
            <div class="percentile">
              <span class="label">10th percentile:</span>
              <span class="value">$${(stats.finalBalance.percentiles[10] / 1000).toFixed(0)}K</span>
            </div>
            <div class="percentile">
              <span class="label">Median:</span>
              <span class="value">$${(stats.finalBalance.median / 1000).toFixed(0)}K</span>
            </div>
            <div class="percentile">
              <span class="label">90th percentile:</span>
              <span class="value">$${(stats.finalBalance.percentiles[90] / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>
        
        <div class="risk-metrics">
          <h4>Risk Metrics</h4>
          <div class="metric-grid">
            <div class="metric">
              <span class="label">Max Drawdown (95th percentile):</span>
              <span class="value">${(analysis.riskMetrics.maxDrawdown.percentiles[95] * 100).toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="label">Value at Risk (5%):</span>
              <span class="value">$${(analysis.riskMetrics.valueAtRisk / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Display insights
   */
  displayInsights() {
    const analysis = this.currentAnalysis.analysis;
    const container = document.getElementById('monte-carlo-insights');
    
    if (!container || !analysis || !analysis.insights) return;
    
    const insightsHtml = analysis.insights.map(insight => `
      <div class="insight ${insight.severity}">
        <h4>${insight.title}</h4>
        <p>${insight.description}</p>
      </div>
    `).join('');
    
    container.innerHTML = `
      <div class="monte-carlo-insights">
        <h3>Key Insights</h3>
        ${insightsHtml}
      </div>
    `;
  }

  /**
   * Display error message
   */
  displayError(error) {
    const container = document.getElementById('monte-carlo-error');
    
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h4>Analysis Error</h4>
          <p>${error}</p>
          <button onclick="this.parentElement.style.display='none'">Dismiss</button>
        </div>
      `;
      container.style.display = 'block';
    }
  }

  /**
   * Get analysis configuration from UI
   */
  getConfigurationFromUI() {
    const config = {};
    
    // Get iterations
    const iterationsInput = document.getElementById('monte-carlo-iterations');
    if (iterationsInput) {
      config.iterations = parseInt(iterationsInput.value) || 1000;
    }
    
    // Get random seed
    const seedInput = document.getElementById('monte-carlo-seed');
    if (seedInput && seedInput.value) {
      config.randomSeed = parseInt(seedInput.value);
    }
    
    // Get custom variable ranges if provided
    config.variableRanges = this.getVariableRangesFromUI();
    
    return config;
  }

  /**
   * Get variable ranges from UI (if advanced configuration is available)
   */
  getVariableRangesFromUI() {
    const ranges = {};
    
    // This would be populated from advanced configuration UI
    // For now, return empty object to use defaults
    
    return ranges;
  }

  /**
   * Export analysis results
   */
  exportResults(format = 'json') {
    if (!this.currentAnalysis || this.currentAnalysis.status !== 'completed') {
      console.warn('⚠️ MonteCarloController: No completed analysis to export');
      return;
    }

    const data = {
      analysis: this.currentAnalysis.analysis,
      metadata: {
        scenarioName: this.currentAnalysis.scenarioData.name,
        exportDate: new Date().toISOString(),
        iterations: this.currentAnalysis.results.length,
        duration: this.currentAnalysis.duration
      }
    };

    switch (format) {
      case 'json':
        this.downloadJSON(data, `monte-carlo-analysis-${Date.now()}.json`);
        break;
      case 'csv':
        this.downloadCSV(data, `monte-carlo-analysis-${Date.now()}.csv`);
        break;
      default:
        console.error('❌ MonteCarloController: Unknown export format:', format);
    }
  }

  /**
   * Download data as JSON file
   */
  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download data as CSV file
   */
  downloadCSV(data, filename) {
    // Export the FIRST simulation result in the same format as traditional scenarios
    // This gives users the expected monthly data format, not statistical summaries
    const results = data.results;
    if (!results || results.length === 0) {
      console.error('❌ No Monte Carlo results to export');
      return;
    }
    
    // Use the first simulation result as representative data
    const firstResult = results[0];
    if (!firstResult || !firstResult.result || !firstResult.result.results) {
      console.error('❌ Invalid Monte Carlo result structure');
      return;
    }
    
    // Check if we have csvText from the simulation engine
    if (firstResult.result.results.csvText) {
      // Use the pre-generated CSV from the simulation engine (same format as traditional)
      const csv = firstResult.result.results.csvText;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback: Generate CSV from simulation results array
      const simulationResults = firstResult.result.results.results || firstResult.result.results;
      if (!Array.isArray(simulationResults)) {
        console.error('❌ Cannot generate CSV: simulation results not in expected format');
        return;
      }
      
      // Generate CSV in same format as traditional scenarios
      const rows = [['Month', 'Date', 'Income', 'Expenses', 'Total Balance']];
      
      simulationResults.forEach((month, index) => {
        if (month && month.assets) {
          const totalBalance = Object.values(month.assets).reduce((sum, balance) => sum + balance, 0);
          const date = new Date();
          date.setMonth(date.getMonth() + index);
          
          rows.push([
            index + 1,
            date.toISOString().slice(0, 7), // YYYY-MM format
            month.income || 0,
            month.expenses || 0,
            totalBalance.toFixed(2)
          ]);
        }
      });
      
      const csv = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Try to get current scenario from other controllers as fallback
   */
  tryGetCurrentScenario() {
    console.log('🔍 MonteCarloController: Trying to get current scenario as fallback');
    
    // Try to get from the main app's scenario controller
    if (window.retirementApp?.scenarioController?.currentScenario) {
      this.currentScenarioData = window.retirementApp.scenarioController.currentScenario;
      console.log('✅ MonteCarloController: Got scenario from ScenarioController:', this.currentScenarioData.name);
      return;
    }
    
    // Try to get from UI controller
    if (window.retirementApp?.uiController?.currentScenario) {
      this.currentScenarioData = window.retirementApp.uiController.currentScenario;
      console.log('✅ MonteCarloController: Got scenario from UIController:', this.currentScenarioData.name);
      return;
    }
    
    console.log('❌ MonteCarloController: No scenario found in fallback attempt');
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      currentScenarioData: this.currentScenarioData,
      currentAnalysis: this.currentAnalysis,
      analysisHistory: this.analysisHistory,
      isAnalysisRunning: this.isAnalysisRunning,
      analysisProgress: this.analysisProgress
    };
  }
}
