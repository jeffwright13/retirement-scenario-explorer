/**
 * Monte Carlo Chart Component - Visualizes Monte Carlo analysis results
 * Provides various chart types for statistical analysis visualization
 */
export class MonteCarloChart {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentAnalysis = null;
    this.charts = new Map(); // Store chart instances
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Monte Carlo display events
   */
  setupEventListeners() {
    // Listen for SPECIFIC Monte Carlo event to avoid main chart interference
    this.eventBus.on('montecarlo:display-monte-carlo-charts', (data) => {
      this.currentAnalysis = data.analysis;
      this.displayMonteCarloCharts(data); // Use separate method name
    });

    // Listen for chart type changes
    this.eventBus.on('montecarlo:chart-type-changed', (data) => {
      this.switchChartType(data.chartType);
    });
  }

  /**
   * Display Monte Carlo specific charts - RENAMED to avoid confusion
   */
  displayMonteCarloCharts(data) {
    console.log('📊 MonteCarloChart: Displaying Monte Carlo charts with data:', data);
    console.log('📊 Data type:', typeof data, 'Keys:', data ? Object.keys(data) : 'none');
    
    // Store minimum success balance for chart rendering
    this.currentMinimumSuccessBalance = data.analysis?.metadata?.minimumSuccessBalance || 0;
    console.log('📊 Stored minimum success balance:', this.currentMinimumSuccessBalance);
    
    // Ensure the Monte Carlo results section is visible
    const monteCarloSection = document.getElementById('monte-carlo-section-results');
    if (monteCarloSection) {
      monteCarloSection.style.display = 'block';
      console.log('📊 Monte Carlo results section made visible');
    }
    
    // Extract results from the event bus data structure
    const results = data.results || data;
    const scenarioData = data.scenarioData || this.currentScenarioData;
    
    console.log('📊 Extracted results length:', Array.isArray(results) ? results.length : 'not array');
    console.log('📊 Scenario data:', scenarioData ? 'present' : 'missing');
    
    // Display trajectory overlay in the dedicated Monte Carlo chart container
    this.displayTrajectoryOverlay(results, scenarioData, 'monte-carlo-chart-area');
  }

  /**
   * Export chart data as CSV
   */
  exportData() {
    if (!this.currentTrajectories || this.currentTrajectories.length === 0) {
      console.log('📊 MonteCarloChart: No data to export');
      return;
    }

    // Export percentile data for debugging
    const percentileData = this.calculatePercentileData(this.currentTrajectories);
    
    let csvContent = 'Year,P10,P25,P50_Median,P75,P90,ActiveScenarios\n';
    
    percentileData.forEach(data => {
      csvContent += `${data.month.toFixed(2)},${data.p10.toFixed(2)},${data.p25.toFixed(2)},${data.p50.toFixed(2)},${data.p75.toFixed(2)},${data.p90.toFixed(2)},${data.activeCount}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monte_carlo_percentiles.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('📊 MonteCarloChart: Percentile data exported to CSV');
  }

  /**
   * Calculate percentile data with active scenario count for debugging
   */
  calculatePercentileData(trajectories) {
    const maxMonths = Math.max(...trajectories.map(t => t.length));
    const percentileData = [];
    
    for (let month = 0; month < maxMonths; month++) {
      const monthBalances = trajectories
        .map(t => {
          if (month >= t.length) {
            return null;
          } else {
            return t[month].totalBalance;
          }
        })
        .filter(balance => balance !== null)
        .sort((a, b) => a - b);

      const activeCount = monthBalances.length;
      const minSampleSize = Math.max(10, trajectories.length * 0.1);
      
      if (activeCount >= minSampleSize) {
        percentileData.push({
          month: month / 12,
          p10: this.percentile(monthBalances, 10) / 1000,
          p25: this.percentile(monthBalances, 25) / 1000,
          p50: this.percentile(monthBalances, 50) / 1000,
          p75: this.percentile(monthBalances, 75) / 1000,
          p90: this.percentile(monthBalances, 90) / 1000,
          activeCount: activeCount
        });
      }
    }
    
    return percentileData;
  }

  /**
   * Render all charts
   */
  render(data) {
    if (!data || !data.analysis) {
      console.warn('MonteCarloChart: No data to render');
      return;
    }

    this.clearCanvas();
    
    // Render different chart types based on available data
    this.renderDistributionChart(data.analysis.statistics.finalBalance);
    this.renderRiskMetrics(data.analysis.riskMetrics);
    this.renderSuccessRate(data.analysis.successRate);
    
    // Render trajectory overlay if we have raw results
    if (data.results && data.results.length > 0) {
      this.renderTrajectoryOverlay(data.results, data.baselineScenario);
    }
  }

  /**
   * Create dedicated Monte Carlo chart container
   */
  createMonteCarloChartContainer() {
    let container = document.getElementById('monte-carlo-charts');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'monte-carlo-charts';
      container.className = 'monte-carlo-charts';
      
      // Insert in Monte Carlo RESULTS section, NOT config section
      const monteCarloResultsSection = document.getElementById('monte-carlo-section-results');
      if (monteCarloResultsSection) {
        // Find the monte-carlo-charts div that already exists in the HTML
        const existingChartsDiv = monteCarloResultsSection.querySelector('#monte-carlo-charts');
        if (existingChartsDiv) {
          container = existingChartsDiv; // Use existing div instead of creating new one
        } else {
          monteCarloResultsSection.appendChild(container);
        }
      } else {
        console.warn('Monte Carlo results section not found');
        return null;
      }
    }
    
    // Create trajectory chart container
    if (!document.getElementById('monte-carlo-trajectory-chart')) {
      const trajectoryContainer = document.createElement('div');
      trajectoryContainer.id = 'monte-carlo-trajectory-chart';
      trajectoryContainer.className = 'monte-carlo-trajectory-container';
      trajectoryContainer.innerHTML = `
        <div class="trajectory-chart-area"></div>
      `;
      container.appendChild(trajectoryContainer);
    }
  }

  /**
   * Create main container for Monte Carlo charts
   */
  createMainContainer() {
    const container = document.createElement('div');
    container.id = 'monte-carlo-charts';
    container.className = 'monte-carlo-charts';
    
    // Insert after the main chart or in a dedicated section
    const insertPoint = document.getElementById('chart-container') || document.body;
    insertPoint.parentNode.insertBefore(container, insertPoint.nextSibling);
    
    return container;
  }

  /**
   * Display distribution chart (histogram)
   */
  displayDistributionChart(statistics, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create histogram data
    const histogramData = this.createHistogramData(statistics);
    
    // Draw histogram
    this.drawHistogram(ctx, histogramData, {
      title: 'Final Balance Distribution',
      xLabel: 'Final Balance ($)',
      yLabel: 'Frequency',
      width: canvas.width,
      height: canvas.height
    });
    
    // Add percentile markers
    this.addPercentileMarkers(ctx, statistics, canvas.width, canvas.height);
  }

  /**
   * Display confidence interval chart
   */
  displayConfidenceIntervalChart(statistics, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Prepare data for confidence intervals
    const metrics = Object.keys(statistics);
    const confidenceData = metrics.map(metric => ({
      name: this.formatMetricName(metric),
      median: statistics[metric].median,
      p10: statistics[metric].percentiles[10],
      p90: statistics[metric].percentiles[90],
      min: statistics[metric].min,
      max: statistics[metric].max
    }));
    
    this.drawConfidenceIntervals(ctx, confidenceData, {
      width: canvas.width,
      height: canvas.height,
      title: 'Confidence Intervals (10th - 90th percentile)'
    });
  }

  /**
   * Display risk metrics chart
   */
  displayRiskChart(riskMetrics, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw risk metrics visualization
    this.drawRiskMetrics(ctx, riskMetrics, {
      width: canvas.width,
      height: canvas.height,
      title: 'Risk Analysis'
    });
  }

  /**
   * Display scenario paths chart
   */
  displayScenarioPathsChart(results, scenarioData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sample a subset of scenarios for visualization
    const sampleSize = Math.min(50, results.length);
    const sampledResults = this.sampleResults(results, sampleSize);
    
    this.drawScenarioPaths(ctx, sampledResults, {
      width: canvas.width,
      height: canvas.height,
    });
  }

  /**
   * Display success rate as a gauge chart
   */
  displaySuccessRateChart(analysis, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const successRate = analysis.successRate * 100;
    
    container.innerHTML = `
      <div class="success-rate-gauge">
        <div class="gauge-circle">
          <div class="gauge-fill" style="--success-rate: ${successRate}%"></div>
          <div class="gauge-text">
            <span class="rate">${successRate.toFixed(1)}%</span>
            <span class="label">Success Rate</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Display trajectory overlay in dedicated container
   */
  displayTrajectoryOverlay(results, scenarioData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('⚠️ Monte Carlo trajectory container not found:', containerId);
      return;
    }

    // Use the container directly since it IS the chart area now
    const chartArea = container;
    console.log('📊 Using container as chart area:', containerId, container);
    
    console.log('📊 MonteCarloChart: Creating trajectory overlay with results:', results);
    
    // Check if results is actually an array
    if (!Array.isArray(results)) {
      console.error('❌ Results is not an array:', typeof results, results);
      chartArea.innerHTML = '<p class="error">Invalid results data - expected array</p>';
      return;
    }
    
    console.log('📊 MonteCarloChart: Creating trajectory overlay with', results.length, 'results');

    try {
      // Extract trajectory data from Monte Carlo results
      const trajectories = this.extractTrajectories(results);
      
      if (trajectories.length === 0) {
        chartArea.innerHTML = '<p class="error">No valid trajectory data available for visualization</p>';
        console.warn('⚠️ No trajectories extracted from Monte Carlo results');
        return;
      }

      console.log(`📊 Successfully extracted ${trajectories.length} trajectories`);

      // Create canvas for trajectory visualization
      const canvas = document.createElement('canvas');
      canvas.width = 1000;  // Increased for better resolution
      canvas.height = 500;  // Increased for better resolution
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      
      console.log('📊 Created canvas:', canvas, 'Size:', canvas.width, 'x', canvas.height);
      
      const ctx = canvas.getContext('2d');
      console.log('📊 Canvas context:', ctx);
      
      // Find the longest trajectory to set chart bounds
      const maxMonths = Math.max(...trajectories.map(t => t.length));
      const allBalances = trajectories.flat().map(point => point.totalBalance);
      const maxBalance = Math.max(...allBalances);
      const minBalance = Math.min(...allBalances, 0);

      console.log(`📊 Chart bounds: ${maxMonths} months, $${minBalance.toFixed(0)} to $${maxBalance.toFixed(0)}`);
      console.log(`📊 Drawing ${trajectories.length} individual trajectories`);

      // Convert to Plotly instead of Canvas
      this.createPlotlyChart(trajectories, chartArea);

    } catch (error) {
      console.error('⚡ Error rendering trajectory overlay:', error);
      chartArea.innerHTML = `<p class="error">Error rendering trajectory visualization: ${error.message}</p>`;
    }
  }

  /**
   * Create interactive Plotly chart for Monte Carlo trajectories
   */
  createPlotlyChart(trajectories, container) {
    console.log('📊 Creating Plotly chart with', trajectories.length, 'trajectories');
    
    const traces = [];
    
    // Individual trajectory traces (rainbow colors, higher opacity)
    const rainbowColors = [
      'rgba(255, 99, 132, 0.3)',   // Red
      'rgba(54, 162, 235, 0.3)',   // Blue
      'rgba(255, 205, 86, 0.3)',   // Yellow
      'rgba(75, 192, 192, 0.3)',   // Teal
      'rgba(153, 102, 255, 0.3)',  // Purple
      'rgba(255, 159, 64, 0.3)',   // Orange
      'rgba(199, 199, 199, 0.3)',  // Grey
      'rgba(83, 102, 255, 0.3)',   // Indigo
      'rgba(255, 99, 255, 0.3)',   // Pink
      'rgba(99, 255, 132, 0.3)'    // Green
    ];
    
    trajectories.forEach((trajectory, index) => {
      const x = trajectory.map((_, monthIndex) => monthIndex / 12); // Convert to years
      const y = trajectory.map(point => point.totalBalance / 1000); // Convert to thousands
      const colorIndex = index % rainbowColors.length;
      
      traces.push({
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: rainbowColors[colorIndex],
          width: 1.0,
          smoothing: 1.3
        },
        showlegend: false,
        hovertemplate: `Scenario ${index + 1}<br>Year: %{x:.1f}<br>Balance: $%{y:.0f}K<extra></extra>`
      });
    });

    // Calculate percentiles for bands
    const maxMonths = Math.max(...trajectories.map(t => t.length));
    const percentileData = [];
    
    for (let month = 0; month < maxMonths; month++) {
      const monthBalances = trajectories
        .map(t => {
          if (month >= t.length) {
            return 0; // Scenario has ended, use 0 for percentile calculation (not null)
          } else {
            return t[month].totalBalance;
          }
        })
        .sort((a, b) => a - b);

      // Only calculate percentiles if we have enough active scenarios for stable statistics
      if (monthBalances.length >= Math.max(10, trajectories.length * 0.1)) {
        percentileData.push({
          month: month / 12, // Convert to years
          p10: this.percentile(monthBalances, 10) / 1000,
          p25: this.percentile(monthBalances, 25) / 1000,
          p50: this.percentile(monthBalances, 50) / 1000,
          p75: this.percentile(monthBalances, 75) / 1000,
          p90: this.percentile(monthBalances, 90) / 1000
        });
      }
    }

    // 10th-90th percentile band
    traces.push({
      x: percentileData.map(d => d.month),
      y: percentileData.map(d => d.p90),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'transparent' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    traces.push({
      x: percentileData.map(d => d.month),
      y: percentileData.map(d => d.p10),
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(66, 139, 202, 0.35)',
      line: { color: 'transparent' },
      name: '10th-90th Percentile',
      hovertemplate: '10th-90th Percentile<br>Year: %{x:.1f}<br>Range: $%{y:.0f}K<extra></extra>'
    });

    // 25th-75th percentile band
    traces.push({
      x: percentileData.map(d => d.month),
      y: percentileData.map(d => d.p75),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'transparent' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    traces.push({
      x: percentileData.map(d => d.month),
      y: percentileData.map(d => d.p25),
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(66, 139, 202, 0.55)',
      line: { color: 'transparent' },
      name: '25th-75th Percentile',
      hovertemplate: '25th-75th Percentile<br>Year: %{x:.1f}<br>Range: $%{y:.0f}K<extra></extra>'
    });

    // Median line
    traces.push({
      x: percentileData.map(d => d.month),
      y: percentileData.map(d => d.p50),
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#d9534f',
        width: 3
      },
      name: 'Median',
      hovertemplate: 'Median<br>Year: %{x:.1f}<br>Balance: $%{y:.0f}K<extra></extra>'
    });

    // Minimum success balance line (if nonzero)
    const minimumSuccessBalance = this.currentMinimumSuccessBalance || 0;
    if (minimumSuccessBalance > 0) {
      const maxYears = maxMonths / 12;
      traces.push({
        x: [0, maxYears],
        y: [minimumSuccessBalance / 1000, minimumSuccessBalance / 1000],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: '#d9534f',
          width: 2,
          dash: 'dash'
        },
        name: `Min Success: $${(minimumSuccessBalance / 1000).toFixed(0)}K`,
        hovertemplate: `Min Success Balance<br>$${(minimumSuccessBalance / 1000).toFixed(0)}K<extra></extra>`
      });
    }

    // Layout configuration
    const layout = {
      title: {
        text: '',
        font: { size: 16 }
      },
      xaxis: {
        title: 'Years',
        showgrid: true,
        gridcolor: 'rgba(128, 128, 128, 0.2)'
      },
      yaxis: {
        title: 'Balance ($K)',
        showgrid: true,
        gridcolor: 'rgba(128, 128, 128, 0.2)'
      },
      hovermode: 'closest',
      showlegend: true,
      legend: {
        x: 1,
        y: 1,
        xanchor: 'right',
        yanchor: 'top'
      },
      margin: { l: 60, r: 60, t: 40, b: 60 },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white'
    };

    // Configuration options
    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'monte-carlo-analysis',
        height: 500,
        width: 1000,
        scale: 1
      }
    };

    // Clear container and create plot
    container.innerHTML = '';
    
    // Create plot
    Plotly.newPlot(container, traces, layout, config);

    console.log('✅ Monte Carlo Plotly chart created successfully');
  }

  /**
   * Helper method to safely extract total balance trajectory from Monte Carlo result data
   * Handles the Monte Carlo wrapper structure: { iteration, scenario, result, timestamp }
   * @param {Object} monteCarloResult - Monte Carlo simulation result wrapper
   * @returns {Array} Array of {month, totalBalance} objects
   */
  extractBalanceTrajectory(monteCarloResult) {
    console.log('🔍 Extracting trajectory from Monte Carlo result:', {
      hasResult: !!monteCarloResult.result,
      resultKeys: monteCarloResult.result ? Object.keys(monteCarloResult.result) : 'none'
    });

    // Monte Carlo results are wrapped: { iteration, scenario, result: {processed simulation data}, timestamp }
    const processedResult = monteCarloResult.result;
    
    if (!processedResult || !processedResult.results) {
      console.warn('⚠️ Invalid processed result structure for trajectory extraction');
      return [];
    }
    
    // processedResult.results contains the actual timeaware engine output
    const simulationResult = processedResult.results;
    
    if (!simulationResult || !simulationResult.results || !simulationResult.balanceHistory) {
      console.warn('⚠️ Invalid simulation result structure for trajectory extraction');
      return [];
    }
    
    // simulationResult.results is the monthly array from timeaware engine
    const monthlyData = simulationResult.results;
    const balanceHistory = simulationResult.balanceHistory;
    
    if (!Array.isArray(monthlyData)) {
      console.warn('⚠️ Monthly data is not an array');
      return [];
    }
    
    console.log('🔍 Found monthly data:', monthlyData.length, 'months');
    console.log('🔍 Found balance history for assets:', Object.keys(balanceHistory));
    
    // balanceHistory is an object: { "Savings": [100000, 99000, ...], "Investment": [...] }
    // We need to sum all asset balances for each month
    const trajectory = monthlyData.map((month, monthIndex) => {
      let totalBalance = 0;
      
      // Iterate over each asset's balance history
      for (const [assetName, balances] of Object.entries(balanceHistory)) {
        if (Array.isArray(balances) && balances[monthIndex] !== undefined) {
          totalBalance += parseFloat(balances[monthIndex]) || 0;
        }
      }
      
      return {
        month: monthIndex,
        totalBalance: totalBalance
      };
    });
    
    // Analyze trajectory pattern to understand upward jump timing and magnitude
    const firstBalance = trajectory[0]?.totalBalance || 0;
    const lastBalance = trajectory[trajectory.length - 1]?.totalBalance || 0;
    const midBalance = trajectory[Math.floor(trajectory.length / 2)]?.totalBalance || 0;
    
    console.log('✅ Extracted trajectory with', trajectory.length, 'months');
    console.log(`📊 Trajectory pattern: Start=$${firstBalance.toFixed(0)}, Mid=$${midBalance.toFixed(0)}, End=$${lastBalance.toFixed(0)}`);
    
    // Detect upward jumps and their timing
    let upwardJumps = [];
    for (let i = 1; i < trajectory.length; i++) {
      const prevBalance = trajectory[i-1].totalBalance;
      const currBalance = trajectory[i].totalBalance;
      const percentIncrease = ((currBalance - prevBalance) / prevBalance) * 100;
      
      if (percentIncrease > 5) { // 5% month-over-month increase
        const timelinePosition = (i / trajectory.length) * 100;
        upwardJumps.push({
          month: i,
          timelinePosition: timelinePosition.toFixed(1),
          increase: percentIncrease.toFixed(1),
          fromBalance: prevBalance.toFixed(0),
          toBalance: currBalance.toFixed(0)
        });
      }
    }
    
    if (upwardJumps.length > 0) {
      console.warn(`🚨 UPWARD JUMPS DETECTED (${upwardJumps.length} jumps):`);
      upwardJumps.forEach(jump => {
        console.warn(`  Month ${jump.month} (${jump.timelinePosition}% through): +${jump.increase}% ($${jump.fromBalance} → $${jump.toBalance})`);
      });
      
      // Check if jumps are concentrated in last 20%
      const lateJumps = upwardJumps.filter(jump => parseFloat(jump.timelinePosition) > 80);
      if (lateJumps.length > 0) {
        console.warn(`🔥 ${lateJumps.length}/${upwardJumps.length} jumps occur in LAST 20% of timeline - this suggests auto-stop + continued growth issue!`);
        console.warn(`💡 THEORY: Auto-stop prevents withdrawals but assets continue earning returns, creating artificial upward jumps`);
      }
    }
    
    if (lastBalance > firstBalance * 1.5) {
      console.warn('🚨 HOCKEY STICK DETECTED: End balance is 50%+ higher than start - this suggests unrealistic growth vs withdrawal patterns');
    }
    
    return trajectory;
  }

  /**
   * Extract trajectory data from Monte Carlo results - UPDATED FOR CORRECT DATA STRUCTURE
   */
  extractTrajectories(results) {
    console.log('🔍 extractTrajectories: Processing', results.length, 'results');
    console.log('🔍 First result structure:', Object.keys(results[0] || {}));
    
    const trajectories = [];

    results.forEach((monteCarloResult, index) => {
      console.log(`🔍 Processing result ${index}:`, {
        hasResult: !!monteCarloResult.result,
        resultKeys: monteCarloResult.result ? Object.keys(monteCarloResult.result) : 'none',
        hasResultProperty: 'result' in monteCarloResult,
        directResultStructure: typeof monteCarloResult.result
      });

      const trajectory = this.extractBalanceTrajectory(monteCarloResult);
      
      if (trajectory.length > 0) {
        trajectories.push(trajectory);
        console.log(`✅ Extracted trajectory ${index} with ${trajectory.length} months`);
      } else {
        console.warn(`⚠️ Skipping result ${index} - no valid trajectory data`);
      }
    });

    console.log(`📊 Extracted ${trajectories.length} trajectories from ${results.length} results`);
    return trajectories;
  }

  /**
   * Draw percentile bands for trajectory visualization
   */
  drawPercentileBands(ctx, trajectories, maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight) {
    if (trajectories.length === 0) return;

    // Calculate percentiles for each month
    const percentileData = [];
    for (let month = 0; month < maxMonths; month++) {
      const monthBalances = trajectories
        .map(t => {
          // If trajectory ended (ran out of money), use 0 for percentile calculation
          if (month >= t.length) {
            return 0;
          } else {
            return t[month].totalBalance;
          }
        })
        .sort((a, b) => a - b);

      if (monthBalances.length > 0) {
        percentileData.push({
          month,
          p10: this.percentile(monthBalances, 10),
          p25: this.percentile(monthBalances, 25),
          p75: this.percentile(monthBalances, 75),
          p90: this.percentile(monthBalances, 90)
        });
      }
    }

    // Draw 25th-75th percentile band (LIGHTER so lines show through)
    ctx.fillStyle = 'rgba(66, 139, 202, 0.1)';  // Much more transparent
    this.drawPercentileBand(ctx, percentileData, 'p25', 'p75', maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight);

    // Draw 10th-90th percentile band (VERY LIGHT)
    ctx.fillStyle = 'rgba(66, 139, 202, 0.05)';  // Very transparent
    this.drawPercentileBand(ctx, percentileData, 'p10', 'p90', maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight);
  }

  /**
   * Draw a percentile band between two percentile lines
   */
  drawPercentileBand(ctx, percentileData, lowerKey, upperKey, maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight) {
    if (percentileData.length < 2) return;

    ctx.beginPath();
    
    // Draw upper line
    percentileData.forEach((point, index) => {
      const x = padding + (point.month / maxMonths) * chartWidth;
      const y = padding + chartHeight - ((point[upperKey] - minBalance) / (maxBalance - minBalance)) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Draw lower line (in reverse)
    for (let i = percentileData.length - 1; i >= 0; i--) {
      const point = percentileData[i];
      const x = padding + (point.month / maxMonths) * chartWidth;
      const y = padding + chartHeight - ((point[lowerKey] - minBalance) / (maxBalance - minBalance)) * chartHeight;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw median trajectory line
   */
  drawMedianTrajectory(ctx, trajectories, maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight) {
    if (trajectories.length === 0) return;

    ctx.strokeStyle = '#d9534f';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let lastValidPoint = null;
    
    for (let month = 0; month < maxMonths; month++) {
      // Get ALL trajectories and their balance at this month (0 if trajectory ended)
      const monthBalances = trajectories.map(t => {
        if (t.length > month) {
          return t[month].totalBalance;
        } else {
          // Trajectory ended (ran out of money) - use 0 for median calculation
          return 0;
        }
      }).sort((a, b) => a - b);

      if (monthBalances.length > 0) {
        const median = this.percentile(monthBalances, 50);
        const x = padding + (month / maxMonths) * chartWidth;
        const y = padding + chartHeight - ((median - minBalance) / (maxBalance - minBalance)) * chartHeight;
        
        // If median hits zero, stop drawing the line to avoid misleading visualization
        if (median <= 0) {
          if (lastValidPoint) {
            // Draw line to zero and stop cleanly
            ctx.lineTo(x, padding + chartHeight - ((0 - minBalance) / (maxBalance - minBalance)) * chartHeight);
            ctx.stroke();
          }
          break; // Stop drawing median line
        }
        
        if (month === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        lastValidPoint = { x, y, month };
      }
    }

    ctx.stroke();
  }

  /**
   * Draw minimum success balance line if nonzero
   */
  drawMinimumSuccessBalanceLine(ctx, maxMonths, maxBalance, minBalance, padding, chartWidth, chartHeight) {
    // Get minimum success balance from the current analysis config
    const minimumSuccessBalance = this.currentMinimumSuccessBalance || 0;
    
    if (minimumSuccessBalance > 0 && minimumSuccessBalance >= minBalance && minimumSuccessBalance <= maxBalance) {
      ctx.strokeStyle = '#d9534f';  // Match median line color
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);  // Dashed line
      
      const y = padding + chartHeight - ((minimumSuccessBalance - minBalance) / (maxBalance - minBalance)) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
      
      // Add label
      ctx.setLineDash([]);  // Reset to solid line
      ctx.fillStyle = '#d9534f';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Min Success: $${(minimumSuccessBalance / 1000).toFixed(0)}K`, padding + 10, y - 5);
    }
  }

  /**
   * Draw chart axes and labels
   */
  drawAxes(ctx, width, height, padding, maxMonths, maxBalance, minBalance) {
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis labels (balance)
    const balanceRange = maxBalance - minBalance;
    for (let i = 0; i <= 5; i++) {
      const value = minBalance + (balanceRange * i / 5);
      const y = height - padding - (i / 5) * (height - 2 * padding);
      
      ctx.textAlign = 'right';
      ctx.fillText(`$${(value / 1000).toFixed(0)}K`, padding - 10, y + 4);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      ctx.strokeStyle = '#666';
    }

    // X-axis labels (years)
    for (let i = 0; i <= 5; i++) {
      const months = (maxMonths * i / 5);
      const years = months / 12;
      const x = padding + (i / 5) * (width - 2 * padding);
      
      ctx.textAlign = 'center';
      ctx.fillText(`${years.toFixed(0)}y`, x, height - padding + 20);
    }
  }

  /**
   * Add interactive legend with clear explanations
   */
  addInteractiveLegend(container, trajectoryCount, analysis) {
    const legend = document.createElement('div');
    legend.className = 'monte-carlo-legend';
    legend.style.cssText = `
      background: #f8f9fa;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    const successRate = (analysis.successRate * 100).toFixed(1);
    
    legend.innerHTML = `
      <div class="legend-header" style="margin-bottom: 15px;">
        <h4 style="color: #d9534f; margin: 0 0 10px 0; font-size: 18px;">🔍 CHART LEGEND - What Each Line Means</h4>
        <p style="margin: 0; font-size: 14px; color: #666;"><strong>Total Asset Balance:</strong> Combined balance across all assets (Savings, Investment, Traditional IRA, Roth IRA)</p>
      </div>
      
      <div class="legend-items" style="display: grid; gap: 12px;">
        <div class="legend-item" style="display: flex; align-items: center; gap: 12px; padding: 8px; background: white; border-radius: 4px;">
          <span class="legend-color" style="background: #d9534f; height: 4px; width: 30px; display: block; border-radius: 2px;"></span>
          <span class="legend-text" style="font-weight: bold; color: #d9534f; font-size: 16px;">🔴 THICK BROWN/RED LINE = MEDIAN TRAJECTORY</span>
          <span style="color: #666; font-size: 14px;">- Most likely outcome (${successRate}% success rate)</span>
        </div>
        
        <div class="legend-item" style="display: flex; align-items: center; gap: 12px; padding: 8px; background: white; border-radius: 4px;">
          <span class="legend-color" style="background: rgba(0, 150, 0, 0.6); height: 2px; width: 30px; display: block;"></span>
          <span class="legend-text"><strong>Thin Colored Lines</strong> - ${trajectoryCount} individual market scenarios</span>
        </div>
        
        <div class="legend-item" style="display: flex; align-items: center; gap: 12px; padding: 8px; background: white; border-radius: 4px;">
          <span class="legend-color" style="background: rgba(100, 149, 237, 0.3); height: 20px; width: 30px; display: block;"></span>
          <span class="legend-text"><strong>Dark Blue Band</strong> - 25th-75th percentile (middle 50% of outcomes)</span>
        </div>
        
        <div class="legend-item" style="display: flex; align-items: center; gap: 12px; padding: 8px; background: white; border-radius: 4px;">
          <span class="legend-color" style="background: rgba(173, 216, 230, 0.3); height: 20px; width: 30px; display: block;"></span>
          <span class="legend-text"><strong>Light Blue Band</strong> - 10th-90th percentile (80% of all outcomes)</span>
        </div>
      </div>
      
      <div class="legend-note" style="margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-size: 14px;"><strong>⚠️ About the Brown Line's Jaggedness:</strong> The median line can appear jagged because it's calculated month-by-month from different scenarios. Market volatility and the auto-stop feature (when assets run low) can create sharp changes in the median calculation.</p>
      </div>
    `;
    
    container.appendChild(legend);
  }

  /**
   * Add X-axis toggle control
   */
  addAxisToggle(container) {
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'axis-toggle-container';
    toggleContainer.innerHTML = `
      <div class="axis-toggle">
        <label>X-Axis: </label>
        <button id="axis-years-btn" class="axis-btn axis-btn--active">Years from now</button>
        <button id="axis-dates-btn" class="axis-btn">MM-YYYY</button>
      </div>
    `;
    
    container.appendChild(toggleContainer);
    
    // Add event listeners for toggle
    const yearsBtn = toggleContainer.querySelector('#axis-years-btn');
    const datesBtn = toggleContainer.querySelector('#axis-dates-btn');
    
    yearsBtn.addEventListener('click', () => {
      yearsBtn.classList.add('axis-btn--active');
      datesBtn.classList.remove('axis-btn--active');
      // TODO: Redraw chart with years axis
    });
    
    datesBtn.addEventListener('click', () => {
      datesBtn.classList.add('axis-btn--active');
      yearsBtn.classList.remove('axis-btn--active');
      // TODO: Redraw chart with dates axis
    });
  }

  /**
   * Add enhanced educational explanation
   */
  addEducationalExplanation(container, analysis) {
    const explanation = document.createElement('div');
    explanation.className = 'chart-explanation';
    
    const successRate = (analysis.successRate * 100).toFixed(1);
    const failureRate = (100 - analysis.successRate * 100).toFixed(1);
    
    explanation.innerHTML = `
      <div class="explanation-box">
        <h5>📊 Understanding Your Monte Carlo Analysis</h5>
        <p><strong>What you're seeing:</strong> Each line shows how your retirement savings might perform under different market conditions over time.</p>
        
        <div class="explanation-grid">
          <div class="explanation-item">
            <strong>🎯 Success Rate: ${successRate}%</strong>
            <p>Percentage of scenarios where you don't run out of money</p>
          </div>
          <div class="explanation-item">
            <strong>📈 Individual Lines</strong>
            <p>Each represents a different possible market scenario</p>
          </div>
          <div class="explanation-item">
            <strong>🔵 Blue Bands</strong>
            <p>Show the range where most outcomes (50% and 80%) fall</p>
          </div>
          <div class="explanation-item">
            <strong>🔴 Red Line</strong>
            <p>The median (most likely) outcome</p>
          </div>
        </div>
        
        <div class="key-takeaway">
          <strong>💡 Key Takeaway:</strong> 
          ${successRate >= 80 ? 
            'Your plan looks robust across most market scenarios!' : 
            successRate >= 60 ? 
            'Your plan works in most scenarios, but consider adjustments for more security.' :
            'Consider adjusting your plan - many scenarios show running out of money.'
          }
        </div>
      </div>
    `;
    
    container.appendChild(explanation);
  }

  /**
   * Legacy method for compatibility
   */
  addTrajectoryLegend(container, trajectoryCount = 0) {
    // Legacy method - redirect to new interactive legend
    this.addInteractiveLegend(container, trajectoryCount, { successRate: 0.75 }); // Default success rate
  }

  /**
   * Calculate percentile of an array
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Create histogram data from statistics
   */
  createHistogramData(statistics, bins = 30) {
    const { min, max } = statistics;
    const binWidth = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    // This is a simplified version - in reality, you'd need the raw data
    // For now, we'll create a synthetic histogram based on normal distribution
    const { mean, stdDev } = statistics;
    
    for (let i = 0; i < bins; i++) {
      const binCenter = min + (i + 0.5) * binWidth;
      const normalizedValue = (binCenter - mean) / stdDev;
      histogram[i] = Math.exp(-0.5 * normalizedValue * normalizedValue);
    }
    
    // Normalize to make it look like a proper frequency distribution
    const maxCount = Math.max(...histogram);
    return histogram.map((count, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: (count / maxCount) * 100 // Scale for visualization
    }));
  }

  /**
   * Draw histogram
   */
  drawHistogram(ctx, histogramData, options) {
    const { width, height, title, xLabel, yLabel } = options;
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Set up scales
    const maxCount = Math.max(...histogramData.map(d => d.count));
    const minValue = Math.min(...histogramData.map(d => d.binStart));
    const maxValue = Math.max(...histogramData.map(d => d.binEnd));
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw bars
    const barWidth = chartWidth / histogramData.length;
    ctx.fillStyle = 'rgba(54, 162, 235, 0.7)';
    
    histogramData.forEach((bin, i) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const x = margin.left + i * barWidth;
      const y = height - margin.bottom - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  /**
   * Add percentile markers to histogram
   */
  addPercentileMarkers(ctx, statistics, width, height) {
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    
    const percentiles = [10, 25, 50, 75, 90];
    const colors = ['#ff6b6b', '#ffa726', '#66bb6a', '#ffa726', '#ff6b6b'];
    
    percentiles.forEach((p, i) => {
      const value = statistics.percentiles[p];
      const x = margin.left + ((value - statistics.min) / (statistics.max - statistics.min)) * chartWidth;
      
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = colors[i];
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${p}th`, x, margin.top - 5);
    });
    
    ctx.setLineDash([]);
  }

  /**
   * Draw confidence intervals
   */
  drawConfidenceIntervals(ctx, confidenceData, options) {
    const { width, height, title } = options;
    const margin = { top: 50, right: 30, bottom: 100, left: 120 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
    
    const barHeight = chartHeight / confidenceData.length;
    
    confidenceData.forEach((metric, i) => {
      const y = margin.top + i * barHeight + barHeight / 2;
      
      // Draw confidence interval bar
      const minX = margin.left;
      const maxX = margin.left + chartWidth;
      const range = metric.max - metric.min;
      
      if (range > 0) {
        const p10X = minX + ((metric.p10 - metric.min) / range) * chartWidth;
        const p90X = minX + ((metric.p90 - metric.min) / range) * chartWidth;
        const medianX = minX + ((metric.median - metric.min) / range) * chartWidth;
        
        // Draw confidence interval
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(p10X, y);
        ctx.lineTo(p90X, y);
        ctx.stroke();
        
        // Draw median marker
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(medianX, y - 10);
        ctx.lineTo(medianX, y + 10);
        ctx.stroke();
      }
      
      // Draw metric name
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(metric.name, margin.left - 10, y + 4);
    });
  }

  /**
   * Draw risk metrics visualization
   */
  drawRiskMetrics(ctx, riskMetrics, options) {
    const { width, height, title } = options;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
    
    // Create a simple risk dashboard
    const metrics = [
      { label: 'Value at Risk (5%)', value: riskMetrics.valueAtRisk, format: 'currency' },
      { label: 'Conditional VaR', value: riskMetrics.conditionalVaR, format: 'currency' },
      { label: 'Max Drawdown (95th %ile)', value: riskMetrics.maxDrawdown.percentiles[95], format: 'percentage' }
    ];
    
    const boxWidth = width / 3 - 20;
    const boxHeight = 100;
    const startY = 80;
    
    metrics.forEach((metric, i) => {
      const x = 10 + i * (boxWidth + 20);
      
      // Draw box
      ctx.strokeStyle = '#ddd';
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(x, startY, boxWidth, boxHeight);
      ctx.strokeRect(x, startY, boxWidth, boxHeight);
      
      // Draw label
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(metric.label, x + boxWidth / 2, startY + 20);
      
      // Draw value
      ctx.fillStyle = '#333';
      ctx.font = 'bold 18px Arial';
      const formattedValue = this.formatValue(metric.value, metric.format);
      ctx.fillText(formattedValue, x + boxWidth / 2, startY + 50);
    });
  }

  /**
   * Draw scenario paths - UPDATED
   */
  drawScenarioPaths(ctx, sampledResults, options) {
    const { width, height, title } = options;
    const margin = { top: 50, right: 30, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Scenario Paths', width / 2, 25);
    
    // Extract trajectories using our helper method
    const trajectories = [];
    sampledResults.forEach(({ result }) => {
      const trajectory = this.extractBalanceTrajectory(result);
      if (trajectory.length > 0) {
        trajectories.push(trajectory);
      }
    });
    
    if (trajectories.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No valid trajectory data available', width / 2, height / 2);
      return;
    }
    
    // Find bounds
    const maxMonths = Math.max(...trajectories.map(t => t.length));
    const allBalances = trajectories.flat().map(point => point.totalBalance);
    const maxBalance = Math.max(...allBalances);
    
    console.log(`📊 Drawing ${trajectories.length} scenario paths`);
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw scenario paths
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    trajectories.forEach((trajectory, i) => {
      const hue = (i * 137.5) % 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
      
      ctx.beginPath();
      trajectory.forEach((point, monthIndex) => {
        const x = margin.left + (monthIndex / maxMonths) * chartWidth;
        const y = height - margin.bottom - (point.totalBalance / maxBalance) * chartHeight;
        
        if (monthIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Months', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Balance ($)', 0, 0);
    ctx.restore();
  }

  /**
   * Draw success rate analysis
   */
  drawSuccessRateAnalysis(ctx, analysis, options) {
    const { width, height, title } = options;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
    
    // Draw success rate gauge
    const centerX = width / 2;
    const centerY = height / 2 + 20;
    const radius = Math.min(width, height) / 4;
    
    // Background arc
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.stroke();
    
    // Success rate arc
    const successRate = analysis.successRate;
    const successAngle = Math.PI + (successRate * Math.PI);
    
    const color = successRate > 0.8 ? '#4caf50' : successRate > 0.6 ? '#ff9800' : '#f44336';
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, successAngle);
    ctx.stroke();
    
    // Draw percentage text
    ctx.fillStyle = color;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${(successRate * 100).toFixed(1)}%`, centerX, centerY + 10);
    
    // Draw label
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.fillText('Success Rate', centerX, centerY + 40);
  }

  /**
   * Sample results for visualization
   */
  sampleResults(results, sampleSize) {
    if (results.length <= sampleSize) return results;
    
    const step = Math.floor(results.length / sampleSize);
    return results.filter((_, i) => i % step === 0).slice(0, sampleSize);
  }

  /**
   * Format metric names for display
   */
  formatMetricName(metricName) {
    const nameMap = {
      finalBalance: 'Final Balance',
      shortfallMonths: 'Shortfall Months',
      maxDrawdown: 'Max Drawdown',
      timeToDepletion: 'Time to Depletion',
      totalWithdrawals: 'Total Withdrawals'
    };
    
    return nameMap[metricName] || metricName;
  }

  /**
   * Format values for display
   */
  formatValue(value, format) {
    switch (format) {
      case 'currency':
        return `$${(value / 1000).toFixed(0)}K`;
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toFixed(2);
    }
  }

  /**
   * Switch chart type (for future extensibility)
   */
  switchChartType(chartType) {
    console.log(`📊 MonteCarloChart: Switching to chart type: ${chartType}`);
    // Implementation for different chart types
  }

  /**
   * Export charts as images
   */
  exportCharts() {
    const charts = document.querySelectorAll('#monte-carlo-charts canvas');
    charts.forEach((canvas, i) => {
      const link = document.createElement('a');
      link.download = `monte-carlo-chart-${i + 1}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  }

  /**
   * Clear all charts
   */
  clearCharts() {
    const charts = document.querySelectorAll('#monte-carlo-charts canvas');
    charts.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }
}
