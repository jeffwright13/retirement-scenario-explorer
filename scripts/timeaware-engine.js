/**
 * Time-Aware Simulation Engine - Prototype
 * Supports variable rates over time using rate schedules
 */

import { RateScheduleManager } from './rate-schedules.js';
import { getMonthlyIncome } from './utils.js';

export function simulateScenarioAdvanced(scenario) {
  console.log('🚀 Running Advanced Time-Aware Simulation');
  
  // Initialize rate schedule manager
  const rateManager = new RateScheduleManager();
  if (scenario.rate_schedules) {
    rateManager.loadSchedules(scenario.rate_schedules);
  }

  // Deep copy assets to avoid mutation
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || 
                   assets.map((asset, index) => ({ account: asset.name, order: index + 1 }));
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));
  const assetNames = assets.map((a) => a.name);
  const incomeSources = scenario.income || [];
  const depositEvents = scenario.deposits || [];
  const results = [];

  // Track balance history
  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  // Build CSV after simulation
  const csvRows = [];

  // Handle deposits (same as before)
  function applyDeposits(month) {
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

  // NEW: Get time-aware inflation-adjusted expenses
  function getInflationAdjustedExpenses(month) {
    const baseExpenses = scenario.plan.monthly_expenses;
    const monthlyInflationRate = rateManager.getRate(scenario.plan.inflation_schedule, month) / 12;
    const totalMonths = month;
    return baseExpenses * Math.pow(1 + monthlyInflationRate, totalMonths);
  }
  
  // NEW: Get time-aware asset returns
  // REMOVE the entire if/else and keep only the rate schedule version:
  function getAssetReturns(asset, month) {
    return rateManager.getRate(asset.return_schedule, month) / 12;
  }
  
  // ---- Main simulation loop ----
  for (let month = 0; month < scenario.plan.duration_months; month++) {
    applyDeposits(month);

    // Get income (same as before)
    const income = getMonthlyIncome(incomeSources, month + 1);
    
    // NEW: Time-aware inflation-adjusted expenses
    const monthlyExpenses = getInflationAdjustedExpenses(month);
    const shortfall = monthlyExpenses - income;
    let remainingShortfall = shortfall;

    const log = {
      month,
      income,
      expenses: monthlyExpenses,
      withdrawals: [],
      shortfall: 0,
    };

    // Withdraw to cover shortfall using draw order (same logic)
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

    // NEW: Time-aware asset growth
    for (const asset of Object.values(assetMap)) {
      if (asset.compounding === "monthly") {
        const monthlyReturn = getAssetReturns(asset, month);
        asset.balance *= (1 + monthlyReturn);
        
        // Debug logging for first few months
        if (month < 3) {
          console.log(`Month ${month}: ${asset.name} return = ${(monthlyReturn * 12 * 100).toFixed(2)}% annually`);
        }
      }
    }

    results.push(log);

    // Snapshot balances for this month
    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }
  }

  // Build CSV (same as before)
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
      (r?.expenses ?? 0).toFixed(2),
      (r?.shortfall ?? 0).toFixed(2),
      ...assetCells
    ]);
  }

  const csvText = csvRows.map(r => r.join(",")).join("\n");

  console.log('✅ Advanced simulation completed');

  return {
    results,
    balanceHistory,
    csvText,
    windfallUsedAtMonth: scenario._windfallUsedAtMonth,
    rateManager // Return for debugging/inspection
  };
}