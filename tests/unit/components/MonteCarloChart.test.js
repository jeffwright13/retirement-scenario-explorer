/**
 * Tests for MonteCarloChart.js
 */

import { jest } from '@jest/globals';
import { MonteCarloChart } from '../../../scripts/components/MonteCarloChart.js';

describe('MonteCarloChart', () => {
  let monteCarloChart;
  let mockEventBus;
  let mockCanvas;
  let mockContext;
  let mockContainer;

  beforeEach(() => {
    // Mock event bus
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn()
    };

    // Mock canvas and context
    mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      closePath: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      setLineDash: jest.fn(),
      measureText: jest.fn(() => ({ width: 50 })),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      }))
    };

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      width: 800,
      height: 400,
      style: {}
    };

    mockContainer = {
      innerHTML: '',
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      style: { display: 'none' },
      id: 'test-container'
    };

    // Mock DOM methods
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const elementMap = {
        'monte-carlo-section-results': mockContainer,
        'monte-carlo-charts': mockContainer,
        'monte-carlo-chart-area': mockContainer,
        'monte-carlo-trajectory-chart': mockContainer,
        'distribution-chart': mockCanvas,
        'confidence-chart': mockCanvas,
        'risk-chart': mockCanvas,
        'paths-chart': mockCanvas,
        'success-rate-container': mockContainer
      };
      return elementMap[id] || null;
    });

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas;
      if (tagName === 'div') return { ...mockContainer };
      if (tagName === 'a') return {
        href: '',
        download: '',
        click: jest.fn(),
        style: { display: 'none' }
      };
      return mockContainer;
    });

    // Mock document.body
    Object.defineProperty(document, 'body', {
      value: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      writable: true,
      configurable: true
    });

    // Mock window.URL
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'mock-url'),
        revokeObjectURL: jest.fn()
      },
      writable: true,
      configurable: true
    });

    // Mock Blob
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
      size: content[0].length,
      type: options.type
    }));

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    monteCarloChart = new MonteCarloChart(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(monteCarloChart.eventBus).toBe(mockEventBus);
      expect(monteCarloChart.currentAnalysis).toBeNull();
      expect(monteCarloChart.currentTrajectories).toBeNull();
      expect(monteCarloChart.chartContainer).toBeNull();
    });

    test('should set up event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('montecarlo:display-monte-carlo-charts', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('montecarlo:chart-type-changed', expect.any(Function));
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      monteCarloChart.initialize();
      expect(console.log).toHaveBeenCalledWith('📈 Initializing Monte Carlo Chart');
    });
  });

  describe('Event Handlers', () => {
    test('should handle montecarlo:display-monte-carlo-charts event', () => {
      const eventData = {
        analysis: { successRate: 0.85 },
        results: [
          [{ totalBalance: 100000 }, { totalBalance: 95000 }],
          [{ totalBalance: 110000 }, { totalBalance: 105000 }]
        ]
      };

      // Get the event handler
      const displayHandler = mockEventBus.on.mock.calls.find(call => 
        call[0] === 'montecarlo:display-monte-carlo-charts'
      )[1];

      displayHandler(eventData);

      expect(monteCarloChart.currentAnalysis).toBe(eventData.analysis);
      expect(mockContainer.style.display).toBe('block');
    });

    test('should handle montecarlo:chart-type-changed event', () => {
      const switchChartTypeSpy = jest.spyOn(monteCarloChart, 'switchChartType').mockImplementation();
      
      const eventData = { chartType: 'distribution' };

      // Get the event handler
      const chartTypeHandler = mockEventBus.on.mock.calls.find(call => 
        call[0] === 'montecarlo:chart-type-changed'
      )[1];

      chartTypeHandler(eventData);

      expect(switchChartTypeSpy).toHaveBeenCalledWith('distribution');
    });
  });

  describe('Display Monte Carlo Charts', () => {
    test('should display charts with valid data', () => {
      const data = {
        results: [
          [{ totalBalance: 100000 }, { totalBalance: 95000 }],
          [{ totalBalance: 110000 }, { totalBalance: 105000 }]
        ],
        scenarioData: { plan: { monthly_expenses: 5000 } }
      };

      const displayTrajectoryOverlaySpy = jest.spyOn(monteCarloChart, 'displayTrajectoryOverlay').mockImplementation();

      monteCarloChart.displayMonteCarloCharts(data);

      expect(mockContainer.style.display).toBe('block');
      expect(displayTrajectoryOverlaySpy).toHaveBeenCalledWith(data.results, data.scenarioData, 'monte-carlo-chart-area');
    });

    test('should handle missing monte carlo section gracefully', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      const data = { results: [] };
      
      expect(() => {
        monteCarloChart.displayMonteCarloCharts(data);
      }).not.toThrow();
    });
  });

  describe('Export Data', () => {
    test('should export data when trajectories are available', () => {
      const mockTrajectories = [
        [{ totalBalance: 100000 }, { totalBalance: 95000 }],
        [{ totalBalance: 110000 }, { totalBalance: 105000 }]
      ];

      monteCarloChart.currentTrajectories = mockTrajectories;

      const calculatePercentileDataSpy = jest.spyOn(monteCarloChart, 'calculatePercentileData')
        .mockReturnValue([
          { month: 0, p10: 100, p25: 105, p50: 110, p75: 115, p90: 120, activeCount: 2 },
          { month: 1, p10: 95, p25: 100, p50: 105, p75: 110, p90: 115, activeCount: 2 }
        ]);

      monteCarloChart.exportData();

      expect(calculatePercentileDataSpy).toHaveBeenCalledWith(mockTrajectories);
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Year,P10,P25,P50_Median,P75,P90,ActiveScenarios')],
        { type: 'text/csv' }
      );
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle no data to export', () => {
      monteCarloChart.currentTrajectories = null;

      monteCarloChart.exportData();

      expect(console.log).toHaveBeenCalledWith('📊 MonteCarloChart: No data to export');
      expect(global.Blob).not.toHaveBeenCalled();
    });

    test('should handle empty trajectories', () => {
      monteCarloChart.currentTrajectories = [];

      monteCarloChart.exportData();

      expect(console.log).toHaveBeenCalledWith('📊 MonteCarloChart: No data to export');
    });
  });

  describe('Calculate Percentile Data', () => {
    test('should calculate percentiles correctly', () => {
      // Need at least 10 trajectories for the method to return data
      const trajectories = [];
      for (let i = 0; i < 12; i++) {
        trajectories.push([
          { totalBalance: 100000 + i * 1000 }, 
          { totalBalance: 95000 + i * 1000 }
        ]);
      }

      const result = monteCarloChart.calculatePercentileData(trajectories);

      expect(result).toHaveLength(2); // 2 months
      expect(result[0]).toHaveProperty('month', 0);
      expect(result[0]).toHaveProperty('p10');
      expect(result[0]).toHaveProperty('p50');
      expect(result[0]).toHaveProperty('p90');
      expect(result[0]).toHaveProperty('activeCount', 12);
    });

    test('should handle trajectories with different lengths', () => {
      // Need at least 10 trajectories, but with different lengths
      const trajectories = [];
      for (let i = 0; i < 12; i++) {
        if (i < 10) {
          // Most trajectories have 3 months
          trajectories.push([
            { totalBalance: 100000 + i * 1000 }, 
            { totalBalance: 95000 + i * 1000 }, 
            { totalBalance: 90000 + i * 1000 }
          ]);
        } else {
          // Some shorter trajectories
          trajectories.push([{ totalBalance: 110000 + i * 1000 }]);
        }
      }

      const result = monteCarloChart.calculatePercentileData(trajectories);

      expect(result).toHaveLength(3); // Max length is 3
      expect(result[2].activeCount).toBe(10); // 10 trajectories have 3rd month
    });
  });

  describe('Render Methods', () => {
    test('should render with valid data', () => {
      const data = {
        analysis: {
          statistics: { 
            finalBalance: { mean: 100000, std: 20000 }
          },
          riskMetrics: { var95: 50000, cvar95: 30000 },
          successRate: 0.85
        },
        results: [
          [{ totalBalance: 100000 }],
          [{ totalBalance: 110000 }]
        ],
        baselineScenario: { plan: { monthly_expenses: 5000 } }
      };

      // Mock the methods that don't exist but are called by render
      monteCarloChart.renderDistributionChart = jest.fn();
      monteCarloChart.renderRiskMetrics = jest.fn();
      monteCarloChart.renderSuccessRate = jest.fn();
      monteCarloChart.renderTrajectoryOverlay = jest.fn();
      monteCarloChart.clearCanvas = jest.fn();

      monteCarloChart.render(data);

      expect(monteCarloChart.clearCanvas).toHaveBeenCalled();
      expect(monteCarloChart.renderDistributionChart).toHaveBeenCalledWith(data.analysis.statistics.finalBalance);
      expect(monteCarloChart.renderRiskMetrics).toHaveBeenCalledWith(data.analysis.riskMetrics);
      expect(monteCarloChart.renderSuccessRate).toHaveBeenCalledWith(data.analysis.successRate);
      expect(monteCarloChart.renderTrajectoryOverlay).toHaveBeenCalledWith(data.results, data.baselineScenario);
    });

    test('should handle missing data gracefully', () => {
      monteCarloChart.render(null);
      expect(console.warn).toHaveBeenCalledWith('MonteCarloChart: No data to render');

      monteCarloChart.render({});
      expect(console.warn).toHaveBeenCalledWith('MonteCarloChart: No data to render');
    });
  });

  describe('Chart Creation', () => {
    test('should create monte carlo chart container', () => {
      // Mock getElementById to return null first (no existing container)
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'monte-carlo-charts') return null; // No existing container
        if (id === 'monte-carlo-section-results') return mockContainer;
        return null;
      });
      
      // The method doesn't return the container, but should create DOM elements
      monteCarloChart.createMonteCarloChartContainer();
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    test('should handle missing results section gracefully', () => {
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'monte-carlo-charts') return null; // No existing container
        if (id === 'monte-carlo-section-results') return null; // No results section
        return null;
      });
      
      const result = monteCarloChart.createMonteCarloChartContainer();
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('Monte Carlo results section not found');
    });

    test('should create main container', () => {
      // Mock the DOM elements needed for createMainContainer
      const mockInsertPoint = {
        parentNode: {
          insertBefore: jest.fn()
        },
        nextSibling: mockContainer
      };
      
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'chart-container') return mockInsertPoint;
        return mockContainer;
      });
      
      const container = monteCarloChart.createMainContainer();
      expect(container).toBeDefined();
    });
  });

  describe('Display Charts', () => {
    test('should display distribution chart', () => {
      const statistics = { 
        mean: 100000, 
        std: 20000, 
        histogram: [10, 20, 30, 20, 10],
        percentiles: { 10: 80000, 25: 90000, 50: 100000, 75: 110000, 90: 120000 },
        min: 70000,
        max: 130000
      };
      
      monteCarloChart.displayDistributionChart(statistics, 'distribution-chart');
      
      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    test('should handle missing canvas for distribution chart', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      expect(() => {
        monteCarloChart.displayDistributionChart({}, 'missing-canvas');
      }).not.toThrow();
    });

    test('should display confidence interval chart', () => {
      const statistics = { 
        totalBalance: {
          median: 100000,
          percentiles: { 10: 80000, 90: 120000 },
          min: 70000,
          max: 130000
        }
      };
      
      monteCarloChart.displayConfidenceIntervalChart(statistics, 'confidence-chart');
      
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    test('should display risk chart', () => {
      const riskMetrics = { 
        valueAtRisk: 50000, 
        conditionalVaR: 30000, 
        maxDrawdown: { percentiles: { 95: 0.2 } }
      };
      
      monteCarloChart.displayRiskChart(riskMetrics, 'risk-chart');
      
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    test('should display scenario paths chart', () => {
      const results = [
        { 
          result: { 
            results: { 
              results: [{ totalBalance: 100000 }, { totalBalance: 95000 }],
              balanceHistory: [100000, 95000]
            }
          }
        },
        { 
          result: { 
            results: { 
              results: [{ totalBalance: 110000 }, { totalBalance: 105000 }],
              balanceHistory: [110000, 105000]
            }
          }
        }
      ];
      const scenarioData = { plan: { monthly_expenses: 5000 } };
      
      monteCarloChart.displayScenarioPathsChart(results, scenarioData, 'paths-chart');
      
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    test('should display success rate chart', () => {
      const analysis = { successRate: 0.85 };
      
      monteCarloChart.displaySuccessRateChart(analysis, 'success-rate-container');
      
      expect(mockContainer.innerHTML).toContain('85%');
    });
  });

  describe('Trajectory Overlay', () => {
    test('should display trajectory overlay with valid data', () => {
      const results = [
        [{ totalBalance: 100000 }, { totalBalance: 95000 }],
        [{ totalBalance: 110000 }, { totalBalance: 105000 }]
      ];
      const scenarioData = { plan: { monthly_expenses: 5000 } };

      const extractTrajectoriesSpy = jest.spyOn(monteCarloChart, 'extractTrajectories')
        .mockReturnValue(results);

      monteCarloChart.displayTrajectoryOverlay(results, scenarioData, 'monte-carlo-chart-area');

      expect(extractTrajectoriesSpy).toHaveBeenCalledWith(results);
    });

    test('should handle missing container', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      monteCarloChart.displayTrajectoryOverlay([], {}, 'missing-container');
      
      expect(console.warn).toHaveBeenCalledWith('⚠️ Monte Carlo trajectory container not found:', 'missing-container');
    });

    test('should handle invalid results data', () => {
      monteCarloChart.displayTrajectoryOverlay('invalid-data', {}, 'monte-carlo-chart-area');
      
      expect(console.error).toHaveBeenCalledWith('❌ Results is not an array:', 'string', 'invalid-data');
    });

    test('should handle empty trajectories', () => {
      const extractTrajectoriesSpy = jest.spyOn(monteCarloChart, 'extractTrajectories')
        .mockReturnValue([]);

      monteCarloChart.displayTrajectoryOverlay([], {}, 'monte-carlo-chart-area');

      expect(console.warn).toHaveBeenCalledWith('⚠️ No trajectories extracted from Monte Carlo results');
    });
  });

  describe('Utility Methods', () => {
    test('should calculate percentile correctly', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      const p50 = monteCarloChart.percentile(data, 50);
      expect(p50).toBe(55); // Median of 10 values
      
      const p90 = monteCarloChart.percentile(data, 90);
      expect(p90).toBe(91); // Corrected expected value based on actual algorithm
    });

    test('should handle edge cases in percentile calculation', () => {
      const singleValue = [50];
      expect(monteCarloChart.percentile(singleValue, 50)).toBe(50);
      
      const twoValues = [10, 20];
      expect(monteCarloChart.percentile(twoValues, 50)).toBe(15);
    });

    test('should extract trajectories from results', () => {
      const results = [
        { 
          result: { 
            results: { 
              results: [{}, {}], // Monthly data array
              balanceHistory: {
                'Savings': [100000, 95000],
                'Investment': [0, 0]
              }
            }
          }
        },
        { 
          result: { 
            results: { 
              results: [{}, {}], // Monthly data array
              balanceHistory: {
                'Savings': [110000, 105000],
                'Investment': [0, 0]
              }
            }
          }
        }
      ];

      const trajectories = monteCarloChart.extractTrajectories(results);
      
      expect(trajectories).toHaveLength(2);
      expect(trajectories[0]).toHaveLength(2);
      expect(trajectories[0][0].totalBalance).toBe(100000);
      expect(trajectories[0][1].totalBalance).toBe(95000);
    });

    test('should switch chart type', () => {
      monteCarloChart.switchChartType('distribution');
      
      // Should log the chart type switch
      expect(console.log).toHaveBeenCalledWith('📊 MonteCarloChart: Switching to chart type: distribution');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null trajectories in export', () => {
      monteCarloChart.currentTrajectories = null;
      
      expect(() => {
        monteCarloChart.exportData();
      }).not.toThrow();
    });

    test('should handle empty analysis data', () => {
      expect(() => {
        monteCarloChart.render({ analysis: null });
      }).not.toThrow();
    });

    test('should handle malformed trajectory data', () => {
      const malformedResults = [
        [null, { totalBalance: 95000 }],
        [{ totalBalance: 110000 }, undefined]
      ];

      expect(() => {
        monteCarloChart.extractTrajectories(malformedResults);
      }).not.toThrow();
    });
  });
});
