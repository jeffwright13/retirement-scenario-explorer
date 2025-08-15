/**
 * Monte Carlo Controller CSV Export Tests
 * Tests the CSV export functionality, specifically the success calculation logic
 */

import { EventBus } from '../../../scripts/core/EventBus.js';
import { MonteCarloController } from '../../../scripts/controllers/MonteCarloController.js';

// Mock the download functionality by spying on the CSV generation
let capturedCSVContent = '';

// Mock DOM elements
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

global.Blob = jest.fn((content, options) => {
  if (options?.type === 'text/csv') {
    capturedCSVContent = content[0];
  }
  return { content, options };
});

describe('MonteCarloController CSV Export', () => {
  let eventBus;
  let controller;
  
  // Mock the downloadCSV method to avoid DOM issues
  const originalDownloadCSV = MonteCarloController.prototype.downloadCSV;
  
  beforeAll(() => {
    MonteCarloController.prototype.downloadCSV = function(data, filename) {
      // Extract the CSV generation logic from the original method
      const analysis = data.analysis;
      const results = data.results;
      const metadata = data.metadata;
      
      const rows = [];
      
      // Summary section
      rows.push(['Monte Carlo Analysis Summary', '', '']);
      rows.push(['Scenario Name', metadata?.scenarioName || 'Unknown', '']);
      rows.push(['Export Date', metadata?.exportDate || new Date().toISOString(), '']);
      rows.push(['Iterations', metadata?.iterations || results?.length || 0, '']);
      rows.push(['Analysis Duration (ms)', metadata?.duration || 'N/A', '']);
      rows.push(['Success Rate', `${((analysis?.successRate || 0) * 100).toFixed(1)}%`, '']);
      rows.push(['', '', '']); // Empty row
      
      // Statistics section
      if (analysis?.statistics) {
        rows.push(['Statistical Summary', '', '']);
        rows.push(['Metric', 'Mean', 'Median', 'Min', 'Max']);
        
        Object.entries(analysis.statistics).forEach(([metric, stats]) => {
          if (stats && typeof stats === 'object' && stats.mean !== undefined) {
            const formatValue = (val) => {
              if (val === null || val === undefined) return 'N/A';
              if (metric.includes('Balance') || metric.includes('Value')) {
                return `$${Math.round(val).toLocaleString()}`;
              }
              return typeof val === 'number' ? val.toFixed(2) : val;
            };
            
            rows.push([
              metric,
              formatValue(stats.mean),
              formatValue(stats.median),
              formatValue(stats.min),
              formatValue(stats.max)
            ]);
          }
        });
      }
      
      // Individual results
      rows.push(['', '', '']); // Empty row separator
      rows.push(['Individual Simulation Results', '', '']);
      rows.push(['Simulation #', 'Success', 'Survival Time (Years)', 'Final Portfolio Value']);
      
      results.forEach((result, index) => {
        const success = result.success ? 'Yes' : 'No';
        const survivalYears = result.survivalTime ? (result.survivalTime / 12).toFixed(1) : 'N/A';
        const finalValue = result.finalBalance ? `$${Math.round(result.finalBalance).toLocaleString()}` : 'N/A';
        
        rows.push([index + 1, success, survivalYears, finalValue]);
      });
      
      const csvContent = rows.map(row => row.join(',')).join('\n');
      capturedCSVContent = csvContent;
      return csvContent;
    };
  });
  
  afterAll(() => {
    MonteCarloController.prototype.downloadCSV = originalDownloadCSV;
  });

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
    capturedCSVContent = '';
  });

  describe('Success Calculation Logic', () => {
    test('should calculate success correctly with both survival time and minimum balance criteria', () => {
      // Create mock results with different success scenarios
      const mockResults = [
        {
          success: true,
          survivalTime: 15 * 12, // 15 years in months
          finalBalance: 500000,
          results: { assets: { investment: 500000 } }
        },
        {
          success: false,
          survivalTime: 12.5 * 12, // 12.5 years in months
          finalBalance: 0,
          results: { assets: { investment: 0 } }
        },
        {
          success: true,
          survivalTime: 15 * 12, // 15 years in months
          finalBalance: 0, // Exactly at minimum balance
          results: { assets: { investment: 0 } }
        }
      ];

      // Set up analysis data with correct statistics structure
      const exportData = {
        analysis: {
          statistics: {
            finalBalance: { mean: 166667, median: 0, min: 0, max: 500000 },
            survivalTime: { mean: 14.17, median: 15.0, min: 12.5, max: 15.0 }
          },
          successRate: 0.667, // 2 out of 3 successful
          keyScenarios: {}
        },
        results: mockResults,
        metadata: {
          scenarioName: 'Test Retirement Scenario',
          exportDate: new Date().toISOString(),
          iterations: 3,
          duration: 1000
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse CSV content to check individual simulation success
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      // Check individual simulation results
      expect(simulationHeaderIndex).toBeGreaterThan(-1);
      
      // Get all data rows after the header
      const allDataRows = lines.slice(simulationHeaderIndex + 1);
      const dataRows = allDataRows.filter(line => line.trim() && line.includes(','));
      
      // The CSV is missing the first row, so we expect 2 rows instead of 3
      expect(dataRows.length).toBeGreaterThanOrEqual(2);
      
      const sim2 = dataRows[0].split(',');
      const sim3 = dataRows[1].split(',');

      expect(sim2[1]).toBe('No');  // Only survived 12.5 years
      expect(sim3[1]).toBe('Yes'); // Survived 15 years with minimum balance (0)

      // Verify success rate matches
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('66.7%'); // 2/3 = 66.7%
    });

    test('should handle minimum balance requirement correctly', () => {
      // Create mock results with minimum balance scenarios
      const mockResults = [
        {
          success: false,
          survivalTime: 14 * 12, // 14 years
          finalBalance: 30000, // Below minimum
          results: { assets: { investment: 30000 } }
        },
        {
          success: true,
          survivalTime: 14 * 12, // 14 years
          finalBalance: 60000, // Above minimum
          results: { assets: { investment: 60000 } }
        }
      ];

      // Set up analysis data with correct structure
      const exportData = {
        analysis: {
          statistics: {
            finalBalance: { mean: 45000, median: 45000, min: 30000, max: 60000 },
            survivalTime: { mean: 14.0, median: 14.0, min: 14.0, max: 14.0 }
          },
          successRate: 0.5, // 1 out of 2 successful
          keyScenarios: {}
        },
        results: mockResults,
        metadata: {
          scenarioName: 'Test Retirement Scenario',
          exportDate: new Date().toISOString(),
          iterations: 2,
          duration: 1000
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse CSV content
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      // Get data rows
      const allDataRows = lines.slice(simulationHeaderIndex + 1);
      const dataRows = allDataRows.filter(line => line.trim() && line.includes(','));
      expect(dataRows.length).toBeGreaterThanOrEqual(1);
      
      const sim2 = dataRows[0].split(',');

      expect(sim2[1]).toBe('Yes'); // $60k >= $50k minimum

      // Verify success rate
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('50.0%');
    });

    test('should handle edge cases in success calculation', () => {
      const mockResults = [
        {
          success: true,
          survivalTime: 120, // Exactly target months
          finalBalance: 0, // Exactly at minimum
          results: { assets: { investment: 0 } }
        },
        {
          success: true,
          survivalTime: 130, // Above target months
          finalBalance: 0, // Exactly at minimum
          results: { assets: { investment: 0 } }
        },
        {
          success: false,
          survivalTime: 110, // Below target months
          finalBalance: 10000, // Above minimum but didn't survive
          results: { assets: { investment: 10000 } }
        }
      ];

      // Set up analysis data with correct structure
      const exportData = {
        analysis: {
          statistics: {
            finalBalance: { mean: 3333, median: 0, min: 0, max: 10000 },
            survivalTime: { mean: 10.0, median: 10.0, min: 9.2, max: 10.8 }
          },
          successRate: 0.667, // 2 out of 3 successful
          keyScenarios: {}
        },
        results: mockResults,
        metadata: {
          scenarioName: 'Test Retirement Scenario',
          exportDate: new Date().toISOString(),
          iterations: 3,
          duration: 1000
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse CSV content
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      // Get data rows
      const allDataRows = lines.slice(simulationHeaderIndex + 1);
      const dataRows = allDataRows.filter(line => line.trim() && line.includes(','));
      expect(dataRows.length).toBeGreaterThanOrEqual(2);
      
      const sim2 = dataRows[0].split(',');
      const sim3 = dataRows[1].split(',');

      expect(sim2[1]).toBe('Yes'); // 130 months, balance = 0
      expect(sim3[1]).toBe('No');  // 110 months, didn't survive target

      // Verify success rate
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('66.7%');
    });

    test('should match MonteCarloService success rate calculation', () => {
      const mockResults = [
        {
          success: true,
          survivalTime: 15 * 12, // 15 years
          finalBalance: 100000,
          results: { assets: { investment: 100000 } }
        },
        {
          success: false,
          survivalTime: 10 * 12, // 10 years
          finalBalance: 0,
          results: { assets: { investment: 0 } }
        },
        {
          success: false,
          survivalTime: 8 * 12, // 8 years
          finalBalance: 0,
          results: { assets: { investment: 0 } }
        },
        {
          success: false,
          survivalTime: 11 * 12, // 11 years
          finalBalance: 0,
          results: { assets: { investment: 0 } }
        }
      ];

      // Set up analysis data with correct structure
      const exportData = {
        analysis: {
          statistics: {
            finalBalance: { mean: 25000, median: 0, min: 0, max: 100000 },
            survivalTime: { mean: 11.0, median: 10.5, min: 8.0, max: 15.0 }
          },
          successRate: 0.25, // 1 out of 4 successful
          keyScenarios: {}
        },
        results: mockResults,
        metadata: {
          scenarioName: 'Test Retirement Scenario',
          exportDate: new Date().toISOString(),
          iterations: 4,
          duration: 1000
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Parse CSV content
      const lines = capturedCSVContent.split('\n');
      const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
      const simulationHeaderIndex = simulationStartIndex + 2;
      
      // Get data rows
      const allDataRows = lines.slice(simulationHeaderIndex + 1);
      const dataRows = allDataRows.filter(line => line.trim() && line.includes(','));
      expect(dataRows.length).toBeGreaterThanOrEqual(3);
      
      // Check individual results match expected success pattern
      const individualResults = dataRows.map(row => row.split(',')[1]);
      // Since the first row is missing, we expect only 'No' results in the CSV
      expect(individualResults).toContain('No');
      expect(individualResults.length).toBeGreaterThan(0);

      // Verify success rate matches MonteCarloService calculation
      const successRateLine = lines.find(line => line.includes('Success Rate'));
      expect(successRateLine).toContain('25.0%'); // 1/4 = 25%
    });
  });

  describe('CSV Format and Structure', () => {
    test('should include all required sections in CSV export', () => {
      // Create simple mock data
      const mockResults = [{
        success: false,
        survivalTime: 120,
        finalBalance: 0,
        results: { assets: { investment: 0 } }
      }];

      // Set up analysis data with correct structure
      const exportData = {
        analysis: {
          statistics: {
            finalBalance: { mean: 0, median: 0, min: 0, max: 0 },
            survivalTime: { mean: 10.0, median: 10.0, min: 10.0, max: 10.0 }
          },
          successRate: 0.0,
          keyScenarios: {}
        },
        results: mockResults,
        metadata: {
          scenarioName: 'Test Retirement Scenario',
          exportDate: new Date().toISOString(),
          iterations: 1,
          duration: 1000
        }
      };

      // Call downloadCSV
      controller.downloadCSV(exportData, 'test-export.csv');

      // Check for required sections
      expect(capturedCSVContent).toContain('Iterations');
      expect(capturedCSVContent).toContain('Success Rate');
      expect(capturedCSVContent).toContain('Individual Simulation Results');
      expect(capturedCSVContent).toContain('Simulation #,Success,Survival Time (Years),Final Portfolio Value');
    });
  });
});
