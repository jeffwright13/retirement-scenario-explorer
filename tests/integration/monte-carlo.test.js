/**
 * Monte Carlo Integration Tests
 * Tests the complete Monte Carlo analysis workflow
 */

import { EventBus } from '../../scripts/core/EventBus.js';
import { MonteCarloService } from '../../scripts/services/MonteCarloService.js';
import { MonteCarloController } from '../../scripts/controllers/MonteCarloController.js';
import { MonteCarloChart } from '../../scripts/components/MonteCarloChart.js';

// Mock DOM elements for testing
const mockDOM = {
  getElementById: (id) => {
    const mockElement = {
      addEventListener: jest.fn(),
      style: { display: 'block' },
      disabled: false,
      textContent: '',
      value: '',
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      scrollIntoView: jest.fn(),
      innerHTML: ''
    };
    return mockElement;
  },
  createElement: () => ({
    className: '',
    textContent: '',
    style: { display: 'block' },
    appendChild: jest.fn(),
    parentNode: { removeChild: jest.fn() }
  }),
  body: {
    appendChild: jest.fn()
  }
};

// Mock document
global.document = mockDOM;

describe('Monte Carlo Analysis Integration', () => {
  let eventBus;
  let monteCarloService;
  let monteCarloController;
  let monteCarloChart;

  // Sample scenario data for testing
  const sampleScenario = {
    name: 'Test Retirement Scenario',
    plan: {
      monthly_expenses: 5000,
      assumptions: {
        market_return: 0.07,
        inflation_rate: 0.025
      }
    },
    assets: [
      {
        name: 'Primary Portfolio',
        balance: 1000000,
        draw_order: 1
      }
    ]
  };

  beforeEach(() => {
    eventBus = new EventBus();
    monteCarloService = new MonteCarloService(eventBus);
    monteCarloController = new MonteCarloController(eventBus);
    monteCarloChart = new MonteCarloChart(eventBus);

    // Set up scenario data in controller
    monteCarloController.currentScenarioData = sampleScenario;
  });

  describe('MonteCarloService', () => {
    test('should initialize with correct default configuration', () => {
      expect(monteCarloService.defaultConfig.iterations).toBe(1000);
      expect(monteCarloService.defaultConfig.confidenceIntervals).toEqual([10, 25, 50, 75, 90]);
      expect(monteCarloService.isRunning).toBe(false);
    });

    test('should generate random scenarios with correct structure', () => {
      const variableRanges = {
        'plan.monthly_expenses': {
          type: 'uniform',
          min: 4000,
          max: 6000
        }
      };

      const rng = () => 0.5; // Fixed random for testing
      const randomScenario = monteCarloService.generateRandomScenario(
        sampleScenario, 
        variableRanges, 
        rng
      );

      expect(randomScenario.plan.monthly_expenses).toBe(5000); // 4000 + (6000-4000) * 0.5
      expect(randomScenario.name).toBe(sampleScenario.name);
      expect(randomScenario.assets).toEqual(sampleScenario.assets);
    });

    test('should generate different random values for different distributions', () => {
      const rng = () => 0.5;

      // Normal distribution
      const normalValue = monteCarloService.generateRandomValue({
        type: 'normal',
        mean: 100,
        stdDev: 10
      }, rng);
      expect(typeof normalValue).toBe('number');

      // Uniform distribution
      const uniformValue = monteCarloService.generateRandomValue({
        type: 'uniform',
        min: 10,
        max: 20
      }, rng);
      expect(uniformValue).toBe(15);

      // Triangular distribution
      const triangularValue = monteCarloService.generateRandomValue({
        type: 'triangular',
        min: 0,
        mode: 5,
        max: 10
      }, rng);
      expect(typeof triangularValue).toBe('number');
      expect(triangularValue).toBeGreaterThanOrEqual(0);
      expect(triangularValue).toBeLessThanOrEqual(10);
    });

    test('should calculate statistics correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const confidenceIntervals = [25, 50, 75];
      
      const stats = monteCarloService.calculateStatistics(values, confidenceIntervals);
      
      expect(stats.mean).toBe(5.5);
      expect(stats.median).toBe(5.5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.percentiles[25]).toBe(3.25);
      expect(stats.percentiles[50]).toBe(5.5);
      expect(stats.percentiles[75]).toBe(7.75);
    });

    test('should create seeded random generator', () => {
      const rng1 = monteCarloService.createRandomGenerator(12345);
      const rng2 = monteCarloService.createRandomGenerator(12345);
      
      // Same seed should produce same sequence
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    test('should handle analysis lifecycle events', async () => {
      const mockSimulationResult = {
        results: {
          balanceHistory: [
            { totalBalance: 1000000 },
            { totalBalance: 950000 },
            { totalBalance: 900000 }
          ],
          shortfallMonths: 0,
          totalWithdrawals: 100000
        }
      };

      // Mock the simulation service response
      let simulationCallback;
      eventBus.on('simulation:run', () => {
        setTimeout(() => {
          eventBus.emit('simulation:completed', mockSimulationResult);
        }, 10);
      });

      const analysisPromise = new Promise((resolve) => {
        eventBus.on('montecarlo:completed', (data) => {
          resolve(data);
        });
      });

      // Start analysis with minimal configuration
      eventBus.emit('montecarlo:run', {
        scenarioData: sampleScenario,
        config: { iterations: 5 }, // Small number for testing
        variableRanges: {
          'plan.monthly_expenses': {
            type: 'uniform',
            min: 4500,
            max: 5500
          }
        }
      });

      const result = await analysisPromise;
      
      expect(result.results).toHaveLength(5);
      expect(result.analysis.statistics).toBeDefined();
      expect(result.analysis.successRate).toBeGreaterThanOrEqual(0);
      expect(result.analysis.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('MonteCarloController', () => {
    test('should initialize with correct default state', () => {
      expect(monteCarloController.isAnalysisRunning).toBe(false);
      expect(monteCarloController.currentAnalysis).toBeNull();
      expect(monteCarloController.analysisHistory).toEqual([]);
    });

    test('should handle scenario loading events', () => {
      const scenarioData = { name: 'New Scenario' };
      
      eventBus.emit('scenario:loaded', { scenarioData });
      
      expect(monteCarloController.currentScenarioData).toEqual(scenarioData);
    });

    test('should start analysis with correct configuration', () => {
      const startEventSpy = jest.fn();
      eventBus.on('montecarlo:run', startEventSpy);

      const config = { iterations: 500 };
      monteCarloController.startAnalysis(config);

      expect(startEventSpy).toHaveBeenCalledWith({
        scenarioData: sampleScenario,
        config: expect.objectContaining({ iterations: 500 }),
        variableRanges: expect.any(Object),
        context: expect.any(Object)
      });
    });

    test('should not start analysis without scenario data', () => {
      monteCarloController.currentScenarioData = null;
      const startEventSpy = jest.fn();
      eventBus.on('montecarlo:run', startEventSpy);

      monteCarloController.startAnalysis();

      expect(startEventSpy).not.toHaveBeenCalled();
    });

    test('should handle analysis completion and update state', () => {
      const analysisData = {
        results: [{ iteration: 0, result: {} }],
        analysis: {
          statistics: { finalBalance: { mean: 500000 } },
          successRate: 0.85,
          insights: []
        },
        duration: 1000
      };

      eventBus.emit('montecarlo:completed', analysisData);

      expect(monteCarloController.isAnalysisRunning).toBe(false);
      expect(monteCarloController.currentAnalysis.status).toBe('completed');
      expect(monteCarloController.currentAnalysis.results).toEqual(analysisData.results);
      expect(monteCarloController.analysisHistory).toHaveLength(1);
    });

    test('should get default variable ranges', () => {
      const ranges = monteCarloController.getDefaultVariableRanges();
      
      expect(ranges['plan.assumptions.market_return']).toBeDefined();
      expect(ranges['plan.assumptions.market_return'].type).toBe('normal');
      expect(ranges['plan.assumptions.inflation_rate']).toBeDefined();
      expect(ranges['plan.monthly_expenses']).toBeDefined();
    });

    test('should export results in JSON format', () => {
      // Mock successful analysis
      monteCarloController.currentAnalysis = {
        status: 'completed',
        analysis: { statistics: {}, successRate: 0.8 },
        results: [],
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Mock download functionality
      const mockCreateElement = jest.fn(() => ({
        href: '',
        download: '',
        click: jest.fn()
      }));
      const mockCreateObjectURL = jest.fn(() => 'blob:url');
      const mockRevokeObjectURL = jest.fn();

      global.document.createElement = mockCreateElement;
      global.URL = {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      };
      global.Blob = jest.fn();

      monteCarloController.exportResults('json');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalled();
    });
  });

  describe('Event Bus Integration', () => {
    test('should maintain event bus architecture compliance', () => {
      // Verify no direct parameter passing of business data
      const controller = monteCarloController;
      
      // Controller should store data from event bus
      expect(controller.currentScenarioData).toBeDefined();
      
      // Methods should access controller state, not parameters
      const startAnalysis = controller.startAnalysis.toString();
      expect(startAnalysis).toContain('this.currentScenarioData');
    });

    test('should emit all required events during analysis lifecycle', async () => {
      const events = [];
      const eventTypes = [
        'montecarlo:started',
        'montecarlo:progress',
        'montecarlo:completed'
      ];

      eventTypes.forEach(eventType => {
        eventBus.on(eventType, (data) => {
          events.push({ type: eventType, data });
        });
      });

      // Mock simulation responses
      eventBus.on('simulation:run', () => {
        setTimeout(() => {
          eventBus.emit('simulation:completed', {
            results: {
              balanceHistory: [{ totalBalance: 1000000 }],
              shortfallMonths: 0
            }
          });
        }, 5);
      });

      // Start analysis
      eventBus.emit('montecarlo:run', {
        scenarioData: sampleScenario,
        config: { iterations: 2 },
        variableRanges: {}
      });

      // Wait for completion
      await new Promise(resolve => {
        eventBus.on('montecarlo:completed', resolve);
      });

      expect(events.some(e => e.type === 'montecarlo:started')).toBe(true);
      expect(events.some(e => e.type === 'montecarlo:progress')).toBe(true);
      expect(events.some(e => e.type === 'montecarlo:completed')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle simulation errors gracefully', async () => {
      const errorPromise = new Promise((resolve) => {
        eventBus.on('montecarlo:error', resolve);
      });

      // Mock simulation error
      eventBus.on('simulation:run', () => {
        setTimeout(() => {
          eventBus.emit('simulation:error', { error: 'Simulation failed' });
        }, 5);
      });

      // Start analysis
      eventBus.emit('montecarlo:run', {
        scenarioData: sampleScenario,
        config: { iterations: 1 },
        variableRanges: {}
      });

      const errorResult = await errorPromise;
      expect(errorResult.error).toBeDefined();
    });

    test('should validate configuration parameters', () => {
      const service = monteCarloService;
      
      // Test invalid distribution type
      expect(() => {
        service.generateRandomValue({ type: 'invalid' }, Math.random);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    test('should handle reasonable iteration counts efficiently', async () => {
      const startTime = Date.now();
      
      // Mock fast simulation responses
      eventBus.on('simulation:run', () => {
        setImmediate(() => {
          eventBus.emit('simulation:completed', {
            results: {
              balanceHistory: [{ totalBalance: 1000000 }],
              shortfallMonths: 0
            }
          });
        });
      });

      const completionPromise = new Promise((resolve) => {
        eventBus.on('montecarlo:completed', resolve);
      });

      // Start analysis with moderate iteration count
      eventBus.emit('montecarlo:run', {
        scenarioData: sampleScenario,
        config: { iterations: 100 },
        variableRanges: {
          'plan.monthly_expenses': {
            type: 'uniform',
            min: 4000,
            max: 6000
          }
        }
      });

      await completionPromise;
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Helper function to wait for specific events in tests
function waitForEvent(eventBus, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    eventBus.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
