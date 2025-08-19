/**
 * Guided Workflow Integration Tests
 * Tests the complete user journey through the new guided workflow
 */

import { EventBus } from '../../scripts/core/EventBus.js';
import { WorkflowController } from '../../scripts/controllers/WorkflowController.js';
import { UIController } from '../../scripts/controllers/UIController.js';
import { ScenarioController } from '../../scripts/controllers/ScenarioController.js';
import { ContentService } from '../../scripts/services/ContentService.js';
import { SimulationService } from '../../scripts/services/SimulationService.js';
import { ValidationService } from '../../scripts/services/ValidationService.js';

// Mock DOM elements for testing
const mockDOMElements = {
  'workflow-step-1': { classList: { remove: jest.fn(), add: jest.fn() }, addEventListener: jest.fn() },
  'workflow-step-2': { classList: { remove: jest.fn(), add: jest.fn() }, addEventListener: jest.fn() },
  'workflow-step-3': { classList: { remove: jest.fn(), add: jest.fn() }, addEventListener: jest.fn() },
  'step-1-status': { querySelector: jest.fn(() => ({ textContent: '', className: '' })) },
  'step-2-status': { querySelector: jest.fn(() => ({ textContent: '', className: '' })) },
  'step-3-status': { querySelector: jest.fn(() => ({ textContent: '', className: '' })) },
  'workflow-progress-fill': { style: { width: '0%' } },
  'step-1-panel': { classList: { remove: jest.fn(), add: jest.fn() } },
  'step-2-panel': { classList: { remove: jest.fn(), add: jest.fn() } },
  'step-3-panel': { classList: { remove: jest.fn(), add: jest.fn() } },
  'step-1-next': { disabled: true, addEventListener: jest.fn() },
  'step-2-next': { disabled: true, addEventListener: jest.fn() },
  'step-3-complete': { disabled: true, addEventListener: jest.fn() },
  'scenario-dropdown': { addEventListener: jest.fn(), value: '', innerHTML: '' },
  'run-btn-primary': { disabled: true, addEventListener: jest.fn(), textContent: '' },
  'run-monte-carlo-btn': { disabled: true, textContent: '' },
  'single-analysis-status': { innerHTML: '', style: {} },
  'monte-carlo-analysis-status': { innerHTML: '', style: {} },
  'scenario-preview': { classList: { remove: jest.fn(), add: jest.fn() } }
};

// Mock document.getElementById and querySelector
global.document = {
  getElementById: jest.fn((id) => mockDOMElements[id] || null),
  querySelector: jest.fn((selector) => mockDOMElements[selector] || null)
};

describe('Guided Workflow Integration', () => {
  let eventBus;
  let workflowController;
  let uiController;
  let scenarioController;
  let contentService;
  let simulationService;
  let validationService;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Initialize services
    contentService = new ContentService(eventBus);
    simulationService = new SimulationService(eventBus);
    validationService = new ValidationService(eventBus);
    
    // Initialize controllers
    workflowController = new WorkflowController(eventBus);
    uiController = new UIController(eventBus);
    scenarioController = new ScenarioController(contentService, simulationService, validationService, eventBus);
    
    // Initialize all controllers
    workflowController.initialize();
    uiController.initialize();
    scenarioController.initialize();
  });

  describe('Complete User Journey', () => {
    test('should guide user through complete workflow', async () => {
      const workflowEvents = [];
      
      // Track workflow events
      eventBus.on('workflow:step-completed', (data) => workflowEvents.push(data));
      eventBus.on('workflow:completed', (data) => workflowEvents.push(data));
      
      // Step 1: User selects scenario
      const testScenario = {
        metadata: { title: 'Test Scenario', description: 'Test description' },
        plan: { monthly_expenses: 5000, duration_months: 300 },
        assets: [{ name: 'Test Asset', balance: 100000 }],
        income: []
      };
      
      eventBus.emit('scenario:selected', { 
        scenario: testScenario,
        key: 'test-scenario'
      });
      
      // Verify step 1 completion
      expect(workflowController.completedSteps.has(1)).toBe(true);
      expect(workflowController.stepStates[2].unlocked).toBe(true);
      expect(workflowEvents).toHaveLength(1);
      expect(workflowEvents[0].step).toBe(1);
      
      // Step 2: User runs simulation
      eventBus.emit('simulation:completed', {
        results: { results: [{ month: 1, assets: {} }] },
        scenario: testScenario
      });
      
      // Verify step 2 completion
      expect(workflowController.completedSteps.has(2)).toBe(true);
      expect(workflowController.stepStates[3].unlocked).toBe(true);
      expect(workflowEvents).toHaveLength(2);
      expect(workflowEvents[1].step).toBe(2);
      
      // Step 3: User runs Monte Carlo
      eventBus.emit('montecarlo:analysis-completed', {
        results: { summary: {}, trajectories: [] }
      });
      
      // Verify workflow completion
      expect(workflowController.completedSteps.has(3)).toBe(true);
      expect(workflowEvents).toHaveLength(3);
      expect(workflowEvents[2].completedSteps).toEqual([1, 2, 3]);
    });

    test('should not progress workflow for Monte Carlo simulation events', () => {
      const workflowEvents = [];
      eventBus.on('workflow:step-completed', (data) => workflowEvents.push(data));
      
      // Emit simulation:completed with Monte Carlo context
      eventBus.emit('simulation:completed', {
        results: {},
        context: { isMonteCarlo: true }
      });
      
      // Should not trigger workflow progression
      expect(workflowController.completedSteps.has(2)).toBe(false);
      expect(workflowEvents).toHaveLength(0);
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      // Complete step 1 to unlock step 2
      eventBus.emit('scenario:selected', { scenario: { metadata: { title: 'Test' } } });
    });

    test('should allow navigation to unlocked steps', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      workflowController.activateStep(2);
      
      expect(workflowController.currentStep).toBe(2);
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-activated', {
        step: 2,
        previousStep: 1,
        stepStates: expect.any(Object)
      });
    });

    test('should prevent navigation to locked steps', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Try to activate step 3 (should be locked)
      workflowController.activateStep(3);
      
      expect(workflowController.currentStep).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Cannot activate locked step 3');
      
      consoleSpy.mockRestore();
    });
  });

  describe('UI Integration', () => {
    test('should track workflow progression correctly', () => {
      // Verify initial state
      expect(workflowController.currentStep).toBe(1);
      expect(workflowController.stepStates[1].unlocked).toBe(true);
      expect(workflowController.stepStates[2].unlocked).toBe(false);
      
      // Complete step 1
      eventBus.emit('scenario:selected', { scenario: { metadata: { title: 'Test' } } });
      
      // Verify step 1 completed and step 2 unlocked
      expect(workflowController.completedSteps.has(1)).toBe(true);
      expect(workflowController.stepStates[2].unlocked).toBe(true);
      
      // Complete step 2
      eventBus.emit('simulation:completed', { results: {} });
      
      // Verify step 2 completed and step 3 unlocked
      expect(workflowController.completedSteps.has(2)).toBe(true);
      expect(workflowController.stepStates[3].unlocked).toBe(true);
      
      // Complete step 3
      eventBus.emit('montecarlo:analysis-completed', { results: {} });
      
      // Verify workflow completion
      expect(workflowController.completedSteps.has(3)).toBe(true);
    });

    test('should update progress bar as steps complete', () => {
      // Test progress calculation logic
      expect(workflowController.completedSteps.size).toBe(0);
      
      // Complete step 1
      workflowController.completeStep(1);
      expect(workflowController.completedSteps.size).toBe(1);
      
      // Complete step 2
      workflowController.completeStep(2);
      expect(workflowController.completedSteps.size).toBe(2);
      
      // Complete step 3
      workflowController.completeStep(3);
      expect(workflowController.completedSteps.size).toBe(3);
      
      // Verify all steps completed
      expect(workflowController.completedSteps.has(1)).toBe(true);
      expect(workflowController.completedSteps.has(2)).toBe(true);
      expect(workflowController.completedSteps.has(3)).toBe(true);
    });
  });

  describe('EventBus Architecture Compliance', () => {
    test('should maintain strict EventBus communication', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      const onSpy = jest.spyOn(eventBus, 'on');
      
      workflowController.initialize();
      
      // Verify EventBus setup
      expect(onSpy).toHaveBeenCalledTimes(4); // 4 event listeners
      
      // Trigger scenario selection
      eventBus.emit('scenario:selected', { scenario: {} });
      
      // Verify EventBus emission
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-completed', expect.any(Object));
    });

    test('should not bypass EventBus for data flow', () => {
      // WorkflowController should not directly call methods on other controllers
      // All communication must go through EventBus
      
      const directMethodCalls = [
        'uiController',
        'scenarioController',
        'simulationService'
      ];
      
      directMethodCalls.forEach(property => {
        expect(workflowController[property]).toBeUndefined();
      });
    });
  });
});
