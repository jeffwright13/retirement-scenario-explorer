/**
 * Fixed Rendering Module
 * Handles chart and CSV visualization
 * FIXES: Chart truncation, shortfall visualization
 */

/**
 * Render the CSV output into the CSV container with proper show/hide management.
 */
export function renderCsv(csvText) {
  const container = document.getElementById("csv-container");
  const csvSection = document.getElementById("csv-section");

  if (!container || !csvSection) {
    console.error('CSV rendering elements not found');
    return;
  }

  // Set the CSV content
  container.textContent = csvText;

  // DON'T automatically show the CSV section - keep it hidden by default
  // Users can manually open it via the Advanced Options if needed
  console.log('✅ CSV data prepared (hidden by default)');
}

/**
 * Render the simulation chart using Plotly with full width optimization.
 * FIXED: Chart truncation and shortfall visualization
 */
export function renderChart(results, balanceHistory, title = "Retirement Simulation", scenarioMeta = {}) {
  const chartArea = document.getElementById("chart-area");
  if (!chartArea) {
    console.error('Chart area element not found');
    return;
  }

  console.log(`📊 Rendering chart with ${results.length} data points`);

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  // FIXED: Create xLabels for ALL results, not filtered
  const xLabels = results.map((r) => {
    const date = new Date(startYear, startMonth + r.month);
    return date.toISOString().slice(0, 7);
  });

  // FIXED: Improved tick filtering - show more ticks for shorter simulations
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

  const filteredTicks = xLabels.filter((_, i) => i % tickInterval === 0);

  // Always include the last tick to show the end
  if (xLabels.length > 0 && !filteredTicks.includes(xLabels[xLabels.length - 1])) {
    filteredTicks.push(xLabels[xLabels.length - 1]);
  }

  console.log(`📊 Using tick interval: ${tickInterval}, filtered ticks: ${filteredTicks.length}`);

  // Prepare windfall visualization if applicable
  let windfallLine = null;
  let windfallAnnotation = null;

  if (typeof scenarioMeta.windfallUsedAtMonth === "number") {
    const windfallMonthIndex = scenarioMeta.windfallUsedAtMonth;
    if (windfallMonthIndex < xLabels.length) {
      const windfallDate = xLabels[windfallMonthIndex];

      windfallLine = {
        type: "line",
        x0: windfallDate,
        x1: windfallDate,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: {
          color: "orange",
          width: 2,
          dash: "dot"
        }
      };

      windfallAnnotation = {
        x: windfallDate,
        y: 1,
        yref: "paper",
        text: "Windfall Used",
        showarrow: true,
        arrowhead: 6,
        ax: 0,
        ay: -40,
        font: {
          color: "orange",
          size: 12
        }
      };
    }
  }

  // Prepare main data traces
  const incomes = results.map((r) => r.income);
  const expenses = results.map((r) => r.expenses);
  const shortfalls = results.map((r) => r.shortfall);

  // NEW: Enhanced shortfall visualization
  const shortfallColors = shortfalls.map(shortfall => {
    if (shortfall > 0) {
      return 'red'; // Red for actual shortfalls
    } else {
      return 'orange'; // Orange for covered expenses
    }
  });

  const traces = [
    {
      x: xLabels,
      y: incomes,
      name: "Income",
      type: "scatter",
      line: { color: "green", width: 2 },
    },
    {
      x: xLabels,
      y: expenses,
      name: "Expenses",
      type: "scatter",
      line: { color: "red", width: 2 },
    },
    {
      x: xLabels,
      y: shortfalls,
      name: "Shortfall",
      type: "bar",
      marker: {
        color: shortfallColors,
        line: { color: 'darkred', width: 1 }
      },
      // NEW: Enhanced hover info for shortfalls
      hovertemplate: '<b>%{x}</b><br>' +
                     'Shortfall: $%{y:,.0f}<br>' +
                     '<extra></extra>'
    },
  ];

  // Add asset balance traces - FIXED: Handle all assets properly
  for (const [assetName, balances] of Object.entries(balanceHistory)) {
    if (balances && balances.length > 0) {
      // FIXED: Make sure we don't exceed the available data
      const validBalances = balances.slice(0, xLabels.length);
      const validXLabels = xLabels.slice(0, validBalances.length);

      traces.push({
        x: validXLabels,
        y: validBalances,
        name: `${assetName} Balance`,
        type: "scatter",
        line: { dash: "dot", width: 2 },
        // Enhanced hover info for balances
        hovertemplate: '<b>%{x}</b><br>' +
                       `${assetName}: $%{y:,.0f}<br>` +
                       '<extra></extra>'
      });

      console.log(`📊 Added ${assetName}: ${validBalances.length} data points`);
    }
  }

  // ENHANCED: Configure chart layout for full width
  const layout = {
    title: {
      text: title,
      font: { size: 18 }
    },
    hoverdistance: 50,
    autosize: true,
    responsive: true,
    width: null, // Let it auto-size
    height: 500, // Set reasonable height
    xaxis: {
      title: "Date",
      tickangle: -45,
      tickmode: "array",
      tickvals: filteredTicks,
      ticktext: filteredTicks,
      showgrid: true,
      gridcolor: "#ddd",
      zeroline: false,
      automargin: true,
      // FIXED: Make sure all data is visible
      range: [xLabels[0], xLabels[xLabels.length - 1]]
    },
    yaxis: {
      title: "Amount ($)",
      showgrid: true,
      gridcolor: "#ddd",
      zeroline: false,
      automargin: true,
      // Format y-axis labels with commas
      tickformat: ',.0f'
    },
    shapes: windfallLine ? [windfallLine] : [],
    annotations: windfallAnnotation ? [windfallAnnotation] : [],
    barmode: "overlay",
    margin: {
      l: 80, r: 20, t: 60, b: 100, // Adequate margins but not excessive
      autoexpand: true
    },
    showlegend: true,
    legend: {
      orientation: "h",
      x: 0,
      y: -0.2,
      bgcolor: "rgba(255,255,255,0.8)"
    }
  };

  // ENHANCED: Configure Plotly for full width responsiveness
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'retirement_scenario',
      height: 500,
      width: 1000,
      scale: 2
    }
  };

  // Clear any existing chart first
  chartArea.innerHTML = '';

  // ENHANCED: Render with explicit sizing
  try {
    Plotly.newPlot(chartArea, traces, layout, config).then(() => {
      // Skip initial resize to avoid errors - chart should auto-size properly
      console.log('📊 Chart rendered, skipping resize to avoid errors');

      // Add window resize handler
      const resizeHandler = () => {
        if (chartArea.offsetParent !== null && chartArea.style.display !== 'none') {
          Plotly.Plots.resize(chartArea);
        }
      };

      // Remove existing handler if any
      window.removeEventListener('resize', window._chartResizeHandler);
      window._chartResizeHandler = resizeHandler;
      window.addEventListener('resize', resizeHandler);

      console.log(`✅ Chart rendered successfully with ${results.length} data points and ${traces.length} traces`);
    });
  } catch (error) {
    console.error('Failed to render chart:', error);
  }
}
