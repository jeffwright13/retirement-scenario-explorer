/**
 * Monte Carlo Controller - Orchestrates Monte Carlo analysis operations
 * Follows event bus architecture and manages UI state for Monte Carlo features
 */
import { getMonthlyIncome } from '../utils.js';

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

    // Market-dependent assets to randomize -- the controller is the sole
    // source of truth for this (no UI override layer anymore; the old one
    // silently defeated it -- ISSUES.md #19).
    const marketDependentAssets = this.getMarketDependentAssetConfig();

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
      marketDependentAssets,
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
   * Identify market-dependent assets for Monte Carlo randomization and
   * describe how each should be randomized. Does NOT compute a mean/rate --
   * MonteCarloService derives each asset's real per-month rate directly from
   * its own rate_schedules entry (or interest_rate) at randomization time,
   * so there's no baseline-mean fallback to get wrong for non-fixed
   * schedule types (ISSUES.md #19).
   *
   * @returns {Array<{assetName, scheduleName, isLegacyInterestRate, baseInterestRate, investmentType, stdDev}>}
   */
  getMarketDependentAssetConfig() {
    const config = [];

    if (!this.currentScenarioData || !this.currentScenarioData.assets) {
      console.log('🎲 MonteCarloController: No scenario data available for market-dependent assets');
      return config;
    }

    this.currentScenarioData.assets.forEach(asset => {
      if (asset.market_dependent !== true) {
        console.log(`🎲 MonteCarloController: Keeping ${asset.name} stable (market_dependent: ${asset.market_dependent})`);
        return;
      }

      // Previously only assets with return_schedule were randomized;
      // interest_rate-only assets were silently skipped entirely (a
      // degenerate, single-outcome Monte Carlo reported as a confident
      // success rate). Both are included now.
      if (!asset.return_schedule && asset.interest_rate === undefined) {
        console.log(`🎲 MonteCarloController: ${asset.name} is market_dependent but has neither return_schedule nor interest_rate -- skipping`);
        return;
      }

      const stdDev = this.getVolatilityForAsset(asset);
      // Assets without an explicit investment_type get their own isolated
      // group rather than being guessed into one via keyword matching --
      // no incorrect cross-asset correlation assumed.
      const investmentType = asset.investment_type?.toLowerCase() || `_asset_${asset.name}`;

      config.push({
        assetName: asset.name,
        scheduleName: asset.return_schedule || null,
        isLegacyInterestRate: !asset.return_schedule,
        baseInterestRate: asset.return_schedule ? null : (asset.interest_rate || 0),
        investmentType,
        stdDev
      });

      console.log(`🎲 MonteCarloController: ${asset.name} (${asset.return_schedule || 'interest_rate'}) will be randomized -- type: ${investmentType}, ±${(stdDev * 100).toFixed(1)}%`);
    });

    console.log(`🎲 MonteCarloController: ${config.length} market-dependent asset(s) configured for randomization`);
    return config;
  }


  /**
   * Get appropriate volatility for an asset based on its type
   */
  getVolatilityForAsset(asset) {
    // Use investment type if available (from scenario builder)
    if (asset.investment_type) {
      const investmentType = asset.investment_type.toLowerCase();
      
      switch (investmentType) {
        case 'stocks':
          return 0.18; // 18% volatility for stocks
        case 'bonds':
          return 0.08; // 8% volatility for bonds
        case 'mixed':
          return 0.12; // 12% volatility for mixed portfolios
        case 'real_estate':
          return 0.15; // 15% volatility for REITs
        case 'savings':
        case 'cd':
        case 'money_market':
          return 0.02; // 2% volatility for stable assets (minimal)
        default:
          return 0.12; // Default mixed portfolio volatility
      }
    }

    // Fallback to legacy keyword matching for backward compatibility
    const assetType = asset.type?.toLowerCase() || '';
    const assetName = asset.name?.toLowerCase() || '';

    // Conservative investments (but still market-dependent) - check first
    if (assetName.includes('conservative') || assetName.includes('stable')) {
      return 0.05; // 5% volatility for conservative investments
    }

    // High volatility assets (stocks, aggressive investments)
    if (assetType.includes('stock') || assetName.includes('stock') || 
        assetType.includes('equity') || assetName.includes('equity') ||
        assetName.includes('aggressive')) {
      return 0.18; // 18% volatility for stocks
    }

    // Medium volatility assets (bonds, balanced funds)
    if (assetType.includes('bond') || assetName.includes('bond') ||
        assetName.includes('balanced') || assetName.includes('mixed') ||
        assetType.includes('investment')) {
      return 0.08; // 8% volatility for bonds and general investments
    }

    // Default volatility for general investments
    return 0.15; // 15% volatility for mixed stock/bond portfolios
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
      if (this.isAnalysisRunning && this.analysisProgress) {
        progressBar.style.display = 'block';
        progressBar.value = this.analysisProgress.percentage || 0;
        progressText.textContent = `${this.analysisProgress.completed || 0}/${this.analysisProgress.total || 0} (${this.analysisProgress.percentage || 0}%)`;
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
    
    // Income insight - income sources can start/stop at different months, so a
    // flat sum of every source's amount can claim a combined total that's never
    // actually concurrent. Sample at each point where a source starts or stops
    // to find the true range of concurrent income over the simulation.
    if (scenario.income && scenario.income.length > 0) {
      const durationMonths = scenario.plan?.duration_months || 360;

      const breakpoints = new Set([1]);
      scenario.income.forEach(inc => {
        const start = Number.isFinite(inc.start_month) ? inc.start_month : 1;
        breakpoints.add(Math.max(1, start));
        if (Number.isFinite(inc.stop_month)) {
          breakpoints.add(Math.min(durationMonths, inc.stop_month + 1));
        }
      });

      const monthlyTotals = [...breakpoints]
        .filter(month => month >= 1 && month <= durationMonths)
        .map(month => getMonthlyIncome(scenario.income, month));

      const minIncome = Math.min(...monthlyTotals);
      const maxIncome = Math.max(...monthlyTotals);

      const incomeText = minIncome === maxIncome
        ? `Expected income: $${maxIncome.toLocaleString()}/month from ${scenario.income.length} source(s)`
        : `Expected income: ranges from $${minIncome.toLocaleString()} to $${maxIncome.toLocaleString()}/month across the simulation (${scenario.income.length} source(s))`;

      insights.push({
        icon: '💵',
        text: incomeText
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
