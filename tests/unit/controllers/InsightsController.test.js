/**
 * Tests for InsightsController.js
 */

import { jest } from '@jest/globals';
import { InsightsController } from '../../../scripts/controllers/InsightsController.js';

describe('InsightsController', () => {
  let insightsController;
  let mockEventBus;
  let mockElements;

  beforeEach(() => {
    // Mock event bus
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn()
    };

    // Mock DOM elements
    mockElements = {
      insightsSection: {
        querySelector: jest.fn(),
        style: { display: '' }
      },
      insightsList: {
        innerHTML: '',
        appendChild: jest.fn()
      }
    };

    // Set up querySelector to return insightsList
    mockElements.insightsSection.querySelector.mockImplementation((selector) => {
      if (selector === '#insights-list') {
        return mockElements.insightsList;
      }
      return null;
    });

    // Mock document methods
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'insights-section') {
        return mockElements.insightsSection;
      }
      return null;
    });

    // Mock document.createElement
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'li') {
        return {
          textContent: '',
          classList: { add: jest.fn() },
          appendChild: jest.fn()
        };
      }
      return null;
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    insightsController = new InsightsController(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(insightsController.eventBus).toBe(mockEventBus);
      expect(insightsController.currentScenarioData).toBeNull();
    });

    test('should set up event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario:data-changed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('simulation:results-ready', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('ui:insights-display-update', expect.any(Function));
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      insightsController.initialize();
      
      expect(insightsController.insightsSection).toBe(mockElements.insightsSection);
      expect(console.log).toHaveBeenCalledWith('💡 Initializing Insights Controller');
    });

    test('should warn when insights section not found', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const newController = new InsightsController(mockEventBus);
      newController.initialize();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️ InsightsController: insights-section element not found');
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      insightsController.initialize();
    });

    test('should handle scenario:data-changed event', () => {
      const scenarioData = { 
        plan: { monthly_expenses: 5000 },
        assets: []
      };
      const eventData = {
        scenarioData,
        trigger: 'json-edit',
        timestamp: Date.now()
      };

      const dataChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:data-changed')[1];
      const requestUpdateSpy = jest.spyOn(insightsController, 'requestInsightsUpdate');
      
      dataChangedHandler(eventData);
      
      expect(insightsController.currentScenarioData).toBe(scenarioData);
      expect(requestUpdateSpy).toHaveBeenCalledWith(scenarioData, 'scenario-change');
      expect(console.log).toHaveBeenCalledWith('🔥 InsightsController: Scenario data changed!', {
        trigger: 'json-edit',
        monthlyExpenses: 5000,
        annualExpenses: 60000,
        timestamp: eventData.timestamp
      });
    });

    test('should handle simulation:results-ready event', () => {
      const scenarioData = { plan: { monthly_expenses: 4000 } };
      const results = [{ month: 1, balance: 100000 }];
      const eventData = { scenarioData, results };

      const resultsReadyHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'simulation:results-ready')[1];
      const requestUpdateSpy = jest.spyOn(insightsController, 'requestInsightsUpdate');
      
      resultsReadyHandler(eventData);
      
      expect(insightsController.currentScenarioData).toBe(scenarioData);
      expect(requestUpdateSpy).toHaveBeenCalledWith(scenarioData, 'simulation-complete', results);
    });

    test('should handle ui:insights-display-update event', () => {
      const insights = ['Insight 1', 'Insight 2'];
      const eventData = {
        insights,
        trigger: 'simulation-complete',
        scenarioData: { plan: { monthly_expenses: 3000 } }
      };

      const displayUpdateHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'ui:insights-display-update')[1];
      const displaySpy = jest.spyOn(insightsController, 'displayInsights');
      
      displayUpdateHandler(eventData);
      
      expect(displaySpy).toHaveBeenCalledWith(insights);
      expect(console.log).toHaveBeenCalledWith('🔥 InsightsController: Received insights for display!', {
        insightsCount: 2,
        trigger: 'simulation-complete',
        monthlyExpenses: 3000,
        annualExpenses: 36000
      });
    });
  });

  describe('Insights Request', () => {
    test('should request insights update', () => {
      const scenarioData = { plan: { monthly_expenses: 5000 } };
      const simulationResults = [{ month: 1, balance: 100000 }];
      
      insightsController.requestInsightsUpdate(scenarioData, 'test-trigger', simulationResults);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('insights:generate-request', {
        scenarioData,
        simulationResults,
        trigger: 'test-trigger',
        requestId: expect.stringMatching(/^insights-\d+-\d+$/)
      });
      expect(console.log).toHaveBeenCalledWith('💡 InsightsController: Requesting insights update (trigger: test-trigger)');
    });

    test('should request insights update with default empty results', () => {
      const scenarioData = { plan: { monthly_expenses: 5000 } };
      
      insightsController.requestInsightsUpdate(scenarioData, 'test-trigger');
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('insights:generate-request', {
        scenarioData,
        simulationResults: [],
        trigger: 'test-trigger',
        requestId: expect.stringMatching(/^insights-\d+-\d+$/)
      });
    });
  });

  describe('Insights Display', () => {
    beforeEach(() => {
      insightsController.initialize();
    });

    test('should display string insights', () => {
      const insights = ['First insight', 'Second insight'];
      const mockLiElements = [
        { textContent: '', classList: { add: jest.fn() } },
        { textContent: '', classList: { add: jest.fn() } }
      ];
      
      jest.spyOn(document, 'createElement').mockImplementation(() => mockLiElements.shift());
      
      insightsController.displayInsights(insights);
      
      expect(mockElements.insightsList.innerHTML).toBe('');
      expect(mockElements.insightsList.appendChild).toHaveBeenCalledTimes(2);
      expect(mockElements.insightsSection.style.display).toBe('block');
      expect(insightsController.currentInsights).toBe(insights);
      expect(console.log).toHaveBeenCalledWith('✅ InsightsController: Displayed 2 insights');
    });

    test('should display object insights with message and priority', () => {
      const insights = [
        { message: 'High priority insight', priority: 'high', type: 'warning' },
        { message: 'Low priority insight', priority: 'low', type: 'info' }
      ];
      const mockLiElements = [
        { textContent: '', classList: { add: jest.fn() } },
        { textContent: '', classList: { add: jest.fn() } }
      ];
      
      let elementIndex = 0;
      jest.spyOn(document, 'createElement').mockImplementation(() => mockLiElements[elementIndex++]);
      
      insightsController.displayInsights(insights);
      
      expect(mockLiElements[0].textContent).toBe('High priority insight');
      expect(mockLiElements[0].classList.add).toHaveBeenCalledWith('insight-high');
      expect(mockLiElements[0].classList.add).toHaveBeenCalledWith('insight-warning');
      
      expect(mockLiElements[1].textContent).toBe('Low priority insight');
      expect(mockLiElements[1].classList.add).toHaveBeenCalledWith('insight-low');
      expect(mockLiElements[1].classList.add).toHaveBeenCalledWith('insight-info');
    });

    test('should handle object insights without message property', () => {
      const insights = [{ data: 'some data', value: 123 }];
      const mockLiElement = { textContent: '', classList: { add: jest.fn() } };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLiElement);
      
      insightsController.displayInsights(insights);
      
      expect(mockLiElement.textContent).toBe('{"data":"some data","value":123}');
    });

    test('should handle non-string, non-object insights', () => {
      const insights = [123, true, null];
      const mockLiElements = [
        { textContent: '', classList: { add: jest.fn() } },
        { textContent: '', classList: { add: jest.fn() } },
        { textContent: '', classList: { add: jest.fn() } }
      ];
      
      let elementIndex = 0;
      jest.spyOn(document, 'createElement').mockImplementation(() => mockLiElements[elementIndex++]);
      
      insightsController.displayInsights(insights);
      
      expect(mockLiElements[0].textContent).toBe('123');
      expect(mockLiElements[1].textContent).toBe('true');
      expect(mockLiElements[2].textContent).toBe('null');
    });

    test('should warn when insights section is missing', () => {
      insightsController.insightsSection = null;
      
      insightsController.displayInsights(['test insight']);
      
      expect(console.warn).toHaveBeenCalledWith('❌ InsightsController: Cannot display insights - missing section or data');
    });

    test('should warn when insights data is missing', () => {
      insightsController.displayInsights(null);
      
      expect(console.warn).toHaveBeenCalledWith('❌ InsightsController: Cannot display insights - missing section or data');
    });

    test('should warn when insights list element is missing', () => {
      mockElements.insightsSection.querySelector.mockReturnValue(null);
      
      insightsController.displayInsights(['test insight']);
      
      expect(console.warn).toHaveBeenCalledWith('❌ InsightsController: insights-list element not found');
    });

    test('should handle empty insights array', () => {
      insightsController.displayInsights([]);
      
      expect(mockElements.insightsList.appendChild).not.toHaveBeenCalled();
      expect(mockElements.insightsSection.style.display).toBe('block');
      expect(console.log).toHaveBeenCalledWith('✅ InsightsController: Displayed 0 insights');
    });
  });

  describe('Clear Insights', () => {
    beforeEach(() => {
      insightsController.initialize();
      insightsController.currentInsights = ['existing insight'];
    });

    test('should clear insights successfully', () => {
      insightsController.clearInsights();
      
      expect(mockElements.insightsList.innerHTML).toBe('');
      expect(mockElements.insightsSection.style.display).toBe('none');
      expect(insightsController.currentInsights).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('🧹 InsightsController: Insights cleared');
    });

    test('should handle missing insights section gracefully', () => {
      insightsController.insightsSection = null;
      
      expect(() => insightsController.clearInsights()).not.toThrow();
      expect(insightsController.currentInsights).toEqual([]);
    });

    test('should handle missing insights list gracefully', () => {
      mockElements.insightsSection.querySelector.mockReturnValue(null);
      
      expect(() => insightsController.clearInsights()).not.toThrow();
      expect(insightsController.currentInsights).toEqual([]);
    });
  });

  describe('Current Insights', () => {
    test('should get current insights', () => {
      const insights = ['test insight 1', 'test insight 2'];
      insightsController.currentInsights = insights;
      
      expect(insightsController.getCurrentInsights()).toBe(insights);
    });

    test('should return null when no current insights set', () => {
      expect(insightsController.getCurrentInsights()).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle scenario data without plan', () => {
      const eventData = {
        scenarioData: { assets: [] },
        trigger: 'test'
      };

      const dataChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:data-changed')[1];
      
      expect(() => dataChangedHandler(eventData)).not.toThrow();
      expect(console.log).toHaveBeenCalledWith('🔥 InsightsController: Scenario data changed!', {
        trigger: 'test',
        monthlyExpenses: undefined,
        annualExpenses: 0,
        timestamp: eventData.timestamp
      });
    });

    test('should handle scenario data without monthly_expenses', () => {
      const eventData = {
        scenarioData: { plan: {} },
        trigger: 'test'
      };

      const dataChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:data-changed')[1];
      
      expect(() => dataChangedHandler(eventData)).not.toThrow();
      expect(console.log).toHaveBeenCalledWith('🔥 InsightsController: Scenario data changed!', {
        trigger: 'test',
        monthlyExpenses: undefined,
        annualExpenses: 0,
        timestamp: eventData.timestamp
      });
    });

    test('should handle insights with mixed data types', () => {
      const insights = [
        'String insight',
        { message: 'Object insight' },
        { data: 'Object without message' },
        123,
        null,
        undefined
      ];
      
      const mockLiElements = Array(6).fill().map(() => ({ 
        textContent: '', 
        classList: { add: jest.fn() } 
      }));
      
      jest.spyOn(document, 'createElement').mockImplementation(() => mockLiElements.shift());
      
      insightsController.initialize();
      insightsController.displayInsights(insights);
      
      expect(mockElements.insightsList.appendChild).toHaveBeenCalledTimes(6);
    });

    test('should generate unique request IDs', () => {
      const scenarioData = { plan: { monthly_expenses: 5000 } };
      
      insightsController.requestInsightsUpdate(scenarioData, 'test-1');
      insightsController.requestInsightsUpdate(scenarioData, 'test-2');
      
      const calls = mockEventBus.emit.mock.calls.filter(call => call[0] === 'insights:generate-request');
      expect(calls).toHaveLength(2);
      expect(calls[0][1].requestId).not.toBe(calls[1][1].requestId);
    });
  });

  describe('Integration', () => {
    test('should complete full workflow from scenario change to insights display', () => {
      insightsController.initialize();
      
      // 1. Scenario data changes
      const scenarioData = { plan: { monthly_expenses: 5000 } };
      const dataChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:data-changed')[1];
      
      dataChangedHandler({
        scenarioData,
        trigger: 'json-edit',
        timestamp: Date.now()
      });
      
      expect(insightsController.currentScenarioData).toBe(scenarioData);
      expect(mockEventBus.emit).toHaveBeenCalledWith('insights:generate-request', expect.any(Object));
      
      // 2. Insights are ready for display
      const insights = ['Your retirement plan looks good', 'Consider increasing savings'];
      const displayUpdateHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'ui:insights-display-update')[1];
      
      const mockLiElements = [
        { textContent: '', classList: { add: jest.fn() } },
        { textContent: '', classList: { add: jest.fn() } }
      ];
      jest.spyOn(document, 'createElement').mockImplementation(() => mockLiElements.shift());
      
      displayUpdateHandler({
        insights,
        trigger: 'scenario-change',
        scenarioData
      });
      
      expect(mockElements.insightsSection.style.display).toBe('block');
      expect(insightsController.currentInsights).toBe(insights);
    });
  });
});
