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
    if (remainingShortfall <= 0.01) {
      break; // No more shortfall to cover
    }

    const group = orderGroups.get(order);
    
    // Check if this group uses proportional weights
    const hasWeights = group.some(entry => typeof entry.weight === 'number');

    if (hasWeights) {
      // Proportional withdrawal by weight - filter out zero weights first
      const nonZeroWeightAssets = group.filter(entry => {
        const weight = entry.weight || 1;
        return weight > 0;
      });
      
      if (nonZeroWeightAssets.length > 0) {
        remainingShortfall = withdrawProportionally(nonZeroWeightAssets, assetMap, remainingShortfall, log, taxService);
      }
    } else {
      // No weights specified - process available assets in the group
      // Filter to only available assets (exist in assetMap and have positive balance)
      const availableAssets = group.filter(entry => {
        const asset = assetMap[entry.account];
        const minBalance = asset?.min_balance || 0;
        const availableBalance = asset ? Math.max(0, asset.balance - minBalance) : 0;
        return asset && availableBalance > 0;
      });
      
      // Debug: Log withdrawal attempt details when shortfall remains high
      if (remainingShortfall > 1000) {
        console.log(`🔍 Withdrawal attempt - Group assets:`, group.map(e => e.account));
        console.log(`🔍 Available assets in group:`, availableAssets.map(e => e.account));
        console.log(`🔍 Remaining shortfall: $${remainingShortfall.toFixed(2)}`);
      }
      
      if (availableAssets.length === 0) {
        // No assets available in this order group, continue to next order
        continue;
      } else if (availableAssets.length === 1) {
        // Only one asset available, withdraw from it
        remainingShortfall = withdrawFromSingleAsset(availableAssets[0], assetMap, remainingShortfall, log, taxService);
      } else {
        // Multiple assets available - assign equal weights for proportional withdrawal
        const assetsWithEqualWeights = availableAssets.map(entry => ({
          ...entry,
          weight: 1 // Equal weight for all assets in the group
        }));
        remainingShortfall = withdrawProportionally(assetsWithEqualWeights, assetMap, remainingShortfall, log, taxService);
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
        weight: entry.weight !== undefined ? entry.weight : 1, // Use explicit weight or default to 1
        availableBalance
      };
    })
    .filter(({ asset, weight, availableBalance }) => {
      // Filter out assets that don't exist, have no balance, or have zero weight
      return asset && availableBalance > 0 && weight > 0;
    });

  if (availableAssets.length === 0) {
    return shortfall; // No assets available
  }

  // Calculate normalized weights, but adjust for min_balance constraints
  let adjustedWeights = availableAssets.map(({ weight, availableBalance }) => {
    // If asset is close to min_balance (less than 2x the proportional withdrawal), reduce its weight
    const proportionalAmount = shortfall * (weight / availableAssets.reduce((sum, a) => sum + a.weight, 0));
    if (availableBalance < proportionalAmount * 2) {
      // Reduce weight proportionally to available balance
      return weight * (availableBalance / (proportionalAmount * 2));
    }
    return weight;
  });
  
  const totalAdjustedWeight = adjustedWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = adjustedWeights.map(weight => weight / totalAdjustedWeight);

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
    
    // Respect min_balance constraints - reduce target if it would violate min_balance
    const minBalance = asset.min_balance || 0;
    const maxWithdrawable = Math.max(0, asset.balance - minBalance);
    
    if (targetNetWithdrawal > maxWithdrawable) {
      // Can't withdraw full proportion due to min_balance, withdraw what we can
      targetNetWithdrawal = maxWithdrawable;
    }

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
  console.log('🔧🔧🔧 DEBUG VERSION LOADED: Enhanced logging enabled for withdrawal analysis 🔧🔧🔧');
  console.log('🚀 Running Advanced Time-Aware Simulation with Auto-Stop, Proportional Withdrawals, and Tax-Aware Calculations');
  console.log('🔧 DEBUG VERSION: Enhanced logging enabled for withdrawal analysis');

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
  
  console.log('Asset separation:');
  console.log('Immediate assets:', immediateAssets.map(a => `${a.name} (start_month: ${a.start_month || 'none'})`));
  console.log('Delayed assets:', delayedAssets.map(a => `${a.name} (start_month: ${a.start_month})`));
  
  // Initialize with immediate assets only
  const assets = [...immediateAssets];
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) ||
                   allAssets.map((asset, index) => ({ account: asset.name, order: index + 1 }));
  
  // Debug: Log withdrawal order setup
  console.log('🔍 Withdrawal order setup:', {
    hasScenarioOrder: !!scenario.order,
    scenarioOrderLength: scenario.order?.length || 0,
    drawOrderLength: drawOrder?.length || 0,
    drawOrder: drawOrder?.map(entry => `${entry.account} (order: ${entry.order})`) || 'None'
  });
  const assetMap = Object.fromEntries(immediateAssets.map((a) => [a.name, a]));
  const allAssetNames = allAssets.map((a) => a.name); // All asset names for balance history
  const incomeSources = scenario.income || [];
  const depositEvents = scenario.deposits || [];
  const results = [];

  // Auto-stop configuration
  const maxDuration = scenario.plan.duration_months;
  const stopOnShortfall = scenario.plan.stop_on_shortfall !== false; // Default: true
  const minDuration = scenario.plan.min_duration || 0; // Allow immediate auto-stop unless specified
  let autoStoppedMonth = null; // Track when auto-stop occurred

  console.log(`Auto-stop enabled: ${stopOnShortfall}, Min duration: ${minDuration}, Max duration: ${maxDuration}`);
  console.log(`Immediate assets: ${immediateAssets.length}, Delayed assets: ${delayedAssets.length}`);

  // Track balance history - initialize for all assets
  const balanceHistory = {};
  for (const asset of immediateAssets) {
    balanceHistory[asset.name] = [];
  }
  for (const asset of delayedAssets) {
    balanceHistory[asset.name] = [];
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
    const activatedThisMonth = [];
    
    for (const delayedAsset of delayedAssets) {
      if (delayedAsset.start_month === currentMonth && !assetMap[delayedAsset.name]) {
        // Activate the delayed asset
        console.log(`🎯 Activating delayed asset "${delayedAsset.name}" at month ${currentMonth}`);
        
        // Add to active assets
        assets.push(delayedAsset);
        assetMap[delayedAsset.name] = delayedAsset;
        
        // Track that this asset was activated this month
        activatedThisMonth.push(delayedAsset.name);
      }
    }
    
    return activatedThisMonth;
  }

  // ---- MAIN SIMULATION LOOP ----
  let actualDuration = maxDuration;

  for (let month = 0; month < maxDuration; month++) {
    // 1. Activate delayed assets if their start_month is reached
    const activatedThisMonth = activateDelayedAssets(month);
    const activatedThisMonthSet = new Set(activatedThisMonth);

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

    // 4. Process withdrawals to cover expenses with iterative tax-aware logic
    let remainingShortfall = monthlyExpenses - income;
    let iterationCount = 0;
    const maxIterations = 5;
    
    // Debug: Always log withdrawal setup for final months
    if (month > 150) {
      console.log(`🔧 ITERATION DEBUG: Month ${month + 1}: drawOrder exists: ${!!drawOrder}, length: ${drawOrder?.length || 0}`);
      console.log(`🔧 ITERATION DEBUG: Month ${month + 1}: Initial shortfall: $${remainingShortfall.toFixed(2)}`);
    }
    
    if (drawOrder && drawOrder.length > 0) {
      // Iterative withdrawal to handle tax-inclusive shortfall
      while (remainingShortfall > 0.01 && iterationCount < maxIterations) {
        iterationCount++;
        const initialShortfall = remainingShortfall;
        
        if (month > 150) {
          console.log(`🔧 ITERATION ${iterationCount}: Attempting to withdraw $${remainingShortfall.toFixed(2)}`);
        }
        
        remainingShortfall = processWithdrawals(remainingShortfall, drawOrder, assetMap, log, taxService);
        
        if (month > 150) {
          console.log(`🔧 ITERATION ${iterationCount}: After withdrawal, remaining shortfall: $${remainingShortfall.toFixed(2)}`);
        }
        
        // If no progress made, break to avoid infinite loop
        if (Math.abs(remainingShortfall - initialShortfall) < 0.01) {
          if (month > 150) {
            console.log(`🔧 ITERATION DEBUG: No progress made, breaking loop`);
          }
          break;
        }
      }
      
      if (month > 150) {
        console.log(`🔧 ITERATION DEBUG: Completed ${iterationCount} iterations, final shortfall: $${remainingShortfall.toFixed(2)}`);
      }
    } else {
      // Debug: Log when withdrawal is skipped
      if (month > 150) {
        console.log(`🚨 Month ${month + 1}: Withdrawal SKIPPED - no drawOrder available!`);
      }
    }
    
    if (remainingShortfall > 0) {
      log.shortfall = remainingShortfall;
    }

    // 5. Apply growth to assets (only if auto-stop hasn't occurred)
    if (autoStoppedMonth === null) {
      for (const assetName of allAssetNames) {
        const asset = assetMap[assetName];
        const delayedAsset = delayedAssets.find(da => da.name === assetName);
        const currentMonth = month + 1; // Convert to 1-based
        
        // Check if asset should be active at this month
        const shouldBeActive = !delayedAsset || delayedAsset.start_month <= currentMonth;
        
        if (activatedThisMonthSet.has(assetName)) {
          // Asset was just activated this month - record initial balance without growth
          balanceHistory[assetName].push(asset.balance);
        } else if (asset && asset.balance !== undefined && shouldBeActive) {
          // Asset is active - apply growth
          const monthlyGrowthRate = getAssetReturns(asset, month);
          const growth = asset.balance * monthlyGrowthRate;
          asset.balance += growth;
          
          // Record the balance after growth
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
        const delayedAsset = delayedAssets.find(da => da.name === assetName);
        const currentMonth = month + 1; // Convert to 1-based
        
        // Check if asset should be active at this month
        const shouldBeActive = !delayedAsset || delayedAsset.start_month <= currentMonth;
        
        if (activatedThisMonthSet.has(assetName)) {
          // Asset was just activated this month - record initial balance without growth
          balanceHistory[assetName].push(asset.balance);
        } else if (asset && asset.balance !== undefined && shouldBeActive) {
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

    // 7. Check auto-stop condition - enhanced logic to detect asset depletion
    if (stopOnShortfall && month >= minDuration && autoStoppedMonth === null) {
      // Check if we have a shortfall AND no available assets to withdraw from
      const totalAvailable = Object.values(assetMap).reduce((sum, asset) => {
        const minBalance = asset.min_balance || 0;
        return sum + Math.max(0, (asset.balance || 0) - minBalance);
      }, 0);
      
      // Auto-stop if we have a shortfall and either:
      // 1. No assets available for withdrawal, OR
      // 2. Significant shortfall that can't be covered
      const shouldAutoStop = remainingShortfall > 0.01 && (
        totalAvailable < 1 || // No meaningful assets left
        remainingShortfall > totalAvailable * 1.5 // Shortfall too large relative to available assets
      );
      
      if (shouldAutoStop) {
        autoStoppedMonth = month + 1;
        actualDuration = month + 1;
        console.log(`🛑 Auto-stopping simulation at month ${actualDuration} due to shortfall of $${remainingShortfall.toFixed(2)}`);
        console.log(`❄️ Asset growth will be frozen from this point forward`);
        
        // Debug: Log current asset balances and available balances at auto-stop
        console.log(`📊 Asset balances at auto-stop:`, Object.fromEntries(
          Object.entries(assetMap).map(([name, asset]) => [name, asset.balance?.toFixed(0) || 0])
        ));
        console.log(`📊 Available balances at auto-stop:`, Object.fromEntries(
          Object.entries(assetMap).map(([name, asset]) => {
            const minBalance = asset.min_balance || 0;
            const available = Math.max(0, (asset.balance || 0) - minBalance);
            return [name, available.toFixed(0)];
          })
        ));
        
        console.log(`📊 Total available for withdrawal: $${totalAvailable.toFixed(0)}`);
        
        // Debug: Check withdrawal order logic
        console.log(`📊 Withdrawal order entries:`, drawOrder.map(entry => 
          `${entry.account} (order: ${entry.order})`
        ));
        
        break;
      }
    }
  }

  // ---- POST-SIMULATION: BUILD CSV ----
  const csvRows = [];
  // Use all asset names (including delayed ones) for CSV output
  const csvAssetNames = allAssetNames.filter(name => {
    // Include assets that were ever active (have non-zero balance at some point)
    return balanceHistory[name] && balanceHistory[name].some(balance => balance !== 0);
  });
  csvRows.push(["Month", "Date", "Income", "Expenses", "Shortfall", "Gross Withdrawals", "Net Withdrawals", "Taxes Paid", ...csvAssetNames]);

  for (let m = 0; m < actualDuration; m++) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + m);
    const r = results[m];

    const assetCells = csvAssetNames.map((name) => {
      const v = balanceHistory[name]?.[m];
      return typeof v === "number" ? v.toFixed(2) : "0.00";
    });

    // Calculate tax totals for this month
    const monthlyTaxTotals = r?.withdrawals?.reduce((totals, w) => {
      totals.gross += w.grossAmount || w.amount || 0;
      totals.net += w.netAmount || w.amount || 0;
      totals.tax += w.taxOwed || 0;
      return totals;
    }, { gross: 0, net: 0, tax: 0 }) || { gross: 0, net: 0, tax: 0 };

    csvRows.push([
      m + 1,
      date.toISOString().slice(0, 7),
      (r?.income ?? 0).toFixed(2),
      (r?.expenses ?? 0).toFixed(2),
      (r?.shortfall ?? 0).toFixed(2),
      monthlyTaxTotals.gross.toFixed(2),
      monthlyTaxTotals.net.toFixed(2),
      monthlyTaxTotals.tax.toFixed(2),
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
