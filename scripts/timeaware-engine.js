/**
 * Time-Aware Simulation Engine - Enhanced with Auto-Stop and Proportional Withdrawals
 * Supports variable rates over time using rate schedules
 * Features: Auto-stop on shortfall, proportional withdrawals by weight, backward compatibility
 */

import { RateScheduleManager } from './rate-schedules.js';
import { getMonthlyIncome } from './utils.js';
import { TaxService } from './services/TaxService.js';

// ---- WITHDRAWAL HELPER FUNCTIONS ----

/**
 * Process withdrawals with support for proportional withdrawals by weight and tax-aware calculations
 */
function processWithdrawals(shortfall, drawOrder, assetMap, log, taxService) {
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
      remainingShortfall = withdrawFromSingleAsset(group[0], assetMap, remainingShortfall, log, taxService);
    } else {
      // Multiple assets with same order - check for weights
      const hasWeights = group.some(entry => typeof entry.weight === 'number');

      if (hasWeights) {
        // Proportional withdrawal by weight
        remainingShortfall = withdrawProportionally(group, assetMap, remainingShortfall, log, taxService);
      } else {
        // No weights specified - use existing sequential logic within the group
        for (const entry of group) {
          if (remainingShortfall <= 0) break;
          remainingShortfall = withdrawFromSingleAsset(entry, assetMap, remainingShortfall, log, taxService);
        }
      }
    }
  }

  return remainingShortfall;
}

/**
 * Withdraw from a single asset with tax-aware calculations
 */
function withdrawFromSingleAsset(entry, assetMap, shortfall, log, taxService) {
  const asset = assetMap[entry.account];
  if (!asset || asset.balance <= 0) {
    return shortfall;
  }

  // Calculate available balance (respecting min_balance for emergency funds)
  const minBalance = asset.min_balance || 0;
  const availableBalance = Math.max(0, asset.balance - minBalance);
  
  if (availableBalance <= 0) {
    // Asset is protected by min_balance (emergency fund) - cannot withdraw
    return shortfall;
  }

  // Calculate tax-aware withdrawal amount
  const accountType = asset.type || 'taxable';
  const taxCalc = taxService.calculateGrossWithdrawal(shortfall, accountType);
  
  // Don't withdraw more than available, even if taxes require it
  const grossWithdrawal = Math.min(availableBalance, taxCalc.grossWithdrawal);
  
  // If we can't withdraw the full gross amount needed, recalculate net coverage
  let actualNetCovered, actualTaxOwed;
  if (grossWithdrawal < taxCalc.grossWithdrawal) {
    // Partial withdrawal - calculate actual net amount covered
    const partialTaxCalc = taxService.calculateTaxOnWithdrawal(grossWithdrawal, accountType);
    actualNetCovered = partialTaxCalc.netAmount;
    actualTaxOwed = partialTaxCalc.taxOwed;
  } else {
    // Full withdrawal as planned
    actualNetCovered = taxCalc.netAmount;
    actualTaxOwed = taxCalc.taxOwed;
  }

  asset.balance -= grossWithdrawal;

  if (grossWithdrawal > 0) {
    log.withdrawals.push({ 
      from: asset.name, 
      accountType: accountType,
      grossAmount: grossWithdrawal,
      netAmount: actualNetCovered,
      taxOwed: actualTaxOwed,
      effectiveTaxRate: actualTaxOwed / grossWithdrawal,
      remainingBalance: asset.balance,
      minBalance: minBalance,
      availableBalance: Math.max(0, asset.balance - minBalance)
    });
  }

  return shortfall - actualNetCovered;
}

/**
 * Withdraw proportionally from multiple assets based on weights with tax-aware calculations
 */
function withdrawProportionally(assetGroup, assetMap, shortfall, log, taxService) {
  // Get available assets with their weights (respecting min_balance)
  const availableAssets = assetGroup
    .map(entry => {
      const asset = assetMap[entry.account];
      const minBalance = asset?.min_balance || 0;
      const availableBalance = asset ? Math.max(0, asset.balance - minBalance) : 0;
      
      return {
        entry,
        asset,
        weight: entry.weight || 0,
        availableBalance
      };
    })
    .filter(({ asset, weight, availableBalance }) => asset && availableBalance > 0 && weight > 0);

  if (availableAssets.length === 0) {
    return shortfall; // No assets available
  }

  // Calculate normalized weights
  const totalWeight = availableAssets.reduce((sum, { weight }) => sum + weight, 0);
  const normalizedWeights = availableAssets.map(({ weight }) => weight / totalWeight);

  // Calculate total available balance (respecting min_balance)
  const totalAvailable = availableAssets.reduce((sum, { availableBalance }) => sum + availableBalance, 0);

  // Don't withdraw more than available
  const actualWithdrawal = Math.min(shortfall, totalAvailable);
  let remainingToWithdraw = actualWithdrawal;

  // Withdraw proportionally from each asset with tax-aware calculations
  availableAssets.forEach(({ entry, asset, availableBalance }, index) => {
    if (remainingToWithdraw <= 0.01) return; // Small threshold to avoid floating point issues

    const proportion = normalizedWeights[index];
    let targetNetWithdrawal = actualWithdrawal * proportion;

    // Calculate tax-aware gross withdrawal needed for this asset
    const accountType = asset.type || 'taxable';
    const taxCalc = taxService.calculateGrossWithdrawal(targetNetWithdrawal, accountType);
    
    // Don't withdraw more than the asset has available (respecting min_balance)
    const grossWithdrawal = Math.min(taxCalc.grossWithdrawal, availableBalance);
    
    // Don't withdraw more than we still need (in net terms)
    const maxNetNeeded = Math.min(targetNetWithdrawal, remainingToWithdraw);
    
    // Recalculate actual amounts based on constraints
    let actualGross, actualNet, actualTax;
    if (grossWithdrawal < taxCalc.grossWithdrawal) {
      // Constrained by available balance
      const constrainedCalc = taxService.calculateTaxOnWithdrawal(grossWithdrawal, accountType);
      actualGross = grossWithdrawal;
      actualNet = Math.min(constrainedCalc.netAmount, maxNetNeeded);
      actualTax = constrainedCalc.taxOwed;
    } else {
      // Can withdraw full amount
      actualGross = grossWithdrawal;
      actualNet = maxNetNeeded;
      actualTax = taxCalc.taxOwed;
    }

    if (actualGross > 0.01) { // Small threshold
      asset.balance -= actualGross;
      remainingToWithdraw -= actualNet;
      
      const minBalance = asset.min_balance || 0;
      log.withdrawals.push({
        from: asset.name,
        accountType: accountType,
        grossAmount: actualGross,
        netAmount: actualNet,
        taxOwed: actualTax,
        effectiveTaxRate: actualTax / actualGross,
        weight: entry.weight,
        proportion: proportion,
        remainingBalance: asset.balance,
        minBalance: minBalance,
        availableBalance: Math.max(0, asset.balance - minBalance)
      });
    }
  });

  return shortfall - actualWithdrawal + remainingToWithdraw;
}

// ---- MAIN SIMULATION FUNCTION ----

export function simulateScenarioAdvanced(scenario) {
  console.log('🚀 Running Advanced Time-Aware Simulation with Auto-Stop, Proportional Withdrawals, and Tax-Aware Calculations');

  // Initialize rate schedule manager
  const rateManager = new RateScheduleManager();
  if (scenario.rate_schedules) {
    rateManager.loadSchedules(scenario.rate_schedules);
  }

  // Initialize tax service with scenario configuration
  const taxConfig = scenario.plan?.tax_config || {};
  const taxService = new TaxService(taxConfig);

  // Deep copy assets to avoid mutation
  const allAssets = JSON.parse(JSON.stringify(scenario.assets));
  
  // Separate immediate vs delayed assets
  const immediateAssets = allAssets.filter(asset => !asset.start_month || asset.start_month <= 1);
  const delayedAssets = allAssets.filter(asset => asset.start_month && asset.start_month > 1);
  
  // Initialize with immediate assets only
  const assets = [...immediateAssets];
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) ||
                   allAssets.map((asset, index) => ({ account: asset.name, order: index + 1 }));
  const assetMap = Object.fromEntries(immediateAssets.map((a) => [a.name, a]));
  const allAssetNames = allAssets.map((a) => a.name); // All asset names for balance history
  const incomeSources = scenario.income || [];
  const depositEvents = scenario.deposits || [];
  const results = [];

  // Auto-stop configuration
  const maxDuration = scenario.plan.duration_months;
  const stopOnShortfall = scenario.plan.stop_on_shortfall !== false; // Default: true
  const minDuration = Math.min(12, maxDuration); // Minimum 12 months or total duration
  let autoStoppedMonth = null; // Track when auto-stop occurred

  console.log(`Auto-stop enabled: ${stopOnShortfall}, Min duration: ${minDuration}, Max duration: ${maxDuration}`);
  console.log(`Immediate assets: ${immediateAssets.length}, Delayed assets: ${delayedAssets.length}`);

  // Track balance history for ALL assets (including delayed ones)
  const balanceHistory = {};
  for (const name of allAssetNames) {
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

  // Activate delayed assets when their start_month is reached
  function activateDelayedAssets(month) {
    const currentMonth = month + 1; // Convert 0-based to 1-based month
    
    for (const delayedAsset of delayedAssets) {
      if (delayedAsset.start_month === currentMonth && !assetMap[delayedAsset.name]) {
        // Activate the delayed asset
        console.log(`🎯 Activating delayed asset "${delayedAsset.name}" at month ${currentMonth}`);
        
        // Add to active assets
        assets.push(delayedAsset);
        assetMap[delayedAsset.name] = delayedAsset;
        
        // Initialize balance history with zeros for previous months
        for (let i = 0; i < currentMonth - 1; i++) {
          balanceHistory[delayedAsset.name].push(0);
        }
      }
    }
  }

  // ---- MAIN SIMULATION LOOP ----
  let actualDuration = maxDuration;

  for (let month = 0; month < maxDuration; month++) {
    // 1. Activate delayed assets if their start_month is reached
    activateDelayedAssets(month);

    // 2. Apply deposits
    applyDeposits(month);

    // 3. Calculate income and expenses
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

    // 4. Process withdrawals (with proportional support and tax-aware calculations)
    const remainingShortfall = processWithdrawals(shortfall, drawOrder, assetMap, log, taxService);

    if (remainingShortfall > 0) {
      log.shortfall = remainingShortfall;
    }

    // 5. Apply asset growth (FIXED: Now works with both old and new rate systems)
    // CRITICAL FIX: Only apply growth if auto-stop hasn't occurred yet
    if (autoStoppedMonth === null) {
      for (const assetName of allAssetNames) {
        const asset = assetMap[assetName];
        
        if (asset && asset.balance !== undefined) {
          // Asset is active - apply growth
          const monthlyGrowthRate = getAssetReturns(asset, month);
          const growth = asset.balance * monthlyGrowthRate;
          asset.balance += growth;
          
          // Record the new balance
          balanceHistory[assetName].push(asset.balance);
        } else {
          // Asset is not yet active - record zero
          balanceHistory[assetName].push(0);
        }
      }
    } else {
      // Auto-stop has occurred - freeze asset growth, just record current balances
      console.log(`❄️ Asset growth frozen after auto-stop at month ${autoStoppedMonth}`);
      for (const assetName of allAssetNames) {
        const asset = assetMap[assetName];
        
        if (asset && asset.balance !== undefined) {
          // Record frozen balance (no growth)
          balanceHistory[assetName].push(asset.balance);
        } else {
          // Asset is not yet active - record zero
          balanceHistory[assetName].push(0);
        }
      }
    }

    // 6. Record results and balances
    results.push(log);

    // 7. Check auto-stop condition
    if (stopOnShortfall && month >= minDuration && remainingShortfall > 0.01 && autoStoppedMonth === null) {
      autoStoppedMonth = month + 1;
      actualDuration = month + 1;
      console.log(`🛑 Auto-stopping simulation at month ${actualDuration} due to shortfall of $${remainingShortfall.toFixed(2)}`);
      console.log(`❄️ Asset growth will be frozen from this point forward`);
      
      // Debug: Log current asset balances at auto-stop
      console.log(`📊 Asset balances at auto-stop:`, Object.fromEntries(
        Object.entries(assetMap).map(([name, asset]) => [name, asset.balance?.toFixed(0) || 0])
      ));
      break;
    }
  }

  // ---- POST-SIMULATION: BUILD CSV ----
  const csvRows = [];
  // Use all asset names (including delayed ones) for CSV output
  const csvAssetNames = allAssetNames.filter(name => {
    // Include assets that were ever active (have non-zero balance at some point)
    return balanceHistory[name] && balanceHistory[name].some(balance => balance !== 0);
  });
  csvRows.push(["Month", "Date", "Income", "Expenses", "Shortfall", ...csvAssetNames]);

  for (let m = 0; m < actualDuration; m++) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + m);
    const r = results[m];

    const assetCells = csvAssetNames.map((name) => {
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
