/**
 * Shared Monte Carlo test fixtures that exercise the REAL time-aware engine
 * (via a real SimulationService instance on the event bus) instead of
 * hand-written month objects shaped like `{ assets: { ... } }` — a shape the
 * real engine never produces. See ISSUES.md #21.
 */

/**
 * A scenario sized to stay solvent for its whole duration but still show
 * real drawdown along the way (expenses exceed growth, balance declines
 * but never hits zero). Useful for asserting finalBalance/maxDrawdown are
 * computed from real data without the "when does it actually deplete"
 * complexity of createDepletingScenario() below.
 */
function createSolventScenario(overrides = {}) {
  const { plan = {}, asset = {}, ...rest } = overrides;
  return {
    plan: {
      monthly_expenses: 1500,
      duration_months: 60,
      stop_on_shortfall: true,
      ...plan
    },
    assets: [
      {
        name: 'Investment',
        type: 'taxable',
        balance: 200000,
        return_schedule: 'growth',
        market_dependent: true,
        investment_type: 'stocks',
        ...asset
      }
    ],
    rate_schedules: {
      growth: { type: 'fixed', rate: 0.06 }
    },
    order: [{ account: 'Investment', order: 1 }],
    ...rest
  };
}

/**
 * A scenario sized to actually deplete partway through its own duration
 * (verified empirically: depletes around month ~32-34 of 60), so tests can
 * observe real depletion timing and real post-depletion shortfall months
 * rather than a scenario that trivially stays solvent throughout.
 */
function createDepletingScenario(overrides = {}) {
  const { plan = {}, asset = {}, ...rest } = overrides;
  return {
    plan: {
      monthly_expenses: 3000,
      duration_months: 60,
      stop_on_shortfall: true,
      ...plan
    },
    assets: [
      {
        name: 'Investment',
        type: 'taxable',
        balance: 100000,
        return_schedule: 'growth',
        market_dependent: true,
        investment_type: 'stocks',
        ...asset
      }
    ],
    rate_schedules: {
      growth: { type: 'fixed', rate: 0.06 }
    },
    order: [{ account: 'Investment', order: 1 }],
    ...rest
  };
}

/**
 * Runs the real montecarlo:run -> montecarlo:completed pipeline (a real
 * SimulationService + a real MonteCarloService, both listening on the
 * supplied event bus) and resolves with the { results, analysis } payload
 * montecarlo:completed actually emits. No variableRanges by default, so
 * this isolates the statistics/aggregation layer (ISSUES.md #20) from the
 * separate, larger return-model randomization gap (ISSUES.md #19).
 */
function runRealMonteCarloAnalysis(eventBus, scenarioData, config = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('montecarlo:completed did not fire within 20s'));
    }, 20000);

    eventBus.on('montecarlo:completed', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
    eventBus.on('montecarlo:error', (data) => {
      clearTimeout(timeout);
      reject(new Error(data.error));
    });

    eventBus.emit('montecarlo:run', {
      scenarioData,
      config: { simulationDelay: 0, parallelBatches: 1, ...config },
      variableRanges: {}
    });
  });
}

module.exports = { createSolventScenario, createDepletingScenario, runRealMonteCarloAnalysis };
