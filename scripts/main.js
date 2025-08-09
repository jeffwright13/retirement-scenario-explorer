/**
 * Main Application Controller
 * Orchestrates interactions between UI, scenarios, and simulation
 * No direct DOM manipulation or data loading - pure coordination
 */

import { renderChart, renderCsv } from './render.js';
import { UIManager } from './ui.js';
import { ScenarioManager } from './scenarios.js';
import { simulateScenarioAdvanced } from './timeaware-engine.js';  

class RetirementScenarioApp {
  constructor() {
    this.ui = new UIManager();
    this.scenarios = new ScenarioManager();
    this.currentDiscussion = null;
    
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing Retirement Scenario Explorer...');
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Auto-discover scenarios and populate UI
    await this.loadScenarios();
    
    console.log('✅ Application initialized');
  }

  setupEventHandlers() {
    // Scenario selection handler
    this.ui.onScenarioChange(async (e) => {
      await this.handleScenarioSelection(e.target.value);
    });

    // Simulation execution handler
    this.ui.onRunSimulation(() => {
      this.handleSimulationExecution();
    });
  }

  async loadScenarios() {
    try {
      const discoveredScenarios = await this.scenarios.discoverScenarios();
      const groupedScenarios = this.scenarios.groupScenariosByTag(discoveredScenarios);
      this.ui.populateScenarioDropdown(groupedScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      this.ui.showError('Failed to load scenarios. Please check your data files.');
    }
  }

  async handleScenarioSelection(scenarioKey) {
    if (!scenarioKey) {
      // Clear selection
      this.ui.hideScenarioPreview();
      this.ui.clearJsonEditor();
      this.currentDiscussion = null;
      return;
    }

    const scenario = this.scenarios.getScenario(scenarioKey);
    if (!scenario) {
      this.ui.showError(`Scenario "${scenarioKey}" not found`);
      return;
    }

    try {
      // Show preview with metadata
      const simulationData = this.scenarios.getSimulationData(scenarioKey);
      this.ui.showScenarioPreview(scenario.metadata, simulationData);
      
      // Load JSON into editor (collapsed)
      const jsonText = JSON.stringify(simulationData, null, 2);
      this.ui.loadJsonIntoEditor(jsonText);
      
      // Load discussion content for future use
      this.currentDiscussion = await this.scenarios.loadDiscussion(scenario);
      
      console.log(`Loaded scenario: ${scenarioKey}`);
      
    } catch (error) {
      console.error(`Error loading scenario ${scenarioKey}:`, error);
      this.ui.showError(`Failed to load scenario: ${error.message}`);
    }
  }

  handleSimulationExecution() {
    this.ui.setRunButtonLoading(true);

    // Small delay to show loading state
    setTimeout(() => {
      try {
        this.executeSimulation();
      } finally {
        this.ui.setRunButtonLoading(false);
      }
    }, 100);
  }

  executeSimulation() {
    try {
      // Get scenario data from JSON editor
      const jsonText = this.ui.getJsonFromEditor();
      if (!jsonText.trim()) {
        this.ui.showError('No scenario data to simulate. Please select a scenario or enter JSON data.');
        return;
      }

      // Parse and validate JSON
      let scenarioData;
      try {
        scenarioData = JSON.parse(jsonText);
      } catch (error) {
        this.ui.showError(`Invalid JSON: ${error.message}`);
        return;
      }

      // Convert legacy format if needed
      scenarioData = this.scenarios.convertLegacyScenario(scenarioData);

      // Validate scenario
      const validation = this.scenarios.validateScenario(scenarioData);
      if (!validation.isValid) {
        this.ui.showError(`Invalid scenario:\n${validation.errors.join('\n')}`);
        return;
      }

      // Run simulation
      console.log('Running simulation with scenario:', scenarioData);
	  const simulationResult = simulateScenarioAdvanced(scenarioData);
	  console.log('Simulation result:', simulationResult);

      // Store result for debugging
      window._scenarioResult = simulationResult;

      // Render results
      const { results, balanceHistory, csvText, windfallUsedAtMonth } = simulationResult;
      
      renderCsv(csvText);
      renderChart(
        results, 
        balanceHistory, 
        scenarioData.title || "Retirement Simulation", 
        { windfallUsedAtMonth }
      );

      // Update UI post-simulation
      this.ui.handleSimulationComplete();

      console.log('✅ Simulation completed successfully');

    } catch (error) {
      console.error('Simulation error:', error);
      this.ui.showError(`Simulation failed: ${error.message}`);
    }
  }

  // Public API for debugging/extensions
  getScenarios() {
    return this.scenarios.getDiscoveredScenarios();
  }

  getCurrentDiscussion() {
    return this.currentDiscussion;
  }

  refreshScenarios() {
    return this.loadScenarios();
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.retirementApp = new RetirementScenarioApp();
});