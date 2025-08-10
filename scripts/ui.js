/**
 * UI Management Module
 * Handles all DOM manipulation and UI state changes
 * No business logic - pure presentation layer
 */

export class UIManager {
  constructor() {
    this.elements = this.cacheElements();
    this.setupEventListeners();
  }

  // Cache all DOM elements for performance - ENHANCED with Phase 1 elements
  cacheElements() {
    return {
      // Existing panels
      gettingStartedPanel: document.getElementById('getting-started-panel'),
      gettingStartedHeader: document.getElementById('getting-started-header'),
      
      // Existing scenario selection
      scenarioDropdown: document.getElementById('scenario-dropdown'),
      scenarioPreview: document.getElementById('scenario-preview'),
      scenarioDescription: document.getElementById('scenario-description'),
      scenarioJsonPreview: document.getElementById('scenario-json-preview'),
      
      // Existing controls
      runBtn: document.getElementById('run-btn'),
      toggleJsonBtn: document.getElementById('toggle-json-btn'),
      toggleCsvBtn: document.getElementById('toggle-csv-btn'),
      selectJsonBtn: document.getElementById('select-json-btn'),
      selectCsvBtn: document.getElementById('select-csv-btn'),
      
      // Existing content areas
      jsonContainer: document.getElementById('json-container'),
      jsonInput: document.getElementById('json-input'),
      csvSection: document.getElementById('csv-section'),
      csvContainer: document.getElementById('csv-container'),
      chartArea: document.getElementById('chart-area'),
      
      // NEW Phase 1 elements
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

  // Setup all event listeners
  setupEventListeners() {
    // Getting started panel toggle
    this.elements.gettingStartedHeader.addEventListener('click', () => {
      this.toggleGettingStartedPanel();
    });

    // JSON editor toggle
    this.elements.toggleJsonBtn.addEventListener('click', () => {
      this.toggleJsonEditor();
    });

    // CSV results toggle
    this.elements.toggleCsvBtn.addEventListener('click', () => {
      this.toggleCsvResults();
    });

    // Text selection helpers
    this.elements.selectJsonBtn.addEventListener('click', () => {
      this.selectText('json-input');
    });

    this.elements.selectCsvBtn.addEventListener('click', () => {
      this.selectText('csv-container');
    });
  }

  // Getting started panel management
  toggleGettingStartedPanel() {
    this.elements.gettingStartedPanel.classList.toggle('collapsed');
  }

  collapseGettingStartedPanel() {
    this.elements.gettingStartedPanel.classList.add('collapsed');
  }

  // JSON editor management
  toggleJsonEditor() {
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
    this.elements.jsonContainer.classList.remove('expanded');
    this.elements.jsonContainer.classList.add('collapsed');
  }

  loadJsonIntoEditor(jsonText) {
    console.log(`Loading JSON into editor: ${jsonText.substring(0, 100)}...`);
    this.elements.jsonInput.value = jsonText;
    // Keep editor collapsed - user must explicitly toggle to edit
  }

  getJsonFromEditor() {
    return this.elements.jsonInput.value;
  }

  clearJsonEditor() {
    this.elements.jsonInput.value = '';
  }

  // CSV results management
  toggleCsvResults() {
    const isCollapsed = this.elements.csvSection.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.elements.csvSection.classList.remove('collapsed');
      this.elements.csvContainer.classList.remove('collapsed');
    } else {
      this.elements.csvSection.classList.add('collapsed');
      this.elements.csvContainer.classList.add('collapsed');
    }
  }

  showCsvResults() {
    this.elements.csvSection.classList.remove('collapsed');
    this.elements.csvContainer.classList.remove('collapsed');
  }

  // Scenario dropdown management
  populateScenarioDropdown(groupedScenarios) {
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
          option.textContent = scenario.metadata.title;
          optgroup.appendChild(option);
        });
        
        this.elements.scenarioDropdown.appendChild(optgroup);
      }
    }
  }

  // ENHANCED: Scenario preview with key assumptions
  showScenarioPreview(metadata, simulationData) {
    console.log('=== showScenarioPreview Enhanced ===');
    
    try {
      this.elements.scenarioPreview.style.display = 'block';
      
      // Set description
      if (metadata && metadata.description) {
        this.elements.scenarioDescription.textContent = metadata.description;
      } else {
        this.elements.scenarioDescription.textContent = 'No description available';
      }
      
      // Show key assumptions
      this.showKeyAssumptions(simulationData);
      
      // Handle JSON preview
      if (!simulationData) {
        this.elements.scenarioJsonPreview.textContent = 'No simulation data available';
        return;
      }
      
      const jsonText = JSON.stringify(simulationData, null, 2);
      this.elements.scenarioJsonPreview.textContent = jsonText;
      
      console.log('✅ Enhanced preview updated successfully');
      
    } catch (error) {
      console.error('Error in showScenarioPreview:', error);
      if (this.elements.scenarioJsonPreview) {
        this.elements.scenarioJsonPreview.textContent = `Error displaying preview: ${error.message}`;
      }
    }
  }

  // NEW: Show key assumptions in a user-friendly way
  showKeyAssumptions(simulationData) {
    if (!simulationData || !this.elements.keyAssumptions) return;
    
    const assumptions = [];
    
    // Extract key assumptions from scenario data
    if (simulationData.plan) {
      assumptions.push(`Monthly expenses: $${simulationData.plan.monthly_expenses?.toLocaleString() || 'Not specified'}`);
      assumptions.push(`Duration: ${Math.round((simulationData.plan.duration_months || 0) / 12)} years`);
      
      // Get inflation info from rate schedules
      const inflationSchedule = simulationData.plan.inflation_schedule;
      if (inflationSchedule && simulationData.rate_schedules && simulationData.rate_schedules[inflationSchedule]) {
        const inflationRate = simulationData.rate_schedules[inflationSchedule];
        if (inflationRate.type === 'fixed') {
          const rate = (inflationRate.rate * 100).toFixed(1);
          assumptions.push(`Inflation: ${rate}% annually${rate === '0.0' ? ' (unrealistic baseline)' : ''}`);
        } else {
          assumptions.push(`Inflation: Variable (${inflationRate.type} schedule)`);
        }
      }
    }
    
    // Extract asset return assumptions
    if (simulationData.assets && simulationData.rate_schedules) {
      simulationData.assets.forEach(asset => {
        const returnSchedule = asset.return_schedule;
        if (returnSchedule && simulationData.rate_schedules[returnSchedule]) {
          const rateInfo = simulationData.rate_schedules[returnSchedule];
          if (rateInfo.type === 'fixed') {
            const rate = (rateInfo.rate * 100).toFixed(1);
            assumptions.push(`${asset.name}: ${rate}% annual return`);
          } else {
            assumptions.push(`${asset.name}: Variable returns (${rateInfo.type})`);
          }
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

  hideScenarioPreview() {
    this.elements.scenarioPreview.style.display = 'none';
    this.elements.scenarioDescription.textContent = '';
    this.elements.scenarioJsonPreview.textContent = '';
    if (this.elements.keyAssumptions) {
      this.elements.keyAssumptions.style.display = 'none';
    }
  }

  // Run button state management
  setRunButtonLoading(isLoading) {
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

  // NEW: Show chart area with results class
  showChartArea() {
    const chartArea = document.getElementById('chart-area');
    if (chartArea) {
      chartArea.classList.add('has-results');
      chartArea.style.display = 'block';
    }
  }

  // NEW: Show simulation insights after results
  showSimulationInsights(results, scenarioData) {
    if (!this.elements.simulationInsights || !results || results.length === 0) return;
    
    const insights = this.generateInsights(results, scenarioData);
    
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

  // NEW: Generate contextual insights based on results
  generateInsights(results, scenarioData) {
    const insights = [];
    
    // Find when money runs out
    const lastResult = results[results.length - 1];
    const balanceHistory = window._scenarioResult?.balanceHistory || {};
    
    // Check if any assets have money left
    const totalFinalBalance = Object.values(balanceHistory).reduce((total, balances) => {
      return total + (balances[balances.length - 1] || 0);
    }, 0);
    
    if (totalFinalBalance < 1000) {
      // Find approximately when money ran out
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
      insights.push(`Your money runs out around month ${monthRunOut} (year ${yearRunOut})`);
    } else {
      insights.push(`Your money lasts the full ${Math.round(results.length / 12)} years with $${Math.round(totalFinalBalance).toLocaleString()} remaining`);
    }
    
    // Inflation insights
    const title = scenarioData.title || '';
    if (title.includes('No Inflation')) {
      insights.push('This assumes 0% inflation, which never happens in reality');
      insights.push('Even this unrealistic scenario shows the challenge of retirement funding');
    } else if (title.includes('3%')) {
      insights.push('3% inflation is the historical average - your expenses nearly double in 20 years');
      insights.push('Notice how much earlier your money runs out compared to 0% inflation');
    } else if (title.includes('8%')) {
      insights.push('8% inflation occurred in the 1970s - expenses quadruple in 18 years');
      insights.push('This shows why inflation is called the "silent killer" of retirement');
    }
    
    // Withdrawal rate insights
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    const initialBalance = Object.values(balanceHistory).reduce((total, balances) => {
      return total + (balances[0] || 0);
    }, 0);
    
    if (monthlyExpenses && initialBalance) {
      const annualWithdrawal = monthlyExpenses * 12;
      const withdrawalRate = (annualWithdrawal / initialBalance * 100).toFixed(1);
      insights.push(`Your initial withdrawal rate is ${withdrawalRate}% annually (4% rule suggests you need much more money)`);
    }
    
    return insights;
  }

  // NEW: Show next scenario suggestion
  showNextScenarioSuggestion(currentScenarioTitle) {
    if (!this.elements.nextScenarioSuggestion) return;
    
    const suggestion = this.getNextScenarioSuggestion(currentScenarioTitle);
    
    if (suggestion) {
      this.elements.nextScenarioDescription.textContent = suggestion.description;
      this.elements.loadNextScenarioBtn.textContent = suggestion.buttonText;
      this.elements.loadNextScenarioBtn.onclick = () => {
        // Trigger scenario change
        this.elements.scenarioDropdown.value = suggestion.scenarioKey;
        this.elements.scenarioDropdown.dispatchEvent(new Event('change'));
      };
      
      this.elements.nextScenarioSuggestion.style.display = 'block';
    }
  }

  // NEW: Get next scenario recommendation based on learning progression
  getNextScenarioSuggestion(currentTitle) {
    const suggestions = {
      'No Inflation (Unrealistic Baseline)': {
        scenarioKey: 'inflation-3pct',
        description: 'See how realistic 3% inflation affects this same scenario',
        buttonText: 'Load "3% Annual Inflation Impact"'
      },
      '3% Annual Inflation Impact': {
        scenarioKey: 'inflation-70s',
        description: 'Experience the devastating impact of 1970s-level inflation',
        buttonText: 'Load "8% Annual Inflation Impact"'
      },
      '8% Annual Inflation Impact': {
        scenarioKey: 'personal-test',
        description: 'See a realistic multi-asset portfolio with Social Security',
        buttonText: 'Load "Personal Portfolio" Example'
      },
      'Personal Portfolio: Inflation Reality Check': {
        scenarioKey: 'sequence-crash-2008',
        description: 'Learn about the devastating impact of sequence of returns risk',
        buttonText: 'Load "2008 Crash Scenario"'
      },
      'Sequence of Returns: 2008 Crash Scenario': {
        scenarioKey: 'ssdi-approved',
        description: 'See how guaranteed income changes everything',
        buttonText: 'Load "SSDI Approved" Scenario'
      }
    };
    
    return suggestions[currentTitle] || null;
  }

  // ENHANCED: Post-simulation UI updates with Phase 1 features
  handleSimulationComplete(scenarioData, results) {
    // Do existing behavior
    this.collapseGettingStartedPanel();
    this.collapseJsonEditor();
    
    // Show chart area
    this.showChartArea();
    
    // Show insights
    this.showSimulationInsights(results, scenarioData);
    
    // Show next scenario suggestion  
    this.showNextScenarioSuggestion(scenarioData.title);
    
    // Scroll to results
    this.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
  }

  // NEW: Hide insights and suggestions when new scenario selected
  hideSimulationResults() {
    if (this.elements.simulationInsights) {
      this.elements.simulationInsights.style.display = 'none';
    }
    if (this.elements.nextScenarioSuggestion) {
      this.elements.nextScenarioSuggestion.style.display = 'none';
    }
    
    const chartArea = document.getElementById('chart-area');
    if (chartArea) {
      chartArea.classList.remove('has-results');
      chartArea.style.display = 'none';
    }
  }

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

  // Event listener registration for external components
  onScenarioChange(callback) {
    this.elements.scenarioDropdown.addEventListener('change', callback);
  }

  onRunSimulation(callback) {
    this.elements.runBtn.addEventListener('click', callback);
  }

  // Alert/notification system
  showError(message) {
    alert(`Error: ${message}`);
  }

  showWarning(message) {
    console.warn(`Warning: ${message}`);
  }
}