/**
 * Comprehensive test scenarios covering all schema configuration options
 * Based on scenario-schema.json specification
 */

const comprehensiveScenarios = {
  // Test all asset types and configurations
  allAssetTypes: {
    metadata: {
      title: "All Asset Types Test",
      description: "Tests taxable, tax_deferred, and tax_free assets",
      tags: ["asset-types", "comprehensive"]
    },
    plan: {
      monthly_expenses: 4000,
      duration_months: 60,
      stop_on_shortfall: true
    },
    rate_schedules: {
      conservative: { type: 'fixed', rate: 0.02 },
      moderate: { type: 'fixed', rate: 0.06 },
      aggressive: { type: 'fixed', rate: 0.08 }
    },
    assets: [
      {
        name: "Taxable Savings",
        type: "taxable",
        balance: 100000,
        min_balance: 5000,
        compounding: "monthly",
        return_schedule: "conservative"
      },
      {
        name: "Traditional IRA",
        type: "tax_deferred", 
        balance: 150000,
        min_balance: 0,
        compounding: "annual",
        start_month: 6,
        return_schedule: "moderate"
      },
      {
        name: "Roth IRA",
        type: "tax_free",
        balance: 75000,
        min_balance: 0,
        compounding: "monthly",
        start_month: 0,
        return_schedule: "aggressive"
      }
    ],
    order: [
      { account: "Taxable Savings", order: 1 },
      { account: "Traditional IRA", order: 2 },
      { account: "Roth IRA", order: 3 }
    ]
  },

  // Test proportional withdrawals with weights
  proportionalWithdrawals: {
    metadata: {
      title: "Proportional Withdrawal Test",
      description: "Tests weighted withdrawals from same-order assets"
    },
    plan: {
      monthly_expenses: 3000,
      duration_months: 36
    },
    assets: [
      {
        name: "Stock Portfolio",
        balance: 200000,
        min_balance: 0
      },
      {
        name: "Bond Portfolio", 
        balance: 100000,
        min_balance: 0
      },
      {
        name: "Cash Reserve",
        balance: 50000,
        min_balance: 10000
      }
    ],
    order: [
      { account: "Cash Reserve", order: 1 },
      { account: "Stock Portfolio", order: 2, weight: 0.7 },
      { account: "Bond Portfolio", order: 2, weight: 0.3 }
    ]
  },

  // Test complex income scenarios
  complexIncome: {
    metadata: {
      title: "Complex Income Scenarios",
      description: "Tests various income timing and negative amounts"
    },
    plan: {
      monthly_expenses: 5000,
      duration_months: 120
    },
    assets: [
      { name: "Savings", balance: 300000, min_balance: 0 }
    ],
    income: [
      // Immediate permanent income
      { name: "Pension", amount: 1800, start_month: 1 },
      
      // Future permanent income  
      { name: "Social Security", amount: 2200, start_month: 24 },
      
      // Temporary income
      { name: "Part-time Work", amount: 1200, start_month: 6, stop_month: 18 },
      
      // Recurring expenses (negative income)
      { name: "Health Insurance", amount: -650, start_month: 1 },
      { name: "Long-term Care", amount: -1200, start_month: 60 },
      
      // One-time expenses
      { name: "Roof Replacement", amount: -15000, start_month: 36, stop_month: 36 }
    ],
    order: [
      { account: "Savings", order: 1 }
    ]
  },

  // Test all rate schedule types
  allRateSchedules: {
    metadata: {
      title: "All Rate Schedule Types",
      description: "Tests fixed, sequence, map, and pipeline rate schedules"
    },
    plan: {
      monthly_expenses: 4500,
      duration_months: 180,
      inflation_schedule: "variable_inflation"
    },
    assets: [
      {
        name: "Conservative Fund",
        balance: 100000,
        return_schedule: "fixed_returns"
      },
      {
        name: "Growth Fund", 
        balance: 150000,
        return_schedule: "sequence_returns"
      },
      {
        name: "Balanced Fund",
        balance: 200000,
        return_schedule: "map_returns"
      }
    ],
    order: [
      { account: "Conservative Fund", order: 1 },
      { account: "Growth Fund", order: 2 },
      { account: "Balanced Fund", order: 3 }
    ],
    rate_schedules: {
      // Fixed rate
      fixed_returns: {
        type: "fixed",
        rate: 0.04
      },
      
      // Sequence rate
      sequence_returns: {
        type: "sequence",
        start_year: 0,
        values: [0.08, 0.06, 0.04, 0.05, 0.07],
        default_rate: 0.045
      },
      
      // Map rate
      map_returns: {
        type: "map",
        periods: [
          { start_year: 0, stop_year: 5, rate: 0.08 },
          { start_year: 6, stop_year: 10, rate: 0.06 },
          { start_year: 11, stop_year: 20, rate: 0.04 }
        ],
        default_rate: 0.03
      },
      
      // Variable inflation
      variable_inflation: {
        type: "sequence",
        values: [0.02, 0.025, 0.03, 0.028, 0.024],
        default_rate: 0.025
      }
    }
  },

  // Test deposits functionality
  depositsTest: {
    metadata: {
      title: "Deposits Test Scenario",
      description: "Tests one-time and recurring deposits"
    },
    plan: {
      monthly_expenses: 3500,
      duration_months: 60
    },
    assets: [
      { name: "Checking", balance: 25000, min_balance: 5000 },
      { name: "Investment", balance: 150000, min_balance: 0 },
      { name: "Emergency Fund", balance: 20000, min_balance: 15000 }
    ],
    deposits: [
      // One-time deposits
      { name: "Tax Refund", target: "Investment", amount: 8000, start_month: 4, stop_month: 4 },
      { name: "Bonus", target: "Investment", amount: 12000, start_month: 12, stop_month: 12 },
      
      // Recurring deposits
      { name: "Monthly Savings", target: "Investment", amount: 1000, start_month: 1, stop_month: 24 },
      { name: "Emergency Fund Top-up", target: "Emergency Fund", amount: 500, start_month: 6, stop_month: 18 }
    ],
    order: [
      { account: "Checking", order: 1 },
      { account: "Investment", order: 2 },
      { account: "Emergency Fund", order: 3 }
    ]
  },

  // Edge case: Negative balance assets (planned expenses)
  negativeBalanceAssets: {
    metadata: {
      title: "Negative Balance Assets Test",
      description: "Tests assets with negative balances (planned future expenses)"
    },
    plan: {
      monthly_expenses: 4000,
      duration_months: 48
    },
    assets: [
      { name: "Savings", balance: 200000, min_balance: 0 },
      { name: "Future Home Purchase", balance: -50000, min_balance: 0 }, // Planned expense
      { name: "Future Car Purchase", balance: -25000, min_balance: 0 }   // Planned expense
    ],
    order: [
      { account: "Savings", order: 1 },
      { account: "Future Home Purchase", order: 2 },
      { account: "Future Car Purchase", order: 3 }
    ]
  },

  // Edge case: Assets with balance equal to minimum
  balanceEqualsMinimum: {
    metadata: {
      title: "Balance Equals Minimum Test",
      description: "Tests assets where balance equals min_balance"
    },
    plan: {
      monthly_expenses: 2000,
      duration_months: 24
    },
    assets: [
      { name: "Emergency Fund", balance: 15000, min_balance: 15000 }, // No available balance
      { name: "Checking", balance: 5000, min_balance: 5000 },         // No available balance
      { name: "Investment", balance: 100000, min_balance: 0 }         // Full balance available
    ],
    order: [
      { account: "Emergency Fund", order: 1 },
      { account: "Checking", order: 2 },
      { account: "Investment", order: 3 }
    ]
  },

  // Edge case: Very short duration
  shortDuration: {
    metadata: {
      title: "Short Duration Test",
      description: "Tests minimum duration scenario"
    },
    plan: {
      monthly_expenses: 5000,
      duration_months: 1 // Minimum allowed
    },
    assets: [
      { name: "Savings", balance: 10000, min_balance: 0 }
    ],
    order: [
      { account: "Savings", order: 1 }
    ]
  },

  // Edge case: Zero monthly expenses
  zeroExpenses: {
    metadata: {
      title: "Zero Monthly Expenses Test", 
      description: "Tests scenario with no monthly expenses"
    },
    plan: {
      monthly_expenses: 0, // Minimum allowed
      duration_months: 12
    },
    assets: [
      { name: "Investment", balance: 50000, min_balance: 0 }
    ],
    income: [
      { name: "Dividends", amount: 500, start_month: 1 }
    ],
    order: [
      { account: "Investment", order: 1 }
    ]
  }
};

// Error scenarios for testing validation
const errorScenarios = {
  missingRequiredFields: {
    // Missing required 'plan' field
    assets: [
      { name: "Savings", balance: 100000 }
    ]
  },

  invalidAssetBalance: {
    plan: { monthly_expenses: 4000, duration_months: 60 },
    assets: [
      { name: "Invalid Asset" } // Missing required 'balance' field
    ]
  },

  invalidMinBalance: {
    plan: { monthly_expenses: 4000, duration_months: 60 },
    assets: [
      { name: "Savings", balance: 100000, min_balance: -1000 } // Negative min_balance
    ]
  },

  invalidOrderReference: {
    plan: { monthly_expenses: 4000, duration_months: 60 },
    assets: [
      { name: "Savings", balance: 100000 }
    ],
    order: [
      { account: "NonExistentAsset", order: 1 } // References non-existent asset
    ]
  },

  invalidDepositTarget: {
    plan: { monthly_expenses: 4000, duration_months: 60 },
    assets: [
      { name: "Savings", balance: 100000 }
    ],
    deposits: [
      { name: "Invalid Deposit", target: "NonExistentAsset", amount: 1000, start_month: 1, stop_month: 1 }
    ]
  },

  invalidDuration: {
    plan: { 
      monthly_expenses: 4000, 
      duration_months: 0 // Below minimum
    },
    assets: [
      { name: "Savings", balance: 100000 }
    ]
  },

  invalidExpenses: {
    plan: { 
      monthly_expenses: -1000, // Negative expenses
      duration_months: 60 
    },
    assets: [
      { name: "Savings", balance: 100000 }
    ]
  }
};

module.exports = {
  comprehensiveScenarios,
  errorScenarios
};
