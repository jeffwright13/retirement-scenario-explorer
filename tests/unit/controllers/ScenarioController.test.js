/**
 * ScenarioController Unit Tests
 */

import { ScenarioController } from '../../../scripts/controllers/ScenarioController.js';

describe('ScenarioController', () => {
  describe('extractKeyAssumptions', () => {
    test('should render an "ends month N" detail for income with a stop_month (ISSUES.md #2a)', () => {
      const mockEventBus = { on: jest.fn(), emit: jest.fn() };
      const scenarioController = new ScenarioController(
        {}, // contentService
        {}, // simulationService
        {}, // validationService
        mockEventBus
      );

      const scenario = {
        plan: { monthly_expenses: 4000 },
        income: [{
          name: 'Part-time work',
          amount: 2000,
          start_month: 1,
          stop_month: 12
        }]
      };

      const synopsis = scenarioController.extractKeyAssumptions(scenario);

      expect(synopsis.income[0]).toContain('ends month 12');
    });
  });
});
