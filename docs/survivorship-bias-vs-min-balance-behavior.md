# Survivorship Bias vs Min Balance Behavior in Monte Carlo Charts

This document explains two distinct but visually similar behaviors that can occur in Monte Carlo retirement scenario charts. Understanding the difference is crucial for proper interpretation of simulation results.

## Overview

Both behaviors can cause apparent "jumps" or discontinuities in Monte Carlo visualizations, but they have fundamentally different causes and implications:

1. **True Survivorship Bias**: A statistical artifact that creates artificial upward movement in aggregate statistics
2. **Min Balance Discrete Jump**: A realistic account behavior that creates discrete jumps in individual trajectories

## True Survivorship Bias

### Definition
Survivorship bias occurs when failed scenarios (portfolios that reach $0) are excluded from percentile calculations, causing median and percentile lines to show artificial upward movement because only successful scenarios contribute to the statistics.

### Root Cause
- Failed simulations are filtered out of statistical calculations
- Only "surviving" portfolios contribute to median/percentile lines
- As time progresses and more portfolios fail, the remaining successful portfolios dominate the statistics
- This creates an illusion of portfolio growth when the reality is portfolio failure

### Visual Characteristics
- **Median line curves UPWARD** in later months (artificial growth)
- **Percentile bands show artificial expansion** 
- **Individual gray trajectories may fail**, but statistics ignore them
- **Unrealistic "hockey stick" growth** in aggregate statistics

### Mathematical Example
```
Month 12: 100 simulations, 80 successful, 20 failed
- With bias: Median calculated from 80 successful portfolios only
- Without bias: Median calculated from all 100 (20 contribute $0)

Month 24: 100 simulations, 40 successful, 60 failed  
- With bias: Median calculated from 40 successful portfolios only
- Without bias: Median calculated from all 100 (60 contribute $0)

Result: Biased median appears to grow as failed portfolios are ignored
```

### Fix
Include failed scenarios as $0 values in all percentile calculations:
```javascript
// WRONG (survivorship bias)
const successfulOnly = simulations.filter(sim => sim.finalBalance > 0);
const median = calculatePercentile(successfulOnly, 50);

// CORRECT (no bias)
const allBalances = simulations.map(sim => sim.finalBalance || 0);
const median = calculatePercentile(allBalances, 50);
```

## Min Balance Discrete Jump Behavior

### Definition
When an account has a non-zero minimum balance, it becomes unavailable once it hits that minimum. This causes individual trajectories to show discrete jumps from the minimum balance to $0, but does NOT create survivorship bias in aggregate statistics.

### Root Cause
- Account has `min_balance > 0` (e.g., $60,000 minimum in savings account)
- When account balance would drop below minimum, account becomes unavailable
- Remaining balance (above minimum) is lost/inaccessible
- Portfolio immediately drops to $0 if no other accounts available

### Visual Characteristics
- **Individual trajectories show discrete jumps** from min_balance to $0
- **Aggregate statistics correctly account** for these jumps
- **NO artificial upward movement** in median line
- **Median line shows realistic decline**, then horizontal $0 behavior
- **Discrete "step down" pattern** in individual gray trajectories

### Real-World Example
```
Savings Account: $129,000 balance, $60,000 minimum
Monthly Expenses: $8,500

Month 1: $129,000 → withdraw $8,500 → $120,500
Month 2: $120,500 → withdraw $8,500 → $112,000
...
Month 8: $68,000 → withdraw $8,500 → would be $59,500

Since $59,500 < $60,000 minimum:
- Account becomes unavailable
- Portfolio drops to $0 (discrete jump)
- No further withdrawals possible (auto-stop triggers)
```

### Key Difference from Survivorship Bias
- **Individual behavior**: Affects individual trajectories, not statistics
- **Realistic**: Represents actual account restrictions
- **No upward bias**: Aggregate statistics correctly show portfolio depletion
- **Discrete timing**: Jump occurs at specific month when minimum is hit

## Visual Comparison

### Survivorship Bias Chart
```
Portfolio Value ($000s)
1000 |     ╭─────────────╮  ← Artificial upward curve
 800 |   ╱               ╲    in median (red line)
 600 | ╱                   ╲
 400 |╱                     ╲
 200 |                       ╲
   0 |________________________╲____
     0  2  4  6  8 10 12 14 16 18
                Months

Individual gray lines drop to $0, but median ignores them
```

### Min Balance Discrete Jump Chart  
```
Portfolio Value ($000s)
1000 |╲
 800 | ╲
 600 |  ╲
 400 |   ╲
 200 |    ╲
   0 |     ╲_______________________ ← Realistic horizontal $0
     0  2  4  6  8 10 12 14 16 18      after discrete jumps
                Months

Individual trajectories show discrete jumps, median correctly reflects them
```

## Detection and Testing

### Survivorship Bias Detection
```javascript
// Test: Compare biased vs unbiased percentiles
const biasedMedian = calculatePercentile(successfulScenariosOnly, 50);
const unbiasedMedian = calculatePercentile(allScenarios, 50); // includes $0s

// Evidence of bias: biased median > unbiased median
if (biasedMedian[finalMonth] > unbiasedMedian[finalMonth]) {
  console.log("Survivorship bias detected!");
}
```

### Min Balance Jump Detection
```javascript
// Test: Look for discrete jumps in individual trajectories
function hasDiscreteJump(balanceHistory, minBalance) {
  for (let i = 1; i < balanceHistory.length; i++) {
    const prev = balanceHistory[i-1];
    const curr = balanceHistory[i];
    
    // Discrete jump: previous > minimum, current = 0
    if (prev > minBalance && curr === 0) {
      return true;
    }
  }
  return false;
}
```

## Implementation Guidelines

### For Chart Rendering
1. **Always include failed scenarios** as $0 in percentile calculations
2. **Use consistent data** for both individual trajectories and aggregate statistics
3. **Document min balance behavior** in scenario descriptions
4. **Test both behaviors** separately to ensure correct implementation

### For Scenario Design
1. **Zero min balance**: Allows gradual portfolio depletion
2. **Non-zero min balance**: Creates discrete jumps (realistic for some accounts)
3. **Mixed accounts**: Can show both behaviors in same simulation
4. **Clear documentation**: Explain expected behavior to users

## Common Misconceptions

### ❌ "Discrete jumps are always survivorship bias"
- Min balance jumps are realistic account behavior
- Only statistical exclusion creates survivorship bias

### ❌ "All upward movement is artificial"
- True portfolio growth (from returns) is legitimate
- Only growth from excluding failures is artificial

### ❌ "Min balance jumps break the simulation"
- Discrete jumps are correct behavior for restricted accounts
- Simulation properly handles account unavailability

## Testing Strategy

The comprehensive test suite in `tests/unit/survivorship-bias.test.js` validates:

1. **True survivorship bias detection** and correction
2. **Min balance discrete jump behavior** verification  
3. **Comparison between zero and non-zero** min balance scenarios
4. **Statistical accuracy** of percentile calculations
5. **Visual behavior documentation** for both cases

This ensures the Monte Carlo system correctly handles both behaviors and provides accurate, unbiased analysis of retirement scenarios.
