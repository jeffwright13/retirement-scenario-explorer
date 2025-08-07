import { getMonthlyIncome } from './utils.js';

/**
 * Run the retirement simulation on the provided scenario.
 * Calculates income, expenses, shortfalls, asset withdrawals, and interest.
 * Returns both detailed logs and a CSV export string.
 *
 * @param {Object} scenario - The scenario config
 * @returns {{ results: Array, balanceHistory: Object, csvText: string }}
 */
export function simulateScenario(scenario) {
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || [];
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));
  const assetNames = assets.map((a) => a.name);
  const incomeSources = scenario.income || [];
  const depositEvents = scenario.deposits || [];
  const results = [];

  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  const csvRows = [["Month", "Date", "Income", "Expenses", "Shortfall", ...assetNames]];

  function applyIncomeAndDeposits(month) {
    const events = [...incomeSources, ...depositEvents];
    for (const event of events) {
      if (
        event.start_month <= month &&
        event.end_month >= month &&
        typeof event.amount === "number"
      ) {
        const safeName = event.name ? event.name.replace(/\s+/g, "_") : "Untitled";
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


  for (let month = 0; month < scenario.plan.duration_months; month++) {
    applyIncomeAndDeposits(month);
    const income = getMonthlyIncome(incomeSources, month);
    const shortfall = scenario.plan.monthly_expenses - income;
    let remainingShortfall = shortfall;

    const log = {
      month,
      income,
      expenses: scenario.plan.monthly_expenses,
      withdrawals: [],
      shortfall: 0,
    };

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

    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate && asset.compounding === "monthly") {
        asset.balance *= 1 + asset.interest_rate / 12;
      }
    }

    results.push(log);
    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + month);
    const row = [
      month + 1,
      date.toISOString().slice(0, 7),
      income.toFixed(2),
      scenario.plan.monthly_expenses.toFixed(2),
      log.shortfall.toFixed(2),
      ...Object.keys(balanceHistory).map((name) => {
        const value = balanceHistory[name][month];
        return typeof value === "number" ? value.toFixed(2) : "0.00";
      })
    ];
    csvRows.push(row);
  }

  const csvText = csvRows.map(r => r.join(",")).join("\n");

  return {
    results,
    balanceHistory,
    csvText,
    windfallUsedAtMonth: scenario._windfallUsedAtMonth
  };
}
