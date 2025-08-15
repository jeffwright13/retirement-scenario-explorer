/**
 * Survivorship Bias and Min Balance Behavior Tests
 * 
 * These tests document two distinct but visually similar behaviors in Monte Carlo charts:
 * 
 * 1. TRUE SURVIVORSHIP BIAS: When failed scenarios are excluded from percentile calculations,
 *    causing median/percentile lines to show artificial upward movement as successful 
 *    scenarios dominate the statistics.
 * 
 * 2. MIN BALANCE DISCRETE JUMP: When accounts have non-zero minimum balances, they become
 *    unavailable once they hit the minimum, causing a discrete jump to zero in individual
 *    trajectories (but NOT upward movement in aggregate statistics).
 */

/**
 * Mock simulation engine for testing survivorship bias behavior
 * This creates realistic simulation data without requiring the full engine
 */
function createMockSimulation(scenario, variation = 0) {
  const monthlyExpenses = scenario.plan.monthly_expenses;
  const duration = scenario.plan.duration_months;
  const initialBalance = scenario.assets[0].balance * (1 + variation);
  const minBalance = scenario.assets[0].min_balance || 0;
  const hasAutoStop = scenario.plan.stop_on_shortfall;
  
  // Get return rate from scenario (default to 4% annual if not specified)
  const annualReturn = scenario.rate_schedules?.volatile_returns?.rate || 
                      scenario.rate_schedules?.low_returns?.rate || 
                      scenario.rate_schedules?.modest_returns?.rate || 0.04;
  const monthlyReturn = annualReturn / 12;
  
  const balanceHistory = [];
  let currentBalance = initialBalance;
  
  for (let month = 0; month < duration; month++) {
    // Apply growth with some volatility for survivorship bias testing
    const volatility = scenario.rate_schedules?.volatile_returns ? (Math.random() - 0.5) * 0.02 : 0;
    currentBalance *= (1 + monthlyReturn + volatility);
    
    // Subtract expenses
    currentBalance -= monthlyExpenses;
    
    // Handle min balance constraint
    if (currentBalance < minBalance) {
      if (hasAutoStop) {
        // Auto-stop: discrete jump to 0
        currentBalance = 0;
        balanceHistory.push(currentBalance);
        break;
      } else {
        // Allow negative balance
        balanceHistory.push(Math.max(0, currentBalance));
      }
    } else {
      balanceHistory.push(Math.max(0, currentBalance));
    }
    
    // Stop if balance reaches 0
    if (currentBalance <= 0) {
      break;
    }
  }
  
  return {
    balanceHistory,
    finalBalance: balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1] : 0
  };
}

// Create a simplified Monte Carlo service for testing
class TestMonteCarloService {
  async runAnalysis(scenario, iterations = 50) {
    const simulations = [];
    
    for (let i = 0; i < iterations; i++) {
      // Add more aggressive randomness to create mixed outcomes
      const variation = (Math.random() - 0.5) * 0.8; // ±40% variation for more spread
      const result = createMockSimulation(scenario, variation);
      simulations.push(result);
    }
    
    return { simulations };
  }
}

describe('Survivorship Bias vs Min Balance Behavior', () => {
  
  describe('TRUE SURVIVORSHIP BIAS', () => {
    /**
     * SURVIVORSHIP BIAS DEFINITION:
     * When failed scenarios (portfolios that reach $0) are excluded from statistical
     * calculations, the median and percentile lines show artificial upward movement
     * because only successful scenarios contribute to the statistics.
     * 
     * VISUAL BEHAVIOR:
     * - Median line curves UPWARD in later months
     * - Percentile bands show artificial growth
     * - Individual trajectories may fail, but statistics ignore them
     */
    
    test('should demonstrate survivorship bias when failed scenarios are excluded', async () => {
      // Create a scenario designed to have mixed success/failure outcomes
      // Balanced to create both successes and failures
      const testScenario = {
        plan: {
          monthly_expenses: 4500, // Moderate expenses
          duration_months: 48, // 4 years
          inflation_schedule: "no_inflation",
          stop_on_shortfall: true
        },
        income: [],
        assets: [
          {
            name: "Volatile Portfolio",
            type: "taxable", 
            balance: 180000, // Balanced to create mixed outcomes
            min_balance: 0, // Zero min balance - can be fully depleted
            return_schedule: "volatile_returns"
          }
        ],
        order: [{"account": "Volatile Portfolio", "order": 1}],
        rate_schedules: {
          "no_inflation": {"type": "fixed", "rate": 0.0},
          "volatile_returns": {"type": "fixed", "rate": 0.05} // Higher returns to allow some successes
        }
      };

      // Run Monte Carlo with enough simulations to get mixed outcomes
      const monteCarloService = new TestMonteCarloService();
      const results = await monteCarloService.runAnalysis(testScenario, 200); // More iterations for better mix
      
      // Separate successful vs failed scenarios
      const successfulScenarios = results.simulations.filter(sim => 
        sim.balanceHistory[sim.balanceHistory.length - 1] > 0
      );
      const failedScenarios = results.simulations.filter(sim => 
        sim.balanceHistory[sim.balanceHistory.length - 1] === 0
      );
      
      expect(failedScenarios.length).toBeGreaterThan(0);
      expect(successfulScenarios.length).toBeGreaterThan(0);
      
      // Calculate percentiles WITH survivorship bias (excluding failed scenarios)
      const biasedPercentiles = calculatePercentilesWithSurvivorshipBias(
        successfulScenarios, testScenario.plan.duration_months
      );
      
      // Calculate percentiles WITHOUT survivorship bias (including failed scenarios as $0)
      const unbiasedPercentiles = calculatePercentilesWithoutSurvivorshipBias(
        results.simulations, testScenario.plan.duration_months
      );
      
      // SURVIVORSHIP BIAS EVIDENCE:
      // Biased median should be higher than unbiased median in later months
      const finalMonth = testScenario.plan.duration_months - 1;
      const midMonth = Math.floor(testScenario.plan.duration_months / 2);
      
      expect(biasedPercentiles.median[finalMonth]).toBeGreaterThan(
        unbiasedPercentiles.median[finalMonth]
      );
      
      // Biased median may even show UPWARD movement (artificial growth)
      const biasedMedianGrowth = biasedPercentiles.median[finalMonth] - 
                                biasedPercentiles.median[midMonth];
      const unbiasedMedianGrowth = unbiasedPercentiles.median[finalMonth] - 
                                  unbiasedPercentiles.median[midMonth];
      
      // Document the bias effect
      console.log('SURVIVORSHIP BIAS DEMONSTRATION:');
      console.log(`Failed scenarios: ${failedScenarios.length}/${results.simulations.length}`);
      console.log(`Biased final median: $${biasedPercentiles.median[finalMonth].toLocaleString()}`);
      console.log(`Unbiased final median: $${unbiasedPercentiles.median[finalMonth].toLocaleString()}`);
      console.log(`Biased median growth: $${biasedMedianGrowth.toLocaleString()}`);
      console.log(`Unbiased median growth: $${unbiasedMedianGrowth.toLocaleString()}`);
      
      // The key test: survivorship bias creates artificial upward bias
      expect(biasedPercentiles.median[finalMonth]).toBeGreaterThan(
        unbiasedPercentiles.median[finalMonth]
      );
    });
  });

  describe('MIN BALANCE DISCRETE JUMP BEHAVIOR', () => {
    /**
     * MIN BALANCE DISCRETE JUMP DEFINITION:
     * When an account has a non-zero minimum balance, it becomes unavailable once
     * it hits that minimum. This causes individual trajectories to show discrete
     * jumps to zero, but does NOT create survivorship bias in aggregate statistics.
     * 
     * VISUAL BEHAVIOR:
     * - Individual trajectories show discrete jumps from min_balance to $0
     * - Aggregate statistics (median/percentiles) correctly account for these jumps
     * - NO artificial upward movement in median line
     * - Median line shows realistic decline, then horizontal $0 behavior
     */
    
    test('should demonstrate min balance discrete jump without survivorship bias', async () => {
      // Create scenario with non-zero minimum balance
      const testScenario = {
        plan: {
          monthly_expenses: 8500,
          duration_months: 36,
          inflation_schedule: "no_inflation", 
          stop_on_shortfall: true
        },
        income: [],
        assets: [
          {
            name: "Savings with Min Balance",
            type: "taxable",
            balance: 129000,
            min_balance: 60000, // NON-ZERO minimum balance
            return_schedule: "low_returns"
          }
        ],
        order: [{"account": "Savings with Min Balance", "order": 1}],
        rate_schedules: {
          "no_inflation": {"type": "fixed", "rate": 0.0},
          "low_returns": {"type": "fixed", "rate": 0.02}
        }
      };

      // Run single simulation to observe discrete jump behavior
      const singleResult = createMockSimulation(testScenario);
      
      // Find the month where discrete jump occurs
      const balanceHistory = singleResult.balanceHistory;
      let jumpMonth = -1;
      for (let i = 1; i < balanceHistory.length; i++) {
        const prevBalance = balanceHistory[i-1];
        const currBalance = balanceHistory[i];
        
        // Look for discrete jump: previous month > min_balance, current month = 0
        if (prevBalance > testScenario.assets[0].min_balance && currBalance === 0) {
          jumpMonth = i;
          break;
        }
      }
      
      expect(jumpMonth).toBeGreaterThan(-1); // Should find a discrete jump
      
      // Run Monte Carlo to test aggregate behavior
      const monteCarloService = new TestMonteCarloService();
      const results = await monteCarloService.runAnalysis(testScenario, 50);
      
      // Calculate percentiles (should NOT show survivorship bias)
      const percentiles = calculatePercentilesWithoutSurvivorshipBias(
        results.simulations, testScenario.plan.duration_months
      );
      
      // MIN BALANCE BEHAVIOR EVIDENCE:
      // 1. Individual trajectories show discrete jumps
      const trajectoriesWithJumps = results.simulations.filter(sim => {
        for (let i = 1; i < sim.balanceHistory.length; i++) {
          const prevBalance = sim.balanceHistory[i-1];
          const currBalance = sim.balanceHistory[i];
          if (prevBalance > testScenario.assets[0].min_balance && currBalance === 0) {
            return true;
          }
        }
        return false;
      });
      
      expect(trajectoriesWithJumps.length).toBeGreaterThan(0);
      
      // 2. Median line should NOT show artificial upward movement
      const finalMonth = testScenario.plan.duration_months - 1;
      const midMonth = Math.floor(testScenario.plan.duration_months / 2);
      const medianGrowth = percentiles.median[finalMonth] - percentiles.median[midMonth];
      
      // With proper accounting, median should decline or stay flat, NOT grow
      expect(medianGrowth).toBeLessThanOrEqual(0);
      
      // 3. Final median should be $0 (realistic portfolio depletion)
      expect(percentiles.median[finalMonth]).toBe(0);
      
      console.log('MIN BALANCE DISCRETE JUMP DEMONSTRATION:');
      console.log(`Min balance: $${testScenario.assets[0].min_balance.toLocaleString()}`);
      console.log(`Trajectories with discrete jumps: ${trajectoriesWithJumps.length}/${results.simulations.length}`);
      console.log(`Jump occurred at month: ${jumpMonth}`);
      console.log(`Median growth (should be ≤ 0): $${medianGrowth.toLocaleString()}`);
      console.log(`Final median (should be $0): $${percentiles.median[finalMonth].toLocaleString()}`);
    });
    
    test('should show difference between zero and non-zero min balance behavior', async () => {
      const baseScenario = {
        plan: {
          monthly_expenses: 8000,
          duration_months: 24,
          inflation_schedule: "no_inflation",
          stop_on_shortfall: true
        },
        income: [],
        order: [{"account": "Test Account", "order": 1}],
        rate_schedules: {
          "no_inflation": {"type": "fixed", "rate": 0.0},
          "modest_returns": {"type": "fixed", "rate": 0.03}
        }
      };

      // Scenario A: Zero minimum balance (can be fully depleted)
      const zeroMinScenario = {
        ...baseScenario,
        assets: [{
          name: "Test Account",
          type: "taxable",
          balance: 150000,
          min_balance: 0, // Can go to zero
          return_schedule: "modest_returns"
        }]
      };

      // Scenario B: Non-zero minimum balance (discrete jump behavior)
      const nonZeroMinScenario = {
        ...baseScenario,
        assets: [{
          name: "Test Account", 
          type: "taxable",
          balance: 150000,
          min_balance: 50000, // Discrete jump at $50k
          return_schedule: "modest_returns"
        }]
      };

      // Run both scenarios
      const zeroMinResult = createMockSimulation(zeroMinScenario);
      const nonZeroMinResult = createMockSimulation(nonZeroMinScenario);

      // BEHAVIOR DIFFERENCES:
      
      // Get balance histories
      const zeroMinBalanceHistory = zeroMinResult.balanceHistory;
      
      // Check for gradual decline (no large jumps)
      let hasLargeJump = false;
      for (let i = 1; i < zeroMinBalanceHistory.length; i++) {
        const decline = zeroMinBalanceHistory[i-1] - zeroMinBalanceHistory[i];
        if (decline > 20000) { // Arbitrary threshold for "large jump"
          hasLargeJump = true;
          break;
        }
      }
      expect(hasLargeJump).toBe(false); // Should be gradual decline
      
      // 1. Zero min balance: Gradual decline to exactly $0
      const zeroMinFinal = zeroMinBalanceHistory.length > 0 ? zeroMinBalanceHistory[zeroMinBalanceHistory.length - 1] : 0;
      expect(zeroMinFinal).toBe(0);
      
      const nonZeroMinBalanceHistory = nonZeroMinResult.balanceHistory;
      
      // 2. Non-zero min balance: Discrete jump from min_balance to $0
      const nonZeroMinFinal = nonZeroMinBalanceHistory.length > 0 ? nonZeroMinBalanceHistory[nonZeroMinBalanceHistory.length - 1] : 0;
      expect(nonZeroMinFinal).toBe(0);
      
      // Check for discrete jump
      let foundDiscreteJump = false;
      for (let i = 1; i < nonZeroMinBalanceHistory.length; i++) {
        const prevBalance = nonZeroMinBalanceHistory[i-1];
        const currBalance = nonZeroMinBalanceHistory[i];
        if (prevBalance > nonZeroMinScenario.assets[0].min_balance && currBalance === 0) {
          foundDiscreteJump = true;
          break;
        }
      }
      expect(foundDiscreteJump).toBe(true); // Should have discrete jump

      console.log('ZERO vs NON-ZERO MIN BALANCE COMPARISON:');
      console.log(`Zero min - final balance: $${zeroMinFinal.toLocaleString()}`);
      console.log(`Zero min - has large jumps: ${hasLargeJump}`);
      console.log(`Non-zero min - final balance: $${nonZeroMinFinal.toLocaleString()}`);
      console.log(`Non-zero min - has discrete jump: ${foundDiscreteJump}`);
    });
  });
});

/**
 * Helper function to calculate percentiles WITH survivorship bias
 * (excludes failed scenarios from calculations)
 */
function calculatePercentilesWithSurvivorshipBias(successfulScenarios, durationMonths) {
  const percentiles = {
    median: new Array(durationMonths).fill(0),
    p25: new Array(durationMonths).fill(0),
    p75: new Array(durationMonths).fill(0)
  };

  for (let month = 0; month < durationMonths; month++) {
    const monthlyBalances = successfulScenarios
      .map(sim => sim.balanceHistory[month] || 0)
      .sort((a, b) => a - b);

    if (monthlyBalances.length > 0) {
      percentiles.median[month] = getPercentile(monthlyBalances, 50);
      percentiles.p25[month] = getPercentile(monthlyBalances, 25);
      percentiles.p75[month] = getPercentile(monthlyBalances, 75);
    }
  }

  return percentiles;
}

/**
 * Helper function to calculate percentiles WITHOUT survivorship bias
 * (includes failed scenarios as $0 in calculations)
 */
function calculatePercentilesWithoutSurvivorshipBias(allScenarios, durationMonths) {
  const percentiles = {
    median: new Array(durationMonths).fill(0),
    p25: new Array(durationMonths).fill(0), 
    p75: new Array(durationMonths).fill(0)
  };

  for (let month = 0; month < durationMonths; month++) {
    const monthlyBalances = allScenarios
      .map(sim => sim.balanceHistory[month] || 0)
      .sort((a, b) => a - b);

    percentiles.median[month] = getPercentile(monthlyBalances, 50);
    percentiles.p25[month] = getPercentile(monthlyBalances, 25);
    percentiles.p75[month] = getPercentile(monthlyBalances, 75);
  }

  return percentiles;
}

/**
 * Helper function to calculate a specific percentile from sorted array
 */
function getPercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}
