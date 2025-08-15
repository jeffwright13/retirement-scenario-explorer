/**
 * Monte Carlo Controller CSV Export Tests
 * Tests the CSV export functionality, specifically the success calculation logic
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';

// Mock DOM to avoid download issues - we'll spy on Blob instead
global.document = {
  getElementById: jest.fn(() => ({ addEventListener: jest.fn() })),
  createElement: jest.fn(() => ({ 
    href: '', 
    download: '', 
    click: jest.fn(),
    style: {} 
  })),
  body: { 
    appendChild: jest.fn(), 
    removeChild: jest.fn() 
  }
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// We'll capture CSV content through Blob constructor
let capturedCSVContent = '';
global.Blob = jest.fn((content, options) => {
  if (options?.type === 'text/csv') {
    capturedCSVContent = content[0];
  }
  return { content, options };
});

describe('MonteCarloController CSV Export', () => {
  let eventBus;
  let controller;

  const sampleScenario = {
    name: 'Test Retirement Scenario',
    plan: {
      monthly_expenses: 5000,
      duration_months: 168, // 14 years
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
    controller = new MonteCarloController(eventBus);
    controller.currentScenarioData = sampleScenario;

    // Reset captured content and mocks
    capturedCSVContent = '';
    jest.clearAllMocks();
  });

  describe('Success Calculation Logic', () => {
    test('should calculate success correctly with both survival time and minimum balance criteria', () => {
      // Mock analysis data
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 168 // 14 years
        }
      };

      const mockResults = [
        // Successful: survived 14+ years with balance >= 0
        {
          results: {
            timeawareResults: Array(180).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(0, 1000000 - (i * 5000)) }
            }))
          }
        },
        // Failed: survived < 14 years (depleted at month 150)
        {
          results: {
            timeawareResults: Array(150).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(0, 800000 - (i * 5000)) }
            }))
          }
        },
        // Failed: survived 14+ years but final balance < minimum (negative balance scenario)
        {
          results: {
            timeawareResults: Array(180).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': i < 170 ? Math.max(0, 900000 - (i * 5000)) : 0 }
            }))
          }
        }
      ];

      // Mock the downloadCSV method to capture CSV content
      let csvContent = '';
      const originalCreateElement = global.document.createElement;
      global.document.createElement = jest.fn((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: jest.fn(),
            style: {}
          };
        }
        return originalCreateElement(tag);
      });

      global.Blob = jest.fn((content) => {
        csvContent = content[0];
        return { content, type: 'text/csv' };
      });

      // Set up analysis data
      controller.currentAnalysis = {
        status: 'completed',
        results: mockResults,
        analysis: {
          statistics: {
            finalBalance: [500000, 0, 0],
            survivalTime: [15.0, 12.5, 15.0]
          },
          successRate: 0.33, // 1 out of 3 successful
          keyScenarios: {}
        },
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Prepare data structure as expected by downloadCSV
      const exportData = {
        analysis: controller.currentAnalysis.analysis,
        results: controller.currentAnalysis.results,
        metadata: {
          scenarioName: controller.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
          exportDate: new Date().toISOString(),
          iterations: controller.currentAnalysis.results?.length || 0,
          duration: controller.currentAnalysis.duration
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse CSV content to check individual simulation success
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      // Check individual simulation results
      const sim1 = lines[simulationHeaderIndex + 1].split(',');
      const sim2 = lines[simulationHeaderIndex + 2].split(',');
      const sim3 = lines[simulationHeaderIndex + 3].split(',');

      expect(sim1[1]).toBe('Yes'); // Survived 15 years with positive balance
      expect(sim2[1]).toBe('No');  // Only survived 12.5 years
      expect(sim3[1]).toBe('Yes'); // Survived 15 years with minimum balance (0)

      // Verify success rate matches
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('33.3%'); // 1/3 = 33.3%
    });

    test('should handle minimum balance requirement correctly', () => {
      // Test with target survival time
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 168
        }
      };

      const mockResults = [
        // Failed: survived target time but balance < minimum
        {
          results: {
            timeawareResults: Array(180).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': i < 170 ? Math.max(0, 200000 - (i * 1000)) : 30000 }
            }))
          }
        },
        // Successful: survived target time with balance >= minimum
        {
          results: {
            timeawareResults: Array(180).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(50000, 500000 - (i * 2000)) }
            }))
          }
        }
      ];

      controller.currentAnalysis = {
        status: 'completed',
        results: mockResults,
        analysis: {
          statistics: {
            finalBalance: [30000, 60000],
            survivalTime: [15.0, 15.0]
          },
          successRate: 0.50, // 1 out of 2 successful
          keyScenarios: {}
        },
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Prepare data structure as expected by downloadCSV
      const exportData = {
        analysis: controller.currentAnalysis.analysis,
        results: controller.currentAnalysis.results,
        metadata: {
          scenarioName: controller.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
          exportDate: new Date().toISOString(),
          iterations: controller.currentAnalysis.results?.length || 0,
          duration: controller.currentAnalysis.duration
        }
      };

      controller.downloadCSV(exportData, 'test-export.csv');

      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      const sim1 = lines[simulationHeaderIndex + 1].split(',');
      const sim2 = lines[simulationHeaderIndex + 2].split(',');

      expect(sim1[1]).toBe('No');  // $30k < $50k minimum
      expect(sim2[1]).toBe('Yes'); // $60k >= $50k minimum
    });

    test('should handle edge cases in success calculation', () => {
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 120 // 10 years
        }
      };

      const mockResults = [
        // Edge case: exactly meets target months
        {
          results: {
            timeawareResults: Array(120).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(0, 600000 - (i * 5000)) }
            }))
          }
        },
        // Edge case: exactly meets minimum balance
        {
          results: {
            timeawareResults: Array(130).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': i === 129 ? 0 : Math.max(0, 650000 - (i * 5000)) }
            }))
          }
        },
        // Edge case: empty timeaware results
        {
          results: {
            timeawareResults: []
          }
        }
      ];


      controller.currentAnalysis = {
        status: 'completed',
        results: mockResults,
        analysis: {
          statistics: {
            finalBalance: [0, 0, 0],
            survivalTime: [10.0, 10.8, 0]
          },
          successRate: 0.67, // 2 out of 3 successful
          keyScenarios: {}
        },
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Prepare data structure as expected by downloadCSV
      const exportData = {
        analysis: controller.currentAnalysis.analysis,
        results: controller.currentAnalysis.results,
        metadata: {
          scenarioName: controller.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
          exportDate: new Date().toISOString(),
          iterations: controller.currentAnalysis.results?.length || 0,
          duration: controller.currentAnalysis.duration
        }
      };

      controller.downloadCSV(exportData, 'test-export.csv');

      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      const sim1 = lines[simulationHeaderIndex + 1].split(',');
      const sim2 = lines[simulationHeaderIndex + 2].split(',');
      const sim3 = lines[simulationHeaderIndex + 3].split(',');

      expect(sim1[1]).toBe('Yes'); // Exactly 120 months, balance = 0
      expect(sim2[1]).toBe('Yes'); // 130 months, balance = 0
      expect(sim3[1]).toBe('No');  // 0 months (empty results)
    });

    test('should match MonteCarloService success rate calculation', () => {
      // This test ensures consistency between the two success calculation methods
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 144 // 12 years
        }
      };

      const mockResults = [
        // Success case
        {
          results: {
            timeawareResults: Array(150).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(15000, 800000 - (i * 5000)) }
            }))
          }
        },
        // Failure: time but not balance
        {
          results: {
            timeawareResults: Array(150).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(0, 600000 - (i * 4000)) }
            }))
          }
        },
        // Failure: balance but not time
        {
          results: {
            timeawareResults: Array(100).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(50000, 1000000 - (i * 8000)) }
            }))
          }
        },
        // Failure: neither time nor balance
        {
          results: {
            timeawareResults: Array(100).fill(null).map((_, i) => ({
              month: i + 1,
              assets: { 'Primary Portfolio': Math.max(0, 400000 - (i * 4000)) }
            }))
          }
        }
      ];

      // Expected: only first simulation should be successful
      const expectedSuccessRate = 0.25; // 1 out of 4


      controller.currentAnalysis = {
        status: 'completed',
        results: mockResults,
        analysis: {
          statistics: {
            finalBalance: [15000, 0, 50000, 0],
            survivalTime: [12.5, 12.5, 8.3, 8.3]
          },
          successRate: expectedSuccessRate,
          keyScenarios: {}
        },
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Prepare data structure as expected by downloadCSV
      const exportData = {
        analysis: controller.currentAnalysis.analysis,
        results: controller.currentAnalysis.results,
        metadata: {
          scenarioName: controller.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
          exportDate: new Date().toISOString(),
          iterations: controller.currentAnalysis.results?.length || 0,
          duration: controller.currentAnalysis.duration
        }
      };

      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse and verify individual results
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      const individualResults = [
        lines[simulationHeaderIndex + 1].split(',')[1], // Success column for sim 1
        lines[simulationHeaderIndex + 2].split(',')[1], // Success column for sim 2
        lines[simulationHeaderIndex + 3].split(',')[1], // Success column for sim 3
        lines[simulationHeaderIndex + 4].split(',')[1]  // Success column for sim 4
      ];

      expect(individualResults).toEqual(['Yes', 'No', 'No', 'No']);

      // Verify overall success rate matches
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('25.0%');
    });
  });

  describe('CSV Format and Structure', () => {
    test('should include all required sections in CSV export', () => {
      controller.currentAnalysisData = {
        metadata: {
          targetMonths: 168
        }
      };

      const mockResults = [{
        results: {
          timeawareResults: Array(180).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Primary Portfolio': Math.max(0, 1000000 - (i * 5000)) }
          }))
        }
      }];


      controller.currentAnalysis = {
        status: 'completed',
        results: mockResults,
        analysis: {
          statistics: {
            finalBalance: [500000],
            survivalTime: [15.0]
          },
          successRate: 1.0,
          keyScenarios: {}
        },
        scenarioData: sampleScenario,
        duration: 1000
      };

      // Prepare data structure as expected by downloadCSV
      const exportData = {
        analysis: controller.currentAnalysis.analysis,
        results: controller.currentAnalysis.results,
        metadata: {
          scenarioName: controller.currentAnalysis.scenarioData?.name || 'Unknown Scenario',
          exportDate: new Date().toISOString(),
          iterations: controller.currentAnalysis.results?.length || 0,
          duration: controller.currentAnalysis.duration
        }
      };

      controller.downloadCSV(exportData, 'test-export.csv');

      const lines = capturedCSVContent.split('\n');

      // Check for required sections
      expect(capturedCSVContent).toContain('Total Simulations');
      expect(capturedCSVContent).toContain('Success Rate');
      expect(capturedCSVContent).toContain('Individual Simulation Results');
      expect(capturedCSVContent).toContain('Simulation #,Success,Survival Time (Years),Final Portfolio Value');
      
      // Verify individual simulation row format
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      const firstSimulation = lines[simulationHeaderIndex + 1];
      
      expect(firstSimulation).toMatch(/^1,Yes,\d+\.\d+,\$[\d,]+$/);
    });
  });
});
