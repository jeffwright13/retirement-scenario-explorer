function simulateScenario(scenario) {
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || [];
  const assetMap = Object.fromEntries(assets.map(a => [a.name, a]));
  const results = [];

  for (let month = 1; month <= scenario.plan.duration_months; month++) {
    let shortfall = scenario.plan.monthly_expenses - scenario.plan.monthly_income;
    let monthlyLog = { month, withdrawals: [], shortfall: 0 };

    for (const entry of drawOrder) {
      const asset = assetMap[entry.account];
      if (!asset || asset.balance <= 0) continue;

      const withdrawal = Math.min(asset.balance, shortfall);
      asset.balance -= withdrawal;
      shortfall -= withdrawal;

      monthlyLog.withdrawals.push({ from: asset.name, amount: withdrawal });
      if (shortfall <= 0) break;
    }

    if (shortfall > 0) {
      monthlyLog.shortfall = shortfall;
      results.push(monthlyLog);
      break; // Out of money
    }

    // Apply monthly growth
    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate && asset.compounding === "monthly") {
        asset.balance *= (1 + asset.interest_rate / 12);
      }
    }

    results.push(monthlyLog);
  }

  return results;
}

document.getElementById('run-btn').addEventListener('click', () => {
  const jsonText = document.getElementById('json-input').value;
  let scenario;

  try {
    scenario = JSON.parse(jsonText);
  } catch (err) {
    alert("Invalid JSON: " + err.message);
    return;
  }

  // Legacy fallback (optional)
  if (scenario.withdrawal_priority && !scenario.order) {
    console.warn("⚠️ 'withdrawal_priority' is deprecated. Use 'order' instead.");
    scenario.order = scenario.withdrawal_priority.map(item => ({
      account: item.account,
      order: item.priority
    }));
  }

  const results = simulateScenario(scenario);
  document.getElementById("chart-area").textContent = JSON.stringify(results, null, 2);

  // Collapse input
  const jsonDiv = document.getElementById('json-container');
  jsonDiv.classList.remove('expanded');
  jsonDiv.classList.add('collapsed');
});

document.getElementById('toggle-json-btn').addEventListener('click', () => {
  const jsonDiv = document.getElementById('json-container');
  jsonDiv.classList.toggle('collapsed');
  jsonDiv.classList.toggle('expanded');
});
