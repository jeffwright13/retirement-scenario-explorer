/**
 * UI Management Module - Complete and Cleaned Version
 * Handles all DOM manipulation and UI state changes
 * Features: Real-time Quick Peek updates, responsive design, clean state management
 */

export class UIManager {
  constructor() {
    this.elements = this.cacheElements();
    this.setupEventListeners();
    console.log('✅ UIManager initialized with enhanced Quick Peek support');
  }

  // ---- INITIALIZATION ----

  // Cache all DOM elements for performance
  cacheElements() {
    return {
      // Main panels
      gettingStartedPanel: document.getElementById('getting-started-panel'),
      gettingStartedHeader: document.getElementById('getting-started-header'),

      // Scenario selection and preview
      scenarioDropdown: document.getElementById('scenario-dropdown'),
      scenarioPreview: document.getElementById('scenario-preview'),
      scenarioDescription: document.getElementById('scenario-description'),
      scenarioJsonPreview: document.getElementById('scenario-json-preview'),

      // Control buttons
      runBtn: document.getElementById('run-btn'),
      toggleJsonBtn: document.getElementById('toggle-json-btn'),
      toggleCsvBtn: document.getElementById('toggle-csv-btn'),
      selectJsonBtn: document.getElementById('select-json-btn'),
      selectCsvBtn: document.getElementById('select-csv-btn'),

      // Content areas
      jsonContainer: document.getElementById('json-container'),
      jsonInput: document.getElementById('json-input'),
      csvSection: document.getElementById('csv-section'),
      csvContainer: document.getElementById('csv-container'),
      chartArea: document.getElementById('chart-area'),

      // Enhanced UI elements
      keyAssumptions: document.getElementById('key-assumptions'),
      keyAssumptionsList: document.getElementById('key-assumptions-list'),
      simulationInsights: document.getElementById('simulation-insights'),
      insightsList: document.getElementById('insights-list'),
      nextScenarioSuggestion: document.getElementById('next-scenario-suggestion'),
      nextScenarioDescription: document.getElementById('next-scenario-description'),
      loadNextScenarioBtn: document.getElementById('load-next-scenario'),
      shareScenarioBtn: document.getElementById('share-scenario-btn')
    };
  }

  // Setup all event listeners including enhanced JSON monitoring
  setupEventListeners() {
    // Getting started panel toggle
    if (this.elements.gettingStartedHeader) {
      this.elements.gettingStartedHeader.addEventListener('click', () => {
        this.toggleGettingStartedPanel();
      });
    }

    // JSON editor toggle
    if (this.elements.toggleJsonBtn) {
      this.elements.toggleJsonBtn.addEventListener('click', () => {
        this.toggleJsonEditor();
      });
    }

    // CSV results toggle
    if (this.elements.toggleCsvBtn) {
      this.elements.toggleCsvBtn.addEventListener('click', () => {
        this.toggleCsvResults();
      });
    }

    // Text selection helpers
    if (this.elements.selectJsonBtn) {
      this.elements.selectJsonBtn.addEventListener('click', () => {
        this.selectText('json-input');
      });
    }

    if (this.elements.selectCsvBtn) {
      this.elements.selectCsvBtn.addEventListener('click', () => {
        this.selectText('csv-container');
      });
    }

    // ENHANCED: JSON input monitoring for real-time Quick Peek updates
    this.setupJsonInputMonitoring();
  }

  // ---- ENHANCED: REAL-TIME JSON MONITORING ----

  // Monitor JSON input for Quick Peek updates
  setupJsonInputMonitoring() {
    const jsonInput = this.elements.jsonInput;

    if (!jsonInput) {
      console.warn('⚠️ JSON input element not found - Quick Peek updates disabled');
      return;
    }

    console.log('🔄 Setting up real-time JSON monitoring for Quick Peek updates');

    // Debounced update function to avoid excessive processing
    let updateTimeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        this.updateQuickPeekFromJsonInput();
      }, 300); // Wait 300ms after user stops typing
    };

    // Listen for various input events
    jsonInput.addEventListener('input', debouncedUpdate);
    jsonInput.addEventListener('paste', () => {
      // Small delay for paste to complete
      setTimeout(debouncedUpdate, 100);
    });
    jsonInput.addEventListener('keyup', debouncedUpdate);

    console.log('✅ JSON input monitoring active');
  }

  // Update Quick Peek from JSON input in real-time
  updateQuickPeekFromJsonInput() {
    const jsonText = this.elements.jsonInput?.value.trim();

    if (!jsonText) {
      // Hide preview if no JSON
      this.hideScenarioPreview();
      return;
    }

    try {
      // Parse the JSON
      const parsedData = JSON.parse(jsonText);

      // Determine format and extract scenario data
      let scenarioData, scenarioTitle;

      if (parsedData.plan && parsedData.assets) {
        // Direct scenario data (legacy format)
        scenarioData = parsedData;
        scenarioTitle = parsedData.title || 'Custom Scenario';
      } else {
        // Complete scenario object - extract the first scenario
        const scenarioKeys = Object.keys(parsedData);
        if (scenarioKeys.length > 0) {
          const firstKey = scenarioKeys[0];
          scenarioData = parsedData[firstKey];
          scenarioTitle = scenarioData.metadata?.title || scenarioData.title || 'Custom Scenario';
        } else {
          throw new Error('No scenarios found in JSON');
        }
      }

      // Update the Quick Peek preview
      this.updateQuickPeekPreview(scenarioTitle, scenarioData, jsonText);

    } catch (error) {
      // JSON is being edited or invalid - hide preview without logging errors
      this.hideScenarioPreview();
    }
  }

  // Update Quick Peek preview content
  updateQuickPeekPreview(title, scenarioData, originalJsonText) {
    if (!this.elements.scenarioPreview) return;

    // Show the preview section
    this.elements.scenarioPreview.style.display = 'block';

    // Update description
    const description = scenarioData.metadata?.description ||
                       scenarioData.description ||
                       'Custom scenario from JSON editor';

    if (this.elements.scenarioDescription) {
      this.elements.scenarioDescription.textContent = description;
    }

    // Update JSON preview with pretty formatting
    const prettyJson = JSON.stringify(scenarioData, null, 2);
    if (this.elements.scenarioJsonPreview) {
      this.elements.scenarioJsonPreview.textContent = prettyJson;
    }

    // Show key assumptions
    this.showKeyAssumptions(scenarioData);

    console.log('🔄 Quick Peek updated from JSON input');
  }

  // ---- PANEL MANAGEMENT ----

  // Getting started panel management
  toggleGettingStartedPanel() {
    if (this.elements.gettingStartedPanel) {
      this.elements.gettingStartedPanel.classList.toggle('collapsed');
    }
  }

  collapseGettingStartedPanel() {
    if (this.elements.gettingStartedPanel) {
      this.elements.gettingStartedPanel.classList.add('collapsed');
    }
  }

  expandGettingStartedPanel() {
    if (this.elements.gettingStartedPanel) {
      this.elements.gettingStartedPanel.classList.remove('collapsed');
    }
  }

  // JSON editor management
  toggleJsonEditor() {
    if (!this.elements.jsonContainer) return;

    const isCollapsed = this.elements.jsonContainer.classList.contains('collapsed');

    if (isCollapsed) {
      this.elements.jsonContainer.classList.remove('collapsed');
      this.elements.jsonContainer.classList.add('expanded');
    } else {
      this.elements.jsonContainer.classList.remove('expanded');
      this.elements.jsonContainer.classList.add('collapsed');
    }
  }

  collapseJsonEditor() {
    if (this.elements.jsonContainer) {
      this.elements.jsonContainer.classList.remove('expanded');
      this.elements.jsonContainer.classList.add('collapsed');
    }
  }

  expandJsonEditor() {
    if (this.elements.jsonContainer) {
      this.elements.jsonContainer.classList.remove('collapsed');
      this.elements.jsonContainer.classList.add('expanded');
    }
  }

  // CSV results management
  toggleCsvResults() {
    if (!this.elements.csvSection) return;

    const isVisible = this.elements.csvSection.classList.contains('show');

    if (isVisible) {
      this.elements.csvSection.classList.remove('show');
      if (this.elements.csvContainer) {
        this.elements.csvContainer.classList.remove('show');
      }
    } else {
      this.elements.csvSection.classList.add('show');
      if (this.elements.csvContainer) {
        this.elements.csvContainer.classList.add('show');
      }
    }
  }

  showCsvResults() {
    if (this.elements.csvSection) {
      this.elements.csvSection.classList.add('show');
    }
    if (this.elements.csvContainer) {
      this.elements.csvContainer.classList.add('show');
    }
  }

  hideCsvResults() {
    if (this.elements.csvSection) {
      this.elements.csvSection.classList.remove('show');
    }
    if (this.elements.csvContainer) {
      this.elements.csvContainer.classList.remove('show');
    }
  }

  // ---- JSON EDITOR MANAGEMENT ----

  loadJsonIntoEditor(jsonText) {
    console.log(`📝 Loading JSON into editor: ${jsonText.substring(0, 100)}...`);
    if (this.elements.jsonInput) {
      this.elements.jsonInput.value = jsonText;
      // Trigger the real-time update
      this.updateQuickPeekFromJsonInput();
    }
  }

  getJsonFromEditor() {
    return this.elements.jsonInput?.value || '';
  }

  clearJsonEditor() {
    if (this.elements.jsonInput) {
      this.elements.jsonInput.value = '';
      this.hideScenarioPreview();
    }
  }

  // ---- SCENARIO DROPDOWN AND PREVIEW ----

  // Populate scenario dropdown with grouped scenarios
  populateScenarioDropdown(groupedScenarios) {
    if (!this.elements.scenarioDropdown) return;

    // Clear existing options except the first one
    this.elements.scenarioDropdown.innerHTML = '<option value="">Choose a Scenario...</option>';

    // Add optgroups
    for (const [groupName, scenarios] of Object.entries(groupedScenarios)) {
      if (scenarios.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;

        scenarios.forEach(([key, scenario]) => {
          const option = document.createElement('option');
          option.value = key;
          option.textContent = scenario.metadata?.title || scenario.title || key;
          optgroup.appendChild(option);
        });

        this.elements.scenarioDropdown.appendChild(optgroup);
      }
    }
  }

  // Reset UI to default state when new scenario selected
  resetToDefaultState() {
    console.log('🔄 Resetting UI to default state');

    // Expand getting started panel
    this.expandGettingStartedPanel();

    // Collapse JSON editor
    this.collapseJsonEditor();

    // Hide CSV results
    this.hideCsvResults();

    // Hide previous simulation results
    this.hideSimulationResults();

    // Scroll to top of getting started panel
    if (this.elements.gettingStartedPanel) {
      this.elements.gettingStartedPanel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Show scenario preview with enhanced key assumptions
  showScenarioPreview(metadata, simulationData) {
    console.log('🔍 Showing enhanced scenario preview');

    // Reset UI to clean state
    this.resetToDefaultState();

    try {
      if (this.elements.scenarioPreview) {
        this.elements.scenarioPreview.style.display = 'block';
      }

      // Set description
      if (metadata && metadata.description && this.elements.scenarioDescription) {
        this.elements.scenarioDescription.textContent = metadata.description;
      } else if (this.elements.scenarioDescription) {
        this.elements.scenarioDescription.textContent = 'No description available';
      }

      // Show key assumptions
      this.showKeyAssumptions(simulationData);

      // Handle JSON preview
      if (!simulationData) {
        if (this.elements.scenarioJsonPreview) {
          this.elements.scenarioJsonPreview.textContent = 'No simulation data available';
        }
        return;
      }

      const jsonText = JSON.stringify(simulationData, null, 2);
      if (this.elements.scenarioJsonPreview) {
        this.elements.scenarioJsonPreview.textContent = jsonText;
      }

      console.log('✅ Enhanced preview updated successfully');

    } catch (error) {
      console.error('Error in showScenarioPreview:', error);
      if (this.elements.scenarioJsonPreview) {
        this.elements.scenarioJsonPreview.textContent = `Error displaying preview: ${error.message}`;
      }
    }
  }

  // ENHANCED: Show key assumptions with better extraction
  showKeyAssumptions(simulationData) {
    if (!simulationData || !this.elements.keyAssumptions || !this.elements.keyAssumptionsList) {
      return;
    }

    const assumptions = [];

    // Extract key assumptions from scenario data
    if (simulationData.plan) {
      // Monthly expenses
      if (simulationData.plan.monthly_expenses) {
        assumptions.push(`Monthly expenses: $${simulationData.plan.monthly_expenses.toLocaleString()}`);
      }

      // Inflation handling - support both formats
      if (simulationData.plan.inflation_rate !== undefined) {
        const rate = (simulationData.plan.inflation_rate * 100).toFixed(1);
        assumptions.push(`Inflation: ${rate}% annually (legacy format)`);
      } else if (simulationData.plan.inflation_schedule && simulationData.rate_schedules) {
        const inflationSchedule = simulationData.plan.inflation_schedule;
        const inflationRate = simulationData.rate_schedules[inflationSchedule];
        if (inflationRate && inflationRate.type === 'fixed') {
          const rate = (inflationRate.rate * 100).toFixed(1);
          assumptions.push(`Inflation: ${rate}% annually`);
        } else if (inflationRate) {
          assumptions.push(`Inflation: Variable (${inflationRate.type} schedule)`);
        }
      }
    }

    // Extract asset return assumptions - support both formats
    if (simulationData.assets && simulationData.assets.length > 0) {
      simulationData.assets.forEach(asset => {
        if (asset.return_schedule && simulationData.rate_schedules) {
          const returnSchedule = asset.return_schedule;
          const rateInfo = simulationData.rate_schedules[returnSchedule];
          if (rateInfo && rateInfo.type === 'fixed') {
            const rate = (rateInfo.rate * 100).toFixed(1);
            assumptions.push(`${asset.name}: ${rate}% annual return`);
          } else if (rateInfo) {
            assumptions.push(`${asset.name}: Variable returns (${rateInfo.type})`);
          }
        } else if (asset.interest_rate !== undefined) {
          const rate = (asset.interest_rate * 100).toFixed(1);
          assumptions.push(`${asset.name}: ${rate}% annual return`);
        }
      });
    }

    // Populate the assumptions list
    this.elements.keyAssumptionsList.innerHTML = '';
    assumptions.forEach(assumption => {
      const li = document.createElement('li');
      li.textContent = assumption;
      this.elements.keyAssumptionsList.appendChild(li);
    });

    // Show the assumptions section
    this.elements.keyAssumptions.style.display = assumptions.length > 0 ? 'block' : 'none';
  }

  // Hide scenario preview
  hideScenarioPreview() {
    if (this.elements.scenarioPreview) {
      this.elements.scenarioPreview.style.display = 'none';
    }
    if (this.elements.scenarioDescription) {
      this.elements.scenarioDescription.textContent = '';
    }
    if (this.elements.scenarioJsonPreview) {
      this.elements.scenarioJsonPreview.textContent = '';
    }
    if (this.elements.keyAssumptions) {
      this.elements.keyAssumptions.style.display = 'none';
    }
  }

  // ---- SIMULATION RESULTS ----

  // Run button state management
  setRunButtonLoading(isLoading) {
    if (!this.elements.runBtn) return;

    if (isLoading) {
      this.elements.runBtn.classList.add('loading');
      this.elements.runBtn.textContent = 'Running...';
      this.elements.runBtn.disabled = true;
    } else {
      this.elements.runBtn.classList.remove('loading');
      this.elements.runBtn.textContent = 'Run Simulation';
      this.elements.runBtn.disabled = false;
    }
  }

  // Show chart area with full width enforcement
  showChartArea() {
    const chartArea = this.elements.chartArea;
    if (!chartArea) return;

    chartArea.classList.add('has-results');
    chartArea.style.display = 'block';

    // Force full width styles
    chartArea.style.width = '100%';
    chartArea.style.maxWidth = '100%';
    chartArea.style.minWidth = '100%';
    chartArea.style.boxSizing = 'border-box';

    // Force immediate width update
    setTimeout(() => {
      const plotlyDiv = chartArea.querySelector('.plotly-graph-div');
      if (plotlyDiv) {
        plotlyDiv.style.width = '100%';
        plotlyDiv.style.maxWidth = '100%';

        // Trigger Plotly resize if available
        if (window.Plotly) {
          window.Plotly.Plots.resize(chartArea);
          console.log('✅ Chart area shown and resized to full width');
        }
      }
    }, 100);
  }

  // Show simulation insights with enhanced data analysis
  showSimulationInsights(results, scenarioData) {
    if (!this.elements.simulationInsights || !this.elements.insightsList || !results || results.length === 0) {
      return;
    }

    // Generate insights from simulation data
    const insights = this.generateEnhancedInsights(results, scenarioData);

    // Populate insights list
    this.elements.insightsList.innerHTML = '';
    insights.forEach(insight => {
      const li = document.createElement('li');
      li.textContent = insight;
      this.elements.insightsList.appendChild(li);
    });

    // Show insights section
    this.elements.simulationInsights.style.display = 'block';
  }

  // ENHANCED: Generate comprehensive insights from simulation data
  generateEnhancedInsights(results, scenarioData) {
    const insights = [];
    const balanceHistory = window._scenarioResult?.balanceHistory || {};

    // Money duration analysis
    const totalFinalBalance = Object.values(balanceHistory).reduce((total, balances) => {
      return total + (balances[balances.length - 1] || 0);
    }, 0);

    if (totalFinalBalance < 1000) {
      // Find when money ran out
      let monthRunOut = results.length;
      for (let i = 0; i < results.length; i++) {
        const monthTotal = Object.values(balanceHistory).reduce((total, balances) => {
          return total + (balances[i] || 0);
        }, 0);
        if (monthTotal < 1000) {
          monthRunOut = i + 1;
          break;
        }
      }
      const yearRunOut = Math.round(monthRunOut / 12);
      insights.push(`Money runs out around month ${monthRunOut} (year ${yearRunOut})`);
    } else {
      insights.push(`Money lasts the full ${Math.round(results.length / 12)} years with $${Math.round(totalFinalBalance).toLocaleString()} remaining`);
    }

    // Withdrawal rate analysis
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    const initialBalance = Object.values(balanceHistory).reduce((total, balances) => {
      return total + (balances[0] || 0);
    }, 0);

    if (monthlyExpenses && initialBalance) {
      const annualWithdrawal = monthlyExpenses * 12;
      const withdrawalRate = (annualWithdrawal / initialBalance * 100).toFixed(1);
      insights.push(`Initial withdrawal rate: ${withdrawalRate}% annually (4% rule suggests $${Math.round(annualWithdrawal / 0.04).toLocaleString()} needed)`);
    }

    // Proportional withdrawal detection
    if (window._scenarioResult?.results) {
      const firstWithdrawal = window._scenarioResult.results.find(r => r.withdrawals && r.withdrawals.length > 1);
      if (firstWithdrawal && firstWithdrawal.withdrawals.some(w => w.weight)) {
        insights.push(`Using proportional withdrawals with weighted asset allocation`);
      }
    }

    return insights;
  }

  // Show next scenario suggestion
  showNextScenarioSuggestion(currentScenarioTitle) {
    // Keep this simple - no hardcoded suggestions
    if (this.elements.nextScenarioSuggestion) {
      this.elements.nextScenarioSuggestion.style.display = 'none';
    }
  }

  // Post-simulation UI updates
  handleSimulationComplete(scenarioData, results) {
    // Collapse JSON editor if it's open
    this.collapseJsonEditor();

    // Show chart area
    this.showChartArea();

    // Show insights
    this.showSimulationInsights(results, scenarioData);

    // Show next scenario suggestion
    this.showNextScenarioSuggestion(scenarioData.title);

    // Scroll to results
    if (this.elements.chartArea) {
      this.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Hide insights and suggestions when new scenario selected
  hideSimulationResults() {
    if (this.elements.simulationInsights) {
      this.elements.simulationInsights.style.display = 'none';
    }
    if (this.elements.nextScenarioSuggestion) {
      this.elements.nextScenarioSuggestion.style.display = 'none';
    }

    if (this.elements.chartArea) {
      this.elements.chartArea.classList.remove('has-results');
      this.elements.chartArea.style.display = 'none';
    }
  }

  // ---- UTILITY FUNCTIONS ----

  // Text selection utility
  selectText(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        element.focus();
        element.select();
      } else {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  // ---- EVENT LISTENER REGISTRATION ----

  // Event listener registration for external components
  onScenarioChange(callback) {
    if (this.elements.scenarioDropdown) {
      this.elements.scenarioDropdown.addEventListener('change', callback);
    }
  }

  onRunSimulation(callback) {
    if (this.elements.runBtn) {
      this.elements.runBtn.addEventListener('click', callback);
    }
  }

  // ---- ALERT/NOTIFICATION SYSTEM ----

  showError(message) {
    alert(`Error: ${message}`);
  }

  showWarning(message) {
    console.warn(`Warning: ${message}`);
  }

  showSuccess(message) {
    console.log(`Success: ${message}`);
  }
}

function setupSimpleToggles() {
  // CSV Toggle
  const csvBtn = document.getElementById('toggle-csv-btn');
  const csvSection = document.getElementById('csv-section');
  const csvContainer = document.getElementById('csv-container');

  if (csvBtn && csvSection && csvContainer) {
    const newCsvBtn = csvBtn.cloneNode(true);
    csvBtn.parentNode.replaceChild(newCsvBtn, csvBtn);

    newCsvBtn.addEventListener('click', function() {
      if (csvSection.style.display === 'none' || csvSection.style.display === '') {
        csvSection.style.display = 'block';
        csvContainer.style.display = 'block';
        this.textContent = 'Hide CSV Data';
      } else {
        csvSection.style.display = 'none';
        csvContainer.style.display = 'none';
        this.textContent = 'Export CSV Data';
      }
    });

    csvSection.style.display = 'none';
    csvContainer.style.display = 'none';
    newCsvBtn.textContent = 'Export CSV Data';
  }

  // JSON Toggle
  const jsonBtn = document.getElementById('toggle-json-btn');
  const jsonContainer = document.getElementById('json-container');

  if (jsonBtn && jsonContainer) {
    const newJsonBtn = jsonBtn.cloneNode(true);
    jsonBtn.parentNode.replaceChild(newJsonBtn, jsonBtn);

    newJsonBtn.addEventListener('click', function() {
      if (jsonContainer.style.display === 'none' || jsonContainer.style.display === '') {
        jsonContainer.style.display = 'block';
        this.textContent = 'Hide JSON';
      } else {
        jsonContainer.style.display = 'none';
        this.textContent = 'Edit JSON';
      }
    });

    jsonContainer.style.display = 'none';
    newJsonBtn.textContent = 'Edit JSON';
  }
}

document.addEventListener('DOMContentLoaded', setupSimpleToggles);
