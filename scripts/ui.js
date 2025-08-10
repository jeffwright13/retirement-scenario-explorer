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

  // Cache all DOM elements for performance
  cacheElements() {
    return {
      // Panels
      gettingStartedPanel: document.getElementById('getting-started-panel'),
      gettingStartedHeader: document.getElementById('getting-started-header'),
      
      // Scenario selection
      scenarioDropdown: document.getElementById('scenario-dropdown'),
      scenarioPreview: document.getElementById('scenario-preview'),
      scenarioDescription: document.getElementById('scenario-description'),
      scenarioJsonPreview: document.getElementById('scenario-json-preview'),
      
      // Controls
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
      chartArea: document.getElementById('chart-area')
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

  showScenarioPreview(metadata, simulationData) {
    console.log('=== showScenarioPreview ===');
    console.log('metadata:', metadata);
    console.log('simulationData:', simulationData);
  
    try {
      this.elements.scenarioPreview.style.display = 'block';
    
      // Set description
      if (metadata && metadata.description) {
        this.elements.scenarioDescription.textContent = metadata.description;
      } else {
        this.elements.scenarioDescription.textContent = 'No description available';
      }
    
      // Handle simulation data
      if (!simulationData) {
        this.elements.scenarioJsonPreview.textContent = 'No simulation data available';
        return;
      }
    
      // Convert to JSON
      const jsonText = JSON.stringify(simulationData, null, 2);
      this.elements.scenarioJsonPreview.textContent = jsonText;
    
      console.log('✅ Preview updated successfully');
    
    } catch (error) {
      console.error('Error in showScenarioPreview:', error);
      if (this.elements.scenarioJsonPreview) {
        this.elements.scenarioJsonPreview.textContent = `Error displaying preview: ${error.message}`;
      }
    }
  }

  hideScenarioPreview() {
    this.elements.scenarioPreview.style.display = 'none';
    this.elements.scenarioDescription.textContent = '';
    this.elements.scenarioJsonPreview.textContent = '';
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

  // Post-simulation UI updates
  handleSimulationComplete() {
    this.collapseGettingStartedPanel();
    this.collapseJsonEditor();
    this.elements.chartArea.scrollIntoView({ behavior: 'smooth' });
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