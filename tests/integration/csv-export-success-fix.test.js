/**
 * CSV Export Success Fix Integration Test
 * Verifies that the CSV export success calculation fix works end-to-end
 */

import { EventBus } from '../../scripts/core/EventBus.js';
import { MonteCarloService } from '../../scripts/services/MonteCarloService.js';
import { MonteCarloController } from '../../scripts/controllers/MonteCarloController.js';

// Mock DOM for CSV export
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

// Capture CSV content
let capturedCSVContent = '';
global.Blob = jest.fn((content, options) => {
  if (options?.type === 'text/csv') {
    capturedCSVContent = content[0];
  }
  return { content, options };
});

describe('CSV Export Success Fix Integration', () => {
  let eventBus;
  let monteCarloService;
  let monteCarloController;

  const testScenario = {
    name: 'CSV Success Test Scenario',
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
        name: 'Test Portfolio',
        balance: 1000000,
        draw_order: 1
      }
    ]
  };

  beforeEach(() => {
    eventBus = new EventBus();
    monteCarloService = new MonteCarloService(eventBus);
    monteCarloController = new MonteCarloController(eventBus);
    monteCarloController.currentScenarioData = testScenario;
    capturedCSVContent = '';
    jest.clearAllMocks();
  });

  test('should have consistent success rates between MonteCarloService and CSV export', () => {
    // Create mock analysis results that simulate a real Monte Carlo run
    const mockResults = [
      // Successful simulation: survives 15 years with $100k balance
      {
        results: {
          timeawareResults: Array(180).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': Math.max(100000, 1200000 - (i * 6000)) }
          }))
        }
      },
      // Failed simulation: only survives 10 years
      {
        results: {
          timeawareResults: Array(120).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': Math.max(0, 600000 - (i * 5000)) }
          }))
        }
      },
      // Successful simulation: survives exactly 14 years with $0 balance
      {
        results: {
          timeawareResults: Array(168).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': Math.max(0, 840000 - (i * 5000)) }
          }))
        }
      },
      // Failed simulation: survives 16 years but negative balance (edge case)
      {
        results: {
          timeawareResults: Array(192).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': i < 150 ? Math.max(0, 750000 - (i * 5000)) : 0 }
          }))
        }
      }
    ];

    // Set up analysis data with success criteria
    monteCarloController.currentAnalysisData = {
      metadata: {
        targetMonths: 168 // 14 years
      }
    };

    // Calculate expected success rate using MonteCarloService logic
    const finalBalances = [100000, 0, 0, 0];
    const survivalTimes = [15.0, 10.0, 14.0, 16.0];
    const targetMonths = 168;
    const minimumBalance = 0;

    let expectedSuccessCount = 0;
    for (let i = 0; i < mockResults.length; i++) {
      const survivalMonths = survivalTimes[i] * 12;
      const finalBalance = finalBalances[i];
      if (survivalMonths >= targetMonths && finalBalance >= minimumBalance) {
        expectedSuccessCount++;
      }
    }
    const expectedSuccessRate = expectedSuccessCount / mockResults.length;

    // Set up mock analysis results
    const mockAnalysis = {
      status: 'completed',
      results: mockResults,
      analysis: {
        statistics: {
          finalBalance: finalBalances,
          survivalTime: survivalTimes
        },
        successRate: expectedSuccessRate,
        keyScenarios: {}
      },
      scenarioData: testScenario,
      duration: 1000
    };

    monteCarloController.currentAnalysis = mockAnalysis;

    // Export to CSV
    const exportData = {
      analysis: mockAnalysis.analysis,
      results: mockAnalysis.results,
      metadata: {
        scenarioName: testScenario.name,
        exportDate: new Date().toISOString(),
        iterations: mockResults.length,
        duration: 1000
      }
    };

    monteCarloController.downloadCSV(exportData, 'test-export.csv');

    // Parse CSV and verify consistency
    const lines = capturedCSVContent.split('\n');
    
    // Find overall success rate in CSV
    const successRateLine = lines.find(line => line.includes('Success Rate'));
    expect(successRateLine).toBeDefined();
    const csvSuccessRate = parseFloat(successRateLine.split(',')[1].replace('%', '')) / 100;

    // Find individual simulation results
    const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
    const simulationHeaderIndex = simulationStartIndex + 2;
    
    const individualResults = [];
    for (let i = 1; i <= mockResults.length; i++) {
      const simLine = lines[simulationHeaderIndex + i];
      if (simLine) {
        const columns = simLine.split(',');
        individualResults.push(columns[1]); // Success column
      }
    }

    // Count individual successes
    const individualSuccessCount = individualResults.filter(result => result === 'Yes').length;
    const individualSuccessRate = individualSuccessCount / individualResults.length;

    // Verify consistency
    expect(csvSuccessRate).toBeCloseTo(expectedSuccessRate, 2);
    expect(individualSuccessRate).toBeCloseTo(expectedSuccessRate, 2);
    expect(csvSuccessRate).toBeCloseTo(individualSuccessRate, 2);

    // Verify specific expected results
    expect(individualResults[0]).toBe('Yes'); // 15 years, $100k balance
    expect(individualResults[1]).toBe('No');  // 10 years (< 14 years)
    expect(individualResults[2]).toBe('Yes'); // Exactly 14 years, $0 balance
    expect(individualResults[3]).toBe('Yes'); // 16 years, $0 balance

    // Expected: 3 out of 4 successful = 75%
    expect(expectedSuccessRate).toBe(0.75);
    expect(csvSuccessRate).toBeCloseTo(0.75, 2);
    expect(individualSuccessRate).toBe(0.75);
  });

  test('should handle minimum balance requirements correctly', () => {
    const mockResults = [
      // Case 1: Survives time, has balance - SUCCESS
      {
        results: {
          timeawareResults: Array(180).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': Math.max(75000, 1000000 - (i * 5000)) }
          }))
        }
      },
      // Case 2: Survives time, insufficient balance - FAILURE
      {
        results: {
          timeawareResults: Array(180).fill(null).map((_, i) => ({
            month: i + 1,
            assets: { 'Test Portfolio': i < 170 ? Math.max(0, 800000 - (i * 4500)) : 25000 }
          }))
        }
      }
    ];

    // Set target survival time
    monteCarloController.currentAnalysisData = {
      metadata: {
        targetMonths: 168
      }
    };

    const mockAnalysis = {
      status: 'completed',
      results: mockResults,
      analysis: {
        statistics: {
          finalBalance: [75000, 25000],
          survivalTime: [15.0, 15.0]
        },
        successRate: 0.5, // Only first case should succeed
        keyScenarios: {}
      },
      scenarioData: testScenario,
      duration: 1000
    };

    monteCarloController.currentAnalysis = mockAnalysis;

    const exportData = {
      analysis: mockAnalysis.analysis,
      results: mockAnalysis.results,
      metadata: {
        scenarioName: testScenario.name,
        exportDate: new Date().toISOString(),
        iterations: mockResults.length,
        duration: 1000
      }
    };

    monteCarloController.downloadCSV(exportData, 'test-export.csv');

    const lines = capturedCSVContent.split('\n');
    const simulationStartIndex = lines.findIndex(line => line.includes('Individual Simulation Results'));
    const simulationHeaderIndex = simulationStartIndex + 2;
    
    const sim1 = lines[simulationHeaderIndex + 1].split(',');
    const sim2 = lines[simulationHeaderIndex + 2].split(',');

    expect(sim1[1]).toBe('Yes'); // $75k >= $50k minimum
    expect(sim2[1]).toBe('No');  // $25k < $50k minimum

    // Verify overall success rate matches
    const successRateLine = lines.find(line => line.includes('Success Rate'));
    expect(successRateLine).toContain('50.0%');
  });
});
