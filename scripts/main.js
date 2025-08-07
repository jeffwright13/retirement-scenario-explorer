// import { simulateScenario } from './engine.js';

/**
 * Calculates total income for a given month.
 *
 * Iterates through all income sources in the scenario and adds up the monthly
 * amounts for any sources that are active during the given month.
 * An income source is considered active if:
 *  - Its start_month is less than or equal to the current month
 *  - Its stop_month is either undefined (i.e., never stops) or not yet reached
 *
 * @param {Array} incomeArray - List of income sources from the scenario
 * @param {number} currentMonth - The month to evaluate (e.g., 0 = month 1)
 * @returns {number} Total income for that month
 */
function getMonthlyIncome(incomeArray, currentMonth) {
  return incomeArray.reduce((total, source) => {
    if (
      source.start_month <= currentMonth &&
      (source.stop_month === undefined || source.stop_month >= currentMonth)
    ) {
      return total + source.amount;
    }
    return total;
  }, 0);
}

// Toggle visibility of the JSON input panel
document.getElementById("toggle-json-btn").addEventListener("click", () => {
  const jsonDiv = document.getElementById("json-container");
  jsonDiv.classList.toggle("collapsed");
  jsonDiv.classList.toggle("expanded");
});

// Toggle visibility of the CSV output panel
document.getElementById("toggle-csv-btn").addEventListener("click", () => {
  const csvDiv = document.getElementById("csv-container");
  csvDiv.classList.toggle("collapsed");
  csvDiv.classList.toggle("expanded");
});

/**
 * Updates the top-of-page scenario header with title and notes.
 *
 * If metadata includes a title or notes, this function inserts them
 * into the corresponding DOM elements and makes the header visible.
 * Otherwise, it clears the contents and hides the header.
 *
 * @param {Object} metadata - Optional metadata object with scenario info
 * @param {string} [metadata.title] - Scenario title to display
 * @param {string} [metadata.notes] - Additional notes or description
 */
function updateHeaderFromMetadata(metadata) {
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
 * Simulates the monthly cash flow and asset drawdown over the plan duration.
 *
 * Uses income, expenses, asset balances, withdrawal order, and interest rates
 * to calculate monthly results. Returns both the full results and per-asset
 * balance history. Also generates a CSV output inside the #csv-container.
 *
 * @param {Object} scenario - Full scenario config with plan, income, assets, order, etc.
 * @returns {Object} { results, balanceHistory }
 */
function simulateScenario(scenario) {
  // Prep asset structures and CSV headers. This section is mostly initial setup:
  //   Clone scenario input
  //   Sort drawdown order
  //   Prep CSV and chart scaffolding
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || [];
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));
  const assetNames = assets.map((a) => a.name);
  const csvRows = [["Month", "Date", "Income", "Expenses", "Shortfall", ...assetNames]];
  const incomeSources = scenario.income || [];
  const results = [];

  // Creates a history log for each asset’s balance — used for charts.
  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  // Get income and calculate shortfall for each month in the plan
  for (let month = 0; month < scenario.plan.duration_months; month++) {
    const incomeThisMonth = getMonthlyIncome(incomeSources, month);
    const shortfall = scenario.plan.monthly_expenses - incomeThisMonth;
    let remainingShortfall = shortfall;

    // Log structure for the month. This object holds everything that happened in this month:
    // Income
    // Expenses
    // Withdrawals from each account
    // Remaining shortfall (if any)
    let monthlyLog = {
      month,
      income: incomeThisMonth,
      expenses: scenario.plan.monthly_expenses,
      withdrawals: [],
      shortfall: 0,
    };
    // At this point, we know:
    // How much money came in (income)
    // How much is needed (expenses)
    // What the gap is (shortfall)
    // That we’ll try to fill that gap by pulling from accounts next

    // Pull from nonzero assets in withdrawal order
    for (const entry of drawOrder) {
      const asset = assetMap[entry.account];
      if (!asset || asset.balance <= 0) continue;

      // Withdraw only as much as needed (or as much as the asset has)
      const withdrawal = Math.min(asset.balance, remainingShortfall);
      asset.balance -= withdrawal;
      remainingShortfall -= withdrawal;

      // Record the withdrawal in the log, showing which asset it came from and how much;
      monthlyLog.withdrawals.push({ from: asset.name, amount: withdrawal });

      // if shortfall is covered, stop withdrawing from acount
      if (remainingShortfall <= 0) break;
    }

    // If we couldn’t fully cover expenses even after all withdrawals, log the 
    // remaining deficit as an unrecovered shortfall for this month
    if (remainingShortfall > 0) {
      monthlyLog.shortfall = remainingShortfall;
    }

    // Apply interest to all eligible assets
    // Notes:
    //  assumes interest is applied afer withdrawals
    //  monthly compounding only supported now
    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate && asset.compounding === "monthly") {
        asset.balance *= 1 + asset.interest_rate / 12;
      }
    }

    // Store results for this month
    results.push(monthlyLog);
    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }

    
    // Generate the CSV row and finalize the loop
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + month);
    const row = [
      month + 1,
      date.toISOString().slice(0, 7),
      incomeThisMonth.toFixed(2),
      scenario.plan.monthly_expenses.toFixed(2),
      monthlyLog.shortfall.toFixed(2),
      ...assetNames.map((name) => balanceHistory[name][month].toFixed(2)),
    ];
    csvRows.push(row);
  }


  // Write the CSV output to the page
  document.getElementById("csv-container").textContent = csvRows.map((r) => r.join(",")).join("\n");
  document.getElementById("csv-container").classList.remove("expanded");

  // Returns two core data structures:
  //   results: Array of month-by-month logs (income, expenses, withdrawals, shortfall)
  //   balanceHistory: Time series of each asset’s balance over time
  // These are later used to build the chart.
  return { results, balanceHistory };
}


// "Run Simulation" button handler
document.getElementById("run-btn").addEventListener("click", () => {

  // Read and parse scenario JSON from the input box
  const jsonText = document.getElementById("json-input").value;
  let scenario;

  try {
    scenario = JSON.parse(jsonText);
  } catch (err) {
    alert("Invalid JSON: " + err.message);
    return;
  }

  // Convert legacy field (withdrawal_priority) to new format (order)
  if (scenario.withdrawal_priority && !scenario.order) {
    console.warn("⚠️ 'withdrawal_priority' is deprecated. Use 'order' instead.");
    scenario.order = scenario.withdrawal_priority.map((item) => ({
      account: item.account,
      order: item.priority,
    }));
  }

  // Run the simulation and unpack the result
  updateHeaderFromMetadata(scenario.metadata);
  const { results, balanceHistory } = simulateScenario(scenario);

  // Generate x-axis date labels for each month
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const xLabels = results.map((r) => {
    const date = new Date(startYear, startMonth + r.month);
    return date.toISOString().slice(0, 7);
  });

  // Choose tick spacing
  const tickInterval = scenario.plan.duration_months > 120 ? 12 : 6;
  const filteredTicks = xLabels.filter((_, i) => i % tickInterval === 0);

  // Build data for Plotly
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
    title: scenario.metadata?.title || "Retirement Simulation",
    xaxis: {
      title: "Date (YYYY-MM)",
      tickangle: -45,
      tickmode: "array",
      tickvals: filteredTicks,
      ticktext: filteredTicks,
      showgrid: true,      // ✅ enables vertical gridlines
      gridcolor: "#ddd",   // optional, lighter gridlines
      zeroline: false
    },
    yaxis: {
      title: "Amount ($)",
      showgrid: true,      // ✅ enables horizontal gridlines
      gridcolor: "#ddd",
      zeroline: false
    },
    barmode: "overlay",
    margin: {
      l: 60,
      r: 30,
      t: 60,
      b: 80
    }
  };

  // Render the chart
  Plotly.newPlot("chart-area", traces, layout);

  // Collapse JSON input and scroll to chart
  document.getElementById("json-container").classList.remove("expanded");
  document.getElementById("json-container").classList.add("collapsed");
  document.getElementById("chart-area").scrollIntoView({ behavior: "smooth" });
});
