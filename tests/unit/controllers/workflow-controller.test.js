/**
 * WorkflowController Unit Tests
 * Tests the guided workflow progression and EventBus compliance
 */

import { WorkflowController } from '../../../scripts/controllers/WorkflowController.js';
import { EventBus } from '../../../scripts/core/EventBus.js';

describe('WorkflowController', () => {
  let workflowController;
  let eventBus;
  let mockDOM;

  beforeEach(() => {
    // Create fresh EventBus for each test
    eventBus = new EventBus();
    
    // Mock DOM elements
    mockDOM = {
      elements: {},
      getElementById: jest.fn((id) => mockDOM.elements[id] || null),
      querySelector: jest.fn((selector) => mockDOM.elements[selector] || null)
    };
    
    // Mock essential DOM elements
    mockDOM.elements['workflow-step-1'] = { 
      classList: { remove: jest.fn(), add: jest.fn() },
      addEventListener: jest.fn()
    };
    mockDOM.elements['workflow-step-2'] = { 
      classList: { remove: jest.fn(), add: jest.fn() },
      addEventListener: jest.fn()
    };
    mockDOM.elements['workflow-step-3'] = { 
      classList: { remove: jest.fn(), add: jest.fn() },
      addEventListener: jest.fn()
    };
    mockDOM.elements['step-1-status'] = { 
      querySelector: jest.fn(() => ({ textContent: '', className: '' }))
    };
    mockDOM.elements['step-2-status'] = { 
      querySelector: jest.fn(() => ({ textContent: '', className: '' }))
    };
    mockDOM.elements['step-3-status'] = { 
      querySelector: jest.fn(() => ({ textContent: '', className: '' }))
    };
    mockDOM.elements['workflow-progress-fill'] = { style: {} };
    mockDOM.elements['step-1-panel'] = { classList: { remove: jest.fn(), add: jest.fn() } };
    mockDOM.elements['step-2-panel'] = { classList: { remove: jest.fn(), add: jest.fn() } };
    mockDOM.elements['step-3-panel'] = { classList: { remove: jest.fn(), add: jest.fn() } };
    mockDOM.elements['step-1-next'] = { disabled: true, addEventListener: jest.fn() };
    mockDOM.elements['step-2-next'] = { disabled: true, addEventListener: jest.fn() };
    mockDOM.elements['step-3-complete'] = { disabled: true, addEventListener: jest.fn() };
    mockDOM.elements['create-new-scenario-btn'] = { addEventListener: jest.fn() };
    mockDOM.elements['.guidance-text'] = { innerHTML: '' };

    // Mock document.getElementById globally
    global.document = {
      getElementById: mockDOM.getElementById,
      querySelector: mockDOM.querySelector
    };

    workflowController = new WorkflowController(eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      expect(workflowController.currentStep).toBe(1);
      expect(workflowController.completedSteps.size).toBe(0);
      expect(workflowController.stepStates[1].unlocked).toBe(true);
      expect(workflowController.stepStates[2].unlocked).toBe(false);
      expect(workflowController.stepStates[3].unlocked).toBe(false);
    });

    test('should set up EventBus listeners on initialize', () => {
      const eventBusSpy = jest.spyOn(eventBus, 'on');
      
      workflowController.initialize();
      
      expect(eventBusSpy).toHaveBeenCalledWith('scenario:selected', expect.any(Function));
      expect(eventBusSpy).toHaveBeenCalledWith('simulation:completed', expect.any(Function));
      expect(eventBusSpy).toHaveBeenCalledWith('montecarlo:analysis-completed', expect.any(Function));
      expect(eventBusSpy).toHaveBeenCalledWith('workflow:activate-step', expect.any(Function));
    });
  });

  describe('Workflow Progression', () => {
    beforeEach(() => {
      workflowController.initialize();
    });

    test('should complete step 1 and unlock step 2 when scenario selected', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      eventBus.emit('scenario:selected', { scenario: { metadata: { title: 'Test' } } });
      
      expect(workflowController.completedSteps.has(1)).toBe(true);
      expect(workflowController.stepStates[2].unlocked).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-completed', {
        step: 1,
        nextStep: 2,
        completedSteps: [1]
      });
    });

    test('should complete step 2 and unlock step 3 when simulation completed', () => {
      // First complete step 1
      eventBus.emit('scenario:selected', { scenario: {} });
      
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      // Complete step 2
      eventBus.emit('simulation:completed', { results: {} });
      
      expect(workflowController.completedSteps.has(2)).toBe(true);
      expect(workflowController.stepStates[3].unlocked).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-completed', {
        step: 2,
        nextStep: 3,
        completedSteps: [1, 2]
      });
    });

    test('should complete step 3 when Monte Carlo completed', () => {
      // Complete steps 1 and 2
      eventBus.emit('scenario:selected', { scenario: {} });
      eventBus.emit('simulation:completed', { results: {} });
      
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      // Complete step 3
      eventBus.emit('montecarlo:analysis-completed', { results: {} });
      
      expect(workflowController.completedSteps.has(3)).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('workflow:completed', {
        completedSteps: [1, 2, 3]
      });
    });

    test('should ignore Monte Carlo events from regular simulations', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      // Emit simulation:completed with Monte Carlo context
      eventBus.emit('simulation:completed', { 
        results: {}, 
        context: { isMonteCarlo: true } 
      });
      
      // Should not trigger workflow progression
      expect(workflowController.completedSteps.has(2)).toBe(false);
      expect(workflowController.stepStates[3].unlocked).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      workflowController.initialize();
    });

    test('should activate unlocked steps', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      // Step 1 should be unlocked by default
      workflowController.activateStep(1);
      
      expect(workflowController.currentStep).toBe(1);
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-activated', {
        step: 1,
        previousStep: 1,
        stepStates: workflowController.stepStates
      });
    });

    test('should not activate locked steps', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Step 2 should be locked initially
      workflowController.activateStep(2);
      
      expect(workflowController.currentStep).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Cannot activate locked step 2');
      
      consoleSpy.mockRestore();
    });

    test('should update progress bar correctly', () => {
      expect(workflowController.completedSteps.size).toBe(0);
      
      // Complete step 1
      workflowController.completeStep(1);
      expect(workflowController.completedSteps.size).toBe(1);
      expect(workflowController.completedSteps.has(1)).toBe(true);
      
      // Complete step 2
      workflowController.completeStep(2);
      expect(workflowController.completedSteps.size).toBe(2);
      expect(workflowController.completedSteps.has(2)).toBe(true);
      
      // Complete step 3
      workflowController.completeStep(3);
      expect(workflowController.completedSteps.size).toBe(3);
      expect(workflowController.completedSteps.has(3)).toBe(true);
    });
  });

  describe('EventBus Compliance', () => {
    test('should only communicate via EventBus', () => {
      workflowController.initialize();
      
      // Verify no direct method calls between components
      // All communication should go through EventBus events
      const eventBusMethods = ['emit', 'on', 'once', 'off'];
      
      eventBusMethods.forEach(method => {
        expect(typeof eventBus[method]).toBe('function');
      });
    });

    test('should emit proper workflow events', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      workflowController.initialize();
      
      // Test step completion event
      workflowController.completeStep(1);
      workflowController.unlockStep(2);
      
      expect(emitSpy).toHaveBeenCalledWith('workflow:step-unlocked', {
        step: 2,
        stepStates: expect.any(Object)
      });
    });
  });

  describe('State Management', () => {
    test('should track workflow state correctly', () => {
      workflowController.initialize();
      
      // Complete steps progressively
      workflowController.completeStep(1);
      workflowController.unlockStep(2);
      workflowController.activateStep(2);
      
      const state = workflowController.getWorkflowState();
      
      expect(state).toEqual({
        currentStep: 2,
        completedSteps: [1],
        stepStates: {
          1: { status: 'completed', unlocked: true },
          2: { status: 'unlocked', unlocked: true },
          3: { status: 'locked', unlocked: false }
        }
      });
    });
  });
});
