/**
 * Test fixtures for custom scenario management testing
 * Provides sample data for localStorage-based scenario testing
 */

export const sampleCustomScenarios = {
  'custom_retirement_basic_1640995200000': {
    name: 'Basic Retirement Plan',
    metadata: {
      title: 'Basic Retirement Plan',
      description: 'Simple retirement scenario with basic assumptions',
      timestamp: 1640995200000,
      isUserScenario: true,
      source: 'user-created'
    },
    plan: {
      monthly_expenses: 4500,
      retirement_age: 65,
      life_expectancy: 85,
      inflation_rate: 0.025
    },
    assets: {
      'checking': {
        balance: 25000,
        growth_schedule: 'savings_rate'
      },
      '401k': {
        balance: 350000,
        growth_schedule: 'investment_growth'
      }
    },
    income: {
      'social_security': {
        amount: 2200,
        start_month: 1,
        growth_schedule: 'inflation_adjustment'
      }
    },
    schedules: {
      'savings_rate': {
        type: 'fixed',
        rate: 0.01
      },
      'investment_growth': {
        type: 'fixed',
        rate: 0.07
      },
      'inflation_adjustment': {
        type: 'fixed',
        rate: 0.025
      }
    },
    order: [
      { order: 1, account: 'checking' },
      { order: 2, account: '401k' }
    ]
  },

  'custom_aggressive_growth_1640995300000': {
    name: 'Aggressive Growth Strategy',
    metadata: {
      title: 'Aggressive Growth Strategy',
      description: 'High-risk, high-reward investment approach',
      timestamp: 1640995300000,
      isUserScenario: true,
      source: 'user-created'
    },
    plan: {
      monthly_expenses: 6000,
      retirement_age: 60,
      life_expectancy: 90,
      inflation_rate: 0.03
    },
    assets: {
      'stocks': {
        balance: 500000,
        growth_schedule: 'aggressive_growth'
      },
      'emergency_fund': {
        balance: 50000,
        growth_schedule: 'conservative_growth'
      }
    },
    income: {
      'rental_income': {
        amount: 1500,
        start_month: 1,
        growth_schedule: 'rental_increases'
      }
    },
    schedules: {
      'aggressive_growth': {
        type: 'fixed',
        rate: 0.12
      },
      'conservative_growth': {
        type: 'fixed',
        rate: 0.02
      },
      'rental_increases': {
        type: 'fixed',
        rate: 0.04
      }
    },
    order: [
      { order: 1, account: 'emergency_fund' },
      { order: 2, account: 'stocks' }
    ]
  },

  'custom_conservative_plan_1640995400000': {
    name: 'Conservative Safety Plan',
    metadata: {
      title: 'Conservative Safety Plan',
      description: 'Low-risk approach with guaranteed income focus',
      timestamp: 1640995400000,
      isUserScenario: true,
      source: 'user-created'
    },
    plan: {
      monthly_expenses: 3500,
      retirement_age: 67,
      life_expectancy: 88,
      inflation_rate: 0.02
    },
    assets: {
      'savings': {
        balance: 200000,
        growth_schedule: 'safe_growth'
      },
      'bonds': {
        balance: 300000,
        growth_schedule: 'bond_returns'
      }
    },
    income: {
      'pension': {
        amount: 1800,
        start_month: 1,
        growth_schedule: 'pension_cola'
      },
      'social_security': {
        amount: 2500,
        start_month: 25,
        growth_schedule: 'ss_cola'
      }
    },
    schedules: {
      'safe_growth': {
        type: 'fixed',
        rate: 0.015
      },
      'bond_returns': {
        type: 'fixed',
        rate: 0.035
      },
      'pension_cola': {
        type: 'fixed',
        rate: 0.02
      },
      'ss_cola': {
        type: 'fixed',
        rate: 0.025
      }
    },
    order: [
      { order: 1, account: 'savings' },
      { order: 2, account: 'bonds' }
    ]
  }
};

export const emptyCustomScenarios = {};

export const corruptedScenarioData = 'invalid json string';

export const largeCustomScenarioSet = {};
// Generate 50 scenarios for testing performance and storage limits
for (let i = 1; i <= 50; i++) {
  const key = `custom_scenario_${i}_${Date.now() + i}`;
  largeCustomScenarioSet[key] = {
    name: `Test Scenario ${i}`,
    metadata: {
      title: `Test Scenario ${i}`,
      description: `Generated test scenario number ${i}`,
      timestamp: Date.now() + i,
      isUserScenario: true,
      source: 'test-generated'
    },
    plan: {
      monthly_expenses: 3000 + (i * 100),
      retirement_age: 60 + (i % 10),
      life_expectancy: 80 + (i % 15)
    },
    assets: {
      'account1': {
        balance: 100000 + (i * 10000),
        growth_schedule: 'test_growth'
      }
    },
    schedules: {
      'test_growth': {
        type: 'fixed',
        rate: 0.05 + (i * 0.001)
      }
    }
  };
}

export const mockStorageQuotaExceeded = () => {
  throw new DOMException('QuotaExceededError', 'Storage quota exceeded');
};

export const mockLocalStorageUnavailable = () => {
  throw new Error('localStorage is not available');
};

// Helper functions for test setup
export const setupMockLocalStorage = (initialData = null) => {
  const storage = {};
  
  return {
    getItem: jest.fn((key) => {
      if (initialData && key === 'retirement-explorer-user-scenarios') {
        return JSON.stringify(initialData);
      }
      return storage[key] || null;
    }),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: jest.fn((index) => {
      return Object.keys(storage)[index] || null;
    })
  };
};

export const calculateExpectedStorageSize = (scenarios) => {
  return JSON.stringify(scenarios).length;
};

export const generateScenarioKey = (name, timestamp = Date.now()) => {
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `custom_${sanitizedName}_${timestamp}`;
};
