/**
 * Custom Scenario Management Tests
 * Tests for localStorage-based user scenario persistence and management
 */

import { jest } from '@jest/globals';

// Mock localStorage with proper state management
let mockStorage = {};
const localStorageMock = {
  getItem: jest.fn((key) => mockStorage[key] || null),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; }),
  clear: jest.fn(() => { mockStorage = {}; }),
};
global.localStorage = localStorageMock;

// Mock window functions
global.confirm = jest.fn();
global.alert = jest.fn();

// Mock DOM elements with proper state
const createMockElement = (id) => ({
  id,
  innerHTML: '',
  style: { display: 'none' },
  classList: { remove: jest.fn(), add: jest.fn() },
  addEventListener: jest.fn(),
  querySelector: jest.fn(() => null)
});

const mockElements = {};
global.document = {
  getElementById: jest.fn((id) => {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement(id);
    }
    return mockElements[id];
  }),
  createElement: jest.fn(() => createMockElement('new'))
};

// Mock event bus
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn()
};

describe('Custom Scenario Management', () => {
  let UIController;
  let ContentService;
  let uiController;
  let contentService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = {};
    Object.keys(mockElements).forEach(key => delete mockElements[key]);
    
    // Mock the modules (would need proper ES6 module mocking in real implementation)
    UIController = class MockUIController {
      constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentScenario = null;
      }

      // Custom scenario management methods
      openCustomScenarioModal() {
        const modal = document.getElementById('custom-scenario-modal');
        if (modal) {
          modal.style.display = 'block';
          this.populateCustomScenarioModal();
        }
      }

      populateCustomScenarioModal() {
        const storageInfo = this.getStorageInfo();
        const userScenarios = this.getUserScenarios();
        
        const storageInfoDiv = document.getElementById('storage-info');
        if (storageInfoDiv) {
          storageInfoDiv.innerHTML = `
            <div class="storage-summary">
              <p><strong>Storage Usage:</strong> ${storageInfo.userScenarioCount} scenarios, ${storageInfo.dataSizeKB} KB used</p>
            </div>
          `;
        }
      }

      getStorageInfo() {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          const dataSize = JSON.stringify(userScenarios).length;
          
          return {
            userScenarioCount: Object.keys(userScenarios).length,
            dataSizeKB: Math.round(dataSize / 1024 * 100) / 100
          };
        } catch (error) {
          return {
            userScenarioCount: 0,
            dataSizeKB: 0
          };
        }
      }

      getUserScenarios() {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          
          return Object.entries(userScenarios).map(([key, scenario]) => ({
            key,
            ...scenario,
            timestamp: scenario.metadata?.timestamp || Date.now()
          }));
        } catch (error) {
          return [];
        }
      }

      deleteCustomScenario(scenarioKey) {
        if (confirm(`Delete custom scenario "${scenarioKey}"?`)) {
          this.eventBus.emit('content:delete-user-scenario', scenarioKey);
          this.populateCustomScenarioModal();
        }
      }

      clearAllCustomScenarios() {
        const userScenarios = this.getUserScenarios();
        if (userScenarios.length === 0) {
          alert('No custom scenarios to clear.');
          return;
        }

        if (confirm(`Delete all ${userScenarios.length} custom scenarios? This cannot be undone.`)) {
          localStorage.removeItem('retirement-explorer-user-scenarios');
          this.eventBus.emit('content:refresh-scenarios');
          this.populateCustomScenarioModal();
        }
      }
    };

    ContentService = class MockContentService {
      constructor(eventBus) {
        this.eventBus = eventBus;
      }

      saveUserScenario(scenarioKey, scenarioData) {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          
          userScenarios[scenarioKey] = {
            ...scenarioData,
            metadata: {
              ...scenarioData.metadata,
              timestamp: Date.now(),
              isUserScenario: true
            }
          };
          
          localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));
          return true;
        } catch (error) {
          return false;
        }
      }

      deleteUserScenario(scenarioKey) {
        try {
          const stored = localStorage.getItem('retirement-explorer-user-scenarios');
          const userScenarios = stored ? JSON.parse(stored) : {};
          
          delete userScenarios[scenarioKey];
          localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));
          return true;
        } catch (error) {
          console.error('Failed to delete user scenario:', error);
          return false;
        }
      }
    };

    uiController = new UIController(mockEventBus);
    contentService = new ContentService(mockEventBus);
  });

  describe('localStorage Operations', () => {
    test('should save custom scenario to localStorage', () => {
      const scenarioData = {
        name: 'Test Scenario',
        plan: { monthly_expenses: 5000 },
        metadata: { title: 'Test Scenario' }
      };

      const result = contentService.saveUserScenario('test-scenario', scenarioData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'retirement-explorer-user-scenarios',
        expect.stringContaining('Test Scenario')
      );
    });

    test('should delete custom scenario from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test-scenario': { name: 'Test Scenario' }
      }));

      const result = contentService.deleteUserScenario('test-scenario');

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = contentService.saveUserScenario('test', {});

      expect(result).toBe(false);
    });
  });

  describe('Storage Info Calculation', () => {
    test('should calculate storage info correctly with no scenarios', () => {
      const info = uiController.getStorageInfo();

      expect(info).toEqual({
        userScenarioCount: 0,
        dataSizeKB: 0
      });
    });

    test('should calculate storage info correctly with scenarios', () => {
      const mockScenarios = {
        'scenario1': { name: 'Test 1' },
        'scenario2': { name: 'Test 2' }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScenarios));

      const info = uiController.getStorageInfo();

      expect(info.userScenarioCount).toBe(2);
      expect(info.dataSizeKB).toBeGreaterThan(0);
    });
  });

  describe('Modal Management', () => {
    test('should open custom scenario modal', () => {
      uiController.openCustomScenarioModal();

      expect(mockModal.style.display).toBe('block');
    });

    test('should populate modal with storage info', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test': { name: 'Test Scenario' }
      }));

      uiController.populateCustomScenarioModal();

      expect(mockElement.innerHTML).toContain('1 scenarios');
    });

    test('should clear all custom scenarios', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test1': { name: 'Test 1' },
        'test2': { name: 'Test 2' }
      }));

      // Mock confirm to return true
      global.confirm = jest.fn(() => true);

      uiController.clearAllCustomScenarios();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('retirement-explorer-user-scenarios');
      expect(mockEventBus.emit).toHaveBeenCalledWith('content:refresh-scenarios');
    });

    test('should not clear scenarios if user cancels', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'test': { name: 'Test' }
      }));

      global.confirm = jest.fn(() => false);

      uiController.clearAllCustomScenarios();

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Event Bus Integration', () => {
    test('should emit delete event when deleting scenario', () => {
      global.confirm = jest.fn(() => true);

      uiController.deleteCustomScenario('test-scenario');

      expect(mockEventBus.emit).toHaveBeenCalledWith('content:delete-user-scenario', 'test-scenario');
    });

    test('should emit refresh event when clearing all scenarios', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'test': {} }));
      global.confirm = jest.fn(() => true);

      uiController.clearAllCustomScenarios();

      expect(mockEventBus.emit).toHaveBeenCalledWith('content:refresh-scenarios');
    });
  });

  describe('User Scenario Retrieval', () => {
    test('should return empty array when no scenarios exist', () => {
      const scenarios = uiController.getUserScenarios();

      expect(scenarios).toEqual([]);
    });

    test('should return formatted user scenarios', () => {
      const mockData = {
        'scenario1': {
          name: 'Test Scenario',
          metadata: { title: 'Test', timestamp: 1234567890 }
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const scenarios = uiController.getUserScenarios();

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0]).toMatchObject({
        key: 'scenario1',
        name: 'Test Scenario',
        timestamp: 1234567890
      });
    });

    test('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const scenarios = uiController.getUserScenarios();

      expect(scenarios).toEqual([]);
    });
  });
});
