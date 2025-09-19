/**
 * ScenarioBuilderService Tests
 * Tests for scenario copying, conversion, and template functionality
 */

import { ScenarioBuilderService } from '../../../scripts/services/ScenarioBuilderService.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('ScenarioBuilderService', () => {
  let scenarioBuilderService;
  let mockEventBus;
  let emittedEvents;

  beforeEach(() => {
    emittedEvents = [];
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn((event, data) => {
        emittedEvents.push({ event, data });
      })
    };
    
    scenarioBuilderService = new ScenarioBuilderService(mockEventBus);
  });

  describe('Event Listeners Setup', () => {
    test('should set up all required event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:validate-form', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:convert-to-json', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:load-template', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:request-scenarios-for-copy', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:copy-scenario', expect.any(Function));
    });
  });

  describe('Copy Scenario Functionality', () => {
    test('should request scenarios for copying', () => {
      scenarioBuilderService.loadAvailableScenarios();
      
      expect(emittedEvents).toContainEqual({
        event: 'content:get-builtin-scenarios',
        data: undefined
      });
      expect(emittedEvents).toContainEqual({
        event: 'content:get-custom-scenarios',
        data: undefined
      });
    });

    test('should handle builtin scenario copy request', () => {
      const scenarioId = 'builtin:simple-retirement';
      
      scenarioBuilderService.copyScenario(scenarioId);
      
      expect(emittedEvents).toContainEqual({
        event: 'content:get-scenario',
        data: { key: 'simple-retirement', type: 'builtin' }
      });
    });

    test('should handle custom scenario copy request', () => {
      const scenarioId = 'custom:my-scenario';
      
      scenarioBuilderService.copyScenario(scenarioId);
      
      expect(emittedEvents).toContainEqual({
        event: 'content:get-scenario',
        data: { key: 'my-scenario', type: 'custom' }
      });
    });
  });

  describe('Service Methods', () => {
    test('should have required methods', () => {
      expect(typeof scenarioBuilderService.validateFormData).toBe('function');
      expect(typeof scenarioBuilderService.convertFormToJson).toBe('function');
      expect(typeof scenarioBuilderService.getTemplates).toBe('function');
    });

    test('should emit events for copy scenario workflow', () => {
      scenarioBuilderService.copyScenario('builtin:simple-retirement');

      expect(emittedEvents.some(e => e.event === 'content:get-scenario')).toBe(true);
    });

    test('should load available scenarios', () => {
      scenarioBuilderService.loadAvailableScenarios();

      expect(emittedEvents.some(e => e.event === 'content:get-builtin-scenarios')).toBe(true);
      expect(emittedEvents.some(e => e.event === 'content:get-custom-scenarios')).toBe(true);
    });
  });

  describe('Template Management', () => {
    test('should provide available templates', () => {
      const templates = scenarioBuilderService.getTemplates();
      
      expect(templates).toHaveProperty('simple-retirement');
      expect(templates).toHaveProperty('social-security');
      expect(templates).toHaveProperty('multiple-accounts');
      
      expect(templates['simple-retirement']).toHaveProperty('name');
      expect(templates['simple-retirement']).toHaveProperty('description');
      expect(templates['simple-retirement']).toHaveProperty('formData');
    });
  });

  describe('Form Validation', () => {
    test('should validate form data and emit results', () => {
      const formData = {
        title: 'Test Scenario',
        monthlyExpenses: 5000,
        durationYears: 30
      };

      // Trigger validation through event listener
      const validateHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'scenario-builder:validate-form'
      )[1];
      
      validateHandler(formData);

      expect(emittedEvents.some(e => e.event === 'scenario-builder:validation-result')).toBe(true);
    });
  });

  describe('JSON Conversion', () => {
    test('should convert form data to JSON and emit result', () => {
      const formData = {
        title: 'Test Scenario',
        monthlyExpenses: 5000,
        durationYears: 30,
        inflationRate: 3,
        assets: [],
        income: []
      };

      // Trigger conversion through event listener
      const convertHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'scenario-builder:convert-to-json'
      )[1];
      
      convertHandler(formData);

      expect(emittedEvents.some(e => e.event === 'scenario-builder:json-ready')).toBe(true);
    });

    test('should emit conversion error for invalid data', () => {
      const invalidFormData = null;

      const convertHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'scenario-builder:convert-to-json'
      )[1];
      
      convertHandler(invalidFormData);

      expect(emittedEvents.some(e => e.event === 'scenario-builder:conversion-error')).toBe(true);
    });
  });
});
