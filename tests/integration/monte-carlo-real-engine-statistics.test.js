/**
 * Monte Carlo statistics/aggregation layer, tested against the REAL engine
 * (ISSUES.md #21's fix) instead of hand-written `{ assets: {...} }` mocks
 * that every existing Monte Carlo test file fabricates.
 *
 * These tests encode the CORRECT expected behavior per docs/SPEC.md §5 and
 * are expected to be RED until ISSUES.md #20 is fixed -- that's the point:
 * this suite is the regression test for that fix, written and confirmed
 * failing first per this repo's TDD convention.
 *
 * No variableRanges are used anywhere in this file, so it deliberately
 * isolates the statistics/aggregation bugs (ISSUES.md #20) from the
 * separate, larger return-model randomization gap (ISSUES.md #19) -- every
 * trial below uses the same fixed rate schedule on purpose.
 */

import { EventBus } from '../../scripts/core/EventBus.js';
import { SimulationService } from '../../scripts/services/SimulationService.js';
import { MonteCarloService } from '../../scripts/services/MonteCarloService.js';
import { ReturnModelService } from '../../scripts/services/ReturnModelService.js';

const {
  createSolventScenario,
  createDepletingScenario,
  runRealMonteCarloAnalysis
} = require('../fixtures/monte-carlo-real-fixtures.js');

describe('Monte Carlo statistics layer against the real engine (ISSUES.md #20)', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    new SimulationService(eventBus); // real engine underneath -- no mocks
    new MonteCarloService(eventBus);
    new ReturnModelService(eventBus); // needed for returnSequence to attach to results
  });

  test('finalBalance and maxDrawdown are computed from real balance data, not always 0', async () => {
    const scenario = createSolventScenario(); // declines but never depletes
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    expect(analysis.statistics.finalBalance.mean).toBeGreaterThan(0);
    expect(analysis.statistics.maxDrawdown.mean).toBeGreaterThan(0);
  }, 15000);

  test('timeToDepletion is a real month index for a scenario that actually depletes', async () => {
    const scenario = createDepletingScenario(); // depletes ~month 32-34 of 60
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    expect(analysis.statistics.timeToDepletion.median).not.toBeNull();
    expect(analysis.statistics.timeToDepletion.median).toBeGreaterThan(0);
    expect(analysis.statistics.timeToDepletion.median).toBeLessThan(60);
  }, 15000);

  test('shortfallMonths and totalWithdrawals reflect the real simulation, not the wrong object depth', async () => {
    // stop_on_shortfall:false so the run continues ~27 months past
    // depletion, accumulating real unmet-shortfall months.
    const scenario = createDepletingScenario({ plan: { stop_on_shortfall: false } });
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    expect(analysis.statistics.shortfallMonths.mean).toBeGreaterThan(0);
    expect(analysis.statistics.totalWithdrawals.mean).toBeGreaterThan(0);
  }, 15000);

  test('keyScenarios (worst/median/best) are populated, not always empty', async () => {
    const scenario = createSolventScenario();
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 5,
      targetSurvivalMonths: 60
    });

    expect(Object.keys(analysis.keyScenarios).length).toBeGreaterThan(0);
  }, 20000);

  test('survivalStatistics reflect real depletion timing, not the full duration on every trial', async () => {
    // stop_on_shortfall:false so the *engine's own* results array always
    // runs the full 60 months regardless of depletion -- isolates
    // calculateSurvivalStatistics()'s own (separate) .assets-based
    // depletion detection from the engine's auto-stop truncation, which
    // would otherwise make this assertion pass for the wrong reason.
    const scenario = createDepletingScenario({ plan: { stop_on_shortfall: false } });
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    // This scenario depletes ~month 32-34 -- survival stats should reflect
    // that real depletion timing, not a constant 60 (the engine's own
    // results array length) on every trial.
    expect(analysis.survivalStatistics.median).toBeLessThan(60);
  }, 15000);

  test('the "Final Balance Range" insight is not a literal $0K-to-$0K range for a solvent scenario', async () => {
    const scenario = createSolventScenario();
    const { analysis } = await runRealMonteCarloAnalysis(eventBus, scenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    const finalBalanceInsight = analysis.insights.find(i => i.type === 'final_balance');
    expect(finalBalanceInsight).toBeDefined();
    expect(finalBalanceInsight.value.median).toBeGreaterThan(0);
  }, 15000);

  test('success rate is not unconditionally 100% for a depleting scenario when stop_on_shortfall is false', async () => {
    const stopScenario = createDepletingScenario({ plan: { stop_on_shortfall: true } });
    const noStopScenario = createDepletingScenario({ plan: { stop_on_shortfall: false } });

    const stopResult = await runRealMonteCarloAnalysis(eventBus, stopScenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    // Fresh bus for the second run so nothing bleeds between the two calls.
    const eventBus2 = new EventBus();
    new SimulationService(eventBus2);
    new MonteCarloService(eventBus2);
    new ReturnModelService(eventBus2);
    const noStopResult = await runRealMonteCarloAnalysis(eventBus2, noStopScenario, {
      iterations: 3,
      targetSurvivalMonths: 60
    });

    // Same underlying depletion either way -- disabling auto-stop shouldn't
    // flip whether trials are reported as "successful".
    expect(noStopResult.analysis.successRate).toBeCloseTo(stopResult.analysis.successRate, 1);
  }, 30000);
});
