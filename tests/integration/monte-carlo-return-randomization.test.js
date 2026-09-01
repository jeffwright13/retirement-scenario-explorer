/**
 * Regression tests for ISSUES.md #19 -- the Monte Carlo return-randomization
 * rewrite. Directly targets the bug the user hit live: one constant random
 * annual return per trial compounding unchecked for the whole horizon,
 * producing a single outlier trajectory in the billions/hundreds-of-millions
 * that buries every other line on the chart.
 */

import { EventBus } from '../../scripts/core/EventBus.js';
import { SimulationService } from '../../scripts/services/SimulationService.js';
import { MonteCarloService } from '../../scripts/services/MonteCarloService.js';
import { MonteCarloController } from '../../scripts/controllers/MonteCarloController.js';

describe('Monte Carlo return randomization (ISSUES.md #19)', () => {
  test('same-investment-type assets share one monthly noise sequence (correlated, not independent)', () => {
    const monteCarloService = new MonteCarloService(new EventBus());
    const baseScenario = {
      plan: { duration_months: 24 },
      assets: [
        { name: 'Fund A', return_schedule: 'fund_a', market_dependent: true, investment_type: 'stocks' },
        { name: 'Fund B', return_schedule: 'fund_b', market_dependent: true, investment_type: 'stocks' }
      ],
      rate_schedules: {
        fund_a: { type: 'fixed', rate: 0.06 },
        fund_b: { type: 'fixed', rate: 0.09 } // different base rate, same type
      }
    };
    const marketDependentAssets = [
      { assetName: 'Fund A', scheduleName: 'fund_a', isLegacyInterestRate: false, baseInterestRate: null, investmentType: 'stocks', stdDev: 0.18 },
      { assetName: 'Fund B', scheduleName: 'fund_b', isLegacyInterestRate: false, baseInterestRate: null, investmentType: 'stocks', stdDev: 0.18 }
    ];
    const rng = (() => {
      let i = 0;
      const values = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4]; // varied, deterministic sequence
      return () => values[i++ % values.length];
    })();

    const { scenario } = monteCarloService.generateRandomScenario(baseScenario, marketDependentAssets, rng);

    const valuesA = scenario.rate_schedules.fund_a.values;
    const valuesB = scenario.rate_schedules.fund_b.values;
    const expectedBaseDiff = 0.09 - 0.06; // values[] is annual-scale (see generateRandomScenario)

    // Both funds are "stocks" -- the noise term must be identical each
    // month, so the two annual-scale rate arrays differ by exactly the two
    // funds' base-rate difference at every single month.
    for (let m = 0; m < 24; m++) {
      expect(valuesB[m] - valuesA[m]).toBeCloseTo(expectedBaseDiff, 10);
    }
  });

  test('final-balance dispersion no longer explodes into billion-dollar outliers for a realistic stock scenario', async () => {
    const eventBus = new EventBus();
    new SimulationService(eventBus);
    const monteCarloService = new MonteCarloService(eventBus);
    const monteCarloController = new MonteCarloController(eventBus);

    monteCarloController.currentScenarioData = {
      // Comfortable expense-to-balance ratio (well below what 7% growth on
      // $500K supports) so most trials stay solvent and have a real median
      // -- isolating "does dispersion explode" from "does this scenario
      // even work," which is a separate, legitimate way for median to be 0.
      plan: { monthly_expenses: 1200, duration_months: 180, stop_on_shortfall: true },
      assets: [
        {
          name: 'Investment',
          balance: 500000,
          return_schedule: 'growth',
          market_dependent: true,
          investment_type: 'stocks' // 18% stdDev -- the volatility that produced the $900M outlier
        }
      ],
      rate_schedules: { growth: { type: 'fixed', rate: 0.07 } },
      order: [{ account: 'Investment', order: 1 }]
    };

    const marketDependentAssets = monteCarloController.getMarketDependentAssetConfig();

    const completion = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out')), 30000);
      eventBus.on('montecarlo:completed', (data) => { clearTimeout(timeout); resolve(data); });
      eventBus.on('montecarlo:error', (data) => { clearTimeout(timeout); reject(new Error(data.error)); });
    });

    eventBus.emit('montecarlo:run', {
      scenarioData: monteCarloController.currentScenarioData,
      config: { iterations: 60, randomSeed: 42, simulationDelay: 0, parallelBatches: 1, targetSurvivalMonths: 180 },
      marketDependentAssets
    });

    const { results } = await completion;
    const finalBalances = results.map(r => r.finalBalance).sort((a, b) => a - b);
    const median = finalBalances[Math.floor(finalBalances.length / 2)];
    const max = finalBalances[finalBalances.length - 1];

    // Old behavior (one constant annual return/trial): a single high draw
    // compounds unchecked, producing max/median ratios in the thousands or
    // worse (the user saw ~$900M on a portfolio that started around $500K).
    // New behavior (real monthly draws): dispersion scales with sqrt(T),
    // not T -- generously bounded well under the old behavior's magnitude.
    expect(max / median).toBeLessThan(50);
  }, 30000);
});
