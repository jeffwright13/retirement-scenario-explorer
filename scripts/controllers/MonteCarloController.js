/**
 * Monte Carlo Controller - Orchestrates Monte Carlo analysis operations
 * Follows event bus architecture and manages UI state for Monte Carlo features
 */
export class MonteCarloController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Current analysis state
    this.currentAnalysis = {
      status: 'idle', // idle, running, completed, cancelled, error
      analysis: null,
      results: null,
      metadata: null
    };
    
    // Current scenario data (stored from event bus)
    this.currentScenarioData = null;
    
    // Analysis history
    this.analysisHistory = [];
    
    // UI state
    this.isConfigVisible = true;
    
    this.setupEventListeners();
    
    console.log('🎲 MonteCarloController created');
  }

  /**
   * Initialize the Monte Carlo controller
   */
  initialize() {
    console.log('🎲 Initializing Monte Carlo Controller');
    // Controller is already set up via constructor
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

    // Listen for scenario data changes (JSON edits, etc.)
    this.eventBus.on('scenario:data-changed', (data) => {
      this.currentScenarioData = data.scenarioData;
      console.log('🎲 MonteCarloController: Scenario data updated via scenario:data-changed:', data.scenarioData?.metadata?.title);
      
      // Clear any existing Monte Carlo results since scenario changed
      this.clearResults();
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
      
      // Emit event to show Monte Carlo results section
      this.eventBus.emit('montecarlo:analysis-started');
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
      
      // Emit completion event
      this.eventBus.emit('montecarlo:analysis-completed', {
        analysis: data.analysis,
        results: data.results,
        scenarioData: data.scenarioData
      });
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

    this.eventBus.on('montecarlo:cancelled', (data) => {
      this.isAnalysisRunning = false;
      this.currentAnalysis = {
        status: 'cancelled',
        endTime: Date.now(),
        error: 'Analysis was cancelled by user'
      };
      this.updateUI();
      
      // Emit cancellation event to hide Monte Carlo results section
      this.eventBus.emit('montecarlo:analysis-cancelled');
    });

    // Listen for UI events
    this.eventBus.on('ui:monte-carlo-start-requested', (config) => {
      this.startAnalysis(config);
    });

    this.eventBus.on('ui:monte-carlo-cancel-requested', () => {
      this.cancelAnalysis();
    });

    this.eventBus.on('ui:monte-carlo-export-requested', (data) => {
      console.log('🎲 MonteCarloController: Export requested', data);
      this.exportResults(data.format || 'csv');
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
    
    // Set return model before starting analysis
    if (config.returnModel) {
      this.eventBus.emit('returnmodel:set-model', {
        modelType: config.returnModel,
        config: config.returnModelConfig || {}
      });
    }

    // Emit request via event bus
    this.eventBus.emit('montecarlo:run', {
      scenarioData: this.currentScenarioData,
      config: {
        iterations: config.iterations || 1000,
        confidenceIntervals: config.confidenceIntervals || [10, 25, 50, 75, 90],
        randomSeed: config.randomSeed || null,
        parallelBatches: config.parallelBatches || 4,
        progressUpdateInterval: config.progressUpdateInterval || 50,
        targetSurvivalMonths: config.targetSurvivalMonths,
        returnModel: config.returnModel || 'simple-random'
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
    const runButton = document.getElementById('run-monte-carlo-btn');
    const cancelButton = document.getElementById('cancel-monte-carlo');
    
    if (runButton) {
      runButton.disabled = this.isAnalysisRunning || !this.currentScenarioData;
      runButton.textContent = this.isAnalysisRunning ? '🎲 Running Analysis...' : '🎲 Run Monte Carlo Analysis';
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
   * Clear Monte Carlo results when scenario changes
   */
  clearResults() {
    console.log('🧹 MonteCarloController: Clearing Monte Carlo results due to scenario change');
    
    // Clear the chart area
    const chartContainer = document.getElementById('monte-carlo-chart-area');
    if (chartContainer) {
      chartContainer.innerHTML = '';
    }
    
    // Hide results section
    const resultsSection = document.getElementById('monte-carlo-section-results');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
    
    // Reset analysis state
    this.currentAnalysis = null;
    this.isAnalysisRunning = false;
    
    this.updateUI();
  }

  /**
   * Display Monte Carlo results in isolation - PREVENT MAIN CHART INTERFERENCE
   */
  displayResults() {
    if (!this.currentAnalysis || this.currentAnalysis.status !== 'completed') {
      return;
    }

    console.log('📊 MonteCarloController: Displaying Monte Carlo results in isolation');
    
    // Display summary and insights BEFORE clearing analysis
    this.displaySummaryStatistics();
    this.displayInsights();
    
    // Emit SPECIFIC Monte Carlo display event (not generic display-results)
    this.eventBus.emit('montecarlo:display-monte-carlo-charts', {
      analysis: this.currentAnalysis.analysis,
      results: this.currentAnalysis.results,
      scenarioData: this.currentAnalysis.scenarioData
    });
    
    // Show export button after displaying results
    setTimeout(() => {
      this.showExportButton();
    }, 100);
  }

  /**
   * Display summary statistics in compact format
   */
  displaySummaryStatistics() {
    const analysis = this.currentAnalysis.analysis;
    const container = document.getElementById('monte-carlo-summary');
    
    if (!container || !analysis) return;
    
    const survivalStats = analysis.survivalStatistics;
    const successRateData = analysis.successRateData || { rate: analysis.successRate, targetYears: '20.0' };
    const successRate = (successRateData.rate * 100).toFixed(1);
    const medianYears = (survivalStats.median / 12).toFixed(1);
    
    container.innerHTML = `
      <div class="analysis-summary-card">
        <span class="metric-value">${successRate}%</span>
        <span class="metric-label">${successRateData.targetYears}-Year Success Rate</span>
      </div>
      <div class="analysis-summary-card">
        <span class="metric-value">${medianYears} years</span>
        <span class="metric-label">Median Survival Time</span>
      </div>
      <div class="analysis-summary-card">
        <span class="metric-value">${(survivalStats.p25 / 12).toFixed(1)} - ${(survivalStats.p75 / 12).toFixed(1)}</span>
        <span class="metric-label">25th-75th Percentile Range</span>
      </div>
      <div class="analysis-summary-card">
        <span class="metric-value">${analysis.metadata.iterations.toLocaleString()}</span>
        <span class="metric-label">Simulations Run</span>
      </div>`;
  }

  /**
   * Show export buttons after analysis completes
   */
  showExportButton() {
    const exportButton = document.getElementById('export-monte-carlo-results');
    const returnsButton = document.getElementById('export-monte-carlo-returns');
    const resultsSection = document.getElementById('monte-carlo-section-results');
    const actionsDiv = document.querySelector('#monte-carlo-section-results .monte-carlo-actions');
    
    console.log('🔍 MonteCarloController: DOM Debug', {
      exportButton: !!exportButton,
      returnsButton: !!returnsButton,
      resultsSection: !!resultsSection,
      actionsDiv: !!actionsDiv,
      resultsSectionDisplay: resultsSection?.style.display,
      resultsSectionVisible: resultsSection?.offsetWidth > 0
    });
    
    if (exportButton) {
      exportButton.style.display = 'inline-block';
      exportButton.style.visibility = 'visible';
      exportButton.style.opacity = '1';
    }
    
    if (returnsButton) {
      returnsButton.style.display = 'inline-block';
      returnsButton.style.visibility = 'visible';
      returnsButton.style.opacity = '1';
      console.log('📊 MonteCarloController: Export buttons shown', {
        analysisButton: !!exportButton,
        returnsButton: !!returnsButton,
        isConnected: exportButton.isConnected
      });
    } else {
      console.error('❌ MonteCarloController: Export button not found in DOM');
    }
  }

  /**
   * Hide export buttons when clearing results
   */
  hideExportButton() {
    const exportButton = document.getElementById('export-monte-carlo-results');
    const returnsButton = document.getElementById('export-monte-carlo-returns');
    
    if (exportButton) {
      exportButton.style.display = 'none';
    }
    if (returnsButton) {
      returnsButton.style.display = 'none';
    }
  }

  /**
   * Display Monte Carlo analysis insights in compact format
   */
  displayInsights() {
    const analysis = this.currentAnalysis.analysis;
    const container = document.getElementById('monte-carlo-insights');
    
    if (!container || !analysis || !analysis.insights) return;
    
    const insightsHtml = analysis.insights.map(insight => `
      <div class="insight-card">
        <h6>${insight.title}</h6>
        <p>${insight.description}</p>
      </div>
    `).join('');
    
    container.innerHTML = insightsHtml;
    
    // Also populate the Key Scenario Insights section
    this.displayScenarioInsights();
  }

  /**
   * Display Key Scenario Insights (similar to Single Scenario tab)
   */
  displayScenarioInsights() {
    const scenarioInsightsList = document.getElementById('monte-carlo-insights-list');
    
    if (!scenarioInsightsList || !this.currentScenarioData) return;
    
    // Generate scenario-based insights (similar to single scenario)
    const insights = this.generateScenarioInsights();
    
    const insightsHtml = insights.map(insight => `
      <li class="insight-item">
        <span class="insight-icon">${insight.icon}</span>
        <span class="insight-text">${insight.text}</span>
      </li>
    `).join('');
    
    scenarioInsightsList.innerHTML = insightsHtml;
  }

  /**
   * Generate scenario-based insights for the Monte Carlo context
   */
  generateScenarioInsights() {
    const scenario = this.currentScenarioData;
    const insights = [];
    
    if (!scenario) return insights;
    
    // Monthly expenses insight
    if (scenario.plan?.monthly_expenses) {
      const monthlyExpenses = scenario.plan.monthly_expenses;
      const annualExpenses = monthlyExpenses * 12;
      insights.push({
        icon: '💰',
        text: `Monthly expenses: $${monthlyExpenses.toLocaleString()} ($${(annualExpenses/1000).toFixed(0)}K annually)`
      });
    }
    
    // Asset allocation insight
    if (scenario.assets) {
      const totalAssets = scenario.assets.reduce((sum, asset) => sum + (asset.balance || 0), 0);
      insights.push({
        icon: '📊',
        text: `Total starting assets: $${(totalAssets/1000).toFixed(0)}K across ${scenario.assets.length} accounts`
      });
    }
    
    // Income insight
    if (scenario.income && scenario.income.length > 0) {
      const totalMonthlyIncome = scenario.income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
      insights.push({
        icon: '💵',
        text: `Expected income: $${totalMonthlyIncome.toLocaleString()}/month from ${scenario.income.length} source(s)`
      });
    }
    
    // Duration insight
    if (scenario.plan?.duration_months) {
      const years = (scenario.plan.duration_months / 12).toFixed(1);
      insights.push({
        icon: '⏰',
        text: `Simulation duration: ${years} years (${scenario.plan.duration_months} months)`
      });
    }
    
    // Auto-stop feature insight
    if (scenario.plan?.stop_on_shortfall) {
      insights.push({
        icon: '🛑',
        text: 'Auto-stop enabled: Simulation stops when funds are depleted'
      });
    }
    
    return insights;
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

    console.log('🔥 CSV EXPORT STARTED - MonteCarloController: Exporting results in format:', format);
    console.log('🔥 CSV EXPORT - MonteCarloController: Current analysis data:', {
      hasAnalysis: !!this.currentAnalysis.analysis,
      hasResults: !!this.currentAnalysis.results,
      resultsLength: this.currentAnalysis.results?.length,
      hasScenarioData: !!this.currentAnalysis.scenarioData,
      firstResult: this.currentAnalysis.results?.[0],
      fullAnalysis: this.currentAnalysis
    });

    const data = {
      analysis: this.currentAnalysis.analysis,
      results: this.currentAnalysis.results,
      metadata: {
        scenarioName: this.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
        exportDate: new Date().toISOString(),
        iterations: this.currentAnalysis.results?.length || 0,
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
   * Download Monte Carlo statistical data as CSV file
   */
  downloadCSV(data, filename) {
    console.log('🔥 DOWNLOADCSV FUNCTION CALLED with data:', data);
    console.log('🔥 DOWNLOADCSV filename:', filename);
    const analysis = data.analysis;
    const results = data.results;
    console.log('🔥 DOWNLOADCSV analysis:', analysis);
    console.log('🔥 DOWNLOADCSV results length:', results?.length);
    
    if (!analysis || !results || results.length === 0) {
      console.error('❌ No Monte Carlo analysis data to export');
      return;
    }
    
    // Create statistical summary CSV
    const headers = [
      'Metric',
      'Value',
      'Description'
    ];
    
    const rows = [headers];
    
    // Add Monte Carlo configuration parameters
    rows.push(['Monte Carlo Configuration', '', '']);
    if (analysis.metadata) {
      const metadata = analysis.metadata;
      rows.push(['Target Survival Time', `${(metadata.targetSurvivalMonths / 12).toFixed(1)} years (${metadata.targetSurvivalMonths} months)`, 'Required survival time for success']);
      rows.push(['Random Seed', metadata.randomSeed || 'Not specified', 'Seed used for reproducible results']);
      rows.push(['Analysis Date', metadata.timestamp ? new Date(metadata.timestamp).toISOString() : 'Unknown', 'When the analysis was performed']);
    }
    
    // Get additional config from current analysis if available
    if (this.currentAnalysis && this.currentAnalysis.config) {
      const config = this.currentAnalysis.config;
      rows.push(['Iterations Requested', config.iterations || 'Default', 'Number of simulations requested']);
      if (config.confidenceIntervals) {
        rows.push(['Confidence Intervals', config.confidenceIntervals.join(', ') + '%', 'Percentiles calculated for analysis']);
      }
      if (config.returnModel) {
        rows.push(['Return Model', config.returnModel, 'Return generation model used']);
      }
    }
    
    // Add variable ranges configuration
    if (this.currentAnalysis && this.currentAnalysis.variableRanges) {
      rows.push(['', '', '']); // Empty row separator
      rows.push(['Variable Ranges', '', '']);
      const ranges = this.currentAnalysis.variableRanges;
      for (const [variable, range] of Object.entries(ranges)) {
        let rangeDescription = '';
        if (range.type === 'normal') {
          rangeDescription = `Normal: μ=${range.mean}, σ=${range.stdDev}`;
        } else if (range.type === 'uniform') {
          rangeDescription = `Uniform: ${range.min} to ${range.max}`;
        } else if (range.type === 'triangular') {
          rangeDescription = `Triangular: ${range.min} to ${range.max}, mode=${range.mode}`;
        } else if (range.type === 'lognormal') {
          rangeDescription = `Log-normal: μ=${range.mean}, σ=${range.stdDev}`;
        } else {
          rangeDescription = `${range.type}: ${JSON.stringify(range)}`;
        }
        rows.push([variable, rangeDescription, 'Variable distribution used in simulation']);
      }
    }
    
    rows.push(['', '', '']); // Empty row separator
    
    // Add key statistics
    rows.push(['Analysis Results', '', '']);
    rows.push(['Total Simulations', results.length, 'Number of Monte Carlo iterations run']);
    rows.push(['Success Rate', `${(analysis.successRate * 100).toFixed(1)}%`, 'Percentage of simulations that succeeded']);
    
    // Add survival statistics
    if (analysis.survivalStatistics) {
      const survival = analysis.survivalStatistics;
      rows.push(['Median Survival (Years)', (survival.median / 12).toFixed(1), 'Median portfolio survival time']);
      rows.push(['25th Percentile (Years)', (survival.p25 / 12).toFixed(1), '25% of portfolios lasted this long or less']);
      rows.push(['75th Percentile (Years)', (survival.p75 / 12).toFixed(1), '75% of portfolios lasted this long or less']);
      rows.push(['10th Percentile (Years)', (survival.p10 / 12).toFixed(1), '10% of portfolios lasted this long or less']);
      rows.push(['90th Percentile (Years)', (survival.p90 / 12).toFixed(1), '90% of portfolios lasted this long or less']);
    }
    
    // Add portfolio value percentiles if available
    if (analysis.portfolioValuePercentiles) {
      const portfolios = analysis.portfolioValuePercentiles;
      rows.push(['Portfolio Value P10', `$${portfolios.p10?.toLocaleString() || 'N/A'}`, '10th percentile final portfolio value']);
      rows.push(['Portfolio Value P25', `$${portfolios.p25?.toLocaleString() || 'N/A'}`, '25th percentile final portfolio value']);
      rows.push(['Portfolio Value P50', `$${portfolios.p50?.toLocaleString() || 'N/A'}`, 'Median final portfolio value']);
      rows.push(['Portfolio Value P75', `$${portfolios.p75?.toLocaleString() || 'N/A'}`, '75th percentile final portfolio value']);
      rows.push(['Portfolio Value P90', `$${portfolios.p90?.toLocaleString() || 'N/A'}`, '90th percentile final portfolio value']);
    }
    
    // Add insights if available
    if (analysis.insights && analysis.insights.length > 0) {
      rows.push(['', '', '']); // Empty row separator
      rows.push(['Key Insights', '', '']);
      analysis.insights.forEach((insight, index) => {
        rows.push([`Insight ${index + 1}`, insight.title, insight.description]);
      });
    }
    
    // Add key percentile scenarios with return sequences
    if (analysis.keyScenarios && Object.keys(analysis.keyScenarios).length > 0) {
      rows.push(['', '', '']); // Empty row separator
      rows.push(['Key Percentile Scenarios - Return Sequences', '', '']);
      rows.push(['Scenario', 'Final Balance', 'Description']);
      
      // Add scenario summary first
      for (const [label, scenario] of Object.entries(analysis.keyScenarios)) {
        rows.push([
          label.toUpperCase(),
          `$${Math.round(scenario.finalBalance).toLocaleString()}`,
          scenario.description
        ]);
      }
      
      // Add return sequence data
      rows.push(['', '', '']); // Empty row separator
      rows.push(['Return Sequences by Asset Type', '', '']);
      
      // Get all asset types from the first scenario
      const firstScenario = Object.values(analysis.keyScenarios)[0];
      if (firstScenario && firstScenario.returnSequence) {
        const assetTypes = Object.keys(firstScenario.returnSequence);
        
        for (const assetType of assetTypes) {
          rows.push(['', '', '']); // Empty row separator
          rows.push([`${assetType.toUpperCase()} Returns`, '', '']);
          
          // Create header row with scenario labels
          const headerRow = ['Month'];
          const scenarioLabels = Object.keys(analysis.keyScenarios);
          headerRow.push(...scenarioLabels.map(label => label.toUpperCase()));
          rows.push(headerRow);
          
          // Get the maximum sequence length
          const maxLength = Math.max(
            ...scenarioLabels.map(label => 
              analysis.keyScenarios[label].returnSequence[assetType]?.length || 0
            )
          );
          
          // Add return data for each month
          for (let month = 0; month < maxLength; month++) {
            const row = [month + 1]; // Month number (1-based)
            
            for (const label of scenarioLabels) {
              const scenario = analysis.keyScenarios[label];
              const returns = scenario.returnSequence[assetType];
              const returnValue = returns && returns[month] !== undefined 
                ? (returns[month] * 100).toFixed(2) + '%' 
                : 'N/A';
              row.push(returnValue);
            }
            
            rows.push(row);
          }
        }
      }
    }
    
    // Add individual simulation results
    rows.push(['', '', '']); // Empty row separator
    rows.push(['Individual Simulation Results', '', '']);
    rows.push(['Simulation #', 'Success', 'Survival Time (Years)', 'Final Portfolio Value']);
    
    results.forEach((result, index) => {
      // Handle nested result structure
      const resultData = result.results || result;
      
      // Use pre-calculated metrics from MonteCarloService or calculate from statistics
      let success = 'No';
      let survivalYears = 'N/A';
      let finalValue = 'N/A';
      
      if (resultData.success !== undefined) {
        success = resultData.success ? 'Yes' : 'No';
      } else if (analysis.statistics) {
        // Calculate success based on survival time and final balance
        const survivalTime = analysis.statistics.survivalTime[index];
        const finalBalance = analysis.statistics.finalBalance[index];
        
        // Default success criteria: survival time >= 14 years (168 months) OR final balance > 0
        const minSurvivalYears = 14;
        success = (survivalTime >= minSurvivalYears || finalBalance > 0) ? 'Yes' : 'No';
      }
      
      if (resultData.survivalTime !== undefined) {
        survivalYears = (resultData.survivalTime / 12).toFixed(1);
      } else if (analysis.statistics && analysis.statistics.survivalTime[index] !== undefined) {
        survivalYears = (analysis.statistics.survivalTime[index] / 12).toFixed(1);
      }
      
      if (resultData.finalBalance !== undefined) {
        finalValue = `$${Math.round(resultData.finalBalance).toLocaleString()}`;
      } else if (analysis.statistics && analysis.statistics.finalBalance[index] !== undefined) {
        finalValue = `$${Math.round(analysis.statistics.finalBalance[index]).toLocaleString()}`;
      }
      
      rows.push([index + 1, success, survivalYears, finalValue]);
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
