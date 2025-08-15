/**
 * Tests for SimulationService return sequence generation functionality
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { SimulationService } from '../../../scripts/services/SimulationService.js';

describe('SimulationService Return Sequence Generation', () => {
  let eventBus;
  let simulationService;

  beforeEach(() => {
    eventBus = new EventBus();
    simulationService = new SimulationService(eventBus);
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('generateReturnSequences', () => {
    test('should emit returnmodel:generate-returns event for Monte Carlo simulations', async () => {
      const returnModelEvents = [];
      eventBus.on('returnmodel:generate-returns', (data) => {
        returnModelEvents.push(data);
      });

      const scenarioData = {
        assets: [
          { name: 'investment', type: 'stock' },
          { name: 'bonds', type: 'bond' }
        ],
        plan: { duration_months: 300 }
      };

      await simulationService.generateReturnSequences(scenarioData, 'test-sim-123');

      expect(returnModelEvents).toHaveLength(1);
      expect(returnModelEvents[0]).toMatchObject({
        simulationId: 'test-sim-123',
        assetTypes: ['stock', 'bond'],
        duration: 25, // 300 months = 25 years
        seed: expect.any(Number),
        config: {}
      });
    });

    test('should handle scenarios without assets', async () => {
      const returnModelEvents = [];
      eventBus.on('returnmodel:generate-returns', (data) => {
        returnModelEvents.push(data);
      });

      const scenarioData = {
        plan: { duration_months: 240 }
      };

      await simulationService.generateReturnSequences(scenarioData, 'test-sim-456');

      expect(returnModelEvents).toHaveLength(1);
      expect(returnModelEvents[0].assetTypes).toEqual(['investment']); // Default fallback
    });

    test('should use default duration when not specified', async () => {
      const returnModelEvents = [];
      eventBus.on('returnmodel:generate-returns', (data) => {
        returnModelEvents.push(data);
      });

      const scenarioData = {
        assets: [{ name: 'stocks', type: 'equity' }]
      };

      await simulationService.generateReturnSequences(scenarioData, 'test-sim-789');

      expect(returnModelEvents[0].duration).toBe(25); // 300 months default = 25 years
    });
  });

  describe('Monte Carlo Integration', () => {
    test('should trigger return generation for Monte Carlo simulations', async () => {
      const returnModelEvents = [];
      eventBus.on('returnmodel:generate-returns', (data) => {
        returnModelEvents.push(data);
      });

      // Mock timeaware engine
      const originalImport = simulationService.executeSimulation;
      simulationService.executeSimulation = jest.fn().mockResolvedValue({
        results: [{ assets: { investment: 1000000 } }],
        balanceHistory: { investment: [1000000] }
      });

      const scenarioData = {
        assets: [{ name: 'investment', type: 'stock' }],
        plan: { duration_months: 360 },
        _simulationId: 'mc-test-123'
      };

      const context = { isMonteCarlo: true };

      await simulationService.runSimulation(scenarioData, context);

      expect(returnModelEvents).toHaveLength(1);
      expect(returnModelEvents[0].simulationId).toBe('mc-test-123');
      expect(returnModelEvents[0].duration).toBe(30); // 360 months = 30 years
    });

    test('should not trigger return generation for regular simulations', async () => {
      const returnModelEvents = [];
      eventBus.on('returnmodel:generate-returns', (data) => {
        returnModelEvents.push(data);
      });

      // Mock timeaware engine
      simulationService.executeSimulation = jest.fn().mockResolvedValue({
        results: [{ assets: { investment: 1000000 } }]
      });

      const scenarioData = {
        assets: [{ name: 'investment', type: 'stock' }],
        plan: { duration_months: 360 }
      };

      const context = {}; // Not Monte Carlo

      await simulationService.runSimulation(scenarioData, context);

      expect(returnModelEvents).toHaveLength(0);
    });
  });
});
