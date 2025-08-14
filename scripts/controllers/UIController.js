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
    this.jsonPreview = document.getElementById('scenario-json-preview');
    
    // Results elements
    this.resultsSection = document.getElementById('main-content'); // Main results container
    this.chartArea = document.getElementById('chart-area');
    this.insightsSection = document.getElementById('simulation-insights');
    
    // Story mode elements
    this.storyModeToggle = document.getElementById('story-mode-toggle');
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
          this.eventBus.emit('scenario:selected', scenarioKey);
        }
      });
    }

    // Run simulation button
    if (this.runButton) {
      this.runButton.addEventListener('click', () => {
        console.log('🚀 Main Run Simulation button clicked!', {
          hasCurrentScenario: !!this.currentScenario,
          scenarioTitle: this.currentScenario?.metadata?.title
        });
        
        if (this.currentScenario) {
          this.eventBus.emit('simulation:run', this.currentScenario);
          console.log('📡 Emitted simulation:run event with scenario');
        } else {
          this.showError('Please select a scenario before running simulation');
        }
      });
    } else {
      console.warn('❌ Run button not found during event listener setup');
    }

    // Story mode toggle
    if (this.storyModeToggle) {
      this.storyModeToggle.addEventListener('click', () => {
        this.eventBus.emit('story:mode-toggle');
      });
    }

    // Advanced buttons
    const toggleJsonBtn = document.getElementById('toggle-json-btn');
    if (toggleJsonBtn) {
      toggleJsonBtn.addEventListener('click', () => {
        this.toggleJsonEditor();
      });
    }

    const toggleCsvBtn = document.getElementById('toggle-csv-btn');
    if (toggleCsvBtn) {
      toggleCsvBtn.addEventListener('click', () => {
        this.toggleCsvExport();
      });
    }

    const runAdvancedBtn = document.getElementById('run-btn-advanced');
    if (runAdvancedBtn) {
      runAdvancedBtn.addEventListener('click', () => {
        this.runAdvancedSimulation();
      });
    }

    console.log('🔧 UI event listeners setup complete');
  }

  /**
   * Set up content-related event listeners
   */
  setupContentEventListeners() {
    this.eventBus.on('scenarios:loaded', (scenarios) => this.handleScenariosLoaded(scenarios));
    this.eventBus.on('stories:loaded', (stories) => this.handleStoriesLoaded(stories));
    this.eventBus.on('scenario:selected', (scenarioKey) => this.handleScenarioSelected(scenarioKey));
    this.eventBus.on('content:errors', (errors) => this.handleContentErrors(errors));
  }

  /**
   * Set up simulation-related event listeners
   */
  setupSimulationEventListeners() {
    this.eventBus.on('simulation:started', (data) => this.handleSimulationStarted(data));
    this.eventBus.on('simulation:completed', (data) => this.handleSimulationCompleted(data));
    this.eventBus.on('simulation:failed', (data) => this.handleSimulationFailed(data));
  }

  /**
   * Set up story-related event listeners
   */
  setupStoryEventListeners() {
    this.eventBus.on('story:mode-entered', () => this.handleStoryModeEntered());
    this.eventBus.on('story:mode-exited', () => this.handleStoryModeExited());
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
   * Handle scenario selection
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
        
        // Emit a different event to avoid infinite loop
        this.eventBus.emit('scenario:loaded', { scenarioKey, scenario: data.scenario });
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
    
    this.setRunButtonLoading(false);
    this.showChartArea();
    this.displaySimulationResults(data);
    this.showSuccess('Simulation completed successfully');
  }

  /**
   * Handle simulation failed
   */
  handleSimulationFailed(data) {
    this.setRunButtonLoading(false);
    this.showError(`Simulation failed: ${data.error?.message || 'Unknown error'}`);
  }

  /**
   * Handle story mode entered
   */
  handleStoryModeEntered() {
    if (this.storyPanel) {
      this.storyPanel.style.display = 'block';
    }
  }

  /**
   * Handle story mode exited
   */
  handleStoryModeExited() {
    if (this.storyPanel) {
      this.storyPanel.style.display = 'none';
    }
  }

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
   * Update JSON preview
   */
  updateJsonPreview(scenario) {
    console.log('🔍 updateJsonPreview called:', {
      hasJsonPreview: !!this.jsonPreview,
      scenarioKeys: Object.keys(scenario || {}),
      jsonPreviewElement: this.jsonPreview
    });
    
    if (this.jsonPreview) {
      this.jsonPreview.textContent = JSON.stringify(scenario, null, 2);
      
      // Keep the details section collapsed by default
      const detailsElement = this.jsonPreview.closest('details');
      if (detailsElement) {
        detailsElement.open = false;
      }
      
      // Show the scenario preview section
      const scenarioPreview = document.getElementById('scenario-preview');
      if (scenarioPreview) {
        scenarioPreview.style.display = 'block';
      }
      
      // Update scenario details
      this.updateScenarioDetails(scenario);
      
      console.log('✅ JSON preview updated and made visible');
    } else {
      console.error('❌ jsonPreview element not found!');
    }
  }

  /**
   * Update scenario details in the preview section
   */
  updateScenarioDetails(scenario) {
    // Update scenario description
    const descriptionElement = document.getElementById('scenario-description');
    if (descriptionElement && scenario.metadata) {
      descriptionElement.textContent = scenario.metadata.description || 'No description available';
    }
    
    // Update key assumptions
    const assumptionsList = document.getElementById('key-assumptions-list');
    if (assumptionsList && scenario.plan) {
      assumptionsList.innerHTML = '';
      
      // Add key assumptions based on scenario data
      const assumptions = [
        `Monthly expenses: $${scenario.plan.monthly_expenses?.toLocaleString() || 'N/A'}`,
        `Duration: ${scenario.plan.duration_months || 'N/A'} months`,
        `Assets: ${scenario.assets?.length || 0} accounts`,
        `Income sources: ${scenario.income?.length || 0}`
      ];
      
      assumptions.forEach(assumption => {
        const li = document.createElement('li');
        li.textContent = assumption;
        assumptionsList.appendChild(li);
      });
    }
  }

  /**
   * Toggle JSON editor visibility
   */
  toggleJsonEditor() {
    const jsonContainer = document.getElementById('json-container');
    if (jsonContainer) {
      const isCollapsed = jsonContainer.classList.contains('json-container--collapsed');
      
      if (isCollapsed) {
        jsonContainer.classList.remove('json-container--collapsed');
        jsonContainer.style.display = 'block';
      } else {
        jsonContainer.classList.add('json-container--collapsed');
        jsonContainer.style.display = 'none';
      }
      
      const toggleBtn = document.getElementById('toggle-json-btn');
      if (toggleBtn) {
        toggleBtn.textContent = isCollapsed ? 'Hide JSON Editor' : 'Edit JSON';
      }
      
      // Populate JSON editor with current scenario
      if (isCollapsed && this.currentScenario) {
        const jsonInput = document.getElementById('json-input');
        if (jsonInput) {
          jsonInput.value = JSON.stringify(this.currentScenario, null, 2);
        }
      }
      
      console.log(`🔧 JSON editor ${isCollapsed ? 'shown' : 'hidden'}`);
    } else {
      console.warn('❌ JSON container not found');
    }
  }

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

  /**
   * Run advanced simulation with custom JSON
   */
  runAdvancedSimulation() {
    const jsonInput = document.getElementById('json-input');
    if (jsonInput && jsonInput.value.trim()) {
      try {
        const customScenario = JSON.parse(jsonInput.value);
        this.eventBus.emit('simulation:run', customScenario);
        console.log('🚀 Running advanced simulation with custom scenario');
      } catch (error) {
        this.showError(`Invalid JSON: ${error.message}`);
      }
    } else if (this.currentScenario) {
      // Fall back to current scenario if no custom JSON
      this.eventBus.emit('simulation:run', this.currentScenario);
      console.log('🚀 Running advanced simulation with current scenario');
    } else {
      this.showError('Please select a scenario or provide custom JSON');
    }
  }

  /**
   * Show chart area for simulation results
   */
  showChartArea() {
    if (this.chartArea) {
      this.chartArea.style.display = 'block';
      this.chartArea.classList.add('has-results');
      console.log('📊 Chart area shown');
    }
  }

  /**
   * Display simulation results (chart, insights, CSV)
   */
  displaySimulationResults(data) {
    try {
      console.log('📊 Displaying simulation results:', data);
      
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
      
      // Display insights
      this.displayInsights(data.insights);
      
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
      const chartData = this.prepareChartData(results, balanceHistory);
      
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
        title: '💰 Asset Balance Over Time',
        xaxis: { 
          title: 'Timeline (MM-YY)',
          tickvals: filteredTicks,
          ticktext: filteredTicks,
          tickangle: -45
        },
        yaxis: { 
          title: 'Balance ($)',
          tickformat: '$,.0f'
        },
        hovermode: 'x unified'
      };

      const config = {
        responsive: true,
        displayModeBar: true
      };

      // Clear any existing plot first
      Plotly.purge(this.chartArea);
      
      // Render the chart
      Plotly.newPlot(this.chartArea, chartData, layout, config);
      console.log('📊 Chart rendered successfully');
    } catch (error) {
      console.error('❌ Chart rendering failed:', error);
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
  prepareChartData(results, balanceHistory = {}) {
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
    
    if (balanceHistory && Object.keys(balanceHistory).length > 0) {
      // Use balance history data to create individual asset traces
      const assetNames = Object.keys(balanceHistory);
      console.log('🔍 Asset names found:', assetNames);
      
      // Define colors for each asset type
      const assetColors = {
        'Savings': '#10b981',           // Green
        'Investment': '#3b82f6',        // Blue  
        'Traditional IRA': '#f59e0b',   // Amber
        'Roth IRA': '#8b5cf6'          // Purple
      };
      
      let totalBalance = [];
      
      // Create individual traces for each asset
      assetNames.forEach(assetName => {
        const balances = balanceHistory[assetName];
        if (balances && Array.isArray(balances)) {
          const assetBalances = balances.map(balance => parseFloat(balance) || 0);
          
          // Find the corresponding asset in the scenario to get min_balance
          const scenarioAsset = results[0]?.scenario?.assets?.find(asset => asset.name === assetName);
          const minBalance = scenarioAsset?.min_balance || 0;
          
          // Create main asset trace (total balance)
          traces.push({
            x: months,
            y: assetBalances,
            type: 'scatter',
            mode: 'lines',
            name: assetName,
            line: { 
              color: assetColors[assetName] || '#6b7280', 
              width: 2 
            },
            opacity: 0.8
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
          width: 3,
          dash: 'dot'
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
    this.runButton.textContent = isLoading ? 'Running...' : 'Run Simulation';
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

  /**
   * Show warning message
   */
  showWarning(message) {
    console.warn('⚠️', message);
    // Could implement toast notifications here
  }
}
