/**
 * Tests for MonteCarloController's "Expected income" scenario insight.
 * See ISSUES.md #2b: the naive sum of every income source's amount claims a
 * combined total that's never actually true at any point in the simulation
 * when income sources don't overlap in time.
 */

import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('MonteCarloController Expected Income insight', () => {
  let monteCarloController;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    monteCarloController = new MonteCarloController(eventBus);
  });

  test('should not claim a combined total for two non-overlapping income sources (ISSUES.md #2b)', () => {
    monteCarloController.currentScenarioData = {
      plan: { monthly_expenses: 4000, duration_months: 120 },
      income: [
        { name: 'Part-time work', amount: 2000, start_month: 1, stop_month: 12 },
        { name: 'Social Security', amount: 2500, start_month: 84, stop_month: null }
      ]
    };

    const insights = monteCarloController.generateScenarioInsights();
    const incomeInsight = insights.find(i => i.text.includes('income'));

    expect(incomeInsight).toBeDefined();
    // These two sources never overlap, so $4,500/month is never actually true —
    // the insight must not claim that combined total. There's also a real gap
    // between month 12 (part-time work stops) and month 84 (Social Security
    // starts) where income is genuinely $0 — the range should reflect that gap
    // rather than just the two sources' individual amounts.
    expect(incomeInsight.text).not.toContain('4,500');
    expect(incomeInsight.text).toBe(
      'Expected income: ranges from $0 to $2,500/month across the simulation (2 source(s))'
    );
  });

  test('should still report a single flat total when income sources fully overlap', () => {
    monteCarloController.currentScenarioData = {
      plan: { monthly_expenses: 4000, duration_months: 120 },
      income: [
        { name: 'Pension', amount: 1500, start_month: 1, stop_month: null },
        { name: 'Social Security', amount: 2000, start_month: 1, stop_month: null }
      ]
    };

    const insights = monteCarloController.generateScenarioInsights();
    const incomeInsight = insights.find(i => i.text.includes('income'));

    expect(incomeInsight.text).toBe('Expected income: $3,500/month from 2 source(s)');
  });
});
