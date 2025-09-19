/**
 * ScenarioBuilderController Tests
 * Tests for scenario builder controller event handling and lifecycle management
 */

import { ScenarioBuilderController } from '../../../scripts/controllers/ScenarioBuilderController.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('ScenarioBuilderController', () => {
  let scenarioBuilderController;
  let mockEventBus;
  let mockScenarioBuilderService;
  let mockScenarioBuilderUI;
  let emittedEvents;

  beforeEach(() => {
    emittedEvents = [];
    
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn((event, data) => {
        emittedEvents.push({ event, data });
      })
    };

    mockScenarioBuilderService = {
      validateFormData: jest.fn(),
      convertFormToJson: jest.fn(),
      getTemplate: jest.fn(),
      convertScenarioToFormData: jest.fn()
    };

    mockScenarioBuilderUI = {
      showBuilder: jest.fn(),
      hideBuilder: jest.fn(),
      loadFormData: jest.fn(),
      updateValidation: jest.fn(),
      showError: jest.fn(),
      populateCopyScenarioOptions: jest.fn()
    };

    scenarioBuilderController = new ScenarioBuilderController(
      mockEventBus,
      mockScenarioBuilderService,
      mockScenarioBuilderUI
    );
  });

  describe('Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(scenarioBuilderController.eventBus).toBe(mockEventBus);
      expect(scenarioBuilderController.scenarioBuilderService).toBe(mockScenarioBuilderService);
      expect(scenarioBuilderController.scenarioBuilderUI).toBe(mockScenarioBuilderUI);
      expect(scenarioBuilderController.currentFormData).toBeNull();
      expect(scenarioBuilderController.isBuilderOpen).toBe(false);
    });

    test('should set up event listeners', () => {
      // Just verify that event listeners were set up (the constructor calls setupEventListeners)
      expect(mockEventBus.on).toHaveBeenCalled();
      expect(mockEventBus.on.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Builder Lifecycle', () => {
    test('should open builder correctly', () => {
      scenarioBuilderController.openBuilder({ data: 'test' });

      expect(scenarioBuilderController.isBuilderOpen).toBe(true);
      expect(emittedEvents.some(e => e.event === 'scenario-builder:ui-show-builder')).toBe(true);
    });

    test('should close builder correctly', () => {
      // First open the builder
      scenarioBuilderController.isBuilderOpen = true;

      scenarioBuilderController.closeBuilder();

      expect(scenarioBuilderController.isBuilderOpen).toBe(false);
      expect(emittedEvents.some(e => e.event === 'scenario-builder:ui-hide-builder')).toBe(true);
    });
  });

  describe('Template Handling', () => {
    test('should load template when selected', () => {
      scenarioBuilderController.loadTemplate('simple-retirement');

      expect(emittedEvents.some(e => e.event === 'scenario-builder:load-template')).toBe(true);
      const loadEvent = emittedEvents.find(e => e.event === 'scenario-builder:load-template');
      expect(loadEvent.data).toBe('simple-retirement');
    });
  });

  describe('Copy Scenario Functionality', () => {
    test('should request scenarios for copy', () => {
      scenarioBuilderController.requestScenariosForCopy();

      expect(emittedEvents.some(e => e.event === 'content:get-all-scenarios-for-copy')).toBe(true);
    });

    test('should handle copy scenario request', () => {
      scenarioBuilderController.copyScenario('builtin:simple-retirement');

      expect(emittedEvents.some(e => e.event === 'scenario-builder:load-scenario-for-copy')).toBe(true);
    });

    test('should handle scenario loaded for copy', () => {
      const mockScenario = {
        metadata: { title: 'Test Scenario' },
        plan: { monthly_expenses: 5000 }
      };

      // Test the conversion method directly
      const formData = scenarioBuilderController.convertScenarioToFormData(mockScenario);

      expect(formData.title).toBe('Copy of Test Scenario');
      expect(formData.monthlyExpenses).toBe(5000);
    });

    test('should convert scenario to form data correctly', () => {
      const scenario = {
        metadata: {
          title: 'Test Scenario',
          description: 'Test Description'
        },
        plan: {
          monthly_expenses: 6000,
          duration_months: 300,
          inflation_rate: 0.025,
          stop_on_shortfall: false
        },
        tax_config: {
          tax_deferred: 0.25,
          taxable: 0.18,
          tax_free: 0
        },
        assets: [{
          name: 'Test Asset',
          balance: 100000,
          return_rate: 0.08
        }],
        income: [{
          name: 'Test Income',
          amount: 3000,
          start_month: 12
        }]
      };

      const formData = scenarioBuilderController.convertScenarioToFormData(scenario);

      expect(formData.title).toBe('Copy of Test Scenario');
      expect(formData.description).toBe('Test Description');
      expect(formData.monthlyExpenses).toBe(6000);
      expect(formData.durationYears).toBe(25); // 300 months / 12
      expect(formData.inflationRate).toBe(2.5); // 0.025 * 100
      expect(formData.stopOnShortfall).toBe(false);
      expect(formData.taxDeferredRate).toBe(25); // 0.25 * 100
      expect(formData.taxableRate).toBe(18); // 0.18 * 100
      expect(formData.assets).toHaveLength(1);
      expect(formData.assets[0].name).toBe('Test Asset');
      expect(formData.assets[0].balance).toBe(100000);
      expect(formData.assets[0].returnRate).toBe(8); // 0.08 * 100
      expect(formData.income).toHaveLength(1);
      expect(formData.income[0].name).toBe('Test Income');
      expect(formData.income[0].amount).toBe(3000);
    });
  });

  describe('Form Data Management', () => {
    test('should handle form changes', () => {
      const mockFormData = {
        title: 'Updated Scenario',
        monthlyExpenses: 7000
      };

      scenarioBuilderController.handleFormChange(mockFormData);

      expect(scenarioBuilderController.currentFormData).toBe(mockFormData);
    });

    test('should handle save scenario', () => {
      scenarioBuilderController.currentFormData = {
        title: 'Test Scenario',
        monthlyExpenses: 5000
      };
      scenarioBuilderController.currentValidation = { isValid: true };

      scenarioBuilderController.saveScenario();

      expect(emittedEvents.some(e => e.event === 'scenario-builder:convert-to-json')).toBe(true);
    });

    test('should handle preview scenario', () => {
      scenarioBuilderController.currentFormData = {
        title: 'Test Scenario',
        monthlyExpenses: 5000
      };
      scenarioBuilderController.currentValidation = { isValid: true };

      scenarioBuilderController.previewScenario();

      expect(emittedEvents.some(e => e.event === 'scenario-builder:convert-to-json')).toBe(true);
    });
  });

  describe('Asset and Income Management', () => {
    test('should have form data structure', () => {
      scenarioBuilderController.currentFormData = {
        assets: [{ name: 'Asset 1', balance: 100000 }],
        income: [{ name: 'Income 1', amount: 2000 }]
      };

      expect(scenarioBuilderController.currentFormData.assets).toHaveLength(1);
      expect(scenarioBuilderController.currentFormData.income).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing form data gracefully', () => {
      scenarioBuilderController.currentFormData = null;

      // Should not throw error
      expect(() => scenarioBuilderController.saveScenario()).not.toThrow();
    });
  });

  describe('Event Bus Compliance', () => {
    test('should only communicate through event bus', () => {
      // Controller should not have direct references to other controllers
      expect(scenarioBuilderController.uiController).toBeUndefined();
      expect(scenarioBuilderController.contentService).toBeUndefined();
      expect(scenarioBuilderController.simulationService).toBeUndefined();
    });

    test('should emit events for all external communications', () => {
      const requestHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'scenario-builder:request-scenarios-for-copy'
      )[1];

      requestHandler();

      // Should emit event instead of calling service directly
      expect(emittedEvents.length).toBeGreaterThan(0);
      expect(emittedEvents[0].event).toBe('content:get-all-scenarios-for-copy');
    });
  });
});
