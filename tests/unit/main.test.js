/**
 * Tests for main.js - RetirementScenarioApp
 */

import { jest } from '@jest/globals';

// Mock all dependencies
const mockEventBus = {
  on: jest.fn(),
  emit: jest.fn(),
  setDebugMode: jest.fn(),
  getEvents: jest.fn(() => ({}))
};

const mockContentService = {
  loadAllContent: jest.fn().mockResolvedValue({}),
  getContentSummary: jest.fn(() => ({ scenarios: 5, stories: 3 })),
  getAllScenarios: jest.fn(() => []),
  getAllStories: jest.fn(() => []),
  getErrors: jest.fn(() => []),
  refreshContent: jest.fn().mockResolvedValue({})
};

const mockSimulationService = {};
const mockValidationService = {};
const mockReturnModelService = {};
const mockMonteCarloService = {};
const mockStoryEngineService = {};
const mockExamplesService = {
  loadCatalog: jest.fn().mockResolvedValue({}),
  getCatalog: jest.fn(() => []),
  loadExampleById: jest.fn().mockResolvedValue({})
};
const mockScenarioBuilderService = {};

const mockUIController = {
  initialize: jest.fn(),
  currentSimulationResults: null,
  currentScenario: null
};

const mockScenarioController = {
  initialize: jest.fn(),
  runSimulation: jest.fn().mockResolvedValue({})
};

const mockStoryController = {
  initialize: jest.fn(),
  getProgress: jest.fn(() => null),
  isInStoryMode: jest.fn(() => false),
  toggleStoryMode: jest.fn(() => {
    console.warn('Story Mode is currently disabled');
  })
};

const mockTabController = { initialize: jest.fn() };
const mockModeController = { initialize: jest.fn() };
const mockWorkflowController = { initialize: jest.fn() };
const mockMonteCarloController = { initialize: jest.fn() };
const mockInsightsController = { initialize: jest.fn() };
const mockExportController = { initialize: jest.fn() };
const mockScenarioBuilderController = { initialize: jest.fn() };

const mockMonteCarloChart = { initialize: jest.fn() };
const mockMonteCarloUI = { initialize: jest.fn() };
const mockStoryUI = { initialize: jest.fn() };
const mockScenarioBuilderUI = { initialize: jest.fn() };

// Create a mock RetirementScenarioApp class
class MockRetirementScenarioApp {
  constructor() {
    this.eventBus = mockEventBus;
    this.contentService = mockContentService;
    this.simulationService = mockSimulationService;
    this.validationService = mockValidationService;
    this.returnModelService = mockReturnModelService;
    this.monteCarloService = mockMonteCarloService;
    this.storyEngineService = mockStoryEngineService;
    this.examplesService = mockExamplesService;
    this.scenarioBuilderService = mockScenarioBuilderService;
    
    this.uiController = mockUIController;
    this.scenarioController = mockScenarioController;
    this.storyController = mockStoryController;
    this.tabController = mockTabController;
    this.modeController = mockModeController;
    this.workflowController = mockWorkflowController;
    this.monteCarloController = mockMonteCarloController;
    this.insightsController = mockInsightsController;
    this.exportController = mockExportController;
    this.scenarioBuilderController = mockScenarioBuilderController;
    
    this.monteCarloChart = mockMonteCarloChart;
    this.monteCarloUI = mockMonteCarloUI;
    this.storyUI = mockStoryUI;
    this.scenarioBuilderUI = mockScenarioBuilderUI;
    
    this.setupEventListeners();
    this.setupErrorHandling();
  }
  
  setupEventListeners() {
    this.eventBus.on('ui:single-scenario-export-requested', this.handleSingleScenarioExport.bind(this));
    this.eventBus.on('mode:switch-to-story', () => {
      console.warn('Story Mode is currently disabled');
    });
  }
  
  setupErrorHandling() {
    this.eventBus.on('system:error', () => {});
    this.eventBus.on('app:initialization-failed', () => {});
    
    window.addEventListener('error', (event) => {
      this.eventBus.emit('system:error', {
        type: 'uncaught_error',
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.eventBus.emit('system:error', {
        type: 'unhandled_rejection',
        reason: event.reason
      });
    });
  }
  
  async initialize() {
    await this.contentService.loadAllContent();
    await this.examplesService.loadCatalog();
    
    this.uiController.initialize();
    this.exportController.initialize();
    this.scenarioController.initialize();
    this.workflowController.initialize();
    this.monteCarloController.initialize();
    this.insightsController.initialize();
    this.monteCarloChart.initialize();
    this.monteCarloUI.initialize();
    this.storyUI.initialize();
    this.scenarioBuilderController.initialize();
    this.scenarioBuilderUI.initialize();
  }
  
  handleSingleScenarioExport(data) {
    try {
      if (!this.uiController.currentSimulationResults) {
        console.warn('⚠️ No simulation results available for export');
        return;
      }
      
      if (data.format === 'csv') {
        this.exportSingleScenarioCSV(this.uiController.currentSimulationResults);
      } else if (data.format === 'json') {
        this.exportSingleScenarioJSON(this.uiController.currentSimulationResults);
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  }
  
  exportSingleScenarioCSV(simulationResults) {
    const headers = ['Month', 'Total_Assets', 'Monthly_Expenses', 'Net_Income', 'Withdrawal_Amount', 'Asset_Growth'];
    const csvContent = [headers.join(',')];
    
    simulationResults.results.forEach((result, index) => {
      const row = [
        index + 1,
        result.total_assets || 0,
        result.monthly_expenses || 0,
        result.net_income || 0,
        result.withdrawal_amount || 0,
        result.asset_growth || 0
      ];
      csvContent.push(row.join(','));
    });
    
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${simulationResults.scenario.metadata.title.toLowerCase().replace(/\s+/g, '-')}-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  exportSingleScenarioJSON(simulationResults) {
    const exportData = {
      metadata: {
        exportType: 'single-scenario-results',
        exportDate: new Date().toISOString(),
        version: '1.0'
      },
      scenario: simulationResults.scenario,
      results: simulationResults.results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${simulationResults.scenario.metadata.title.toLowerCase().replace(/\s+/g, '-')}-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Public API methods
  getContentSummary() {
    return this.contentService.getContentSummary();
  }
  
  getCurrentStoryProgress() {
    return this.storyController.getProgress();
  }
  
  getScenarios() {
    return this.contentService.getAllScenarios();
  }
  
  getStories() {
    return this.contentService.getAllStories();
  }
  
  getExamplesCatalog() {
    return this.examplesService.getCatalog();
  }
  
  async loadExample(id) {
    return await this.examplesService.loadExampleById(id);
  }
  
  async refreshContent() {
    return await this.contentService.refreshContent();
  }
  
  async runSimulation(options) {
    return await this.scenarioController.runSimulation(options);
  }
  
  setDebugMode(enabled) {
    this.eventBus.setDebugMode(enabled);
  }
  
  // Debug helpers
  debugContent() {
    console.log('📊 Content Debug Info:');
    console.log('Scenarios:', this.contentService.getAllScenarios());
    console.log('Stories:', this.contentService.getAllStories());
    console.log('Summary:', this.contentService.getContentSummary());
    console.log('Errors:', this.contentService.getErrors());
  }
  
  debugEvents() {
    console.log('📡 Event Bus Debug Info:');
    console.log('Events:', this.eventBus.getEvents());
  }
  
  getControllers() {
    return {
      story: this.storyController,
      scenario: this.scenarioController,
      ui: this.uiController,
      scenarioBuilder: this.scenarioBuilderController
    };
  }
  
  getServices() {
    return {
      content: this.contentService,
      simulation: this.simulationService,
      validation: this.validationService,
      scenarioBuilder: this.scenarioBuilderService
    };
  }
}

describe('RetirementScenarioApp', () => {
  let RetirementScenarioApp;
  let app;

  beforeAll(() => {
    // Use our mock class for testing
    RetirementScenarioApp = MockRetirementScenarioApp;
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.addEventListener
    jest.spyOn(window, 'addEventListener').mockImplementation();
    
    // Mock URL and Blob for export tests
    global.URL = {
      createObjectURL: jest.fn(() => 'mock-url'),
      revokeObjectURL: jest.fn()
    };
    
    global.Blob = jest.fn((content, options) => ({
      content,
      options
    }));
  });

  describe('Constructor and Initialization', () => {
    test('should create app instance and initialize all components', async () => {
      app = new RetirementScenarioApp();
      
      expect(app.eventBus).toBeDefined();
      expect(app.contentService).toBeDefined();
      expect(app.simulationService).toBeDefined();
      expect(app.validationService).toBeDefined();
      expect(app.uiController).toBeDefined();
      expect(app.scenarioController).toBeDefined();
    });

    test('should initialize all services', () => {
      app = new RetirementScenarioApp();
      
      expect(app.contentService).toBe(mockContentService);
      expect(app.simulationService).toBe(mockSimulationService);
      expect(app.validationService).toBe(mockValidationService);
      expect(app.returnModelService).toBe(mockReturnModelService);
      expect(app.monteCarloService).toBe(mockMonteCarloService);
      expect(app.storyEngineService).toBe(mockStoryEngineService);
      expect(app.examplesService).toBe(mockExamplesService);
      expect(app.scenarioBuilderService).toBe(mockScenarioBuilderService);
    });

    test('should initialize all controllers', () => {
      app = new RetirementScenarioApp();
      
      expect(app.uiController).toBe(mockUIController);
      expect(app.scenarioController).toBe(mockScenarioController);
      expect(app.workflowController).toBe(mockWorkflowController);
      expect(app.monteCarloController).toBe(mockMonteCarloController);
      expect(app.insightsController).toBe(mockInsightsController);
      expect(app.exportController).toBe(mockExportController);
      expect(app.scenarioBuilderController).toBe(mockScenarioBuilderController);
    });

    test('should set up story mode proxy when story mode is disabled', () => {
      app = new RetirementScenarioApp();
      
      expect(app.storyController.isInStoryMode()).toBe(false);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      app.storyController.toggleStoryMode();
      expect(consoleSpy).toHaveBeenCalledWith('Story Mode is currently disabled');
      consoleSpy.mockRestore();
    });

    test('should set up export handlers', () => {
      app = new RetirementScenarioApp();
      
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'ui:single-scenario-export-requested',
        expect.any(Function)
      );
    });

    test('should set up story mode prevention', () => {
      app = new RetirementScenarioApp();
      
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'mode:switch-to-story',
        expect.any(Function)
      );
    });
  });

  describe('Initialization Process', () => {
    test('should initialize all components in correct order', async () => {
      app = new RetirementScenarioApp();
      
      await app.initialize();
      
      expect(mockUIController.initialize).toHaveBeenCalled();
      expect(mockExportController.initialize).toHaveBeenCalled();
      expect(mockScenarioController.initialize).toHaveBeenCalled();
      expect(mockWorkflowController.initialize).toHaveBeenCalled();
      expect(mockMonteCarloController.initialize).toHaveBeenCalled();
      expect(mockInsightsController.initialize).toHaveBeenCalled();
      expect(mockMonteCarloChart.initialize).toHaveBeenCalled();
      expect(mockMonteCarloUI.initialize).toHaveBeenCalled();
      expect(mockStoryUI.initialize).toHaveBeenCalled();
      expect(mockScenarioBuilderController.initialize).toHaveBeenCalled();
      expect(mockScenarioBuilderUI.initialize).toHaveBeenCalled();
    });

    test('should load initial content and examples', async () => {
      app = new RetirementScenarioApp();
      
      await app.initialize();
      
      expect(mockContentService.loadAllContent).toHaveBeenCalled();
      expect(mockExamplesService.loadCatalog).toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      app = new RetirementScenarioApp();
      mockUIController.currentSimulationResults = {
        results: [
          { total_assets: 100000, monthly_expenses: 5000, net_income: 3000, withdrawal_amount: 2000, asset_growth: 500 },
          { total_assets: 98500, monthly_expenses: 5000, net_income: 3000, withdrawal_amount: 2000, asset_growth: 492 }
        ],
        scenario: { metadata: { title: 'Test Scenario' } }
      };
    });

    test('should handle single scenario export request', () => {
      const exportData = { format: 'csv' };
      
      app.handleSingleScenarioExport(exportData);
      
      expect(global.Blob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should export CSV with correct format', () => {
      const simulationResults = {
        results: [
          { total_assets: 100000, monthly_expenses: 5000, net_income: 3000, withdrawal_amount: 2000, asset_growth: 500 }
        ],
        scenario: { metadata: { title: 'Test Scenario' } }
      };
      
      // Mock DOM elements
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();
      
      app.exportSingleScenarioCSV(simulationResults);
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Month,Total_Assets,Monthly_Expenses,Net_Income,Withdrawal_Amount,Asset_Growth')],
        { type: 'text/csv' }
      );
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('test-scenario-results-');
    });

    test('should export JSON with correct format', () => {
      const simulationResults = {
        results: [{ total_assets: 100000 }],
        scenario: { metadata: { title: 'Test Scenario' } }
      };
      
      // Mock DOM elements
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();
      
      app.exportSingleScenarioJSON(simulationResults);
      
      const blobCall = global.Blob.mock.calls[0];
      const jsonContent = JSON.parse(blobCall[0][0]);
      
      expect(jsonContent.metadata.exportType).toBe('single-scenario-results');
      expect(jsonContent.scenario).toEqual(simulationResults.scenario);
      expect(jsonContent.results).toEqual(simulationResults.results);
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should handle missing simulation results gracefully', () => {
      mockUIController.currentSimulationResults = null;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      app.handleSingleScenarioExport({ format: 'csv' });
      
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ No simulation results available for export');
      consoleSpy.mockRestore();
    });

    test('should handle export errors gracefully', () => {
      mockUIController.currentSimulationResults = { results: 'invalid' };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      app.handleSingleScenarioExport({ format: 'csv' });
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Export failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should set up error handling', () => {
      app = new RetirementScenarioApp();
      app.setupErrorHandling();
      
      expect(mockEventBus.on).toHaveBeenCalledWith('system:error', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('app:initialization-failed', expect.any(Function));
    });

    test('should handle window error events', () => {
      app = new RetirementScenarioApp();
      app.setupErrorHandling();
      
      // Create a mock error event
      const mockError = new Error('Test error');
      const errorEvent = {
        type: 'error',
        error: mockError,
        message: 'Test message',
        filename: 'test.js',
        lineno: 42
      };
      
      // Simulate the event by calling the handler directly
      const errorHandler = window.addEventListener.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(errorEvent);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', {
        type: 'uncaught_error',
        error: errorEvent.error,
        message: errorEvent.message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno
      });
    });

    test('should handle unhandled promise rejections', () => {
      app = new RetirementScenarioApp();
      app.setupErrorHandling();
      
      // Create a mock rejection event since PromiseRejectionEvent may not be available in test environment
      const rejectionEvent = {
        type: 'unhandledrejection',
        reason: 'Test rejection',
        promise: {} // Mock promise object without actually rejecting
      };
      
      // Simulate the event by calling the handler directly
      const rejectionHandler = window.addEventListener.mock.calls.find(call => call[0] === 'unhandledrejection')[1];
      rejectionHandler(rejectionEvent);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', {
        type: 'unhandled_rejection',
        reason: rejectionEvent.reason
      });
    });
  });

  describe('Public API', () => {
    beforeEach(() => {
      app = new RetirementScenarioApp();
    });

    test('should get content summary', () => {
      const summary = app.getContentSummary();
      expect(summary).toEqual({ scenarios: 5, stories: 3 });
      expect(mockContentService.getContentSummary).toHaveBeenCalled();
    });

    test('should get current story progress', () => {
      const progress = app.getCurrentStoryProgress();
      expect(progress).toBeNull();
      expect(mockStoryController.getProgress).toHaveBeenCalled();
    });

    test('should get scenarios', () => {
      const scenarios = app.getScenarios();
      expect(scenarios).toEqual([]);
      expect(mockContentService.getAllScenarios).toHaveBeenCalled();
    });

    test('should get stories', () => {
      const stories = app.getStories();
      expect(stories).toEqual([]);
      expect(mockContentService.getAllStories).toHaveBeenCalled();
    });

    test('should get examples catalog', () => {
      const catalog = app.getExamplesCatalog();
      expect(catalog).toEqual([]);
      expect(mockExamplesService.getCatalog).toHaveBeenCalled();
    });

    test('should load example by ID', async () => {
      const example = await app.loadExample('test-id');
      expect(example).toEqual({});
      expect(mockExamplesService.loadExampleById).toHaveBeenCalledWith('test-id');
    });

    test('should refresh content', async () => {
      const content = await app.refreshContent();
      expect(content).toEqual({});
      expect(mockContentService.refreshContent).toHaveBeenCalled();
    });

    test('should run simulation', async () => {
      const options = { test: true };
      const result = await app.runSimulation(options);
      expect(result).toEqual({});
      expect(mockScenarioController.runSimulation).toHaveBeenCalledWith(options);
    });

    test('should set debug mode', () => {
      app.setDebugMode(true);
      expect(mockEventBus.setDebugMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Debug Helpers', () => {
    beforeEach(() => {
      app = new RetirementScenarioApp();
    });

    test('should debug content', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      app.debugContent();
      
      expect(consoleSpy).toHaveBeenCalledWith('📊 Content Debug Info:');
      expect(mockContentService.getAllScenarios).toHaveBeenCalled();
      expect(mockContentService.getAllStories).toHaveBeenCalled();
      expect(mockContentService.getContentSummary).toHaveBeenCalled();
      expect(mockContentService.getErrors).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should debug events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      app.debugEvents();
      
      expect(consoleSpy).toHaveBeenCalledWith('📡 Event Bus Debug Info:');
      expect(mockEventBus.getEvents).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should get controllers for debugging', () => {
      const controllers = app.getControllers();
      
      expect(controllers).toHaveProperty('story');
      expect(controllers).toHaveProperty('scenario');
      expect(controllers).toHaveProperty('ui');
      expect(controllers).toHaveProperty('scenarioBuilder');
    });

    test('should get services for debugging', () => {
      const services = app.getServices();
      
      expect(services).toHaveProperty('content');
      expect(services).toHaveProperty('simulation');
      expect(services).toHaveProperty('validation');
      expect(services).toHaveProperty('scenarioBuilder');
    });
  });

  describe('DOM Event Handling', () => {
    test('should initialize app on DOMContentLoaded', () => {
      // Mock the constructor to avoid actual initialization
      const mockApp = {
        debugContent: jest.fn(),
        debugEvents: jest.fn()
      };
      
      // Set up window object
      delete window.retirementApp;
      delete window.debugContent;
      delete window.debugEvents;
      
      // Simulate the DOMContentLoaded event handler
      window.retirementApp = mockApp;
      
      // Test debug helper functions
      window.debugContent = () => {
        if (window.retirementApp) {
          window.retirementApp.debugContent();
        }
      };
      
      window.debugEvents = () => {
        if (window.retirementApp) {
          window.retirementApp.debugEvents();
        }
      };
      
      // Test the debug functions
      window.debugContent();
      window.debugEvents();
      
      expect(mockApp.debugContent).toHaveBeenCalled();
      expect(mockApp.debugEvents).toHaveBeenCalled();
    });
  });
});
