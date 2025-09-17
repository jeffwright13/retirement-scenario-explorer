/**
 * Tests for ModeController.js
 */

import { jest } from '@jest/globals';
import { ModeController } from '../../../scripts/controllers/ModeController.js';

describe('ModeController', () => {
  let modeController;
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
      scenarioModeBtn: {
        addEventListener: jest.fn(),
        classList: { toggle: jest.fn() }
      },
      storyModeBtn: {
        addEventListener: jest.fn(),
        classList: { toggle: jest.fn() }
      },
      scenarioContainer: {
        classList: { toggle: jest.fn() }
      },
      storyContainer: {
        classList: { toggle: jest.fn() }
      },
      storyExitBtn: {
        addEventListener: jest.fn()
      }
    };

    // Mock document methods
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const elementMap = {
        'scenario-mode-btn': mockElements.scenarioModeBtn,
        'story-mode-btn': mockElements.storyModeBtn,
        'scenario-mode-container': mockElements.scenarioContainer,
        'story-mode-container': mockElements.storyContainer,
        'story-exit-btn': mockElements.storyExitBtn
      };
      return elementMap[id] || null;
    });

    // Mock document.body.classList
    Object.defineProperty(document.body, 'classList', {
      value: {
        toggle: jest.fn()
      },
      writable: true,
      configurable: true
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    modeController = new ModeController(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(modeController.eventBus).toBe(mockEventBus);
      expect(modeController.currentMode).toBe('scenario');
    });

    test('should set up event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('mode:switch-to-scenario', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('mode:switch-to-story', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('mode:toggle', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('story:exit', expect.any(Function));
    });

    test('should initialize UI elements', () => {
      expect(modeController.scenarioModeBtn).toBe(mockElements.scenarioModeBtn);
      expect(modeController.storyModeBtn).toBe(mockElements.storyModeBtn);
      expect(modeController.scenarioContainer).toBe(mockElements.scenarioContainer);
      expect(modeController.storyContainer).toBe(mockElements.storyContainer);
      expect(modeController.storyExitBtn).toBe(mockElements.storyExitBtn);
    });

    test('should set up click handlers for UI elements', () => {
      expect(mockElements.scenarioModeBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.storyModeBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.storyExitBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      modeController.initialize();
      
      expect(modeController.currentMode).toBe('scenario');
      expect(console.log).toHaveBeenCalledWith('🎭 Initializing Mode Controller');
      expect(console.log).toHaveBeenCalledWith('✅ Mode Controller initialized');
    });

    test('should re-initialize UI elements if not found', () => {
      modeController.scenarioContainer = null;
      modeController.storyContainer = null;
      
      const initializeUISpy = jest.spyOn(modeController, 'initializeUI');
      
      modeController.initialize();
      
      expect(console.warn).toHaveBeenCalledWith('🎭 UI containers not found, re-initializing elements');
      expect(initializeUISpy).toHaveBeenCalled();
    });

    test('should force mode update during initialization', () => {
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      modeController.initialize();
      
      expect(setModeSpy).toHaveBeenCalledWith('scenario');
    });
  });

  describe('Event Bus Integration', () => {
    test('should handle mode:switch-to-scenario event', () => {
      const switchToScenarioHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'mode:switch-to-scenario')[1];
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      switchToScenarioHandler();
      
      expect(setModeSpy).toHaveBeenCalledWith('scenario');
    });

    test('should handle mode:switch-to-story event', () => {
      const switchToStoryHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'mode:switch-to-story')[1];
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      switchToStoryHandler();
      
      expect(setModeSpy).toHaveBeenCalledWith('story');
    });

    test('should handle mode:toggle event', () => {
      const toggleHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'mode:toggle')[1];
      const toggleModeSpy = jest.spyOn(modeController, 'toggleMode');
      
      toggleHandler();
      
      expect(toggleModeSpy).toHaveBeenCalled();
    });

    test('should handle story:exit event', () => {
      const storyExitHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story:exit')[1];
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      storyExitHandler();
      
      expect(setModeSpy).toHaveBeenCalledWith('scenario');
    });
  });

  describe('UI Click Handlers', () => {
    test('should emit mode:switch-to-scenario when scenario button clicked', () => {
      const scenarioClickHandler = mockElements.scenarioModeBtn.addEventListener.mock.calls[0][1];
      
      scenarioClickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:switch-to-scenario');
    });

    test('should emit mode:switch-to-story when story button clicked', () => {
      const storyClickHandler = mockElements.storyModeBtn.addEventListener.mock.calls[0][1];
      
      storyClickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:switch-to-story');
    });

    test('should emit mode:switch-to-scenario when story exit button clicked', () => {
      const exitClickHandler = mockElements.storyExitBtn.addEventListener.mock.calls[0][1];
      
      exitClickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:switch-to-scenario');
    });
  });

  describe('Mode Management', () => {
    test('should set mode to scenario', () => {
      // First set to story mode, then switch to scenario to trigger the event
      modeController.currentMode = 'story';
      mockEventBus.emit.mockClear(); // Clear previous calls
      
      modeController.setMode('scenario');
      
      expect(modeController.currentMode).toBe('scenario');
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:changed', {
        previousMode: 'story',
        currentMode: 'scenario'
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:scenario-entered');
    });

    test('should set mode to story', () => {
      modeController.setMode('story');
      
      expect(modeController.currentMode).toBe('story');
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:changed', {
        previousMode: 'scenario',
        currentMode: 'story'
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:story-entered');
    });

    test('should force UI update when setting same mode', () => {
      modeController.currentMode = 'scenario';
      const updateModeUISpy = jest.spyOn(modeController, 'updateModeUI');
      
      modeController.setMode('scenario');
      
      expect(console.log).toHaveBeenCalledWith('🎭 Already in scenario mode, forcing UI update');
      expect(updateModeUISpy).toHaveBeenCalled();
    });

    test('should toggle from scenario to story mode', () => {
      modeController.currentMode = 'scenario';
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      modeController.toggleMode();
      
      expect(setModeSpy).toHaveBeenCalledWith('story');
    });

    test('should toggle from story to scenario mode', () => {
      modeController.currentMode = 'story';
      const setModeSpy = jest.spyOn(modeController, 'setMode');
      
      modeController.toggleMode();
      
      expect(setModeSpy).toHaveBeenCalledWith('scenario');
    });
  });

  describe('UI Updates', () => {
    test('should update UI for scenario mode', () => {
      modeController.currentMode = 'scenario';
      
      modeController.updateModeUI();
      
      expect(mockElements.scenarioModeBtn.classList.toggle).toHaveBeenCalledWith('btn--mode-active', true);
      expect(mockElements.storyModeBtn.classList.toggle).toHaveBeenCalledWith('btn--mode-active', false);
      expect(mockElements.scenarioContainer.classList.toggle).toHaveBeenCalledWith('active', true);
      expect(mockElements.storyContainer.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('scenario-mode', true);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('story-mode', false);
    });

    test('should update UI for story mode', () => {
      modeController.currentMode = 'story';
      
      modeController.updateModeUI();
      
      expect(mockElements.scenarioModeBtn.classList.toggle).toHaveBeenCalledWith('btn--mode-active', false);
      expect(mockElements.storyModeBtn.classList.toggle).toHaveBeenCalledWith('btn--mode-active', true);
      expect(mockElements.scenarioContainer.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockElements.storyContainer.classList.toggle).toHaveBeenCalledWith('active', true);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('scenario-mode', false);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('story-mode', true);
    });

    test('should handle missing button elements gracefully', () => {
      modeController.scenarioModeBtn = null;
      modeController.storyModeBtn = null;
      
      expect(() => modeController.updateModeUI()).not.toThrow();
    });

    test('should handle missing container elements gracefully', () => {
      modeController.scenarioContainer = null;
      modeController.storyContainer = null;
      
      expect(() => modeController.updateModeUI()).not.toThrow();
    });
  });

  describe('State Queries', () => {
    test('should get current mode', () => {
      modeController.currentMode = 'story';
      
      expect(modeController.getCurrentMode()).toBe('story');
    });

    test('should check if in scenario mode', () => {
      modeController.currentMode = 'scenario';
      expect(modeController.isScenarioMode()).toBe(true);
      
      modeController.currentMode = 'story';
      expect(modeController.isScenarioMode()).toBe(false);
    });

    test('should check if in story mode', () => {
      modeController.currentMode = 'story';
      expect(modeController.isStoryMode()).toBe(true);
      
      modeController.currentMode = 'scenario';
      expect(modeController.isStoryMode()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing DOM elements during initialization', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const newController = new ModeController(mockEventBus);
      
      expect(newController.scenarioModeBtn).toBeNull();
      expect(newController.storyModeBtn).toBeNull();
      expect(newController.scenarioContainer).toBeNull();
      expect(newController.storyContainer).toBeNull();
      expect(newController.storyExitBtn).toBeNull();
    });

    test('should not set up click handlers for missing elements', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      
      expect(() => new ModeController(mockEventBus)).not.toThrow();
    });

    test('should handle invalid mode gracefully', () => {
      const previousMode = modeController.currentMode;
      
      modeController.setMode('invalid-mode');
      
      expect(modeController.currentMode).toBe('invalid-mode');
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:changed', {
        previousMode,
        currentMode: 'invalid-mode'
      });
      // Should not emit specific mode events for invalid modes
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('mode:invalid-mode-entered');
    });

    test('should track previous mode correctly during transitions', () => {
      modeController.currentMode = 'scenario';
      
      modeController.setMode('story');
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:changed', {
        previousMode: 'scenario',
        currentMode: 'story'
      });
    });
  });

  describe('Logging', () => {
    test('should log UI elements status during initialization', () => {
      expect(console.log).toHaveBeenCalledWith('🎭 Mode UI elements initialized:', {
        scenarioModeBtn: true,
        storyModeBtn: true,
        scenarioContainer: true,
        storyContainer: true,
        storyExitBtn: true
      });
    });

    test('should log mode switches', () => {
      modeController.setMode('story');
      
      expect(console.log).toHaveBeenCalledWith('🎭 Switching to story mode');
    });

    test('should log UI updates', () => {
      modeController.updateModeUI();
      
      expect(console.log).toHaveBeenCalledWith(`🎭 UI updated for ${modeController.currentMode} mode`);
    });
  });

  describe('Integration', () => {
    test('should complete full mode switch workflow', () => {
      // Start in scenario mode
      expect(modeController.currentMode).toBe('scenario');
      expect(modeController.isScenarioMode()).toBe(true);
      
      // Switch to story mode
      modeController.setMode('story');
      
      expect(modeController.currentMode).toBe('story');
      expect(modeController.isStoryMode()).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:story-entered');
      
      // Switch back to scenario mode
      modeController.setMode('scenario');
      
      expect(modeController.currentMode).toBe('scenario');
      expect(modeController.isScenarioMode()).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('mode:scenario-entered');
    });

    test('should handle rapid mode switches', () => {
      modeController.setMode('story');
      modeController.setMode('scenario');
      modeController.setMode('story');
      
      expect(modeController.currentMode).toBe('story');
      expect(mockEventBus.emit).toHaveBeenCalledTimes(6); // 3 mode changes × 2 events each
    });
  });
});
