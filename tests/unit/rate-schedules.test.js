/**
 * RateSchedule 'monthly_values' type -- added for Monte Carlo per-month
 * randomized returns (ISSUES.md #19). No prior test file existed for
 * rate-schedules.js; this covers the new type only.
 */

import { RateScheduleManager, RateSchedule } from '../../scripts/rate-schedules.js';

describe('RateSchedule monthly_values type', () => {
  test('returns the rate at the given month index', () => {
    const schedule = new RateSchedule({ type: 'monthly_values', values: [0.01, 0.02, -0.005] });

    expect(schedule.getRateForMonth(0)).toBe(0.01);
    expect(schedule.getRateForMonth(1)).toBe(0.02);
    expect(schedule.getRateForMonth(2)).toBe(-0.005);
  });

  test('holds the last value for months beyond the array length', () => {
    const schedule = new RateSchedule({ type: 'monthly_values', values: [0.01, 0.02] });

    expect(schedule.getRateForMonth(5)).toBe(0.02);
  });

  test('is accessible via RateScheduleManager like every other type', () => {
    const manager = new RateScheduleManager();
    manager.addSchedule('mc_trial', { type: 'monthly_values', values: [0.03, 0.04] });

    expect(manager.getRate('mc_trial', 0)).toBe(0.03);
    expect(manager.getRate('mc_trial', 1)).toBe(0.04);
  });
});
