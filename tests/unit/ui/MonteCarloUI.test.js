/**
 * Tests for MonteCarloUI.js
 */

import { jest } from '@jest/globals';
import { MonteCarloUI } from '../../../scripts/ui/MonteCarloUI.js';

describe('MonteCarloUI', () => {
  let monteCarloUI;
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
      runButton: { addEventListener: jest.fn(), disabled: false, textContent: '' },
      cancelButton: { addEventListener: jest.fn(), style: { display: '' } },
      exportButton: { addEventListener: jest.fn(), disabled: false },
      monteCarloSection: { 
        classList: { 
          remove: jest.fn(), 
          add: jest.fn() 
        }, 
        style: { display: '' },
        scrollIntoView: jest.fn()
      },
      iterationsInput: { value: '1000' },
      seedInput: { value: '12345' },
      targetYearsInput: { value: '25' },
      successRateInput: { value: '80' },
      returnModelSelect: { value: 'simple-random' },
      configToggle: { addEventListener: jest.fn(), checked: false }
    };

    // Mock document methods
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const elementMap = {
        'run-monte-carlo-btn': mockElements.runButton,
        'cancel-monte-carlo': mockElements.cancelButton,
        'export-monte-carlo': mockElements.exportButton,
        'monte-carlo-section': mockElements.monteCarloSection,
        'monte-carlo-iterations': mockElements.iterationsInput,
        'monte-carlo-seed': mockElements.seedInput,
        'monte-carlo-target-years': mockElements.targetYearsInput,
        'monte-carlo-success-rate': mockElements.successRateInput,
        'monte-carlo-return-model': mockElements.returnModelSelect,
        'show-monte-carlo-config': mockElements.configToggle
      };
      return elementMap[id] || null;
    });

    // Mock document ready state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete'
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    monteCarloUI = new MonteCarloUI(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(monteCarloUI.eventBus).toBe(mockEventBus);
      expect(monteCarloUI.isInitialized).toBe(false);
      expect(monteCarloUI.currentScenarioData).toBeNull();
    });

    test('should initialize UI element references as null', () => {
      expect(monteCarloUI.runButton).toBeNull();
      expect(monteCarloUI.cancelButton).toBeNull();
      expect(monteCarloUI.exportButton).toBeNull();
      expect(monteCarloUI.monteCarloSection).toBeNull();
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      monteCarloUI.initialize();
      
      expect(monteCarloUI.isInitialized).toBe(true);
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario:selected', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario:loaded', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario:data-changed', expect.any(Function));
    });

    test('should set up UI elements when DOM is ready', () => {
      monteCarloUI.initialize();
      
      expect(monteCarloUI.runButton).toBe(mockElements.runButton);
      expect(monteCarloUI.cancelButton).toBe(mockElements.cancelButton);
      expect(monteCarloUI.exportButton).toBe(mockElements.exportButton);
      expect(monteCarloUI.monteCarloSection).toBe(mockElements.monteCarloSection);
    });

    test('should set up event listeners for UI elements', () => {
      monteCarloUI.initialize();
      
      expect(mockElements.runButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.cancelButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.exportButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.configToggle.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should set up event bus listeners for Monte Carlo events', () => {
      monteCarloUI.initialize();
      
      expect(mockEventBus.on).toHaveBeenCalledWith('montecarlo:started', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('montecarlo:error', expect.any(Function));
    });

    test('should handle DOM loading state', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });
      
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      const newUI = new MonteCarloUI(mockEventBus);
      newUI.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });
  });

  describe('Scenario Data Handling', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
    });

    test('should update scenario data on scenario:selected event', () => {
      const scenarioData = { metadata: { title: 'Test Scenario' } };
      const eventHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:selected')[1];
      
      eventHandler({ scenario: scenarioData });
      
      expect(monteCarloUI.currentScenarioData).toBe(scenarioData);
    });

    test('should update scenario data on scenario:loaded event', () => {
      const scenarioData = { name: 'Test Scenario' };
      const eventHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:loaded')[1];
      
      eventHandler({ scenario: scenarioData });
      
      expect(monteCarloUI.currentScenarioData).toBe(scenarioData);
    });

    test('should update scenario data on scenario:data-changed event', () => {
      const scenarioData = { metadata: { title: 'Test Scenario' } };
      const eventHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario:data-changed')[1];
      
      eventHandler({ scenarioData });
      
      expect(monteCarloUI.currentScenarioData).toBe(scenarioData);
    });
  });

  describe('UI Event Handlers', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
    });

    test('should handle run analysis button click', () => {
      const runHandler = mockElements.runButton.addEventListener.mock.calls[0][1];
      
      runHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:monte-carlo-start-requested', expect.any(Object));
    });

    test('should handle cancel analysis button click', () => {
      const cancelHandler = mockElements.cancelButton.addEventListener.mock.calls[0][1];
      
      cancelHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:monte-carlo-cancel-requested');
    });

    test('should handle export results button click', () => {
      const exportHandler = mockElements.exportButton.addEventListener.mock.calls[0][1];
      
      exportHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:monte-carlo-export-requested', { format: 'csv' });
    });

    test('should handle config toggle change', () => {
      const toggleHandler = mockElements.configToggle.addEventListener.mock.calls[0][1];
      mockElements.configToggle.checked = true;
      
      toggleHandler();
      
      expect(mockElements.monteCarloSection.classList.remove).toHaveBeenCalledWith('monte-carlo-config-collapsed', 'monte-carlo-config-expanded');
      expect(mockElements.monteCarloSection.classList.add).toHaveBeenCalledWith('monte-carlo-config-expanded');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
      monteCarloUI.currentScenarioData = { plan: { duration_months: 360 } };
    });

    test('should get configuration from UI elements', () => {
      const config = monteCarloUI.getConfigurationFromUI();
      
      expect(config.iterations).toBe(1000);
      expect(config.randomSeed).toBe(12345);
      expect(config.targetSurvivalMonths).toBe(300); // 25 years * 12
      expect(config.targetSuccessRate).toBe(0.8); // 80% / 100
      expect(config.returnModel).toBe('simple-random');
      expect(config.variableRanges).toBeDefined();
    });

    test('should handle missing UI values with defaults', () => {
      monteCarloUI.initialize();
      
      // Set all inputs to null to simulate missing elements
      monteCarloUI.iterationsInput = null;
      monteCarloUI.seedInput = null;
      monteCarloUI.targetYearsInput = null;
      monteCarloUI.successRateInput = null;
      monteCarloUI.returnModelSelect = null;
      
      // Set up scenario data for duration calculation
      monteCarloUI.currentScenarioData = {
        plan: { duration_months: 360 }
      };
      
      const config = monteCarloUI.getConfigurationFromUI();
      
      // When inputs are null, the method doesn't set these properties
      expect(config.iterations).toBeUndefined();
      expect(config.randomSeed).toBeUndefined();
      expect(config.targetSurvivalMonths).toBe(360); // From scenario duration
      expect(config.targetSuccessRate).toBe(0.8); // Default 80%
      expect(config.returnModel).toBe('simple-random'); // Default
    });

    test('should handle invalid target years input', () => {
      mockElements.targetYearsInput.value = 'invalid';
      
      const config = monteCarloUI.getConfigurationFromUI();
      
      expect(config.targetSurvivalMonths).toBe(360); // Falls back to scenario duration
    });

    test('should get default variable ranges', () => {
      const ranges = monteCarloUI.getDefaultVariableRanges();
      
      // Check that the object has the expected properties
      expect(ranges['rate_schedules.savings_growth.rate']).toBeDefined();
      expect(ranges['rate_schedules.investment_growth.rate']).toBeDefined();
      expect(ranges['rate_schedules.ira_growth.rate']).toBeDefined();
      expect(ranges['rate_schedules.roth_growth.rate']).toBeDefined();
      
      // Check structure of a range
      const savingsRange = ranges['rate_schedules.savings_growth.rate'];
      expect(savingsRange.type).toBe('normal');
      expect(savingsRange.mean).toBe(0.037);
      expect(savingsRange.stdDev).toBe(0.015);
      
      // Check another range
      const investmentRange = ranges['rate_schedules.investment_growth.rate'];
      expect(investmentRange.type).toBe('normal');
      expect(investmentRange.mean).toBe(0.065);
      expect(investmentRange.stdDev).toBe(0.025);
    });

    test('should validate configuration correctly', () => {
      const validConfig = { iterations: 1000, randomSeed: 12345 };
      const errors = monteCarloUI.validateConfiguration(validConfig);
      expect(errors).toHaveLength(0);
      
      const invalidConfig = { iterations: 50, randomSeed: -1 };
      const invalidErrors = monteCarloUI.validateConfiguration(invalidConfig);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors[0]).toContain('Iterations must be between');
      expect(invalidErrors[1]).toContain('Random seed must be between');
    });
  });

  describe('UI State Management', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
    });

    test('should show Monte Carlo section', () => {
      monteCarloUI.showMonteCarloSection();
      
      expect(mockElements.monteCarloSection.classList.remove).toHaveBeenCalledWith('monte-carlo-section--collapsed');
      expect(mockElements.monteCarloSection.style.display).toBe('block');
      expect(mockElements.monteCarloSection.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    });

    test('should hide Monte Carlo section', () => {
      monteCarloUI.hideMonteCarloSection();
      
      expect(mockElements.monteCarloSection.classList.add).toHaveBeenCalledWith('monte-carlo-section--collapsed');
    });

    test('should update UI state when running', () => {
      monteCarloUI.updateUIState(true, false);
      
      expect(mockElements.runButton.disabled).toBe(true);
      expect(mockElements.runButton.textContent).toBe('Running Analysis...');
      expect(mockElements.cancelButton.style.display).toBe('inline-block');
      expect(mockElements.exportButton.disabled).toBe(true);
    });

    test('should update UI state when not running with results', () => {
      monteCarloUI.updateUIState(false, true);
      
      expect(mockElements.runButton.disabled).toBe(false);
      expect(mockElements.runButton.textContent).toBe('🚀 Run Analysis');
      expect(mockElements.cancelButton.style.display).toBe('none');
      expect(mockElements.exportButton.disabled).toBe(false);
    });

    test('should handle config toggle collapse', () => {
      mockElements.configToggle.checked = false;
      
      monteCarloUI.handleConfigToggle();
      
      expect(mockElements.monteCarloSection.classList.add).toHaveBeenCalledWith('monte-carlo-config-collapsed');
    });

    test('should handle missing elements gracefully in config toggle', () => {
      monteCarloUI.configToggle = null;
      monteCarloUI.monteCarloSection = null;
      
      expect(() => monteCarloUI.handleConfigToggle()).not.toThrow();
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
      
      // Mock document.createElement and body.appendChild
      const mockNotification = {
        className: '',
        textContent: '',
        parentNode: { removeChild: jest.fn() }
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockNotification);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());
    });

    test('should show notification with correct properties', () => {
      monteCarloUI.showNotification('Test message', 'success');
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    test('should show notification with default type', () => {
      monteCarloUI.showNotification('Test message');
      
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('Debug and State', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
    });

    test('should get UI state for debugging', () => {
      const state = monteCarloUI.getUIState();
      
      expect(state.isInitialized).toBe(true);
      expect(state.elements).toHaveProperty('startButton');
      expect(state.elements).toHaveProperty('cancelButton');
      expect(state.elements).toHaveProperty('exportButton');
      expect(state.configuration).toBeDefined();
    });

    test('should handle start analysis method', () => {
      const showSectionSpy = jest.spyOn(monteCarloUI, 'showMonteCarloSection');
      
      monteCarloUI.handleStartAnalysis();
      
      expect(showSectionSpy).toHaveBeenCalled();
    });
  });

  describe('Event Bus Integration', () => {
    beforeEach(() => {
      monteCarloUI.initialize();
    });

    test('should handle montecarlo:started event', () => {
      const showSectionSpy = jest.spyOn(monteCarloUI, 'showMonteCarloSection');
      const startedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'montecarlo:started')[1];
      
      startedHandler();
      
      expect(showSectionSpy).toHaveBeenCalled();
    });

    test('should handle montecarlo:error event', () => {
      const showSectionSpy = jest.spyOn(monteCarloUI, 'showMonteCarloSection');
      const errorHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'montecarlo:error')[1];
      
      errorHandler();
      
      expect(showSectionSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing DOM elements gracefully', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const newUI = new MonteCarloUI(mockEventBus);
      
      expect(() => newUI.initialize()).not.toThrow();
    });

    test('should handle initializeUI being called multiple times', () => {
      monteCarloUI.initialize();
      const initialState = monteCarloUI.isInitialized;
      
      monteCarloUI.initializeUI();
      
      expect(monteCarloUI.isInitialized).toBe(initialState);
    });

    test('should handle missing scenario data in configuration', () => {
      monteCarloUI.initialize();
      monteCarloUI.currentScenarioData = null;
      
      const config = monteCarloUI.getConfigurationFromUI();
      
      expect(config.targetSurvivalMonths).toBe(300); // Default fallback
    });
  });
});
