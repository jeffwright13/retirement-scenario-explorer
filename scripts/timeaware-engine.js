/**
 * Time-Aware Simulation Engine - Enhanced with Auto-Stop and Proportional Withdrawals
 * Supports variable rates over time using rate schedules
 * Features: Auto-stop on shortfall, proportional withdrawals by weight, backward compatibility
 */

import { RateScheduleManager } from './rate-schedules.js';
import { getMonthlyIncome } from './utils.js';

// ---- WITHDRAWAL HELPER FUNCTIONS ----

/**
 * Process withdrawals with support for proportional withdrawals by weight
 */
function processWithdrawals(shortfall, drawOrder, assetMap, log) {
  let remainingShortfall = shortfall;

  // Group assets by order
  const orderGroups = new Map();
  drawOrder.forEach(entry => {
    const order = entry.order;
    if (!orderGroups.has(order)) {
      orderGroups.set(order, []);
    }
    orderGroups.get(order).push(entry);
  });

  // Process each order group sequentially
  const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

  for (const order of sortedOrders) {
    if (remainingShortfall <= 0) break;

    const group = orderGroups.get(order);

    if (group.length === 1) {
      // Single asset - existing logic
      remainingShortfall = withdrawFromSingleAsset(group[0], assetMap, remainingShortfall, log);
    } else {
      // Multiple assets with same order - check for weights
      const hasWeights = group.some(entry => typeof entry.weight === 'number');

      if (hasWeights) {
        // Proportional withdrawal by weight
        remainingShortfall = withdrawProportionally(group, assetMap, remainingShortfall, log);
      } else {
        // No weights specified - use existing sequential logic within the group
        for (const entry of group) {
          if (remainingShortfall <= 0) break;
          remainingShortfall = withdrawFromSingleAsset(entry, assetMap, remainingShortfall, log);
        }
      }
    }
  }

  return remainingShortfall;
}

/**
 * Withdraw from a single asset (standard sequential withdrawal)
 */
function withdrawFromSingleAsset(entry, assetMap, shortfall, log) {
  const asset = assetMap[entry.account];
  if (!asset || asset.balance <= 0) {
    return shortfall;
  }

  const withdrawal = Math.min(asset.balance, shortfall);
  asset.balance -= withdrawal;

  if (withdrawal > 0) {
    log.withdrawals.push({ from: asset.name, amount: withdrawal });
  }

  return shortfall - withdrawal;
}

/**
 * Withdraw proportionally from multiple assets based on weights
 */
function withdrawProportionally(assetGroup, assetMap, shortfall, log) {
  // Get available assets with their weights
  const availableAssets = assetGroup
    .map(entry => ({
      entry,
      asset: assetMap[entry.account],
      weight: entry.weight || 0
    }))
    .filter(({ asset, weight }) => asset && asset.balance > 0 && weight > 0);

  if (availableAssets.length === 0) {
    return shortfall; // No assets available
  }

  // Calculate normalized weights
  const totalWeight = availableAssets.reduce((sum, { weight }) => sum + weight, 0);
  const normalizedWeights = availableAssets.map(({ weight }) => weight / totalWeight);

  // Calculate total available balance
  const totalAvailable = availableAssets.reduce((sum, { asset }) => sum + asset.balance, 0);

  // Don't withdraw more than available
  const actualWithdrawal = Math.min(shortfall, totalAvailable);
  let remainingToWithdraw = actualWithdrawal;

  // Withdraw proportionally from each asset
  availableAssets.forEach(({ entry, asset }, index) => {
    if (remainingToWithdraw <= 0.01) return; // Small threshold to avoid floating point issues

    const proportion = normalizedWeights[index];
    let targetWithdrawal = actualWithdrawal * proportion;

    // Don't withdraw more than the asset has
    targetWithdrawal = Math.min(targetWithdrawal, asset.balance);

    // Don't withdraw more than we still need
    targetWithdrawal = Math.min(targetWithdrawal, remainingToWithdraw);

    if (targetWithdrawal > 0.01) { // Small threshold
      asset.balance -= targetWithdrawal;
      remainingToWithdraw -= targetWithdrawal;
      log.withdrawals.push({
        from: asset.name,
        amount: targetWithdrawal,
        weight: entry.weight,
        proportion: proportion
      });
    }
  });

  return shortfall - actualWithdrawal + remainingToWithdraw;
}

// ---- MAIN SIMULATION FUNCTION ----

export function simulateScenarioAdvanced(scenario) {
  console.log('🚀 Running Advanced Time-Aware Simulation with Auto-Stop and Proportional Withdrawals');

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

  // Auto-stop configuration
  const maxDuration = scenario.plan.duration_months;
  const stopOnShortfall = scenario.plan.stop_on_shortfall !== false; // Default: true
  const minDuration = Math.min(12, maxDuration); // Minimum 12 months or total duration

  console.log(`Auto-stop enabled: ${stopOnShortfall}, Min duration: ${minDuration}, Max duration: ${maxDuration}`);

  // Track balance history
  const balanceHistory = {};
  for (const name of assetNames) {
    balanceHistory[name] = [];
  }

  // ---- HELPER FUNCTIONS ----

  // Handle deposits
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

  // Get time-aware inflation-adjusted expenses
  function getInflationAdjustedExpenses(month) {
    const baseExpenses = scenario.plan.monthly_expenses;

    if (scenario.plan.inflation_schedule) {
      const monthlyInflationRate = rateManager.getRate(scenario.plan.inflation_schedule, month) / 12;
      return baseExpenses * Math.pow(1 + monthlyInflationRate, month);
    } else {
      // Legacy inflation support
      const inflationRate = scenario.plan.inflation_rate || 0;
      const yearsElapsed = Math.floor(month / 12);
      return baseExpenses * Math.pow(1 + inflationRate, yearsElapsed);
    }
  }

  // Get time-aware asset returns
  function getAssetReturns(asset, month) {
    if (asset.return_schedule) {
      // New rate schedule system
      return rateManager.getRate(asset.return_schedule, month) / 12;
    } else {
      // Legacy interest_rate system
      return (asset.interest_rate || 0) / 12;
    }
  }

  // ---- MAIN SIMULATION LOOP ----
  let actualDuration = maxDuration;

  for (let month = 0; month < maxDuration; month++) {
    // 1. Apply deposits
    applyDeposits(month);

    // 2. Calculate income and expenses
    const income = getMonthlyIncome(incomeSources, month + 1);
    const monthlyExpenses = getInflationAdjustedExpenses(month);
    const shortfall = monthlyExpenses - income;

    // 3. Initialize month log
    const log = {
      month,
      income,
      expenses: monthlyExpenses,
      withdrawals: [],
      shortfall: 0,
    };

    // 4. Process withdrawals (with proportional support)
    const remainingShortfall = processWithdrawals(shortfall, drawOrder, assetMap, log);

    if (remainingShortfall > 0) {
      log.shortfall = remainingShortfall;
    }

    // 5. Apply asset growth (FIXED: Now works with both old and new rate systems)
    for (const asset of Object.values(assetMap)) {
      // Support both new rate schedule system and legacy interest_rate system
      const shouldApplyReturns = asset.return_schedule ||
                                (asset.interest_rate && asset.compounding === "monthly");

      if (shouldApplyReturns) {
        const monthlyReturn = getAssetReturns(asset, month);
        asset.balance *= (1 + monthlyReturn);

        // Debug logging for first few months
        if (month < 3 && monthlyReturn > 0) {
          console.log(`Month ${month}: ${asset.name} return = ${(monthlyReturn * 12 * 100).toFixed(2)}% annually`);
        }
      }
    }

    // 6. Record results and balances
    results.push(log);

    for (const asset of assets) {
      balanceHistory[asset.name].push(asset.balance);
    }

    // 7. Check auto-stop condition
    if (stopOnShortfall && month >= minDuration && remainingShortfall > 0) {
      actualDuration = month + 1;
      console.log(`🛑 Auto-stopping simulation at month ${actualDuration} due to shortfall of $${remainingShortfall.toFixed(2)}`);
      break;
    }
  }

  // ---- POST-SIMULATION: BUILD CSV ----
  const csvRows = [];
  const realAssetNames = assets.filter(a => !a.dynamic || a.balance > 0).map(a => a.name);
  csvRows.push(["Month", "Date", "Income", "Expenses", "Shortfall", ...realAssetNames]);

  for (let m = 0; m < actualDuration; m++) {
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

  console.log(`✅ Advanced simulation completed - Duration: ${actualDuration} months`);
  console.log(`📊 Features used: proportional withdrawals, time-aware rates, auto-stop`);

  return {
    results,
    balanceHistory,
    csvText,
    windfallUsedAtMonth: scenario._windfallUsedAtMonth,
    actualDuration,
    rateManager // For debugging/inspection
  };
}
