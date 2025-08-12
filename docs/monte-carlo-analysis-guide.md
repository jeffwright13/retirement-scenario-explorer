# Monte Carlo Analysis Guide
## Retirement Scenario Explorer

**Version:** 1.0
**Date:** August 12, 2025
**Purpose:** Add statistical Monte Carlo analysis to existing retirement scenarios

---

## Overview

This guide provides complete instructions and code to perform Monte Carlo analysis using your existing Retirement Scenario Explorer. The Monte Carlo method runs hundreds of variations of your scenario with different random market returns, then provides statistical analysis of outcomes.

**What You'll Get:**
- Success rate percentages (e.g., "73% chance money lasts 25+ years")
- Duration statistics (worst case, median, best case scenarios)
- Professional-grade financial planning insights

---

## Prerequisites

✅ **Retirement Scenario Explorer loaded** in your browser
✅ **Any scenario selected** from the dropdown (e.g., "Level 1: Simple Asset Drawdown")
✅ **Browser with developer tools** (Chrome, Firefox, Edge, Safari)

---

## Step-by-Step Instructions

### Step 1: Open Your Retirement App
1. Navigate to your Retirement Scenario Explorer in the browser
2. **Select any scenario** from the dropdown menu
3. Verify the JSON appears in the preview section

### Step 2: Open Browser Developer Console
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I`
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Press `Cmd+Option+I` (enable Developer menu first)
- **Alternative:** Right-click → "Inspect" → Click "Console" tab

### Step 3: Paste the Monte Carlo Code
Copy and paste the complete code block below into the console:

```javascript
// Monte Carlo Analysis for Retirement Scenario Explorer
// Version 1.0 - Browser Console Implementation

async function runMonteCarloAnalysis(iterations = 100, targetYears = 25, mode = 'additive') {
  console.log(`🎲 Starting Monte Carlo Analysis: ${iterations} iterations`);
  console.log(`📊 Target: Money must last ${targetYears} years`);
  console.log(`🔧 Mode: ${mode} (${mode === 'additive' ? 'preserves existing rate schedules' : 'replaces with 7% + noise'})`);
  console.log(`⏱️  This may take ${Math.ceil(iterations/10)} seconds...`);

  // Get base scenario from current JSON editor
  const jsonInput = document.getElementById('json-input');
  if (!jsonInput) {
    console.error('❌ JSON input not found! Make sure the app is loaded.');
    return;
  }

  const baseJsonText = jsonInput.value;
  if (!baseJsonText?.trim()) {
    console.error('❌ No scenario loaded! Please select a scenario first.');
    return;
  }

  let baseScenario;
  try {
    baseScenario = JSON.parse(baseJsonText);
  } catch (error) {
    console.error('❌ Invalid JSON in editor:', error);
    return;
  }

  const results = [];
  const startTime = Date.now();

  // Import the simulation engine
  let simulateFunction;
  try {
    if (window.simulateScenarioAdvanced) {
      simulateFunction = window.simulateScenarioAdvanced;
    } else if (window.simulateScenario) {
      simulateFunction = window.simulateScenario;
    } else {
      // Try to import from module
      const engineModule = await import('./scripts/timeaware-engine.js');
      simulateFunction = engineModule.simulateScenarioAdvanced || engineModule.simulateScenario;
    }
  } catch (error) {
    console.error('❌ Could not load simulation engine:', error);
    return;
  }

  for (let i = 0; i < iterations; i++) {
    try {
      // Create randomized scenario
      const mcScenario = createRandomVariant(baseScenario, i, mode);

      // Run simulation
      const simulationResult = simulateFunction(mcScenario);

      // Analyze results
      const analysis = analyzeRun(simulationResult, targetYears);
      results.push({
        iteration: i + 1,
        ...analysis
      });

      // Progress indicator
      if (i % Math.max(1, Math.floor(iterations/4)) === 0 || i === iterations - 1) {
        console.log(`⏳ Progress: ${i + 1}/${iterations} (${((i + 1)/iterations*100).toFixed(0)}%)`);
      }

    } catch (error) {
      console.warn(`⚠️ Iteration ${i + 1} failed:`, error.message);
      results.push({
        iteration: i + 1,
        failed: true,
        yearsLasted: 0,
        passed: false,
        failureReason: error.message
      });
    }
  }

  // Calculate and display statistics
  const stats = calculateMCStats(results, targetYears);
  displayResults(stats, Date.now() - startTime, iterations, targetYears);

  // Store results globally for further analysis
  window._mcResults = results;
  window._mcStats = stats;

  return { results, stats };
}

function createRandomVariant(baseScenario, seed) {
  // Deep clone the scenario
  const scenario = JSON.parse(JSON.stringify(baseScenario));

  // Ensure rate_schedules exists
  if (!scenario.rate_schedules) {
    scenario.rate_schedules = {};
  }

  // Add Monte Carlo rate schedule with randomness
  const baseReturn = 0.07; // 7% base return
  const volatility = 0.15;  // 15% standard deviation

  scenario.rate_schedules.mc_variable_returns = {
    pipeline: [
      { start_with: baseReturn },
      { add_noise: { std_dev: volatility } },
      { clamp: { min: -0.5, max: 0.4 } }  // Prevent extreme values
    ]
  };

  // Apply randomized returns to investment assets
  if (scenario.assets) {
    scenario.assets.forEach(asset => {
      // Identify investment accounts (not cash/savings)
      const isInvestmentAccount =
        asset.name.toLowerCase().includes('investment') ||
        asset.name.toLowerCase().includes('401k') ||
        asset.name.toLowerCase().includes('ira') ||
        asset.name.toLowerCase().includes('portfolio') ||
        asset.name.toLowerCase().includes('stock') ||
        asset.name.toLowerCase().includes('mutual') ||
        (asset.interest_rate && asset.interest_rate > 0.04); // Anything > 4% likely investments

      if (isInvestmentAccount) {
        asset.return_schedule = 'mc_variable_returns';
        delete asset.interest_rate; // Use schedule instead
      }
    });
  }

  return scenario;
}

function analyzeRun(simulationResult, targetYears) {
  const results = simulationResult.results || [];
  const targetMonths = targetYears * 12;

  // Find when money runs out (first significant shortfall)
  let moneyRunsOutMonth = results.length;
  let maxShortfall = 0;

  for (let i = 0; i < results.length; i++) {
    const shortfall = results[i].shortfall || 0;
    maxShortfall = Math.max(maxShortfall, shortfall);

    if (shortfall > 100) { // $100+ shortfall = effectively broke
      moneyRunsOutMonth = i + 1;
      break;
    }
  }

  const yearsLasted = moneyRunsOutMonth / 12;
  const passed = yearsLasted >= targetYears;

  // Calculate final balances
  let totalFinalBalance = 0;
  if (simulationResult.balanceHistory) {
    for (const [assetName, balances] of Object.entries(simulationResult.balanceHistory)) {
      const finalBalance = balances[balances.length - 1] || 0;
      totalFinalBalance += finalBalance;
    }
  }

  return {
    yearsLasted: yearsLasted,
    monthsLasted: moneyRunsOutMonth,
    passed: passed,
    totalFinalBalance: totalFinalBalance,
    maxShortfall: maxShortfall,
    ranFullDuration: moneyRunsOutMonth >= results.length
  };
}

function calculateMCStats(results, targetYears) {
  const validResults = results.filter(r => !r.failed);
  const passedResults = validResults.filter(r => r.passed);
  const failedRuns = results.filter(r => r.failed);

  if (validResults.length === 0) {
    return {
      error: 'No valid simulation results',
      totalRuns: results.length,
      validRuns: 0,
      failedRuns: failedRuns.length
    };
  }

  const durations = validResults.map(r => r.yearsLasted).sort((a, b) => a - b);
  const finalBalances = validResults
    .filter(r => r.totalFinalBalance > 0)
    .map(r => r.totalFinalBalance)
    .sort((a, b) => a - b);

  // Calculate percentiles
  const getPercentile = (arr, p) => {
    if (arr.length === 0) return 0;
    const index = Math.max(0, Math.floor(arr.length * p) - 1);
    return arr[Math.min(index, arr.length - 1)];
  };

  return {
    totalRuns: results.length,
    validRuns: validResults.length,
    failedRuns: failedRuns.length,
    successRate: validResults.length > 0 ? passedResults.length / validResults.length : 0,

    duration: {
      percentile5: getPercentile(durations, 0.05),
      percentile10: getPercentile(durations, 0.10),
      percentile25: getPercentile(durations, 0.25),
      percentile50: getPercentile(durations, 0.50), // Median
      percentile75: getPercentile(durations, 0.75),
      percentile90: getPercentile(durations, 0.90),
      percentile95: getPercentile(durations, 0.95),
      worst: durations[0] || 0,
      best: durations[durations.length - 1] || 0,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length
    },

    finalBalance: finalBalances.length > 0 ? {
      percentile10: getPercentile(finalBalances, 0.10),
      percentile50: getPercentile(finalBalances, 0.50),
      percentile90: getPercentile(finalBalances, 0.90),
      average: finalBalances.reduce((sum, b) => sum + b, 0) / finalBalances.length
    } : null
  };
}

function displayResults(stats, runtime, iterations, targetYears) {
  console.log('\n🎲 ════════════════════════════════════════');
  console.log('     MONTE CARLO ANALYSIS RESULTS');
  console.log('🎲 ════════════════════════════════════════');
  console.log(`⏱️  Runtime: ${(runtime/1000).toFixed(1)} seconds`);
  console.log(`📊 Completed: ${stats.validRuns}/${stats.totalRuns} scenarios`);

  if (stats.failedRuns > 0) {
    console.log(`⚠️  Failed runs: ${stats.failedRuns}`);
  }

  if (stats.error) {
    console.log(`❌ Error: ${stats.error}`);
    return;
  }

  const successPct = (stats.successRate * 100).toFixed(1);
  console.log(`\n🎯 SUCCESS RATE: ${successPct}%`);
  console.log(`   (Money lasts ${targetYears}+ years in ${successPct}% of scenarios)`);

  console.log('\n📈 MONEY DURATION ANALYSIS:');
  console.log(`   Worst case (5%):   ${stats.duration.percentile5.toFixed(1)} years`);
  console.log(`   Bad luck (10%):    ${stats.duration.percentile10.toFixed(1)} years`);
  console.log(`   Lower bound (25%): ${stats.duration.percentile25.toFixed(1)} years`);
  console.log(`   *** MEDIAN (50%):  ${stats.duration.percentile50.toFixed(1)} years ***`);
  console.log(`   Upper bound (75%): ${stats.duration.percentile75.toFixed(1)} years`);
  console.log(`   Good luck (90%):   ${stats.duration.percentile90.toFixed(1)} years`);
  console.log(`   Best case (95%):   ${stats.duration.percentile95.toFixed(1)} years`);
  console.log(`   Average:           ${stats.duration.average.toFixed(1)} years`);

  if (stats.finalBalance) {
    console.log('\n💰 FINAL BALANCE (Successful scenarios):');
    console.log(`   Conservative (10%): $${stats.finalBalance.percentile10.toLocaleString()}`);
    console.log(`   Median (50%):       $${stats.finalBalance.percentile50.toLocaleString()}`);
    console.log(`   Optimistic (90%):   $${stats.finalBalance.percentile90.toLocaleString()}`);
    console.log(`   Average:            $${stats.finalBalance.average.toLocaleString()}`);
  }

  console.log('\n💡 INTERPRETATION:');
  if (stats.successRate >= 0.95) {
    console.log('✅ EXCELLENT - Very safe plan, extremely high success probability');
  } else if (stats.successRate >= 0.90) {
    console.log('✅ VERY GOOD - Safe plan with high success probability');
  } else if (stats.successRate >= 0.80) {
    console.log('🟢 GOOD - Reasonable plan with solid success probability');
  } else if (stats.successRate >= 0.70) {
    console.log('🟡 MODERATE - Acceptable but consider risk mitigation strategies');
  } else if (stats.successRate >= 0.50) {
    console.log('🟠 CONCERNING - High risk, significant adjustments recommended');
  } else {
    console.log('🔴 HIGH RISK - Major changes needed, current plan unsustainable');
  }

  console.log('\n📊 DETAILED DATA ACCESS:');
  console.log('   window._mcResults  - Individual scenario results');
  console.log('   window._mcStats    - Statistical summary');

  console.log('\n════════════════════════════════════════');
}

// Convenience functions
window.runMC = runMonteCarloAnalysis;
window.quickMC = (mode = 'additive') => runMonteCarloAnalysis(50, 25, mode);
window.deepMC = (mode = 'additive') => runMonteCarloAnalysis(200, 30, mode);

console.log('🎲 Monte Carlo Analysis Ready!');
console.log('📝 Usage Examples:');
console.log('   quickMC()                    - Quick 50-scenario analysis (additive mode)');
console.log('   quickMC("replace")           - Quick analysis with uniform 7% + noise');
console.log('   runMC(100, 25)               - 100 scenarios, 25-year target (additive mode)');
console.log('   runMC(100, 25, "replace")    - 100 scenarios with uniform returns');
console.log('   deepMC()                     - Deep 200-scenario analysis (additive mode)');
console.log('   runMC(1000, 30, "additive")  - Professional analysis preserving rate schedules');
```

### Step 4: Run the Analysis
After pasting the code, you can run analyses with these commands:

#### Quick Test (50 scenarios)
```javascript
quickMC()
```

#### Custom Analysis
```javascript
runMC(100, 25)  // 100 scenarios, money must last 25 years
```

#### Deep Analysis
```javascript
deepMC()  // 200 scenarios, 30-year target
```

#### Professional Analysis
```javascript
runMC(500, 30)  // 500 scenarios, 30-year target
```

---

## Choosing the Right Mode

### Use ADDITIVE Mode When:
✅ **Your scenario has sophisticated rate schedules** (market crash sequences, complex pipelines)
✅ **Different assets have different expected returns** (bonds vs stocks)
✅ **You want to preserve existing modeling work**
✅ **You're analyzing realistic scenarios** with asset-specific assumptions
✅ **Default choice** - safe for all scenarios

### Use REPLACE Mode When:
✅ **You want simple, uniform analysis** across all investments
✅ **Testing "what if all investments performed similarly"**
✅ **Your scenario only has basic interest_rate returns anyway**
✅ **You want to override existing assumptions** with standard 7% + 15% volatility
✅ **Quick sensitivity analysis** ignoring asset-specific details

### Examples:

**Sophisticated scenario with market crash sequence:**
```javascript
runMC(200, 25, 'additive')  // Preserves crash sequence, adds realistic volatility
```

**Simple scenario with just savings:**
```javascript
runMC(100, 25, 'replace')   // Both modes work similarly, replace is simpler
```

**Comparing approaches:**
```javascript
runMC(100, 25, 'additive')  // Run with preserved assumptions
runMC(100, 25, 'replace')   // Run with uniform assumptions - compare results
```

---

## Expected Output

### Progress Messages
```
🎲 Starting Monte Carlo Analysis: 100 iterations
📊 Target: Money must last 25 years
⏳ Progress: 25/100 (25%)
⏳ Progress: 50/100 (50%)
⏳ Progress: 75/100 (75%)
⏳ Progress: 100/100 (100%)
```

### Final Results
```
🎲 ════════════════════════════════════════
     MONTE CARLO ANALYSIS RESULTS
🎲 ════════════════════════════════════════
⏱️  Runtime: 3.2 seconds
📊 Completed: 98/100 scenarios

🎯 SUCCESS RATE: 73.5%
   (Money lasts 25+ years in 73.5% of scenarios)

📈 MONEY DURATION ANALYSIS:
   Worst case (5%):   16.8 years
   Bad luck (10%):    18.2 years
   Lower bound (25%): 22.1 years
   *** MEDIAN (50%):  27.3 years ***
   Upper bound (75%): 32.8 years
   Good luck (90%):   38.2 years
   Best case (95%):   42.1 years

💰 FINAL BALANCE (Successful scenarios):
   Conservative (10%): $145,000
   Median (50%):       $380,000
   Optimistic (90%):   $890,000

💡 INTERPRETATION:
🟢 GOOD - Reasonable plan with solid success probability
```

---

## Understanding the Results

### Success Rate
- **90%+:** Very safe retirement plan
- **80-89%:** Good plan with reasonable confidence
- **70-79%:** Moderate risk, consider adjustments
- **50-69%:** Concerning, significant changes needed
- **<50%:** High risk, major plan revision required

### Duration Percentiles
- **5th percentile:** Worst-case scenario (market crashes early)
- **50th percentile (Median):** Most likely outcome
- **95th percentile:** Best-case scenario (great market performance)

### Final Balances
Shows money remaining in successful scenarios. Higher values indicate more conservative planning with larger safety margins.

---

## Troubleshooting

### Error: "No scenario loaded"
**Solution:** Select a scenario from the dropdown menu first, then run the analysis.

### Error: "Invalid JSON"
**Solution:** Ensure a valid scenario is selected. Try selecting a different scenario from the dropdown.

### Error: "Could not load simulation engine"
**Solution:** Refresh the page and ensure the Retirement Scenario Explorer is fully loaded before running the analysis.

### Analysis Takes Too Long
**Solution:** Start with smaller iteration counts (e.g., `runMC(20, 25)`) and increase gradually.

### All Scenarios Fail
**Solution:** Check that your base scenario runs successfully in the normal app first. The Monte Carlo analysis modifies investment returns but keeps other parameters the same.

---

## Advanced Usage

### Accessing Raw Data
After running an analysis, detailed results are stored in:
```javascript
// Individual scenario results
window._mcResults.forEach((result, i) => {
  console.log(`Scenario ${i+1}: ${result.yearsLasted.toFixed(1)} years`);
});

// Statistical summary
console.log(window._mcStats);
```

### Exporting Results to CSV
```javascript
// Create CSV of all results
const csvData = window._mcResults.map(r =>
  `${r.iteration},${r.yearsLasted.toFixed(2)},${r.passed}`
).join('\n');
console.log('Iteration,Years Lasted,Passed\n' + csvData);
```

### Modifying Parameters
You can customize the Monte Carlo analysis by editing the `createRandomVariant` function:
- Change `baseReturn` (default 7%)
- Adjust `volatility` (default 15%)
- Modify return bounds (default -50% to +40%)

---

## Technical Notes

### How It Works
1. Takes your current scenario as a baseline
2. Identifies investment accounts (401k, IRA, portfolios, etc.)
3. **Additive Mode:** Preserves existing rate schedules and adds noise to them
   **Replace Mode:** Replaces with uniform randomized returns (7% + noise)
4. Runs hundreds of simulations with different random sequences
5. Analyzes when money runs out in each scenario
6. Provides statistical summary of outcomes

### Randomization Methods

#### Additive Mode (Default)
- **Preserves existing rate schedules:** Market crash sequences, complex pipelines remain intact
- **Adds noise to existing returns:** 3% bond schedules get noise around 3%, 7% stock schedules get noise around 7%
- **Asset-specific treatment:** Each asset maintains its original risk/return profile
- **Pipeline enhancement:**
  ```
  Original: start_with(0.03) → add_cycles() → overlay_sequence()
  Enhanced: start_with(0.03) → add_cycles() → overlay_sequence() → add_noise(0.15) → clamp()
  ```

#### Replace Mode
- **Uniform treatment:** All investments get same base return (7%)
- **Standard volatility:** 15% standard deviation for all assets
- **Ignores existing sophistication:** Market crash sequences, asset-specific rates overridden
- **Pipeline creation:**
  ```
  All assets: start_with(0.07) → add_noise(0.15) → clamp(-0.5, 0.4)
  ```

### Asset Classification
Automatically identifies investment accounts by:
- **Name patterns:** "investment", "401k", "ira", "portfolio", "stock", "mutual"
- **Return indicators:** Any account with interest_rate > 4% or existing return_schedule
- **Preservation:** Cash/savings accounts (≤4% returns) keep original fixed rates

---

## Best Practices

1. **Start Small:** Begin with 20-50 iterations to verify everything works
2. **Test Your Base Scenario:** Ensure your original scenario runs successfully first
3. **Choose the Right Mode:**
   - **Default to additive mode** for sophisticated scenarios
   - **Use replace mode** for quick uniform analysis or simple scenarios
4. **Use Realistic Targets:** 25-30 year retirement duration is typical
5. **Run Multiple Tests:** Try different iteration counts to verify consistency
6. **Compare Modes:** Run both additive and replace modes to understand the difference
7. **Save Results:** Copy important results before running new analyses
8. **Consider Conservative Planning:** Aim for 80%+ success rates for safety
9. **Validate Results:** If additive and replace modes give vastly different results, investigate your rate schedules

---

**End of Guide**

*This guide enables professional-grade Monte Carlo analysis using your existing Retirement Scenario Explorer infrastructure. The code leverages your sophisticated rate schedule system to provide statistical confidence intervals for retirement planning decisions.*
