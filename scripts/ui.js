/**
 * UI Management Module - Cleaned up for Storyteller Mode
 * Handles all DOM manipulation and UI state changes
 * No business logic - pure presentation layer
 * REMOVED: All hardcoded storytelling content (moved to story JSON files)
 */

export class UIManager {
  constructor() {
    this.elements = this.cacheElements();
    this.setupEventListeners();
  }

  // Cache all DOM elements for performance
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
      
      // Phase 1 elements
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

  expandGettingStartedPanel() {
    this.elements.gettingStartedPanel.classList.remove('collapsed');
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
  }

  getJsonFromEditor() {
    return this.elements.jsonInput.value;
  }

  clearJsonEditor() {
    this.elements.jsonInput.value = '';
  }

  // CSV results management
  toggleCsvResults() {
    const isVisible = this.elements.csvSection.classList.contains('show');
    
    if (isVisible) {
      this.elements.csvSection.classList.remove('show');
      this.elements.csvContainer.classList.remove('show');
    } else {
      this.elements.csvSection.classList.add('show');
      this.elements.csvContainer.classList.add('show');
    }
  }

  showCsvResults() {
    this.elements.csvSection.classList.add('show');
    this.elements.csvContainer.classList.add('show');
  }

  hideCsvResults() {
    this.elements.csvSection.classList.remove('show');
    this.elements.csvContainer.classList.remove('show');
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

  // Reset UI to default state when new scenario selected
  resetToDefaultState() {
    console.log('🔄 Resetting UI to default state');
    
    // Expand getting started panel
    this.elements.gettingStartedPanel.classList.remove('collapsed');
    
    // Collapse JSON editor
    this.elements.jsonContainer.classList.remove('expanded');
    this.elements.jsonContainer.classList.add('collapsed');
    
    // Hide CSV results
    this.hideCsvResults();
    
    // Hide previous simulation results
    this.hideSimulationResults();
    
    // Scroll to top of getting started panel
    this.elements.gettingStartedPanel.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }

  // Scenario preview with state reset and key assumptions
  showScenarioPreview(metadata, simulationData) {
    console.log('=== showScenarioPreview Enhanced ===');
    
    // First, reset UI to clean state
    this.resetToDefaultState();
    
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

  // Show key assumptions in a user-friendly way
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

  // Hide scenario preview with state management
  hideScenarioPreview() {
    this.elements.scenarioPreview.style.display = 'none';
    this.elements.scenarioDescription.textContent = '';
    this.elements.scenarioJsonPreview.textContent = '';
    if (this.elements.keyAssumptions) {
      this.elements.keyAssumptions.style.display = 'none';
    }
    
    // Also reset UI state
    this.resetToDefaultState();
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

  // Show chart area with full width enforcement
  showChartArea() {
    const chartArea = document.getElementById('chart-area');
    if (chartArea) {
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
            Plotly.Plots.resize(chartArea);
            console.log('✅ Chart area shown and resized to full width');
          }
        }
      }, 100);
    }
  }
  
  // CLEANED UP: Show simulation insights (removed hardcoded story content)
  showSimulationInsights(results, scenarioData) {
    if (!this.elements.simulationInsights || !results || results.length === 0) return;
    
    // REMOVED: All hardcoded story-specific insights 
    // Now generates only generic, data-driven insights
    const insights = this.generateGenericInsights(results, scenarioData);
    
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

  // CLEANED UP: Generate only generic, data-driven insights (no hardcoded stories)
  generateGenericInsights(results, scenarioData) {
    const insights = [];

    // Generic financial insights based purely on simulation data
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
      insights.push(`Money runs out around month ${monthRunOut} (year ${yearRunOut})`);
    } else {
      insights.push(`Money lasts the full ${Math.round(results.length / 12)} years with $${Math.round(totalFinalBalance).toLocaleString()} remaining`);
    }

    // Generic withdrawal rate insight
    const monthlyExpenses = scenarioData.plan?.monthly_expenses || 0;
    const initialBalance = Object.values(balanceHistory).reduce((total, balances) => {
      return total + (balances[0] || 0);
    }, 0);

    if (monthlyExpenses && initialBalance) {
      const annualWithdrawal = monthlyExpenses * 12;
      const withdrawalRate = (annualWithdrawal / initialBalance * 100).toFixed(1);
      insights.push(`Initial withdrawal rate: ${withdrawalRate}% annually (4% rule suggests ${Math.round(annualWithdrawal / 0.04).toLocaleString()} needed)`);
    }

    return insights;
  }

  // CLEANED UP: Next scenario suggestion (removed hardcoded story progressions)
  showNextScenarioSuggestion(currentScenarioTitle) {
    if (!this.elements.nextScenarioSuggestion) return;
    
    // REMOVED: All hardcoded story progression logic
    // Now shows generic suggestion or hides the section
    this.elements.nextScenarioSuggestion.style.display = 'none';
    
    // Could add generic "Try another scenario" suggestion here if desired
    // But for clean separation, this is now handled by story mode
  }

  // Post-simulation UI updates (cleaned up)
  handleSimulationComplete(scenarioData, results) {
    // Collapse JSON editor if it's open
    this.collapseJsonEditor();
    
    // Show chart area
    this.showChartArea();
    
    // Show generic insights (no story-specific content)
    this.showSimulationInsights(results, scenarioData);
    
    // Generic next scenario suggestion (now cleaned up)
    this.showNextScenarioSuggestion(scenarioData.title);
    
    // Scroll to results
    this.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
  }

  // Hide insights and suggestions when new scenario selected
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