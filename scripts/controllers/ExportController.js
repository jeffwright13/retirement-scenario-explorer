/**
 * Export Controller - Centralized export functionality for all tabs
 * Manages export toolbar visibility and handles all export operations
 */

export class ExportController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentTab = 'configure';
    this.currentScenarioData = null;
    this.simulationResults = null;
    this.monteCarloResults = null;
    
    console.log('📤 ExportController created');
  }

  /**
   * Initialize the Export Controller
   */
  initialize() {
    console.log('📤 Initializing Export Controller');
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupEventBusListeners();
    this.updateToolbarVisibility();
    
    console.log('✅ Export Controller initialized');
  }

  /**
   * Initialize UI element references
   */
  initializeElements() {
    this.toolbar = document.getElementById('export-toolbar');
    this.scenarioConfigBtn = document.getElementById('export-scenario-config');
    this.scenarioResultsBtn = document.getElementById('export-scenario-results');
    this.monteCarloResultsBtn = document.getElementById('export-monte-carlo-results');
    this.monteCarloReturnsBtn = document.getElementById('export-monte-carlo-returns');
  }

  /**
   * Setup DOM event listeners for export buttons
   */
  setupEventListeners() {
    // Scenario Configuration Export (always available when scenario is selected)
    this.scenarioConfigBtn?.addEventListener('click', () => {
      this.exportScenarioConfiguration();
    });

    // Scenario Results Export (available after simulation)
    this.scenarioResultsBtn?.addEventListener('click', () => {
      this.exportScenarioResults();
    });

    // Monte Carlo Results Export (available after MC analysis)
    this.monteCarloResultsBtn?.addEventListener('click', () => {
      this.exportMonteCarloResults();
    });

    // Monte Carlo Returns Export (available after MC analysis)
    this.monteCarloReturnsBtn?.addEventListener('click', () => {
      this.exportMonteCarloReturns();
    });

    // Listen for tab changes to update toolbar visibility
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        this.currentTab = e.target.dataset.tab;
        this.updateToolbarVisibility();
      }
    });
  }

  /**
   * Setup event bus listeners to track data availability
   */
  setupEventBusListeners() {
    // Track scenario selection
    this.eventBus.on('scenario:selected', (data) => {
      this.currentScenarioData = data.scenario; // Fix: use data.scenario not data.scenarioData
      this.updateToolbarVisibility();
    });

    // Track simulation completion
    this.eventBus.on('simulation:completed', (data) => {
      this.simulationResults = data;
      this.updateToolbarVisibility();
    });

    // Track Monte Carlo completion
    this.eventBus.on('montecarlo:completed', (data) => {
      this.monteCarloResults = data;
      this.updateToolbarVisibility();
    });

    // Clear results when new scenario is selected
    this.eventBus.on('scenario:changed', () => {
      this.simulationResults = null;
      this.monteCarloResults = null;
      this.updateToolbarVisibility();
    });

    // Track JSON editor changes to update scenario config data
    this.eventBus.on('scenario:data-changed', (data) => {
      this.currentScenarioData = data.scenarioData;
      this.updateToolbarVisibility();
    });
  }

  /**
   * Update toolbar button visibility based on current tab and data availability
   */
  updateToolbarVisibility() {
    if (!this.toolbar) return;

    // Scenario Config button - always visible when scenario is selected
    const hasScenario = this.currentScenarioData !== null;
    this.toggleButton(this.scenarioConfigBtn, hasScenario);

    // Results button - visible on simulation tab when results exist
    const showResultsBtn = this.currentTab === 'single-analysis' && this.simulationResults !== null;
    this.toggleButton(this.scenarioResultsBtn, showResultsBtn);

    // Monte Carlo buttons - visible on MC tab when results exist
    const showMCBtn = this.currentTab === 'monte-carlo' && this.monteCarloResults !== null;
    this.toggleButton(this.monteCarloResultsBtn, showMCBtn);
    this.toggleButton(this.monteCarloReturnsBtn, showMCBtn);
  }

  /**
   * Toggle button visibility and enabled state
   */
  toggleButton(button, show) {
    if (!button) return;
    
    if (show) {
      button.style.display = 'inline-flex';
      button.disabled = false;
    } else {
      button.style.display = 'none';
      button.disabled = true;
    }
  }

  /**
   * Export current scenario configuration as JSON
   */
  exportScenarioConfiguration() {
    if (!this.currentScenarioData) {
      console.warn('No scenario data available for export');
      return;
    }

    try {
      const jsonData = JSON.stringify(this.currentScenarioData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `scenario-config-${timestamp}.json`;
      
      this.downloadFile(jsonData, filename, 'application/json');
      
      // Emit event for tracking
      this.eventBus.emit('export:scenario-config', {
        filename,
        size: jsonData.length
      });
      
      console.log('📤 Scenario configuration exported:', filename);
    } catch (error) {
      console.error('Error exporting scenario configuration:', error);
    }
  }

  /**
   * Export simulation results as CSV
   */
  exportScenarioResults() {
    if (!this.simulationResults) {
      console.warn('No simulation results available for export');
      return;
    }

    try {
      // Use existing CSV generation logic from simulation results
      const csvData = this.generateSimulationCSV(this.simulationResults);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `scenario-results-${timestamp}.csv`;
      
      this.downloadFile(csvData, filename, 'text/csv');
      
      // Emit event for tracking
      this.eventBus.emit('export:scenario-results', {
        filename,
        size: csvData.length
      });
      
      console.log('📤 Scenario results exported:', filename);
    } catch (error) {
      console.error('Error exporting scenario results:', error);
    }
  }

  /**
   * Export Monte Carlo analysis results as CSV
   */
  exportMonteCarloResults() {
    if (!this.monteCarloResults) {
      console.warn('No Monte Carlo results available for export');
      return;
    }

    try {
      // Use existing MC CSV generation logic
      const csvData = this.generateMonteCarloCSV(this.monteCarloResults);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `monte-carlo-analysis-${timestamp}.csv`;
      
      this.downloadFile(csvData, filename, 'text/csv');
      
      // Emit event for tracking
      this.eventBus.emit('export:monte-carlo-results', {
        filename,
        size: csvData.length
      });
      
      console.log('📤 Monte Carlo results exported:', filename);
    } catch (error) {
      console.error('Error exporting Monte Carlo results:', error);
    }
  }

  /**
   * Export Monte Carlo returns data as CSV
   */
  exportMonteCarloReturns() {
    if (!this.monteCarloResults) {
      console.warn('No Monte Carlo results available for returns export');
      return;
    }

    try {
      const csvData = this.generateMonteCarloReturnsCSV(this.monteCarloResults);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `monte-carlo-returns-${timestamp}.csv`;
      
      this.downloadFile(csvData, filename, 'text/csv');
      
      // Emit event for tracking
      this.eventBus.emit('export:monte-carlo-returns', {
        filename,
        size: csvData.length
      });
      
      console.log('📤 Monte Carlo returns exported:', filename);
    } catch (error) {
      console.error('Error exporting Monte Carlo returns:', error);
    }
  }

  /**
   * Generate CSV data from simulation results
   */
  generateSimulationCSV(results) {
    console.log('📊 Generating CSV from results:', results);
    console.log('📊 Results type:', typeof results, 'Is array:', Array.isArray(results));
    
    // Check for results structure - could be nested
    const actualResults = results.results || results;
    console.log('📊 Actual results:', actualResults, 'Type:', typeof actualResults);
    
    if (!actualResults) {
      console.warn('❌ No actual results found');
      return 'No simulation data available';
    }

    // First check if CSV is already generated (check both levels)
    console.log('📊 Top level csvText:', 'csvText' in results, 'type:', typeof results.csvText);
    console.log('📊 Nested csvText:', 'csvText' in actualResults, 'type:', typeof actualResults.csvText);
    
    if (actualResults.csvText && typeof actualResults.csvText === 'string' && actualResults.csvText.length > 0) {
      console.log('📊 Using pre-generated CSV text from actualResults, length:', actualResults.csvText.length);
      return actualResults.csvText;
    }
    
    if (results.csvText && typeof results.csvText === 'string' && results.csvText.length > 0) {
      console.log('📊 Using pre-generated CSV text from top level, length:', results.csvText.length);
      return results.csvText;
    }

    // Handle different result structures
    let balanceData, monthlyExpenses = 0, monthlyIncome = 0;
    
    // Try multiple possible data locations
    if (Array.isArray(actualResults)) {
      // Results is directly an array of monthly data
      balanceData = actualResults;
      // Extract expenses/income from first entry if available
      if (actualResults.length > 0) {
        monthlyExpenses = actualResults[0].monthly_expenses || 0;
        monthlyIncome = actualResults[0].net_income || 0;
      }
      console.log('📊 Using direct array, length:', balanceData.length);
    } else if (results.balanceHistory && Array.isArray(results.balanceHistory)) {
      // balanceHistory is directly on the results object (not nested under results.results)
      balanceData = results.balanceHistory;
      monthlyExpenses = results.monthlyExpenses || 0;
      monthlyIncome = results.monthlyIncome || 0;
      console.log('📊 Using results.balanceHistory array, length:', balanceData.length);
    } else if (actualResults.balanceHistory && Array.isArray(actualResults.balanceHistory)) {
      // Standard structure with balanceHistory array
      balanceData = actualResults.balanceHistory;
      monthlyExpenses = actualResults.monthlyExpenses || 0;
      monthlyIncome = actualResults.monthlyIncome || 0;
      console.log('📊 Using actualResults.balanceHistory array, length:', balanceData.length);
    } else if (actualResults.data && Array.isArray(actualResults.data)) {
      // Results nested under data property
      balanceData = actualResults.data;
      console.log('📊 Using results.data array, length:', balanceData.length);
    } else {
      // Log all available properties to debug
      console.warn('❌ Could not find array data. Available properties:', Object.keys(actualResults));
      return 'No simulation data available - unexpected data structure';
    }

    if (!balanceData || !Array.isArray(balanceData) || balanceData.length === 0) {
      console.warn('❌ balanceData is not a valid array:', balanceData);
      return 'No simulation data available';
    }

    const headers = ['Month', 'Total Balance', 'Monthly Expenses', 'Monthly Income', 'Net Cash Flow'];
    const rows = [headers.join(',')];

    balanceData.forEach((entry, index) => {
      const month = index + 1;
      const totalBalance = entry.totalBalance || entry.total_assets || 0;
      const expenses = entry.monthly_expenses || monthlyExpenses || 0;
      const income = entry.net_income || monthlyIncome || 0;
      const netCashFlow = income - expenses;

      rows.push([
        month,
        totalBalance.toFixed(2),
        expenses.toFixed(2),
        income.toFixed(2),
        netCashFlow.toFixed(2)
      ].join(','));
    });

    return rows.join('\n');
  }

  /**
   * Generate CSV data from Monte Carlo results
   */
  generateMonteCarloCSV(results) {
    console.log('📊 Generating Monte Carlo CSV from results:', results);
    console.log('📊 Results structure:', {
      hasResults: 'results' in results,
      hasAnalysis: 'analysis' in results,
      hasTrajectories: results.analysis && 'trajectories' in results.analysis,
      resultKeys: Object.keys(results),
      analysisKeys: results.analysis ? Object.keys(results.analysis) : 'no analysis'
    });

    // Check for trajectories in multiple locations
    let trajectories = results.analysis?.trajectories || results.trajectories;
    
    // If no trajectories found, try to extract from raw results array
    if (!trajectories && results.results && Array.isArray(results.results)) {
      console.log('📊 Attempting to extract trajectories from raw results array');
      console.log('📊 First result sample structure:', results.results[0]);
      console.log('📊 First result keys:', Object.keys(results.results[0]));
      
      trajectories = [];
      
      results.results.forEach((resultItem, index) => {
        if (index < 2) {
          console.log(`📊 Examining result ${index}:`, {
            topLevelKeys: Object.keys(resultItem),
            hasResult: 'result' in resultItem,
            resultKeys: resultItem.result ? Object.keys(resultItem.result) : 'no result',
            hasResultResults: resultItem.result && 'results' in resultItem.result,
            resultResultsKeys: resultItem.result?.results ? Object.keys(resultItem.result.results) : 'no results',
            hasBalanceHistory: resultItem.result?.results?.balanceHistory ? 'yes' : 'no'
          });
          
          // Log the actual result object structure
          if (resultItem.result) {
            console.log(`📊 Full result ${index} object:`, resultItem.result);
          }
        }
        
        // Extract detailed trajectory data including individual asset balances
        if (resultItem.result?.results?.balanceHistory) {
          const balanceHistory = resultItem.result.results.balanceHistory;
          const monthlyData = resultItem.result.results.results;
          
          console.log(`📊 Found balance history for result ${index}:`, Object.keys(balanceHistory));
          console.log(`📊 Found monthly data: ${monthlyData?.length} months`);
          
          // Get the length from any asset (they should all be the same length)
          const firstAsset = Object.keys(balanceHistory)[0];
          if (firstAsset && Array.isArray(balanceHistory[firstAsset])) {
            const monthCount = balanceHistory[firstAsset].length;
            const assetNames = Object.keys(balanceHistory);
            
            // Build detailed trajectory with individual asset balances for each month
            const detailedTrajectory = [];
            for (let month = 0; month < monthCount; month++) {
              const monthData = {
                scenario: index + 1,
                month: month + 1,
                totalBalance: 0,
                assets: {}
              };
              
              // Calculate individual asset balances and total
              assetNames.forEach(assetName => {
                const assetHistory = balanceHistory[assetName];
                if (Array.isArray(assetHistory) && assetHistory[month] !== undefined) {
                  const balance = assetHistory[month];
                  monthData.assets[assetName] = balance;
                  monthData.totalBalance += balance;
                }
              });
              
              detailedTrajectory.push(monthData);
            }
            
            trajectories.push(detailedTrajectory);
            if (index < 3) {
              console.log(`📊 Extracted detailed trajectory ${index} with ${detailedTrajectory.length} months and ${assetNames.length} assets`);
            }
          }
        }
      });
    }
    
    if (!trajectories || trajectories.length === 0) {
      console.warn('❌ No trajectories found in Monte Carlo results');
      console.log('📊 Available data structure:', {
        resultsLength: results.results?.length,
        firstResultSample: results.results?.[0] ? Object.keys(results.results[0]) : 'none'
      });
      return 'No Monte Carlo data available';
    }

    console.log('📊 Found', trajectories.length, 'trajectories');

    const headers = ['Scenario', 'Month', 'Total_Balance', 'Savings', 'Investment', 'Traditional_IRA', 'Roth_IRA'];
    const rows = [headers.join(',')];

    trajectories.forEach((trajectory, scenarioIndex) => {
      if (Array.isArray(trajectory)) {
        trajectory.forEach((monthData, monthIndex) => {
          if (typeof monthData === 'number') {
            // Handle simple balance array (legacy format)
            rows.push([
              scenarioIndex + 1,
              monthIndex + 1,
              monthData.toFixed(2),
              '', '', '', '' // Empty asset columns for simple format
            ].join(','));
          } else if (monthData && typeof monthData === 'object') {
            // Handle detailed month data with individual assets
            const totalBalance = monthData.totalBalance || 0;
            const savings = monthData.assets?.Savings || 0;
            const investment = monthData.assets?.Investment || 0;
            const traditionalIRA = monthData.assets?.['Traditional IRA'] || 0;
            const rothIRA = monthData.assets?.['Roth IRA'] || 0;
            
            rows.push([
              monthData.scenario || (scenarioIndex + 1),
              monthData.month || (monthIndex + 1),
              totalBalance.toFixed(2),
              savings.toFixed(2),
              investment.toFixed(2),
              traditionalIRA.toFixed(2),
              rothIRA.toFixed(2)
            ].join(','));
          }
        });
      }
    });

    console.log('📊 Generated CSV with', rows.length - 1, 'data rows');
    return rows.join('\n');
  }

  /**
   * Generate CSV data from Monte Carlo returns
   */
  generateMonteCarloReturnsCSV(results) {
    console.log('📊 Generating Monte Carlo returns CSV from results:', {
      hasResults: !!results.results,
      resultsLength: results.results?.length,
      hasAnalysis: !!results.analysis
    });

    if (!results.results || !Array.isArray(results.results)) {
      return 'No Monte Carlo returns data available';
    }

    // Extract return sequences from results
    const returnData = [];
    
    results.results.forEach((resultItem, index) => {
      if (index < 3) {
        console.log(`📊 Checking result ${index} for return sequence:`, {
          topLevelKeys: Object.keys(resultItem),
          hasReturnSequence: 'returnSequence' in resultItem,
          returnSequenceType: typeof resultItem.returnSequence,
          resultHasReturnSequence: resultItem.result && 'returnSequence' in resultItem.result
        });
      }
      
      // Check for return sequence in nested result object
      const returnSequence = resultItem.returnSequence || resultItem.result?.returnSequence;
      
      if (returnSequence) {
        console.log(`📊 Found return sequence for iteration ${index}:`, Object.keys(returnSequence));
        
        const assetTypes = Object.keys(returnSequence);
        
        // Get the length of return sequences (should be consistent across assets)
        const firstAsset = assetTypes[0];
        const sequenceLength = returnSequence[firstAsset]?.length || 0;
        
        for (let year = 0; year < sequenceLength; year++) {
          const yearData = {
            scenario: index + 1,
            year: year + 1,
            assets: {}
          };
          
          assetTypes.forEach(assetType => {
            const returns = returnSequence[assetType];
            if (returns && returns[year] !== undefined) {
              yearData.assets[assetType] = returns[year];
            }
          });
          
          returnData.push(yearData);
        }
      }
    });

    if (returnData.length === 0) {
      console.warn('❌ No return sequences found in Monte Carlo results');
      return 'No Monte Carlo returns data available';
    }

    // Build CSV headers - dynamically based on available assets
    const allAssets = new Set();
    returnData.forEach(row => {
      Object.keys(row.assets).forEach(asset => allAssets.add(asset));
    });
    
    const assetColumns = Array.from(allAssets).sort();
    const headers = ['Scenario', 'Year', ...assetColumns];
    const rows = [headers.join(',')];

    // Generate CSV rows
    returnData.forEach(yearData => {
      const row = [
        yearData.scenario,
        yearData.year,
        ...assetColumns.map(asset => {
          const returnValue = yearData.assets[asset];
          return returnValue !== undefined ? (returnValue * 100).toFixed(4) + '%' : '';
        })
      ];
      rows.push(row.join(','));
    });

    console.log('📊 Generated returns CSV with', rows.length - 1, 'data rows and', assetColumns.length, 'asset columns');
    return rows.join('\n');
  }

  /**
   * Download file to user's system
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
