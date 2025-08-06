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

document.getElementById("toggle-json-btn").addEventListener("click", () => {
  const jsonDiv = document.getElementById("json-container");
  jsonDiv.classList.toggle("collapsed");
  jsonDiv.classList.toggle("expanded");
});

document.getElementById("toggle-csv-btn").addEventListener("click", () => {
  const csvDiv = document.getElementById("csv-container");
  csvDiv.classList.toggle("collapsed");
  csvDiv.classList.toggle("expanded");
});

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

function simulateScenario(scenario) {
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || [];
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));
  const assetNames = assets.map((a) => a.name);
  const csvRows = [["Month", "Date", "Income", "Expenses", "Shortfall", ...assetNames]];
  const incomeSources = scenario.income || [];
  const results = [];

  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  for (let month = 0; month < scenario.plan.duration_months; month++) {
    const incomeThisMonth = getMonthlyIncome(incomeSources, month);
    const shortfall = scenario.plan.monthly_expenses - incomeThisMonth;
    let remainingShortfall = shortfall;
    let monthlyLog = {
      month,
      income: incomeThisMonth,
      expenses: scenario.plan.monthly_expenses,
      withdrawals: [],
      shortfall: 0,
    };

    for (const entry of drawOrder) {
      const asset = assetMap[entry.account];
      if (!asset || asset.balance <= 0) continue;

      const withdrawal = Math.min(asset.balance, remainingShortfall);
      asset.balance -= withdrawal;
      remainingShortfall -= withdrawal;

      monthlyLog.withdrawals.push({ from: asset.name, amount: withdrawal });
      if (remainingShortfall <= 0) break;
    }

    if (remainingShortfall > 0) {
      monthlyLog.shortfall = remainingShortfall;
    }

    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate && asset.compounding === "monthly") {
        asset.balance *= 1 + asset.interest_rate / 12;
      }
    }

    results.push(monthlyLog);
    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }

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

  document.getElementById("csv-table").textContent = csvRows.map((r) => r.join(",")).join("\n");
  document.getElementById("csv-container").classList.remove("expanded");

  return { results, balanceHistory };
}

document.getElementById("run-btn").addEventListener("click", () => {
  const jsonText = document.getElementById("json-input").value;
  let scenario;

  try {
    scenario = JSON.parse(jsonText);
  } catch (err) {
    alert("Invalid JSON: " + err.message);
    return;
  }

  if (scenario.withdrawal_priority && !scenario.order) {
    console.warn("⚠️ 'withdrawal_priority' is deprecated. Use 'order' instead.");
    scenario.order = scenario.withdrawal_priority.map((item) => ({
      account: item.account,
      order: item.priority,
    }));
  }

  // Update header from metadata
  updateHeaderFromMetadata(scenario.metadata);

  const { results, balanceHistory } = simulateScenario(scenario);

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  const xLabels = results.map((r) => {
    const date = new Date(startYear, startMonth + r.month);
    return date.toISOString().slice(0, 7);
  });

  const tickInterval = scenario.plan.duration_months > 120 ? 12 : 6;
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
    title: scenario.metadata?.title || "Retirement Simulation",
    xaxis: {
      title: "Date (YYYY-MM)",
      tickangle: -45,
      tickmode: "array",
      tickvals: filteredTicks,
      ticktext: filteredTicks,
    },
    yaxis: {
      title: "Amount ($)",
    },
    barmode: "overlay",
  };

  Plotly.newPlot("chart-area", traces, layout);

  document.getElementById("json-container").classList.remove("expanded");
  document.getElementById("json-container").classList.add("collapsed");
  document.getElementById("chart-area").scrollIntoView({ behavior: "smooth" });
});
