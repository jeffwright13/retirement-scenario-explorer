/**
 * SimulationService.analyzeAssetDepletion() -- follow-up to ISSUES.md #20.
 * Previously read `finalResult.balances`, a field the engine's per-month log
 * entries never have, so the "Asset Alert" insight could never fire. Fixed
 * to read the real balanceHistory instead.
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { SimulationService } from '../../../scripts/services/SimulationService.js';

const {
  createSolventScenario,
  createDepletingScenario
} = require('../../fixtures/monte-carlo-real-fixtures.js');

function findAssetAlert(insights) {
  return insights.find(i => typeof i.message === 'string' && i.message.includes('Asset Alert'));
}

describe('SimulationService.analyzeAssetDepletion', () => {
  let eventBus;
  let simulationService;

  beforeEach(() => {
    eventBus = new EventBus();
    simulationService = new SimulationService(eventBus);
  });

  test('flags an asset that actually depletes below 5% of its starting balance', async () => {
    const scenario = createDepletingScenario(); // depletes ~month 32-34 of 60
    const result = await simulationService.runSimulation(scenario);

    const alert = findAssetAlert(result.insights);
    expect(alert).toBeDefined();
    expect(alert.message).toContain('Investment');
  });

  test('does not flag a solvent asset that never comes close to depleting', async () => {
    const scenario = createSolventScenario(); // declines but stays well above 5%
    const result = await simulationService.runSimulation(scenario);

    expect(findAssetAlert(result.insights)).toBeUndefined();
  });

  test('does not flag negative-balance "planned expense" assets as depleted', async () => {
    // Negative balances are the BRIEF.md "planned future expense" idiom --
    // inert, never withdrawn from, so an unchanged negative balance must
    // never be reported as "depleted".
    const scenario = {
      plan: { monthly_expenses: 500, duration_months: 24, stop_on_shortfall: true },
      assets: [
        { name: 'Checking', type: 'taxable', balance: 50000 },
        { name: 'Planned Home Repair', type: 'taxable', balance: -8000 }
      ],
      order: [{ account: 'Checking', order: 1 }]
    };

    const result = await simulationService.runSimulation(scenario);

    const alert = findAssetAlert(result.insights);
    expect(alert === undefined || !alert.message.includes('Planned Home Repair')).toBe(true);
  });
});
