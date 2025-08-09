import { getMonthlyIncome } from './utils.js';

/**
 * Run the retirement simulation on the provided scenario.
 * Calculates income, expenses, shortfalls, asset withdrawals, and interest.
 * Returns both detailed logs and a CSV export string.
 *
 * @param {Object} scenario - The scenario config
 * @returns {{ results: Array, balanceHistory: Object, csvText: string, windfallUsedAtMonth: number|undefined }}
 */
export function simulateScenario(scenario) {
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || assets.map((asset, index) => ({ account: asset.name, order: index + 1 }));
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));
  const assetNames = assets.map((a) => a.name);
  const incomeSources = scenario.income || [];
  const depositEvents = scenario.deposits || [];
  const results = [];

  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  // We'll build CSV AFTER the loop so the header includes dynamic assets
  const csvRows = [];

  // FIXED: Separate deposit processing from income processing
  function applyDeposits(month) {
    // Only process deposits, not income sources
    for (const event of depositEvents) {
      if (
        typeof event.start_month === "number" &&
        typeof event.stop_month === "number" &&
        event.start_month <= month &&
        event.stop_month >= month &&
        typeof event.amount === "number"
      ) {
        const targetName = event.target || event.name;

        if (!assetMap[targetName]) {
          assetMap[targetName] = {
            name: targetName,
            type: "taxable",
            balance: 0,
            interest_rate: 0.0,
            compounding: "monthly",
            dynamic: true
          };
          assets.push(assetMap[targetName]);
          balanceHistory[targetName] = [];
          assetNames.push(targetName);
        }

        assetMap[targetName].balance += event.amount;
      }
    }
  }

  // ---- Main simulation loop ----
  for (let month = 0; month < scenario.plan.duration_months; month++) {
    // FIXED: Only apply deposits, not income (income is handled by getMonthlyIncome)
    applyDeposits(month);

    // FIXED: Use 1-based month indexing for income calculation to match JSON expectations
    const income = getMonthlyIncome(incomeSources, month + 1);
    const shortfall = scenario.plan.monthly_expenses - income;
    let remainingShortfall = shortfall;

    const log = {
      month,
      income,
      expenses: scenario.plan.monthly_expenses,
      withdrawals: [],
      shortfall: 0,
    };

    // Withdraw to cover shortfall using draw order
    for (const entry of drawOrder) {
      const asset = assetMap[entry.account];
      if (!asset || asset.balance <= 0) continue;

      const withdrawal = Math.min(asset.balance, remainingShortfall);
      asset.balance -= withdrawal;

      if (!scenario._windfallUsedAtMonth && asset.dynamic && withdrawal > 0) {
        scenario._windfallUsedAtMonth = month;
      }

      remainingShortfall -= withdrawal;
      log.withdrawals.push({ from: asset.name, amount: withdrawal });

      if (remainingShortfall <= 0) break;
    }

    if (remainingShortfall > 0) {
      log.shortfall = remainingShortfall;
    }

    // Monthly compounding
    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate && asset.compounding === "monthly") {
        asset.balance *= 1 + asset.interest_rate / 12;
      }
    }

    results.push(log);

    // Snapshot balances for this month - FIXED: Only include actual assets, not income sources
    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }
  }

  // ---- Build CSV after the loop - FIXED: Only include actual asset balances, not income tracking ----
  const realAssetNames = assets.filter(a => !a.dynamic || a.balance > 0).map(a => a.name);
  csvRows.push(["Month", "Date", "Income", "Expenses", "Shortfall", ...realAssetNames]);

  for (let m = 0; m < scenario.plan.duration_months; m++) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + m);
    const r = results[m];

    const assetCells = realAssetNames.map((name) => {
      const v = balanceHistory[name]?.[m];
      return typeof v === "number" ? v.toFixed(2) : "0.00";
    });

    csvRows.push([
      m + 1,
      date.toISOString().slice(0, 7),
      (r?.income ?? 0).toFixed(2),
      scenario.plan.monthly_expenses.toFixed(2),
      (r?.shortfall ?? 0).toFixed(2),
      ...assetCells
    ]);
  }

  const csvText = csvRows.map(r => r.join(",")).join("\n");

  return {
    results,
    balanceHistory,
    csvText,
    windfallUsedAtMonth: scenario._windfallUsedAtMonth
  };
}