/**
 * Rendering Module
 * Handles chart and CSV visualization
 * Pure rendering logic - no business logic or DOM manipulation outside of rendering
 */

/**
 * Render the CSV output into the CSV container and show the section.
 */
export function renderCsv(csvText) {
  const container = document.getElementById("csv-container");
  const csvSection = document.getElementById("csv-section");
  
  if (!container || !csvSection) {
    console.error('CSV rendering elements not found');
    return;
  }
  
  container.textContent = csvText;
  
  // Show the CSV section and container
  csvSection.classList.remove("collapsed");
  container.classList.remove("collapsed");
}

/**
 * Render the simulation chart using Plotly.
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

  // Configure chart layout
  const layout = {
    title,
    hoverdistance: 50,
    xaxis: {
      title: "Date",
      tickangle: -45,
      tickmode: "array",
      tickvals: filteredTicks,
      ticktext: filteredTicks,
      showgrid: true,
      gridcolor: "#ddd",
      zeroline: false
    },
    yaxis: {
      title: "Amount ($)",
      showgrid: true,
      gridcolor: "#ddd",
      zeroline: false
    },
    shapes: windfallLine ? [windfallLine] : [],
    annotations: windfallAnnotation ? [windfallAnnotation] : [],
    barmode: "overlay",
    margin: {
      l: 60, r: 30, t: 60, b: 80
    }
  };

  // Render the chart
  try {
    Plotly.newPlot("chart-area", traces, layout);
  } catch (error) {
    console.error('Failed to render chart:', error);
  }
}