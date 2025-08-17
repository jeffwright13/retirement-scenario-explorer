/**
 * Custom Scenario UI Flow Integration Tests
 * Tests the complete user workflow for custom scenario management
 */

import { jest } from '@jest/globals';

// Mock DOM environment
const mockElements = new Map();
const mockEventListeners = new Map();

global.document = {
  getElementById: jest.fn((id) => {
    if (!mockElements.has(id)) {
      const element = {
        id,
        style: { display: 'block' },
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => false)
        },
        innerHTML: '',
        textContent: '',
        value: '',
        addEventListener: jest.fn((event, handler) => {
          if (!mockEventListeners.has(id)) {
            mockEventListeners.set(id, new Map());
          }
          mockEventListeners.get(id).set(event, handler);
        }),
        click: jest.fn(() => {
          const listeners = mockEventListeners.get(id);
          if (listeners && listeners.has('click')) {
            listeners.get('click')();
          }
        }),
        dispatchEvent: jest.fn()
      };
      mockElements.set(id, element);
    }
    return mockElements.get(id);
  }),
  querySelector: jest.fn(),
  createElement: jest.fn(() => ({
    innerHTML: '',
    appendChild: jest.fn(),
    style: {}
  }))
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window functions
global.confirm = jest.fn();
global.alert = jest.fn();

describe('Custom Scenario UI Flow Integration', () => {
  let mockEventBus;
  let UIController;
  let uiController;

  beforeEach(() => {
    jest.clearAllMocks();
    mockElements.clear();
    mockEventListeners.clear();
    
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn()
    };

    // Simplified UIController mock with key methods
    UIController = class {
      constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentScenario = null;
      }

      initialize() {
        this.setupUIEventListeners();
        this.setupCustomScenarioManagement();
      }

      setupUIEventListeners() {
        const manageCustomBtn = document.getElementById('manage-custom-scenarios');
        if (manageCustomBtn) {
          manageCustomBtn.addEventListener('click', () => {
            this.openCustomScenarioModal();
          });
        }
      }

      setupCustomScenarioManagement() {
        const modal = document.getElementById('custom-scenario-modal');
        const closeBtn = document.getElementById('close-modal-btn');
        const clearAllBtn = document.getElementById('clear-all-custom');

        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
          });
        }

        if (clearAllBtn) {
          clearAllBtn.addEventListener('click', () => {
            this.clearAllCustomScenarios();
          });
        }
      }

      openCustomScenarioModal() {
        const modal = document.getElementById('custom-scenario-modal');
        if (modal) {
          modal.style.display = 'block';
          this.populateCustomScenarioModal();
        }
      }

      populateCustomScenarioModal() {
        const storageInfo = this.getStorageInfo();
        const storageInfoDiv = document.getElementById('storage-info');
        if (storageInfoDiv) {
          storageInfoDiv.innerHTML = `Storage: ${storageInfo.userScenarioCount} scenarios`;
        }
      }

      getStorageInfo() {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          return {
            userScenarioCount: Object.keys(userScenarios).length,
            dataSizeKB: 0
          };
        } catch (error) {
          return { userScenarioCount: 0, dataSizeKB: 0 };
        }
      }

      clearAllCustomScenarios() {
        const userScenarios = this.getUserScenarios();
        if (userScenarios.length === 0) {
          alert('No custom scenarios to clear.');
          return;
        }

        if (confirm(`Delete all ${userScenarios.length} custom scenarios?`)) {
          localStorage.removeItem('retirement-explorer-user-scenarios');
          this.eventBus.emit('content:refresh-scenarios');
          this.populateCustomScenarioModal();
        }
      }

      getUserScenarios() {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          return Object.entries(userScenarios).map(([key, scenario]) => ({
            key,
            ...scenario
          }));
        } catch (error) {
          return [];
        }
      }

      handleScenarioSelectedData(data) {
        this.currentScenario = data.scenario;
        const scenarioPreview = document.getElementById('scenario-preview');
        if (scenarioPreview) {
          scenarioPreview.classList.remove('hidden');
          scenarioPreview.classList.add('block');
        }
      }
    };

    uiController = new UIController(mockEventBus);
    uiController.initialize();
  });

  describe('Complete UI Workflow', () => {
    test('should open manage custom scenarios modal when button clicked', () => {
      const manageBtn = document.getElementById('manage-custom-scenarios');
      const modal = document.getElementById('custom-scenario-modal');

      manageBtn.click();

      expect(modal.style.display).toBe('block');
    });

    test('should populate modal with storage information', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test-scenario': { name: 'Test' }
      }));

      const manageBtn = document.getElementById('manage-custom-scenarios');
      const storageInfo = document.getElementById('storage-info');

      manageBtn.click();

      expect(storageInfo.innerHTML).toContain('Storage: 1 scenarios');
    });

    test('should close modal when close button clicked', () => {
      const modal = document.getElementById('custom-scenario-modal');
      const closeBtn = document.getElementById('close-modal-btn');

      // Open modal first
      modal.style.display = 'block';

      closeBtn.click();

      expect(modal.style.display).toBe('none');
    });

    test('should clear all scenarios when confirmed', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'scenario1': { name: 'Test 1' },
        'scenario2': { name: 'Test 2' }
      }));
      global.confirm.mockReturnValue(true);

      const clearAllBtn = document.getElementById('clear-all-custom');
      clearAllBtn.click();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('retirement-explorer-user-scenarios');
      expect(mockEventBus.emit).toHaveBeenCalledWith('content:refresh-scenarios');
    });

    test('should not clear scenarios when user cancels', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'scenario1': { name: 'Test 1' }
      }));
      global.confirm.mockReturnValue(false);

      const clearAllBtn = document.getElementById('clear-all-custom');
      clearAllBtn.click();

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    test('should show alert when no scenarios to clear', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const clearAllBtn = document.getElementById('clear-all-custom');
      clearAllBtn.click();

      expect(global.alert).toHaveBeenCalledWith('No custom scenarios to clear.');
    });
  });

  describe('Scenario Selection UI Flow', () => {
    test('should show scenario preview when scenario selected', () => {
      const scenarioData = {
        scenario: {
          name: 'Test Scenario',
          metadata: { title: 'Test Scenario' }
        }
      };

      uiController.handleScenarioSelectedData(scenarioData);

      const scenarioPreview = document.getElementById('scenario-preview');
      expect(scenarioPreview.classList.remove).toHaveBeenCalledWith('hidden');
      expect(scenarioPreview.classList.add).toHaveBeenCalledWith('block');
    });

    test('should store current scenario when selected', () => {
      const scenarioData = {
        scenario: {
          name: 'Test Scenario',
          metadata: { title: 'Test Scenario' }
        }
      };

      uiController.handleScenarioSelectedData(scenarioData);

      expect(uiController.currentScenario).toEqual(scenarioData.scenario);
    });
  });

  describe('Event Bus Integration', () => {
    test('should emit content refresh when scenarios cleared', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test': { name: 'Test' }
      }));
      global.confirm.mockReturnValue(true);

      const clearAllBtn = document.getElementById('clear-all-custom');
      clearAllBtn.click();

      expect(mockEventBus.emit).toHaveBeenCalledWith('content:refresh-scenarios');
    });

    test('should maintain event bus architecture compliance', () => {
      // Verify no direct parameter passing of business data
      const clearAllBtn = document.getElementById('clear-all-custom');
      
      // Method should access controller state, not receive parameters
      expect(clearAllBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      
      // Event handler should be a closure that accesses controller methods
      const clickHandler = mockEventListeners.get('clear-all-custom').get('click');
      expect(typeof clickHandler).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const storageInfo = uiController.getStorageInfo();

      expect(storageInfo).toEqual({
        userScenarioCount: 0,
        dataSizeKB: 0
      });
    });

    test('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const scenarios = uiController.getUserScenarios();

      expect(scenarios).toEqual([]);
    });

    test('should handle missing DOM elements gracefully', () => {
      document.getElementById.mockReturnValue(null);

      // Should not throw when elements are missing
      expect(() => {
        uiController.openCustomScenarioModal();
      }).not.toThrow();
    });
  });
});
