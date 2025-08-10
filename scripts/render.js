/**
 * Rendering Module
 * Handles chart and CSV visualization
 * Pure rendering logic - no business logic or DOM manipulation outside of rendering
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
 */
export function renderChart(results, balanceHistory, title = "Retirement Simulation", scenarioMeta = {}) {
  const chartArea = document.getElementById("chart-area");
  if (!chartArea) {
    console.error('Chart area element not found');
    return;
  }

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  const xLabels = results.map((r) => {
    const date = new Date(startYear, startMonth + r.month);
    return date.toISOString().slice(0, 7);
  });

  const tickInterval = results.length > 120 ? 12 : 6;
  const filteredTicks = xLabels.filter((_, i) => i % tickInterval === 0);

  // Prepare windfall visualization if applicable
  let windfallLine = null;
  let windfallAnnotation = null;

  if (typeof scenarioMeta.windfallUsedAtMonth === "number") {
    const windfallMonthIndex = scenarioMeta.windfallUsedAtMonth;
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

  // Prepare main data traces
  const incomes = results.map((r) => r.income);
  const expenses = results.map((r) => r.expenses);
  const shortfalls = results.map((r) => r.shortfall);

  const traces = [
    {
      x: xLabels,
      y: incomes,
      name: "Income",
      type: "scatter",
      line: { color: "green" },
    },
    {
      x: xLabels,
      y: expenses,
      name: "Expenses",
      type: "scatter",
      line: { color: "red" },
    },
    {
      x: xLabels,
      y: shortfalls,
      name: "Shortfall",
      type: "bar",
      marker: { color: "orange" },
    },
  ];

  // Add asset balance traces
  for (const [assetName, balances] of Object.entries(balanceHistory)) {
    traces.push({
      x: xLabels.slice(0, balances.length),
      y: balances,
      name: `${assetName} Balance`,
      type: "scatter",
      line: { dash: "dot" },
    });
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
      automargin: true
    },
    yaxis: {
      title: "Amount ($)",
      showgrid: true,
      gridcolor: "#ddd",
      zeroline: false,
      automargin: true
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
      // Force resize after initial render
      Plotly.Plots.resize(chartArea);
      
      // Add window resize handler
      const resizeHandler = () => {
        if (chartArea.style.display !== 'none') {
          Plotly.Plots.resize(chartArea);
        }
      };
      
      // Remove existing handler if any
      window.removeEventListener('resize', window._chartResizeHandler);
      window._chartResizeHandler = resizeHandler;
      window.addEventListener('resize', resizeHandler);
      
      console.log('✅ Chart rendered successfully with full width');
    });
  } catch (error) {
    console.error('Failed to render chart:', error);
  }
}