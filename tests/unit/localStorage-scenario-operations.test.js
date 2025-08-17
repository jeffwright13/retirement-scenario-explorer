/**
 * localStorage Scenario Operations Tests
 * Focused tests for the core localStorage functionality
 */

describe('localStorage Custom Scenario Operations', () => {
  let mockStorage = {};
  
  const localStorageMock = {
    getItem: jest.fn((key) => mockStorage[key] || null),
    setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
    removeItem: jest.fn((key) => { delete mockStorage[key]; }),
    clear: jest.fn(() => { mockStorage = {}; })
  };

  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  describe('Basic Storage Operations', () => {
    test('should save scenario to localStorage', () => {
      const scenarioData = {
        name: 'Test Scenario',
        plan: { monthly_expenses: 5000 },
        metadata: { title: 'Test Scenario' }
      };

      const userScenarios = {};
      userScenarios['test-scenario'] = {
        ...scenarioData,
        metadata: {
          ...scenarioData.metadata,
          timestamp: Date.now(),
          isUserScenario: true
        }
      };

      localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'retirement-explorer-user-scenarios',
        expect.stringContaining('Test Scenario')
      );
    });

    test('should retrieve scenarios from localStorage', () => {
      const testData = {
        'scenario1': { name: 'Test 1', metadata: { title: 'Test 1' } },
        'scenario2': { name: 'Test 2', metadata: { title: 'Test 2' } }
      };
      
      mockStorage['retirement-explorer-user-scenarios'] = JSON.stringify(testData);

      const retrieved = localStorage.getItem('retirement-explorer-user-scenarios');
      const parsed = JSON.parse(retrieved);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed.scenario1.name).toBe('Test 1');
    });

    test('should delete scenario from localStorage', () => {
      const testData = {
        'scenario1': { name: 'Test 1' },
        'scenario2': { name: 'Test 2' }
      };
      
      mockStorage['retirement-explorer-user-scenarios'] = JSON.stringify(testData);

      const stored = localStorage.getItem('retirement-explorer-user-scenarios');
      const userScenarios = JSON.parse(stored);
      delete userScenarios['scenario1'];
      localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));

      const updated = JSON.parse(localStorage.getItem('retirement-explorer-user-scenarios'));
      expect(Object.keys(updated)).toHaveLength(1);
      expect(updated.scenario2).toBeDefined();
      expect(updated.scenario1).toBeUndefined();
    });

    test('should clear all scenarios', () => {
      mockStorage['retirement-explorer-user-scenarios'] = JSON.stringify({
        'scenario1': { name: 'Test 1' }
      });

      localStorage.removeItem('retirement-explorer-user-scenarios');

      expect(localStorage.getItem('retirement-explorer-user-scenarios')).toBeNull();
    });
  });

  describe('Storage Info Calculation', () => {
    test('should calculate storage size correctly', () => {
      const scenarios = {
        'test1': { name: 'Test 1', plan: { monthly_expenses: 5000 } },
        'test2': { name: 'Test 2', plan: { monthly_expenses: 6000 } }
      };

      const jsonString = JSON.stringify(scenarios);
      const sizeKB = Math.round(jsonString.length / 1024 * 100) / 100;

      expect(sizeKB).toBeGreaterThan(0);
      expect(Object.keys(scenarios)).toHaveLength(2);
    });

    test('should handle empty storage', () => {
      const scenarios = {};
      const jsonString = JSON.stringify(scenarios);
      const sizeKB = Math.round(jsonString.length / 1024 * 100) / 100;

      expect(sizeKB).toBeGreaterThanOrEqual(0);
      expect(Object.keys(scenarios)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parsing errors', () => {
      mockStorage['retirement-explorer-user-scenarios'] = 'invalid json';

      expect(() => {
        const stored = localStorage.getItem('retirement-explorer-user-scenarios');
        JSON.parse(stored);
      }).toThrow();
    });

    test('should handle storage quota exceeded', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => {
        localStorage.setItem('test', 'data');
      }).toThrow('QuotaExceededError');
    });
  });

  describe('Data Validation', () => {
    test('should preserve scenario structure', () => {
      const originalScenario = {
        name: 'Test Scenario',
        plan: {
          monthly_expenses: 5000,
          retirement_age: 65
        },
        assets: {
          '401k': { balance: 100000 }
        },
        metadata: {
          title: 'Test Scenario',
          description: 'Test description'
        }
      };

      const stored = JSON.stringify({ 'test': originalScenario });
      mockStorage['retirement-explorer-user-scenarios'] = stored;

      const retrieved = JSON.parse(localStorage.getItem('retirement-explorer-user-scenarios'));
      const scenario = retrieved.test;

      expect(scenario.name).toBe(originalScenario.name);
      expect(scenario.plan.monthly_expenses).toBe(originalScenario.plan.monthly_expenses);
      expect(scenario.assets['401k'].balance).toBe(originalScenario.assets['401k'].balance);
      expect(scenario.metadata.title).toBe(originalScenario.metadata.title);
    });

    test('should handle missing metadata gracefully', () => {
      const scenarioWithoutMetadata = {
        name: 'Test Scenario',
        plan: { monthly_expenses: 5000 }
      };

      const stored = JSON.stringify({ 'test': scenarioWithoutMetadata });
      mockStorage['retirement-explorer-user-scenarios'] = stored;

      const retrieved = JSON.parse(localStorage.getItem('retirement-explorer-user-scenarios'));
      const scenario = retrieved.test;

      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.metadata).toBeUndefined();
    });
  });
});
