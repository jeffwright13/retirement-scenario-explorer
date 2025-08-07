/**
 * Update the top-of-page scenario header with title and notes.
 *
 * If metadata includes a title or notes, this function inserts them
 * into the corresponding DOM elements and makes the header visible.
 * Otherwise, it clears the contents and hides the header.
 *
 * @param {Object} metadata - Optional metadata object with scenario info
 * @param {string} [metadata.title] - Scenario title to display
 * @param {string} [metadata.notes] - Additional notes or description
 */
export function updateHeaderFromMetadata(metadata) {
  const header = document.getElementById("scenario-header");
  const title = document.getElementById("scenario-title");
  const notes = document.getElementById("scenario-notes");

  if (metadata?.title || metadata?.notes) {
    title.textContent = metadata.title || "";
    notes.textContent = metadata.notes || "";
    header.classList.remove("hidden");
  } else {
    title.textContent = "";
    notes.textContent = "";
    header.classList.add("hidden");
  }
}

/**
 * Render the CSV output into the CSV container.
 *
 * @param {string} csvText - CSV-formatted simulation output
 */
export function renderCsv(csvText) {
  const container = document.getElementById("csv-container");
  container.textContent = csvText;
  container.classList.remove("expanded");
}

/**
 * Render the simulation chart using Plotly.
 *
 * @param {Array} results - Simulation result logs
 * @param {Object} balanceHistory - Time-series balances per asset
 * @param {string} title - Chart title (usually from metadata)
 */
export function renderChart(results, balanceHistory, title = "Retirement Simulation") {
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  const xLabels = results.map((r) => {
    const date = new Date(startYear, startMonth + r.month);
    return date.toISOString().slice(0, 7);
  });

  const tickInterval = results.length > 120 ? 12 : 6;
  const filteredTicks = xLabels.filter((_, i) => i % tickInterval === 0);

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

  for (const [assetName, balances] of Object.entries(balanceHistory)) {
    traces.push({
      x: xLabels.slice(0, balances.length),
      y: balances,
      name: `${assetName} Balance`,
      type: "scatter",
      line: { dash: "dot" },
    });
  }

  const layout = {
    title,
    xaxis: {
      title: "Date (YYYY-MM)",
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
    barmode: "overlay",
    margin: {
      l: 60, r: 30, t: 60, b: 80
    }
  };

  Plotly.newPlot("chart-area", traces, layout);
}
